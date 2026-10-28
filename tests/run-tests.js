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
    out.push(c.title); if (c.touchTitle) out.push(c.touchTitle);
    for (const b of [...c.blocks, ...(c.touchBlocks || [])]) {
      if (b.p) out.push(b.p);
      if (b.touch) out.push(b.touch);
      if (b.big) out.push(b.big);
      if (b.keys) for (const [k, t] of b.keys) out.push(k, t);
      if (b.row) for (const it of b.row) { if (it.label) out.push(it.label); if (it.text) out.push(it.text); }
    }
  }
  for (const t of Object.values(TIPS)) { out.push(t.text); if (t.touch) out.push(t.touch); }
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

console.log('\nVoortgangscode & QR');
const { QRCode, dataCodewords, alignmentPositions } = await import('../js/ui/QRCode.js');
const { readQR } = await import('./qr-reader.js');
const { ProgressCode } = await import('../js/storage/ProgressCode.js');
test('QR: capaciteit klopt met de QR-standaard (bytes per versie/niveau)', () => {
  // bekende maximale aantallen bytes in byte-modus
  const known = [[1, 'L', 17], [1, 'M', 14], [1, 'Q', 11], [1, 'H', 7], [10, 'L', 271], [10, 'M', 213], [10, 'Q', 151], [10, 'H', 119], [40, 'L', 2953], [40, 'M', 2331], [40, 'Q', 1663], [40, 'H', 1273]];
  for (const [v, e, bytes] of known) {
    const cc = v <= 9 ? 8 : 16;
    assert(Math.floor((dataCodewords(v, e) * 8 - 4 - cc) / 8) === bytes, v + e + ' → ' + bytes);
  }
  assert(alignmentPositions(7).join() === '6,22,38' && alignmentPositions(32).join() === '6,34,60,86,112,138' && alignmentPositions(36).join() === '6,24,50,76,102,128,154', 'uitlijnpatronen');
});
test('QR: wat we maken, leest een onafhankelijke lezer exact terug (formaat, Reed-Solomon, inhoud)', () => {
  // teksten die een versie precies tot de rand vullen (versies die de lezer kent)
  const cap = (v, e) => Math.floor((dataCodewords(v, e) * 8 - 4 - (v <= 9 ? 8 : 16)) / 8);
  const chars = 'Tafel Rush 7x8=56 https://tafelrush.meesterdanny.com/#voortgang=TR1.Ab9_-';
  const fill = n => Array.from({ length: n }, (_, i) => chars[(i * 7) % chars.length]).join('');
  for (const ecl of ['L', 'M']) for (const v of [1, 2, 5, 7, 10, 15, 20, 25, 30, 35, 40]) {
    const s = fill(cap(v, ecl));
    assert(QRCode.encode(s, ecl).version === v, 'versie ' + v + ecl);
    if (v > 1) assert(QRCode.encode(fill(cap(v - 1, ecl) + 1), ecl).version === v, 'net over de rand → ' + v + ecl);
    const qr = QRCode.encode(s, ecl);
    const got = readQR((x, y) => qr.get(x, y), qr.size, alignmentPositions(qr.version));
    assert(got.text === s && got.ecl === ecl && got.ver === qr.version, ecl + ' v' + v + ': ' + (got.text === s ? 'meta' : 'tekst'));
  }
  const uni = 'é€ 7×8=56';
  assert(readQR((x, y) => QRCode.encode(uni).get(x, y), QRCode.encode(uni).size, []).text === uni, 'tekens buiten ASCII');
});
await atest('voortgangscode: inpakken + uitpakken geeft dezelfde voortgang, past in een QR-code', async () => {
  const ps = await newPS();
  const tr = new AdaptiveTrainer(ps.masteryStore), T0 = Date.now() - 20 * 864e5;
  for (let d = 0; d < 20; d++) for (const k of factsForTables([2, 3, 4, 5, 6, 7, 8, 9])) tr.recordAnswer(k, { correct: (d + k.length) % 7 !== 0, rtMs: 900 + (d * 37) % 3000, now: T0 + d * 864e5 });
  ps.addCoins(4321); Chests.grant(ps, 'wolf'); Chests.grant(ps, 'mammoth'); ps.unlockWorld('frostpeak'); ps.collection.treats = 75;
  const code = await ProgressCode.make(ps.profile);
  const link = ProgressCode.link(code, 'https://tafelrush.meesterdanny.com/');
  assert(code.startsWith('TR1.') && link.length < 2400, 'lengte ' + link.length);
  const back = await ProgressCode.read('kijk: ' + link + ' (bewaren!)');
  assert(JSON.stringify(ProgressCode.summary(back)) === JSON.stringify(ProgressCode.summary(ps.profile)), 'samenvatting gelijk');
  for (const k of ['7x8', '6x7', '9x9']) {
    const a = ps.profile.mastery[k], b = back.mastery[k];
    assert(a.seen === b.seen && a.wrong === b.wrong && a.correct === b.correct && a.recent === b.recent && a.map.level === b.map.level && a.map.upDay === b.map.upDay, k);
    assert(Math.abs(a.avgRt - b.avgRt) <= 50 && Math.abs(a.lastSeen - b.lastSeen) <= 60000 && Math.abs(a.mastery - b.mastery) < 0.006, k + ' afronding');
  }
  assert(back.unlocks.owned.pets.includes('wolf') && back.worlds.unlocked.frostpeak && back.collection.treats === 75 && back.version === PROFILE_VERSION, 'rest van het profiel');
  const qr = QRCode.encode(link, 'L');
  assert(readQR((x, y) => qr.get(x, y), qr.size, alignmentPositions(qr.version)).text === link, 'QR van de link leesbaar');
  // na importeren werkt het profiel gewoon (laden + opslaan)
  const ps2 = await newPS(); await ps2.importData(back);
  assert(ps2.coins === ps.coins && Chests.owns(ps2, 'mammoth'), 'importeren');
});
await atest('voortgangscode: onzin of een kapotte code geeft een nette fout', async () => {
  for (const bad of ['', 'hallo', 'TR1.', 'TR1.@@@@', 'TR1.AAAA']) {
    let threw = false;
    try { await ProgressCode.read(bad); } catch (e) { threw = true; }
    assert(threw, 'geen fout bij: ' + bad);
  }
});

console.log('\nAccounts (gebruikersnaam + sync-regels)');
const SL = await import('../js/net/syncLogic.js');
const { createDefaultProfile } = await import('../js/storage/profileSchema.js');
test('gebruikersnaam: kleine letters, cijfers en _, 3-20 tekens', () => {
  assert(SL.checkUsername('snelle_vos12') === null, 'goede naam');
  assert(SL.checkUsername('  Snelle_Vos ') === null && SL.normalizeUsername('  Snelle_Vos ') === 'snelle_vos', 'hoofdletters/spaties worden netjes gemaakt');
  for (const bad of ['ab', 'a'.repeat(21), 'met spatie', 'émile', 'naam!', '']) assert(SL.checkUsername(bad), 'zou fout moeten zijn: ' + bad);
  assert(SL.checkPassword('12345') && SL.checkPassword('123456') === null, 'wachtwoord min. 6');
  assert(SL.usernameToEmail('Vos_1', 'spelers.meesterdanny.com') === 'vos_1@spelers.meesterdanny.com', 'nep-adres');
});
test('vingerafdruk verandert bij nieuwe voortgang, niet bij alleen meta', () => {
  const p = createDefaultProfile(1), h = SL.contentHash(p);
  p.meta.revision = 99; p.meta.cloudRevision = 5;
  assert(SL.contentHash(p) === h, 'meta telt niet mee');
  p.stats.totalAnswered = 1;
  assert(SL.contentHash(p) !== h, 'inhoud telt wel mee');
});
test('na inloggen: juiste keuze tussen account en dit apparaat', () => {
  const U = 'user-a';
  const empty = () => createDefaultProfile(1);
  const played = () => { const p = createDefaultProfile(1); p.stats.totalAnswered = 50; return p; };
  const synced = (p, rev) => { p.meta.accountId = U; p.meta.cloudRevision = rev; p.meta.syncedHash = SL.contentHash(p); return p; };
  assert(SL.decideOnLogin(played(), null, U) === 'upload', 'nieuw account + voortgang hier → uploaden');
  assert(SL.decideOnLogin(empty(), { data: played(), revision: 3 }, U) === 'download', 'leeg apparaat → account ophalen');
  assert(SL.decideOnLogin(played(), { data: empty(), revision: 1 }, U) === 'upload', 'leeg account → dit apparaat uploaden');
  assert(SL.decideOnLogin(played(), { data: played(), revision: 2 }, U) === 'choose', 'allebei voortgang → kiezen');
  assert(SL.decideOnLogin(synced(played(), 2), { data: played(), revision: 2 }, U) === 'same', 'al gelijk');
  assert(SL.decideOnLogin(synced(played(), 2), { data: played(), revision: 4 }, U) === 'download', 'ander apparaat verder → ophalen');
  const dirty = synced(played(), 2); dirty.stats.totalAnswered++;
  assert(SL.decideOnLogin(dirty, { data: played(), revision: 2 }, U) === 'upload', 'hier verder gespeeld → uploaden');
  assert(SL.decideOnLogin(dirty, { data: played(), revision: 4 }, U) === 'choose', 'allebei verder → kiezen');
  const other = synced(played(), 2); other.meta.accountId = 'user-b';
  assert(SL.decideOnLogin(other, { data: played(), revision: 1 }, U) === 'download', 'voortgang van een ander account wordt nooit gemengd');
  assert(SL.decideOnLogin(other, null, U) === 'fresh', 'ander account + leeg account → leeg beginnen');
});
await atest('code/QR importeren laat de koppeling met het account staan', async () => {
  const ps = new ProfileService(new MemoryAdapter()); await ps.load();
  ps.profile.meta.accountId = 'user-a'; ps.profile.meta.cloudRevision = 7;
  const other = createDefaultProfile(1); other.stats.totalAnswered = 3;
  await ps.importData(other);
  assert(ps.profile.meta.accountId === 'user-a' && ps.profile.meta.cloudRevision === 7 && ps.stats.totalAnswered === 3, 'koppeling behouden');
});
await atest('accounts staan uit zolang er geen Supabase-gegevens zijn ingevuld', async () => {
  const { CONFIG } = await import('../js/config.js');
  assert(CONFIG.accounts && 'url' in CONFIG.accounts && 'anonKey' in CONFIG.accounts, 'instellingen bestaan');
  assert(!/service_role/i.test(fs.readFileSync(new URL('../js/config.js', import.meta.url), 'utf8').replace(/NOOIT de service_role-sleutel/, '')), 'geen service_role-sleutel in de game');
});

console.log('\nSoorten sommen (ombouw mag de keertafels NIET veranderen)');
{
  const golden = JSON.parse(fs.readFileSync(new URL('./fixtures/golden-mul.json', import.meta.url), 'utf8'));
  const now = await (await import('./make-golden.js')).snapshot();
  const firstDiff = (a, b, path = '') => {
    if (JSON.stringify(a) === JSON.stringify(b)) return null;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = firstDiff(a[k], b[k], path + '.' + k); if (d) return d; }
    }
    return `${path}: was ${JSON.stringify(a)?.slice(0, 80)}, nu ${JSON.stringify(b)?.slice(0, 80)}`;
  };
  // het profiel uit een voortgangscode mag NIEUWE velden krijgen (bijv. deeltafel-records),
  // maar alles wat er al in zat moet precies hetzelfde blijven
  const subset = (a, b) => {
    if (a && typeof a === 'object' && !Array.isArray(a) && b && typeof b === 'object') {
      const o = {}; for (const k of Object.keys(a)) o[k] = subset(a[k], b[k]); return o;
    }
    return b;
  };
  for (const part of Object.keys(golden)) {
    const cur = part === 'progressCodeProfile' ? subset(golden[part], now[part]) : now[part];
    test(`keertafels exact gelijk aan de referentie: ${part}`, () => { const d = firstDiff(golden[part], cur); assert(!d, d); });
  }
}
{
  const F = await import('../js/training/facts.js');
  const OPS = await import('../js/training/operations.js');
  test('elke bestaande sleutel is een keersom met het ×-teken', () => {
    for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
      const k = F.factKey(a, b);
      assert(F.opIdOf(k) === 'mul' && F.symbolOf(k) === '×' && F.formatFact(k) === `${a} × ${b}`, k);
    }
    assert(OPS.DEFAULT_OPERATION === 'mul' && OPS.opOfKey('onzin').id === 'mul', 'onbekend = keer');
  });
  test('vraag tijdens het spelen weet zelf welk soort som en teken hij heeft', () => {
    const qe = new QuestionEngine({ trainer: new AdaptiveTrainer(memStore()), pool: F.factsForTable(7), mode: 'training', tables: [7], rng: seeded(9) });
    const q = qe.next();
    assert(q.op === 'mul' && q.symbol === '×', JSON.stringify(q));
  });
  await atest('voortgangscode bewaart ook sommen van een ander soort (bijv. deelsommen later)', async () => {
    const p = createDefaultProfile(1);
    p.mastery['6x7'] = { seen: 3, correct: 3, wrong: 0, mastery: 0.7, avgRt: 2000, lastSeen: Date.now(), streak: 3, map: { level: 2, upDay: null, downDay: null, wrongDay: null } };
    p.mastery['42:6'] = { seen: 2, correct: 1, wrong: 1, mastery: 0.4, avgRt: 3000, lastSeen: Date.now(), streak: 0 };
    const back = await ProgressCode.read(await ProgressCode.make(p));
    assert(back.mastery['42:6'] && back.mastery['42:6'].seen === 2 && back.mastery['6x7'].seen === 3, JSON.stringify(Object.keys(back.mastery)));
  });
}

console.log('\nDeeltafels');
{
  const F = await import('../js/training/facts.js');
  const { buildMasteryMap } = await import('../js/training/MasteryMap.js');
  const { Chests } = await import('../js/systems/Chests.js');
  test('deeltafel van 8 = 8:8 … 80:8, antwoord 1 t/m 10, teken :', () => {
    const t8 = F.factsForTable(8, 'div');
    assert(t8.length === 10 && t8[0] === '8:8' && t8[9] === '80:8', t8.join(' '));
    t8.forEach((k, i) => { const p = F.parseKey(k); assert(p.answer === i + 1 && F.opIdOf(k) === 'div' && F.symbolOf(k) === ':', k); });
    assert(F.formatFact('56:8') === '56 : 8', F.formatFact('56:8'));
  });
  test('deelsom hoort bij de keersom (56:8 ↔ 56:7, en 7×8)', () => {
    assert(F.reverseKey('56:8') === '56:7' && F.reverseKey('49:7') === '49:7', 'omkering');
    assert(F.relatedKey('56:8') === '7x8' && F.relatedKey('7x8') === null, 'gekoppelde keersom');
    for (const k of F.factsForTables([2, 3, 4, 5, 6, 7, 8, 9, 10], 'div')) { const p = F.priorMastery(k); assert(p >= 0.15 && p < 0.62, k + ' ' + p); }
  });
  test('wie 7×8 kent, begint met 56:8 iets hoger', () => {
    const st = memStore(), tr = new AdaptiveTrainer(st);
    const before = tr.mastery('56:8');
    st.set('7x8', { seen: 10, correct: 10, wrong: 0, mastery: 0.95, avgRt: 1500, recent: '1111111111', lastSeen: 1 });
    assert(tr.mastery('56:8') > before, before + ' → ' + tr.mastery('56:8'));
  });
  test('deeltafels: geen directe herhaling en alleen deelsommen (1000 vragen, mix)', () => {
    const tr = new AdaptiveTrainer(memStore());
    const qe = new QuestionEngine({ trainer: tr, pool: F.factsForTables([3, 6, 8], 'div'), mode: 'mix', tables: [3, 6, 8], rng: seeded(21) });
    let prev = null;
    for (let i = 0; i < 1000; i++) {
      const q = qe.next();
      assert(q.key !== prev && q.op === 'div' && q.symbol === ':' && Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= 10, 'vraag ' + i + ' ' + q.key);
      prev = q.key;
      qe.submit(q.answer, 1800);
    }
  });
  test('moeilijke sommen per soort: deelsommen niet in het keermenu', () => {
    const st = memStore(), tr = new AdaptiveTrainer(st), bad = { seen: 6, correct: 1, wrong: 5, mastery: 0.1, avgRt: 7000, recent: '000000' };
    st.set('7x8', { ...bad }); st.set('56:8', { ...bad }); st.set('63:9', { ...bad });
    assert(tr.hardestFacts(15, 2, 'mul').join() === '7x8', tr.hardestFacts(15, 2, 'mul').join());
    assert(tr.hardestFacts(15, 2, 'div').sort().join() === '56:8,63:9', tr.hardestFacts(15, 2, 'div').join());
  });
  test('tafelkaart deeltafels: rij = deeltafel, kolom = antwoord, 100 vakjes', () => {
    const m = buildMasteryMap(memStore(), Date.now(), 'div');
    const c = m.cells[(8 - 1) * 10 + (7 - 1)];
    assert(m.cells.length === 100 && c.key === '56:8' && c.answer === 7 && m.tables[8].total === 10, JSON.stringify(c));
  });
  await atest('records en tellingen per soort; keertafels-records blijven apart', async () => {
    const ps = new ProfileService(new MemoryAdapter()); await ps.load();
    ps.noteAnswer(true, 'fast', 'mul'); ps.noteAnswer(true, 'fast', 'div'); ps.noteAnswer(false, 'slow', 'div');
    assert(ps.answeredFor('mul') === 1 && ps.answeredFor('div') === 2 && ps.stats.totalAnswered === 3, 'tellingen');
    const sum = { answered: 20, correct: 18, bestCombo: 12, avgRt: 2000, accuracy: 0.9, coins: 10, durationMs: 1000 };
    ps.recordRun(sum, { mode: 'mix', tables: [3], completed: false, op: 'div' });
    assert(ps.recordsFor('div').mostCorrect === 18 && ps.recordsFor('mul').mostCorrect === 0 && ps.records.mostCorrect === 0, 'records per soort');
  });
  await atest('oud profiel (van vóór de deeltafels) krijgt veilige standaardwaarden', async () => {
    const old = createDefaultProfile(1); delete old.opRecords; delete old.settings.operation; delete old.settings.opChosen; delete old.stats.byOp;
    old.records.mostCorrect = 33; old.stats.totalAnswered = 500;
    const ps = new ProfileService(new MemoryAdapter({ profile: JSON.stringify(old) })); await ps.load();
    assert(ps.settings.operation === 'mul' && ps.settings.opChosen === false && ps.records.mostCorrect === 33, 'standaard tafels, records behouden');
    assert(ps.answeredFor('mul') === 500 && ps.answeredFor('div') === 0, 'oude sommen tellen als tafels');
  });
  await atest('hele deeltafel goud geeft een gouden kist (los van de keertafel)', async () => {
    const ps = new ProfileService(new MemoryAdapter()); await ps.load();
    const gold = { seen: 9, correct: 9, wrong: 0, mastery: 0.95, avgRt: 1200, recent: '111111111', lastSeen: Date.now(), map: { level: 4, upDay: null, downDay: null, wrongDay: null, goldDay: Math.floor(Date.now() / 864e5) } };
    for (const k of F.factsForTable(4, 'div')) ps.profile.mastery[k] = { ...gold, map: { ...gold.map } };
    const before = Chests.count(ps, 'gold');
    const res = Chests.awardForRun(ps, { mapUps: 0, newGolds: 0 }, { completed: false });
    const viaTable = res.chests.filter(c => c.reason === 'table');
    assert(viaTable.length === 1 && viaTable[0].op === 'div' && ps.collection.masterTables.includes('d4') && !ps.collection.masterTables.includes(4), JSON.stringify(res.chests) + ' ' + JSON.stringify(ps.collection.masterTables));
    assert(Chests.count(ps, 'gold') > before, 'kist erbij');
  });
}

console.log(`\n${passed} geslaagd, ${failed} mislukt\n`);
process.exit(failed ? 1 : 0);
