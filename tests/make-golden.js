// ---------------------------------------------------------------------------
// Maakt tests/fixtures/golden-mul.json: een momentopname van hoe de keertafels
// zich gedragen (sommen, omkeringen, startinschatting, vraagvolgorde, tafelkaart,
// voortgangscode). De tests vergelijken de huidige code daarmee, zodat een
// ombouw ("soort som") de keertafels gegarandeerd niet verandert.
//   node tests/make-golden.js      (alleen opnieuw draaien als het gedrag BEWUST verandert)
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import * as F from '../js/training/facts.js';
import { AdaptiveTrainer } from '../js/training/AdaptiveTrainer.js';
import { QuestionEngine } from '../js/training/QuestionEngine.js';
import { buildMasteryMap } from '../js/training/MasteryMap.js';
import { ProgressCode } from '../js/storage/ProgressCode.js';
import { createDefaultProfile } from '../js/storage/profileSchema.js';

export const T0 = new Date(2026, 9, 1, 9, 0).getTime();

export function seeded(s = 42) {
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function memStore() {
  const m = {};
  return { get: k => m[k], set: (k, v) => { m[k] = v; }, entries: () => Object.entries(m), raw: m };
}

/** Speel een vaste reeks vragen (vaste tijden, vaste goed/fout) en geef de gestelde sommen terug. */
export function playSequence({ pool, mode, tables = [], seed, n = 300 }) {
  const store = memStore(), tr = new AdaptiveTrainer(store);
  const qe = new QuestionEngine({ trainer: tr, pool, mode, tables, rng: seeded(seed) });
  const keys = [];
  let now = T0;
  for (let i = 0; i < n; i++) {
    const q = qe.next();
    keys.push(q.key + '=' + q.answer);
    const wrong = i % 7 === 3;
    now += 2500 + (i % 5) * 900 + (i % 50 === 49 ? 3 * 864e5 : 0); // af en toe een paar dagen later
    qe.submit(wrong ? q.answer + 1 : q.answer, 1200 + (i * 373) % 4200, now);
  }
  return { keys, store: store.raw, now };
}

export async function snapshot() {
  const keys = [];
  for (let a = F.MIN_FACTOR; a <= F.MAX_FACTOR; a++) for (let b = F.MIN_FACTOR; b <= F.MAX_FACTOR; b++) keys.push(F.factKey(a, b));
  const perKey = Object.fromEntries(keys.map(k => [k, { parse: F.parseKey(k), reverse: F.reverseKey(k), prior: F.priorMastery(k), text: F.formatFact(k) }]));
  const tables = Object.fromEntries(F.ALL_TABLES.map(t => [t, F.factsForTable(t)]));
  const power = F.factsForTables(F.POWER_TABLES);
  const seqs = {
    power: playSequence({ pool: power, mode: 'power', seed: 11 }),
    training7: playSequence({ pool: F.factsForTable(7), mode: 'training', tables: [7], seed: 12 }),
    mix368: playSequence({ pool: F.factsForTables([3, 6, 8]), mode: 'mix', tables: [3, 6, 8], seed: 13 }),
  };
  // tafelkaart en voortgangscode op basis van de gespeelde power-reeks
  const map = buildMasteryMap(memStoreFrom(seqs.power.store), seqs.power.now);
  const p = createDefaultProfile(T0);
  p.meta.profileId = 'golden';
  p.mastery = JSON.parse(JSON.stringify(seqs.power.store));
  p.stats.totalAnswered = 300;
  p.currency.coins = 1234;
  const code = await ProgressCode.make(p, seqs.power.now);
  const back = JSON.parse(JSON.stringify(await ProgressCode.read(code)));
  delete back.meta.updatedAt;   // = "nu" bij het inlezen, hoort niet bij de vergelijking
  return {
    perKey, tables, power,
    sequences: Object.fromEntries(Object.entries(seqs).map(([k, v]) => [k, v.keys])),
    masteryAfterPower: seqs.power.store,
    map: JSON.parse(JSON.stringify(map)),
    progressCode: code,
    progressCodeProfile: back,
  };
}

function memStoreFrom(raw) {
  return { get: k => raw[k], set: (k, v) => { raw[k] = v; }, entries: () => Object.entries(raw) };
}

if (process.argv[1] && process.argv[1].endsWith('make-golden.js')) {
  const out = new URL('./fixtures/golden-mul.json', import.meta.url);
  fs.mkdirSync(new URL('./fixtures/', import.meta.url), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(await snapshot()));
  console.log('geschreven:', out.pathname);
}
