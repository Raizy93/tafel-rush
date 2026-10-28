// ---------------------------------------------------------------------------
// MasteryMap – de TAFELKAART: niveau per som, gericht op ONTHOUDEN.
//
// Bewust los van de snelle interne "mastery" (die gebruikt de QuestionEngine om
// sommen te kiezen). De kaart werkt als een Leitner-systeem:
//
//   niveau 0  grijs   nog niet geoefend
//   niveau 1  rood    net begonnen   (de eerste dag)
//   niveau 2  oranje  op weg
//   niveau 3  groen   goed
//   niveau 4  goud    razendsnel – geautomatiseerd
//   (goud dat 14 dagen niet geoefend is → "dof goud": even opfrissen)
//
// Regels:
//   • maximaal één stap OMHOOG per som per dag → goud kost minimaal 4 dagen
//   • omhoog alleen op een dag zonder fout met die som
//   • langzaam goed (≥ 3 s) brengt je hooguit tot groen; goud vraagt snelheid
//   • een fout kost één stap (maximaal één stap per dag), nooit onder rood
//   • dof goud + traag antwoord → terug naar groen; dof goud + snel goed → weer goud
// Puur JS (geen DOM) → testbaar in Node.
// ---------------------------------------------------------------------------
import { factsForTable, MIN_FACTOR, MAX_FACTOR } from './facts.js';
import { getOperation } from './operations.js';

export const MAP_RULES = {
  goldLevel: 4,          // = minimaal 4 verschillende dagen
  fastMs: 3000,          // "snel" voor de kaart
  slowCap: 3,            // traag goed: maximaal groen
  fadeDays: 14,          // goud zonder oefenen → dof goud
};
const DAY_MS = 24 * 60 * 60 * 1000;

export const LEVELS = [
  { id: 'gold', label: 'RAZENDSNEL', color: '#d8a01e', light: '#ffd84a', text: '#3a2008' },
  { id: 'faded', label: 'EVEN OPFRISSEN', color: '#7a6a3e', light: '#a8945a', text: '#1e1808' },
  { id: 'good', label: 'GOED', color: '#3a9a46', light: '#5fd65a', text: '#0c2a10' },
  { id: 'almost', label: 'OP WEG', color: '#d87a22', light: '#f0a040', text: '#2a1408' },
  { id: 'hard', label: 'NET BEGONNEN', color: '#c23a3a', light: '#e85a50', text: '#fff0e8' },
  { id: 'new', label: 'NOG NIET GEOEFEND', color: '#4a4462', light: '#5e5878', text: '#a8a0c8' },
];
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map(l => [l.id, l]));
const ID_BY_LEVEL = ['new', 'hard', 'almost', 'good', 'gold'];

/** Lokale kalenderdag, bijv. "2026-10-10". */
export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Verwerk één antwoord in het kaart-niveau van een mastery-record.
 * Wordt aangeroepen door AdaptiveTrainer.recordAnswer, VÓÓR lastSeen wordt bijgewerkt.
 * @returns {{ before:number, after:number }}
 */
export function applyMapAnswer(rec, { correct, rtMs, now, prevSeen }, R = MAP_RULES) {
  const m = rec.map || (rec.map = { level: 0, upDay: null, downDay: null, wrongDay: null });
  const day = dayKey(now);
  const before = m.level;
  if (m.level === 0) {
    // eerste kennismaking: rood, en vandaag nog geen extra stap
    m.level = 1;
    m.upDay = day;
    if (!correct) m.wrongDay = day;
    return { before, after: m.level };
  }
  if (!correct) {
    m.wrongDay = day;
    if (m.downDay !== day) { m.level = Math.max(1, m.level - 1); m.downDay = day; }
    return { before, after: m.level };
  }
  const fast = rtMs < R.fastMs;
  const faded = m.level >= R.goldLevel && prevSeen && now - prevSeen > R.fadeDays * DAY_MS;
  if (faded && !fast) m.level = R.slowCap;                      // dof goud, maar traag → groen
  else if (m.level < R.goldLevel && m.upDay !== day && m.wrongDay !== day && (fast || m.level < R.slowCap)) {
    m.level++;
    m.upDay = day;
  }
  return { before, after: m.level };
}

/** Kaart-niveau (id) van één record. */
export function levelFor(rec, now = Date.now(), R = MAP_RULES) {
  if (!rec || !rec.seen) return 'new';
  const lvl = rec.map ? rec.map.level : 1;
  if (lvl >= R.goldLevel) return now - (rec.lastSeen || now) > R.fadeDays * DAY_MS ? 'faded' : 'gold';
  return ID_BY_LEVEL[Math.max(1, lvl)];
}

/** Aantal stappen (dagen) tot goud. */
export function stepsToGold(rec, R = MAP_RULES) {
  const lvl = rec && rec.map ? rec.map.level : 0;
  return Math.max(0, R.goldLevel - lvl);
}

/**
 * Bouw de kaart. store = { get(key) } (bijv. profile.masteryStore).
 * op = soort som ('mul' = keertafels, 'div' = deeltafels). Vakje: a = rij, b = kolom.
 * @returns {{ cells, counts, tables }}
 */
export function buildMasteryMap(store, now = Date.now(), op = 'mul') {
  const O = getOperation(op);
  const today = dayKey(now);
  const cells = [];
  const counts = { new: 0, hard: 0, almost: 0, good: 0, gold: 0, faded: 0 };
  for (let a = MIN_FACTOR; a <= MAX_FACTOR; a++) {
    for (let b = MIN_FACTOR; b <= MAX_FACTOR; b++) {
      const { key, answer } = O.grid(a, b);
      const rec = store.get(key);
      const level = levelFor(rec, now);
      counts[level]++;
      const upToday = !!(rec && rec.map && rec.map.upDay === today && rec.map.level >= 2);
      cells.push({ a, b, key, answer, level, rec, upToday });
    }
  }
  // per tafel: hoeveel van de 19 sommen (k×T en T×k) zijn goud / geoefend
  const tables = {};
  for (let t = MIN_FACTOR; t <= MAX_FACTOR; t++) {
    const keys = factsForTable(t, op);
    const lv = keys.map(k => levelFor(store.get(k), now));
    tables[t] = {
      total: keys.length,
      gold: lv.filter(l => l === 'gold').length,
      practiced: lv.filter(l => l !== 'new').length,
      master: lv.every(l => l === 'gold'),
    };
  }
  return { cells, counts, tables };
}
