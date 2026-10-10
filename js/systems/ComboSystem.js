// ---------------------------------------------------------------------------
// ComboSystem – telt goede antwoorden op rij en bepaalt de combo-tier.
//   tier 0: normaal · 1: COMBO ×5 · 2: SPEED UP · 3: ON FIRE · 4: ULTRA MODE
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';

export class ComboSystem {
  constructor(tiers = CONFIG.combo.tiers) {
    this.tiers = tiers;
    this.reset();
  }
  reset() {
    this.count = 0;
    this.best = 0;
    this.tier = 0;
  }
  tierFor(count) {
    let t = 0;
    this.tiers.forEach((d, i) => { if (count >= d.at) t = i; });
    return t;
  }
  get coinMult() { return this.tiers[this.tier].coinMult || 1; }
  /** Volgende drempel (voor de combo-meter), of null bij max tier. */
  get nextAt() { const n = this.tiers[this.tier + 1]; return n ? n.at : null; }
  get prevAt() { return this.tiers[this.tier].at; }

  /** Goed antwoord. Retourneert { tierUp, milestone } voor feedback. */
  hit() {
    this.count++;
    this.best = Math.max(this.best, this.count);
    const nt = this.tierFor(this.count);
    const tierUp = nt > this.tier ? nt : null;
    this.tier = nt;
    const every = CONFIG.combo.milestoneEvery;
    const maxAt = this.tiers[this.tiers.length - 1].at;
    const milestone = !tierUp && this.count > maxAt && this.count % every === 0 ? this.count : null;
    return { tierUp, milestone, count: this.count };
  }
  /** Fout antwoord: combo breekt. Retourneert de verloren combo. */
  break() {
    const lost = this.count;
    this.count = 0;
    this.tier = 0;
    return lost;
  }
}
