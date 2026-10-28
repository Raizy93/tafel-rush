// ---------------------------------------------------------------------------
// Tafelfeiten: sleutels, omkeringen, startinschatting en oefenpools.
// Een "feit" is een geordende som: 6×7 en 7×6 zijn twee verschillende
// feiten (beide vormen komen voor), maar ze zijn wel aan elkaar gekoppeld.
//
// Wat per soort som verschilt (keer, later deel …) staat in operations.js;
// deze functies kijken aan de sleutel welk soort het is. Zonder soort erbij
// werken ze zoals altijd met de keertafels.
// ---------------------------------------------------------------------------
import { OPERATIONS, opOfKey, getOperation, MIN_FACTOR, MAX_FACTOR } from './operations.js';

export { MIN_FACTOR, MAX_FACTOR };
export const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const POWER_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Sleutel van een keersom ("7x8"). */
export const factKey = (a, b) => OPERATIONS.mul.key(a, b);

/** Sleutel → { a, b, answer } (voor elk soort som). */
export const parseKey = key => opOfKey(key).parse(key);

/** De gekoppelde som (7x8 ↔ 8x7). */
export const reverseKey = key => opOfKey(key).reverse(key);

/** Didactische startinschatting voor een nog nooit geoefend feit (0..1). */
export const priorMastery = key => opOfKey(key).prior(key);

/** Het teken van de som op het scherm (× …). */
export const symbolOf = key => opOfKey(key).symbol;

/** Bij welk soort som hoort deze sleutel ('mul' …). */
export const opIdOf = key => opOfKey(key).id;

/** { x, y, result } voor de reeks-/herhalingsregels van de vraagkeuze. */
export const patternOf = key => opOfKey(key).pattern(key);

/** Som van een ander soort die hetzelfde feit is (56:8 → 7x8), of null. */
export const relatedKey = key => opOfKey(key).related(key);

/** Alle feiten van één tafel (beide volgordes, zonder dubbele kwadraten). */
export function factsForTable(t, op = 'mul') {
  return getOperation(op).table(t);
}

/** Pool voor een verzameling tafels. */
export function factsForTables(tables, op = 'mul') {
  const out = new Set();
  for (const t of tables) for (const k of factsForTable(t, op)) out.add(k);
  return [...out];
}

export const formatFact = key => {
  const { a, b } = parseKey(key);
  return `${a} ${symbolOf(key)} ${b}`;
};
