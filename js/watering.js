/*
 * Watering schedule engine.
 *
 * - Reads PLANTS data from plants-data.js (global).
 * - Reads/writes the user's watering log via WaterLog (localStorage + import/export).
 * - Computes:
 *   - Next watering date for a plant (based on last logged + plant interval + season).
 *   - Full 2026 schedule per plant (projected from last-known watering or Jan 1, 2026).
 *
 * Cool-season months: Nov, Dec, Jan, Feb (indices 10, 11, 0, 1).
 */

const YEAR = 2026;
const STORAGE_KEY        = "plant_care_water_log_v1";
const SNOOZE_KEY         = "plant_care_snoozes_v1";
const TODO_KEY           = "plant_care_todos_v1";
const CLAUDE_SETTINGS_KEY= "plant_care_anthropic_settings_v1";
const CLAUDE_HISTORY_KEY = "plant_care_chat_history_v1";
const CARE_NOTES_KEY     = "plant_care_care_notes_v1";
const ROOM_PLAN_KEY      = "plant_care_room_plan_v1";

/*
 * Seasonal config — calibrated for INDOOR plants in AUSTIN, TX, kept at a
 * controlled 75–80°F year-round.
 *
 *   🔥 hot   = Jun, Jul, Aug, Sep      → uses plant.wateringDaysHot
 *   ☀️ warm = Mar, Apr, May, Oct, Nov → uses plant.wateringDays
 *   ❄️ cool = Dec, Jan, Feb           → uses plant.wateringDaysCool
 *
 * Why the differences are small between "hot" and "warm" here:
 *   - Indoor temp is constant, so the dominant seasonal drivers are
 *     LIGHT (day length / sun angle) and HUMIDITY (winter heating dries the
 *     air, summer AC dries it less aggressively).
 *   - Summer indoors: longer days + brighter ambient light = slightly more
 *     growth and water uptake. Bump of ~10–15% from warm.
 *   - Winter indoors: shorter days, plants slow growth. Bigger slowdown
 *     (~50–60% longer interval) even though heated air is dry — reduced
 *     photosynthesis dominates.
 *
 * If a plant doesn't define wateringDaysHot, we estimate it as
 * `wateringDays * HOT_FALLBACK_MULTIPLIER`.
 *
 * To recalibrate (e.g. if you move plants outdoors or to another climate):
 * change `MONTH_SEASONS` and `HOT_FALLBACK_MULTIPLIER` here.
 */
const SEASONAL_CONFIG = {
  location: "Austin, TX (indoor, 75–80°F)",
  MONTH_SEASONS: [
    /* Jan */ "cool",
    /* Feb */ "cool",
    /* Mar */ "warm",
    /* Apr */ "warm",
    /* May */ "warm",
    /* Jun */ "hot",
    /* Jul */ "hot",
    /* Aug */ "hot",
    /* Sep */ "hot",
    /* Oct */ "warm",
    /* Nov */ "warm",
    /* Dec */ "cool"
  ],
  /* For INDOOR controlled-temp plants, hot interval is only ~10–15% faster
   * than warm (not the 25% that outdoor / window-driven plants would see). */
  HOT_FALLBACK_MULTIPLIER: 0.88
};

/* ----------- Date helpers ----------- */
const Dates = {
  today() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  },
  iso(d) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  },
  fromIso(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  },
  addDays(d, n) {
    const out = new Date(d.getTime());
    out.setDate(out.getDate() + n);
    out.setHours(0, 0, 0, 0);
    return out;
  },
  daysBetween(a, b) {
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  },
  monthRange(year, monthIdx) {
    const first = new Date(year, monthIdx, 1);
    const last = new Date(year, monthIdx + 1, 0);
    return { first, last };
  },
  formatPretty(d) {
    return d.toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric", year: "numeric"
    });
  }
};

/* ----------- Watering interval (season-aware) ----------- */
function seasonForDate(date) {
  return SEASONAL_CONFIG.MONTH_SEASONS[date.getMonth()] || "warm";
}

function intervalForDate(plant, date) {
  const season = seasonForDate(date);
  if (season === "cool") return plant.wateringDaysCool;
  if (season === "hot") {
    if (plant.wateringDaysHot && plant.wateringDaysHot > 0) return plant.wateringDaysHot;
    return Math.max(1, Math.round(plant.wateringDays * SEASONAL_CONFIG.HOT_FALLBACK_MULTIPLIER));
  }
  return plant.wateringDays;
}

/* ----------- Build full schedule for a plant in 2026 ----------- */
/*
 * Returns an array of { date: Date, type: "scheduled" | "actual", note? }.
 * Strategy:
 *   - Start with all actual logged waterings for the plant in 2026 (or the most recent before).
 *   - From the last logged watering (or Jan 1 baseline), project forward by interval.
 *   - Each projection uses the season's interval relative to the projection date.
 */
function buildSchedule(plantId, logEntries, explicitPlant) {
  const plant = explicitPlant || PLANTS[plantId];
  if (!plant) return [];
  // Custom plants without watering intervals → no schedule
  if (!plant.wateringDays || !plant.wateringDaysCool) return [];
  /* Snooze (if any) shifts the FIRST projected date in the future */
  const snooze = SnoozeStore.get(plantId);
  const todayIso = Dates.iso(Dates.today());

  const startOfYear = new Date(YEAR, 0, 1);
  const endOfYear = new Date(YEAR, 11, 31);

  const actuals = logEntries
    .filter(e => e.plantId === plantId)
    .map(e => ({ date: Dates.fromIso(e.date), type: "actual", note: e.note || "" }))
    .sort((a, b) => a.date - b.date);

  const actualsInYear = actuals.filter(a => a.date >= startOfYear && a.date <= endOfYear);
  const lastBeforeYear = [...actuals].reverse().find(a => a.date < startOfYear);

  let cursor;
  if (actualsInYear.length > 0) {
    cursor = actualsInYear[actualsInYear.length - 1].date;
  } else if (lastBeforeYear) {
    cursor = lastBeforeYear.date;
  } else {
    cursor = Dates.addDays(startOfYear, -1);
  }

  const projected = [];
  let nextDate = Dates.addDays(cursor, intervalForDate(plant, cursor));
  /* Apply snooze to the first projected date. If the date is in the past
   * (overdue), bump it forward to (today + snoozeDays) so the calendar pill
   * actually moves — otherwise the previous behaviour left the overdue pill
   * stuck in the past and made the snooze look broken. */
  let snoozeApplied = false;
  const today = Dates.today();
  while (nextDate <= endOfYear) {
    let dateToPush = nextDate;
    if (snooze && snooze.addDays > 0 && !snoozeApplied) {
      const base = nextDate < today ? today : nextDate;
      dateToPush = Dates.addDays(base, snooze.addDays);
      snoozeApplied = true;
    }
    if (dateToPush >= startOfYear && dateToPush <= endOfYear) {
      projected.push({ date: dateToPush, type: "scheduled" });
    }
    nextDate = Dates.addDays(dateToPush, intervalForDate(plant, dateToPush));
  }

  return [...actualsInYear, ...projected].sort((a, b) => a.date - b.date);
}

/* ----------- Next watering recommendation ----------- */
/*
 * Logic:
 *   - If there's no logged watering: recommend "water today".
 *   - Else: nextDate = lastDate + interval(for lastDate).
 *   - status:
 *       overdue → today > nextDate
 *       due     → today === nextDate
 *       soon    → 0 < daysUntil ≤ 3
 *       scheduled → daysUntil > 3
 */
function nextWatering(plantId, logEntries, explicitPlant) {
  const plant = explicitPlant || PLANTS[plantId];
  if (!plant) return null;
  if (!plant.wateringDays || !plant.wateringDaysCool) {
    // Custom plant without intervals — recommend logging first
    return {
      lastDate: null,
      nextDate: Dates.today(),
      daysUntil: 0,
      status: "due",
      message: "Set a watering interval in the Plant Profile form."
    };
  }

  const today = Dates.today();
  const actuals = logEntries
    .filter(e => e.plantId === plantId)
    .map(e => Dates.fromIso(e.date))
    .sort((a, b) => b - a);

  /* Snooze is read once and applied in BOTH branches below (no-log and
   * has-log). Earlier versions only applied snooze in the has-log branch,
   * which silently broke snoozing for every plant that had never been
   * logged — the UI never reflected the snooze even though it WAS stored
   * in localStorage. That looked exactly like "snooze only works on the
   * one plant I've watered". */
  const snooze = SnoozeStore.get(plantId);
  const snoozeDays = snooze && snooze.addDays > 0 ? snooze.addDays : 0;

  if (actuals.length === 0) {
    /* No log yet → baseline is "water today". A snooze pushes it to
     * today + snoozeDays so the card moves from red ("Water today") to
     * yellow ("In Nd") or blue ("In Nd"), and the snoozed-by line appears
     * underneath. */
    const baseNext = today;
    const nextNoLog = snoozeDays > 0 ? Dates.addDays(baseNext, snoozeDays) : baseNext;
    const daysUntilNoLog = Dates.daysBetween(today, nextNoLog);
    let statusNoLog;
    if (daysUntilNoLog <= 0) statusNoLog = "due";
    else if (daysUntilNoLog <= 3) statusNoLog = "soon";
    else statusNoLog = "scheduled";

    return {
      lastDate: null,
      nextDate: nextNoLog,
      daysUntil: daysUntilNoLog,
      status: statusNoLog,
      message: snoozeDays > 0
        ? `Snoozed +${snoozeDays}d (no log yet — log a watering to start tracking the cycle).`
        : "No watering logged yet — water today and start tracking.",
      snooze: snoozeDays
    };
  }

  const last = actuals[0];
  const interval = intervalForDate(plant, last);
  let next = Dates.addDays(last, interval);
  /* Apply snooze if active.
   *
   * Semantic: "snooze +Nd" means "don't bug me for N more days FROM NOW".
   *   - If the next-watering is already in the past (overdue), snooze should
   *     bump it to today + N — otherwise the card stays red and the snooze
   *     feels broken.
   *   - If the next-watering is in the future, snooze just delays it by N. */
  if (snoozeDays > 0) {
    const baseForSnooze = next < today ? today : next;
    next = Dates.addDays(baseForSnooze, snoozeDays);
  }
  const daysUntil = Dates.daysBetween(today, next);

  let status;
  if (daysUntil < 0) status = "overdue";
  else if (daysUntil === 0) status = "due";
  else if (daysUntil <= 3) status = "soon";
  else status = "scheduled";

  return {
    lastDate: last,
    nextDate: next,
    daysUntil,
    status,
    interval,
    season: seasonForDate(last),
    snooze: snoozeDays
  };
}

/* ----------- Watering log storage (localStorage) ----------- */
const WaterLog = {
  all() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Could not parse stored log; resetting.", e);
      return [];
    }
  },
  save(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  },
  add(entry) {
    const all = this.all();
    all.push({ id: cryptoId(), ...entry });
    this.save(all);
    /* Logging an actual watering clears the snooze for that plant */
    if (entry.plantId) SnoozeStore.clear(entry.plantId);
  },
  remove(id) {
    this.save(this.all().filter(e => e.id !== id));
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
  replaceAll(entries) {
    const cleaned = (entries || [])
      .filter(e => e && e.plantId && e.date)
      .map(e => ({ id: e.id || cryptoId(), plantId: e.plantId, date: e.date, note: e.note || "" }));
    this.save(cleaned);
  }
};

/* ----------- Snooze storage (delay next watering by N days) ----------- */
/*
 * Shape: { [plantId]: { addDays: <number>, snoozedAt: "YYYY-MM-DD" } }
 * Snoozes auto-clear when WaterLog.add() is called for that plant.
 */
const SnoozeStore = {
  all() {
    try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}"); }
    catch { return {}; }
  },
  save(obj) { localStorage.setItem(SNOOZE_KEY, JSON.stringify(obj)); },
  get(plantId) { return this.all()[plantId] || null; },
  /* additive — multiple clicks compound */
  add(plantId, days) {
    if (!days) return;
    const all = this.all();
    const current = all[plantId]?.addDays || 0;
    all[plantId] = { addDays: current + days, snoozedAt: Dates.iso(Dates.today()) };
    this.save(all);
  },
  clear(plantId) {
    const all = this.all();
    if (all[plantId]) { delete all[plantId]; this.save(all); }
  },
  clearAll() { localStorage.removeItem(SNOOZE_KEY); }
};

function cryptoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ----------- Plant TODOs storage (localStorage) -----------
 *
 * Shape (object keyed by id, NOT array — fast lookup by id):
 * {
 *   "todo_xxx": {
 *     id: "todo_xxx",
 *     plantId: "monstera" | null,   // null = general (not plant-specific)
 *     title: "Repot into 14\" pot",
 *     category: "repot",            // matches TODO_CATEGORIES[].id
 *     dueDate: "2026-07-15" | null, // ISO YYYY-MM-DD
 *     notes: "Use 70% pine bark + 30% peat" | "",
 *     completedAt: "2026-06-30" | null,
 *     createdAt: "2026-06-30"
 *   },
 *   ...
 * }
 *
 * Completing a todo sets `completedAt` to today's ISO date. Re-opening
 * clears `completedAt`. Editing patches arbitrary fields in place.
 */
const TodoStore = {
  all() {
    try { return JSON.parse(localStorage.getItem(TODO_KEY) || "{}") || {}; }
    catch (e) { console.warn("Could not parse stored todos; resetting.", e); return {}; }
  },
  save(obj) { localStorage.setItem(TODO_KEY, JSON.stringify(obj || {})); },
  list() { return Object.values(this.all()); },
  get(id) { return this.all()[id] || null; },
  forPlant(plantId) { return this.list().filter(t => t.plantId === plantId); },
  open() { return this.list().filter(t => !t.completedAt); },
  completed() { return this.list().filter(t => !!t.completedAt); },
  add(todo) {
    if (!todo) return null;
    const all = this.all();
    const id = "todo_" + cryptoId();
    const entry = {
      id,
      plantId:     todo.plantId || null,
      title:       (todo.title || "").trim(),
      category:    todo.category || "other",
      dueDate:     todo.dueDate || null,
      notes:       todo.notes || "",
      completedAt: null,
      createdAt:   Dates.iso(Dates.today())
    };
    if (!entry.title) return null;
    all[id] = entry;
    this.save(all);
    return entry;
  },
  update(id, patch) {
    const all = this.all();
    if (!all[id]) return null;
    const merged = { ...all[id], ...patch };
    /* Normalise empty strings → null for date so the date input clears cleanly */
    if (merged.dueDate === "") merged.dueDate = null;
    if (merged.plantId === "") merged.plantId = null;
    merged.id = all[id].id;        // never mutate id
    merged.createdAt = all[id].createdAt; // preserve original createdAt
    all[id] = merged;
    this.save(all);
    return merged;
  },
  complete(id) {
    const all = this.all();
    if (!all[id]) return null;
    all[id].completedAt = Dates.iso(Dates.today());
    this.save(all);
    return all[id];
  },
  reopen(id) {
    const all = this.all();
    if (!all[id]) return null;
    all[id].completedAt = null;
    this.save(all);
    return all[id];
  },
  remove(id) {
    const all = this.all();
    if (!all[id]) return false;
    delete all[id];
    this.save(all);
    return true;
  },
  clearCompleted() {
    const all = this.all();
    let removed = 0;
    Object.keys(all).forEach(k => { if (all[k].completedAt) { delete all[k]; removed++; } });
    this.save(all);
    return removed;
  },
  clearAll() { localStorage.removeItem(TODO_KEY); },
  /* Accept either the canonical object form or a legacy array form
   * (e.g. from an earlier export). Anything invalid is dropped. */
  replaceAll(data) {
    if (!data) { this.save({}); return; }
    const out = {};
    if (Array.isArray(data)) {
      data.forEach(t => {
        if (t && t.id && t.title) out[t.id] = sanitizeTodo(t);
      });
    } else if (typeof data === "object") {
      Object.entries(data).forEach(([k, t]) => {
        if (t && t.title) out[k] = sanitizeTodo({ ...t, id: t.id || k });
      });
    }
    this.save(out);
  }
};
function sanitizeTodo(t) {
  return {
    id:          t.id,
    plantId:     t.plantId || null,
    title:       String(t.title || "").trim(),
    category:    t.category || "other",
    dueDate:     t.dueDate || null,
    notes:       t.notes || "",
    completedAt: t.completedAt || null,
    createdAt:   t.createdAt || Dates.iso(Dates.today())
  };
}

/* ----------- Claude / Anthropic chat — settings + history -----------
 *
 * BYOK personal-use only. The API key lives in localStorage on this
 * device. Anthropic explicitly supports browser-direct requests with
 * the `anthropic-dangerous-direct-browser-access: true` header for
 * exactly this case — see
 * https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/
 *
 * ClaudeSettings shape:
 *   { apiKey: string, model: string, ackedDanger: boolean }
 *
 * ChatHistory shape:
 *   {
 *     messages: [
 *       { role: "user"|"assistant",
 *         content: string | <claude content block array>,
 *         model: "claude-sonnet-4-5",
 *         ts: ISO timestamp,
 *         usage?: { input_tokens, output_tokens },
 *         cost?: number (USD)
 *       },
 *       ...
 *     ],
 *     totalCost: number (running USD total),
 *     plantContext: "ALL" | "NONE" | "<plantId>"
 *   }
 */
const ClaudeSettings = {
  load() {
    try { return JSON.parse(localStorage.getItem(CLAUDE_SETTINGS_KEY) || "{}"); }
    catch { return {}; }
  },
  save(s) { localStorage.setItem(CLAUDE_SETTINGS_KEY, JSON.stringify(s || {})); },
  get apiKey()    { return this.load().apiKey || ""; },
  get model()     { return this.load().model || "claude-sonnet-4-5"; },
  get acked()     { return !!this.load().ackedDanger; },
  setKey(k)       { const s = this.load(); s.apiKey = (k || "").trim(); this.save(s); },
  setModel(m)     { const s = this.load(); s.model  = m || "claude-sonnet-4-5"; this.save(s); },
  setAcked(v)     { const s = this.load(); s.ackedDanger = !!v; this.save(s); },
  clearKey()      { const s = this.load(); delete s.apiKey; this.save(s); }
};

const ChatHistory = {
  load() {
    try { return JSON.parse(localStorage.getItem(CLAUDE_HISTORY_KEY) || "{}"); }
    catch { return {}; }
  },
  save(h) { localStorage.setItem(CLAUDE_HISTORY_KEY, JSON.stringify(h || {})); },
  messages()      { return this.load().messages || []; },
  totalCost()     { return this.load().totalCost || 0; },
  plantContext()  { return this.load().plantContext || "ALL"; },
  setPlantContext(ctx) {
    const h = this.load(); h.plantContext = ctx; this.save(h);
  },
  append(message) {
    const h = this.load();
    h.messages = h.messages || [];
    h.messages.push(message);
    this.save(h);
  },
  /* Update the in-flight assistant message that we previously appended as
   * empty text. Used by the streaming receiver. */
  updateLastAssistant(patch) {
    const h = this.load();
    if (!h.messages || !h.messages.length) return;
    const last = h.messages[h.messages.length - 1];
    if (last.role !== "assistant") return;
    Object.assign(last, patch);
    if (patch.cost != null) {
      h.totalCost = (h.totalCost || 0) + patch.cost;
    }
    this.save(h);
  },
  clear() {
    localStorage.removeItem(CLAUDE_HISTORY_KEY);
  }
};

/* ----------- Care Notes — archive useful chat exchanges per plant -----------
 *
 * Notes are saved from the Ask Claude tab and attached to a specific plant.
 * They show up in that plant's Care Guide detail and are included in the JSON
 * export/import payload so they travel between devices.
 *
 * Shape:
 *   {
 *     [plantId]: [
 *       {
 *         id: cryptoId(),
 *         ts: ISO timestamp,
 *         title: short label,
 *         source: "message" | "conversation",
 *         model: "claude-sonnet-4-5",
 *         plantContextAtSave: "monstera" | "ALL" | "NONE",
 *         messages: [
 *           { role: "user" | "assistant", text: "..." }
 *         ]
 *       },
 *       ...
 *     ]
 *   }
 *
 * Images are stripped from saved messages (replaced with "[user attached
 * an image]") to keep localStorage usage low — the original images stay in
 * ChatHistory until the user clears the conversation.
 */
const CareNotesStore = {
  all() {
    try { return JSON.parse(localStorage.getItem(CARE_NOTES_KEY) || "{}"); }
    catch { return {}; }
  },
  save(obj) { localStorage.setItem(CARE_NOTES_KEY, JSON.stringify(obj || {})); },
  forPlant(plantId) {
    const all = this.all();
    return Array.isArray(all[plantId]) ? all[plantId] : [];
  },
  add(plantId, note) {
    if (!plantId || !note) return null;
    const all = this.all();
    const list = Array.isArray(all[plantId]) ? all[plantId] : [];
    const entry = sanitizeCareNote(note);
    list.push(entry);
    all[plantId] = list;
    this.save(all);
    return entry;
  },
  remove(plantId, noteId) {
    const all = this.all();
    const list = Array.isArray(all[plantId]) ? all[plantId] : [];
    const filtered = list.filter(n => n.id !== noteId);
    if (filtered.length) all[plantId] = filtered;
    else delete all[plantId];
    this.save(all);
  },
  clearForPlant(plantId) {
    const all = this.all();
    delete all[plantId];
    this.save(all);
  },
  clearAll() { localStorage.removeItem(CARE_NOTES_KEY); },
  replaceAll(data) {
    if (!data || typeof data !== "object") return;
    const cleaned = {};
    Object.entries(data).forEach(([plantId, list]) => {
      if (!Array.isArray(list)) return;
      cleaned[plantId] = list.map(sanitizeCareNote).filter(n => n.messages.length > 0);
    });
    this.save(cleaned);
  }
};

/* ----------- Room placement planner storage (localStorage) -----------
 *
 * Lets the user create their own rooms and drop owned plants into them so
 * they can plan around real windowsill / shelf space. A plant lives in at
 * most ONE planned room at a time, so `assignments` maps plantId -> roomId.
 *
 * Shape:
 * {
 *   rooms:       [ { id, name, note, createdAt } ],
 *   assignments: { [plantId]: roomId }
 * }
 */
const RoomPlanStore = {
  all() {
    try {
      const o = JSON.parse(localStorage.getItem(ROOM_PLAN_KEY) || "{}");
      return {
        rooms: Array.isArray(o.rooms) ? o.rooms : [],
        assignments: (o.assignments && typeof o.assignments === "object") ? o.assignments : {}
      };
    } catch { return { rooms: [], assignments: {} }; }
  },
  save(o) {
    localStorage.setItem(ROOM_PLAN_KEY, JSON.stringify({
      rooms: Array.isArray(o.rooms) ? o.rooms : [],
      assignments: (o.assignments && typeof o.assignments === "object") ? o.assignments : {}
    }));
  },
  addRoom(name, note) {
    const o = this.all();
    const room = {
      id: cryptoId(),
      name: String(name || "").slice(0, 80).trim() || "Untitled room",
      note: String(note || "").slice(0, 200).trim(),
      createdAt: Dates.iso(Dates.today())
    };
    o.rooms.push(room);
    this.save(o);
    return room;
  },
  updateRoom(id, patch) {
    const o = this.all();
    const room = o.rooms.find(r => r.id === id);
    if (!room) return;
    if (typeof patch.name === "string") room.name = patch.name.slice(0, 80).trim() || room.name;
    if (typeof patch.note === "string") room.note = patch.note.slice(0, 200).trim();
    this.save(o);
  },
  removeRoom(id) {
    const o = this.all();
    o.rooms = o.rooms.filter(r => r.id !== id);
    Object.keys(o.assignments).forEach(pid => { if (o.assignments[pid] === id) delete o.assignments[pid]; });
    this.save(o);
  },
  assign(plantId, roomId) {
    if (!plantId) return;
    const o = this.all();
    if (roomId) o.assignments[plantId] = roomId;
    else delete o.assignments[plantId];
    this.save(o);
  },
  unassign(plantId) { this.assign(plantId, null); },
  plantsIn(roomId) {
    const o = this.all();
    return Object.keys(o.assignments).filter(pid => o.assignments[pid] === roomId);
  },
  roomFor(plantId) {
    return this.all().assignments[plantId] || null;
  },
  clearAll() { localStorage.removeItem(ROOM_PLAN_KEY); },
  replaceAll(data) {
    if (!data || typeof data !== "object") { this.clearAll(); return; }
    const rooms = Array.isArray(data.rooms) ? data.rooms
      .filter(r => r && r.id)
      .map(r => ({
        id: String(r.id),
        name: String(r.name || "Untitled room").slice(0, 80),
        note: String(r.note || "").slice(0, 200),
        createdAt: r.createdAt || Dates.iso(Dates.today())
      })) : [];
    const validIds = new Set(rooms.map(r => r.id));
    const assignments = {};
    if (data.assignments && typeof data.assignments === "object") {
      Object.entries(data.assignments).forEach(([pid, rid]) => {
        if (validIds.has(rid)) assignments[pid] = rid;
      });
    }
    this.save({ rooms, assignments });
  }
};

function sanitizeCareNote(n) {
  const rawMessages = Array.isArray(n.messages) ? n.messages : [];
  const messages = rawMessages
    .map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      text: String(m.text ?? "").slice(0, 8000)
    }))
    .filter(m => m.text.length > 0);
  return {
    id:                 n.id || cryptoId(),
    ts:                 n.ts || new Date().toISOString(),
    title:              String(n.title || "").trim().slice(0, 120) || "Untitled note",
    source:             n.source === "conversation" ? "conversation" : "message",
    model:              n.model || "",
    plantContextAtSave: n.plantContextAtSave || "",
    messages
  };
}
