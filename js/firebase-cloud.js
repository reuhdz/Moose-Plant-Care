/**
 * Firebase cloud sync for Moose Plant Care.
 *
 * Uses the compat CDN SDKs (loaded from index.html) so the rest of the
 * classic-script app can call window.PlantCareCloud without a bundler.
 *
 * Document layout (single household snapshot, same shape as Export JSON):
 *   plantCare / moose
 *     waterLog, customPlants, overlays, images, snoozes, todos,
 *     careNotes, roomPlan, conditionLog, removedOwned, exportedAt, syncedAt
 */
(function (global) {
  "use strict";

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDyBmEXPWyFp3nSCg4-yGhyXFe66zQyVcE",
    authDomain: "moose-plant-shop.firebaseapp.com",
    projectId: "moose-plant-shop",
    storageBucket: "moose-plant-shop.firebasestorage.app",
    messagingSenderId: "315095763791",
    appId: "1:315095763791:web:838168dc0620b81246533a",
    measurementId: "G-0YKRG59WLR"
  };

  const DOC_PATH = { collection: "plantCare", id: "moose" };
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
      db = global.firebase.firestore();
      return db;
    } catch (err) {
      initError = err;
      throw err;
    }
  }

  function docRef() {
    return ensureFirebase().collection(DOC_PATH.collection).doc(DOC_PATH.id);
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

  async function pull() {
    const snap = await docRef().get();
    if (!snap.exists) return null;
    return normalizePayload(snap.data());
  }

  async function push(payload) {
    const data = normalizePayload(payload);
    data.syncedAt = new Date().toISOString();
    if (!data.exportedAt) data.exportedAt = data.syncedAt;
    await docRef().set(data, { merge: false });
    return data;
  }

  async function loadBundledExport() {
    const res = await fetch(BUNDLED_EXPORT_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${BUNDLED_EXPORT_URL} (HTTP ${res.status})`);
    return normalizePayload(await res.json());
  }

  /**
   * If the cloud doc is missing, seed it from the bundled export JSON.
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
    if (/Cloud Firestore API has not been used|SERVICE_DISABLED|firestore\.googleapis\.com/i.test(msg)) {
      return "Firestore is not enabled yet on project moose-plant-shop. Create a Firestore database in the Firebase console, then try again.";
    }
    if (/permission|Missing or insufficient permissions/i.test(msg)) {
      return "Firestore permission denied. Deploy firestore.rules (see firebase.json) or temporarily use test-mode rules.";
    }
    if (/Failed to get document because the client is offline/i.test(msg)) {
      return "Firebase client is offline. Check network / authorized domains for this GitHub Pages host.";
    }
    return msg || "Unknown Firebase error";
  }

  global.PlantCareCloud = {
    config: FIREBASE_CONFIG,
    docPath: DOC_PATH,
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
