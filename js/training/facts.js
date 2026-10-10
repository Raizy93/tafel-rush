// ---------------------------------------------------------------------------
// Tafelfeiten: sleutels, omkeringen, startinschatting en oefenpools.
// Een "feit" is een geordende som: 6×7 en 7×6 zijn twee verschillende
// feiten (beide vormen komen voor), maar ze zijn wel aan elkaar gekoppeld.
// ---------------------------------------------------------------------------

export const MIN_FACTOR = 1;
export const MAX_FACTOR = 10;
export const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const POWER_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export const factKey = (a, b) => `${a}x${b}`;

export function parseKey(key) {
  const i = key.indexOf('x');
  const a = +key.slice(0, i), b = +key.slice(i + 1);
  return { a, b, answer: a * b };
}

export const reverseKey = key => {
  const { a, b } = parseKey(key);
  return factKey(b, a);
};

/**
 * Didactische startinschatting voor een nog nooit geoefend feit (0..1).
 * ×1 en ×10 zijn makkelijk, ×2/×5 redelijk, 6/7/8/9 onderling het lastigst.
 */
export function priorMastery(key) {
  const { a, b } = parseKey(key);
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
}

/** Alle feiten van één tafel (beide volgordes, zonder dubbele kwadraten). */
export function factsForTable(t) {
  const out = new Set();
  for (let k = MIN_FACTOR; k <= MAX_FACTOR; k++) {
    out.add(factKey(k, t));
    out.add(factKey(t, k));
  }
  return [...out];
}

/** Pool voor een verzameling tafels. */
export function factsForTables(tables) {
  const out = new Set();
  for (const t of tables) for (const k of factsForTable(t)) out.add(k);
  return [...out];
}

export const formatFact = key => {
  const { a, b } = parseKey(key);
  return `${a} × ${b}`;
};
