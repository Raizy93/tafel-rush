// ---------------------------------------------------------------------------
// Progression – voortgang door de wereld (0..100) en de fases/biomen.
// Voortgang groeit met de tijd én met goede antwoorden, zodat een run voor
// vrijwel iedere leerling 3-5 minuten duurt en snelle rekenaars in die tijd
// veel meer sommen maken. Bij 100 begint de bossfight.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';

export class Progression {
  constructor(cfg = CONFIG.run) {
    this.cfg = cfg;
    this.reset();
  }
  reset() {
    this.progress = 0;
    this.phase = 0;
    this.bossTriggered = false;
  }
  get phases() { return this.cfg.phases; }
  get current() { return this.cfg.phases[this.phase]; }
  get ratio() { return Math.min(1, this.progress / this.cfg.length); }

  /** Retourneert { phaseChanged, bossReady } */
  advance(amount) {
    if (this.bossTriggered) return {};
    this.progress = Math.min(this.cfg.length, this.progress + amount);
    let phaseChanged = null;
    while (this.phase + 1 < this.cfg.phases.length && this.progress >= this.cfg.phases[this.phase + 1].at) {
      this.phase++;
      phaseChanged = this.cfg.phases[this.phase];
    }
    let bossReady = false;
    if (this.progress >= this.cfg.length) { this.bossTriggered = true; bossReady = true; }
    return { phaseChanged, bossReady };
  }
  tick(dt) { return this.advance(this.cfg.progressPerSecond * dt); }
  onCorrect(tier, comboTier = 0) {
    return this.advance((this.cfg.progressPerCorrect[tier] || 0.4) * (1 + comboTier * 0.05));
  }
}
