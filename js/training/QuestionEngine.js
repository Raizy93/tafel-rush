// ---------------------------------------------------------------------------
// QuestionEngine – kiest de volgende som binnen een run.
//
// Combineert:
//   • gewogen kans op basis van oefenbehoefte (AdaptiveTrainer.need)
//   • gespreide herhaling: een fout beantwoorde som komt na 3-5 andere sommen
//     terug, en daarna nog eens na 7-12 sommen (expanding retrieval)
//   • harde regel: nooit dezelfde som binnen de laatste paar vragen
//   • patroonvermijding: geen 2×3, 2×4, 2×5 … reeksen; in mix-modus ook
//     geen clusters van dezelfde tafel
//   • af en toe een sterke som voor succeservaring
//
// De engine is puur: geen DOM, geen opslag. Daardoor testbaar in Node.
// ---------------------------------------------------------------------------
import { parseKey, reverseKey, symbolOf, opIdOf, patternOf } from './facts.js';

export class QuestionEngine {
  /**
   * @param {object} o
   * @param {import('./AdaptiveTrainer.js').AdaptiveTrainer} o.trainer
   * @param {string[]} o.pool        sleutels die mogen voorkomen
   * @param {string} [o.mode]        'training' | 'mix' | 'power' | 'hard'
   * @param {number[]} [o.tables]    gekozen tafels (voor patroonregels)
   * @param {string[]} [o.successPool] sterke sommen buiten de pool (hard-modus)
   * @param {() => number} [o.rng]
   */
  constructor({ trainer, pool, mode = 'mix', tables = [], successPool = null, rng = Math.random }) {
    if (!pool || pool.length === 0) throw new Error('QuestionEngine: lege pool');
    this.trainer = trainer;
    this.pool = [...new Set(pool)];
    this.mode = mode;
    this.tables = tables;
    this.successPool = successPool;
    this.rng = rng;
    this.q = 0;               // aantal gestelde vragen
    this.history = [];        // laatst gestelde sleutels
    this.due = new Map();     // key → { at, stage }
    this.fails = new Map();   // key → aantal fouten deze sessie
    this.lastDueQ = -99;      // wanneer de laatste herhaling gesteld werd
    this.current = null;
    this.successRate = mode === 'hard' ? 0.16 : 0.1;
  }

  /** Minimale afstand voordat exact dezelfde som terug mag komen. */
  get gap() {
    const n = this.pool.length;
    if (n <= 2) return 1;
    return Math.min(4, Math.max(1, Math.floor(n / 3)));
  }

  recentlyAsked(key, within) {
    const h = this.history;
    for (let i = h.length - 1, k = 0; i >= 0 && k < within; i--, k++) if (h[i] === key) return true;
    return false;
  }

  /** Kies en retourneer de volgende vraag. */
  next() {
    const key = this.pick();
    this.q++;
    this.history.push(key);
    if (this.history.length > 20) this.history.shift();
    const { a, b, answer } = parseKey(key);
    this.current = { key, a, b, answer, op: opIdOf(key), symbol: symbolOf(key), index: this.q };
    return this.current;
  }

  pick() {
    const gap = this.gap;
    const allowed = this.pool.filter(k => !this.recentlyAsked(k, gap));
    const cands = allowed.length ? allowed : this.pool.filter(k => k !== this.history[this.history.length - 1]);
    const list = cands.length ? cands : this.pool;

    // 1) Gespreide herhaling: achterstallige sommen eerst (meest achterstallig)
    let best = null;
    for (const [k, d] of this.due) {
      if (d.at > this.q) continue;
      if (this.recentlyAsked(k, Math.min(gap, 2))) continue;
      if (!best || d.at < best.at) best = { key: k, at: d.at };
    }
    // max. één op de drie vragen is een herhaling, zodat zwakke sommen niet overheersen
    if (best && this.q - this.lastDueQ >= 3 && this.rng() < 0.92) {
      this.lastDueQ = this.q;
      return best.key;
    }

    // 2) Succes-moment: soms bewust een sterke som
    if (this.rng() < this.successRate) {
      const src = this.successPool && this.successPool.length ? this.successPool : this.pool;
      const strong = this.trainer.strongFacts(src).filter(k => !this.recentlyAsked(k, Math.max(gap, 3)));
      if (strong.length) return strong[Math.floor(this.rng() * strong.length)];
    }

    // 3) Gewogen trekking op oefenbehoefte × patroonregels
    const weights = list.map(k => this.trainer.need(k) * this.patternFactor(k));
    return weightedPick(list, weights, this.rng);
  }

  /** Strafdempers voor voorspelbare reeksen. */
  patternFactor(key) {
    const h = this.history;
    if (!h.length) return 1;
    // x/y = de twee "factoren", result = het antwoord dat herhaling voelt
    // (keer: 7×8 → 7, 8, 56 · deel: 56:8 → 7, 8, 7)
    const { x: a, y: b, result } = patternOf(key);
    const prev = patternOf(h[h.length - 1]);
    let f = 1;

    // omgekeerde som van de vorige vraag: liever niet direct erna
    if (reverseKey(key) === h[h.length - 1]) f *= 0.2;
    else if (h.length > 1 && reverseKey(key) === h[h.length - 2]) f *= 0.5;

    // opeenvolgende reeks: zelfde factor + andere factor ±1 (2×3 → 2×4)
    const shared = sharedFactor([a, b], [prev.x, prev.y]);
    if (shared != null) {
      const other = a === shared ? b : a;
      const prevOther = prev.x === shared ? prev.y : prev.x;
      if (Math.abs(other - prevOther) === 1) f *= 0.15;
      // in mix/power: niet steeds dezelfde tafel
      if (this.mode !== 'training' && shared !== 1 && shared !== 10) {
        f *= 0.55;
        if (h.length > 1) {
          const pp = patternOf(h[h.length - 2]);
          if (pp.x === shared || pp.y === shared) f *= 0.4;
        }
      }
    }
    // zelfde antwoord als vorige vraag (bijv. 3×8 na 4×6) voelt als herhaling
    if (result === prev.result) f *= 0.35;
    return f;
  }

  /**
   * Verwerk het antwoord op de huidige vraag.
   * @returns {{correct:boolean, tier:string|null, key:string, answer:number, given:number, rtMs:number}}
   */
  submit(given, rtMs, now = Date.now()) {
    const cur = this.current;
    if (!cur) throw new Error('QuestionEngine: geen actieve vraag');
    const correct = given === cur.answer;
    const res = this.trainer.recordAnswer(cur.key, { correct, rtMs, now });
    this.schedule(cur.key, correct, res.tier);
    return {
      correct, tier: res.tier, key: cur.key, answer: cur.answer, given, rtMs, a: cur.a, b: cur.b,
      mapUp: res.mapAfter > res.mapBefore && res.mapBefore > 0,   // stapje hoger op de tafelkaart
      newGold: res.mapAfter >= 4 && res.mapBefore < 4,
    };
  }

  /** Spaced repetition binnen de sessie. */
  schedule(key, correct, tier) {
    const d = this.due.get(key);
    const rint = (lo, hi) => lo + Math.floor(this.rng() * (hi - lo + 1));
    if (!correct) {
      // bij herhaalde fouten iets meer lucht: 3-5, daarna 5-7, 7-9 … (max 11)
      const fails = (this.fails.get(key) || 0) + 1;
      this.fails.set(key, fails);
      const extra = Math.min(6, (fails - 1) * 2);
      this.due.set(key, { at: this.q + rint(3, 5) + extra, stage: 1 });
      // het omgekeerde feit ook een keer laten terugkomen (later)
      const rk = reverseKey(key);
      if (rk !== key && this.pool.includes(rk) && !this.due.has(rk)) this.due.set(rk, { at: this.q + rint(6, 9), stage: 2 });
      return;
    }
    if (d) {
      if (d.stage === 1) this.due.set(key, { at: this.q + rint(7, 12), stage: 2 });
      else this.due.delete(key);
      return;
    }
    // goed maar traag: nog één keer controleren, later in de run
    if (tier === 'slow') this.due.set(key, { at: this.q + rint(6, 10), stage: 2 });
  }
}

function sharedFactor(x, y) {
  for (const v of x) if (y.includes(v)) return v;
  return null;
}

export function weightedPick(items, weights, rng = Math.random) {
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
