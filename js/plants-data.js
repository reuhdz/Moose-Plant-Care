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
      "Roots circling visibly at the drainage holes on the bottom of the 6.5\" pot",
      "Water pours straight through in <5 seconds — no absorbency left",
      "Prayer leaves stop closing (or partially close) at night — root-stress signal",
      "New leaves come in noticeably smaller than the previous flush",
      "Soil pulling away from the pot walls even a few days after a soak",
      "Growth stalls in growing season (Mar–Oct) despite proper light and watering"
    ],
    displayName: "Prayer Plant",
    potSize: '6.5"',
    category: "tropical",
    names: {
      common: ["Prayer Plant", "Red-veined Prayer Plant", "Herringbone Plant"],
      scientific: "Maranta leuconeura"
    },
    wateringDays: 6,
    wateringDaysHot: 5,
    wateringDaysCool: 9,
    currentSoilMix: "standard_potting",
    comments: "Current crispy brown tips, lots of leaves dying off before this stabilizes. Likely a humidity + tap-water-fluoride combo — see troubleshooting tips. Repotted in last 2 months into 80/20 potting/perlite (6.5\" pot).",
    idealSoil: ["standard_potting", "amended_potting", "african_violet"],
    soilNotes: "User has it in 80/20 potting/perlite — solid choice for this moisture-loving plant. The slight perlite boost prevents waterlogging while keeping enough retention for those thin leaves.",
    conditions: {
      light:        { ideal: "Bright, indirect — east window or filtered south/west", passing: "Medium indirect; tolerates lower light but growth slows" },
      temperature:  { ideal: "65–80°F (18–27°C)", passing: "60–85°F; avoid drafts and anything below 55°F" },
      humidity:     { ideal: "50–60%+ — pebble tray, humidifier, or grouping plants", passing: "40%+; below 40% causes crispy edges" },
      soilMoisture: { ideal: "Evenly, lightly moist", passing: "Top 1 inch dry between waterings; never bone-dry" }
    },
    tips: {
      lighting: "Bright, INDIRECT light is ideal. Direct sun scorches leaves and fades the iconic red veins. An east-facing window is perfect; a few feet back from a south/west window also works. Tolerates lower light but new leaves will be smaller and the plant will stretch. If the plant stops folding its leaves at night, it's a sign of light stress.",
      soil: "Light, airy, slightly acidic (pH 5.5–6.5) mix that holds moisture but never stays soggy. Maranta has shallow, fine root systems — heavy peat-only mixes compact and suffocate them.\n\nIDEAL DIY MIX (parts by volume):\n• 2 parts peat moss OR coco coir (fine-textured base — holds moisture, slightly acidic)\n• 1 part perlite (drainage + aeration)\n• 1 part orchid bark (small-grade — creates air pockets without compacting)\n• 1 tablespoon horticultural charcoal per gallon of mix (discourages fungus gnats + absorbs excess salts)\n• Optional: handful of worm castings for slow-release nutrition\n\nQUICK SHORTCUTS:\n• African violet mix + 25% extra perlite (you already have the right idea with 80/20 potting/perlite — adding a handful of orchid bark would improve it further).\n• Espoma 'Organic Indoor' or 'Espoma African Violet' as a base, with added perlite.\n• Pre-mixed 'Calathea / Maranta / Prayer Plant' mixes (Soil Sunrise, Soil Ninja, Sungro) work directly.\n\nAVOID:\n• Pure peat (compacts and stays soggy).\n• Cactus / succulent mix (drains too fast for Maranta's moisture-loving roots).\n• Garden soil (compacts + brings pests + wrong pH).\n• Any mix labeled 'moisture control' with hydrogel crystals — these hold TOO much water for Maranta and trigger root rot.",
      watering: "Keep the soil consistently lightly moist — never bone dry, never soggy. Water when the top ~1 inch feels dry to the touch (usually every 5–7 days warm season, every 8–10 days cool season).\n\n• Use FILTERED, distilled, or rainwater. Marantas are very sensitive to chlorine, fluoride, and dissolved salts in tap water — crispy brown edges are the #1 sign.\n• Let tap water sit out 24 hours if filtered/distilled isn't available.\n• Water at the soil line, not over the foliage.\n• Empty the saucer 15 minutes after watering — wet feet causes root rot.",
      pruning: "Snip yellow, brown, or crispy leaves at the base with clean scissors. A light shaping prune in early spring encourages bushier growth.\n\nTools: sharp scissors or pruning snips, sterilized with rubbing alcohol between cuts.\nWhen: anytime to remove dead foliage; major shaping in March–April.\nFrequency: a quick groom once a month keeps it tidy.",
      propagation: "Easiest by DIVISION during repotting: gently separate root clumps that each have their own growth points and stems. Replant in fresh moist mix.\n\nStem cuttings: take a 4\" cutting with 1–2 nodes, place in water (change weekly) or moist sphagnum moss; roots in 3–4 weeks. Switch to soil once roots are ~1\" long.\n\nBest season: late spring / early summer. Success rate: very high with division (~90%), moderate with cuttings (~60%).",
      repotting: "Every 2 years or when roots visibly circle the bottom of the pot or come out the drainage holes. Marantas like being slightly snug — a too-large pot holds excess wet soil and triggers root rot.\n\nWHEN TO REPOT:\n• Spring (March–May) is ideal — active growth helps roots recover quickly.\n• Roots circling visible at drainage holes or from the surface.\n• Water drains too fast (soil has broken down and isn't holding moisture).\n• Plant has been in the same pot for 2+ years.\n• You see white salt crust on the surface (despite flushing) — soil chemistry is exhausted.\n\nMATERIALS:\n• New pot: ONLY 1–2 inches larger in diameter than the current one (your 6.5\" current → 7.5–8\" next).\n• Fresh prayer plant soil mix (see Soil tip for the recipe).\n• Sterilized scissors or pruning snips.\n• Clean workspace (newspaper or a tray to catch soil).\n• Optional: a saucer + new drainage tray.\n\nSTEP-BY-STEP REPOT:\n1. Water the plant 1–2 days BEFORE repotting — slightly moist (not soggy) roots are easier to handle and less likely to snap.\n2. Tip the pot sideways and gently coax the plant out. Tap the rim against a table edge if it's stuck.\n3. Examine the rootball:\n   • Healthy roots = white/cream, firm.\n   • Dead/rotted = brown, mushy, smelly. Trim these off cleanly with sterile scissors.\n   • Circling roots = score 3–4 vertical cuts down the side of the rootball with a clean knife. This forces new roots outward instead of continuing to circle.\n4. Place 1\" of fresh soil at the bottom of the new pot.\n5. Center the plant. The top of the rootball should sit ~1\" below the pot rim (leaves room for water without overflow).\n6. Fill around the sides with fresh soil. DON'T pack it hard — Maranta likes airy soil. Gently firm only the very top to keep the plant upright.\n7. Water lightly (just enough to settle the soil) with FILTERED room-temp water. Don't drench the first time.\n8. Place in INDIRECT light (no direct sun for 1 week — the plant is in shock and can sunburn).\n9. Hold off heavy watering for 7–10 days to let any nicked roots callus.\n10. Resume normal care after 2 weeks; expect 1–2 weeks of pouting (drooping, less leaf folding at night) — this is NORMAL post-repot shock.\n\nPOST-REPOT TROUBLESHOOTING:\n• Leaves drooping for >2 weeks → check soil moisture. If wet, you may have root damage; if dry, water lightly.\n• New leaves smaller than expected for 6 weeks → normal recovery period.\n• Leaves yellowing en masse → over-watering during recovery; let dry out slightly.\n• Stops folding at night entirely → severe stress; check light + humidity.\n\n⚠️ DON'T:\n• Repot in fall or winter (slow growth = slow root recovery).\n• Use a pot more than 2\" larger (excess soil holds water → rot).\n• Fertilize for 4–6 weeks after repot (fresh soil already has nutrients; new fertilizer burns recovering roots).\n• Use unsterilized tools or recycled soil from another plant (introduces pathogens).",
      feeding: "Balanced liquid fertilizer (10-10-10 or 20-20-20) diluted to HALF strength, every 4 weeks during spring and summer. Stop feeding entirely in fall/winter.\n\nAlternatives: worm castings top-dress every 2 months, or a slow-release pellet (Osmocote) in spring.\n\nIMPORTANT: flush the soil with plain water every 2 months to prevent fertilizer salt buildup, which Marantas hate.",
      troubleshooting: "• Crispy brown leaf tips/edges → low humidity OR chemicals in tap water. Switch to filtered water + raise humidity above 50%.\n• Yellow leaves → overwatering or root rot — check roots, let dry out a bit, repot in fresh mix if mushy.\n• Leaves not folding up at night → not enough light OR root stress.\n• Faded/pale leaves with little red → too much direct light.\n• Curling leaves → underwatering or low humidity.\n• Spider mites (fine webs, stippled leaves) → rinse foliage, spray with insecticidal soap or neem oil weekly until clear.\n• Fungus gnats → let soil dry out more between waterings; use sticky traps."
    },
    sources: [
      { label: "Missouri Botanical Garden — Maranta leuconeura", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=287436" },
      { label: "University of Florida IFAS — Prayer Plant", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/prayer-plant.html" },
      { label: "The Sill — Prayer Plant Care Guide", url: "https://www.thesill.com/blog/plant-care-prayer-plants" },
      { label: "Costa Farms — How to Grow Prayer Plant", url: "https://costafarms.com/plants/prayer-plant" },
      { label: "RHS — Maranta leuconeura", url: "https://www.rhs.org.uk/plants/search-results?query=maranta" },
      { label: "Clemson Cooperative Extension — Tropical Houseplants", url: "https://hgic.clemson.edu/factsheet/houseplants-foliage/" }
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
    comments: "Repotted from 10\" → 13.5\" pot in last 2 months, BUT the original root ball is still in the store potting medium (only the outer soil was replaced). Watch for inconsistent moisture between the inner peat-heavy core and the outer amended mix — water deeply and let the whole rootball dry uniformly between waterings.",
    idealSoil: ["aroid_mix", "amended_potting", "standard_potting"],
    soilNotes: "User has 60/30 potting/perlite (close to amended_potting). A true aroid mix with orchid bark would be even better for aerial root health, but the current blend is workable. ⚠️ Original root ball still in store soil — next repot, bare-root the core and switch fully to amended mix.",
    conditions: {
      light:        { ideal: "Bright, indirect — 6+ hrs near a bright window", passing: "Medium indirect; lower light = fewer/smaller fenestrations" },
      temperature:  { ideal: "68–80°F (20–27°C)", passing: "60–90°F; nothing below 50°F" },
      humidity:     { ideal: "60%+", passing: "40–50%; tolerates average home humidity" },
      soilMoisture: { ideal: "Top 2\" dry between deep waterings", passing: "Tolerates some drying; overwatering kills faster than under" }
    },
    tips: {
      lighting: "Bright, indirect light produces the largest leaves and the most fenestrations (the iconic splits and holes). Tolerates medium light but grows slowly with smaller, less-split leaves.\n\n• Avoid harsh direct afternoon sun — leaves burn.\n• Early morning sun (east window) is great.\n• Rotate the pot 1/4 turn every 2 weeks so all vines get even light.\n• If you have grow lights, 10–12 hrs of bright indirect-equivalent works well in winter.",
      soil: "Chunky, well-draining AROID mix. Recipe: 1 part standard potting soil + 1 part orchid bark + 1 part perlite + handful of horticultural charcoal + handful of coco coir. Slightly acidic (pH 5.5–7.0).\n\nReady-made aroid mixes (e.g. Sungro, Soil Sunrise) work fine; just confirm there's visible chunky bark and perlite.",
      watering: "Water THOROUGHLY when the top 2 inches of soil are dry. Drench until water flows out the drainage holes, then empty the saucer.\n\n• Frequency for a 14\" pot: ~7–10 days warm season, ~12–16 days cool season.\n• Use a moisture meter or stick your finger in — don't water by calendar alone in a different climate.\n• Lift-the-pot test: if it feels noticeably lighter than after watering, it's time.\n• Overwatering is the #1 killer. Drooping with wet soil = root rot, not thirst.",
      pruning: "Prune in spring/early summer when growth is active.\n\n• Cut just above a NODE (the bump where leaves/aerial roots emerge) at a 45° angle. New growth emerges from below the cut.\n• Save cuttings for propagation.\n• Remove damaged or wayward vines to encourage bushier growth.\n• Wipe leaves with a damp microfiber cloth monthly so they photosynthesize efficiently.\n• Don't remove more than 1/3 of the plant's mass at once.",
      propagation: "Stem cuttings with at LEAST one node and ideally an aerial root.\n\n• Method A (water): place in clean water, change weekly, roots appear in 3–6 weeks; transplant when roots are 2–3\" long.\n• Method B (sphagnum moss): wrap node in moist sphagnum, place in clear container with high humidity; roots faster (~3 weeks).\n• Method C (air-layering): wrap a node still attached to the parent in moist sphagnum + plastic wrap; cut and pot once roots form.\n\nSpring/summer best; success rate ~80%+.",
      repotting: "Every 2–3 years or when heavily root-bound. With a 14\" pot you may be at terminal indoor size — instead, TOP-DRESS with fresh soil yearly (scoop out the top 2\" and replace) and prune roots if needed.\n\nAdd a MOSS POLE or trellis to support vines and encourage larger leaves with more fenestrations. Tie vines gently with plant ties; aerial roots will grip the moss when kept moist.",
      feeding: "Balanced liquid fertilizer (20-20-20) at HALF strength every 4 weeks in spring/summer. Slow-release granular pellets (Osmocote) in spring are an easy alternative.\n\nFlush soil with plain water every 2–3 months to prevent fertilizer salt buildup.\nWinter: no fertilizer unless under strong grow lights.",
      troubleshooting: "• Yellow leaves → most often overwatering. Check soil moisture and drainage; pull plant out and inspect roots if persistent.\n• Brown crispy edges → underwatering or low humidity.\n• No fenestrations on new leaves → not enough light OR plant is still young (juvenile leaves are solid).\n• Leggy growth with small leaves → insufficient light; consider moving closer to window or adding a grow light.\n• Aerial roots everywhere → totally normal — guide them into the soil or onto a moss pole.\n• Drooping → check soil: if dry, water; if wet, suspect root rot.\n• Black spots on stems → bacterial leaf spot; remove affected parts, improve airflow.\n• ⚠️ Toxic to pets and humans if chewed (insoluble calcium oxalates)."
    },
    sources: [
      { label: "Missouri Botanical Garden — Monstera deliciosa", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=274375" },
      { label: "University of Wisconsin Horticulture — Monstera deliciosa", url: "https://hort.extension.wisc.edu/articles/monstera-deliciosa-split-leaf-philodendron/" },
      { label: "RHS — Monstera deliciosa", url: "https://www.rhs.org.uk/plants/11281/monstera-deliciosa/details" },
      { label: "The Sill — Monstera Care Guide", url: "https://www.thesill.com/blog/plant-care-monstera-deliciosa" },
      { label: "Costa Farms — Monstera Care", url: "https://costafarms.com/plants/monstera" },
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
      lighting: "Thai Constellation needs MORE light than standard green Monstera because the cream/yellow variegated sections have no chlorophyll — the green sections do all the photosynthesis for the whole plant.\n\n• Best spot: 1–3 feet from an east-facing window (gentle morning sun), OR 4–6 feet back from a south/west window with sheer curtain.\n• Direct hot afternoon sun BURNS the cream sections — they'll scorch crispy brown irreversibly within a single afternoon.\n• Grow lights at 12,000–20,000 lux for 10–12 hrs/day work excellently for Thai Cons in winter.\n• Watch the variegation: if new leaves emerge with LESS cream, the plant is conserving chlorophyll because light is too low — move brighter.\n• Watch the older leaves: if cream sections turn brown and crispy, light is too direct.\n• Rotate the pot 1/4 turn weekly so all leaves develop balanced variegation.",
      soil: "ABSOLUTELY MUST be a chunky aroid mix. Standard potting mix WILL kill Thai Constellation within 6–12 months because the slow root metabolism + reduced chlorophyll = much higher rot susceptibility.\n\nRecipe (parts by volume):\n• 2 parts orchid bark (medium grade, fir bark)\n• 2 parts perlite (chunky, not powder)\n• 1 part coco coir OR peat moss\n• 1 part horticultural charcoal\n• Handful of worm castings (slow-release nutrition)\n\nPre-mixed alternatives: 'Aroid Mix' from Soil Sunrise, Soil Ninja, or 'Special Blend' from Premier Tech. Confirm visible bark + perlite chunks.",
      watering: "Water THOROUGHLY when the top 1–2 inches are dry. Drench until water drains from the bottom; empty saucer within 15 min.\n\n• Frequency in 5\" pot: ~8–10 days warm season, ~14–16 days cool season (LONGER than green Monstera due to slower metabolism).\n• Use room-temperature filtered, distilled, or rainwater — Thai Cons is sensitive to fluoride and chlorine (browning on white sections).\n• Lift-the-pot test: significantly lighter than after watering = time to water.\n• ⚠️ OVERWATERING is the #1 killer of Thai Cons (more so than green Monstera). When in doubt, wait 2 more days.\n• If the plant droops with WET soil → root rot. Remove from pot, inspect roots, trim mushy ones, repot in fresh dry aroid mix.\n• If it droops with DRY soil → just thirsty, recovers in 4–6 hours after watering.",
      pruning: "Minimal pruning needed (slow grower).\n\n• Cut just above a NODE (the bump where leaves/aerial roots emerge) at 45° with sterile scissors.\n• REMOVE all-white/cream-only new leaves at the node — without any green, they can't photosynthesize and will starve the plant. Don't worry, this is normal Thai Con behavior.\n• Save every cutting — Thai Constellation propagates well and the cuttings are highly valuable (sell or trade with other collectors).\n• Wipe leaves with a damp microfiber cloth monthly — dust on cream sections especially blocks the limited light they reflect.\n• ⚠️ DON'T over-prune. Thai Cons grows slowly; aggressive pruning takes 6+ months to recover from.",
      propagation: "Stem cuttings with at LEAST 1 node and ideally an aerial root. Propagation IS possible but slower than green Monstera.\n\nMethod A (water): place cutting in clean water with node submerged, change water weekly, roots in 4–8 weeks (vs. 3–6 for green). Transplant when roots are 2–3\" long. Success rate 70–80%.\n\nMethod B (sphagnum moss): wrap node in moist sphagnum, place in clear container with high humidity (humidity dome or zip-top bag with airflow), check weekly. Roots in 4–6 weeks. Success rate 80%+.\n\nMethod C (air-layering): wrap an aerial-rooted node still attached to the parent in moist sphagnum + plastic wrap; cut after roots form. Highest success rate (90%+) but slowest (6–10 weeks).\n\nBest season: late spring / early summer.\n\nKEY: cuttings must have at least ONE node with both green AND cream tissue to ensure the variegation is passed on. All-green cuttings make all-green plants (and vice versa for all-cream).",
      repotting: "Slow grower — only repot when truly root-bound (every 2–3 years).\n\n• Current 5\" pot: expect to upsize to 6\" at year 2.\n• Up-pot by only 1\" diameter — overpotting is dangerous because more soil = more water retention = more rot risk.\n• Best season: spring (March–May) when active growth resumes.\n• When repotting: bare-root carefully, prune any dead/circling roots, replace 100% of the soil with fresh aroid mix.\n• Optional power move: add a 18–24\" moss pole or coir totem to the new pot — Thai Constellation leaves develop bigger fenestrations and more dramatic variegation when allowed to climb.",
      feeding: "Light feeder due to slow growth.\n\n• Balanced liquid fertilizer (20-20-20) at QUARTER strength every 6 weeks during spring/summer. Half-strength can burn the cream sections.\n• Slow-release Osmocote pellets in spring at half the package rate is an alternative.\n• Foliar spray with diluted seaweed extract once a month boosts variegation richness (the trace minerals matter for chlorophyll partitioning).\n• Flush soil with plain water every 2 months to clear salt buildup.\n• No fertilizer Oct–Feb.\n• ⚠️ Over-fertilizing causes brown crispy edges on white sections — they have no buffer capacity. Less is more.",
      troubleshooting: "• Brown crispy cream sections → too much direct sun OR low humidity OR mineral buildup. Filter water, raise humidity, move out of direct sun.\n• Yellow leaves → most often OVERWATERING. Check roots, let dry out fully.\n• New leaves with LESS cream than older ones → light too low, plant is conserving chlorophyll. Move brighter.\n• New leaves with MORE cream than older ones → great variegation but watch — if a fully-white leaf emerges, prune it (it'll starve the plant).\n• Stunted / no new leaves for 3+ months → normal in winter; in summer means light too low or root issue.\n• Black spots on leaves → bacterial leaf spot from overwatering + poor airflow. Remove affected leaves, improve airflow, treat with copper fungicide if persistent.\n• Aerial roots everywhere → totally normal for Monstera. Guide them into the soil or onto a moss pole; they help anchor the plant and absorb humidity.\n• Spider mites (fine webs, stippled leaves) → rinse foliage weekly, treat with insecticidal soap or neem oil.\n• Mealybugs (white cottony spots in leaf crevices) → dab with 70% isopropyl on cotton swab.\n• ⚠️ TOXIC to pets and humans if chewed (insoluble calcium oxalates). Keep out of reach of cats."
    },
    sources: [
      { label: "Missouri Botanical Garden — Monstera deliciosa (parent species)", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=274375" },
      { label: "RHS — Monstera deliciosa", url: "https://www.rhs.org.uk/plants/11281/monstera-deliciosa/details" },
      { label: "University of Florida IFAS — Monstera", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/monstera-deliciosa.html" },
      { label: "Costa Farms — Monstera Care", url: "https://costafarms.com/plants/monstera" },
      { label: "The Sill — Monstera Variegated Care", url: "https://www.thesill.com/blog/plant-care-monstera-deliciosa" },
      { label: "ASPCA — Monstera Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/monstera-deliciosa" },
      { label: "American Horticultural Society — Variegated Houseplant Care", url: "https://www.ahsgardening.org/" }
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
      lighting: "Bright light including 2–4 hours of direct sun is ideal. A south or west window is best. Tolerates medium light but leaves shrink and become sparser.\n\n• Rotate weekly for even growth.\n• If moving outdoors for summer, transition gradually over 1–2 weeks to avoid leaf drop and sunburn.\n• Acclimate back indoors equally gradually in fall (drop in light = leaf drop is normal but reversible).\n• Supplemental grow lights in winter prevent excessive leaf drop.",
      soil: "FAST-DRAINING bonsai mix is essential. Classic blend:\n• 1 part akadama (or fine pine bark)\n• 1 part pumice\n• 1 part lava rock (or coarse perlite)\n\nStandard potting soil retains too much water for a bonsai pot and causes root rot.\n\nRepot media should be sifted to remove dust — fines clog drainage.",
      watering: "Water when the top of the soil feels just dry to the touch — usually every 5–7 days warm season, every 9–11 days cool season. Bonsai pots dry FAST.\n\n• Soak THOROUGHLY until water runs out the bottom.\n• Alternative: submerge the pot in water 5 minutes until bubbling stops, then drain.\n• Never let the rootball completely dry (causes irreversible leaf drop).\n• Never let it sit in standing water (root rot).\n• Mist foliage every few days in winter to discourage spider mites.",
      pruning: "Tolerates aggressive pruning — one of bonsai's most forgiving species.\n\n• Trim new shoots back to 2–3 leaves once they've grown to 6–8 leaves to maintain shape and ramification.\n• Major structural pruning: spring, just before new growth.\n• Wiring: year-round, but check weekly that wire isn't cutting into thickening branches.\n• Use sharp clean concave cutters for trunk cuts to encourage flat callus healing.\n• Defoliation (removing all leaves) once every 2–3 years in early summer forces smaller, denser regrowth.",
      propagation: "• HARDWOOD CUTTINGS (best): take 4–6\" cuttings in spring/summer, strip bottom leaves, dip in rooting hormone (e.g. IBA), insert into moist perlite/peat mix, cover with humidity dome, roots in 4–8 weeks. Success rate ~70%.\n• AIR-LAYERING: very effective for thick branches; girdle bark in a ring, wrap with moist sphagnum + plastic, roots in 6–12 weeks.\n• Seeds: slow and not worth the effort for the cultivar.",
      repotting: "Every 2–3 years in EARLY SPRING just before new growth pushes.\n\n• Trim ~1/3 of the roots — rake out, prune circling roots, comb out fine roots.\n• Refresh with new bonsai soil; secure tree with wire through drain holes.\n• The thickened \"ginseng\" caudex can be raised slightly during each repot to expose more woody trunk.\n• Don't fertilize for 4–6 weeks after repot.",
      feeding: "HEAVY FEEDER when growing strongly.\n\n• Balanced organic bonsai fertilizer (e.g. Biogold, fish/seaweed emulsion, 6-6-6) every 2 weeks spring/summer.\n• Monthly in fall.\n• None in winter unless actively growing under lights.\n• Solid pellets (Biogold cakes) placed on soil surface release nutrients with each watering.",
      troubleshooting: "• Sudden leaf drop → reaction to environmental change (light, temp, location, watering schedule). Stabilize conditions; new growth usually returns in 2–4 weeks.\n• Yellow leaves → overwatering most likely; sometimes underwatering if dry and crispy.\n• Sticky residue / tiny brown bumps → SCALE insects. Wipe off with alcohol-soaked cotton swab; treat with neem or systemic.\n• White webs and stippled leaves → SPIDER MITES (common in dry indoor air). Rinse foliage; treat with insecticidal soap weekly until clear.\n• Aerial roots growing → totally normal; train into the soil, weave together, or trim.\n• White fuzzy spots → MEALYBUGS; dab with alcohol, treat with neem.\n• ⚠️ Sap is mildly irritating and contains latex — wash hands after pruning; not pet-safe."
    },
    sources: [
      { label: "Bonsai Empire — Ficus Bonsai Care", url: "https://www.bonsaiempire.com/tree-species/ficus" },
      { label: "American Bonsai Society — Species Guide", url: "https://absbonsai.org/species-guide/" },
      { label: "Missouri Botanical Garden — Ficus microcarpa", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275193" },
      { label: "Bonsai4Me — Ficus microcarpa Care", url: "http://www.bonsai4me.com/SpeciesGuide/Ficus.html" },
      { label: "RHS — Ficus microcarpa", url: "https://www.rhs.org.uk/plants/search-results?query=ficus+microcarpa" },
      { label: "Bonsai Mirai — Tropicals Indoor Care", url: "https://live.bonsaimirai.com/" }
    ]
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
      lighting: "Extremely adaptable — from low light to bright indirect; tolerates a few hours of direct sun.\n\n• Best growth: bright indirect light (e.g. east-facing or filtered south window).\n• Low light is survivable but variegation fades and growth nearly stops.\n• Move outside in dappled shade for summer if desired — acclimate over 2 weeks.",
      soil: "GRITTY, FAST-DRAINING cactus/succulent mix. Recipe:\n• 2 parts cactus mix\n• 1 part perlite\n• 1 part coarse sand or pumice\n\nWet feet = certain death. Choose terracotta over plastic for the same reason.",
      watering: "Water DEEPLY but INFREQUENTLY. Let soil dry COMPLETELY between waterings.\n\n• Summer: every 2–3 weeks.\n• Winter: every 4–6 weeks (sometimes longer in a cold room).\n• Easier to underwater than overwater — when in doubt, wait another week.\n• Water the SOIL, not the leaves. Standing water in the central crown causes rot.\n• In a 7\" pot, drench until water runs out, then dump the saucer.",
      pruning: "Minimal pruning needed.\n\n• Cut damaged leaves at the soil line with clean scissors — they won't regrow from a cut.\n• Remove brown tips with diagonal cuts mimicking the natural leaf shape.\n• To control height, remove the tallest leaves at the base.",
      propagation: "Three easy methods:\n\n1. DIVISION (highest success): at repot, separate rhizomes with their own roots and leaves. Pot up immediately. Success ~95%.\n2. LEAF CUTTINGS IN WATER: cut a leaf into 3–4\" sections, mark the bottom end (matters!), let callous 24 hrs, place bottom-end down in water. Roots in 4–8 weeks; pups in 2–4 months.\n3. LEAF CUTTINGS IN SOIL: same prep, insert into dry succulent mix; water sparingly. Slower but reliable.\n\n⚠️ Variegated cultivars (golden edges, e.g. 'Laurentii') may LOSE variegation when propagated by leaf — use division to preserve it.",
      repotting: "Every 3–4 years or when roots/rhizomes crack the pot. Snake plants actually LIKE being root-bound.\n\n• Spring (March–May) is best.\n• Up-pot by only 1–2 inches.\n• Use a HEAVY pot (terracotta or stoneware) — tall plants tip easily in plastic.\n• Top-dress with gravel for a cleaner look + slug deterrent if outdoors.",
      feeding: "LIGHT feeder.\n\n• Cactus/succulent fertilizer at half strength every 6–8 weeks in spring/summer.\n• None in winter.\n• Overfertilizing causes leaf collapse and salt burn.",
      troubleshooting: "• Mushy base / yellow leaves falling over → ROOT ROT from overwatering. Unpot, cut away rotten roots/rhizomes with sterilized scissors, let dry 24 hrs, repot in dry mix; don't water for 2 weeks.\n• Wrinkled, curling leaves → severely underwatered. Soak thoroughly.\n• Brown crispy tips → inconsistent watering OR fluoride in tap water. Try filtered water.\n• Leaves leaning/floppy → too little light or too-large pot.\n• White cottony spots → MEALYBUGS. Dab with alcohol; treat with neem.\n• Leaves splitting → cold damage or physical injury (splits don't heal).\n• Mushroom-like growth at base → fungal; improve airflow, reduce watering.\n• ⚠️ Mildly toxic to pets if chewed (saponins) — keeps them out of reach is safest."
    },
    sources: [
      { label: "Missouri Botanical Garden — Dracaena trifasciata", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=284756" },
      { label: "University of Florida IFAS — Snake Plant", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/snake-plant.html" },
      { label: "NASA Clean Air Study (1989) — Wolverton, B.C.", url: "https://ntrs.nasa.gov/citations/19930073077" },
      { label: "ASPCA — Snake Plant Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/snake-plant" },
      { label: "RHS — Sansevieria / Dracaena trifasciata", url: "https://www.rhs.org.uk/plants/search-results?query=sansevieria+trifasciata" },
      { label: "The Sill — Snake Plant Care", url: "https://www.thesill.com/blog/plant-care-snake-plant" }
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
      lighting: "BRIGHT light with 4–6+ hours of direct sun is ideal. A south or west window is best.\n\n• Pale, leggy, or floppy leaves = needs MORE light.\n• If moving outside, harden off slowly over 1–2 weeks to avoid sunburn (purplish or bleached leaves).\n• Sunstressed aloe develops a slight blush — this is normal and healthy in moderation.\n• Rotate 1/4 turn weekly so the rosette grows symmetrically.",
      soil: "GRITTY cactus/succulent mix.\n\nRecipe:\n• 1 part cactus mix\n• 1 part coarse perlite\n• 1 part pumice or coarse sand\n\nTerracotta pot strongly recommended — it wicks moisture away from roots between waterings.",
      watering: "SOAK-AND-DRY.\n\n• Water DEEPLY until water runs out the drainage holes.\n• Let soil dry COMPLETELY before next watering (typically every 2.5–3 weeks summer, every 4–5 weeks winter).\n• The pot should feel noticeably light when ready.\n• Lower leaves wrinkling slightly = thirsty.\n• NEVER let the rosette sit in water — crown rot is fatal.\n• Don't water on hot afternoons — wait until evening to avoid leaf scorch from droplets.",
      pruning: "Cut outer/lower leaves at the base with a clean sharp knife — these are the oldest and have the most gel.\n\n• Remove dead/damaged leaves anytime.\n• Don't prune more than 1/3 of the plant at once.\n• To harvest gel: slice off a mature outer leaf, stand it upright for 10 minutes to drain yellow aloin sap (can irritate skin), then slice off the green skin to expose the gel.",
      propagation: "Easiest from PUPS (offsets):\n\n• Wait until pups are 3\"+ with their own roots.\n• Twist or cut from the parent at the base.\n• Let callous 1–2 days in shade.\n• Plant in DRY succulent mix.\n• Wait 1 week before first light watering.\n\nLeaf cuttings RARELY work for aloe — don't waste effort.",
      repotting: "Every 2–3 years or when pups overcrowd the pot.\n\n• Spring is ideal.\n• Choose a pot only slightly larger — aloes don't like extra space.\n• Terracotta strongly preferred.\n• Let the plant settle for a week before watering after repotting (allows nicked roots to callus).",
      feeding: "LIGHT feeder.\n\n• Diluted (1/2 strength) cactus/succulent fertilizer once in early spring and once in mid-summer.\n• No feeding in fall or winter.\n• Over-fertilizing causes weak floppy growth.",
      troubleshooting: "• Mushy, translucent, or brown leaves → OVERWATERING / root rot. Unpot, cut rotten roots with sterilized scissors, dry 24–48 hrs, repot in dry mix; wait 1 week to water.\n• Wrinkled, thin leaves → underwatering. Water deeply.\n• Brown or red TIPS → sunburn (move to less direct sun) or cold damage.\n• Flat, splayed-out leaves → not enough light.\n• Leaves curling inward → severe drought stress.\n• White powder on leaves → harmless natural protective coating (farina); DON'T wipe off.\n• Mealybugs → cottony spots; dab with alcohol.\n• ⚠️ The yellow latex (aloin) under the leaf skin is a strong laxative and skin irritant — wear gloves when harvesting.\n• ⚠️ Toxic to pets (vomiting, diarrhea) if ingested."
    },
    sources: [
      { label: "Missouri Botanical Garden — Aloe vera", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=287074" },
      { label: "University of Florida IFAS — Aloe", url: "https://edis.ifas.ufl.edu/publication/MG309" },
      { label: "RHS — Aloe vera", url: "https://www.rhs.org.uk/plants/91570/aloe-vera/details" },
      { label: "ASPCA — Aloe Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/aloe" },
      { label: "Texas A&M AgriLife — Aloe Vera Care", url: "https://aggie-horticulture.tamu.edu/" },
      { label: "Costa Farms — Aloe Vera Care Guide", url: "https://costafarms.com/plants/aloe-vera" }
    ]
  },

  mondo_grass: {
    id: "mondo_grass",
    repotSigns: [
      "Tuft is packed into a rectangular block-shape when viewed from the side (all growth going up, no room to fan out)",
      "Roots circling out of the 7.5\" drainage holes",
      "Newest leaves brown at the tips even with adequate watering",
      "Water pours through in <5 seconds — dense root mat has replaced soil",
      "Tuft is visibly pushing up above the pot rim by an inch or more",
      "Growth stalls in growing season (Ophiopogon can double in size annually if not root-constrained)"
    ],
    displayName: "Mondo Grass",
    potSize: '7.5"',
    category: "ornamental_grass",
    names: {
      common: ["Mondo Grass", "Monkey Grass", "Dwarf Lilyturf", "Japanese Mondo Grass"],
      scientific: "Ophiopogon japonicus"
    },
    wateringDays: 8,
    wateringDaysHot: 6,
    wateringDaysCool: 12,
    currentSoilMix: "amended_potting",
    comments: "Repotted in last 2 months from 5\" → 7.5\" pot — significant up-pot. Watering intervals stretched ~30% to match the bigger soil reservoir. Soil is 70/30 potting/perlite.",
    idealSoil: ["standard_potting", "amended_potting", "african_violet"],
    soilNotes: "User has 70/30 potting/perlite — slightly more drainage than mondo grass strictly needs, but the larger 7.5\" pot stays moist enough overall. Healthy choice.",
    conditions: {
      light:        { ideal: "Partial shade to bright indirect; morning sun OK", passing: "Full shade to filtered sun; afternoon direct sun bleaches" },
      temperature:  { ideal: "60–80°F (15–27°C)", passing: "Hardy outdoors USDA 7–10; indoors anything ≥50°F" },
      humidity:     { ideal: "50–60%", passing: "30%+; drier air thins foliage" },
      soilMoisture: { ideal: "Evenly moist", passing: "Top inch dry between waterings; never bone dry" }
    },
    tips: {
      lighting: "Versatile: partial shade to full sun outdoors, bright indirect indoors.\n\n• In hot direct sun the foliage may bleach — afternoon shade ideal.\n• Indoors, near an east or filtered south window works well.\n• In low light it survives but thins.",
      soil: "Moisture-retentive but well-draining.\n\nRecipe: standard potting mix + 20% compost + 10% perlite.\nSlightly acidic to neutral (pH 5.5–6.5).\nMulch the top in larger pots to retain moisture.",
      watering: "Keep evenly moist, NOT soggy.\n\n• Water when the top ~1\" of soil is dry — typically every 5–7 days warm season, every 8–10 days cool season.\n• Tolerates short drought once established, but foliage thins.\n• In a 5\" pot, check OFTEN — small pots dry fast.\n• Reduce frequency slightly in winter.",
      pruning: "Shear back to 2–3\" tall once a year in EARLY SPRING to refresh foliage and remove brown tips. New blades emerge cleaner and brighter green.\n\n• Trim any individual brown blades at any time at the base.\n• Use sharp scissors or pruning snips.",
      propagation: "Easiest by DIVISION.\n\n• Lift the clump (or unpot), gently pull or cut into smaller plugs, each with roots + 3–5 blades.\n• Replant immediately and water in.\n• Best in early spring; success rate ~95%.\n• Single plant divides into 4–6 new pots easily.",
      repotting: "Every 2–3 years or when rootbound.\n\n• Divide while repotting — the plant rejuvenates from division.\n• Up-pot by 1–2\" or split into multiple pots.\n• Refresh soil completely.",
      feeding: "LIGHT feeder.\n\n• Balanced slow-release fertilizer (e.g. Osmocote) in spring.\n• Or liquid 10-10-10 at half strength every 6–8 weeks during the growing season.\n• None in winter.",
      troubleshooting: "• Browning tips → underwatering, salt buildup, or hot dry air. Flush soil, increase watering frequency.\n• Yellow centers → overwatering or poor drainage.\n• Thinning clump → divide and refresh soil.\n• Spider mites in dry indoor air → rinse and treat with insecticidal soap.\n• Slugs/snails outdoors → handpick or use iron phosphate bait.\n• White/black fungal spots → improve airflow, reduce wetting foliage."
    },
    sources: [
      { label: "Missouri Botanical Garden — Ophiopogon japonicus", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=283139" },
      { label: "NC State Extension — Ophiopogon japonicus", url: "https://plants.ces.ncsu.edu/plants/ophiopogon-japonicus/" },
      { label: "Clemson Cooperative Extension — Liriope and Mondo Grass", url: "https://hgic.clemson.edu/factsheet/liriope-mondo-grass/" },
      { label: "RHS — Ophiopogon japonicus", url: "https://www.rhs.org.uk/plants/search-results?query=ophiopogon+japonicus" },
      { label: "University of Florida IFAS — Mondo Grass", url: "https://edis.ifas.ufl.edu/" },
      { label: "Texas A&M AgriLife — Mondo Grass", url: "https://aggie-horticulture.tamu.edu/" }
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
    wateringDays: 24,
    wateringDaysHot: 22,
    wateringDaysCool: 40,
    currentSoilMix: "cactus_mix",
    comments: "Repotted in last 2 months. Sometimes called \"Candle Stick\" or \"Pencil Cactus\" — but it's actually a Euphorbia, not a true cactus. Soil is 50/50 cacti mix / perlite, 4\" pot.",
    idealSoil: ["cactus_mix"],
    soilNotes: "User's 50/50 cacti mix + perlite is textbook. Euphorbias need this kind of fast-draining mix — root rot is the only real way to kill them.",
    conditions: {
      light:        { ideal: "FULL SUN — 6+ hrs direct daily", passing: "Bright direct; less light = no color, leggy growth" },
      temperature:  { ideal: "65–85°F (18–29°C)", passing: "50–100°F; below 50°F causes damage; bring indoors" },
      humidity:     { ideal: "Low — 30–40%", passing: "Tolerates 20–60%; very flexible" },
      soilMoisture: { ideal: "Bone dry; stems just slightly wrinkling = water", passing: "Bone dry → soak → repeat" }
    },
    tips: {
      lighting: "FULL SUN is essential for the orange/red coloration. 6+ hours of direct sun.\n\n• In low light it stays green and becomes leggy.\n• Acclimate slowly when moving outdoors to prevent sunburn (white/yellow patches).\n• South or west window indoors; supplement with a grow light if light is limited.\n• The famous fire color intensifies in cooler temperatures (fall/early winter).",
      soil: "Very GRITTY, fast-draining succulent/cactus mix.\n\nRecipe:\n• 1 part cactus mix\n• 1 part pumice\n• 1 part coarse sand or 1/4\" lava rock\n\nTerracotta strongly recommended.",
      watering: "Water VERY sparingly. SOAK-AND-DRY.\n\n• Wait until soil is bone dry AND stems show slight wrinkling.\n• Typically every 3–4 weeks in summer.\n• Every 5–6+ weeks in winter (sometimes longer in a cold room).\n• Overwatering = rapid rot.\n• Water at soil line, not over the stems.",
      pruning: "⚠️ TOXIC: This plant exudes a milky white LATEX SAP that is severely irritating to skin and eyes — temporary blindness is possible if it contacts eyes.\n\n• ALWAYS wear nitrile gloves AND eye protection.\n• Prune in warm dry weather; rinse cuts with cold water to seal sap.\n• Cut stems with sharp clean shears just above a branching point.\n• Keep pets and children far away during pruning.\n• Wash tools, hands, and any contaminated surfaces immediately.",
      propagation: "Stem cuttings (with all toxicity precautions):\n\n• Take 4–6\" cuttings.\n• RINSE the cut end with cold water to stop sap flow.\n• Let callus for 5–7 days in shade.\n• Plant in dry gritty mix.\n• Don't water for 2 weeks.\n• Roots in 4–6 weeks. Success rate ~80% if dry.\n• Wear gloves the entire time.",
      repotting: "Every 3–4 years.\n\n• Spring only (active growth).\n• Wear gloves and protect skin/eyes.\n• Up-pot by 1\" only.\n• Let plant settle a week before watering.\n• Top-heavy plants benefit from a heavier terracotta pot or stone weight in the bottom.",
      feeding: "VERY light feeder.\n\n• Cactus fertilizer at QUARTER strength once in spring and once in mid-summer.\n• No fall/winter feeding.\n• Excess fertilizer reduces the red/orange coloration.",
      troubleshooting: "• Soft, mushy, or blackened stems → OVERWATERING / rot. Cut above the rot with clean tools (wear gloves!), let callus, root anew.\n• Stems all green, no color → needs much more direct sun.\n• Yellow or shriveled tips → severe drought; water deeply.\n• ⚠️ SAP EXPOSURE — eyes: flush with water for 15+ minutes, seek medical help immediately. Skin: wash thoroughly with soap.\n• Mealybugs → dab with alcohol; gloves on.\n• Falling over → top-heavy; use a deeper terracotta pot or stake.\n• ⚠️ Severely toxic to pets, children, and humans — keep out of reach."
    },
    sources: [
      { label: "Missouri Botanical Garden — Euphorbia tirucalli", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=287581" },
      { label: "University of California ANR — Euphorbia toxicity warning", url: "https://ucanr.edu/blogs/blogcore/postdetail.cfm?postnum=24622" },
      { label: "World of Succulents — Firestick", url: "https://worldofsucculents.com/euphorbia-tirucalli-firestick/" },
      { label: "RHS — Euphorbia tirucalli", url: "https://www.rhs.org.uk/plants/search-results?query=euphorbia+tirucalli" },
      { label: "ASPCA — Euphorbia Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/pencil-cactus" },
      { label: "University of Arizona Extension — Cacti and Succulents", url: "https://extension.arizona.edu/" }
    ]
  },

  schefflera: {
    id: "schefflera",
    repotSigns: [
      "Roots circling out of the 9\" pot drainage holes — the plant is still in original store soil, so rootbound + wrong soil is a double signal",
      "New umbrella leaflets have FEWER palm-fingers than mature ones (young growth = 4–5 fingers; healthy mature = 9+)",
      "New leaves smaller than previous flush",
      "Water beads on the surface and takes 30+ seconds to soak in (peat crust / hydrophobic soil)",
      "Yellow lower leaves persistent (not related to a recent watering event)",
      "Plant leans over easily — top-heavy for the rootball anchor"
    ],
    displayName: "Schefflera (Variegated Yellow)",
    potSize: '9"',
    category: "tropical",
    names: {
      common: ["Schefflera (Yellow Variegated)", "Variegated Hawaiian Umbrella Plant", "Schefflera 'Gold Capella'", "Schefflera 'Trinette'"],
      scientific: "Schefflera arboricola (variegated cultivar — likely 'Gold Capella' or 'Trinette')"
    },
    wateringDays: 9,
    wateringDaysHot: 7,
    wateringDaysCool: 13,
    currentSoilMix: "other",
    comments: "⚠️ NOT repotted in the last 2 months — still in original store soil (peat-heavy, likely dense). User topped off with about 1\" of potting/fertilizer/perlite mix on top. 9\" pot. Variegated cultivars need slightly more light than solid green to keep the gold pattern. Plan to bare-root and switch to amended_potting at next repotting (spring is best).",
    idealSoil: ["standard_potting", "amended_potting", "aroid_mix"],
    soilNotes: "⚠️ Still in original store soil — peat-heavy, holds water too long. The 1\" amended top layer helps but doesn't solve the core issue. Next repotting (spring is ideal): gently bare-root the central rootball and switch fully to 60/40 potting/perlite. Until then, water carefully — let the pot dry more than usual between waterings to compensate for the moisture-retentive core.",
    conditions: {
      light:        { ideal: "Bright, indirect with 1–2 hrs gentle direct sun",    passing: "Medium indirect; tolerates lower light but grows leggy & loses variegation" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                  passing: "60–90°F; protect from cold drafts under 55°F" },
      humidity:     { ideal: "50–60%",                                             passing: "40%+; tolerates average household humidity" },
      soilMoisture: { ideal: "Top 1–2\" dry between deep waterings",               passing: "Slightly drought-tolerant; never sit in water" }
    },
    tips: {
      lighting: "Bright, INDIRECT light is ideal — produces the densest, most variegated growth. A few hours of GENTLE morning direct sun (east window) is great; afternoon direct sun can scorch leaves.\n\n• Tolerates medium indirect light but stems get leggy and lower leaves drop.\n• Variegated varieties (gold-splash) need MORE light than solid green to keep their pattern.\n• Rotate the pot 1/4 turn every 1–2 weeks for even growth.\n• Move outdoors to dappled shade in summer if desired — acclimate over 2 weeks to avoid sunburn.",
      soil: "Standard well-draining indoor potting mix with extra drainage.\n\nRecipe:\n• 3 parts standard potting mix\n• 1 part perlite\n• 1 part orchid bark or coco coir chunks\n\nSlightly acidic (pH 6.0–6.5). A 10\" pot benefits from a 1\" gravel layer at the bottom if drainage is borderline.",
      watering: "Water THOROUGHLY when the top 1–2 inches of soil are dry. Drench until water runs out the bottom; empty the saucer 15 min later.\n\n• Frequency for a 10\" pot indoors: ~10 days in warm season, ~8 days at peak summer, ~14 days in cool season (i.e. roughly every 1–2 weeks — the consensus across The Sill, Costa Farms, Bloomscape and Missouri Botanical Garden).\n• OVERWATERING is the #1 killer — symptoms are sudden mass leaf-drop with yellowing.\n• UNDERWATERING also causes leaf drop but with browning/crispy tips first.\n• Use room-temperature water; cold tap water can shock roots.\n• A moisture meter helps in a deep 10\" pot since the surface may dry while the rootball is still wet.",
      pruning: "Schefflera tolerates aggressive pruning — one of the easiest houseplants to shape.\n\n• Cut just ABOVE a leaf node with sharp clean shears.\n• Trim leggy stems back by 1/3 to 1/2 in early spring to encourage bushier, denser growth.\n• Pinch new growth tips weekly during the growing season to build density.\n• Remove dead/yellow leaves at the petiole anytime.\n• ⚠️ Sap is mildly irritating — wear gloves if you're sensitive; wipe shears with alcohol between cuts.\n• Don't remove more than 1/3 of total foliage at once.",
      propagation: "STEM CUTTINGS are by far the easiest method.\n\n• Take a 4–6\" cutting with 3–4 leaves from a healthy stem, just below a node.\n• Strip the bottom 2 leaves.\n• Dip the cut end in rooting hormone (IBA powder).\n• Insert into moist perlite/peat mix OR a glass of water.\n• Cover loosely with a plastic bag to maintain humidity.\n• Roots in 4–8 weeks. Success rate ~70% with rooting hormone, ~40% without.\n• Best time: spring/early summer.\n• Air-layering also works well for thicker stems.",
      repotting: "Every 2–3 years or when roots circle the pot.\n\n• Spring (March–May) is ideal.\n• Up-pot by only 2 inches — schefflera prefers slightly snug roots.\n• At 10\" you may be approaching terminal indoor size; consider top-dressing yearly instead (scoop out top 2\" of soil, replace with fresh mix).\n• Trim circling/dead roots when repotting.\n• Don't fertilize for 4–6 weeks after to let nicked roots heal.",
      feeding: "Balanced liquid fertilizer (10-10-10 or 20-20-20) at HALF strength every 4 weeks during spring and summer.\n\n• Slow-release granular (Osmocote) in spring as an easy alternative — one application lasts 3–4 months.\n• Reduce to once every 8 weeks in fall.\n• NONE in winter unless growing strongly under grow lights.\n• Flush soil with plain water every 2–3 months to clear fertilizer salts (brown leaf edges = salt buildup).",
      troubleshooting: "• Sudden mass leaf drop → most often OVERWATERING (check roots — black/mushy = rot). Sometimes also a reaction to a sudden move or drastic light change.\n• Yellow leaves with brown tips → inconsistent watering; establish a routine.\n• Black/brown leaf tips only → low humidity or underwatering.\n• Leggy growth with sparse leaves → not enough light; move closer to a bright window.\n• Loss of variegation in gold/white varieties → insufficient light.\n• Sticky residue on leaves or floor below → SCALE insects on stems; wipe with alcohol-soaked cotton swab and treat with neem.\n• Fine webs between leaves → SPIDER MITES (common in dry indoor air); rinse foliage thoroughly and treat with insecticidal soap weekly until clear.\n• White cottony spots in leaf joints → MEALYBUGS; dab with rubbing alcohol.\n• Drooping with wet soil → root rot; unpot, trim rotten roots, repot in fresh mix.\n• ⚠️ TOXIC to cats, dogs, and humans if chewed (contains insoluble calcium oxalate crystals) — keep out of reach of pets and kids."
    },
    sources: [
      { label: "Missouri Botanical Garden — Schefflera arboricola", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275203" },
      { label: "University of Florida IFAS — Dwarf Schefflera", url: "https://edis.ifas.ufl.edu/publication/FP522" },
      { label: "RHS — Schefflera arboricola", url: "https://www.rhs.org.uk/plants/search-results?query=schefflera+arboricola" },
      { label: "The Sill — Schefflera Care Guide", url: "https://www.thesill.com/blog/plant-care" },
      { label: "ASPCA — Schefflera Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/schefflera" },
      { label: "Costa Farms — Schefflera Care", url: "https://costafarms.com/plants/schefflera" },
      { label: "NC State Extension — Schefflera arboricola", url: "https://plants.ces.ncsu.edu/plants/schefflera-arboricola/" }
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
      lighting: "Solid-green Schefflera is MORE TOLERANT of medium light than the variegated form — it can handle north-facing windows and dimmer corners while still growing well.\n\n• Bright indirect is still optimal — the plant will be denser and bushier.\n• Rotate weekly for even growth.\n• Leaf drop after a move is usually a light-shock reaction, not a watering problem. Give 2–4 weeks to adjust before changing anything else.",
      soil: "User has it in 60/40 potting/perlite, which is ideal. See the soilNotes field on the Soil Mix tab for context. Avoid pure cactus mix and avoid moisture-retentive mixes (African violet, sphagnum) — both extremes cause problems.",
      watering: "Water THOROUGHLY when the top inch of soil is dry.\n\n• Frequency for a 5.5\" pot indoors: ~5 days warm season, ~5 days peak summer, ~10 days cool season.\n• A smaller pot dries faster than the 9\" variegated cousin, so the schedule is shorter.\n• Mass leaf drop with yellowing → overwatering. Black/crispy tips → underwatering.\n• Empty the saucer 15 min after watering — never let it sit in standing water.",
      pruning: "Same as the variegated form — Schefflera tolerates aggressive pruning beautifully.\n\n• Cut just above a node with sharp clean shears.\n• Pinch new growth tips weekly to build density.\n• ⚠️ Mildly irritating sap — wear gloves if sensitive.\n• Don't remove more than 1/3 of foliage at once.",
      propagation: "Stem cuttings root reliably in late spring / early summer.\n\n• 4–6\" cutting with 3–4 leaves, just below a node.\n• Dip in rooting hormone.\n• Insert in moist perlite or in water (success ~70% with hormone, ~40% without).\n• Roots in 4–8 weeks.\n• Air-layering is also effective for thicker stems.",
      repotting: "Every 2–3 years or when roots circle the pot.\n\n• Spring is best.\n• Up-pot by only 2\" at a time.\n• Schefflera prefers slightly snug roots.\n• Don't fertilize for 4–6 weeks after repotting.",
      feeding: "Balanced liquid fertilizer (10-10-10 or 20-20-20) at HALF strength every 4 weeks spring/summer.\n\n• Reduce to every 8 weeks in fall.\n• None in winter unless growing under lights.\n• Flush soil with plain water every 2–3 months to clear salts.",
      troubleshooting: "Same playbook as the variegated form:\n\n• Mass leaf drop → most often OVERWATERING (check roots — black/mushy = rot).\n• Yellow leaves with brown tips → inconsistent watering.\n• Black tips → low humidity or underwatering.\n• Leggy with sparse leaves → not enough light. Move closer to a bright window.\n• Spider mites / scale / mealybugs → wipe with rubbing alcohol; treat with neem.\n• ⚠️ TOXIC to cats, dogs, and humans if chewed (insoluble calcium oxalate crystals)."
    },
    sources: [
      { label: "Missouri Botanical Garden — Schefflera arboricola", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275203" },
      { label: "University of Florida IFAS — Dwarf Schefflera", url: "https://edis.ifas.ufl.edu/publication/FP522" },
      { label: "RHS — Schefflera arboricola", url: "https://www.rhs.org.uk/plants/search-results?query=schefflera+arboricola" },
      { label: "Costa Farms — Schefflera Care", url: "https://costafarms.com/plants/schefflera" },
      { label: "ASPCA — Schefflera Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/schefflera" }
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
      lighting: "Bright, INDIRECT light is critical for blooming — direct afternoon sun will scorch leaves.\n\n• EAST-facing window is ideal: gentle morning sun + bright indirect the rest of the day.\n• South/west windows: place 2–3 feet back or use a sheer curtain.\n• Leaf color is your light-meter: bright olive-green = ideal; dark forest-green = too low (won't rebloom); yellow/red-tinged = too much.\n• In winter, supplement with a grow light (~12 hrs/day) if your windows get under 4 hrs of bright indirect.\n• Most 3\" mini Phals will rebloom annually with proper light + a cool-night trigger (see Troubleshooting)."
,
      soil: "NEVER use regular potting soil — orchid roots need air or they suffocate and rot.\n\nTwo common media (mini orchids are often sold in one OR the other — identify yours first):\n\n• **Bark mix** (chunky fir bark + perlite + charcoal) — dries fast (~7 days), forgives overwatering. Re-water when bark feels dry 1\" down.\n• **Sphagnum moss** — holds water 2–3x longer than bark; only water when surface is dry to the touch (~10–14 days). Most retail mini Phals come in moss.\n\nFor a 3\" pot, a clear plastic orchid pot is ideal — lets you see root color (silver=dry, green=wet) and lets light reach photosynthetic roots."
,
      watering: "The #1 way to kill a mini orchid is overwatering. Underwatering is much more recoverable.\n\nMETHOD — pick ONE:\n• **Soak & drain** (recommended): Submerge the inner pot in room-temp water for 10–15 min once a week. Lift, let drain fully 5 min, return to decorative outer pot. Never let it sit in standing water.\n• **Ice cube method** (Just Add Ice / Costa Farms): 3 ice cubes per week on top of bark. Controversial but works for mini Phals at retail; less effective for other genera.\n\nFREQUENCY for a 3\" pot indoors:\n• 🔥 Hot (Jun–Sep, Austin): ~5 days\n• ☀️ Warm (Mar–May, Oct–Nov): ~7 days\n• ❄️ Cool (Dec–Feb): ~10 days\n\n⚠️ If your orchid is in SPHAGNUM MOSS instead of bark, water roughly HALF as often. Surface moss can look dry while the core is still wet."
,
      pruning: "Mini orchids need almost no pruning beyond spent flowers and dead roots.\n\n• **Flower spike** after all blooms drop (Phalaenopsis only):\n  - Cut just ABOVE the 2nd or 3rd node from the base → encourages a side spike with new blooms in 6–10 weeks.\n  - OR cut all the way to the base if the spike turns brown/yellow → plant invests in new growth instead.\n• **Other genera** (Dendrobium, Oncidium, Cattleya): cut spent spikes at the base — they don't rebloom on old spikes.\n• Trim dead/black roots when repotting only (see Repotting). Don't remove silver-gray aerial roots — they're alive and absorb humidity.\n• Wipe shears with rubbing alcohol between cuts to prevent virus transmission (orchids are virus-susceptible)."
,
      propagation: "DIFFICULT for home growers — orchids are mostly propagated commercially via tissue culture.\n\nHome-feasible methods:\n• **Keiki separation** (Phalaenopsis): occasionally a baby plantlet (\"keiki\") forms on the flower spike. Wait until it has 3+ leaves AND 2–3 roots of 2\"+ length. Cut the spike on either side of the keiki, pot in fresh bark mix.\n• **Division** (Dendrobium, Cattleya, Cymbidium with pseudobulbs): only on mature multi-pseudobulb plants — divide into chunks of 3+ pseudobulbs at repotting time. Mini orchids in 3\" pots are usually too small for this.\n• **Keiki paste** (a hormone cream) applied to a node can induce keiki formation, but success is hit-or-miss.\n\nDon't waste effort trying to root flower spikes or leaves directly — it doesn't work for orchids."
,
      repotting: "Every 1–2 YEARS, immediately AFTER flowering finishes (never during bloom — shocks the plant).\n\n• Signs you need to repot: medium has broken down to mushy mulch; salts crusted on top; roots circling tightly; plant smells sour.\n• Keep the same pot size or go up only 1 size — orchids LIKE being root-bound.\n• Soak the plant 10 min to loosen medium; tease old bark off roots gently.\n• Trim BLACK or MUSHY roots back to healthy white/green tissue with sterile shears.\n• Use fresh orchid bark mix (or sphagnum if it was originally in moss).\n• Don't water for 5–7 days after repotting — let nicked roots heal first. Mist daily for humidity.\n• Clear pots help you monitor root health going forward."
,
      feeding: "Mini orchids feed lightly but frequently — the famous \"weakly, weekly\" rule.\n\n• Use a balanced ORCHID-specific fertilizer (e.g. 20-20-20 or 13-3-15) at **1/4 strength** with every other watering during spring/summer.\n• Reduce to once monthly in fall, none in winter unless growing actively under lights.\n• Flush the pot with plain water once every 4–6 weeks to clear fertilizer salts (which burn roots → brown leaf tips).\n• MSU orchid formula is the gold-standard recommended by the American Orchid Society.\n• DO NOT use regular houseplant fertilizer at houseplant strength — far too strong for orchid roots."
,
      troubleshooting: "• **No rebloom** (most common complaint) → mini Phals need a NIGHT TEMPERATURE DROP of 10–15°F for 2–4 weeks to trigger a new flower spike. In Austin, this happens naturally in fall if you crack a window at night or move it near a cooler glass pane. Without the trigger they'll stay green-leaved but bloomless.\n• **Yellow leaves bottom-up** → usually natural aging (oldest leaf yellows once a year). If multiple leaves yellow at once, check for ROOT ROT (see below).\n• **Wrinkled, droopy, leathery leaves** → looks like underwatering but is usually ROOT ROT. Unpot, inspect roots: white/green/silver = healthy, brown/black/mushy = dead. Cut rotten roots back to healthy tissue, repot in fresh dry bark, don't water for a week.\n• **Mushy spot in the center of leaves at the crown** → CROWN ROT from water sitting in the leaf joint. Drain water carefully when watering; never water overhead. Dust crown with cinnamon (a mild antifungal).\n• **Sticky residue on leaves or stem** → SCALE or MEALYBUGS. Wipe with cotton swab dipped in 70% isopropyl alcohol; repeat weekly for 3 weeks.\n• **Black spots on leaves** → bacterial leaf rot. Cut out the affected area, dust with cinnamon, reduce humidity, improve airflow.\n• **Aerial roots growing out of the pot** → totally NORMAL. Don't bury them. Mist them occasionally.\n• ✅ **Non-toxic** to cats and dogs per ASPCA (rare among houseplants)."

    },
    sources: [
      { label: "American Orchid Society — Beginner's Care Guide", url: "https://www.aos.org/orchids/orchid-care.aspx" },
      { label: "American Orchid Society — Phalaenopsis Culture Sheet", url: "https://www.aos.org/orchids/culture-sheets/phalaenopsis.aspx" },
      { label: "Missouri Botanical Garden — Phalaenopsis", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderProfileResults.aspx?gen=Phalaenopsis" },
      { label: "RHS — Phalaenopsis (Moth Orchid)", url: "https://www.rhs.org.uk/plants/search-results?query=phalaenopsis" },
      { label: "Just Add Ice Orchids — Mini Phalaenopsis Care", url: "https://justaddiceorchids.com/orchid-care" },
      { label: "Costa Farms — Orchid Care Guide", url: "https://costafarms.com/plants/orchid" },
      { label: "ASPCA — Orchid (Phalaenopsis) Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/orchid" }
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
      lighting: "Bright, indirect light with 2–4 hours of direct morning sun.\n\n• Needs STRONG light to rebloom — minimum 8 hrs bright light during day.\n• To FORCE BLOOMING: give 14 hours of complete darkness per night for 6 weeks (cover with a box or move to a dark closet at 5pm, remove at 7am), then resume normal light. Blooms appear ~6 weeks after treatment ends.\n• Best blooming light schedule starts in October for winter blooms.",
      soil: "GRITTY succulent mix.\n\nRecipe:\n• 1 part cactus mix\n• 1 part perlite\n• Optional: handful of pumice\n\nExcellent drainage is critical. Terracotta pot preferred.",
      watering: "SOAK-AND-DRY.\n\n• Water deeply when the top 1\" is dry — typically every 10–14 days warm season, every 18–21 days cool season.\n• Water at the soil line; wet flowers/leaves rot easily.\n• Reduce significantly while dormant or during dark-treatment period.\n• Yellow soft leaves = back off watering immediately.",
      pruning: "DEADHEAD spent flower stems back to the base of the stem (where it meets a leaf pair) — this encourages re-blooming and saves the plant's energy.\n\n• Pinch back leggy stems to maintain a compact shape.\n• Major shape prune AFTER flowering finishes (don't prune during bloom).\n• Saved pinched tips propagate easily.",
      propagation: "Very easy by stem or leaf cuttings.\n\n• Stem cutting: take a 2–3\" stem cutting, remove the bottom leaves, let callus 2–3 days in shade.\n• Leaf cutting: single mature leaf, callus 2 days, place flat on dry mix.\n• Plant in dry succulent mix.\n• Water lightly only after roots form (~2–3 weeks).\n• Spring or early summer best; success rate ~85%.",
      repotting: "Every 2 years, in spring AFTER blooming.\n\n• Up-pot by 1\" only.\n• Terracotta strongly preferred.\n• Refresh soil completely; trim any dead roots.\n• Don't water for a week after repotting.",
      feeding: "• Balanced liquid fertilizer at half strength once a month spring through early fall.\n• A bloom-booster (higher P, e.g. 10-30-20) once before the dark-treatment period encourages flowering.\n• No fertilizer in winter unless plant is actively growing.",
      troubleshooting: "• No flowers → not enough darkness or light contrast; do the 6-week dark treatment.\n• Yellow soft leaves → overwatering. Cut back significantly.\n• Wrinkled leaves → underwatering. Soak the pot.\n• Leggy / stretched stems → not enough light.\n• Brown spots on leaves → cold drafts or wet leaves.\n• Powdery mildew → poor air circulation; treat with diluted neem (1 tsp/qt water).\n• Aphids on flower stems → spray off with water; insecticidal soap if persistent.\n• ⚠️ TOXIC to cats, dogs, and horses — contains cardiac glycosides (bufadienolides) that can cause vomiting, abnormal heart rhythms, and death. Keep strictly out of reach."
    },
    sources: [
      { label: "Missouri Botanical Garden — Kalanchoe blossfeldiana", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=281042" },
      { label: "University of Vermont Extension — Kalanchoe Care", url: "https://pss.uvm.edu/ppp/articles/kalanchoe.html" },
      { label: "ASPCA — Kalanchoe Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/kalanchoe" },
      { label: "RHS — Kalanchoe blossfeldiana", url: "https://www.rhs.org.uk/plants/search-results?query=kalanchoe+blossfeldiana" },
      { label: "University of Florida IFAS — Kalanchoe", url: "https://edis.ifas.ufl.edu/" },
      { label: "The Sill — Kalanchoe Care Guide", url: "https://www.thesill.com/blog/plant-care" }
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
      lighting: "Bright INDIRECT light with a few hours of gentle morning sun is ideal. Filtered south or east window works well.\n\n• Direct hot afternoon sun can scorch the waxy leaves — they turn white-pink.\n• In too-low light the strands stretch and the blue-gray color fades to dull green.\n• A hanging planter near a window is the classic placement — it shows off the trailing form.",
      soil: "Strict cactus/succulent mix with extra perlite or pumice. User's 50/50 cacti/perlite is ideal. NEVER use moisture-retentive mixes.\n\nRecipe variants that also work:\n• 1 part cactus mix + 1 part pumice\n• 1 part standard potting + 2 parts perlite + 1 part coarse sand",
      watering: "SOAK and DRY METHOD — water thoroughly, then wait until soil is completely dry.\n\n• 4\" pot indoors: ~3 weeks warm, ~2.5 weeks peak summer, 5–6 weeks cool season.\n• Wrinkled leaves = needs water. Plump and full = fine.\n• Water at the soil line — never let water sit on the strands.\n• Reduce winter watering drastically; the plant goes semi-dormant.",
      pruning: "Almost no pruning needed.\n\n• Leaves that drop off easily are actually a propagation feature — pick them up and root them.\n• Remove any rotted strands at the base with sterile shears.\n• Trim back leggy strands in early spring to encourage branching.\n• ⚠️ Be GENTLE — every accidental touch knocks off leaves. Don't move the plant unless absolutely necessary.",
      propagation: "EASIEST succulent to propagate — basically does it itself.\n\n• Pick up dropped leaves from around the pot.\n• Lay them on dry cactus mix; don't bury.\n• In 2–3 weeks tiny roots and a baby plantlet form from the leaf base.\n• Mist lightly every 4–5 days until the leaf shrivels (it's transferring its water to the baby).\n• Once the baby has 3–4 of its own leaves, water normally.\n• Stem cuttings also work — let the cut end callus 3–5 days before potting.",
      repotting: "Every 3–4 years, or never if happy.\n\n• Spring only.\n• HANDLE WITH EXTREME CARE — wrap the strands in cling film or a soft cloth before lifting.\n• Up-pot by 1\" only.\n• Don't water for a week after to let any nicked roots heal.",
      feeding: "VERY light feeder.\n\n• Cactus fertilizer at quarter strength once in spring and once in mid-summer.\n• No feeding fall/winter.\n• Overfeeding causes leggy growth and lost variegation.",
      troubleshooting: "• Strands rotting at base → overwatering. Cut off rotted section, save healthy upper strand as cuttings, repot dry.\n• Leaves dropping en masse → physical disturbance OR sudden temperature change. Move to a stable spot.\n• Leaves shriveling and not plumping after watering → root rot — roots can't take up water.\n• White waxy bloom on leaves → NORMAL — it's natural protective coating. Don't rub off.\n• Mealybugs in leaf joints → dab with rubbing alcohol on a Q-tip.\n• ⚠️ Mildly toxic to pets if ingested in large quantity — generally low risk.\n• Yellow-green color (vs. blue-gray) → too little light."
    },
    sources: [
      { label: "Missouri Botanical Garden — Sedum morganianum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b350" },
      { label: "RHS — Sedum morganianum", url: "https://www.rhs.org.uk/plants/search-results?query=sedum+morganianum" },
      { label: "University of Wisconsin — Burro's Tail Care", url: "https://hort.extension.wisc.edu/articles/burros-tail/" },
      { label: "ASPCA — Burro's Tail Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/burros-tail" },
      { label: "Costa Farms — Burro's Tail Care Guide", url: "https://costafarms.com/plants/burros-tail" }
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
      lighting: "ALL the species in this mix want BRIGHT light to stay compact and colored.\n\n• Echeveria & Graptosedum: brightest light keeps their rosettes tight and colorful.\n• Sedum nussbaumerianum ('Coppertone'): the orange tips come from sun stress.\n• Kalanchoe: many species need a 6-week 'long night' to bloom (see Kalanchoe entry).\n• Pachyphytum: bright indirect with some direct sun keeps the chubby leaves plump.\n• Rotate the pot 1/4 turn weekly so every plant gets equal light — they stretch toward the window.",
      soil: "⚠️ Currently in store soil (peat-heavy, holds water too long). At next repot, switch to 50/50 cacti mix + perlite. See soilNotes above.",
      watering: "Treat the WHOLE pot as a single succulent — water deeply, then let dry completely.\n\n• 4.5\" pot in store soil: ~3 weeks warm, ~5–6 weeks cool. ADD an extra week vs. proper cactus mix because store soil retains more moisture.\n• Water at the soil line, not over the rosettes.\n• If any species starts shriveling individually, you can spot-water it with a syringe instead of soaking the whole pot.\n• ⚠️ Group rot risk: if one plant rots, it can infect others. Remove any rotting plant immediately.",
      pruning: "Multi-species mixes need active management to prevent one fast-grower from crowding others.\n\n• Trim Echeveria flower stalks at the base after blooming.\n• Pinch back Sedum nussbaumerianum tips when it gets leggy — propagate the cuttings.\n• Remove Kalanchoe spent blooms.\n• Wear gloves with any Kalanchoe — sap irritates skin.\n• Every 6–12 months, consider separating the species into individual pots if one is outcompeting the others.",
      propagation: "Each species propagates differently:\n\n• Echeveria & Graptosedum: leaf cuttings (lay on dry mix, baby plant forms from base).\n• Sedum nussbaumerianum: stem cuttings, callus 2–3 days, plant.\n• Kalanchoe: stem cuttings.\n• Pachyphytum: leaf cuttings (gently twist off whole leaves with a pop).\n• All: let cuts/wounds callus for 2–5 days before planting in dry cactus mix.\n• Success rate ~80% across the mix.",
      repotting: "URGENT priority for this plant at next spring repotting.\n\n• Gently knock out the rootball.\n• Tease apart the species — each is its own plant with its own roots.\n• Decide: keep them together (replant in 4.5\" with 50/50 cacti/perlite) OR separate into 2.5–3\" individual pots.\n• Let any nicked roots callus 2 days before re-soiling.\n• Don't water for 1 week after.",
      feeding: "Very light. Cactus fertilizer at quarter strength once in spring, once in mid-summer.\n\n• Skip if you repot — fresh mix has enough nutrients for 6 months.\n• No fall/winter feeding.",
      troubleshooting: "• One species rotting → remove immediately, treat cut with cinnamon, check soil moisture for the rest.\n• Stretching/etiolation → not enough light. Move closer to a window or add a grow light.\n• Mealybugs in leaf joints → cotton swab with rubbing alcohol on each spot.\n• Faded color → either too much sun (washed-out white) or too little (dull green).\n• Kalanchoe drops leaves but the others are fine → Kalanchoe may be reacting to a light change; usually recovers.\n• Whole pot drying way too slowly → store soil is the culprit; prioritize the repot.\n• ⚠️ Kalanchoe is toxic to pets — keep this whole pot out of reach of cats/dogs."
    },
    sources: [
      { label: "Missouri Botanical Garden — Succulent Care", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b350" },
      { label: "University of California — Succulents for the Home", url: "https://ucanr.edu/sites/UrbanHort/Plant_Care/Succulents/" },
      { label: "Sedum nussbaumerianum — World of Succulents", url: "https://worldofsucculents.com/sedum-nussbaumerianum-coppertone-stonecrop/" },
      { label: "Costa Farms — Mixed Succulent Care", url: "https://costafarms.com/plants/succulents" },
      { label: "ASPCA — Plant Toxicity Search", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants" }
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
      lighting: "Bright indirect with some morning direct sun keeps all 3 species happy.\n\n• Crassula 'Gollum': needs the most light — sun stress brings out red tips on the tubular leaves.\n• Pachyphytum: light shapes its chubby leaves into plump form.\n• Peperomia graveolens ('Ruby Glow'): tolerates slightly lower light than the others; partial shade is fine.\n• Avoid prolonged direct afternoon sun in summer — leaves can scorch.",
      soil: "User's 50/50 cacti mix + perlite is ideal. See soilNotes.",
      watering: "Water deeply when soil is dry. The smaller 3.5\" pot dries faster than the 4.5\" Frankenstein.\n\n• Schedule: ~2 weeks warm, ~4 weeks cool.\n• Peperomia graveolens is the thirstiest — it'll start drooping first. Water the whole pot when you see that.\n• Don't water if any plant is still plump and the soil is even slightly damp.\n• Water at soil line; never over the foliage.",
      pruning: "• Pinch leggy Crassula 'Gollum' tips back in spring — they propagate easily.\n• Trim Peperomia graveolens stems when they get too long; they branch from the cut.\n• Remove any spent flowers at the base.\n• Watch for one species crowding the others; trim aggressively if needed.",
      propagation: "All three propagate via stem or leaf cuttings:\n\n• Crassula 'Gollum': stem cuttings, callus 2–4 days, root in dry mix. Very high success rate.\n• Pachyphytum: gently twist off entire leaves; lay on dry mix; baby plant forms in 3–6 weeks.\n• Peperomia graveolens: stem cuttings 3–4\" long, callus 2 days, plant in cactus mix.\n• All like warm conditions (70°F+) for fastest rooting.",
      repotting: "Every 2–3 years.\n\n• Spring only.\n• Up-pot by 1\" only — these stay compact.\n• Refresh medium if it's compacted.\n• Let any nicked roots callus 2 days; don't water for 1 week after.",
      feeding: "Very light feeder.\n\n• Cactus fertilizer at quarter strength once in spring and once in mid-summer.\n• No fall/winter feeding.",
      troubleshooting: "• Mushy stems on any species → root rot from overwatering. Salvage healthy tops as cuttings.\n• Peperomia leaves dropping → underwatering OR cold draft.\n• Crassula 'Gollum' growing tall and skinny → not enough light.\n• Pachyphytum losing its waxy bloom → leaves were rubbed; the bloom regrows slowly.\n• Mealybugs → dab with isopropyl alcohol.\n• ⚠️ Crassula species are TOXIC to cats and dogs; Peperomia graveolens is generally considered non-toxic but the Crassula presence makes this whole pot pet-unsafe."
    },
    sources: [
      { label: "Missouri Botanical Garden — Crassula ovata 'Gollum'", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275124" },
      { label: "World of Succulents — Peperomia graveolens", url: "https://worldofsucculents.com/peperomia-graveolens-ruby-glow/" },
      { label: "World of Succulents — Pachyphytum spp.", url: "https://worldofsucculents.com/?s=pachyphytum" },
      { label: "ASPCA — Crassula Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/jade-plant" },
      { label: "RHS — Crassula ovata", url: "https://www.rhs.org.uk/plants/search-results?query=crassula+ovata" }
    ]
  },

  dracaena_fragrans: {
    id: "dracaena_fragrans",
    repotSigns: [
      "Roots circling out of the 13.5\" pot drainage holes",
      "New leaves are markedly SHORTER than the mature strappy leaves",
      "Cane starts leaning (13.5\" pot rootball no longer counterbalances a tall cane)",
      "Water drains through the peat mix in seconds instead of the usual slow soak",
      "Yellow lower leaves persistent (not from a specific over/underwatering event)",
      "Growth stalls entirely in growing season — Dracaenas will normally push a new leaf every 4–6 weeks in warm months"
    ],
    displayName: "Dracaena fragrans (Corn Plant)",
    potSize: '13.5"',
    category: "tropical",
    names: {
      common: ["Corn Plant", "Cornstalk Dracaena", "Mass Cane", "Happy Plant"],
      scientific: "Dracaena fragrans (formerly D. deremensis)"
    },
    wateringDays: 11,
    wateringDaysHot: 9,
    wateringDaysCool: 17,
    currentSoilMix: "amended_potting",
    comments: "Repotted in last 2 months — LOST A NODE after the repot shock. Other nodes look healthy now, no further leaf drop. Last watered 6/20. Soil is 60/40 potting/perlite, 13.5\" pot.\n\nDracaenas are SENSITIVE TO TAP WATER FLUORIDE — switching to distilled or rainwater will reduce brown leaf tips significantly.",
    idealSoil: ["standard_potting", "amended_potting"],
    soilNotes: "User's 60/40 potting/perlite gives good drainage. Dracaena fragrans prefers medium-retentive soil — the perlite boost protects against overwatering in the 13.5\" pot. Watch for compaction over 2-3 years.",
    conditions: {
      light:        { ideal: "Bright, indirect (filtered south or east window)", passing: "Medium indirect; tolerates low light but grows slowly" },
      temperature:  { ideal: "65–80°F (18–27°C)",                                passing: "60–90°F; protect below 55°F" },
      humidity:     { ideal: "50–60%",                                           passing: "40%+; brown leaf tips in dry air" },
      soilMoisture: { ideal: "Top 2\" dries between waterings",                  passing: "Slightly drought-tolerant" }
    },
    tips: {
      lighting: "Bright, INDIRECT light is best — direct hot afternoon sun bleaches leaves.\n\n• An east window or several feet back from a south/west window is ideal.\n• Will tolerate medium-low light but won't push new growth.\n• Rotate the pot 1/4 turn every couple weeks for even growth.\n• If new leaves come in smaller or paler than older ones, light is too low.",
      soil: "User's 60/40 potting/perlite is solid. Standard potting mix amended with extra perlite gives the right balance. Avoid pure mineral mixes (cactus, bonsai) — too fast-draining.",
      watering: "Water THOROUGHLY when the top 2 inches of soil are dry.\n\n• 13.5\" pot: ~9–11 days warm season, ~9 days peak summer, ~17 days cool season.\n• Empty saucer 15 min after — never let it sit in standing water.\n• ⚠️ FLUORIDE & CHLORINE in tap water cause the classic brown leaf tips. Use distilled, rain, or filtered water. Letting tap water sit out 24 hrs only removes chlorine, NOT fluoride.\n• Underwatering: bottom leaves yellow and drop one at a time (normal). Overwatering: multiple leaves at once turn yellow/brown.",
      pruning: "Easy to prune for shape and size.\n\n• Trim brown leaf tips with sharp scissors — follow the natural leaf shape so it looks intentional.\n• Cut entire canes back to whatever height you want — new growth sprouts from below the cut (the user's lost node).\n• Best in spring before active growth.\n• Wipe the wound with cinnamon to prevent rot.\n• Each cane can be cut at different heights for a tiered look.",
      propagation: "Easy via stem (cane) cuttings.\n\n• Cut a healthy cane into 4–6\" sections; mark the 'up' end on each.\n• Optional: dip the bottom end in rooting hormone.\n• Plant upright in moist potting mix OR root in water (slower but easier to monitor).\n• Roots in 4–8 weeks; new top growth 2–3 weeks after.\n• Success rate ~70–80%.\n• Best in spring/early summer when warm.",
      repotting: "Every 2–3 years or when root-bound.\n\n• Spring is best.\n• At 13.5\", the user is close to terminal indoor pot size — consider top-dressing instead (scoop out top 2\" of soil, replace with fresh amended_potting).\n• Up-pot by no more than 2\" diameter if growing.\n• ⚠️ Dracaenas often drop a leaf or two from REPOT SHOCK (like the user's lost node) — water lightly, don't fertilize for a month, give 3–4 weeks to recover.\n• Trim circling roots when repotting.",
      feeding: "Balanced liquid fertilizer at HALF strength every 6 weeks spring–summer.\n\n• None in fall/winter unless growing under lights.\n• Slow-release pellets (Osmocote) in spring work well as an alternative — 3–4 months coverage.\n• Flush with plain water every 2–3 months to clear accumulated fertilizer salts (which contribute to leaf-tip burn).\n• Dracaenas are LIGHT feeders — overfeeding causes salt buildup → more tip burn.",
      troubleshooting: "• Brown crispy leaf tips → #1 cause is FLUORIDE in tap water. Switch to distilled/rain/filtered. Also check humidity (raise to 50%+).\n• Yellow leaves on bottom only → natural aging — pluck them off.\n• Mass leaf drop / multiple yellow leaves → check roots: black/mushy = overwatering rot.\n• White spots on leaves → spider mites (look for fine webs underneath). Rinse foliage thoroughly; treat with insecticidal soap weekly.\n• Leggy bare canes → not enough light. Either move closer to window or top off the canes (they'll sprout new heads).\n• Soft mushy cane base → root rot. Cut above the rot, root the healthy top as a cutting.\n• Bent or kinked stem → repot shock or insufficient light on one side. Rotate.\n• ⚠️ TOXIC to cats and dogs — saponins cause vomiting, drooling, dilated pupils, loss of coordination. Keep out of reach."
    },
    sources: [
      { label: "Missouri Botanical Garden — Dracaena fragrans", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276317" },
      { label: "University of Florida IFAS — Dracaena fragrans", url: "https://edis.ifas.ufl.edu/publication/FP173" },
      { label: "RHS — Dracaena fragrans", url: "https://www.rhs.org.uk/plants/search-results?query=dracaena+fragrans" },
      { label: "The Sill — Dracaena Care Guide", url: "https://www.thesill.com/blog/plant-care" },
      { label: "ASPCA — Corn Plant Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/corn-plant" },
      { label: "Costa Farms — Dracaena Care", url: "https://costafarms.com/plants/dracaena" }
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
      lighting: "Bright, INDIRECT light intensifies the red, pink, and purple leaf colors.\n\n• Direct morning sun is fine; protect from intense afternoon sun.\n• In low light the colors fade to muddy green.\n• An east or filtered south/west window is ideal.\n• Variegated and dark-leaved cultivars especially need bright light to keep their colors.",
      soil: "User's 60/40 potting/perlite is appropriate. Standard potting mix with extra drainage. Avoid heavy clay-based or pure-mineral mixes.",
      watering: "Water THOROUGHLY when top 1–2 inches of soil dry.\n\n• 9.5\" pot: ~7–8 days warm season, ~7 days peak summer, ~13 days cool season.\n• ⚠️ FLUORIDE & CHLORINE damage Ti plants — same family as Dracaena. Use distilled, rainwater, or let tap water sit 24h+ (still won't remove fluoride though).\n• Ti plants like CONSISTENT moisture — let dry a bit between waterings but never bone-dry for long.\n• Brown crispy tips → tap water OR low humidity. Both usually together.",
      pruning: "Easy to prune for shape — Ti plants regenerate from cuts.\n\n• Cut canes back to any height; new shoots emerge below the cut.\n• Best in spring before active growth.\n• Trim brown leaf tips with scissors following the natural leaf shape.\n• Wear gloves if you have sensitive skin — sap can be slightly irritating.\n• Wipe shears with alcohol between cuts to prevent disease spread.",
      propagation: "Multiple easy methods:\n\n• Stem cuttings: cut a 3–6\" section of cane, root horizontally in moist potting mix (eyes face up). Roots in 4–6 weeks.\n• Sucker/root division: gently divide root-clump suckers from the base of a mature plant.\n• Tip cuttings root in water in 2–4 weeks.\n• Spring or early summer is ideal.\n• Success rate ~80%.",
      repotting: "Every 2 years or when root-bound.\n\n• Spring is best.\n• Up-pot by 2\" diameter.\n• Don't fertilize for 4–6 weeks after to let nicked roots heal.\n• Ti plants can show repot shock (leaf drop, color fade) — give them 3–4 weeks to recover.",
      feeding: "Balanced liquid fertilizer at HALF strength every 3–4 weeks spring–summer.\n\n• Reduce to once monthly in fall.\n• None in winter unless growing under lights.\n• Flush soil every 2–3 months to clear salts (Ti plants get tip burn from salt buildup like Dracaenas).\n• Slow-release pellets in spring work well — 3-month coverage.",
      troubleshooting: "• Brown leaf tips → tap water fluoride/chlorine (#1 cause) + low humidity. Switch to distilled/rain water, raise humidity to 50%+.\n• Faded colors → not enough light. Move closer to a bright window.\n• Yellow leaves on bottom → natural aging, no action.\n• Mass leaf drop / yellow leaves → check roots for rot.\n• Spider mites (fine webs, dusty leaves) → rinse foliage; treat with insecticidal soap weekly.\n• Mealybugs in leaf joints → alcohol on Q-tip.\n• Drooping with wet soil → root rot.\n• Bottom leaves curling/dropping after repot → repot shock; usually recovers in 3–4 weeks.\n• ⚠️ TOXIC to cats and dogs — saponins cause vomiting, dilated pupils, loss of coordination. Keep out of reach."
    },
    sources: [
      { label: "Missouri Botanical Garden — Cordyline fruticosa", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b690" },
      { label: "University of Hawaii — Ti Plant Care", url: "https://www.ctahr.hawaii.edu/oc/freepubs/pdf/OF-24.pdf" },
      { label: "RHS — Cordyline fruticosa", url: "https://www.rhs.org.uk/plants/search-results?query=cordyline+fruticosa" },
      { label: "ASPCA — Ti Plant Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/ti-plant" },
      { label: "The Sill — Cordyline / Ti Plant Care Guide", url: "https://www.thesill.com/blog/plant-care" }
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
      lighting: "BRIGHT light is essential — but the three specimens have slightly different preferences:\n\n• Mammillaria spinosissima (Pincushion) loves full sun. A south-facing window is ideal. Direct afternoon sun is fine.\n• Hylocereus undatus (the orphaned rootstock, now standalone) is from tropical Central America and prefers bright direct light but tolerates partial shade. Outdoors in summer it thrives in dappled sun; indoors a south or east window works well.\n• Gymnocalycium mihanovichii (the remaining intact Moon Cactus) prefers partial sun — it's a forest-floor species from Paraguay. Too much direct afternoon sun can scorch the colored top (no chlorophyll = sunburns easily).\n• Compromise: south or west window with sheer curtain during peak afternoon hours. East-facing window also works.\n• Rotate the pot 1/4 turn weekly so all three plants grow evenly.\n• In summer, the Mammillaria and Hylocereus appreciate a vacation outdoors in dappled sun — but keep the Gymnocalycium in a shadier spot.\n• ⚠️ If the Moon Cactus top starts fading or showing white sun-bleached patches, you're giving too much direct sun.",
      soil: "User's 50/50 cacti mix + perlite is exactly right for all three. See soilNotes.",
      watering: "Cactus golden rule: SOAK and DRY. The schedule below is tuned to the most moisture-sensitive specimen (the Gymnocalycium) — the Hylocereus and Mammillaria will be happy with slightly drier than this.\n\nFor THIS 7\" mixed planter:\n• Warm season (Mar–May, Oct, Nov): every 18 days.\n• Hot season (Jun–Sep): every 15 days — slightly more frequent because of summer growth.\n• Cool season (Dec–Feb): every 35 days, then taper off.\n• Stop watering completely from late Dec → late Feb if you want flowers in spring — all three species bloom only after a cool dry winter rest.\n\nMETHOD:\n• Water DEEPLY at the soil line — soak until water runs out the drainage hole.\n• Empty the saucer within 15 minutes — never let cacti sit in standing water.\n• Don't get water on the colored top of the remaining Moon Cactus.\n• Sticking your finger 2\" into the soil: if it's not bone dry, skip this watering.\n• ⚠️ The Hylocereus rootstock's CUT TOP (where the colored bud used to be) should be left alone — it has callused over by now if you cut it more than a week ago. Don't water onto the cut surface.",
      pruning: "Almost no pruning needed for these three.\n\n• Remove any shriveled, dead, or rotting tissue with sterile shears.\n• Mammillaria spinosissima has long sharp central spines — handle with thick leather gloves or folded newspaper.\n• Moon Cactus is also spiny but the spines are shorter; still wear gloves.\n• HYLOCEREUS ROOTSTOCK CARE (the orphaned stalk): If the cut at the top hasn't callused yet (still wet/dark), let it dry for 5–7 days in low light without water. Once callused, the stalk will start producing new growth from areoles (the little spiny bumps along the ridges) within 1–3 months. You can either:\n  ► Let it grow as a regular Dragon Fruit cactus — eventually 3–6 feet tall, can produce fruit.\n  ► Use it as a fresh GRAFT BASE for another colored Gymnocalycium top (see propagation).\n  ► Take a 4–6\" section as a cutting and re-root it as a standalone Hylocereus.\n• If a Moon Cactus graft union fails on the remaining intact one, you can try to re-graft, but most people just replace the plant.\n• Offsets/pups will form naturally over time — leave them attached for a clumping look, or detach for propagation.",
      propagation: "All three species propagate.\n\nMAMMILLARIA SPINOSISSIMA:\n• The clustering form (your cluster of 4) naturally produces new heads. Gently twist off an offset when it's ~1\" across.\n• Let the wound CALLUS for 5–7 days in dry shade.\n• Plant in dry cactus mix.\n• Don't water for 2 weeks.\n• Roots in 4–8 weeks. Success rate ~85%.\n• Seeds are also viable but very slow.\n\nGYMNOCALYCIUM MIHANOVICHII (the remaining Moon Cactus):\n• If grafted, the colored top can only survive on a rootstock — you can't propagate the colored part from cuttings.\n• The green natural form pups occasionally from the base — separate, callus, plant in dry mix.\n• If you want more colored Moon Cacti, you can GRAFT them onto your orphaned Hylocereus rootstock — see below.\n\nHYLOCEREUS UNDATUS (the orphaned rootstock):\n• Cuttings root easily. Take a 4–6\" stalk section, let callus 7–10 days, plant in dry cactus mix, water lightly after 2 weeks.\n• ⭐ POSSIBLE FUTURE PROJECT: Use the cut top of your orphaned stalk as a fresh graft base. Buy or trade for a small colored Gymnocalycium pup (1/2\"–1\" across), make a clean horizontal cut on both the rootstock top AND the pup, press them together so the vascular rings ALIGN (visible as a darker ring inside the cactus tissue), and bind with rubber bands across the top for 7–10 days. Success rate 60–80% with practice. Best done in spring/early summer with healthy, well-watered tissue.\n• Seed propagation is possible but takes years to reach grafting size.",
      repotting: "Every 3–4 years for this mixed planter.\n\n• Spring only (active growth).\n• Wear thick leather gloves and use folded newspaper or kitchen tongs to grip plants.\n• Up-pot by 1\" diameter only.\n• If the species start crowding each other, consider separating into individual pots — the Hylocereus especially will eventually outgrow this 7\" pot as it climbs.\n• Refresh medium if it's compacted or showing salt deposits.\n• Don't water for 1 week after — let any nicked roots heal.",
      feeding: "VERY light feeder.\n\n• Cactus-specific fertilizer at HALF strength once in spring (March) and once in mid-summer (July).\n• Skip fall and winter entirely.\n• All three species are slow growers — don't overfeed expecting fast growth. Overfertilized cacti grow soft, discolored, and prone to rot.\n• ⚠️ The Hylocereus rootstock will accept slightly more feeding if you want to push it toward flowering (tomato fertilizer with higher phosphorus, half-strength, every 4 weeks in spring/summer once it's a few years old).",
      troubleshooting: "MOON CACTUS (Gymnocalycium):\n• Colored top wobbles loose from green rootstock → graft union failed; graft has reached end of life (typically 3–5 years). This is what happened to the cut-off one.\n• Pale/white patches on colored top → sunburn. Move out of direct afternoon sun for 2 weeks.\n• Black mushy spots → root rot from overwatering. Cut above the rot, callus, replant.\n• Pinkish-orange spots that aren't sunburn → fungal infection. Treat with copper fungicide.\n\nHYLOCEREUS ROOTSTOCK (the orphaned green stalk):\n• Cut top still wet/dark after a week → didn't callus properly; rub the cut with sulfur powder OR cinnamon, place in dry low light for another 7 days.\n• New growth tips emerging from areoles → great sign! The stalk is healthy and adapting to life as a standalone.\n• Stalk shriveling overall → underwatering OR root damage from when the colored top was attached/cut. Water modestly, check roots.\n• Stalk turning yellow or pale → too much direct sun; move to bright indirect for 2 weeks.\n• Soft mushy section → cut above the rot, callus the cut, replant. Hylocereus is resilient and almost always recovers.\n\nPINCUSHION (Mammillaria spinosissima):\n• Stretching tall and pale → not enough sun. Move to brighter spot.\n• Heads turning soft/mushy → root rot. Salvage healthy heads as cuttings.\n• White cottony spots between spines → MEALYBUGS. Dab with isopropyl alcohol on a Q-tip; check weekly for 3 weeks.\n• No flowers ever → need cooler dry winter rest (45–55°F nights, no water Dec–Feb).\n\nALL:\n• Brown corky patches at base → normal aging.\n• Soft mushy base / collapse → root rot. Cut above the rot, callus the cut, repot dry.\n• ⚠️ All three species are NON-TOXIC to pets (per ASPCA) but the SPINES are physical hazards — Mammillaria's long central spines especially can puncture skin. Keep out of reach of curious pets and small children."
    },
    sources: [
      { label: "Missouri Botanical Garden — Gymnocalycium mihanovichii", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=281166" },
      { label: "Missouri Botanical Garden — Mammillaria spinosissima", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b350" },
      { label: "Missouri Botanical Garden — Hylocereus undatus (Dragon Fruit)", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276866" },
      { label: "Llifle Encyclopedia — Gymnocalycium mihanovichii", url: "http://www.llifle.com/Encyclopedia/CACTI/Family/Cactaceae/8049/Gymnocalycium_mihanovichii" },
      { label: "Llifle Encyclopedia — Mammillaria spinosissima", url: "http://www.llifle.com/Encyclopedia/CACTI/Family/Cactaceae/12152/Mammillaria_spinosissima" },
      { label: "Llifle Encyclopedia — Hylocereus undatus", url: "http://www.llifle.com/Encyclopedia/CACTI/Family/Cactaceae/24310/Hylocereus_undatus" },
      { label: "University of Florida IFAS — Pitaya (Dragon Fruit) Production", url: "https://edis.ifas.ufl.edu/publication/HS1068" },
      { label: "Cactus and Succulent Society of America — Care Resources", url: "https://cactusandsucculentsociety.org/" },
      { label: "University of Arizona Cooperative Extension — Cactus Care", url: "https://extension.arizona.edu/publication/cacti-succulents" },
      { label: "Desert Botanical Garden — Care Guides", url: "https://dbg.org/learn/" },
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
      lighting: "Bright INDIRECT light is ideal — English Ivy prefers cooler/dimmer conditions than most tropicals.\n\n• A north window or several feet from an east window works beautifully.\n• Direct hot sun bleaches the leaves.\n• Variegated cultivars (silver, gold, white) need MORE light than solid green to keep their pattern. Insufficient light → revert to all-green.\n• Outdoors in summer: dappled shade only.",
      soil: "User's 70/30 potting/perlite is appropriate. English Ivy likes well-draining soil with moderate moisture retention. Avoid pure mineral or pure peat mixes.",
      watering: "Water THOROUGHLY when the top inch of soil is dry.\n\n• 5\" pot: ~6–7 days warm season, ~6 days peak summer, ~10–11 days cool season.\n• Empty saucer 15 min after — never let it sit in standing water.\n• Underwatering: leaves become crispy and brown at edges.\n• Overwatering: leaves turn yellow and mushy; root rot follows.\n• English Ivy is prone to spider mites in dry conditions — boost humidity (50%+) or mist 2–3× a week.",
      pruning: "Aggressive pruning is welcome — ivies bounce back.\n\n• Pinch back tips weekly during growing season to encourage bushy fullness.\n• Trim leggy or browning stems back to a node.\n• Use sterile shears.\n• Save the cuttings for propagation (see Propagation).\n• Best in spring/early summer.",
      propagation: "VERY EASY — one of the simplest plants to propagate.\n\n• Take 4–6\" stem cuttings just below a node.\n• Strip the bottom 2–3 leaves.\n• Stick directly into water OR moist potting mix.\n• Roots in 2–4 weeks.\n• Success rate >90% — ivy will root in almost any conditions.\n• Best in spring/early summer but works year-round.",
      repotting: "Every 1–2 years.\n\n• Spring is best.\n• Up-pot by 1\" diameter only — ivy likes being slightly root-bound (more vigorous growth).\n• Trim dead/circling roots when repotting.\n• Don't water for 2–3 days after to let any nicked roots heal.",
      feeding: "Balanced liquid fertilizer at HALF strength every 4 weeks spring/summer.\n\n• Reduce to once every 8 weeks in fall.\n• None in winter.\n• Flush soil every 2–3 months to clear salt buildup.",
      troubleshooting: "• Brown crispy leaves → underwatering OR low humidity. Increase frequency or humidity.\n• Yellow leaves with mushy stems → overwatering / root rot.\n• Pale leaves with stippled / dotted texture → SPIDER MITES (the #1 ivy pest). Look closely with a hand lens — fine webs and tiny dots underneath. Rinse foliage thoroughly; treat with insecticidal soap weekly for 3 weeks.\n• Lost variegation in variegated cultivars → not enough light. Move closer to a brighter window.\n• Leggy growth / sparse leaves → not enough light, or skipping pruning.\n• Leaf drop in winter → cold drafts. Move away from doors/windows.\n• Reverted all-green growth → trim those branches off to preserve variegation.\n• ⚠️ Mildly TOXIC to pets if ingested — saponins cause vomiting, diarrhea. Keep out of reach of cats and dogs.\n• ⚠️ All Hedera species are mildly skin-irritating — gloves recommended for sensitive skin."
    },
    sources: [
      { label: "Missouri Botanical Garden — Hedera helix", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276956" },
      { label: "RHS — Hedera helix", url: "https://www.rhs.org.uk/plants/search-results?query=hedera+helix" },
      { label: "University of Florida IFAS — Hedera helix", url: "https://edis.ifas.ufl.edu/publication/MG313" },
      { label: "ASPCA — English Ivy Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/english-ivy" },
      { label: "The Sill — Ivy Care Guide", url: "https://www.thesill.com/blog/plant-care" }
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
      lighting: "Bright INDIRECT light brings out the iconic purple-silver-green zebra striping. With a glass bowl, light from below also reflects through and back up — a real advantage for Tradescantia.\n\n• Best location: 1–2 feet from an east window, or 3–5 feet back from a south/west window.\n• In low light the leaves fade to dull green-purple within 6–8 weeks.\n• Direct afternoon sun through glass can magnify and scorch leaves — avoid unfiltered direct south/west sun.\n• Rotate the bowl every 2 weeks for even color development.",
      soil: "Currently in 70/30 potting/perlite. CRITICAL for a glass bowl with no drainage:\n• 1\" bottom layer of small pebbles or LECA (creates false-drainage void).\n• Thin sprinkle of activated charcoal on top of the pebbles (prevents anaerobic stink).\n• Then the 70/30 potting/perlite on top.\n\nLong-term option: drill a drainage hole in the bottom of the glass bowl with a diamond-coated bit (a 2-min job; converts it to a true planter). Otherwise, plan to repot into a traditional drainage pot at the 6-month mark.",
      watering: "⚠️ The single biggest risk for this setup. A glass bowl with no drainage holds water at the bottom invisibly — root rot can start before you ever see a problem at the surface.\n\nProtocol:\n• Stick a finger 1\" into the soil. ONLY water if the top inch is bone-dry to the touch.\n• Pour just enough water to lightly moisten the top half — NEVER until it puddles at the bottom.\n• Tilt the bowl 30 minutes after watering to check for standing water at the base; pour off any excess.\n• Frequency: ~7–9 days warm season, ~12–15 days cool season (LESS frequent than a drained pot would need).\n• Use room-temp filtered or tap-sat-out water (Tradescantia is mildly sensitive to chlorine).\n• Every 4–6 weeks, FULLY tilt and pour out any standing reservoir water to refresh.",
      pruning: "Tradescantia gets leggy fast — pinch the top growth tip on each vine every 4–6 weeks to encourage bushy, dense growth.\n\n• Pinch just above a node with clean fingertips (no tools needed — Tradescantia stems are very soft).\n• Each pinch produces 2 new branches from below the cut.\n• Use removed tips as new propagation cuttings — Tradescantia roots in water in 5–10 days, the fastest of all your plants.\n• Trim any yellowing or browning lower leaves at the base.",
      propagation: "Easiest plant in your collection to propagate.\n\nMethod A (water): cut a 4\" tip with 2–3 nodes, drop in a jar of water with nodes submerged. Roots in 5–10 days. Plantable in 2 weeks.\nMethod B (soil): stick a tip cutting directly into moist soil — roots in 2–3 weeks at >90% success.\nMethod C (lay on soil): lay a vine horizontally on damp soil; each node will root and shoot a new vine — fast way to fill out a pot.\n\nBest season: any time; fastest in spring/summer.",
      repotting: "Currently in a 4\" glass bowl with 6 cuttings.\n\n6-month checkup:\n• Lift one cutting carefully and check roots — if they're circling the bottom, time to upsize.\n• Recommended next step: transfer the whole clump to a 5–6\" pot with DRAINAGE (terracotta or plastic with holes). The plant will visibly perk up once it can drain freely.\n• Tradescantia tolerates aggressive root pruning if you want to keep it in the same bowl — trim the bottom 1/3 of roots before replanting.\n• Spring is ideal for repotting.",
      feeding: "Wait 6 weeks after transition for roots to establish before feeding.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (10-10-10 or 20-20-20) at QUARTER strength every 4–6 weeks in spring/summer.\n• ⚠️ Go EXTRA light on fertilizer in a no-drainage glass bowl — fertilizer salts build up with no way to flush them. Burned leaf tips are the warning sign.\n• Stop fertilizing entirely Oct–Feb.\n• Every 2 months, fully tilt the bowl and pour off any reservoir water to flush salts.",
      troubleshooting: "GLASS-BOWL SPECIFIC:\n• Stems rotting at the soil line → too much water OR no drainage layer. Tilt out excess, let dry completely, may need to repot to drained container.\n• Cloudy/smelly water visible at the bottom → algae or anaerobic bacteria. Time to drain the bowl, refresh charcoal layer, repot if persistent.\n• White crusty buildup on glass → mineral salts from tap water. Switch to filtered, flush soil quarterly.\n\nGENERAL:\n• Leggy / pale stems → not enough light. Move to a brighter spot.\n• Brown leaf tips → tap-water minerals OR low humidity.\n• Yellow lower leaves → natural aging OR oversaturated soil.\n• Vines getting bare at the base → time to pinch tips and take cuttings to fill in.\n• Spider mites in dry winter air → rinse foliage, spray with insecticidal soap weekly.\n• ⚠️ Mildly TOXIC — Tradescantia sap causes skin irritation in sensitive people and mouth/stomach irritation in pets. Keep cats from chewing it."
    },
    sources: [
      { label: "Missouri Botanical Garden — Tradescantia zebrina", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=a801" },
      { label: "RHS — Tradescantia zebrina", url: "https://www.rhs.org.uk/plants/search-results?query=tradescantia+zebrina" },
      { label: "University of Florida IFAS — Tradescantia zebrina", url: "https://edis.ifas.ufl.edu/publication/FP589" },
      { label: "ASPCA — Tradescantia Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/wandering-jew" },
      { label: "The Sill — Tradescantia Care Guide", url: "https://www.thesill.com/blog/plant-care" }
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
      lighting: "Bright INDIRECT light keeps the gold variegation crisp and saturated. Native habitat: tropical forest understory in the Solomon Islands, where it climbs trees toward dappled sun.\n\n• Best spot: 2–4 feet from an east-facing window, or 4–8 feet back from a south/west window.\n• Avoid direct afternoon sun — leaves bleach and crisp.\n• In low light the yellow fades to green within 6–8 weeks but the plant survives fine — Golden Pothos is THE most low-light-tolerant pothos cultivar.\n• Rotate the pot 1/4 turn every 2 weeks for balanced growth across all 7 cuttings.\n• Pothos leaves naturally point toward their light source — use this as a free 'light meter'.",
      soil: "Aroid mix is ideal: 1 part potting soil + 1 part perlite + 1 part orchid bark + a pinch of horticultural charcoal. Slightly acidic pH (5.5–7.0) is preferred.\n\n• Why chunky: Golden Pothos is a hemiepiphyte — in the wild it starts on the ground and climbs trees, so its roots are adapted to high airflow.\n• Avoid: pure peat moss, garden soil, anything that compacts.\n• Refresh top 2\" of soil every spring even between repots.",
      watering: "Water THOROUGHLY when the top 1–2 inches of soil feel dry. Drench until water flows out the drainage holes; empty the saucer within 15 minutes.\n\n• Frequency in a 5\" pot with 7 cuttings: ~6–7 days warm, ~10–12 days cool.\n• Use room-temp filtered or tap-sat-out water (variegation responds to clean water).\n• Lift-the-pot test: if it feels noticeably lighter than after watering, it's time.\n• Drooping leaves on a dry pot → thirsty, recovers in 4 hours; drooping on a wet pot → root rot.\n• ⚠️ OVERWATERING is the #1 killer of Pothos — when in doubt, wait one more day.",
      pruning: "Pothos is one of the most prunable plants in existence — every cut produces new growth from below.\n\n• Pinch tips just above a node to keep the plant bushy and prevent leggy vines.\n• Cut long trailing vines back by 1/3 in spring to encourage thicker stems.\n• Save EVERY cutting — Golden Pothos roots in water in 1–2 weeks at >95% success rate. Free new plants.\n• Use sterile scissors; wipe with rubbing alcohol between cuts.",
      propagation: "The poster child for easy propagation.\n\n• Take 4–6\" tip cuttings, each with at least 1 node and ideally a leaf.\n• Water method: drop in a jar of water with nodes submerged, change water weekly. Roots in 1–2 weeks. Plantable at 2\" roots.\n• Soil method: stick directly into moist soil under a clear cup or bag for 2 weeks. Roots in 3–4 weeks.\n• Success rate >95% in both methods.\n• Best season: any time; fastest in spring/summer.",
      repotting: "Newly potted — leave alone for 6+ months.\n\nUpsize timeline:\n• 5\" → 6\" at year 1 (when roots circle the pot or come out of drainage holes).\n• 6\" → 7–8\" at year 2.\n• Up-pot by only 1\" diameter each time — Pothos prefers being slightly root-bound.\n• Best season for repotting: spring (March–May).\n• Optional power move: add a 24\" moss pole or coir totem to the center of the pot. Pothos leaves DRAMATICALLY enlarge (sometimes 4–6× normal size) when allowed to climb, with deeper fenestrations like an immature Monstera.",
      feeding: "Hold off feeding for 4–6 weeks while cuttings establish soil roots.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (20-20-20) at HALF strength every 4 weeks in spring/summer.\n• Slow-release pellets (Osmocote) in spring are an easy alternative.\n• Flush the soil with plain water every 2–3 months to prevent fertilizer salt buildup.\n• Stop feeding Oct–Feb.",
      troubleshooting: "• Yellow leaves → most often OVERWATERING (let dry out, check roots). Less commonly: low light or natural aging of old leaves.\n• Brown crispy leaf edges → underwatering OR dry air OR mineral buildup in soil (flush with plain water).\n• Leggy bare vines → not enough light, or skipping pruning. Cut back hard; new growth will be denser.\n• Loss of yellow variegation → low light. Move closer to a window; new leaves will brighten within 4–6 weeks.\n• All-yellow new leaves → too much direct sun; relocate.\n• Pale leaves with green veins (chlorosis) → iron or magnesium deficiency; foliar-feed with liquid kelp.\n• Stunted growth after repot → normal for first 6 weeks; resume normal care.\n• Spider mites, mealybugs, scale → rinse foliage, treat with insecticidal soap or 70% isopropyl on a cotton swab.\n• ⚠️ TOXIC to cats and dogs — insoluble calcium oxalates cause mouth pain, drooling, and difficulty swallowing if chewed. Keep out of reach."
    },
    sources: [
      { label: "Missouri Botanical Garden — Epipremnum aureum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276739" },
      { label: "University of Florida IFAS — Pothos", url: "https://edis.ifas.ufl.edu/publication/FP188" },
      { label: "RHS — Epipremnum aureum", url: "https://www.rhs.org.uk/plants/search-results?query=epipremnum+aureum" },
      { label: "ASPCA — Pothos Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/pothos" },
      { label: "The Sill — Pothos Care Guide", url: "https://www.thesill.com/blog/plant-care" }
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
      lighting: "Variegated 'Pearls and Jade' needs MORE light than solid-green pothos to maintain its cream-and-white speckling.\n\n• Bright indirect with 1–2 hours gentle morning sun is ideal.\n• In low light the variegation fades to pale green and growth slows even more dramatically (this cultivar is already a notoriously slow grower).\n• An east window 6–12\" from the glass, or 3–4 feet back from a south/west window, are the sweet spots.\n• If new leaves emerge all-green, the plant is telling you to move it brighter.",
      soil: "Aroid-style mix is ideal — equal parts potting soil + perlite + orchid bark, plus a tablespoon of horticultural charcoal. The chunky bark keeps oxygen at the roots, which variegated cultivars need more than green forms (they have less chlorophyll, so root stress hurts faster).\n\nAvoid heavy peat-only potting mix in a small 3\" pot — it will stay wet too long between waterings.",
      watering: "Small 3\" pot dries fast — check every 3–4 days by sticking a finger 1\" into the soil. Water THOROUGHLY when the top half-inch is dry, until water drains from the bottom; empty the saucer 15 minutes later.\n\n• Frequency in a 3\" pot: ~4–5 days warm season, ~7–9 days cool season.\n• Use room-temp filtered or tap-sat-out water.\n• ⚠️ Don't let bone-dry — Pearls & Jade is more sensitive to drought stress than Golden Pothos because the cream/white sections can't photosynthesize their way back from damage.\n• Don't overwater either — root rot is the #1 killer of newly-transitioned cuttings in small pots.",
      pruning: "Minimal for the first 2 months while cuttings establish their soil roots.\n\nOnce established (when you see new leaves emerging):\n• Pinch tips just above a node to encourage branching.\n• Remove any all-green REVERTED leaves at the node — once a vine reverts, that vine stays green; cut it back to keep variegation dominant.\n• Save tip cuttings for more propagation (Pearls & Jade is patent-protected; legally cuttings are for personal use, not for sale).",
      propagation: "Already done! Now in soil. For future propagation:\n• Take 4\" tip cuttings with 1–2 nodes from the MOST variegated sections (variegation is passed at the node).\n• Root in water (3–4 weeks for visible roots, 6–8 weeks for plantable length) or directly in moist sphagnum.\n• Success rate ~80% (lower than Golden Pothos because less chlorophyll = slower energy regeneration).",
      repotting: "Newly potted — leave alone for 6 months minimum to let roots fill the 3\" pot.\n\nFuture upsize plan:\n• 3\" → 4\" pot at month 6–9 (when roots circle the inside).\n• 4\" → 5\" at year 2.\n• Always upsize by only 1\" diameter — Pearls & Jade hates being overpotted (excess wet soil → rot).\n• Spring is best for repotting.",
      feeding: "Hold off feeding for the FIRST 4–6 weeks while cuttings establish soil roots (fertilizer salts can burn fresh roots).\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (10-10-10 or 20-20-20) at QUARTER strength every 4 weeks in spring/summer.\n• A pinch of Epsom salt (magnesium) dissolved in water once a month boosts the variegation richness — magnesium is a central component of chlorophyll.\n• No feeding in fall/winter.",
      troubleshooting: "• Loss of variegation / all-green new leaves → light too low. Move 1–2 feet closer to a bright window.\n• Wilting despite moist soil → root rot from transition stress; check roots, trim any mushy ones, repot in drier mix.\n• Wilting with dry soil → water immediately; in a 3\" pot this is normal if you skipped a few days.\n• Slow growth → normal! Pearls & Jade grows ~1–2 nodes/month compared to Golden Pothos' 4–6.\n• Yellow leaves: if old all-green leaves yellow first, that's natural aging; if cream-variegated leaves yellow, check light + watering.\n• Crispy brown edges → low humidity or fluoride/chlorine sensitivity. Use filtered water.\n• ⚠️ TOXIC to cats and dogs — insoluble calcium oxalates cause mouth irritation and drooling."
    },
    sources: [
      { label: "University of Florida — Pothos Cultivars", url: "https://edis.ifas.ufl.edu/publication/FP188" },
      { label: "Missouri Botanical Garden — Epipremnum aureum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276739" },
      { label: "RHS — Epipremnum aureum", url: "https://www.rhs.org.uk/plants/search-results?query=epipremnum+aureum" },
      { label: "ASPCA — Pothos Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/pothos" },
      { label: "Costa Farms — Pothos Care", url: "https://costafarms.com/plants/pothos" }
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
      lighting: "Bright INDIRECT light is the sweet spot for all three cultivars in this combo, but the Satin needs the brightest position to keep its silver speckling vivid. Position the pot in the brightest indirect spot you have (e.g. 2–3 feet from an east window, or 4–6 feet back from a south/west window).\n\n• The Satin Pothos will tell you first if the light drops too low — its silver speckling fades within 4–6 weeks.\n• The Neon Pothos will deepen to a darker green-yellow in lower light but stays healthy.\n• The Golden Pothos is the most light-flexible of the trio.\n• Rotate the pot 1/4 turn every 2 weeks so all three cultivars get even exposure.\n• Direct afternoon sun scorches the Satin's silver patches first.",
      soil: "Currently in aroid mix — perfect compromise for the three species:\n\n• Scindapsus pictus (Satin) has fleshy roots and is the most rot-prone in the combo — chunky bark + perlite is critical.\n• Epipremnum aureum (Golden + Neon) are happy in anything well-draining.\n• Top-dress with a thin layer of fresh aroid mix every spring.",
      watering: "Water THOROUGHLY when the top inch of soil feels dry, then let drain. The Satin's drought tolerance lets you skew slightly drier than you would for pure Golden Pothos.\n\n• Frequency in this 4\" pot: ~6–7 days warm, ~10–12 days cool.\n• Use room-temp filtered or sat-out tap water.\n• When in doubt, wait one more day — overwatering kills Scindapsus much faster than Epipremnum.\n• Empty the saucer 15 min after watering.\n• A 4\" pot with 6 cuttings packed in will transpire fast — check the soil with your finger weekly even in cool season.",
      pruning: "Pinch tips every 4–6 weeks once established.\n\n• Each pinch produces 2 new shoots — keeps the combo bushy instead of leggy.\n• Trim any all-green reverted vines from the Neon back to a healthy node (Neon should stay chartreuse; if a vine darkens to standard green, prune it out).\n• Take all-trio cuttings in spring — propagate each cultivar separately into water, then graduate into a new shared pot if desired.\n• Don't let the faster-growing Golden vines completely shade out the slower Satin — pinch back Golden more aggressively if it dominates.",
      propagation: "All three species root from any node-containing cutting in water or soil. Roots in 1–3 weeks depending on cultivar:\n\n• Golden Pothos: 1–2 weeks (fastest).\n• Neon Pothos: 1–2 weeks.\n• Satin Pothos / Scindapsus: 3–4 weeks (slower).\n\nUse separate jars when propagating to track each species — if you ever want to rebuild the combo with new cuttings, you'll know exactly what you have.",
      repotting: "Newly assembled — leave undisturbed for 6+ months.\n\nUpsize plan:\n• 4\" → 5\" or 6\" at year 1 (when roots fill the pot).\n• Best to upsize ALL three cultivars together to preserve the display.\n• If you want to separate them later: gently rinse soil off the rootball, tease apart each species' root system, and pot individually.",
      feeding: "Hold off fertilizer for 6 weeks while soil roots establish.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (20-20-20) at HALF strength every 4 weeks in spring/summer.\n• Flush the soil with plain water every 2 months to clear salt buildup.\n• Stop feeding Oct–Feb.\n• If one species starts visibly lagging while the others thrive, consider isolating it — sometimes shared pots favor faster growers and starve slower ones over years.",
      troubleshooting: "• Satin's silver speckling fading → not enough light; move 1–2 feet brighter.\n• Curling Satin leaves with crispy edges → low humidity (Satin needs 60%+).\n• Neon turning dark green → low light; move brighter.\n• Yellow Golden leaves → overwatering most likely.\n• One species visibly dominating → pinch back aggressively; the others need their share of light and root space.\n• Brown tips across all three → tap water minerals; switch to filtered.\n• ⚠️ TOXIC to cats and dogs — ALL THREE species contain insoluble calcium oxalates. Keep out of reach."
    },
    sources: [
      { label: "Missouri Botanical Garden — Scindapsus pictus", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275437" },
      { label: "Missouri Botanical Garden — Epipremnum aureum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276739" },
      { label: "University of Florida IFAS — Pothos Cultivars", url: "https://edis.ifas.ufl.edu/publication/FP188" },
      { label: "RHS — Epipremnum aureum and Scindapsus pictus", url: "https://www.rhs.org.uk/plants/search-results?query=epipremnum+aureum" },
      { label: "ASPCA — Pothos Toxicity (applies to Scindapsus too)", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/pothos" },
      { label: "Costa Farms — Pothos Care Guide", url: "https://costafarms.com/plants/pothos" },
      { label: "The Sill — Pothos Care", url: "https://www.thesill.com/blog/plant-care" }
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
      lighting: "Medium-bright INDIRECT light is ideal — Fittonia is one of the few houseplants that genuinely tolerates low light AND prefers it over direct sun. The native habitat is the dim Peruvian rainforest understory.\n\n• Best spots: north or east window, or 3–5 feet back from any other window.\n• Direct sun scorches the delicate leaves within hours.\n• Humid bathrooms, terrariums, bottle gardens, and under-cabinet positions are all great.\n• Grow lights at low intensity (5,000–10,000 lux) work well in winter.",
      soil: "Currently in African violet mix — perfect peat-rich choice. Could also use 1 part peat + 1 part coco coir + 1 part fine perlite for a DIY mix.\n\n⚠️ In a 1\" pot, the soil reservoir is so tiny that mix choice matters less than container size. Plan to upsize within 4–8 weeks.",
      watering: "⚠️ A 1\" pot with 4 cuttings is a daily-check situation. Fittonia is famous for dramatic wilting at the slightest moisture stress — a 1\" pot in warm air can dry from morning to evening.\n\nProtocol:\n• Check moisture EVERY DAY by feel — the top of the soil should feel slightly damp at all times.\n• Bottom-water if possible: set the pot in a shallow dish of room-temp water for 10 minutes, then drain.\n• Frequency: ~2–3 days warm season (sometimes daily in hot months), ~4–6 days cool season.\n• Use filtered, distilled, or rainwater — Fittonia leaves are very sensitive to chlorine and fluoride (brown tips).\n• PROTIP: place the entire 1\" pot inside a clear plastic bag or cloche between waterings — humidity instantly rises to terrarium-level (70%+), drying slows by 3–4×, and Fittonia thrives.\n• If you spot dramatic wilting: soak immediately. Recovery is fast (1–2 hrs) but repeated wilting stresses the plant long-term.",
      pruning: "Pinch back tips every 3–4 weeks to keep Fittonia bushy and compact (which matters even more in a tiny pot — leggy growth tips would flop over the edge).\n\n• Pinch just above a node with clean fingertips.\n• Each pinch produces 2 new shoots.\n• Save tip cuttings — Fittonia roots in water in 2–3 weeks at >90% success.\n• Remove any spent flower spikes (the blooms are insignificant and drain energy).",
      propagation: "VERY EASY in water or directly in soil. You already proved that with this batch.\n\nFor future propagation:\n• Take 3–4\" tip cuttings with 2–3 nodes.\n• Water: drop in a jar with nodes submerged, roots in 2–3 weeks.\n• Soil: stick straight into moist mix under a humidity dome (plastic bag or cloche), roots in 2–3 weeks.\n• Best season: spring/summer; success rate >90%.",
      repotting: "🚨 Top priority: upsize from this 1\" pot within 4–8 weeks. Recommended targets:\n\n• 3\" wide-and-shallow pot with drainage — easy upgrade, slows down the daily-watering treadmill significantly.\n• Small closed terrarium (5–8\" diameter) — Fittonia's IDEAL home. Self-regulating humidity, watering drops to once every 2–3 months, color and growth dramatically improve.\n• Glass cloche over a 3\" pot — middle ground between terrarium and open pot.\n\nWhen repotting: gently lift the whole cluster from the 1\" pot, place into the new container (no need to separate the 4 cuttings — they look better as a clump), backfill with fresh African violet mix, water in lightly.",
      feeding: "Hold off feeding for at least 6 weeks while cuttings establish soil roots — and even longer because a 1\" pot has so little soil that fertilizer salts concentrate quickly.\n\nAfter 6 weeks (and ideally after upsizing):\n• Balanced liquid fertilizer (10-10-10) at QUARTER strength every 4–6 weeks growing season.\n• Fittonia is sensitive to fertilizer burn — when in doubt, dilute more.\n• Stop feeding Oct–Feb.",
      troubleshooting: "1\" POT SPECIFIC:\n• Daily / twice-daily wilting → pot is too small. Upsize now or add a humidity dome.\n• Soil bone-dry on top but root ball still feels wet → wait, then bottom-water lightly.\n• Cuttings yellowing en masse → likely root suffocation from crowded roots in tiny soil volume. Upsize ASAP.\n\nGENERAL:\n• Sudden dramatic wilting → underwatering. Soak — leaves usually recover within 1–2 hours.\n• Repeated wilting → soil drying too fast. Upsize, add a humidity dome, or move to a cooler/more humid spot.\n• Brown crispy leaves → low humidity OR chlorine/fluoride in tap water. Switch to filtered, raise humidity above 60%.\n• Leggy growth → not enough light OR skipping pinch-pruning.\n• Pale / faded leaves → too much light (move away from window) OR nutrient deficiency.\n• Spider mites in dry air → rinse foliage, treat with insecticidal soap.\n• ✅ NON-TOXIC to cats and dogs per ASPCA — one of the few totally pet-safe tropicals."
    },
    sources: [
      { label: "Missouri Botanical Garden — Fittonia albivenis", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275203" },
      { label: "RHS — Fittonia albivenis", url: "https://www.rhs.org.uk/plants/search-results?query=fittonia+albivenis" },
      { label: "University of Florida — Fittonia Care", url: "https://edis.ifas.ufl.edu/" },
      { label: "ASPCA — Fittonia Toxicity (non-toxic)", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/nerve-plant" },
      { label: "The Sill — Nerve Plant Care", url: "https://www.thesill.com/blog/plant-care" }
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
      lighting: "Bright INDIRECT light is essential for crisp silver striping. Native habitat: Central American forest understory, where Philodendron hederaceum climbs trees toward dappled sun.\n\n• Best spot: 1–3 feet from an east window, or 3–5 feet back from a south/west window.\n• Direct afternoon sun bleaches the silver sections.\n• In low light the silver fades to dull green-silver within 6–8 weeks and growth slows.\n• Rotate the pot 1/4 turn every 2 weeks for balanced growth across all 5 cuttings.\n• Variegated Philodendron hederaceum cultivars need MORE light than the solid-green 'Heartleaf' form to maintain their pattern.",
      soil: "Aroid mix is ideal: 1 part potting soil + 1 part perlite + 1 part orchid bark + a pinch of horticultural charcoal. Slightly acidic pH (5.5–7.0).\n\nWhy chunky matters MORE for variegated philodendrons:\n• The silver-striped sections have ~40% less chlorophyll than green tissue.\n• Less chlorophyll = slower energy regeneration = the plant has less margin for root stress.\n• Chunky soil keeps roots oxygenated, which is the cheapest insurance against rot.\n\nAvoid: pure potting mix (stays too wet for 5 cuttings in a 4\" pot), peat-heavy mixes, garden soil.",
      watering: "Water THOROUGHLY when the top inch of soil feels dry. With 5 cuttings in a 4\" pot, transpiration is concentrated — expect frequent watering during the first 2 months.\n\n• Frequency: ~5–6 days warm season, ~9–11 days cool season.\n• Drench until water flows out the drainage holes, then empty the saucer within 15 minutes.\n• Use room-temp filtered or tap-sat-out water (silver variegation responds to clean water — chlorine can brown the edges of cream sections).\n• Lift-the-pot test: if it feels noticeably lighter than after watering, water now.\n• ⚠️ When in doubt, wait one more day. A 4\" pot with 5 cuttings will recover from a missed watering faster than from root rot.",
      pruning: "Wait 4–6 weeks before any pruning while soil roots establish.\n\nOnce growing:\n• Pinch tips just above a node to encourage branching — each pinch produces 2 new vines.\n• Remove any all-green REVERTING vines back to the most recent silver-striped node (once a vine fully reverts, it stays green).\n• Save tip cuttings — Silver Stripe roots in water in 1–2 weeks at >90% success.\n• Don't let a faster-growing cutting dominate; pinch back the leaders so all 5 cuttings stay balanced.",
      propagation: "Already done! For future propagation:\n\n• Take 4–6\" tip cuttings with 1–2 nodes (aerial root, if present, speeds rooting).\n• Water method: drop in a jar of water with nodes submerged, change water weekly. Roots in 1–2 weeks. Plantable at 2\" roots.\n• Soil method: stick into moist aroid mix under a clear cup or bag for 2 weeks. Roots in 3–4 weeks.\n• Success rate >90% in both methods.\n• Take cuttings from the MOST silver-striped sections to preserve the variegation pattern (variegation is cellular at each node).\n• Best season: spring/summer; works year-round.",
      repotting: "Newly potted — leave alone 6+ months while roots fill the 4\" pot.\n\nUpsize timeline:\n• 4\" → 5\" at 6–9 months (when roots circle the inside or come out of drainage holes).\n• 5\" → 6\" at year 2.\n• Always upsize by only 1\" diameter — Philodendron hederaceum prefers slightly snug roots.\n• Best season: spring (March–May).\n• Optional power move: add a 18–24\" moss pole or coir totem to the new pot. Philodendron hederaceum leaves DOUBLE in size when allowed to climb, and the silver striping becomes more pronounced.",
      feeding: "Hold off feeding for 6 weeks while cuttings establish soil roots.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (20-20-20) at HALF strength every 4 weeks in spring/summer.\n• Slow-release pellets (Osmocote) in spring are an easy alternative.\n• Flush soil with plain water every 2–3 months to prevent fertilizer salt buildup.\n• A pinch of Epsom salt (magnesium) once a month boosts variegation richness.\n• No feeding Oct–Feb.",
      troubleshooting: "• Loss of variegation / new leaves emerging mostly green → light too low. Move 1–2 feet closer to a bright window.\n• Yellow leaves → most often OVERWATERING (let dry out, check roots). Less commonly: low light or natural aging.\n• Brown crispy leaf edges → low humidity OR mineral buildup in soil (flush with filtered water).\n• Leggy bare vines → not enough light, or skipping pruning. Cut back hard; new growth will be denser.\n• Wilting despite moist soil → root rot from packed cuttings competing for oxygen. Inspect roots, trim mushy ones, repot in fresher chunky mix.\n• Stunted growth for 2+ months → normal during transition; new leaves should appear within 4–6 weeks.\n• Spider mites (fine webs, stippled leaves) → rinse foliage, treat with insecticidal soap weekly for 3 weeks.\n• ⚠️ TOXIC to cats and dogs — insoluble calcium oxalates cause mouth irritation, drooling, and difficulty swallowing if chewed."
    },
    sources: [
      { label: "Missouri Botanical Garden — Philodendron hederaceum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=287199" },
      { label: "The Sill — Philodendron Care", url: "https://www.thesill.com/blog/plant-care-philodendron" },
      { label: "ASPCA — Philodendron Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/philodendron" },
      { label: "RHS — Philodendron hederaceum", url: "https://www.rhs.org.uk/plants/search-results?query=philodendron+hederaceum" },
      { label: "Costa Farms — Philodendron Care Guide", url: "https://costafarms.com/plants/philodendron" }
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
      lighting: "Needs MORE light than Golden Pothos because of heavy white variegation — those cream sections have NO chlorophyll, so the green portions have to do all the photosynthesis. Bright indirect light is essential.\n\n• Best spot: 1–3 feet from an east-facing window, or 4–6 feet back from a south/west window.\n• Direct afternoon sun bleaches and scorches white sections.\n• In low light, new leaves emerge with less variegation (mostly green) — the plant is genetically conserving chlorophyll.\n• Rotate the pot 1/4 turn every 2 weeks for even light to all 7 cuttings.",
      soil: "Aroid mix is ideal: 1 part potting soil + 1 part perlite + 1 part orchid bark + a pinch of horticultural charcoal. The chunky structure is critical when 7 cuttings share a 4\" pot — without it, the soil compacts and roots suffocate.\n\nAvoid:\n• Pure potting mix (stays too wet for tightly packed roots)\n• Coco-coir-heavy mixes (too retentive)\n• Garden soil (compacts and brings pests)",
      watering: "Water THOROUGHLY when the top inch of soil feels dry. With 7 cuttings in a 4\" pot, the water demand is concentrated — expect frequent watering during the first 2 months.\n\n• Frequency: ~5–6 days warm season, ~9–11 days cool season.\n• Always water until liquid drains from the bottom — partial waterings leave dry pockets.\n• Empty the saucer within 15 minutes.\n• Use room-temp filtered or tap-sat-out water (Marble Queen is sensitive to chlorine on white tissue).\n• ⚠️ Don't water on a calendar — check the soil. A 4\" pot in front of an AC vent dries 2× faster than one in a still corner.",
      pruning: "Wait 4–6 weeks before any pruning while soil roots establish.\n\nOnce growing:\n• Pinch tips just above a node to encourage branching — each pinch produces 2 new vines.\n• Remove all-green REVERTING vines back to a heavily variegated node — once a vine reverts to all green, it stays green and will start dominating the pot's variegation balance.\n• Take cuttings from the MOST variegated sections when propagating to preserve the marble pattern in offspring.\n• Use sterile shears; wipe with rubbing alcohol between cuts.",
      propagation: "Pothos propagates from any node-containing cutting in water or soil. Each cutting needs at least 1 node (the bump where a leaf attaches). Roots in 2–3 weeks in water, 4 weeks in soil. Success rate >90%.\n\nVariegation preservation tip: Marble Queen variegation is CHIMERIC — meaning it's stored at the cellular level at each node. Always propagate from the most-variegated section of the stem; a fully-reverted green cutting will produce only green offspring forever.",
      repotting: "Newly potted — leave alone 6+ months while roots fill the 4\" pot.\n\nUpsize timeline:\n• 4\" → 5\" at 6–9 months (when you see roots circling the bottom or coming out of drainage holes).\n• 5\" → 6\" at year 2.\n• Pothos in general prefer to be slightly root-bound, so don't oversize.\n• Spring (March–May) is the best repot window — active growth helps roots recover quickly.",
      feeding: "Hold off fertilizer for the first 6 weeks to avoid burning the freshly-transitioned roots.\n\nAfter 6 weeks:\n• Balanced liquid fertilizer (10-10-10 or 20-20-20) at HALF strength every 4 weeks during spring/summer.\n• Slow-release Osmocote pellets in spring are an easy alternative.\n• Flush the soil with plain water every 2 months to prevent fertilizer salt buildup (which white-variegated leaves are extra sensitive to).\n• Stop feeding entirely Oct–Feb.",
      troubleshooting: "• New leaves emerging mostly-green / loss of variegation → light too low. Move 1–2 feet closer to a bright window. The variegation in older leaves won't return, but new growth will brighten up within 4–6 weeks.\n• All-WHITE new leaves with no green → opposite problem; too much variegation will starve. Cut that vine back to a node with normal variegation.\n• Wilting despite moist soil → root rot from packed cuttings competing for oxygen. Check roots, trim mushy ones, repot in fresher chunky mix.\n• Yellowing of multiple leaves → overwatering (most common in dense plantings) OR depleted nutrients (after 3+ months without feeding).\n• Brown crispy edges → low humidity or fluoride in tap water — switch to filtered.\n• Stagnant growth → normal during transition; new leaves should appear within 4–6 weeks.\n• ⚠️ TOXIC to cats and dogs — insoluble calcium oxalates cause mouth irritation, drooling, and difficulty swallowing if chewed."
    },
    sources: [
      { label: "Missouri Botanical Garden — Epipremnum aureum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=275206" },
      { label: "ASPCA — Pothos Toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/pothos" },
      { label: "RHS — Epipremnum aureum", url: "https://www.rhs.org.uk/plants/search-results?query=epipremnum+aureum" },
      { label: "Costa Farms — Pothos Care Guide", url: "https://costafarms.com/plants/pothos" },
      { label: "University of Florida IFAS — Pothos", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/pothos.html" }
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
    potSize: '2"',
    category: "succulent",
    names: {
      common: ["Zebra Haworthia", "Zebra Plant", "Zebra Cactus", "Pearl Plant"],
      scientific: "Haworthiopsis fasciata (syn. Haworthia fasciata) — Haworthiopsis attenuata is a look-alike"
    },
    wateringDays: 21,
    wateringDaysHot: 18,
    wateringDaysCool: 35,
    currentSoilMix: "other",
    comments: "⚠️ Still in original 2\" nursery pot with peat-heavy retail mix. Zebra Haworthia is uniquely SHADE-tolerant for a succulent — the white raised warts on the dark green leaves are its signature. NON-toxic to pets (rare among succulents). Bright INDIRECT light is ideal — direct hot afternoon sun scorches leaves to red/white. See Repot Suggestion for next steps.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Nursery peat mix is HOLDING TOO MUCH MOISTURE for a succulent — the #1 killer of Haworthia is soggy roots. Repot into a 50/50 cactus mix + perlite (or 60/40 cactus/pumice) as soon as convenient. Until then, water sparingly and only when the pot feels light.",
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
      lighting: "Bright INDIRECT light is the sweet spot — unlike most succulents, Haworthia naturally grows in the shade of rocks and shrubs. Direct hot afternoon sun turns leaves red, brown, or white (sun stress).\n\n• East-facing window is textbook.\n• South/west windows work with a sheer curtain — pull the pot 1–2 feet back from the glass in summer.\n• Tolerates the lowest light of any succulent in this collection — but growth slows dramatically in true low light.\n• Rotate the pot 1/4 turn weekly so the rosette stays symmetrical.",
      soil: "Fast-draining cactus/succulent mix, mineral-heavy. Ideal: 50/50 cactus mix + perlite, or 60/40 cactus/pumice.\n\n• Avoid moisture-retentive peat mixes — root rot within weeks.\n• Terracotta pots preferred for extra evaporation.\n• Neutral pH tolerant (7.0 ideal but broadly forgiving).\n• Repot every 3–4 years or when the rosette outgrows the pot rim.",
      watering: "SOAK and DRY. Water thoroughly, then wait until soil is 100% dry to the bottom.\n\n• 2\" nursery pot warm: ~3 weeks; peak summer: ~2.5 weeks; cool season: 5+ weeks.\n• NEVER let water sit in the crown (center of rosette) — this causes crown rot within days.\n• Water at the soil line, along one edge of the pot.\n• Wrinkled leaves = thirsty (rare — usually happens only after 6+ weeks dry).\n• Reduce ~50% in winter dormancy (Dec–Feb).",
      pruning: "Almost no pruning needed.\n\n• Remove any brown/dried outer leaves at the base with sterile tweezers.\n• Detach mature offsets (pups) that form around the base — they're free plants (see propagation).\n• Flower stalks: cut at the base after blooming to redirect energy back to the rosette.\n• NEVER cut the main leaves — they don't regrow.",
      propagation: "Easy by division of offsets (pups).\n\n• Mature plants send up small rosette pups from the base — wait until each pup has 4+ leaves before removing.\n• Un-pot the whole plant in spring; gently tease pups apart with your fingers or a sterile knife.\n• Let cut surfaces callus 2–3 days in shade.\n• Plant each pup in dry cactus mix in a 2\" pot; wait 5–7 days before first watering.\n• Success rate ~95% — Haworthia is one of the most beginner-friendly succulents to propagate.\n• Leaf cuttings are unreliable — stick to offsets.",
      repotting: "Every 3–4 years, or when pups fill the pot.\n\n• Spring only.\n• Up-pot by 1 inch max — Haworthias LIKE being snug.\n• Bare-root and inspect for rot at the base of the rosette.\n• Switch entirely to mineral cactus mix + perlite/pumice.\n• Terracotta preferred.\n• No water for 5–7 days after — let roots callus.",
      feeding: "Barely a feeder.\n\n• Cactus fertilizer at 1/4 strength ONCE in early spring and ONCE in mid-summer.\n• Absolutely no feeding fall/winter — pushes weak etiolated growth in low light.",
      troubleshooting: "• Leaves turning red/brown/white → sun stress; move back from window OR to east exposure.\n• Leaves soft/mushy at base → CROWN ROT from water in the rosette center or overwatering. Cut off any mushy tissue; let dry out completely for 2 weeks before watering again.\n• Rosette lifting away from soil → root rot below; un-pot and inspect. If roots are black, cut them all off, callus 5 days, replant in dry mix.\n• Brown crispy tips → underwatering (rare) or low humidity.\n• Pale/washed-out leaves → too much direct sun.\n• Elongating/stretching (etiolation) → too little light — actually harder to cause with Haworthia than most succulents, but move to brighter indirect if you see it.\n• Mealybugs in leaf joints → cotton swab with 70% isopropyl alcohol.\n• ✅ SAFE for cats/dogs — one of the very few pet-safe succulents (per ASPCA)."
    },
    sources: [
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
    potSize: '2"',
    category: "succulent",
    names: {
      common: ["Angelina Stonecrop", "Angelina Sedum", "Blue Spruce Stonecrop", "Jenny's Stonecrop"],
      scientific: "Sedum rupestre 'Angelina' (syn. Sedum reflexum 'Angelina')"
    },
    wateringDays: 18,
    wateringDaysHot: 14,
    wateringDaysCool: 30,
    currentSoilMix: "other",
    comments: "⚠️ Still in original 2\" nursery pot with peat-heavy retail mix. Note: 'Sedum rupestre' and 'Sedum reflexum' are two names for the SAME species — 'Angelina' is the yellow-gold needle-leaf cultivar. Fast-spreading ground cover in nature; used here as a compact indoor mat/trailer. Gold color depends on strong light — will revert to green in shade.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Nursery peat mix retains too much moisture — repot into a gritty cactus blend (1 part cactus mix + 1 part perlite + optional 1 part coarse sand) at your convenience. Angelina is a tough plant that tolerates lousy soil BUT nursery peat + indoor light + humidity is the classic rot combo.",
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
      lighting: "BRIGHT direct sun is what makes Angelina 'Angelina' — the trademark chartreuse-yellow color is a stress response to strong light.\n\n• South- or west-facing window, within 1–2 feet of the glass.\n• 6 hours of direct sun ideal; 4+ hours minimum for gold color.\n• In lower light the needles revert to plain green and stems stretch/thin out.\n• Winter: color often DEEPENS to orange-red at the tips (cold + sun stress) — this is desirable and normal.\n• Rotate weekly for even growth.",
      soil: "Gritty, fast-draining. 1 part cactus mix + 1 part perlite is textbook — sand can be added for extra weight/drainage.\n\n• Terracotta pot preferred.\n• Shallow container is fine — roots are shallow.\n• Neutral pH tolerant.\n• The plant is famously non-fussy about fertility — poor soil is actually IDEAL for color intensity.",
      watering: "Water deeply, then let dry mostly through before the next drink. Less water = brighter color.\n\n• 2\" nursery pot warm: ~2.5 weeks; peak summer: ~2 weeks; cool season: 4+ weeks.\n• Angelina tolerates a bit more moisture than most sedums (needles hold less water than jelly-bean leaves).\n• If the needles start looking limp/hollow, water.\n• Some growers report Angelina goes SUMMER-DORMANT in extreme heat — reduce water in July/August if you notice growth slowing.\n• Water at soil line — avoid overhead misting.",
      pruning: "Minimal but useful for shape.\n\n• Snip back leggy stems in early spring to encourage denser branching.\n• The removed cuttings root instantly if you drop them on damp cactus mix — free plants.\n• Remove any brown/dried lower stems.\n• If a stem section starts flowering (small yellow star flowers on tall stalks in summer), cut the flower stalks off to redirect energy back to the mat (unless you want the show).",
      propagation: "STUPIDLY easy — the whole point of ground-cover sedums.\n\n• Break off any stem section 1–2 inches long.\n• Strip the lowest leaves (bury this end).\n• Lay on damp cactus mix and press lightly.\n• Roots form in 5–10 days; no callus period needed.\n• Also propagates from individual needles that drop onto soil — often you'll get 'volunteer' pups in the pot.\n• Success rate: ~99%.",
      repotting: "Rarely needed unless dividing.\n\n• Every 2–3 years if the mat gets crowded.\n• Spring is best.\n• Divide into 2–3 chunks by hand; each chunk becomes a new pot.\n• No callus/rest needed — Angelina bounces back within days.",
      feeding: "Skip fertilizer if you can — lean soil = brighter color.\n\n• If growth stalls, cactus fertilizer at 1/8 strength once in mid-spring is plenty.\n• No fall/winter feeding.",
      troubleshooting: "• Chartreuse color turning solid green → not enough light; move closer to window.\n• Stems stretching leggy → same, not enough light.\n• Brown/black mushy stems at soil line → stem rot; almost always overwatering. Cut off healthy top sections and re-root them.\n• Orange/red tips in winter → normal cold + sun stress; will green up in spring.\n• Needles falling off en masse → underwatering (rare) or sudden temperature change.\n• Powdery mildew on stems in humid conditions → improve airflow, reduce misting.\n• Very few pests — aphids and mealybugs are the main risk. Alcohol swab.\n• Non-toxic to pets per most sources but not on the ASPCA list — no confirmed toxicity."
    },
    sources: [
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
    potSize: '2"',
    category: "succulent",
    names: {
      common: ["Baby Burro's Tail", "Baby Donkey Tail", "Burrito", "Sedum Burrito"],
      scientific: "Sedum burrito (some botanists treat as Sedum morganianum 'Burrito' cultivar)"
    },
    wateringDays: 21,
    wateringDaysHot: 18,
    wateringDaysCool: 35,
    currentSoilMix: "other",
    comments: "⚠️ Still in original 2\" nursery pot with peat-heavy retail mix. This is the CHUNKY-LEAVED cousin of the classic Burro's Tail (Sedum morganianum) — leaves are shorter, rounder, jellybean-shaped, and grip the stem more tightly than the classic. Care is IDENTICAL to Burro's Tail; only real difference is 'Burrito' is a touch less prone to catastrophic leaf-drop when handled.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Nursery peat mix is dangerous for any Sedum burrito/morganianum — the fleshy leaves store enough water that soggy soil = rapid stem rot from the base. Repot into 50/50 cactus mix + perlite ASAP. The classic Burro's Tail (in the 4\" pot) already lives on this recipe.",
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
      lighting: "Bright INDIRECT with a few hours of gentle morning sun is ideal. Filtered south or east window works well.\n\n• Direct hot afternoon sun scorches the waxy leaves — they turn white-pink.\n• In too-low light the strands stretch and the blue-gray color fades to dull green.\n• A hanging planter near a window is the classic placement — it shows off the trailing form once mature.\n• Rotate 1/4 turn weekly for even growth.",
      soil: "Strict cactus/succulent mix with extra perlite or pumice. 50/50 cacti/perlite is ideal. NEVER use moisture-retentive mixes.\n\n• Terracotta pot preferred for extra evaporation.\n• Shallow-wide beats deep-narrow.\n• The current 2\" nursery pot with peat mix is the WORST possible combo — repot ASAP.",
      watering: "SOAK and DRY. Water thoroughly, then wait until soil is completely dry.\n\n• 2\" pot indoors warm: ~3 weeks; peak summer: ~2.5 weeks; cool season: 5–6 weeks.\n• Wrinkled leaves = needs water. Plump and full = fine.\n• Water at the soil line — never let water sit on the strands.\n• Reduce winter watering drastically; goes semi-dormant.\n• 'Burrito' holds a bit more water in its stubby leaves than morganianum — err on the dry side.",
      pruning: "Almost no pruning needed.\n\n• Leaves that drop off easily = free propagation material.\n• Remove any rotted strands at the base with sterile shears.\n• Trim back leggy strands in early spring to encourage branching.\n• ⚠️ Be GENTLE — every accidental touch knocks off leaves, though 'Burrito' is a bit sturdier than morganianum.",
      propagation: "EASIEST succulent to propagate — basically does it itself.\n\n• Pick up dropped leaves from around the pot.\n• Lay them on dry cactus mix; don't bury.\n• In 2–3 weeks tiny roots and a baby plantlet form from the leaf base.\n• Mist lightly every 4–5 days until the leaf shrivels (it's transferring its water to the baby).\n• Once the baby has 3–4 of its own leaves, water normally.\n• Stem cuttings also work — let the cut end callus 3–5 days before potting.",
      repotting: "Every 3–4 years, or never if happy.\n\n• Spring only.\n• Handle with extreme care — wrap the strands in cling film before lifting.\n• Up-pot by 1\" only.\n• No water for a week after to let any nicked roots heal.",
      feeding: "Very light feeder.\n\n• Cactus fertilizer at quarter strength once in spring and once in mid-summer.\n• No feeding fall/winter.\n• Overfeeding causes leggy growth.",
      troubleshooting: "• Strands rotting at base → overwatering. Cut off rotted section, save healthy upper strand as cuttings, repot dry.\n• Leaves dropping en masse → physical disturbance OR sudden temperature change. Move to a stable spot.\n• Leaves shriveling and not plumping after watering → root rot — roots can't take up water.\n• White waxy bloom on leaves → NORMAL — natural protective coating. Don't rub off.\n• Mealybugs in leaf joints → dab with rubbing alcohol on a Q-tip.\n• Yellow-green color (vs. blue-gray) → too little light.\n• ✅ Non-toxic to pets and humans (per multiple sources)."
    },
    sources: [
      { label: "Houseplant 101 — Burro's Tail Care Guide", url: "https://houseplant101.com/plants/burros-tail/" },
      { label: "SucculenCare — Burro's Tail vs. Burrito", url: "https://www.succulencare.com/blog/burros-tail-donkey-tail-succulent-care-guide" },
      { label: "Missouri Botanical Garden — Sedum morganianum (same genus)", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?kempercode=b350" },
      { label: "GrowYourPlant — Burro's Tail complete guide", url: "https://growyourplant.com/en/guides/how-to-grow-burros-tail-complete-guide" },
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
    potSize: '4"',
    category: "succulent",
    names: {
      common: ["String of Pearls", "String of Beads", "String of Peas", "Rosary Vine", "Necklace Plant"],
      scientific: "Curio rowleyanus (formerly Senecio rowleyanus)"
    },
    wateringDays: 17,
    wateringDaysHot: 14,
    wateringDaysCool: 28,
    currentSoilMix: "other",
    comments: "⚠️ Still in original 4\" nursery pot with peat-heavy retail mix. Pearls are the #1 killer to over-love — they store water in the round bead-leaves and rot fast in soggy soil. ⚠️ TOXIC to pets (dogs, cats) and humans if ingested. Best displayed HANGING once repotted. Watch the pearls themselves: plump and translucent = happy; deflated/wrinkled = thirsty.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Nursery peat is the #1 cause of pearl death — swap ASAP into a gritty cactus blend. The pearls are shallow-rooted, so a wide shallow container beats a deep pot. Bottom-watering is strongly preferred to keep the pearls dry.",
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
      lighting: "Bright indirect all day with 1–3 hours of gentle morning direct sun is textbook. Harsh afternoon sun scorches the pearls to yellow/brown.\n\n• East-facing window is ideal.\n• South/west windows work with a sheer curtain.\n• ⚠️ Crucial: the TOP of the pot (soil surface + crown) needs light too. In a hanging basket, if the top is in shadow, strands thin out at the base and eventually die.\n• Rotate the pot 1/4 turn weekly.\n• Under LED grow lights: 12–14 hrs, 6–12 inches above the crown.",
      soil: "Gritty, fast-draining. 50/50 cactus mix + perlite. Pearl-friendly recipe: 2 parts cactus mix + 1 part perlite + 1 part coarse sand.\n\n• Shallow wide container beats deep.\n• Terracotta preferred (unglazed) — extra wicking is welcome.\n• Neutral pH.\n• Repot every 2–3 years or when the pot fills up.",
      watering: "The MOST failure-prone succulent care in this collection — err on the side of dry.\n\n• 4\" pot warm: ~17 days; peak summer: ~14 days; cool season: 4+ weeks.\n• BOTTOM WATERING preferred — sit the pot in a saucer for 10–15 min, then drain and dump. Keeps the pearls dry.\n• Overhead watering (careful, at the soil line only) also works.\n• The pearls themselves are your gauge: plump + round = happy; slightly deflated/pointed = water now; wrinkled = past due.\n• Winter: cut watering to once a month or less — this cool-dry rest also encourages spring blooms (small tufty white flowers with a cinnamon-vanilla scent).",
      pruning: "Trim damaged, discolored, or straggly strands with sterile scissors.\n\n• Cut strands can be laid on dry cactus mix — they root in 1–2 weeks.\n• Pinch back long strands to keep the plant bushy near the crown.\n• Remove any brown or shriveled pearls.",
      propagation: "Extremely easy.\n\n• Cut a strand 4–6 inches long.\n• Lay it on dry cactus mix in a spiral, letting several pearls make contact with the soil.\n• Mist lightly every 3–4 days.\n• Roots form at each contact point within 1–2 weeks.\n• Alternatively, drop individual pearls that have fallen off — many will root.\n• Success rate: 90%+ if soil is kept mostly dry.",
      repotting: "Rarely needed.\n\n• Every 2–3 years or when strands cover the pot rim.\n• Spring is best.\n• Wide-shallow container.\n• Handle strands GENTLY — they detach easily.\n• No water for 5–7 days after.",
      feeding: "Very light feeder.\n\n• Cactus fertilizer at 1/4 strength once in spring, once in mid-summer.\n• Skip fall/winter feeding entirely — pushes weak growth in low light.",
      troubleshooting: "• Pearls shriveling, wrinkled, pointed → underwatering (rare but real). Water thoroughly, then wait normal interval.\n• Pearls mushy, translucent, splitting, yellow → overwatering. Root rot likely. Cut off healthy strands and root them fresh; toss the mother.\n• Bare stems, no pearls at the base → 'Balding' from too little light on the crown. Move to brighter spot; propagate cuttings back into the bald areas.\n• Sudden strand drop → temperature shock or drafts. Move to a stable spot.\n• Straggly, elongated strands with widely-spaced pearls → not enough light.\n• Aphids/mealybugs/whiteflies → cotton swab with 70% isopropyl alcohol; systemic if heavy.\n• Fungus gnats → let soil dry longer between waterings.\n• ⚠️ TOXIC to cats, dogs, and humans — causes drooling, vomiting, diarrhea, and skin irritation from the sap. Hang out of pet reach."
    },
    sources: [
      { label: "RHS — String of beads (Curio rowleyanus)", url: "https://www.rhs.org.uk/plants/string-of-beads" },
      { label: "NC State Extension — Curio rowleyanus (toxic)", url: "https://plants.ces.ncsu.edu/plants/curio-rowleyanus/" },
      { label: "Almanac — String of Pearls Care", url: "https://www.almanac.com/plant/how-care-string-pearls-plant" },
      { label: "Houseplant 101 — String of Pearls (complete guide)", url: "https://houseplant101.com/plants/string-of-pearls/" },
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
      lighting: "FULL DIRECT SUN is non-negotiable. This cactus cannot be talked into liking indirect light.\n\n• South- or west-facing window, within 1 foot of the glass.\n• 4–6+ hrs direct sun daily is the minimum for compact form and rich golden spine color.\n• Without enough light: fingers stretch (etiolate) and stay stretched — permanent damage.\n• Grow light supplement: 12–14 hrs/day, 6–12 inches above the cactus, full-spectrum LED.\n• In summer, can be moved outdoors to filtered morning sun for a boost — acclimate over 2 weeks to prevent sunburn.\n• Rotate 1/4 turn weekly.",
      soil: "Extremely mineral-heavy. 1 part cactus mix + 1 part pumice + 1 part coarse sand (or perlite).\n\n• Terracotta pot strongly preferred.\n• Top-dress with 1/2\" of fine gravel or aquarium pebbles — this keeps the base of the stems DRY, which prevents the #1 killer: fungal rot at the soil line.\n• Neutral to slightly alkaline pH (7.0–7.5) preferred (limestone habitat).\n• Repot every 3–4 years, or when the clump fills the pot.",
      watering: "SOAK and DRY, then dry, then dry, then water. The single biggest cause of cactus death is overwatering.\n\n• 4\" nursery pot warm: ~3 weeks; peak summer: ~2.5 weeks; cool season: 5–6+ weeks; winter dormancy (Nov–Feb): 1–2 waterings TOTAL, or none if the room is cool.\n• BOTTOM WATER whenever possible — pour water into a saucer, let the pot soak for 10–15 min, then drain. This keeps the clump completely dry, which prevents fungal spotting at the stem bases.\n• If top-watering, pour around the EDGE of the pot; never pour over the top of the clump.\n• Skewer test: push a wooden skewer to the pot bottom; if it comes out cool or stained, wait 3–5 more days.\n• Winter cool-dry rest (50–60°F, no water for weeks) TRIGGERS spring flowering — small red-magenta ring of flowers around the top of each finger.",
      pruning: "None. Any damage doesn't grow back.\n\n• Remove offset pups only for propagation.\n• Handle with folded newspaper or tongs — the spines are fine but sharp.",
      propagation: "Extremely easy from offsets.\n\n• Mature clumps produce small offset pups at the base and along the fingers.\n• Twist off a mature pup (2+ inches long) with tongs.\n• Let the cut end callus for 5–7 days in shade.\n• Plant in dry cactus mix in a 2\" terracotta pot.\n• Wait another 7 days before first watering (light mist).\n• Roots form in 3–4 weeks.\n• Success rate: 95%+.",
      repotting: "Every 3–4 years or when the clump overhangs the pot rim.\n\n• Spring/summer only — never in winter dormancy.\n• Bare-root and inspect for pest activity or rot at the base.\n• Terracotta pot 1 size larger.\n• Very mineral mix (see soil above).\n• No water for 7–10 days after.",
      feeding: "Very light feeder.\n\n• Cactus fertilizer at 1/4–1/2 strength once in early spring, once in early summer.\n• Absolutely no feeding fall/winter — pushes weak etiolated growth and breaks dormancy.",
      troubleshooting: "• Fingers stretching thin and pale → not enough light. Move to brightest window or add grow light. Damage is permanent for existing growth; new growth from the top will be compact if light improves.\n• Brown/black spots at soil line → fungal rot from wet stem base. Cut off healthy top portion, let callus 7 days, root fresh in dry mix.\n• Soft, mushy fingers → root rot from overwatering. Almost always fatal for the whole clump; salvage healthy offsets as cuttings.\n• Gold color fading to pale yellow/green spines → not enough light.\n• No spring flowers → didn't get the cool-dry winter rest. Move to cooler spot (50–60°F) and STOP watering Nov–Feb.\n• Scale/mealybugs in the spine mass → systemic pesticide is easier than trying to remove by hand.\n• Fingers wrinkled in summer → occasional light watering needed even in dormancy if the room is warm.\n• ✅ Non-toxic to pets and humans (Mammillaria elongata specifically is not on the ASPCA toxic list), but the fine spines are a mechanical hazard."
    },
    sources: [
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
    potSize: '4"',
    category: "succulent",
    names: {
      common: ["Variegated Elephant Bush", "Rainbow Bush", "Rainbow Elephant Bush", "Mini Jade (Variegated)", "Spekboom (Variegated)"],
      scientific: "Portulacaria afra 'Variegata'"
    },
    wateringDays: 14,
    wateringDaysHot: 12,
    wateringDaysCool: 24,
    currentSoilMix: "other",
    comments: "⚠️ Still in original 4\" nursery pot with peat-heavy retail mix. Semi-woody succulent shrublet with cream-edged green leaves and a distinctive reddish-brown stem. More forgiving than most succulents about watering — but the VARIEGATED form needs MORE light than the plain green version to maintain the cream stripes. Non-toxic to pets. Can be bonsai'd. Beloved in South Africa as 'spekboom' — a keystone climate-remediation species that fixes huge amounts of CO2 relative to its size.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Nursery peat is fine short-term for Portulacaria (this species tolerates more moisture than most succulents), but for indoor conditions in Austin, a mineral cactus mix + perlite will drastically reduce rot risk. Repot into 50/50 cactus/perlite when convenient — no urgency compared to Pearls or Haworthia.",
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
      lighting: "BRIGHTER LIGHT than the plain green Portulacaria — the cream/yellow variegation only stays vivid with strong direct sun.\n\n• 6+ hours of direct sun ideal for full color.\n• South or west window, within 1–2 feet of the glass.\n• In lower light: cream stripes fade to a dull yellow-green; new leaves come in mostly green.\n• Leaves may develop RED tips in strong sun — this is desirable and normal (sun stress).\n• Tolerates partial shade but growth stalls and stems get leggy.\n• Rotate weekly.",
      soil: "50/50 cactus mix + perlite is textbook, but Portulacaria is more forgiving than most succulents.\n\n• Terracotta pot preferred.\n• Neutral pH.\n• Well-drained is essential; sitting in wet soil kills the plant faster than any other issue.\n• Repot every 2–3 years or when the shrublet outgrows the pot.",
      watering: "MORE water than most succulents — this plant has smaller leaves that hold less water and comes from slightly moister habitat than desert species.\n\n• 4\" nursery pot warm: ~2 weeks; peak summer: ~10–12 days; cool season: 3–4 weeks; winter: 5+ weeks.\n• Soak and dry method — water thoroughly, dump the saucer, wait for the soil to dry.\n• Leaves shrivel/pucker when thirsty — a very clear signal.\n• Overwatering signs: mushy stem at soil line, leaf drop en masse.\n• Reduce ~50% in winter.\n• The plant is unusually forgiving of watering mistakes — a big reason it's called 'beginner's jade'.",
      pruning: "PRUNE FREELY — Portulacaria loves being shaped. This is what makes it beloved for bonsai.\n\n• Pinch off tips to encourage branching.\n• Cut back leggy stems in spring; save cuttings for propagation.\n• Bonsai-style wire training on the semi-woody stems works beautifully — wire while young and green, unwrap in 3–6 months.\n• Prune any stems that revert to solid green (no variegation) — reversion spreads if left.",
      propagation: "One of the easiest succulents to propagate.\n\n• Cut a stem 3–5 inches long.\n• Strip the lowest leaves.\n• Callus the cut end 2–3 days in shade.\n• Plant in dry cactus mix in a 2\" pot.\n• Mist lightly after a week; roots form in 2–3 weeks.\n• Cuttings can even be laid directly on soil in a shady spot outdoors — they root from any node that touches the ground.\n• Success rate: 95%+.",
      repotting: "Every 2–3 years or when the shrublet outgrows the pot.\n\n• Spring/summer.\n• Up-pot by 1 inch.\n• Prune the top at repotting to balance the reduced root disturbance.\n• Water lightly 3–5 days after.",
      feeding: "Moderate feeder for a succulent.\n\n• Balanced cactus fertilizer at 1/2 strength once a month during spring and summer.\n• No feeding fall/winter.\n• Responds well to feeding with faster growth — but growth may lose some compactness.",
      troubleshooting: "• Cream stripes fading to solid green → not enough light. Move to brighter window; prune off reverted-green shoots.\n• Leaves dropping en masse → sudden temperature change OR overwatering. Check soil moisture and re-evaluate the watering schedule.\n• Mushy stem at soil line → stem rot from overwatering. Cut off healthy top section, callus 3 days, root fresh.\n• Leaves shriveled and papery → severe underwatering. Water thoroughly; recovery is usually complete within days.\n• Red tips on leaves → sun stress (desirable and normal). No action needed.\n• Aphids on new growth → water spray or insecticidal soap.\n• Mealybugs in stem forks → alcohol swab.\n• ✅ Non-toxic to pets per multiple sources (not on the ASPCA toxic list)."
    },
    sources: [
      { label: "The Spruce — Rainbow Elephant Bush", url: "https://www.thespruce.com/rainbow-elephant-bush-growing-guide-8601956" },
      { label: "Gardenia — Portulacaria afra 'Variegata'", url: "https://www.gardenia.net/plant/portulacaria-afra-variegata-elephant-bush-grow-care-guide" },
      { label: "Missouri Botanical Garden — Cacti & Succulents fact sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" },
      { label: "RHS — Cacti & Succulents growing guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" },
      { label: "Trains.com — Rainbow bush/variegated elephant bush", url: "https://www.trains.com/grw/how-to/gardening/plant-portraits/rainbow-bush-or-variegated-elephant-bush/" }
    ]
  },

  zz_plant: {
    id: "zz_plant",
    repotSigns: [
      "🔴 THIS PLANT: plastic pot is already BULGING/STRETCHING (2026-07-20) — the classic ZZ 'repot me now' signal",
      "Rhizomes visible pushing up through the soil surface",
      "Rhizomes visible against the pot walls when you tilt the pot in light",
      "Glossy leaflets duller than they used to be",
      "Water drains through in <5 seconds despite the peat-based nursery mix",
      "Any cracking sound when you gently squeeze the plastic pot = rhizomes are physically constrained"
    ],
    displayName: "ZZ Plant",
    potSize: '4"',
    category: "tropical",
    names: {
      common: ["ZZ Plant", "Zanzibar Gem", "Aroid Palm", "Emerald Palm", "Fern Arum"],
      scientific: "Zamioculcas zamiifolia"
    },
    wateringDays: 21,
    wateringDaysHot: 18,
    wateringDaysCool: 35,
    currentSoilMix: "other",
    comments: "⚠️ Still in original 4\" nursery pot — AND the plastic pot has started BULGING/STRETCHING (2026-07-20). The underground rhizomes are pushing against the plastic walls, which is the plant's clearest 'repot me now' signal. Escalated repot urgency from 'seasonal' → 'urgent'; the rhizomes are physically constrained and further delay risks cracking the pot open and/or restricting rhizome growth long-term. NOT a succulent botanically — it's an aroid (same family as Monstera, Pothos) — but it stores water in bulbous underground rhizomes and behaves like one. World-class low-maintenance plant: tolerates deep shade, drought for MONTHS, and neglect. ⚠️ TOXIC if ingested — all parts. Keep away from pets and children. Black spots on stems are NORMAL (natural pigment). Extremely slow grower.",
    idealSoil: ["standard_potting", "amended_potting"],
    soilNotes: "The nursery mix (usually peat-based) is fine for ZZ Plants — they actually prefer standard potting mix over cactus mix (unlike everything else in this batch). A little extra perlite (~25%) improves drainage without hurting the plant. Repot mainly to give the rhizomes more room, not to swap the soil.",
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
      lighting: "Genuinely tolerates a huge light range — from bright indirect (fastest growth) all the way down to a dim office corner (slow but survives).\n\n• Bright indirect = fastest growth; new leaflets emerge more often.\n• Medium indirect = fine, growth slows.\n• Low indirect = the plant lives, but growth is basically zero.\n• AVOID direct sun (especially afternoon) — will scorch the glossy leaflets to yellow/brown.\n• A north-facing window is ideal. East is also great.\n• Rotate 1/4 turn monthly — ZZ grows slowly enough that weekly rotation isn't needed.",
      soil: "Standard well-draining potting mix. 75/25 potting + perlite is ideal.\n\n• Do NOT use cactus mix — too gritty; the rhizomes struggle in it.\n• Do NOT use pure peat/coir — too moisture-retentive; root rot risk.\n• Neutral pH.\n• Ceramic pot preferred for stability — mature ZZ plants get top-heavy.\n• Repot every 2–3 years or when rhizomes crack the pot.",
      watering: "The FASTEST way to kill a ZZ is overwatering. The rhizomes store enough water to survive months without a drop.\n\n• 4\" nursery pot warm: ~3 weeks; peak summer: ~2.5 weeks; cool season: 5+ weeks.\n• Rule of thumb: 'When in doubt, don't water.' The plant almost always survives underwatering; almost never survives overwatering.\n• Water thoroughly, drain the saucer, wait until the top 2\" of soil is bone dry.\n• Yellow leaflets or wrinkled stems = overwatering (rare) or root rot; NOT underwatering.\n• Winter: cut watering ~50% (once a month is often plenty).",
      pruning: "Minimal.\n\n• Cut yellowing/damaged stems at the base with sterile shears (any partial cut on a stem just makes the whole stem die back).\n• Do not remove healthy stems for shape — new growth is very slow.\n• Wipe leaflets with a damp cloth every 4–6 weeks to remove dust — a lot of the leaflets means dust builds up fast.",
      propagation: "Two methods — both work, both SLOW (months).\n\n• LEAF PROP: Pluck a single leaflet from a mature stem; let it callus 1–2 days; press the cut end into damp potting mix. In 6–12 months a small rhizome forms; then a shoot appears. Slow but reliable.\n• DIVISION: Un-pot the whole plant in spring; gently pull apart the rhizome cluster; each chunk with 2+ stems and its own rhizome becomes a new plant. Fastest way to get a new mature-looking plant.\n• Water propagation of stem cuttings works too but takes 3–6 months for roots.\n• Success rate: 80% for both — patience is the limiting factor.",
      repotting: "Every 2–3 years only.\n\n• Signs it's time: rhizomes visible at soil surface, plastic pot bulging/cracking/STRETCHING, plant top-heavy. The pot-stretch signal is what happened to this plant on 2026-07-20 — do NOT try to squeeze more time out of a stretched pot; the rhizomes are physically constrained.\n• Spring/early summer preferred BUT if the pot is already deformed, repot immediately in any season — ZZ's rhizome water storage makes off-season repotting low-risk.\n• Up-pot by 1–2 inches ONLY — ZZ likes to be slightly rhizome-bound; jumping 3+ inches invites root rot.\n• If rhizomes won't slide out of a deformed plastic pot: CUT the pot open with sturdy scissors. Snapping a rhizome is worse than sacrificing the pot.\n• Standard mix + 25% perlite.\n• Ceramic pot for stability (top-heavy stems tip a lightweight plastic pot).\n• No water for 5–7 days after (7–10 days if any rhizomes were nicked or trimmed).",
      feeding: "Very light feeder — the rhizome makes ZZ almost indifferent to fertilizer.\n\n• Balanced houseplant fertilizer at 1/2 strength once in mid-spring and once in mid-summer.\n• Skip fall/winter.\n• Overfeeding causes leaflet brown-out — a lot of first-time ZZ growers do this.",
      troubleshooting: "• Yellowing leaflets → OVERWATERING (99% of the time). Cut back on water immediately; check for root rot.\n• Curling/wrinkled stems → severe underwatering (much rarer than overwatering). Water thoroughly.\n• Brown leaflet tips → tap water fluoride/chlorine sensitivity; use filtered water OR let tap sit out 24 hrs.\n• Leaflets falling off en masse → cold shock or severe overwatering.\n• Black spots on stems → NORMAL — natural pigment.\n• Slow/no growth → normal for ZZ; even in perfect conditions, it grows only 6–12 inches a year.\n• Plant tipping over → top-heavy; move to a heavier ceramic pot.\n• Mealybugs (rare) → alcohol swab.\n• ⚠️ TOXIC — all parts contain calcium oxalate crystals. Causes drooling, vomiting, oral/skin irritation. Wash hands after handling. Keep away from pets and children. Do not eat, do not rub your eyes."
    },
    sources: [
      { label: "Missouri Botanical Garden — Zamioculcas zamiifolia", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276468" },
      { label: "Clemson HGIC — ZZ Plant care guide", url: "https://hgic.clemson.edu/factsheet/zz-plant-zamioculcas-zamiifolia-indoor-care-growing-tips-plant-guide/" },
      { label: "University of Florida IFAS — ZZ Plant", url: "https://gardeningsolutions.ifas.ufl.edu/plants/houseplants/zz-plant.html" },
      { label: "NC State Extension — Zamioculcas zamiifolia", url: "https://plants.ces.ncsu.edu/plants/zamioculcas-zamiifolia/" },
      { label: "ASPCA — ZZ Plant toxicity", url: "https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/zz-plant" }
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
    potSize: '4"',
    category: "succulent",
    names: {
      common: ["Desert Rose", "Mock Azalea", "Impala Lily", "Sabi Star"],
      scientific: "Adenium obesum"
    },
    wateringDays: 12,
    wateringDaysHot: 10,
    wateringDaysCool: 45,
    currentSoilMix: "other",
    comments: "⚠️ Still in original 4\" nursery pot with peat-heavy retail mix. Caudiciform succulent — the swollen base ('caudex') is the plant's signature. Stunning pink/red trumpet-shaped flowers on mature plants. ⚠️ HIGHLY TOXIC sap — used historically in Africa as arrow poison. Wear gloves when pruning; keep away from pets, children, and don't touch your face after handling. Enters DEEP dormancy in winter — drops leaves and looks dead. Do not water during dormancy — this is when most beginner growers kill it.",
    idealSoil: ["cactus_mix"],
    soilNotes: "Nursery peat mix is the #1 killer of Desert Rose in cool/humid winters — the caudex rots from the base up. Repot ASAP into a heavily mineral cactus blend. Even 4-year-old growers still lose Desert Roses to root rot from wrong soil.",
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
      lighting: "FULL SUN is non-negotiable for flowering and to prevent the plant from stretching leggy.\n\n• South- or west-facing window, within 1 foot of the glass.\n• 6+ hours direct sun daily minimum in the growing season.\n• Summer: can move outdoors to full sun after 2 weeks of acclimation.\n• Winter dormancy: still wants a bright cool location, but the plant drops its leaves and doesn't photosynthesize much anyway.\n• Grow light supplement: 12–14 hrs, 6–12 inches above canopy.",
      soil: "EXTREMELY mineral-heavy. This is the single most important care factor.\n\n• 1 part cactus mix + 1 part pumice + 1 part perlite (or coarse sand). NO peat-heavy mixes.\n• Terracotta pot strongly preferred.\n• Top-dress with fine gravel around the caudex to keep the base dry.\n• Slightly acidic to neutral pH (6.0–7.0).\n• Repot every 2 years while young, less often as it matures.",
      watering: "SEASONAL water discipline is the #1 care skill.\n\n• Growing season (April–October) 4\" nursery pot: ~12 days; peak summer: ~10 days; ~7 days if outdoors in full sun.\n• Water thoroughly, drain the saucer, wait for the soil to dry.\n• Reduce ~50% starting in October.\n• ⚠️ WINTER DORMANCY (Nov–Feb): STOP WATERING almost entirely. If leaves have dropped, the plant only needs one or two drinks the entire winter — enough to prevent the caudex from shriveling.\n• Overwatering in dormancy = 90% of all Desert Rose deaths.\n• If the caudex is firm and full, it doesn't need water. If it starts to soften/wrinkle, water lightly.",
      pruning: "Prune in spring only, wearing GLOVES (toxic sap).\n\n• Prune back leggy stems to shape.\n• Removing branch tips forces multi-branching — a great way to encourage more flowers.\n• Cuttings root but produce plants without the swollen caudex (the caudex only forms from seed-grown plants).\n• Never prune during winter dormancy.\n• Clean tools with alcohol between cuts.",
      propagation: "Two paths, very different results.\n\n• SEEDS (best): Produces the classic swollen caudex — the whole point of Desert Rose. Sow fresh seed on damp cactus mix in spring; germinates in 1–2 weeks. Takes 3–5 years to bloom.\n• CUTTINGS: Faster to flower but produces plants WITHOUT the caudex — they look like ordinary shrubs. Take 5–6 inch cuttings in spring; let callus 5–7 days; plant in dry cactus mix; light mist after 2 weeks; roots in 4–6 weeks. Success rate ~70%.",
      repotting: "Every 2–3 years while young, every 3–5 years for mature plants.\n\n• Spring only — never fall or winter.\n• Up-pot by 1 inch.\n• Wear GLOVES.\n• Very mineral mix.\n• Consider raising the caudex slightly above soil for a bonsai-like effect.\n• No water for 10 days after.",
      feeding: "Moderate feeder in growing season.\n\n• Balanced flower-boost fertilizer (higher phosphorus, e.g., 10-30-20) at 1/2 strength once every 3–4 weeks in spring and summer.\n• Absolutely no feeding fall/winter — pushes weak growth and breaks dormancy.",
      troubleshooting: "• Soft/mushy caudex → ROOT ROT from overwatering (usually in dormancy). Almost always fatal. Cut off any healthy top section as a cutting; toss the mother.\n• Leaves yellow and dropping in fall → NORMAL. Dormancy trigger. Stop watering.\n• No flowers → not enough direct sun, or plant is too young (needs 3+ years from seed), or overfed with nitrogen (switch to bloom booster).\n• Leggy, elongated growth → not enough light. Move to brighter spot; prune back in spring to force branching.\n• Wrinkled caudex → underwatering (rare) or root problems. Water lightly ONCE; if it doesn't plump up in a week, check roots.\n• Aphids on new growth and flower buds → water spray or insecticidal soap.\n• Spider mites in dry indoor air → increase humidity slightly, spray leaves.\n• Sap on skin → wash immediately with soap and water; avoid touching eyes/face.\n• ⚠️ HIGHLY TOXIC — all parts, especially sap. Historically used as arrow poison. Keep away from pets, children. Wear gloves for any pruning."
    },
    sources: [
      { label: "Missouri Botanical Garden — Adenium obesum", url: "https://www.missouribotanicalgarden.org/PlantFinder/PlantFinderDetails.aspx?taxonid=276116" },
      { label: "RHS — Cacti & Succulents growing guide", url: "https://www.rhs.org.uk/plants/types/cacti-succulents/houseplants/growing-guide" },
      { label: "Missouri Botanical Garden — Cacti & Succulents fact sheet", url: "https://www.missouribotanicalgarden.org/Portals/0/Gardening/Gardening%20Help/Factsheets/Cactus%20and%20Succulents10.pdf" },
      { label: "University of Florida IFAS — Adenium", url: "https://edis.ifas.ufl.edu/publication/EP111" },
      { label: "NC State Extension — Adenium obesum (toxicity)", url: "https://plants.ces.ncsu.edu/plants/adenium-obesum/" }
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
      lighting: "Bright INDIRECT only — this is the #1 thing that kills retail terrariums.\n\n• ⚠️ NEVER place in direct sun, even for 30 minutes. Glass magnifies sunlight onto the closed soil → temperature spikes to 100°F+ in <15 minutes → all three species cook simultaneously. This is irreversible.\n• Best spots in this home: Living Room — Open interior, 2nd Floor — Open, or Bathroom (medium indirect + extra humidity).\n• Diagnostic: a bit of algae on the glass = too much light (move 2 ft farther from window). Stretched/leggy stems reaching for light = too little (move 1 ft closer or add a small grow light).\n• ROTATE the jar a quarter-turn every 1–2 weeks for even growth.",
      soil: "Pre-built 4-layer substrate. From bottom to top:\n  1. ~1\" drainage gravel/pebbles\n  2. ~½\" activated horticultural charcoal (keeps things fresh, prevents stink)\n  3. Thin sphagnum-moss separator (stops soil from migrating into the drainage layer)\n  4. Peat-based growing media (often topped with preserved moss for aesthetics)\n\nDO NOT add fertilizer to this substrate — closed terrariums grow VERY slowly by design (extra nutrients → wild growth → overfills the jar in months → impossible to maintain).",
      watering: "🔴 THE single hardest skill in terrarium care is RESISTING THE URGE TO WATER.\n\nThe condensation test:\n• Light morning fog on the upper glass that clears by afternoon = PERFECT. Do nothing.\n• Heavy persistent fog / water dripping down the glass = TOO WET. Crack the cork open for 2–4 hrs to vent. NO water.\n• ZERO condensation for 7+ days AND soil surface is dry to the touch = time to add water.\n\nWhen you do water:\n• Add literally 1–2 TEASPOONS of distilled / filtered / rain water at a time (NEVER tap — chlorine and fluoride poison Fittonia and Selaginella).\n• Use a pipette, syringe, or squeeze bottle for precision.\n• Water around the edges of the soil, NOT directly on the plants.\n• Wait a full week before adding more — the moisture redistributes via the closed cycle.\n\nTypical Austin indoor schedule: every 6–7 weeks (warm), every 5 weeks (hot, light bumps up), every 10–11 weeks (cool). Always condensation-led, never calendar-led.",
      pruning: "Closed terrariums grow slowly but eventually crowd the jar.\n\n• Fittonia: pinch back leggy stems with sterilized scissors every 4–8 weeks during warm months. Remove any blackened/melted leaves IMMEDIATELY — they spread rot in a sealed environment.\n• Selaginella: trim runners that hit the glass. Remove any browning fronds.\n• 3rd species: similar — keep below ⅔ of the jar's interior height.\n• ALWAYS sterilize scissors with isopropyl alcohol between cuts (one infected leaf can crash a closed terrarium in days).\n• Use long tweezers or chopsticks to remove debris through the cork opening.",
      propagation: "Closed terrariums actively self-propagate via stem cuttings making contact with the moist substrate.\n\n• Fittonia: snap off a 2-leaf node, tuck it into the soil — roots in 2–3 weeks.\n• Selaginella: any piece of stem touching damp soil will sprout new growth.\n• If you want to grow a NEW terrarium, take cuttings from this one (sterilized tools!), root them in a covered tray for 2 weeks, then place into a new layered substrate.\n• NEVER bring outside plants into the closed environment — pest contamination is impossible to control once introduced.",
      repotting: "Closed terrariums are designed to NOT be repotted. The layered substrate is the whole point.\n\n• 1-year refresh: replace just the TOP ½\" of growing media if the existing soil starts to compact or smell. Use sterilized peat-based mix.\n• 2–3 year rebuild: full teardown. Remove plants, wash the glass with diluted hydrogen peroxide (kills algae spores), rebuild the 4-layer stack, sterilize everything, replant with cuttings.\n• Cork top: replace if it gets moldy or starts to crumble — readily available on Amazon in the standard 'demijohn' sizes.",
      feeding: "DO NOT routinely fertilize a closed terrarium. The whole design philosophy is slow, balanced growth.\n\n• If you must feed: 1/10 strength balanced liquid fertilizer (e.g., 0.5 ml of standard fertilizer in 1 cup of water, use 1 tsp of that) ONCE every 6–12 months MAX.\n• Stop entirely from October–February (winter rest).\n• Symptoms of overfeeding in a closed terrarium are immediate and brutal: rapid leggy stretching, leaf burn at the tips, then algae bloom that coats the glass within weeks.",
      troubleshooting: "Sealed closed-terrarium problems and fixes:\n\n• Foggy glass that never clears → TOO MUCH WATER. Crack the cork for 4–8 hrs. Repeat daily until normal AM-only fog returns.\n• ZERO condensation for >7 days → too dry. Add 1–2 tsp distilled water.\n• White/green fuzz on soil → mold from over-saturation or contaminated debris. Remove with tweezers, dust the affected area with cinnamon (natural antifungal), vent for 24 hrs.\n• Black/melted Fittonia leaves → bacterial rot from chronic over-wetness. Remove ALL affected tissue immediately with sterilized scissors. Vent for 48 hrs. Reduce watering frequency.\n• Algae coating the glass interior → too much light. Move 2 ft farther from the window. Wipe with a dampened lint-free cloth via tweezers if needed.\n• Stretched / leggy plants → too little light. Move closer to a window (still indirect!) or add a small LED grow light on a 6–8 hr timer.\n• Tiny flying insects → fungus gnats hitched in with the original substrate. Sticky yellow trap inside the jar (small piece), reduce watering, vent for 24 hrs. Usually self-resolves in 2–3 weeks.\n• Plant ID unknown (3rd species) → take a clear photo of each individual leaf type and the entire jar — easy to ID with that. Common HD terrarium 3rd-plants: Lemon Button Fern (rounded button-leaflets), Polka Dot Plant (pink/red speckles), Aluminum Plant (silver-striped leaves), or Lace Fern (wispy needle-foliage)."
    },
    sources: [
      { label: "Missouri Botanical Garden — Closed Terrarium Care", url: "https://www.missouribotanicalgarden.org/gardens-gardening/your-garden/help-for-the-home-gardener/advice-tips-resources/visual-guides/terrariums" },
      { label: "Royal Horticultural Society — Terrariums", url: "https://www.rhs.org.uk/plants/types/houseplants/terrariums" },
      { label: "Smithsonian Gardens — Building a Terrarium", url: "https://gardens.si.edu/learn/blog/building-a-terrarium/" },
      { label: "NCSU Extension — Terrarium Maintenance", url: "https://content.ces.ncsu.edu/extension-gardener-handbook/18-houseplants" },
      { label: "University of Vermont Extension — Terrarium Plants", url: "https://www.uvm.edu/extension/mastergardener/terrarium-gardens" },
      { label: "American Fern Society — Selaginella vs. true ferns", url: "https://amerfernsoc.org/" },
      { label: "Costa Farms — Fittonia (Nerve Plant) Care", url: "https://costafarms.com/plants/fittonia-nerve-plant" }
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
      lighting: "Identical to Terrarium A — bright INDIRECT only. ⚠️ Never direct sun (glass magnifies sun → 100°F+ inside in <15 min → cook). Rotate the jar quarterly for even growth.\n\nIf the two terrariums are placed side-by-side, check whether one consistently gets slightly more light than the other — that one will need water roughly 20% more often than the dimmer twin. Track separately!",
      soil: "Identical 4-layer substrate to Terrarium A. See A's notes for the rebuild protocol.",
      watering: "Condensation-led, NOT calendar-led. Same protocol as Terrarium A:\n\n• Light AM fog that clears by afternoon → do nothing\n• Heavy persistent fog → vent the cork for 2–4 hrs, NO water\n• Zero condensation for 7+ days AND dry surface → 1–2 tsp distilled water\n\n💡 PROTIP for two terrariums: keep a sticky-note nearby (or use the snooze + log features on this very app!) so you don't double-water — by the time you've watered B, you may have forgotten that A was also due, and over-watering in a closed environment causes rot in days.",
      pruning: "Same as Terrarium A — pinch leggy Fittonia stems every 4–8 weeks warm-season, trim Selaginella runners that hit the glass, remove any black/melted leaves IMMEDIATELY with sterilized scissors.",
      propagation: "Same as Terrarium A. ⚠️ EXTRA WARNING: don't cross-propagate between the two terrariums unless you're 100% sure both are pest- and pathogen-free — a contamination in one can spread to the other and you lose both.",
      repotting: "Same as Terrarium A. Both should be refreshed/rebuilt on roughly the same schedule (1-year top-refresh, 2–3-year full rebuild).",
      feeding: "Same as Terrarium A — essentially none, 1/10 strength every 6–12 months MAX, never in winter.",
      troubleshooting: "Same issues and fixes as Terrarium A. The advantage of having two: if one starts having trouble (mold, algae, leggy growth) and the other doesn't, the difference between them usually points directly to the cause (more light? warmer spot? you watered one and forgot the other?). Use the working twin as the control variable."
    },
    sources: [
      { label: "Missouri Botanical Garden — Closed Terrarium Care", url: "https://www.missouribotanicalgarden.org/gardens-gardening/your-garden/help-for-the-home-gardener/advice-tips-resources/visual-guides/terrariums" },
      { label: "Royal Horticultural Society — Terrariums", url: "https://www.rhs.org.uk/plants/types/houseplants/terrariums" },
      { label: "Smithsonian Gardens — Building a Terrarium", url: "https://gardens.si.edu/learn/blog/building-a-terrarium/" },
      { label: "NCSU Extension — Terrarium Maintenance", url: "https://content.ces.ncsu.edu/extension-gardener-handbook/18-houseplants" },
      { label: "University of Vermont Extension — Terrarium Plants", url: "https://www.uvm.edu/extension/mastergardener/terrarium-gardens" },
      { label: "American Fern Society — Selaginella vs. true ferns", url: "https://amerfernsoc.org/" },
      { label: "Costa Farms — Fittonia (Nerve Plant) Care", url: "https://costafarms.com/plants/fittonia-nerve-plant" }
    ]
  }
};

const OWNED_PLANT_IDS = [
  /* In-soil established plants */
  "prayer_plant",
  "monstera",
  "thai_constellation",
  "schefflera",
  "schefflera_dark",
  "mini_orchid",
  "ginseng_ficus",
  "snake_plant",
  "aloe_vera",
  "mondo_grass",
  "firestick",
  "kalanchoe",
  "burrows_tail",
  "succulent_frankenstein_a",
  "succulent_frankenstein_b",
  "dracaena_fragrans",
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

/* Currently-owned WATER-rooting cuttings — none right now (all graduated to soil).
 * Kept as empty array so UI filters / lookups still work without a null check. */
const WATER_PROPAGATION_IDS = [];

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
    rationale: "Maranta leuconeura needs bright INDIRECT light — direct sun (especially the afternoon kind) scorches the iconic red veins and fades the leaves within weeks. The bedroom (now confirmed bright indirect, not direct) joins LR-Open and 2F-Open as a premium spot. The bathroom is acceptable because Marantas are humidity-lovers (50–60%+); the slight light hit is a fair trade. Avoid all direct-sun spots (Window A, fireplace, 2F window) — too much for the red veins."
  },
  monstera: {
    ideal: ["second_floor_open", "living_room_open", "living_room_window_morning", "bedroom"],
    ok: ["living_room_fireplace", "living_room_window_stained", "second_floor_window"],
    avoid: ["bathroom"],
    rationale: "Monstera produces the largest fenestrated leaves in bright indirect with optional 1–3 hrs of morning direct sun. The 2nd-floor open area is the gold standard. Bedroom (bright indirect, no direct) is now equivalent to LR-Open in light terms — a perfectly good spot for Monstera. Avoid only the bathroom (light too low, leaves stay solid without splits). The fireplace mantle works light-wise, but the 13.5\" pot is heavy and bulky — only consider it if the mantle is wide and load-rated."
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
    rationale: "Variegated yellow Schefflera REQUIRES bright indirect to keep its variegation — too dim and new leaves emerge all-green within 4–6 weeks. The bedroom (bright indirect, no direct) is excellent for maintaining variegation. Tolerates 1–3 hrs morning direct (Window A, fireplace) too. Avoid the bathroom (light too low → variegation reverts to green). The 9\" pot is heavy, so floor-standing in the living room, 2nd floor, or bedroom corner works best."
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
    rationale: "Euphorbia tirucalli MUST have direct sun to maintain its iconic red/orange tips — without strong direct light, it stays plain green and grows floppy/leggy within a few weeks. ⚠️ NO room in this house provides the 6+ hours of direct sun this plant truly wants. The 2F window (1–3 hrs PM direct) and the morning-direct spots (Window A, fireplace) are the best available — colors will be muted vs. a true sun spot but the plant will survive. The bedroom (now confirmed indirect-only) is OUT — Firestick stays green there. Consider a grow light if you want vibrant tip color. ⚠️ The milky sap is toxic and skin-irritating — keep out of children's and pets' reach wherever you place it."
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
    rationale: "Dracaena fragrans is famously low-light tolerant — it's the classic 'corner of an office' plant. Bright indirect (LR-Open, 2F-Open, bedroom) is ideal; medium indirect (bathroom) is perfectly fine. Direct sun (especially afternoon at the 2F window) scorches the long strappy leaves. The 13.5\" pot is heavy → place once and leave; the bedroom corner is now a legitimate option since the light is right."
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
    rationale: "ZZ Plant is the classic 'office corner' plant — it genuinely tolerates the widest light range in the entire collection. Bright indirect (LR-Open, 2F-Open, bedroom) is where it grows FASTEST. Medium indirect (bathroom) is perfectly fine. Morning-direct spots (Window A, fireplace) are OK but scorching risk if the plant is right in the beam — pull back 2 feet. ⚠️ ONLY hard avoid is the 2F window's PM direct sun — the glossy leaflets burn to yellow/brown. Great fill-in candidate for any low-light spot you couldn't otherwise use. Keep out of pet reach — TOXIC to cats/dogs."
  },
  desert_rose: {
    ideal: ["second_floor_window", "living_room_window_morning", "living_room_fireplace"],
    ok: ["living_room_window_stained"],
    avoid: ["bathroom", "bedroom", "living_room_open", "second_floor_open"],
    rationale: "Adenium obesum is the most sun-hungry plant in the collection — wants 6+ hours of direct sun daily for the trademark trumpet flowers and to prevent leggy growth. ⚠️ NO spot in this house comes close to that budget — the 2F window (PM direct 1–3 hrs) is the best available; morning-direct spots (Window A, fireplace) are second best. The bedroom (bright indirect only) essentially guarantees no flowers ever. ⚠️ Bathroom is doubly disqualified: not enough sun AND chronic humidity = caudex rot within weeks. Consider a supplemental grow light (100W+ LED, 12–14 hrs/day) if you want to see it bloom. Keep away from pets — TOXIC sap."
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
  { label: "Cactus & Succulent Society of America — Indoor Cactus Care", url: "https://cactusandsucculentsociety.org/" }
];

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
