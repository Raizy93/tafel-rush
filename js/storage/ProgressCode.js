// ---------------------------------------------------------------------------
// ProgressCode – voortgang meenemen naar een ander apparaat, ZONDER server of
// database: de code ís de voortgang (compact ingepakt + gecomprimeerd).
//
//   const code = await ProgressCode.make(profileObject)   // "TR1.…"
//   const url  = ProgressCode.link(code)                   // https://…/#voortgang=TR1.…
//   const p    = await ProgressCode.read(codeOfLink)       // profielobject (of fout)
//
// Er gaan geen persoonsgegevens in (het profiel bevat die niet): sommen,
// scores, coins, pets, werelden en een willekeurig profielnummer. In de link
// staat de code achter het #-teken; dat deel stuurt een browser nooit naar
// een server, dus ook de website ziet hem niet.
//
// Compact formaat (om in een QR-code te passen):
//   • mastery: per som (1×1 … 10×10, vaste volgorde) één regel getallen
//   • tijden als minuten/dagen geleden t.o.v. het moment van inpakken
//   • geschiedenis van runs en de lijst met reactietijden gaan niet mee
// Puur JS (CompressionStream: moderne browsers én Node 18+) → testbaar.
// ---------------------------------------------------------------------------
import { factKey, MIN_FACTOR, MAX_FACTOR } from '../training/facts.js';
import { migrateProfile, createDefaultProfile } from './profileSchema.js';

const PREFIX = 'TR1.';
const FACTS = [];
for (let a = MIN_FACTOR; a <= MAX_FACTOR; a++) for (let b = MIN_FACTOR; b <= MAX_FACTOR; b++) FACTS.push(factKey(a, b));

const DAY = 864e5, MIN = 6e4;
const dayNum = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
const dayStr = n => { const d = new Date(n * DAY); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); };

// --- mastery-records ↔ getallen -----------------------------------------------------------
function packRecord(r, nowMin, today) {
  const ago = t => (t ? Math.max(0, nowMin - Math.round(t / MIN)) : -1);
  const dAgo = s => { const n = dayNum(s); return n == null ? -1 : today - n; };
  const m = r.map || {};
  return [
    r.seen | 0, r.wrong | 0, (r.correct | 0) - Math.max(0, (r.seen | 0) - (r.wrong | 0)), // correct (meestal 0 = seen - wrong)
    Math.round((r.avgRt || 0) / 100),                      // reactietijd in stapjes van 0,1 s
    r.recent ? parseInt('1' + r.recent, 2) : 0,            // laatste antwoorden (bits)
    ago(r.lastSeen), ago(r.lastWrong), r.streak | 0,
    r.mastery == null ? -1 : Math.round(r.mastery * 100),
    m.level | 0, dAgo(m.upDay), dAgo(m.downDay), dAgo(m.wrongDay),
  ].map(n => (n === 0 ? '' : String(n))).join(',').replace(/,+$/, '');
}

function unpackRecord(line, nowMin, today) {
  const v = line.split(',').map(s => (s === '' ? 0 : Number(s)));
  while (v.length < 13) v.push(0);
  if (v.some(n => !Number.isFinite(n))) throw new Error('ongeldige som');
  const [seen, wrong, corrDelta, rt, recentBits, seenAgo, wrongAgo, streak, mastery, level, up, down, wday] = v;
  const at = ago => (ago < 0 ? 0 : (nowMin - ago) * MIN);
  const day = ago => (ago < 0 ? null : dayStr(today - ago));
  const recent = recentBits > 1 ? recentBits.toString(2).slice(1) : '';
  const rec = {
    seen: Math.max(0, seen), correct: Math.max(0, seen - wrong + corrDelta), wrong: Math.max(0, wrong),
    avgRt: Math.max(0, rt * 100), recentRts: [], recent, lastSeen: at(seenAgo), lastWrong: at(wrongAgo),
    streak: Math.max(0, streak), mastery: mastery < 0 ? null : Math.min(1, Math.max(0, mastery / 100)),
  };
  if (level > 0 || up >= 0) rec.map = { level: Math.min(4, Math.max(0, level)), upDay: day(up), downDay: day(down), wrongDay: day(wday) };
  return rec;
}

/** Alleen wat afwijkt van een nieuw profiel (de rest vult migrateProfile weer aan). */
function diff(val, def) {
  if (val && typeof val === 'object' && !Array.isArray(val) && def && typeof def === 'object' && !Array.isArray(def)) {
    const out = {};
    for (const [k, v] of Object.entries(val)) { const d = diff(v, def[k]); if (d !== undefined) out[k] = d; }
    return Object.keys(out).length ? out : undefined;
  }
  return JSON.stringify(val) === JSON.stringify(def) ? undefined : val;
}

// --- profiel ↔ compact object ---------------------------------------------------------------
export function packProfile(p, now = Date.now()) {
  const nowMin = Math.round(now / MIN), today = Math.round(new Date(now).setUTCHours(0, 0, 0, 0) / DAY);
  const { mastery = {}, history, ...rest } = p;
  const lines = FACTS.map(k => (mastery[k] && mastery[k].seen ? packRecord(mastery[k], nowMin, today) : ''));
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  const extra = Object.fromEntries(Object.entries(mastery).filter(([k]) => !FACTS.includes(k)));
  const def = createDefaultProfile(0);
  const slim = diff({ ...rest, meta: undefined }, { ...def, mastery: undefined, history: undefined, meta: undefined }) || {};
  slim.version = rest.version;
  slim.meta = { profileId: rest.meta && rest.meta.profileId, createdAt: rest.meta && rest.meta.createdAt };
  return { t: nowMin, d: today, m: lines.join(';'), x: Object.keys(extra).length ? extra : undefined, p: slim };
}

export function unpackProfile(o) {
  if (!o || typeof o !== 'object' || typeof o.p !== 'object' || typeof o.m !== 'string') throw new Error('geen voortgangscode');
  const mastery = {};
  o.m.split(';').forEach((line, i) => { if (line && FACTS[i]) mastery[FACTS[i]] = unpackRecord(line, o.t, o.d); });
  if (o.x && typeof o.x === 'object') Object.assign(mastery, o.x);
  const p = { ...o.p, mastery, history: [] };
  if (typeof p.version !== 'number') throw new Error('geen versie');
  return migrateProfile(p); // oudere codes werken ook na een update van de game
}

// --- compressie + base64url ----------------------------------------------------------------
async function deflate(str) {
  const cs = new CompressionStream('deflate-raw');
  const bytes = new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(cs)).arrayBuffer());
  return bytes;
}
async function inflate(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  return await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
}
const toB64url = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64url = s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };

export const ProgressCode = {
  PREFIX,
  async make(profile, now = Date.now()) {
    return PREFIX + toB64url(await deflate(JSON.stringify(packProfile(profile, now))));
  },
  /** Volledige link (voor de QR-code): opent de game en biedt de voortgang aan. */
  link(code, base = (typeof location !== 'undefined' ? location.origin + location.pathname : '')) {
    return base + '#voortgang=' + code;
  },
  /** Haal de code uit een geplakte tekst of link (spaties/regels mogen erin staan). */
  extract(text) {
    const s = String(text || '').replace(/\s+/g, '');
    const i = s.indexOf(PREFIX);
    return i < 0 ? null : s.slice(i).replace(/[^A-Za-z0-9._-].*$/, '');
  },
  /** Code (of link) → profielobject. Gooit een fout bij een ongeldige code. */
  async read(text) {
    const code = this.extract(text);
    if (!code) throw new Error('geen code');
    const json = await inflate(fromB64url(code.slice(PREFIX.length)));
    return unpackProfile(JSON.parse(json));
  },
  /** Korte samenvatting om te tonen vóór het overschrijven. */
  summary(p) {
    const m = Object.values(p.mastery || {});
    return {
      coins: (p.currency && p.currency.coins) || 0,
      pets: ((p.unlocks && p.unlocks.owned && p.unlocks.owned.pets) || []).length,
      gold: m.filter(r => r.map && r.map.level >= 4).length,
      practiced: m.filter(r => r.seen > 0).length,
      runs: (p.stats && p.stats.runs) || 0,
    };
  },
};
