/**
 * care-library.js — shared Care Guide extras
 * ----------------------------------------------------------------------------
 * - Chopstick / wooden-skewer soil moisture check (research-backed guide)
 * - Propagation methods with typical first-timer success rates
 * - Exhaustive troubleshooting matrices (symptom → causes → fix)
 *
 * Lookups fall back from plant-specific → category defaults so every owned
 * plant gets structured content even if tips.* prose is still the primary text.
 */
"use strict";

/* ========== 1. Chopstick soil-moisture check ========== */
const CHOPSTICK_SOIL_CHECK = {
  title: "Chopstick / wooden skewer soil check",
  summary:
    "A bare wooden chopstick or bamboo skewer reads moisture deeper than a fingertip — especially useful in tall pots where the surface dries while the root zone stays wet.",
  steps: [
    "Use an unfinished / unlacquered wooden chopstick or bamboo skewer (takeout chopsticks are ideal). Lacquered wood will not absorb moisture and gives a false reading.",
    "Insert at a ~45° angle, 2–3 inches away from the main stem (reduces risk of spearing a thick feeder root). Push toward the lower root zone — mid-pot or near the bottom for deep pots.",
    "Leave it in place 30–60 seconds (up to 1–2 minutes in dense / peat-heavy mix) so the wood can wick moisture.",
    "Pull it out and read the stick (see chart below). Wipe clean and let dry before reusing, or keep one stick per plant to avoid cross-contaminating pests."
  ],
  reading: [
    { look: "Clean, dry, light-colored wood", meaning: "Soil is dry at that depth → water (if this plant wants a dry-down)." },
    { look: "Dark damp patches / soil clinging", meaning: "Still moist → wait. Check again in 1–2 days." },
    { look: "Soaked dark along most of the stick", meaning: "Too wet at depth → do NOT water; improve airflow / check drainage / suspect overwatering." },
    { look: "Dry at tip, damp near the middle", meaning: "Surface/upper zone dry but mid-zone still wet — common in big pots; wait before a full soak." }
  ],
  plantTips: [
    "Match the reading to THIS plant's soil-moisture ideal (see Ideal vs Passing above) — a cactus wants a dry stick; a Fittonia / Calathea wants just-moist, not bone dry.",
    "In no-drainage containers (e.g. glass bowls), always tilt-check for a water reservoir after a wet reading.",
    "Don't jab the same hole daily — rotate insertion spots so you don't create a compacted channel.",
    "Combine with pot-weight and leaf cues. The calendar is a reminder; the stick (or finger) is the decision."
  ],
  sources: [
    { label: "Weekand / Parade — Measuring moisture with wooden chopsticks", url: "https://www.weekand.com/home-garden/article/check-soil-moisture-chopstick-18003403.php" },
    { label: "The Garden Magazine — Chopstick deep-root moisture check", url: "https://thegardenmagazine.com/how-to-use-a-simple-chopstick-to-check-the-moisture-level-of-deep-houseplant-roots/" },
    { label: "House Outlook — Untreated chopstick watering hack", url: "https://houseoutlook.com/never-overwater-plants-hack/" },
    { label: "Texas A&M AgriLife — Soil feel / moisture guidance (context)", url: "https://agrilifeextension.tamu.edu/" }
  ]
};

/* ========== Helpers ========== */
function _m(method, success, timeline, notes) {
  return { method, success, timeline, notes };
}
function _t(symptom, causes, fix, urgency) {
  return { symptom, causes, fix, urgency: urgency || "normal" };
}
/** Per-plant chopstick guidance: depth to probe + how to act on the reading. */
function _c(depth, waterWhen, waitWhen, notes) {
  return { depth, waterWhen, waitWhen, notes: notes || "" };
}

/* ========== 1b. Per-plant chopstick depth & readings ==========
 * Tuned to each owned plant's pot size + researched soilMoisture ideal
 * (from plants-data.js watering tips / conditions).
 */
const CHOPSTICK_BY_PLANT = {
  prayer_plant: _c(
    "Insert ~1\" deep in the 6.5\" pot (shallow-rooted Calathea — don't chase the bottom).",
    "Stick barely damp or dry at 1\" AND soil below still feels cool → water soon with filtered water. Ideal is evenly lightly moist, not bone dry.",
    "Stick dark/damp at 1\" with soil clinging → wait. Recheck next day.",
    "Never wait for a bone-dry stick — this plant crisps and stops 'praying' if it dries out. Pair with humidity (1F Bath / humidifier)."
  ),
  monstera: _c(
    "Insert 2–3\" deep (mid-zone of the 13.5\" pot). Surface crust lies — check mid-depth.",
    "Clean/dry wood at ~2\" → deep soak until runoff (rewet the inner store-peat core, then let the whole mass dry evenly).",
    "Dark/damp or soil clinging at 2\" → wait 1–2 days.",
    "Dual-soil note: outer mix dries faster than the peat core. Air-layer moss wraps are a separate mist job — don't drench the pot to 'water' the sphagnum."
  ),
  monstera_water_cuttings: _c(
    "No soil stick — this is a water jar. Check that each NODE is still submerged.",
    "Change water weekly (sooner if cloudy). Top off if evaporation dropped the waterline below the node.",
    "Slimy/smelly water or a mushy stem → discard that cutting and rinse the jar; don't 'wait it out'.",
    "UMN Extension: a leaf with no node will never root. Pot when several roots are 2–3\"."
  ),
  thai_constellation: _c(
    "Insert 1–2\" deep in the 5\" pot (most of the root zone in aroid mix).",
    "Clean/dry at 1–2\" → deep drench, then drain fully. Thai Const rots easier than green Monstera — err dry.",
    "Any dark dampness at 1–2\" → wait. When in doubt, wait 2 extra days in winter.",
    "Small pot dries fast under AC; still prioritize stick over calendar. Cream tissue burns from overwater stress too."
  ),
  schefflera: _c(
    "Insert 2–3\" deep in the 13.5\" pot (Aug 2026 overpot — mid-zone, not just the crust).",
    "Dry/clean at 2–3\" → water thoroughly, empty the saucer.",
    "Damp/dark at that depth → wait. A dry surface over wet unused outer soil is the overpot trap.",
    "Clemson HGIC: pots should only go +1–2\". You jumped 9→13.5\" — err dry until new growth resumes."
  ),
  schefflera_dark: _c(
    "Insert ~1\" deep in the 5.5\" pot.",
    "Dry at 1\" → water.",
    "Damp at 1\" → wait.",
    "Slightly more drought-tolerant than the variegated Schefflera; still don't leave soaked."
  ),
  mini_orchid: _c(
    "Skip deep soil probing — this is bark. Slide the stick gently among bark chips 1–1.5\" in, or press a chip/root.",
    "Bark chips dry + roots silvery-gray → soak the pot 10–15 min, then drain completely.",
    "Bark still dark/wet or roots green/plump → wait. Never leave water in the crown.",
    "Chopstick on bark is a secondary cue — silver roots are the primary Phalaenopsis signal."
  ),
  ginseng_ficus: _c(
    "Insert ~½–1\" deep in the 7\" bonsai-style pot (shallow root zone).",
    "Surface just dry / stick lightly dry at ½\" → water to runoff. Never bone-dry the whole rootball.",
    "Cool damp stick at ½\" → wait a day.",
    "Fast-draining bonsai mix + shallow pot = frequent checks in summer AC, not deep desert dry-downs."
  ),
  ginseng_ficus_cutting: _c(
    "Insert only the tip (~¼–½\") in the 2\" starter pot — the whole plug is the root zone.",
    "Top few mm dry on the stick → water to just-moist. Never let the tiny plug go hollow-light/bone dry.",
    "Stick still dark/damp → wait; check again the same day in peak summer.",
    "Establishing cutting: steadier moisture than the parent tree until roots fill the pot."
  ),
  snake_plant: _c(
    "Insert 2–3\" deep in the 7.5\" pot — you want the mid/lower zone dry, not just the crust.",
    "Stick clean/dry 2–3\" down → deep soak, then let drain. Rhizomes hate wet feet.",
    "Any moisture on the stick at 2\"+ → wait (often another week).",
    "Bone-dry between waterings. Overwatering is the #1 killer — trust a dry deep reading."
  ),
  aloe_vera: _c(
    "Insert 1.5–2\" deep in the 8.5\" pot / gritty mix.",
    "Clean dry stick at that depth → deep soak; empty saucer.",
    "Damp/dark stick → wait. In winter, stretch even further if leaves stay plump.",
    "Wrinkled lower leaves + dry stick = thirsty. Mushy leaves + damp stick = overwatered — stop watering."
  ),
  mondo_grass: _c(
    "Insert ~1\" deep, then also check toward the CENTER of the 9\" × 9\" × 9\" cube.",
    "Dry at 1\" AND the core isn't swampy → water to even moisture (not a desert dry-down).",
    "Damp at 1\" or a wet core → wait. Corners dry faster than the middle.",
    "Aug 2026 plant-up roughly doubled volume vs 7.5\" — don't water on the old cadence (Clemson HGIC: moist, not waterlogged)."
  ),
  firestick: _c(
    "Insert 1–1.5\" deep in the 4\" pot (full dry-down). Outdoors, also dump the saucer after rain.",
    "Bone-dry clean stick → water at the soil line once; let dry hard again. Stems just starting to wrinkle = also a cue.",
    "Any dampness → wait. After a storm, wet saucer ≠ 'already watered well' if it sat flooded.",
    "⚠️ Caustic sap — gloves. NW patio dries a 4\" pot faster than indoor AC — check weekly in August."
  ),
  kalanchoe: _c(
    "Insert ~1\" deep in the 4\" pot.",
    "Top 1\" dry on the stick → water at the soil line (avoid wetting flowers/leaves).",
    "Damp at 1\" → wait.",
    "During dark-treatment / dormancy for rebloom, keep even drier — stick should stay dry longer."
  ),
  burrows_tail: _c(
    "Insert ~1\" deep along the pot edge (avoid stabbing the fragile cascading stems).",
    "Bone-dry clean stick → soak, drain well.",
    "Any dampness → wait. Slight pearl/leaf soft wrinkle + dry stick = thirsty.",
    "Handle the pot, not the strands. Rot from wet soil is common — err dry."
  ),
  baby_burros_tail: _c(
    "Insert ~¾–1\" deep at the pot rim in the 3\" pot.",
    "Bone-dry stick → light soak, drain.",
    "Damp stick → wait.",
    "Even more fragile than mature Burro's Tail — confirm with stick before watering so you aren't lifting/handling it constantly."
  ),
  succulent_frankenstein_a: _c(
    "Insert 1–1.5\" deep in the 4.5\" mix pot.",
    "Completely dry stick → water thoroughly once.",
    "Damp stick → wait. Water for the most drought-tolerant member of the mix.",
    "If one species goes mushy while others look fine, the pot was too wet — next time wait for a fully dry stick."
  ),
  succulent_frankenstein_b: _c(
    "Insert ~1\" deep in the 3.5\" pot.",
    "Dry stick → water. Peperomia in the mix softens slightly before true Sedums need water — compromise on the dry side.",
    "Damp stick → wait.",
    "Mixed needs: when in doubt, wait. Separate pots later if one species always sulks."
  ),
  dracaena_fragrans: _c(
    "Insert 2\" deep in the 9\" × 9\" pot (Cane A — ignore dry surface dust).",
    "Dry/clean at 2\" → deep water with filtered water; flush occasionally for fluoride tip-burn prevention.",
    "Damp at 2\" → wait.",
    "Post-split (Aug 2026): this cane dries faster than the old shared 13.5\". Don't copy Cane B's day."
  ),
  dracaena_fragrans_b: _c(
    "Insert 2\" deep in THIS 9\" × 9\" (Cane B) — do not use Cane A's stick reading.",
    "Dry/clean at 2\" → water with filtered/distilled/rain water.",
    "Damp at 2\" → wait. Division shock looks like thirst — wet soil + yellow leaves means hold off.",
    "Same species as Cane A; independent root mass after the Aug 2026 split."
  ),
  cordyline_fruticosa: _c(
    "Insert 1–2\" deep in the 9.5\" pot.",
    "Dry at 1–2\" → water thoroughly (filtered water preferred — fluoride sensitive).",
    "Damp at that depth → wait.",
    "Likes more even moisture than a cactus but still wants a clear dry-down at 1–2\"."
  ),
  assorted_cacti: _c(
    "Insert 1.5–2\" deep toward the pot edge in the 7\" dish/pot.",
    "Bone-dry stick the whole probed length → water deeply, then dry hard for weeks.",
    "Any damp section → wait. Soft cactus + damp stick = emergency dry-out.",
    "Mixed species: water only when the stick is fully dry so the wettest-intolerant cactus isn't drowned."
  ),
  royal_ivy: _c(
    "Insert ~1\" deep in the 5\" pot.",
    "Dry at 1\" → water evenly; keep foliage airflow high (mite prevention).",
    "Damp at 1\" → wait.",
    "Don't keep perpetually wet — damp stick + dry AC is a spider-mite magnet combo if leaves are dusty."
  ),
  wandering_dude: _c(
    "Insert ~1\" deep in the 4\" glass bowl. Also tilt the bowl and look for a water reservoir at the bottom.",
    "Top 1\" dry on the stick AND no standing water visible → water sparingly (no-drain bowl).",
    "Damp stick OR visible water at the glass bottom → do not water; tilt-drain if pooled.",
    "⚠️ No drainage — a wet stick is more dangerous here than in a holed pot. False-drainage pebbles help but don't replace tilt checks."
  ),
  golden_pothos: _c(
    "Insert 1–2\" deep in the 5\" pot.",
    "Dry at 1–2\" → soak thoroughly.",
    "Damp → wait.",
    "Very forgiving; stick still beats watering on a fixed day when AC swings."
  ),
  pearls_jade_pothos: _c(
    "Insert ~1\" deep in the 3\" pot.",
    "Stick just-dry at 1\" (lightly dry, not desert-bone-dry for weeks) → water. Prefers not to sit bone dry long.",
    "Cool damp stick → wait.",
    "Small pot + brighter light needs: check more often than Golden, but don't keep soggy."
  ),
  pothos_combo: _c(
    "Insert ~1\" deep in the 4\" pot.",
    "Dry at 1\" → water (slightly drier cadence than a pure Satin-only pot).",
    "Damp → wait.",
    "Mixed cultivars: water when the stick says dry so Satin/Marble pieces aren't sitting wet for Golden's sake."
  ),
  fittonia: _c(
    "Insert only ~½–¾\" in the 1\" pot / shallow media — the whole volume is root zone.",
    "Stick just losing dampness (barely moist→dry) → water immediately. Never wait for bone-dry.",
    "Still clearly damp → wait a few hours and recheck; don't add water on top of wet media.",
    "Drama-queen wilt is usually thirst — but confirm with the stick so you don't drown a collapsed-overwatered plant."
  ),
  marble_queen_pothos: _c(
    "Insert ~1\" deep in the 4\" pot.",
    "Dry at 1\" → deep water.",
    "Damp → wait.",
    "White variegation browns from both underwater stress and sun; stick keeps watering consistent."
  ),
  philodendron_silver_stripe: _c(
    "Insert ~1\" deep in the 4\" pot.",
    "Dry at 1\" → soak.",
    "Damp → wait.",
    "Same trailing-aroid rule as pothos: mid-surface dry reading is enough in a small pot."
  ),
  haworthia: _c(
    "Insert ~1\" deep in the 3\" pot; avoid jamming into the rosette center.",
    "Bone-dry stick → water at the soil line only (not into the leaves).",
    "Damp stick → wait a long time — these want hard dry-downs.",
    "Water in the crown + damp stick = rot risk. Always water the soil, read the stick."
  ),
  sedum_angelina: _c(
    "Insert ~1\" deep in the 3\" pot.",
    "Dry to barely-dry stick → water; bright light keeps growth compact.",
    "Damp → wait.",
    "Color (gold/orange) is light-driven; watering still follows a dry stick, not the calendar."
  ),
  string_of_pearls: _c(
    "Insert ~1–1.5\" deep near the rim of the 5\" pot (don't drag through pearl strands).",
    "Completely dry stick → soak from the bottom or carefully at soil, then drain.",
    "Any dampness → wait. Shriveled pearls + dry stick = water; mushy pearls + damp stick = rot.",
    "Most-killed succulent in the collection — stick must be dry, not 'almost dry.'"
  ),
  lady_finger_cactus: _c(
    "Insert 1–1.5\" deep in the 4\" pot.",
    "Fully dry stick → water thoroughly once; dry hard again for weeks.",
    "Damp stick → wait. Soft base + damp stick = cut away rot culture.",
    "Never bathroom humidity. Full dry-down is non-negotiable."
  ),
  variegated_elephant_bush: _c(
    "Insert 1–1.5\" deep in the 5\" pot.",
    "Dry to slightly dry stick → soak-and-dry. Leaves puckering = also thirsty.",
    "Damp stick → wait.",
    "Variegation wants strong light; watering still waits on a dry reading after the recent repot settle."
  ),
  variegated_elephant_bush_bonsai: _c(
    "Insert ½–¾\" deep — shallow bonsai pot is almost all root zone.",
    "Dry-to-slightly-moist stick → water. Shallow pots swing dry fast in summer.",
    "Still damp → wait a day; check again sooner than the parent plant.",
    "Rooted division (not a cutting): no long moist rooting phase — treat like the parent in a faster-drying pot."
  ),
  zz_plant: _c(
    "Insert ~2\" deep in the 5\" pot (top 2\" should go bone dry).",
    "Clean dry stick at 2\" → water thoroughly, then ignore for a long stretch.",
    "Any moisture at 2\" → wait. Yellow stalks + damp stick = overwatering.",
    "Aug 2026: correctly up-potted 4→5\". If rhizomes were nicked, wait 7–10 days before the first post-repot water."
  ),
  desert_rose: _c(
    "Insert 1.5–2\" deep in the 5\" pot / gritty mix. Outdoors: dump saucer after rain first.",
    "Growing season: fully dry stick → water well, then dry hard. Dormancy (cool/short days, indoors): keep dry for long stretches even if leaves yellow/drop.",
    "Damp stick → wait. Soft caudex + damp stick = rot emergency.",
    "UF/IFAS: summer patio OK with drainage; winter freeze is fatal. Outdoor August heat dries the 5\" faster than indoor AC."
  ),
  terrarium_a: _c(
    "Do not use a deep chopstick as the primary tool — sealed jar moisture is read by glass condensation + surface look.",
    "Add 1–2 tsp distilled water only if there is NO morning condensation for 7+ days and the surface looks dry.",
    "Morning fog that clears by afternoon = perfect — do nothing. Constant fog / pooling = vent, don't add water.",
    "A chopstick can gently check the top ½\" substrate if needed, but venting and condensation beat probing."
  ),
  terrarium_b: _c(
    "Same as Terrarium A — condensation + surface, not deep probing.",
    "No AM condensation for a week + dry surface → tiny distilled top-up.",
    "Persistent fog / pooling → vent; do not water.",
    "Compare with the healthier twin jar as a control before adding water."
  )
};

const CATEGORY_CHOPSTICK = {
  tropical: _c(
    "Insert 1–2\" deep (or mid-pot in containers over 10\").",
    "Dry/clean at the check depth → water thoroughly.",
    "Damp/dark stick → wait.",
    "Match to the plant's soil-moisture ideal — humidity lovers rarely want a bone-dry stick."
  ),
  pothos: _c(
    "Insert ~1–2\" deep.",
    "Dry at that depth → soak.",
    "Damp → wait.",
    "Trailing aroids are forgiving; stick still prevents chronic overwatering in AC."
  ),
  succulent: _c(
    "Insert 1–2\" deep toward the pot edge.",
    "Bone-dry clean stick → water once, then dry hard.",
    "Any dampness → wait.",
    "Err dry. Mushy leaves + damp stick = stop watering and check roots."
  ),
  cactus: _c(
    "Insert 1–2\" deep.",
    "Fully dry stick → water thoroughly; dry for weeks.",
    "Damp → wait.",
    "Full dry-downs only."
  ),
  succulent_like: _c(
    "Insert 2–3\" deep for rhizome plants; 1–2\" for smaller pots.",
    "Deep zone dry → soak.",
    "Moisture at depth → wait.",
    "Snake-plant types store water — deep dry reading required."
  ),
  bonsai: _c(
    "Insert ½–1\" deep (shallow pots).",
    "Surface just dry on the stick → water; don't desiccate the whole rootball.",
    "Still damp → wait a day; check more often in summer.",
    "Shallow mix dries fast — depth is shallow, frequency is higher."
  ),
  ornamental_grass: _c(
    "Insert ~1\" deep.",
    "Dry at 1\" → water to even moisture.",
    "Damp → wait.",
    "Not a desert plant — avoid bone-dry stick for long stretches."
  )
};

/* ========== 2. Category defaults ========== */
const CATEGORY_PROPAGATION = {
  tropical: [
    _m("Stem cuttings in water", "80–90%", "2–6 weeks", "Node required. Change water when cloudy; pot up at 1–3\" roots."),
    _m("Stem cuttings in soil / sphagnum", "75–90%", "3–6 weeks", "Keep barely moist + warm; stronger soil roots than water."),
    _m("Division (clumping types)", "85–95%", "Immediate", "Each piece needs roots + shoots. Best at spring repot."),
    _m("Air layering", "90–95%", "4–10 weeks", "Safest for valuable vines — plant stays attached until rooted.")
  ],
  pothos: [
    _m("Stem cuttings in water", "90–98%", "1–3 weeks", "Node mandatory. Fastest, most visual method."),
    _m("Stem cuttings in soil", "90–95%", "2–4 weeks", "Skip transplant shock; keep lightly moist until tug-resistant."),
    _m("Multiple nodes in one pot", "90%+", "2–4 weeks", "Best for a full basket — 3–7 cuttings together.")
  ],
  succulent: [
    _m("Stem / tip cuttings (callus → soil)", "70–90%", "2–6 weeks", "Callus 1–3 days; plant in dry mix; wait ~1 week to water."),
    _m("Leaf cuttings", "40–70%", "4–12 weeks", "Species-dependent — Sedum/Kalanchoe often good; Aloe leaf cuttings rarely work."),
    _m("Offsets / pups / division", "85–95%", "Immediate–4 weeks", "Highest success when the offset already has roots."),
    _m("Water rooting", "50–75%", "2–6 weeks", "Works for some (Portulacaria, Kalanchoe); rot risk higher than soil.")
  ],
  cactus: [
    _m("Offsets / pups", "85–95%", "Immediate–4 weeks", "Let callus, plant in dry cactus mix, delay first water."),
    _m("Stem cuttings (segments)", "70–85%", "3–8 weeks", "Callus thoroughly; bright light; rare water until rooted."),
    _m("Water rooting", "40–60%", "4–8 weeks", "Not preferred — high rot risk.")
  ],
  succulent_like: [
    _m("Division / rhizome split", "90–95%", "Immediate", "Best way to keep variegation (e.g. Snake Plant Laurentii)."),
    _m("Leaf cuttings in water or soil", "60–80%", "4–12 weeks", "Mark the 'bottom' end; pups take months."),
    _m("Rhizome cuttings", "70–85%", "4–8 weeks", "Keep barely moist, warm, bright indirect.")
  ],
  bonsai: [
    _m("Hardwood / branch cuttings", "60–75%", "4–8 weeks", "Rooting hormone + humidity dome helps a lot."),
    _m("Air layering", "80–90%", "6–12 weeks", "Best for thicker trunks / caudex-style bases."),
    _m("Rooted division (existing roots)", "90%+", "Settle 1–3 weeks", "If a branch comes off with rootball, treat as established — not a fresh cutting.")
  ],
  ornamental_grass: [
    _m("Division", "90–95%", "Immediate", "Primary method — split clumps in spring."),
    _m("Seed", "40–70%", "Weeks–months", "Slow; cultivar traits may not come true.")
  ]
};

const CATEGORY_TROUBLESHOOTING = {
  tropical: [
    _t("Yellow leaves", "Overwatering / root rot (most common); sometimes underwatering or natural old-leaf shed", "Chopstick/finger-check soil. Wet + yellow → hold water, inspect roots. Dry + yellow/crispy → soak thoroughly.", "high"),
    _t("Brown crispy tips/edges", "Low humidity (Central Texas AC), tap-water salts/fluoride, inconsistent watering", "Raise humidity, switch to filtered water, flush soil monthly, keep watering even.", "normal"),
    _t("Drooping / wilting", "Thirst OR root rot — opposite fixes", "Check soil first. Dry → water. Wet → unpot, trim mushy roots, refresh mix.", "high"),
    _t("Leaf curl", "Underwatering, low humidity, or heat/AC blast", "Water if dry; move off vents; raise humidity.", "normal"),
    _t("Leggy / small new leaves", "Insufficient light", "Move closer to bright indirect window or add grow light 10–12 hrs.", "normal"),
    _t("Pests (mites, mealybugs, scale)", "Dry indoor air + dusty leaves invite mites; mealy/scale hitchhike on new plants", "Isolate. Rinse, alcohol swabs for mealy/scale, insecticidal soap or neem weekly ×3.", "high"),
    _t("No new growth for months", "Winter slowdown, low light, rootbound, or nutrient stall", "Check season + light first. Repot if circling roots. Resume light feed in spring.", "low"),
    _t("Fungus gnats", "Chronically wet surface soil", "Let top inch dry, sticky traps, bottom-water, optional BTi (mosquito bits).", "normal")
  ],
  pothos: [
    _t("Yellow leaves", "Overwatering #1; also old leaves at base of vine", "Confirm with chopstick. Cut yellow leaves; fix watering cadence.", "normal"),
    _t("Variegation fading to green", "Light too low", "Brighter indirect light; Marble Queen / Pearls & Jade need more than Golden.", "normal"),
    _t("Brown spots / black mushy stems", "Stem/root rot from wet soil", "Cut to healthy tissue, root healthy nodes in water, discard mush.", "high"),
    _t("Sparse long vines", "Low light + never pinched", "Pinch tips, increase light, pot several cuttings together.", "low"),
    _t("Wilting in wet soil", "Root rot", "Unpot, trim, fresh aroid mix, water sparingly 2 weeks.", "high")
  ],
  succulent: [
    _t("Mushy / translucent leaves or stem", "Overwatering / rot", "Unpot, cut to firm tissue, callus, repot dry cactus mix; wait 5–14 days to water.", "high"),
    _t("Wrinkled / puckered leaves", "Underwatering (or failed roots)", "Soak thoroughly if roots OK. If no recovery, check for rot.", "normal"),
    _t("Etiolation (stretching, pale)", "Not enough light", "Move to brighter / direct-sun appropriate window or strong grow light 12–14 hrs.", "normal"),
    _t("Sunburn (bleached / brown patches)", "Sudden move to harsh sun", "Filter light 1–2 weeks when relocating; scars stay but new growth OK.", "normal"),
    _t("Mealybugs (white cotton)", "Common on succulents", "Alcohol dab, isolate, neem/soap weekly ×3.", "high"),
    _t("Leaves dropping from touch (Sedum morganianum)", "Normal fragility + sometimes thirst or overwater stress", "Handle by pot not stems; check moisture before assuming disease.", "low")
  ],
  cactus: [
    _t("Soft base / black rot", "Overwatering or humid stagnant air", "Surgery: cut above rot, callus, repot dry. Never bathroom humidity.", "high"),
    _t("Etiolation (thin stretching)", "Insufficient sun", "Full sun window or high-PPFD grow light; stretched growth won't reverse.", "normal"),
    _t("Yellowing / corking", "Natural basal corking vs overwater", "Hard cork = age OK; soft yellow = trouble — inspect roots.", "normal")
  ],
  succulent_like: [
    _t("Mushy rhizomes / collapsing leaves", "Chronic overwatering", "Cut rot, dry, repot in gritty mix; long dry stretch before next water.", "high"),
    _t("Wrinkled curling leaves", "Severe drought", "Deep soak until runoff; leaves plump in 24–48 hrs if roots alive.", "normal"),
    _t("Brown tips", "Fluoride/chlorine in tap water or inconsistent water", "Filtered water; even cadence.", "low")
  ],
  bonsai: [
    _t("Sudden mass leaf drop", "Move shock, light change, draft, or watering swing", "Stabilize location & schedule; buds often return in 2–4 weeks.", "normal"),
    _t("Yellow leaves + wet soil", "Overwatering in shallow bonsai pot still possible if mix stays soggy", "Check roots; refresh fast-drain mix; extend dry interval.", "high"),
    _t("Dry crispy edges in tiny pot", "Shallow pot dried out completely", "Water sooner; never let bonsai pots go bone-dry for days in summer.", "normal")
  ],
  ornamental_grass: [
    _t("Brown leaf tips", "Underwatering, low humidity, or fluoride", "Even moisture; trim tips; filtered water helps.", "low"),
    _t("Thinning / sparse clump", "Low light or need for spring shear", "Brighter spot; shear to 2–3\" in early spring.", "low")
  ]
};

/* ========== 3. Plant-specific propagation (all owned plants) ========== */
const PROPAGATION_LIBRARY = {
  prayer_plant: [
    _m("Division (ONLY reliable method)", "~90%", "Immediate + 1–2 wk sulk", "Rhizome clumps with roots + leaves. Stem/leaf cuttings will NOT root — they rot."),
    _m("Stem cuttings in water/soil", "~0–10%", "Fails", "Common beginner mistake with Calathea/Goeppertia — skip.")
  ],
  monstera: [
    _m("Air layering (IN PROGRESS — 4 vines)", "90–95%", "4–8 weeks", "Keep sphagnum moist not dripping. Sever only after 1–2\" roots in the wrap (UMN / The Spruce)."),
    _m("Water cuttings (IN PROGRESS — 3 tops)", "80–90%", "Roots 2–4 wks; pot-ready 3–6 wks", "Node required. Tracked as Monstera (Water Cuttings). Change cloudy water."),
    _m("Soil / sphagnum cuttings", "75–85%", "3–6 weeks", "Stronger roots; keep humid and barely moist."),
    _m("Wet-stick / node-only", "50–70%", "2–4+ months", "Possible but slower — not first-timer friendly.")
  ],
  monstera_water_cuttings: [
    _m("This entry IS the 3 water top cuttings", "80–90% if each has a node", "Roots 2–4 wks (UMN Extension)", "Change water weekly. Pot at 2–3\" roots into 5–6\" aroid mix, all 3 together."),
    _m("Leaf-only / no node", "0%", "Fails", "UMN: will stay green then rot. Compost it."),
    _m("Sister air layers on mother", "90–95%", "4–8 weeks", "Do not mix timelines — sever moss wraps only when rooted.")
  ],
  thai_constellation: [
    _m("Air layering", "90%+", "6–10 weeks", "Safest for expensive variegated tissue. Pick a node with plenty of green."),
    _m("Sphagnum / humidity cuttings", "80%+", "4–6 weeks", "Better than plain water for Thai Const."),
    _m("Water cuttings", "70–80%", "4–8 weeks", "Slower than green Monstera. Avoid all-cream nodes — they starve."),
    _m("All-white node cuttings", "<20%", "Usually fail", "No chlorophyll — discard or don't bother.")
  ],
  ginseng_ficus: [
    _m("Hardwood cuttings + hormone", "~70%", "4–8 weeks", "Humidity dome strongly recommended."),
    _m("Air layering", "80–90%", "6–12 weeks", "Best for thick branches / nicer trunk."),
    _m("Seed", "Low / slow", "Months+", "Not worth it for the cultivar look.")
  ],
  ginseng_ficus_cutting: [
    _m("This plant IS a rooted cutting", "N/A — already propagated", "—", "Once established, propagate further like the parent (cuttings / air layer)."),
    _m("Re-root if stem fails", "50–70%", "4–8 weeks", "Trim to firm green, callus, humidity dome.")
  ],
  snake_plant: [
    _m("Division / rhizome split", "~95%", "Immediate", "Preserves variegation on Laurentii-type edges."),
    _m("Leaf cuttings in water", "60–80%", "4–8 wks roots; pups 2–4 mo", "Mark bottom end. Variegation often reverts to green."),
    _m("Leaf cuttings in soil", "60–75%", "Slower than water", "Insert into barely-moist gritty mix.")
  ],
  aloe_vera: [
    _m("Pups / offsets", "90–95%", "Callus 1–2 days → plant", "Wait until pup is 3\"+ with own roots. Highest success."),
    _m("Leaf cuttings", "<20%", "Usually fail", "Don't bother — Aloes rarely leaf-prop.")
  ],
  mondo_grass: [
    _m("Division", "90–95%", "Immediate", "Split clumps in early spring; keep moist while establishing."),
    _m("Seed", "40–60%", "Slow", "Optional; division is the practical method.")
  ],
  firestick: [
    _m("Stem cuttings (callus → dry soil)", "80–90%", "2–4 weeks", "⚠️ Caustic sap — gloves/eye protection. Callus well; delay watering."),
    _m("Water rooting", "50–70%", "2–4 weeks", "Works but rot risk higher; soil preferred.")
  ],
  schefflera: [
    _m("Stem cuttings in water or soil", "70–85%", "3–6 weeks", "Warm + humid helps. Variegated needs good light while rooting."),
    _m("Air layering", "85–90%", "6–10 weeks", "Good for leggy taller specimens.")
  ],
  schefflera_dark: [
    _m("Stem cuttings in water or soil", "75–90%", "3–6 weeks", "Solid-green form is slightly more forgiving than variegated."),
    _m("Air layering", "85–90%", "6–10 weeks", "Same technique as variegated Schefflera.")
  ],
  mini_orchid: [
    _m("Keiki (baby plant on spike/cane)", "85–95%", "Pot when 2–3 roots ~2\"", "Best natural method for Phalaenopsis-type minis."),
    _m("Division (multi-growth plants)", "80–90%", "Immediate", "Only if multiple mature growths exist."),
    _m("Stem/leaf cuttings", "~0%", "Fails", "Orchids don't work like pothos — don't try random leaf cuts.")
  ],
  kalanchoe: [
    _m("Stem tip cuttings", "85–95%", "2–4 weeks", "Callus briefly; plant in gritty mix."),
    _m("Leaf cuttings", "70–85%", "3–6 weeks", "Often produce plantlets along leaf edges (species-dependent).")
  ],
  burrows_tail: [
    _m("Stem cuttings (callus → soil)", "70–85%", "3–6 weeks", "Handle gently — leaves shatter. Let callus; bright light; rare water."),
    _m("Individual leaf props", "50–70%", "4–10 weeks", "Fallen leaves often root — lay on dryish mix."),
    _m("Water rooting", "50–65%", "3–6 weeks", "Possible but easy to rot — soil preferred.")
  ],
  baby_burros_tail: [
    _m("Stem cuttings (callus → soil)", "65–80%", "3–6 weeks", "Even more fragile than mature Burro's Tail — minimal handling."),
    _m("Leaf props", "50–70%", "4–10 weeks", "Use naturally dropped leaves when possible.")
  ],
  succulent_frankenstein_a: [
    _m("Per-species stem/leaf cuttings", "60–85%", "2–8 weeks", "Identify each species in the mix; prop separately for best rates."),
    _m("Division of rooted clumps", "80–90%", "Immediate", "Safest if roots are entangled around one offset.")
  ],
  succulent_frankenstein_b: [
    _m("Per-species stem/leaf cuttings", "60–85%", "2–8 weeks", "Peperomia in the mix prefers slightly more moisture while rooting than pure Sedum."),
    _m("Division", "80–90%", "Immediate", "Separate rooted sections at repot.")
  ],
  dracaena_fragrans: [
    _m("Stem / cane cuttings (top cut)", "75–85%", "3–8 weeks", "Root top in water or soil; stump often resprouts."),
    _m("Cane division (DONE Aug 2026)", "High if each cane kept roots", "2–4 wk sulk", "Two stalks now live in separate 9×9 pots (Cane A + Cane B)."),
    _m("Air layering thick canes", "85–90%", "6–12 weeks", "Good for tall leggy plants."),
    _m("Cane sections (leafless)", "50–70%", "1–3 months", "Keep warm/humid; slower.")
  ],
  dracaena_fragrans_b: [
    _m("This cane IS the Aug 2026 split", "N/A — already divided", "2–4 wk recovery", "Independent watering from Cane A. Filtered water; don't overwater a sulking cane."),
    _m("Further cane cuttings", "75–85%", "3–8 weeks", "Same methods as Cane A once it is growing again.")
  ],
  cordyline_fruticosa: [
    _m("Stem cuttings in water or soil", "70–85%", "3–6 weeks", "Warm + humid. Tops root more reliably than bare mid-stem."),
    _m("Cane / tip cuttings", "65–80%", "4–8 weeks", "Bottom heat helps.")
  ],
  assorted_cacti: [
    _m("Offsets / pups (per species)", "85–95%", "Callus → dry pot", "Best overall for Mammillaria-types."),
    _m("Grafted moon cactus tops", "Special case", "—", "Color scion can't live alone long-term; prop the green rootstock instead."),
    _m("Stem segments", "70–85%", "3–8 weeks", "Callus well; bright light.")
  ],
  royal_ivy: [
    _m("Stem cuttings in water", "85–95%", "1–3 weeks", "Nodes root readily. Watch for mites on mother while proping."),
    _m("Stem cuttings in soil", "85–90%", "2–4 weeks", "Keep evenly moist; bright indirect.")
  ],
  wandering_dude: [
    _m("Water tip cuttings", "90–98%", "Roots 5–10 days", "Easiest plant in the collection. 2–3 nodes; strip submerged leaves."),
    _m("Soil tip cuttings", "90–95%", "1–3 weeks", "Direct stick into moist mix — nearly foolproof."),
    _m("Layer / pin vine to soil", "95%+", "1–2 weeks per node", "Best way to thicken a sparse pot."),
    _m("Leaf-only (no stem/node)", "0–10%", "Fails", "Needs a node.")
  ],
  golden_pothos: [
    _m("Water cuttings", "90–98%", "1–3 weeks", "Classic beginner prop. Node required."),
    _m("Soil cuttings", "90–95%", "2–4 weeks", "Clump 5–7 cuttings for a full pot."),
    _m("Single-node cuttings", "85–95%", "2–4 weeks", "Works; slower canopy fill.")
  ],
  pearls_jade_pothos: [
    _m("Water cuttings", "85–95%", "2–4 weeks", "Slightly slower than Golden; needs brighter light to keep variegation."),
    _m("Soil cuttings", "85–95%", "2–4 weeks", "Same node rules; don't overwater while rooting.")
  ],
  marble_queen_pothos: [
    _m("Water cuttings", "85–95%", "2–4 weeks", "Keep bright indirect so white variegation doesn't stall."),
    _m("Soil cuttings", "85–95%", "2–4 weeks", "Node + leaf; clump multiple cuttings.")
  ],
  pothos_combo: [
    _m("Water cuttings (per cultivar)", "85–95%", "1–4 weeks", "Prop each vine type separately if you want even mixes."),
    _m("Soil cuttings", "85–95%", "2–4 weeks", "Satin / Marble pieces need more light than Golden while establishing.")
  ],
  philodendron_silver_stripe: [
    _m("Water cuttings", "90–95%", "1–3 weeks", "Node cuttings root like pothos."),
    _m("Soil cuttings", "90–95%", "2–4 weeks", "Very forgiving trailing aroid.")
  ],
  fittonia: [
    _m("Stem cuttings in water", "80–90%", "1–3 weeks", "Keep humid — cuttings wilt fast in dry AC."),
    _m("Stem cuttings in soil under humidity", "85–90%", "2–4 weeks", "Bag or dome raises success."),
    _m("Division", "85–95%", "Immediate", "Easy at repot if the clump is full.")
  ],
  haworthia: [
    _m("Offsets / pups", "90–95%", "Callus → dry pot", "Primary method."),
    _m("Leaf cuttings", "40–60%", "Slow", "Possible on some species; pups are better.")
  ],
  sedum_angelina: [
    _m("Stem tip cuttings", "90–95%", "1–3 weeks", "Extremely easy; callus short time; bright light for gold color."),
    _m("Scattered stem pieces on soil", "85–95%", "2–4 weeks", "Many pieces root where they land.")
  ],
  string_of_pearls: [
    _m("Stem cuttings on soil (pinned)", "70–85%", "2–4 weeks", "Best method — lay strands on mix, pin nodes, bright light, rare water."),
    _m("Water rooting", "60–75%", "2–4 weeks", "Works but rot-prone; pot up early."),
    _m("Individual pearl / leaf", "20–40%", "Slow / low", "Not worth it — use strand cuttings.")
  ],
  lady_finger_cactus: [
    _m("Offsets / pups", "85–95%", "Callus → dry cactus mix", "Standard cactus method."),
    _m("Stem cuttings", "70–85%", "4–8 weeks", "Callus thoroughly; full sun after rooted.")
  ],
  variegated_elephant_bush: [
    _m("Stem cuttings (callus → soil)", "85–95%", "2–4 weeks", "Very easy. Bright light keeps variegation."),
    _m("Water rooting", "75–90%", "2–3 weeks", "Works well for Portulacaria."),
    _m("Rooted branch division", "90%+", "Settle 1–2 weeks", "Like your bonsai — roots intact = treat as established.")
  ],
  variegated_elephant_bush_bonsai: [
    _m("Already a rooted division", "N/A", "—", "Propagate further with tip cuttings once settled."),
    _m("Tip cuttings from this bonsai", "85–95%", "2–4 weeks", "Same as parent Portulacaria once growth is strong.")
  ],
  zz_plant: [
    _m("Division of rhizomes", "90–95%", "Immediate", "Best & fastest."),
    _m("Leaf cuttings in water/soil", "50–70%", "Months (3–9+)", "Produces a rhizome slowly — patience plant."),
    _m("Stalk cuttings", "60–75%", "2–6 months", "Can work; still slow vs division.")
  ],
  desert_rose: [
    _m("Stem cuttings (callus → gritty mix)", "60–80%", "3–8 weeks", "Warmth critical. Keep barely moist after callus — caudex rot if wet."),
    _m("Seed", "70–85% (fresh seed)", "Weeks–months", "Common commercial method; seedlings vary."),
    _m("Grafting", "Specialist", "—", "Used for some cultivars; not a first-timer path.")
  ],
  terrarium_a: [
    _m("Open & divide / take cuttings of inhabitants", "70–90% (species-dependent)", "Varies", "Fittonia cuttings easy; identify each species before proping."),
    _m("Restart sealed jar from cuttings", "60–80%", "Weeks", "Sterile jar + proper substrate layers matter more than the cutting.")
  ],
  terrarium_b: [
    _m("Same as Terrarium A", "70–90%", "Varies", "Use the healthier jar as stock for cuttings if one declines.")
  ]
};

/* ========== 4. Plant-specific exhaustive troubleshooting extras ========== */
const TROUBLESHOOTING_LIBRARY = {
  prayer_plant: [
    _t("Crispy brown tips (classic)", "Low humidity + tap fluoride/chlorine/salts", "Filtered water, 60%+ humidity (1F Bath set back), flush salts monthly.", "high"),
    _t("Leaves stop praying (no night fold)", "Light stress, thirst, or overall decline", "Check moisture + move to stable bright-indirect; not a disease by itself.", "normal"),
    _t("Spider mites (stipple + webbing)", "Dry AC air", "Rinse undersides; soap/neem weekly; raise humidity.", "high"),
    _t("Stem cuttings won't root", "Wrong method — needs division", "Stop water-propping stems; divide rhizomes only.", "normal")
  ],
  monstera: [
    _t("No fenestrations on new leaves", "Low light OR still juvenile", "Increase bright indirect; patience on young vines.", "low"),
    _t("Yellow leaf with wet soil", "Overwatering", "Chopstick check deep; extend dry-down; inspect roots if repeated.", "high"),
    _t("Brown patches / sun scorch", "Direct hot sun", "Sheer curtain or move back from SW glass.", "normal"),
    _t("Aerial roots everywhere", "Normal — seeking support/moisture", "Guide to moss pole or trim if unwanted (safe).", "low"),
    _t("After chop: wilting stumps", "Transplant / root loss stress", "Bright indirect, steady moisture (not swamp), no fert 3–4 wks.", "normal"),
    _t("Air-layer moss drying out", "Wrap not sealed / summer AC", "Remist sphagnum 1–2×/week; reseal plastic. Don't soak the 13.5\" pot to compensate.", "normal")
  ],
  monstera_water_cuttings: [
    _t("No roots after 4+ weeks", "Node not submerged, too dim, or no node (UMN Extension)", "Confirm a node is in the water; bright indirect; discard leaf-only chops.", "high"),
    _t("Mushy brown stem in the jar", "Stagnant water / bacteria", "Remove that cutting; rinse jar; weekly water changes.", "high"),
    _t("Wilt after potting up", "Water roots drying too fast", "Humidity dome 3–5 days; keep mix just-moist; no direct sun.", "normal")
  ],
  thai_constellation: [
    _t("Cream sections crispy brown", "Sunburn, low humidity, or salt burn", "No direct hot sun; 60%+ humidity; filtered water; flush soil.", "high"),
    _t("New leaves less variegated", "Light too low", "Increase bright indirect / grow light — plant is conserving chlorophyll.", "normal"),
    _t("Fully white new leaf", "Unstable variegation", "Prune that leaf/node — can't feed itself.", "normal"),
    _t("Rot more easily than green Monstera", "Less chlorophyll → slower metabolism", "Chunky mix only; water less assertively.", "high")
  ],
  desert_rose: [
    _t("Yellow leaves", "Overwatering, natural shed into dormancy, or light stress", "If soil wet → emergency dry-down. Winter: expect leaf drop; keep bone dry-ish.", "high"),
    _t("Soft caudex", "Fatal-leaning rot", "Unpot, cut to firm white tissue, callus, dry culture.", "high"),
    _t("No flowers", "Needs more sun / seasonal cue", "UF/IFAS: 6+ hrs bright light. NW patio is better than indoor, SW patio is stronger.", "low"),
    _t("Sunscald after the outdoor move", "No acclimation", "7–14 day harden-off; temporary afternoon shade.", "normal"),
    _t("⚠️ Sap exposure", "Toxic / irritating milky sap", "Gloves; keep away from pets/kids; don't get in eyes.", "high")
  ],
  string_of_pearls: [
    _t("Shriveled pearls", "Underwatering OR failed roots from prior rot", "If roots OK → soak. If strands mushy → cut to healthy, re-root on soil.", "high"),
    _t("Mushy translucent pearls", "Overwatering", "Remove mush, dry, rare water; bright light.", "high"),
    _t("Bare spots on strand", "Normal age or light/water stress", "Cut front of bare section and pin healthy tip to soil to refill.", "low")
  ],
  zz_plant: [
    _t("Yellow stalks", "Overwatering (almost always)", "ZZ wants long dry intervals. Check rhizomes for mush.", "high"),
    _t("Post-repot sulk in the 5\" pot", "Normal after the Aug 2026 +1\" upsize", "No water 7–10 days if nicked; then dry-downs. Don't jump pot size again (Clemson).", "normal"),
    _t("No growth for months", "Normal in low light / winter", "ZZ is slow — not dead if stalks firm.", "low")
  ],
  wandering_dude: [
    _t("Faded purple/silver stripes", "Low light", "Move to brighter indirect (1F Bath / Room 1).", "normal"),
    _t("Rot at soil line in glass bowl", "No drainage + overwater", "Tilt-drain; pebble/charcoal layer; consider drilled pot.", "high"),
    _t("Leggy bare bases", "Needs pinching", "Pinch tips; pin cuttings on soil to refill.", "low")
  ],
  fittonia: [
    _t("Dramatic collapse / wilt", "Missed watering (famous drama queen)", "Water immediately — often revives in hours if roots OK.", "high"),
    _t("Crispy edges + wilt cycles", "Low humidity", "Keep near humidifier / bathroom; never bone-dry air + dry soil together.", "high")
  ],
  mini_orchid: [
    _t("Aerial roots silvery", "Normal when dry — water when silvery, not while green/plump", "Soak bark thoroughly; drain fully.", "normal"),
    _t("Crown rot", "Water sitting in crown", "Water roots/bark only; tip plant to drain crown.", "high"),
    _t("No rebloom", "Needs light + slight seasonal cue; don't cut green spikes early", "Bright indirect; patience on green spikes.", "low")
  ],
  firestick: [
    _t("⚠️ Sap burn", "Caustic latex", "Gloves/goggles; wash skin immediately; never rub eyes. Keep off Moose's path outdoors.", "high"),
    _t("Losing red color / going green", "Not enough light", "NW patio late sun should help vs indoor; 2F SW is stronger. MBG: some afternoon shade in extreme heat.", "normal"),
    _t("Sunscald (white patches) after going outside", "Moved too fast", "Acclimate 7–14 days; temporary shade at 3–6 pm.", "normal"),
    _t("Rot after a thunderstorm", "Saucer left full", "Dump water the same day; mineral mix; err dry.", "high")
  ],
  terrarium_a: [
    _t("Constant fog / pooling", "Overwatered closed system", "Vent 4–8 hrs until only morning fog.", "high"),
    _t("No condensation for a week", "Too dry", "Add 1–2 tsp distilled water only.", "normal"),
    _t("Mold on soil", "Excess moisture + low airflow", "Remove mold, dust cinnamon, vent 24 hrs.", "normal"),
    _t("Algae on glass", "Too much light", "Move farther from window; wipe glass.", "low")
  ],
  terrarium_b: [
    _t("Same closed-jar issues as Terrarium A", "Moisture / light imbalance", "Use the healthier twin as your control comparison.", "normal")
  ],
  lady_finger_cactus: [
    _t("Stretching fingers", "Insufficient direct sun", "SW window or high-PPFD lamp; etiolation is permanent.", "normal"),
    _t("Soft base", "Overwater / humidity", "Dry culture; never bathroom.", "high")
  ],
  haworthia: [
    _t("Translucent mushy leaves", "Overwatering / water in rosette", "Water soil only; dry hard between waterings.", "high"),
    _t("Red / brown stress color", "High light — often OK", "Tone down only if scorching.", "low")
  ],
  ginseng_ficus: [
    _t("Mass leaf drop after move", "Classic Ficus sulk", "Don't chase with water/fert; stabilize 2–4 weeks.", "normal"),
    _t("Sticky bumps on stems", "Scale", "Alcohol swabs + horticultural oil; isolate.", "high")
  ],
  ginseng_ficus_cutting: [
    _t("Wilting cutting", "Roots can't keep up yet", "Humidity dome, just-moist soil, gentler light.", "high"),
    _t("Mushy stem base", "Damping-off", "Trim to firm tissue, re-root fresh medium.", "high")
  ],
  variegated_elephant_bush_bonsai: [
    _t("Puckered leaves in shallow pot", "Dried out fast", "Shallow bonsai pots need more frequent checks in summer heat.", "normal"),
    _t("Variegation fading", "Light too low", "More sun / stronger lamp.", "normal")
  ],
  variegated_elephant_bush: [
    _t("Dropped leaves after soak", "Sometimes normal; or overwater", "Confirm mix drainage; dry thoroughly between waterings.", "normal")
  ],
  baby_burros_tail: [
    _t("Touch causes leaf rain", "Normal fragility", "Handle pot only; prop dropped leaves if desired.", "low")
  ],
  burrows_tail: [
    _t("Bare trailing stems", "Age + leaf drop", "Cut and re-root tips; bright light reduces stretch.", "low")
  ],
  aloe_vera: [
    _t("Flat pale splayed leaves", "Low light", "Move to strong sun (2F SW).", "normal"),
    _t("Brown/red tips after sudden SW sun", "Sunburn", "Acclimate over 1–2 weeks.", "normal")
  ],
  sedum_angelina: [
    _t("Stays chartreuse, never gold/orange", "Not enough light", "Needs strong direct sun for color.", "normal")
  ],
  cordyline_fruticosa: [
    _t("Brown tips despite moist soil", "Fluoride/salt sensitivity", "Filtered water; flush; humidity helps.", "normal")
  ],
  dracaena_fragrans: [
    _t("Brown tips", "Fluoride in tap water (classic Dracaena)", "Filtered/distilled; don't overfeed.", "normal"),
    _t("Leaf drop after cane split", "Division / repot shock (UF/IFAS-typical)", "Hold fertilizer 4 weeks; don't drown the 9×9. Cane B has its own log.", "normal")
  ],
  dracaena_fragrans_b: [
    _t("Leaf drop after the Aug 2026 split", "Division shock", "Independent from Cane A — check THIS pot. Err dry 2–4 weeks.", "normal"),
    _t("Brown tips", "Fluoride in tap water", "Filtered/distilled; flush salts.", "normal")
  ],
  schefflera: [
    _t("Leaf drop when unhappy", "Light/water/move stress", "Stabilize; variegated form is fussier.", "normal"),
    _t("Soggy 13.5\" pot after the jump from 9\"", "Overpot — unused soil stays wet (Clemson: +1–2\" only)", "Water less often; check 2–3\" deep; empty saucer; no fertilizer 4–6 weeks.", "high")
  ],
  schefflera_dark: [
    _t("Leaf drop", "Same as variegated but usually hardier", "Check watering extremes first.", "normal")
  ],
  royal_ivy: [
    _t("Dusty stippling + webs", "Spider mites (very common indoors)", "Rinse, soap, raise humidity, isolate.", "high")
  ],
  golden_pothos: [
    _t("All-green new leaves", "Low light (variegation fades)", "Brighter spot — plant is fine, just greener.", "low")
  ],
  marble_queen_pothos: [
    _t("White areas browning", "Too much direct sun or underwatering", "Bright indirect only; even moisture.", "normal")
  ],
  pearls_jade_pothos: [
    _t("Reverting / less white", "Low light", "Needs more light than Golden.", "normal")
  ],
  pothos_combo: [
    _t("One cultivar declining in the mix", "Different water/light needs in one pot", "Propagate survivors separately if mismatch persists.", "normal")
  ],
  philodendron_silver_stripe: [
    _t("Silver stripe fading", "Low light", "Brighter indirect light.", "low")
  ],
  snake_plant: [
    _t("Base mush / falling leaves", "Overwatering", "Dry hard; cut rot from rhizome.", "high")
  ],
  kalanchoe: [
    _t("No blooms", "Needs bright light + longer dark nights in fall for bud set (florist types)", "Bright light; don't leave grow lights on 24/7.", "low")
  ],
  mondo_grass: [
    _t("Browning in hot direct sun", "Afternoon scorch", "Morning sun / bright indirect preferred indoors.", "low"),
    _t("Wet core in the 9×9 cube", "Overpot volume / blocked drainage", "Probe the center; wait; never leave a saucer (Clemson: moist not waterlogged).", "normal")
  ],
  assorted_cacti: [
    _t("One cactus soft, others fine", "Species mismatch in watering", "Unpot soft one; dry culture separately.", "high")
  ],
  succulent_frankenstein_a: [
    _t("One species mushy in the mix", "Overwater for the most drought-tolerant member", "Remove casualty; water for the thirstiest-tolerant compromise (dry side).", "high")
  ],
  succulent_frankenstein_b: [
    _t("Peperomia wilts first", "Mix watering compromise", "Water when Peperomia softens slightly but before Sedums mush — or separate pots.", "normal")
  ]
};

/* ========== 5. Public resolvers ========== */
function getChopstickForPlant(plant) {
  if (!plant) return CATEGORY_CHOPSTICK.tropical;
  if (plant.chopstickCheck && typeof plant.chopstickCheck === "object") {
    return plant.chopstickCheck;
  }
  if (CHOPSTICK_BY_PLANT[plant.id]) return CHOPSTICK_BY_PLANT[plant.id];
  const cat = (plant.category || "").toLowerCase();
  if (CATEGORY_CHOPSTICK[cat]) return CATEGORY_CHOPSTICK[cat];
  if (cat.includes("cactus")) return CATEGORY_CHOPSTICK.cactus;
  if (cat.includes("succulent_like")) return CATEGORY_CHOPSTICK.succulent_like;
  if (cat.includes("succulent")) return CATEGORY_CHOPSTICK.succulent;
  if (cat.includes("pothos") || cat.includes("philo")) return CATEGORY_CHOPSTICK.pothos;
  if (cat.includes("bonsai")) return CATEGORY_CHOPSTICK.bonsai;
  if (cat.includes("grass")) return CATEGORY_CHOPSTICK.ornamental_grass;
  return CATEGORY_CHOPSTICK.tropical;
}

function getPropagationMethods(plant) {
  if (!plant) return [];
  if (Array.isArray(plant.propagationMethods) && plant.propagationMethods.length) {
    return plant.propagationMethods;
  }
  if (PROPAGATION_LIBRARY[plant.id]) return PROPAGATION_LIBRARY[plant.id];
  const cat = (plant.category || "").toLowerCase();
  if (CATEGORY_PROPAGATION[cat]) return CATEGORY_PROPAGATION[cat];
  if (cat.includes("cactus")) return CATEGORY_PROPAGATION.cactus;
  if (cat.includes("succulent")) return CATEGORY_PROPAGATION.succulent;
  if (cat.includes("pothos") || cat.includes("philo")) return CATEGORY_PROPAGATION.pothos;
  if (cat.includes("bonsai")) return CATEGORY_PROPAGATION.bonsai;
  if (cat.includes("grass")) return CATEGORY_PROPAGATION.ornamental_grass;
  return CATEGORY_PROPAGATION.tropical;
}

function getTroubleshootingGuide(plant) {
  if (!plant) return [];
  const cat = (plant.category || "").toLowerCase();
  let base = [];
  if (CATEGORY_TROUBLESHOOTING[cat]) base = CATEGORY_TROUBLESHOOTING[cat].slice();
  else if (cat.includes("cactus")) base = CATEGORY_TROUBLESHOOTING.cactus.slice();
  else if (cat.includes("succulent_like")) base = CATEGORY_TROUBLESHOOTING.succulent_like.slice();
  else if (cat.includes("succulent")) base = CATEGORY_TROUBLESHOOTING.succulent.slice();
  else if (cat.includes("pothos") || cat.includes("philo")) base = CATEGORY_TROUBLESHOOTING.pothos.slice();
  else if (cat.includes("bonsai")) base = CATEGORY_TROUBLESHOOTING.bonsai.slice();
  else if (cat.includes("grass")) base = CATEGORY_TROUBLESHOOTING.ornamental_grass.slice();
  else base = CATEGORY_TROUBLESHOOTING.tropical.slice();

  const specific = TROUBLESHOOTING_LIBRARY[plant.id] || [];
  /* Specific first, then category items whose symptoms aren't already covered */
  const seen = new Set(specific.map(t => t.symptom.toLowerCase()));
  const merged = specific.slice();
  base.forEach(t => {
    if (!seen.has(t.symptom.toLowerCase())) merged.push(t);
  });

  /* Optional structured field on the plant */
  if (Array.isArray(plant.troubleshootingGuide)) {
    plant.troubleshootingGuide.forEach(t => {
      if (t && t.symptom && !seen.has(String(t.symptom).toLowerCase())) {
        merged.unshift(t);
        seen.add(String(t.symptom).toLowerCase());
      }
    });
  }
  return merged;
}

/** Expose for debugging / Analyze prompts */
const CareLibrary = {
  chopstick: CHOPSTICK_SOIL_CHECK,
  getChopstickForPlant,
  getPropagationMethods,
  getTroubleshootingGuide
};
