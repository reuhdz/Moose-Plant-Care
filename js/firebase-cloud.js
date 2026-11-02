/**
 * Firebase Realtime Database sync for Moose Plant Care.
 *
 * Uses the compat CDN SDKs (loaded from index.html) so the rest of the
 * classic-script app can call window.PlantCareCloud without a bundler.
 *
 * Path (single household snapshot, same shape as Export JSON):
 *   plantCare/moose
 *
 * Live sync: localStorage writes to plant-care keys debounce-push to RTDB;
 * RTDB on("value") applies remote snapshots back into local stores.
 */
(function (global) {
  "use strict";

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDyBmEXPWyFp3nSCg4-yGhyXFe66zQyVcE",
    authDomain: "moose-plant-shop.firebaseapp.com",
    databaseURL: "https://moose-plant-shop-default-rtdb.firebaseio.com",
    projectId: "moose-plant-shop",
    storageBucket: "moose-plant-shop.firebasestorage.app",
    messagingSenderId: "315095763791",
    appId: "1:315095763791:web:838168dc0620b81246533a",
    measurementId: "G-0YKRG59WLR"
  };

  const RTDB_PATH = "plantCare/moose";
  const BUNDLED_EXPORT_URL = "data/plant-care-export.json";
  const PUSH_DEBOUNCE_MS = 900;
  const SYNC_AT_KEY = "plant_care_cloud_synced_at_v1";

  /* Keys that belong in the cloud snapshot (exclude theme / Claude BYOK). */
  const LIVE_SYNC_KEYS = new Set([
    "plant_care_water_log_v1",
    "plant_care_snoozes_v1",
    "plant_care_todos_v1",
    "plant_care_care_notes_v1",
    "plant_care_room_plan_v1",
    "plant_care_condition_log_v1",
    "plant_care_custom_plants_v1",
    "plant_care_plant_overlays_v1",
    "plant_care_images_v1",
    "plant_care_removed_owned_v1"
  ]);

  let app = null;
  let db = null;
  let initError = null;

  let liveStarted = false;
  let storageHooked = false;
  let pauseWatch = 0;
  let pushTimer = null;
  let pushing = false;
  let applyingRemote = false;
  let bootstrapped = false;
  let lastWrittenSyncedAt = null;
  let liveHandlers = null;
  let valueUnsub = null;

  try {
    lastWrittenSyncedAt = localStorage.getItem(SYNC_AT_KEY) || null;
  } catch {
    lastWrittenSyncedAt = null;
  }

  function ensureFirebase() {
    if (db) return db;
    if (initError) throw initError;
    if (typeof global.firebase === "undefined") {
      initError = new Error("Firebase SDK not loaded. Check the CDN script tags in index.html.");
      throw initError;
    }
    try {
      app = global.firebase.apps?.length
        ? global.firebase.app()
        : global.firebase.initializeApp(FIREBASE_CONFIG);
      db = global.firebase.database();
      return db;
    } catch (err) {
      initError = err;
      throw err;
    }
  }

  function rootRef() {
    return ensureFirebase().ref(RTDB_PATH);
  }

  function normalizePayload(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    return {
      waterLog: Array.isArray(src.waterLog) ? src.waterLog : [],
      customPlants: Array.isArray(src.customPlants) ? src.customPlants : [],
      overlays: src.overlays && typeof src.overlays === "object" ? src.overlays : {},
      images: src.images && typeof src.images === "object" ? src.images : {},
      snoozes: src.snoozes && typeof src.snoozes === "object" ? src.snoozes : {},
      todos: src.todos && typeof src.todos === "object" ? src.todos : {},
      careNotes: src.careNotes && typeof src.careNotes === "object" ? src.careNotes : {},
      roomPlan: src.roomPlan && typeof src.roomPlan === "object" ? src.roomPlan : { rooms: [], assignments: {} },
      conditionLog: src.conditionLog && typeof src.conditionLog === "object" ? src.conditionLog : {},
      removedOwned: Array.isArray(src.removedOwned) ? src.removedOwned : [],
      exportedAt: src.exportedAt || null,
      syncedAt: src.syncedAt || null
    };
  }

  function snapToPayload(val) {
    if (val == null) return null;
    return normalizePayload(val);
  }

  async function pull() {
    const snap = await rootRef().once("value");
    return snapToPayload(snap.val());
  }

  async function push(payload) {
    const data = normalizePayload(payload);
    data.syncedAt = new Date().toISOString();
    if (!data.exportedAt) data.exportedAt = data.syncedAt;
    pushing = true;
    try {
      await rootRef().set(data);
      markSynced(data.syncedAt);
      return data;
    } finally {
      pushing = false;
    }
  }

  async function loadBundledExport() {
    const res = await fetch(BUNDLED_EXPORT_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${BUNDLED_EXPORT_URL} (HTTP ${res.status})`);
    return normalizePayload(await res.json());
  }

  async function ensureSeeded() {
    const existing = await pull();
    if (existing) return { seeded: false, data: existing };
    const bundled = await loadBundledExport();
    const saved = await push(bundled);
    return { seeded: true, data: saved };
  }

  function statusMessage(err) {
    const msg = String(err?.message || err || "");
    if (/Permission denied|permission_denied/i.test(msg)) {
      return "Realtime Database permission denied. Publish database.rules.json (allow read/write on plantCare/moose).";
    }
    if (/Failed to get|network|offline|ERR_NAME_NOT_RESOLVED|404/i.test(msg)) {
      return "Could not reach Realtime Database. Confirm the DB exists and databaseURL matches the console URL.";
    }
    return msg || "Unknown Firebase error";
  }

  function setStatus(msg) {
    if (liveHandlers && typeof liveHandlers.onStatus === "function") {
      liveHandlers.onStatus(msg);
    }
  }

  function withPausedWatch(fn) {
    pauseWatch += 1;
    try {
      return fn();
    } finally {
      pauseWatch -= 1;
    }
  }

  function scheduleLivePush(reason) {
    if (!liveStarted || !liveHandlers || pauseWatch > 0 || applyingRemote) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      runLivePush(reason || "local edit");
    }, PUSH_DEBOUNCE_MS);
  }

  async function runLivePush(reason) {
    if (!liveHandlers || typeof liveHandlers.collect !== "function") return;
    if (pushing || applyingRemote || pauseWatch > 0) {
      scheduleLivePush(reason);
      return;
    }
    try {
      setStatus(`Syncing to Firebase… (${reason})`);
      const payload = liveHandlers.collect();
      const saved = await push(payload);
      setStatus(`Live sync on · last push ${saved.syncedAt} · ${saved.waterLog.length} waterings`);
    } catch (err) {
      setStatus("Live push failed: " + statusMessage(err));
      console.warn("[PlantCareCloud] live push failed", err);
    }
  }

  function hookLocalStorage() {
    if (storageHooked || typeof localStorage === "undefined") return;
    storageHooked = true;
    const proto = Storage.prototype;
    const rawSet = proto.setItem;
    const rawRemove = proto.removeItem;
    proto.setItem = function (key, value) {
      rawSet.call(this, key, value);
      if (this === localStorage && LIVE_SYNC_KEYS.has(String(key))) {
        scheduleLivePush("localStorage set");
      }
    };
    proto.removeItem = function (key) {
      rawRemove.call(this, key);
      if (this === localStorage && LIVE_SYNC_KEYS.has(String(key))) {
        scheduleLivePush("localStorage remove");
      }
    };
  }

  function payloadFingerprint(data) {
    if (!data) return "";
    try {
      return JSON.stringify({
        syncedAt: data.syncedAt || null,
        exportedAt: data.exportedAt || null,
        waterLog: data.waterLog,
        customPlants: data.customPlants,
        overlays: data.overlays,
        images: data.images,
        snoozes: data.snoozes,
        todos: data.todos,
        careNotes: data.careNotes,
        roomPlan: data.roomPlan,
        conditionLog: data.conditionLog,
        removedOwned: data.removedOwned
      });
    } catch {
      return String(data.syncedAt || "");
    }
  }

  async function handleRemoteValue(snap) {
    if (!liveHandlers || typeof liveHandlers.apply !== "function") return;
    if (pushing) return;
    const remote = snapToPayload(snap.val());
    const local = normalizePayload(liveHandlers.collect());

    if (!bootstrapped) {
      bootstrapped = true;

      if (!remote) {
        setStatus("Cloud empty · pushing local data…");
        scheduleLivePush("bootstrap empty cloud");
        return;
      }

      if (sameContent(remote, local)) {
        markSynced(remote.syncedAt || lastWrittenSyncedAt);
        setStatus(`Live sync on · in sync · ${remote.waterLog.length} waterings`);
        return;
      }

      const remembered = lastWrittenSyncedAt;
      const remoteAt = remote.syncedAt || "";
      const localCount = local.waterLog.length;
      const remoteCount = remote.waterLog.length;

      /* First connection for this browser with no sync stamp: keep the richer log. */
      if (!remembered) {
        if (localCount > remoteCount) {
          setStatus("Local data ahead · pushing to cloud…");
          scheduleLivePush("bootstrap local ahead");
          return;
        }
        applyRemoteSnapshot(remote, `Live sync on · loaded cloud · ${remoteCount} waterings`);
        return;
      }

      if (remoteAt && remoteAt > remembered) {
        applyRemoteSnapshot(remote);
        return;
      }
      if (remoteAt && remoteAt < remembered) {
        setStatus("Local sync stamp newer · pushing to cloud…");
        scheduleLivePush("bootstrap local newer");
        return;
      }

      /* Same/unknown stamp but content differs — prefer cloud for multi-device. */
      applyRemoteSnapshot(remote);
      return;
    }

    if (!remote) {
      setStatus("Cloud empty · pushing local data…");
      scheduleLivePush("cloud empty");
      return;
    }

    if (remote.syncedAt && remote.syncedAt === lastWrittenSyncedAt) {
      setStatus(`Live sync on · in sync · ${remote.waterLog.length} waterings`);
      return;
    }

    if (sameContent(remote, local)) {
      markSynced(remote.syncedAt || lastWrittenSyncedAt);
      setStatus(`Live sync on · in sync · ${remote.waterLog.length} waterings`);
      return;
    }

    applyRemoteSnapshot(remote);
  }

  /**
   * Start bidirectional live sync.
   * handlers: { collect(): payload, apply(payload, meta), onStatus(msg) }
   */
  function startLiveSync(handlers) {
    liveHandlers = handlers || {};
    hookLocalStorage();
    ensureFirebase();
    if (liveStarted) {
      scheduleLivePush("restart");
      return { alreadyStarted: true };
    }
    liveStarted = true;
    setStatus("Connecting live sync…");
    const ref = rootRef();
    const listener = (snap) => { handleRemoteValue(snap); };
    ref.on("value", listener, (err) => {
      setStatus("Live sync listener error: " + statusMessage(err));
    });
    valueUnsub = () => ref.off("value", listener);
    return { alreadyStarted: false };
  }

  function stopLiveSync() {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    if (valueUnsub) {
      valueUnsub();
      valueUnsub = null;
    }
    liveStarted = false;
  }

  function requestPush(reason) {
    scheduleLivePush(reason || "manual");
  }

  function markSynced(syncedAt) {
    if (!syncedAt) return;
    lastWrittenSyncedAt = syncedAt;
    try { localStorage.setItem(SYNC_AT_KEY, syncedAt); }
    catch (e) { /* ignore quota / private mode */ }
  }

  function applyRemoteSnapshot(remote, status) {
    applyingRemote = true;
    try {
      withPausedWatch(() => {
        liveHandlers.apply(remote, { fromCloud: true });
      });
      markSynced(remote.syncedAt);
      setStatus(status || `Live sync on · applied cloud @ ${remote.syncedAt || "unknown"} · ${remote.waterLog.length} waterings`);
    } catch (err) {
      setStatus("Live apply failed: " + statusMessage(err));
      console.warn("[PlantCareCloud] live apply failed", err);
    } finally {
      applyingRemote = false;
    }
  }

  function sameContent(remote, local) {
    return payloadFingerprint(remote) === payloadFingerprint({
      ...local,
      syncedAt: remote.syncedAt,
      exportedAt: remote.exportedAt
    });
  }

  global.PlantCareCloud = {
    config: FIREBASE_CONFIG,
    rtdbPath: RTDB_PATH,
    bundledExportUrl: BUNDLED_EXPORT_URL,
    liveSyncKeys: LIVE_SYNC_KEYS,
    ensureFirebase,
    normalizePayload,
    pull,
    push,
    loadBundledExport,
    ensureSeeded,
    statusMessage,
    startLiveSync,
    stopLiveSync,
    requestPush,
    withPausedWatch,
    markSynced
  };
})(window);
