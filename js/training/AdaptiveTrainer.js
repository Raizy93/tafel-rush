// ---------------------------------------------------------------------------
// AdaptiveTrainer – het mastery-model per tafelsom.
//
// Iedere som (bijv. "6x7") heeft een record in het profiel:
//   seen, correct, wrong        aantallen
//   avgRt                       gemiddelde reactietijd van GOEDE antwoorden (EMA, ms)
//   recentRts                   laatste 5 reactietijden (goed beantwoord)
//   recent                      laatste 8 uitkomsten als string, bijv. "11011101"
//   lastSeen, lastWrong         tijdstempels (ms)
//   streak                      aantal keer goed op rij
//   mastery                     0..1 – hoe geautomatiseerd is deze som?
//
// Mastery beweegt naar een "kwaliteit" toe die afhangt van goed/fout ÉN snelheid.
// Een langzaam goed antwoord is nooit fout, maar telt minder als automatisering.
// Het omgekeerde feit (7x6) krijgt een zwakkere update mee: beheersing van de ene
// zegt iets, maar niet alles, over de andere.
//
// Deze klasse weet niets van localStorage: hij krijgt een "store" met
// get(key)/set(key, rec)/entries() (zie ProfileService).
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { priorMastery, reverseKey, opIdOf } from './facts.js';
import { applyMapAnswer } from './MasteryMap.js';

export const TIERS = ['perfect', 'fast', 'good', 'slow'];

/** Reactietijd → tier. */
export function speedTier(rtMs, tiers = CONFIG.answer.tiers) {
  if (rtMs < tiers.perfect) return 'perfect';
  if (rtMs < tiers.fast) return 'fast';
  if (rtMs < tiers.good) return 'good';
  return 'slow';
}

/** Hoe "geautomatiseerd" was dit goede antwoord (0..1)? */
export function speedQuality(rtMs) {
  const t = speedTier(rtMs);
  if (t === 'perfect') return 1;
  if (t === 'fast') return 0.86;
  if (t === 'good') return 0.66;
  return rtMs < 9000 ? 0.5 : 0.4;
}

export function newRecord() {
  return { seen: 0, correct: 0, wrong: 0, avgRt: 0, recentRts: [], recent: '', lastSeen: 0, lastWrong: 0, streak: 0, mastery: null };
}

export class AdaptiveTrainer {
  /** @param store {{get(k):object|undefined, set(k,rec):void, entries():Array}} */
  constructor(store) {
    this.store = store;
  }

  record(key) {
    return this.store.get(key);
  }

  /** Mastery zoals het systeem die nu inschat – ook voor nooit geziene sommen. */
  mastery(key) {
    const r = this.store.get(key);
    if (r && r.mastery != null) return r.mastery;
    const rev = this.store.get(reverseKey(key));
    const prior = priorMastery(key);
    if (rev && rev.mastery != null) return Math.max(prior, rev.mastery * 0.75);
    return prior;
  }

  /**
   * "Oefenbehoefte" van een som: hoe hoger, hoe vaker hij gekozen wordt.
   * Ook beheerste sommen houden een kleine kans (succeservaring/onderhoud).
   */
  need(key) {
    const m = this.mastery(key);
    const r = this.store.get(key);
    let n = 0.14 + Math.pow(1 - m, 1.6) * 1.7;
    if (!r || r.seen < 2) n += 0.3; // verkennen: weinig data
    if (r && r.lastWrong && r.recent.slice(-3).includes('0')) n += 0.3; // recent fout
    return n;
  }

  /**
   * Verwerk een antwoord. Retourneert { tier, quality }.
   * @param {string} key
   * @param {{correct:boolean, rtMs:number, now?:number}} res
   */
  recordAnswer(key, { correct, rtMs, now = Date.now() }) {
    const rec = { ...newRecord(), ...(this.store.get(key) || {}) };
    rec.recentRts = [...(rec.recentRts || [])];
    const before = rec.mastery == null ? this.mastery(key) : rec.mastery;
    rec.seen++;
    // tafelkaart-niveau (langzame, dag-gebonden progressie) – vóór lastSeen bijwerken
    const map = applyMapAnswer(rec, { correct, rtMs, now, prevSeen: rec.lastSeen });
    rec.lastSeen = now;
    rec.recent = ((rec.recent || '') + (correct ? '1' : '0')).slice(-8);

    let tier = null, quality = 0;
    if (correct) {
      tier = speedTier(rtMs);
      quality = speedQuality(rtMs);
      rec.correct++;
      rec.streak++;
      rec.avgRt = rec.avgRt ? Math.round(rec.avgRt * 0.7 + rtMs * 0.3) : Math.round(rtMs);
      rec.recentRts.push(Math.round(rtMs));
      if (rec.recentRts.length > 5) rec.recentRts.shift();
      // omhoog sneller dan omlaag: een traag goed antwoord kost weinig
      const alpha = quality > before ? 0.34 : 0.14;
      rec.mastery = before + (quality - before) * alpha;
    } else {
      rec.wrong++;
      rec.streak = 0;
      rec.lastWrong = now;
      rec.mastery = before * 0.58;
    }
    rec.mastery = clamp01(rec.mastery);
    this.store.set(key, rec);

    // gekoppelde update van het omgekeerde feit (zwakker)
    const rk = reverseKey(key);
    if (rk !== key) {
      const rr = this.store.get(rk);
      const rb = rr && rr.mastery != null ? rr.mastery : this.mastery(rk);
      const target = correct ? quality : 0;
      const next = clamp01(rb + (target - rb) * (correct ? 0.1 : 0.12));
      this.store.set(rk, { ...newRecord(), ...(rr || {}), mastery: next });
    }
    return { tier, quality, mastery: rec.mastery, mapBefore: map.before, mapAfter: map.after };
  }

  /** Sommen met de meeste oefenbehoefte op basis van echte data.
   *  op = alleen dit soort som ('mul' …); null = alle soorten. */
  hardestFacts(limit = 12, minSeen = 2, op = null) {
    return this.store.entries()
      .filter(([k, r]) => r.seen >= minSeen && r.mastery != null && (!op || opIdOf(k) === op))
      .map(([k, r]) => ({ key: k, score: (1 - r.mastery) + (r.wrong / Math.max(1, r.seen)) * 0.5 + Math.min(0.4, (r.avgRt || 0) / 20000) }))
      .filter(x => x.score > 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.key);
  }

  strongFacts(pool) {
    return pool.filter(k => {
      const r = this.store.get(k);
      return r && r.seen >= 2 && this.mastery(k) >= 0.78;
    });
  }

  /** Is "Mijn moeilijke sommen" zinvol? (genoeg data + genoeg zwakke sommen) */
  hardModeStatus(minAnswers = 40, minFacts = 4, op = null) {
    let total = 0;
    for (const [k, r] of this.store.entries()) if (!op || opIdOf(k) === op) total += r.seen || 0;
    const hard = this.hardestFacts(15, 2, op);
    return { available: total >= minAnswers && hard.length >= minFacts, totalAnswers: total, hardCount: hard.length, needAnswers: Math.max(0, minAnswers - total) };
  }
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
