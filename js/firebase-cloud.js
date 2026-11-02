/**
 * Firebase Realtime Database sync for Moose Plant Care.
 *
 * Uses the compat CDN SDKs (loaded from index.html) so the rest of the
 * classic-script app can call window.PlantCareCloud without a bundler.
 *
 * Path (single household snapshot, same shape as Export JSON):
 *   plantCare/moose
 *     waterLog, customPlants, overlays, images, snoozes, todos,
 *     careNotes, roomPlan, conditionLog, removedOwned, exportedAt, syncedAt
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

  let app = null;
  let db = null;
  let initError = null;

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
    await rootRef().set(data);
    return data;
  }

  async function loadBundledExport() {
    const res = await fetch(BUNDLED_EXPORT_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${BUNDLED_EXPORT_URL} (HTTP ${res.status})`);
    return normalizePayload(await res.json());
  }

  /**
   * If the cloud node is missing, seed it from the bundled export JSON.
   * Returns { seeded: boolean, data }.
   */
  async function ensureSeeded() {
    const existing = await pull();
    if (existing) return { seeded: false, data: existing };
    const bundled = await loadBundledExport();
    const saved = await push(bundled);
    return { seeded: true, data: saved };
  }

  function statusMessage(err) {
    const msg = String(err?.message || err || "");
    if (/404|not found|does not exist|FirebaseError:.*database/i.test(msg) && /database|rtdb|firebaseio/i.test(msg + FIREBASE_CONFIG.databaseURL)) {
      return "Realtime Database is not created yet on moose-plant-shop. Create it in Firebase Console → Build → Realtime Database, then retry.";
    }
    if (/Permission denied|permission_denied/i.test(msg)) {
      return "Realtime Database permission denied. Deploy database.rules.json (firebase deploy --only database) or temporarily allow read/write in the console.";
    }
    if (/Failed to get|network|offline|ERR_NAME_NOT_RESOLVED/i.test(msg)) {
      return "Could not reach Realtime Database. Confirm databaseURL in js/firebase-cloud.js matches the URL shown in Firebase Console, and that this GitHub Pages host is an authorized domain.";
    }
    return msg || "Unknown Firebase error";
  }

  global.PlantCareCloud = {
    config: FIREBASE_CONFIG,
    rtdbPath: RTDB_PATH,
    bundledExportUrl: BUNDLED_EXPORT_URL,
    ensureFirebase,
    normalizePayload,
    pull,
    push,
    loadBundledExport,
    ensureSeeded,
    statusMessage
  };
})(window);
