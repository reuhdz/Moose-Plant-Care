/*
 * Main application: theme switch, tab switching, plant selectors,
 * care guide render (with conditions card), watering calendar, log,
 * and Plant Profile (add / update custom + built-in plants).
 *
 * Depends on:
 *   plants-data.js — PLANTS, OWNED_PLANT_IDS, SUCCULENT_VARIANTS, POTHOS_VARIANTS,
 *                     PLANT_CATEGORIES_FOR_CUSTOM, PLANT_CONDITION_OPTIONS
 *   watering.js    — Dates, buildSchedule, nextWatering, WaterLog
 */

(() => {
  /* ============================================================
   * Storage keys + PlantStore (custom plants + built-in overlays)
   * ============================================================ */
  const THEME_KEY         = "plant_care_theme";
  const CUSTOM_PLANTS_KEY = "plant_care_custom_plants_v1";
  const OVERLAYS_KEY      = "plant_care_plant_overlays_v1";
  const IMAGES_KEY        = "plant_care_images_v1";

  /* Image store — keyed by plantId, value is a base64 data URL (JPEG, resized). */
  const ImageStore = {
    all() {
      try { return JSON.parse(localStorage.getItem(IMAGES_KEY) || "{}"); }
      catch { return {}; }
    },
    saveAll(obj) {
      try { localStorage.setItem(IMAGES_KEY, JSON.stringify(obj)); }
      catch (e) { alert("Could not save photo — local storage may be full. Try a smaller image."); throw e; }
    },
    get(id) { return this.all()[id] || null; },
    set(id, dataUrl) { const all = this.all(); all[id] = dataUrl; this.saveAll(all); },
    remove(id) { const all = this.all(); delete all[id]; this.saveAll(all); }
  };

  /* Folder-photo path helpers */
  function folderPhotoPath(plantId) { return `data/images/${plantId}.jpg`; }

  /* Download a base64 data URL as a file with the given filename. */
  function downloadDataUrl(dataUrl, filename) {
    try {
      const [meta, b64] = dataUrl.split(",");
      const mime = (meta.match(/:(.*?);/) || [, "image/jpeg"])[1];
      const bin = atob(b64);
      const len = bin.length;
      const arr = new Uint8Array(len);
      for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Could not prepare photo for download: " + e.message);
    }
  }

  /* Resize an image File to a max dimension and return a JPEG data URL. */
  function resizeImageFile(file, maxDim = 800, quality = 0.85) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) { reject(new Error("Not an image file")); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          try { resolve(canvas.toDataURL("image/jpeg", quality)); }
          catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error("Could not decode image"));
        img.src = ev.target.result;
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  }

  const PlantStore = {
    customPlants() {
      try { return JSON.parse(localStorage.getItem(CUSTOM_PLANTS_KEY) || "[]"); }
      catch { return []; }
    },
    saveCustom(arr) { localStorage.setItem(CUSTOM_PLANTS_KEY, JSON.stringify(arr)); },
    upsertCustom(plant) {
      const all = this.customPlants();
      const i = all.findIndex(p => p.id === plant.id);
      if (i >= 0) all[i] = plant; else all.push(plant);
      this.saveCustom(all);
    },
    removeCustom(id) { this.saveCustom(this.customPlants().filter(p => p.id !== id)); },

    overlays() {
      try { return JSON.parse(localStorage.getItem(OVERLAYS_KEY) || "{}"); }
      catch { return {}; }
    },
    saveOverlays(obj) { localStorage.setItem(OVERLAYS_KEY, JSON.stringify(obj)); },
    setOverlay(plantId, data) {
      const all = this.overlays();
      all[plantId] = { ...(all[plantId] || {}), ...data };
      this.saveOverlays(all);
    },
    removeOverlay(plantId) {
      const all = this.overlays();
      delete all[plantId];
      this.saveOverlays(all);
    },

    /* Merged view of PLANTS + custom + overlays + images. Always call this — never PLANTS directly. */
    allPlants() {
      const merged = { ...PLANTS };
      this.customPlants().forEach(p => { merged[p.id] = p; });
      const overlays = this.overlays();
      Object.entries(overlays).forEach(([id, ov]) => {
        if (merged[id]) merged[id] = { ...merged[id], ...ov };
      });
      const images = ImageStore.all();
      Object.entries(images).forEach(([id, url]) => {
        if (merged[id]) merged[id] = { ...merged[id], imageDataUrl: url };
      });
      return merged;
    },
    ownedIds() {
      return OWNED_PLANT_IDS.concat(this.customPlants().map(p => p.id));
    }
  };

  /* ============================================================
   * Theme switch
   * ============================================================ */
  const themeBtn = document.getElementById("theme-toggle");
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    themeBtn.querySelector(".theme-icon").textContent = t === "dark" ? "☀️" : "🌙";
    themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark (cozy den) theme");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#14110d" : "#2d6a4f");
  }
  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved === "dark" ? "dark" : "light");
  }
  themeBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });

  /* ============================================================
   * Tab switching
   * ============================================================ */
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabButtons.forEach(b => {
        const active = b === btn;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      tabPanels.forEach(p => p.classList.toggle("active", p.id === `tab-${target}`));
      if (target !== "calendar" && typeof hidePillPopover === "function") hidePillPopover();
      if (target === "calendar") renderCalendar();
      if (target === "todos") renderTodosTab();
      if (target === "chat") renderChatTab();
      if (target === "soil") renderSoilTab();
      if (target === "placement") renderPlacementTab();
      if (target === "log") { renderRecentLog(); resetProfileForm("new"); }
    });
  });

  /* ============================================================
   * Care Guide — primary selector + conditional sub-select
   * ============================================================ */
  const primarySelect  = document.getElementById("primary-select");
  const subWrap        = document.getElementById("sub-select-wrap");
  const subSelect      = document.getElementById("sub-select");
  const subLabel       = document.getElementById("sub-select-label");
  const detailEl       = document.getElementById("plant-detail");

  const GROUP_SUCC = "__group_succulent__";
  const GROUP_POTH = "__group_pothos__";

  const CARE_SECTIONS = [
    { key: "lighting",       label: "Lighting",       icon: "☀️" },
    { key: "soil",           label: "Soil Mix",       icon: "🪴" },
    { key: "watering",       label: "Watering",       icon: "💧" },
    { key: "pruning",        label: "Pruning",        icon: "✂️" },
    { key: "propagation",    label: "Propagation",    icon: "🌱" },
    { key: "repotting",      label: "Repotting",      icon: "🔄" },
    { key: "feeding",        label: "Feeding",        icon: "🥄" },
    { key: "troubleshooting",label: "Troubleshooting",icon: "🔍" }
  ];

  function populatePrimarySelect() {
    const all = PlantStore.allPlants();
    const ownedIds = PlantStore.ownedIds();
    // Hide succulents AND owned pothos from the main list — they live under their respective sub-dropdowns.
    const succulentSet = new Set(SUCCULENT_VARIANTS);
    const pothosSet    = new Set(POTHOS_VARIANTS);
    const filteredIds = sortByDisplayName(
      ownedIds.filter(id => !succulentSet.has(id) && !pothosSet.has(id)),
      all
    );
    const options = filteredIds.map(id =>
      `<option value="${id}">${escapeHtml(all[id].displayName)}</option>`
    ).concat([
      `<option value="${GROUP_SUCC}">🌵 Succulents (variants)</option>`,
      `<option value="${GROUP_POTH}">🌿 Pothos &amp; Philodendron (cuttings)</option>`
    ]);
    primarySelect.innerHTML = options.join("");
  }

  function populateSubSelect(group) {
    const ids = group === GROUP_SUCC ? SUCCULENT_VARIANTS : POTHOS_VARIANTS;
    const all = PlantStore.allPlants();
    subSelect.innerHTML = sortByDisplayName(ids, all).map(id =>
      `<option value="${id}">${escapeHtml(all[id].displayName)}</option>`
    ).join("");
    subLabel.textContent = group === GROUP_SUCC ? "Succulent:" : "Pothos:";
  }

  function handlePrimaryChange() {
    const v = primarySelect.value;
    if (v === GROUP_SUCC || v === GROUP_POTH) {
      populateSubSelect(v);
      subWrap.hidden = false;
      renderPlantDetail(subSelect.value);
    } else {
      subWrap.hidden = true;
      renderPlantDetail(v);
    }
  }

  primarySelect.addEventListener("change", handlePrimaryChange);
  subSelect.addEventListener("change", () => renderPlantDetail(subSelect.value));

  function renderPlantDetail(plantId) {
    const all = PlantStore.allPlants();
    const plant = all[plantId];
    if (!plant) {
      detailEl.innerHTML = `<p class="muted">Plant not found.</p>`;
      return;
    }

    /* --- Conditions card --- */
    const c = plant.conditions || {};
    const conditionRows = [
      { key: "light",        label: "☀️ Light"        },
      { key: "temperature",  label: "🌡 Temperature"  },
      { key: "humidity",     label: "💨 Humidity"     },
      { key: "soilMoisture", label: "🪴 Soil"         }
    ].filter(r => c[r.key]).map(r => {
      const row = c[r.key];
      return `
        <div class="conditions-row">
          <div class="label">${r.label}</div>
          <div class="cell ideal"><strong>Ideal</strong>${escapeHtml(row.ideal || "—")}</div>
          <div class="cell passing"><strong>Passing</strong>${escapeHtml(row.passing || "—")}</div>
        </div>
      `;
    }).join("");
    const conditionsCard = conditionRows ? `
      <section class="conditions-card">
        <div class="conditions-head">📋 Ideal vs Passing Conditions</div>
        <div class="conditions-grid">${conditionRows}</div>
      </section>
    ` : "";

    /* --- Tip sections --- */
    const hasTips = plant.tips && Object.keys(plant.tips).length > 0;
    const sections = CARE_SECTIONS.map((s, i) => {
      const text = plant.tips?.[s.key];
      const body = text
        ? `<div class="care-body">${escapeHtml(text)}</div>`
        : `<div class="care-body coming-soon">Coming soon — add details for "${s.label}" in <code>js/plants-data.js</code> (or use the Plant Profile form to add a plant first).</div>`;
      return `
        <details class="care-section" ${i === 0 ? "open" : ""}>
          <summary><span class="icon">${s.icon}</span> ${s.label}</summary>
          ${body}
        </details>
      `;
    }).join("");

    /* --- Sources --- */
    const sources = (plant.sources || []).map(src =>
      `<li><a href="${escapeAttr(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.label)}</a></li>`
    ).join("");
    const sourcesBlock = `
      <div class="sources-section">
        <h3>📚 Sources &amp; Further Reading</h3>
        <ul>${sources || '<li class="muted">No sources yet — coming soon.</li>'}</ul>
      </div>
    `;

    /* --- Header --- */
    const commonNames = (plant.names?.common || []).map(escapeHtml).join(", ") || "—";
    const sci = plant.names?.scientific || "—";
    let potLabel = "Pot";
    let potValue = plant.potSize || "";
    if (plant.isPropagation) {
      potLabel = "Setup";
      const cuttingsLabel = (plant.cuttingsCount != null)
        ? `Water propagation (${plant.cuttingsCount} cutting${plant.cuttingsCount === 1 ? "" : "s"})`
        : "Water propagation";
      potValue = cuttingsLabel;
    }
    const potRow = (potValue && potValue !== "reference")
      ? `<div><strong>${potLabel}:</strong> ${escapeHtml(potValue)}</div>` : "";
    /* Cuttings/composition row — shown when the plant is in soil but contains
     * multiple cuttings or a mixed composition (so the title can stay clean
     * and the count still lives in the info area). For water-propagation
     * plants, the count is already baked into potValue above. */
    let cuttingsRow = "";
    if (!plant.isPropagation && plant.cuttingsCount != null && plant.cuttingsCount > 0) {
      const label = `${plant.cuttingsCount} cutting${plant.cuttingsCount === 1 ? "" : "s"}`;
      const compSuffix = plant.composition ? ` — ${plant.composition}` : "";
      cuttingsRow = `<div><strong>Cuttings:</strong> ${escapeHtml(label + compSuffix)}</div>`;
    }
    const condRow = plant.condition
      ? `<div><strong>Condition:</strong> <span class="badge">${escapeHtml(plant.condition)}</span></div>` : "";
    const customBadge = plant.isCustom ? `<div><span class="badge">Custom</span></div>` : "";
    const intervalParts = [];
    if (plant.wateringDaysHot != null) intervalParts.push(`🔥 ${plant.wateringDaysHot}d hot`);
    if (plant.wateringDays != null) intervalParts.push(`☀️ ${plant.wateringDays}d warm`);
    if (plant.wateringDaysCool != null) intervalParts.push(`❄️ ${plant.wateringDaysCool}d cool`);
    const interval = intervalParts.length ? intervalParts.join(" / ") : "—";

    const commentBlock = plant.comments
      ? `<p class="muted small">📝 ${escapeHtml(plant.comments)}</p>` : "";

    /* --- Transfer Plan card (only for water-propagation plants) --- */
    /* Repot signs card — universal, plant-specific bulleted list of what
     * to watch for. Applies to ANY plant (nursery-pot arrivals AND
     * established plants in their long-term pots). Renders only if the
     * plant has a `repotSigns` array with at least one entry. Sits between
     * the watering tile and the repot-suggestion card so users see the
     * general signs FIRST, then the actionable repot recommendation (if any).
     */
    let repotSignsCard = "";
    if (Array.isArray(plant.repotSigns) && plant.repotSigns.length) {
      const items = plant.repotSigns
        .filter(s => typeof s === "string" && s.trim().length)
        .map(s => `<li>${escapeHtml(s)}</li>`)
        .join("");
      if (items) {
        repotSignsCard = `
          <details class="repot-signs-card" open>
            <summary>
              <span class="repot-signs-icon">👀</span>
              <span class="repot-signs-label">Signs it's time to repot</span>
              <span class="repot-signs-count">${plant.repotSigns.length} to watch</span>
            </summary>
            <ul class="repot-signs-list">${items}</ul>
            <p class="repot-signs-footnote muted small">Watch for any of these — a single strong signal is usually enough to schedule a repot. Multiple signals together = time to act now.</p>
          </details>
        `;
      }
    }

    /* Repot suggestion card — for plants currently in a nursery pot that
     * need upsizing / soil-swap. Data shape (all optional except targetPotSize):
     *   repotSuggestion: {
     *     urgency:        "urgent" | "soon" | "seasonal",   // color accent
     *     targetPotSize:  '4"',                             // required
     *     targetSoilType: "cactus_mix",                     // SOIL_TYPES key
     *     timing:         "Within 2–4 weeks of purchase",   // free text
     *     technique:      "Multi-line procedure…",          // free text (\n = <br>)
     *     summary:        "One-line rationale",
     *     alternatives:   ["Terracotta 4\"","Ceramic 4\"",…]  // optional
     *   }
     */
    let repotSuggestionCard = "";
    if (plant.repotSuggestion && typeof plant.repotSuggestion === "object") {
      const rs = plant.repotSuggestion;
      const urgency = ["urgent", "soon", "seasonal"].includes(rs.urgency) ? rs.urgency : "soon";
      const urgencyLabel = {
        urgent:   "🔴 Urgent — do it now",
        soon:     "🟡 Soon — within a few weeks",
        seasonal: "🔵 Next spring is best"
      }[urgency];
      const targetSoilLabel = (rs.targetSoilType && SOIL_TYPES[rs.targetSoilType])
        ? SOIL_TYPES[rs.targetSoilType].label
        : (rs.targetSoilType || "—");
      const currentSoilLabel = (plant.currentSoilMix && SOIL_TYPES[plant.currentSoilMix])
        ? SOIL_TYPES[plant.currentSoilMix].label
        : (plant.currentSoilMix || "Nursery mix (unknown)");
      const altBlock = Array.isArray(rs.alternatives) && rs.alternatives.length
        ? `
          <details class="repot-alts">
            <summary>
              <span class="alt-icon">🔄</span>
              <span class="alt-label">Alternative pots</span>
              <span class="alt-count">${rs.alternatives.length} option${rs.alternatives.length === 1 ? "" : "s"}</span>
            </summary>
            <ul class="repot-alts-list">
              ${rs.alternatives.map(a => `<li>${escapeHtml(a)}</li>`).join("")}
            </ul>
          </details>
        `
        : "";
      const techniqueHtml = rs.technique
        ? `<div class="repot-technique"><strong>How to do it:</strong><br>${escapeHtml(rs.technique).replace(/\n/g, "<br>")}</div>`
        : "";
      repotSuggestionCard = `
        <section class="repot-suggestion-card urgency-${escapeAttr(urgency)}">
          <div class="repot-head">🪴 Repot Suggestion <span class="repot-urgency">${escapeHtml(urgencyLabel)}</span></div>
          <div class="repot-grid">
            <div class="repot-row">
              <span class="repot-key">📦 Current</span>
              <span class="repot-val">${escapeHtml(plant.potSize || "?")} nursery pot · ${escapeHtml(currentSoilLabel)}</span>
            </div>
            <div class="repot-row">
              <span class="repot-key">🎯 Target</span>
              <span class="repot-val"><strong>${escapeHtml(rs.targetPotSize || "?")}</strong> pot · ${escapeHtml(targetSoilLabel)}</span>
            </div>
            ${rs.timing ? `
              <div class="repot-row">
                <span class="repot-key">🗓 Timing</span>
                <span class="repot-val">${escapeHtml(rs.timing)}</span>
              </div>
            ` : ""}
          </div>
          ${rs.summary ? `<p class="repot-summary">${escapeHtml(rs.summary)}</p>` : ""}
          ${techniqueHtml}
          ${altBlock}
        </section>
      `;
    }

    let transferPlanCard = "";
    if (plant.isPropagation && plant.transferPlan) {
      const tp = plant.transferPlan;
      const soilLabel = (tp.soilType && SOIL_TYPES[tp.soilType])
        ? SOIL_TYPES[tp.soilType].label
        : (tp.soilType || "—");
      const cuttingsLabel = plant.cuttingsCount != null
        ? `ALL ${plant.cuttingsCount} cutting${plant.cuttingsCount === 1 ? "" : "s"}`
        : "all cuttings";
      /* Alternatives section — rendered as a collapsible <details> so the
       * primary recommendation stays prominent while options stay one tap away. */
      const altBlock = Array.isArray(tp.alternatives) && tp.alternatives.length
        ? `
          <details class="transfer-alts">
            <summary>
              <span class="alt-icon">🔄</span>
              <span class="alt-label">Alternative containers</span>
              <span class="alt-count">${tp.alternatives.length} option${tp.alternatives.length === 1 ? "" : "s"}</span>
            </summary>
            <ul class="transfer-alts-list">
              ${tp.alternatives.map(a => `<li>${escapeHtml(a)}</li>`).join("")}
            </ul>
          </details>
        `
        : "";
      transferPlanCard = `
        <section class="transfer-plan-card">
          <div class="transfer-head">📦 Transfer Plan — water → soil</div>
          <div class="transfer-grid">
            <div class="transfer-row">
              <span class="transfer-key">🪴 Pot size</span>
              <span class="transfer-val">${escapeHtml(tp.potSize || "—")}</span>
            </div>
            <div class="transfer-row">
              <span class="transfer-key">🌱 Soil mix</span>
              <span class="transfer-val">${escapeHtml(soilLabel)}</span>
            </div>
            <div class="transfer-row">
              <span class="transfer-key">👯 Clumping</span>
              <span class="transfer-val">${cuttingsLabel} together in ONE pot</span>
            </div>
          </div>
          ${tp.summary ? `<p class="transfer-summary">${escapeHtml(tp.summary)}</p>` : ""}
          ${altBlock}
          <p class="muted small transfer-when">
            Ready to transplant once <strong>roots are 2"+ long</strong> and the cutting has at least one new leaf since you started rooting it.
          </p>
        </section>
      `;
    }

    /*
     * Photo loading strategy:
     *   - Always try `data/images/<id>.jpg` first via <img src>.
     *   - If that fails (file missing or file:// blocked), fall back to the
     *     localStorage data URL (if any).
     *   - If neither loads, hide the figure entirely via onerror.
     * The "Save photo to folder" button appears only when a localStorage photo
     * exists for this plant (so the user can download a portable copy).
     */
    const folderSrc = folderPhotoPath(plant.id);
    const localUrl = plant.imageDataUrl || "";
    const hasAnyPhoto = !!localUrl; // best signal we have; folder file existence is async
    const photoActions = localUrl
      ? `<div class="photo-actions"><button type="button" class="secondary-btn save-photo-btn" data-id="${escapeAttr(plant.id)}">💾 Save photo to folder</button><span class="muted small">Move the downloaded file into <code>data/images/</code> to make it portable.</span></div>`
      : "";
    const onErrAttr = localUrl
      ? `this.onerror=null; this.src=this.dataset.fallback;`
      : `this.onerror=null; const fig=this.closest('.plant-photo-wrap'); if(fig) fig.style.display='none';`;
    /* Always attempt the folder src — onerror handles the no-photo case. */
    const photoBlock = `
      <figure class="plant-photo-wrap">
        <img src="${escapeAttr(folderSrc)}" alt="${escapeAttr(plant.displayName)} photo"
             ${localUrl ? `data-fallback="${escapeAttr(localUrl)}"` : ""}
             onerror="${onErrAttr}" />
        ${photoActions}
      </figure>
    `;

    /* Watering tile + inline log form. Rendered lazily by
     * `renderPlantWateringSection(plant.id)` right after innerHTML is set. */
    const plantWateringBlock = `
      <section class="plant-watering-section" data-plant-id="${escapeAttr(plant.id)}">
        <h3>💧 Next Watering</h3>
        <div class="plant-watering-tile"></div>
        <form class="plant-water-log-form" data-plant-id="${escapeAttr(plant.id)}">
          <div class="plant-water-log-inputs">
            <label>
              <span class="log-input-label">Date</span>
              <input type="date" name="date" class="plant-water-log-date" required />
            </label>
            <label class="plant-water-log-note-label">
              <span class="log-input-label">Note (optional)</span>
              <input type="text" name="note" class="plant-water-log-note" maxlength="140" placeholder="e.g. Bottom-watered, added drainage layer…" />
            </label>
          </div>
          <button type="submit" class="primary-btn plant-water-log-submit">💧 Log a watering</button>
        </form>
      </section>
    `;

    const plantTodosBlock = `
      <section class="plant-todos-section" data-plant-id="${escapeAttr(plant.id)}">
        <h3>📋 Todos for this plant <span class="muted small plant-todos-count"></span></h3>
        <div class="plant-todos-list"></div>
        <div class="plant-action-row">
          <button type="button" class="plant-todos-add-link" data-plant-id="${escapeAttr(plant.id)}">➕ Add / Manage todos for this plant</button>
          <button type="button" class="plant-ask-claude-link" data-plant-id="${escapeAttr(plant.id)}">🤖 Ask Claude about this plant</button>
        </div>
      </section>
    `;

    const plantNotesBlock = `
      <section class="plant-notes-section" data-plant-id="${escapeAttr(plant.id)}">
        <h3>📝 Notes from past chats <span class="muted small plant-notes-count"></span></h3>
        <div class="plant-notes-list"></div>
      </section>
    `;

    detailEl.innerHTML = `
      <header class="plant-header">
        <h2>${escapeHtml(plant.displayName)}</h2>
        <div class="plant-meta">
          ${potRow}
          ${cuttingsRow}
          ${condRow}
          ${customBadge}
          <div><strong>Category:</strong> <span class="badge">${escapeHtml((plant.category || "—").replace(/_/g, " "))}</span></div>
          <div><strong>Watering:</strong> ${interval}</div>
        </div>
        <div class="plant-names">
          <dl>
            <dt>Common</dt><dd>${commonNames}</dd>
            <dt>Scientific</dt><dd><em>${escapeHtml(sci)}</em></dd>
          </dl>
        </div>
        ${commentBlock}
      </header>

      ${photoBlock}
      ${plantWateringBlock}
      ${repotSignsCard}
      ${repotSuggestionCard}
      ${plantTodosBlock}
      ${plantNotesBlock}
      ${transferPlanCard}
      ${conditionsCard}
      ${sections}
      ${sourcesBlock}
    `;

    /* Render the watering tile + wire the inline log form. */
    renderPlantWateringSection(plant.id);
    const waterSection = detailEl.querySelector(".plant-watering-section");
    const waterForm    = waterSection?.querySelector(".plant-water-log-form");
    if (waterForm) {
      waterForm.addEventListener("submit", handlePlantDetailLogSubmit);
    }

    /* Render the plant's todos into the just-injected section, and wire up
     * the in-section action buttons (complete/edit/delete/reopen). */
    renderPlantTodosSection(plant.id);
    const todosSection = detailEl.querySelector(".plant-todos-section");
    if (todosSection) {
      todosSection.addEventListener("click", e => {
        const todoLink = e.target.closest(".plant-todos-add-link");
        if (todoLink) {
          openTodosForPlant(todoLink.dataset.plantId);
          return;
        }
        const askLink = e.target.closest(".plant-ask-claude-link");
        if (askLink) {
          openChatForPlant(askLink.dataset.plantId);
          return;
        }
        handleTodoListClick(e);
      });
    }

    /* Render saved Claude notes for this plant and wire delete + expand. */
    renderPlantNotesSection(plant.id);
    const notesSection = detailEl.querySelector(".plant-notes-section");
    if (notesSection) {
      notesSection.addEventListener("click", e => {
        const toggle = e.target.closest(".plant-note-toggle");
        if (toggle) {
          const body = toggle.closest(".plant-note-item").querySelector(".plant-note-body");
          if (body) {
            const open = !body.hasAttribute("hidden");
            if (open) { body.setAttribute("hidden", ""); toggle.textContent = "Show"; }
            else      { body.removeAttribute("hidden"); toggle.textContent = "Hide"; }
          }
          return;
        }
        const delBtn = e.target.closest(".plant-note-delete");
        if (delBtn) {
          const item = delBtn.closest(".plant-note-item");
          const noteId = item?.dataset.noteId;
          const plantId = notesSection.dataset.plantId;
          if (!noteId || !plantId) return;
          if (!confirm("Delete this saved note? This cannot be undone.")) return;
          CareNotesStore.remove(plantId, noteId);
          renderPlantNotesSection(plantId);
          flash("Note deleted 🗑");
        }
      });
    }

    /* Wire up the "Save photo to folder" button(s) */
    detailEl.querySelectorAll(".save-photo-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const url = ImageStore.get(id);
        if (!url) { alert("No photo in localStorage to save. Upload one first via the Plant Profile form."); return; }
        downloadDataUrl(url, `${id}.jpg`);
        flash(`Downloaded ${id}.jpg — move it into data/images/`);
      });
    });
  }

  /* ============================================================
   * Calendar
   * ============================================================ */
  const calPlantSelect      = document.getElementById("calendar-plant");
  const calPlantClearBtn    = document.getElementById("calendar-plant-clear");
  const calMonthSelect      = document.getElementById("calendar-month");
  const calDateFilter       = document.getElementById("calendar-date-filter");
  const calDateFilterClear  = document.getElementById("calendar-date-filter-clear");
  const calGrid             = document.getElementById("calendar-grid");
  const calPillPopover      = document.getElementById("cal-pill-popover");
  const calPillPopoverBody  = calPillPopover?.querySelector(".cal-pill-popover-body") || null;
  const calPillPopoverClose = calPillPopover?.querySelector(".cal-pill-popover-close") || null;
  const calendarWrap        = calGrid ? calGrid.parentElement : null;
  const nextSummary         = document.getElementById("next-water-summary");

  function populateCalendarPlantSelect() {
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    const opts = [`<option value="ALL">All My Plants</option>`].concat(
      ownedIds.map(id => `<option value="${id}">${escapeHtml(all[id].displayName)}</option>`)
    );
    calPlantSelect.innerHTML = opts.join("");
  }

  function renderCalendar() {
    const month = parseInt(calMonthSelect.value, 10);
    const selection = calPlantSelect.value;
    const today = Dates.today();
    const log = WaterLog.all();
    const all = PlantStore.allPlants();
    const ownedIds = PlantStore.ownedIds();
    const plantIds = selection === "ALL" ? ownedIds : [selection];

    const cells = {};
    plantIds.forEach(pid => {
      if (!all[pid]) return;
      const schedule = buildSchedule(pid, log, all[pid]);
      schedule.forEach(item => {
        const iso = Dates.iso(item.date);
        (cells[iso] ||= []).push({ plantId: pid, type: item.type });
      });
    });

    const { first, last } = Dates.monthRange(2026, month);
    const startWeekday = first.getDay();
    const daysInMonth = last.getDate();

    const headerDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      .map(d => `<div class="cal-head">${d}</div>`).join("");

    const cellsHtml = [];
    for (let i = 0; i < startWeekday; i++) cellsHtml.push(`<div class="cal-day empty"></div>`);

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(2026, month, d);
      const iso = Dates.iso(date);
      const isToday = date.getTime() === today.getTime();
      const items = cells[iso] || [];

      const pills = items.map(item => {
        const plantName = all[item.plantId]?.displayName || item.plantId;
        let cls = "pill-scheduled";
        if (item.type === "actual") cls = "pill-actual";
        else {
          const days = Dates.daysBetween(today, date);
          if (days < 0 || days === 0) cls = "pill-due";
          else if (days <= 3) cls = "pill-soon";
        }
        return `<button type="button" class="pill ${cls}"
                  data-plant-id="${escapeAttr(item.plantId)}"
                  data-type="${escapeAttr(item.type)}"
                  data-date="${escapeAttr(iso)}"
                  aria-label="${escapeAttr(plantName)} — ${item.type} on ${iso}"
                  title="${escapeAttr(plantName)} — ${item.type}">${escapeHtml(shortName(plantName))}</button>`;
      }).join("");

      cellsHtml.push(`
        <div class="cal-day ${isToday ? "is-today" : ""}">
          <div class="day-num">${d}</div>
          <div class="pills">${pills}</div>
        </div>
      `);
    }

    calGrid.innerHTML = headerDays + cellsHtml.join("");
    renderNextSummary(log);
  }

  function shortName(name) {
    if (name.length <= 10) return name;
    return name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 4);
  }

  /* ------------------------------------------------------------------
   * Shared watering-tile HTML.
   *
   * Rendered both by `renderNextSummary` on the Calendar tab (a list of
   * these for every owned plant) and by `renderPlantDetail` on the Care
   * Guide tab (a single one for the currently-viewed plant). Keeping the
   * markup identical means the snooze pointer-event handler and the
   * .row.due / .row.soon / .row.scheduled status classes work in both
   * places without any per-caller branching.
   *
   * `opts.includeName` — set false when the caller already shows the
   * plant name in a bigger heading (e.g. Care Guide detail header).
   * ------------------------------------------------------------------ */
  function renderWaterTileHtml(pid, plant, nx, opts = {}) {
    const { includeName = true } = opts;

    const statusLabel = {
      overdue:   `⚠️ Overdue ${Math.abs(nx.daysUntil)}d`,
      due:       "💧 Water today",
      soon:      `🟡 In ${nx.daysUntil}d`,
      scheduled: `🔵 In ${nx.daysUntil}d`
    }[nx.status];

    const rowClass = (nx.status === "overdue" || nx.status === "due") ? "due"
                   : nx.status === "soon" ? "soon" : "scheduled";

    const lastTxt = nx.lastDate ? `Last: ${Dates.formatPretty(nx.lastDate)}` : "No log yet";
    const nextTxt = `Next: ${Dates.formatPretty(nx.nextDate)}`;
    const snoozeTxt = nx.snooze ? ` · 🕗 snoozed +${nx.snooze}d` : "";

    const waterNowBtn = `
      <div class="water-now-row">
        <button type="button" class="water-now-btn" data-id="${escapeAttr(pid)}" title="Log a watering for ${escapeAttr(plant.displayName)} today">💧 Just watered</button>
      </div>
    `;

    const snoozeButtons = `
      <div class="snooze-row">
        <span class="snooze-label">Snooze:</span>
        <button class="snooze-btn" data-id="${escapeAttr(pid)}" data-days="1">+1d</button>
        <button class="snooze-btn" data-id="${escapeAttr(pid)}" data-days="3">+3d</button>
        <button class="snooze-btn" data-id="${escapeAttr(pid)}" data-days="7">+7d</button>
        <button class="snooze-btn" data-id="${escapeAttr(pid)}" data-days="14">+14d</button>
        ${nx.snooze ? `<button class="snooze-btn snooze-clear" data-id="${escapeAttr(pid)}" data-clear="1">↺ clear</button>` : ""}
      </div>
    `;

    /* When the name is shown (calendar tiles), render it as a link/button that
     * jumps to this plant's Care Guide. In the Care Guide detail tile
     * (includeName:false) there's no link — you're already on that page. */
    const nameHtml = `<button type="button" class="tile-name-link" data-care-plant-id="${escapeAttr(pid)}" title="Open ${escapeAttr(plant.displayName)} care guide">${escapeHtml(plant.displayName)}<span class="tile-name-link-icon" aria-hidden="true">📖</span></button>`;

    const mainLeft = includeName
      ? `<div><div class="name">${nameHtml}</div><div class="when">${lastTxt} · ${nextTxt}${snoozeTxt}</div></div>`
      : `<div class="when">${lastTxt} · ${nextTxt}${snoozeTxt}</div>`;

    return `
      <div class="row ${rowClass}" data-plant-id="${escapeAttr(pid)}">
        <div class="row-main">
          ${mainLeft}
          <div><strong>${statusLabel}</strong></div>
        </div>
        ${waterNowBtn}
        ${snoozeButtons}
      </div>
    `;
  }

  function renderNextSummary(log) {
    const all = PlantStore.allPlants();
    const plantFilter = calPlantSelect ? calPlantSelect.value : "ALL";
    const dateFilter  = calDateFilter ? calDateFilter.value : "";

    let candidateIds = PlantStore.ownedIds().slice();
    if (plantFilter && plantFilter !== "ALL") {
      candidateIds = candidateIds.filter(id => id === plantFilter);
    }
    if (dateFilter) {
      candidateIds = candidateIds.filter(id => Array.isArray(log[id]) && log[id].includes(dateFilter));
    }

    /* Build meta per candidate (skip plants without a nextWatering result). */
    const meta = candidateIds
      .map(pid => ({ pid, plant: all[pid], nx: all[pid] ? nextWatering(pid, log, all[pid]) : null }))
      .filter(x => x.plant && x.nx);

    /* Sort by urgency (most overdue first), tiebreak alphabetically. A snooze
     * or a fresh water log naturally bumps `daysUntil` forward, so the tile
     * automatically moves down the queue without any extra logic. */
    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    meta.sort((a, b) => {
      if (a.nx.daysUntil !== b.nx.daysUntil) return a.nx.daysUntil - b.nx.daysUntil;
      return collator.compare(a.plant.displayName, b.plant.displayName);
    });

    const filterSuffixParts = [];
    if (plantFilter && plantFilter !== "ALL" && all[plantFilter]) {
      filterSuffixParts.push(`🌿 ${all[plantFilter].displayName}`);
    }
    if (dateFilter) {
      filterSuffixParts.push(`💧 logged on ${Dates.formatPretty(new Date(dateFilter + "T00:00:00"))}`);
    }
    const filterBadge = filterSuffixParts.length
      ? ` · <span class="filter-badge">${escapeHtml(filterSuffixParts.join(" · "))}</span>`
      : "";

    let bodyHtml;
    if (meta.length === 0) {
      const emptyMsg = dateFilter
        ? `No plants have a watering logged on ${escapeHtml(Dates.formatPretty(new Date(dateFilter + "T00:00:00")))}.`
        : plantFilter && plantFilter !== "ALL"
          ? `No watering data for the selected plant.`
          : `No plants to schedule yet — add one from the Log &amp; Data tab.`;
      bodyHtml = `<div class="next-list-empty">${emptyMsg}</div>`;
    } else {
      const rows = meta.map(({ pid, plant, nx }) => renderWaterTileHtml(pid, plant, nx)).join("");
      bodyHtml = `<div class="next-list">${rows}</div>`;
    }

    nextSummary.innerHTML = `
      <h2>Next Watering <span class="muted small" style="font-weight:400;">· 📍 ${escapeHtml(SEASONAL_CONFIG.location)}${filterBadge}</span></h2>
      ${bodyHtml}
    `;

    /* Snooze buttons are wired via event delegation in init(). The handler
     * lives on the stable `nextSummary` parent so it survives every re-render
     * — this avoids a race on Android Samsung Internet where rapid taps could
     * hit a button whose freshly-attached listener wasn't yet in place. */
  }

  function syncCalendarControlClears() {
    if (calPlantClearBtn) {
      calPlantClearBtn.hidden = !calPlantSelect || calPlantSelect.value === "ALL";
    }
    if (calDateFilterClear) {
      calDateFilterClear.hidden = !calDateFilter || !calDateFilter.value;
    }
  }

  calPlantSelect.addEventListener("change", () => {
    syncCalendarControlClears();
    hidePillPopover();
    renderCalendar();
  });
  calMonthSelect.addEventListener("change", () => {
    hidePillPopover();
    renderCalendar();
  });
  if (calDateFilter) {
    calDateFilter.addEventListener("change", () => {
      syncCalendarControlClears();
      renderCalendar();
    });
  }
  if (calPlantClearBtn) {
    calPlantClearBtn.addEventListener("click", () => {
      calPlantSelect.value = "ALL";
      syncCalendarControlClears();
      hidePillPopover();
      renderCalendar();
    });
  }
  if (calDateFilterClear) {
    calDateFilterClear.addEventListener("click", () => {
      if (!calDateFilter) return;
      calDateFilter.value = "";
      syncCalendarControlClears();
      renderCalendar();
    });
  }

  /* ============================================================
   * Calendar pill popover — tap any plant abbreviation to see
   * the full name + watering type. One shared popover element
   * anchors above the tapped pill; clicking anywhere else or
   * pressing Escape closes it.
   * ============================================================ */
  let activePill = null;

  function showPillPopover(pill) {
    if (!calPillPopover || !calPillPopoverBody || !calendarWrap) return;
    const plantId = pill.dataset.plantId;
    const type    = pill.dataset.type;
    const iso     = pill.dataset.date;
    const all     = PlantStore.allPlants();
    const plant   = all[plantId];
    const name    = plant?.displayName || plantId;
    const typeLabel = type === "actual"
      ? "💧 Logged watering"
      : "📅 Scheduled watering";
    const prettyDate = iso ? Dates.formatPretty(new Date(iso + "T00:00:00")) : "";
    calPillPopoverBody.innerHTML = `
      <div class="pop-name">${escapeHtml(name)}</div>
      <div class="pop-type">${typeLabel}</div>
      <div class="pop-date muted small">${escapeHtml(prettyDate)}</div>
    `;
    /* Position above the pill, centered horizontally over it. */
    const wrapRect = calendarWrap.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const left = (pillRect.left - wrapRect.left) + (pillRect.width / 2);
    const top  = (pillRect.top  - wrapRect.top);
    calPillPopover.style.left = `${left}px`;
    calPillPopover.style.top  = `${top}px`;
    calPillPopover.hidden = false;
    /* Clamp horizontally so it stays inside the wrap on phones. */
    const popRect = calPillPopover.getBoundingClientRect();
    const halfW = popRect.width / 2;
    const minLeft = halfW + 4;
    const maxLeft = wrapRect.width - halfW - 4;
    const clampedLeft = Math.max(minLeft, Math.min(maxLeft, left));
    calPillPopover.style.left = `${clampedLeft}px`;

    if (activePill) activePill.classList.remove("is-open");
    activePill = pill;
    pill.classList.add("is-open");
  }

  function hidePillPopover() {
    if (!calPillPopover) return;
    calPillPopover.hidden = true;
    if (activePill) {
      activePill.classList.remove("is-open");
      activePill = null;
    }
  }

  if (calGrid) {
    calGrid.addEventListener("click", e => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      e.preventDefault();
      e.stopPropagation();
      if (activePill === pill) {
        hidePillPopover();
      } else {
        showPillPopover(pill);
      }
    });
  }
  if (calPillPopoverClose) {
    calPillPopoverClose.addEventListener("click", e => {
      e.stopPropagation();
      hidePillPopover();
    });
  }
  document.addEventListener("click", e => {
    if (!calPillPopover || calPillPopover.hidden) return;
    if (e.target.closest(".pill") || e.target.closest(".cal-pill-popover")) return;
    hidePillPopover();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") hidePillPopover();
  });

  /* ============================================================
   * Log a watering
   * ============================================================ */
  const logPlantSelect = document.getElementById("log-plant");
  const logDate        = document.getElementById("log-date");
  const logNote        = document.getElementById("log-note");
  const logForm        = document.getElementById("water-log-form");
  const recentLogEl    = document.getElementById("recent-log");

  function populateLogPlantSelect() {
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    logPlantSelect.innerHTML = ownedIds.map(id =>
      `<option value="${id}">${escapeHtml(all[id].displayName)}</option>`
    ).join("");
  }

  function renderRecentLog() {
    const all = PlantStore.allPlants();
    const entries = WaterLog.all()
      .map(e => ({ ...e, _date: Dates.fromIso(e.date) }))
      .sort((a, b) => b._date - a._date);

    if (entries.length === 0) {
      recentLogEl.innerHTML = `<p class="muted">No waterings logged yet. Log your first watering above! 🌱</p>`;
      return;
    }

    recentLogEl.innerHTML = entries.slice(0, 50).map(e => {
      const plantName = all[e.plantId]?.displayName || e.plantId;
      return `
        <div class="log-item">
          <div class="log-name">${plantCareLinkHtml(e.plantId, plantName)}</div>
          <div class="log-date">${Dates.formatPretty(e._date)}</div>
          <button class="log-remove" data-id="${escapeAttr(e.id)}" title="Remove">✕</button>
          ${e.note ? `<div class="log-note">"${escapeHtml(e.note)}"</div>` : ""}
        </div>
      `;
    }).join("");

    recentLogEl.querySelectorAll(".log-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Remove this watering entry?")) {
          WaterLog.remove(btn.dataset.id);
          renderRecentLog();
        }
      });
    });
  }

  logForm.addEventListener("submit", e => {
    e.preventDefault();
    const entry = {
      plantId: logPlantSelect.value,
      date: logDate.value,
      note: logNote.value.trim()
    };
    if (!entry.plantId || !entry.date) return;
    WaterLog.add(entry);
    logNote.value = "";
    renderRecentLog();
    flash("Logged! 🌿");
  });

  /* ============================================================
   * Plant Profile form (add / update)
   * ============================================================ */
  const profileForm     = document.getElementById("profile-form");
  const profileMode     = document.getElementById("profile-mode");
  const profileEditRow  = document.getElementById("profile-edit-row");
  const profileExisting = document.getElementById("profile-existing");
  const profileNameRow  = document.getElementById("profile-name-row");
  const profileSciRow   = document.getElementById("profile-sci-row");
  const profileCatRow   = document.getElementById("profile-cat-row");
  const profileWateringInfoText   = document.getElementById("profile-watering-info-text");
  const profileWateringInfoValues = document.getElementById("profile-watering-info-values");
  const profileName     = document.getElementById("profile-name");
  const profileSci      = document.getElementById("profile-scientific");
  const profileCategory = document.getElementById("profile-category");
  const profilePot      = document.getElementById("profile-pot");
  const profileSoil     = document.getElementById("profile-soil");
  const profileCondition = document.getElementById("profile-condition");
  const profileLastWatered = document.getElementById("profile-last-watered");
  const profileComments = document.getElementById("profile-comments");
  const profileDelete   = document.getElementById("profile-delete");
  const profileImageInput        = document.getElementById("profile-image");
  const profileImagePreview      = document.getElementById("profile-image-preview");
  const profileImageRemove       = document.getElementById("profile-image-remove");
  const profileImageSaveToFolder = document.getElementById("profile-image-save-to-folder");

  /* Pending image state for the form (data URL string OR null = removed OR undefined = unchanged) */
  let pendingImage = undefined;

  function setProfilePreview(dataUrl) {
    if (dataUrl) {
      profileImagePreview.innerHTML = `<img src="${escapeAttr(dataUrl)}" alt="Plant photo preview" />`;
      profileImagePreview.hidden = false;
      profileImageRemove.hidden = false;
      profileImageSaveToFolder.hidden = false;
    } else {
      profileImagePreview.innerHTML = "";
      profileImagePreview.hidden = true;
      profileImageRemove.hidden = true;
      profileImageSaveToFolder.hidden = true;
    }
  }

  profileImageSaveToFolder.addEventListener("click", () => {
    /* Use the current preview content as the source (pending OR existing) */
    const previewImg = profileImagePreview.querySelector("img");
    const src = previewImg?.src;
    if (!src || !src.startsWith("data:")) { alert("No photo to save yet — upload one first."); return; }
    let id;
    if (profileMode.value === "edit") {
      id = profileExisting.value;
    } else {
      // For a brand-new plant that hasn't been saved yet, ask for a placeholder filename
      const name = profileName.value.trim();
      if (!name) { alert("Enter a plant name first, then save the plant, then save the photo to folder."); return; }
      id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "new_plant";
    }
    if (!id) return;
    downloadDataUrl(src, `${id}.jpg`);
    flash(`Downloaded ${id}.jpg — move it into data/images/`);
  });

  profileImageInput.addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file, 800, 0.85);
      pendingImage = dataUrl;
      setProfilePreview(dataUrl);
    } catch (err) {
      alert("Could not process image: " + err.message);
    }
    e.target.value = "";
  });

  profileImageRemove.addEventListener("click", () => {
    pendingImage = null;
    setProfilePreview(null);
  });

  function populateProfileStaticSelects() {
    profileCategory.innerHTML = (PLANT_CATEGORIES_FOR_CUSTOM || []).map(c =>
      `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`
    ).join("");
    profileCondition.innerHTML = `<option value="">— Choose —</option>` +
      (PLANT_CONDITION_OPTIONS || []).map(c =>
        `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`
      ).join("");
    /* Soil mix dropdown — pending first (default), then standard list, then "other" */
    const soilOrder = [
      "pending", "standard_potting", "amended_potting", "aroid_mix", "cactus_mix",
      "orchid_bark", "sphagnum_moss", "bonsai_mix", "african_violet", "leca",
      "water_propagation", "other"
    ];
    profileSoil.innerHTML = soilOrder
      .filter(k => SOIL_TYPES[k])
      .map(k => `<option value="${escapeAttr(k)}">${escapeHtml(SOIL_TYPES[k].label)}</option>`)
      .join("");
  }

  function populateProfileExisting() {
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    profileExisting.innerHTML = ownedIds.map(id => {
      const p = all[id];
      const tag = p.isCustom ? " (custom)" : "";
      return `<option value="${id}">${escapeHtml(p.displayName)}${tag}</option>`;
    }).join("");
  }

  function setProfileFieldsVisibility(mode) {
    const isEdit = mode === "edit";
    profileEditRow.hidden  = !isEdit;
    profileNameRow.hidden  = isEdit && !isEditingCustom();
    profileSciRow.hidden   = isEdit && !isEditingCustom();
    profileCatRow.hidden   = isEdit && !isEditingCustom();
    profileDelete.hidden   = !(isEdit && isEditingCustom());
    updateWateringInfoDisplay(mode);
  }

  function updateWateringInfoDisplay(mode) {
    const cat = profileCategory.value || "";
    if (mode === "new") {
      const d = defaultIntervalsForCategory(cat);
      profileWateringInfoText.innerHTML =
        `Watering intervals are <strong>research-based</strong> (Missouri Botanical Garden, RHS, The Sill, Costa Farms, etc.) — not editable here. New custom plants use sensible category defaults for "<strong>${escapeHtml(cat || "Other")}</strong>" until an agent promotes them to a researched built-in entry in <code>js/plants-data.js</code>.`;
      renderWateringPills(d.hot, d.warm, d.cool, "category default");
    } else {
      const id = profileExisting.value;
      const p = id ? PlantStore.allPlants()[id] : null;
      if (!p) {
        profileWateringInfoText.textContent = "Watering intervals are research-based and set in js/plants-data.js — not editable here.";
        profileWateringInfoValues.hidden = true;
        return;
      }
      if (p.isCustom) {
        profileWateringInfoText.innerHTML =
          `Category defaults applied when this custom plant was created. Edit <code>js/plants-data.js</code> to promote it to a researched built-in entry.`;
      } else {
        profileWateringInfoText.innerHTML =
          `<strong>Researched values</strong> from authoritative sources (see the Sources section on this plant's care page). Intervals are sourced — not user input.`;
      }
      renderWateringPills(p.wateringDaysHot, p.wateringDays, p.wateringDaysCool);
    }
  }

  function renderWateringPills(hot, warm, cool, suffix) {
    const tag = suffix ? ` <span class="muted small">(${escapeHtml(suffix)})</span>` : "";
    profileWateringInfoValues.innerHTML = `
      <span class="pill">🔥 Hot ${hot ?? "—"}d</span>
      <span class="pill">☀️ Warm ${warm ?? "—"}d</span>
      <span class="pill">❄️ Cool ${cool ?? "—"}d</span>
      ${tag}
    `;
    profileWateringInfoValues.hidden = false;
  }

  function isEditingCustom() {
    if (profileMode.value !== "edit") return false;
    const id = profileExisting.value;
    if (!id) return false;
    return id.startsWith("user_");
  }

  function resetProfileForm(mode = "new") {
    profileMode.value = mode;
    populateProfileExisting();
    pendingImage = undefined;
    if (mode === "new") {
      profileName.value = "";
      profileSci.value = "";
      profileCategory.selectedIndex = 0;
      profilePot.value = "";
      profileSoil.value = "pending";
      profileCondition.value = "";
      profileLastWatered.value = "";
      profileComments.value = "";
      setProfilePreview(null);
    } else {
      loadProfileFromExisting();
    }
    setProfileFieldsVisibility(mode);
  }

  function loadProfileFromExisting() {
    const id = profileExisting.value;
    const all = PlantStore.allPlants();
    const p = all[id];
    if (!p) return;
    profileName.value = p.displayName || "";
    profileSci.value = p.names?.scientific || "";
    // category select might not have this option; fall back gracefully
    const cat = p.category || "";
    let matched = false;
    Array.from(profileCategory.options).forEach(o => {
      if (o.value.toLowerCase() === cat.toLowerCase()) { o.selected = true; matched = true; }
    });
    if (!matched && profileCategory.options.length) profileCategory.selectedIndex = 0;
    profilePot.value = p.potSize && p.potSize !== "reference" ? p.potSize : "";
    profileSoil.value = p.currentSoilMix && SOIL_TYPES[p.currentSoilMix] ? p.currentSoilMix : "pending";
    profileCondition.value = p.condition || "";
    profileLastWatered.value = "";
    profileComments.value = p.comments || "";
    pendingImage = undefined;
    setProfilePreview(ImageStore.get(id));
    setProfileFieldsVisibility("edit");
  }

  profileMode.addEventListener("change", () => resetProfileForm(profileMode.value));
  profileExisting.addEventListener("change", () => { loadProfileFromExisting(); setProfileFieldsVisibility("edit"); });
  profileCategory.addEventListener("change", () => updateWateringInfoDisplay(profileMode.value));

  profileForm.addEventListener("submit", e => {
    e.preventDefault();
    const mode = profileMode.value;

    if (mode === "new") {
      const name = profileName.value.trim();
      if (!name) { alert("Please enter a plant name."); return; }
      const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const cat = profileCategory.value || "Other";
      const sci = profileSci.value.trim();
      const pot = profilePot.value.trim();
      const cond = profileCondition.value;
      const defaults = defaultIntervalsForCategory(cat);
      const warm = defaults.warm;
      const cool = defaults.cool;
      const hot  = defaults.hot;

      const soilChoice = profileSoil.value || "pending";
      const idealSoilDefaults = defaultIdealSoilForCategory(cat);

      const newPlant = {
        id,
        isCustom: true,
        displayName: name,
        potSize: pot || "—",
        category: cat,
        names: { common: [name], scientific: sci },
        wateringDays: warm,
        wateringDaysHot: hot,
        wateringDaysCool: cool,
        currentSoilMix: soilChoice,
        idealSoil: idealSoilDefaults,
        soilNotes: "",
        conditions: {},
        tips: {},
        sources: [],
        condition: cond,
        comments: profileComments.value.trim()
      };
      PlantStore.upsertCustom(newPlant);

      if (pendingImage !== undefined) {
        if (pendingImage === null) ImageStore.remove(id);
        else ImageStore.set(id, pendingImage);
      }

      if (profileLastWatered.value) {
        WaterLog.add({ plantId: id, date: profileLastWatered.value, note: "(initial profile entry)" });
      }

      refreshAllDropdowns();
      flash(`Added "${name}" 🌿`);
      resetProfileForm("edit");
      profileExisting.value = id;
      loadProfileFromExisting();

    } else {
      // edit mode
      const id = profileExisting.value;
      if (!id) return;
      const isCustom = id.startsWith("user_");

      if (isCustom) {
        const all = PlantStore.allPlants();
        const existing = all[id];
        const newCat = profileCategory.value || existing.category;
        // If category changed, refresh intervals AND idealSoil from category defaults.
        const intervalsChanged = newCat !== existing.category;
        const defaults = defaultIntervalsForCategory(newCat);
        const updated = {
          ...existing,
          displayName: profileName.value.trim() || existing.displayName,
          potSize: profilePot.value.trim() || existing.potSize,
          category: newCat,
          names: {
            common: [profileName.value.trim() || existing.displayName],
            scientific: profileSci.value.trim()
          },
          wateringDays: intervalsChanged ? defaults.warm : existing.wateringDays,
          wateringDaysHot: intervalsChanged ? defaults.hot  : existing.wateringDaysHot,
          wateringDaysCool: intervalsChanged ? defaults.cool : existing.wateringDaysCool,
          currentSoilMix: profileSoil.value || "pending",
          idealSoil: intervalsChanged ? defaultIdealSoilForCategory(newCat) : (existing.idealSoil || defaultIdealSoilForCategory(newCat)),
          condition: profileCondition.value || "",
          comments: profileComments.value.trim()
        };
        PlantStore.upsertCustom(updated);
      } else {
        PlantStore.setOverlay(id, {
          potSize: profilePot.value.trim() || PLANTS[id].potSize,
          condition: profileCondition.value || undefined,
          comments: profileComments.value.trim() || undefined,
          currentSoilMix: profileSoil.value || undefined
        });
      }

      if (pendingImage !== undefined) {
        if (pendingImage === null) ImageStore.remove(id);
        else ImageStore.set(id, pendingImage);
      }

      if (profileLastWatered.value) {
        WaterLog.add({ plantId: id, date: profileLastWatered.value, note: "(profile last-watered update)" });
      }

      refreshAllDropdowns();
      flash("Saved ✔");
      renderRecentLog();
    }
  });

  profileDelete.addEventListener("click", () => {
    const id = profileExisting.value;
    if (!id || !id.startsWith("user_")) return;
    if (!confirm("Delete this custom plant, its overlay data, and its photo? Watering log entries will remain.")) return;
    PlantStore.removeCustom(id);
    PlantStore.removeOverlay(id);
    ImageStore.remove(id);
    refreshAllDropdowns();
    resetProfileForm("new");
    flash("Deleted.");
  });

  /**
   * Category-based watering interval defaults (research-aligned, NOT user input).
   *
   * Numbers are pulled from common care-guide consensus across Missouri Botanical
   * Garden, RHS, The Sill, Costa Farms, and Bloomscape for the indoor 75–80°F
   * Austin context the app is calibrated for. They are intentionally conservative
   * — when a custom plant is later promoted to a built-in entry in
   * `js/plants-data.js`, that entry's researched values override these defaults.
   */
  function defaultIntervalsForCategory(cat) {
    const c = (cat || "").toLowerCase();
    if (c.includes("succulent") || c.includes("cactus")) return { hot: 18, warm: 21, cool: 35 };
    if (c.includes("succulent_like"))                    return { hot: 14, warm: 18, cool: 28 };
    if (c.includes("bonsai"))                            return { hot: 5,  warm: 7,  cool: 11 };
    if (c.includes("grass") || c.includes("ornamental")) return { hot: 5,  warm: 6,  cool: 9  };
    if (c.includes("fern"))                              return { hot: 3,  warm: 4,  cool: 6  };
    if (c.includes("pothos"))                            return { hot: 7,  warm: 9,  cool: 13 };
    if (c.includes("tropical"))                          return { hot: 8,  warm: 10, cool: 14 };
    /* generic safe default */
    return { hot: 6, warm: 8, cool: 12 };
  }

  /**
   * Category-based "ideal soil" defaults — used when a custom plant is
   * created and we don't yet have plant-specific soil research. Once an
   * agent promotes the custom to a built-in entry, the entry's hand-curated
   * idealSoil[] takes over.
   */
  function defaultIdealSoilForCategory(cat) {
    const c = (cat || "").toLowerCase();
    if (c.includes("succulent") || c.includes("cactus")) return ["cactus_mix"];
    if (c.includes("succulent_like"))                    return ["cactus_mix", "standard_potting"];
    if (c.includes("bonsai"))                            return ["bonsai_mix"];
    if (c.includes("grass") || c.includes("ornamental")) return ["standard_potting", "african_violet"];
    if (c.includes("fern"))                              return ["african_violet", "standard_potting"];
    if (c.includes("pothos") || c.includes("aroid"))     return ["aroid_mix", "standard_potting"];
    if (c.includes("orchid"))                            return ["orchid_bark", "sphagnum_moss"];
    if (c.includes("tropical"))                          return ["standard_potting", "aroid_mix"];
    return ["standard_potting"];
  }

  /* ============================================================
   * Import / Export / Template
   * ============================================================ */
  document.getElementById("export-json").addEventListener("click", () => {
    const data = {
      waterLog: WaterLog.all(),
      customPlants: PlantStore.customPlants(),
      overlays: PlantStore.overlays(),
      images: ImageStore.all(),
      snoozes: SnoozeStore.all(),
      todos: TodoStore.all(),
      careNotes: CareNotesStore.all(),
      roomPlan: RoomPlanStore.all(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plant-care-export-${Dates.iso(new Date())}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById("import-json").addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        // Accept two shapes: bare array (watering log only) OR new combined object
        if (Array.isArray(parsed)) {
          WaterLog.replaceAll(parsed);
        } else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.waterLog)) WaterLog.replaceAll(parsed.waterLog);
          if (Array.isArray(parsed.customPlants)) PlantStore.saveCustom(parsed.customPlants);
          if (parsed.overlays && typeof parsed.overlays === "object") PlantStore.saveOverlays(parsed.overlays);
          if (parsed.images && typeof parsed.images === "object") ImageStore.saveAll(parsed.images);
          if (parsed.snoozes && typeof parsed.snoozes === "object") SnoozeStore.save(parsed.snoozes);
          if (parsed.todos !== undefined) TodoStore.replaceAll(parsed.todos);
          if (parsed.careNotes !== undefined) CareNotesStore.replaceAll(parsed.careNotes);
          if (parsed.roomPlan !== undefined) RoomPlanStore.replaceAll(parsed.roomPlan);
        } else {
          throw new Error("Unrecognized JSON shape.");
        }
        refreshAllDropdowns();
        renderRecentLog();
        renderTodosTab();
        renderPlacementTab();
        /* If the Care Guide is currently rendering a plant, refresh its notes
         * strip so any imported saved notes show up immediately. */
        const visiblePlant = detailEl?.querySelector(".plant-notes-section");
        if (visiblePlant) renderPlantNotesSection(visiblePlant.dataset.plantId);
        flash("Imported! 📥");
      } catch (err) {
        alert("Could not import file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("load-template").addEventListener("click", async () => {
    try {
      const res = await fetch("data/watering-log.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = await res.json();
      if (!Array.isArray(parsed)) throw new Error("Template should be an array of entries.");
      if (!confirm(`Load ${parsed.length} entries from data/watering-log.json? This replaces your current log.`)) return;
      WaterLog.replaceAll(parsed);
      renderRecentLog();
      flash("Template loaded! 📄");
    } catch (err) {
      alert(
        "Could not load template file. If you're opening index.html directly (file://), " +
        "your browser may block local file fetches. Use the Import JSON button instead, " +
        "or run a local server (see README).\n\nDetails: " + err.message
      );
    }
  });

  document.getElementById("clear-log").addEventListener("click", () => {
    if (confirm("Clear ALL logged waterings? This cannot be undone.")) {
      WaterLog.clear();
      renderRecentLog();
      flash("Cleared.");
    }
  });

  /* ============================================================
   * Helpers
   * ============================================================ */
  function refreshAllDropdowns() {
    populatePrimarySelect();
    populateCalendarPlantSelect();
    populateLogPlantSelect();
    populateProfileExisting();
    populateTodoDropdowns();
    populateChatDropdowns();
    // Refresh whatever's currently displayed
    handlePrimaryChange();
    renderCalendar();
    /* Re-render the soil tab if it's the active panel */
    if (document.querySelector("#tab-soil.active")) renderSoilTab();
    /* Re-render the todos tab if it's the active panel */
    if (document.querySelector("#tab-todos.active")) renderTodosTab();
    /* Re-render chat tab dropdowns if it's the active panel */
    if (document.querySelector("#tab-chat.active")) renderChatTab();
  }

  /* ============================================================
   * Soil Mix tab
   * ============================================================ */
  const soilCardsEl = document.getElementById("soil-cards");

  /**
   * Compute a soil status for a plant based on its currentSoilMix vs idealSoil[].
   * Returns: { status, statusLabel, title, body, action }
   *
   *   status === "ideal"      — current is in idealSoil[]
   *   status === "acceptable" — current shares drainage or retention with an ideal
   *   status === "mismatch"   — current doesn't match any ideal
   *   status === "pending"    — currentSoilMix is "pending" or unset
   */
  function evaluateSoil(plant) {
    const cur = plant.currentSoilMix || "pending";
    const idealIds = plant.idealSoil || [];
    const idealLabels = idealIds.map(id => SOIL_TYPES[id]?.label).filter(Boolean);
    const labelOfCur = SOIL_TYPES[cur]?.label || "Unknown";

    if (cur === "pending") {
      return {
        status: "pending",
        statusLabel: "📝 Pending",
        title: "Soil mix not yet set",
        body: idealLabels.length
          ? `Recommended for this plant: <strong>${idealLabels.join("</strong> or <strong>")}</strong>.`
          : "Recommended mix has not yet been researched for this plant.",
        action: "Open Plant Profile → set Current soil mix to enable recommendations."
      };
    }
    if (idealIds.includes(cur)) {
      return {
        status: "ideal",
        statusLabel: "✅ Ideal",
        title: `${labelOfCur} — recommended`,
        body: SOIL_TYPES[cur]?.description || "",
        action: plant.soilNotes || ""
      };
    }
    /* Acceptable check: against at least one ideal, EITHER drainage matches
     * exactly AND retention is within 1 step, OR retention matches exactly
     * AND drainage is within 1 step. Pure "shares drainage OR retention" is
     * too lenient — e.g. it would call standard_potting "acceptable" for a
     * Mini Orchid just because both share medium drainage with sphagnum_moss,
     * even though the retention gap is catastrophic. */
    const RANK = { low: 1, medium: 2, high: 3, very_high: 4, controlled: 2 };
    const curMeta = SOIL_TYPES[cur];
    const idealMetas = idealIds.map(id => SOIL_TYPES[id]).filter(Boolean);
    const acceptable = curMeta && idealMetas.some(im => {
      if (!im.drainage || !im.retention || !curMeta.drainage || !curMeta.retention) return false;
      const dDist = Math.abs((RANK[curMeta.drainage]  || 0) - (RANK[im.drainage]  || 0));
      const rDist = Math.abs((RANK[curMeta.retention] || 0) - (RANK[im.retention] || 0));
      return (dDist === 0 && rDist <= 1) || (rDist === 0 && dDist <= 1);
    });
    if (acceptable) {
      return {
        status: "acceptable",
        statusLabel: "⚠️ Acceptable",
        title: `${labelOfCur} — workable but not ideal`,
        body: `Your mix has similar drainage/retention to the recommended option. The plant should be fine, but if you have <strong>${idealLabels.join("</strong> or <strong>")}</strong> on hand it would be a better fit.`,
        action: plant.soilNotes || ""
      };
    }
    return {
      status: "mismatch",
      statusLabel: "❌ Mismatch",
      title: `${labelOfCur} — not recommended`,
      body: `Switch to <strong>${idealLabels.join("</strong> or <strong>")}</strong> at the next repot. Your current mix has the wrong drainage profile for this plant.`,
      action: plant.soilNotes || ""
    };
  }

  function renderSoilTab() {
    if (!soilCardsEl) return;
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    /* Only show owned plants — variants are reference-only and don't have currentSoilMix */
    const plants = ownedIds.map(id => all[id]).filter(p => p && !p.isVariant);

    soilCardsEl.innerHTML = plants.map(p => {
      const ev = evaluateSoil(p);
      const pot = p.potSize && p.potSize !== "—" ? p.potSize : "";
      const actionLine = ev.action
        ? `<div class="soil-rec" style="border-left-color: var(--accent-2, var(--accent));"><span class="rec-title">💡 Notes</span>${escapeHtml(ev.action)}</div>`
        : "";
      return `
        <article class="soil-card" data-plant-id="${escapeAttr(p.id)}">
          <div class="soil-card-head">
            <div>
              <div class="soil-card-name">${plantCareLinkHtml(p.id, p.displayName)}</div>
              ${pot ? `<div class="soil-card-pot">${escapeHtml(pot)} pot</div>` : ""}
            </div>
            <span class="soil-status status-${ev.status}">${escapeHtml(ev.statusLabel)}</span>
          </div>

          <div class="soil-row">
            <span class="label">Current:</span>
            <span class="value">${escapeHtml(SOIL_TYPES[p.currentSoilMix || "pending"]?.label || "Unknown")}</span>
          </div>
          <div class="soil-row">
            <span class="label">Recommended:</span>
            <span class="value">${(p.idealSoil || []).map(id => escapeHtml(SOIL_TYPES[id]?.label || id)).join(" or ") || "<em>(not researched yet)</em>"}</span>
          </div>

          <div class="soil-rec">
            <span class="rec-title">${escapeHtml(ev.title)}</span>
            <span>${ev.body}</span>
          </div>
          ${actionLine}

          <button type="button" class="edit-btn" data-edit-plant-id="${escapeAttr(p.id)}">✎ Edit in Plant Profile</button>
        </article>
      `;
    }).join("");

    /* Wire the "edit" buttons to jump to the Plant Profile form for this plant */
    soilCardsEl.querySelectorAll("[data-edit-plant-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editPlantId;
        document.querySelector('.tab-btn[data-tab="log"]')?.click();
        /* Wait one tick for the Log panel to mount, then open the profile in edit mode */
        setTimeout(() => {
          if (profileMode.value !== "edit") {
            profileMode.value = "edit";
            populateProfileExisting();
          }
          profileExisting.value = id;
          loadProfileFromExisting();
          setProfileFieldsVisibility("edit");
          profileSoil?.focus();
        }, 50);
      });
    });
  }

  /* ============================================================
   * Placement tab
   * ============================================================ */
  const placementFocusEl        = document.getElementById("placement-focus");
  const placementPrimerEl       = document.getElementById("placement-primer");
  const placementWindowsEl      = document.getElementById("placement-windows");
  const placementNotesEl        = document.getElementById("placement-notes");
  const placementReferenceEl    = document.getElementById("placement-reference");
  const placementSourcesEl      = document.getElementById("placement-sources");
  const placementFilterEl       = document.getElementById("placement-filter");
  const placementFilterLabelEl  = document.getElementById("placement-filter-label");
  const placementFilterClearEl  = document.getElementById("placement-filter-clear");
  const placementRoomFilterEl   = document.getElementById("placement-room-filter");
  const placementRoomClearEl    = document.getElementById("placement-room-clear");
  const placementRoomPlanEl     = document.getElementById("placement-roomplan");

  /* Currently focused plant id ("all" = none) and room id ("all" = none).
   * The two are mutually exclusive — setting one clears the other. */
  let placementFocusId = "all";
  let placementRoomId = "all";

  const placementPlantName = (pid) => (PlantStore.allPlants()[pid]?.displayName || pid);
  const normWinEntry = (e) => (typeof e === "string" ? { id: e, note: "", back: false } : { id: e.id, note: e.note || "", back: !!e.back });

  function renderPlacementTab() {
    if (!placementWindowsEl) return;
    renderPlacementPrimer();
    renderPlacementWindows();
    renderRoomPlan();
    renderPlacementNotes();
    renderPlacementReference();
    renderPlacementSources();
    populatePlacementFilter();
    populatePlacementRoomFilter();
    applyPlacement();
  }

  /* Sun-exposure primer — what each compass direction delivers at ~30°N. */
  function renderPlacementPrimer() {
    if (!placementPrimerEl) return;
    placementPrimerEl.innerHTML = `
      <h3 class="placement-primer-head">☀️ What each exposure delivers at ~30°N</h3>
      <div class="placement-exposure-grid">
        ${HOME_EXPOSURES.map(x => `
          <div class="placement-exposure-card">
            <div class="pex-dir">${escapeHtml(x.dir)} <span class="pex-range">${escapeHtml(x.range)}</span></div>
            <div class="pex-sun">${escapeHtml(x.sun)}</div>
            <div class="pex-best">${escapeHtml(x.bestFor)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* A single plant chip inside a window card. Clickable → focuses that plant.
   * A `back:true` entry gets an asterisk meaning "best set back ~4–7 ft from
   * the window" (the softer, indirect-light zone away from the direct beam). */
  function placementChip(entry, cls) {
    const { id, note, back } = normWinEntry(entry);
    const name = placementPlantName(id);
    const starHtml = back ? `<span class="chip-star" title="Best placed ~4–7 ft back from the window — softer, indirect light">*</span>` : "";
    const noteHtml = note ? ` <span class="chip-note">(${escapeHtml(note)})</span>` : "";
    const backCls = back ? " chip-back" : "";
    return `<li class="placement-chip ${cls}${backCls}" data-plant-id="${escapeAttr(id)}"><button type="button" class="placement-chip-btn" data-plant-id="${escapeAttr(id)}" title="Focus on ${escapeAttr(name)}">${escapeHtml(name)}${starHtml}${noteHtml}</button></li>`;
  }

  /* Humidifier badge for a window (only for the actionable "use" / "skip" cases). */
  function humidifierBadge(w) {
    const h = w.humidifier;
    if (!h) return "";
    if (h.rec === "use")  return `<span class="pwin-hum pwin-hum-use" title="${escapeAttr(h.note || "")}">💧 Humidifier here</span>`;
    if (h.rec === "skip") return `<span class="pwin-hum pwin-hum-skip" title="${escapeAttr(h.note || "")}">🚫 No humidifier</span>`;
    return "";
  }

  /* Window cards — one grid, labelled by floor + room type, each showing what
   * that room's light + humidity has to offer. */
  function renderPlacementWindows() {
    if (!placementWindowsEl) return;
    const cards = HOME_WINDOWS.map(w => {
      const thriveChips = w.thrive.length ? w.thrive.map(e => placementChip(e, "chip-thrive")).join("") : `<li class="chip-empty">—</li>`;
      const solidChips  = w.solid.length  ? w.solid.map(e => placementChip(e, "chip-solid")).join("")  : `<li class="chip-empty">—</li>`;
      const label = w.label || `${w.floor} · ${w.name}`;
      const profile = (w.light || w.humidity) ? `
            <div class="pwin-profile">
              ${w.tier ? `<p class="pwin-tierline"><strong>☀️ ${escapeHtml(w.tier)}</strong></p>` : ""}
              ${w.light ? `<p><strong>Light.</strong> ${escapeHtml(w.light)}</p>` : ""}
              ${w.humidity ? `<p><strong>Humidity.</strong> ${escapeHtml(w.humidity)}</p>` : ""}
            </div>` : "";
      return `
        <article class="placement-window-card" data-window-id="${escapeAttr(w.id)}">
          <header class="pwin-head">
            <span class="pwin-name">${escapeHtml(label)}</span>
            ${humidifierBadge(w)}
          </header>
          ${profile}
          <div class="pwin-group">
            <h4 class="pwin-h pwin-h-thrive">Thrive here</h4>
            <ul class="placement-chip-list">${thriveChips}</ul>
          </div>
          <div class="pwin-group">
            <h4 class="pwin-h pwin-h-solid">Also solid</h4>
            <ul class="placement-chip-list">${solidChips}</ul>
          </div>
          <p class="pwin-avoid"><strong>Keep out.</strong> ${escapeHtml(w.avoid)}</p>
        </article>
      `;
    }).join("");
    const legend = `<p class="placement-back-key"><span class="chip-star">*</span> = thrives/solid in this room, but <strong>set back ~4–7 ft from the window</strong> (the softer, bright-indirect zone off the direct beam). Unmarked plants want the brightest spot right at the glass.</p>`;
    placementWindowsEl.innerHTML = `${legend}<div class="placement-window-grid">${cards}</div>`;
  }

  /* Special-case callouts. */
  function renderPlacementNotes() {
    if (!placementNotesEl) return;
    placementNotesEl.innerHTML = `
      <h3 class="placement-notes-head">⚠️ Tricky placements — read these first</h3>
      <div class="placement-notes-grid">
        ${HOME_PLACEMENT_NOTES.map(n => `
          <div class="placement-note placement-note-${escapeAttr(n.tone)}">
            <div class="pnote-title">${escapeHtml(n.title)}</div>
            <div class="pnote-body">${escapeHtml(n.body)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  /* Full per-plant reference table (light + humidity + best windows). */
  function renderPlacementReference() {
    if (!placementReferenceEl) return;
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    const rows = ownedIds.map(pid => {
      const p = all[pid]; if (!p) return "";
      const r = PLANT_LIGHT_REF[pid];
      const nameLink = plantCareLinkHtml(pid, p.displayName);
      if (!r) {
        return `<tr data-plant-id="${escapeAttr(pid)}"><td>${nameLink}</td><td class="muted">—</td><td class="muted">—</td><td class="muted">No guidance yet</td></tr>`;
      }
      const dot = r.flag ? `<span class="ref-dot ref-dot-${escapeAttr(r.flag)}" title="${escapeAttr(r.flag)}"></span>` : "";
      const humMark = r.hum ? ` <span class="ref-hum" title="Benefits from the humidifier">💧</span>` : "";
      return `<tr data-plant-id="${escapeAttr(pid)}"><td>${dot}${nameLink}${humMark}</td><td>${escapeHtml(r.light)}</td><td>${escapeHtml(r.humidity)}</td><td>${escapeHtml(r.best)}</td></tr>`;
    }).join("");
    placementReferenceEl.innerHTML = `
      <h3 class="placement-ref-head">🌿 Full plant reference (${ownedIds.length})</h3>
      <div class="placement-ref-scroll">
        <table class="placement-ref-table">
          <thead><tr><th>Plant</th><th>Light need</th><th>Humidity</th><th>Best window(s)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="placement-ref-key muted">Dot key: <span class="ref-dot ref-dot-info"></span> humidity/light caveat · <span class="ref-dot ref-dot-warning"></span> repot first · <span class="ref-dot ref-dot-danger"></span> strict rule (never a bathroom). <span class="ref-hum">💧</span> = benefits from the humidifier.</p>
    `;
  }

  /* "Focus on a plant" summary card — light/humidity needs + per-window verdict. */
  function renderPlacementFocus() {
    if (!placementFocusEl) return;
    const pid = placementFocusId;
    if (pid === "all") { placementFocusEl.hidden = true; placementFocusEl.innerHTML = ""; return; }
    const all = PlantStore.allPlants();
    const p = all[pid];
    if (!p) { placementFocusEl.hidden = true; placementFocusEl.innerHTML = ""; return; }
    const r = PLANT_LIGHT_REF[pid];

    const verdicts = HOME_WINDOWS.map(w => {
      const t = w.thrive.map(normWinEntry).find(e => e.id === pid);
      const s = w.solid.map(normWinEntry).find(e => e.id === pid);
      const avoid = (w.keepOut || []).includes(pid);
      const hit = t || s || {};
      const verdict = t ? "thrive" : (s ? "solid" : (avoid ? "avoid" : "none"));
      const rank = { thrive: 0, solid: 1, avoid: 2, none: 3 }[verdict];
      return { w, verdict, note: hit.note || "", back: !!hit.back, rank };
    }).sort((a, b) => a.rank - b.rank);

    const label = { thrive: "Thrive", solid: "Solid", avoid: "Keep out", none: "Not listed" };
    const meta = r ? `
      <div class="pfocus-meta">
        <div><strong>Light:</strong> ${escapeHtml(r.light)}</div>
        <div><strong>Humidity:</strong> ${escapeHtml(r.humidity)}</div>
        <div><strong>Best:</strong> ${escapeHtml(r.best)}</div>
      </div>` : "";
    const humHint = (r && r.hum) ? `
      <div class="pfocus-hum">💧 Benefits from the humidifier — put the humidifier in the enclosed <strong>2F Room 2</strong> (the vaulted 1F living room is too open to hold humidity) and huddle this plant within 2–3 ft of it.</div>` : "";

    placementFocusEl.hidden = false;
    placementFocusEl.innerHTML = `
      <article class="placement-focus-card">
        <header class="pfocus-head">
          <h3>Where should ${plantCareLinkHtml(pid, p.displayName)} go?</h3>
          <button type="button" class="placement-focus-close" aria-label="Clear focus">✕</button>
        </header>
        ${meta}
        ${humHint}
        <ul class="pfocus-verdicts">
          ${verdicts.map(v => `
            <li class="pfv pfv-${v.verdict}">
              <span class="pfv-badge">${label[v.verdict]}</span>
              <span class="pfv-win">${escapeHtml(v.w.label || v.w.name)}</span>
              ${v.back ? `<span class="pfv-back" title="Set back ~4–7 ft from the window">↩ set back 4–7 ft</span>` : ""}
              ${v.note ? `<span class="pfv-note">${escapeHtml(v.note)}</span>` : ""}
            </li>
          `).join("")}
        </ul>
      </article>
    `;
  }

  function renderPlacementSources() {
    if (!placementSourcesEl) return;
    placementSourcesEl.innerHTML = `
      <h3>📚 Sources for placement reasoning</h3>
      <p class="muted">The light-classification terminology (direct / bright indirect / medium indirect),
      the "AM direct sun is gentle / PM direct sun is harsh" rule, and the species-by-species
      light preferences come from the references below. Per-plant care sources are listed on each
      plant's Care Guide tab.</p>
      <ul class="placement-source-list">
        ${PLACEMENT_SOURCES.map(s => `
          <li><a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label)}</a></li>
        `).join("")}
      </ul>
    `;
  }

  /* Populate the "Focus on a plant" dropdown with all owned plants. */
  function populatePlacementFilter() {
    if (!placementFilterEl) return;
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    let html = `<option value="all">All plants (${ownedIds.length})</option>`;
    ownedIds.forEach(pid => {
      const p = all[pid];
      if (!p) return;
      html += `<option value="${escapeAttr(pid)}">${escapeHtml(p.displayName)}</option>`;
    });
    placementFilterEl.innerHTML = html;
    if (!ownedIds.includes(placementFocusId)) placementFocusId = "all";
    placementFilterEl.value = placementFocusId;
  }

  /* Populate the "Focus on a room" dropdown from the window definitions. */
  function populatePlacementRoomFilter() {
    if (!placementRoomFilterEl) return;
    let html = `<option value="all">All rooms (${HOME_WINDOWS.length})</option>`;
    HOME_WINDOWS.forEach(w => {
      const label = w.label || `${w.floor} · ${w.name}`;
      html += `<option value="${escapeAttr(w.id)}">${escapeHtml(label)}</option>`;
    });
    placementRoomFilterEl.innerHTML = html;
    if (!HOME_WINDOWS.some(w => w.id === placementRoomId)) placementRoomId = "all";
    placementRoomFilterEl.value = placementRoomId;
  }

  /* Apply both the plant focus and the room filter. The two are mutually
   * exclusive: a room filter shows only that room's card; a plant focus
   * highlights the plant across all cards + the reference table. */
  function applyPlacement() {
    const pid = placementFocusId;
    const rid = placementRoomId;
    renderPlacementFocus();

    if (placementWindowsEl) {
      placementWindowsEl.querySelectorAll(".placement-window-card").forEach(card => {
        card.classList.remove("win-thrive", "win-solid", "win-avoid", "win-dim");
        card.querySelectorAll(".placement-chip").forEach(ch => ch.classList.remove("chip-focus"));
        // Room filter: hide non-matching cards entirely.
        card.hidden = rid !== "all" && card.dataset.windowId !== rid;
        if (pid === "all") return;
        const w = HOME_WINDOWS.find(x => x.id === card.dataset.windowId);
        if (!w) return;
        const inThrive = w.thrive.map(normWinEntry).some(e => e.id === pid);
        const inSolid  = w.solid.map(normWinEntry).some(e => e.id === pid);
        const inAvoid  = (w.keepOut || []).includes(pid);
        card.classList.add(inThrive ? "win-thrive" : inSolid ? "win-solid" : inAvoid ? "win-avoid" : "win-dim");
        card.querySelectorAll(".placement-chip").forEach(ch => {
          if (ch.dataset.plantId === pid) ch.classList.add("chip-focus");
        });
      });
    }

    if (placementReferenceEl) {
      placementReferenceEl.querySelectorAll("tbody tr").forEach(tr => {
        tr.classList.remove("row-focus", "row-dim");
        if (pid === "all") return;
        tr.classList.add(tr.dataset.plantId === pid ? "row-focus" : "row-dim");
      });
    }

    if (placementFilterClearEl) placementFilterClearEl.hidden = pid === "all";
    if (placementRoomClearEl)   placementRoomClearEl.hidden   = rid === "all";
    if (placementFilterEl && placementFilterEl.value !== pid) placementFilterEl.value = pid;
    if (placementRoomFilterEl && placementRoomFilterEl.value !== rid) placementRoomFilterEl.value = rid;
  }

  function setPlacementFocus(pid) {
    placementFocusId = pid || "all";
    if (placementFocusId !== "all") placementRoomId = "all"; // mutually exclusive
    applyPlacement();
    if (placementFocusId !== "all" && placementFocusEl) {
      placementFocusEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function setPlacementRoom(rid) {
    placementRoomId = rid || "all";
    if (placementRoomId !== "all") placementFocusId = "all"; // mutually exclusive
    applyPlacement();
    if (placementRoomId !== "all" && placementWindowsEl) {
      const card = placementWindowsEl.querySelector(`.placement-window-card[data-window-id="${cssEscape(placementRoomId)}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (placementFilterEl) {
    placementFilterEl.addEventListener("change", () => setPlacementFocus(placementFilterEl.value));
  }
  if (placementFilterClearEl) {
    placementFilterClearEl.addEventListener("click", () => {
      setPlacementFocus("all");
      if (placementFilterEl) placementFilterEl.focus();
    });
  }
  if (placementRoomFilterEl) {
    placementRoomFilterEl.addEventListener("change", () => setPlacementRoom(placementRoomFilterEl.value));
  }
  if (placementRoomClearEl) {
    placementRoomClearEl.addEventListener("click", () => {
      setPlacementRoom("all");
      if (placementRoomFilterEl) placementRoomFilterEl.focus();
    });
  }
  /* Click a plant chip in any window card → focus that plant. */
  if (placementWindowsEl) {
    placementWindowsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".placement-chip-btn");
      if (btn && btn.dataset.plantId) setPlacementFocus(btn.dataset.plantId);
    });
  }
  /* Click a reference-table row → focus that plant (unless the click was on the
   * plant-name Care-Guide link, which navigates instead). */
  if (placementReferenceEl) {
    placementReferenceEl.addEventListener("click", (e) => {
      if (e.target.closest(".plant-care-link")) return;
      const tr = e.target.closest("tbody tr");
      if (tr && tr.dataset.plantId) setPlacementFocus(tr.dataset.plantId);
    });
  }
  /* Focus card ✕ closes the focus. */
  if (placementFocusEl) {
    placementFocusEl.addEventListener("click", (e) => {
      if (e.target.closest(".placement-focus-close")) setPlacementFocus("all");
    });
  }

  /* ------------------------------------------------------------------
   * "Create a room" planner — build your own rooms, drop owned plants
   * into them, and watch the "left to place" list shrink so you can
   * plan around real windowsill / shelf space.
   * ------------------------------------------------------------------ */
  function renderRoomPlan() {
    if (!placementRoomPlanEl) return;
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    const plan = RoomPlanStore.all();
    const roomExists = (rid) => plan.rooms.some(r => r.id === rid);
    const unassignedIds = ownedIds.filter(pid => !plan.assignments[pid] || !roomExists(plan.assignments[pid]));
    const assignedCount = ownedIds.length - unassignedIds.length;

    /* Preset dropdown = the real home rooms (from HOME_WINDOWS), minus any the
     * user has already added, so they can one-click create a plan room named
     * after a known room. "＋ Create a new room…" is appended for custom names. */
    const existingRoomNames = new Set(plan.rooms.map(r => r.name));
    const presetOpts = (typeof HOME_WINDOWS !== "undefined" ? HOME_WINDOWS : [])
      .map(w => w.label || `${w.floor} · ${w.name}`)
      .filter(label => !existingRoomNames.has(label))
      .map(label => `<option value="${escapeAttr(label)}">${escapeHtml(label)}</option>`)
      .join("");

    const roomCards = plan.rooms.map(room => {
      const pids = ownedIds.filter(pid => plan.assignments[pid] === room.id);
      const chips = pids.length
        ? pids.map(pid => `<li class="rp-chip">${plantCareLinkHtml(pid, all[pid].displayName)}<button type="button" class="rp-remove" data-rp-unassign="${escapeAttr(pid)}" title="Remove from ${escapeAttr(room.name)}" aria-label="Remove">✕</button></li>`).join("")
        : `<li class="rp-empty">No plants yet — add some below.</li>`;
      const addOptions = unassignedIds.map(pid => `<option value="${escapeAttr(pid)}">${escapeHtml(all[pid].displayName)}</option>`).join("");
      return `
        <article class="rp-room" data-room-id="${escapeAttr(room.id)}">
          <header class="rp-room-head">
            <div class="rp-room-title">
              <span class="rp-room-name">${escapeHtml(room.name)}</span>
              <span class="rp-room-count">${pids.length} plant${pids.length === 1 ? "" : "s"}</span>
            </div>
            <button type="button" class="rp-room-delete" data-rp-delete-room="${escapeAttr(room.id)}" title="Delete room" aria-label="Delete room">🗑</button>
          </header>
          ${room.note ? `<p class="rp-room-note">${escapeHtml(room.note)}</p>` : ""}
          <ul class="rp-chip-list">${chips}</ul>
          <div class="rp-add-row">
            <select class="rp-add-select" data-rp-add-room="${escapeAttr(room.id)}" ${unassignedIds.length ? "" : "disabled"}>
              <option value="">${unassignedIds.length ? "+ Add a plant…" : "All plants placed"}</option>
              ${addOptions}
            </select>
          </div>
        </article>
      `;
    }).join("");

    const unassignedChips = unassignedIds.length
      ? unassignedIds.map(pid => `<li class="rp-chip rp-chip-unassigned">${plantCareLinkHtml(pid, all[pid].displayName)}</li>`).join("")
      : `<li class="rp-empty">🎉 Every plant is placed in a room.</li>`;

    placementRoomPlanEl.innerHTML = `
      <h3 class="placement-roomplan-head">🗺️ Plan your rooms</h3>
      <p class="rp-intro muted">Create rooms that match your real windowsills & shelves, drop plants into them, and watch the "left to place" list shrink so you can plan around available space.</p>
      <form id="rp-create-form" class="rp-create">
        <select id="rp-room-preset" class="rp-input rp-preset-select" aria-label="Choose one of your existing rooms or create a new one">
          <option value="">Choose an existing room…</option>
          ${presetOpts}
          <option value="__custom__">＋ Create a new room…</option>
        </select>
        <input type="text" id="rp-name" class="rp-input" placeholder="Room / spot name" maxlength="80" />
        <input type="text" id="rp-note" class="rp-input rp-input-note" placeholder="Space note (optional, e.g. fits 4 small pots)" maxlength="200" />
        <button type="submit" class="rp-create-btn">+ Create room</button>
      </form>
      <div class="rp-progress">${assignedCount} of ${ownedIds.length} plants placed · <strong>${unassignedIds.length} left</strong></div>
      <div class="rp-rooms-grid">${roomCards || `<p class="rp-empty rp-empty-rooms">No rooms yet — create your first one above.</p>`}</div>
      <div class="rp-unassigned">
        <h4 class="rp-unassigned-head">🪴 Left to place (${unassignedIds.length})</h4>
        <ul class="rp-chip-list">${unassignedChips}</ul>
      </div>
    `;
  }

  if (placementRoomPlanEl) {
    /* Create a room. */
    placementRoomPlanEl.addEventListener("submit", (e) => {
      const form = e.target.closest("#rp-create-form");
      if (!form) return;
      e.preventDefault();
      const nameEl = document.getElementById("rp-name");
      const noteEl = document.getElementById("rp-note");
      const name = (nameEl?.value || "").trim();
      if (!name) { nameEl?.focus(); return; }
      const room = RoomPlanStore.addRoom(name, noteEl?.value || "");
      flash(`Room created: ${room.name}`);
      renderRoomPlan();
      document.getElementById("rp-name")?.focus();
    });
    placementRoomPlanEl.addEventListener("change", (e) => {
      const all = PlantStore.allPlants();

      /* Create-form preset picker: choosing a known home room prefills the name
       * input; "＋ Create a new room…" clears it for a custom name. */
      const preset = e.target.closest("#rp-room-preset");
      if (preset) {
        const nameEl = document.getElementById("rp-name");
        if (!nameEl) return;
        if (preset.value === "__custom__") { nameEl.value = ""; nameEl.focus(); }
        else if (preset.value) { nameEl.value = preset.value; nameEl.focus(); }
        return;
      }

      /* Room card's "+ Add a plant…" picks a plant for that room. */
      const addSel = e.target.closest(".rp-add-select");
      if (addSel && addSel.dataset.rpAddRoom) {
        const pid = addSel.value;
        if (!pid) return;
        RoomPlanStore.assign(pid, addSel.dataset.rpAddRoom);
        flash(`Added ${all[pid]?.displayName || pid} to the room`);
        renderRoomPlan();
      }
    });
    /* Remove a plant from a room, or delete a room. */
    placementRoomPlanEl.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-rp-unassign]");
      if (rm) {
        RoomPlanStore.unassign(rm.getAttribute("data-rp-unassign"));
        renderRoomPlan();
        return;
      }
      const del = e.target.closest("[data-rp-delete-room]");
      if (del) {
        const rid = del.getAttribute("data-rp-delete-room");
        const room = RoomPlanStore.all().rooms.find(r => r.id === rid);
        const n = RoomPlanStore.plantsIn(rid).length;
        const msg = n ? `Delete "${room?.name || "room"}"? Its ${n} plant${n === 1 ? "" : "s"} will move back to "Left to place".` : `Delete "${room?.name || "room"}"?`;
        if (confirm(msg)) {
          RoomPlanStore.removeRoom(rid);
          flash("Room deleted");
          renderRoomPlan();
        }
      }
    });
  }

  /* ============================================================
   * Todos tab
   * ============================================================ */
  const GENERAL_TODO_PLANT = "__general__";

  const todoAddForm        = document.getElementById("todo-add-form");
  const todoPlantSelect    = document.getElementById("todo-plant");
  const todoCategorySelect = document.getElementById("todo-category");
  const todoTitleInput     = document.getElementById("todo-title");
  const todoDueInput       = document.getElementById("todo-due");
  const todoNotesInput     = document.getElementById("todo-notes");
  const todoResetBtn       = document.getElementById("todo-reset");

  const todoFilterPlantEl    = document.getElementById("todo-filter-plant");
  const todoFilterCategoryEl = document.getElementById("todo-filter-category");
  const todoStatusBtns       = document.querySelectorAll(".todo-status-btn");
  const todosListEl          = document.getElementById("todos-list");
  const todosSummaryEl       = document.getElementById("todos-summary");
  const todoClearCompletedEl = document.getElementById("todo-clear-completed");

  /* Filter state, persisted across tab switches in module scope. */
  const todoFilter = {
    plant: "ALL",       // "ALL" | GENERAL_TODO_PLANT | "<plantId>"
    category: "ALL",    // "ALL" | "<categoryId>"
    status: "open"      // "open" | "completed" | "all"
  };

  /* If this is set (by the "Manage todos" link on the Care Guide), the next
   * render of the Todos tab pre-fills the filter to that plant. */
  let todoPrefillPlantId = null;

  function populateTodoDropdowns() {
    if (!todoPlantSelect) return;
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    const plantOpts = (extraFirstOpts) => {
      return [
        ...extraFirstOpts,
        `<option value="${GENERAL_TODO_PLANT}">🏠 General — not plant-specific</option>`,
        `<option value="" disabled>───────────</option>`,
        ...ownedIds.map(id => `<option value="${escapeAttr(id)}">${escapeHtml(all[id].displayName)}</option>`)
      ].join("");
    };
    /* Add-form: default to General */
    const prevAddVal = todoPlantSelect.value;
    todoPlantSelect.innerHTML = plantOpts([]);
    if (prevAddVal && (prevAddVal === GENERAL_TODO_PLANT || all[prevAddVal])) {
      todoPlantSelect.value = prevAddVal;
    } else {
      todoPlantSelect.value = GENERAL_TODO_PLANT;
    }

    /* Filter-bar: "All plants" + General + each owned */
    const prevFilterVal = todoFilterPlantEl?.value;
    if (todoFilterPlantEl) {
      todoFilterPlantEl.innerHTML = plantOpts([
        `<option value="ALL">All plants + General</option>`
      ]);
      if (prevFilterVal && (prevFilterVal === "ALL" || prevFilterVal === GENERAL_TODO_PLANT || all[prevFilterVal])) {
        todoFilterPlantEl.value = prevFilterVal;
      } else {
        todoFilterPlantEl.value = "ALL";
      }
    }

    /* Category dropdowns (same options in both add + filter) */
    if (todoCategorySelect && !todoCategorySelect.options.length) {
      todoCategorySelect.innerHTML = TODO_CATEGORIES
        .map(c => `<option value="${escapeAttr(c.id)}">${c.icon} ${escapeHtml(c.label)}</option>`)
        .join("");
      todoCategorySelect.value = "repot";
    }
    if (todoFilterCategoryEl && !todoFilterCategoryEl.options.length) {
      todoFilterCategoryEl.innerHTML = [
        `<option value="ALL">All categories</option>`,
        ...TODO_CATEGORIES.map(c => `<option value="${escapeAttr(c.id)}">${c.icon} ${escapeHtml(c.label)}</option>`)
      ].join("");
      todoFilterCategoryEl.value = "ALL";
    }
  }

  function todoDueMeta(t) {
    if (!t.dueDate) return { className: "", label: "No due date", daysUntil: Infinity };
    const today = Dates.today();
    const due   = new Date(t.dueDate + "T00:00:00");
    const days  = Dates.daysBetween(today, due);
    if (days < 0)  return { className: "is-overdue",  label: `⚠️ Overdue ${Math.abs(days)}d`, daysUntil: days };
    if (days === 0) return { className: "is-due",     label: `💧 Due today`,                 daysUntil: days };
    if (days <= 3) return { className: "is-soon",      label: `🟡 In ${days}d`,               daysUntil: days };
    return            { className: "is-scheduled", label: `🔵 In ${days}d`,              daysUntil: days };
  }

  function renderTodoItem(t, opts = {}) {
    const all = PlantStore.allPlants();
    const cat = TODO_CATEGORY_MAP[t.category] || TODO_CATEGORY_MAP.other;
    const plant = t.plantId ? all[t.plantId] : null;
    const plantChip = plant
      ? `<span class="todo-chip todo-chip-plant">🌿 ${plantCareLinkHtml(t.plantId, plant.displayName)}</span>`
      : `<span class="todo-chip todo-chip-plant" title="General — not plant-specific">🏠 General</span>`;

    const due = todoDueMeta(t);
    const isCompleted = !!t.completedAt;
    const wrapperClass = isCompleted ? "is-completed" : due.className;
    const dueChip = isCompleted
      ? `<span class="todo-chip">✅ Done ${escapeHtml(Dates.formatPretty(new Date(t.completedAt + "T00:00:00")))}</span>`
      : t.dueDate
        ? `<span class="todo-chip todo-chip-due ${due.className}">${escapeHtml(due.label)} · ${escapeHtml(Dates.formatPretty(new Date(t.dueDate + "T00:00:00")))}</span>`
        : `<span class="todo-chip todo-chip-due">No due date</span>`;

    const createdChip = `<span class="todo-chip todo-chip-created">added ${escapeHtml(Dates.formatPretty(new Date(t.createdAt + "T00:00:00")))}</span>`;

    const checkBtn = isCompleted
      ? `<button type="button" class="todo-check" data-action="reopen" data-id="${escapeAttr(t.id)}" aria-label="Mark as not done">✓</button>`
      : `<button type="button" class="todo-check" data-action="complete" data-id="${escapeAttr(t.id)}" aria-label="Mark as done"></button>`;

    const actions = isCompleted
      ? `<button type="button" class="todo-action-btn" data-action="reopen"   data-id="${escapeAttr(t.id)}">↩ Reopen</button>
         <button type="button" class="todo-action-btn danger" data-action="remove" data-id="${escapeAttr(t.id)}">🗑 Delete</button>`
      : `<button type="button" class="todo-action-btn" data-action="edit"     data-id="${escapeAttr(t.id)}">✏️ Edit</button>
         <button type="button" class="todo-action-btn danger" data-action="remove" data-id="${escapeAttr(t.id)}">🗑 Delete</button>`;

    const notesBlock = t.notes
      ? `<div class="todo-notes">${escapeHtml(t.notes)}</div>`
      : "";

    return `
      <article class="todo-item ${wrapperClass}" data-id="${escapeAttr(t.id)}">
        ${checkBtn}
        <div class="todo-body">
          <div class="todo-title">${escapeHtml(t.title)}</div>
          <div class="todo-meta">
            <span class="todo-chip todo-chip-cat">${cat.icon} ${escapeHtml(cat.label)}</span>
            ${plantChip}
            ${dueChip}
            ${createdChip}
          </div>
          ${notesBlock}
        </div>
        <div class="todo-actions">${actions}</div>
      </article>
    `;
  }

  function getFilteredTodos() {
    const all = TodoStore.list();
    return all.filter(t => {
      if (todoFilter.plant !== "ALL") {
        if (todoFilter.plant === GENERAL_TODO_PLANT) {
          if (t.plantId) return false;
        } else if (t.plantId !== todoFilter.plant) {
          return false;
        }
      }
      if (todoFilter.category !== "ALL" && t.category !== todoFilter.category) return false;
      if (todoFilter.status === "open" && t.completedAt) return false;
      if (todoFilter.status === "completed" && !t.completedAt) return false;
      return true;
    });
  }

  function renderTodosTab() {
    if (!todosListEl) return;
    populateTodoDropdowns();

    /* Apply any pending pre-fill request from the Care Guide link. */
    if (todoPrefillPlantId) {
      todoFilter.plant = todoPrefillPlantId;
      if (todoFilterPlantEl) todoFilterPlantEl.value = todoPrefillPlantId;
      todoPrefillPlantId = null;
    }

    /* Sync the status pills with state */
    todoStatusBtns.forEach(btn => {
      const active = btn.dataset.status === todoFilter.status;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (todoFilterCategoryEl) todoFilterCategoryEl.value = todoFilter.category;

    const filtered = getFilteredTodos();

    /* Sort: open todos by due-date urgency (no-date last), then by createdAt
     * desc; completed todos by completedAt desc. */
    filtered.sort((a, b) => {
      const aDone = !!a.completedAt, bDone = !!b.completedAt;
      if (aDone !== bDone) return aDone ? 1 : -1;
      if (aDone) return (b.completedAt || "").localeCompare(a.completedAt || "");
      const aDu = todoDueMeta(a).daysUntil;
      const bDu = todoDueMeta(b).daysUntil;
      if (aDu !== bDu) return aDu - bDu;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    const openCount      = TodoStore.open().length;
    const completedCount = TodoStore.completed().length;
    const overdueCount   = TodoStore.open().filter(t => t.dueDate && todoDueMeta(t).daysUntil < 0).length;
    const dueTodayCount  = TodoStore.open().filter(t => t.dueDate && todoDueMeta(t).daysUntil === 0).length;
    todosSummaryEl.innerHTML = `
      ${openCount} open · ${completedCount} completed
      ${overdueCount ? ` · <strong>${overdueCount} overdue ⚠️</strong>` : ""}
      ${dueTodayCount ? ` · <strong>${dueTodayCount} due today 💧</strong>` : ""}
    `;

    if (filtered.length === 0) {
      const reason = todoFilter.status === "completed"
        ? "No completed todos match the current filters."
        : "No todos yet — add one with the form above.";
      todosListEl.innerHTML = `<div class="todos-empty">${reason}</div>`;
      return;
    }

    todosListEl.innerHTML = filtered.map(t => renderTodoItem(t)).join("");
  }

  function handleTodoAddSubmit(e) {
    e.preventDefault();
    if (!todoTitleInput) return;
    const title = todoTitleInput.value.trim();
    if (!title) return;
    const plantSel = todoPlantSelect.value;
    const plantId = plantSel === GENERAL_TODO_PLANT ? null : plantSel;
    const todo = TodoStore.add({
      plantId,
      title,
      category: todoCategorySelect.value || "other",
      dueDate: todoDueInput.value || null,
      notes:   todoNotesInput.value || ""
    });
    if (!todo) return;
    flash(`Todo added · ${todo.title} ✅`);
    /* Reset the title + notes + date but keep plant/category for rapid entry */
    todoTitleInput.value = "";
    todoNotesInput.value = "";
    todoDueInput.value = "";
    todoTitleInput.focus();
    renderTodosTab();
    /* Also refresh the care-guide section if it's currently showing this plant */
    const currentCarePlant = subSelect.value || primarySelect.value;
    if (currentCarePlant) renderPlantTodosSection(currentCarePlant);
  }

  function resetTodoForm() {
    todoAddForm?.reset();
    populateTodoDropdowns();
  }

  /* Edit flow: a simple prompt-based edit. We could promote this to an inline
   * editable card later, but prompts work everywhere with zero ceremony. */
  function handleTodoEdit(id) {
    const t = TodoStore.get(id);
    if (!t) return;
    const all = PlantStore.allPlants();
    const newTitle = prompt(`Edit todo title:`, t.title);
    if (newTitle === null) return; // cancelled
    if (!newTitle.trim()) { alert("Title can't be empty."); return; }
    const newNotes = prompt(`Notes (leave blank for none):`, t.notes || "");
    if (newNotes === null) return;
    const newDue = prompt(`Due date (YYYY-MM-DD, blank for none):`, t.dueDate || "");
    if (newDue === null) return;
    let dueValid = null;
    if (newDue.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newDue.trim())) {
        alert(`Date must be in YYYY-MM-DD format. Keeping previous value.`);
        dueValid = t.dueDate || null;
      } else {
        dueValid = newDue.trim();
      }
    }
    TodoStore.update(id, {
      title:   newTitle.trim(),
      notes:   newNotes,
      dueDate: dueValid
    });
    flash(`Todo updated · ${newTitle.trim().slice(0, 30)} ✏️`);
    renderTodosTab();
    /* Care-guide refresh if visible */
    if (t.plantId) renderPlantTodosSection(t.plantId);
  }

  function handleTodoListClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;
    const t = TodoStore.get(id);
    if (!t) return;
    if (action === "complete") {
      TodoStore.complete(id);
      flash(`Marked done · ${t.title.slice(0, 30)} ✅`);
    } else if (action === "reopen") {
      TodoStore.reopen(id);
      flash(`Reopened · ${t.title.slice(0, 30)} ↩`);
    } else if (action === "remove") {
      if (!confirm(`Delete this todo?\n\n"${t.title}"`)) return;
      TodoStore.remove(id);
      flash(`Todo deleted 🗑`);
    } else if (action === "edit") {
      handleTodoEdit(id);
      return;
    } else {
      return;
    }
    renderTodosTab();
    if (t.plantId) renderPlantTodosSection(t.plantId);
  }

  /* Care-guide-side strip: shows open todos for the currently displayed plant. */
  function renderPlantTodosSection(plantId) {
    const host = detailEl?.querySelector(".plant-todos-section");
    if (!host) return;
    const list = host.querySelector(".plant-todos-list");
    if (!list) return;
    const openForPlant = TodoStore.forPlant(plantId)
      .filter(t => !t.completedAt)
      .sort((a, b) => {
        const aDu = todoDueMeta(a).daysUntil;
        const bDu = todoDueMeta(b).daysUntil;
        if (aDu !== bDu) return aDu - bDu;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
    if (openForPlant.length === 0) {
      list.innerHTML = `<div class="plant-todos-empty">No open todos for this plant yet.</div>`;
    } else {
      list.innerHTML = openForPlant.map(t => renderTodoItem(t)).join("");
    }
    const countEl = host.querySelector(".plant-todos-count");
    if (countEl) countEl.textContent = openForPlant.length ? `(${openForPlant.length} open)` : "";
  }

  /* ---------- Care Guide — inline watering tile + log form ---------- */
  function renderPlantWateringSection(plantId) {
    const host = detailEl?.querySelector(`.plant-watering-section[data-plant-id="${cssEscape(plantId)}"]`);
    if (!host) return;
    const tile = host.querySelector(".plant-watering-tile");
    if (!tile) return;
    const all = PlantStore.allPlants();
    const plant = all[plantId];
    if (!plant) { tile.innerHTML = ""; return; }
    const log = WaterLog.all();
    const nx = nextWatering(plantId, log, plant);
    if (!nx) { tile.innerHTML = `<div class="muted small">No watering data yet.</div>`; return; }
    /* Compact tile — no plant name repeated in the row (the header already
     * shows it). */
    tile.innerHTML = renderWaterTileHtml(plantId, plant, nx, { includeName: false });

    /* Default the inline form's date to today. Do this ONLY if the user
     * hasn't already typed something (preserves whatever they had if the
     * section re-renders because of an unrelated re-render). */
    const dateInput = host.querySelector(".plant-water-log-date");
    if (dateInput && !dateInput.value) dateInput.value = Dates.iso(Dates.today());
  }

  /* Called by the fireSnooze() side-effect chain when the calendar tab isn't
   * open but a plant detail is. Kept idempotent so calling it when the
   * section doesn't exist is a no-op. */
  function refreshPlantWateringSectionIfVisible(plantId) {
    if (!detailEl) return;
    const host = detailEl.querySelector(`.plant-watering-section[data-plant-id="${cssEscape(plantId)}"]`);
    if (host) renderPlantWateringSection(plantId);
  }

  /* Inline "Log a watering" form on the Care Guide plant detail. */
  function handlePlantDetailLogSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const plantId = form.dataset.plantId;
    if (!plantId) return;
    const dateInput = form.querySelector(".plant-water-log-date");
    const noteInput = form.querySelector(".plant-water-log-note");
    const date = dateInput?.value;
    const note = (noteInput?.value || "").trim();
    if (!date) {
      dateInput?.focus();
      return;
    }
    WaterLog.add({ plantId, date, note });
    /* Reset only the note; keep the date so a "back-fill missed dates" workflow
     * doesn't force the user to re-pick every time. */
    if (noteInput) noteInput.value = "";
    /* Refresh views that depend on the log. */
    renderPlantWateringSection(plantId);
    renderRecentLog();
    if (document.querySelector("#tab-calendar.active")) renderCalendar();
    const plantName = PlantStore.allPlants()[plantId]?.displayName || "plant";
    flash(`Logged watering for ${plantName} 🌿`);
  }

  /* ---------- Care Guide — "Notes from past chats" section ---------- */
  function renderPlantNotesSection(plantId) {
    const host = detailEl?.querySelector(`.plant-notes-section[data-plant-id="${cssEscape(plantId)}"]`);
    if (!host) return;
    const list = host.querySelector(".plant-notes-list");
    const countEl = host.querySelector(".plant-notes-count");
    if (!list) return;
    const notes = CareNotesStore.forPlant(plantId)
      .slice()
      .sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));
    if (countEl) countEl.textContent = notes.length ? `(${notes.length})` : "";
    if (notes.length === 0) {
      list.innerHTML = `<div class="plant-notes-empty">No saved notes yet. Use the <strong>💾 Save to plant notes</strong> button in Ask Claude to archive a useful answer here.</div>`;
      return;
    }
    list.innerHTML = notes.map(n => {
      const dt = n.ts ? new Date(n.ts) : null;
      const dateStr = dt && !isNaN(dt) ? dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
      const sourceLabel = n.source === "conversation" ? "🗂 Conversation" : "✉️ Single response";
      const modelLabel  = n.model ? ` · ${n.model.replace(/^claude-/, "")}` : "";
      const turnsHtml = (n.messages || []).map(t => `
        <div class="plant-note-turn">
          <div class="turn-role">${escapeHtml(t.role === "user" ? "You asked" : "Claude")}</div>
          <div class="turn-text">${renderChatMarkdown(t.text)}</div>
        </div>
      `).join("");
      return `
        <div class="plant-note-item" data-note-id="${escapeAttr(n.id)}">
          <div class="plant-note-head">
            <div>
              <div class="plant-note-title">${escapeHtml(n.title || "Untitled note")}</div>
              <div class="plant-note-meta">${escapeHtml(dateStr)} · ${escapeHtml(sourceLabel)}${escapeHtml(modelLabel)}</div>
            </div>
            <div class="plant-note-actions">
              <button type="button" class="plant-note-toggle">Show</button>
              <button type="button" class="plant-note-delete" aria-label="Delete this saved note">🗑</button>
            </div>
          </div>
          <div class="plant-note-body" hidden>${turnsHtml}</div>
        </div>
      `;
    }).join("");
  }

  /* If a save happens while the Care Guide is open on that plant, refresh
   * the notes strip so the new entry appears immediately. */
  function refreshPlantNotesSectionIfVisible(plantId) {
    if (!detailEl) return;
    const host = detailEl.querySelector(`.plant-notes-section[data-plant-id="${cssEscape(plantId)}"]`);
    if (host) renderPlantNotesSection(plantId);
  }

  /* Tiny CSS-attribute selector escape (no `.cssEscape` polyfill needed for
   * our ID format, but be defensive against quotes). */
  function cssEscape(s) {
    return String(s).replace(/"/g, '\\"');
  }

  /* "Manage all" link on the Care Guide jumps to the Todos tab pre-filtered. */
  function openTodosForPlant(plantId) {
    todoPrefillPlantId = plantId;
    todoFilter.status = "open";
    const btn = document.querySelector('.tab-btn[data-tab="todos"]');
    if (btn) btn.click();
  }

  /* Tapping a plant NAME on a watering tile jumps to that plant's Care Guide.
   * Handles all three selector cases: a top-level owned plant, a succulent
   * variant (under the 🌵 sub-dropdown), or a pothos variant (🌿 sub-dropdown). */
  function openCareGuideForPlant(plantId) {
    const all = PlantStore.allPlants();
    if (!all[plantId]) return;

    const succSet = new Set(SUCCULENT_VARIANTS);
    const pothSet = new Set(POTHOS_VARIANTS);

    if (succSet.has(plantId)) {
      primarySelect.value = GROUP_SUCC;
      populateSubSelect(GROUP_SUCC);
      subWrap.hidden = false;
      subSelect.value = plantId;
    } else if (pothSet.has(plantId)) {
      primarySelect.value = GROUP_POTH;
      populateSubSelect(GROUP_POTH);
      subWrap.hidden = false;
      subSelect.value = plantId;
    } else {
      primarySelect.value = plantId;
      subWrap.hidden = true;
    }

    renderPlantDetail(plantId);

    const btn = document.querySelector('.tab-btn[data-tab="care"]');
    if (btn) btn.click();

    /* Bring the plant detail into view once the tab is active. */
    setTimeout(() => {
      if (detailEl && typeof detailEl.scrollIntoView === "function") {
        detailEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  }

  /* Delegated click handler for the tile name-links (wired on nextSummary). */
  function handleTileNameClick(e) {
    const link = e.target.closest(".tile-name-link");
    if (!link) return;
    e.preventDefault();
    const pid = link.getAttribute("data-care-plant-id");
    if (pid) openCareGuideForPlant(pid);
  }

  /* Reusable inline "plant name" that links to that plant's Care Guide.
   * Use anywhere a plant is mentioned as text so the name is always tappable. */
  function plantCareLinkHtml(pid, text) {
    const label = text || (PlantStore.allPlants()[pid]?.displayName) || pid || "";
    if (!pid || !PlantStore.allPlants()[pid]) return escapeHtml(label);
    return `<button type="button" class="plant-care-link" data-care-plant-id="${escapeAttr(pid)}" title="Open ${escapeAttr(label)} care guide">${escapeHtml(label)}</button>`;
  }

  /* One document-wide delegated handler so every .plant-care-link anywhere in
   * the app jumps to the Care Guide, regardless of which view rendered it. */
  document.addEventListener("click", (e) => {
    const link = e.target.closest(".plant-care-link");
    if (!link) return;
    e.preventDefault();
    const pid = link.getAttribute("data-care-plant-id");
    if (pid) openCareGuideForPlant(pid);
  });

  /* "Ask Claude" link on the Care Guide jumps to the Chat tab with the plant
   * pre-selected as context, so the next question is already focused. */
  function openChatForPlant(plantId) {
    if (typeof setChatPlantContextFor === "function") setChatPlantContextFor(plantId);
    const btn = document.querySelector('.tab-btn[data-tab="chat"]');
    if (btn) btn.click();
    /* After the tab activates, focus the input so they can just start typing. */
    setTimeout(() => {
      const input = document.getElementById("chat-input");
      if (input) input.focus();
    }, 80);
  }

  /* Wire up listeners (once at load time) */
  if (todoAddForm) {
    todoAddForm.addEventListener("submit", handleTodoAddSubmit);
  }
  if (todoResetBtn) {
    todoResetBtn.addEventListener("click", resetTodoForm);
  }
  if (todoFilterPlantEl) {
    todoFilterPlantEl.addEventListener("change", () => {
      todoFilter.plant = todoFilterPlantEl.value || "ALL";
      renderTodosTab();
    });
  }
  if (todoFilterCategoryEl) {
    todoFilterCategoryEl.addEventListener("change", () => {
      todoFilter.category = todoFilterCategoryEl.value || "ALL";
      renderTodosTab();
    });
  }
  todoStatusBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      todoFilter.status = btn.dataset.status;
      renderTodosTab();
    });
  });
  if (todosListEl) {
    todosListEl.addEventListener("click", handleTodoListClick);
  }
  if (todoClearCompletedEl) {
    todoClearCompletedEl.addEventListener("click", () => {
      const n = TodoStore.completed().length;
      if (n === 0) { flash("No completed todos to clear."); return; }
      if (!confirm(`Clear ${n} completed todo${n === 1 ? "" : "s"}? This cannot be undone.`)) return;
      const removed = TodoStore.clearCompleted();
      flash(`Cleared ${removed} completed todo${removed === 1 ? "" : "s"} 🧹`);
      renderTodosTab();
    });
  }

  /* ============================================================
   * Ask Claude tab — BYOK chat with Anthropic's API directly from
   * the browser, using the `anthropic-dangerous-direct-browser-access`
   * header. All chat state lives in localStorage (see ClaudeSettings
   * and ChatHistory in watering.js).
   * ============================================================ */
  const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
  const ANTHROPIC_VERSION = "2023-06-01";
  const CHAT_PHOTO_MAX_DIM = 1568;     // Anthropic's 5MP-ish soft limit
  const CHAT_PHOTO_QUALITY = 0.82;
  const CHAT_MAX_HISTORY   = 30;       // turns kept in API context to stay <128k tokens

  const chatSetupCard       = document.getElementById("chat-setup-card");
  const chatApiKeyInput     = document.getElementById("chat-api-key");
  const chatDangerAck       = document.getElementById("chat-danger-ack");
  const chatSaveKeyBtn      = document.getElementById("chat-save-key");
  const chatTestKeyBtn      = document.getElementById("chat-test-key");
  const chatClearKeyBtn     = document.getElementById("chat-clear-key");
  const chatSetupStatusEl   = document.getElementById("chat-setup-status");
  const chatSettingsToggle  = document.getElementById("chat-settings-toggle");
  const chatModelSelect     = document.getElementById("chat-model");
  const chatPlantContextSel = document.getElementById("chat-plant-context");
  const chatMessagesEl      = document.getElementById("chat-messages");
  const chatForm            = document.getElementById("chat-form");
  const chatInput           = document.getElementById("chat-input");
  const chatPhotoInput      = document.getElementById("chat-photo");
  const chatAttachPreview   = document.getElementById("chat-attachment-preview");
  const chatAttachImg       = document.getElementById("chat-attachment-img");
  const chatAttachRemoveBtn = document.getElementById("chat-attachment-remove");
  const chatSendBtn         = document.getElementById("chat-send-btn");
  const chatClearBtn        = document.getElementById("chat-clear-btn");
  const chatCostTotalEl     = document.getElementById("chat-cost-total");
  const chatSaveConvoBtn    = document.getElementById("chat-save-conversation-btn");
  /* Save-as-note modal refs */
  const chatSaveModal       = document.getElementById("chat-save-modal");
  const chatSaveCloseBtn    = document.getElementById("chat-save-close");
  const chatSaveCancelBtn   = document.getElementById("chat-save-cancel");
  const chatSaveConfirmBtn  = document.getElementById("chat-save-confirm");
  const chatSavePlantSelect = document.getElementById("chat-save-plant");
  const chatSaveTitleInput  = document.getElementById("chat-save-title-input");
  const chatSavePreviewEl   = document.getElementById("chat-save-preview");
  let chatSavePending       = null;   // { source, messages, defaultPlantId, defaultTitle }

  let chatPendingAttachment = null;   // { dataUrl, mediaType }
  let chatInFlight          = false;  // suppress duplicate sends
  let chatCurrentAssistantEl = null;  // for streaming UI updates

  function populateChatDropdowns() {
    if (!chatModelSelect || !chatPlantContextSel) return;
    /* Model picker */
    chatModelSelect.innerHTML = CLAUDE_MODELS
      .map(m => `<option value="${escapeAttr(m.id)}">${escapeHtml(m.label)} — ${escapeHtml(m.hint)}</option>`)
      .join("");
    chatModelSelect.value = ClaudeSettings.model || DEFAULT_CLAUDE_MODEL;

    /* Plant context dropdown */
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    chatPlantContextSel.innerHTML = [
      `<option value="ALL">🌿 Whole collection summary</option>`,
      `<option value="NONE">— No plant context —</option>`,
      `<option value="" disabled>───────────</option>`,
      ...ownedIds.map(id => `<option value="${escapeAttr(id)}">${escapeHtml(all[id].displayName)}</option>`)
    ].join("");
    const saved = ChatHistory.plantContext();
    chatPlantContextSel.value = saved && (saved === "ALL" || saved === "NONE" || all[saved]) ? saved : "ALL";
  }

  /* When the Care Guide is showing a plant, pre-set the chat context to it the
   * next time the chat tab opens. Called from openTodosForPlant-style hooks. */
  function setChatPlantContextFor(plantId) {
    if (!chatPlantContextSel) return;
    if (!plantId) return;
    const all = PlantStore.allPlants();
    if (!all[plantId]) return;
    chatPlantContextSel.value = plantId;
    ChatHistory.setPlantContext(plantId);
  }

  function refreshChatSetupUI() {
    if (!chatSetupCard || !chatClearKeyBtn) return;
    const hasKey = !!ClaudeSettings.apiKey;
    chatSetupCard.hidden = hasKey && ClaudeSettings.acked;
    chatClearKeyBtn.hidden = !hasKey;
    if (chatApiKeyInput) {
      chatApiKeyInput.value = hasKey ? "•".repeat(Math.min(20, ClaudeSettings.apiKey.length)) : "";
    }
    if (chatDangerAck) {
      chatDangerAck.checked = ClaudeSettings.acked;
    }
    if (chatSendBtn) {
      chatSendBtn.disabled = !hasKey;
      chatSendBtn.title = hasKey ? "" : "Set your API key in Settings first";
    }
  }

  /* ---------- Plant-context system prompt ---------- */
  function buildClaudeSystemPrompt(plantContextId) {
    const all      = PlantStore.allPlants();
    const ownedIds = PlantStore.ownedIds();
    const log      = WaterLog.all();
    const todos    = TodoStore.list();
    const todayPretty = Dates.formatPretty(Dates.today());

    let s = `You are an experienced plant-care assistant helping the user with a personal home garden in Austin, TX. All plants are kept INDOORS at 75–80°F year-round. Today is ${todayPretty}.

Style:
- Be concise and practical. Prefer short paragraphs and bullet lists.
- Use the user's actual plant data (pot, soil, last watered, condition, comments, todos, placement) when answering — don't give purely generic advice when specifics are available.
- If asked about a plant that's not in the collection, say so first and answer generically.
- Their watering intervals are research-based and calibrated; don't suggest different intervals unless they ask.
- When relevant, cite mainstream horticultural sources (RHS, Missouri Botanical Garden, UF/IFAS Extension, NCSU Extension, Costa Farms).
- For diagnostics, ask one clarifying question only if the photo / description is genuinely ambiguous.
`;

    if (plantContextId === "ALL") {
      s += `\n\nThe user has ${ownedIds.length} owned plants. Collection summary:\n`;
      ownedIds.forEach(pid => {
        const p = all[pid];
        if (!p) return;
        const nx = nextWatering(pid, log, p);
        const statusBit = nx
          ? nx.status === "overdue" ? `💧 overdue ${Math.abs(nx.daysUntil)}d`
            : nx.status === "due"   ? `💧 due today`
            : nx.status === "soon"  ? `🟡 in ${nx.daysUntil}d`
            : `🔵 in ${nx.daysUntil}d`
          : "";
        s += `- ${p.displayName}${p.potSize ? ` (${p.potSize})` : ""} — ${statusBit}\n`;
      });
    } else if (plantContextId && plantContextId !== "NONE" && all[plantContextId]) {
      const p = all[plantContextId];
      const nx = nextWatering(plantContextId, log, p);
      const plantTodos = todos.filter(t => t.plantId === plantContextId && !t.completedAt);
      const placement = (typeof PLANT_PLACEMENT !== "undefined") ? PLANT_PLACEMENT[plantContextId] : null;
      const lastEntry = (Array.isArray(log) ? log : []).filter(e => e.plantId === plantContextId).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
      const idealZones = placement?.ideal?.map(z => (typeof PLACEMENT_ZONES !== "undefined" && PLACEMENT_ZONES[z]?.displayName) || z).join(", ") || "";
      const conditionLabels = (typeof CONDITION_OPTIONS !== "undefined")
        ? (CONDITION_OPTIONS.find(c => c.id === p.condition)?.label || p.condition)
        : p.condition;

      s += `\n\n## Currently focused plant
Name: ${p.displayName}
Scientific: ${p.scientific || "—"}
Category: ${(p.category || "—").replace(/_/g, " ")}
Pot size: ${p.potSize || "—"}
Current soil mix: ${p.currentSoilMix || "(pending)"}
Condition: ${conditionLabels || "—"}
Comments from owner: ${p.comments || "(none)"}
Last logged watering: ${lastEntry ? `${lastEntry.date}${lastEntry.note ? ` — "${lastEntry.note}"` : ""}` : "(no log yet)"}
Next watering due: ${nx ? `${Dates.formatPretty(nx.nextDate)} (${nx.message || ""})` : "—"}
Recommended placement zones (ideal): ${idealZones || "—"}
Open todos for this plant:
${plantTodos.length
  ? plantTodos.map(t => `  - ${(TODO_CATEGORY_MAP[t.category]?.label) || t.category}: ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}${t.notes ? ` [${t.notes}]` : ""}`).join("\n")
  : "  - (none)"}

Other plants in collection (for cross-reference): ${ownedIds.filter(id => id !== plantContextId).map(id => all[id]?.displayName).filter(Boolean).join(", ") || "—"}
`;
    }
    return s;
  }

  /* ---------- Minimal safe markdown renderer ---------- */
  function renderChatMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);
    /* Inline code */
    html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    /* Bold then italic */
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
    /* Linkify https:// URLs (already escaped — only & < > etc are entities) */
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    /* Bullet lists: lines starting with "- " grouped into <ul> */
    const lines = html.split("\n");
    const out = [];
    let listOpen = false;
    for (const ln of lines) {
      const m = ln.match(/^- (.+)$/);
      if (m) {
        if (!listOpen) { out.push("<ul>"); listOpen = true; }
        out.push(`<li>${m[1]}</li>`);
      } else {
        if (listOpen) { out.push("</ul>"); listOpen = false; }
        if (/^###?\s+/.test(ln)) {
          out.push(`<h4>${ln.replace(/^###?\s+/, "")}</h4>`);
        } else {
          out.push(ln);
        }
      }
    }
    if (listOpen) out.push("</ul>");
    return out.join("\n");
  }

  /* ---------- Cost computation ---------- */
  function chatComputeCost(usage, modelId) {
    if (!usage) return 0;
    const m = CLAUDE_MODELS.find(x => x.id === modelId);
    if (!m) return 0;
    const inTok  = usage.input_tokens  || 0;
    const outTok = usage.output_tokens || 0;
    return (inTok / 1_000_000) * m.inUSD + (outTok / 1_000_000) * m.outUSD;
  }
  function formatUSD(n) {
    if (n == null) return "";
    if (n < 0.0005) return "<$0.001";
    if (n < 0.01)  return `$${n.toFixed(4)}`;
    if (n < 1)     return `$${n.toFixed(3)}`;
    return `$${n.toFixed(2)}`;
  }

  /* ---------- Render the entire chat panel from history ---------- */
  function renderChatMessages() {
    if (!chatMessagesEl) return;
    const messages = ChatHistory.messages();
    if (!messages.length) {
      chatMessagesEl.innerHTML = `<div class="chat-empty">No messages yet. Ask a plant question to get started.</div>`;
    } else {
      chatMessagesEl.innerHTML = messages.map((m, idx) => renderChatMessage(m, idx, idx === messages.length - 1)).join("");
    }
    /* Scroll to the bottom (with a small delay so the layout settles) */
    requestAnimationFrame(() => {
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    });
    chatCurrentAssistantEl = chatMessagesEl.querySelector(".chat-msg.is-assistant.is-streaming .chat-msg-body");
    updateChatCostTotal();
    updateChatSaveConvoButton();
  }

  function renderChatMessage(m, idx, isLast) {
    const isUser = m.role === "user";
    const isError = !isUser && m.error;
    const streamingClass = !isUser && m.streaming ? " is-streaming" : "";
    const roleLabel = isUser ? "You" : (isError ? "Error" : "Claude");

    let bodyHtml = "";
    if (isUser) {
      /* User content can be a string or content-block array (mixed text + image) */
      if (typeof m.content === "string") {
        bodyHtml = escapeHtml(m.content).replace(/\n/g, "<br>");
      } else if (Array.isArray(m.content)) {
        m.content.forEach(block => {
          if (block.type === "image") {
            const dataUrl = block._dataUrl ||
              (block.source ? `data:${block.source.media_type};base64,${block.source.data}` : "");
            if (dataUrl) bodyHtml += `<img class="chat-msg-image" src="${escapeAttr(dataUrl)}" alt="user upload" />`;
          } else if (block.type === "text") {
            bodyHtml += `<div>${escapeHtml(block.text || "").replace(/\n/g, "<br>")}</div>`;
          }
        });
      }
    } else {
      bodyHtml = renderChatMarkdown(m.content || "");
      if (m.streaming && (!m.content || m.content.length === 0)) {
        bodyHtml = `<span class="muted">Thinking…</span>`;
      }
      if (m.streaming) bodyHtml += `<span class="chat-msg-streaming-cursor"></span>`;
    }

    let metaHtml = "";
    if (!isUser && !isError && (m.usage || m.cost)) {
      const tokens = m.usage ? `${m.usage.input_tokens || 0} in + ${m.usage.output_tokens || 0} out` : "";
      const cost   = m.cost ? `~${formatUSD(m.cost)}` : "";
      const model  = m.model ? ` · ${m.model.replace(/^claude-/, "")}` : "";
      metaHtml = `<div class="chat-msg-meta">${[tokens, cost].filter(Boolean).join(" · ")}${model}</div>`;
    }

    /* Show a "💾 Save note" button only on completed (non-streaming) assistant
     * messages that are not errors and have some content. The data-attribute
     * carries the message index so the click handler can find the right pair. */
    let actionsHtml = "";
    if (!isUser && !isError && !m.streaming && m.content) {
      actionsHtml = `
        <div class="chat-msg-actions">
          <button type="button" class="chat-msg-save-btn" data-action="save-message" data-msg-index="${idx}" title="Save this exchange to a plant's notes">💾 Save to plant notes</button>
        </div>
      `;
    }

    const wrapperClass = isUser
      ? "chat-msg is-user"
      : isError
        ? "chat-msg is-error"
        : `chat-msg is-assistant${streamingClass}`;

    return `
      <article class="${wrapperClass}" data-message-index="${idx}">
        <div class="chat-msg-role">${escapeHtml(roleLabel)}</div>
        <div class="chat-msg-body">${bodyHtml}</div>
        ${metaHtml}
        ${actionsHtml}
      </article>
    `;
  }

  function updateChatCostTotal() {
    if (!chatCostTotalEl) return;
    const total = ChatHistory.totalCost();
    chatCostTotalEl.textContent = total > 0 ? `Session cost so far: ${formatUSD(total)}` : "";
  }

  function updateChatSaveConvoButton() {
    if (!chatSaveConvoBtn) return;
    /* Show the "save whole conversation" button only when there's at least
     * one completed user+assistant pair worth archiving. */
    const messages = ChatHistory.messages();
    const hasPair = messages.some((m, i) =>
      m.role === "assistant" &&
      !m.streaming &&
      !m.error &&
      m.content &&
      i > 0 &&
      messages[i - 1].role === "user"
    );
    chatSaveConvoBtn.hidden = !hasPair;
  }

  /* ---------- Extract plain text from a message's mixed content ---------- */
  function extractMessageText(m) {
    if (!m) return "";
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      const parts = [];
      let hasImage = false;
      m.content.forEach(b => {
        if (b.type === "text") parts.push(b.text || "");
        if (b.type === "image") hasImage = true;
      });
      if (hasImage) parts.unshift("[user attached an image]");
      return parts.join("\n").trim();
    }
    return "";
  }

  /* ---------- Save-to-plant-notes flow ---------- */
  function openChatSaveModalForMessage(idx) {
    const messages = ChatHistory.messages();
    const assistant = messages[idx];
    const user      = messages[idx - 1];
    if (!assistant || assistant.role !== "assistant") {
      flash("Couldn't find the assistant message to save.");
      return;
    }
    const turns = [];
    if (user && user.role === "user") {
      const text = extractMessageText(user);
      if (text) turns.push({ role: "user", text });
    }
    turns.push({ role: "assistant", text: extractMessageText(assistant) });

    const userText = turns.find(t => t.role === "user")?.text || "";
    const defaultTitle = userText
      ? userText.replace(/\s+/g, " ").trim().slice(0, 80)
      : `Claude tip — ${Dates.formatPretty(Dates.today())}`;

    chatSavePending = {
      source: "message",
      messages: turns,
      defaultTitle,
      model: assistant.model || ""
    };
    showChatSaveModal();
  }

  function openChatSaveModalForConversation() {
    const messages = ChatHistory.messages();
    /* Build a flat list of valid {role,text} turns from the whole convo. */
    const turns = messages
      .filter(m => !m.streaming && !m.error && (m.content || (Array.isArray(m.content) && m.content.length)))
      .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", text: extractMessageText(m) }))
      .filter(t => t.text.length > 0);
    if (turns.length === 0) {
      flash("No completed messages to save yet.");
      return;
    }
    const firstUserText = turns.find(t => t.role === "user")?.text || "";
    const defaultTitle  = firstUserText
      ? `Conversation: ${firstUserText.replace(/\s+/g, " ").trim().slice(0, 70)}`
      : `Claude conversation — ${Dates.formatPretty(Dates.today())}`;

    const lastAssistant = [...messages].reverse().find(m => m.role === "assistant" && m.model);
    chatSavePending = {
      source: "conversation",
      messages: turns,
      defaultTitle,
      model: lastAssistant?.model || ""
    };
    showChatSaveModal();
  }

  function showChatSaveModal() {
    if (!chatSaveModal || !chatSavePending) return;
    /* Populate the plant select with owned plants, defaulting to the chat's
     * current context if it's a specific plant. */
    const all = PlantStore.allPlants();
    const ownedIds = sortByDisplayName(PlantStore.ownedIds(), all);
    if (chatSavePlantSelect) {
      const ctx = ChatHistory.plantContext();
      const defaultPid = (ctx && all[ctx]) ? ctx : "";
      chatSavePlantSelect.innerHTML = [
        defaultPid ? "" : `<option value="" disabled selected>Choose a plant…</option>`,
        ...ownedIds.map(id =>
          `<option value="${escapeAttr(id)}"${id === defaultPid ? " selected" : ""}>${escapeHtml(all[id].displayName)}</option>`
        )
      ].join("");
    }
    if (chatSaveTitleInput) chatSaveTitleInput.value = chatSavePending.defaultTitle || "";
    if (chatSavePreviewEl) {
      chatSavePreviewEl.innerHTML = chatSavePending.messages.map(t => `
        <div class="preview-turn">
          <div class="preview-role">${escapeHtml(t.role === "user" ? "You" : "Claude")}</div>
          <div class="preview-text">${renderChatMarkdown(t.text)}</div>
        </div>
      `).join("");
    }
    chatSaveModal.hidden = false;
    setTimeout(() => {
      if (chatSavePlantSelect && !chatSavePlantSelect.value) chatSavePlantSelect.focus();
      else if (chatSaveTitleInput) chatSaveTitleInput.focus();
    }, 60);
  }

  function hideChatSaveModal() {
    if (chatSaveModal) chatSaveModal.hidden = true;
    chatSavePending = null;
  }

  function handleChatSaveConfirm() {
    if (!chatSavePending) { hideChatSaveModal(); return; }
    const plantId = chatSavePlantSelect?.value;
    if (!plantId) {
      flash("Pick a plant to save the note under.");
      chatSavePlantSelect?.focus();
      return;
    }
    const title = chatSaveTitleInput?.value?.trim() || chatSavePending.defaultTitle;
    const note = CareNotesStore.add(plantId, {
      title,
      source: chatSavePending.source,
      model:  chatSavePending.model,
      plantContextAtSave: ChatHistory.plantContext(),
      messages: chatSavePending.messages
    });
    const plantName = PlantStore.allPlants()[plantId]?.displayName || "plant";
    const verb = chatSavePending.source === "conversation" ? "Conversation" : "Note";
    hideChatSaveModal();
    flash(`${verb} saved to ${plantName} 📝`);
    /* If the Care Guide is currently rendering this plant, refresh its notes. */
    refreshPlantNotesSectionIfVisible(plantId);
    /* If chat is currently focused on this plant, no further refresh needed. */
  }

  /* ---------- Wire chat-save modal + button delegation ---------- */
  if (chatMessagesEl) {
    chatMessagesEl.addEventListener("click", e => {
      const saveBtn = e.target.closest(".chat-msg-save-btn");
      if (!saveBtn) return;
      const idx = parseInt(saveBtn.getAttribute("data-msg-index"), 10);
      if (!Number.isFinite(idx)) return;
      openChatSaveModalForMessage(idx);
    });
  }
  if (chatSaveConvoBtn)   chatSaveConvoBtn.addEventListener("click",  openChatSaveModalForConversation);
  if (chatSaveCloseBtn)   chatSaveCloseBtn.addEventListener("click",  hideChatSaveModal);
  if (chatSaveCancelBtn)  chatSaveCancelBtn.addEventListener("click", hideChatSaveModal);
  if (chatSaveConfirmBtn) chatSaveConfirmBtn.addEventListener("click", handleChatSaveConfirm);
  if (chatSaveModal) {
    chatSaveModal.addEventListener("click", e => {
      /* Click on the dimmed overlay (but NOT on the inner card) closes the modal. */
      if (e.target === chatSaveModal) hideChatSaveModal();
    });
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && chatSaveModal && !chatSaveModal.hidden) hideChatSaveModal();
  });

  /* ---------- Attachment handling ---------- */
  async function handleChatPhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file, CHAT_PHOTO_MAX_DIM, CHAT_PHOTO_QUALITY);
      const mediaType = (dataUrl.match(/^data:([^;]+);/) || [, "image/jpeg"])[1];
      chatPendingAttachment = { dataUrl, mediaType };
      if (chatAttachImg) chatAttachImg.src = dataUrl;
      if (chatAttachPreview) chatAttachPreview.hidden = false;
    } catch (err) {
      alert("Could not load image: " + err.message);
    }
    /* Reset the file input so picking the same file again triggers change */
    e.target.value = "";
  }
  function clearChatAttachment() {
    chatPendingAttachment = null;
    if (chatAttachPreview) chatAttachPreview.hidden = true;
    if (chatAttachImg) chatAttachImg.removeAttribute("src");
  }

  /* ---------- API call + streaming ---------- */
  function buildApiMessagesFromHistory(history) {
    /* Keep only the last CHAT_MAX_HISTORY turns to bound context. Strip any
     * streaming-only or error placeholders. */
    const usable = history.filter(m => !m.error && !m.streaming && m.content);
    const trimmed = usable.slice(-CHAT_MAX_HISTORY);
    return trimmed.map(m => {
      if (m.role === "user" && Array.isArray(m.content)) {
        /* Strip the `_dataUrl` mirror property we added for local re-rendering */
        return {
          role: "user",
          content: m.content.map(b => {
            if (b.type === "image") {
              return { type: "image", source: b.source };
            }
            return { type: "text", text: b.text };
          })
        };
      }
      return { role: m.role, content: m.content };
    });
  }

  async function sendChatMessage(text) {
    if (chatInFlight) return;
    const apiKey = ClaudeSettings.apiKey;
    if (!apiKey) {
      setChatSetupStatus("Set your API key first.", "err");
      if (chatSetupCard) chatSetupCard.hidden = false;
      return;
    }
    const model = ClaudeSettings.model || DEFAULT_CLAUDE_MODEL;
    const plantCtx = chatPlantContextSel?.value || "ALL";
    ChatHistory.setPlantContext(plantCtx);
    const system = buildClaudeSystemPrompt(plantCtx);

    /* Build the user message — may contain text + optional image block */
    const userContent = [];
    if (chatPendingAttachment) {
      const b64 = chatPendingAttachment.dataUrl.split(",")[1] || "";
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: chatPendingAttachment.mediaType, data: b64 },
        _dataUrl: chatPendingAttachment.dataUrl
      });
    }
    if (text) userContent.push({ type: "text", text });
    if (userContent.length === 0) return;

    ChatHistory.append({
      role: "user",
      content: userContent,
      model,
      ts: new Date().toISOString()
    });
    /* Placeholder assistant message — we'll stream into it. */
    ChatHistory.append({
      role: "assistant",
      content: "",
      model,
      ts: new Date().toISOString(),
      streaming: true
    });
    renderChatMessages();

    chatInput.value = "";
    clearChatAttachment();
    chatInFlight = true;
    if (chatSendBtn) { chatSendBtn.disabled = true; chatSendBtn.textContent = "Sending…"; }

    const apiMessages = buildApiMessagesFromHistory(ChatHistory.messages().slice(0, -1));
    /* Reattach the latest user message that we just persisted */
    apiMessages.push({
      role: "user",
      content: userContent.map(b => b.type === "image" ? { type: "image", source: b.source } : b)
    });

    let assistantText = "";
    let usage = null;

    try {
      const resp = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model,
          max_tokens: 1500,
          system,
          messages: apiMessages,
          stream: true
        })
      });

      if (!resp.ok) {
        let errBody = "";
        try { errBody = await resp.text(); } catch { /* ignore */ }
        throw new Error(`HTTP ${resp.status} ${resp.statusText}${errBody ? `\n${errBody.slice(0, 600)}` : ""}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop();
        for (const ev of events) {
          const line = ev.split("\n").find(l => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let obj;
          try { obj = JSON.parse(payload); } catch { continue; }

          if (obj.type === "message_start" && obj.message?.usage) {
            usage = { ...(usage || {}), input_tokens: obj.message.usage.input_tokens || 0 };
          } else if (obj.type === "content_block_delta" && obj.delta?.type === "text_delta") {
            assistantText += obj.delta.text || "";
            ChatHistory.updateLastAssistant({ content: assistantText });
            renderStreamingTextInto(assistantText);
          } else if (obj.type === "message_delta" && obj.usage) {
            usage = { ...(usage || {}), output_tokens: obj.usage.output_tokens };
          } else if (obj.type === "error") {
            throw new Error(`API error: ${obj.error?.message || JSON.stringify(obj.error)}`);
          }
        }
      }

      const cost = chatComputeCost(usage, model);
      ChatHistory.updateLastAssistant({
        content: assistantText,
        streaming: false,
        usage,
        cost
      });
    } catch (err) {
      ChatHistory.updateLastAssistant({
        content: `⚠️ ${err.message}`,
        streaming: false,
        error: true
      });
    } finally {
      chatInFlight = false;
      if (chatSendBtn) {
        chatSendBtn.disabled = !ClaudeSettings.apiKey;
        chatSendBtn.textContent = "Send";
      }
      renderChatMessages();
    }
  }

  /* Update only the in-flight assistant bubble's text content without a full
   * re-render (cheaper while streaming). */
  function renderStreamingTextInto(text) {
    if (!chatCurrentAssistantEl) {
      chatCurrentAssistantEl = chatMessagesEl?.querySelector(".chat-msg.is-assistant.is-streaming .chat-msg-body");
    }
    if (!chatCurrentAssistantEl) return;
    chatCurrentAssistantEl.innerHTML = renderChatMarkdown(text) + `<span class="chat-msg-streaming-cursor"></span>`;
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  /* ---------- Setup card actions ---------- */
  function setChatSetupStatus(msg, kind = "") {
    if (!chatSetupStatusEl) return;
    chatSetupStatusEl.textContent = msg;
    chatSetupStatusEl.className = "chat-setup-status muted small" + (kind ? ` ${kind}` : "");
  }

  async function handleChatSaveKey() {
    if (!chatApiKeyInput) return;
    const raw = chatApiKeyInput.value.trim();
    /* If the field still shows the bullet mask, the user didn't change it — keep current key. */
    const isMask = /^•+$/.test(raw);
    const key = isMask ? ClaudeSettings.apiKey : raw;
    if (!key || !/^sk-ant-/.test(key)) {
      setChatSetupStatus("That doesn't look like a valid Anthropic key (should start with sk-ant-).", "err");
      return;
    }
    if (!chatDangerAck?.checked) {
      setChatSetupStatus("Please check the BYOK acknowledgement to continue.", "err");
      return;
    }
    ClaudeSettings.setKey(key);
    ClaudeSettings.setAcked(true);
    setChatSetupStatus("Saved on this device. ✅", "ok");
    refreshChatSetupUI();
  }

  async function handleChatTestKey() {
    const apiKey = chatApiKeyInput && !/^•+$/.test(chatApiKeyInput.value.trim())
      ? chatApiKeyInput.value.trim()
      : ClaudeSettings.apiKey;
    if (!apiKey) { setChatSetupStatus("Enter a key first.", "err"); return; }
    setChatSetupStatus("Testing connection…");
    try {
      const resp = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: ClaudeSettings.model || DEFAULT_CLAUDE_MODEL,
          max_tokens: 16,
          messages: [{ role: "user", content: "Reply with exactly OK." }]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const txt = (data.content?.[0]?.text || "").trim();
        setChatSetupStatus(`Connected. Claude replied: "${txt}" ✅`, "ok");
      } else {
        const errBody = await resp.text();
        setChatSetupStatus(`HTTP ${resp.status}: ${errBody.slice(0, 200)}`, "err");
      }
    } catch (err) {
      setChatSetupStatus(`Network error: ${err.message}`, "err");
    }
  }

  function handleChatClearKey() {
    if (!confirm("Forget the saved API key on this device? You'll need to paste it again to chat.")) return;
    ClaudeSettings.clearKey();
    setChatSetupStatus("Key forgotten.", "");
    refreshChatSetupUI();
  }

  function handleChatClear() {
    if (!ChatHistory.messages().length) { flash("No conversation to clear."); return; }
    if (!confirm("Clear the chat conversation? Your API key and settings stay.")) return;
    ChatHistory.clear();
    renderChatMessages();
    flash("Conversation cleared 🗑");
  }

  function handleChatFormSubmit(e) {
    e.preventDefault();
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text && !chatPendingAttachment) return;
    sendChatMessage(text);
  }

  /* ---------- Wire up listeners ---------- */
  if (chatForm) chatForm.addEventListener("submit", handleChatFormSubmit);
  if (chatInput) {
    chatInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm?.requestSubmit();
      }
    });
  }
  if (chatPhotoInput) chatPhotoInput.addEventListener("change", handleChatPhotoChange);
  if (chatAttachRemoveBtn) chatAttachRemoveBtn.addEventListener("click", clearChatAttachment);
  if (chatSettingsToggle) {
    chatSettingsToggle.addEventListener("click", () => {
      if (chatSetupCard) chatSetupCard.hidden = !chatSetupCard.hidden;
    });
  }
  if (chatSaveKeyBtn)  chatSaveKeyBtn.addEventListener("click", handleChatSaveKey);
  if (chatTestKeyBtn)  chatTestKeyBtn.addEventListener("click", handleChatTestKey);
  if (chatClearKeyBtn) chatClearKeyBtn.addEventListener("click", handleChatClearKey);
  if (chatClearBtn)    chatClearBtn.addEventListener("click", handleChatClear);
  if (chatModelSelect) {
    chatModelSelect.addEventListener("change", () => {
      ClaudeSettings.setModel(chatModelSelect.value);
    });
  }
  if (chatPlantContextSel) {
    chatPlantContextSel.addEventListener("change", () => {
      ChatHistory.setPlantContext(chatPlantContextSel.value);
    });
  }

  function renderChatTab() {
    populateChatDropdowns();
    refreshChatSetupUI();
    renderChatMessages();
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function escapeAttr(str) { return escapeHtml(str); }

  /**
   * Sort an array of plant IDs alphabetically by their displayName (case-insensitive,
   * locale-aware so accented characters sort sensibly). Falls back to the raw ID
   * if a plant has no displayName for any reason.
   */
  function sortByDisplayName(ids, plants) {
    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    return [...ids].sort((a, b) => {
      const an = plants[a]?.displayName || a;
      const bn = plants[b]?.displayName || b;
      return collator.compare(an, bn);
    });
  }

  let flashTimer;
  function flash(msg) {
    let el = document.getElementById("flash-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "flash-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = 1;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.style.opacity = 0; }, 2000);
  }

  /* ============================================================
   * Auto-migration: custom plants → matching built-in entries
   * ============================================================
   *
   * When an agent promotes a custom plant to a researched built-in entry in
   * `js/plants-data.js`, the old `user_*` plant would otherwise linger in
   * localStorage and show up as a second "(custom)" menu option with empty
   * tips. This function runs on every startup and merges any user-attached
   * data (condition, comments, pot size, photo, watering-log entries,
   * snoozes) into the matching built-in plant, then removes the orphan
   * custom entry.
   *
   * Matching is by *normalized display name OR common name* — case- and
   * whitespace-insensitive, punctuation stripped.
   */
  function migrateCustomToBuiltins() {
    const customs = PlantStore.customPlants();
    if (!customs.length) return { migrated: 0, summary: [] };

    const normalize = s => String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    /* Lookup table: normalized name → built-in id */
    const lookup = new Map();
    Object.values(PLANTS).forEach(p => {
      const names = [p.displayName, ...((p.names && p.names.common) || [])];
      names.forEach(n => {
        const k = normalize(n);
        if (k && !lookup.has(k)) lookup.set(k, p.id);
      });
    });

    const summary = [];
    for (const custom of customs) {
      if (!custom || typeof custom.id !== "string" || !custom.id.startsWith("user_")) continue;
      const matchId = lookup.get(normalize(custom.displayName));
      if (!matchId) continue;
      /* Match found — migrate user data into the built-in. */

      const overlayPatch = {};
      const existingOverlay = PlantStore.overlays()[matchId] || {};
      if (custom.condition && !existingOverlay.condition) overlayPatch.condition = custom.condition;
      if (custom.comments  && !existingOverlay.comments)  overlayPatch.comments  = custom.comments;
      if (custom.potSize && custom.potSize !== "—" &&
          !existingOverlay.potSize &&
          custom.potSize !== PLANTS[matchId].potSize) {
        overlayPatch.potSize = custom.potSize;
      }
      /* Carry over a user-set soil mix (anything other than "pending"). */
      if (custom.currentSoilMix && custom.currentSoilMix !== "pending" &&
          !existingOverlay.currentSoilMix) {
        overlayPatch.currentSoilMix = custom.currentSoilMix;
      }
      if (Object.keys(overlayPatch).length) PlantStore.setOverlay(matchId, overlayPatch);

      const customImg = ImageStore.get(custom.id);
      if (customImg) {
        if (!ImageStore.get(matchId)) ImageStore.set(matchId, customImg);
        ImageStore.remove(custom.id);
      }

      const log = WaterLog.all();
      let logChanges = 0;
      const repointed = log.map(e => {
        if (e.plantId === custom.id) { logChanges++; return { ...e, plantId: matchId }; }
        return e;
      });
      if (logChanges) WaterLog.replaceAll(repointed);

      const customSnooze = SnoozeStore.get(custom.id);
      if (customSnooze) {
        if (!SnoozeStore.get(matchId)) SnoozeStore.add(matchId, customSnooze.addDays);
        SnoozeStore.clear(custom.id);
      }

      PlantStore.removeCustom(custom.id);
      PlantStore.removeOverlay(custom.id);

      summary.push({
        from: custom.displayName,
        fromId: custom.id,
        to: matchId,
        overlay: overlayPatch,
        imageMigrated: !!customImg,
        waterLogEntriesMoved: logChanges,
        snoozeMigrated: !!customSnooze
      });
    }
    return { migrated: summary.length, summary };
  }

  /* ============================================================
   * Init
   * ============================================================ */
  /**
   * Delegated snooze handler — attached ONCE to the stable `nextSummary`
   * element so it survives every innerHTML re-render.
   *
   * Earlier iterations fired the snooze on `pointerdown` directly, which
   * solved a Samsung Internet bug where `click` didn't always reach
   * non-first tiles — but introduced a NEW bug: any scroll gesture whose
   * finger first landed on a snooze button would *immediately* fire a
   * snooze before the browser even realised the user was scrolling. The
   * current implementation tracks pointerdown → pointerup as a gesture
   * and only fires when:
   *
   *   1. The pointer moved < 10px between down and up (i.e. a true tap,
   *      not a scroll/swipe).
   *   2. The gesture took < 600ms (otherwise it's a long-press and we
   *      ignore it).
   *   3. Pointerup happens on the SAME button as pointerdown (otherwise
   *      the user dragged off the button).
   *   4. `pointercancel` / `pointerleave` (which the browser fires when
   *      it promotes a touch to a scroll) didn't already clear the
   *      gesture state.
   *
   * Snooze remains ADDITIVE — multiple +Xd taps stack into one bigger
   * snooze. There is NO same-button debounce; the deliberate compound
   * behaviour is preserved. The only dedupe is between the pointerup
   * primary path and the click fallback path for a single physical tap. */
  const TAP_MOVE_THRESHOLD = 10;
  const TAP_TIME_THRESHOLD = 600;
  let snoozeGesture = null;     // { pointerId, btn, x, y, t }
  let lastSnoozeFireAt = 0;     // for pointerup → click dedupe

  function fireSnooze(btn) {
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;
    const all = PlantStore.allPlants();
    if (btn.dataset.clear) {
      SnoozeStore.clear(id);
      flash(`Snooze cleared for ${all[id]?.displayName || id}`);
    } else {
      const days = parseInt(btn.dataset.days, 10);
      if (!days || Number.isNaN(days)) return;
      SnoozeStore.add(id, days);
      flash(`Snoozed ${all[id]?.displayName || id} +${days}d`);
    }
    /* Re-render both the calendar summary and, if a plant detail is currently
     * showing this plant, its inline watering tile. Order matters — the
     * calendar re-render is a no-op if it isn't the active tab (cheap grid
     * rebuild), but the detail refresh is the more likely user-visible surface
     * when snoozing from the Care Guide. */
    renderCalendar();
    refreshPlantWateringSectionIfVisible(id);
  }

  function handleSnoozePointerDown(e) {
    const btn = e.target.closest(".snooze-btn");
    if (!btn) return;
    snoozeGesture = {
      pointerId: e.pointerId,
      btn,
      x: e.clientX,
      y: e.clientY,
      t: Date.now()
    };
  }

  function handleSnoozePointerMove(e) {
    if (!snoozeGesture || e.pointerId !== snoozeGesture.pointerId) return;
    const dx = Math.abs(e.clientX - snoozeGesture.x);
    const dy = Math.abs(e.clientY - snoozeGesture.y);
    if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) {
      snoozeGesture = null;
    }
  }

  function handleSnoozePointerUp(e) {
    if (!snoozeGesture || e.pointerId !== snoozeGesture.pointerId) return;
    const start = snoozeGesture;
    snoozeGesture = null;
    if (Date.now() - start.t > TAP_TIME_THRESHOLD) return;
    const releaseBtn = e.target.closest(".snooze-btn");
    if (releaseBtn !== start.btn) return;
    lastSnoozeFireAt = Date.now();
    e.preventDefault();
    fireSnooze(start.btn);
  }

  function handleSnoozePointerCancel(e) {
    if (snoozeGesture && e.pointerId === snoozeGesture.pointerId) {
      snoozeGesture = null;
    }
  }

  function handleSnoozeClickFallback(e) {
    const btn = e.target.closest(".snooze-btn");
    if (!btn) return;
    if (Date.now() - lastSnoozeFireAt < 700) return;
    fireSnooze(btn);
  }

  /* Attach the snooze gesture handlers to both stable parents that host
   * .snooze-btn elements: `nextSummary` on the Calendar tab, `detailEl` on
   * the Care Guide tab. The handler code is identical — the buttons carry
   * `data-id` / `data-days` / `data-clear` so `fireSnooze` doesn't care
   * which surface the tap came from. */
  function wireSnoozeHandlers(root) {
    if (!root) return;
    if (window.PointerEvent) {
      root.addEventListener("pointerdown",   handleSnoozePointerDown);
      root.addEventListener("pointermove",   handleSnoozePointerMove);
      root.addEventListener("pointerup",     handleSnoozePointerUp);
      root.addEventListener("pointercancel", handleSnoozePointerCancel);
      root.addEventListener("pointerleave",  handleSnoozePointerCancel);
    }
    root.addEventListener("click", handleSnoozeClickFallback);
  }
  wireSnoozeHandlers(nextSummary);
  wireSnoozeHandlers(detailEl);

  /* Tile plant-name → Care Guide navigation (calendar tiles live in nextSummary).
   * The name-link is not a .snooze-btn, so the snooze handlers ignore it. */
  if (nextSummary) nextSummary.addEventListener("click", handleTileNameClick);

  /* "💧 Just watered" button on a reminder tile: log a watering for today, which
   * clears any snooze and bumps the plant down the queue. Wired on both stable
   * parents (calendar summary + Care Guide detail tile). */
  function handleWaterNowClick(e) {
    const btn = e.target.closest(".water-now-btn");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.dataset.id;
    if (!id) return;
    const all = PlantStore.allPlants();
    const name = all[id]?.displayName || id;
    const today = Dates.iso(Dates.today());
    const already = WaterLog.all().some(en => en.plantId === id && en.date === today);
    if (already) {
      flash(`${name} already logged as watered today 💧`);
      return;
    }
    WaterLog.add({ plantId: id, date: today, note: "" });
    flash(`Logged: watered ${name} today 💧`);
    renderCalendar();
    renderRecentLog();
    refreshPlantWateringSectionIfVisible(id);
  }
  if (nextSummary) nextSummary.addEventListener("click", handleWaterNowClick);
  if (detailEl)    detailEl.addEventListener("click", handleWaterNowClick);

  function init() {
    loadTheme();
    const mig = migrateCustomToBuiltins();
    if (mig.migrated > 0) {
      console.info("[plant-care] Merged custom plants into built-ins:", mig.summary);
    }
    populatePrimarySelect();
    populateCalendarPlantSelect();
    populateLogPlantSelect();
    populateProfileStaticSelects();
    populateProfileExisting();
    populateTodoDropdowns();
    populateChatDropdowns();
    handlePrimaryChange();
    logDate.value = Dates.iso(Dates.today());
    const today = Dates.today();
    calMonthSelect.value = String(today.getFullYear() === 2026 ? today.getMonth() : 0);
    syncCalendarControlClears();
    renderCalendar();
    renderRecentLog();
    renderSoilTab();
    renderPlacementTab();
    renderTodosTab();
    renderChatTab();
    resetProfileForm("new");
    if (mig.migrated > 0) {
      const moved = mig.summary.reduce((n, s) => n + s.waterLogEntriesMoved, 0);
      const movedSuffix = moved ? `, ${moved} log entr${moved === 1 ? "y" : "ies"} re-pointed` : "";
      flash(`Merged ${mig.migrated} custom plant${mig.migrated === 1 ? "" : "s"} → built-in${movedSuffix} 🌿`);
    }
  }
  init();
})();
