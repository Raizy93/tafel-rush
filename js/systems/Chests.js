// ---------------------------------------------------------------------------
// Chests – kisten verdienen, kopen en openen; snoepjes voor dubbele pets en
// een pet "lokken" met snoepjes. Puur JS (geen DOM) → testbaar met een
// eigen random-functie. Opslag: profile.collection (via ProfileService).
//
//   Chests.awardForRun(profile, summary, { completed })  → [{ kind, n, reason }]
//   Chests.open(profile, 'tafel', rng)                    → { petId, rarity, isNew, treats }
//   Chests.buy(profile, 'wood')                           → { ok, reason, missing }
//   Chests.lure(profile, 'wolf')                          → { ok, reason, missing }
// ---------------------------------------------------------------------------
import { CHESTS, CHEST_RULES, TREATS, WORLD_CHESTS } from '../data/chests.js';
import { PETS, PET_ORDER, RARITY_ORDER, petsOfRarity } from '../data/pets.js';
import { buildMasteryMap } from '../training/MasteryMap.js';

export const Chests = {
  count(profile, kind) { return profile.collection.chests[kind] || 0; },
  total(profile) { return Object.values(profile.collection.chests).reduce((a, b) => a + b, 0); },
  add(profile, kind, n = 1) {
    const c = profile.collection.chests;
    c[kind] = (c[kind] || 0) + n;
    profile.save();
  },
  treats(profile) { return profile.collection.treats; },

  // --- pets in bezit ---------------------------------------------------------------
  owns(profile, petId) { return profile.owns('pets', petId); },
  foundCount(profile, list = PET_ORDER) { return list.filter(id => this.owns(profile, id)).length; },
  isNew(profile, petId) { return profile.collection.newPets.includes(petId); },
  markSeen(profile, petId) {
    const n = profile.collection.newPets, i = n.indexOf(petId);
    if (i >= 0) { n.splice(i, 1); profile.save(); }
  },

  // --- kansen ------------------------------------------------------------------------
  /** Kies een zeldzaamheid volgens de kansen van de kist. */
  rollRarity(kind, rng = Math.random) {
    const odds = CHESTS[kind].odds;
    const total = RARITY_ORDER.reduce((s, r) => s + (odds[r] || 0), 0);
    let x = rng() * total;
    for (const r of RARITY_ORDER) { x -= odds[r] || 0; if (x < 0) return r; }
    return RARITY_ORDER[0];
  },
  /** Kies een pet: eerst de zeldzaamheid, dan gelijke kans binnen die zeldzaamheid.
   *  Wereldkist → alleen de pets van die wereld; andere kisten → alleen kist-pets. */
  rollPet(kind, rng = Math.random) {
    const world = CHESTS[kind].world || null;
    let rarity = this.rollRarity(kind, rng);
    let pool = petsOfRarity(rarity, world);
    // (vangnet als een zeldzaamheid ooit leeg is: één niveau lager)
    while (!pool.length && RARITY_ORDER.indexOf(rarity) > 0) { rarity = RARITY_ORDER[RARITY_ORDER.indexOf(rarity) - 1]; pool = petsOfRarity(rarity, world); }
    return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  },

  // --- openen / kopen / lokken ------------------------------------------------------------
  open(profile, kind, rng = Math.random) {
    if (!CHESTS[kind]) return { ok: false, reason: 'unknown' };
    if (this.count(profile, kind) <= 0) return { ok: false, reason: 'none' };
    const col = profile.collection;
    col.chests[kind]--;
    col.opened++;
    const petId = this.rollPet(kind, rng);
    const rarity = PETS[petId].rarity;
    const isNew = !this.owns(profile, petId);
    let treats = 0;
    if (isNew) this.grant(profile, petId);
    else { treats = TREATS.forDuplicate[rarity]; col.treats += treats; }
    profile.flush(); // resultaat van een kist meteen vastleggen
    return { ok: true, kind, petId, rarity, isNew, treats };
  },

  grant(profile, petId) {
    const col = profile.collection;
    profile.unlock('pets', petId);
    col.found[petId] = col.found[petId] || Date.now();
    if (!col.newPets.includes(petId)) col.newPets.push(petId);
  },

  buy(profile, kind) {
    const c = CHESTS[kind];
    if (!c || !c.price) return { ok: false, reason: 'notForSale' };
    if (!profile.spendCoins(c.price)) return { ok: false, reason: 'coins', missing: c.price - profile.coins };
    this.add(profile, kind, 1);
    profile.flush();
    return { ok: true };
  },

  lurePrice(petId) { return TREATS.lurePrice[PETS[petId].rarity]; },
  /** Wereld-pets lok je pas als je de boss van die wereld één keer versloeg. */
  canLure(profile, petId) { const w = PETS[petId].world; return !w || profile.worldBosses(w) > 0; },
  /** Een ontbrekende pet "lokken" met snoepjes. */
  lure(profile, petId) {
    if (!PETS[petId]) return { ok: false, reason: 'unknown' };
    if (this.owns(profile, petId)) return { ok: false, reason: 'owned' };
    if (!this.canLure(profile, petId)) return { ok: false, reason: 'world', world: PETS[petId].world };
    const price = this.lurePrice(petId), col = profile.collection;
    if (col.treats < price) return { ok: false, reason: 'treats', missing: price - col.treats };
    col.treats -= price;
    this.grant(profile, petId);
    profile.flush();
    return { ok: true };
  },

  // --- verdienen ------------------------------------------------------------------------
  /**
   * Na een run: kisten bijschrijven voor tafelkaart-stapjes, nieuw goud,
   * hele tafels goud en een verslagen boss. Retourneert wat er verdiend is,
   * plus de voortgang naar de volgende kisten.
   */
  awardForRun(profile, sum, { completed = false, world = 'greenwood', now = Date.now() } = {}) {
    const R = CHEST_RULES, col = profile.collection, p = col.progress;
    const got = { tafel: 0, gold: 0 }, reasons = [];
    p.steps += sum.mapUps || 0;
    const fromSteps = Math.floor(p.steps / R.stepsPerTafelChest);
    p.steps -= fromSteps * R.stepsPerTafelChest;
    if (fromSteps) { got.tafel += fromSteps; reasons.push({ kind: 'tafel', n: fromSteps, reason: 'steps' }); }
    if (completed) {
      // boss verslagen → de wereldkist van deze wereld (anders, als vangnet, een tafelkist)
      const wk = WORLD_CHESTS[world];
      if (wk) { got[wk] = (got[wk] || 0) + R.worldChestPerBoss; reasons.push({ kind: wk, n: R.worldChestPerBoss, reason: 'boss', world }); }
      else if (R.tafelChestPerBoss) { got.tafel += R.tafelChestPerBoss; reasons.push({ kind: 'tafel', n: R.tafelChestPerBoss, reason: 'boss' }); }
    }
    p.golds += sum.newGolds || 0;
    const fromGolds = Math.floor(p.golds / R.goldsPerGoldChest);
    p.golds -= fromGolds * R.goldsPerGoldChest;
    if (fromGolds) { got.gold += fromGolds; reasons.push({ kind: 'gold', n: fromGolds, reason: 'golds' }); }
    // hele tafel goud: keertafels als getal (7), deeltafels als 'd7' in masterTables
    for (const op of ['mul', 'div']) {
      const tables = buildMasteryMap(profile.masteryStore, now, op).tables;
      for (const [t, info] of Object.entries(tables)) {
        const id = op === 'mul' ? +t : 'd' + t;
        if (!info.master || col.masterTables.includes(id)) continue;
        col.masterTables.push(id);
        got.gold += R.goldChestPerMasterTable;
        reasons.push({ kind: 'gold', n: R.goldChestPerMasterTable, reason: 'table', table: +t, op });
      }
    }
    for (const [kind, n] of Object.entries(got)) if (n) col.chests[kind] = (col.chests[kind] || 0) + n;
    profile.save();
    return {
      chests: reasons,
      total: Object.values(got).reduce((a, b) => a + b, 0),
      stepsToNext: R.stepsPerTafelChest - p.steps,
      goldsToNext: R.goldsPerGoldChest - p.golds,
    };
  },
};
