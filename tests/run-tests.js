// ---------------------------------------------------------------------------
// Tafel Rush – tests voor de rekenlogica en opslag (zonder browser).
//   node tests/run-tests.js
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import { AdaptiveTrainer, speedTier, speedQuality } from '../js/training/AdaptiveTrainer.js';
import { QuestionEngine } from '../js/training/QuestionEngine.js';
import { SessionStats } from '../js/training/SessionStats.js';
import { factsForTable, factsForTables, POWER_TABLES, reverseKey, parseKey } from '../js/training/facts.js';
import { ProfileService } from '../js/storage/ProfileService.js';
import { MemoryAdapter } from '../js/storage/StorageAdapter.js';
import { migrateProfile, PROFILE_VERSION } from '../js/storage/profileSchema.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}
async function atest(name, fn) {
  try { await fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}
function assert(c, msg) { if (!c) throw new Error(msg || 'assert'); }

function seeded(s = 42) {
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function memStore() {
  const m = {};
  return { get: k => m[k], set: (k, v) => { m[k] = v; }, entries: () => Object.entries(m), raw: m };
}

console.log('\nTafels & reactietijd');
test('tafel 7 bevat beide volgordes, geen dubbele 7×7', () => {
  const f = factsForTable(7);
  assert(f.includes('3x7') && f.includes('7x3'), 'beide vormen');
  assert(f.length === 19, 'lengte ' + f.length);
});
test('powertraining = tafels 2 t/m 10', () => {
  const f = factsForTables(POWER_TABLES);
  assert(!f.includes('1x1'), '1x1 hoort er niet in');
  assert(f.includes('9x8') && f.includes('2x10'));
});
test('reactietijd-tiers', () => {
  assert(speedTier(900) === 'perfect');
  assert(speedTier(2000) === 'fast');
  assert(speedTier(4000) === 'good');
  assert(speedTier(8000) === 'slow');
  assert(speedQuality(800) > speedQuality(4000));
});

console.log('\nMastery');
test('langzaam goed is nooit "fout" en scoort hoger dan fout', () => {
  const a = new AdaptiveTrainer(memStore()), b = new AdaptiveTrainer(memStore());
  a.recordAnswer('6x7', { correct: true, rtMs: 9000 });
  b.recordAnswer('6x7', { correct: false, rtMs: 1000 });
  assert(a.record('6x7').correct === 1 && a.record('6x7').wrong === 0, 'telt als goed');
  assert(a.mastery('6x7') > b.mastery('6x7'), 'traag-goed > fout');
});
test('snel goed verhoogt mastery meer dan traag goed', () => {
  const a = new AdaptiveTrainer(memStore()), b = new AdaptiveTrainer(memStore());
  for (let i = 0; i < 4; i++) { a.recordAnswer('8x7', { correct: true, rtMs: 1000 }); b.recordAnswer('8x7', { correct: true, rtMs: 6000 }); }
  assert(a.mastery('8x7') > b.mastery('8x7') + 0.1, `${a.mastery('8x7')} vs ${b.mastery('8x7')}`);
});
test('omgekeerde som krijgt een zwakkere, gekoppelde update', () => {
  const t = new AdaptiveTrainer(memStore());
  const before = t.mastery('7x6');
  for (let i = 0; i < 5; i++) t.recordAnswer('6x7', { correct: true, rtMs: 1000 });
  const rev = t.mastery('7x6'), fwd = t.mastery('6x7');
  assert(rev > before, 'omgekeerde stijgt');
  assert(rev < fwd, 'maar minder dan het geoefende feit');
  assert((t.record('7x6').seen || 0) === 0, 'telt niet als gezien');
});
test('zwakke som krijgt meer oefenbehoefte', () => {
  const t = new AdaptiveTrainer(memStore());
  t.recordAnswer('6x7', { correct: false, rtMs: 3000 });
  t.recordAnswer('3x4', { correct: true, rtMs: 900 });
  assert(t.need('6x7') > t.need('3x4') * 1.5);
});

console.log('\nOpgavenselectie');
test('nooit dezelfde som direct na elkaar (2000 vragen, powertraining)', () => {
  const tr = new AdaptiveTrainer(memStore());
  const qe = new QuestionEngine({ trainer: tr, pool: factsForTables(POWER_TABLES), mode: 'power', rng: seeded(1) });
  let prev = null;
  for (let i = 0; i < 2000; i++) {
    const q = qe.next();
    assert(q.key !== prev, 'herhaling op ' + i);
    prev = q.key;
    qe.submit(q.answer, 1500);
  }
});
test('kleine pool (één tafel): geen directe herhaling', () => {
  const tr = new AdaptiveTrainer(memStore());
  const qe = new QuestionEngine({ trainer: tr, pool: factsForTable(3), mode: 'training', tables: [3], rng: seeded(2) });
  const seen = [];
  for (let i = 0; i < 400; i++) { const q = qe.next(); seen.push(q.key); qe.submit(q.answer, 2000); }
  for (let i = 1; i < seen.length; i++) assert(seen[i] !== seen[i - 1], 'herhaling');
});
test('fout beantwoorde som komt terug na enkele andere sommen (spacing)', () => {
  const tr = new AdaptiveTrainer(memStore());
  const qe = new QuestionEngine({ trainer: tr, pool: factsForTables(POWER_TABLES), mode: 'power', rng: seeded(3) });
  let gaps = [];
  for (let round = 0; round < 60; round++) {
    const q = qe.next();
    qe.submit(-1, 2000); // fout
    let k = 0;
    for (;;) {
      const n = qe.next();
      k++;
      if (n.key === q.key) { qe.submit(n.answer, 1200); break; }
      qe.submit(n.answer, 1200);
      if (k > 30) break;
    }
    gaps.push(k - 1);
  }
  const inRange = gaps.filter(g => g >= 3 && g <= 9).length;
  assert(inRange / gaps.length > 0.8, 'gaps ' + gaps.join(','));
  assert(Math.min(...gaps) >= 2, 'nooit direct');
});
test('weinig voorspelbare reeksen (2×3, 2×4, 2×5) in mix', () => {
  const tr = new AdaptiveTrainer(memStore());
  const qe = new QuestionEngine({ trainer: tr, pool: factsForTables([2, 3, 4]), mode: 'mix', rng: seeded(4) });
  let seq = 0, N = 1500, prev = null;
  for (let i = 0; i < N; i++) {
    const q = qe.next();
    if (prev) {
      const s = [q.a, q.b].find(v => [prev.a, prev.b].includes(v));
      if (s != null) {
        const o = q.a === s ? q.b : q.a, po = prev.a === s ? prev.b : prev.a;
        if (Math.abs(o - po) === 1) seq++;
      }
    }
    prev = q;
    qe.submit(q.answer, 1500);
  }
  assert(seq / N < 0.06, 'reeks-ratio ' + (seq / N).toFixed(3));
});
test('gesimuleerde leerling: moeilijke 6×7 en 7×8 komen vaker voor, maar niet overheersend', () => {
  const tr = new AdaptiveTrainer(memStore());
  const qe = new QuestionEngine({ trainer: tr, pool: factsForTables(POWER_TABLES), mode: 'power', rng: seeded(5) });
  const rng = seeded(9);
  const counts = {};
  const weak = new Set(['6x7', '7x6', '7x8', '8x7']);
  for (let i = 0; i < 3000; i++) {
    const q = qe.next();
    counts[q.key] = (counts[q.key] || 0) + 1;
    const ok = weak.has(q.key) ? rng() < 0.45 : rng() < 0.95;
    qe.submit(ok ? q.answer : q.answer + 1, weak.has(q.key) ? 4500 : 1400);
  }
  const avg = 3000 / qe.pool.length;
  const w = (counts['6x7'] + counts['7x8']) / 2;
  assert(w > avg * 2, `zwak ${w} vs gem ${avg.toFixed(1)}`);
  assert(w < 3000 * 0.07, 'niet overheersend: ' + w);
  assert(tr.hardestFacts(5).some(k => weak.has(k)), 'moeilijke sommen gevonden');
});
test('alle sommen van een tafel komen aan bod', () => {
  const tr = new AdaptiveTrainer(memStore());
  const qe = new QuestionEngine({ trainer: tr, pool: factsForTable(8), mode: 'training', tables: [8], rng: seeded(6) });
  const seen = new Set();
  for (let i = 0; i < 120; i++) { const q = qe.next(); seen.add(q.key); qe.submit(q.answer, 1500); }
  assert(seen.size === 19, 'gezien ' + seen.size);
});

console.log('\nSessie & resultaten');
test('moeilijke sommen van de sessie: fouten + traagheid, max 5', () => {
  const s = new SessionStats();
  s.add({ key: '7x8', correct: false });
  s.add({ key: '7x8', correct: true, tier: 'slow', rtMs: 7000 });
  s.add({ key: '6x9', correct: true, tier: 'slow', rtMs: 6500 });
  s.add({ key: '2x3', correct: true, tier: 'perfect', rtMs: 800 });
  for (const k of ['3x9', '4x8', '8x8', '9x9', '6x6', '7x7']) s.add({ key: k, correct: false });
  const h = s.hardestFacts(5);
  assert(h.length === 5 && h[0].key === '7x8', JSON.stringify(h.map(x => x.key)));
  assert(!h.some(x => x.key === '2x3'));
});

console.log('\nOpslag');
await atest('profiel: opslaan + herladen (MemoryAdapter)', async () => {
  const ad = new MemoryAdapter();
  const ps = new ProfileService(ad);
  await ps.load();
  ps.addCoins(120);
  const tr = new AdaptiveTrainer(ps.masteryStore);
  tr.recordAnswer('6x7', { correct: true, rtMs: 1000 });
  await ps.flush();
  const ps2 = new ProfileService(ad);
  await ps2.load();
  assert(ps2.coins === 120, 'coins ' + ps2.coins);
  assert(ps2.profile.mastery['6x7'].correct === 1);
  assert(ps2.profile.version === PROFILE_VERSION);
});
await atest('kapot profiel → nieuw profiel + back-up', async () => {
  const ad = new MemoryAdapter({ profile: '{kapot' });
  const ps = new ProfileService(ad);
  await ps.load();
  assert(ps.coins === 0);
  assert([...ad.data.keys()].some(k => k.startsWith('profile.corrupt')), 'back-up');
});
test('migratie vult ontbrekende velden aan', () => {
  const p = migrateProfile({ version: 1, currency: { coins: 5 } });
  assert(p.currency.coins === 5 && p.currency.lifetimeCoins === 0 && p.settings.sfx === true && p.mastery);
});
await atest('records worden bijgewerkt', async () => {
  const ps = new ProfileService(new MemoryAdapter());
  await ps.load();
  const rec = ps.recordRun({ answered: 40, correct: 36, accuracy: 0.9, avgRt: 1800, bestCombo: 22, perfect: 10, coins: 80, durationMs: 200000 }, { mode: 'power', tables: [], completed: true });
  assert(rec.includes('bestCombo') && rec.includes('mostCorrect') && ps.coins === 80);
});

console.log('\nHP & damage');
const { Health } = await import('../js/systems/Health.js');
const { DamageSystem, EXAMPLE_MODIFIERS } = await import('../js/systems/DamageSystem.js');
const { SpawnDirector, hpWeightsAt } = await import('../js/systems/SpawnDirector.js');
const { ENEMY_TYPES, BOSSES } = await import('../js/data/enemies.js');
const hit = (tier = 'good') => DamageSystem.forAnswer({ tier, comboTier: 0 });
test('1 HP: één goed antwoord → verslagen', () => {
  const h = new Health(1);
  const r = h.takeDamage(hit());
  assert(r.killed && h.hp === 0);
});
test('2 HP: eerste hit blijft staan, tweede verslaat', () => {
  const h = new Health(2);
  assert(!h.takeDamage(hit()).killed && h.hp === 1);
  assert(h.takeDamage(hit()).killed && h.hp === 0);
});
test('3 HP: 3 → 2 → 1 → 0', () => {
  const h = new Health(3), seq = [];
  for (let i = 0; i < 3; i++) seq.push(h.takeDamage(hit()).after);
  assert(seq.join(',') === '2,1,0', seq.join(','));
});
test('geen dubbele hits na verslaan (spam)', () => {
  const h = new Health(1);
  h.takeDamage(hit());
  const r = h.takeDamage(hit());
  assert(r.applied === 0 && !r.killed, 'tweede hit telt niet');
});
test('PERFECT = visuele critical, geen extra damage', () => {
  const d = hit('perfect');
  assert(d.crit === true && d.amount === 1);
  assert(hit('slow').amount === 1 && !hit('slow').crit);
});
test('upgrade-hook: +1 damage maakt 3 HP → 1 → 0 in twee hits', () => {
  const h = new Health(3);
  const dmg = DamageSystem.forAnswer({ tier: 'good', modifiers: [EXAMPLE_MODIFIERS.plusOne] });
  assert(dmg.amount === 2);
  assert(h.takeDamage(dmg).after === 1 && h.takeDamage(dmg).killed);
});
test('zichtbare HP loopt pas terug bij inslag (showHit)', () => {
  const h = new Health(3);
  const r = h.takeDamage(hit());
  assert(h.hp === 2 && h.shownHp === 3);
  h.showHit(r);
  assert(h.shownHp === 2);
});
test('boss gebruikt hetzelfde systeem (HP in hits)', () => {
  const h = new Health(BOSSES.guardian.maxHp);
  let n = 0;
  while (h.alive) { h.takeDamage(hit(n % 3 ? 'good' : 'perfect')); n++; }
  assert(n === BOSSES.guardian.maxHp, 'hits ' + n);
});
test('alle vijandtypes hebben maxHp 1-3', () => {
  for (const [id, t] of Object.entries(ENEMY_TYPES)) assert(t.maxHp >= 1 && t.maxHp <= 3, id);
});

console.log('\nSpawn-balans');
test('begin vooral 1 HP, later meer 2/3 HP, nooit twee 3-HP op rij', () => {
  const pool = [['slime_green', 3], ['mushroom', 3], ['beetle', 2]];
  const count = (progress, n = 3000) => {
    const sd = new SpawnDirector({ rng: seeded(11) });
    const c = { 1: 0, 2: 0, 3: 0 }; let prev = 0, doubles = 0;
    for (let i = 0; i < n; i++) {
      const id = sd.next(pool, progress);
      if (id === 'chest') continue;
      const hp = ENEMY_TYPES[id].maxHp; c[hp]++;
      if (hp === 3 && prev === 3) doubles++;
      prev = hp;
    }
    const tot = c[1] + c[2] + c[3];
    return { p1: c[1] / tot, p3: c[3] / tot, doubles };
  };
  const early = count(5), late = count(95);
  assert(early.p1 > 0.75, 'begin 1HP ' + early.p1.toFixed(2));
  assert(late.p1 < early.p1 && late.p3 > early.p3 + 0.15, `laat: 1HP ${late.p1.toFixed(2)} 3HP ${late.p3.toFixed(2)}`);
  assert(early.doubles === 0 && late.doubles === 0, 'dubbel 3HP');
  const w = hpWeightsAt(37.5);
  assert(Math.abs(w[1] - 0.55) < 0.01, 'interpolatie');
});
test('schatkist komt periodiek', () => {
  const sd = new SpawnDirector({ rng: seeded(3) });
  let chests = 0;
  for (let i = 0; i < 260; i++) if (sd.next([['slime_green', 1]], 10) === 'chest') chests++;
  assert(chests >= 18 && chests <= 30, 'kisten ' + chests);
});

console.log('\nCharacters & profiel v2');
const { CharacterRegistry } = await import('../js/systems/CharacterRegistry.js');
const { CHARACTERS } = await import('../js/data/characters.js');
test('drie characters, allemaal speelbaar, zelfde gameplay', () => {
  assert(CharacterRegistry.all().length === 3);
  const attacks = Object.values(CHARACTERS).map(c => Object.keys(c).sort().join());
  assert(new Set(attacks).size === 1, 'zelfde velden');
  for (const c of Object.values(CHARACTERS)) assert(!('damage' in c) && !('speed' in c), 'geen gameplay-stats per character');
});
await atest('migratie v1 → nieuwste: kai → hero01, unlock-map, voortgang blijft', async () => {
  const v1 = { version: 1, currency: { coins: 321, lifetimeCoins: 400 }, mastery: { '6x7': { seen: 3, correct: 2, wrong: 1, mastery: 0.5 } },
    unlocks: { owned: { characters: ['kai'], skins: [] }, equipped: { character: 'kai', skin: null } }, settings: { sfx: false } };
  const ps = new ProfileService(new MemoryAdapter({ profile: JSON.stringify(v1) }));
  await ps.load();
  const p = ps.profile;
  assert(p.version === PROFILE_VERSION && p.selectedCharacter === 'hero01', 'versie ' + p.version + ' sel ' + p.selectedCharacter);
  assert(p.unlocks.characters.hero01 && p.unlocks.characters.ranger01 && p.unlocks.characters.tech01, 'unlocks');
  assert(!('characters' in p.unlocks.owned) && !('character' in p.unlocks.equipped), 'oude velden weg');
  assert(ps.coins === 321 && p.mastery['6x7'].correct === 2 && p.settings.sfx === false, 'voortgang intact');
});
await atest('selectie opslaan + herladen', async () => {
  const ad = new MemoryAdapter();
  const ps = new ProfileService(ad); await ps.load();
  ps.selectCharacter('tech01'); await ps.flush();
  const ps2 = new ProfileService(ad); await ps2.load();
  assert(CharacterRegistry.selected(ps2).id === 'tech01');
});
await atest('vergrendeld character (coins) → niet selecteerbaar, koop werkt', async () => {
  const ps = new ProfileService(new MemoryAdapter()); await ps.load();
  const def = CHARACTERS.tech01, old = def.unlock;
  def.unlock = { type: 'coins', price: 1500 };
  try {
    ps.lockCharacter('tech01');
    ps.selectCharacter('tech01');
    assert(CharacterRegistry.selected(ps).id === 'hero01', 'valt terug op hero01');
    assert(CharacterRegistry.requirementLabel('tech01') === '1.500 COINS');
    assert(!CharacterRegistry.tryUnlock('tech01', ps), 'te weinig coins');
    ps.addCoins(2000);
    assert(CharacterRegistry.tryUnlock('tech01', ps) && ps.coins === 500, 'gekocht');
    assert(CharacterRegistry.selected(ps).id === 'tech01');
  } finally { def.unlock = old; }
});

console.log('\nWapens & power-ups');
const { Equipment } = await import('../js/systems/Equipment.js');
const { WEAPONS, POWERUPS } = await import('../js/data/weapons.js');
const freshProfile = async () => { const ps = new ProfileService(new MemoryAdapter()); await ps.load(); return ps; };
test('iedere held: 4 tiers met dezelfde prijzen en perks (niemand sterker)', () => {
  const sig = id => Equipment.weaponsFor(id).map(w => `${w.tier}:${w.price}:${w.perks.join('+')}`).join('|');
  assert(sig('hero01') === sig('ranger01') && sig('ranger01') === sig('tech01'), sig('hero01'));
  assert(sig('hero01') === '0:0:|1:800:|2:2000:perfectDouble|3:5000:perfectDouble+plusOne', sig('hero01'));
});
await atest('kopen: volgorde, coins, auto-uitrusten', async () => {
  const ps = await freshProfile();
  const [w0, w1, w2] = Equipment.weaponsFor('hero01');
  assert(Equipment.equippedWeapon(ps, 'hero01').id === w0.id, 'start = tier 0');
  assert(Equipment.weaponStatus(ps, w2) === 'needPrevious', 'tier 2 eerst niet');
  assert(Equipment.buyWeapon(ps, w1).reason === 'coins', 'te weinig coins');
  ps.addCoins(1000);
  assert(Equipment.buyWeapon(ps, w1).ok && ps.coins === 200, 'gekocht, 800 betaald');
  assert(Equipment.equippedWeapon(ps, 'hero01').id === w1.id, 'meteen uitgerust');
  assert(Equipment.buyWeapon(ps, w1).reason === 'owned', 'niet dubbel kopen');
  assert(Equipment.equipWeapon(ps, w0) && Equipment.equippedWeapon(ps, 'hero01').id === w0.id, 'terugwisselen kan');
  assert(!Equipment.equipWeapon(ps, w2), 'niet-bezeten wapen niet uitrusten');
  assert(Equipment.equippedWeapon(ps, 'ranger01').tier === 0, 'andere held ongewijzigd');
});
test('perks: tier 2 PERFECT ×2, tier 3 ook +1; boss immuun', () => {
  const dmg = (wid, tier, kind = 'enemy') => DamageSystem.forAnswer({ tier, targetKind: kind, modifiers: Equipment.modifiersFor(WEAPONS[wid]) }).amount;
  assert(dmg('kai_w1', 'perfect') === 1 && dmg('kai_w1', 'good') === 1, 'tier 1 alleen uiterlijk');
  assert(dmg('mila_w2', 'perfect') === 2 && dmg('mila_w2', 'fast') === 1, 'tier 2');
  assert(dmg('nova_w3', 'perfect') === 3 && dmg('nova_w3', 'good') === 2, 'tier 3');
  assert(dmg('nova_w3', 'perfect', 'boss') === 1 && dmg('kai_w2', 'perfect', 'boss') === 1, 'boss altijd 1');
});
test('boss blijft 18 antwoorden, ook met het beste wapen', () => {
  const h = new Health(BOSSES.guardian.maxHp);
  const mods = Equipment.modifiersFor(WEAPONS.kai_w3);
  let n = 0;
  while (h.alive) { h.takeDamage(DamageSystem.forAnswer({ tier: 'perfect', targetKind: 'boss', modifiers: mods })); n++; }
  assert(n === 18, 'antwoorden ' + n);
});
await atest('power-ups kopen + loadout', async () => {
  const ps = await freshProfile();
  ps.addCoins(POWERUPS.coinBonus.price + 100);
  assert(Equipment.buyPowerup(ps, 'comboShield').reason === 'coins');
  assert(Equipment.buyPowerup(ps, 'coinBonus').ok && ps.coins === 100);
  assert(Equipment.buyPowerup(ps, 'coinBonus').reason === 'owned');
  ps.selectCharacter('ranger01');
  const lo = Equipment.loadout(ps);
  assert(lo.character.id === 'ranger01' && lo.sheet === 'hero_mila' && lo.attack.effect === 'arrow');
  assert(lo.powerups.coinBonus === true && lo.powerups.pierce === false);
});
await atest('migratie v2 → nieuwste: wapens/power-ups erbij, voortgang intact', async () => {
  const v2 = { version: 2, selectedCharacter: 'tech01', currency: { coins: 999, lifetimeCoins: 999 },
    unlocks: { characters: { hero01: true, ranger01: true, tech01: true }, owned: {}, equipped: {} }, mastery: { '7x8': { seen: 2, correct: 2, wrong: 0, mastery: 0.6 } } };
  const ps = new ProfileService(new MemoryAdapter({ profile: JSON.stringify(v2) }));
  await ps.load();
  const p = ps.profile;
  assert(p.version === PROFILE_VERSION, 'versie ' + p.version);
  assert(Array.isArray(p.unlocks.weapons.tech01) && p.unlocks.equippedWeapons.tech01 === 'nova_w0' && p.unlocks.powerups.pierce === false);
  assert(ps.coins === 999 && p.selectedCharacter === 'tech01' && p.mastery['7x8'].correct === 2);
});
await atest('aankoop blijft bewaard na herladen', async () => {
  const ad = new MemoryAdapter();
  const ps = new ProfileService(ad); await ps.load();
  ps.addCoins(5000);
  assert(Equipment.buyWeapon(ps, WEAPONS.mila_w1).ok && Equipment.buyPowerup(ps, 'pierce').ok);
  await ps.flush();
  const ps2 = new ProfileService(ad); await ps2.load();
  assert(Equipment.equippedWeapon(ps2, 'ranger01').id === 'mila_w1', 'wapen');
  assert(ps2.hasPowerup('pierce') && ps2.coins === 5000 - 800 - 3500, 'coins ' + ps2.coins);
});

console.log('\nPets & kisten');
const { PETS, PET_ORDER, RARITY_ORDER } = await import('../js/data/pets.js');
const { CHESTS, CHEST_RULES, TREATS } = await import('../js/data/chests.js');
const { Chests } = await import('../js/systems/Chests.js');
const newPS = async (adapter = new MemoryAdapter()) => { const ps = new ProfileService(adapter); await ps.load(); return ps; };
await atest('pets komen uit kisten: niet te koop, kiezen + "geen pet" + bewaard na herladen', async () => {
  const ad = new MemoryAdapter(), ps = await newPS(ad);
  assert(Equipment.equippedPet(ps) === null, 'start zonder pet');
  assert(!('buyPet' in Equipment) && PET_ORDER.every(id => !('price' in PETS[id])), 'geen prijzen meer');
  assert(Equipment.petStatus(ps, 'fox') === 'locked' && !Equipment.equipPet(ps, 'fox'), 'niet gevonden = op slot');
  Chests.grant(ps, 'fox'); Chests.grant(ps, 'owl');
  assert(Equipment.equipPet(ps, 'owl') && Equipment.equippedPet(ps).id === 'owl');
  assert(Equipment.equipPet(ps, null) && Equipment.equippedPet(ps) === null, 'geen pet');
  Equipment.equipPet(ps, 'fox'); await ps.flush();
  const ps2 = await newPS(ad);
  assert(Equipment.equippedPet(ps2).id === 'fox' && Equipment.loadout(ps2).pet.id === 'fox', 'na herladen');
});
test('10 pets, alle zeldzaamheden, geen gameplay-effect', () => {
  assert(PET_ORDER.length === 10 && PET_ORDER.every(id => PETS[id]), 'aantal');
  for (const r of RARITY_ORDER) assert(PET_ORDER.some(id => PETS[id].rarity === r), 'zeldzaamheid ' + r);
  for (const p of Object.values(PETS)) assert(!('damage' in p) && !('coinBonus' in p) && !('speed' in p), p.id);
});
test('zeldzamer = groter en spectaculairder (sprite, frames, effecten)', () => {
  const atlas = JSON.parse(fs.readFileSync(new URL('../assets/atlas.json', import.meta.url)));
  const ofR = r => PET_ORDER.filter(id => PETS[id].rarity === r);
  const size = r => ofR(r).reduce((s, id) => { const sh = atlas.sheets[PETS[id].sheet]; return s + sh.fw * sh.fh; }, 0) / ofR(r).length;
  const fxn = r => ofR(r).reduce((s, id) => s + Object.keys(PETS[id].fx || {}).length, 0) / ofR(r).length;
  for (let i = 1; i < RARITY_ORDER.length; i++) {
    assert(size(RARITY_ORDER[i]) >= size(RARITY_ORDER[i - 1]), 'grootte ' + RARITY_ORDER[i]);
    assert(fxn(RARITY_ORDER[i]) >= fxn(RARITY_ORDER[i - 1]), 'effecten ' + RARITY_ORDER[i]);
  }
  for (const id of ofR('legendary')) {
    const sh = atlas.sheets[PETS[id].sheet];
    assert(sh.anims.cheer.frames >= 8 && PETS[id].fx.glow && PETS[id].fx.trail && PETS[id].fx.cheer.ring, 'legendarisch extra: ' + id);
  }
});
test('kansen kloppen (20.000 trekkingen) en gouden kist geeft vaker legendarisch', () => {
  const rng = seeded(7), N = 20000, got = {};
  for (const kind of ['wood', 'tafel', 'gold']) {
    const c = Object.fromEntries(RARITY_ORDER.map(r => [r, 0]));
    for (let i = 0; i < N; i++) c[Chests.rollRarity(kind, rng)]++;
    for (const r of RARITY_ORDER) assert(Math.abs(c[r] / N * 100 - CHESTS[kind].odds[r]) < 1.5, kind + ' ' + r + ' ' + c[r]);
    got[kind] = c.legendary;
  }
  assert(got.gold > got.tafel && got.tafel > got.wood, 'legendarisch: goud > tafel > hout');
  assert(CHESTS.gold.odds.legendary < 50, 'verhoogde kans, geen garantie');
  const pets = new Set(); for (let i = 0; i < 4000; i++) pets.add(Chests.rollPet('gold', rng));
  assert(pets.size === 10, 'iedere pet kan uit een kist komen');
});
await atest('kist openen: nieuw → in je petboek, dubbel → snoepjes', async () => {
  const ps = await newPS();
  assert(Chests.count(ps, 'wood') === 1, 'één houten kist cadeau');
  const r1 = Chests.open(ps, 'wood', () => 0.01); // laagste trekking → gewoon, eerste pet
  assert(r1.ok && r1.isNew && r1.rarity === 'common' && Chests.owns(ps, r1.petId) && Chests.isNew(ps, r1.petId), 'nieuw');
  assert(Chests.open(ps, 'wood').reason === 'none', 'geen kist meer');
  Chests.add(ps, 'tafel', 1);
  const r2 = Chests.open(ps, 'tafel', () => 0.01);
  assert(r2.ok && !r2.isNew && r2.petId === r1.petId && r2.treats === TREATS.forDuplicate.common && Chests.treats(ps) === r2.treats, 'dubbel = snoepjes');
  Chests.markSeen(ps, r1.petId);
  assert(!Chests.isNew(ps, r1.petId) && ps.collection.opened === 2);
});
await atest('houten kist kopen (coins) en pet lokken (snoepjes)', async () => {
  const ps = await newPS();
  assert(Chests.buy(ps, 'wood').reason === 'coins', 'te weinig coins');
  assert(Chests.buy(ps, 'gold').reason === 'notForSale' && Chests.buy(ps, 'tafel').reason === 'notForSale', 'alleen hout te koop');
  ps.addCoins(CHESTS.wood.price);
  assert(Chests.buy(ps, 'wood').ok && ps.coins === 0 && Chests.count(ps, 'wood') === 2);
  const price = TREATS.lurePrice.legendary;
  assert(Chests.lure(ps, 'wolf').reason === 'treats');
  ps.collection.treats = price + 5;
  assert(Chests.lure(ps, 'wolf').ok && Chests.owns(ps, 'wolf') && Chests.treats(ps) === 5, 'gelokt');
  assert(Chests.lure(ps, 'wolf').reason === 'owned');
});
await atest('kisten verdienen: stapjes, boss, nieuw goud, hele tafel goud (één keer)', async () => {
  const ps = await newPS();
  let r = Chests.awardForRun(ps, { mapUps: 7, newGolds: 0 }, { completed: false });
  assert(r.total === 0 && r.stepsToNext === 3, 'nog geen kist');
  r = Chests.awardForRun(ps, { mapUps: 5, newGolds: 0 }, { completed: true });
  assert(Chests.count(ps, 'tafel') === 1 && Chests.count(ps, 'bos') === 1 && r.stepsToNext === 8, 'stapjes → tafelkist, boss Greenwood → boskist');
  r = Chests.awardForRun(ps, { mapUps: 0, newGolds: CHEST_RULES.goldsPerGoldChest + 1 }, {});
  assert(Chests.count(ps, 'gold') === 1 && r.goldsToNext === CHEST_RULES.goldsPerGoldChest - 1, 'nieuw goud');
  // hele tafel van 2 goud (4 dagen snel en goed) → extra gouden kist, maar maar één keer
  const tr = new AdaptiveTrainer(ps.masteryStore), DAY = 864e5, T = new Date(2026, 0, 5, 10).getTime();
  for (let d = 0; d < 4; d++) for (const k of factsForTable(2)) tr.recordAnswer(k, { correct: true, rtMs: 800, now: T + d * DAY });
  r = Chests.awardForRun(ps, { mapUps: 0, newGolds: 0 }, { now: T + 3 * DAY });
  assert(r.chests.some(c => c.reason === 'table' && c.table === 2) && Chests.count(ps, 'gold') === 2, 'tafel 2 goud');
  r = Chests.awardForRun(ps, { mapUps: 0, newGolds: 0 }, { now: T + 3 * DAY });
  assert(r.total === 0 && Chests.count(ps, 'gold') === 2, 'niet nog een keer');
});
await atest('migratie v4 → v5: gekochte pets blijven, kist cadeau', async () => {
  const v4 = { version: 4, mastery: {}, unlocks: { owned: { pets: ['fox', 'dragon'] }, equipped: { pet: 'dragon' } } };
  const ps = new ProfileService(new MemoryAdapter({ profile: JSON.stringify(v4) }));
  await ps.load();
  assert(ps.profile.version === PROFILE_VERSION && PROFILE_VERSION >= 5);
  assert(Chests.owns(ps, 'fox') && Chests.owns(ps, 'dragon') && Equipment.equippedPet(ps).id === 'dragon', 'pets behouden');
  assert(Chests.count(ps, 'wood') === 1 && Chests.treats(ps) === 0 && ps.collection.found.fox, 'collectie aangemaakt');
});

console.log('\nTafelkaart (dag-progressie)');
const { buildMasteryMap, levelFor, MAP_RULES } = await import('../js/training/MasteryMap.js');
const DAY = 24 * 3600 * 1000, T0 = new Date(2026, 0, 5, 10, 0).getTime();
const day = n => T0 + n * DAY;
const tableKeys = t => { const r = new Set(); for (let i = 1; i <= 10; i++) { r.add(`${i}x${t}`); r.add(`${t}x${i}`); } return [...r]; };
test('in één run (ook 20× snel goed) nooit goud: blijft rood op dag 1', () => {
  const st = memStore(), tr = new AdaptiveTrainer(st);
  for (let i = 0; i < 20; i++) tr.recordAnswer('7x8', { correct: true, rtMs: 900, now: day(0) + i * 1000 });
  assert(levelFor(st.get('7x8'), day(0)) === 'hard', levelFor(st.get('7x8'), day(0)));
});
test('goud na precies 4 verschillende dagen snel en goed', () => {
  const st = memStore(), tr = new AdaptiveTrainer(st), seen = [];
  for (let d = 0; d < 4; d++) { for (let i = 0; i < 3; i++) tr.recordAnswer('6x7', { correct: true, rtMs: 1200, now: day(d) + i * 60000 }); seen.push(levelFor(st.get('6x7'), day(d))); }
  assert(seen.join(',') === 'hard,almost,good,gold', seen.join(','));
});
test('langzaam goed komt niet verder dan groen', () => {
  const st = memStore(), tr = new AdaptiveTrainer(st);
  for (let d = 0; d < 8; d++) tr.recordAnswer('8x7', { correct: true, rtMs: 4500, now: day(d) });
  assert(levelFor(st.get('8x7'), day(8)) === 'good');
  tr.recordAnswer('8x7', { correct: true, rtMs: 1500, now: day(9) });
  assert(levelFor(st.get('8x7'), day(9)) === 'gold', 'snel → goud');
});
test('fout kost één stap (max. één per dag) en blokkeert de stap van die dag', () => {
  const st = memStore(), tr = new AdaptiveTrainer(st);
  for (let d = 0; d < 3; d++) tr.recordAnswer('9x6', { correct: true, rtMs: 1000, now: day(d) }); // groen
  tr.recordAnswer('9x6', { correct: false, rtMs: 3000, now: day(3) });
  tr.recordAnswer('9x6', { correct: false, rtMs: 3000, now: day(3) + 5000 });
  assert(levelFor(st.get('9x6'), day(3)) === 'almost', 'één stap terug');
  tr.recordAnswer('9x6', { correct: true, rtMs: 900, now: day(3) + 9000 });
  assert(levelFor(st.get('9x6'), day(3)) === 'almost', 'na fout vandaag geen stap omhoog');
  tr.recordAnswer('9x6', { correct: true, rtMs: 900, now: day(4) });
  assert(levelFor(st.get('9x6'), day(4)) === 'good', 'volgende dag wel');
  for (let i = 0; i < 6; i++) tr.recordAnswer('3x4', { correct: false, rtMs: 2000, now: day(i) });
  assert(levelFor(st.get('3x4'), day(6)) === 'hard', 'nooit onder rood');
});
test('goud vervaagt na 14 dagen; snel goed = weer goud, traag = groen', () => {
  const st = memStore(), tr = new AdaptiveTrainer(st);
  for (let d = 0; d < 4; d++) { tr.recordAnswer('7x7', { correct: true, rtMs: 1000, now: day(d) }); tr.recordAnswer('7x6', { correct: true, rtMs: 1000, now: day(d) }); }
  assert(levelFor(st.get('7x7'), day(10)) === 'gold', 'na 7 dagen nog goud');
  assert(levelFor(st.get('7x7'), day(19)) === 'faded', 'na 16 dagen dof');
  tr.recordAnswer('7x7', { correct: true, rtMs: 1100, now: day(19) });
  assert(levelFor(st.get('7x7'), day(19)) === 'gold', 'snel opgefrist');
  tr.recordAnswer('7x6', { correct: true, rtMs: 6000, now: day(19) });
  assert(levelFor(st.get('7x6'), day(19)) === 'good', 'traag → groen');
});
test('kaart: 100 vakjes, tellingen, tafelmeester pas na 4 dagen', () => {
  const st = memStore(), tr = new AdaptiveTrainer(st);
  for (let d = 0; d < 4; d++) {
    for (const k of tableKeys(2)) tr.recordAnswer(k, { correct: true, rtMs: 800, now: day(d) });
    const m = buildMasteryMap(st, day(d));
    assert(m.cells.length === 100 && Object.values(m.counts).reduce((x, y) => x + y, 0) === 100, 'tellingen');
    assert(m.tables[2].master === (d === 3), 'meester op dag ' + d);
  }
  const m = buildMasteryMap(st, day(3));
  assert(m.cells.find(c => c.key === '2x5').upToday, 'vandaag omhoog gemarkeerd');
});
await atest('migratie v3 → v4: oude voortgang max. oranje, nooit gratis goud', async () => {
  const v3 = { version: 3, mastery: { '6x7': { seen: 9, correct: 9, wrong: 0, mastery: 0.95, lastSeen: T0 }, '2x2': { seen: 2, correct: 1, wrong: 1, mastery: 0.3, lastSeen: T0 } }, unlocks: {} };
  const ps = new ProfileService(new MemoryAdapter({ profile: JSON.stringify(v3) }));
  await ps.load();
  assert(ps.profile.version === PROFILE_VERSION);
  assert(levelFor(ps.profile.mastery['6x7'], T0) === 'almost', 'hoog → oranje');
  assert(levelFor(ps.profile.mastery['2x2'], T0) === 'hard', 'laag → rood');
});
test('run-resultaat telt stapjes en nieuw goud', () => {
  const st = memStore(), tr = new AdaptiveTrainer(st);
  for (let d = 0; d < 3; d++) tr.recordAnswer('4x8', { correct: true, rtMs: 1000, now: day(d) });
  const qe = new QuestionEngine({ trainer: tr, pool: ['4x8', '8x4', '3x3'], mode: 'mix', rng: seeded(1) });
  const ss = new SessionStats();
  let tries = 0;
  while (tries++ < 20) { const q = qe.next(); const r = qe.submit(q.answer, 900, day(3) + tries * 1000); ss.add(r); }
  const sum = ss.summary();
  assert(sum.newGolds === 1 && sum.mapUps >= 1, JSON.stringify({ ups: sum.mapUps, golds: sum.newGolds }));
});

console.log('\nWerelden');
const { WORLDS, WORLD_ORDER, ENEMY_TYPES: ET, BOSSES: BS } = await import('../js/data/worlds.js');
const { Worlds } = await import('../js/systems/Worlds.js');
const { Progression } = await import('../js/systems/Progression.js');
const { CONFIG: CFG } = await import('../js/config.js');
const ATLAS = JSON.parse(fs.readFileSync(new URL('../assets/atlas.json', import.meta.url)));
test('iedere wereld is compleet: biomen, assets, vijanden (1/2/3 HP), props, boss', () => {
  assert(WORLD_ORDER.length >= 2 && WORLD_ORDER.includes('frostpeak'));
  for (const id of WORLD_ORDER) {
    const w = WORLDS[id];
    assert(w.phases.length === 4 && w.phases[0].at === 0, id + ' fases');
    for (const ph of w.phases) {
      const b = w.biomes[ph.biome];
      assert(b && b.color && b.name === ph.name, id + '/' + ph.biome);
      assert(ATLAS.worlds[id].biomes[ph.biome].ground.count === 7, id + '/' + ph.biome + ' assets');
      const hp = new Set(b.enemies.map(([t]) => { const sh = ET[t] && ATLAS.sheets[ET[t].sheet]; assert(sh && sh.anims.move && sh.anims.attack && sh.anims.hurt, 'vijand ' + t + ' (sheet + animaties)'); return ET[t].maxHp; }));
      assert(hp.has(1) && hp.has(2) && hp.has(3), id + '/' + ph.biome + ' HP-klassen');
      for (const [p] of b.props.back) assert(ATLAS.atlases.props.rects[p], 'prop ' + p);
      for (const p of b.props.front) assert(ATLAS.atlases.props.rects[p], 'prop ' + p);
    }
    const boss = BS[w.boss], sh = ATLAS.sheets[boss.sheet];
    assert(boss.maxHp === BS.guardian.maxHp, 'boss even lang');
    assert(sh && Object.keys(sh.anims).join() === Object.keys(ATLAS.sheets.boss_guardian.anims).join(), 'boss-animaties');
    assert(boss.fx && boss.fx.wave && boss.fx.death, 'boss-fx');
  }
});
test('Frostpeak-fases met eigen namen; voortgang en tafels gelijk aan Greenwood', () => {
  const pr = new Progression({ ...CFG.run, phases: WORLDS.frostpeak.phases });
  const names = [pr.current.name];
  for (let i = 0; i < 3; i++) names.push(pr.advance(25).phaseChanged.name);
  assert(names.join(',') === 'BEVROREN MEER,IJSGROTTEN,BERGPAS,NOORDERLICHT', names.join(','));
  assert(pr.advance(25).bossReady, 'boss bij 100');
  assert(CFG.run.phases === WORLDS.greenwood.phases, 'Greenwood ongewijzigd');
});
await atest('Frostpeak gaat open na de Woudwachter (één keer), en blijft open', async () => {
  const ad = new MemoryAdapter(), ps = await newPS(ad);
  assert(!Worlds.isUnlocked(ps, 'frostpeak') && Worlds.selected(ps).id === 'greenwood', 'eerst dicht');
  const sum = { correct: 10, answered: 10, bestCombo: 3, avgRt: 1500, accuracy: 1, coins: 10, perfect: 0, durationMs: 1000 };
  ps.recordRun(sum, { mode: 'training', tables: [7], completed: false, world: 'greenwood' });
  assert(Worlds.checkUnlocks(ps).length === 0, 'zonder boss niet');
  ps.recordRun(sum, { mode: 'training', tables: [7], completed: true, world: 'greenwood' });
  assert(Worlds.checkUnlocks(ps).join() === 'frostpeak' && Worlds.isUnlocked(ps, 'frostpeak'), 'na de boss open');
  assert(Worlds.checkUnlocks(ps).length === 0, 'maar één keer gemeld');
  ps.recordRun(sum, { mode: 'mix', tables: [6, 7], completed: true, world: 'frostpeak' });
  assert(ps.worldBosses('frostpeak') === 1 && ps.worldBosses('greenwood') === 1, 'per wereld geteld');
  ps.updateSettings({ lastWorld: 'frostpeak' }); await ps.flush();
  const ps2 = await newPS(ad);
  assert(Worlds.isUnlocked(ps2, 'frostpeak') && Worlds.selected(ps2).id === 'frostpeak', 'bewaard na herladen');
});
await atest('migratie v5 → v6: wie de boss al versloeg krijgt Frostpeak meteen', async () => {
  for (const [beaten, open] of [[3, true], [0, false]]) {
    const v5 = { version: 5, stats: { bossesDefeated: beaten }, mastery: {}, unlocks: {} };
    const ps = new ProfileService(new MemoryAdapter({ profile: JSON.stringify(v5) }));
    await ps.load();
    assert(ps.profile.version === PROFILE_VERSION && Worlds.isUnlocked(ps, 'frostpeak') === open && ps.worldBosses('greenwood') === beaten, 'bosses ' + beaten);
    assert(ps.settings.lastWorld === 'greenwood');
  }
});

test('Stormrijk: eigen vijanden (geen hergebruikte sprites) en een eigen boss met bliksemstraal', () => {
  const sheetsOf = id => new Set(Object.values(WORLDS[id].biomes).flatMap(b => b.enemies.map(([t]) => ET[t].sheet)));
  const storm = sheetsOf('stormrijk'), others = new Set([...sheetsOf('greenwood'), ...sheetsOf('frostpeak')]);
  assert(storm.size >= 6, 'minstens 6 soorten');
  for (const sh of storm) assert(!others.has(sh), 'hergebruikt: ' + sh);
  // eigen PNG-bestand per vijand (geen kleurvariant van een bestaande sheet-functie in dezelfde file)
  const srcs = [...storm].map(sh => ATLAS.sheets[sh].src);
  assert(new Set(srcs).size === srcs.length && srcs.every(s => !/slime|bat|rock|beetle/.test(s)), srcs.join());
  const boss = BS[WORLDS.stormrijk.boss];
  assert(boss.attack === 'breath' && boss.mouth.length === 2 && boss.fx.beam, 'bliksemstraal');
  assert(ATLAS.sheets[boss.sheet].src !== ATLAS.sheets.boss_guardian.src && boss.sheet !== 'boss_frost', 'eigen boss-sheet');
  assert(Object.values(WORLDS.stormrijk.biomes).every(b => b.lightning && b.lightning[0] >= 3), 'bliksem niet vaker dan om de 3 s');
});
await atest('Stormrijk gaat open na De IJsreus', async () => {
  const ps = await newPS();
  const sum = { correct: 10, answered: 10, bestCombo: 3, avgRt: 1500, accuracy: 1, coins: 10, perfect: 0, durationMs: 1000 };
  ps.recordRun(sum, { mode: 'training', tables: [7], completed: true, world: 'greenwood' });
  assert(Worlds.checkUnlocks(ps).join() === 'frostpeak' && !Worlds.isUnlocked(ps, 'stormrijk'), 'eerst alleen Frostpeak');
  ps.recordRun(sum, { mode: 'training', tables: [7], completed: true, world: 'frostpeak' });
  assert(Worlds.checkUnlocks(ps).join() === 'stormrijk' && Worlds.isUnlocked(ps, 'stormrijk'), 'na De IJsreus');
  assert(Worlds.requirementLabel('stormrijk') === 'VERSLA DE IJSREUS');
});

console.log('\nWereld-exclusieve pets');
const PD = await import('../js/data/pets.js');
const CD = await import('../js/data/chests.js');
test('5 wereld-pets per wereld (2 gewoon, zeldzaam, episch, legendarisch), eigen sprite, geen gameplay', () => {
  for (const w of WORLD_ORDER) {
    const ids = PD.WORLD_PET_ORDER[w];
    assert(ids && ids.length === 5, w);
    const r = ids.map(id => PD.PETS[id].rarity).sort().join();
    assert(r === ['common', 'common', 'epic', 'legendary', 'rare'].sort().join(), w + ' ' + r);
    for (const id of ids) {
      const pet = PD.PETS[id], sh = ATLAS.sheets[pet.sheet];
      assert(pet.world === w && sh && sh.anims.idle && sh.anims.run && sh.anims.cheer, id);
      assert(!('damage' in pet) && !('price' in pet), id + ' cosmetisch');
    }
    // ook hier: zeldzamer = groter
    const area = r2 => ids.filter(id => PD.PETS[id].rarity === r2).map(id => ATLAS.sheets[PD.PETS[id].sheet]).reduce((s2, sh) => s2 + sh.fw * sh.fh, 0) / ids.filter(id => PD.PETS[id].rarity === r2).length;
    assert(area('legendary') > area('epic') && area('epic') > area('common'), w + ' grootte');
  }
  assert(PD.ALL_PET_ORDER.length === 25 && new Set(PD.ALL_PET_ORDER).size === 25, 'samen 25 unieke pets');
});
test('wereld-pets komen NIET uit gewone kisten, wel (alleen) uit hun eigen wereldkist', () => {
  const rng = seeded(11);
  const fromGold = new Set(); for (let i = 0; i < 3000; i++) fromGold.add(Chests.rollPet('gold', rng));
  assert([...fromGold].every(id => !PD.PETS[id].world), 'gouden kist: alleen kist-pets');
  for (const [w, kind] of Object.entries(CD.WORLD_CHESTS)) {
    const got = new Set(); for (let i = 0; i < 3000; i++) got.add(Chests.rollPet(kind, rng));
    assert(got.size === 5 && [...got].every(id => PD.PETS[id].world === w), kind + ': ' + [...got].join());
    assert(CD.CHESTS[kind].price == null && Chests.buy({ spendCoins: () => true }, kind).reason === 'notForSale', kind + ' niet te koop');
  }
});
await atest('wereldkist alleen via de boss van die wereld', async () => {
  const ps = await newPS();
  let r = Chests.awardForRun(ps, { mapUps: 25, newGolds: 6 }, { completed: false, world: 'frostpeak' });
  assert(!r.chests.some(c => CD.WORLD_CHEST_ORDER.includes(c.kind)), 'zonder boss geen wereldkist (wel tafel/goud)');
  for (const [w, kind] of Object.entries(CD.WORLD_CHESTS)) {
    r = Chests.awardForRun(ps, { mapUps: 0, newGolds: 0 }, { completed: true, world: w });
    assert(r.chests.length === 1 && r.chests[0].kind === kind && Chests.count(ps, kind) === 1, w + ' → ' + kind);
  }
  assert(Chests.count(ps, 'tafel') === 2, 'tafelkisten alleen van de stapjes');
});
await atest('wereld-pet lokken pas na het verslaan van de boss van die wereld', async () => {
  const ps = await newPS();
  ps.collection.treats = 5000;
  assert(Chests.lure(ps, 'mammoth').reason === 'world', 'eerst niet');
  assert(Chests.lure(ps, 'fox').ok, 'kist-pet mag wel');
  const sum = { correct: 10, answered: 10, bestCombo: 3, avgRt: 1500, accuracy: 1, coins: 10, perfect: 0, durationMs: 1000 };
  ps.recordRun(sum, { mode: 'training', tables: [7], completed: true, world: 'greenwood' });
  assert(Chests.lure(ps, 'mammoth').reason === 'world', 'boss van een andere wereld telt niet');
  ps.recordRun(sum, { mode: 'training', tables: [7], completed: true, world: 'frostpeak' });
  assert(Chests.lure(ps, 'mammoth').ok && Chests.owns(ps, 'mammoth'), 'na De IJsreus wel');
  // openen van een wereldkist: nieuw → in het boek, dubbel → snoepjes
  Chests.add(ps, 'storm', 2);
  const a = Chests.open(ps, 'storm', () => 0.01), b = Chests.open(ps, 'storm', () => 0.01);
  assert(a.isNew && PD.PETS[a.petId].world === 'stormrijk' && !b.isNew && b.treats > 0, 'stormkist');
});

console.log('\nUitleg & tips');
const { HELP_CHAPTERS, TIPS } = await import('../js/data/help.js');
const { Tips } = await import('../js/systems/Tips.js');
const FONT = await import('../js/ui/fontData.js');
const MAPLV = await import('../js/training/MasteryMap.js');
const allTexts = () => {
  const out = [];
  for (const c of HELP_CHAPTERS) {
    out.push(c.title);
    for (const b of c.blocks) {
      if (b.p) out.push(b.p);
      if (b.big) out.push(b.big);
      if (b.keys) for (const [k, t] of b.keys) out.push(k, t);
      if (b.row) for (const it of b.row) { if (it.label) out.push(it.label); if (it.text) out.push(it.text); }
    }
  }
  for (const t of Object.values(TIPS)) out.push(t.text);
  return out;
};
test('uitleg: 7 hoofdstukken over alles (spelen, modi, kaart, uitrusting, pets, werelden, toetsen)', () => {
  assert(HELP_CHAPTERS.map(c => c.id).join() === 'spelen,modi,kaart,uitrusting,pets,werelden,toetsen');
  for (const c of HELP_CHAPTERS) {
    assert(c.title && c.blocks.length && ATLAS.atlases.ui.rects[c.icon], c.id);
    for (const b of c.blocks) if (b.row) for (const it of b.row) {
      if (it.chest) assert(CHESTS[it.chest], 'kist ' + it.chest);
      if (it.map) assert(MAPLV.LEVEL_BY_ID[it.map], 'kaartkleur ' + it.map);
      if (it.icon) assert(ATLAS.atlases.ui.rects[it.icon], 'icoon ' + it.icon);
    }
  }
  const all = allTexts().join(' ');
  for (const word of ['ENTER', 'COMBO', 'TAFELKAART', '4 VERSCHILLENDE DAGEN', 'SNOEPJES', 'WERELDKIST', 'WOUDWACHTER', 'IJSREUS']) assert(all.includes(word), 'uitleg noemt ' + word);
  for (const t of Object.values(TIPS)) assert(ATLAS.atlases.ui.rects[t.icon], 'tip-icoon ' + t.icon);
});
test('alle uitleg- en tipteksten bestaan uit letters die het pixelfont kent', () => {
  const known = new Set([...Object.keys(FONT.SMALL), ' ']);
  const missing = new Set();
  for (const t of allTexts()) for (const ch of t.toUpperCase()) if (!known.has(ch)) missing.add(ch);
  assert(missing.size === 0, 'ontbrekend: ' + [...missing].join(' '));
});
await atest('tips: één keer per onderwerp, blijft bewaard, niet wegtikken binnen 0,6 s', async () => {
  const ad = new MemoryAdapter(), ps = await newPS(ad);
  const game = { profile: ps, audio: { play() {} } };
  const tips = new Tips(game);
  tips.queue('firstChest'); tips.queue('firstChest'); tips.queue('coins');
  assert(tips.waiting.join() === 'firstChest,coins', 'geen dubbele in de wachtrij');
  tips.update(0.1);
  assert(tips.active && tips.current.id === 'firstChest' && tips.seen('firstChest'), 'getoond = gezien');
  assert(tips.onKey({ type: 'enter' }) && tips.active, 'te snel: blijft staan (en toets wordt opgevangen)');
  tips.update(0.6); tips.onKey({ type: 'enter' });
  assert(!tips.active, 'na 0,6 s weg met Enter');
  tips.update(0.1); assert(!tips.active, 'hooguit één tip per scherm');
  tips.queue('duplicate', true); tips.update(0.1);
  assert(tips.current && tips.current.id === 'duplicate', 'urgente tip mag wel direct');
  tips.reset(); tips.queue('coins'); tips.update(0.1);
  assert(tips.current && tips.current.id === 'coins', 'volgend scherm: volgende tip');
  await ps.flush();
  const ps2 = await newPS(ad), tips2 = new Tips({ profile: ps2, audio: { play() {} } });
  tips2.queue('firstChest'); tips2.update(0.1);
  assert(!tips2.active, 'na herladen niet nog eens');
  assert(!tips2.onKey({ type: 'enter' }), 'zonder tip gaan toetsen gewoon door');
});

console.log('\nWeb-app (telefoon/tablet)');
test('manifest, iconen, service worker en draai-je-telefoon-scherm zijn aanwezig', () => {
  const root = new URL('../', import.meta.url);
  const man = JSON.parse(fs.readFileSync(new URL('manifest.webmanifest', root)));
  assert(man.name === 'Tafel Rush' && man.orientation === 'landscape' && man.start_url, 'manifest');
  for (const ic of man.icons) assert(fs.existsSync(new URL(ic.src, root)), 'icoon ' + ic.src);
  assert(man.icons.some(i => i.purpose === 'maskable') && man.icons.some(i => i.sizes === '512x512'), 'maskable + 512');
  assert(fs.existsSync(new URL('assets/app/icon-1024.png', root)), 'App Store-icoon 1024');
  const html = fs.readFileSync(new URL('index.html', root), 'utf8');
  for (const s of ['rel="manifest"', 'apple-touch-icon', 'apple-mobile-web-app-capable', 'id="rotate"']) assert(html.includes(s), 'index.html mist ' + s);
  const sw = fs.readFileSync(new URL('sw.js', root), 'utf8');
  assert(sw.includes("addEventListener('fetch'") && sw.includes('caches.match'), 'service worker met offline-cache');
});

console.log(`\n${passed} geslaagd, ${failed} mislukt\n`);
process.exit(failed ? 1 : 0);
