// ---------------------------------------------------------------------------
// Soorten sommen ("operaties"). Alles wat per soort verschilt staat hier:
// hoe een som als sleutel wordt geschreven, hoe hij wordt uitgerekend, welke
// som zijn "omkering" is, de startinschatting en het teken op het scherm.
//
// Nu alleen KEER (de tafels). Een nieuw soort (bijv. DEEL: "42:6") komt hier
// bij, met een eigen scheidingsteken in de sleutel. Zo blijven bestaande
// sleutels ("7x8") en alle opgeslagen voortgang precies hetzelfde.
//
// Regels voor een soort:
//   id       korte naam (opslag/database), bijv. 'mul'
//   sep      scheidingsteken in de sleutel ('x' → "7x8")
//   symbol   teken op het scherm ('×')
//   label    naam in menu's ('TAFELS')
//   key(a,b) / parse(key) → { a, b, answer }
//   reverse(key)          gekoppelde som (7x8 ↔ 8x7) of null
//   prior(key)            startinschatting 0..1 voor een nog nooit geoefende som
//   table(t)              alle sommen van "tafel t" voor dit soort
//   pattern(key)          { x, y, result } voor de reeks-/herhalingsregels
//   related(key)          som van een ánder soort die "hetzelfde feit" is (of null)
//   grid(row, col)        vakje op de tafelkaart → { key, answer }
//   cellText(key)         getal in het vakje op de tafelkaart
//   perTable              aantal sommen per tafel (voor "GOUD VAN …")
// ---------------------------------------------------------------------------

export const MIN_FACTOR = 1;
export const MAX_FACTOR = 10;

const MUL = {
  id: 'mul',
  sep: 'x',
  symbol: '×',
  label: 'TAFELS',
  key: (a, b) => `${a}x${b}`,
  parse(key) {
    const i = key.indexOf('x');
    const a = +key.slice(0, i), b = +key.slice(i + 1);
    return { a, b, answer: a * b };
  },
  reverse(key) {
    const { a, b } = MUL.parse(key);
    return MUL.key(b, a);
  },
  /** ×1 en ×10 zijn makkelijk, ×2/×5 redelijk, 6/7/8/9 onderling het lastigst. */
  prior(key) {
    const { a, b } = MUL.parse(key);
    const f = [a, b];
    if (f.includes(1)) return 0.62;
    if (f.includes(10)) return 0.55;
    if (f.includes(2)) return 0.45;
    if (f.includes(5)) return 0.42;
    if (a === b) return 0.36;
    const hard = f.filter(x => x >= 6).length;
    if (hard === 2) return 0.2;
    if (f.includes(3) || f.includes(4)) return 0.32;
    return 0.26;
  },
  /** Beide volgordes (k×t en t×k), zonder dubbele kwadraten. */
  table(t) {
    const out = new Set();
    for (let k = MIN_FACTOR; k <= MAX_FACTOR; k++) {
      out.add(MUL.key(k, t));
      out.add(MUL.key(t, k));
    }
    return [...out];
  },
  pattern(key) { const { a, b } = MUL.parse(key); return { x: a, y: b, result: a * b }; },
  related: () => null,
  grid: (row, col) => ({ key: MUL.key(row, col), answer: row * col }),
  cellText: key => MUL.parse(key).answer,
  perTable: 19,
};

// DEELTAFELS: "56:8" = 56 gedeeld door 8. De deeltafel van t = t, 2t … 10t gedeeld
// door t; het antwoord is altijd 1 t/m 10. Op de tafelkaart: rij = deler (de tafel),
// kolom = het antwoord, in het vakje het getal dat je deelt.
const DIV = {
  id: 'div',
  sep: ':',
  symbol: ':',
  label: 'DEELTAFELS',
  key: (a, b) => `${a}:${b}`,
  parse(key) {
    const i = key.indexOf(':');
    const a = +key.slice(0, i), b = +key.slice(i + 1);
    return { a, b, answer: a / b };
  },
  /** 56:8 ↔ 56:7 (allebei uit 7 × 8). */
  reverse(key) {
    const { a, answer } = DIV.parse(key);
    return DIV.key(a, answer);
  },
  /** Iets lastiger dan de bijbehorende keersom. */
  prior(key) {
    return Math.max(0.15, MUL.prior(DIV.related(key)) - 0.06);
  },
  table(t) {
    const out = [];
    for (let k = MIN_FACTOR; k <= MAX_FACTOR; k++) out.push(DIV.key(t * k, t));
    return out;
  },
  pattern(key) { const { b, answer } = DIV.parse(key); return { x: answer, y: b, result: answer }; },
  /** 56:8 hoort bij 7 × 8. */
  related(key) { const { b, answer } = DIV.parse(key); return MUL.key(answer, b); },
  grid: (row, col) => ({ key: DIV.key(row * col, row), answer: col }),
  cellText: key => DIV.parse(key).a,
  perTable: 10,
};

export const OPERATIONS = { mul: MUL, div: DIV };
export const OPERATION_ORDER = ['mul', 'div'];
export const DEFAULT_OPERATION = 'mul';

/** Bij welk soort hoort deze sleutel? (onbekend → keer, zoals altijd) */
export function opOfKey(key) {
  for (const id of OPERATION_ORDER) if (id !== 'mul' && String(key).includes(OPERATIONS[id].sep)) return OPERATIONS[id];
  return MUL;
}

export function getOperation(id) {
  return OPERATIONS[id] || MUL;
}
