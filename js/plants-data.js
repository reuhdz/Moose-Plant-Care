/*
 * Plant care data — owned plants (in soil + active water propagations).
 *
 * Each plant has:
 *   - displayName / potSize / category / names
 *   - wateringDays + wateringDaysHot + wateringDaysCool (3-tier Austin TX indoor model)
 *   - conditions: { light, temperature, humidity, soilMoisture } with ideal + passing
 *   - tips: lighting / soil / watering / pruning / propagation / repotting / feeding / troubleshooting
 *   - sources: at least 5 cited references
 *   - idealSoil: array of SOIL_TYPES ids that are recommended for this plant
 *   - currentSoilMix: actual soil ID the user has the plant in
 *   - soilNotes (optional): plant-specific guidance shown on the Soil Mix tab
 *   - comments (optional): user-facing free-text note (origin, condition, repot status, etc.)
 *   - isPropagation (optional): true if this plant is currently a water-rooting cutting
 *   - cuttingsCount (optional): number of cuttings in a water-prop container
 *
 * Cool season is Nov–Feb, hot season is Jun–Sep — handled in watering.js.
 * Tip text supports newlines; the UI preserves them via white-space: pre-wrap.
 */

/* ============================================================
 * Soil Mix catalog
 * ============================================================
 *
 * Drainage scale: low / medium / high / very_high
 * Retention scale: low / medium / high / very_high / controlled (LECA)
 *
 * These are used by the Soil Mix tab to compute recommendations:
 *  - If a plant's currentSoilMix is in its idealSoil[]              → ✅ Ideal
 *  - Else if drainage or retention rating matches an ideal type    → ⚠️ Acceptable
 *  - Else                                                          → ❌ Mismatch
 *  - Else "pending"                                                → 📝 Pending
 */
const SOIL_TYPES = {
  pending: {
    label: "📝 Pending — not yet specified",
    drainage: null, retention: null,
    description: "You haven't told the app what soil mix this plant is in yet."
  },
  standard_potting: {
    label: "Standard indoor potting mix",
    drainage: "medium", retention: "medium",
    description: "Generic peat-or-coco-based mix. Suits most foliage tropicals out of the bag. (User's reference: 100% or 80/20 Miracle-Gro indoor potting mix.)"
  },
  amended_potting: {
    label: "Potting mix + extra perlite (DIY chunky blend)",
    drainage: "high", retention: "medium",
    description: "Standard potting mix amended with 30–40% extra perlite. Better drainage than stock potting mix while keeping reasonable moisture retention. A great DIY substitute for premium aroid blends. (User's reference: 60/40 or 70/30 potting/perlite.)"
  },
  cactus_mix: {
    label: "Cactus / succulent mix",
    drainage: "high", retention: "low",
    description: "Mineral-heavy (sand, pumice, perlite). For plants that hate wet feet."
  },
  orchid_bark: {
    label: "Orchid bark mix",
    drainage: "very_high", retention: "low",
    description: "Chunky fir bark + perlite + charcoal. For epiphytes with air-loving roots."
  },
  sphagnum_moss: {
    label: "Sphagnum moss",
    drainage: "medium", retention: "very_high",
    description: "Long-fiber moss. Holds water 2–3× longer than bark. Common in retail mini orchids."
  },
  bonsai_mix: {
    label: "Bonsai mix (akadama / pumice / lava)",
    drainage: "very_high", retention: "low",
    description: "Mineral, low-organic. Holds shape in shallow pots, drains quickly."
  },
  african_violet: {
    label: "African violet mix (peat-rich)",
    drainage: "medium", retention: "high",
    description: "High-peat, fine-textured. Holds moisture for fuzzy-leaved plants."
  },
  aroid_mix: {
    label: "Aroid / chunky mix (perlite + bark heavy)",
    drainage: "high", retention: "medium",
    description: "Standard mix + extra perlite + orchid bark. Ideal for Monstera, Philodendron, Pothos."
  },
  leca: {
    label: "LECA / semi-hydroponic",
    drainage: "very_high", retention: "controlled",
    description: "Clay pebbles + reservoir. Controlled wicking — once dialed in, very forgiving."
  },
  water_propagation: {
    label: "Water propagation (no soil)",
    drainage: "very_high", retention: "very_high",
    description: "Cuttings rooted in plain water. Refresh weekly with room-temp water; transition to soil once roots reach 2–4 inches."
  },
  terrarium_mix: {
    label: "Closed-terrarium layered substrate",
    drainage: "controlled", retention: "very_high",
    description: "Four-layer build typical of pre-planted retail closed terrariums: (1) ~1\" drainage gravel/pebbles at the bottom, (2) ~½\" activated horticultural charcoal (keeps the closed environment fresh and prevents anaerobic stink), (3) thin sphagnum-moss separator so soil doesn't migrate into the drainage layer, (4) peat- or coco-based growing media (often with a top dressing of preserved moss). The whole stack functions as a slow-release reservoir — watering needs are 5–10× lower than the same plants in open pots."
  },
  other: {
    label: "Other / custom",
    drainage: null, retention: null,
    description: "Your own mix or something not listed above. Tell the agent what's in it."
  }
};

const PLANTS = {
  /* ===================== OWNED PLANTS ===================== */
  prayer_plant: {
    id: "prayer_plant",
    repotSigns: [
      "Roots (and pale rhizomes) circling visibly at the drainage holes on the bottom of the 6.5\" pot",
      "Water pours straight through in <5 seconds — no absorbency left",
      "Leaves stop lifting/folding at night, or the nightly 'prayer' movement weakens — root-stress signal",
      "New leaves come in noticeably smaller or with less-defined markings than the previous flush",
      "The clump has multiplied into a dense mat of offsets that fills the whole pot surface (division time)",
      "Growth stalls in growing season (Mar–Oct) despite proper light, humidity, and watering"
    ],
    displayName: "Rattlesnake Calathea",
    potSize: '6.5"',
    category: "tropical",
    names: {
      common: ["Rattlesnake Plant", "Rattlesnake Calathea", "Prayer Plant (Marantaceae family)"],
      scientific: "Goeppertia insignis (syn. Calathea lancifolia)"
    },
    wateringDays: 6,
    wateringDaysHot: 5,
    wateringDaysCool: 9,
    currentSoilMix: "standard_potting",
    comments: "Rattlesnake Calathea (Goeppertia insignis) — a true Calathea, NOT a Maranta, so it's even fussier about humidity and water quality. Current crispy brown tips + leaves dying off; almost certainly a humidity + tap-water-fluoride/salt combo — see troubleshooting. Long, wavy-edged leaves with dark leopard-spot markings and purple-red undersides that show when the leaves lift at night. Repotted in last 2 months into 80/20 potting/perlite (6.5\" pot). Pet-safe (non-toxic to cats & dogs).",
    idealSoil: ["standard_potting", "amended_potting", "african_violet"],
    soilNotes: "User has it in 80/20 potting/perlite — solid choice for this moisture-loving Calathea. The slight perlite boost prevents waterlogging while keeping enough retention for those thin, shallow-rooted leaves. A handful of orchid bark + charcoal would make it even better.",
    conditions: {
      light:        { ideal: "Bright, indirect only — an east window or several feet back from south/west", passing: "Medium indirect; tolerates lower light than most, but markings fade and growth slows" },
      temperature:  { ideal: "65–80°F (18–27°C)", passing: "60–85°F; hates cold drafts and anything below 60°F" },
      humidity:     { ideal: "60%+ (higher than a Maranta needs) — humidifier or pebble tray strongly recommended", passing: "50%+; below 50% brings crispy edges fast — this is the #1 Calathea complaint" },
      soilMoisture: { ideal: "Evenly, lightly moist at all times", passing: "Top 1 inch dry between waterings; never bone-dry (Calatheas don't forgive drying out)" }
    },
    tips: {
      lighting: "Bright, INDIRECT light only. Direct sun scorches the leaves and washes out the dark rattlesnake markings. An east-facing window is perfect; a few feet back from a south/west window also works. More shade-tolerant than most houseplants, but in low light the markings fade and new leaves come in smaller. Rattlesnake is strongly nyctinastic — it raises and folds its leaves upright at night (revealing the purple-red undersides) and lowers them by day; if that nightly movement stops, it's a light or stress signal.\n\n• In this home, your best spots are the 1F Bathroom (set back from the SE beam for humidity) or the 1F Living Room window (36° NE — soft indirect, safest for scorch-prone Calathea foliage).",
      soil: "Light, airy, slightly acidic (pH 5.5–6.5) mix that holds moisture but never stays soggy. Rattlesnake Calathea has shallow, fine root systems — heavy peat-only mixes compact and suffocate them.\n\nIDEAL DIY MIX (parts by volume):\n• 2 parts peat moss OR coco coir (fine-textured base — holds moisture, slightly acidic)\n• 1 part perlite (drainage + aeration)\n• 1 part orchid bark (small-grade — creates air pockets without compacting)\n• 1 tablespoon horticultural charcoal per gallon of mix (discourages fungus gnats + absorbs excess salts)\n• Optional: handful of worm castings for slow-release nutrition\n\nQUICK SHORTCUTS:\n• African violet mix + 25% extra perlite (you already have the right idea with 80/20 potting/perlite — adding a handful of orchid bark would improve it further).\n• Espoma 'Organic Indoor' or 'Espoma African Violet' as a base, with added perlite.\n• Pre-mixed 'Calathea / Maranta / Prayer Plant' mixes (Soil Sunrise, Soil Ninja, Sungro) work directly.\n\nAVOID:\n• Pure peat (compacts and stays soggy).\n• Cactus / succulent mix (drains too fast for Maranta's moisture-loving roots).\n• Garden soil (compacts + brings pests + wrong pH).\n• Any mix labeled 'moisture control' with hydrogel crystals — these hold TOO much water for Maranta and trigger root rot.",
      watering: "METHOD — steady moisture (NOT soak-and-dry): Rattlesnake Calathea (Goeppertia insignis) wants the soil evenly, lightly moist at all times — never bone dry, never soggy. This is a shallow-rooted Marantaceae species; letting it dry out triggers curling, crisping, and stalled nyctinastic movement.\n\nHOW TO CHECK READINESS (your 6.5\" pot):\n• Finger test: water when the top ~1\" feels just barely dry — if it feels cool and damp below, wait.\n• Pot weight: a well-watered 6.5\" pot feels noticeably heavier; when it feels light for its size, check the top inch.\n• Moisture meter: aim for 4–6 (mid-range) in the upper third of the pot — not pegged wet.\n• Plant tells: leaves that stay folded/prayed shut during the DAY, edges curling inward, or new leaves smaller than the last flush = thirsty. Soft stems + wet soil = too much.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 5–6 days — AC dries pots fast even when outdoor humidity is high.\n• Peak summer (Jun–Sep): every 5 days if in the drier 1F Window (NE) corner; the 1F Bathroom's shower humidity may stretch to 6–7 days if set back from the direct SE beam.\n• Mild winter slowdown (Nov–Feb): every 8–10 days — growth slows but don't let it go fully dry.\n• After repot (last 2 months): the 80/20 mix holds moisture well; check weight, not calendar alone.\n\nBOTTOM-WATERING: helpful in this home — set the 6.5\" pot in a shallow tray of room-temp water for 15–20 min, let drain 10 min, empty saucer. Encourages even root-zone moisture and reduces fungus-gnat splash.\n\nWATER QUALITY (critical — per Missouri Botanical Garden and University of Florida IFAS):\n• Use filtered, distilled, or rainwater ONLY. Rattlesnake Calathea is among the most fluoride/chlorine/salt-sensitive houseplants.\n• Central Texas tap water often has fluoride and minerals — letting water sit 24 hrs removes chlorine but NOT fluoride.\n• Flush the pot with plain filtered water every 6–8 weeks to leach accumulated salts (especially after fertilizing).\n\nOVER- vs UNDER-watering tells:\n• Over: yellowing lower leaves, mushy stems at soil line, sour smell, leaves stop folding at night despite wet soil.\n• Under: dramatic daytime leaf curl/prayer, crispy brown tips spreading inward, soil pulling away from pot walls.",
      pruning: "Snip yellow, brown, or crispy leaves at the base with clean scissors. A light shaping prune in early spring encourages bushier growth.\n\nTools: sharp scissors or pruning snips, sterilized with rubbing alcohol between cuts.\nWhen: anytime to remove dead foliage; major shaping in March–April.\nFrequency: a quick groom once a month keeps it tidy.",
      propagation: "DIVISION ONLY — this is a key difference from a true Maranta. Rattlesnake Calathea grows from a clumping rhizome and will NOT root from stem/leaf cuttings in water or soil (a common beginner mistake — the cuttings just rot).\n\nHOW TO DIVIDE:\n• Do it at repotting time, in late spring / early summer during active growth.\n• Unpot and gently tease the rootball apart into clumps, each with its own roots AND several leaves/growth points.\n• Pull apart by hand where possible; use a sterile knife only for stubborn rhizomes.\n• Pot each division into fresh moist mix, keep warm and humid, and expect a week or two of sulking.\n\nSuccess rate: very high (~90%) as long as each division keeps healthy roots + foliage.",
      repotting: "Every 2 years or when roots visibly circle the bottom of the pot or come out the drainage holes. Calatheas like being slightly snug — a too-large pot holds excess wet soil and triggers root rot.\n\nWHEN TO REPOT:\n• Spring (March–May) is ideal — active growth helps roots recover quickly.\n• Roots circling visible at drainage holes or from the surface.\n• Water drains too fast (soil has broken down and isn't holding moisture).\n• Plant has been in the same pot for 2+ years.\n• You see white salt crust on the surface (despite flushing) — soil chemistry is exhausted.\n\nMATERIALS:\n• New pot: ONLY 1–2 inches larger in diameter than the current one (your 6.5\" current → 7.5–8\" next).\n• Fresh prayer plant soil mix (see Soil tip for the recipe).\n• Sterilized scissors or pruning snips.\n• Clean workspace (newspaper or a tray to catch soil).\n• Optional: a saucer + new drainage tray.\n\nSTEP-BY-STEP REPOT:\n1. Water the plant 1–2 days BEFORE repotting — slightly moist (not soggy) roots are easier to handle and less likely to snap.\n2. Tip the pot sideways and gently coax the plant out. Tap the rim against a table edge if it's stuck.\n3. Examine the rootball:\n   • Healthy roots = white/cream, firm.\n   • Dead/rotted = brown, mushy, smelly. Trim these off cleanly with sterile scissors.\n   • Circling roots = score 3–4 vertical cuts down the side of the rootball with a clean knife. This forces new roots outward instead of continuing to circle.\n4. Place 1\" of fresh soil at the bottom of the new pot.\n5. Center the plant. The top of the rootball should sit ~1\" below the pot rim (leaves room for water without overflow).\n6. Fill around the sides with fresh soil. DON'T pack it hard — Calathea likes airy soil. Gently firm only the very top to keep the plant upright.\n7. Water lightly (just enough to settle the soil) with FILTERED room-temp water. Don't drench the first time.\n8. Place in INDIRECT light (no direct sun for 1 week — the plant is in shock and can sunburn).\n9. Hold off heavy watering for 7–10 days to let any nicked roots callus.\n10. Resume normal care after 2 weeks; expect 1–2 weeks of pouting (drooping, less leaf folding at night) — this is NORMAL post-repot shock.\n\nPOST-REPOT TROUBLESHOOTING:\n• Leaves drooping for >2 weeks → check soil moisture. If wet, you may have root damage; if dry, water lightly.\n• New leaves smaller than expected for 6 weeks → normal recovery period.\n• Leaves yellowing en masse → over-watering during recovery; let dry out slightly.\n• Stops folding at night entirely → severe stress; check light + humidity.\n\n⚠️ DON'T:\n• Repot in fall or winter (slow growth = slow root recovery).\n• Use a pot more than 2\" larger (excess soil holds water → rot).\n• Fertilize for 4–6 weeks after repot (fresh soil already has nutrients; new fertilizer burns recovering roots).\n• Use unsterilized tools or recycled soil from another plant (introduces pathogens).",
      feeding: "Balanced liquid fertilizer (10-10-10 or 20-20-20) diluted to HALF strength, every 4 weeks during spring and summer. Stop feeding entirely in fall/winter.\n\nAlternatives: worm castings top-dress every 2 months, or a slow-release pellet (Osmocote) in spring.\n\nIMPORTANT: flush the soil with plain water every 2 months to prevent fertilizer salt buildup, which Calatheas are especially sensitive to.",
      troubleshooting: "• Crispy brown leaf tips/edges → #1 Calathea complaint in Central Texas AC: low indoor humidity (30–45% despite humid outdoors) AND/OR fluoride/chlorine/salts in tap water (per University of Florida IFAS). Fix: switch to filtered/distilled/rainwater, raise humidity to 60%+ (1F Bathroom set back from beam, pebble tray, or humidifier), flush salts monthly.\n• Yellow leaves (especially lower) → overwatering or root rot — unpot, trim black/mushy roots, repot in fresh airy mix; let top 1\" dry slightly before re-watering.\n• Yellow leaves with dry crispy edges → underwatering OR salt burn — soak with filtered water, check cadence.\n• Drooping/wilting with wet soil → root rot or compacted roots — reduce watering, improve drainage, repot if persistent.\n• Drooping with dry soil → thirsty — bottom-water immediately; recovery in 4–12 hrs.\n• Leaf drop (multiple at once) → cold draft, repot shock, or severe root issue — stabilize temp above 65°F, hold off fertilizer 4 weeks.\n• Leaf curling / praying shut during the DAY → underwatering or humidity below 50% — soak + boost humidity.\n• Faded/washed-out rattlesnake markings → too much direct sun (move back from SE/SW windows) OR too little light (markings fade, growth stalls).\n• Scorched pale patches → direct sun hit — move to 1F Window (NE) or further back in 1F Bath.\n• Leaves not lifting/folding at night → insufficient light, root stress, or severe dehydration — check roots + light level.\n• Root rot (mushy brown roots, sour soil) → unpot, cut rot, repot in fresh 80/20 mix, water lightly for 10 days.\n• Spider mites (#1 pest in dry indoor air — fine webs, stippled/silvered leaves) → shower foliage weekly, insecticidal soap or neem every 5–7 days × 3 weeks, raise humidity above 55%.\n• Mealybugs (white cottony clusters in leaf axils) → dab with 70% isopropyl on Q-tip; repeat weekly.\n• Scale (brown bumps on stems, sticky honeydew below) → scrape off, alcohol swab, horticultural oil spray.\n• Thrips (silvery streaks, black specks on leaves) → rinse, blue sticky traps, spinosad or insecticidal soap.\n• Fungus gnats (small flies from wet surface soil) → let top 1/2\" dry slightly between waterings; yellow sticky traps; mosquito-dunk soak for bottom-watering tray.\n• Aphids (rare indoors, clustered on new growth) → rinse off, insecticidal soap.\n• ✅ Pet-safe — non-toxic to cats and dogs per ASPCA (Rattlesnake Plant / Goeppertia insignis)."
    },
    sources: [
      { label: "Missouri Botanical Garden — Calathea lancifolia (Goeppertia insignis)", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=277869" },
      { label: "University of Florida IFAS — Calathea / Prayer Plants", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/prayer-plant.html" },
      { label: "The Sill — Calathea Care Guide", url: "https://www.thesill.com/blog/how-to-care-for-calathea" },
      { label: "Costa Farms — Rattlesnake Plant (Calathea lancifolia)", url: "https://costafarms.com/products/rattlesnake-plant" },
      { label: "RHS — Goeppertia / Calathea", url: "https://www.rhs.org.uk/plants/search-results?query=calathea" },
      { label: "ASPCA — Rattlesnake Plant (non-toxic)", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/rattlesnake-plant" },
      { label: "The Spruce — Calathea / Prayer Plant Care", url: "https://www.thespruce.com/grow-calathea-indoors-1902745" }
    ]
  },

  monstera: {
    id: "monstera",
    repotSigns: [
      "Aerial roots reaching aggressively for soil surface or floor (not up the moss pole)",
      "Roots pushing out of drainage holes on the 13.5\" pot",
      "No new fenestrated leaf for 3+ months in growing season",
      "New leaves are smaller than the previous ones",
      "Water drains through in seconds — heavy rootbound signal in a big pot",
      "Plant leans / needs staking because the rootball no longer anchors it"
    ],
    displayName: "Monstera",
    potSize: '13.5"',
    category: "tropical",
    names: {
      common: ["Monstera", "Swiss Cheese Plant", "Mexican Breadfruit", "Split-leaf Philodendron (misnomer)"],
      scientific: "Monstera deliciosa"
    },
    wateringDays: 9,
    wateringDaysHot: 8,
    wateringDaysCool: 14,
    currentSoilMix: "amended_potting",
    comments: "Repotted from 10\" → 13.5\" pot (original root ball still in store peat; outer soil is 60/30 amended mix). Aug 2026 propagation project: air-layering 4 vines on the mother plant (still attached) AND 3 top cuttings in water. Parent canopy is lighter after the chops — expect a short sulk, then new axillary growth below each cut (per UMN Extension). Keep the four sphagnum wraps moist (not dripping); do not sever until roots are 1–2\" inside the moss.",
    idealSoil: ["aroid_mix", "amended_potting", "standard_potting"],
    soilNotes: "User has 60/30 potting/perlite (close to amended_potting). A true aroid mix with orchid bark would be even better for aerial root health, but the current blend is workable. ⚠️ Original root ball still in store soil — next repot, bare-root the core and switch fully to amended mix.",
    conditions: {
      light:        { ideal: "Bright, indirect — 6+ hrs near a bright window", passing: "Medium indirect; lower light = fewer/smaller fenestrations" },
      temperature:  { ideal: "68–80°F (20–27°C)", passing: "60–90°F; nothing below 50°F" },
      humidity:     { ideal: "60%+", passing: "40–50%; tolerates average home humidity" },
      soilMoisture: { ideal: "Top 2\" dry between deep waterings", passing: "Tolerates some drying; overwatering kills faster than under" }
    },
    tips: {
      lighting: "Bright, indirect light produces the largest leaves and the most fenestrations (the iconic splits and holes). Tolerates medium light but grows slowly with smaller, less-split leaves.\n\n• Avoid harsh direct afternoon sun — leaves burn.\n• Early morning sun (east window) is great.\n• Rotate the pot 1/4 turn every 2 weeks so all vines get even light.\n• If you have grow lights, 10–12 hrs of bright indirect-equivalent works well in winter.\n\n• In this home, the 1F Living Room corner (vaulted dual NE/SE light) and 1F Bathroom (set back from the SE beam) are your best matches per PLANT_LIGHT_REF.",
      soil: "Chunky, well-draining AROID mix. Recipe: 1 part standard potting soil + 1 part orchid bark + 1 part perlite + handful of horticultural charcoal + handful of coco coir. Slightly acidic (pH 5.5–7.0).\n\nReady-made aroid mixes (e.g. Sungro, Soil Sunrise) work fine; just confirm there's visible chunky bark and perlite.",
      watering: "METHOD — soak-and-dry: Monstera deliciosa stores some moisture in its thick roots and aerial roots; let the top 2\" of soil dry before a deep drench. Never keep the 13.5\" pot continuously wet — root rot is the #1 killer (per RHS and University of Wisconsin Extension).\n\nHOW TO CHECK READINESS (your 13.5\" pot):\n• Finger test: stick 2 knuckles deep — if damp/cool, wait; if dry and crumbly at 2\", water.\n• Pot weight: lift the side — a thirsty 13.5\" pot feels noticeably lighter than 24 hrs after a soak.\n• Moisture meter: 3–4 in the upper half = time to water; don't water at 7+ unless you're confirming a dry deep zone.\n• Plant tells: slight leaf droop + dry top 2\" = thirsty. Yellowing with wet soil = overwatered.\n\n⚠️ DUAL-SOIL NOTE: your root ball is still in original store peat while the outer 60/30 amended mix dries faster — water deeply enough to rewet the inner core, then let the WHOLE mass dry uniformly.\n\n⚠️ AUG 2026 CHOPS: 3 top cuttings came off this plant, so the canopy transpires a bit less. Do NOT compensate by watering more — keep the same soak-and-dry. The four air-layer moss wraps are a SEPARATE moisture job (mist the sphagnum so it stays damp; that water should not drench the pot).\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC):\n• Hot AC season (Apr–Oct): every 7–9 days — large pot + AC = slower surface dry but steady evaporation.\n• Peak summer (Jun–Sep): every 7–8 days in 1F Corner; 8–9 days if set back in humid 1F Bath.\n• Mild winter (Nov–Feb): every 12–16 days — dormancy slows uptake.\n• 2F SW window would dry this pot faster (avoid — too hot/direct); NW rooms OK with longer intervals.\n\nBOTTOM-WATERING: optional for this size — top-watering until runoff is usually better for a 13.5\" pot so the inner root ball gets saturated. If top soil is hydrophobic, bottom-soak 30 min then top-water to rewet.\n\nWATER QUALITY: moderately sensitive — room-temp filtered or tap water left 24 hrs is fine; flush with plain water every 2–3 months to clear fertilizer salts (brown edges).\n\nOVER- vs UNDER-watering tells:\n• Over: multiple yellow leaves at once, black stems, mushy roots, fungus-gnat clouds, drooping WITH wet soil.\n• Under: crispy brown leaf edges, curling leaves, drooping WITH dry top 2\", slow new leaf production.",
      pruning: "Prune in spring/early summer when growth is active.\n\n• Cut just above a NODE (the bump where leaves/aerial roots emerge) at a 45° angle. New growth emerges from below the cut.\n• Save cuttings for propagation.\n• Remove damaged or wayward vines to encourage bushier growth.\n• Wipe leaves with a damp microfiber cloth monthly so they photosynthesize efficiently.\n• Don't remove more than 1/3 of the plant's mass at once.",
      propagation: "IN PROGRESS (Aug 2026): 4 air layers on the mother + 3 top cuttings in water. University of Minnesota Extension: Monstera ONLY roots from a node (the thickened ring where a leaf/aerial root attaches). A leaf with no node will stay green for weeks then rot — it will never become a plant.\n\nAIR LAYERS (4 vines, still attached — safest method, ~90–95% per typical aroid practice):\n• Keep sphagnum MOIST, not dripping. Squeeze moss before wrapping; remist 1–2×/week if the wrap feels light.\n• Clear plastic + sealed ends holds humidity. If moss goes bone-dry, roots stall; if soaking-wet + anaerobic smell, loosen and remake the wrap.\n• Optional: a shallow notch just below the node speeds roots (The Spruce / standard air-layer technique) — skip if you already have a live aerial root in the wrap.\n• Ready to sever when roots inside the moss are ~1–2\" (often 4–8 weeks in warm months). Cut BELOW the new root mass with sterile shears, pot into aroid mix, keep bright-indirect and slightly more humid for 1–2 weeks. Do not fertilize for 3–4 weeks.\n\nWATER TOP CUTTINGS (3 — tracked as their own Care Guide entry):\n• Node + preferably an aerial root must be submerged; leaves stay above water (UMN Extension).\n• Change water when cloudy / at least weekly. Roots commonly 2–4 weeks; new leaves can take 2–3 months.\n• Pot when several roots are 2–3\" long. See Monstera (Water Cuttings).\n\nSpring/summer is the right season — you are in it. Success ~80%+ for node cuttings, higher for air layers.",
      repotting: "Every 2–3 years or when heavily root-bound. With a 14\" pot you may be at terminal indoor size — instead, TOP-DRESS with fresh soil yearly (scoop out the top 2\" and replace) and prune roots if needed.\n\nAdd a MOSS POLE or trellis to support vines and encourage larger leaves with more fenestrations. Tie vines gently with plant ties; aerial roots will grip the moss when kept moist.",
      feeding: "Balanced liquid fertilizer (20-20-20) at HALF strength every 4 weeks in spring/summer. Slow-release granular pellets (Osmocote) in spring are an easy alternative.\n\nFlush soil with plain water every 2–3 months to prevent fertilizer salt buildup.\nWinter: no fertilizer unless under strong grow lights.",
      troubleshooting: "• Yellow leaves → most often overwatering (per The Spruce and RHS). Check: wet soil + droop = rot; dry top 2\" + droop = thirst. Unpot and inspect roots if yellowing persists — trim black/mushy roots, repot in fresh aroid mix.\n• Brown crispy edges/tips → underwatering, low humidity (Central Texas AC ~30–45%), or salt buildup — soak deeply, raise humidity near 50%+, flush soil.\n• Brown patches with yellow halos → fungal leaf spot from wet foliage or overwatering — remove affected leaves, improve airflow, let soil dry.\n• Drooping/wilting → check soil first: dry = water now; wet = hold off, check roots for rot.\n• Leaf curling → underwatering OR overwatering (per The Spruce) — finger-test the top 2\" before acting.\n• Leaf drop (sudden, multiple) → cold draft below 50°F, repot shock, or severe overwatering — stabilize environment.\n• No fenestrations on new leaves → insufficient light OR plant still juvenile (solid juvenile leaves are normal on young vines).\n• Faded/scorched leaves → too much direct sun (especially 2F SW afternoon beam) — move to 1F Corner or Bath set back.\n• Leggy growth, small leaves → not enough light — move to 1F Corner or add grow lights 10–12 hrs/day.\n• Root rot (brown mushy roots, sour smell) → unpot, cut rot, repot dry-ish, wait 7 days before re-watering.\n• Spider mites (fine webs, stippling) → shower leaves, insecticidal soap weekly × 3; boost humidity.\n• Mealybugs (cottony white clusters) → alcohol Q-tip dab; neem if widespread.\n• Scale (bumps on stems, sticky floor) → scrape, alcohol swab, horticultural oil.\n• Thrips (silvery scars, black droppings) → rinse, blue sticky traps, spinosad spray.\n• Fungus gnats → let top 2\" dry between waterings; sticky traps.\n• Aphids (on new unfurling leaves) → rinse, insecticidal soap.\n• ⚠️ Toxic to cats, dogs, and humans if chewed — insoluble calcium oxalates per ASPCA (Monstera deliciosa).",
    },
    sources: [
      { label: "Missouri Botanical Garden — Monstera deliciosa", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=274375" },
      { label: "University of Wisconsin Horticulture — Monstera deliciosa", url: "https://hort.extension.wisc.edu/articles/monstera-deliciosa-split-leaf-philodendron/" },
      { label: "RHS — Monstera deliciosa", url: "https://www.rhs.org.uk/plants/11281/monstera-deliciosa/details" },
      { label: "The Sill — Monstera Care Guide", url: "https://www.thesill.com/blog/plant-care-monstera-deliciosa" },
      { label: "Costa Farms — Monstera Care", url: "https://costafarms.com/plants/monstera" },
      { label: "ASPCA — Monstera Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/monstera-deliciosa" },
      { label: "The Spruce — Monstera Deliciosa Care", url: "https://www.thespruce.com/how-to-grow-monstera-deliciosa-5072671" },
      { label: "University of Minnesota Extension — Propagating Monstera deliciosa", url: "https://extension.umn.edu/houseplants/propagating-monstera-deliciosa" }
    ]
  },

  monstera_water_cuttings: {
    id: "monstera_water_cuttings",
    isPropagation: true,
    cuttingsCount: 3,
    repotSigns: [
      "Several white roots on each cutting reach 2–3\" (the pot-up signal — not a soil-pot rootbound sign)",
      "Water stays cloudy within 1–2 days of a change (bacterial load — refresh more often / rinse roots)",
      "A cutting's stem base turns brown/mushy (remove that cutting; it will not recover in the jar)",
      "Leaves yellow while roots are still <1\" (too little light, or a node-less cutting)",
      "Roots fill the jar in a dense mat and start circling (time to soil — water roots get brittle if left too long)",
      "No root nubs after 4–5 weeks on a cutting that has a clear node (check node is actually submerged)"
    ],
    displayName: "Monstera (Water Cuttings)",
    potSize: "Water jar",
    category: "tropical",
    names: {
      common: ["Monstera top cuttings", "Swiss Cheese Plant cuttings", "Water-propagating Monstera"],
      scientific: "Monstera deliciosa (3 apical / top cuttings from the mother plant)"
    },
    wateringDays: 7,
    wateringDaysHot: 5,
    wateringDaysCool: 7,
    currentSoilMix: "water_propagation",
    comments: "Aug 2026: 3 TOP cuttings taken from the 13.5\" mother Monstera and set in water. University of Minnesota Extension: each cutting MUST include a node (and ideally an aerial root). Change water at least weekly (sooner if cloudy). Roots often show in 2–4 weeks in warm months; new leaves can take 2–3 months. Do not pot until several roots are 2–3\" — water-grown roots are more brittle and need a gentle soil transition.",
    idealSoil: ["water_propagation", "aroid_mix"],
    soilNotes: "These are in water, not soil. When roots hit 2–3\", graduate ALL 3 into one 5–6\" pot of aroid mix (same family as the mother) so they clump into a full plant. Keep the first 1–2 weeks slightly more even-moist than the mother's strict dry-down, then ease onto soak-and-dry.",
    transferPlan: {
      potSize: '5–6"',
      soilType: "aroid_mix",
      summary: "Wait until several roots on each cutting are 2–3\" long (often 4–8 weeks from the Aug 2026 chop). Pot all 3 together in one 5–6\" pot of chunky aroid mix. Water in once, then keep just-moist for 10–14 days (water roots hate a sudden desert dry-down). Bright indirect only — no direct sun on a freshly potted cutting. No fertilizer for 3–4 weeks.",
      alternatives: [
        "Three 4\" pots (one cutting each — slower to look full, easier to isolate a weak cutting)",
        "Sphagnum → aroid mix (if a cutting is slow in water, move the node to moist sphagnum under a humidity dome)",
        "Same 13.5\" mother pot (only if you want to refill gaps — usually worse than a dedicated starter pot)"
      ]
    },
    conditions: {
      light:        { ideal: "Bright indirect — same as mother, no hot direct sun on the jar", passing: "Medium-bright; too dim = slow/no roots" },
      temperature:  { ideal: "68–80°F (20–27°C)", passing: "65–85°F; keep off cold AC vents" },
      humidity:     { ideal: "50%+ around the leaves", passing: "Average home; mist leaves if AC is very dry" },
      soilMoisture: { ideal: "Node submerged in clean water; leaves above the waterline", passing: "Refresh when cloudy; never let the node dry out" }
    },
    tips: {
      lighting: "Bright INDIRECT only while rooting. A jar on a hot sill cooks cuttings (glass + water = heat spike).\n\n• Best: 1F Living Room window (36° NE) or set back in 1F Corner — same safe foliage light as the mother.\n• Avoid 2F SW afternoon beam.\n• Rotate the jar so all three cuttings get even light.\n• Pale new petioles or no root nubs after a month usually means the jar is too dim, not that you need fertilizer (don't fertilize water props).",
      soil: "No soil yet. When you pot up: 1 part potting + 1 part orchid bark + 1 part perlite (or a bagged aroid mix). That matches the mother's long-term mix and avoids drowning water roots in dense peat.",
      watering: "METHOD — water culture, not soil watering: University of Minnesota Extension roots Monstera in plain water as long as a NODE is submerged. The 'watering' event is a WATER CHANGE, not a drench.\n\nHOW TO CHECK (your 3 top cuttings):\n• Weekly swap to room-temp water (filtered or tap left 24 hrs). Sooner if cloudy, slimy, or smelly.\n• Rinse the jar and gently rinse roots under lukewarm water during each change.\n• Keep the node + any aerial-root nub under water; keep leaf blades dry (submerged leaves rot).\n• Top off between changes if evaporation drops the waterline below the node — Central Texas AC dries jars faster than you'd think.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC):\n• Peak summer (now): check every 5–7 days; heat + light grow biofilm faster.\n• After pot-up: see Transfer Plan — not this weekly jar schedule.\n\nOVER- vs UNDER- cues:\n• Over (stagnant water): mushy brown stem, sour smell, collapsing petiole — discard that cutting, keep the healthy ones.\n• Under (node exposed): stalled roots, wrinkled petiole — raise the waterline immediately.",
      pruning: "Don't prune cuttings while they are rooting — every leaf is feeding root growth. Remove only a leaf that is fully yellow/mushy so it doesn't foul the water.",
      propagation: "These ARE the propagation. Confirm each of the 3 has a node. If one was a leaf-only petiole chop, it will not root (UMN Extension) — compost it rather than waiting months.\n\nSister project: 4 air layers still on the mother (higher success, slower). Do not mix timelines — pot water cuttings when THEY are ready; sever air layers only after moss-wrap roots hit 1–2\".",
      repotting: "First 'repot' = water → soil when roots are 2–3\". After that, follow normal Monstera 2–3 year cycle. Don't jump a freshly potted clump into a 13.5\" pot — 5–6\" is enough.",
      feeding: "No fertilizer in the jar (algae + burn). After 3–4 weeks in soil, quarter-strength balanced liquid in spring/summer only.",
      troubleshooting: "• No roots after 4+ weeks → node not in water, jar too dim, or not actually a node (UMN Extension). Check anatomy; move brighter-indirect.\n• Slimy/brown stem base → bacterial rot from stagnant water. Remove that cutting; bleach-rinse the jar; start fresh water.\n• Yellow leaf on an otherwise firm cutting → common after a chop; one leaf can yellow while roots start. If the stem is mushy, it's rot not shock.\n• White healthy roots then sudden brown tips → water too warm/stale or direct sun on the jar.\n• After pot-up, severe wilt → water roots drying too fast. Bag/humidity dome 3–5 days, keep mix just-moist, no direct sun.\n• Fungus gnats → only after soil transfer if you keep the mix wet; let the top inch dry.\n• ⚠️ Toxic — calcium oxalates per ASPCA (same as mother). Don't let Moose chew the jar leaves."
    },
    sources: [
      { label: "University of Minnesota Extension — Propagating Monstera deliciosa", url: "https://extension.umn.edu/houseplants/propagating-monstera-deliciosa" },
      { label: "University of Wisconsin Horticulture — Monstera deliciosa", url: "https://hort.extension.wisc.edu/articles/monstera-deliciosa-split-leaf-philodendron/" },
      { label: "RHS — Monstera deliciosa", url: "https://www.rhs.org.uk/plants/11281/monstera-deliciosa/details" },
      { label: "The Spruce — How to Propagate Monstera", url: "https://www.thespruce.com/how-to-propagate-monstera-7113171" },
      { label: "Missouri Botanical Garden — Monstera deliciosa", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=274375" },
      { label: "ASPCA — Monstera Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/monstera-deliciosa" }
    ]
  },

  thai_constellation: {
    id: "thai_constellation",
    repotSigns: [
      "New leaves come in with LESS variegation (stress reduces the white marbling)",
      "Aerial roots stretching down along the moss pole all the way to the soil",
      "Roots pushing out of drainage holes on the 5\" pot (5\" is small for a growing Monstera)",
      "Water drains through in <5 seconds and the pot feels light",
      "New leaves are markedly smaller than the previous flush",
      "The all-white 'moon' patches on new leaves start turning tan/crispy prematurely"
    ],
    displayName: "Thai Constellation Monstera",
    potSize: '5"',
    category: "tropical",
    names: {
      common: ["Thai Constellation Monstera", "Thai Con", "Galaxy Monstera"],
      scientific: "Monstera deliciosa 'Thai Constellation' (stable variegated cultivar, NOT a wild form)"
    },
    /* Slower-growing than green Monstera due to ~30–50% reduced chlorophyll
     * from cream-yellow variegation. Also slightly less water uptake.
     * Adjusted intervals are ~10–15% longer than green Monstera in same pot size. */
    wateringDays: 10,
    wateringDaysHot: 8,
    wateringDaysCool: 16,
    currentSoilMix: "aroid_mix",
    comments: "Stable, lab-created (tissue-cultured in Thailand, hence the name) variegated cultivar of Monstera deliciosa. Cream/yellow speckling is GENETICALLY STABLE — unlike Albo Monstera, which can revert. The variegation does NOT change with light (it's not from a chimeric mutation, it's polyploid/somatic). Currently in a 5\" pot — slow grower, expect to upsize to 6–7\" only at year 2. Highly sought-after houseplant; commands a premium price ($150–500 retail in 2024–2026).",
    idealSoil: ["aroid_mix"],
    soilNotes: "MUST be in a chunky aroid mix — Thai Cons rot easily in standard potting mix due to slow root metabolism. Recipe: 1 part orchid bark + 1 part perlite + 1 part coco coir or peat + handful of horticultural charcoal + handful of worm castings.",
    conditions: {
      light:        { ideal: "Bright indirect — NEEDS MORE than green Monstera (cream sections have no chlorophyll)", passing: "Medium-bright indirect; cream sections will yellow then brown if light is too low" },
      temperature:  { ideal: "65–85°F (18–29°C)",                                passing: "60–90°F; cold damage below 55°F" },
      humidity:     { ideal: "60–70%+ (the higher the better)",                  passing: "50%+; below 50% causes crispy white sections" },
      soilMoisture: { ideal: "Top 1–2 inches dry between deep waterings",          passing: "Tolerates short drought better than overwatering" }
    },
    tips: {
      lighting: "Thai Constellation needs MORE light than standard green Monstera because the cream/yellow variegated sections have no chlorophyll — the green sections do all the photosynthesis for the whole plant.\n\n• Best spot: 1–3 feet from an east-facing window (gentle morning sun), OR 4–6 feet back from a south/west window with sheer curtain.\n• Direct hot afternoon sun BURNS the cream sections — they'll scorch crispy brown irreversibly within a single afternoon.\n• Grow lights at 12,000–20,000 lux for 10–12 hrs/day work excellently for Thai Cons in winter.\n• Watch the variegation: if new leaves emerge with LESS cream, the plant is conserving chlorophyll because light is too low — move brighter.\n• Watch the older leaves: if cream sections turn brown and crispy, light is too direct.\n• Rotate the pot 1/4 turn weekly so all leaves develop balanced variegation.\n\n• In this home, the 1F Bathroom (set back from SE beam) and 1F Living Room corner are your best matches — avoid the intense 2F SW afternoon sun.",
      soil: "ABSOLUTELY MUST be a chunky aroid mix. Standard potting mix WILL kill Thai Constellation within 6–12 months because the slow root metabolism + reduced chlorophyll = much higher rot susceptibility.\n\nRecipe (parts by volume):\n• 2 parts orchid bark (medium grade, fir bark)\n• 2 parts perlite (chunky, not powder)\n• 1 part coco coir OR peat moss\n• 1 part horticultural charcoal\n• Handful of worm castings (slow-release nutrition)\n\nPre-mixed alternatives: 'Aroid Mix' from Soil Sunrise, Soil Ninja, or 'Special Blend' from Premier Tech. Confirm visible bark + perlite chunks.",
      watering: "METHOD — soak-and-dry (strict): Thai Constellation has slower root metabolism than green Monstera (~30–50% less chlorophyll) — it drinks less but rots MORE easily in wet chunky mix. Let the top 1–2\" of aroid mix dry fully before a deep drench.\n\nHOW TO CHECK READINESS (your 5\" pot):\n• Finger test: top 1–2\" must feel dry — in a small 5\" pot this happens faster than you'd expect.\n• Pot weight: the 5\" pot should feel almost hollow-light before watering.\n• Moisture meter: 2–3 in upper third = water; anything above 5 = wait (rot risk).\n• Plant tells: slight droop + dry top 2\" = thirsty (recovers in 4–6 hrs). Droop + wet soil = STOP — root rot.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC):\n• Hot AC season (Apr–Oct): every 8–10 days in 1F Bath/Corner.\n• Peak summer (Jun–Sep): every 8 days — small 5\" pot + AC still dries bark fast.\n• Mild winter (Nov–Feb): every 14–16 days — slow metabolism; when in doubt, wait 2 extra days.\n• NEVER place in 1F Room 1 (overhead fan dries small pots rapidly) without checking daily in summer.\n\nBOTTOM-WATERING: useful for this 5\" pot — soak 15 min in a tray, drain fully. Prevents splash on cream sections and reduces fungus gnats.\n\nWATER QUALITY: use room-temp filtered, distilled, or rainwater — cream/white sections show fluoride/chlorine burn first (brown/tan patches). Flush with plain filtered water every 2 months.\n\nOVER- vs UNDER-watering tells:\n• Over (#1 killer): yellow leaves, black stem bases, mushy roots, cream sections turning tan while soil is wet.\n• Under: drooping with dry soil, slight leaf curl, slower new leaf emergence — less dangerous than overwatering.",
      pruning: "Minimal pruning needed (slow grower).\n\n• Cut just above a NODE (the bump where leaves/aerial roots emerge) at 45° with sterile scissors.\n• REMOVE all-white/cream-only new leaves at the node — without any green, they can't photosynthesize and will starve the plant. Don't worry, this is normal Thai Con behavior.\n• Save every cutting — Thai Constellation propagates well and the cuttings are highly valuable (sell or trade with other collectors).\n• Wipe leaves with a damp microfiber cloth monthly — dust on cream sections especially blocks the limited light they reflect.\n• ⚠️ DON'T over-prune. Thai Cons grows slowly; aggressive pruning takes 6+ months to recover from.",
      propagation: "Stem cuttings with at LEAST 1 node and ideally an aerial root. Propagation IS possible but slower than green Monstera.\n\nMethod A (water): place cutting in clean water with node submerged, change water weekly, roots in 4–8 weeks (vs. 3–6 for green). Transplant when roots are 2–3\" long. Success rate 70–80%.\n\nMethod B (sphagnum moss): wrap node in moist sphagnum, place in clear container with high humidity (humidity dome or zip-top bag with airflow), check weekly. Roots in 4–6 weeks. Success rate 80%+.\n\nMethod C (air-layering): wrap an aerial-rooted node still attached to the parent in moist sphagnum + plastic wrap; cut after roots form. Highest success rate (90%+) but slowest (6–10 weeks).\n\nBest season: late spring / early summer.\n\nKEY: cuttings must have at least ONE node with both green AND cream tissue to ensure the variegation is passed on. All-green cuttings make all-green plants (and vice versa for all-cream).",
      repotting: "Slow grower — only repot when truly root-bound (every 2–3 years).\n\n• Current 5\" pot: expect to upsize to 6\" at year 2.\n• Up-pot by only 1\" diameter — overpotting is dangerous because more soil = more water retention = more rot risk.\n• Best season: spring (March–May) when active growth resumes.\n• When repotting: bare-root carefully, prune any dead/circling roots, replace 100% of the soil with fresh aroid mix.\n• Optional power move: add a 18–24\" moss pole or coir totem to the new pot — Thai Constellation leaves develop bigger fenestrations and more dramatic variegation when allowed to climb.",
      feeding: "Light feeder due to slow growth.\n\n• Balanced liquid fertilizer (20-20-20) at QUARTER strength every 6 weeks during spring/summer. Half-strength can burn the cream sections.\n• Slow-release Osmocote pellets in spring at half the package rate is an alternative.\n• Foliar spray with diluted seaweed extract once a month boosts variegation richness (the trace minerals matter for chlorophyll partitioning).\n• Flush soil with plain water every 2 months to clear salt buildup.\n• No fertilizer Oct–Feb.\n• ⚠️ Over-fertilizing causes brown crispy edges on white sections — they have no buffer capacity. Less is more.",
      troubleshooting: "• Brown crispy cream/white sections → too much direct sun (especially 2F SW), low humidity (Central Texas AC), OR mineral/fluoride buildup — filter water, move to 1F Bath set back or 1F Corner, raise humidity to 60%+.\n• Yellow leaves → almost always OVERWATERING (per University of Florida IFAS parent-species guidance). Unpot, trim mushy roots, repot in fresh dry aroid mix.\n• New leaves with LESS cream → light too low — move to 1F Corner or add grow lights; plant is conserving chlorophyll.\n• Fully white new leaf → prune at node — no green tissue = can't photosynthesize; starves the plant.\n• Drooping/wilting → dry soil = water; wet soil = root rot emergency.\n• Leaf drop → repot shock, cold below 55°F, or severe rot — stabilize and inspect roots.\n• Leaf curling → underwatering or low humidity — check top 2\" moisture.\n• Faded/scorched variegation → direct sun hit — never in 2F SW window.\n• Stunted growth / no new leaves 3+ months → normal in winter; in summer = light or root issue.\n• Root rot (brown mushy roots, sour bark) → bare-root, cut rot, repot dry, wait 7–10 days.\n• Black spots on leaves → bacterial leaf spot from overwatering + poor airflow — remove leaves, copper fungicide if spreading.\n• Spider mites (fine webs, stippling on cream sections) → shower weekly, insecticidal soap; mites love dry AC air.\n• Mealybugs (white cotton in leaf crevices) → alcohol Q-tip.\n• Scale (bumps on stems) → scrape, alcohol, horticultural oil.\n• Thrips (silvery scars) → rinse, sticky traps, spinosad.\n• Fungus gnats → let top 1\" of bark dry; sticky traps.\n• ⚠️ Toxic to cats, dogs, and humans — insoluble calcium oxalates per ASPCA (Monstera deliciosa parent species).",
    },
    sources: [
      { label: "Missouri Botanical Garden — Monstera deliciosa (parent species)", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=274375" },
      { label: "RHS — Monstera deliciosa", url: "https://www.rhs.org.uk/plants/11281/monstera-deliciosa/details" },
      { label: "University of Florida IFAS — Monstera", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/monstera-deliciosa.html" },
      { label: "Costa Farms — Monstera Care", url: "https://costafarms.com/plants/monstera" },
      { label: "The Sill — Monstera Variegated Care", url: "https://www.thesill.com/blog/plant-care-monstera-deliciosa" },
      { label: "ASPCA — Monstera Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/monstera-deliciosa" },
      { label: "American Horticultural Society — Variegated Houseplant Care", url: "https://www.ahsgardening.org/" },
      { label: "The Spruce — Monstera Deliciosa Care", url: "https://www.thespruce.com/how-to-grow-monstera-deliciosa-5072671" }
    ]
  },

  ginseng_ficus: {
    id: "ginseng_ficus",
    repotSigns: [
      "Leaves markedly SMALLER than the previous flush (bonsai's classic 'I need more root room' signal)",
      "Needs watering every 1–2 days even in cool season (bonsai + rootbound = fast dry-down)",
      "Roots visible pushing through the drainage holes on the 7\" pot",
      "Trunk/caudex has swollen but new leaves look sparse and pale",
      "Water drains through in <5 seconds",
      "Any lean in the caudex — bonsai pots are shallow, and a shifted center of gravity means the roots have outgrown the anchor"
    ],
    displayName: "Ginseng Ficus",
    potSize: '7"',
    category: "bonsai",
    names: {
      common: ["Ginseng Ficus", "Banyan Fig", "Taiwan Ficus", "Indian Laurel", "Curtain Fig"],
      scientific: "Ficus microcarpa (often sold as F. retusa)"
    },
    wateringDays: 8,
    wateringDaysHot: 6,
    wateringDaysCool: 12,
    currentSoilMix: "bonsai_mix",
    comments: "Repotted in last 2 months into a 7\" pot (up from 6\"). Soil is 90/10 bonsai-tropical mix / cacti mix — excellent drainage. The slightly bigger pot stretches watering intervals 1 day longer than the previous 6\".",
    idealSoil: ["bonsai_mix"],
    soilNotes: "User has 90/10 bonsai-tropical mix + cacti mix — essentially a bonsai_mix. Perfect for an indoor bonsai-style ficus. The cacti mix component adds extra drainage which is helpful in a non-traditional (deeper-than-bonsai) pot.",
    conditions: {
      light:        { ideal: "Bright + 2–4 hrs direct sun (south/west)", passing: "Bright indirect; tolerates lower with smaller leaves" },
      temperature:  { ideal: "65–80°F (18–27°C) year-round", passing: "55–95°F; protect from freezing" },
      humidity:     { ideal: "50–70%", passing: "40%; misting and a humidity tray help in winter" },
      soilMoisture: { ideal: "Just-moist; pot dries quickly", passing: "Top of soil dries; never bone dry to the rootball" }
    },
    tips: {
      lighting: "Bright light including 2–4 hours of direct sun is ideal. A south or west window is best. Tolerates medium light but leaves shrink and become sparser.\n\n• Rotate weekly for even growth.\n• If moving outdoors for summer, transition gradually over 1–2 weeks to avoid leaf drop and sunburn.\n• Acclimate back indoors equally gradually in fall (drop in light = leaf drop is normal but reversible).\n• Supplemental grow lights in winter prevent excessive leaf drop.\n\n• In this home, 2F Living Room (215° SW — intense afternoon sun) and 1F Room 1 (131° SE + overhead fan) are your best matches per PLANT_LIGHT_REF.",
      soil: "FAST-DRAINING bonsai mix is essential. Classic blend:\n• 1 part akadama (or fine pine bark)\n• 1 part pumice\n• 1 part lava rock (or coarse perlite)\n\nStandard potting soil retains too much water for a bonsai pot and causes root rot.\n\nRepot media should be sifted to remove dust — fines clog drainage.",
      watering: "METHOD — just-moist bonsai discipline (NOT strict soak-and-dry): Ficus microcarpa in a 7\" bonsai-style pot with fast-draining 90/10 bonsai-tropical/cacti mix dries quickly through the shallow root zone. Per Bonsai Empire, water when the surface feels just dry — never let the rootball fully desiccate, never keep it soggy.\n\nHOW TO CHECK READINESS (your 7\" pot):\n• Finger test: top ~1/2\" just barely dry = water; if still cool/damp below, wait.\n• Pot weight: a well-watered 7\" pot feels solid; when noticeably lighter, check the surface.\n• Moisture meter: 4–5 in upper third = ideal; water at 3 or below.\n• Plant tells: slight leaf droop + dry surface = thirsty. Mass leaf drop + wet soil = overwatered. Crispy edges + light pot = underwatered.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 6–8 days — AC dries bonsai substrate fast even when outdoor humidity is high.\n• Peak summer (Jun–Sep): every 6 days in 2F LR (SW) or 1F Room 1 (SE + fan); fan airflow helps surface dry-down.\n• Mild winter (Nov–Feb): every 10–12 days — growth slows but shallow mix still dries; never skip so long the rootball goes bone dry.\n• Soak THOROUGHLY until water runs from drainage holes, then empty the saucer.\n• Alternative: bottom-water 5–10 min until bubbling stops, then drain fully.\n• Mist foliage every few days in winter (dry AC air) to discourage spider mites per Missouri Botanical Garden.\n\nOVER- vs UNDER-watering tells:\n• Over: yellow lower leaves, soft stems, sour soil, fungus gnats, persistent leaf drop.\n• Under: crispy leaf edges, entire leaf drop, soil pulling from pot walls, pot feels hollow-light.",
      pruning: "Tolerates aggressive pruning — one of bonsai's most forgiving species.\n\n• Trim new shoots back to 2–3 leaves once they've grown to 6–8 leaves to maintain shape and ramification.\n• Major structural pruning: spring, just before new growth.\n• Wiring: year-round, but check weekly that wire isn't cutting into thickening branches.\n• Use sharp clean concave cutters for trunk cuts to encourage flat callus healing.\n• Defoliation (removing all leaves) once every 2–3 years in early summer forces smaller, denser regrowth.",
      propagation: "• HARDWOOD CUTTINGS (best): take 4–6\" cuttings in spring/summer, strip bottom leaves, dip in rooting hormone (e.g. IBA), insert into moist perlite/peat mix, cover with humidity dome, roots in 4–8 weeks. Success rate ~70%.\n• AIR-LAYERING: very effective for thick branches; girdle bark in a ring, wrap with moist sphagnum + plastic, roots in 6–12 weeks.\n• Seeds: slow and not worth the effort for the cultivar.",
      repotting: "Every 2–3 years in EARLY SPRING just before new growth pushes.\n\n• Trim ~1/3 of the roots — rake out, prune circling roots, comb out fine roots.\n• Refresh with new bonsai soil; secure tree with wire through drain holes.\n• The thickened \"ginseng\" caudex can be raised slightly during each repot to expose more woody trunk.\n• Don't fertilize for 4–6 weeks after repot.",
      feeding: "HEAVY FEEDER when growing strongly.\n\n• Balanced organic bonsai fertilizer (e.g. Biogold, fish/seaweed emulsion, 6-6-6) every 2 weeks spring/summer.\n• Monthly in fall.\n• None in winter unless actively growing under lights.\n• Solid pellets (Biogold cakes) placed on soil surface release nutrients with each watering.",
      troubleshooting: "• Sudden mass leaf drop → relocation shock, light change, draft, or watering swing (per Bonsai Empire). Stabilize location and schedule; new buds usually return in 2–4 weeks.\n• Yellow leaves (lower first) → overwatering / root rot most likely; check for mushy roots. Crispy yellow = underwatering.\n• Mushy stem base / black roots → overwater in fast-draining mix that was kept too wet too long. Unpot, trim rot, let callus, repot in fresh bonsai mix; withhold water 5–7 days.\n• Wrinkled/shriveled leaves + dry soil → underwatered — soak thoroughly.\n• Leggy sparse growth / smaller new leaves → low light; move toward 2F LR or 1F Room 1 or add grow lights.\n• Sunscald (bleached/brown patches) → sudden move to harsh SW sun without acclimation; pull back 1–2 ft or filter.\n• Edema (blistered leaf undersides) → overwatering + cool nights; reduce water, improve airflow.\n• Sticky residue + tiny brown bumps → SCALE (common on Ficus). Wipe with alcohol swabs; horticultural oil or neem weekly × 3.\n• White webs + stippled leaves → SPIDER MITES (dry AC winter air). Rinse foliage; insecticidal soap weekly until clear.\n• White cottony clusters → MEALYBUGS. Dab with alcohol; inspect leaf axils.\n• Fungus gnats → surface kept too wet; let top dry, sticky traps, reduce watering frequency.\n• Whitefly (rare indoors) → yellow sticky traps; insecticidal soap on undersides.\n• Aerial roots → normal; train into soil or trim.\n• ⚠️ Toxic/irritant per ASPCA — Ficus genus contains ficin (proteolytic enzyme) and psoralen; latex sap irritates skin; causes GI upset in pets. Wash hands after pruning."
    },
    sources: [
      { label: "Bonsai Empire — Ficus Bonsai Care", url: "https://www.bonsaiempire.com/tree-species/ficus" },
      { label: "American Bonsai Society — Species Guide", url: "https://absbonsai.org/species-guide/" },
      { label: "Missouri Botanical Garden — Ficus microcarpa", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275193" },
      { label: "Bonsai4Me — Ficus microcarpa Care", url: "http://www.bonsai4me.com/SpeciesGuide/Ficus.html" },
      { label: "RHS — Ficus microcarpa", url: "https://www.rhs.org.uk/plants/search-results?query=ficus+microcarpa" },
      { label: "Bonsai Mirai — Tropicals Indoor Care", url: "https://live.bonsaimirai.com/" },
      { label: "ASPCA — Fig (Ficus) Toxicity", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/fig" }
    ]
  },

  ginseng_ficus_cutting: {
    id: "ginseng_ficus_cutting",
    repotSigns: [
      "Roots peeking out of the 2\" starter pot's drainage hole (the #1 'ready to pot up' signal for a young cutting)",
      "New leaf growth has begun AND several flushes have hardened off — a sign the root system is now supporting the top",
      "Water runs straight through in a couple of seconds and the tiny pot dries out daily",
      "The cutting no longer wobbles when gently nudged — roots have gripped the whole plug",
      "Top growth is outpacing the pot: plant looks top-heavy or tips over easily",
      "White roots circling the inside of the pot when you slide the plug out to check"
    ],
    displayName: "Ginseng Ficus (Rooted Cutting)",
    potSize: '2"',
    category: "bonsai",
    condition: "rooted cutting — establishing",
    cuttingsCount: 1,
    names: {
      common: ["Ginseng Ficus", "Banyan Fig", "Taiwan Ficus", "Indian Laurel", "Curtain Fig"],
      scientific: "Ficus microcarpa (often sold as F. retusa)"
    },
    wateringDays: 4,
    wateringDaysHot: 3,
    wateringDaysCool: 6,
    currentSoilMix: "standard_potting",
    comments: "Small branch cutting taken from the main Ginseng Ficus that has now ROOTED and is establishing in a 2\" starter pot. A freshly-rooted cutting has a tiny, fragile root system, so it wants steadier moisture than the established bonsai — keep the little plug just-moist, never bone dry, while it fills out. ⚠️ Honest expectation: a BRANCH cutting roots readily but will NOT develop the fat swollen \"ginseng\" caudex — that bulbous base comes only from seed-grown or grafted rootstock. This cutting will grow into a normal-rooted Ficus microcarpa that can still be trained as an upright/informal bonsai over time.",
    idealSoil: ["bonsai_mix", "standard_potting"],
    soilNotes: "While establishing, a moisture-retentive standard potting mix (or the propagation medium it rooted in) is actually helpful — it keeps the young roots from drying out. Once the roots fill the 2\" pot, transition it up into the same fast-draining bonsai mix used for the parent tree (see the Repot Suggestion pane).",
    conditions: {
      light:        { ideal: "Bright indirect while establishing; ease into 1–2 hrs gentle morning sun after new growth appears", passing: "Bright indirect; avoid harsh direct sun on a stressed cutting" },
      temperature:  { ideal: "68–80°F (20–27°C) — warmth speeds root establishment", passing: "60–90°F; keep away from cold drafts and AC vents" },
      humidity:     { ideal: "60–70% (a humidity dome or clear cup helps a fresh cutting)", passing: "45%+; mist daily or use a pebble tray" },
      soilMoisture: { ideal: "Consistently just-moist while rooting in", passing: "Top few mm dry between waterings — never let the small plug go bone dry" }
    },
    tips: {
      lighting: "A rooting/just-rooted cutting is more sensitive to strong light than an established tree.\n\n• Start in BRIGHT INDIRECT light (an east window or a foot back from a bright south/west one).\n• Once you see a flush or two of new leaves, gradually introduce 1–2 hours of gentle morning sun.\n• Hold off on the parent tree's 2–4 hrs of direct sun until the cutting is clearly growing strongly.\n• Rotate every few days for even growth.\n\n• In this home, 1F Bathroom (127° SE, high humidity) and 1F Living Room window (36° NE — soft bright indirect) are your best matches per PLANT_LIGHT_REF while the cutting establishes.",
      soil: "For now, whatever it rooted in (water → potting mix, or a peat/perlite propagation mix) is fine — the goal is steady moisture, not maximum drainage, while the root system is tiny.\n\nWhen you pot it up (see Repot Suggestion), switch to the parent's fast-draining bonsai blend:\n• 1 part akadama or fine pine bark\n• 1 part pumice\n• 1 part lava rock / coarse perlite",
      watering: "METHOD — steady just-moist (NOT parent-tree soak-and-dry yet): a freshly rooted branch cutting in a 2\" starter pot has a tiny, fragile root system and cannot recover from a hard dry-out. Per University of Florida IFAS cutting-propagation guidance, keep the plug consistently just-moist while roots fill out — then transition to the parent's bonsai schedule after pot-up.\n\nHOW TO CHECK READINESS (your 2\" starter pot):\n• Finger test: water when the top few mm feel dry — in a 2\" pot this can be daily in peak summer.\n• Pot weight: the tiny pot should never feel hollow-light; if it does, water immediately.\n• Moisture meter: 5–6 in upper third while establishing; never let it peg dry (1–2).\n• Plant tells: limp/wilting new leaves = thirsty NOW. Mushy stem base = too wet.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC):\n• Hot AC season (Apr–Oct): every 3–4 days — the 2\" plug dries faster than any other pot in the collection.\n• Peak summer (Jun–Sep): check daily in 1F Bathroom (humid but warm); every 3 days in drier 1F Window.\n• Mild winter (Nov–Feb): every 5–6 days — still don't let the plug go bone dry even though growth slows.\n• Water gently with a squeeze bottle or bottom-water 10 min to avoid dislodging the cutting.\n• A humidity dome / clear cup with a vent helps the first few weeks — crack open gradually to harden off.\n• Ease to the parent tree's less-frequent schedule only once well rooted and potted up to 3–4\".\n\nOVER- vs UNDER-watering tells:\n• Over: blackening/mushy stem base (damping-off), sour soil, no new roots.\n• Under: crispy leaf edges, limp wilt that doesn't recover within hours of watering.",
      pruning: "Do NOT prune yet — let the cutting build leaves and roots first; every leaf is powering root growth.\n\n• Once it's established and pushing strong new growth, you can pinch the tip to encourage branching and begin shaping.\n• Early wiring (very light) can start once the stem is clearly growing, but there's no rush.",
      propagation: "This plant IS a propagation success. For future rounds from the parent tree:\n• HARDWOOD/BRANCH CUTTINGS: 4–6\" cuttings in spring/summer, strip lower leaves, dip in rooting hormone, insert in moist perlite/peat, cover with a humidity dome; roots in 4–8 weeks.\n• AIR-LAYERING gives a thicker, more caudex-like base than a plain branch cutting and is worth trying if you want bonsai-worthy trunk girth.",
      repotting: "Pot up ONCE, gently, when roots reach the drainage hole (see the Repot Suggestion pane) — then follow the parent tree's 2–3 year bonsai repot cycle.\n\n• First pot-up: minimal root disturbance — just slide the whole plug into the next size up with fresh bonsai mix around it.\n• Don't root-prune a young cutting; save aggressive root work for later, established repots.\n• Don't fertilize for 4–6 weeks after any repot.",
      feeding: "Wait until the cutting is clearly rooted and pushing new leaves before feeding.\n\n• Then start with a WEAK (¼-strength) balanced or fish/seaweed feed every 3–4 weeks in spring/summer.\n• Skip feeding a stressed or dormant cutting entirely.\n• Build up to the parent tree's heavier feeding schedule only once it's growing vigorously.",
      troubleshooting: "• Wilting / limp cutting → roots can't keep up yet; raise humidity (dome/cup), keep soil just-moist, reduce light intensity.\n• Leaf drop → normal stress from move or humidity/light change; stabilize in 1F Bath or 1F Window; new growth returns in 2–4 weeks.\n• Mushy stem base / blackening at soil line → DAMPING-OFF / rot from too-wet medium. Unpot, trim to firm green tissue, let callus 24 hrs, re-root in fresh barely-moist perlite/peat; discard if stem is hollow.\n• Crispy leaf edges → too dry or too much direct sun for a cutting; move back from window, water sooner.\n• No new growth for weeks but stem firm & green → be patient; roots often establish before top growth resumes (per IFAS propagation guide).\n• Leggy pale new leaves → low light; bright indirect only — no harsh SW sun yet.\n• Fungus gnats → surface too wet too long; let top dry slightly, sticky traps.\n• Scale / mealybugs (rare on young cuttings) → alcohol swab; isolate from parent tree.\n• ⚠️ Toxic/irritant per ASPCA — Ficus genus sap (ficin, psoralen) irritates skin and is toxic to pets. Wash hands after handling cuts."
    },
    sources: [
      { label: "Bonsai Empire — Ficus Bonsai Care", url: "https://www.bonsaiempire.com/tree-species/ficus" },
      { label: "Bonsai4Me — Ficus microcarpa Care & Propagation", url: "http://www.bonsai4me.com/SpeciesGuide/Ficus.html" },
      { label: "Missouri Botanical Garden — Ficus microcarpa", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275193" },
      { label: "American Bonsai Society — Species Guide", url: "https://absbonsai.org/species-guide/" },
      { label: "University of Florida IFAS — Cutting Propagation of Woody Plants", url: "https://edis.ifas.ufl.edu/publication/MG108" },
      { label: "ASPCA — Fig (Ficus) Toxicity", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/fig" }
    ],
    repotSuggestion: {
      urgency: "seasonal",
      targetPotSize: '3–4"',
      targetSoilType: "bonsai_mix",
      timing: "When roots reach the drainage hole and the cutting is pushing steady new growth — likely 2–4 months out. No rush; let it establish in the starter pot first.",
      technique: "This is a young, fragile cutting — the first pot-up is about MINIMAL disturbance, not the aggressive root-work of a mature bonsai repot.\n• Wait until you can see roots at the drainage hole (proof the plug is well-rooted).\n• Water 1–2 days before so the plug holds together.\n• Slide the ENTIRE plug out intact — do NOT tease apart or root-prune a young cutting.\n• Set it into a 3–4\" pot and pack the parent tree's fast-draining bonsai mix around the sides.\n• Keep it slightly moist (not the mature tree's dry-down schedule) for the first couple of weeks post-pot-up, then ease into the normal ginseng ficus routine.\n• No fertilizer for 4–6 weeks after.\n• Only start real bonsai root-pruning at the NEXT repot (2–3 years out), once it's a robust little tree.",
      summary: "It's rooted but young — leave it in the 2\" starter until roots hit the drainage hole, then do a gentle, disturbance-free pot-up into a 3–4\" with proper bonsai mix. Don't root-prune yet.",
      alternatives: [
        "Terracotta 3\" (best — breathable, forgiving of overwatering a young root system)",
        "Plastic 3–4\" nursery pot (fine and retains a touch more moisture, which a cutting likes early on)",
        "Small training pot / shallow bonsai starter 4\" (if you want to begin shaping sooner)"
      ]
    }
  },

  snake_plant: {
    id: "snake_plant",
    repotSigns: [
      "Rhizomes visibly LIFTING or CRACKING the pot from the inside (same signal as ZZ Plant — the underground rhizomes are physically constrained)",
      "Tall leaves toppling sideways because the rootball no longer anchors the lever length",
      "Roots pushing out of the 7.5\" drainage holes",
      "New leaves markedly narrower/shorter than mature ones",
      "Soil pulling away from the pot walls; a gap you can slide a finger into",
      "Pot bulging out of shape (Snake Plant + ZZ are the two plants in the collection with pot-cracking rhizomes)"
    ],
    displayName: "Snake Plant",
    potSize: '7.5"',
    category: "succulent_like",
    names: {
      common: ["Snake Plant", "Mother-in-Law's Tongue", "Saint George's Sword", "Bowstring Hemp"],
      scientific: "Dracaena trifasciata (formerly Sansevieria trifasciata)"
    },
    wateringDays: 18,
    wateringDaysHot: 16,
    wateringDaysCool: 35,
    currentSoilMix: "cactus_mix",
    comments: "Repotted in last 2 months. Soil is 60/40 cacti mix / perlite — excellent drainage with no risk of root rot. Pot is 7.5\".",
    idealSoil: ["cactus_mix", "standard_potting"],
    soilNotes: "User's 60/40 cacti mix + extra perlite is an ideal blend — cacti mix already drains fast, and the extra perlite makes it bulletproof against root rot. Probably the best soil setup of all your plants for matching the plant's needs.",
    conditions: {
      light:        { ideal: "Bright, indirect with some direct sun", passing: "Survives low light; variegation may fade" },
      temperature:  { ideal: "60–85°F (15–29°C)", passing: "50–95°F; never below 50°F" },
      humidity:     { ideal: "30–50% (average home)", passing: "Any humidity 20–80% — extremely tolerant" },
      soilMoisture: { ideal: "Bone dry between waterings", passing: "Top half of soil dry — never wet feet" }
    },
    tips: {
      lighting: "Extremely adaptable — from low light to bright indirect; tolerates a few hours of direct sun.\n\n• Best growth: bright indirect light (e.g. east-facing or filtered south window).\n• Low light is survivable but variegation fades and growth nearly stops.\n• Move outside in dappled shade for summer if desired — acclimate over 2 weeks.\n\n• In this home, 2F Room 1 (298° NW — bright + late-day direct) and 2F Bathroom (208° SW) are flexible good matches per PLANT_LIGHT_REF.",
      soil: "GRITTY, FAST-DRAINING cactus/succulent mix. Recipe:\n• 2 parts cactus mix\n• 1 part perlite\n• 1 part coarse sand or pumice\n\nWet feet = certain death. Choose terracotta over plastic for the same reason.",
      watering: "METHOD — strict soak-and-dry: Dracaena trifasciata stores water in thick leaves and rhizomes; rot from overwatering is the #1 killer (per The Spruce and University of Florida IFAS). Let the entire soil mass dry COMPLETELY before a deep drench. Terracotta helps wick moisture in Central Texas AC.\n\nHOW TO CHECK READINESS (your 7.5\" pot, 60/40 cacti mix + perlite):\n• Finger test: stick finger 2–3\" deep — any moisture = wait.\n• Pot weight: lift the side — a thirsty 7.5\" pot feels noticeably lighter than 24 hrs after a soak.\n• Moisture meter: 1–2 throughout pot = water; 4+ = wait.\n• Plant tells: slight leaf wrinkling/curling inward = thirsty. Mushy base + yellow leaves = overwatered.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 14–18 days — your 7.5\" terracotta-friendly mix dries steadily but not as fast as a 4\" succulent.\n• Peak summer (Jun–Sep): every 14–16 days in 2F Room 1 (NW); can stretch to 18 days in humid spots.\n• Mild winter (Nov–Feb): every 28–35 days — near-zero water; growth nearly stops.\n• Drench until water runs out, then dump the saucer immediately.\n• Water the SOIL only — never pour into the leaf crown (standing water = crown rot).\n• When in doubt, wait another week (per The Spruce).\n\nOVER- vs UNDER-watering tells:\n• Over: mushy base, yellow leaves falling over, soil smells sour, fungus gnats.\n• Under: wrinkled/curling leaves, dry soil pulling from pot walls, pot feels hollow-light.",
      pruning: "Minimal pruning needed.\n\n• Cut damaged leaves at the soil line with clean scissors — they won't regrow from a cut.\n• Remove brown tips with diagonal cuts mimicking the natural leaf shape.\n• To control height, remove the tallest leaves at the base.",
      propagation: "Three easy methods:\n\n1. DIVISION (highest success): at repot, separate rhizomes with their own roots and leaves. Pot up immediately. Success ~95%.\n2. LEAF CUTTINGS IN WATER: cut a leaf into 3–4\" sections, mark the bottom end (matters!), let callous 24 hrs, place bottom-end down in water. Roots in 4–8 weeks; pups in 2–4 months.\n3. LEAF CUTTINGS IN SOIL: same prep, insert into dry succulent mix; water sparingly. Slower but reliable.\n\n⚠️ Variegated cultivars (golden edges, e.g. 'Laurentii') may LOSE variegation when propagated by leaf — use division to preserve it.",
      repotting: "Every 3–4 years or when roots/rhizomes crack the pot. Snake plants actually LIKE being root-bound.\n\n• Spring (March–May) is best.\n• Up-pot by only 1–2 inches.\n• Use a HEAVY pot (terracotta or stoneware) — tall plants tip easily in plastic.\n• Top-dress with gravel for a cleaner look + slug deterrent if outdoors.",
      feeding: "LIGHT feeder.\n\n• Cactus/succulent fertilizer at half strength every 6–8 weeks in spring/summer.\n• None in winter.\n• Overfertilizing causes leaf collapse and salt burn.",
      troubleshooting: "• Mushy base / yellow leaves falling over → ROOT ROT from overwatering (per The Spruce). Unpot, cut away rotten rhizomes/roots with sterilized scissors, let dry 24 hrs, repot in dry 60/40 cacti/perlite mix; don't water for 2 weeks.\n• Wrinkled, curling leaves → severely underwatered. Soak thoroughly until water runs out.\n• Brown crispy tips → inconsistent watering OR fluoride/chlorine in Central Texas tap water (per IFAS). Try filtered or let tap sit 24 hrs.\n• Leaves leaning/floppy → too little light or pot too large; move toward 2F Room 1 NW window.\n• Etiolation (tall narrow new leaves, faded variegation) → low light; increase brightness gradually.\n• Sunscald (bleached/white patches) → sudden move to harsh SW afternoon sun; filter or pull back.\n• White cottony spots in leaf axils → MEALYBUGS (#1 pest for succulents). Dab with alcohol; neem weekly × 3.\n• Fine webbing + stippling → SPIDER MITES in dry AC air. Rinse leaves; insecticidal soap weekly.\n• Fungus gnats → soil staying wet too long; let dry fully between waterings, sticky traps.\n• Mushroom-like growth at base → fungal; improve airflow, reduce watering.\n• Leaves splitting → cold damage (<50°F) or physical injury; splits don't heal.\n• ⚠️ Toxic per ASPCA — contains saponins; causes nausea, vomiting, diarrhea in pets if ingested."
    },
    sources: [
      { label: "Missouri Botanical Garden — Dracaena trifasciata", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=284756" },
      { label: "University of Florida IFAS — Snake Plant", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/snake-plant.html" },
      { label: "NASA Clean Air Study (1989) — Wolverton, B.C.", url: "https://ntrs.nasa.gov/citations/19930073077" },
      { label: "ASPCA — Snake Plant Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/snake-plant" },
      { label: "RHS — Sansevieria / Dracaena trifasciata", url: "https://www.rhs.org.uk/plants/search-results?query=sansevieria+trifasciata" },
      { label: "The Sill — Snake Plant Care", url: "https://www.thesill.com/blog/plant-care-snake-plant" },
      { label: "The Spruce — Snake Plant Care Guide", url: "https://www.thespruce.com/snake-plant-care-overview-1902772" }
    ]
  },

  aloe_vera: {
    id: "aloe_vera",
    repotSigns: [
      "Pups (small offsets) completely fill the pot around the mother rosette — no bare soil visible",
      "Mother rosette is being LIFTED UP out of the soil by root pressure below",
      "Outer leaves lose plumpness and don't recover after watering (roots have no absorbency left)",
      "Roots circling out of the 8.5\" drainage holes",
      "The 8.5\" pot feels heavy right after watering but leaves still look thirsty within days",
      "Growth stalls in growing season despite good sun exposure"
    ],
    displayName: "Aloe Vera",
    potSize: '8.5"',
    category: "succulent",
    names: {
      common: ["Aloe Vera", "Medicinal Aloe", "True Aloe", "Burn Plant", "First-Aid Plant"],
      scientific: "Aloe barbadensis miller (syn. Aloe vera (L.) Burm.f.)"
    },
    wateringDays: 18,
    wateringDaysHot: 16,
    wateringDaysCool: 30,
    currentSoilMix: "cactus_mix",
    comments: "Repotted in last 2 months. Soil is 50/50 cacti mix / perlite — ideal mineral-heavy blend. Pot is 8.5\".",
    idealSoil: ["cactus_mix"],
    soilNotes: "User's 50/50 cacti mix + perlite is textbook for aloe — coarse, mineral-heavy, drains immediately. Extra perlite gives it a small extra margin against overwatering.",
    conditions: {
      light:        { ideal: "4–6+ hrs direct sun (south/west window)", passing: "Bright indirect; pale & floppy = needs more sun" },
      temperature:  { ideal: "55–80°F (13–27°C)", passing: "40–95°F; protect below 50°F outdoors" },
      humidity:     { ideal: "30–50% (low)", passing: "Tolerates any household humidity" },
      soilMoisture: { ideal: "Bone dry between deep waterings", passing: "Top of soil dry; pot feels light when ready" }
    },
    tips: {
      lighting: "BRIGHT light with 4–6+ hours of direct sun is ideal. A south or west window is best.\n\n• Pale, leggy, or floppy leaves = needs MORE light.\n• If moving outside, harden off slowly over 1–2 weeks to avoid sunburn (purplish or bleached leaves).\n• Sunstressed aloe develops a slight blush — this is normal and healthy in moderation.\n• Rotate 1/4 turn weekly so the rosette grows symmetrically.\n\n• In this home, 2F Living Room (215° SW — desert/succulent powerhouse) is the best match per PLANT_LIGHT_REF.",
      soil: "GRITTY cactus/succulent mix.\n\nRecipe:\n• 1 part cactus mix\n• 1 part coarse perlite\n• 1 part pumice or coarse sand\n\nTerracotta pot strongly recommended — it wicks moisture away from roots between waterings.",
      watering: "METHOD — strict soak-and-dry: Aloe vera stores water in thick leaves; overwatering + rot is the #1 killer (per University of Florida IFAS and The Spruce). Let soil dry COMPLETELY between deep waterings. Terracotta strongly recommended in Central Texas AC.\n\nHOW TO CHECK READINESS (your 8.5\" pot, 50/50 cacti mix + perlite):\n• Finger test: top 1–2\" completely dry = water.\n• Pot weight: the 8.5\" pot should feel noticeably light/hollow before watering.\n• Moisture meter: 1–2 throughout = water; 4+ = wait.\n• Plant tells: lower leaves wrinkling slightly = thirsty. Mushy/translucent leaves = overwatered.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 14–18 days in 2F LR (SW); AC dries pots fast despite outdoor humidity.\n• Peak summer (Jun–Sep): every 14–16 days — check weight, not calendar alone.\n• Mild winter (Nov–Feb): every 25–30 days or skip entirely if leaves stay plump — dormancy per The Spruce.\n• Drench until water runs from drainage holes; empty saucer immediately.\n• NEVER let the rosette sit in water — crown rot is fatal.\n• Don't water on hot afternoons — evening watering avoids leaf scorch from droplets magnifying sun.\n\nOVER- vs UNDER-watering tells:\n• Over: mushy/translucent/brown leaves, black roots, soil stays damp >2 weeks.\n• Under: thin wrinkled leaves curling inward, pot feels hollow-light, soil pulls from edges.",
      pruning: "Cut outer/lower leaves at the base with a clean sharp knife — these are the oldest and have the most gel.\n\n• Remove dead/damaged leaves anytime.\n• Don't prune more than 1/3 of the plant at once.\n• To harvest gel: slice off a mature outer leaf, stand it upright for 10 minutes to drain yellow aloin sap (can irritate skin), then slice off the green skin to expose the gel.",
      propagation: "Easiest from PUPS (offsets):\n\n• Wait until pups are 3\"+ with their own roots.\n• Twist or cut from the parent at the base.\n• Let callous 1–2 days in shade.\n• Plant in DRY succulent mix.\n• Wait 1 week before first light watering.\n\nLeaf cuttings RARELY work for aloe — don't waste effort.",
      repotting: "Every 2–3 years or when pups overcrowd the pot.\n\n• Spring is ideal.\n• Choose a pot only slightly larger — aloes don't like extra space.\n• Terracotta strongly preferred.\n• Let the plant settle for a week before watering after repotting (allows nicked roots to callus).",
      feeding: "LIGHT feeder.\n\n• Diluted (1/2 strength) cactus/succulent fertilizer once in early spring and once in mid-summer.\n• No feeding in fall or winter.\n• Over-fertilizing causes weak floppy growth.",
      troubleshooting: "• Mushy, translucent, or brown leaves → OVERWATERING / root rot (per IFAS). Unpot, cut rotten roots with sterilized scissors, dry 24–48 hrs, repot in dry 50/50 cacti/perlite; wait 1 week to water.\n• Wrinkled, thin leaves → underwatering. Water deeply once; leaves should plump within 24–48 hrs.\n• Brown or red tips → sunburn (too much sudden SW sun) or cold damage (<50°F).\n• Flat, splayed-out pale leaves → etiolation from low light; move to 2F LR (SW).\n• Leaves curling inward → severe drought stress — soak immediately.\n• Yellowing lower leaves + wet soil → overwatering; let dry fully, check roots.\n• White powder on leaves → harmless natural farina; DON'T wipe off.\n• Mealybugs (cottony spots in rosette) → #1 pest; dab with alcohol, neem weekly × 3.\n• Spider mites (fine webs, stippling) → rinse leaves; insecticidal soap in dry AC winter.\n• Fungus gnats → soil staying wet; reduce watering, sticky traps.\n• Scale (rare) → scrape, alcohol swab, horticultural oil.\n• Yellow latex (aloin) under leaf skin → strong laxative and skin irritant when harvesting gel — wear gloves (per IFAS).\n• ⚠️ Toxic per ASPCA — causes vomiting, diarrhea, lethargy in cats and dogs if ingested."
    },
    sources: [
      { label: "Missouri Botanical Garden — Aloe vera", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=287074" },
      { label: "University of Florida IFAS — Aloe", url: "https://edis.ifas.ufl.edu/publication/MG309" },
      { label: "RHS — Aloe vera", url: "https://www.rhs.org.uk/plants/91570/aloe-vera/details" },
      { label: "ASPCA — Aloe Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/aloe" },
      { label: "Texas A&M AgriLife — Aloe Vera Care", url: "https://aggie-horticulture.tamu.edu/" },
      { label: "Costa Farms — Aloe Vera Care Guide", url: "https://costafarms.com/plants/aloe-vera" },
      { label: "The Spruce — Aloe Vera Care Guide", url: "https://www.thespruce.com/grow-aloe-vera-1403153" }
    ]
  },

  mondo_grass: {
    id: "mondo_grass",
    repotSigns: [
      "Tuft is packed into a rectangular block-shape when viewed from the side (all growth going up, no room to fan out)",
      "Roots circling out of the 9\" × 9\" drainage holes",
      "Newest leaves brown at the tips even with adequate watering",
      "Water pours through in <5 seconds — dense root mat has replaced soil",
      "Tuft is visibly pushing up above the pot rim by an inch or more",
      "Growth stalls in growing season (Ophiopogon can double in size annually if not root-constrained)"
    ],
    displayName: "Mondo Grass",
    potSize: '9" × 9"',
    category: "ornamental_grass",
    names: {
      common: ["Mondo Grass", "Monkey Grass", "Dwarf Lilyturf", "Japanese Mondo Grass"],
      scientific: "Ophiopogon japonicus"
    },
    wateringDays: 10,
    wateringDaysHot: 8,
    wateringDaysCool: 14,
    currentSoilMix: "amended_potting",
    comments: "✅ Aug 2026: planted into a 9\" × 9\" (9\" depth) pot — roughly double the soil volume of the old 7.5\" round. Clemson HGIC (Liriope and Mondo Grass): keep evenly moist, never waterlogged; mondo is a moisture-lover that still rots in a stagnant deep core. Stretch the cadence vs. the 7.5\" pot and finger-test the top inch before watering. 70/30 potting/perlite.",
    idealSoil: ["standard_potting", "amended_potting", "african_violet"],
    soilNotes: "70/30 potting/perlite in a deep 9\" × 9\" square — extra perlite is now important because the 9\" depth holds a wet core longer than the old 7.5\". Confirm drainage holes aren't blocked; mondo hates a perched water table (Clemson HGIC).",
    conditions: {
      light:        { ideal: "Partial shade to bright indirect; morning sun OK", passing: "Full shade to filtered sun; afternoon direct sun bleaches" },
      temperature:  { ideal: "60–80°F (15–27°C)", passing: "Hardy outdoors USDA 7–10; indoors anything ≥50°F" },
      humidity:     { ideal: "50–60%", passing: "30%+; drier air thins foliage" },
      soilMoisture: { ideal: "Evenly moist", passing: "Top inch dry between waterings; never bone dry" }
    },
    tips: {
      lighting: "Versatile: partial shade to full sun outdoors, bright indirect indoors.\n\n• In hot direct sun the foliage may bleach — afternoon shade ideal.\n• Indoors, near an east or filtered south window works well.\n• In low light it survives but thins.\n\n• In this home, the 1F Living Room window (36° NE — soft bright indirect + gentle AM sun) is the best match per PLANT_LIGHT_REF.",
      soil: "Moisture-retentive but well-draining.\n\nRecipe: standard potting mix + 20% compost + 10% perlite.\nSlightly acidic to neutral (pH 5.5–6.5).\nMulch the top in larger pots to retain moisture.",
      watering: "METHOD — evenly moist (between steady-moisture and soak-and-dry): Ophiopogon japonicus likes consistent moisture but tolerates brief drying better than true tropicals. Never bone dry for long, never soggy.\n\nHOW TO CHECK READINESS (your 9\" × 9\" × 9\"-deep pot — Aug 2026 plant-up from 7.5\"):\n• Finger test: water when the top ~1\" feels dry. Probe toward the CENTER — a 9\" cube can stay wet in the core while the corners look dry (Clemson HGIC: even moisture, not a swamp).\n• Pot weight: this pot is heavy; learn the post-water vs. thirsty difference rather than guessing.\n• Moisture meter: 4–5 in the upper third = ideal; water at 3 or below. If the bottom third reads 7+ while the top is dry, wait and improve drainage/airflow.\n• Plant tells: brown tips on newest blades, thinning/clumping center, or blades folding slightly = thirsty. Yellow centers + wet soil = too much.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC):\n• Hot AC season (Apr–Oct): every 8–10 days — the 9\" reservoir holds longer than the 7.5\".\n• Peak summer (Jun–Sep): every 8 days at 1F Window (NE); 9–10 days in humid 1F Bath.\n• Mild winter (Nov–Feb): every 12–14 days.\n• Avoid 2F SW — afternoon heat + low humidity browns tips fast (Clemson: part shade).\n\nBOTTOM-WATERING: helpful for even moisture in a dense tuft — soak tray 20–30 min, drain fully. Don't leave the 9\" cube sitting in a saucer.\n\nWATER QUALITY: moderately tolerant of tap water; flush with plain water every 2–3 months to prevent salt buildup (brown tips). Filtered water helps in hard-water Central Texas areas.\n\nOVER- vs UNDER-watering tells:\n• Over: yellowing centers of blades, mushy base, sour smell, fungus gnats.\n• Under: brown crispy tips, thinning clump, soil pulling from pot edges.",
      pruning: "Shear back to 2–3\" tall once a year in EARLY SPRING to refresh foliage and remove brown tips. New blades emerge cleaner and brighter green.\n\n• Trim any individual brown blades at any time at the base.\n• Use sharp scissors or pruning snips.",
      propagation: "Easiest by DIVISION.\n\n• Lift the clump (or unpot), gently pull or cut into smaller plugs, each with roots + 3–5 blades.\n• Replant immediately and water in.\n• Best in early spring; success rate ~95%.\n• Single plant divides into 4–6 new pots easily.",
      repotting: "Every 2–3 years or when rootbound.\n\n• Divide while repotting — the plant rejuvenates from division (Clemson HGIC).\n• You just moved into a 9\" × 9\" cube (Aug 2026) — do NOT upsize again soon; mondo likes a filled clump more than empty wet corners.\n• Refresh soil completely at the next divide (likely 2–3 years).",
      feeding: "LIGHT feeder.\n\n• Balanced slow-release fertilizer (e.g. Osmocote) in spring.\n• Or liquid 10-10-10 at half strength every 6–8 weeks during the growing season.\n• None in winter.",
      troubleshooting: "• Browning tips/edges → underwatering, salt/fluoride buildup, or hot dry air (Central Texas AC or 2F SW exposure) — flush soil, increase frequency, move to 1F Window (NE).\n• Yellow centers of blades → overwatering or poor drainage — let top 1\" dry, check roots.\n• Yellowing entire blades (multiple) → overwatering rot OR extreme drought — check soil moisture first.\n• Drooping/wilting tuft → dry soil = water; wet soil = root issue.\n• Leaf drop (individual brown blades) → normal aging at base OR underwatering stress — trim at soil line.\n• Thinning clump / sparse growth → divide and refresh soil, or increase light slightly.\n• Faded/bleached blades → too much direct sun — move off SW windows.\n• Root rot (mushy roots, sour soil) → unpot, trim rot, repot in fresh 70/30 mix.\n• Spider mites (fine webs, stippled blades in dry indoor air) → rinse thoroughly, insecticidal soap weekly × 3.\n• Mealybugs (rare on grass-like foliage) → alcohol swab.\n• Scale (bumps on base) → scrape, alcohol, horticultural oil.\n• Fungus gnats → let surface dry slightly; sticky traps.\n• Slugs/snails (outdoors only in Central Texas) → handpick or iron phosphate bait.\n• White/black fungal spots → reduce wetting foliage, improve airflow.\n• ✅ Non-toxic — Ophiopogon japonicus is not listed as toxic by ASPCA (no dedicated entry; safe for pets in standard references).",
    },
    sources: [
      { label: "Missouri Botanical Garden — Ophiopogon japonicus", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=283139" },
      { label: "NC State Extension — Ophiopogon japonicus", url: "https://plants.ces.ncsu.edu/plants/ophiopogon-japonicus/" },
      { label: "Clemson Cooperative Extension — Liriope and Mondo Grass", url: "https://hgic.clemson.edu/factsheet/liriope-mondo-grass/" },
      { label: "RHS — Ophiopogon japonicus", url: "https://www.rhs.org.uk/plants/search-results?query=ophiopogon+japonicus" },
      { label: "University of Florida IFAS — Mondo Grass", url: "https://edis.ifas.ufl.edu/" },
      { label: "Texas A&M AgriLife — Mondo Grass", url: "https://aggie-horticulture.tamu.edu/" },
      { label: "The Spruce — Mondo Grass Growing Guide", url: "https://www.thespruce.com/dwarf-mondo-grass-7486903" }
    ]
  },

  firestick: {
    id: "firestick",
    repotSigns: [
      "Roots circling out of the 4\" drainage holes",
      "New stem tips growing thinner/wispier than mature branches",
      "Stems lean strongly to one side (light + root constraint stacking)",
      "Base of the pot feels heavy but new stem color (the trademark red tips) fades to plain green",
      "Pot dries out in half the time it used to",
      "⚠️ Softening at the very base of any stem near soil line — check for rot FIRST before assuming it's a repot signal"
    ],
    displayName: "Firestick / Candle Stick",
    potSize: '4"',
    category: "succulent",
    names: {
      common: ["Firestick", "Candle Stick", "Pencil Cactus (misnomer — not a cactus)", "Sticks on Fire", "Indian Tree Spurge", "Milkbush"],
      scientific: "Euphorbia tirucalli 'Sticks on Fire' (also sold as 'Rosea')"
    },
    wateringDays: 18,
    wateringDaysHot: 12,
    wateringDaysCool: 40,
    currentSoilMix: "cactus_mix",
    comments: "✅ Aug 2026: moved OUTDOORS on the same 301° NW exposure as 2F Room 2 (late-afternoon/evening summer sun). Still in the 4\" pot, 50/50 cacti mix / perlite. Missouri Botanical Garden + NC State: full sun for color, but in hot summers this species appreciates some afternoon shade — the NW patio's late beam is a better match than all-day SW blast IF you acclimate 7–14 days. Bring inside before nights ~50°F (typically late Oct in Pflugerville). ⚠️ Caustic latex + Moose: keep the pot where a dog cannot brush or chew it. Dump saucers after thunderstorms — rot from sitting wet is the #1 killer.",
    idealSoil: ["cactus_mix"],
    soilNotes: "User's 50/50 cacti mix + perlite is textbook. Euphorbias need this kind of fast-draining mix — root rot is the only real way to kill them.",
    conditions: {
      light:        { ideal: "FULL SUN — 6+ hrs direct daily", passing: "Bright direct; less light = no color, leggy growth" },
      temperature:  { ideal: "65–85°F (18–29°C)", passing: "50–100°F; below 50°F causes damage; bring indoors" },
      humidity:     { ideal: "Low — 30–40%", passing: "Tolerates 20–60%; very flexible" },
      soilMoisture: { ideal: "Bone dry; stems just slightly wrinkling = water", passing: "Bone dry → soak → repeat" }
    },
    tips: {
      lighting: "FULL SUN is essential for the orange/red coloration. 6+ hours of direct sun.\n\n• CURRENT (Aug 2026): outdoors on the 301° NW side (same compass as 2F Room 2). Late-day summer sun + bright sky — not as many direct hours as 2F SW (215°), but enough to push color vs. indoor life.\n• NC State / Missouri Botanical Garden: in hot summers this species often wants some afternoon shade. If stems bleach white/yellow, pull it into light shade for the 3–6 pm blast, then return to the NW beam.\n• Acclimate 7–14 days (an hour more sun each day) — a sudden indoor→patio move sunburns even sun-lovers.\n• Bring indoors to 2F Living Room (215° SW) before nights approach 50°F; Pflugerville is USDA 8b/9a, not hardy (MBG: zones 11–12).\n• Indoors, south or west window; supplement with a grow light if color fades.\n• ⚠️ Toxic latex — site the pot out of Moose's path.",
      soil: "Very GRITTY, fast-draining succulent/cactus mix.\n\nRecipe:\n• 1 part cactus mix\n• 1 part pumice\n• 1 part coarse sand or 1/4\" lava rock\n\nTerracotta strongly recommended.",
      watering: "METHOD — strict soak-and-dry, err dry: Euphorbia tirucalli stores water in pencil-thin stems; overwatering = rapid rot (per The Spruce and Missouri Botanical Garden). Wait until soil is bone dry AND stems show slight wrinkling.\n\nHOW TO CHECK READINESS (your 4\" pot, 50/50 cacti mix + perlite, NOW OUTDOORS NW):\n• Finger test: soil completely dry 2\" down = check stems.\n• Pot weight: 4\" pot feels hollow-light = likely ready. Outdoor wind/heat dries this tiny pot much faster than indoor AC.\n• Stem plumpness: slight wrinkling on newest tips = thirsty; plump firm stems = wait.\n• After rain: dump the saucer the same day. Do not count a storm as a 'good watering' if the pot sat flooded.\n\nCENTRAL TEXAS CADENCE:\n• Outdoor peak summer (Jun–Sep, current): every 10–14 days, but CHECK weekly — a 4\" pot in 100°F wind can dry in under a week.\n• Indoor AC (when you bring it in): every 18–24 days in 2F LR SW.\n• Mild winter indoors (Nov–Feb): every 35–40 days — near-zero water; cool temps intensify red coloration.\n• Drench at soil line ONLY — never pour over stems (sap + rot risk).\n• Empty saucer immediately; never leave standing water.\n\nOVER- vs UNDER-watering tells:\n• Over: soft/mushy/blackened stem base, stems turning black from bottom up.\n• Under: yellow/shriveled tips, stems feel papery and deeply wrinkled.",
      pruning: "⚠️ TOXIC: This plant exudes a milky white LATEX SAP that is severely irritating to skin and eyes — temporary blindness is possible if it contacts eyes.\n\n• ALWAYS wear nitrile gloves AND eye protection.\n• Prune in warm dry weather; rinse cuts with cold water to seal sap.\n• Cut stems with sharp clean shears just above a branching point.\n• Keep pets and children far away during pruning.\n• Wash tools, hands, and any contaminated surfaces immediately.",
      propagation: "Stem cuttings (with all toxicity precautions):\n\n• Take 4–6\" cuttings.\n• RINSE the cut end with cold water to stop sap flow.\n• Let callus for 5–7 days in shade.\n• Plant in dry gritty mix.\n• Don't water for 2 weeks.\n• Roots in 4–6 weeks. Success rate ~80% if dry.\n• Wear gloves the entire time.",
      repotting: "Every 3–4 years.\n\n• Spring only (active growth).\n• Wear gloves and protect skin/eyes.\n• Up-pot by 1\" only.\n• Let plant settle a week before watering.\n• Top-heavy plants benefit from a heavier terracotta pot or stone weight in the bottom.",
      feeding: "VERY light feeder.\n\n• Cactus fertilizer at QUARTER strength once in spring and once in mid-summer.\n• No fall/winter feeding.\n• Excess fertilizer reduces the red/orange coloration.",
      troubleshooting: "• Soft, mushy, or blackened stems → OVERWATERING / rot (#1 killer per The Spruce). Cut above healthy tissue with clean shears (⚠️ WEAR NITRILE GLOVES + EYE PROTECTION — caustic latex sap). Rinse cut with cold water to seal sap; let callus 5–7 days; root in dry mix.\n• Stems all green, no orange/red color → insufficient direct sun; move to 2F LR (SW) or add grow light 12 hrs/day.\n• Leggy thin stems reaching toward window → etiolation; increase light gradually.\n• Yellow or shriveled tips → severe drought; water deeply once at soil line.\n• Sunscald (white/yellow patches) → acclimate slowly when moving to full SW sun.\n• Mealybugs (cottony clusters on stems) → dab with alcohol; WEAR GLOVES — sap exposure risk during handling.\n• Spider mites (rare, fine webbing) → rinse stems; insecticidal soap.\n• Falling over → top-heavy; use deeper terracotta pot or stake.\n• ⚠️ SAP EXPOSURE — milky latex is severely caustic (per UC ANR and ASPCA): EYES → flush 15+ min, seek emergency care immediately. SKIN → wash with soap and water; sap can cause temporary blindness. Never touch face during/after handling.\n• ⚠️ Toxic per ASPCA — all parts toxic to pets; causes oral irritation, vomiting, diarrhea. Keep far from children and pets."
    },
    sources: [
      { label: "Missouri Botanical Garden — Euphorbia tirucalli", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=287581" },
      { label: "University of California ANR — Euphorbia toxicity warning", url: "https://ucanr.edu/blogs/blogcore/postdetail.cfm?postnum=24622" },
      { label: "World of Succulents — Firestick", url: "https://worldofsucculents.com/euphorbia-tirucalli-firestick/" },
      { label: "RHS — Euphorbia tirucalli", url: "https://www.rhs.org.uk/plants/search-results?query=euphorbia+tirucalli" },
      { label: "ASPCA — Euphorbia Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/pencil-cactus" },
      { label: "University of Arizona Extension — Cacti and Succulents", url: "https://extension.arizona.edu/" },
      { label: "The Spruce — Pencil Cactus (Firestick) Care", url: "https://www.thespruce.com/grow-pencil-cactus-inside-1902984" }
    ]
  },

  schefflera: {
    id: "schefflera",
    repotSigns: [
      "Roots circling out of the 13.5\" pot drainage holes",
      "New umbrella leaflets have FEWER palm-fingers than mature ones (young growth = 4–5 fingers; healthy mature = 9+)",
      "New leaves smaller than previous flush",
      "Water beads on the surface and takes 30+ seconds to soak in (hydrophobic soil)",
      "Yellow lower leaves persistent (not related to a recent watering event)",
      "Plant leans over easily — top-heavy for the rootball anchor"
    ],
    displayName: "Schefflera (Variegated Yellow)",
    potSize: '13.5"',
    repotted: true,
    category: "tropical",
    names: {
      common: ["Schefflera (Yellow Variegated)", "Variegated Hawaiian Umbrella Plant", "Schefflera 'Gold Capella'", "Schefflera 'Trinette'"],
      scientific: "Schefflera arboricola (variegated cultivar — likely 'Gold Capella' or 'Trinette')"
    },
    wateringDays: 12,
    wateringDaysHot: 10,
    wateringDaysCool: 16,
    currentSoilMix: "amended_potting",
    comments: "✅ Aug 2026: repotted from 9\" → 13.5\" (same dimension as the Monstera). ⚠️ That is a ~4.5\" jump — Clemson HGIC indoor transplanting + Schefflera guides recommend only 1–2\" larger to avoid a wet unused soil mass. Compensate: water LESS often, check 2–3\" deep, never leave a saucer. Expect 2–4 weeks of leaf-drop sulk (normal). Confirm mix is well-draining (60/40 potting/perlite or similar). Variegated cultivars still need more light than the dark-green form to keep gold pattern.",
    idealSoil: ["standard_potting", "amended_potting", "aroid_mix"],
    soilNotes: "✅ Freshly in a 13.5\" pot (Aug 2026). The oversized jump is the main risk — unused outer soil stays wet while the old 9\" rootball dries. Water only when the MID-zone (2–3\") is dry, not when the surface crust looks dry. Next cycle: top-dress yearly rather than upsizing again (Clemson: large containers are top-dressed, not endlessly up-potted).",
    conditions: {
      light:        { ideal: "Bright, indirect with 1–2 hrs gentle direct sun",    passing: "Medium indirect; tolerates lower light but grows leggy & loses variegation" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                  passing: "60–90°F; protect from cold drafts under 55°F" },
      humidity:     { ideal: "50–60%",                                             passing: "40%+; tolerates average household humidity" },
      soilMoisture: { ideal: "Top 1–2\" dry between deep waterings",               passing: "Slightly drought-tolerant; never sit in water" }
    },
    tips: {
      lighting: "Bright, INDIRECT light is ideal — produces the densest, most variegated growth. A few hours of GENTLE morning direct sun (east window) is great; afternoon direct sun can scorch leaves.\n\n• Tolerates medium indirect light but stems get leggy and lower leaves drop.\n• Variegated varieties (gold-splash) need MORE light than solid green to keep their pattern.\n• Rotate the pot 1/4 turn every 1–2 weeks for even growth.\n• Move outdoors to dappled shade in summer if desired — acclimate over 2 weeks to avoid sunburn.\n\n• In this home, the 1F Living Room corner and 2F NW rooms (298°/301°) are your best matches per PLANT_LIGHT_REF.",
      soil: "Standard well-draining indoor potting mix with extra drainage.\n\nRecipe:\n• 3 parts standard potting mix\n• 1 part perlite\n• 1 part orchid bark or coco coir chunks\n\nSlightly acidic (pH 6.0–6.5). A 10\" pot benefits from a 1\" gravel layer at the bottom if drainage is borderline.",
      watering: "METHOD — soak-and-dry: Schefflera arboricola prefers the top 1–2\" to dry between deep waterings. It stores some moisture in woody stems but #1 killer is wet unused soil after an oversized repot (Clemson HGIC: choose a pot only 1–2\" larger — you jumped 9\" → 13.5\").\n\nHOW TO CHECK READINESS (your 13.5\" pot — Aug 2026, same size as Monstera):\n• Finger/chopstick test: 2–3\" deep must be dry. A dry crust over a wet outer ring is the overpot trap.\n• Pot weight: this is now a heavy pot; compare 24 hrs after a soak vs. thirsty.\n• Moisture meter: 3–4 in the MID-zone = water; 6+ in the outer soil = wait even if the old rootball feels dry.\n• Plant tells: drooping + dry mid-zone = thirsty. Mass leaf drop + wet soil = overwatered / post-repot sulk — do not 'help' with more water.\n\n⚠️ POST-REPOT (next 3–4 weeks): water lightly once to settle, then wait longer than the old 9\" cadence. No fertilizer 4–6 weeks.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC):\n• Hot AC season (Apr–Oct): every 10–12 days — bigger reservoir dries slower.\n• Peak summer (Jun–Sep): every 10 days in 1F Corner; 11–12 in NW rooms.\n• Mild winter (Nov–Feb): every 14–16 days.\n\nBOTTOM-WATERING: skip on a 13.5\" overpot — it wets the unused outer soil first. Top-water slowly until a little runoff, then empty the saucer.\n\nWATER QUALITY: moderately tap-tolerant; flush every 2–3 months (brown edges = salts, per NC State Extension).\n\nOVER- vs UNDER-watering tells:\n• Over (#1 now): sudden mass leaf drop with yellowing, sour smell, fungus gnats in a pot that never used to gnat.\n• Under: black/crispy tips first, then leaf drop with browning (not yellow), lighter pot.",
      pruning: "Schefflera tolerates aggressive pruning — one of the easiest houseplants to shape.\n\n• Cut just ABOVE a leaf node with sharp clean shears.\n• Trim leggy stems back by 1/3 to 1/2 in early spring to encourage bushier, denser growth.\n• Pinch new growth tips weekly during the growing season to build density.\n• Remove dead/yellow leaves at the petiole anytime.\n• ⚠️ Sap is mildly irritating — wear gloves if you're sensitive; wipe shears with alcohol between cuts.\n• Don't remove more than 1/3 of total foliage at once.",
      propagation: "STEM CUTTINGS are by far the easiest method.\n\n• Take a 4–6\" cutting with 3–4 leaves from a healthy stem, just below a node.\n• Strip the bottom 2 leaves.\n• Dip the cut end in rooting hormone (IBA powder).\n• Insert into moist perlite/peat mix OR a glass of water.\n• Cover loosely with a plastic bag to maintain humidity.\n• Roots in 4–8 weeks. Success rate ~70% with rooting hormone, ~40% without.\n• Best time: spring/early summer.\n• Air-layering also works well for thicker stems.",
      repotting: "Every 2–3 years or when roots circle the pot.\n\n• You just jumped to 13.5\" (Aug 2026) — that is terminal indoor size for this home. Next: TOP-DRESS yearly (scoop top 2\", replace with fresh mix) rather than another upsize (Clemson HGIC topdressing for large containers).\n• Spring (March–May) is still the ideal season; you did it in August — extra-conservative watering until new growth resumes.\n• Don't fertilize for 4–6 weeks after to let nicked roots heal.",
      feeding: "Balanced liquid fertilizer (10-10-10 or 20-20-20) at HALF strength every 4 weeks during spring and summer.\n\n• Slow-release granular (Osmocote) in spring as an easy alternative — one application lasts 3–4 months.\n• Reduce to once every 8 weeks in fall.\n• NONE in winter unless growing strongly under grow lights.\n• Flush soil with plain water every 2–3 months to clear fertilizer salts (brown leaf edges = salt buildup).",
      troubleshooting: "• Sudden mass leaf drop → #1 cause is OVERWATERING (per Missouri Botanical Garden and NC State Extension) — especially with the peat-heavy original soil. Check roots: black/mushy = rot; repot into 60/40 amended mix at next opportunity. Also triggered by sudden light/move changes.\n• Yellow leaves with brown tips → inconsistent watering — establish a finger-test routine.\n• Black/brown tips only → underwatering OR low humidity (Central Texas AC) OR salt buildup — flush soil, increase humidity near 50%.\n• Drooping/wilting → dry top 2\" = water; wet soil = hold off, inspect roots.\n• Leaf drop (gradual, lower leaves) → normal aging OR underwatering — distinguish by tip color (brown = dry, yellow = wet).\n• Leggy growth, sparse umbrella leaflets → insufficient light — move to 1F Corner or NW room window.\n• Loss of gold variegation → needs more light than solid-green form.\n• Faded/scorched leaflets → too much direct afternoon sun (avoid 2F SW).\n• Root rot (mushy roots, sour soil) → unpot, trim rot, repot in amended mix, reduce watering 2 weeks.\n• Sticky residue on leaves/floor → SCALE on stems — alcohol swab, horticultural oil.\n• Fine webs between leaflets → SPIDER MITES in dry AC air — rinse, insecticidal soap weekly × 3.\n• White cottony spots in joints → MEALYBUGS — alcohol Q-tip.\n• Thrips (silvery streaks on new growth) → rinse, sticky traps, spinosad.\n• Fungus gnats → peat core staying too wet — let top 2\" dry; sticky traps.\n• Aphids (rare, on new shoots) → rinse, insecticidal soap.\n• ⚠️ Toxic to cats, dogs, and humans — insoluble calcium oxalate crystals per ASPCA (Schefflera).",
    },
    sources: [
      { label: "Missouri Botanical Garden — Schefflera arboricola", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275203" },
      { label: "University of Florida IFAS — Dwarf Schefflera", url: "https://edis.ifas.ufl.edu/publication/FP522" },
      { label: "RHS — Schefflera arboricola", url: "https://www.rhs.org.uk/plants/search-results?query=schefflera+arboricola" },
      { label: "The Sill — Schefflera Care Guide", url: "https://www.thesill.com/blog/plant-care" },
      { label: "ASPCA — Schefflera Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/schefflera" },
      { label: "Costa Farms — Schefflera Care", url: "https://costafarms.com/plants/schefflera" },
      { label: "NC State Extension — Schefflera arboricola", url: "https://plants.ces.ncsu.edu/plants/schefflera-arboricola/" },
      { label: "Clemson HGIC — Indoor Plants: Transplanting & Repotting", url: "https://hgic.clemson.edu/factsheet/indoor-plants-transplanting-repotting/" }
    ]
  },

  schefflera_dark: {
    id: "schefflera_dark",
    repotSigns: [
      "Roots circling out of the 5.5\" drainage holes",
      "New leaflet count drops (mature = 9+ fingers per umbrella; new growth <7 = stress)",
      "New leaves smaller than the previous flush",
      "Water drains straight through — no absorbency",
      "Yellowing lower leaves not caused by a recent over/underwatering",
      "Plant top-heavy relative to the 5.5\" pot"
    ],
    displayName: "Schefflera (Dark Green)",
    potSize: '5.5"',
    category: "tropical",
    names: {
      common: ["Schefflera (Dark Green)", "Dwarf Umbrella Tree", "Hawaiian Umbrella Plant"],
      scientific: "Schefflera arboricola (solid-green form)"
    },
    wateringDays: 7,
    wateringDaysHot: 5,
    wateringDaysCool: 10,
    currentSoilMix: "amended_potting",
    comments: "Repotted in last 2 months. Dark green leaves (non-variegated). Soil is 60/40 potting/perlite — well-amended. 5.5\" pot, so dries faster than the larger variegated specimen.",
    idealSoil: ["standard_potting", "amended_potting", "aroid_mix"],
    soilNotes: "User's 60/40 potting/perlite is a great drainage-amended blend — well-suited for a smaller schefflera pot. The 5.5\" pot dries quickly enough that the perlite boost prevents root rot without starving the plant.",
    conditions: {
      light:        { ideal: "Bright, indirect; some morning direct sun OK",         passing: "Medium indirect; solid-green form tolerates lower light than variegated" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                    passing: "60–90°F; protect below 55°F" },
      humidity:     { ideal: "50–60%",                                               passing: "40%+; tolerates household humidity" },
      soilMoisture: { ideal: "Top 1\" dries between deep waterings",                 passing: "Slightly drought-tolerant for short stretches" }
    },
    tips: {
      lighting: "Solid-green Schefflera is MORE TOLERANT of medium light than the variegated form — it can handle north-facing windows and dimmer corners while still growing well.\n\n• Bright indirect is still optimal — the plant will be denser and bushier.\n• Rotate weekly for even growth.\n• Leaf drop after a move is usually a light-shock reaction, not a watering problem. Give 2–4 weeks to adjust before changing anything else.\n\n• In this home, the 1F Living Room corner and 1F Room 1 (131° SE + fan) are your best matches per PLANT_LIGHT_REF.",
      soil: "User has it in 60/40 potting/perlite, which is ideal. See the soilNotes field on the Soil Mix tab for context. Avoid pure cactus mix and avoid moisture-retentive mixes (African violet, sphagnum) — both extremes cause problems.",
      watering: "METHOD — soak-and-dry: Solid-green Schefflera arboricola in your well-amended 60/40 mix dries faster than the 13.5\" variegated cousin — let the top 1\" dry fully before a deep drench.\n\nHOW TO CHECK READINESS (your 5.5\" pot):\n• Finger test: top 1\" dry = water — the smaller pot means faster dry-down than the 13.5\" specimen.\n• Pot weight: 5.5\" pot feels light and hollow when thirsty.\n• Moisture meter: 3 in upper third = water.\n• Plant tells: drooping + dry soil = thirsty. Mass leaf drop + wet soil = overwatered.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC):\n• Hot AC season (Apr–Oct): every 5–7 days in 1F Room 1 (overhead fan accelerates drying).\n• Peak summer (Jun–Sep): every 5 days — check daily during heat waves.\n• Mild winter (Nov–Feb): every 9–11 days.\n• 1F Corner (vaulted, harder to raise humidity) is fine — this form tolerates average humidity better than variegated.\n\nBOTTOM-WATERING: optional for 5.5\" — top-water until runoff is simpler for a shallow root zone.\n\nWATER QUALITY: tap water at room temp is fine; flush every 2–3 months to prevent salt crust (brown tips). Filtered water optional.\n\nOVER- vs UNDER-watering tells:\n• Over: yellow leaves dropping in clusters, mushy stems, wet soil smell.\n• Under: crispy black tips, drooping with dry top 1\", slower new leaflet production.",
      pruning: "Same as the variegated form — Schefflera tolerates aggressive pruning beautifully.\n\n• Cut just above a node with sharp clean shears.\n• Pinch new growth tips weekly to build density.\n• ⚠️ Mildly irritating sap — wear gloves if sensitive.\n• Don't remove more than 1/3 of foliage at once.",
      propagation: "Stem cuttings root reliably in late spring / early summer.\n\n• 4–6\" cutting with 3–4 leaves, just below a node.\n• Dip in rooting hormone.\n• Insert in moist perlite or in water (success ~70% with hormone, ~40% without).\n• Roots in 4–8 weeks.\n• Air-layering is also effective for thicker stems.",
      repotting: "Every 2–3 years or when roots circle the pot.\n\n• Spring is best.\n• Up-pot by only 2\" at a time.\n• Schefflera prefers slightly snug roots.\n• Don't fertilize for 4–6 weeks after repotting.",
      feeding: "Balanced liquid fertilizer (10-10-10 or 20-20-20) at HALF strength every 4 weeks spring/summer.\n\n• Reduce to every 8 weeks in fall.\n• None in winter unless growing under lights.\n• Flush soil with plain water every 2–3 months to clear salts.",
      troubleshooting: "• Sudden mass leaf drop → OVERWATERING is #1 (per ASPCA/NC State guidance on Schefflera) — check roots for black/mushy rot. Also light shock after a move (give 2–4 weeks).\n• Yellow leaves with brown tips → inconsistent watering — the 5.5\" pot needs more frequent checks than larger houseplants.\n• Black/brown tips only → underwatering or low humidity (Central Texas AC ~30–45%) — increase water or humidity.\n• Drooping/wilting → dry top 1\" = water now; wet soil = root rot check.\n• Leaf drop (lower leaves, gradual) → normal aging OR underwatering — pluck yellowed leaves at petiole.\n• Leggy sparse growth → not enough light — move toward 1F Corner or 1F Room 1 window.\n• Faded/scorched leaflets → too much direct sun — avoid 2F SW afternoon beam.\n• Root rot (mushy roots) → unpot, trim, repot in fresh 60/40 mix.\n• Spider mites (fine webs, stippling) → rinse, insecticidal soap weekly in dry AC air.\n• Scale (sticky residue, bumps on stems) → alcohol swab, horticultural oil.\n• Mealybugs (cottony white clusters) → alcohol Q-tip.\n• Thrips → rinse, sticky traps, spinosad.\n• Fungus gnats → let top 1\" dry between waterings.\n• Aphids (on new shoots) → rinse, insecticidal soap.\n• ⚠️ Toxic to cats, dogs, and humans — insoluble calcium oxalate crystals per ASPCA (Schefflera).",
    },
    sources: [
      { label: "Missouri Botanical Garden — Schefflera arboricola", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275203" },
      { label: "University of Florida IFAS — Dwarf Schefflera", url: "https://edis.ifas.ufl.edu/publication/FP522" },
      { label: "RHS — Schefflera arboricola", url: "https://www.rhs.org.uk/plants/search-results?query=schefflera+arboricola" },
      { label: "Costa Farms — Schefflera Care", url: "https://costafarms.com/plants/schefflera" },
      { label: "ASPCA — Schefflera Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/schefflera" },
      { label: "NC State Extension — Schefflera arboricola", url: "https://plants.ces.ncsu.edu/plants/schefflera-arboricola/" }
    ]
  },

  mini_orchid: {
    id: "mini_orchid",
    repotSigns: [
      "Bark medium is completely broken down — feels mushy/spongy instead of chunky",
      "Aerial roots crawling far outside the 3.5\" pot (not just poking out — actively roaming)",
      "New bloom spike doesn't emerge despite fresh vegetative growth in a full cycle",
      "Pot feels persistently damp for 10+ days after watering (broken-down bark holds too much water)",
      "Roots at the bottom of the pot are BROWN or hollow instead of green/silver",
      "Root mass has visibly filled the clear pot — no bark visible from the outside"
    ],
    displayName: "Mini Orchid",
    potSize: '3.5"',
    category: "tropical",
    names: {
      common: ["Mini Orchid", "Miniature Orchid", "Mini Moth Orchid", "Mini Phal"],
      scientific: "Most commonly Phalaenopsis spp. (mini-Phal hybrids). Other minis sold at this size: Dendrobium spp., Oncidium 'Twinkle', miniature Cattleya, mini Cymbidium"
    },
    wateringDays: 7,
    wateringDaysHot: 5,
    wateringDaysCool: 10,
    currentSoilMix: "orchid_bark",
    comments: "Repotted in last 2 months into 100% orchid bark, 3.5\" pot — textbook setup. Since you're in pure bark (not moss), watering should be every 5–7 days during warm months. Soak-and-drain method recommended.",
    idealSoil: ["orchid_bark", "sphagnum_moss"],
    soilNotes: "User has 100% orchid bark — ideal for mini Phals. Bark dries faster than the sphagnum moss most retail orchids come in, so the 5–7 day warm-season interval applies (not the 10–14d that moss-grown orchids need).",
    conditions: {
      light:        { ideal: "Bright, indirect (east window); 1–2 hrs gentle morning sun OK",   passing: "Medium indirect; tolerates fluorescent/grow lights" },
      temperature:  { ideal: "Day 70–80°F (21–27°C), night 60–65°F (16–18°C)",                  passing: "60–85°F; a 10–15°F drop at night triggers blooming" },
      humidity:     { ideal: "50–70% (humidifier or pebble tray helps)",                        passing: "40%+; tolerates household humidity but blooms last shorter" },
      soilMoisture: { ideal: "Bark medium dries between waterings; roots silver-gray ⇒ water",  passing: "Sphagnum-moss minis hold water 2x longer — adjust schedule down" }
    },
    tips: {
      lighting: "Bright, INDIRECT light is critical for blooming — direct afternoon sun will scorch leaves.\n\n• EAST-facing window is ideal: gentle morning sun + bright indirect the rest of the day.\n• South/west windows: place 2–3 feet back or use a sheer curtain.\n• Leaf color is your light-meter: bright olive-green = ideal; dark forest-green = too low (won't rebloom); yellow/red-tinged = too much.\n• In winter, supplement with a grow light (~12 hrs/day) if your windows get under 4 hrs of bright indirect.\n• Most 3\" mini Phals will rebloom annually with proper light + a cool-night trigger (see Troubleshooting).\n\n• In this home, the 1F Bathroom (127° SE, shower humidity, set back from direct beam) is the best match per PLANT_LIGHT_REF.",
      soil: "NEVER use regular potting soil — orchid roots need air or they suffocate and rot.\n\nTwo common media (mini orchids are often sold in one OR the other — identify yours first):\n\n• **Bark mix** (chunky fir bark + perlite + charcoal) — dries fast (~7 days), forgives overwatering. Re-water when bark feels dry 1\" down.\n• **Sphagnum moss** — holds water 2–3x longer than bark; only water when surface is dry to the touch (~10–14 days). Most retail mini Phals come in moss.\n\nFor a 3\" pot, a clear plastic orchid pot is ideal — lets you see root color (silver=dry, green=wet) and lets light reach photosynthetic roots.",
      watering: "METHOD — soak-and-drain (NOT steady-moisture): Mini Phalaenopsis in 100% orchid bark needs the medium to dry between soakings — roots must breathe. Overwatering is the #1 killer (per American Orchid Society).\n\nHOW TO CHECK READINESS (your 3.5\" pot, 100% bark):\n• Root color (clear pot ideal): silvery-gray/white roots = dry, time to soak; bright green roots = still hydrated, wait.\n• Bark feel: top bark dry and lightweight = water; cool/damp bark below surface = wait.\n• Pot weight: light as a feather = soak time.\n• Plant tells: slightly wrinkled/leathery leaves WITH silver roots = thirsty. Wrinkled leaves WITH green roots = root rot (not thirst).\n\nCENTRAL TEXAS CADENCE (Pflugerville — note: Pflugerville/Austin area, indoor AC):\n• Hot AC season (Apr–Oct): every 5–7 days in 1F Bath; bark dries faster than moss.\n• Peak summer (Jun–Sep): every 5 days — AC + small 3.5\" pot = fast dry-down.\n• Mild winter (Nov–Feb): every 9–12 days — cooler nights in 1F Bath help trigger rebloom.\n• Avoid 2F SW — too hot/dry for orchids; NW rooms OK but supplement humidity.\n\nSOAK METHOD (recommended): submerge inner pot in room-temp water 10–15 min, drain 5 min, return to decorative pot. Never let standing water in the outer pot.\n\nBOTTOM-WATERING: same as soak method — essential for mini orchids to avoid crown rot from overhead watering.\n\nWATER QUALITY: room-temp filtered or tap water left 24 hrs; flush with plain water monthly to clear fertilizer salts (brown leaf tips). Orchids are moderately fluoride-sensitive — filtered preferred in Central Texas.\n\nOVER- vs UNDER-watering tells:\n• Over: yellow leaves (multiple), mushy brown roots, crown rot (mushy center), persistent damp bark smell.\n• Under: silvery roots + slightly wrinkled leaves — recovers within hours of soaking.",
      pruning: "Mini orchids need almost no pruning beyond spent flowers and dead roots.\n\n• **Flower spike** after all blooms drop (Phalaenopsis only):\n  - Cut just ABOVE the 2nd or 3rd node from the base → encourages a side spike with new blooms in 6–10 weeks.\n  - OR cut all the way to the base if the spike turns brown/yellow → plant invests in new growth instead.\n• **Other genera** (Dendrobium, Oncidium, Cattleya): cut spent spikes at the base — they don't rebloom on old spikes.\n• Trim dead/black roots when repotting only (see Repotting). Don't remove silver-gray aerial roots — they're alive and absorb humidity.\n• Wipe shears with rubbing alcohol between cuts to prevent virus transmission (orchids are virus-susceptible).",
      propagation: "DIFFICULT for home growers — orchids are mostly propagated commercially via tissue culture.\n\nHome-feasible methods:\n• **Keiki separation** (Phalaenopsis): occasionally a baby plantlet (\"keiki\") forms on the flower spike. Wait until it has 3+ leaves AND 2–3 roots of 2\"+ length. Cut the spike on either side of the keiki, pot in fresh bark mix.\n• **Division** (Dendrobium, Cattleya, Cymbidium with pseudobulbs): only on mature multi-pseudobulb plants — divide into chunks of 3+ pseudobulbs at repotting time. Mini orchids in 3\" pots are usually too small for this.\n• **Keiki paste** (a hormone cream) applied to a node can induce keiki formation, but success is hit-or-miss.\n\nDon't waste effort trying to root flower spikes or leaves directly — it doesn't work for orchids.",
      repotting: "Every 1–2 YEARS, immediately AFTER flowering finishes (never during bloom — shocks the plant).\n\n• Signs you need to repot: medium has broken down to mushy mulch; salts crusted on top; roots circling tightly; plant smells sour.\n• Keep the same pot size or go up only 1 size — orchids LIKE being root-bound.\n• Soak the plant 10 min to loosen medium; tease old bark off roots gently.\n• Trim BLACK or MUSHY roots back to healthy white/green tissue with sterile shears.\n• Use fresh orchid bark mix (or sphagnum if it was originally in moss).\n• Don't water for 5–7 days after repotting — let nicked roots heal first. Mist daily for humidity.\n• Clear pots help you monitor root health going forward.",
      feeding: "Mini orchids feed lightly but frequently — the famous \"weakly, weekly\" rule.\n\n• Use a balanced ORCHID-specific fertilizer (e.g. 20-20-20 or 13-3-15) at **1/4 strength** with every other watering during spring/summer.\n• Reduce to once monthly in fall, none in winter unless growing actively under lights.\n• Flush the pot with plain water once every 4–6 weeks to clear fertilizer salts (which burn roots → brown leaf tips).\n• MSU orchid formula is the gold-standard recommended by the American Orchid Society.\n• DO NOT use regular houseplant fertilizer at houseplant strength — far too strong for orchid roots.",
      troubleshooting: "• No rebloom → mini Phals need a 10–15°F night drop for 2–4 weeks (per AOS) — in Pflugerville, fall/winter nights near a 1F Bath window often trigger this naturally; AC-heated homes may need a cooler spot overnight.\n• Yellow leaves (bottom, one at a time) → normal aging — remove gently.\n• Yellow leaves (multiple, quickly) → overwatering/root rot OR crown rot — unpot, inspect roots: white/green/silver = healthy; brown/black/mushy = dead.\n• Wrinkled, droopy, leathery leaves → looks like thirst BUT often root rot — check root color before soaking again.\n• Brown crispy leaf tips → salt buildup or underwatering — flush pot, soak thoroughly.\n• Crown rot (mushy center where leaves meet) → water sitting in crown from overhead watering — treat with cinnamon, improve drainage, soak-only method.\n• Drooping/wilting → silver roots = soak; green roots + wilt = rot emergency.\n• Leaf drop → cold below 55°F, crown rot, or severe root loss.\n• Faded/scorched leaves → too much direct sun (move back in 1F Bath from SE beam).\n• Root rot (brown hollow roots, sour bark) → unpot, cut rot to healthy tissue, repot in fresh dry bark, no water 7 days.\n• Sticky residue → SCALE or MEALYBUGS — alcohol swab weekly × 3.\n• Spider mites (fine webs, stippling — rare on orchids but possible in dry AC) → rinse, insecticidal soap.\n• Thrips (silvery streaks on leaves) → blue sticky traps, spinosad.\n• Aphids (on flower spikes) → rinse, insecticidal soap.\n• Fungus gnats → broken-down bark holding too much water — repot if bark is mushy.\n• Aerial roots outside pot → totally normal — mist occasionally, don't bury.\n• ✅ Non-toxic to cats and dogs per ASPCA (Phalaenopsis orchid)."

    },
    sources: [
      { label: "American Orchid Society — Beginner's Care Guide", url: "https://www.aos.org/orchids/orchid-care.aspx" },
      { label: "American Orchid Society — Phalaenopsis Culture Sheet", url: "https://www.aos.org/orchids/culture-sheets/phalaenopsis.aspx" },
      { label: "Missouri Botanical Garden — Phalaenopsis", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderProfileResults.aspx?gen=Phalaenopsis" },
      { label: "RHS — Phalaenopsis (Moth Orchid)", url: "https://www.rhs.org.uk/plants/search-results?query=phalaenopsis" },
      { label: "Just Add Ice Orchids — Mini Phalaenopsis Care", url: "https://justaddiceorchids.com/orchid-care" },
      { label: "Costa Farms — Orchid Care Guide", url: "https://costafarms.com/plants/orchid" },
      { label: "ASPCA — Orchid (Phalaenopsis) Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/orchid" },
      { label: "The Spruce — Phalaenopsis Orchid Care", url: "https://www.thespruce.com/phalaenopsis-orchids-definition-1902866" }
    ]
  },

  kalanchoe: {
    id: "kalanchoe",
    repotSigns: [
      "Roots circling out of the 4\" drainage holes",
      "No blooms produced after the short-day photoperiod trigger despite proper conditions",
      "New stem growth is spindly/etiolated (thin, pale) even in good light",
      "Flower stalks fail to open new buds before withering",
      "Lower leaves drop en masse (not a single seasonal shedding — persistent loss)",
      "Pot feels heavy immediately after watering but dries out unusually fast"
    ],
    displayName: "Kalanchoe",
    potSize: '4"',
    category: "succulent",
    names: {
      common: ["Kalanchoe", "Florist Kalanchoe", "Flaming Katy", "Christmas Kalanchoe", "Madagascar Widow's-thrill"],
      scientific: "Kalanchoe blossfeldiana"
    },
    wateringDays: 11,
    wateringDaysHot: 10,
    wateringDaysCool: 18,
    currentSoilMix: "cactus_mix",
    comments: "Repotted in last 2 months. Soil is 50/50 cacti mix / perlite — ideal. 4\" pot.",
    idealSoil: ["cactus_mix"],
    soilNotes: "User's 50/50 cacti mix + perlite is exactly right — fast-draining and reliable for kalanchoe's water-storing leaves.",
    conditions: {
      light:        { ideal: "Bright indirect + 2–4 hrs morning direct", passing: "Bright indirect; full afternoon sun bleaches" },
      temperature:  { ideal: "60–80°F (15–27°C); cooler nights for blooming", passing: "45–90°F; protect below 50°F" },
      humidity:     { ideal: "40–60%", passing: "Average household; avoid mistinng flowers" },
      soilMoisture: { ideal: "Top 1\" dry between waterings", passing: "Top half dry; never wet feet" }
    },
    tips: {
      lighting: "Bright, indirect light with 2–4 hours of direct morning sun.\n\n• Needs STRONG light to rebloom — minimum 8 hrs bright light during day.\n• To FORCE BLOOMING: give 14 hours of complete darkness per night for 6 weeks (cover with a box or move to a dark closet at 5pm, remove at 7am), then resume normal light. Blooms appear ~6 weeks after treatment ends.\n• Best blooming light schedule starts in October for winter blooms.\n\n• In this home, 1F Room 1 (131° SE + overhead fan) and 1F Living Room corner (dual NE/SE light) are your best matches per PLANT_LIGHT_REF.",
      soil: "GRITTY succulent mix.\n\nRecipe:\n• 1 part cactus mix\n• 1 part perlite\n• Optional: handful of pumice\n\nExcellent drainage is critical. Terracotta pot preferred.",
      watering: "METHOD — strict soak-and-dry, err dry: Kalanchoe blossfeldiana stores water in thick succulent leaves; rot is the #1 killer (per The Spruce and University of Vermont Extension). Let top 1\" dry fully before a deep drench. Terracotta 4\" pot helps in Central Texas AC.\n\nHOW TO CHECK READINESS (your 4\" pot, 50/50 cacti mix + perlite):\n• Finger test: top 1\" completely dry = water.\n• Pot weight: 4\" pot feels light/hollow = ready.\n• Leaf plumpness: leaves should feel firm; slight wrinkle = thirsty; soft/yellow = overwatered.\n• Moisture meter: 2–3 in upper third = water; 5+ = wait.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 10–12 days in 1F Room 1 or 1F Corner.\n• Peak summer (Jun–Sep): every 10 days — small 4\" pot dries fast with AC.\n• Mild winter (Nov–Feb): every 16–18 days — reduce further during dark-treatment or dormancy.\n• Drench at soil line — wet flowers/leaves rot easily.\n• Reduce significantly while dormant or during 6-week dark-treatment for rebloom.\n• Grow lights supplement in low-light winter months per PLANT_LIGHT_REF.\n\nOVER- vs UNDER-watering tells:\n• Over: yellow soft mushy leaves, black stem base, fungus gnats.\n• Under: wrinkled/shriveled leaves, dry soil pulling from edges, pot feels hollow.",
      pruning: "DEADHEAD spent flower stems back to the base of the stem (where it meets a leaf pair) — this encourages re-blooming and saves the plant's energy.\n\n• Pinch back leggy stems to maintain a compact shape.\n• Major shape prune AFTER flowering finishes (don't prune during bloom).\n• Saved pinched tips propagate easily.",
      propagation: "Very easy by stem or leaf cuttings.\n\n• Stem cutting: take a 2–3\" stem cutting, remove the bottom leaves, let callus 2–3 days in shade.\n• Leaf cutting: single mature leaf, callus 2 days, place flat on dry mix.\n• Plant in dry succulent mix.\n• Water lightly only after roots form (~2–3 weeks).\n• Spring or early summer best; success rate ~85%.",
      repotting: "Every 2 years, in spring AFTER blooming.\n\n• Up-pot by 1\" only.\n• Terracotta strongly preferred.\n• Refresh soil completely; trim any dead roots.\n• Don't water for a week after repotting.",
      feeding: "• Balanced liquid fertilizer at half strength once a month spring through early fall.\n• A bloom-booster (higher P, e.g. 10-30-20) once before the dark-treatment period encourages flowering.\n• No fertilizer in winter unless plant is actively growing.",
      troubleshooting: "• No flowers → insufficient darkness/light contrast; do 6-week dark treatment (per UVM Extension).\n• Yellow soft mushy leaves → OVERWATERING (#1 issue). Cut back immediately; check roots for rot.\n• Wrinkled/shriveled leaves → underwatering. Soak the pot thoroughly once.\n• Leggy stretched pale stems → etiolation from low light; move to 1F Room 1 or add grow light.\n• Sunscald (bleached/brown patches) → too much harsh afternoon sun; filter or move to AM sun only.\n• Brown spots on leaves → cold drafts or wet foliage; water at soil line only.\n• Powdery mildew → poor air circulation; diluted neem (1 tsp/qt water).\n• Mealybugs (#1 succulent pest) → cottony clusters in leaf axils; alcohol swab + neem weekly × 3.\n• Aphids on flower stems → spray off with water; insecticidal soap if persistent.\n• Spider mites (fine webs, stippling) → rinse; insecticidal soap in dry AC air.\n• Fungus gnats → soil staying wet; let dry fully, sticky traps.\n• ⚠️ Toxic per ASPCA — contains bufodienolides (cardiotoxic compounds); causes vomiting, diarrhea, abnormal heart rhythm (rare). Keep strictly out of reach of cats, dogs, and horses."
    },
    sources: [
      { label: "Missouri Botanical Garden — Kalanchoe blossfeldiana", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=281042" },
      { label: "University of Vermont Extension — Kalanchoe Care", url: "https://pss.uvm.edu/ppp/articles/kalanchoe.html" },
      { label: "ASPCA — Kalanchoe Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/kalanchoe" },
      { label: "RHS — Kalanchoe blossfeldiana", url: "https://www.rhs.org.uk/plants/search-results?query=kalanchoe+blossfeldiana" },
      { label: "University of Florida IFAS — Kalanchoe", url: "https://edis.ifas.ufl.edu/" },
      { label: "The Sill — Kalanchoe Care Guide", url: "https://www.thesill.com/blog/plant-care" },
      { label: "The Spruce — Kalanchoe Care Guide", url: "https://www.thespruce.com/growing-kalanchoe-plants-1902982" }
    ]
  },

  /* ===================== ADDITIONAL OWNED PLANTS (added 2026-06-23) ===================== */

  burrows_tail: {
    id: "burrows_tail",
    repotSigns: [
      "Strands don't plump back up after a thorough watering (roots have no absorbency)",
      "Roots visible out of the 4\" drainage holes",
      "Bald spot appearing at the top center of the pot (crown dies from constraint downward)",
      "Water flows straight through in seconds — mineral cactus mix + rootbound = zero retention",
      "New strand growth thinner and paler than mature strands",
      "Mother stem base is being lifted up out of the soil"
    ],
    displayName: "Burro's Tail",
    potSize: '4"',
    category: "succulent",
    names: {
      common: ["Burro's Tail", "Donkey Tail", "Horse's Tail", "Lamb's Tail"],
      scientific: "Sedum morganianum"
    },
    wateringDays: 21,
    wateringDaysHot: 18,
    wateringDaysCool: 35,
    currentSoilMix: "cactus_mix",
    comments: "Repotted in last 2 months. 50/50 cacti mix / perlite in a 4\" pot. Famously brittle — leaves drop at the slightest touch, so place where it won't be brushed against.",
    idealSoil: ["cactus_mix"],
    soilNotes: "User's 50/50 cacti mix + perlite is textbook. Burro's tail rots fast in anything denser — the extra perlite is good insurance.",
    conditions: {
      light:        { ideal: "Bright indirect with 2–3 hrs gentle direct sun",   passing: "Bright indirect; tolerates partial sun" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "55–90°F; protect from frost" },
      humidity:     { ideal: "30–50%",                                           passing: "Low humidity tolerant" },
      soilMoisture: { ideal: "Bone dry between waterings",                       passing: "Drought tolerant for weeks" }
    },
    tips: {
      lighting: "Bright INDIRECT light with a few hours of gentle morning sun is ideal. Filtered south or east window works well.\n\n• Direct hot afternoon sun can scorch the waxy leaves — they turn white-pink.\n• In too-low light the strands stretch and the blue-gray color fades to dull green.\n• A hanging planter near a window is the classic placement — it shows off the trailing form.\n• In this home, 2F Room 1 (298° NW — bright with late-day direct) is your best match per PLANT_LIGHT_REF.",
      soil: "Strict cactus/succulent mix with extra perlite or pumice. User's 50/50 cacti/perlite is ideal. NEVER use moisture-retentive mixes.\n\nRecipe variants that also work:\n• 1 part cactus mix + 1 part pumice\n• 1 part standard potting + 2 parts perlite + 1 part coarse sand",
      watering: "METHOD — strict soak-and-dry, err on the dry side: Sedum morganianum stores water in its plump leaves; overwatering causes basal stem rot faster than underwatering (per University of Wisconsin Extension and Missouri Botanical Garden).\n\nHOW TO CHECK READINESS (your 4\" pot, 50/50 cactus mix + perlite):\n• Pot weight: lift the side — a thirsty 4\" terracotta feels noticeably lighter than 24 hrs after a soak.\n• Leaf test: plump, full, blue-gray leaves = fine; uniformly wrinkled/shriveled leaves = thirsty.\n• Finger/skewer: push to the pot bottom — if ANY coolness or moisture, wait 3–5 more days.\n• After watering: leaves should plump within 24–48 hrs; if they stay wrinkled, suspect root rot.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 18–21 days — AC dries mineral mix fast even when outdoor humidity spikes.\n• Peak summer (Jun–Sep): every 18 days if actively growing; stretch to 21 if growth slows.\n• Mild winter (Nov–Feb): every 35 days or longer — semi-dormant; when in doubt, wait.\n• NEVER place in 1F Bathroom (127° SE, high humidity) or 2F Room 2 (humidifier) — rot-prone trailing succulents hate stagnant humid air.\n\nTECHNIQUE:\n• Water DEEPLY at the soil line only — soak until runoff, empty saucer within 15 min.\n• Never mist strands or let water sit on leaves — trapped moisture invites rot.\n• Terracotta + mineral cactus mix is ideal; your current 50/50 recipe drains well.\n• When in doubt, DON'T water — a week too dry beats a day too wet.\n\nOVER- vs UNDER-watering tells:\n• Over: mushy/translucent leaves, black mush at stem base, sour soil smell.\n• Under: uniformly wrinkled leaves that plump after one good soak.",
      pruning: "Almost no pruning needed.\n\n• Leaves that drop off easily are actually a propagation feature — pick them up and root them.\n• Remove any rotted strands at the base with sterile shears.\n• Trim back leggy strands in early spring to encourage branching.\n• ⚠️ Be GENTLE — every accidental touch knocks off leaves. Don't move the plant unless absolutely necessary.",
      propagation: "EASIEST succulent to propagate — basically does it itself.\n\n• Pick up dropped leaves from around the pot.\n• Lay them on dry cactus mix; don't bury.\n• In 2–3 weeks tiny roots and a baby plantlet form from the leaf base.\n• Mist lightly every 4–5 days until the leaf shrivels (it's transferring its water to the baby).\n• Once the baby has 3–4 of its own leaves, water normally.\n• Stem cuttings also work — let the cut end callus 3–5 days before potting.",
      repotting: "Every 3–4 years, or never if happy.\n\n• Spring only.\n• HANDLE WITH EXTREME CARE — wrap the strands in cling film or a soft cloth before lifting.\n• Up-pot by 1\" only.\n• Don't water for a week after to let any nicked roots heal.",
      feeding: "VERY light feeder.\n\n• Cactus fertilizer at quarter strength once in spring and once in mid-summer.\n• No feeding fall/winter.\n• Overfeeding causes leggy growth and lost variegation.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Mushy/translucent leaves + black mush at stem base → OVERWATERING / basal rot (most common killer per University of Wisconsin Extension). Stop watering immediately; cut off rotted section with sterile shears, save healthy upper strands as cuttings, callus 3–5 days, repot in dry mineral mix.\n• Leaves shriveling but NOT plumping after a thorough soak → ROOT ROT — roots can't absorb water. Unpot, trim black/mushy roots, callus, repot dry.\n• Leaves dropping en masse → physical disturbance (this plant is famously brittle) OR sudden temperature change. Move to a stable spot away from doors/vents; minimize handling.\n• Strands stretching + fading from blue-gray to yellow-green → LOW LIGHT / etiolation. Move to 2F Room 1 NW or 1F Living Room corner per PLANT_LIGHT_REF.\n• White-pink scorched patches on leaves → SUNSCALD from sudden full sun. Pull back from glass or add sheer curtain; damage is permanent on affected leaves.\n• White waxy bloom on leaves → NORMAL natural farina — don't rub off.\n• Mealybugs (cottony white in leaf joints) → #1 pest; dab with 70% isopropyl alcohol on Q-tip; repeat weekly × 3.\n• Spider mites (fine webbing, stippled leaves) → rinse strands gently, increase airflow; insecticidal soap if heavy.\n• Fungus gnats → soil staying too wet; let mix dry fully, sticky traps; confirm drainage.\n• Scale on stems → scrape, alcohol swab, horticultural oil.\n• ✅ Pet-safe — ASPCA lists Burro's Tail (Sedum morganianum) as non-toxic to dogs and cats."
    },
    sources: [
      { label: "Missouri Botanical Garden — Sedum morganianum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b350" },
      { label: "RHS — Sedum morganianum", url: "https://www.rhs.org.uk/plants/search-results?query=sedum+morganianum" },
      { label: "University of Wisconsin — Burro's Tail Care", url: "https://hort.extension.wisc.edu/articles/burros-tail/" },
      { label: "ASPCA — Burro's Tail Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/burros-tail" },
      { label: "Costa Farms — Burro's Tail Care Guide", url: "https://costafarms.com/plants/burros-tail" },
      { label: "The Spruce — Donkey's Tail (Sedum morganianum) Care", url: "https://www.thespruce.com/grow-sedum-morganianum-1902975" }
    ]
  },

  succulent_frankenstein_a: {
    id: "succulent_frankenstein_a",
    repotSigns: [
      "One species has ROOT-MUSCLED the others aside (visible when you look at the surface — one is thriving while another shrivels)",
      "Any of the 5 species is being lifted up out of the soil by another's roots",
      "Roots circling out of the 4.5\" drainage holes",
      "The pot dries out in half the time it did 6 months ago (roots have filled the pot)",
      "One species has produced enough pups/offsets to visibly crowd the neighbors",
      "⚠️ Any single-species rot inside the pot — repot is now urgent (isolate the healthy species)"
    ],
    displayName: "Succulent Mix (5-species)",
    potSize: '4.5"',
    category: "succulent",
    names: {
      common: ["Succulent Frankenstein (mixed planter)", "Mixed Succulent Arrangement"],
      scientific: "Graptosedum spp. + Pachyphytum spp. + Kalanchoe spp. + Sedum nussbaumerianum + Echeveria spp."
    },
    wateringDays: 21,
    wateringDaysHot: 18,
    wateringDaysCool: 35,
    currentSoilMix: "other",
    comments: "⚠️ NOT repotted in the last 2 months — still in original store soil. Multi-species planter containing: Graptosedum, Pachyphytum, Kalanchoe, Sedum nussbaumerianum, Echeveria. Plan to bare-root and switch to 50/50 cacti/perlite at next repotting in spring. Each species has slightly different water needs — set the schedule for the THIRSTIEST member (Sedum nussbaumerianum/Echeveria) and pace yourself.",
    idealSoil: ["cactus_mix"],
    soilNotes: "⚠️ Store soil is usually peat-heavy — bad for succulents. Repot to 50/50 cacti/perlite at the next opportunity (spring is ideal). Until then, water sparingly and let the pot dry COMPLETELY between waterings — store soil holds water 2–3× longer than proper cactus mix.",
    conditions: {
      light:        { ideal: "Bright direct light 4–6 hours daily",              passing: "Bright indirect; will stretch in low light" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "50–90°F; most prefer dry, warm conditions" },
      humidity:     { ideal: "30–50%",                                           passing: "Tolerates dry indoor air" },
      soilMoisture: { ideal: "Completely dry between waterings",                 passing: "Drought tolerant" }
    },
    tips: {
      lighting: "ALL the species in this mix want BRIGHT light to stay compact and colored.\n\n• Echeveria & Graptosedum: brightest light keeps their rosettes tight and colorful.\n• Sedum nussbaumerianum ('Coppertone'): the orange tips come from sun stress.\n• Kalanchoe: many species need a 6-week 'long night' to bloom (see Kalanchoe entry).\n• Pachyphytum: bright indirect with some direct sun keeps the chubby leaves plump.\n• Rotate the pot 1/4 turn weekly so every plant gets equal light — they stretch toward the window.\n\n• In this home, 2F Living Room (215° SW — intense afternoon sun) is the best match per PLANT_LIGHT_REF.",
      soil: "⚠️ Currently in store soil (peat-heavy, holds water too long). At next repot, switch to 50/50 cacti mix + perlite. See soilNotes above.",
      watering: "METHOD — soak-and-dry to the thirstiest-safe compromise: this 5-species \"Frankenstein\" pot (Graptosedum + Pachyphytum + Kalanchoe + Sedum nussbaumerianum + Echeveria) has conflicting needs in ONE container — per RHS mixed-succulent guidance, water for the thirstiest member (Sedum/Echeveria) but err dry because store peat-heavy soil retains moisture 2–3× longer than proper cactus mix.\n\n⚠️ MIXED-SPECIES CHALLENGE: one deep soak wets ALL roots; a drought-tolerant Echeveria may rot while a thirstier Sedum shrivels. Spot-water individual plants with a syringe when only one species shows stress.\n\nHOW TO CHECK READINESS (your 4.5\" pot, store soil — NOT yet repotted):\n• Finger test: top 2\" completely dry before any full soak — peat holds water longer than it looks.\n• Pot weight: 4.5\" pot feels hollow-light = likely ready; add 3–5 extra days vs. proper cactus mix.\n• Leaf plumpness: check EACH species — shriveled rosette = spot-water that plant only.\n• Moisture meter: 1–2 throughout = full soak OK; 3–4 near surface = wait (peat trap).\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 18–21 days — store soil + AC = slow dry-down; don't rush.\n• Peak summer (Jun–Sep): every 18 days in 2F LR (SW); check individual species weekly.\n• Mild winter (Nov–Feb): every 30–35 days — near-zero water; mixed pot rot risk is highest in cool wet soil.\n• Drench at soil line, never over rosettes; empty saucer immediately.\n• Terracotta would help once repotted into 50/50 cacti/perlite.\n\nOVER- vs UNDER-watering tells:\n• Over: one species mushy/translucent while others fine → group rot risk; remove rotting plant immediately.\n• Under: individual species shriveling → spot-water with syringe at that plant's base only.",
      pruning: "Multi-species mixes need active management to prevent one fast-grower from crowding others.\n\n• Trim Echeveria flower stalks at the base after blooming.\n• Pinch back Sedum nussbaumerianum tips when it gets leggy — propagate the cuttings.\n• Remove Kalanchoe spent blooms.\n• Wear gloves with any Kalanchoe — sap irritates skin.\n• Every 6–12 months, consider separating the species into individual pots if one is outcompeting the others.",
      propagation: "Each species propagates differently:\n\n• Echeveria & Graptosedum: leaf cuttings (lay on dry mix, baby plant forms from base).\n• Sedum nussbaumerianum: stem cuttings, callus 2–3 days, plant.\n• Kalanchoe: stem cuttings.\n• Pachyphytum: leaf cuttings (gently twist off whole leaves with a pop).\n• All: let cuts/wounds callus for 2–5 days before planting in dry cactus mix.\n• Success rate ~80% across the mix.",
      repotting: "URGENT priority for this plant at next spring repotting.\n\n• Gently knock out the rootball.\n• Tease apart the species — each is its own plant with its own roots.\n• Decide: keep them together (replant in 4.5\" with 50/50 cacti/perlite) OR separate into 2.5–3\" individual pots.\n• Let any nicked roots callus 2 days before re-soiling.\n• Don't water for 1 week after.",
      feeding: "Very light. Cactus fertilizer at quarter strength once in spring, once in mid-summer.\n\n• Skip if you repot — fresh mix has enough nutrients for 6 months.\n• No fall/winter feeding.",
      troubleshooting: "• One species rotting (mushy/translucent leaves) → OVERWATERING in peat-heavy store soil. Remove that plant immediately, treat cut with cinnamon, check moisture for the rest.\n• Individual species shriveling while others plump → underwatering THAT species only; spot-water with syringe — don't soak whole pot for one thirsty plant.\n• Stretching/etiolation (long gaps between leaves, faded color) → low light; move to 2F LR (SW) or add grow light.\n• Sunscald (washed-out white/bleached rosettes) → too much unfiltered SW sun too fast; filter or acclimate.\n• Mealybugs in leaf joints → #1 pest for mixed succulents; cotton swab + alcohol on each spot; neem weekly × 3.\n• Spider mites (fine webs, stippling) → rinse affected plants; insecticidal soap.\n• Fungus gnats → store soil staying wet too long; let dry fully, sticky traps, prioritize spring repot to cactus mix.\n• Kalanchoe drops leaves but others fine → light-change stress; usually recovers in 2–3 weeks.\n• Whole pot drying way too slowly → store peat is the culprit; repot to 50/50 cacti/perlite urgently.\n• Yellowing across multiple species → overwater; stop watering 2+ weeks, check all roots.\n• ⚠️ Toxic per ASPCA — Kalanchoe in this mix contains bufodienolides; whole pot is pet-unsafe. Wear gloves when handling Kalanchoe sap."
    },
    sources: [
      { label: "Missouri Botanical Garden — Succulent Care", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b350" },
      { label: "University of California — Succulents for the Home", url: "https://ucanr.edu/sites/UrbanHort/Plant_Care/Succulents/" },
      { label: "Sedum nussbaumerianum — World of Succulents", url: "https://worldofsucculents.com/sedum-nussbaumerianum-coppertone-stonecrop/" },
      { label: "Costa Farms — Mixed Succulent Care", url: "https://costafarms.com/plants/succulents" },
      { label: "ASPCA — Plant Toxicity Search", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants" },
      { label: "RHS — Cacti & Succulents Growing Guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" },
      { label: "Missouri Botanical Garden — Cacti & Succulents Fact Sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" }
    ]
  },

  succulent_frankenstein_b: {
    id: "succulent_frankenstein_b",
    repotSigns: [
      "The Crassula 'Gollum' (finger jade) has doubled in size and is shading the Pachyphytum/Peperomia",
      "Roots visible circling out of the 3.5\" drainage holes",
      "One of the three species starts shriveling while the others look fine (root competition)",
      "Peperomia graveolens (Ruby Glow) sheds lower leaves rapidly (moisture-competition sign)",
      "Pot dries out in half the time it did 6 months ago",
      "⚠️ Any rot on one species → repot immediately and isolate"
    ],
    displayName: "Succulent Mix (3-species)",
    potSize: '3.5"',
    category: "succulent",
    names: {
      common: ["Succulent Frankenstein (small planter)", "Mixed Succulent Arrangement"],
      scientific: "Crassula 'Gollum' (Crassula ovata 'Gollum') + Pachyphytum spp. + Peperomia graveolens"
    },
    wateringDays: 16,
    wateringDaysHot: 14,
    wateringDaysCool: 28,
    currentSoilMix: "cactus_mix",
    comments: "Repotted in last 2 months. Multi-species planter containing: Crassula 'Gollum' (finger jade), Pachyphytum, and Peperomia graveolens (Ruby Glow Peperomia). Soil is 50/50 cacti mix / perlite, 3.5\" pot. Peperomia graveolens prefers slightly more moisture than the other two — see watering tips.",
    idealSoil: ["cactus_mix"],
    soilNotes: "User's 50/50 cacti mix + perlite is ideal for this mix. The Peperomia graveolens does fine in succulent soil despite being slightly more moisture-loving than its companions.",
    conditions: {
      light:        { ideal: "Bright indirect with morning direct sun",          passing: "Bright indirect; tolerates partial sun" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "55–90°F" },
      humidity:     { ideal: "30–50%",                                           passing: "Tolerates dry air; Peperomia prefers 40%+" },
      soilMoisture: { ideal: "Dry between waterings",                            passing: "Drought tolerant" }
    },
    tips: {
      lighting: "Bright indirect with some morning direct sun keeps all 3 species happy.\n\n• Crassula 'Gollum': needs the most light — sun stress brings out red tips on the tubular leaves.\n• Pachyphytum: light shapes its chubby leaves into plump form.\n• Peperomia graveolens ('Ruby Glow'): tolerates slightly lower light than the others; partial shade is fine.\n• Avoid prolonged direct afternoon sun in summer — leaves can scorch.\n\n• In this home, 1F Room 1 (131° SE + overhead fan) and 1F Living Room corner (dual NE/SE light) are your best matches per PLANT_LIGHT_REF.",
      soil: "User's 50/50 cacti mix + perlite is ideal. See soilNotes.",
      watering: "METHOD — soak-and-dry to the thirstiest-safe compromise: this 3-species \"Frankenstein\" pot (Crassula 'Gollum' + Pachyphytum + Peperomia graveolens) shares one root zone — Peperomia graveolens is the thirstiest and will droop first, but overwatering to satisfy it can rot the Crassula and Pachyphytum (per RHS mixed-container guidance).\n\n⚠️ MIXED-SPECIES CHALLENGE: one deep soak wets ALL three plants. Water the whole pot when Peperomia graveolens starts drooping AND soil is dry — never when Crassula/Pachyphytum leaves are still plump and soil is damp.\n\nHOW TO CHECK READINESS (your 3.5\" pot, 50/50 cacti mix + perlite):\n• Finger test: top 1.5\" completely dry before soaking.\n• Pot weight: 3.5\" pot feels light/hollow = check Peperomia for droop.\n• Leaf plumpness: Crassula/Pachyphytum firm = wait even if Peperomia looks slightly soft; spot-water Peperomia with syringe if needed.\n• Moisture meter: 2–3 throughout = water; 4+ = wait.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 12–16 days — smaller 3.5\" pot dries faster than the 4.5\" Frankenstein A.\n• Peak summer (Jun–Sep): every 12–14 days in 1F Room 1 (SE + fan airflow).\n• Mild winter (Nov–Feb): every 24–28 days — near-zero water; rot risk highest in cool wet soil.\n• Drench at soil line; never over foliage; empty saucer immediately.\n\nOVER- vs UNDER-watering tells:\n• Over: mushy Crassula/Pachyphytum stems while Peperomia still looks fine → stop watering 2+ weeks.\n• Under: Peperomia graveolens drooping + wrinkled leaves → soak whole pot OR syringe-water Peperomia base only.",
      pruning: "• Pinch leggy Crassula 'Gollum' tips back in spring — they propagate easily.\n• Trim Peperomia graveolens stems when they get too long; they branch from the cut.\n• Remove any spent flowers at the base.\n• Watch for one species crowding the others; trim aggressively if needed.",
      propagation: "All three propagate via stem or leaf cuttings:\n\n• Crassula 'Gollum': stem cuttings, callus 2–4 days, root in dry mix. Very high success rate.\n• Pachyphytum: gently twist off entire leaves; lay on dry mix; baby plant forms in 3–6 weeks.\n• Peperomia graveolens: stem cuttings 3–4\" long, callus 2 days, plant in cactus mix.\n• All like warm conditions (70°F+) for fastest rooting.",
      repotting: "Every 2–3 years.\n\n• Spring only.\n• Up-pot by 1\" only — these stay compact.\n• Refresh medium if it's compacted.\n• Let any nicked roots callus 2 days; don't water for 1 week after.",
      feeding: "Very light feeder.\n\n• Cactus fertilizer at quarter strength once in spring and once in mid-summer.\n• No fall/winter feeding.",
      troubleshooting: "• Mushy stems on Crassula or Pachyphytum → OVERWATERING / root rot. Salvage healthy tops as cuttings; let callus 3–5 days; repot dry.\n• Peperomia leaves dropping → underwatering OR cold draft from AC vent; check soil moisture first.\n• Individual species shriveling while others plump → spot-water the thirsty one with a syringe at its base — don't soak whole pot.\n• Crassula 'Gollum' tall and skinny (etiolation) → low light; move to 1F Room 1 or 1F Corner.\n• Sunscald (bleached/red patches on leaves) → too much harsh afternoon sun; filter or move back.\n• Pachyphytum losing waxy bloom → leaves were rubbed; bloom regrows slowly — don't touch.\n• Mealybugs (#1 pest) → cottony spots in leaf joints; alcohol swab + neem weekly × 3.\n• Spider mites (fine webs) → rinse; insecticidal soap in dry AC air.\n• Fungus gnats → soil staying wet; reduce watering, sticky traps.\n• Yellowing across all three → overwater; let dry fully 2+ weeks.\n• ⚠️ Toxic per ASPCA — Crassula (jade) is toxic to cats and dogs; whole pot is pet-unsafe despite Peperomia being generally non-toxic."
    },
    sources: [
      { label: "Missouri Botanical Garden — Crassula ovata 'Gollum'", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275124" },
      { label: "World of Succulents — Peperomia graveolens", url: "https://worldofsucculents.com/peperomia-graveolens-ruby-glow/" },
      { label: "World of Succulents — Pachyphytum spp.", url: "https://worldofsucculents.com/?s=pachyphytum" },
      { label: "ASPCA — Crassula Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/jade-plant" },
      { label: "RHS — Crassula ovata", url: "https://www.rhs.org.uk/plants/search-results?query=crassula+ovata" },
      { label: "The Spruce — Succulent Care Tips", url: "https://www.thespruce.com/how-to-care-for-succulents-11957842" }
    ]
  },

  dracaena_fragrans: {
    id: "dracaena_fragrans",
    repotSigns: [
      "Roots circling out of the 9\" × 9\" drainage holes",
      "New leaves are markedly SHORTER than the mature strappy leaves",
      "Cane starts leaning (9\" pot rootball no longer counterbalances a tall cane)",
      "Water drains through in seconds instead of the usual slow soak",
      "Yellow lower leaves persistent (not from a specific over/underwatering event)",
      "Growth stalls entirely in growing season — Dracaenas will normally push a new leaf every 4–6 weeks in warm months"
    ],
    displayName: "Corn Plant (Cane A)",
    potSize: '9" × 9"',
    repotted: true,
    category: "tropical",
    names: {
      common: ["Corn Plant", "Cornstalk Dracaena", "Mass Cane", "Happy Plant"],
      scientific: "Dracaena fragrans (formerly D. deremensis)"
    },
    wateringDays: 8,
    wateringDaysHot: 7,
    wateringDaysCool: 13,
    currentSoilMix: "amended_potting",
    comments: "✅ Aug 2026: the two corn-plant stalks were SEPARATED from the shared 13.5\" pot into their own 9\" × 9\" pots. This is Cane A (watering-log history stays on this ID). UF/IFAS Dracaena: expect some leaf drop after division/repot shock — you already lost a node earlier; another 2–4 weeks of sulk is normal. 9×9 dries FASTER than 13.5\". Use distilled/rain/filtered water — fluoride brown tips. Pair: Corn Plant (Cane B).",
    idealSoil: ["standard_potting", "amended_potting"],
    soilNotes: "60/40 potting/perlite in a 9\" × 9\" square. Smaller volume than the old shared 13.5\" — perlite still protects against overwatering after division. Don't pack wet mix (Clemson HGIC).",
    conditions: {
      light:        { ideal: "Bright, indirect (filtered south or east window)", passing: "Medium indirect; tolerates low light but grows slowly" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "60–90°F; protect below 55°F" },
      humidity:     { ideal: "50–60%",                                           passing: "40%+; brown leaf tips in dry air" },
      soilMoisture: { ideal: "Top 2\" dries between waterings",                  passing: "Slightly drought-tolerant" }
    },
    tips: {
      lighting: "Bright, INDIRECT light is best — direct hot afternoon sun bleaches leaves.\n\n• An east window or several feet back from a south/west window is ideal.\n• Will tolerate medium-low light but won't push new growth.\n• Rotate the pot 1/4 turn every couple weeks for even growth.\n• If new leaves come in smaller or paler than older ones, light is too low.\n\n• In this home, the 1F Living Room window (36° NE) and 1F Corner are your best matches per PLANT_LIGHT_REF.",
      soil: "User's 60/40 potting/perlite is solid. Standard potting mix amended with extra perlite gives the right balance. Avoid pure mineral mixes (cactus, bonsai) — too fast-draining.",
      watering: "METHOD — soak-and-dry: Dracaena fragrans stores moisture in its cane — let the top 2\" dry between deep waterings. Slightly drought-tolerant but fluoride-sensitive (brown tips from tap water per University of Florida IFAS).\n\nHOW TO CHECK READINESS (your 9\" × 9\" pot — Aug 2026, one cane):\n• Finger test: top 2\" dry = water. Smaller square than the old 13.5\" so this happens sooner.\n• Pot weight: noticeably lighter than post-water = check depth.\n• Moisture meter: 3–4 in upper half = water.\n• Plant tells: drooping + dry top 2\" = thirsty. Multiple yellow leaves + wet soil = overwatered.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 7–8 days — 60/40 mix in 9×9 dries faster than the old shared 13.5\".\n• Peak summer (Jun–Sep): every 7 days at 1F Window (NE); 8 days in 1F Corner.\n• Mild winter (Nov–Feb): every 12–14 days.\n• ⚠️ POST-DIVISION: water lightly to settle, then wait — UF/IFAS-style shock (leaf drop) is normal for 2–4 weeks. Don't drown a sulking cane.\n\nBOTTOM-WATERING: optional — top-water until runoff, empty saucer.\n\nWATER QUALITY (critical — per University of Florida IFAS and The Spruce):\n• Dracaena is HIGHLY fluoride- and salt-sensitive — Central Texas tap water causes classic brown leaf tips.\n• Use distilled, rainwater, or filtered water ONLY. Letting tap sit 24 hrs removes chlorine but NOT fluoride.\n• Flush the 9×9 pot with plain filtered water every 6–8 weeks to leach salts (fertilizer + minerals).\n\nOVER- vs UNDER-watering tells:\n• Over: multiple yellow/brown leaves at once, soft mushy cane base, black roots, wet soil smell.\n• Under: brown crispy tips/edges (also fluoride), bottom leaves yellow one-at-a-time (some normal aging), drooping with dry soil.",
      pruning: "Easy to prune for shape and size.\n\n• Trim brown leaf tips with sharp scissors — follow the natural leaf shape so it looks intentional.\n• Cut entire canes back to whatever height you want — new growth sprouts from below the cut (the user's lost node).\n• Best in spring before active growth.\n• Wipe the wound with cinnamon to prevent rot.\n• Each cane can be cut at different heights for a tiered look.",
      propagation: "Easy via stem (cane) cuttings.\n\n• Cut a healthy cane into 4–6\" sections; mark the 'up' end on each.\n• Optional: dip the bottom end in rooting hormone.\n• Plant upright in moist potting mix OR root in water (slower but easier to monitor).\n• Roots in 4–8 weeks; new top growth 2–3 weeks after.\n• Success rate ~70–80%.\n• Best in spring/early summer when warm.",
      repotting: "Every 2–3 years or when root-bound.\n\n• Spring is best.\n• Aug 2026 split: each cane now has its own 9\" × 9\". Do not jump back to 13.5\" — extra unused soil around a single cane is a rot risk (Clemson: 1–2\" upsize only).\n• ⚠️ Dracaenas often drop a leaf or two from REPOT/DIVISION SHOCK — water lightly, don't fertilize for a month, give 3–4 weeks to recover.\n• Trim circling roots when you next refresh soil.",
      feeding: "Balanced liquid fertilizer at HALF strength every 6 weeks spring–summer.\n\n• None in fall/winter unless growing under lights.\n• Slow-release pellets (Osmocote) in spring work well as an alternative — 3–4 months coverage.\n• Flush with plain water every 2–3 months to clear accumulated fertilizer salts (which contribute to leaf-tip burn).\n• Dracaenas are LIGHT feeders — overfeeding causes salt buildup → more tip burn.",
      troubleshooting: "• Brown crispy leaf tips/edges → #1 cause is FLUORIDE in tap water (per University of Florida IFAS) — switch to distilled/rain/filtered. Also low humidity (Central Texas AC ~30–45%) and salt buildup — flush monthly, humidifier optional at 50%+.\n• Yellow leaves (bottom only, one at a time) → natural aging — pluck off.\n• Yellow leaves (multiple, quickly) → overwatering/root rot — unpot, trim black/mushy roots, repot in fresh 60/40 mix.\n• Drooping/wilting → dry top 2\" = water with filtered water; wet soil = hold off, check roots.\n• Leaf drop (mass) → overwatering, cold draft below 55°F, or repot shock (you lost a node after recent repot — give 4 weeks).\n• Leaf curling → underwatering or low humidity — check soil + switch to filtered water.\n• Faded/pale new leaves → insufficient light — move toward 1F Window or Corner.\n• Scorched/bleached patches → too much direct sun — avoid 2F SW.\n• Root rot (mushy cane base, black roots) → cut above rot, root healthy top as cutting.\n• White stippling + fine webs → SPIDER MITES in dry AC air — rinse, insecticidal soap weekly × 3.\n• Mealybugs (cottony clusters) → alcohol Q-tip.\n• Scale (bumps, sticky floor) → scrape, alcohol, horticultural oil.\n• Thrips → rinse, sticky traps, spinosad.\n• Fungus gnats → let top 2\" dry; sticky traps.\n• Soft mushy cane → root rot — emergency surgery above rot line.\n• Bent/kinked stem → repot shock or uneven light — rotate pot weekly.\n• ⚠️ Toxic to cats and dogs — saponins cause vomiting, drooling, dilated pupils per ASPCA (Corn Plant / Dracaena fragrans).",
    },
    sources: [
      { label: "Missouri Botanical Garden — Dracaena fragrans", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276317" },
      { label: "University of Florida IFAS — Dracaena fragrans", url: "https://edis.ifas.ufl.edu/publication/FP173" },
      { label: "RHS — Dracaena fragrans", url: "https://www.rhs.org.uk/plants/search-results?query=dracaena+fragrans" },
      { label: "The Sill — Dracaena Care Guide", url: "https://www.thesill.com/blog/plant-care" },
      { label: "ASPCA — Corn Plant Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/corn-plant" },
      { label: "Costa Farms — Dracaena Care", url: "https://costafarms.com/plants/dracaena" },
      { label: "The Spruce — Corn Plant (Dracaena fragrans) Care", url: "https://www.thespruce.com/grow-dracaena-fragrans-indoors-1902748" },
      { label: "Clemson HGIC — Indoor Plants: Transplanting & Repotting", url: "https://hgic.clemson.edu/factsheet/indoor-plants-transplanting-repotting/" }
    ]
  },

  dracaena_fragrans_b: {
    id: "dracaena_fragrans_b",
    repotSigns: [
      "Roots circling out of the 9\" × 9\" drainage holes",
      "New leaves are markedly SHORTER than the mature strappy leaves",
      "Cane starts leaning (9\" pot rootball no longer counterbalances a tall cane)",
      "Water drains through in seconds instead of the usual slow soak",
      "Yellow lower leaves persistent (not from a specific over/underwatering event)",
      "Growth stalls entirely in growing season — Dracaenas will normally push a new leaf every 4–6 weeks in warm months"
    ],
    displayName: "Corn Plant (Cane B)",
    potSize: '9" × 9"',
    repotted: true,
    category: "tropical",
    names: {
      common: ["Corn Plant", "Cornstalk Dracaena", "Mass Cane", "Happy Plant"],
      scientific: "Dracaena fragrans (formerly D. deremensis)"
    },
    wateringDays: 8,
    wateringDaysHot: 7,
    wateringDaysCool: 13,
    currentSoilMix: "amended_potting",
    comments: "✅ Aug 2026: second stalk from the old shared 13.5\" corn plant, now solo in a 9\" × 9\" pot. Same species/care as Cane A but its OWN watering log — after a split, two canes rarely drink on the same day. UF/IFAS: filtered water (fluoride), expect 2–4 weeks of division sulk, don't overwater a stressed cane.",
    idealSoil: ["standard_potting", "amended_potting"],
    soilNotes: "Same 60/40 potting/perlite target as Cane A. Independent 9×9 cube — check THIS pot's weight, not Cane A's.",
    conditions: {
      light:        { ideal: "Bright, indirect (filtered south or east window)", passing: "Medium indirect; tolerates low light but grows slowly" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "60–90°F; protect below 55°F" },
      humidity:     { ideal: "50–60%",                                           passing: "40%+; brown leaf tips in dry air" },
      soilMoisture: { ideal: "Top 2\" dries between waterings",                  passing: "Slightly drought-tolerant" }
    },
    tips: {
      lighting: "Bright, INDIRECT light is best — direct hot afternoon sun bleaches leaves.\n\n• Same spots as Cane A: 1F Living Room window (36° NE) and 1F Corner.\n• You can park the two 9×9 pots as a pair, but rotate independently so each cane doesn't lean the same way.\n• If new leaves come in smaller or paler than older ones, light is too low.",
      soil: "60/40 potting/perlite. Avoid cactus/bonsai mixes — too fast for Dracaena. Avoid moisture-control peat — fluoride + wet peat = tip burn and rot.",
      watering: "METHOD — soak-and-dry: same as Cane A. Let the top 2\" dry. Fluoride-sensitive (UF/IFAS).\n\nHOW TO CHECK (this 9\" × 9\", Cane B only):\n• Do not copy Cane A's calendar — after a split, root mass and leaf count differ.\n• Finger 2\" dry → water with filtered/distilled/rain water.\n• Empty the saucer.\n\nCADENCE: every 7–8 days in peak summer AC; 12–14 days in winter. Post-division: err dry for 2–4 weeks.\n\nOVER: multiple yellow leaves + wet mix. UNDER: crispy tips (also fluoride) + light pot.",
      pruning: "Same as Cane A — brown tips follow the leaf shape; cane cuts resprout below the wound. Cinnamon on fresh cuts. Don't match heights unless you want a matched pair.",
      propagation: "This cane IS the result of dividing a two-cane pot. Further props: 4–6\" cane sections, mark 'up', water or soil, 4–8 weeks (UF/IFAS / The Spruce).",
      repotting: "Leave it in the 9×9 through this recovery. Next upsize +1–2\" only, spring, after new growth is steady. No fertilizer 4 weeks post-split.",
      feeding: "None for 4 weeks after the Aug 2026 split. Then half-strength balanced liquid every 6 weeks spring–summer. Flush salts every 6–8 weeks — salts + fluoride = worse tip burn.",
      troubleshooting: "• Brown crispy tips → fluoride in tap (UF/IFAS) — filtered water, flush salts.\n• Mass leaf drop after the split → expected shock 2–4 weeks; do not add water or fertilizer.\n• Yellow cluster + wet soil → overwater in the new 9×9; hold off, check roots.\n• One cane thriving, this one not → different root damage at split; keep them on independent logs.\n• ⚠️ Toxic to cats and dogs — saponins per ASPCA (Corn Plant / Dracaena fragrans)."
    },
    sources: [
      { label: "Missouri Botanical Garden — Dracaena fragrans", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276317" },
      { label: "University of Florida IFAS — Dracaena fragrans", url: "https://edis.ifas.ufl.edu/publication/FP173" },
      { label: "RHS — Dracaena fragrans", url: "https://www.rhs.org.uk/plants/search-results?query=dracaena+fragrans" },
      { label: "ASPCA — Corn Plant Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/corn-plant" },
      { label: "Costa Farms — Dracaena Care", url: "https://costafarms.com/plants/dracaena" },
      { label: "The Spruce — Corn Plant (Dracaena fragrans) Care", url: "https://www.thespruce.com/grow-dracaena-fragrans-indoors-1902748" },
      { label: "Clemson HGIC — Indoor Plants: Transplanting & Repotting", url: "https://hgic.clemson.edu/factsheet/indoor-plants-transplanting-repotting/" }
    ]
  },

  cordyline_fruticosa: {
    id: "cordyline_fruticosa",
    repotSigns: [
      "New leaves come in noticeably LESS pink/red than mature leaves (root stress = pigment loss)",
      "Lower leaves shedding faster than the usual one-a-month baseline",
      "Roots circling out of the 9.5\" drainage holes",
      "New leaves smaller than the previous flush",
      "Cane starts leaning",
      "Water beads on the surface (peat crust) or drains through in seconds (rootbound) — either extreme is a signal"
    ],
    displayName: "Cordyline fruticosa (Ti Plant)",
    potSize: '9.5"',
    category: "tropical",
    names: {
      common: ["Ti Plant", "Hawaiian Ti", "Good Luck Plant", "Cabbage Palm"],
      scientific: "Cordyline fruticosa (formerly C. terminalis)"
    },
    wateringDays: 8,
    wateringDaysHot: 7,
    wateringDaysCool: 13,
    currentSoilMix: "amended_potting",
    comments: "Repotted in last 2 months. Soil is 60/40 potting/perlite, 9.5\" pot. Ti plants are FLUORIDE-SENSITIVE like Dracaenas (same family) — use distilled or filtered water to prevent brown leaf tips.",
    idealSoil: ["standard_potting", "amended_potting"],
    soilNotes: "User's 60/40 potting/perlite is a good blend — Ti plants like moisture-retentive soil but hate waterlogged roots. The extra perlite balances both needs in a 9.5\" pot.",
    conditions: {
      light:        { ideal: "Bright, indirect — 4+ hours daily for color",      passing: "Medium indirect; loses vibrancy in low light" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "60–95°F; loves warmth" },
      humidity:     { ideal: "50–70%",                                           passing: "40%+; tropical species prefers high humidity" },
      soilMoisture: { ideal: "Top 1–2\" dries between waterings",                passing: "Likes consistent moisture; never bone dry" }
    },
    tips: {
      lighting: "Bright, INDIRECT light intensifies the red, pink, and purple leaf colors.\n\n• Direct morning sun is fine; protect from intense afternoon sun.\n• In low light the colors fade to muddy green.\n• An east or filtered south/west window is ideal.\n• Variegated and dark-leaved cultivars especially need bright light to keep their colors.\n\n• In this home, the 1F Bathroom (set back from SE beam) and 1F Living Room corner are your best matches per PLANT_LIGHT_REF.",
      soil: "User's 60/40 potting/perlite is appropriate. Standard potting mix with extra drainage. Avoid heavy clay-based or pure-mineral mixes.",
      watering: "METHOD — between steady-moisture and soak-and-dry: Cordyline fruticosa (Asparagaceae, fluoride-sensitive like Dracaena) likes consistent moisture but the top 1–2\" must dry between waterings — never bone dry for long, never soggy.\n\nHOW TO CHECK READINESS (your 9.5\" pot):\n• Finger test: top 1–2\" dry = water — 60/40 mix in 9.5\" pot balances retention and drainage.\n• Pot weight: lighter than post-water = check finger depth.\n• Moisture meter: 3–4 in upper third = water.\n• Plant tells: drooping + dry soil = thirsty. Faded pink/red on new leaves + wet soil = overwatered or root stress.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC):\n• Hot AC season (Apr–Oct): every 7–8 days in 1F Bath (humidity helps); 8 days in 1F Corner.\n• Peak summer (Jun–Sep): every 7 days — AC dries pots despite outdoor humidity.\n• Mild winter (Nov–Feb): every 12–14 days.\n• 1F Bath shower humidity may extend intervals slightly; 2F SW would dry faster and scorch foliage — avoid.\n\nBOTTOM-WATERING: helpful for even root-zone moisture — soak tray 20 min, drain fully, empty saucer.\n\nWATER QUALITY (critical — per University of Hawaii and ASPCA family guidance):\n• Ti plants are FLUORIDE- and salt-sensitive (same Asparagaceae sensitivity as Dracaena).\n• Use distilled, rainwater, or filtered water. Central Texas tap causes brown crispy tips.\n• Flush with plain filtered water every 6–8 weeks to leach salts.\n\nOVER- vs UNDER-watering tells:\n• Over: mass leaf drop, yellow leaves, mushy cane base, sour soil, new leaves losing pink/red pigment.\n• Under: brown crispy tips (also fluoride), drooping with dry top 2\", leaf curl at edges.",
      pruning: "Easy to prune for shape — Ti plants regenerate from cuts.\n\n• Cut canes back to any height; new shoots emerge below the cut.\n• Best in spring before active growth.\n• Trim brown leaf tips with scissors following the natural leaf shape.\n• Wear gloves if you have sensitive skin — sap can be slightly irritating.\n• Wipe shears with alcohol between cuts to prevent disease spread.",
      propagation: "Multiple easy methods:\n\n• Stem cuttings: cut a 3–6\" section of cane, root horizontally in moist potting mix (eyes face up). Roots in 4–6 weeks.\n• Sucker/root division: gently divide root-clump suckers from the base of a mature plant.\n• Tip cuttings root in water in 2–4 weeks.\n• Spring or early summer is ideal.\n• Success rate ~80%.",
      repotting: "Every 2 years or when root-bound.\n\n• Spring is best.\n• Up-pot by 2\" diameter.\n• Don't fertilize for 4–6 weeks after to let nicked roots heal.\n• Ti plants can show repot shock (leaf drop, color fade) — give them 3–4 weeks to recover.",
      feeding: "Balanced liquid fertilizer at HALF strength every 3–4 weeks spring–summer.\n\n• Reduce to once monthly in fall.\n• None in winter unless growing under lights.\n• Flush soil every 2–3 months to clear salts (Ti plants get tip burn from salt buildup like Dracaenas).\n• Slow-release pellets in spring work well — 3-month coverage.",
      troubleshooting: "• Brown crispy leaf tips/edges → #1: fluoride/chlorine in tap water (per University of Hawaii Ti Plant guidance) + low indoor humidity (Central Texas AC ~30–45%). Fix: distilled/rain/filtered water, 1F Bath humidity or pebble tray, flush salts monthly.\n• Faded colors (pink/red → muddy green) → insufficient light — move to 1F Bath set back or 1F Corner; Ti needs 4+ hrs bright indirect.\n• Yellow leaves (bottom, one at a time) → natural aging.\n• Yellow leaves (multiple) → overwatering/root rot — inspect roots, repot if mushy.\n• Drooping/wilting → dry top 2\" = water with filtered water; wet soil = root rot check.\n• Leaf drop (mass, after repot) → repot shock — normal for 3–4 weeks post-repot; hold fertilizer.\n• Leaf curling → underwatering or low humidity — soak + boost humidity.\n• Scorched/faded patches → direct sun (especially 2F SW) — move to 1F Bath or Window.\n• Root rot (mushy roots, sour smell) → unpot, trim rot, repot in fresh 60/40 mix.\n• Spider mites (fine webs, dusty stippled leaves in dry AC) → rinse, insecticidal soap weekly × 3.\n• Mealybugs (white cotton in leaf joints) → alcohol Q-tip.\n• Scale (bumps on cane, sticky residue) → scrape, alcohol, horticultural oil.\n• Thrips (silvery leaf scars) → rinse, sticky traps, spinosad.\n• Fungus gnats → let top 1\" dry slightly; sticky traps.\n• Aphids (on new shoots) → rinse, insecticidal soap.\n• ⚠️ Toxic to cats and dogs — saponins cause vomiting, dilated pupils per ASPCA (Ti Plant / Cordyline fruticosa).",
    },
    sources: [
      { label: "Missouri Botanical Garden — Cordyline fruticosa", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b690" },
      { label: "University of Hawaii — Ti Plant Care", url: "https://www.ctahr.hawaii.edu/oc/freepubs/pdf/OF-24.pdf" },
      { label: "RHS — Cordyline fruticosa", url: "https://www.rhs.org.uk/plants/search-results?query=cordyline+fruticosa" },
      { label: "ASPCA — Ti Plant Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/ti-plant" },
      { label: "The Sill — Cordyline / Ti Plant Care Guide", url: "https://www.thesill.com/blog/plant-care" },
      { label: "The Spruce — Ti Plant (Cordyline) Care", url: "https://www.thespruce.com/grow-cordyline-indoors-1902747" }
    ]
  },

  assorted_cacti: {
    id: "assorted_cacti",
    repotSigns: [
      "The Mammillaria (pincushion) cluster has expanded to touch the pot rim on all sides — no more room for offsets",
      "The green Hylocereus rootstock (from the missing Moon Cactus) has GROWN in length — needs more root room proportionally",
      "Roots visible pushing out of the 7\" drainage holes",
      "Any of the three cacti softening at the very base (rot check first, but if healthy it's often a root-space signal)",
      "Water drains through in seconds — mineral mix + rootbound = zero moisture reserve",
      "New pincushion offsets are pale/small compared to previous ones"
    ],
    displayName: "Cacti Mix",
    potSize: '7"',
    category: "succulent",
    names: {
      common: [
        "Moon Cactus (Ruby Ball Cactus, grafted) × 1",
        "Hylocereus rootstock (Dragon Fruit Cactus, orphaned graft base) × 1",
        "Spiny Pincushion Cactus (cluster of 4 heads) × 1"
      ],
      scientific: "1× Gymnocalycium mihanovichii (grafted Moon Cactus, intact) + 1× Hylocereus undatus rootstock (colored top cut off; healthy green stalk remains) + 1× Mammillaria spinosissima (clustering form, 4 heads)"
    },
    /* Watering schedule unchanged from before — the orphaned Hylocereus
     * rootstock has the SAME water needs as a regular Dragon Fruit cactus
     * (which is what it is), well within the existing schedule. The remaining
     * intact Moon Cactus is still the moisture-needy species in the pot. */
    wateringDays: 18,
    wateringDaysHot: 15,
    wateringDaysCool: 35,
    currentSoilMix: "cactus_mix",
    comments: "🌵 Three specimens in a mixed 7\" planter (50/50 cacti mix + perlite, repotted within last 2 months):\n\n1. 1× Gymnocalycium mihanovichii (Moon Cactus, the still-intact one) — colored top grafted onto a Hylocereus rootstock. Healthy.\n2. 1× Hylocereus undatus ROOTSTOCK (no top) — the other Moon Cactus's colored bud was dying, so you cut it off. The green stalk left behind is the original Dragon Fruit cactus rootstock and is now a perfectly valid standalone houseplant. With good care it can grow tall (3–6 feet over years), eventually flower at night with massive white blooms, and even produce dragon fruit if temperatures + pollination cooperate.\n3. 1× Mammillaria spinosissima — clustering cluster of 4 heads. Healthy.\n\n📌 The orphaned rootstock can also serve as a fresh graft base if you ever want to attach a new colored Gymnocalycium top. See pruning/propagation tips.",
    idealSoil: ["cactus_mix"],
    soilNotes: "50/50 cacti mix + perlite suits all three specimens. The orphaned Hylocereus is the most rot-resistant of the three (epiphytic cactus, very forgiving). Mammillaria and Gymnocalycium remain the most water-sensitive — keep the schedule conservative.",
    conditions: {
      light:        { ideal: "Bright, mostly direct — 4+ hrs sun (Mammillaria + Hylocereus); filtered/dappled sun for the remaining Moon Cactus", passing: "Bright indirect with some morning direct sun" },
      temperature:  { ideal: "65–85°F (18–29°C); cool nights (45–55°F) in winter triggers spring blooms in all three", passing: "50–95°F" },
      humidity:     { ideal: "20–40%",                                           passing: "Dry indoor air is fine" },
      soilMoisture: { ideal: "Bone-dry between waterings",                       passing: "Drought tolerant — weeks to months" }
    },
    tips: {
      lighting: "BRIGHT light is essential — but the three specimens have slightly different preferences:\n\n• Mammillaria spinosissima (Pincushion) loves full sun. A south-facing window is ideal. Direct afternoon sun is fine.\n• Hylocereus undatus (the orphaned rootstock, now standalone) is from tropical Central America and prefers bright direct light but tolerates partial shade. Outdoors in summer it thrives in dappled sun; indoors a south or east window works well.\n• Gymnocalycium mihanovichii (the remaining intact Moon Cactus) prefers partial sun — it's a forest-floor species from Paraguay. Too much direct afternoon sun can scorch the colored top (no chlorophyll = sunburns easily).\n• Compromise: south or west window with sheer curtain during peak afternoon hours. East-facing window also works.\n• Rotate the pot 1/4 turn weekly so all three plants grow evenly.\n• In summer, the Mammillaria and Hylocereus appreciate a vacation outdoors in dappled sun — but keep the Gymnocalycium in a shadier spot.\n• ⚠️ If the Moon Cactus top starts fading or showing white sun-bleached patches, you're giving too much direct sun.\n• In this home, 2F Living Room (215° SW — intense afternoon sun, low humidity) is THE desert powerhouse per PLANT_LIGHT_REF.",
      soil: "User's 50/50 cacti mix + perlite is exactly right for all three. See soilNotes.",
      watering: "METHOD — strict soak-and-dry, err dry: schedule tuned to the most moisture-sensitive specimen (Gymnocalycium Moon Cactus) per NC State Extension cactus guidance.\n\nHOW TO CHECK READINESS (your 7\" mixed planter, 50/50 cactus mix + perlite):\n• Skewer test: push to pot bottom — if cool/stained, wait 3–5 more days.\n• Pot weight: light 7\" terracotta = ready.\n• Finger: top 2\" bone dry throughout.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 15–18 days in 2F LR SW.\n• Peak summer (Jun–Sep): every 15 days — active growth in mineral mix.\n• Mild winter (Nov–Feb): every 35 days, taper to near-zero — cool-dry rest (45–55°F) triggers spring blooms in all three (per NC State Extension).\n• Grow lights help Mammillaria + Hylocereus through Central Texas winter short days.\n• NEVER in 2F Bathroom (stagnant humid) or 2F Room 2 (humidifier).\n\nTECHNIQUE:\n• Water DEEPLY at soil line — soak until runoff, empty saucer within 15 min.\n• Don't get water on the colored Moon Cactus top (no chlorophyll = rots easily).\n• Don't water onto the Hylocereus cut top — should be callused by now.\n• Hylocereus and Mammillaria tolerate slightly drier than the Gymnocalycium schedule.\n• When in doubt, skip this watering.",
      pruning: "Almost no pruning needed for these three.\n\n• Remove any shriveled, dead, or rotting tissue with sterile shears.\n• Mammillaria spinosissima has long sharp central spines — handle with thick leather gloves or folded newspaper.\n• Moon Cactus is also spiny but the spines are shorter; still wear gloves.\n• HYLOCEREUS ROOTSTOCK CARE (the orphaned stalk): If the cut at the top hasn't callused yet (still wet/dark), let it dry for 5–7 days in low light without water. Once callused, the stalk will start producing new growth from areoles (the little spiny bumps along the ridges) within 1–3 months. You can either:\n  ► Let it grow as a regular Dragon Fruit cactus — eventually 3–6 feet tall, can produce fruit.\n  ► Use it as a fresh GRAFT BASE for another colored Gymnocalycium top (see propagation).\n  ► Take a 4–6\" section as a cutting and re-root it as a standalone Hylocereus.\n• If a Moon Cactus graft union fails on the remaining intact one, you can try to re-graft, but most people just replace the plant.\n• Offsets/pups will form naturally over time — leave them attached for a clumping look, or detach for propagation.",
      propagation: "All three species propagate.\n\nMAMMILLARIA SPINOSISSIMA:\n• The clustering form (your cluster of 4) naturally produces new heads. Gently twist off an offset when it's ~1\" across.\n• Let the wound CALLUS for 5–7 days in dry shade.\n• Plant in dry cactus mix.\n• Don't water for 2 weeks.\n• Roots in 4–8 weeks. Success rate ~85%.\n• Seeds are also viable but very slow.\n\nGYMNOCALYCIUM MIHANOVICHII (the remaining Moon Cactus):\n• If grafted, the colored top can only survive on a rootstock — you can't propagate the colored part from cuttings.\n• The green natural form pups occasionally from the base — separate, callus, plant in dry mix.\n• If you want more colored Moon Cacti, you can GRAFT them onto your orphaned Hylocereus rootstock — see below.\n\nHYLOCEREUS UNDATUS (the orphaned rootstock):\n• Cuttings root easily. Take a 4–6\" stalk section, let callus 7–10 days, plant in dry cactus mix, water lightly after 2 weeks.\n• ⭐ POSSIBLE FUTURE PROJECT: Use the cut top of your orphaned stalk as a fresh graft base. Buy or trade for a small colored Gymnocalycium pup (1/2\"–1\" across), make a clean horizontal cut on both the rootstock top AND the pup, press them together so the vascular rings ALIGN (visible as a darker ring inside the cactus tissue), and bind with rubber bands across the top for 7–10 days. Success rate 60–80% with practice. Best done in spring/early summer with healthy, well-watered tissue.\n• Seed propagation is possible but takes years to reach grafting size.",
      repotting: "Every 3–4 years for this mixed planter.\n\n• Spring only (active growth).\n• Wear thick leather gloves and use folded newspaper or kitchen tongs to grip plants.\n• Up-pot by 1\" diameter only.\n• If the species start crowding each other, consider separating into individual pots — the Hylocereus especially will eventually outgrow this 7\" pot as it climbs.\n• Refresh medium if it's compacted or showing salt deposits.\n• Don't water for 1 week after — let any nicked roots heal.",
      feeding: "VERY light feeder.\n\n• Cactus-specific fertilizer at HALF strength once in spring (March) and once in mid-summer (July).\n• Skip fall and winter entirely.\n• All three species are slow growers — don't overfeed expecting fast growth. Overfertilized cacti grow soft, discolored, and prone to rot.\n• ⚠️ The Hylocereus rootstock will accept slightly more feeding if you want to push it toward flowering (tomato fertilizer with higher phosphorus, half-strength, every 4 weeks in spring/summer once it's a few years old).",
      troubleshooting: "SYMPTOM → CAUSE → FIX (by specimen):\n\nMOON CACTUS (Gymnocalycium):\n• Colored top wobbles loose → graft union failed (typical 3–5 yr lifespan).\n• Pale/white patches on colored top → SUNSCALD. Sheer curtain during peak SW hours.\n• Black mushy spots → OVERWATERING / root rot. Cut above rot, callus, replant dry.\n• Pinkish-orange spots (not sunburn) → fungal infection; copper fungicide.\n\nHYLOCEREUS ROOTSTOCK:\n• Cut top still wet/dark → didn't callus; rub with cinnamon/sulfur, dry 7 more days.\n• New growth from areoles → healthy; adapting as standalone Dragon Fruit cactus.\n• Stalk shriveling → underwatering or root damage from graft removal; water modestly once dry.\n• Stalk yellowing → too much direct sun; bright indirect 2 weeks.\n• Soft mushy section → rot; cut above, callus, replant. Hylocereus usually recovers.\n\nPINCUSHION (Mammillaria spinosissima):\n• Stretching tall and pale → LOW LIGHT. Move to 2F LR SW per PLANT_LIGHT_REF.\n• Soft/mushy heads → ROOT ROT. Salvage healthy heads as cuttings.\n• White cottony spots → MEALYBUGS (#1 cactus pest); alcohol Q-tip or systemic.\n• Brown corky base patches → NORMAL aging (corking).\n• Spines browning at tips → underwatering in warm room; water once if dry.\n• No flowers → need cool-dry winter rest (45–55°F, minimal water Dec–Feb).\n\nALL:\n• Soft mushy base / collapse → ROOT ROT from overwatering. Cut above rot, callus, repot dry.\n• Scale on stems → scrape, alcohol, horticultural oil.\n• Fungus gnats → soil too wet; dry out; sticky traps.\n• Spider mites (rare on cacti) → rinse, insecticidal soap.\n• ⚠️ Not chemically toxic per NC State Extension (Mammillaria non-toxic), but SPINES are mechanical hazards — Mammillaria's long central spines can puncture skin and curious pets. Keep out of reach."
    },
    sources: [
      { label: "NC State Extension — Mammillaria (Pincushion Cactus)", url: "https://plants.ces.ncsu.edu/plants/mammillaria/" },
      { label: "Missouri Botanical Garden — Gymnocalycium mihanovichii", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=281166" },
      { label: "Missouri Botanical Garden — Mammillaria spinosissima", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b350" },
      { label: "Missouri Botanical Garden — Hylocereus undatus (Dragon Fruit)", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276866" },
      { label: "University of Florida IFAS — Pitaya (Dragon Fruit) Production", url: "https://edis.ifas.ufl.edu/publication/HS1068" },
      { label: "University of Arizona Cooperative Extension — Cactus Care", url: "https://extension.arizona.edu/publication/cacti-succulents" },
      { label: "Llifle Encyclopedia — Gymnocalycium mihanovichii", url: "http://www.llifle.com/Encyclopedia/CACTI/Family/Cactaceae/8049/Gymnocalycium_mihanovichii" },
      { label: "Llifle Encyclopedia — Mammillaria spinosissima", url: "http://www.llifle.com/Encyclopedia/CACTI/Family/Cactaceae/12152/Mammillaria_spinosissima" },
      { label: "Llifle Encyclopedia — Hylocereus undatus", url: "http://www.llifle.com/Encyclopedia/CACTI/Family/Cactaceae/24310/Hylocereus_undatus" },
      { label: "Cactus and Succulent Society of America — Care Resources", url: "https://cactusandsucculentsociety.org/" },
      { label: "ASPCA — Cactus / Succulent Toxicity Reference", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants" }
    ]
  },

  royal_ivy: {
    id: "royal_ivy",
    repotSigns: [
      "Sparse new growth — vines produce fewer new leaves per foot than they used to",
      "New leaves come in smaller than mature leaves",
      "Yellowing lower leaves persistent (Ivy sheds bottom leaves when rootbound; more than 1–2 a month = signal)",
      "Roots circling out of the 5\" drainage holes",
      "Water drains through in <5 seconds",
      "Brown crispy tips despite adequate humidity — often a rootbound absorption issue disguised as humidity"
    ],
    displayName: "Royal Ivy (English Ivy)",
    potSize: '5"',
    category: "tropical",
    names: {
      common: ["Royal Ivy", "English Ivy", "Common Ivy"],
      scientific: "Most likely Hedera helix 'Royal Hustler' or similar variegated cultivar (verify if labeled differently)"
    },
    wateringDays: 7,
    wateringDaysHot: 6,
    wateringDaysCool: 11,
    currentSoilMix: "amended_potting",
    comments: "Repotted in last 2 months. Soil is 70/30 potting/perlite, 5\" pot. \"Royal Ivy\" is most likely a marketing name for an English Ivy (Hedera helix) cultivar — confirm the cultivar from the tag if available. Care below assumes English Ivy.",
    idealSoil: ["standard_potting", "amended_potting"],
    soilNotes: "User's 70/30 potting/perlite is well-suited for English Ivy — moisture-retentive enough but not soggy. Ivies are forgiving but rot in dense, compacted soil.",
    conditions: {
      light:        { ideal: "Bright, indirect (east/north window)",             passing: "Medium indirect; variegated cultivars need MORE light to keep variegation" },
      temperature:  { ideal: "55–75°F (13–24°C) — cooler than most houseplants", passing: "45–85°F; struggles above 80°F" },
      humidity:     { ideal: "50–60%",                                           passing: "40%+; spider mites attack dry-air ivies" },
      soilMoisture: { ideal: "Top 1\" dries between waterings",                  passing: "Slightly drought-tolerant" }
    },
    tips: {
      lighting: "Bright INDIRECT light is ideal — English Ivy prefers cooler/dimmer conditions than most tropicals.\n\n• A north window or several feet from an east window works beautifully.\n• Direct hot sun bleaches the leaves.\n• Variegated cultivars (silver, gold, white) need MORE light than solid green to keep their pattern. Insufficient light → revert to all-green.\n• Outdoors in summer: dappled shade only.\n• In this home, the 1F Living Room window (36° NE, soft bright indirect) is your best match per PLANT_LIGHT_REF — cool enough for ivy, bright enough for variegation.",
      soil: "User's 70/30 potting/perlite is appropriate. English Ivy likes well-draining soil with moderate moisture retention. Avoid pure mineral or pure peat mixes.",
      watering: "METHOD — soak-and-dry (slightly drier bias): English Ivy prefers evenly moist but NOT soggy soil — let the top 1–2\" dry before a deep drench. Per The Spruce and University of Florida IFAS, ivy likes to stay slightly on the dry side vs most tropicals; overwatering is the #1 killer indoors.\n\nHOW TO CHECK READINESS (your 5\" pot, 70/30 amended potting mix):\n• Finger test: top 1\" dry to the touch = water; damp = wait.\n• Pot weight: lighter than post-soak = ready.\n• Moisture meter: 3–4 upper third = water.\n• Plant tells: crispy brown edges = underwatered; yellow mushy leaves on wet soil = overwatered.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 6–7 days in 1F Window — AC dries pots despite outdoor humidity.\n• Peak summer (Jun–Sep): every 6 days; ivy struggles above 80°F — keep away from hot SW windows (2F LR).\n• Mild winter (Nov–Feb): every 10–11 days — cooler temps suit ivy; reduce frequency.\n• Empty saucer within 15 min — never standing water.\n• Spider mites attack dry-air ivies in AC — 50%+ humidity helps (1F Window vault helps slightly).\n\nWATER QUALITY: room-temp water; flush soil every 2–3 months to clear salts.\n\nOVER- vs UNDER-watering tells:\n• Under: brown crispy leaf edges, dry top 1\", wilt on dry soil.\n• Over: yellow leaves with mushy stems, root rot smell, fungus gnats — unpot if persistent.",
      pruning: "Aggressive pruning is welcome — ivies bounce back.\n\n• Pinch back tips weekly during growing season to encourage bushy fullness.\n• Trim leggy or browning stems back to a node.\n• Use sterile shears.\n• Save the cuttings for propagation (see Propagation).\n• Best in spring/early summer.",
      propagation: "VERY EASY — one of the simplest plants to propagate.\n\n• Take 4–6\" stem cuttings just below a node.\n• Strip the bottom 2–3 leaves.\n• Stick directly into water OR moist potting mix.\n• Roots in 2–4 weeks.\n• Success rate >90% — ivy will root in almost any conditions.\n• Best in spring/early summer but works year-round.",
      repotting: "Every 1–2 years.\n\n• Spring is best.\n• Up-pot by 1\" diameter only — ivy likes being slightly root-bound (more vigorous growth).\n• Trim dead/circling roots when repotting.\n• Don't water for 2–3 days after to let any nicked roots heal.",
      feeding: "Balanced liquid fertilizer at HALF strength every 4 weeks spring/summer.\n\n• Reduce to once every 8 weeks in fall.\n• None in winter.\n• Flush soil every 2–3 months to clear salt buildup.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Brown crispy leaves/edges → underwatering OR low humidity (Central Texas AC ~30–45% RH). Soak when top 1\" dry; optional pebble tray or move toward bathroom humidity.\n• Yellow leaves with mushy stems → OVERWATERING / root rot (per The Spruce). Let dry, unpot and trim black roots if persistent.\n• Pale stippled leaves + fine webs → SPIDER MITES (#1 ivy pest in dry AC per University of Florida IFAS). Shower foliage, insecticidal soap weekly × 3, raise humidity above 50%.\n• Lost variegation / all-green new growth → low light. Move to 1F Window per PLANT_LIGHT_REF; trim reverted branches.\n• Leggy sparse vines → insufficient light OR skipping pruning — move brighter, pinch tips weekly.\n• Leaf drop in winter → cold drafts below 55°F — move away from doors/AC vents.\n• Reverted all-green growth on variegated cultivar → trim at node to preserve pattern.\n• Mealybugs (cottony white) → alcohol Q-tip.\n• Scale on stems → alcohol swab.\n• Fungus gnats → reduce watering, sticky traps.\n• Aphids on new growth → rinse, insecticidal soap.\n• ⚠️ TOXIC to cats and dogs per ASPCA (English Ivy / Hedera helix) — triterpenoid saponins cause vomiting, diarrhea, abdominal pain, hypersalivation if ingested.\n• ⚠️ Contact dermatitis from sap on sensitive skin — gloves recommended when pruning (per Missouri Botanical Garden)."
    },
    sources: [
      { label: "Missouri Botanical Garden — Hedera helix", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276956" },
      { label: "RHS — Hedera helix", url: "https://www.rhs.org.uk/plants/search-results?query=hedera+helix" },
      { label: "University of Florida IFAS — Hedera helix", url: "https://edis.ifas.ufl.edu/publication/MG313" },
      { label: "ASPCA — English Ivy Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/english-ivy" },
      { label: "The Sill — Ivy Care Guide", url: "https://www.thesill.com/blog/plant-care" },
      { label: "The Spruce — English Ivy Care", url: "https://www.thespruce.com/english-ivy-plants-2132215" }
    ]
  },

  /* ============= WATER PROPAGATIONS ============= */

  wandering_dude: {
    id: "wandering_dude",
    repotSigns: [
      "Glass bowl has visible root circles at the bottom (you can see straight through)",
      "The 4\" glass bowl feels dense with roots when tilted — soil pushed to the rim",
      "New stems are noticeably shorter/thinner than mature ones",
      "Water sits at the top for 20+ seconds (compacted soil + rootbound in a no-drainage bowl)",
      "Purple/silver striping fades to dull green (usually light — but root constraint amplifies it)",
      "⚠️ ANY visible root browning through the glass = urgent — the no-drainage bowl is likely retaining stale water. Repot to a drained pot."
    ],
    displayName: "Wandering Dude",
    potSize: '4" glass bowl',
    cuttingsCount: 6,
    category: "tropical",
    names: {
      common: ["Wandering Dude", "Inch Plant", "Silver Inch Plant", "Wandering Jew (older common name, now generally avoided)"],
      scientific: "Tradescantia zebrina"
    },
    /* Planted in a 4" GLASS BOWL — no drainage holes typically. This dramatically
     * changes watering: stays wet much longer than a drained pot would. Intervals
     * stretched ~30% vs. a traditional 4" terracotta pot. */
    wateringDays: 9,
    wateringDaysHot: 7,
    wateringDaysCool: 14,
    currentSoilMix: "amended_potting",
    comments: "All 6 cuttings transferred from water propagation into a 4\" GLASS BOWL together. ⚠️ Glass bowls have NO drainage — this is the #1 risk for Tradescantia (rots faster than almost any other houseplant when sitting wet). Use a 1\" layer of pebbles + activated charcoal at the bottom for a false drainage zone, water very sparingly (top 1\" must feel dry), and tilt the bowl every 2 weeks to drain any excess.",
    idealSoil: ["amended_potting", "standard_potting"],
    soilNotes: "70/30 potting/perlite blend (amended_potting) — the extra perlite is critical in a no-drainage glass container. Even better: add a 1\" layer of pebbles + a thin layer of horticultural charcoal at the bottom of the bowl BEFORE the soil. This creates a false-drainage zone that buys you a margin if you slightly overwater.",
    conditions: {
      light:        { ideal: "Bright indirect for vibrant purple/silver stripes; 1–2 hrs direct morning sun deepens color", passing: "Medium indirect; colors fade to dull green in low light" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "60–90°F; avoid below 55°F" },
      humidity:     { ideal: "50%+ (glass bowl naturally raises local humidity)", passing: "40%+; roots faster in higher humidity" },
      soilMoisture: { ideal: "Top inch fully dry between waterings",              passing: "⚠️ DANGER — soggy soil at the bottom is invisible in a glass bowl; tilt to check" }
    },
    tips: {
      lighting: "Bright INDIRECT light brings out the iconic purple-silver-green zebra striping. With a glass bowl, light from below also reflects through and back up — a real advantage for Tradescantia.\n\n• Best location: 1–2 feet from an east window, or 3–5 feet back from a south/west window.\n• In low light the leaves fade to dull green-purple within 6–8 weeks.\n• Direct afternoon sun through glass can magnify and scorch leaves — avoid unfiltered direct south/west sun.\n• Rotate the bowl every 2 weeks for even color development.\n• In this home, the 1F Bathroom (127° SE, high humidity) and 1F Room 1 (131° SE + fan) are your best matches per PLANT_LIGHT_REF — Tradescantia loves humidity and bright AM light.",
      soil: "Currently in 70/30 potting/perlite. CRITICAL for a glass bowl with no drainage:\n• 1\" bottom layer of small pebbles or LECA (creates false-drainage void).\n• Thin sprinkle of activated charcoal on top of the pebbles (prevents anaerobic stink).\n• Then the 70/30 potting/perlite on top.\n\nLong-term option: drill a drainage hole in the bottom of the glass bowl with a diamond-coated bit (a 2-min job; converts it to a true planter). Otherwise, plan to repot into a traditional drainage pot at the 6-month mark.",
      watering: "METHOD — soak-and-dry adapted for NO-DRAINAGE bowl (soil-graduated cuttings): 6 cuttings moved from water to soil in your 4\" glass bowl — same top-1\" dry rule as a drained pot, but NEVER soak to runoff (nowhere for excess to go). Per University of Florida IFAS and NC State Extension, Tradescantia rots faster than almost any houseplant when sitting wet.\n\nHOW TO CHECK READINESS (your 4\" glass bowl, 6 cuttings, amended potting mix):\n• Finger test: top 1\" must be bone-dry before ANY water.\n• Visual check through glass: look for standing water or dark saturated zone at the bottom — if present, tilt and pour off immediately.\n• Plant tells: purple striping dulls + slight wilt on dry soil = thirsty. Yellow stems at soil line on wet soil = rot.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 7–9 days — LESS than a drained 4\" pot would need.\n• Peak summer (Jun–Sep): every 7 days in 1F Bathroom (humidity slows evaporation); every 9 days in 1F Room 1 (fan dries faster).\n• Mild winter (Nov–Feb): every 12–15 days — growth slows; when in doubt, wait.\n• Pour just enough to moisten the top half of soil — NEVER until puddling at the base.\n• Tilt bowl 30 min after watering; pour off any standing reservoir. Repeat full tilt-drain every 4–6 weeks.\n• Use room-temp filtered or tap-sat-out water.\n\nOVER- vs UNDER-watering tells:\n• Under: dull faded striping, slight wilt, top 1\" dry — light water at soil edge.\n• Over: stems rotting at soil line, cloudy/smelly bottom layer, yellow mushy leaves, fungus gnats — stop watering, tilt drain, may need repot to drained container.",
      pruning: "Tradescantia gets leggy fast — pinch the top growth tip on each vine every 4–6 weeks to encourage bushy, dense growth.\n\n• Pinch just above a node with clean fingertips (no tools needed — Tradescantia stems are very soft).\n• Each pinch produces 2 new branches from below the cut.\n• Use removed tips as new propagation cuttings — Tradescantia roots in water in 5–10 days, the fastest of all your plants.\n• Trim any yellowing or browning lower leaves at the base.",
      propagation: "Easiest plant in your collection to propagate.\n\nMethod A (water): cut a 4\" tip with 2–3 nodes, drop in a jar of water with nodes submerged. Roots in 5–10 days. Plantable in 2 weeks.\nMethod B (soil): stick a tip cutting directly into moist soil — roots in 2–3 weeks at >90% success.\nMethod C (lay on soil): lay a vine horizontally on damp soil; each node will root and shoot a new vine — fast way to fill out a pot.\n\nBest season: any time; fastest in spring/summer.",
      repotting: "Currently in a 4\" glass bowl with 6 cuttings.\n\n6-month checkup:\n• Lift one cutting carefully and check roots — if they're circling the bottom, time to upsize.\n• Recommended next step: transfer the whole clump to a 5–6\" pot with DRAINAGE (terracotta or plastic with holes). The plant will visibly perk up once it can drain freely.\n• Tradescantia tolerates aggressive root pruning if you want to keep it in the same bowl — trim the bottom 1/3 of roots before replanting.\n• Spring is ideal for repotting.",
      feeding: "Wait 6 weeks after transition for roots to establish before feeding.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (10-10-10 or 20-20-20) at QUARTER strength every 4–6 weeks in spring/summer.\n• ⚠️ Go EXTRA light on fertilizer in a no-drainage glass bowl — fertilizer salts build up with no way to flush them. Burned leaf tips are the warning sign.\n• Stop fertilizing entirely Oct–Feb.\n• Every 2 months, fully tilt the bowl and pour off any reservoir water to flush salts.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\nGLASS-BOWL / NO-DRAINAGE SPECIFIC:\n• Stems rotting at soil line → overwatering OR missing pebble/charcoal drainage layer. Tilt out excess, let dry completely; repot to drained 5–6\" pot if persistent.\n• Cloudy/smelly water visible at bottom → algae or anaerobic bacteria. Drain bowl, refresh charcoal layer, repot if smell persists.\n• White crusty buildup on glass → mineral salts from tap water — switch filtered, flush via tilt-drain quarterly.\n\nGENERAL SYMPTOM → CAUSE → FIX:\n• Leggy / pale stems / faded purple striping → low light (per NC State Extension). Move to 1F Bathroom or 1F Room 1 per PLANT_LIGHT_REF.\n• Brown crispy leaf tips → tap-water minerals OR Central Texas AC dryness (~30–45% RH) — filtered water, optional pebble tray in bathroom.\n• Yellow lower leaves → natural aging OR oversaturated soil — check bottom through glass.\n• Bare vines at base → time to pinch tips and lay cuttings on soil to fill in.\n• Wilting + dry top 1\" → thirsty — light water at edge.\n• Wilting + wet soil → root rot — stop watering, inspect through glass, repot if roots brown.\n• Spider mites (#1 pest in dry AC per NC State Extension — fine webs, stippling, worse in winter) → shower foliage, insecticidal soap weekly × 3, move to 1F Bathroom for humidity.\n• Mealybugs (cottony white in leaf axils) → alcohol Q-tip.\n• Scale (rare) → alcohol swab.\n• Fungus gnats → reduce watering, sticky traps.\n• Aphids on new tips → rinse, insecticidal soap.\n• Contact dermatitis from sap when pruning → wear gloves if sensitive (per NC State Extension).\n• ⚠️ Mildly TOXIC per ASPCA (Wandering Jew / Tradescantia) — sap causes dermatitis on contact and GI upset if ingested by pets. Keep cats from chewing."
    },
    sources: [
      { label: "Missouri Botanical Garden — Tradescantia zebrina", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=a801" },
      { label: "RHS — Tradescantia zebrina", url: "https://www.rhs.org.uk/plants/search-results?query=tradescantia+zebrina" },
      { label: "University of Florida IFAS — Tradescantia zebrina", url: "https://edis.ifas.ufl.edu/publication/FP589" },
      { label: "ASPCA — Tradescantia Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/wandering-jew" },
      { label: "The Sill — Tradescantia Care Guide", url: "https://www.thesill.com/blog/plant-care" },
      { label: "NC State Extension — Wandering Dude", url: "https://plants.ces.ncsu.edu/plants/tradescantia-zebrina/common-name/wandering-dude/" }
    ]
  },

  golden_pothos: {
    id: "golden_pothos",
    repotSigns: [
      "Roots visibly circling out of the 5\" drainage holes",
      "Aerial roots on the vines start reaching for the soil surface (or toward a moss pole)",
      "New leaves are progressively smaller than the previous ones",
      "Water drains through the pot in <5 seconds",
      "Growth stalls in growing season despite good light",
      "Vines get sparse — internodes lengthen but leaves are small (rootbound stretch)"
    ],
    displayName: "Golden Pothos",
    potSize: '5"',
    cuttingsCount: 7,
    category: "pothos",
    names: {
      common: ["Golden Pothos", "Devil's Ivy", "Money Plant", "Solomon Islands Ivy"],
      scientific: "Epipremnum aureum (the green-and-yellow original cultivar)"
    },
    /* 7 cuttings (originally 9 — 2 went to the combo pot) in a 5" planter.
     * Smaller-than-Monstera Aroid, but well-draining mix and 7 cuttings means
     * faster transpiration than a single-cutting pot. */
    wateringDays: 7,
    wateringDaysHot: 6,
    wateringDaysCool: 12,
    currentSoilMix: "aroid_mix",
    comments: "Graduated from water propagation. 7 cuttings (the original 9 minus 2 that went into the Mixed Pothos combo pot) potted together in a single 5\" planter. Golden Pothos is the most foolproof houseplant in existence — listed by NASA in the 1989 Clean Air Study for removing formaldehyde, benzene, and carbon monoxide. Establishment in soil takes 4–6 weeks; expect to upsize to 6–7\" in year 2 once vines start trailing past the rim.",
    idealSoil: ["aroid_mix", "amended_potting", "standard_potting"],
    soilNotes: "Currently in aroid mix — best choice for long-term Pothos health (the chunky bark + perlite gives oxygen to roots that, in nature, climb tropical trees as hemiepiphytes). Standard potting + 30% perlite is a fine alternative if you need to repot in a pinch.",
    conditions: {
      light:        { ideal: "Bright, indirect — for the crispest gold variegation",  passing: "Tolerates low light — most light-tolerant of all pothos cultivars; will simply fade to greener and grow slower" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "55–90°F; chill damage below 50°F" },
      humidity:     { ideal: "50%+",                                             passing: "30%+ — exceptionally tolerant of dry household air" },
      soilMoisture: { ideal: "Top 1–2 inches dry between deep waterings",          passing: "Tolerates short drought; overwatering kills MUCH faster than under" }
    },
    tips: {
      lighting: "Bright INDIRECT light keeps the gold variegation crisp and saturated. Native habitat: tropical forest understory in the Solomon Islands, where it climbs trees toward dappled sun.\n\n• Best spot: 2–4 feet from an east-facing window, or 4–8 feet back from a south/west window.\n• Avoid direct afternoon sun — leaves bleach and crisp.\n• In low light the yellow fades to green within 6–8 weeks but the plant survives fine — Golden Pothos is THE most low-light-tolerant pothos cultivar.\n• Rotate the pot 1/4 turn every 2 weeks for balanced growth across all 7 cuttings.\n• Pothos leaves naturally point toward their light source — use this as a free 'light meter'.\n• In this home, the 1F Living Room window (36° NE, soft bright indirect) and NW rooms (2F Room 1/2) are your best matches per PLANT_LIGHT_REF — Golden Pothos is the most placement-flexible of your pothos.",
      soil: "Aroid mix is ideal: 1 part potting soil + 1 part perlite + 1 part orchid bark + a pinch of horticultural charcoal. Slightly acidic pH (5.5–7.0) is preferred.\n\n• Why chunky: Golden Pothos is a hemiepiphyte — in the wild it starts on the ground and climbs trees, so its roots are adapted to high airflow.\n• Avoid: pure peat moss, garden soil, anything that compacts.\n• Refresh top 2\" of soil every spring even between repots.",
      watering: "METHOD — soak-and-dry (soil-graduated cuttings): These 7 cuttings moved from water to soil in your 5\" pot with aroid mix — use the same soak-and-dry rhythm, not water-propagation levels. Per The Spruce and University of Florida IFAS, let the top 1–2\" of soil dry fully before a deep drench until water runs from drainage holes; empty the saucer within 15 minutes.\n\nHOW TO CHECK READINESS (your 5\" pot, 7 cuttings):\n• Finger test: stick 2 knuckles deep — damp/cool = wait; dry and crumbly at 2\" = water.\n• Pot weight: a thirsty 5\" pot feels noticeably lighter than 24 hrs after a soak.\n• Moisture meter: 3–4 in the upper half = time to water; don't water at 7+ unless confirming a dry deep zone.\n• Plant tells: slight leaf droop + dry top 2\" = thirsty (recovers in 4–6 hrs). Yellowing with wet soil = overwatered.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH despite humid summers outdoors):\n• Hot AC season (Apr–Oct): every 6–7 days — AC dries pots faster than outdoor humidity suggests.\n• Peak summer (Jun–Sep): every 6 days if near a vent or in 1F Room 1 (overhead fan); every 7–8 days in 1F Window.\n• Mild winter (Nov–Feb): every 10–12 days — growth slows; when in doubt, wait 2 extra days.\n• Golden Pothos is famously forgiving of missed waterings but rots fast in soggy soil — overwatering is the #1 killer (per RHS and The Spruce).\n\nWATER QUALITY: room-temp filtered or tap-sat-out overnight.\n\nOVER- vs UNDER-watering tells:\n• Under: leaves droop then perk after watering; soil pulls away from pot edges; top 2\" bone dry.\n• Over: multiple yellow leaves (especially lower), mushy stems, fungus gnats, persistent wet soil smell — unpot and inspect roots if yellowing persists.",
      pruning: "Pothos is one of the most prunable plants in existence — every cut produces new growth from below.\n\n• Pinch tips just above a node to keep the plant bushy and prevent leggy vines.\n• Cut long trailing vines back by 1/3 in spring to encourage thicker stems.\n• Save EVERY cutting — Golden Pothos roots in water in 1–2 weeks at >95% success rate. Free new plants.\n• Use sterile scissors; wipe with rubbing alcohol between cuts.",
      propagation: "The poster child for easy propagation.\n\n• Take 4–6\" tip cuttings, each with at least 1 node and ideally a leaf.\n• Water method: drop in a jar of water with nodes submerged, change water weekly. Roots in 1–2 weeks. Plantable at 2\" roots.\n• Soil method: stick directly into moist soil under a clear cup or bag for 2 weeks. Roots in 3–4 weeks.\n• Success rate >95% in both methods.\n• Best season: any time; fastest in spring/summer.",
      repotting: "Newly potted — leave alone for 6+ months.\n\nUpsize timeline:\n• 5\" → 6\" at year 1 (when roots circle the pot or come out of drainage holes).\n• 6\" → 7–8\" at year 2.\n• Up-pot by only 1\" diameter each time — Pothos prefers being slightly root-bound.\n• Best season for repotting: spring (March–May).\n• Optional power move: add a 24\" moss pole or coir totem to the center of the pot. Pothos leaves DRAMATICALLY enlarge (sometimes 4–6× normal size) when allowed to climb, with deeper fenestrations like an immature Monstera.",
      feeding: "Hold off feeding for 4–6 weeks while cuttings establish soil roots.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (20-20-20) at HALF strength every 4 weeks in spring/summer.\n• Slow-release pellets (Osmocote) in spring are an easy alternative.\n• Flush the soil with plain water every 2–3 months to prevent fertilizer salt buildup.\n• Stop feeding Oct–Feb.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Yellow leaves (multiple, lower first) → OVERWATERING (#1 killer per The Spruce). Check: wet soil + droop = rot; dry top 2\" + droop = thirst. Unpot and trim black/mushy roots, repot in fresh aroid mix if yellowing persists.\n• Yellow single old leaf → natural aging — remove when fully yellow.\n• Brown crispy edges/tips → underwatering, Central Texas AC dryness (~30–45% RH), or salt buildup — soak deeply, flush soil quarterly, optional pebble tray near pot.\n• Brown patches with yellow halos → fungal leaf spot from wet foliage or overwatering — remove affected leaves, improve airflow, let soil dry.\n• Leggy vines / small leaves / long bare internodes → low light (per The Spruce). Move to 1F Window or brighter NW room; pinch back to encourage bushiness.\n• Loss of gold variegation / all-green new leaves → low light — move brighter; new growth restores color in 4–6 weeks. Trim all-green reverted vines at the node.\n• Pale/bleached leaves → too much direct sun — relocate away from SE/SW beams.\n• Drooping/wilting → finger-test first: dry = water now; wet = hold off, check roots.\n• Stunted growth 4–6 weeks after soil transition → normal establishment for water-prop cuttings — resume care, don't overwater out of impatience.\n• Spider mites (fine webs, stippled leaves, worse in dry AC) → shower foliage, insecticidal soap weekly × 3, raise humidity.\n• Mealybugs (cottony white in leaf axils) → alcohol Q-tip, repeat weekly.\n• Scale (brown bumps on stems) → scrape with fingernail or alcohol swab.\n• Fungus gnats (tiny flies when soil stays wet) → let top 2\" dry fully, sticky traps, reduce watering frequency.\n• Aphids (on new tips, rare indoors) → rinse, insecticidal soap.\n• ⚠️ TOXIC to cats and dogs per ASPCA — insoluble calcium oxalates cause oral irritation, burning, drooling, vomiting, difficulty swallowing if chewed. Keep out of reach."
    },
    sources: [
      { label: "Missouri Botanical Garden — Epipremnum aureum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276739" },
      { label: "University of Florida IFAS — Pothos", url: "https://edis.ifas.ufl.edu/publication/FP188" },
      { label: "RHS — Epipremnum aureum", url: "https://www.rhs.org.uk/plants/search-results?query=epipremnum+aureum" },
      { label: "ASPCA — Golden Pothos Toxicity", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/golden-pothos" },
      { label: "The Sill — Pothos Care Guide", url: "https://www.thesill.com/blog/plant-care" },
      { label: "The Spruce — Pothos Care Guide", url: "https://www.thespruce.com/pothos-an-easy-to-grow-houseplant-1403154" }
    ]
  },

  pearls_jade_pothos: {
    id: "pearls_jade_pothos",
    repotSigns: [
      "Roots pushing out of the 3\" drainage holes",
      "New leaves lose the crisp white variegation edges (stress reduces variegation)",
      "New leaves smaller than mature ones",
      "Water drains through immediately",
      "Growth stalls (Pearls & Jade is a slow grower normally — 'stall' means truly no new leaves for 8+ weeks in season)",
      "Aerial roots reaching along the vines"
    ],
    displayName: "Pearls & Jade Pothos",
    potSize: '3"',
    cuttingsCount: 5,
    category: "pothos",
    names: {
      common: ["Pearls and Jade Pothos"],
      scientific: "Epipremnum aureum 'Pearls and Jade'"
    },
    /* 3" pot is small → dries fast → shorter intervals than larger pothos.
     * Cuttings still establishing → keep slightly more moist than mature pothos. */
    wateringDays: 5,
    wateringDaysHot: 4,
    wateringDaysCool: 9,
    currentSoilMix: "aroid_mix",
    comments: "Graduated from water propagation — 5 cuttings total (the original 2 + 3 newly added) potted together in a single 3\" pot. 'Pearls and Jade' is a patented slow-growing sport (US Plant Patent #21,217, University of Florida 2009) with distinctive white/cream/green mottled variegation. The small 3\" pot will dry fast — check moisture every 3–4 days during establishment.",
    idealSoil: ["aroid_mix", "amended_potting"],
    soilNotes: "Currently in aroid mix — ideal for variegated pothos. The 3\" pot will need closer moisture attention than a 5\"+ pot would; consider upsizing to a 4\" pot once roots fill the current container (likely 4–6 months given Pearls & Jade's slow growth).",
    conditions: {
      light:        { ideal: "Bright indirect — MORE than Golden Pothos needs to keep the cream variegation", passing: "Medium indirect; variegation fades in low light" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "60–85°F" },
      humidity:     { ideal: "50%+",                                             passing: "40%+ tolerates household" },
      soilMoisture: { ideal: "Lightly moist top inch; never bone dry",            passing: "Top half-inch dries between waterings" }
    },
    tips: {
      lighting: "Variegated 'Pearls and Jade' needs MORE light than solid-green pothos to maintain its cream-and-white speckling.\n\n• Bright indirect with 1–2 hours gentle morning sun is ideal.\n• In low light the variegation fades to pale green and growth slows even more dramatically (this cultivar is already a notoriously slow grower).\n• An east window 6–12\" from the glass, or 3–4 feet back from a south/west window, are the sweet spots.\n• If new leaves emerge all-green, the plant is telling you to move it brighter.\n• In this home, the 1F Living Room corner (vaulted dual NE/SE light) and 1F Window (36° NE) are your best matches per PLANT_LIGHT_REF — both give the extra brightness variegated pothos need.",
      soil: "Aroid-style mix is ideal — equal parts potting soil + perlite + orchid bark, plus a tablespoon of horticultural charcoal. The chunky bark keeps oxygen at the roots, which variegated cultivars need more than green forms (they have less chlorophyll, so root stress hurts faster).\n\nAvoid heavy peat-only potting mix in a small 3\" pot — it will stay wet too long between waterings.",
      watering: "METHOD — soak-and-dry (soil-graduated cuttings): 5 cuttings moved from water to soil in your tight 3\" pot — let the top 1–2\" dry before a deep drench. Per The Spruce and University of Florida IFAS, variegated pothos need more light AND careful watering; the cream/white sections can't photosynthesize their way back from drought damage.\n\nHOW TO CHECK READINESS (your 3\" pot, 5 cuttings):\n• Finger test: top 1\" must feel dry — in a 3\" pot this happens fast, especially under Central Texas AC.\n• Pot weight: the 3\" pot should feel almost hollow-light before watering.\n• Moisture meter: 2–3 in upper third = water; above 5 = wait (rot risk in small pot).\n• Plant tells: slight droop + dry top 1\" = thirsty. Droop + wet soil = STOP — root rot.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 4–5 days — small 3\" pot + AC dries aroid mix fast.\n• Peak summer (Jun–Sep): every 4 days if near a vent; every 5 days in 1F Corner/Window.\n• Mild winter (Nov–Feb): every 7–9 days — slow metabolism; never let bone dry for 48+ hrs (variegated tissue is less forgiving than Golden Pothos).\n• Empty saucer within 15 min — overwatering is the #1 killer of newly-transitioned cuttings (per RHS).\n\nWATER QUALITY: filtered or tap-sat-out — chlorine browns cream edges on variegated leaves (per The Spruce variegated pothos guide).\n\nOVER- vs UNDER-watering tells:\n• Under: wilting with dry soil; crispy brown on cream sections; soil pulls from pot walls.\n• Over: yellowing (especially variegated leaves), mushy stems at soil line, fungus gnats, wet soil 3+ days after watering.",
      pruning: "Minimal for the first 2 months while cuttings establish their soil roots.\n\nOnce established (when you see new leaves emerging):\n• Pinch tips just above a node to encourage branching.\n• Remove any all-green REVERTED leaves at the node — once a vine reverts, that vine stays green; cut it back to keep variegation dominant.\n• Save tip cuttings for more propagation (Pearls & Jade is patent-protected; legally cuttings are for personal use, not for sale).",
      propagation: "Already done! Now in soil. For future propagation:\n• Take 4\" tip cuttings with 1–2 nodes from the MOST variegated sections (variegation is passed at the node).\n• Root in water (3–4 weeks for visible roots, 6–8 weeks for plantable length) or directly in moist sphagnum.\n• Success rate ~80% (lower than Golden Pothos because less chlorophyll = slower energy regeneration).",
      repotting: "Newly potted — leave alone for 6 months minimum to let roots fill the 3\" pot.\n\nFuture upsize plan:\n• 3\" → 4\" pot at month 6–9 (when roots circle the inside).\n• 4\" → 5\" at year 2.\n• Always upsize by only 1\" diameter — Pearls & Jade hates being overpotted (excess wet soil → rot).\n• Spring is best for repotting.",
      feeding: "Hold off feeding for the FIRST 4–6 weeks while cuttings establish soil roots (fertilizer salts can burn fresh roots).\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (10-10-10 or 20-20-20) at QUARTER strength every 4 weeks in spring/summer.\n• A pinch of Epsom salt (magnesium) dissolved in water once a month boosts the variegation richness — magnesium is a central component of chlorophyll.\n• No feeding in fall/winter.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Loss of variegation / all-green new leaves → low light (per The Spruce). Move to 1F Corner or 1F Window; trim reverted all-green vines at the node.\n• Wilting + dry soil → underwatering — water immediately; 3\" pot dries fast in AC.\n• Wilting + wet soil → root rot from transition stress or overwatering — unpot, trim mushy roots, repot in fresh aroid mix.\n• Yellow leaves → overwatering (#1) OR natural aging of old lower leaves. Wet soil + yellow = rot; dry + yellow = check light.\n• Brown crispy edges on cream sections → low humidity (Central Texas AC), underwatering, or tap-water fluoride/chlorine — filtered water + optional humidity boost.\n• Slow growth (~1–2 nodes/month) → normal for Pearls & Jade (University of Florida cultivar patent notes slow growth vs Golden).\n• Leggy/small leaves → low light — move brighter per PLANT_LIGHT_REF.\n• All-white new leaves with no green → too much variegation on one leaf — cut back to a balanced node.\n• Stunted growth 4–6 weeks post-transition → normal soil-root establishment — don't overwater to \"help.\"\n• Spider mites (fine webs, stippling in dry AC) → shower, insecticidal soap weekly × 3.\n• Mealybugs → alcohol Q-tip on cottony clusters.\n• Scale → alcohol swab on stem bumps.\n• Fungus gnats → reduce watering, sticky traps, let top 1\" dry fully.\n• Aphids on new tips → rinse, insecticidal soap.\n• ⚠️ TOXIC to cats and dogs per ASPCA — insoluble calcium oxalates cause oral irritation, drooling, vomiting, difficulty swallowing if chewed."
    },
    sources: [
      { label: "University of Florida — Pothos Cultivars", url: "https://edis.ifas.ufl.edu/publication/FP188" },
      { label: "Missouri Botanical Garden — Epipremnum aureum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276739" },
      { label: "RHS — Epipremnum aureum", url: "https://www.rhs.org.uk/plants/search-results?query=epipremnum+aureum" },
      { label: "ASPCA — Golden Pothos Toxicity", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/golden-pothos" },
      { label: "Costa Farms — Pothos Care", url: "https://costafarms.com/plants/pothos" },
      { label: "The Spruce — Variegated Pothos Care", url: "https://www.thespruce.com/variegated-pothos-7372009" }
    ]
  },

  pothos_combo: {
    id: "pothos_combo",
    repotSigns: [
      "Roots visibly circling out of the 4\" drainage holes",
      "One of the 3 cultivars (Satin / Neon / Golden) starts stalling while the others push new leaves — root competition",
      "The Satin Pothos leaves lose their silver frosting (variegation is the first to go under root stress)",
      "The Neon Pothos leaves darken to plain green (loses its trademark chartreuse)",
      "Water drains through in <5 seconds",
      "Aerial roots on any of the vines reaching for the pot surface"
    ],
    displayName: "Mixed Pothos Combo",
    potSize: '4"',
    cuttingsCount: 6,
    composition: "3× Satin + 1× Neon + 2× Golden",
    category: "pothos",
    names: {
      common: ["Mixed Pothos Combo Pot", "Pothos Trio Display"],
      scientific: "Mix of: 3× Scindapsus pictus (Satin) + 1× Epipremnum aureum 'Neon' + 2× E. aureum (Golden)"
    },
    /* Three genus-mismatched plants sharing one 4" pot. Satin (Scindapsus) is
     * slower-growing and more drought-tolerant than true Pothos (Epipremnum),
     * so this combo's intervals are tuned to the more drought-tolerant
     * species — Golden and Neon will be slightly happier with slightly drier
     * conditions than they'd choose alone, which is fine for both. */
    wateringDays: 7,
    wateringDaysHot: 6,
    wateringDaysCool: 12,
    currentSoilMix: "aroid_mix",
    comments: "Display pot combining 6 cuttings from three different pothos-style cultivars: 3 Satin Pothos (silver-speckled, Scindapsus pictus), 1 Neon Pothos (chartreuse-yellow, Epipremnum aureum 'Neon'), and 2 Golden Pothos (green-and-yellow, Epipremnum aureum). The contrast between the silver, yellow-green, and gold leaves makes this visually striking. ⚠️ Satin is from a DIFFERENT GENUS (Scindapsus) than the true Pothos (Epipremnum), but care needs overlap enough that this combo works — tune watering to Satin's slightly drier preference (it has fleshier roots than Epipremnum).",
    idealSoil: ["aroid_mix", "amended_potting"],
    soilNotes: "Aroid mix is the right call for a mixed pothos combo — Scindapsus (Satin) has fleshy roots that demand extra aeration, while Epipremnum (Golden/Neon) are happy in any well-draining mix. The chunky bark + perlite mix satisfies both.",
    conditions: {
      light:        { ideal: "Bright indirect — Satin needs the most, Golden tolerates least", passing: "Medium indirect; Satin's silver speckling and Marble's variegation will fade first in low light" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "55–90°F; Satin appreciates a slightly warmer minimum (60°F)" },
      humidity:     { ideal: "50–60% (Satin's preference; Golden/Neon happy at lower)", passing: "40%+; Satin will sulk below 40% — add humidity if leaves curl" },
      soilMoisture: { ideal: "Top inch dry between waterings (Satin's preference; slightly drier than pure Epipremnum)", passing: "Tolerates short drought from either species; overwatering risks all three" }
    },
    tips: {
      lighting: "Bright INDIRECT light is the sweet spot for all three cultivars in this combo, but the Satin needs the brightest position to keep its silver speckling vivid. Position the pot in the brightest indirect spot you have (e.g. 2–3 feet from an east window, or 4–6 feet back from a south/west window).\n\n• The Satin Pothos will tell you first if the light drops too low — its silver speckling fades within 4–6 weeks.\n• The Neon Pothos will deepen to a darker green-yellow in lower light but stays healthy.\n• The Golden Pothos is the most light-flexible of the trio.\n• Rotate the pot 1/4 turn every 2 weeks so all three cultivars get even exposure.\n• Direct afternoon sun scorches the Satin's silver patches first.\n• In this home, the 1F Living Room corner (vaulted dual NE/SE) and 1F Window (36° NE) are your best matches per PLANT_LIGHT_REF — bright enough for Satin variegation without scorching.",
      soil: "Currently in aroid mix — perfect compromise for the three species:\n\n• Scindapsus pictus (Satin) has fleshy roots and is the most rot-prone in the combo — chunky bark + perlite is critical.\n• Epipremnum aureum (Golden + Neon) are happy in anything well-draining.\n• Top-dress with a thin layer of fresh aroid mix every spring.",
      watering: "METHOD — soak-and-dry (soil-graduated cuttings): 6 cuttings (3 Satin + 1 Neon + 2 Golden) moved from water to soil in your 4\" pot. Let the top 1–2\" dry before a deep drench — tune slightly drier for Scindapsus (Satin), which rots faster than Epipremnum (per The Spruce satin pothos guide).\n\nHOW TO CHECK READINESS (your 4\" pot, 6 cuttings):\n• Finger test: top 1–2\" must feel dry — packed cuttings transpire fast in Central Texas AC.\n• Pot weight: lift the side — lighter than post-water = ready.\n• Moisture meter: 3–4 upper third = water; 6+ = wait.\n• Plant tells: Satin leaves curl inward when thirsty; yellow Epipremnum leaves on wet soil = overwatered.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 6–7 days in 1F Corner/Window.\n• Peak summer (Jun–Sep): every 6 days near vents; every 7–8 days in still corners.\n• Mild winter (Nov–Feb): every 10–12 days — when in doubt, wait one extra day (overwatering kills Scindapsus fastest).\n• Empty saucer within 15 min. NEVER let sit in standing water.\n\nWATER QUALITY: room-temp filtered or sat-out tap.\n\nOVER- vs UNDER-watering tells:\n• Under: Satin leaves curl/droop; soil dry 2\"+ deep; Neon/Golden droop then perk after soak.\n• Over: yellow leaves (especially Golden/Neon), wilting on wet soil, Satin stem rot at soil line, fungus gnats.",
      pruning: "Pinch tips every 4–6 weeks once established.\n\n• Each pinch produces 2 new shoots — keeps the combo bushy instead of leggy.\n• Trim any all-green reverted vines from the Neon back to a healthy node (Neon should stay chartreuse; if a vine darkens to standard green, prune it out).\n• Take all-trio cuttings in spring — propagate each cultivar separately into water, then graduate into a new shared pot if desired.\n• Don't let the faster-growing Golden vines completely shade out the slower Satin — pinch back Golden more aggressively if it dominates.",
      propagation: "All three species root from any node-containing cutting in water or soil. Roots in 1–3 weeks depending on cultivar:\n\n• Golden Pothos: 1–2 weeks (fastest).\n• Neon Pothos: 1–2 weeks.\n• Satin Pothos / Scindapsus: 3–4 weeks (slower).\n\nUse separate jars when propagating to track each species — if you ever want to rebuild the combo with new cuttings, you'll know exactly what you have.",
      repotting: "Newly assembled — leave undisturbed for 6+ months.\n\nUpsize plan:\n• 4\" → 5\" or 6\" at year 1 (when roots fill the pot).\n• Best to upsize ALL three cultivars together to preserve the display.\n• If you want to separate them later: gently rinse soil off the rootball, tease apart each species' root system, and pot individually.",
      feeding: "Hold off fertilizer for 6 weeks while soil roots establish.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (20-20-20) at HALF strength every 4 weeks in spring/summer.\n• Flush the soil with plain water every 2 months to clear salt buildup.\n• Stop feeding Oct–Feb.\n• If one species starts visibly lagging while the others thrive, consider isolating it — sometimes shared pots favor faster growers and starve slower ones over years.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Satin silver speckling fading → low light (per The Spruce). Move to 1F Corner/Window; Satin needs brightest spot in the combo.\n• Satin leaves curling inward → underwatering (#1 for Scindapsus per The Spruce) OR overwatering/root rot — check soil: dry = soak; wet = hold off, inspect roots.\n• Satin crispy leaf tips → low humidity (Central Texas AC) — pebble tray or move toward 2F Room 2 humidifier radius.\n• Neon turning dark green → low light — move brighter; prune darkened vines back to chartreuse node.\n• Golden yellow leaves → overwatering — let dry, check drainage.\n• One species dominating/shading others → pinch back faster-growing Golden; ensure rotation.\n• Leggy/small leaves across combo → insufficient light — relocate per PLANT_LIGHT_REF.\n• Reverting variegation (Neon → green, Satin → plain green) → low light — trim reverted sections.\n• Brown tips all three → tap-water minerals — switch filtered, flush soil.\n• Root rot (mushy stems, wet soil smell) → unpot, trim black roots, repot in fresh aroid mix.\n• Spider mites (dry AC, fine webs) → shower, insecticidal soap weekly × 3.\n• Mealybugs → alcohol Q-tip.\n• Scale on stems → alcohol swab.\n• Fungus gnats → reduce watering, sticky traps.\n• Aphids on new tips → rinse, insecticidal soap.\n• ⚠️ TOXIC to cats and dogs per ASPCA — ALL THREE species (Epipremnum + Scindapsus) contain insoluble calcium oxalates. Keep out of reach."
    },
    sources: [
      { label: "Missouri Botanical Garden — Scindapsus pictus", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275437" },
      { label: "Missouri Botanical Garden — Epipremnum aureum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276739" },
      { label: "University of Florida IFAS — Pothos Cultivars", url: "https://edis.ifas.ufl.edu/publication/FP188" },
      { label: "RHS — Epipremnum aureum and Scindapsus pictus", url: "https://www.rhs.org.uk/plants/search-results?query=epipremnum+aureum" },
      { label: "ASPCA — Golden Pothos Toxicity", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/golden-pothos" },
      { label: "Costa Farms — Pothos Care Guide", url: "https://costafarms.com/plants/pothos" },
      { label: "The Sill — Pothos Care", url: "https://www.thesill.com/blog/plant-care" },
      { label: "The Spruce — Satin Pothos Care", url: "https://www.thespruce.com/growing-satin-pothos-5114102" }
    ]
  },

  fittonia: {
    id: "fittonia",
    repotSigns: [
      "⚠️ Leaves wilt daily even when the soil is moist — 1\" pot is critically small and the roots literally can't absorb fast enough",
      "Roots visible out of the 1\" drainage hole",
      "Roots visible above the soil surface (nowhere else to grow)",
      "Water pools at the top for 10+ seconds (root mass has crowded out drainage)",
      "New leaves markedly smaller than the previous flush",
      "The whole plant lifts up as one solid root-plug when you nudge it"
    ],
    displayName: "Fittonia",
    potSize: '1"',
    cuttingsCount: 4,
    category: "tropical",
    names: {
      common: ["Fittonia", "Nerve Plant", "Mosaic Plant", "Painted Net Leaf"],
      scientific: "Fittonia albivenis (formerly F. verschaffeltii)"
    },
    /* ⚠️ 1" pot is EXTREMELY small for 4 cuttings — soil volume is barely enough
     * to hold the root systems, dries out in hours, and offers almost no buffer.
     * Treat this as TEMPORARY (4-8 weeks max) and plan to upsize. */
    wateringDays: 3,
    wateringDaysHot: 2,
    wateringDaysCool: 5,
    currentSoilMix: "african_violet",
    comments: "All 4 cuttings transferred from water propagation into a 1\" pot together. ⚠️ This is UNUSUALLY SMALL — a 1\" pot holds barely 30ml of soil and will dry out in hours during warm months. Strongly recommend upsizing to a 3\"+ pot or a small closed terrarium within 4–8 weeks; until then check moisture DAILY and consider placing the pot inside a clear plastic bag or cloche to slow evaporation and boost humidity to Fittonia's preferred 70%+.",
    idealSoil: ["african_violet", "standard_potting"],
    soilNotes: "African violet mix is the right call for Fittonia (peat-rich, holds moisture, fine texture). BUT in a 1\" pot, even African violet mix can't hold enough water for 4 cuttings during hot/dry days. Upsize ASAP — this is the smallest viable container for the species, not a long-term solution.",
    conditions: {
      light:        { ideal: "Medium-bright indirect; NO direct sun",            passing: "Low–medium indirect; one of the most shade-tolerant houseplants" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "60–85°F; protect below 55°F (chill damage at 50°F)" },
      humidity:     { ideal: "70%+ (terrarium-level)",                           passing: "50%+; wilts dramatically below 40%" },
      soilMoisture: { ideal: "Consistently lightly moist — NEVER dry",            passing: "⚠️ In a 1\" pot, even 'passing' is risky — water before soil fully dries" }
    },
    tips: {
      lighting: "Medium-bright INDIRECT light is ideal — Fittonia is one of the few houseplants that genuinely tolerates low light AND prefers it over direct sun. The native habitat is the dim Peruvian rainforest understory.\n\n• Best spots: north or east window, or 3–5 feet back from any other window.\n• Direct sun scorches the delicate leaves within hours.\n• Humid bathrooms, terrariums, bottle gardens, and under-cabinet positions are all great.\n• Grow lights at low intensity (5,000–10,000 lux) work well in winter.\n\n• In this home, the 1F Bathroom (127° SE, set back from direct beam) is the best match per PLANT_LIGHT_REF — the shower humidity is critical in Central Texas AC.",
      soil: "Currently in African violet mix — perfect peat-rich choice. Could also use 1 part peat + 1 part coco coir + 1 part fine perlite for a DIY mix.\n\n⚠️ In a 1\" pot, the soil reservoir is so tiny that mix choice matters less than container size. Plan to upsize within 4–8 weeks.",
      watering: "METHOD — steady moisture (NEVER soak-and-dry): Fittonia albivenis wilts dramatically at the slightest dry-out — especially in your critical 1\" pot with 4 cuttings (~30ml soil volume).\n\nHOW TO CHECK READINESS (your 1\" pot, 4 cuttings, African violet mix):\n• Finger test: top should feel slightly damp ALWAYS — if the surface looks matte/dry, water immediately.\n• Pot weight: 1\" pot goes from heavy to feather-light within hours in AC.\n• No moisture meter needed at this size — daily finger check is mandatory.\n• Plant tells: dramatic collapse/wilting = underwatered (recovers in 1–2 hrs after soak). Yellowing en masse + wet soil = overwatered/root suffocation.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% despite humid outdoors):\n• Hot AC season (Apr–Oct): every 2–3 days — sometimes DAILY in Jun–Sep; 1F Bath humidity extends to every 2 days.\n• Peak summer (Jun–Sep): check TWICE daily if not in bathroom or humidity dome.\n• Mild winter (Nov–Feb): every 4–5 days — still never let bone dry.\n• 1F Room 1 (overhead fan) and 2F NW rooms are too dry unless inside a cloche — keep in 1F Bath.\n\nBOTTOM-WATERING (strongly recommended): set 1\" pot in shallow tray of room-temp filtered water 10 min, drain, return. Reduces splash, fungus gnats, and uneven dry spots.\n\nWATER QUALITY (per Missouri Botanical Garden and ASPCA):\n• Use filtered, distilled, or rainwater — Fittonia shows brown crispy tips from chlorine/fluoride fast.\n• Central Texas tap water is hard on nerve plants even with humidity.\n\nHUMIDITY HACK: clear plastic bag/cloche over the 1\" pot between waterings — slows evaporation 3–4× and hits Fittonia's 70%+ requirement.\n\nOVER- vs UNDER-watering tells:\n• Under (#1 daily issue): dramatic wilt/collapse, crispy brown edges, leaves feel papery — soak immediately.\n• Over (rare in 1\" pot but possible): yellowing all cuttings, mushy base, fungus gnats — upsize pot ASAP.",
      pruning: "Pinch back tips every 3–4 weeks to keep Fittonia bushy and compact (which matters even more in a tiny pot — leggy growth tips would flop over the edge).\n\n• Pinch just above a node with clean fingertips.\n• Each pinch produces 2 new shoots.\n• Save tip cuttings — Fittonia roots in water in 2–3 weeks at >90% success.\n• Remove any spent flower spikes (the blooms are insignificant and drain energy).",
      propagation: "VERY EASY in water or directly in soil. You already proved that with this batch.\n\nFor future propagation:\n• Take 3–4\" tip cuttings with 2–3 nodes.\n• Water: drop in a jar with nodes submerged, roots in 2–3 weeks.\n• Soil: stick straight into moist mix under a humidity dome (plastic bag or cloche), roots in 2–3 weeks.\n• Best season: spring/summer; success rate >90%.",
      repotting: "🚨 Top priority: upsize from this 1\" pot within 4–8 weeks. Recommended targets:\n\n• 3\" wide-and-shallow pot with drainage — easy upgrade, slows down the daily-watering treadmill significantly.\n• Small closed terrarium (5–8\" diameter) — Fittonia's IDEAL home. Self-regulating humidity, watering drops to once every 2–3 months, color and growth dramatically improve.\n• Glass cloche over a 3\" pot — middle ground between terrarium and open pot.\n\nWhen repotting: gently lift the whole cluster from the 1\" pot, place into the new container (no need to separate the 4 cuttings — they look better as a clump), backfill with fresh African violet mix, water in lightly.",
      feeding: "Hold off feeding for at least 6 weeks while cuttings establish soil roots — and even longer because a 1\" pot has so little soil that fertilizer salts concentrate quickly.\n\nAfter 6 weeks (and ideally after upsizing):\n• Balanced liquid fertilizer (10-10-10) at QUARTER strength every 4–6 weeks growing season.\n• Fittonia is sensitive to fertilizer burn — when in doubt, dilute more.\n• Stop feeding Oct–Feb.",
      troubleshooting: "1\" POT SPECIFIC:\n• Daily/twice-daily wilting → pot critically too small for 4 cuttings — upsize to 3\"+ or 1F Bath + humidity cloche immediately.\n• Soil bone-dry on top but root plug wet → wait, then bottom-water lightly.\n• Cuttings yellowing en masse → root suffocation in tiny soil volume — upsize ASAP.\n\nGENERAL SYMPTOM → CAUSE → FIX:\n• Sudden dramatic wilting → underwatering (#1). Soak via bottom-water — leaves recover in 1–2 hrs per Missouri Botanical Garden. Repeated wilting = permanent damage.\n• Repeated wilting cycles → soil drying too fast (Central Texas AC) — upsize, cloche, or move to 1F Bath.\n• Brown crispy tips/edges → low humidity (AC ~30–45%) AND/OR fluoride/chlorine in tap water — filtered water + 70%+ humidity (1F Bath or cloche).\n• Yellow leaves → overwatering in tiny pot OR root rot — check if soil stays wet 3+ days; improve drainage at upsize.\n• Leaf drop → cold below 55°F, repeated wilting stress, or root failure.\n• Leaf curling → thirst or humidity crash — soak + cloche.\n• Faded/pale vein color → too much light (move away from SE window) OR nutrient deficiency after upsize.\n• Scorched/bleached patches → any direct sun — Fittonia burns in hours; 1F Bath must be set BACK from beam.\n• Leggy growth → insufficient light OR skipping pinch-pruning.\n• Root rot (mushy stems at base) → rare in 1\" pot but possible if cloche + overwatering — repot into fresh mix, reduce water.\n• Spider mites (#1 pest in dry AC — fine webs, stippling) → shower foliage, insecticidal soap weekly × 3, raise humidity above 60%.\n• Mealybugs (cottony white in leaf axils) → alcohol Q-tip.\n• Scale (rare on Fittonia) → alcohol swab.\n• Thrips (silvery streaks) → rinse, sticky traps, spinosad.\n• Fungus gnats → let surface dry slightly between bottom-waters; sticky traps.\n• Aphids (on new tips) → rinse, insecticidal soap.\n• ✅ Non-toxic to cats and dogs per ASPCA (Nerve Plant / Fittonia verschaffeltii)."
    },
    sources: [
      { label: "Missouri Botanical Garden — Fittonia albivenis", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275203" },
      { label: "RHS — Fittonia albivenis", url: "https://www.rhs.org.uk/plants/search-results?query=fittonia+albivenis" },
      { label: "University of Florida — Fittonia Care", url: "https://edis.ifas.ufl.edu/" },
      { label: "ASPCA — Fittonia Toxicity (non-toxic)", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/nerve-plant" },
      { label: "The Sill — Nerve Plant Care", url: "https://www.thesill.com/blog/plant-care" },
      { label: "Missouri Botanical Garden — Fittonia albivenis", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=263705" }
    ]
  },

  /* SUCCULENT VARIANTS: only the user's owned succulents (Aloe Vera, Firestick, Kalanchoe — see above). */

  /* ===================== POTHOS / PHILODENDRON (now owned as water cuttings) ===================== */
  philodendron_silver_stripe: {
    id: "philodendron_silver_stripe",
    repotSigns: [
      "Roots circling out of the 4\" drainage holes",
      "Silver stripes on new leaves start looking greenish/faint (variegation loss under root stress)",
      "New leaves smaller than mature ones",
      "Water drains through the pot in <5 seconds",
      "Aerial roots reaching for the pot surface / a moss pole",
      "Growth stalls in growing season"
    ],
    displayName: "Philodendron 'Silver Stripe'",
    potSize: '4"',
    cuttingsCount: 5,
    category: "pothos",
    names: {
      common: ["Philodendron 'Silver Stripe'", "Silver Stripe Philodendron"],
      scientific: "Philodendron hederaceum 'Silver Stripe' (often confused with Scindapsus pictus 'Silver Stripe')"
    },
    /* 4" pot is snug for 5 cuttings — dries fast, encourages dense clumping.
     * Slightly slower-uptake than green Philodendron hederaceum due to the
     * silver variegation, so intervals are ~10% longer than a solid-green
     * 'Heartleaf' in the same pot size. */
    wateringDays: 6,
    wateringDaysHot: 5,
    wateringDaysCool: 10,
    currentSoilMix: "aroid_mix",
    comments: "Graduated from water propagation — all 5 cuttings potted together in a single 4\" pot. Philodendron hederaceum 'Silver Stripe' is a stable variegated cultivar with longitudinal silver bands flanking the central vein on each leaf. ⚠️ Often confused at retail with Scindapsus pictus 'Silver Stripe' — they're different genera but care needs are nearly identical. The 4\" pot is intentionally snug for instant fullness; expect to upsize to 5\" within 6–9 months once roots fill.",
    idealSoil: ["aroid_mix", "amended_potting"],
    soilNotes: "Currently in aroid mix — ideal for variegated philodendrons. The silver-striped sections have reduced chlorophyll, so the plant relies on healthy oxygenated roots from the chunky bark/perlite mix to compensate.",
    conditions: {
      light:        { ideal: "Bright indirect — enhances silver stripe pattern", passing: "Medium indirect; stripes fade to greener within 6–8 weeks in low light" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "55–90°F; chill damage below 50°F" },
      humidity:     { ideal: "50–60%+",                                          passing: "40%+; tolerates household humidity surprisingly well" },
      soilMoisture: { ideal: "Top inch dry between deep waterings",               passing: "Tolerates short drought; overwatering kills faster than under" }
    },
    tips: {
      lighting: "Bright INDIRECT light is essential for crisp silver striping. Native habitat: Central American forest understory, where Philodendron hederaceum climbs trees toward dappled sun.\n\n• Best spot: 1–3 feet from an east window, or 3–5 feet back from a south/west window.\n• Direct afternoon sun bleaches the silver sections.\n• In low light the silver fades to dull green-silver within 6–8 weeks and growth slows.\n• Rotate the pot 1/4 turn every 2 weeks for balanced growth across all 5 cuttings.\n• Variegated Philodendron hederaceum cultivars need MORE light than the solid-green 'Heartleaf' form to maintain their pattern.\n• In this home, the 1F Living Room corner (vaulted dual NE/SE) and 1F Window (36° NE) are your best matches per PLANT_LIGHT_REF.",
      soil: "Aroid mix is ideal: 1 part potting soil + 1 part perlite + 1 part orchid bark + a pinch of horticultural charcoal. Slightly acidic pH (5.5–7.0).\n\nWhy chunky matters MORE for variegated philodendrons:\n• The silver-striped sections have ~40% less chlorophyll than green tissue.\n• Less chlorophyll = slower energy regeneration = the plant has less margin for root stress.\n• Chunky soil keeps roots oxygenated, which is the cheapest insurance against rot.\n\nAvoid: pure potting mix (stays too wet for 5 cuttings in a 4\" pot), peat-heavy mixes, garden soil.",
      watering: "METHOD — soak-and-dry (soil-graduated cuttings): 5 cuttings moved from water to soil in your 4\" pot with aroid mix. Per The Spruce heartleaf philodendron guide, let the top 1–2\" dry before a deep drench until water runs from drainage holes; empty saucer within 15 min.\n\nHOW TO CHECK READINESS (your 4\" pot, 5 cuttings):\n• Finger test: top 1\" dry = water; damp = wait.\n• Pot weight: noticeably lighter than post-soak = ready.\n• Moisture meter: 3–4 upper third = water.\n• Plant tells: leaves curl slightly when thirsty (per The Spruce); yellow leaves on wet soil = overwatering.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 5–6 days — 5 cuttings in 4\" pot transpire fast.\n• Peak summer (Jun–Sep): every 5 days near vents; every 6–7 days in 1F Corner/Window.\n• Mild winter (Nov–Feb): every 9–11 days — philodendron slows; when in doubt, wait (overwatering kills faster than underwatering per The Spruce).\n• Philodendron is forgiving of brief drought but rots in soggy soil — the #1 killer.\n\nWATER QUALITY: room-temp filtered or tap-sat-out — chlorine can brown silver/cream leaf edges.\n\nOVER- vs UNDER-watering tells:\n• Under: leaf curl + droop on dry soil; recovers within hours of soak.\n• Over: multiple yellow leaves, wilting on wet soil, mushy stems, fungus gnats.",
      pruning: "Wait 4–6 weeks before any pruning while soil roots establish.\n\nOnce growing:\n• Pinch tips just above a node to encourage branching — each pinch produces 2 new vines.\n• Remove any all-green REVERTING vines back to the most recent silver-striped node (once a vine fully reverts, it stays green).\n• Save tip cuttings — Silver Stripe roots in water in 1–2 weeks at >90% success.\n• Don't let a faster-growing cutting dominate; pinch back the leaders so all 5 cuttings stay balanced.",
      propagation: "Already done! For future propagation:\n\n• Take 4–6\" tip cuttings with 1–2 nodes (aerial root, if present, speeds rooting).\n• Water method: drop in a jar of water with nodes submerged, change water weekly. Roots in 1–2 weeks. Plantable at 2\" roots.\n• Soil method: stick into moist aroid mix under a clear cup or bag for 2 weeks. Roots in 3–4 weeks.\n• Success rate >90% in both methods.\n• Take cuttings from the MOST silver-striped sections to preserve the variegation pattern (variegation is cellular at each node).\n• Best season: spring/summer; works year-round.",
      repotting: "Newly potted — leave alone 6+ months while roots fill the 4\" pot.\n\nUpsize timeline:\n• 4\" → 5\" at 6–9 months (when roots circle the inside or come out of drainage holes).\n• 5\" → 6\" at year 2.\n• Always upsize by only 1\" diameter — Philodendron hederaceum prefers slightly snug roots.\n• Best season: spring (March–May).\n• Optional power move: add a 18–24\" moss pole or coir totem to the new pot. Philodendron hederaceum leaves DOUBLE in size when allowed to climb, and the silver striping becomes more pronounced.",
      feeding: "Hold off feeding for 6 weeks while cuttings establish soil roots.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (20-20-20) at HALF strength every 4 weeks in spring/summer.\n• Slow-release pellets (Osmocote) in spring are an easy alternative.\n• Flush soil with plain water every 2–3 months to prevent fertilizer salt buildup.\n• A pinch of Epsom salt (magnesium) once a month boosts variegation richness.\n• No feeding Oct–Feb.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Loss of silver striping / mostly-green new leaves → low light (per The Spruce). Move to 1F Corner/Window; trim reverted all-green vines at last variegated node.\n• Yellow leaves → OVERWATERING (#1 per The Spruce and RHS). Wet soil + yellow = rot — unpot, trim mushy roots. Dry soil + yellow = check light/nutrients.\n• Brown crispy edges → low humidity (Central Texas AC), underwatering, or mineral buildup — soak, filtered water, optional humidity boost.\n• Leggy bare vines / small leaves → low light — move brighter, pinch back hard for denser growth.\n• Wilting + wet soil → root rot from packed cuttings or overwatering — inspect roots, repot in fresh chunky aroid mix.\n• Wilting + dry soil → thirsty — water now.\n• Stunted growth 4–6 weeks post-transition → normal for water-to-soil cuttings — don't overwater to compensate.\n• All-white/silver sections turning brown → too much direct sun OR chronic underwatering on variegated tissue.\n• Spider mites (fine webs, stippling in dry AC) → shower, insecticidal soap weekly × 3.\n• Mealybugs → alcohol Q-tip.\n• Scale → alcohol swab on stem bumps.\n• Fungus gnats → reduce watering, sticky traps.\n• Aphids on new tips → rinse, insecticidal soap.\n• ⚠️ TOXIC to cats and dogs per ASPCA (Heartleaf Philodendron / Philodendron hederaceum) — insoluble calcium oxalates cause oral irritation, burning, drooling, vomiting, difficulty swallowing if chewed."
    },
    sources: [
      { label: "Missouri Botanical Garden — Philodendron hederaceum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=287199" },
      { label: "The Sill — Philodendron Care", url: "https://www.thesill.com/blog/plant-care-philodendron" },
      { label: "ASPCA — Heartleaf Philodendron Toxicity", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/heartleaf-philodendron" },
      { label: "RHS — Philodendron hederaceum", url: "https://www.rhs.org.uk/plants/search-results?query=philodendron+hederaceum" },
      { label: "Costa Farms — Philodendron Care Guide", url: "https://costafarms.com/plants/philodendron" },
      { label: "The Spruce — Heartleaf Philodendron Care", url: "https://www.thespruce.com/heartleaf-philodendron-guide-5181702" }
    ]
  },

  marble_queen_pothos: {
    id: "marble_queen_pothos",
    repotSigns: [
      "Roots circling out of the 4\" drainage holes",
      "New leaves come in with LESS white/cream marbling (variegation is the first casualty of root stress)",
      "New leaves smaller than mature ones",
      "Water drains through in <5 seconds",
      "Aerial roots reaching for the pot surface along the vines",
      "Growth stalls in growing season despite good bright indirect light"
    ],
    displayName: "Marble Queen Pothos",
    potSize: '4"',
    cuttingsCount: 7,
    category: "pothos",
    names: {
      common: ["Marble Queen Pothos", "Marble Pothos"],
      scientific: "Epipremnum aureum 'Marble Queen'"
    },
    /* 4" pot is small for 7 cuttings → dries fast despite the dense planting.
     * Heavy white variegation = slower growth = slightly less water uptake than Golden. */
    wateringDays: 6,
    wateringDaysHot: 5,
    wateringDaysCool: 10,
    currentSoilMix: "aroid_mix",
    comments: "Graduated from water propagation — all 7 cuttings potted together in a single 4\" pot. Marble Queen is a heavily variegated cultivar (cream/white marbled leaves, sometimes 50%+ white tissue) that grows ~30% slower than Golden Pothos because reduced chlorophyll means less photosynthesis. 4\" pot is intentionally snug for clumping density; expect to upsize to 5\" within 6–9 months once roots fill.",
    idealSoil: ["aroid_mix", "amended_potting"],
    soilNotes: "Currently in aroid mix — perfect choice. With 7 cuttings packed into a 4\" pot, the aroid mix's chunky structure (perlite + bark) prevents soil compaction and root suffocation. Add extra perlite if you see persistent yellowing.",
    conditions: {
      light:        { ideal: "Bright indirect — REQUIRED to maintain white variegation", passing: "Medium indirect (new growth will revert to greener leaves over time)" },
      temperature:  { ideal: "65–85°F (18–29°C)",                                passing: "55–95°F; nothing below 50°F" },
      humidity:     { ideal: "50–60%",                                           passing: "40%+; tolerates average household" },
      soilMoisture: { ideal: "Top inch dry between deep waterings",               passing: "Top half-inch dry; never bone dry for newly-transitioned cuttings" }
    },
    tips: {
      lighting: "Needs MORE light than Golden Pothos because of heavy white variegation — those cream sections have NO chlorophyll, so the green portions have to do all the photosynthesis. Bright indirect light is essential.\n\n• Best spot: 1–3 feet from an east-facing window, or 4–6 feet back from a south/west window.\n• Direct afternoon sun bleaches and scorches white sections.\n• In low light, new leaves emerge with less variegation (mostly green) — the plant is genetically conserving chlorophyll.\n• Rotate the pot 1/4 turn every 2 weeks for even light to all 7 cuttings.\n• In this home, the 1F Living Room corner (vaulted dual NE/SE) and 1F Window (36° NE) are your best matches per PLANT_LIGHT_REF — Marble Queen requires brighter indirect than Golden to hold its white marbling.",
      soil: "Aroid mix is ideal: 1 part potting soil + 1 part perlite + 1 part orchid bark + a pinch of horticultural charcoal. The chunky structure is critical when 7 cuttings share a 4\" pot — without it, the soil compacts and roots suffocate.\n\nAvoid:\n• Pure potting mix (stays too wet for tightly packed roots)\n• Coco-coir-heavy mixes (too retentive)\n• Garden soil (compacts and brings pests)",
      watering: "METHOD — soak-and-dry (soil-graduated cuttings): 7 cuttings moved from water to soil in your 4\" pot. Per The Spruce, let the top 1–2\" dry before a deep drench — heavy white variegation means slower metabolism than Golden Pothos, but overwatering still kills faster than drought.\n\nHOW TO CHECK READINESS (your 4\" pot, 7 cuttings):\n• Finger test: top 1–2\" dry = water; never water on calendar alone.\n• Pot weight: lighter than 24 hrs post-soak = ready.\n• Moisture meter: 3–4 upper third = water.\n• Plant tells: slight droop + dry soil = thirsty; yellow + wet soil = overwatered.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 5–6 days — 7 cuttings in 4\" pot + AC dries fast.\n• Peak summer (Jun–Sep): every 5 days near vents/fans; every 6–7 days in 1F Corner/Window.\n• Mild winter (Nov–Feb): every 9–11 days — slow growth; wait if unsure.\n• A 4\" pot in front of an AC vent dries 2× faster than a still corner — adjust accordingly.\n• Empty saucer within 15 min.\n\nWATER QUALITY: filtered or tap-sat-out — white tissue is sensitive to chlorine (per The Spruce variegated pothos guide).\n\nOVER- vs UNDER-watering tells:\n• Under: droop on dry soil; crispy brown on white sections; recovers after soak.\n• Over: multiple yellow leaves, wilting on wet soil, fungus gnats, mushy stems at base.",
      pruning: "Wait 4–6 weeks before any pruning while soil roots establish.\n\nOnce growing:\n• Pinch tips just above a node to encourage branching — each pinch produces 2 new vines.\n• Remove all-green REVERTING vines back to a heavily variegated node — once a vine reverts to all green, it stays green and will start dominating the pot's variegation balance.\n• Take cuttings from the MOST variegated sections when propagating to preserve the marble pattern in offspring.\n• Use sterile shears; wipe with rubbing alcohol between cuts.",
      propagation: "Pothos propagates from any node-containing cutting in water or soil. Each cutting needs at least 1 node (the bump where a leaf attaches). Roots in 2–3 weeks in water, 4 weeks in soil. Success rate >90%.\n\nVariegation preservation tip: Marble Queen variegation is CHIMERIC — meaning it's stored at the cellular level at each node. Always propagate from the most-variegated section of the stem; a fully-reverted green cutting will produce only green offspring forever.",
      repotting: "Newly potted — leave alone 6+ months while roots fill the 4\" pot.\n\nUpsize timeline:\n• 4\" → 5\" at 6–9 months (when you see roots circling the bottom or coming out of drainage holes).\n• 5\" → 6\" at year 2.\n• Pothos in general prefer to be slightly root-bound, so don't oversize.\n• Spring (March–May) is the best repot window — active growth helps roots recover quickly.",
      feeding: "Hold off fertilizer for the first 6 weeks to avoid burning the freshly-transitioned roots.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (10-10-10 or 20-20-20) at HALF strength every 4 weeks during spring/summer.\n• Slow-release Osmocote pellets in spring are an easy alternative.\n• Flush the soil with plain water every 2 months to prevent fertilizer salt buildup (which white-variegated leaves are extra sensitive to).\n• Stop feeding entirely Oct–Feb.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• New leaves mostly green / loss of white marbling → low light (per The Spruce). Move to 1F Corner/Window; trim reverted all-green vines at heavily variegated node.\n• All-white new leaves with no green → too much variegation on one leaf — cut back to balanced node (white tissue can't photosynthesize).\n• Yellow leaves (multiple) → OVERWATERING (#1 in dense plantings per The Spruce). Wet soil = unpot and check roots.\n• Wilting + wet soil → root rot from packed cuttings — trim mushy roots, repot in fresh aroid mix.\n• Wilting + dry soil → thirsty — soak now.\n• Brown crispy edges on white/cream sections → low humidity (AC), underwatering, or tap-water minerals — filtered water + flush soil.\n• Leggy vines / small leaves → low light — move brighter, pinch back.\n• Stagnant growth 4–6 weeks post-transition → normal for water-to-soil cuttings.\n• Spider mites (fine webs in dry AC) → shower, insecticidal soap weekly × 3.\n• Mealybugs → alcohol Q-tip.\n• Scale → alcohol swab.\n• Fungus gnats → reduce watering, sticky traps.\n• Aphids → rinse, insecticidal soap.\n• ⚠️ TOXIC to cats and dogs per ASPCA — insoluble calcium oxalates cause oral irritation, drooling, vomiting, difficulty swallowing if chewed."
    },
    sources: [
      { label: "Missouri Botanical Garden — Epipremnum aureum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275206" },
      { label: "ASPCA — Golden Pothos Toxicity", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/golden-pothos" },
      { label: "RHS — Epipremnum aureum", url: "https://www.rhs.org.uk/plants/search-results?query=epipremnum+aureum" },
      { label: "Costa Farms — Pothos Care Guide", url: "https://costafarms.com/plants/pothos" },
      { label: "University of Florida IFAS — Pothos", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/pothos.html" },
      { label: "The Spruce — Variegated Pothos Care", url: "https://www.thespruce.com/variegated-pothos-7372009" }
    ]
  },

  /* ============= NEW NURSERY-POT ARRIVALS (Jul 2026) =============
   * Eight new plants added in a single haul: haworthia, two sedums, string of
   * pearls, lady finger cactus, variegated elephant bush, ZZ plant, desert
   * rose. All are STILL in their retail nursery pots — repotSuggestion on
   * each entry drives the "🪴 Repot Suggestion" card in the Care Guide.
   *
   * Watering intervals are calibrated for user's Austin, TX indoor conditions
   * (75–80°F). All are in temporary nursery mix (usually peat-heavy) so
   * intervals are conservatively LONGER than they'll be post-repot into
   * proper cactus mix, because peat-heavy nursery mix retains moisture
   * 2–3× longer than a mineral succulent blend. */

  haworthia: {
    id: "haworthia",
    repotSigns: [
      "Pups (small offset rosettes) completely fill the pot around the mother",
      "Mother rosette is being LIFTED UP out of the soil by root pressure",
      "White wart-stripe pattern fades on new growth (nutrient/root stress)",
      "Roots circling out of the drainage holes on the 2\" nursery pot",
      "Pot feels heavy but the plant still wrinkles between waterings (roots too dense to absorb)",
      "Growth stalls in warm season despite proper watering"
    ],
    displayName: "Haworthia",
    potSize: '3"',
    repotted: true,
    category: "succulent",
    names: {
      common: ["Zebra Haworthia", "Zebra Plant", "Zebra Cactus", "Pearl Plant"],
      scientific: "Haworthiopsis fasciata (syn. Haworthia fasciata) — Haworthiopsis attenuata is a look-alike"
    },
    wateringDays: 21,
    wateringDaysHot: 18,
    wateringDaysCool: 35,
    currentSoilMix: "cactus_mix",
    comments: "✅ Repotted Jul 2026 into a 3\" pot with a 50/50 cactus mix + perlite (up ~1\" from the 2\" nursery pot, out of the moisture-holding peat). Zebra Haworthia is uniquely SHADE-tolerant for a succulent — the white raised warts on the dark green leaves are its signature. NON-toxic to pets (rare among succulents). Bright INDIRECT light is ideal — direct hot afternoon sun scorches leaves to red/white.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Now in a 50/50 cactus mix + perlite (out of the moisture-holding nursery peat). The #1 killer of Haworthia is soggy roots, so keep watering sparse and only when the pot feels light.",
    repotSuggestion: {
      urgency: "soon",
      targetPotSize: '3"',
      targetSoilType: "cactus_mix",
      timing: "Within 4–6 weeks — soon as pot has fully dried once",
      technique: "Only up-pot by 1 inch — Haworthias LIKE being pot-bound and rot fast in oversized pots.\n• Water 3–4 days before repotting so roots pull cleanly from the peat plug.\n• Bare-root gently: peat-heavy nursery mix will fall away with a light shake.\n• Use 50/50 cactus mix + perlite (or 60/40 cactus/pumice). Terracotta preferred for extra evaporation.\n• Do NOT water for 5–7 days after repot — let any nicked roots callus.",
      summary: "Up-pot to 3\" and swap the moisture-holding peat mix for a mineral cactus blend. Haworthia is the LEAST forgiving of soggy roots — the repot is more about the soil than the pot size.",
      alternatives: [
        "Terracotta 3\" (best — wicks moisture)",
        "Ceramic 3\" glazed (fine, but water less often)",
        "Plastic 3\" nursery pot (OK if you have quick-draining mix)"
      ]
    },
    conditions: {
      light:        { ideal: "Bright INDIRECT light + 1–2 hrs gentle morning sun", passing: "Bright indirect only; tolerates medium indirect (rare for a succulent)" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                  passing: "55–90°F; not frost tolerant below 50°F" },
      humidity:     { ideal: "30–50%",                                             passing: "Low humidity fine; avoid chronic >60%" },
      soilMoisture: { ideal: "Bone dry between waterings",                         passing: "Drought tolerant — safer to underwater than overwater" }
    },
    tips: {
      lighting: "Bright INDIRECT light is the sweet spot — unlike most succulents, Haworthia naturally grows in the shade of rocks and shrubs. Direct hot afternoon sun turns leaves red, brown, or white (sun stress).\n\n• East-facing window is textbook.\n• South/west windows work with a sheer curtain — pull the pot 1–2 feet back from the glass in summer.\n• Tolerates the lowest light of any succulent in this collection — but growth slows dramatically in true low light.\n• Rotate the pot 1/4 turn weekly so the rosette stays symmetrical.\n• In this home, 2F Room 1 (298° NW) or the 1F Living Room corner are your best matches per PLANT_LIGHT_REF — keep out of humid bathrooms.",
      soil: "Fast-draining cactus/succulent mix, mineral-heavy. Ideal: 50/50 cactus mix + perlite, or 60/40 cactus/pumice.\n\n• Avoid moisture-retentive peat mixes — root rot within weeks.\n• Terracotta pots preferred for extra evaporation.\n• Neutral pH tolerant (7.0 ideal but broadly forgiving).\n• Repot every 3–4 years or when the rosette outgrows the pot rim.",
      watering: "METHOD — strict soak-and-dry, err on the dry side: Haworthiopsis fasciata stores water in thick leaves; crown rot from water sitting in the rosette center is the #1 killer (per The Spruce and RHS).\n\nHOW TO CHECK READINESS (your 3\" pot, fresh 50/50 cactus mix + perlite):\n• Pot weight: a thirsty 3\" terracotta feels almost hollow-light; compare before/after each soak.\n• Leaf test: firm, plump leaves = fine; slightly wrinkled outer leaves = thirsty (rare — usually only after 5+ weeks dry).\n• Finger/skewer: push to pot bottom — must be bone dry throughout before watering.\n• NEVER let water sit in the crown (center rosette) — causes rot within days.\n\n⚠️ FRESHLY REPOTTED (Jul 2026): no water for 5–10 days post-repot to let nicked roots callus, then resume normal schedule. The new mineral mix drains faster than the old nursery peat — expect the 3\" pot to dry ~2–3 days quicker than before.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 18–21 days in 2F Room 1 NW.\n• Peak summer (Jun–Sep): every 18 days — small 3\" pot + AC still dries mineral mix fast.\n• Mild winter (Nov–Feb): every 35 days or longer — near-zero growth; when in doubt, wait an extra week.\n• NEVER in 1F Bathroom (high humidity) or 2F Room 2 (humidifier).\n\nTECHNIQUE:\n• Water at the SOIL LINE along one edge of the pot — never overhead into the rosette.\n• Soak until runoff, empty saucer within 15 min.\n• Terracotta + mineral cactus mix strongly preferred.\n• When in doubt, DON'T water.",
      pruning: "Almost no pruning needed.\n\n• Remove any brown/dried outer leaves at the base with sterile tweezers.\n• Detach mature offsets (pups) that form around the base — they're free plants (see propagation).\n• Flower stalks: cut at the base after blooming to redirect energy back to the rosette.\n• NEVER cut the main leaves — they don't regrow.",
      propagation: "Easy by division of offsets (pups).\n\n• Mature plants send up small rosette pups from the base — wait until each pup has 4+ leaves before removing.\n• Un-pot the whole plant in spring; gently tease pups apart with your fingers or a sterile knife.\n• Let cut surfaces callus 2–3 days in shade.\n• Plant each pup in dry cactus mix in a 2\" pot; wait 5–7 days before first watering.\n• Success rate ~95% — Haworthia is one of the most beginner-friendly succulents to propagate.\n• Leaf cuttings are unreliable — stick to offsets.",
      repotting: "Every 3–4 years, or when pups fill the pot.\n\n• Spring only.\n• Up-pot by 1 inch max — Haworthias LIKE being snug.\n• Bare-root and inspect for rot at the base of the rosette.\n• Switch entirely to mineral cactus mix + perlite/pumice.\n• Terracotta preferred.\n• No water for 5–7 days after — let roots callus.",
      feeding: "Barely a feeder.\n\n• Cactus fertilizer at 1/4 strength ONCE in early spring and ONCE in mid-summer.\n• Absolutely no feeding fall/winter — pushes weak etiolated growth in low light.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Soft/mushy leaves at base + foul smell → CROWN ROT from water in rosette center or overwatering (per The Spruce). Cut off any mushy tissue with sterile knife; let plant dry completely 2 weeks; repot in fresh dry mineral mix if roots are compromised.\n• Rosette lifting away from soil → ROOT ROT below rosette. Unpot; trim black/mushy roots; callus 5 days; replant in dry 50/50 cactus mix.\n• Leaves turning red/brown/white → SUN STRESS from too much direct hot sun. Move to bright indirect (2F Room 1 NW or 1F Corner per PLANT_LIGHT_REF).\n• Elongating/stretching rosette → LOW LIGHT / etiolation (unusual for Haworthia but possible). Move brighter.\n• Brown crispy tips → underwatering (rare) or fluoride in tap water — soak deeply once; use filtered water if persistent.\n• Pale/washed-out leaves → too much direct sun OR nutrient deficiency after repot — stabilize light first.\n• Mealybugs (cottony white in leaf joints) → #1 pest; dab 70% isopropyl alcohol on Q-tip; repeat weekly × 3.\n• Spider mites (fine webbing) → rinse gently, increase airflow; insecticidal soap if heavy.\n• Fungus gnats → soil too wet; let mix dry fully; sticky traps.\n• ✅ Pet-safe — ASPCA lists Haworthia species as non-toxic to dogs and cats (one of the few pet-safe succulents)."
    },
    sources: [
      { label: "ASPCA — Haworthia (non-toxic)", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/haworthia" },
      { label: "ASPCA — Zebra Haworthia (non-toxic)", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/zebra-haworthia" },
      { label: "The Spruce — Haworthia Care", url: "https://www.thespruce.com/grow-haworthia-succulents-1902980" },
      { label: "Gardenia — Haworthiopsis attenuata", url: "https://www.gardenia.net/plant/haworthiopsis-attenuata-zebra-haworthia" },
      { label: "Missouri Botanical Garden — Cacti & Succulents fact sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" },
      { label: "RHS — Cacti & Succulents growing guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" }
    ]
  },

  sedum_angelina: {
    id: "sedum_angelina",
    repotSigns: [
      "Mat completely covers the top of the pot AND cascades over the rim on all sides",
      "Bare/dead patch appears at the center of the mat (old roots die when constrained, new growth pushes outward)",
      "Chartreuse-gold color fades to plain green even with adequate sun (root stress reduces the plant's ability to make the stress-pigment)",
      "Roots visible poking out of the 2\" nursery pot drainage",
      "Water drains through in <5 seconds",
      "New needle-leaves shorter and thinner than mature ones"
    ],
    displayName: "Angelina Stonecrop",
    potSize: '3"',
    repotted: true,
    category: "succulent",
    names: {
      common: ["Angelina Stonecrop", "Angelina Sedum", "Blue Spruce Stonecrop", "Jenny's Stonecrop"],
      scientific: "Sedum rupestre 'Angelina' (syn. Sedum reflexum 'Angelina')"
    },
    wateringDays: 18,
    wateringDaysHot: 14,
    wateringDaysCool: 30,
    currentSoilMix: "cactus_mix",
    comments: "✅ Repotted Jul 2026 into a 3\" pot with a gritty cactus + perlite mix (up ~1\" from the 2\" nursery pot). Note: 'Sedum rupestre' and 'Sedum reflexum' are two names for the SAME species — 'Angelina' is the yellow-gold needle-leaf cultivar. Fast-spreading ground cover in nature; used here as a compact indoor mat/trailer. Gold color depends on strong light — will revert to green in shade.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Now in a gritty cactus blend (1 part cactus mix + 1 part perlite + optional coarse sand), out of the moisture-holding nursery peat. Angelina tolerates lousy soil BUT peat + indoor light + humidity is the classic rot combo, so the mineral mix is a big upgrade.",
    repotSuggestion: {
      urgency: "soon",
      targetPotSize: '3"',
      targetSoilType: "cactus_mix",
      timing: "Within 4–6 weeks",
      technique: "• Water 3 days before to loosen the peat plug.\n• Up-pot by 1 inch — Angelina has a SHALLOW root system and doesn't need depth.\n• A shallow/wide dish (bonsai bowl or pan) works better than a deep pot.\n• Use 1 part cactus mix + 1 part perlite; a top-dressing of coarse sand helps prevent stem rot.\n• Bury cuttings/stem sections up to their lowest leaves — Angelina self-roots readily.\n• Wait 3–5 days before first watering.",
      summary: "Wide-shallow container + gritty mix. Angelina spreads horizontally and roots from any stem section that touches soil — a shallow dish gives it room to sprawl.",
      alternatives: [
        "Wide shallow terracotta bowl 4\" (best for the sprawling habit)",
        "Terracotta 3\" (standard, works fine)",
        "Hanging basket (small, 4\") if you want the trailing look"
      ]
    },
    conditions: {
      light:        { ideal: "Full direct sun 4–6+ hrs — bright direct light needed for gold color",  passing: "Bright indirect; will lose gold color, stay chartreuse-green" },
      temperature:  { ideal: "65–75°F (18–24°C)",                                                       passing: "40–90°F; genuinely cold-hardy (USDA 3–9 outdoors)" },
      humidity:     { ideal: "30–50%",                                                                  passing: "Low humidity fine; avoid chronic >60%" },
      soilMoisture: { ideal: "Dry to slightly moist between waterings",                                 passing: "Drought tolerant — leaves plump if watered, still fine if dry" }
    },
    tips: {
      lighting: "BRIGHT direct sun is what makes Angelina 'Angelina' — the trademark chartreuse-yellow color is a stress response to strong light.\n\n• South- or west-facing window, within 1–2 feet of the glass.\n• 6 hours of direct sun ideal; 4+ hours minimum for gold color.\n• In lower light the needles revert to plain green and stems stretch/thin out.\n• Winter: color often DEEPENS to orange-red at the tips (cold + sun stress) — this is desirable and normal.\n• Rotate weekly for even growth.\n• In this home, 2F Living Room (215° SW — intense afternoon sun, low humidity) is the desert powerhouse per PLANT_LIGHT_REF.",
      soil: "Gritty, fast-draining. 1 part cactus mix + 1 part perlite is textbook — sand can be added for extra weight/drainage.\n\n• Terracotta pot preferred.\n• Shallow container is fine — roots are shallow.\n• Neutral pH tolerant.\n• The plant is famously non-fussy about fertility — poor soil is actually IDEAL for color intensity.",
      watering: "METHOD — soak-and-dry, err slightly dry: Sedum rupestre 'Angelina' tolerates a bit more moisture than desert cacti but still rots in wet soil (per NC State Extension and The Spruce). Less water = brighter gold color.\n\nHOW TO CHECK READINESS (your 3\" pot, fresh gritty cactus mix + perlite):\n• Pot weight: lift — light pot = ready; still heavy from last soak = wait.\n• Needle test: plump, firm needles = fine; limp/hollow-feeling stems = thirsty.\n• Finger test: top 1\" bone dry; skewer to bottom must come out clean/dry.\n\n⚠️ FRESHLY REPOTTED (Jul 2026): no water 5–10 days post-repot to callus roots, then resume. New mineral mix drains faster than old nursery peat — the 3\" pot dries ~2 days quicker.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 14–18 days in 2F LR SW window.\n• Peak summer (Jun–Sep): every 14 days active growth; some Angelina goes semi-dormant in extreme heat — reduce to 18 days if growth stalls.\n• Mild winter (Nov–Feb): every 30 days — slow metabolism; orange-red winter tips are normal.\n• Grow lights help through Central Texas winter's short days if SW window light drops below 4 hrs direct.\n\nTECHNIQUE:\n• Water at soil line — avoid overhead misting.\n• Soak until runoff, empty saucer within 15 min.\n• Terracotta + mineral mix preferred.\n• When in doubt, wait 3 extra days.",
      pruning: "Minimal but useful for shape.\n\n• Snip back leggy stems in early spring to encourage denser branching.\n• The removed cuttings root instantly if you drop them on damp cactus mix — free plants.\n• Remove any brown/dried lower stems.\n• If a stem section starts flowering (small yellow star flowers on tall stalks in summer), cut the flower stalks off to redirect energy back to the mat (unless you want the show).",
      propagation: "STUPIDLY easy — the whole point of ground-cover sedums.\n\n• Break off any stem section 1–2 inches long.\n• Strip the lowest leaves (bury this end).\n• Lay on damp cactus mix and press lightly.\n• Roots form in 5–10 days; no callus period needed.\n• Also propagates from individual needles that drop onto soil — often you'll get 'volunteer' pups in the pot.\n• Success rate: ~99%.",
      repotting: "Rarely needed unless dividing.\n\n• Every 2–3 years if the mat gets crowded.\n• Spring is best.\n• Divide into 2–3 chunks by hand; each chunk becomes a new pot.\n• No callus/rest needed — Angelina bounces back within days.",
      feeding: "Skip fertilizer if you can — lean soil = brighter color.\n\n• If growth stalls, cactus fertilizer at 1/8 strength once in mid-spring is plenty.\n• No fall/winter feeding.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Brown/black mushy stems at soil line → STEM ROT from overwatering or poor drainage (per NC State Extension — avoid wet/poorly drained conditions). Cut off healthy top sections, re-root in dry cactus mix.\n• Chartreuse fading to solid green + leggy stretched stems → LOW LIGHT / etiolation. Move to 2F LR SW per PLANT_LIGHT_REF; prune leggy sections and re-root.\n• Orange/red tips in winter → NORMAL cold + sun stress (desirable); will green up in spring.\n• Needles falling off en masse → underwatering (rare) or sudden temperature shock below 40°F. Water once if dry; stabilize location.\n• Sunscald (bleached/brown patches) → sudden move to intense SW sun without acclimation. Gradual exposure over 2 weeks.\n• Powdery mildew on stems → HIGH HUMIDITY + poor airflow; never place in 2F Room 2 (humidifier) or bathroom; improve ventilation.\n• Mealybugs / aphids → alcohol swab on visible pests; insecticidal soap if heavy.\n• Fungus gnats → soil too wet; dry out fully between waterings.\n• ✅ Generally non-toxic — not on ASPCA toxic list; NC State notes sap may irritate sensitive skin and large quantities of leaves can cause stomach upset in humans."
    },
    sources: [
      { label: "NC State Extension — Petrosedum rupestre 'Angelina'", url: "https://plants.ces.ncsu.edu/plants/petrosedum-rupestre-angelina/" },
      { label: "The Spruce — 'Angelina' Stonecrop Care", url: "https://www.thespruce.com/angelina-stonecrop-ground-cover-2132211" },
      { label: "Missouri Botanical Garden — Cacti & Succulents fact sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" },
      { label: "RHS — Cacti & Succulents growing guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" },
      { label: "Desert Myths — Sedum reflexum 'Angelina'", url: "https://desertmyths.com/sedum-reflexum-angelina/" },
      { label: "Greg — Angelina Stonecrop indoor care", url: "https://greg.app/angelina-stonecrop-indoor-care/" }
    ]
  },

  baby_burros_tail: {
    id: "baby_burros_tail",
    repotSigns: [
      "Jellybean leaves stay wrinkled after a thorough watering",
      "Roots visible out of the 2\" nursery pot drainage holes",
      "Bald spot forms at the top center of the pot (crown dies inward under root pressure)",
      "Water drains through instantly — no retention capacity",
      "New strand growth is thinner and paler than mature strands",
      "Mother stem base lifting up out of the soil"
    ],
    displayName: "Baby Burro's Tail",
    potSize: '3"',
    repotted: true,
    category: "succulent",
    names: {
      common: ["Baby Burro's Tail", "Baby Donkey Tail", "Burrito", "Sedum Burrito"],
      scientific: "Sedum burrito (some botanists treat as Sedum morganianum 'Burrito' cultivar)"
    },
    wateringDays: 21,
    wateringDaysHot: 18,
    wateringDaysCool: 35,
    currentSoilMix: "cactus_mix",
    comments: "✅ Repotted Jul 2026 into a 3\" pot with a 50/50 cactus mix + perlite (up ~1\" from the 2\" nursery pot). This is the CHUNKY-LEAVED cousin of the classic Burro's Tail (Sedum morganianum) — leaves are shorter, rounder, jellybean-shaped, and grip the stem more tightly than the classic. Care is IDENTICAL to Burro's Tail; only real difference is 'Burrito' is a touch less prone to catastrophic leaf-drop when handled.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Now in 50/50 cactus mix + perlite (out of the nursery peat). Peat is dangerous for any Sedum burrito/morganianum — the fleshy leaves store enough water that soggy soil = rapid stem rot from the base. The classic Burro's Tail (in the 4\" pot) already lives on this recipe.",
    repotSuggestion: {
      urgency: "soon",
      targetPotSize: '3"',
      targetSoilType: "cactus_mix",
      timing: "Within 4–6 weeks; ideally in spring",
      technique: "⚠️ HANDLE WITH EXTREME CARE — 'Burrito' drops leaves less than the classic but still drops them.\n• Water 3 days before to firm up the roots.\n• Wrap the plant in cling film or a soft cloth to hold leaves in place while you invert the pot.\n• Bare-root gently — peat plug should slide off with a shake.\n• Up-pot to 3\" (max) — small pots are fine; this plant loves being snug.\n• Use 50/50 cactus mix + perlite. A shallow terracotta bowl works well.\n• No water for 5–7 days.\n• Save any dropped leaves — they root themselves into new plants.",
      summary: "Small upsize + gritty mix + gentle handling. The 3\" size lets you eventually hang it or set it on a shelf where trailing stems can cascade.",
      alternatives: [
        "Terracotta 3\" hanging pot (best for showing off the trailing habit)",
        "Terracotta 3\" bowl (compact, good tabletop option)",
        "Ceramic 3\" glazed (fine, but water 20% less often)"
      ]
    },
    conditions: {
      light:        { ideal: "Bright indirect + 1–2 hrs gentle morning sun",  passing: "Bright indirect; tolerates partial sun" },
      temperature:  { ideal: "65–80°F (18–27°C)",                              passing: "55–90°F; protect from frost" },
      humidity:     { ideal: "30–50%",                                         passing: "Low humidity tolerant" },
      soilMoisture: { ideal: "Bone dry between waterings",                     passing: "Drought tolerant for weeks" }
    },
    tips: {
      lighting: "Bright INDIRECT with a few hours of gentle morning sun is ideal. Filtered south or east window works well.\n\n• Direct hot afternoon sun scorches the waxy leaves — they turn white-pink.\n• In too-low light the strands stretch and the blue-gray color fades to dull green.\n• A hanging planter near a window is the classic placement — it shows off the trailing form once mature.\n• Rotate 1/4 turn weekly for even growth.\n• In this home, 2F Room 1 (298° NW) or the 1F Living Room corner are your best matches per PLANT_LIGHT_REF.",
      soil: "Strict cactus/succulent mix with extra perlite or pumice. 50/50 cacti/perlite is ideal. NEVER use moisture-retentive mixes.\n\n• Terracotta pot preferred for extra evaporation.\n• Shallow-wide beats deep-narrow.\n• The current 2\" nursery pot with peat mix is the WORST possible combo — repot ASAP.",
      watering: "METHOD — strict soak-and-dry, err on the dry side: Sedum burrito stores water in stubby jellybean leaves; identical care to classic Burro's Tail (per University of Wisconsin Extension).\n\nHOW TO CHECK READINESS (your 3\" pot, fresh 50/50 cactus mix + perlite):\n• Pot weight: thirsty 3\" terracotta feels hollow-light vs. 24 hrs post-soak.\n• Leaf test: plump, full jellybeans = fine; uniformly wrinkled = thirsty.\n• Skewer to pot bottom — must be bone dry throughout.\n\n⚠️ FRESHLY REPOTTED (Jul 2026): no water 5–10 days post-repot to callus roots, then resume. New mineral mix drains faster than old nursery peat — the 3\" pot dries ~2–3 days quicker than the peat plug did.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 18–21 days in 2F Room 1 NW.\n• Peak summer (Jun–Sep): every 18 days; 'Burrito' holds slightly more water in stubby leaves than morganianum — still err dry.\n• Mild winter (Nov–Feb): every 35 days — semi-dormant; when in doubt, wait.\n• Keep out of 1F Bathroom and 2F Room 2 (humidifier).\n\nTECHNIQUE:\n• Water at soil line only — never on strands.\n• Soak until runoff, empty saucer within 15 min.\n• Terracotta + mineral mix preferred.\n• When in doubt, DON'T water.",
      pruning: "Almost no pruning needed.\n\n• Leaves that drop off easily = free propagation material.\n• Remove any rotted strands at the base with sterile shears.\n• Trim back leggy strands in early spring to encourage branching.\n• ⚠️ Be GENTLE — every accidental touch knocks off leaves, though 'Burrito' is a bit sturdier than morganianum.",
      propagation: "EASIEST succulent to propagate — basically does it itself.\n\n• Pick up dropped leaves from around the pot.\n• Lay them on dry cactus mix; don't bury.\n• In 2–3 weeks tiny roots and a baby plantlet form from the leaf base.\n• Mist lightly every 4–5 days until the leaf shrivels (it's transferring its water to the baby).\n• Once the baby has 3–4 of its own leaves, water normally.\n• Stem cuttings also work — let the cut end callus 3–5 days before potting.",
      repotting: "Every 3–4 years, or never if happy.\n\n• Spring only.\n• Handle with extreme care — wrap the strands in cling film before lifting.\n• Up-pot by 1\" only.\n• No water for a week after to let any nicked roots heal.",
      feeding: "Very light feeder.\n\n• Cactus fertilizer at quarter strength once in spring and once in mid-summer.\n• No feeding fall/winter.\n• Overfeeding causes leggy growth.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Mushy/translucent leaves + black mush at stem base → OVERWATERING / basal rot. Cut rotted section, save healthy upper strands as cuttings, callus 3–5 days, repot dry.\n• Leaves shriveling but NOT plumping after soak → ROOT ROT. Unpot, trim black roots, callus, repot dry.\n• Leaves dropping en masse → physical disturbance OR temperature shock. Minimize handling; stabilize location.\n• Stretching + yellow-green fade → LOW LIGHT. Move to 2F Room 1 NW per PLANT_LIGHT_REF.\n• White-pink scorched patches → SUNSCALD. Pull back from hot afternoon glass.\n• White waxy bloom → NORMAL farina; don't rub off.\n• Mealybugs in leaf joints → #1 pest; alcohol Q-tip; repeat weekly × 3.\n• Spider mites → rinse, increase airflow; insecticidal soap if heavy.\n• Fungus gnats → soil too wet; dry out fully.\n• ✅ Pet-safe — ASPCA lists Burro's Tail (Sedum morganianum, close relative) as non-toxic to dogs and cats; Sedum burrito is generally considered non-toxic."
    },
    sources: [
      { label: "University of Wisconsin — Burro's Tail Care", url: "https://hort.extension.wisc.edu/articles/burros-tail/" },
      { label: "ASPCA — Burro's Tail Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/burros-tail" },
      { label: "Houseplant 101 — Burro's Tail Care Guide", url: "https://houseplant101.com/plants/burros-tail/" },
      { label: "Missouri Botanical Garden — Sedum morganianum (same genus)", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b350" },
      { label: "SucculenCare — Burro's Tail vs. Burrito", url: "https://www.succulencare.com/blog/burros-tail-donkey-tail-succulent-care-guide" },
      { label: "RHS — Cacti & Succulents growing guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" }
    ]
  },

  string_of_pearls: {
    id: "string_of_pearls",
    repotSigns: [
      "Pearls at the CROWN (top of pot) start thinning/balding — root pressure kills the crown from below",
      "Individual pearls stay small compared to earlier growth (rootbound stunts each new pearl)",
      "Strands don't plump back up after a thorough soak (roots can't absorb)",
      "Roots visible out of the 4\" nursery pot drainage holes",
      "Water drains through in <5 seconds and the pot feels light",
      "Growth stalls in growing season despite proper sun"
    ],
    displayName: "String of Pearls",
    potSize: '5"',
    repotted: true,
    category: "succulent",
    names: {
      common: ["String of Pearls", "String of Beads", "String of Peas", "Rosary Vine", "Necklace Plant"],
      scientific: "Curio rowleyanus (formerly Senecio rowleyanus)"
    },
    wateringDays: 17,
    wateringDaysHot: 14,
    wateringDaysCool: 28,
    currentSoilMix: "cactus_mix",
    comments: "✅ Repotted Jul 2026 into a 5\" pot with a gritty cactus + perlite mix (up ~1\" from the 4\" nursery pot, out of the moisture-holding peat). Pearls are the #1 killer to over-love — they store water in the round bead-leaves and rot fast in soggy soil. ⚠️ TOXIC to pets (dogs, cats) and humans if ingested. Best displayed HANGING once repotted. Watch the pearls themselves: plump and translucent = happy; deflated/wrinkled = thirsty.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Now in a gritty cactus blend (out of the nursery peat, which is the #1 cause of pearl death). The pearls are shallow-rooted, so a wide shallow container beats a deep pot. Bottom-watering is strongly preferred to keep the pearls dry.",
    repotSuggestion: {
      urgency: "soon",
      targetPotSize: '4"',
      targetSoilType: "cactus_mix",
      timing: "Within 4–6 weeks",
      technique: "• Same pot size (4\") is fine — Pearls have shallow roots and don't need depth. If you want a hanging planter, this is the time.\n• Water 3–4 days before repotting so roots pull cleanly.\n• Bare-root gently — nursery peat should shake off. Handle strands carefully; pearls detach easily.\n• Use 50/50 cactus mix + perlite in a shallow-wide 4\" pot (or 4\" hanging planter).\n• Ensure the SOIL SURFACE is well-lit even in a hanging basket — pearls die back at the crown if the top is in shadow.\n• No water for 5–7 days after.\n• Save any detached strands — they root instantly in dry cactus mix.",
      summary: "Same size, but swap peat for a gritty mineral mix and ideally move to a hanging planter so the strands can cascade. The top of the pot MUST get light — the strands die from the top down if not.",
      alternatives: [
        "Hanging terracotta 4\" (best for the trailing look)",
        "Terracotta 4\" bowl (compact tabletop option)",
        "Shallow ceramic 4–5\" bowl (allows crown to spread + collect surface light)"
      ]
    },
    conditions: {
      light:        { ideal: "Bright indirect + 1–3 hrs gentle morning direct sun",  passing: "Bright indirect only; strands may thin out" },
      temperature:  { ideal: "70–80°F (21–27°C) summer; 55–60°F winter helps flower", passing: "50–85°F; not frost tolerant below 50°F" },
      humidity:     { ideal: "30–40% (LOW — key to preventing rot)",                  passing: "Up to 50%; avoid chronic >60% (rot)" },
      soilMoisture: { ideal: "Completely dry between waterings",                      passing: "Drought tolerant — pearls deflate slightly when thirsty" }
    },
    tips: {
      lighting: "Bright indirect all day with 1–3 hours of gentle morning direct sun is textbook. Harsh afternoon sun scorches the pearls to yellow/brown.\n\n• East-facing window is ideal.\n• South/west windows work with a sheer curtain.\n• ⚠️ Crucial: the TOP of the pot (soil surface + crown) needs light too. In a hanging basket, if the top is in shadow, strands thin out at the base and eventually die.\n• Rotate the pot 1/4 turn weekly.\n• Under LED grow lights: 12–14 hrs, 6–12 inches above the crown.\n• In this home, 2F Room 1 (298° NW) or the 1F Living Room corner are your best matches per PLANT_LIGHT_REF — never a humid bathroom.",
      soil: "Gritty, fast-draining. 50/50 cactus mix + perlite. Pearl-friendly recipe: 2 parts cactus mix + 1 part perlite + 1 part coarse sand.\n\n• Shallow wide container beats deep.\n• Terracotta preferred (unglazed) — extra wicking is welcome.\n• Neutral pH.\n• Repot every 2–3 years or when the pot fills up.",
      watering: "METHOD — strict soak-and-dry, err heavily dry: Curio rowleyanus stores water in round bead-leaves; overwatering causes crown/stem rot — the #1 killer (per NC State Extension and University of Wisconsin Extension).\n\nHOW TO CHECK READINESS (your 5\" pot, fresh gritty cactus mix + perlite):\n• Pearl test: plump, round, slightly translucent = happy; slightly deflated/pointed = water now; wrinkled/shriveled = past due.\n• Pot weight: light 5\" pot = ready; still heavy = wait.\n• Skewer to bottom — must be bone dry throughout.\n\n⚠️ FRESHLY REPOTTED (Jul 2026): no water 5–10 days post-repot to callus roots, then resume. New mineral mix drains much faster than old nursery peat — the 5\" pot dries ~2–3 days quicker despite the larger size.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 14–17 days in 2F Room 1 NW.\n• Peak summer (Jun–Sep): every 14 days — AC keeps RH low (~30–45%), which these pearls need.\n• Mild winter (Nov–Feb): every 28 days or less — cool-dry rest encourages spring blooms (cinnamon-vanilla scented white flowers per RHS).\n• NEVER in 1F Bathroom (high humidity) or 2F Room 2 (humidifier).\n\nTECHNIQUE — BOTTOM WATERING strongly preferred:\n• Sit the 5\" pot in a saucer of water 10–15 min until soil wicks moisture from below — keeps pearls completely dry.\n• If top-watering, pour at soil line only along the edge; never overhead on beads.\n• Empty saucer immediately; never standing water.\n• Terracotta + shallow-wide mineral mix is ideal.\n• When in doubt, wait 5 extra days.",
      pruning: "Trim damaged, discolored, or straggly strands with sterile scissors.\n\n• Cut strands can be laid on dry cactus mix — they root in 1–2 weeks.\n• Pinch back long strands to keep the plant bushy near the crown.\n• Remove any brown or shriveled pearls.",
      propagation: "Extremely easy.\n\n• Cut a strand 4–6 inches long.\n• Lay it on dry cactus mix in a spiral, letting several pearls make contact with the soil.\n• Mist lightly every 3–4 days.\n• Roots form at each contact point within 1–2 weeks.\n• Alternatively, drop individual pearls that have fallen off — many will root.\n• Success rate: 90%+ if soil is kept mostly dry.",
      repotting: "Rarely needed.\n\n• Every 2–3 years or when strands cover the pot rim.\n• Spring is best.\n• Wide-shallow container.\n• Handle strands GENTLY — they detach easily.\n• No water for 5–7 days after.",
      feeding: "Very light feeder.\n\n• Cactus fertilizer at 1/4 strength once in spring, once in mid-summer.\n• Skip fall/winter feeding entirely — pushes weak growth in low light.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Mushy/translucent/splitting pearls + black mush at crown → OVERWATERING / crown rot (HIGHEST-RISK plant in this batch per NC State Extension). Cut off healthy strands, root fresh in dry mix; often the whole mother is lost.\n• Bare stems at crown, thinning from top down → CROWN ROT or too little light on soil surface. Move brighter (2F Room 1 NW per PLANT_LIGHT_REF); propagate cuttings back into bald areas.\n• Wrinkled/deflated pearls → UNDERWATERING (rare). Bottom-water thoroughly once; should plump within 24–48 hrs.\n• Straggly elongated strands, widely-spaced pearls → LOW LIGHT / etiolation. Increase light; pinch back.\n• Yellow/brown scorched pearls → SUNSCALD from sudden full sun. Sheer curtain or pull back from hot SW glass.\n• Sudden strand drop → temperature shock or drafts. Stabilize location.\n• Mealybugs / aphids / whiteflies → alcohol Q-tip on visible pests; systemic if heavy.\n• Fungus gnats → soil staying too wet; dry out longer between waterings; sticky traps.\n• ⚠️ TOXIC to cats and dogs per ASPCA and NC State Extension (pyrrolizidine alkaloids) — causes vomiting, diarrhea, lethargy. Hang well out of pet reach."
    },
    sources: [
      { label: "ASPCA — String of Pearls (toxic)", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/string-of-pearls" },
      { label: "NC State Extension — Curio rowleyanus (toxic)", url: "https://plants.ces.ncsu.edu/plants/curio-rowleyanus/" },
      { label: "University of Wisconsin — String of Pearls Care", url: "https://hort.extension.wisc.edu/articles/string-of-pearls-senecio-rowleyanus/" },
      { label: "RHS — String of beads (Curio rowleyanus)", url: "https://www.rhs.org.uk/plants/string-of-beads" },
      { label: "Almanac — String of Pearls Care", url: "https://www.almanac.com/plant/how-care-string-pearls-plant" },
      { label: "Missouri Botanical Garden — Cacti & Succulents fact sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" }
    ]
  },

  lady_finger_cactus: {
    id: "lady_finger_cactus",
    repotSigns: [
      "Finger clump has expanded to touch the pot rim on all sides — nowhere left for offsets",
      "New fingers emerging PALE and thin instead of golden-spined (root-space starvation)",
      "Roots visible out of the 4\" nursery pot drainage",
      "Any of the fingers softening at the very base (rot check first, then root-space)",
      "Water drains through instantly — no retention",
      "Small offsets at the pot edge staying dwarfed instead of growing"
    ],
    displayName: "Lady Finger Cactus",
    potSize: '4"',
    category: "cactus",
    names: {
      common: ["Lady Finger Cactus", "Gold Lace Cactus", "Golden Stars"],
      scientific: "Mammillaria elongata"
    },
    wateringDays: 21,
    wateringDaysHot: 18,
    wateringDaysCool: 45,
    currentSoilMix: "other",
    comments: "⚠️ Still in original 4\" nursery pot with peat-heavy retail mix. Clumping cactus of pencil-thin 'fingers' covered in golden-yellow spines. Native to central Mexico limestone slopes — WANTS full direct sun. Under-lit indoor plants stretch (etiolate) permanently and can't recover. Non-toxic to pets but the fine spines are a mechanical hazard; handle with folded newspaper or tongs.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Nursery peat mix + humid indoor bathroom air is the classic rot trigger for Mammillaria. Repot ASAP into a very mineral-heavy mix: 1 part cactus mix + 1 part pumice + 1 part coarse sand (or perlite). Terracotta pot strongly preferred.",
    repotSuggestion: {
      urgency: "soon",
      targetPotSize: '4"',
      targetSoilType: "cactus_mix",
      timing: "Within 4–6 weeks (spring/summer only — avoid winter dormancy)",
      technique: "• Wait until soil is bone dry before starting.\n• Wrap the cactus in FOLDED NEWSPAPER (3–4 layers) to hold it safely while inverting the pot — the golden spines are fine but WILL puncture skin.\n• Bare-root gently; nursery peat should shake off. If it's stuck, DON'T pick at it — trim any damaged roots with sterile scissors.\n• Up-pot to 4\" terracotta (same nominal size, but terracotta lets roots breathe).\n• Mix: 1 part cactus mix + 1 part pumice + 1 part coarse sand (or perlite).\n• Top-dress with 1/2\" of fine gravel/aquarium pebbles to keep the base of the fingers dry.\n• Do NOT water for 7–10 days after repotting.\n• Bottom-water thereafter (see watering tips) to keep the clump dry.",
      summary: "Same 4\" size but switch to a mineral-heavy mix in a terracotta pot with a gravel top-dressing. Nursery peat mix is the biggest cause of Mammillaria rot.",
      alternatives: [
        "Terracotta 4\" (best — wicks moisture)",
        "Ceramic 4\" with drainage hole (fine, water less often)",
        "Small clay bonsai pot (shallow style — great for the low, clumping habit)"
      ]
    },
    conditions: {
      light:        { ideal: "Full direct sun 4–6+ hrs daily",                    passing: "Bright indirect + 2–3 hrs direct sun (etiolation slow but inevitable)" },
      temperature:  { ideal: "70–90°F growing season; 50–60°F winter rest",       passing: "50–95°F; NOT frost tolerant below 40°F" },
      humidity:     { ideal: "30–40% (LOW — high humidity → stem soften/droop)",  passing: "Up to 50%; avoid bathrooms/laundry rooms" },
      soilMoisture: { ideal: "Completely dry between waterings",                  passing: "Drought tolerant — 6+ weeks dry is fine in winter" }
    },
    tips: {
      lighting: "FULL DIRECT SUN is non-negotiable. This cactus cannot be talked into liking indirect light.\n\n• South- or west-facing window, within 1 foot of the glass.\n• 4–6+ hrs direct sun daily is the minimum for compact form and rich golden spine color.\n• Without enough light: fingers stretch (etiolate) and stay stretched — permanent damage.\n• Grow light supplement: 12–14 hrs/day, 6–12 inches above the cactus, full-spectrum LED.\n• In summer, can be moved outdoors to filtered morning sun for a boost — acclimate over 2 weeks to prevent sunburn.\n• Rotate 1/4 turn weekly.\n• In this home, 2F Living Room (215° SW) is THE desert powerhouse per PLANT_LIGHT_REF — NEVER a bathroom.",
      soil: "Extremely mineral-heavy. 1 part cactus mix + 1 part pumice + 1 part coarse sand (or perlite).\n\n• Terracotta pot strongly preferred.\n• Top-dress with 1/2\" of fine gravel or aquarium pebbles — this keeps the base of the stems DRY, which prevents the #1 killer: fungal rot at the soil line.\n• Neutral to slightly alkaline pH (7.0–7.5) preferred (limestone habitat).\n• Repot every 3–4 years, or when the clump fills the pot.",
      watering: "METHOD — strict soak-and-dry, err heavily dry: Mammillaria elongata is rot-prone in peat-heavy nursery mix (per NC State Extension). Overwatering is the single biggest cause of cactus death.\n\nHOW TO CHECK READINESS (your 4\" nursery pot, still in peat-heavy retail mix — repot to mineral mix ASAP):\n• Skewer test: push wooden skewer to pot bottom; if cool/stained, wait 3–5 more days.\n• Pot weight: light = ready.\n• Finger: top 2\" must be bone dry; peat retains moisture longer than mineral mix — adjust expectations accordingly.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 18–21 days in 2F LR SW — once repotted to mineral mix, shorten interval ~3 days.\n• Peak summer (Jun–Sep): every 18 days active growth.\n• Mild winter (Nov–Feb): 1–2 waterings TOTAL — cool-dry rest (50–60°F) triggers spring flowers (per NC State Extension).\n• NEVER in 2F Bathroom (stagnant humid SW sun) or 2F Room 2 (humidifier).\n• Grow lights supplement through Central Texas winter short days.\n\nTECHNIQUE — BOTTOM WATER whenever possible:\n• Pour water into saucer, let 4\" pot soak 10–15 min, drain completely — keeps finger clump dry.\n• If top-watering, pour around pot EDGE only; never over the spine mass.\n• Empty saucer within 15 min.\n• After future repot to terracotta + mineral mix: expect faster drying.\n• When in doubt, DON'T water.",
      pruning: "None. Any damage doesn't grow back.\n\n• Remove offset pups only for propagation.\n• Handle with folded newspaper or tongs — the spines are fine but sharp.",
      propagation: "Extremely easy from offsets.\n\n• Mature clumps produce small offset pups at the base and along the fingers.\n• Twist off a mature pup (2+ inches long) with tongs.\n• Let the cut end callus for 5–7 days in shade.\n• Plant in dry cactus mix in a 2\" terracotta pot.\n• Wait another 7 days before first watering (light mist).\n• Roots form in 3–4 weeks.\n• Success rate: 95%+.",
      repotting: "Every 3–4 years or when the clump overhangs the pot rim.\n\n• Spring/summer only — never in winter dormancy.\n• Bare-root and inspect for pest activity or rot at the base.\n• Terracotta pot 1 size larger.\n• Very mineral mix (see soil above).\n• No water for 7–10 days after.",
      feeding: "Very light feeder.\n\n• Cactus fertilizer at 1/4–1/2 strength once in early spring, once in early summer.\n• Absolutely no feeding fall/winter — pushes weak etiolated growth and breaks dormancy.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Fingers stretching thin and pale → LOW LIGHT / etiolation (permanent on existing growth). Move to 2F LR SW per PLANT_LIGHT_REF or add grow lights; new top growth will be compact if light improves.\n• Brown/black spots at soil line → FUNGAL ROT from wet stem base in peat mix. Cut healthy top, callus 7 days, root in dry mineral mix.\n• Soft, mushy fingers → ROOT ROT from overwatering. Salvage healthy offsets as cuttings; whole clump often lost.\n• Gold spines fading to pale yellow/green → insufficient light. Move brighter.\n• Brown corky patches at base → NORMAL aging (corking); not rot unless soft.\n• Spines browning/drying at tips → underwatering in warm room OR sun stress; water once if skewer is dry.\n• No spring flowers → didn't get cool-dry winter rest (45–55°F, minimal water Nov–Feb per NC State Extension).\n• White cottony spots in spine mass → MEALYBUGS (#1 cactus pest); systemic pesticide easier than hand-removal in spines.\n• Scale on stems → scrape, alcohol, horticultural oil.\n• Fungus gnats → peat staying too wet; dry out; sticky traps.\n• ⚠️ Not chemically toxic per NC State Extension (Mammillaria spp. non-toxic), but fine golden spines are a MECHANICAL HAZARD — handle with folded newspaper or tongs; keep from curious pets."
    },
    sources: [
      { label: "NC State Extension — Mammillaria (Ladyfinger Cactus)", url: "https://plants.ces.ncsu.edu/plants/mammillaria/" },
      { label: "Houseplant 101 — Lady Finger Cactus Care", url: "https://houseplant101.com/plants/lady-finger-cactus/" },
      { label: "Missouri Botanical Garden — Cacti & Succulents fact sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" },
      { label: "RHS — Cacti & Succulents growing guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" },
      { label: "Succulent Hub — Mammillaria elongata", url: "https://succulenthub.com/mammillaria-elongata/" },
      { label: "Viriar — Mammillaria elongata care & propagation", url: "https://www.viriar.com/blogs/cactus-encyclopedia/mammillaria-elongata" }
    ]
  },

  variegated_elephant_bush: {
    id: "variegated_elephant_bush",
    repotSigns: [
      "New leaves come in noticeably smaller than the mature paddle-shaped ones",
      "Cream stripes on new growth fade to solid green (root stress kills variegation first)",
      "Semi-woody stem thickens but no new branch tips emerge",
      "Roots visible out of the 4\" nursery pot drainage",
      "Water drains through in <5 seconds",
      "Plant starts leaning — top-heavy for the current pot's rootball"
    ],
    displayName: "Variegated Elephant Bush",
    potSize: '5"',
    repotted: true,
    category: "succulent",
    names: {
      common: ["Variegated Elephant Bush", "Rainbow Bush", "Rainbow Elephant Bush", "Mini Jade (Variegated)", "Spekboom (Variegated)"],
      scientific: "Portulacaria afra 'Variegata'"
    },
    wateringDays: 14,
    wateringDaysHot: 12,
    wateringDaysCool: 24,
    currentSoilMix: "cactus_mix",
    comments: "✅ Repotted Jul 2026 into a 5\" pot with a 50/50 cactus mix + perlite (up ~1\" from the 4\" nursery pot). 🌳 One branch was extracted at repot to start a separate bonsai (see 'Variegated Elephant Bush Bonsai'). Semi-woody succulent shrublet with cream-edged green leaves and a distinctive reddish-brown stem. More forgiving than most succulents about watering — but the VARIEGATED form needs MORE light than the plain green version to maintain the cream stripes. Non-toxic to pets. Can be bonsai'd. Beloved in South Africa as 'spekboom' — a keystone climate-remediation species that fixes huge amounts of CO2 relative to its size.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Now in 50/50 cactus mix + perlite (out of the nursery peat). Portulacaria tolerates more moisture than most succulents, but for indoor conditions in Austin the mineral mix drastically reduces rot risk.",
    repotSuggestion: {
      urgency: "soon",
      targetPotSize: '5"',
      targetSoilType: "cactus_mix",
      timing: "Within 6–8 weeks",
      technique: "• Water 3–4 days before repotting.\n• Bare-root gently.\n• Up-pot by 1 inch — Portulacaria roots aren't very deep but the top-heavy shrublet needs some stability.\n• Use 50/50 cactus mix + perlite. Terracotta works well.\n• Prune any leggy stems at repot; the cuttings root instantly (see propagation).\n• Water lightly 3–5 days after repotting.\n• If bonsai-ing, use a shallow bonsai tray + wire the trunk while the plant is still young; the semi-woody stem takes shape beautifully.",
      summary: "Up-pot 1 inch + mineral mix. This species is FORGIVING — you have more grace period than with Pearls or Haworthia, but the cream variegation will fade if it stays in peat + low light.",
      alternatives: [
        "Terracotta 5\" (best — wicks moisture, breathes)",
        "Shallow bonsai pot (for bonsai training)",
        "Ceramic 5\" glazed (fine — water less often)"
      ]
    },
    conditions: {
      light:        { ideal: "Full to partial sun (6+ hrs direct) — MORE light than the plain green form", passing: "Bright indirect with 2–3 hrs direct; variegation fades in low light" },
      temperature:  { ideal: "65–85°F (18–29°C)",                                                          passing: "50–90°F; frost tender, protect below 40°F" },
      humidity:     { ideal: "30–50%",                                                                      passing: "Low humidity fine; tolerates modestly higher than most succulents" },
      soilMoisture: { ideal: "Dry to slightly moist between waterings",                                    passing: "Drought tolerant — leaves lose plumpness when thirsty" }
    },
    tips: {
      lighting: "BRIGHTER LIGHT than the plain green Portulacaria — the cream/yellow variegation only stays vivid with strong direct sun.\n\n• 6+ hours of direct sun ideal for full color.\n• South or west window, within 1–2 feet of the glass.\n• In lower light: cream stripes fade to a dull yellow-green; new leaves come in mostly green.\n• Leaves may develop RED tips in strong sun — this is desirable and normal (sun stress).\n• Tolerates partial shade but growth stalls and stems get leggy.\n• Rotate weekly.\n• In this home, 2F Living Room (215° SW) is the primary match per PLANT_LIGHT_REF; 2F Bathroom SW also works if airflow stays good.",
      soil: "50/50 cactus mix + perlite is textbook, but Portulacaria is more forgiving than most succulents.\n\n• Terracotta pot preferred.\n• Neutral pH.\n• Well-drained is essential; sitting in wet soil kills the plant faster than any other issue.\n• Repot every 2–3 years or when the shrublet outgrows the pot.",
      watering: "METHOD — soak-and-dry with slightly more frequency than desert cacti: Portulacaria afra stores less water in small leaves than true desert species (per The Spruce and Gardenia).\n\nHOW TO CHECK READINESS (your 5\" pot, fresh 50/50 cactus mix + perlite):\n• Leaf test: plump paddle leaves = fine; shriveled/puckered leaves = thirsty (very clear signal).\n• Pot weight: light 5\" pot = ready.\n• Finger: top 1–2\" dry before soaking.\n\n⚠️ FRESHLY REPOTTED (Jul 2026): no water 5–10 days post-repot to callus roots, then resume. New mineral mix drains faster than old nursery peat — the 5\" pot dries ~2 days quicker.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 12–14 days in 2F LR SW.\n• Peak summer (Jun–Sep): every 12 days active growth.\n• Mild winter (Nov–Feb): every 24 days — reduce ~50%; still more forgiving than most succulents.\n• Grow lights help variegation through winter short days.\n\nTECHNIQUE:\n• Soak thoroughly, dump saucer within 15 min.\n• Terracotta + mineral cactus mix preferred.\n• Overwatering signs: mushy stem at soil line, leaf drop en masse.\n• When in doubt, wait 2 extra days — Portulacaria is unusually forgiving.",
      pruning: "PRUNE FREELY — Portulacaria loves being shaped. This is what makes it beloved for bonsai.\n\n• Pinch off tips to encourage branching.\n• Cut back leggy stems in spring; save cuttings for propagation.\n• Bonsai-style wire training on the semi-woody stems works beautifully — wire while young and green, unwrap in 3–6 months.\n• Prune any stems that revert to solid green (no variegation) — reversion spreads if left.",
      propagation: "One of the easiest succulents to propagate.\n\n• Cut a stem 3–5 inches long.\n• Strip the lowest leaves.\n• Callus the cut end 2–3 days in shade.\n• Plant in dry cactus mix in a 2\" pot.\n• Mist lightly after a week; roots form in 2–3 weeks.\n• Cuttings can even be laid directly on soil in a shady spot outdoors — they root from any node that touches the ground.\n• Success rate: 95%+.",
      repotting: "Every 2–3 years or when the shrublet outgrows the pot.\n\n• Spring/summer.\n• Up-pot by 1 inch.\n• Prune the top at repotting to balance the reduced root disturbance.\n• Water lightly 3–5 days after.",
      feeding: "Moderate feeder for a succulent.\n\n• Balanced cactus fertilizer at 1/2 strength once a month during spring and summer.\n• No feeding fall/winter.\n• Responds well to feeding with faster growth — but growth may lose some compactness.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Cream stripes fading to solid green → LOW LIGHT / variegation loss. Move to 2F LR SW per PLANT_LIGHT_REF; prune reverted all-green shoots before reversion spreads.\n• Leggy stretched stems + big leaf gaps → LOW LIGHT / etiolation. Increase sun; pinch tips in spring.\n• Mushy stem at soil line → STEM ROT from overwatering. Cut healthy top section, callus 3 days, root fresh in dry mineral mix.\n• Leaves dropping en masse → sudden temperature change OR overwatering. Check soil moisture first.\n• Shriveled papery leaves → UNDERWATERING. Soak once; usually recovers within days.\n• Red leaf tips → NORMAL sun stress (desirable); no action needed.\n• Aphids on new growth → water spray or insecticidal soap.\n• Mealybugs in stem forks → alcohol Q-tip; repeat weekly × 3.\n• Scale on woody stems → scrape, alcohol, horticultural oil.\n• Fungus gnats → soil too wet; dry out longer.\n• ✅ Generally non-toxic — Portulacaria afra is widely cited as pet-safe; do NOT confuse with toxic Portulaca oleracea (ASPCA lists Portulaca as toxic due to soluble calcium oxalates)."
    },
    sources: [
      { label: "The Spruce — Rainbow Elephant Bush", url: "https://www.thespruce.com/rainbow-elephant-bush-growing-guide-8601956" },
      { label: "Gardenia — Portulacaria afra 'Variegata'", url: "https://www.gardenia.net/plant/portulacaria-afra-variegata-elephant-bush-grow-care-guide" },
      { label: "ASPCA — Portulaca (toxic look-alike — NOT elephant bush)", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/portulaca" },
      { label: "Missouri Botanical Garden — Cacti & Succulents fact sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" },
      { label: "RHS — Cacti & Succulents growing guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" },
      { label: "Trains.com — Rainbow bush/variegated elephant bush", url: "https://www.trains.com/grw/how-to/gardening/plant-portraits/rainbow-bush-or-variegated-elephant-bush/" }
    ]
  },

  variegated_elephant_bush_bonsai: {
    id: "variegated_elephant_bush_bonsai",
    repotSigns: [
      "Trunk has thickened and roots start lifting the plant/soil out of the shallow bonsai tray",
      "Roots circling the bottom or poking out the bonsai pot's drainage holes",
      "Water runs straight through in seconds and the shallow tray dries daily",
      "New leaves come in noticeably smaller than mature ones (root-bound stress)",
      "Cream variegation fading to solid green on new growth (root/nutrient stress)",
      "Soil breaking down / no longer draining — time for a root-prune + fresh bonsai mix (every 2–3 yrs)"
    ],
    displayName: "Variegated Elephant Bush Bonsai",
    potSize: "Bonsai pot",
    repotted: true,
    category: "bonsai",
    condition: "rooted branch division — settling into bonsai pot",
    names: {
      common: ["Spekboom Bonsai", "Variegated Elephant Bush Bonsai", "Rainbow Bush Bonsai", "Mini Jade Bonsai"],
      scientific: "Portulacaria afra 'Variegata' (rooted division, bonsai-trained)"
    },
    wateringDays: 12,
    wateringDaysHot: 10,
    wateringDaysCool: 20,
    currentSoilMix: "cactus_mix",
    comments: "🌳 A whole branch carefully removed WITH its own portion of the rootball from the main Variegated Elephant Bush in Jul 2026, then potted into its own shallow bonsai pot to train as a bonsai. Because it came out as a ROOTED DIVISION — not a fresh cutting — it already has an established root system, so it settles in fast and can be treated much like the parent (just in a shallow, fast-drying bonsai pot rather than a deep one). Portulacaria is one of the BEST beginner bonsai — thick semi-woody trunk, tolerates aggressive pruning and wiring. Non-toxic to pets. The cream variegation needs strong light to stay vivid.",
    idealSoil: ["bonsai_mix", "cactus_mix"],
    soilNotes: "In a fast-draining succulent/bonsai mix (cactus mix + perlite/pumice, or a gritty bonsai blend). A shallow bonsai pot holds little soil and dries quickly. Since this came out as a rooted division (roots intact), it does NOT need the long moist 'rooting-in' period a cutting would — give it a short 3–5 day settle after the move, then treat it like the parent: soak and dry.",
    conditions: {
      light:        { ideal: "Full to partial sun (6+ hrs direct) — strong light keeps the cream variegation and tightens internodes for a bonsai look", passing: "Bright indirect + 2–3 hrs direct; variegation fades and growth gets leggy in low light" },
      temperature:  { ideal: "65–85°F (18–29°C)",                                   passing: "50–90°F; frost tender, protect below 40°F" },
      humidity:     { ideal: "30–50%",                                              passing: "Low humidity fine; tolerates modestly higher than most succulents" },
      soilMoisture: { ideal: "Dry-to-slightly-moist between waterings (shallow bonsai pot dries fast); brief settle-in after the move", passing: "Drought tolerant once settled; leaves pucker when thirsty" }
    },
    tips: {
      lighting: "BRIGHT light is what keeps a variegated spekboom bonsai looking sharp — strong sun keeps the cream stripes vivid and shortens the gaps between leaves (tighter, more tree-like growth).\n\n• 6+ hrs of direct sun ideal; a south or west window within 1–2 ft of the glass.\n• Low light = faded variegation, stretched leggy shoots, and a floppy silhouette (bad for bonsai).\n• Red leaf tips in strong sun are normal and desirable.\n• Rotate weekly so the canopy fills evenly.\n• In this home, 2F Living Room (215° SW) is the primary match per PLANT_LIGHT_REF while the branch establishes.",
      soil: "Gritty, free-draining succulent/bonsai mix in a shallow bonsai pot.\n\n• Cactus mix + perlite/pumice, or a proper bonsai blend (akadama/pumice/lava) cut with a little organic matter for a succulent.\n• The shallow pot dries fast — pick a mix that drains but still holds a little moisture between waterings.\n• Full bonsai root-prune + fresh mix every 2–3 years.",
      watering: "METHOD — soak-and-dry, like the parent, but on a faster clock because the bonsai pot is shallow and holds little soil (per Bonsai Empire Portulacaria guidance).\n\nThis is a ROOTED DIVISION — a branch removed WITH its own rootball, not a fresh cutting — so the roots are already established. It settles in quickly and does NOT need the long moist 'rooting-in' phase a cutting would.\n\n⚠️ JUST POTTED (Jul 2026): give it a short 3–5 day settle-in with the mix only barely moist so any nicked roots callus, then resume normal soak-and-dry.\n\nHOW TO CHECK READINESS (shallow bonsai pot, gritty succulent/bonsai mix):\n• Leaf test: plump paddle leaves = fine; slight pucker = time to water.\n• Pot/tray weight: noticeably light = ready.\n• Finger: top of the shallow mix dry before watering.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): ~every 10 days in 2F LR SW (shallow pot dries fast).\n• Warm/shoulder months: ~every 12 days.\n• Mild winter (Nov–Feb): ~every 20 days — reduce ~50%.\n• Grow lights help hold the variegation through winter's short days.\n\nTECHNIQUE:\n• Soak thoroughly, then dump tray runoff within 15 min — never let the shallow tray sit in water.\n• Overwatering signs: mushy stem at soil line, leaf drop en masse.\n• When in doubt, wait 1–2 extra days — Portulacaria is very forgiving of a missed watering.",
      pruning: "This is the fun part — Portulacaria is beloved for bonsai because it takes pruning and wiring so well.\n\n• Let the branch root and push a flush or two of growth BEFORE hard pruning.\n• Then pinch tips to build ramification (dense branching) and shape the canopy.\n• Light wiring on green/semi-woody stems shapes the trunk and branches; unwrap in 3–6 months before wire bites in.\n• Remove any shoots that revert to solid green — reversion spreads.\n• Clip-and-grow also works: prune to a node facing the direction you want the next branch to go.",
      propagation: "Ridiculously easy. This bonsai itself came from a rooted branch division of the parent plant.\n\n• Any 3–5\" branch cutting also roots readily: strip lower leaves, callus 2–3 days, plant in dry cactus mix, water lightly after a week.\n• Removing a branch WITH some rootball (a division, as done here) establishes even faster than a bare cutting.\n• Great for building a forest/clump planting or replacing a branch you pruned off.\n• Success rate 95%+.",
      repotting: "Bonsai repot / root-prune every 2–3 years in spring/summer.\n\n• Rake out old soil, trim the outer/bottom roots by up to ~1/3 to keep the shallow flat root pad a bonsai needs.\n• Return to the same shallow pot (or the next size only if trunk growth is the goal) with fresh gritty mix.\n• Keep just-moist (not the mature dry-down) for a couple weeks after, no fertilizer for 4–6 weeks.",
      feeding: "Light feeder.\n\n• Wait until clearly rooted and growing, then balanced cactus/bonsai feed at 1/2 strength monthly in spring/summer.\n• No feeding fall/winter.\n• Slightly leaner feeding keeps growth compact — good for bonsai proportions.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Cream stripes fading to green → LOW LIGHT. Move to 2F LR SW per PLANT_LIGHT_REF; prune reverted-green shoots.\n• Leggy stems with big internode gaps → LOW LIGHT / bad bonsai proportions. Increase sun; pinch tips after rooting.\n• Leaves dropping en masse → temperature swing OR overwatering in shallow tray. Check mix isn't staying wet.\n• Mushy stem at soil line → ROT from a too-wet shallow pot. Cut to firm tissue, re-root the healthy top in fresh dry mix.\n• Shriveled papery leaves → TOO DRY (easy to do in a shallow bonsai tray). Water lightly — usually plumps within hours.\n• Red leaf tips → NORMAL sun stress; no action.\n• Wilting/limp in the first week or two after the move → transplant settling; keep the mix barely moist and stable, ease off harsh midday sun for a week, and it should firm up (roots came with it, so recovery is quick).\n• Mealybugs / aphids → alcohol Q-tip; insecticidal soap if heavy.\n• Fungus gnats → soil too wet; reduce watering frequency.\n• ✅ Generally non-toxic — Portulacaria afra is widely cited as pet-safe; do NOT confuse with toxic Portulaca oleracea (ASPCA)."
    },
    sources: [
      { label: "Bonsai Empire — Portulacaria afra (Dwarf Jade) Bonsai", url: "https://www.bonsaiempire.com/tree-species/portulacaria" },
      { label: "The Spruce — Rainbow Elephant Bush", url: "https://www.thespruce.com/rainbow-elephant-bush-growing-guide-8601956" },
      { label: "Gardenia — Portulacaria afra 'Variegata'", url: "https://www.gardenia.net/plant/portulacaria-afra-variegata-elephant-bush-grow-care-guide" },
      { label: "ASPCA — Portulaca (toxic look-alike — NOT elephant bush)", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/portulaca" },
      { label: "Missouri Botanical Garden — Cacti & Succulents fact sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" },
      { label: "RHS — Cacti & Succulents growing guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" }
    ]
  },

  zz_plant: {
    id: "zz_plant",
    repotSigns: [
      "Roots circling out of the 5\" drainage holes (next cycle — you just left the stretching 4\")",
      "Rhizomes visible pushing up through the soil surface",
      "Rhizomes visible against the pot walls when you tilt the pot in light",
      "Glossy leaflets duller than they used to be",
      "Water drains through in <5 seconds",
      "Any cracking sound when you gently squeeze the pot = rhizomes physically constrained again"
    ],
    displayName: "ZZ Plant",
    potSize: '5"',
    repotted: true,
    category: "tropical",
    names: {
      common: ["ZZ Plant", "Zanzibar Gem", "Aroid Palm", "Emerald Palm", "Fern Arum"],
      scientific: "Zamioculcas zamiifolia"
    },
    wateringDays: 18,
    wateringDaysHot: 16,
    wateringDaysCool: 32,
    currentSoilMix: "amended_potting",
    comments: "✅ Aug 2026: repotted 4\" stretching nursery pot → 5\" (the correct +1\" jump per Clemson HGIC indoor transplanting). ZZ stores water in potato-like rhizomes — it likes to be slightly snug; do NOT jump again soon. Hold water 7–10 days post-repot if any rhizomes were nicked, then resume soak-and-dry. Aroid, not a succulent. ⚠️ TOXIC if ingested — all parts. Black stem spots are normal pigment. Slow grower.",
    idealSoil: ["standard_potting", "amended_potting"],
    soilNotes: "Now in a 5\" pot. Prefer 75/25 potting + perlite (amended_potting) over cactus mix — rhizomes struggle in pure grit. Clemson: don't pack wet media. Next repot only when rhizomes surface or the 5\" starts to deform (likely 2–3 years).",
    repotSuggestion: {
      urgency: "urgent",
      targetPotSize: '5–6"',
      targetSoilType: "amended_potting",
      timing: "NOW — pot is already stretching. Do it in the next 1–2 weeks (any season is fine for ZZ — its rhizome storage means it doesn't strictly need a spring repot).",
      technique: "⚠️ The pot is already deformed — handle it as a semi-emergency repot. Rhizomes may be firmly pressed against the plastic walls.\n• Water lightly 2–3 days before to make roots pliable (but not sopping — you'll be handling rhizomes, and rot risk is highest right after any nick).\n• CUT the plastic pot open with sturdy scissors if the rhizomes won't slide out cleanly — do NOT force/pry; snapped rhizome tissue is a rot entry point. A cut pot is a small price to pay vs. a cracked rhizome.\n• Bare-root gently to inspect: rhizomes should be firm, potato-like, and cream/tan colored. Any soft, dark, or mushy tissue → trim off with sterile knife, dust with cinnamon or sulfur, callus 24 hrs before repotting.\n• Up-pot to 5–6\" — ZZ likes to be slightly rhizome-bound, so don't overshoot to 7\"+ or you'll invite root rot.\n• Use 75% standard potting mix + 25% perlite. Do NOT use cactus mix — too draining for this plant.\n• Save any snapped-off rhizome chunks — each intact chunk with an eye/growth point will PROPAGATE into a new plant (see propagation tip below).\n• No water for 7–10 days after repot to let any handled/nicked rhizome tissue fully callus.",
      summary: "Pot is stretching → rhizomes are pressed against the walls → repot immediately. Cut the nursery pot open if needed to protect the rhizomes; up-pot ONE size only (5–6\", not larger) with standard mix + 25% perlite. Save any snapped rhizome pieces — they're free propagation stock.",
      alternatives: [
        "Ceramic 5–6\" (best — heavier, prevents tipping from the top-heavy stems)",
        "Terracotta 5–6\" (works — extra evaporation is fine for ZZ)",
        "Sturdy plastic 5–6\" nursery pot (fine, but pick THICK-walled — you don't want the same stretching problem in a year)"
      ]
    },
    conditions: {
      light:        { ideal: "Bright indirect light (grows fastest)",           passing: "Medium to low indirect; the classic 'office corner' plant" },
      temperature:  { ideal: "65–85°F (18–29°C)",                                passing: "60–90°F; do NOT let temperatures drop below 60°F for extended periods" },
      humidity:     { ideal: "40–60% (average indoor)",                          passing: "Tolerates 20–70%; happy in dry indoor air" },
      soilMoisture: { ideal: "Dry between waterings — top 2\" bone dry",        passing: "Drought tolerant for weeks to months" }
    },
    tips: {
      lighting: "Genuinely tolerates a huge light range — from bright indirect (fastest growth) all the way down to a dim office corner (slow but survives).\n\n• Bright indirect = fastest growth; new leaflets emerge more often.\n• Medium indirect = fine, growth slows.\n• Low indirect = the plant lives, but growth is basically zero.\n• AVOID direct sun (especially afternoon) — will scorch the glossy leaflets to yellow/brown.\n• A north-facing window is ideal. East is also great.\n• Rotate 1/4 turn monthly — ZZ grows slowly enough that weekly rotation isn't needed.\n\n• In this home, 1F Living Room window (36° NE) and 2F Room 2 (set back from the late NW beam) are flexible safe matches. The urgent-repot blocker is done.",
      soil: "Standard well-draining potting mix. 75/25 potting + perlite is ideal.\n\n• Do NOT use cactus mix — too gritty; the rhizomes struggle in it.\n• Do NOT use pure peat/coir — too moisture-retentive; root rot risk.\n• Neutral pH.\n• Ceramic pot preferred for stability — mature ZZ plants get top-heavy.\n• Repot every 2–3 years or when rhizomes crack the pot.",
      watering: "METHOD — strict dry-between, err dry: Zamioculcas zamiifolia stores water in potato-like rhizomes — overwatering is the FASTEST way to kill it (per Clemson HGIC and The Spruce).\n\nHOW TO CHECK READINESS (your 5\" pot, Aug 2026 repot):\n• Finger test: top 2\" bone dry = check deeper; if ANY moisture below, wait.\n• Pot weight: 5\" pot feels hollow-light = likely ready. Amended mix dries faster than the old nursery peat.\n• Moisture meter: 1–2 throughout = water; 3+ = wait.\n• Plant tells: wrinkled stems = rare underwatering. Yellow leaflets + wet soil = OVERWATERING (99% of cases per Clemson).\n\n⚠️ POST-REPOT: if rhizomes were nicked, no water 7–10 days so tissue can callus (then resume). Fresh mix + a slightly larger pot is still a rot risk if you water on the old 'peat always wet' fear in reverse — wait for a dry stick.\n\nCENTRAL TEXAS CADENCE (Pflugerville, indoor AC ~30–45% RH):\n• Hot AC season (Apr–Oct): every 16–18 days in the 5\" amended mix.\n• Peak summer (Jun–Sep): every 16 days; check finger depth, not calendar alone.\n• Mild winter (Nov–Feb): every 30–32 days — once a month is often plenty.\n• Drench thoroughly, drain saucer immediately; never leave standing water.\n• When in doubt, DON'T water (per The Spruce).\n\nOVER- vs UNDER-watering tells:\n• Over: yellow leaflets, mushy rhizomes, sour soil, fungus gnats, leaflets falling en masse.\n• Under: wrinkled/curling stems (rare), rhizomes slightly soft but not mushy.",
      pruning: "Minimal.\n\n• Cut yellowing/damaged stems at the base with sterile shears (any partial cut on a stem just makes the whole stem die back).\n• Do not remove healthy stems for shape — new growth is very slow.\n• Wipe leaflets with a damp cloth every 4–6 weeks to remove dust — a lot of the leaflets means dust builds up fast.",
      propagation: "Two methods — both work, both SLOW (months).\n\n• LEAF PROP: Pluck a single leaflet from a mature stem; let it callus 1–2 days; press the cut end into damp potting mix. In 6–12 months a small rhizome forms; then a shoot appears. Slow but reliable.\n• DIVISION: Un-pot the whole plant in spring; gently pull apart the rhizome cluster; each chunk with 2+ stems and its own rhizome becomes a new plant. Fastest way to get a new mature-looking plant.\n• Water propagation of stem cuttings works too but takes 3–6 months for roots.\n• Success rate: 80% for both — patience is the limiting factor.",
      repotting: "Every 2–3 years only.\n\n• Signs it's time: rhizomes visible at soil surface, plastic pot bulging/cracking/STRETCHING, plant top-heavy. The pot-stretch signal is what happened to this plant on 2026-07-20 — do NOT try to squeeze more time out of a stretched pot; the rhizomes are physically constrained.\n• Spring/early summer preferred BUT if the pot is already deformed, repot immediately in any season — ZZ's rhizome water storage makes off-season repotting low-risk.\n• Up-pot by 1–2 inches ONLY — ZZ likes to be slightly rhizome-bound; jumping 3+ inches invites root rot.\n• If rhizomes won't slide out of a deformed plastic pot: CUT the pot open with sturdy scissors. Snapping a rhizome is worse than sacrificing the pot.\n• Standard mix + 25% perlite.\n• Ceramic pot for stability (top-heavy stems tip a lightweight plastic pot).\n• No water for 5–7 days after (7–10 days if any rhizomes were nicked or trimmed).",
      feeding: "Very light feeder — the rhizome makes ZZ almost indifferent to fertilizer.\n\n• Balanced houseplant fertilizer at 1/2 strength once in mid-spring and once in mid-summer.\n• Skip fall/winter.\n• Overfeeding causes leaflet brown-out — a lot of first-time ZZ growers do this.",
      troubleshooting: "• Yellowing leaflets → OVERWATERING (99% of cases per Clemson HGIC). Cut back immediately; check rhizomes for rot — especially while pot is stretching and rhizomes are cramped.\n• Mushy/soft rhizomes (potato-like turned dark/mushy) → root rot from overwatering in peat nursery mix. Unpot, trim mushy tissue with sterile knife, dust with cinnamon, let callus 24 hrs, repot to 75/25 mix in 5–6\" pot.\n• Curling/wrinkled stems → severe underwatering (much rarer). Water thoroughly once.\n• Brown leaflet tips → fluoride/chlorine in Central Texas tap water (per IFAS); use filtered or let tap sit 24 hrs.\n• Leaflets falling off en masse → cold shock (<60°F extended) or severe overwatering.\n• Etiolation (long gaps between leaflets, thin stems) → low light; move to brighter indirect — 1F Window or 2F Room 1 NW.\n• Black spots on stems → NORMAL natural pigment — not a disease.\n• Slow/no growth → normal for ZZ; 6–12 inches/year even in perfect conditions.\n• Plant tipping over → top-heavy + stretched pot; repot urgently to heavier ceramic 5–6\".\n• Mealybugs (rare, cottony clusters) → alcohol swab; inspect stem bases.\n• Spider mites (fine webs, rare) → rinse leaflets; insecticidal soap.\n• Fungus gnats → surface too wet in peat mix; let dry fully, sticky traps; repot to amended mix.\n• Scale (bumps on stems) → scrape, alcohol, horticultural oil.\n• ⚠️ Toxic per ASPCA — all parts contain calcium oxalate crystals; causes drooling, vomiting, oral/skin irritation. Wash hands after handling. Keep away from pets and children."
    },
    sources: [
      { label: "Missouri Botanical Garden — Zamioculcas zamiifolia", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276468" },
      { label: "Clemson HGIC — ZZ Plant care guide", url: "https://hgic.clemson.edu/factsheet/zz-plant-zamioculcas-zamiifolia-indoor-care-growing-tips-plant-guide/" },
      { label: "University of Florida IFAS — ZZ Plant", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/zz-plant.html" },
      { label: "NC State Extension — Zamioculcas zamiifolia", url: "https://plants.ces.ncsu.edu/plants/zamioculcas-zamiifolia/" },
      { label: "ASPCA — ZZ Plant toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/zz-plant" },
      { label: "The Spruce — ZZ Plant Care Guide", url: "https://www.thespruce.com/zz-zanzibar-gem-plant-profile-4796783" },
      { label: "Clemson HGIC — Indoor Plants: Transplanting & Repotting", url: "https://hgic.clemson.edu/factsheet/indoor-plants-transplanting-repotting/" }
    ]
  },

  desert_rose: {
    id: "desert_rose",
    repotSigns: [
      "Caudex (fat swollen base) has stopped growing year over year even in growing season",
      "Flower production drops each year despite good light",
      "New branch tips emerge thinner/spindlier than mature ones",
      "Roots visible out of the 4\" nursery pot drainage",
      "⚠️ Caudex feels SOFT/SPONGY to the touch — rot risk, act immediately; not just a repot signal",
      "Water drains through in <5 seconds — no absorbency"
    ],
    displayName: "Desert Rose",
    potSize: '5"',
    repotted: true,
    category: "succulent",
    names: {
      common: ["Desert Rose", "Mock Azalea", "Impala Lily", "Sabi Star"],
      scientific: "Adenium obesum"
    },
    wateringDays: 8,
    wateringDaysHot: 6,
    wateringDaysCool: 45,
    currentSoilMix: "cactus_mix",
    comments: "✅ Aug 2026: moved OUTDOORS on the same 301° NW exposure as 2F Room 2 (late-afternoon/evening summer sun), still in the Jul 2026 5\" mineral-mix pot. UF/IFAS (EP474): Adenium needs 6+ hours bright light to flower, irrigate regularly WITH drainage in summer, and is a deck/patio plant that MUST come inside for winter — not freeze-tolerant; Pflugerville is zone 8b/9a. NW patio gives fewer direct hours than 2F SW, so blooms may be modest, but outdoor DLI still beats any indoor window. Dump saucers after storms. ⚠️ HIGHLY TOXIC sap (cardiac glycosides) — keep off Moose's path. Winter: leaves drop, look 'dead', water almost never.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Now in a heavily mineral cactus blend (out of the nursery peat, the #1 killer of Desert Rose in cool/humid winters — the caudex rots from the base up). Keep the caudex base dry and never let it sit wet.",
    repotSuggestion: {
      urgency: "soon",
      targetPotSize: '5"',
      targetSoilType: "cactus_mix",
      timing: "Within 4–6 weeks (only in growing season — spring/summer; NEVER in winter dormancy)",
      technique: "• Water 4–5 days before repotting (needs a good soak first, but must be dry-ish on repot day).\n• Wear gloves — the milky sap is TOXIC and skin-irritating.\n• Bare-root gently; nursery peat should shake off.\n• Inspect the caudex (fat trunk base) for soft spots or dark discoloration — this is the #1 disease site.\n• Consider planting the caudex slightly RAISED above soil level for a more sculptural bonsai-like look (this is a stylistic choice; below-soil is also fine).\n• Use a MINERAL-HEAVY cactus mix: 1 part cactus mix + 1 part pumice + 1 part perlite (or coarse sand).\n• Top-dress with 1/2\" fine gravel to keep the caudex base dry.\n• Terracotta pot strongly preferred.\n• NO water for 10 days after repotting to let any nicked roots callus.",
      summary: "Up-pot 1 inch + very mineral mix in terracotta, ideally raising the caudex slightly above soil. Wear gloves — sap is toxic. This is the highest-risk repot in this batch because Desert Rose is uniquely rot-prone.",
      alternatives: [
        "Terracotta 5\" (best — wicks moisture, breathes)",
        "Bonsai pot 5\" (great for showing off the caudex — needs excellent drainage)",
        "Ceramic 5\" with LARGE drainage hole (fine, but water much less often)"
      ]
    },
    conditions: {
      light:        { ideal: "Full direct sun 6+ hrs daily",                             passing: "Bright indirect + 3–4 hrs direct sun (fewer flowers, elongated growth)" },
      temperature:  { ideal: "75–95°F growing season; 55–65°F for winter dormancy",     passing: "50°F absolute minimum; die at frost" },
      humidity:     { ideal: "30–50%",                                                    passing: "Low humidity fine; avoid chronic >60%" },
      soilMoisture: { ideal: "Dry between waterings (growing season); DRY for months (dormancy)", passing: "Drought tolerant year-round; sensitive to wet soil" }
    },
    tips: {
      lighting: "FULL SUN is non-negotiable for flowering and to prevent the plant from stretching leggy.\n\n• CURRENT (Aug 2026): outdoors, 301° NW (same direction as 2F Room 2). UF/IFAS: 6+ hours bright light to maintain summer flowering. NW late-day sun is less total hours than a south/west patio — better than indoor, maybe not bloom-max.\n• If you want more flowers, a summer afternoon on the 2F SW side (215°) is stronger; NW is the milder, slightly safer heat load.\n• Acclimate 7–14 days if it just left indoor AC — even desert plants sunburn on a sudden move.\n• Bring the container in before nights ~50°F (UF/IFAS: chill causes leaf yellow/drop; freeze kills). Typical Pflugerville first-frost window is mid-November — don't wait for frost.\n• Winter indoor home: 2F Living Room SW, then nearly dry until spring.\n• Grow light supplement: 12–14 hrs if you overwinter in a dimmer room.",
      soil: "EXTREMELY mineral-heavy. This is the single most important care factor.\n\n• 1 part cactus mix + 1 part pumice + 1 part perlite (or coarse sand). NO peat-heavy mixes.\n• Terracotta pot strongly preferred.\n• Top-dress with fine gravel around the caudex to keep the base dry.\n• Slightly acidic to neutral pH (6.0–7.0).\n• Repot every 2 years while young, less often as it matures.",
      watering: "METHOD — seasonal soak-and-dry discipline is the #1 care skill: Adenium obesum caudex stores water; overwatering in dormancy kills 90% of beginner plants (per NC State Extension and ASPCA toxicity notes on caudiciform rot risk).\n\nHOW TO CHECK READINESS (your 5\" pot, mineral cactus mix, NOW OUTDOORS NW):\n• Caudex test: firm, full, smooth = fine; soft/spongy or wrinkled = investigate (underwater OR rot).\n• Pot weight: light 5\" pot = ready in growing season. Outdoor heat/wind dries it faster than indoor AC.\n• Skewer to bottom — bone dry throughout before watering.\n• After thunderstorms: empty the saucer the same day. UF/IFAS: irrigate regularly but provide drainage — sitting wet rots the caudex.\n\nCENTRAL TEXAS CADENCE:\n• Outdoor peak summer (current): every 5–7 days in 100°F weather, still only when the mix is dry. Check twice a week; don't calendar-water through a rainy week.\n• Indoor growing season (when you bring it in): every 10–12 days in 2F LR SW.\n• ⚠️ WINTER DORMANCY (Nov–Feb, indoors): NEAR-ZERO WATER. When leaves drop, do NOT water on a calendar. One or two light drinks the ENTIRE winter ONLY if caudex starts to soften/wrinkle (not mushy).\n• Grow lights through winter short days if keeping in bright cool spot.\n\nTECHNIQUE:\n• Soak until runoff, empty saucer within 15 min.\n• Keep caudex base dry — gravel top-dress helps.\n• Terracotta + mineral mix strongly preferred.\n• Wear gloves — caustic/cardiac-glycoside sap (per ASPCA).\n• When in doubt during dormancy, DON'T water.",
      pruning: "Prune in spring only, wearing GLOVES (toxic sap).\n\n• Prune back leggy stems to shape.\n• Removing branch tips forces multi-branching — a great way to encourage more flowers.\n• Cuttings root but produce plants without the swollen caudex (the caudex only forms from seed-grown plants).\n• Never prune during winter dormancy.\n• Clean tools with alcohol between cuts.",
      propagation: "Two paths, very different results.\n\n• SEEDS (best): Produces the classic swollen caudex — the whole point of Desert Rose. Sow fresh seed on damp cactus mix in spring; germinates in 1–2 weeks. Takes 3–5 years to bloom.\n• CUTTINGS: Faster to flower but produces plants WITHOUT the caudex — they look like ordinary shrubs. Take 5–6 inch cuttings in spring; let callus 5–7 days; plant in dry cactus mix; light mist after 2 weeks; roots in 4–6 weeks. Success rate ~70%.",
      repotting: "Every 2–3 years while young, every 3–5 years for mature plants.\n\n• Spring only — never fall or winter.\n• Up-pot by 1 inch.\n• Wear GLOVES.\n• Very mineral mix.\n• Consider raising the caudex slightly above soil for a bonsai-like effect.\n• No water for 10 days after.",
      feeding: "Moderate feeder in growing season.\n\n• Balanced flower-boost fertilizer (higher phosphorus, e.g., 10-30-20) at 1/2 strength once every 3–4 weeks in spring and summer.\n• Absolutely no feeding fall/winter — pushes weak growth and breaks dormancy.",
      troubleshooting: "SYMPTOM → CAUSE → FIX:\n\n• Soft/mushy/spongy caudex → CAUDEX ROT from overwatering (HIGHEST-RISK symptom — often during winter dormancy). Almost always fatal; cut any healthy top section as cutting; discard rotted caudex.\n• Leaves yellow and dropping in fall → NORMAL dormancy trigger (per Missouri Botanical Garden). STOP watering — do not panic.\n• Leggy elongated growth → LOW LIGHT. Move to 2F LR SW per PLANT_LIGHT_REF; prune back in spring wearing gloves.\n• Wrinkled caudex (firm, not mushy) → UNDERWATERING (rare). One light soak; should plump within a week.\n• Wrinkled caudex that stays soft after watering → ROOT ROT below caudex. Unpot, inspect; often fatal.\n• No flowers → insufficient direct sun, plant too young (3+ yrs from seed), or nitrogen-heavy feeding — switch to bloom booster.\n• Sunscald on leaves → sudden move to intense SW sun without acclimation. Gradual exposure over 2 weeks.\n• Aphids on new growth/flower buds → water spray or insecticidal soap.\n• Spider mites in dry AC air → rinse leaves; slight humidity bump OK briefly.\n• Mealybugs → alcohol Q-tip on visible clusters.\n• Sap on skin → wash immediately with soap and water (per ASPCA); caustic/cardiac-glycoside sap.\n• ⚠️ HIGHLY TOXIC per ASPCA — all parts contain cardiac glycosides; vomiting, diarrhea, irregular heartbeat, death possible. Keep away from pets and children; wear gloves when pruning."
    },
    sources: [
      { label: "ASPCA — Desert Rose (highly toxic)", url: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/desert-rose" },
      { label: "NC State Extension — Adenium obesum (toxicity)", url: "https://plants.ces.ncsu.edu/plants/adenium-obesum/" },
      { label: "Missouri Botanical Garden — Adenium obesum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276116" },
      { label: "University of Florida IFAS — Adenium", url: "https://edis.ifas.ufl.edu/publication/EP111" },
      { label: "UF/IFAS EP474 — Florida Foliage House Plant Care: Adenium obesum", url: "https://edis.ifas.ufl.edu/publication/EP474" },
      { label: "RHS — Cacti & Succulents growing guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" },
      { label: "Missouri Botanical Garden — Cacti & Succulents fact sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" }
    ]
  },

  /* ============= CLOSED GLASS TERRARIUMS =============
   * Two identical sealed-glass terrariums purchased pre-planted from Home
   * Depot. Each contains 3 species: confirmed Fittonia + confirmed Selaginella
   * spike moss + one unidentified "fern-like" plant (most likely Lemon Button
   * Fern, Hypoestes Polka Dot, Pilea Aluminum Plant, or Asparagus Lace Fern).
   * Both have a cork-top cap so the ecosystem is essentially closed — humidity
   * recycles via transpiration → condensation → drip-back, which means
   * watering needs are 5–10× LOWER than the same plants in open pots.
   *
   * Care is identical between the two; they're stored as separate IDs so each
   * can have its own watering log + snooze independently. */
  terrarium_a: {
    id: "terrarium_a",
    repotSigns: [
      "Root circling clearly visible through the GLASS side of the jar (dark tangled mass at the bottom)",
      "Fittonia has visibly outgrown its planted position — leaves touching the glass walls persistently",
      "The Spike Moss has climbed the glass wall in a thick mat (root mass below has probably matched)",
      "Condensation cycle changes: less morning dew because roots aren't drinking fast enough (or too much because a plant died and stopped absorbing)",
      "Any plant leaning against the glass and staying that way (support has failed = root anchor lost)",
      "Any patch of BLACK moldy growth on the soil surface (breakdown of the substrate under the closed environment)"
    ],
    displayName: "Terrarium A",
    potSize: "Glass jar w/ cork top",
    category: "tropical",
    composition: "Fittonia + Spike Moss + 1 unidentified",
    names: {
      common: [
        "Closed Glass Terrarium (Home Depot pre-planted, cork-top)",
        "Confirmed contents: Fittonia (Nerve Plant) × ~1",
        "Confirmed contents: Selaginella (Spike Moss / a clubmoss often mistaken for a fern) × ~1",
        "Likely 3rd species (TBD by photo ID): Lemon Button Fern (Nephrolepis cordifolia 'Duffii') OR Polka Dot Plant (Hypoestes phyllostachya) OR Aluminum Plant (Pilea cadierei) OR Lace Fern (Asparagus setaceus)"
      ],
      scientific: "Mixed planting in sealed glass container. Confirmed: Fittonia albivenis + Selaginella sp. (kraussiana or martensii are the typical retail species). 3rd species pending photo ID."
    },
    /* Closed-terrarium intervals — humidity is self-sustaining via condensation,
     * so the substrate stays moist for weeks. Only water when (a) the soil
     * surface looks dry AND (b) NO condensation forms on the glass during a
     * normal day. Heavy fog/condensation means too wet, not time to water. */
    wateringDays: 45,
    wateringDaysHot: 35,
    wateringDaysCool: 75,
    currentSoilMix: "terrarium_mix",
    comments: "One of two identical Home Depot closed terrariums. Confirmed plants: Fittonia (network-veined leaves) + Selaginella spike moss (the 'fairy moss' look — NOT actually a fern, despite appearances). 3rd species in the mix is unidentified — snap a close-up of each leaf type and we can ID it. CRITICAL: closed-terrarium care is RADICALLY different from open-pot care. The sealed glass + cork top creates a self-sustaining humid microclimate (80–95% RH). Watering needs are 5–10× lower than the same plants in open pots — most properly-sealed terrariums go 4–8 weeks between waterings.",
    idealSoil: ["terrarium_mix"],
    soilNotes: "Pre-built 4-layer substrate from Home Depot: drainage gravel (bottom) → activated charcoal → sphagnum separator → peat-based growing media (top, often with a moss top-dressing). DO NOT disturb unless you see chronic mold/algae problems. If you ever rebuild: keep the layered structure intact and use sterilized media to avoid introducing pests into the sealed environment.",
    conditions: {
      light:        { ideal: "Bright INDIRECT light only (3–6 ft from an east window, or filtered through sheer curtain)", passing: "Medium indirect; algae growth on glass means too much light, leggy stretched stems means too little" },
      temperature:  { ideal: "65–80°F (18–27°C); avoid placement near vents or windows that get cold",                     passing: "60–85°F; sustained above 90°F cooks the closed environment within hours" },
      humidity:     { ideal: "Self-sustaining at 80–95% RH inside the jar (no external humidifier needed)",               passing: "If condensation never forms inside, the terrarium is too dry — add 1 tsp water" },
      soilMoisture: { ideal: "Surface looks moist but not waterlogged. Light condensation on upper glass in the morning that clears by afternoon is the PERFECT signal.", passing: "Persistent foggy/dripping condensation = too wet (vent the cork for 2–4 hrs). Bone-dry surface for >7 days = water lightly." }
    },
    tips: {
      lighting: "Bright INDIRECT only — this is the #1 thing that kills retail terrariums.\n\n• ⚠️ NEVER place in direct sun, even for 30 minutes. Glass magnifies sunlight onto the closed soil → temperature spikes to 100°F+ in <15 minutes → all three species cook simultaneously. This is irreversible.\n• Best spot in this home: 1F Living Room window (36° NE, soft bright indirect + gentle AM sun) per PLANT_LIGHT_REF — safest scorch-free foliage; terrariums live here.\n• Diagnostic: algae on glass = too much light (move 2 ft farther). Stretched/leggy stems = too little (move 1 ft closer or add small grow light, 4–6 hrs/day per The Spruce).\n• ROTATE the jar a quarter-turn every 1–2 weeks for even growth.",
      soil: "Pre-built 4-layer substrate. From bottom to top:\n  1. ~1\" drainage gravel/pebbles\n  2. ~½\" activated horticultural charcoal (keeps things fresh, prevents stink)\n  3. Thin sphagnum-moss separator (stops soil from migrating into the drainage layer)\n  4. Peat-based growing media (often topped with preserved moss for aesthetics)\n\nDO NOT add fertilizer to this substrate — closed terrariums grow VERY slowly by design (extra nutrients → wild growth → overfills the jar in months → impossible to maintain).",
      watering: "METHOD — sealed micro-climate (NOT potted watering): This Home Depot closed jar with cork top maintains 80–95% RH via its own condensation cycle. Per Missouri Botanical Garden and The Spruce, resist the urge to water on a calendar — read the glass instead.\n\nTHE CONDENSATION TEST (your primary tool):\n• Light morning fog on upper glass that clears by afternoon = PERFECT. Do nothing.\n• Heavy persistent fog / water dripping down glass = TOO WET. Crack cork 2–4 hrs to vent. NO water.\n• ZERO condensation for 7+ days AND soil surface looks dry = time to add water.\n\nWHEN YOU DO ADD WATER:\n• Literally 1–2 TEASPOONS distilled/filtered/rain water at a time (NEVER tap — chlorine/fluoride poison Fittonia and Selaginella per Costa Farms).\n• Pipette, syringe, or squeeze bottle for precision.\n• Water around soil edges, NOT on plant crowns.\n• Wait a full week before adding more — moisture redistributes inside the sealed system.\n\nCENTRAL TEXAS CADENCE (Pflugerville — indoor AC does NOT affect sealed jar humidity):\n• Hot season (Apr–Oct): roughly every 5–7 weeks IF condensation test says dry — Central Texas summers can increase evaporation inside glass near windows; watch condensation, not calendar.\n• Peak summer (Jun–Sep): check weekly for fog pattern; vent if persistent heavy fog (AC + window warmth can overheat jar if too close to glass).\n• Cool season (Nov–Feb): every 10–11 weeks typical — plants grow slowly in sealed environment.\n• Rarely open the lid except to vent, prune, or add water.\n\nOVER- vs UNDER-watering tells:\n• Over: constant fog, dripping glass, white/green mold on soil, black melted Fittonia leaves, plants rotting at base — vent 4–8 hrs daily until AM-only fog returns.\n• Under: no condensation 7+ days, soil surface pale/dry, Fittonia wilting inside jar — 1 tsp water at edge, reseal, wait 48 hrs.",
      pruning: "Closed terrariums grow slowly but eventually crowd the jar.\n\n• Fittonia: pinch back leggy stems with sterilized scissors every 4–8 weeks during warm months. Remove any blackened/melted leaves IMMEDIATELY — they spread rot in a sealed environment.\n• Selaginella: trim runners that hit the glass. Remove any browning fronds.\n• 3rd species: similar — keep below ⅔ of the jar's interior height.\n• ALWAYS sterilize scissors with isopropyl alcohol between cuts (one infected leaf can crash a closed terrarium in days).\n• Use long tweezers or chopsticks to remove debris through the cork opening.",
      propagation: "Closed terrariums actively self-propagate via stem cuttings making contact with the moist substrate.\n\n• Fittonia: snap off a 2-leaf node, tuck it into the soil — roots in 2–3 weeks.\n• Selaginella: any piece of stem touching damp soil will sprout new growth.\n• If you want to grow a NEW terrarium, take cuttings from this one (sterilized tools!), root them in a covered tray for 2 weeks, then place into a new layered substrate.\n• NEVER bring outside plants into the closed environment — pest contamination is impossible to control once introduced.",
      repotting: "Closed terrariums are designed to NOT be repotted. The layered substrate is the whole point.\n\n• 1-year refresh: replace just the TOP ½\" of growing media if the existing soil starts to compact or smell. Use sterilized peat-based mix.\n• 2–3 year rebuild: full teardown. Remove plants, wash the glass with diluted hydrogen peroxide (kills algae spores), rebuild the 4-layer stack, sterilize everything, replant with cuttings.\n• Cork top: replace if it gets moldy or starts to crumble — readily available on Amazon in the standard 'demijohn' sizes.",
      feeding: "DO NOT routinely fertilize a closed terrarium. The whole design philosophy is slow, balanced growth.\n\n• If you must feed: 1/10 strength balanced liquid fertilizer (e.g., 0.5 ml of standard fertilizer in 1 cup of water, use 1 tsp of that) ONCE every 6–12 months MAX.\n• Stop entirely from October–February (winter rest).\n• Symptoms of overfeeding in a closed terrarium are immediate and brutal: rapid leggy stretching, leaf burn at the tips, then algae bloom that coats the glass within weeks.",
      troubleshooting: "CLOSED-TERRARIUM SYMPTOM → CAUSE → FIX:\n\n• Foggy glass that NEVER clears → TOO MUCH WATER (#1 mistake per The Spruce). Crack cork 4–8 hrs; repeat daily until normal AM-only fog returns.\n• ZERO condensation for 7+ days → too dry. Add 1–2 tsp distilled water at soil edge; reseal.\n• No fog at all after initial setup → lid seal may be loose OR jar too dry — check cork fit, add 1 tsp water.\n• White/green fuzz on soil → mold from over-saturation or organic debris. Remove with tweezers, dust with cinnamon (natural antifungal), vent 24 hrs.\n• Black/melted Fittonia leaves → bacterial rot from chronic over-wetness. Remove ALL affected tissue with sterilized scissors immediately; vent 48 hrs; reduce future watering.\n• Algae coating glass interior → too much light (even indirect can be too strong if jar sits on windowsill). Move 2 ft farther from 1F Window NE exposure; wipe interior with lint-free cloth via tweezers.\n• Condensation too high / water pooling at bottom → overwatered or poor drainage layer — vent until glass clears; never add water until cycle normalizes.\n• Stretched / leggy plants reaching glass → too little light. Move closer to 1F Window (still indirect!) or add LED grow light 4–6 hrs/day.\n• Plants rotting at base / stems mushy → overwater + poor airflow. Vent, remove rotted parts, may need top ½\" substrate refresh.\n• Tiny flying insects → fungus gnats from original substrate. Small sticky trap inside jar, vent 24 hrs, reduce moisture — usually self-resolves in 2–3 weeks.\n• Fittonia dramatic wilt inside jar → usually overwater rot OR extreme dry — read condensation first.\n• Selaginella browning fronds → too dry (no fog) OR too wet (black rot) — condensation test resolves which.\n• Jar overheating / steamed appearance mid-afternoon → moved into direct sun or too close to hot window — relocate immediately to 1F Window indirect zone.\n• ✅ Fittonia is non-toxic to pets per ASPCA. Selaginella and unidentified 3rd species toxicity varies — treat as potentially harmful until ID confirmed; keep sealed jar out of pet reach."
    },
    sources: [
      { label: "Missouri Botanical Garden — Closed Terrarium Care", url: "https://www.missouribotanicalgarden.org/gardens-gardening/your-garden/help-for-the-home-gardener/advice-tips-resources/visual-guides/terrariums" },
      { label: "Royal Horticultural Society — Terrariums", url: "https://www.rhs.org.uk/plants/types/houseplants/terrariums" },
      { label: "Smithsonian Gardens — Building a Terrarium", url: "https://gardens.si.edu/learn/blog/building-a-terrarium/" },
      { label: "NCSU Extension — Terrarium Maintenance", url: "https://content.ces.ncsu.edu/extension-gardener-handbook/18-houseplants" },
      { label: "University of Vermont Extension — Terrarium Plants", url: "https://www.uvm.edu/extension/mastergardener/terrarium-gardens" },
      { label: "American Fern Society — Selaginella vs. true ferns", url: "https://amerfernsoc.org/" },
      { label: "Costa Farms — Fittonia (Nerve Plant) Care", url: "https://costafarms.com/plants/fittonia-nerve-plant" },
      { label: "The Spruce — Terrarium Care Mistakes", url: "https://www.thespruce.com/common-terrarium-mistakes-847861" }
    ]
  },

  terrarium_b: {
    id: "terrarium_b",
    repotSigns: [
      "Root circling clearly visible through the GLASS side of the jar",
      "Fittonia leaves persistently touching the glass walls (outgrew its niche)",
      "Spike Moss climbed the glass in a thick mat",
      "Condensation cycle shifts noticeably from Terrarium A's cycle (indicates the two ecosystems have diverged — often a root/soil-exhaustion signal)",
      "Any plant leaning permanently against the glass",
      "Black moldy patches on the substrate surface"
    ],
    displayName: "Terrarium B",
    potSize: "Glass jar w/ cork top",
    category: "tropical",
    composition: "Fittonia + Spike Moss + 1 unidentified",
    names: {
      common: [
        "Closed Glass Terrarium (Home Depot pre-planted, cork-top) — second of two",
        "Confirmed contents: Fittonia (Nerve Plant) × ~1",
        "Confirmed contents: Selaginella (Spike Moss) × ~1",
        "Likely 3rd species (TBD by photo ID): same as Terrarium A"
      ],
      scientific: "Mixed planting in sealed glass container — identical to Terrarium A. Fittonia albivenis + Selaginella sp. + 1 unidentified."
    },
    wateringDays: 45,
    wateringDaysHot: 35,
    wateringDaysCool: 75,
    currentSoilMix: "terrarium_mix",
    comments: "Second of two identical Home Depot closed terrariums (see Terrarium A for the first). Care is identical to A; this entry exists so the watering log + snooze can be tracked independently — useful because slight differences in placement, lid seal, or initial moisture mean the two won't water on the exact same schedule.",
    idealSoil: ["terrarium_mix"],
    soilNotes: "Same 4-layer pre-built substrate as Terrarium A (gravel → charcoal → sphagnum separator → peat-based media + moss top). See Terrarium A's notes for refresh/rebuild details.",
    conditions: {
      light:        { ideal: "Bright INDIRECT light only (3–6 ft from an east window, or filtered through sheer curtain)", passing: "Medium indirect; algae growth on glass means too much light, leggy stretched stems means too little" },
      temperature:  { ideal: "65–80°F (18–27°C); avoid placement near vents or windows that get cold",                     passing: "60–85°F; sustained above 90°F cooks the closed environment within hours" },
      humidity:     { ideal: "Self-sustaining at 80–95% RH inside the jar (no external humidifier needed)",               passing: "If condensation never forms inside, the terrarium is too dry — add 1 tsp water" },
      soilMoisture: { ideal: "Surface looks moist but not waterlogged. Light condensation on upper glass in the morning that clears by afternoon is the PERFECT signal.", passing: "Persistent foggy/dripping condensation = too wet (vent the cork for 2–4 hrs). Bone-dry surface for >7 days = water lightly." }
    },
    tips: {
      lighting: "Bright INDIRECT only — never direct sun (glass magnifies → 100°F+ inside in <15 min → cook). Rotate quarterly for even growth.\n\n• Best spot in this home: 1F Living Room window (36° NE) or a NW room with bright indirect per PLANT_LIGHT_REF — no direct sun on the glass.\n• If placed beside Terrarium A, check whether B gets slightly more or less light — the brighter twin needs water ~20% more often. Track separately in this app!",
      soil: "Identical 4-layer substrate to Terrarium A. See A's notes for the rebuild protocol.",
      watering: "METHOD — sealed micro-climate (NOT potted watering): Identical Home Depot closed jar — 80–95% self-sustaining humidity. Per Missouri Botanical Garden and The Spruce, read condensation, never the calendar.\n\nTHE CONDENSATION TEST:\n• Light AM fog clearing by afternoon → PERFECT. Do nothing.\n• Heavy persistent fog / dripping → TOO WET. Vent cork 2–4 hrs. NO water.\n• Zero condensation 7+ days + dry soil surface → add 1–2 tsp distilled/filtered water at edge.\n\nCENTRAL TEXAS CADENCE (Pflugerville):\n• Hot season (Apr–Oct): ~every 5–7 weeks IF dry by condensation test.\n• Peak summer (Jun–Sep): watch for overheating if jar sits on warm windowsill — vent if steamed appearance mid-afternoon.\n• Cool season (Nov–Feb): ~every 10–11 weeks typical.\n\n💡 TWO-TERRARIUM TIP: log each jar separately — easy to double-water B after watering A; over-watering causes rot in days.\n\nOVER- vs UNDER-watering tells:\n• Over: never-clearing fog, mold, black Fittonia, rotting stems — vent daily until AM-only fog.\n• Under: no fog 7+ days, wilted Fittonia, pale dry soil — 1 tsp water, reseal.",
      pruning: "Same as Terrarium A — pinch leggy Fittonia stems every 4–8 weeks warm-season, trim Selaginella runners that hit the glass, remove any black/melted leaves IMMEDIATELY with sterilized scissors.",
      propagation: "Same as Terrarium A. ⚠️ EXTRA WARNING: don't cross-propagate between the two terrariums unless you're 100% sure both are pest- and pathogen-free — a contamination in one can spread to the other and you lose both.",
      repotting: "Same as Terrarium A. Both should be refreshed/rebuilt on roughly the same schedule (1-year top-refresh, 2–3-year full rebuild).",
      feeding: "Same as Terrarium A — essentially none, 1/10 strength every 6–12 months MAX, never in winter.",
      troubleshooting: "Same closed-terrarium issues as Terrarium A — use the working twin as your control:\n\n• Foggy glass never clears → overwatered. Vent cork 4–8 hrs daily until AM-only fog (per The Spruce).\n• Zero condensation 7+ days → too dry. Add 1–2 tsp distilled water.\n• White/green mold on soil → over-saturation. Tweezer removal + cinnamon dust + vent 24 hrs.\n• Black melted Fittonia → rot from chronic wetness. Sterilized trim + vent 48 hrs.\n• Algae on glass → too much light. Move farther from window; wipe interior.\n• Leggy stretching → too little light. Closer to 1F Window (indirect) or grow light 4–6 hrs.\n• Condensation too high / pooling → vent until normal; do not add water.\n• Plants rotting at base → overwater + stagnant air. Vent, remove affected tissue.\n• Fungus gnats → sticky trap inside, vent 24 hrs, reduce moisture.\n• A healthy but B struggling (or vice versa) → compare placement, light, and watering log — difference usually reveals cause.\n• Jar overheating → direct sun or hot windowsill — relocate to 1F Window indirect zone immediately.\n• ✅ Fittonia non-toxic per ASPCA. Treat unidentified 3rd species as potentially harmful until ID confirmed."
    },
    sources: [
      { label: "Missouri Botanical Garden — Closed Terrarium Care", url: "https://www.missouribotanicalgarden.org/gardens-gardening/your-garden/help-for-the-home-gardener/advice-tips-resources/visual-guides/terrariums" },
      { label: "Royal Horticultural Society — Terrariums", url: "https://www.rhs.org.uk/plants/types/houseplants/terrariums" },
      { label: "Smithsonian Gardens — Building a Terrarium", url: "https://gardens.si.edu/learn/blog/building-a-terrarium/" },
      { label: "NCSU Extension — Terrarium Maintenance", url: "https://content.ces.ncsu.edu/extension-gardener-handbook/18-houseplants" },
      { label: "University of Vermont Extension — Terrarium Plants", url: "https://www.uvm.edu/extension/mastergardener/terrarium-gardens" },
      { label: "American Fern Society — Selaginella vs. true ferns", url: "https://amerfernsoc.org/" },
      { label: "Costa Farms — Fittonia (Nerve Plant) Care", url: "https://costafarms.com/plants/fittonia-nerve-plant" },
      { label: "The Spruce — Terrarium Care Mistakes", url: "https://www.thespruce.com/common-terrarium-mistakes-847861" }
    ]
  }
};

const OWNED_PLANT_IDS = [
  /* In-soil established plants */
  "prayer_plant",
  "monstera",
  "monstera_water_cuttings",
  "thai_constellation",
  "schefflera",
  "schefflera_dark",
  "mini_orchid",
  "ginseng_ficus",
  "ginseng_ficus_cutting",
  "snake_plant",
  "aloe_vera",
  "mondo_grass",
  "firestick",
  "kalanchoe",
  "burrows_tail",
  "succulent_frankenstein_a",
  "succulent_frankenstein_b",
  "dracaena_fragrans",
  "dracaena_fragrans_b",
  "cordyline_fruticosa",
  "assorted_cacti",
  "royal_ivy",
  /* Graduated cuttings (now in soil) */
  "wandering_dude",
  "golden_pothos",
  "pearls_jade_pothos",
  "pothos_combo",
  "fittonia",
  "marble_queen_pothos",
  "philodendron_silver_stripe",
  /* New nursery-pot arrivals (Jul 2026) — still in retail nursery pots;
   * each carries a repotSuggestion payload that drives the Care Guide
   * repot-suggestion card. */
  "haworthia",
  "sedum_angelina",
  "baby_burros_tail",
  "string_of_pearls",
  "lady_finger_cactus",
  "variegated_elephant_bush",
  "zz_plant",
  "desert_rose",
  /* Branch extracted from the elephant bush, potted as a bonsai (Jul 2026) */
  "variegated_elephant_bush_bonsai",
  /* Closed glass terrariums (Home Depot, identical pair) */
  "terrarium_a",
  "terrarium_b"
];

const SUCCULENT_VARIANTS = [
  "aloe_vera",
  "firestick",
  "kalanchoe",
  "burrows_tail",
  "succulent_frankenstein_a",
  "succulent_frankenstein_b",
  "assorted_cacti",
  /* New nursery-pot succulents/cacti (Jul 2026) — grouped here so they
   * show under the Succulents sub-dropdown, not the primary list. */
  "haworthia",
  "sedum_angelina",
  "baby_burros_tail",
  "string_of_pearls",
  "lady_finger_cactus",
  "variegated_elephant_bush",
  "desert_rose"
];

const POTHOS_VARIANTS = [
  "golden_pothos",
  "marble_queen_pothos",
  "pearls_jade_pothos",
  "pothos_combo",
  "philodendron_silver_stripe"
];

/* Currently-owned WATER-rooting cuttings — Aug 2026: 3 Monstera top cuttings. */
const WATER_PROPAGATION_IDS = ["monstera_water_cuttings"];

const PLANT_CATEGORIES_FOR_CUSTOM = [
  "Tropical",
  "Succulent",
  "Bonsai",
  "Ornamental Grass",
  "Cactus",
  "Fern",
  "Pothos / Vining",
  "Other"
];

const PLANT_CONDITION_OPTIONS = [
  "Thriving",
  "Healthy",
  "Okay",
  "Struggling",
  "Recovering"
];

/* ============================================================
 * 📍 PLACEMENT TAB — Room zones and per-plant placement
 * ============================================================
 *
 * Eight micro-zones in the home, each with its own light profile, humidity,
 * and gotchas. Each plant in PLANT_PLACEMENT below maps to a ranked
 * recommendation:
 *
 *   • ideal[]  — best zones for this plant; will visibly thrive
 *   • ok[]     — acceptable zones; the plant will survive and look fine
 *                but won't reach its full potential
 *   • avoid[]  — zones that actively hurt the plant
 *   • rationale — one-paragraph explanation tying light/humidity/temp
 *                 needs back to the user's specific rooms.
 *
 * Light terminology used throughout (matches what the Conditions card on the
 * Care Guide uses):
 *
 *   - DIRECT SUN: unobstructed rays hit the plant's leaves. Hottest in
 *     afternoon (PM), gentlest in early morning (AM). Filter via curtain,
 *     stained glass, etc. softens intensity by 30–70%.
 *   - BRIGHT INDIRECT: lots of ambient light, no direct beam landing on the
 *     plant. Typical 4–8 feet back from a south/west window, or right at a
 *     north/east window. The "default" for most tropicals.
 *   - MEDIUM INDIRECT: ambient light still readable, ~10+ feet from a
 *     window or a north-only orientation. Lower-light tolerant plants only.
 *
 * Sources referenced for placement-by-room reasoning are listed in
 * PLACEMENT_SOURCES at the bottom.
 */

const PLACEMENT_ZONES = {
  living_room_fireplace: {
    id: "living_room_fireplace",
    displayName: "Living Room — Above Fireplace",
    icon: "🪵",
    lightProfile: "Bright indirect all day + 1–3 hrs direct morning sun",
    description: "Elevated mantle position above the fireplace. The two front-facing windows deliver 1–3 hours of direct morning sun before the rays move past, then bright indirect light reflects around the room. Note: the fireplace is decorative — the house has central HVAC, so there's no heat risk and humidity stays the household baseline.",
    cautions: "Effectively a duplicate of Window A's light profile but elevated and centered over the room. The mantle is usually narrow — confirm your pot's footprint fits and that the pot is stable (no climbing pets, no curtains brushing it).",
    humidity: "Average household (40–50%)",
    bestFor: "Plants that love bright + some direct morning sun. Equivalent in light terms to Window A — pick based on aesthetics and pot weight (heavy pots > 5 lbs are awkward on a mantle)."
  },
  living_room_window_morning: {
    id: "living_room_window_morning",
    displayName: "Living Room — Window A (morning sun)",
    icon: "🌅",
    lightProfile: "Bright indirect + 1–3 hrs direct morning sun",
    description: "One of the two living-room windows. Plants placed within 1–2 feet of the glass get 1–3 hours of direct morning sun (the gentlest and most beneficial direct sun of the day), then bright indirect through the afternoon.",
    cautions: "Morning sun is the easiest direct sun to tolerate — almost no plants scorch from AM-only direct light. Watch for glass-magnification in summer (south-facing morning sun in Jun–Sep can briefly intensify).",
    humidity: "Average household (40–50%)",
    bestFor: "Most tropicals, mid-light succulents, and anything that needs bright but not all-day-direct sun"
  },
  living_room_window_stained: {
    id: "living_room_window_stained",
    displayName: "Living Room — Window B (stained glass)",
    icon: "🎨",
    lightProfile: "Bright indirect + 1–2 hrs FILTERED direct afternoon sun (colored stained glass)",
    description: "The stained-glass window. Direct afternoon sun is diffused and color-shifted by the colored panes — total photon flux is dropped 40–70% and the spectrum tilts blue/red/green depending on the panes. Functions more like 'bright indirect with a warm glow' than true direct sun.",
    cautions: "The colored glass selectively filters certain wavelengths. Plants that need full-spectrum direct sun to FLOWER (Kalanchoe, Cacti, Aloe) won't bloom as well here, even though they survive fine. For foliage, this spot is gentler than unfiltered PM sun and is often safer than Window A in summer.",
    humidity: "Average household (40–50%)",
    bestFor: "Plants that want bright light without harsh afternoon sun (variegated foliage, Wandering Dude, Prayer Plant, Cordyline)"
  },
  living_room_open: {
    id: "living_room_open",
    displayName: "Living Room — Open / Interior",
    icon: "🛋️",
    lightProfile: "Bright indirect all day (no direct sun)",
    description: "Anywhere in the living room that's not right at a window. Light bounces around from both windows, giving even bright-indirect conditions during daylight hours.",
    cautions: "Light drops to medium indirect once you go more than ~10 feet from the nearest window or behind furniture. Lower-light plants only in those deeper spots.",
    humidity: "Average household (40–50%)",
    bestFor: "Most foliage tropicals — Monstera, Pothos, Philodendron, Schefflera, Dracaena, Royal Ivy, Prayer Plant"
  },
  bedroom: {
    id: "bedroom",
    displayName: "Bedroom",
    icon: "🛏️",
    lightProfile: "Medium-to-bright INDIRECT light (no direct sun reaches plant zones)",
    description: "Even, ambient light throughout the day. Light level is similar to the Living Room and 2nd Floor open areas — a 'standard tropical' zone, just in a separate room.",
    cautions: "No direct sun means sun-loving plants (cacti, succulents, firestick, aloe, blooming kalanchoe) will etiolate / lose color / stop flowering here. This is a foliage-tropical room, not a sun room.",
    humidity: "Average household (40–50%); slightly elevated overnight from sleepers",
    bestFor: "Bright-indirect foliage tropicals — Pothos, Philodendron, Monstera, Prayer Plant, Schefflera, Dracaena, Royal Ivy, Cordyline. Most of the variegated plants are equally happy here as in the LR/2F open zones."
  },
  bathroom: {
    id: "bathroom",
    displayName: "Bathroom",
    icon: "🚿",
    lightProfile: "Medium indirect + 1–2 hrs filtered morning sun (stained glass)",
    description: "The lowest-light room. Stained glass diffuses morning sun. Showering routinely spikes humidity to 70–90%+ and keeps the baseline 10–20% higher than the rest of the house.",
    cautions: "Wet floors and steam → check pots for mold and fungus gnats every 2 weeks. Don't put pots directly on the shower floor (chronic over-saturation). Avoid plants that demand high light or hate humidity (cacti, succulents, Aloe).",
    humidity: "55–60% baseline; 70–90% during/after showers",
    bestFor: "Humidity-loving + low-light tolerant plants — Mini Orchid, Fittonia, Golden Pothos, Snake Plant, Dracaena fragrans"
  },
  second_floor_window: {
    id: "second_floor_window",
    displayName: "2nd Floor — Near Window",
    icon: "🪟",
    lightProfile: "Bright indirect all day + 1–3 hrs DIRECT afternoon sun",
    description: "Within 2 feet of a 2nd-floor window. Strong indirect light all day from less-obstructed sky exposure, plus 1–3 hours of direct afternoon sun.",
    cautions: "⚠️ Afternoon sun is the HOTTEST direct sun of the day (especially Jun–Sep, when the sun is high and intense). Plants that scorch in PM sun must either get filtering (sheer curtain) or move to 2F-Open. Watch for window-glass-amplified heat in summer.",
    humidity: "Average household (40–50%)",
    bestFor: "Sun-lovers that tolerate afternoon heat — Aloe, Ginseng Ficus, Firestick, Cacti, sun-tolerant succulents"
  },
  second_floor_open: {
    id: "second_floor_open",
    displayName: "2nd Floor — Open",
    icon: "🌇",
    lightProfile: "Bright indirect all day",
    description: "Open 2nd-floor space away from direct sun. Bright indirect light from less-obstructed 2nd-floor windows is usually 1–2 stops BRIGHTER than equivalent ground-floor indirect.",
    cautions: "If far (>15 feet) from any window, light drops to medium indirect. Stairwells and hallways can be darker than they look.",
    humidity: "Average household (40–50%)",
    bestFor: "The premium spot for foliage tropicals that want maximum bright indirect — Monstera, Thai Constellation, Philodendron, Pothos, Prayer Plant, Cordyline"
  }
};

/* Per-plant placement recommendations.
 *
 * Conventions:
 *   - "ideal" is sorted in preference order (first = best).
 *   - "ok" is also rough preference order.
 *   - Plants not listed default to no specific guidance (will fall back to
 *     a generic message in the UI).
 */
const PLANT_PLACEMENT = {
  prayer_plant: {
    ideal: ["living_room_open", "second_floor_open", "bedroom"],
    ok: ["bathroom", "living_room_window_stained"],
    avoid: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    rationale: "Rattlesnake Calathea (Goeppertia insignis) needs bright INDIRECT light — direct sun (especially the afternoon kind) scorches the leaves and washes out the dark rattlesnake markings within weeks. The bedroom (now confirmed bright indirect, not direct) joins LR-Open and 2F-Open as a premium spot. The bathroom is actually a GREAT fit because Calatheas are humidity-lovers (60%+ ideal) and this one is even fussier than a Maranta; the slight light hit is a fair trade for the moist air. Avoid all direct-sun spots (Window A, fireplace, 2F window) — they crisp the leaf edges and fade the markings."
  },
  monstera: {
    ideal: ["second_floor_open", "living_room_open", "living_room_window_morning", "bedroom"],
    ok: ["living_room_fireplace", "living_room_window_stained", "second_floor_window"],
    avoid: ["bathroom"],
    rationale: "Monstera produces the largest fenestrated leaves in bright indirect with optional 1–3 hrs of morning direct sun. The 2nd-floor open area is the gold standard. Bedroom (bright indirect, no direct) is now equivalent to LR-Open in light terms — a perfectly good spot for Monstera. Avoid only the bathroom (light too low, leaves stay solid without splits). The fireplace mantle works light-wise, but the 13.5\" pot is heavy and bulky — only consider it if the mantle is wide and load-rated. Aug 2026: 4 air layers stay on this plant — don't move it to harsh sun while wraps are on."
  },
  monstera_water_cuttings: {
    ideal: ["living_room_open", "bedroom", "living_room_window_stained"],
    ok: ["living_room_window_morning", "second_floor_open"],
    avoid: ["bathroom", "second_floor_window", "living_room_fireplace"],
    rationale: "Three Monstera top cuttings in a water jar (UMN Extension: node required). Bright indirect only — a jar in hot direct sun cooks cuttings. Keep near the mother for similar light, but not on the 2F SW sill. Bathroom humidity is fine but stagnant air + a jar invites slime."
  },
  thai_constellation: {
    ideal: ["living_room_window_morning", "second_floor_open", "living_room_fireplace"],
    ok: ["living_room_open", "living_room_window_stained", "bedroom"],
    avoid: ["bathroom", "second_floor_window"],
    rationale: "Thai Con needs MORE light than green Monstera because the cream variegated sections have no chlorophyll. Morning direct sun (Window A or fireplace mantle) gives the cream sections enough energy to thrive. The 5\" pot fits cleanly on a mantle. The bedroom (bright indirect, no direct) is acceptable but you'll see slightly slower growth and some reversion toward green — keep it in a direct-AM spot if possible. Avoid the bathroom (light too low → revert to greener growth) and the 2F window (afternoon direct sun SCORCHES the cream sections irreversibly)."
  },
  schefflera: {
    ideal: ["living_room_open", "second_floor_open", "living_room_window_morning", "bedroom"],
    ok: ["living_room_window_stained", "living_room_fireplace", "second_floor_window"],
    avoid: ["bathroom"],
    rationale: "Variegated yellow Schefflera REQUIRES bright indirect to keep its variegation — too dim and new leaves emerge all-green within 4–6 weeks. The bedroom (bright indirect, no direct) is excellent for maintaining variegation. Tolerates 1–3 hrs morning direct (Window A, fireplace) too. Avoid the bathroom (light too low → variegation reverts to green). Aug 2026: now in a 13.5\" pot (same as Monstera) — floor-standing only; overpot means extra-conservative watering."
  },
  schefflera_dark: {
    ideal: ["living_room_open", "second_floor_open", "bedroom", "living_room_window_stained"],
    ok: ["living_room_window_morning", "bathroom", "second_floor_window", "living_room_fireplace"],
    avoid: [],
    rationale: "The dark-green form has full chlorophyll and is the most placement-flexible foliage tropical in the collection — bright indirect anywhere works equally well. Bedroom, LR-Open, 2F-Open are all premium. Bathroom medium indirect is fine (the dark form keeps its color in lower light). No genuinely bad spot exists for this one."
  },
  mini_orchid: {
    ideal: ["bathroom"],
    ok: ["living_room_open", "second_floor_open", "living_room_window_stained", "bedroom"],
    avoid: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    rationale: "Phalaenopsis was made for the bathroom — 60%+ humidity, medium indirect light, gentle morning filtering through stained glass = the natural epiphytic understory it evolved in. The bedroom (bright indirect, no direct) is a fine secondary spot for the light alone but you'll need to mist or use a pebble tray to compensate for the lower humidity. Any direct sun (Window A, fireplace mantle, 2F window) bleaches the leaves within weeks; dry-air direct-sun spots shrivel the blooms fast."
  },
  ginseng_ficus: {
    ideal: ["living_room_window_morning", "second_floor_window", "living_room_fireplace"],
    ok: ["living_room_window_stained", "bedroom", "second_floor_open", "living_room_open"],
    avoid: ["bathroom"],
    rationale: "Ginseng Ficus is a sun-lover that prefers 2–4+ hours of direct sun daily for the most compact bonsai-style growth. The morning-direct spots (Window A, fireplace mantle) and the 2F window (PM direct) are the best the house offers. The bedroom (bright indirect only, no direct) works but you'll see slower growth, longer internodes, and potentially some leaf drop — acceptable, just not peak. The bathroom is the worst place for it (leaf drop within weeks)."
  },
  ginseng_ficus_cutting: {
    ideal: ["living_room_window_stained", "bedroom", "second_floor_open", "living_room_open"],
    ok: ["living_room_window_morning", "second_floor_window"],
    avoid: ["bathroom", "living_room_fireplace"],
    rationale: "A freshly-rooted cutting wants BRIGHT INDIRECT light while it establishes — the opposite of the parent tree's love of direct sun. The stained-glass window (gentle filtered light), the bedroom (bright indirect, no direct), and the open living-room/2F spots are ideal for a stressed young cutting. The direct-sun spots (Window A morning-direct, 2F PM-direct) are only 'ok' — hold off on them until it's clearly growing. Avoid the hot fireplace mantle (too much direct sun + dry heat for a cutting) and the bathroom (leaf drop, and stagnant humidity can rot a tiny root system)."
  },
  snake_plant: {
    ideal: ["living_room_open", "second_floor_open", "bedroom"],
    ok: ["bathroom", "living_room_window_morning", "living_room_window_stained", "second_floor_window", "living_room_fireplace"],
    avoid: [],
    rationale: "Sansevieria is the most adaptable plant in the entire collection — tolerates everything from a dim hallway to full direct sun. Grows fastest in bright indirect (LR-Open, 2F-Open, bedroom). Will survive (just slower) in the bathroom or the brightest direct-sun spots. Truly hard to put in the wrong place; pick whichever spot has empty real estate."
  },
  aloe_vera: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained"],
    avoid: ["bathroom", "bedroom", "living_room_open", "second_floor_open"],
    rationale: "Aloe needs FULL sun (6+ hrs ideal) to maintain its stout upright form, the right green-with-white-spots color, and its medicinal compounds (aloin). ⚠️ NONE of the rooms in this house provide 6+ hrs of direct sun — the best you can do is the 2F window (1–3 hrs PM direct + bright indirect rest of day) or Window A / fireplace mantle (1–3 hrs AM direct). Aloe will live in these spots but expect slightly leggier growth than a full-sun outdoor plant. The bedroom is OUT — bright indirect only means etiolation within 6–8 weeks (leaves pale, floppy, stretchy). Consider a small 20W LED grow light on a timer if you want true peak performance."
  },
  mondo_grass: {
    ideal: ["living_room_open", "second_floor_open", "bathroom", "bedroom"],
    ok: ["living_room_window_stained", "living_room_window_morning", "living_room_fireplace"],
    avoid: ["second_floor_window"],
    rationale: "Mondo Grass is unusually shade-tolerant for a grass — in fact, it browns at the tips in too much direct sun. Bright indirect (bedroom, LR-Open, 2F-Open) and medium indirect (bathroom) are all excellent. 1–3 hrs morning sun (Window A or fireplace mantle) is the upper limit; direct afternoon sun (2F window) is fatal."
  },
  firestick: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained"],
    avoid: ["bathroom", "bedroom", "living_room_open", "second_floor_open"],
    rationale: "Euphorbia tirucalli MUST have direct sun to maintain its iconic red/orange tips — without strong direct light, it stays plain green and grows floppy/leggy within a few weeks. Aug 2026: outdoors on the 301° NW patio (same compass as 2F Room 2) — late-day summer sun. Missouri Botanical Garden / NC State: full sun, but hot summers often want some afternoon shade; acclimate 7–14 days; bring in before ~50°F. Indoor fallback remains 2F SW. ⚠️ Toxic latex — keep out of Moose's path."
  },
  kalanchoe: {
    ideal: ["living_room_window_morning", "second_floor_window", "living_room_fireplace"],
    ok: ["living_room_window_stained", "bedroom"],
    avoid: ["bathroom", "living_room_open", "second_floor_open"],
    rationale: "Kalanchoe blossfeldiana only blooms when given 4–6+ hrs of direct sun daily, often with a short-day photoperiod trigger in fall. The morning-direct spots (Window A, fireplace mantle) plus the 2F window are the only ones that get any direct sun — and even those only deliver 1–3 hrs, so flowering will be modest. In the bedroom (bright indirect only) Kalanchoe will live and stay green but produce ZERO blooms. If flowers matter, supplement with a grow light Sept–Dec for the photoperiod trigger."
  },
  burrows_tail: {
    ideal: ["living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained", "second_floor_window", "bedroom"],
    avoid: ["bathroom", "living_room_open", "second_floor_open"],
    rationale: "Sedum morganianum needs bright light with some direct morning sun to keep its blue-green powdery 'farina' coating intact and prevent stretching. Harsh afternoon sun scorches the powder off. Window A or fireplace mantle (AM direct) are ideal; the 2F window's PM direct is OK with a sheer curtain in summer. The bedroom (bright indirect only) is acceptable but expect longer/sparser strands — succulents need at least some direct sun to stay compact. The bathroom's humidity is actually HARMFUL — succulent leaves rot in chronic >60% humidity."
  },
  succulent_frankenstein_a: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained"],
    avoid: ["bathroom", "bedroom", "living_room_open", "second_floor_open"],
    rationale: "5-species succulent mix — every species in the pot needs full sun to keep its compact rosette form. ⚠️ This house's available direct-sun hours (1–3 hrs at the best spots) are below what these species evolved for; expect noticeable etiolation (stretching, pale color) over 2–6 months. The 2F window's PM direct + bright indirect rest of day is the best available. The bedroom (bright indirect only) will etiolate succulents within 2–3 weeks. The bathroom is actively dangerous (chronic humidity → rot)."
  },
  succulent_frankenstein_b: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained"],
    avoid: ["bathroom", "bedroom", "living_room_open", "second_floor_open"],
    rationale: "Same as the 5-species mix — all 3 succulents in this pot want full direct sun. Same constraints: 2F window or morning-direct spots are the best available, but they're sub-optimal long-term. Grow light recommended for true peak performance. Bedroom (indirect only) = guaranteed etiolation."
  },
  dracaena_fragrans: {
    ideal: ["living_room_open", "second_floor_open", "bedroom"],
    ok: ["bathroom", "living_room_window_stained", "living_room_fireplace", "living_room_window_morning"],
    avoid: ["second_floor_window"],
    rationale: "Dracaena fragrans is famously low-light tolerant — it's the classic 'corner of an office' plant. Bright indirect (LR-Open, 2F-Open, bedroom) is ideal; medium indirect (bathroom) is perfectly fine. Direct sun (especially afternoon at the 2F window) scorches the long strappy leaves. Aug 2026: canes split into two 9×9 pots (Cane A + Cane B) — lighter than the old 13.5\", easier to place, still keep them out of hot PM sun."
  },
  dracaena_fragrans_b: {
    ideal: ["living_room_open", "second_floor_open", "bedroom"],
    ok: ["bathroom", "living_room_window_stained", "living_room_fireplace", "living_room_window_morning"],
    avoid: ["second_floor_window"],
    rationale: "Same light profile as Cane A. Park as a pair if you want, but this cane has its own watering log after the Aug 2026 split."
  },
  cordyline_fruticosa: {
    ideal: ["living_room_window_morning", "second_floor_open", "living_room_open"],
    ok: ["living_room_fireplace", "living_room_window_stained", "second_floor_window", "bedroom"],
    avoid: ["bathroom"],
    rationale: "Ti Plant keeps its pink/red leaf color BEST in bright indirect with gentle morning direct sun. Window A morning direct is the top pick. The bedroom (bright indirect only) is OK but expect new growth to be greener — without any direct sun, the pink/red pigments fade. If you want max color, keep it at a morning-direct spot."
  },
  assorted_cacti: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained"],
    avoid: ["bathroom", "bedroom", "living_room_open", "second_floor_open"],
    rationale: "Mixed cactus pot. The Mammillaria spinosissima and the orphaned Hylocereus rootstock both want LOTS of direct sun (4+ hrs). The remaining grafted Moon Cactus prefers slightly filtered sun. ⚠️ NO spot in this house gives 4+ hrs of direct sun — the 2F window's 1–3 hrs PM direct is the best available. The morning-direct spots (Window A, fireplace) work but may favor the Moon Cactus over the more sun-demanding Mammillaria. The bedroom is OUT — cacti etiolate FAST (4–6 weeks) without direct sun. Cool dry winters (Dec–Feb, no water) on a windowsill near a single-pane window can trigger spring blooms in all three species. Consider a grow light for the best long-term result."
  },
  royal_ivy: {
    ideal: ["living_room_open", "second_floor_open", "bedroom", "living_room_window_stained"],
    ok: ["bathroom", "living_room_window_morning", "living_room_fireplace"],
    avoid: ["second_floor_window"],
    rationale: "English Ivy is one of the few houseplants that genuinely prefers COOLER + bright-indirect conditions (55–75°F). Bedrooms are often cooler than the rest of the house, AND the light is now confirmed bright indirect, so bedroom is a PREMIUM spot for ivy. Variegated cultivars need bright indirect to keep their pattern but burn fast in direct hot sun. Morning direct sun (Window A or fireplace mantle) is the upper safe limit. The bathroom's humidity helps fend off spider mites (Ivy's #1 pest)."
  },
  wandering_dude: {
    ideal: ["living_room_window_morning", "second_floor_open", "living_room_window_stained"],
    ok: ["living_room_open", "living_room_fireplace", "second_floor_window", "bedroom"],
    avoid: ["bathroom"],
    rationale: "Tradescantia zebrina needs bright light (with a bit of morning direct sun) to keep its purple/silver striping vivid — in low light the leaves fade to dull green within 6–8 weeks. The bedroom (bright indirect only) is acceptable but striping will be less vivid than at a morning-direct spot — keep at Window A or fireplace if color matters most. ⚠️ EXTRA caution: this one is in a 4\" GLASS BOWL with no drainage — avoid spots with strong direct PM sun that could heat the bowl and cook the roots."
  },
  golden_pothos: {
    ideal: ["living_room_open", "second_floor_open", "living_room_window_stained", "bedroom"],
    ok: ["bathroom", "living_room_fireplace", "living_room_window_morning", "second_floor_window"],
    avoid: [],
    rationale: "Most flexible of all the pothos — Golden Pothos tolerates everything from the bathroom's medium indirect (just slower growth and slight loss of gold variegation) to bright indirect 2F-Open (premium growth and crisp variegation). The bedroom (bright indirect, no direct) is just as good as LR-Open. No spot in the house is truly bad for it."
  },
  marble_queen_pothos: {
    ideal: ["living_room_open", "second_floor_open", "living_room_window_stained", "bedroom"],
    ok: ["living_room_fireplace", "living_room_window_morning"],
    avoid: ["bathroom", "second_floor_window"],
    rationale: "Heavily variegated → needs MORE light than Golden Pothos to maintain the cream/white. Bright indirect at the 2nd-floor open area, bedroom, LR-Open, or near the stained-glass window are all good. The bathroom is too dim (variegation reverts to green within 4–6 weeks). Direct hot sun bleaches the white patches."
  },
  pearls_jade_pothos: {
    ideal: ["living_room_open", "second_floor_open", "living_room_window_stained", "bedroom"],
    ok: ["living_room_window_morning", "living_room_fireplace"],
    avoid: ["bathroom", "second_floor_window"],
    rationale: "Slow-growing variegated cultivar — needs strong bright indirect to keep its cream/white speckling. Bedroom, LR-Open, 2F-Open all work equally well. The bathroom is too dim; growth and variegation both suffer noticeably. Direct afternoon sun bleaches the small leaves. ⚠️ The 3\" pot is small, so place wherever you'll remember to check moisture twice a week."
  },
  pothos_combo: {
    ideal: ["living_room_open", "second_floor_open", "living_room_window_stained", "bedroom"],
    ok: ["living_room_window_morning", "living_room_fireplace", "bathroom"],
    avoid: ["second_floor_window"],
    rationale: "Mix of Satin + Neon + Golden. Tuned to the brightest-light-needing one (Satin Pothos / Scindapsus) to keep its silver speckling visible. Bedroom is excellent (bright indirect, no glare). Bathroom is acceptable for the Golden but the Satin's silver fades there over 6–8 weeks. Direct PM sun bleaches all three cultivars."
  },
  philodendron_silver_stripe: {
    ideal: ["living_room_open", "second_floor_open", "living_room_window_stained", "bedroom"],
    ok: ["living_room_window_morning", "living_room_fireplace"],
    avoid: ["bathroom", "second_floor_window"],
    rationale: "Variegated Philodendron hederaceum 'Silver Stripe' needs bright indirect to keep its silver stripe pattern. Bedroom, LR-Open, 2F-Open are all equivalent premium spots. The bathroom is too dim (silver fades to dull green). Direct hot sun bleaches the silver sections. Optional power move: 5.5\" pot + moss pole at 2F-Open or a bedroom corner → leaves DOUBLE in size when allowed to climb."
  },
  fittonia: {
    ideal: ["bathroom"],
    ok: ["living_room_open", "second_floor_open", "bedroom"],
    avoid: ["second_floor_window", "living_room_window_morning", "living_room_fireplace", "living_room_window_stained"],
    rationale: "Fittonia was BUILT for the bathroom — high humidity (70%+ during showers), medium indirect light, gentle filtered morning sun through the stained glass = exactly the Peruvian rainforest understory it evolved in. The bedroom (bright indirect, no direct) is OK for the light alone, but you'll need to mist daily or use a humidity tray. The 1\" pot the cuttings are in dries out 3–4× SLOWER in the bathroom than anywhere else. Any direct sun is fatal within hours."
  },
  terrarium_a: {
    ideal: ["living_room_open", "second_floor_open", "bedroom"],
    ok: ["bathroom"],
    avoid: ["second_floor_window", "living_room_window_morning", "living_room_fireplace", "living_room_window_stained"],
    rationale: "Closed glass terrariums are EXTREMELY sun-sensitive — the glass acts as a magnifying lens and the cork seal traps the heat with no way to vent. Even 15–30 minutes of direct sun (any time of day, any window) can push the interior past 100°F and irreversibly cook all three species at once. Bright INDIRECT only. The bedroom is now confirmed bright indirect (no direct sun) → fully ideal for terrariums. LR-Open and 2F-Open are equally good. Bathroom works for the light but the existing high external humidity is redundant (terrarium self-sustains at 80–95% inside), and the cool tile floor can cause excessive condensation. Window B's stained glass is RULED OUT — even filtered afternoon sun is concentrated enough through the magnifying glass to spike the interior temperature."
  },
  terrarium_b: {
    ideal: ["living_room_open", "second_floor_open", "bedroom"],
    ok: ["bathroom"],
    avoid: ["second_floor_window", "living_room_window_morning", "living_room_fireplace", "living_room_window_stained"],
    rationale: "Same as Terrarium A — bright indirect only, glass magnification rules out every direct-sun zone. If you can, place A and B in DIFFERENT spots within the OK/Ideal zones so they don't share a microclimate — that way if one starts having trouble you have a built-in control variable to compare against."
  },
  /* ============= NEW NURSERY-POT ARRIVALS (Jul 2026) =============
   * Placement recommendations calibrated to the house's actual light budget
   * (best available direct-sun spots max out at ~1–3 hrs, which is below what
   * full-sun succulents/cacti evolved for — many entries call out this gap
   * and suggest a grow light for peak performance). */
  haworthia: {
    ideal: ["living_room_open", "second_floor_open", "living_room_window_morning", "bedroom"],
    ok: ["bathroom", "living_room_window_stained", "living_room_fireplace"],
    avoid: ["second_floor_window"],
    rationale: "Haworthia is the OUTLIER succulent — it actively PREFERS bright indirect over full direct sun. In its native habitat it grows shaded by rocks and shrubs, so LR-Open, 2F-Open, and the bedroom (all now confirmed bright indirect) are truly ideal. Even the bathroom is fine — one of the few succulents that tolerates medium indirect. AVOID the 2F window's PM direct sun — the leaves scorch to white/red within days. Window A (AM direct 1–3 hrs) is OK but only with the pot pulled back 1–2 feet from the glass so the sun is dappled."
  },
  sedum_angelina: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained"],
    avoid: ["bathroom", "bedroom", "living_room_open", "second_floor_open"],
    rationale: "Sedum rupestre 'Angelina' NEEDS direct sun to hold its trademark chartreuse-gold color — in indirect light it reverts to plain green within 4–6 weeks and stays that way. The 2F window (PM direct + bright indirect rest of day) is the best available; morning-direct spots (Window A, fireplace) are next best. The bedroom (bright indirect only) turns Angelina into 'Sedum Green' — will live, will not color. Bathroom's humidity risks stem rot. Grow light supplement recommended if the color is why you got this plant."
  },
  baby_burros_tail: {
    ideal: ["living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained", "second_floor_window", "bedroom"],
    avoid: ["bathroom", "living_room_open", "second_floor_open"],
    rationale: "Same profile as the classic Burro's Tail (Sedum morganianum) — wants bright light with some direct MORNING sun to keep the blue-green farina intact and the leaves plump. Window A and fireplace mantle (AM direct 1–3 hrs) are ideal. The 2F window's PM direct is OK with a sheer curtain in summer. The bedroom (bright indirect only) works but expect longer, less-dense stems — succulents need at least some direct sun to stay compact. The bathroom's chronic humidity is actively harmful (leaves rot in >60% RH)."
  },
  string_of_pearls: {
    ideal: ["living_room_window_morning", "living_room_fireplace"],
    ok: ["second_floor_window", "living_room_window_stained", "bedroom"],
    avoid: ["bathroom", "living_room_open", "second_floor_open"],
    rationale: "Pearls need bright INDIRECT with 1–3 hrs of gentle morning direct sun. Window A and fireplace mantle are the best available. The 2F window's PM direct is OK with a sheer curtain — harsh afternoon sun scorches pearls to yellow within days. The bedroom (bright indirect only) works OK but strands may thin at the base; watch the top of the pot — if the crown is in shadow the whole plant balds from the top down. ⚠️ Bathroom is a HARD avoid — chronic humidity above 60% causes the pearls to burst and rot. If hung, keep out of pet reach — TOXIC."
  },
  lady_finger_cactus: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained"],
    avoid: ["bathroom", "bedroom", "living_room_open", "second_floor_open"],
    rationale: "Mammillaria elongata is a full-sun desert cactus — wants 4–6+ hrs of direct sun. ⚠️ NO room in this house delivers that budget — the 2F window (PM direct 1–3 hrs + bright indirect all day) is the best available; morning-direct spots (Window A, fireplace) work but the fingers may still stretch some. The bedroom (bright indirect only) causes fast etiolation (4–6 weeks) that permanently damages the compact form. Bathroom humidity + a cactus = fungal spotting at the stem bases within weeks. A supplemental grow light is genuinely recommended for peak color and to trigger the spring flowering ring."
  },
  variegated_elephant_bush: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained", "bedroom"],
    avoid: ["bathroom", "living_room_open", "second_floor_open"],
    rationale: "Portulacaria afra 'Variegata' needs MORE light than the plain green version — the cream/yellow stripes only stay vivid with strong direct sun. The 2F window (1–3 hrs PM direct + bright indirect) is the best available; morning-direct spots (Window A, fireplace) are next best. The bedroom is a compromise position: the plant will live but variegation will fade to a dull green-yellow within 2–3 months. ⚠️ Bathroom is a hard avoid — chronic humidity causes stem rot at soil line. This is the most forgiving of all the new nursery plants; not the most demanding — so it can be a good candidate to fill any of the bright-direct spots you don't want to give to the pickier Pearls or Desert Rose."
  },
  zz_plant: {
    ideal: ["living_room_open", "second_floor_open", "bedroom", "bathroom"],
    ok: ["living_room_window_stained", "living_room_window_morning", "living_room_fireplace"],
    avoid: ["second_floor_window"],
    rationale: "ZZ Plant is the classic 'office corner' plant — it genuinely tolerates the widest light range in the entire collection. Bright indirect (LR-Open, 2F-Open, bedroom) is where it grows FASTEST. Medium indirect (bathroom) is perfectly fine. Morning-direct spots (Window A, fireplace) are OK but scorching risk if the plant is right in the beam — pull back 2 feet. ⚠️ ONLY hard avoid is the 2F window's PM direct sun — the glossy leaflets burn to yellow/brown. Aug 2026: correctly up-potted 4\" → 5\" (Clemson: +1–2\" only). Keep out of pet reach — TOXIC to cats/dogs."
  },
  desert_rose: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained"],
    avoid: ["bathroom", "bedroom", "living_room_open", "second_floor_open"],
    rationale: "Adenium obesum is the most sun-hungry plant in the collection — UF/IFAS EP474 wants 6+ hours of bright light for flowers and treats it as a deck/patio plant that comes in for winter. Aug 2026: outdoors on the 301° NW side (same as 2F Room 2). That is better DLI than any indoor window, but fewer direct hours than 2F SW. Bring the 5\" pot in before nights ~50°F. Bathroom is doubly disqualified: not enough sun AND humidity = caudex rot. Keep away from pets — TOXIC sap."
  }
};

/* Sources cited for placement-by-room reasoning. The light-classification
 * terminology and the "direct AM is gentle vs. direct PM is harsh"
 * principle is repeated across all major horticultural extension sources;
 * the seasonal indoor-light estimates for Austin / 30°N latitude come from
 * the Texas A&M AgriLife resources. */
const PLACEMENT_SOURCES = [
  { label: "Royal Horticultural Society — Houseplants: light", url: "https://www.rhs.org.uk/plants/types/houseplants/light-for-house-plants" },
  { label: "Missouri Botanical Garden — Indoor Plants: Light Requirements", url: "https://www.missouribotanicalgarden.org/gardens-gardening/your-garden/help-for-the-home-gardener/advice-tips-resources/visual-guides/houseplants-light" },
  { label: "University of Florida IFAS — Houseplant Light Levels", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/" },
  { label: "Texas A&M AgriLife — Houseplants for Texas Homes", url: "https://aggie-horticulture.tamu.edu/ornamentals/houseplants/" },
  { label: "North Carolina State Extension — Houseplant Light Requirements", url: "https://content.ces.ncsu.edu/houseplants" },
  { label: "Costa Farms — Light Levels for Houseplants", url: "https://costafarms.com/how-to/houseplants/light-levels-for-houseplants" },
  { label: "The Sill — How to Determine Light in Your Home", url: "https://www.thesill.com/blog/how-to-tell-how-much-light-your-plant-is-getting" },
  { label: "American Orchid Society — Light for Phalaenopsis", url: "https://www.aos.org/orchids/orchid-care/light.aspx" },
  { label: "UF/IFAS EP474 — Adenium obesum (patio / frost)", url: "https://edis.ifas.ufl.edu/publication/EP474" },
  { label: "University of Minnesota Extension — Propagating Monstera deliciosa", url: "https://extension.umn.edu/houseplants/propagating-monstera-deliciosa" },
  { label: "Clemson HGIC — Indoor Plants: Transplanting & Repotting", url: "https://hgic.clemson.edu/factsheet/indoor-plants-transplanting-repotting/" }
];

/* ============================================================
 * HOME WINDOWS — concrete, compass-referenced placement findings
 * for the user's actual home (Pflugerville, TX, ~30.4°N).
 *
 * This is the data behind the "Placement" tab's canvas-style view:
 * 9 real windows/zones across 2 floors + one outdoor patio, each with a light + humidity
 * profile and Thrive / Also-solid / Keep-out plant lists.
 *
 * Plants are referenced by PLANT id. An entry can be a bare id
 * ("mini_orchid") or an object { id, note } when the placement
 * needs a caveat ("set back from the direct beam").
 * ============================================================ */
const HOME_EXPOSURES = [
  { dir: "SE", range: "115–131°", sun: "Direct sun sunrise → early afternoon", bestFor: "Sun-lovers wanting gentle-to-moderate morning direct; bright-light tropicals" },
  { dir: "NE", range: "23–36°",  sun: "Gentle direct only in early morning",   bestFor: "Bright-indirect foliage, variegated plants, plants that scorch, terrariums" },
  { dir: "SW", range: "208–215°", sun: "Hot, intense direct sun afternoon → evening", bestFor: "Desert cacti & succulents, full-sun bloomers" },
  { dir: "NW", range: "298–301°", sun: "Direct sun late afternoon (summer), bright otherwise", bestFor: "Bright-light plants that can take a few hot late-day hours" }
];

const HOME_WINDOWS = [
  {
    id: "f1_bath", floor: "First floor", name: "Bathroom", bearing: "127° SE",
    tier: "Bright AM sun + humid",
    label: "1F · Bathroom",
    humidifier: { rec: "not-needed", note: "Already the most humid room downstairs — save the humidifier for a drier spot." },
    light: "Direct morning-to-midday sun, then bright.",
    humidity: "HIGH — showers keep it the most humid room downstairs.",
    thrive: ["mini_orchid", { id: "prayer_plant", back: true }, { id: "cordyline_fruticosa", back: true }, "wandering_dude", { id: "thai_constellation", back: true }, { id: "monstera", back: true }],
    solid: [{ id: "fittonia", note: "no direct", back: true }, { id: "ginseng_ficus_cutting", back: true }, { id: "dracaena_fragrans", back: true }, { id: "dracaena_fragrans_b", back: true }, { id: "monstera_water_cuttings", back: true }],
    avoid: "All succulents & cacti — String of Pearls, Haworthia, Lady Finger, Desert Rose rot in this humidity. Keep the cream-variegated tropicals just back from the direct beam.",
    keepOut: ["string_of_pearls", "haworthia", "lady_finger_cactus", "desert_rose", "assorted_cacti", "aloe_vera", "firestick", "sedum_angelina", "burrows_tail", "baby_burros_tail", "succulent_frankenstein_a", "succulent_frankenstein_b", "variegated_elephant_bush", "variegated_elephant_bush_bonsai", "kalanchoe"]
  },
  {
    id: "f1_room1", floor: "First floor", name: "Room 1", bearing: "131° SE · nightly fan",
    tier: "Bright AM sun + airflow",
    label: "1F · Room 1",
    humidifier: { rec: "skip", note: "The nightly overhead fan cancels out any humidifier — don't waste it here." },
    light: "Same SE morning sun as the bathroom.",
    humidity: "Drier — the overhead fan moves air all night (great pest/fungus deterrent, faster dry-down).",
    thrive: ["ginseng_ficus", "kalanchoe", "schefflera_dark", "snake_plant"],
    solid: ["succulent_frankenstein_b", "burrows_tail", "baby_burros_tail", "wandering_dude", { id: "zz_plant", back: true }, "aloe_vera"],
    avoid: "Humidity-lovers that hate moving air — Fittonia, Rattlesnake Calathea, Thai Constellation, Monstera go elsewhere.",
    keepOut: ["fittonia", "prayer_plant", "thai_constellation", "monstera", "mini_orchid", "terrarium_a", "terrarium_b"]
  },
  {
    id: "f1_corner", floor: "First floor", name: "Living room corner", bearing: "23° NE / 115° SE",
    tier: "Big vaulted room · dual light",
    label: "1F · Living Room (corner)",
    humidifier: { rec: "optional", note: "Low-impact here — this is the big vaulted living room open to the 2F, so its volume scatters a small humidifier. If you use it, huddle the foliage within 2–3 ft of the unit; otherwise rely on pebble trays." },
    light: "Two exposures (gentle NE early morning + SE morning/midday) in a big vaulted, double-height room open to the 2nd floor — tall, bright and airy with lots of ambient bounce. Usable plant-level light still comes from the windows, but it's the longest span of soft-to-moderate direct light in the house.",
    humidity: "Average — but the vaulted volume open to the 2F lets moisture disperse fast, so it's hard to raise humidity here.",
    thrive: [{ id: "monstera", back: true }, "schefflera", { id: "marble_queen_pothos", back: true }, { id: "pearls_jade_pothos", back: true }, { id: "philodendron_silver_stripe", back: true }, "ginseng_ficus"],
    solid: [{ id: "cordyline_fruticosa", back: true }, { id: "dracaena_fragrans", back: true }, { id: "dracaena_fragrans_b", back: true }, "snake_plant", "kalanchoe", { id: "zz_plant", back: true }, "haworthia", "baby_burros_tail", "string_of_pearls", "burrows_tail", { id: "pothos_combo", back: true }],
    avoid: "Nothing really struggles here — it's your best all-rounder. Deep-shade-only plants would be wasted on it.",
    keepOut: []
  },
  {
    id: "f1_window", floor: "First floor", name: "Living room window", bearing: "36° NE",
    tier: "Soft bright indirect · vaulted",
    label: "1F · Living Room (window)",
    humidifier: { rec: "skip", note: "Big vaulted room open to the 2F — a small humidifier's mist just dissipates into the volume and barely moves RH. Skip it here; humidify the enclosed 2F Room 2 instead and give any humidity-lovers you keep here pebble trays." },
    light: "Gentle morning sun only, bright indirect the rest of the day, in the big vaulted living room open to the 2nd floor — tall and airy, so the light stays soft and even. Still the safest window for foliage that scorches.",
    humidity: "Average — and the vaulted, double-height volume lets any added moisture dissipate quickly.",
    thrive: ["royal_ivy", "golden_pothos", "marble_queen_pothos", "pothos_combo", "terrarium_a", "terrarium_b", "zz_plant", "monstera_water_cuttings"],
    solid: [{ id: "prayer_plant", note: "add humidity" }, "monstera", "dracaena_fragrans", "dracaena_fragrans_b", "mondo_grass", "mini_orchid", "ginseng_ficus_cutting", "pearls_jade_pothos", "philodendron_silver_stripe"],
    avoid: "Full-sun desert plants (Desert Rose, Firestick, cacti) — not enough direct light to keep them tight & colored.",
    keepOut: ["desert_rose", "firestick", "lady_finger_cactus", "assorted_cacti", "sedum_angelina", "aloe_vera", "succulent_frankenstein_a", "variegated_elephant_bush", "variegated_elephant_bush_bonsai"]
  },
  {
    id: "f2_lr", floor: "Second floor", name: "Living room", bearing: "215° SW",
    tier: "Hot afternoon sun",
    label: "2F · Living Room",
    humidifier: { rec: "skip", note: "Desert cacti & succulents want it bone dry — never add the humidifier here." },
    light: "Intense SW afternoon/evening direct sun; 2nd-floor warmth on top. Texas summer sun at full strength.",
    humidity: "Low / average — warm and dry.",
    thrive: ["desert_rose", "firestick", "lady_finger_cactus", "assorted_cacti", "sedum_angelina", "aloe_vera", "succulent_frankenstein_a", "variegated_elephant_bush", "variegated_elephant_bush_bonsai"],
    solid: [{ id: "snake_plant", back: true }, "ginseng_ficus", { id: "burrows_tail", note: "acclimate slowly" }],
    avoid: "Cream/variegated tropicals, Fittonia, Rattlesnake Calathea, Thai — they'll scorch. Shield Haworthia from the harshest beam.",
    keepOut: ["fittonia", "prayer_plant", "thai_constellation", "monstera", "monstera_water_cuttings", "mini_orchid", "terrarium_a", "terrarium_b", "cordyline_fruticosa", "marble_queen_pothos", "pearls_jade_pothos", "golden_pothos", "pothos_combo", "philodendron_silver_stripe", "ginseng_ficus_cutting"]
  },
  {
    id: "f2_bath", floor: "Second floor", name: "Bathroom (rarely used)", bearing: "208° SW",
    tier: "Hot sun + patchy humidity",
    label: "2F · Bathroom",
    humidifier: { rec: "skip", note: "Sun-loving succulents + stagnant rarely-used air = rot risk. No humidifier." },
    light: "Hot SW afternoon direct sun, warm.",
    humidity: "Inconsistent — rarely used, so occasional humidity spikes with stagnant air. Tricky combo.",
    thrive: [{ id: "snake_plant", back: true }, "aloe_vera", "variegated_elephant_bush", "variegated_elephant_bush_bonsai", "firestick"],
    solid: ["ginseng_ficus", { id: "zz_plant", back: true }, "kalanchoe"],
    avoid: "Rot-prone desert plants that hate any humidity — Lady Finger Cactus (never a bathroom), String of Pearls, Desert Rose, Haworthia. Send those to the 2F living-room SW instead.",
    keepOut: ["lady_finger_cactus", "string_of_pearls", "desert_rose", "haworthia", "fittonia", "prayer_plant", "thai_constellation", "monstera", "mini_orchid", "terrarium_a", "terrarium_b"]
  },
  {
    id: "f2_room1", floor: "Second floor", name: "Room 1", bearing: "298° NW",
    tier: "Bright + late-day direct",
    label: "2F · Room 1",
    humidifier: { rec: "not-needed", note: "Mostly snake plant / ZZ / succulents here — they're happy in dry air; humidifier not needed." },
    light: "Late-afternoon/evening summer sun, bright indirect otherwise. Warm 2nd floor.",
    humidity: "Average / low.",
    thrive: ["snake_plant", { id: "zz_plant", back: true }, "ginseng_ficus", "schefflera", { id: "wandering_dude", back: true }, "variegated_elephant_bush", "variegated_elephant_bush_bonsai"],
    solid: [{ id: "monstera", back: true }, { id: "golden_pothos", back: true }, { id: "dracaena_fragrans", back: true }, { id: "dracaena_fragrans_b", back: true }, { id: "cordyline_fruticosa", back: true }, "haworthia", "baby_burros_tail", "string_of_pearls", "burrows_tail"],
    avoid: "Fittonia and terrariums (the late beam is too hot for them). Deep-humidity tropicals want the 1F bathroom.",
    keepOut: ["fittonia", "terrarium_a", "terrarium_b"]
  },
  {
    id: "f2_room2", floor: "Second floor", name: "Room 2", bearing: "301° NW",
    tier: "Bright indirect (twin of Rm 1)",
    label: "2F · Room 2",
    humidifier: { rec: "use", note: "BEST home for your one small humidifier — a smaller, ENCLOSED NW room that actually holds humidity (unlike the vaulted 1F living room). Cluster the humidity-lovers — Rattlesnake Calathea, Cordyline, Monstera, pothos group — within 2–3 ft of the unit and add a small fan on low to spread the plume." },
    light: "Identical light to Room 1 — split the collection: make this the bright-indirect foliage room, Room 1 the succulent/sun room.",
    humidity: "Average / low.",
    thrive: [{ id: "golden_pothos", back: true }, { id: "marble_queen_pothos", back: true }, { id: "pearls_jade_pothos", back: true }, { id: "philodendron_silver_stripe", back: true }, { id: "monstera", back: true }, { id: "zz_plant", back: true }, { id: "dracaena_fragrans", back: true }, { id: "dracaena_fragrans_b", back: true }],
    solid: [{ id: "prayer_plant", note: "add humidity", back: true }, { id: "royal_ivy", back: true }, { id: "terrarium_b", back: true }, { id: "cordyline_fruticosa", back: true }],
    avoid: "Full-sun cacti/Desert Rose (send to 2F SW). Keep the direct late beam off the pothos variegation midsummer.",
    keepOut: ["desert_rose", "lady_finger_cactus", "assorted_cacti", "firestick", "sedum_angelina", "aloe_vera", "succulent_frankenstein_a", "variegated_elephant_bush", "variegated_elephant_bush_bonsai"]
  },
  {
    id: "outdoor_f2_room2", floor: "Outdoors", name: "Outside 2F Room 2", bearing: "301° NW",
    tier: "Late-day sun · summer patio",
    label: "Outdoor · 2F Room 2 (NW)",
    humidifier: { rec: "skip", note: "Outdoors — skip the humidifier. Watch rain and overnight lows, not indoor RH." },
    light: "Same compass as indoor 2F Room 2 (301° NW): late-afternoon/evening summer sun plus open-sky brightness. Fewer direct hours than 2F SW (215°), but far more DLI than any indoor NW room. UF/IFAS wants 6+ hrs for Desert Rose flowers — this exposure is a good summer step-up, not a south-facing patio.",
    humidity: "Central Texas outdoor — humid mornings, thunderstorm pulses, then hot dry afternoons. Saucers must dump after rain (Adenium and Euphorbia rot in standing water).",
    thrive: ["desert_rose", "firestick"],
    solid: ["aloe_vera", "sedum_angelina", "lady_finger_cactus", "assorted_cacti", "variegated_elephant_bush", "variegated_elephant_bush_bonsai"],
    avoid: "Tropicals (Monstera, Calathea, Fittonia, water cuttings) will scorch. Bring desert plants in before nights ~50°F (typically late Oct in Pflugerville). Acclimate 7–14 days. ⚠️ Toxic sap + Moose: site pots off the dog path.",
    keepOut: ["monstera", "monstera_water_cuttings", "thai_constellation", "prayer_plant", "fittonia", "mini_orchid", "terrarium_a", "terrarium_b", "mondo_grass", "dracaena_fragrans", "dracaena_fragrans_b", "ginseng_ficus_cutting"]
  }
];

/* Special-case placement notes shown as callouts. tone ∈ warning|danger|info|neutral|success */
const HOME_PLACEMENT_NOTES = [
  { tone: "info", title: "💧 Your one small humidifier — where to put it", body: "A small humidifier only humidifies a tight pocket — realistically a 2–4 ft radius, not a whole room — and a big open volume defeats it entirely. So skip the bathrooms (already humid), the sunny/succulent rooms (want it dry), AND the 1F living room (vaulted and open to the 2F — the mist just dissipates). Best home: the enclosed 2F Room 2, which actually holds humidity. Cluster the fussy humidity-lovers — Rattlesnake Calathea, Fittonia, Mini Orchid, Thai Constellation, Cordyline, Monstera — within 2–3 ft of the unit, and add a small fan on low to spread the plume. Plants that benefit are tagged 💧 in the reference table and their focus view." },
  { tone: "info", title: "🏔️ The 1F living room is vaulted (open to the 2F)", body: "The downstairs living room has a double-height vaulted ceiling open to the second floor — tall, bright and airy with lots of ambient bounce, which keeps it your most versatile foliage space. But that same big open volume makes it the hardest room to humidify: a small humidifier can't keep up. Put the humidifier in the enclosed 2F Room 2 and rely on grouping + pebble trays for any humidity-lovers you keep downstairs." },
  { tone: "success", title: "Desert Rose + Firestick — summer patio (NW)", body: "Aug 2026 they sit outdoors on the same 301° NW heading as 2F Room 2. UF/IFAS (Adenium) and Missouri Botanical Garden / NC State (Euphorbia tirucalli): summer sun is correct; dump saucers after storms; acclimate; bring containers in before nights ~50°F. NW late-day sun is milder than 2F SW — good heat compromise, modest bloom potential. Keep both off Moose's path (toxic sap)." },
  { tone: "info", title: "ZZ Plant — 5\" pot, urgent stretch is done", body: "Aug 2026: up-potted 4\" → 5\" (Clemson HGIC: only 1–2\" larger). Hold water 7–10 days if rhizomes were nicked, then resume long dry-downs. It's now a normal bright-indirect plant — 1F Window, 2F Room 2 set back, etc." },
  { tone: "danger", title: "Rot-risk succulents stay out of bathrooms", body: "Lady Finger Cactus (never), String of Pearls, Haworthia and Desert Rose soften and rot above ~60% humidity. Their zone is the 2F SW living room plus the NW rooms — dry, bright, warm." },
  { tone: "info", title: "Fittonia — the humidity diva", body: "Wants 70%+ humidity but no direct sun. The 1F bathroom, set back from the SE beam, is its dream spot: steady moisture in the air, no scorch." },
  { tone: "info", title: "Terrariums — bright indirect only", body: "They make their own 80–95% humidity, so they don't need a bathroom. Park them at the 1F NE window; direct sun cooks the sealed glass and boils the plants inside." },
  { tone: "neutral", title: "Winter sun shifts south & low", body: "Nov–Feb the sun swings low and south: the SE/SW windows carry the load while N/NE windows go dim. Rotate light-hungry plants toward SE/SW for the winter." },
  { tone: "success", title: "Your two premium spots", body: "The 1F living-room corner (dual NE/SE light) is the most versatile home for fussy variegated foliage; the 2F SW living room is a desert powerhouse for every full-sun succulent and cactus you own." }
];

/* Per-plant light + humidity reference (the canvas reference table).
 * Keyed by PLANT id. flag ∈ info|warning|danger for a callout dot. */
const PLANT_LIGHT_REF = {
  prayer_plant:               { light: "Bright indirect, no direct",            humidity: "High 60%+ (fussy)",     best: "1F Bath (set back, humid), 1F Window (NE)", flag: "info", hum: true },
  monstera:                   { light: "Bright indirect",                        humidity: "High 60%+",             best: "1F Corner, 1F Bath — 4 air layers on plant", hum: true },
  monstera_water_cuttings:    { light: "Bright indirect (jar, no hot sun)",      humidity: "Avg 50%+",              best: "1F Window / Corner — water jar", flag: "info" },
  thai_constellation:         { light: "Bright indirect (needs more)",           humidity: "High 60–70%",           best: "1F Bath (set back), 1F Corner", hum: true },
  schefflera:                 { light: "Bright + 1–2h direct",                   humidity: "Avg 50–60%",            best: "1F Corner, 2F Rooms (NW) — 13.5\" pot" },
  schefflera_dark:            { light: "Bright + morning direct",                humidity: "Avg 50–60%",            best: "1F Corner, 1F Room 1" },
  mini_orchid:                { light: "Bright indirect + gentle AM",            humidity: "High 50–70%",           best: "1F Bathroom (best match)", hum: true },
  ginseng_ficus:              { light: "Bright + 2–4h direct",                   humidity: "Med 50–70%",            best: "2F LR (SW), 1F Room 1" },
  ginseng_ficus_cutting:      { light: "Bright indirect (establishing)",         humidity: "High 60–70%",           best: "1F Bathroom, 1F Window", hum: true },
  snake_plant:                { light: "Bright indirect + some direct",          humidity: "Any 20–80%",            best: "Flexible — 2F Bath, NW rooms" },
  aloe_vera:                  { light: "Full sun 4–6h",                          humidity: "Low 30–50%",            best: "2F LR (SW), 2F Bath" },
  mondo_grass:                { light: "Bright indirect / part shade",           humidity: "Avg 50–60%",            best: "1F Window (NE) — 9×9 pot" },
  firestick:                  { light: "Full sun 6h+ (summer patio)",            humidity: "Low 30–40%",            best: "Outdoor 2F Rm2 NW (summer); 2F LR SW (winter)", flag: "info" },
  kalanchoe:                  { light: "Bright + 2–4h AM direct",                humidity: "Avg 40–60%",            best: "1F Room 1, 1F Corner" },
  burrows_tail:               { light: "Bright + 2–3h gentle direct",            humidity: "Low 30–50%",            best: "1F Corner, NW rooms" },
  succulent_frankenstein_a:   { light: "Bright direct 4–6h",                     humidity: "Low 30–50%",            best: "2F LR (SW)" },
  succulent_frankenstein_b:   { light: "Bright indirect + AM direct",            humidity: "Low 30–50%",            best: "1F Room 1, 1F Corner" },
  dracaena_fragrans:          { light: "Bright indirect (filtered)",             humidity: "Avg 50–60%",            best: "1F Window, 1F Corner — Cane A 9×9" },
  dracaena_fragrans_b:        { light: "Bright indirect (filtered)",             humidity: "Avg 50–60%",            best: "1F Window, 1F Corner — Cane B 9×9" },
  cordyline_fruticosa:        { light: "Bright indirect 4h+",                    humidity: "High 50–70%",           best: "1F Bathroom, 1F Corner", hum: true },
  assorted_cacti:             { light: "Bright, mostly direct 4h+",              humidity: "Low 20–40%",            best: "2F LR (SW)" },
  royal_ivy:                  { light: "Bright indirect (E/N)",                  humidity: "Avg 50–60%",            best: "1F Window (NE)" },
  wandering_dude:             { light: "Bright indirect + 1–2h AM",              humidity: "High 50%+",             best: "1F Bathroom, 1F Room 1", hum: true },
  golden_pothos:              { light: "Bright indirect (tolerant)",             humidity: "Avg 30–50%+",           best: "Flexible — 1F Window, NW rooms" },
  pearls_jade_pothos:         { light: "Bright indirect (more)",                 humidity: "Avg 40–50%",            best: "1F Corner, 1F Window" },
  pothos_combo:               { light: "Bright indirect",                        humidity: "Avg–High 40–60%",       best: "1F Corner, 1F Window" },
  fittonia:                   { light: "Med-bright indirect, NO direct",         humidity: "High 70%+",             best: "1F Bath (set back)", flag: "info", hum: true },
  marble_queen_pothos:        { light: "Bright indirect (required)",             humidity: "Avg 50–60%",            best: "1F Corner, 1F Window" },
  philodendron_silver_stripe: { light: "Bright indirect",                        humidity: "Avg–High 50–60%+",      best: "1F Corner, 1F Window" },
  haworthia:                  { light: "Bright indirect + 1–2h gentle AM",       humidity: "Low, avoid >60%",       best: "1F Corner, NW rooms — not bathrooms", flag: "info" },
  sedum_angelina:             { light: "Full sun 4–6h+",                         humidity: "Low 30–50%",            best: "2F LR (SW)" },
  baby_burros_tail:           { light: "Bright indirect + 1–2h AM",              humidity: "Low 30–50%",            best: "1F Corner, NW rooms" },
  string_of_pearls:           { light: "Bright indirect + 1–3h gentle AM",       humidity: "Low 30–40%",            best: "1F Corner, NW rooms — not bathrooms", flag: "info" },
  lady_finger_cactus:         { light: "Full sun 4–6h+",                         humidity: "Low 30–40%",            best: "2F LR (SW) — NEVER a bathroom", flag: "danger" },
  variegated_elephant_bush:   { light: "Full/part sun 6h+",                      humidity: "Low–Med",               best: "2F LR (SW), 2F Bath" },
  variegated_elephant_bush_bonsai: { light: "Full/part sun 6h+",                 humidity: "Low–Med",               best: "2F LR (SW), 2F Bath" },
  zz_plant:                   { light: "Bright indirect (low-tolerant)",         humidity: "Any 20–70%",            best: "Flexible — now in 5\" pot" },
  desert_rose:                { light: "Full sun 6h+",                           humidity: "Low, avoid >60%",       best: "Outdoor 2F Rm2 NW (summer); 2F LR SW (winter)", flag: "info" },
  terrarium_a:                { light: "Bright indirect ONLY",                   humidity: "Self 80–95%",           best: "1F Window (NE) — no direct sun", flag: "info" },
  terrarium_b:                { light: "Bright indirect ONLY",                   humidity: "Self 80–95%",           best: "1F Window / NW room — no direct sun", flag: "info" }
};

/* ============================================================
 * Plant TODOs — static category metadata.
 *
 * Each todo created by the user picks one of these categories.
 * The TodoStore in watering.js handles persistence; rendering
 * and CRUD wiring live in app.js. Adding a new category here
 * makes it appear in the Todos tab quick-add and filter
 * dropdowns automatically.
 * ============================================================ */
/* ============================================================
 * Claude API — supported models for the in-app chat.
 *
 * Prices are USD per million tokens; check
 * https://www.anthropic.com/pricing for the live numbers. These
 * are used purely to compute a per-turn cost estimate after each
 * response (we read exact token counts from the API response).
 *
 * Models can change. To add a new one, just append an entry —
 * the chat's model picker reads from this array. The API key
 * is held in localStorage (see ClaudeSettings in watering.js).
 * ============================================================ */
const CLAUDE_MODELS = [
  { id: "claude-haiku-4-5",   label: "Haiku 4.5",   hint: "fast + cheap — quick care questions",       inUSD: 0.80,  outUSD: 4.00  },
  { id: "claude-sonnet-4-5",  label: "Sonnet 4.5",  hint: "balanced — good default",                   inUSD: 3.00,  outUSD: 15.00 },
  { id: "claude-opus-4-1",    label: "Opus 4.1",    hint: "most thorough — tricky diagnostics",        inUSD: 15.00, outUSD: 75.00 }
];
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-5";

const TODO_CATEGORIES = [
  { id: "repot",      icon: "🪴", label: "Repot",         hint: "Up-pot, refresh soil, divide rootbound roots" },
  { id: "fertilize",  icon: "🌱", label: "Fertilize",     hint: "Liquid feed, slow-release pellets, foliar spray" },
  { id: "prune",      icon: "✂️", label: "Prune",         hint: "Trim leggy growth, deadhead spent flowers, shape" },
  { id: "pest",       icon: "🐛", label: "Pest check",    hint: "Inspect undersides of leaves for thrips, spider mites, mealybugs" },
  { id: "propagate",  icon: "🌿", label: "Propagate",     hint: "Take cuttings, divide pups, layer aerial roots" },
  { id: "clean",      icon: "🧴", label: "Clean leaves",  hint: "Wipe dust, neem-oil mist, leaf shine" },
  { id: "rotate",     icon: "🔄", label: "Rotate pot",    hint: "Quarter-turn so all sides get even light" },
  { id: "soil",       icon: "🌍", label: "Soil refresh",  hint: "Top-dress with fresh mix, scratch in amendment" },
  { id: "photo",      icon: "📷", label: "Photo update",  hint: "Snap a fresh photo for the care guide" },
  { id: "other",      icon: "📝", label: "Other",         hint: "Anything else worth tracking" }
];
const TODO_CATEGORY_MAP = TODO_CATEGORIES.reduce((m, c) => (m[c.id] = c, m), {});
