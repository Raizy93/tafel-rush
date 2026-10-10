// ---------------------------------------------------------------------------
// Centrale tuning. Alle "magische getallen" van de game staan hier, zodat
// balans en didactiek aangepast kunnen worden zonder door de code te zoeken.
// ---------------------------------------------------------------------------
export const CONFIG = {
  // Logische resolutie (pixel-art canvas). Wordt geschaald naar het scherm.
  width: 480,
  height: 270,
  groundY: 226, // y waarop voeten staan

  // --- Rekenen ------------------------------------------------------------
  answer: {
    maxDigits: 3,
    // Reactietijd-grenzen (ms). Langzaam-maar-goed blijft ALTIJD goed.
    tiers: { perfect: 1600, fast: 3000, good: 5000 },
    wrongFeedbackMs: 1000, // hoe lang het juiste antwoord zichtbaar blijft na een fout (was 650)
  },

  // --- Run-opbouw -----------------------------------------------------------
  run: {
    // Voortgang 0..100. Tijd + goede antwoorden. Zo duurt een run ~3-5 min
    // voor vrijwel iedere leerling, en levert sneller rekenen meer sommen op.
    length: 100,
    progressPerSecond: 0.27,
    progressPerCorrect: { perfect: 0.62, fast: 0.52, good: 0.45, slow: 0.38 },
    // Fase-grenzen (voortgang) → bioom
    phases: [
      { at: 0, biome: 'edge', name: 'BOSRAND' },
      { at: 25, biome: 'deep', name: 'DIEPER BOS' },
      { at: 50, biome: 'ruins', name: 'OUDE RUINES' },
      { at: 75, biome: 'dark', name: 'DONKER BOS' },
    ],
  },

  // --- Bewegen -----------------------------------------------------------------
  speed: {
    base: 92, // px/s
    tierMultiplier: [1, 1.12, 1.32, 1.55, 1.8],
    boostOnCorrect: 55,
    boostDecay: 2.6, // per seconde (exponentieel)
    stumbleFactor: 0.3,
    stumbleMs: 520,
    engageDistance: 58, // stopafstand tot een vijand
  },

  // --- Combo's -----------------------------------------------------------------
  combo: {
    // drempel → tier. Labels worden als (niet-blokkerende) banner getoond.
    tiers: [
      { at: 0, label: null },
      { at: 5, label: 'COMBO ×5', coinMult: 2 },
      { at: 10, label: 'SPEED UP!', coinMult: 2 },
      { at: 20, label: 'ON FIRE!', coinMult: 3 },
      { at: 30, label: 'ULTRA MODE!', coinMult: 4 },
    ],
    milestoneEvery: 10, // na ULTRA: COMBO ×40, ×50 …
  },

  // --- Coins -------------------------------------------------------------------
  coins: {
    perCorrect: 1,
    perfectBonus: 1,
    tierUpBonus: [0, 5, 10, 20, 30],
    bossBonus: 50,
    chestBonus: 8,
  },

  // --- Gevecht / damage ---------------------------------------------------------
  // Eén goed antwoord = één hit. Characters zijn cosmetisch: iedereen doet
  // dezelfde damage. Toekomstige upgrades haken in via DamageSystem-modifiers.
  combat: {
    baseDamage: 1,
    critTiers: ['perfect'],   // welke antwoord-tiers een (visuele) CRITICAL geven
    critMultiplier: 1,        // 1 = critical is nu alleen visueel (geen extra damage)
  },

  // --- Spawn-balans (HP-klassen over de run) -------------------------------------
  // Per voortgangspunt de kans op een vijand met 1, 2 of 3 HP. Er wordt lineair
  // tussen de punten geïnterpoleerd. Het bioom bepaalt welke soorten er zijn.
  spawn: {
    hpCurve: [
      { at: 0, weights: { 1: 0.85, 2: 0.15, 3: 0 } },
      { at: 25, weights: { 1: 0.6, 2: 0.32, 3: 0.08 } },
      { at: 50, weights: { 1: 0.5, 2: 0.33, 3: 0.17 } },
      { at: 75, weights: { 1: 0.4, 2: 0.35, 3: 0.25 } },
      { at: 100, weights: { 1: 0.32, 2: 0.38, 3: 0.3 } },
    ],
    maxStrongInRow: 1,        // nooit twee 3-HP vijanden achter elkaar
    chestEvery: [9, 13],      // ongeveer elke zoveel vijanden een schatkist
  },

  // --- Boss --------------------------------------------------------------------
  // HP staat per boss in data/enemies.js (BOSSES). Damage via het gewone combat-systeem.
  boss: {
    angryAt: 0.5,
  },

  // --- Performance --------------------------------------------------------------
  perf: {
    maxParticles: 320,
    lowMaxParticles: 110,
    degradeFrameMs: 22, // gemiddelde frametijd waarboven we degraderen
  },
};
