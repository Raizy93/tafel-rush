// ---------------------------------------------------------------------------
// SessionStats – statistieken van één run (voor het resultaatscherm en de
// persoonlijke records). Houdt ook per som bij hoe het deze sessie ging.
// ---------------------------------------------------------------------------
import { formatFact } from './facts.js';

export class SessionStats {
  constructor() {
    this.answered = 0;
    this.correct = 0;
    this.wrong = 0;
    this.tiers = { perfect: 0, fast: 0, good: 0, slow: 0 };
    this.rtSum = 0;          // som van reactietijden van goede antwoorden
    this.bestCombo = 0;
    this.coins = 0;
    this.coinBonus = 0;       // power-up COINBONUS (zit al in coins)
    this.mapUps = new Set();  // sommen die vandaag een stap hoger kwamen op de tafelkaart
    this.newGolds = new Set();
    this.perFact = new Map(); // key → { asked, wrong, rts: [] }
    this.startedAt = Date.now();
    this.activeMs = 0;
    this.latencies = [];      // Enter → volgende som zichtbaar (ms), voor meting
  }

  add(res) {
    this.answered++;
    if (res.mapUp) this.mapUps.add(res.key);
    if (res.newGold) this.newGolds.add(res.key);
    const f = this.perFact.get(res.key) || { asked: 0, wrong: 0, rts: [] };
    f.asked++;
    if (res.correct) {
      this.correct++;
      this.tiers[res.tier]++;
      this.rtSum += res.rtMs;
      f.rts.push(res.rtMs);
    } else {
      this.wrong++;
      f.wrong++;
    }
    this.perFact.set(res.key, f);
  }

  get accuracy() { return this.answered ? this.correct / this.answered : 0; }
  get avgRt() { return this.correct ? this.rtSum / this.correct : 0; }

  /**
   * Maximaal `n` sommen die deze sessie het zwakst gingen. Combineert fouten en
   * trage antwoorden. Label is positief geformuleerd ("kan nog sneller").
   */
  hardestFacts(n = 5) {
    const list = [];
    for (const [key, f] of this.perFact) {
      const med = median(f.rts);
      const slowness = f.rts.length ? Math.max(0, (med - 2600) / 1600) : 0;
      const score = f.wrong * 2 + slowness;
      if (score < 0.45) continue;
      list.push({ key, label: formatFact(key), wrong: f.wrong, medianRt: med, reason: f.wrong ? 'oefen' : 'sneller', score });
    }
    return list.sort((a, b) => b.score - a.score).slice(0, n);
  }

  summary() {
    return {
      answered: this.answered,
      correct: this.correct,
      wrong: this.wrong,
      accuracy: this.accuracy,
      avgRt: this.avgRt,
      bestCombo: this.bestCombo,
      perfect: this.tiers.perfect,
      tiers: { ...this.tiers },
      coins: this.coins,
      coinBonus: this.coinBonus,
      mapUps: this.mapUps.size,
      newGolds: this.newGolds.size,
      durationMs: this.activeMs,
      hardest: this.hardestFacts(5),
    };
  }
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
