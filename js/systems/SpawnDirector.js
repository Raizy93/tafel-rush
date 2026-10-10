// ---------------------------------------------------------------------------
// SpawnDirector – kiest welk vijandtype er spawnt.
//   1) HP-klasse (1/2/3) volgens CONFIG.spawn.hpCurve en de run-voortgang
//   2) een soort uit de bioom-pool met die HP (gewogen)
// Zo is het begin snel (veel 1 HP) en wordt het richting de boss pittiger.
// Puur JS → testbaar in Node.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { ENEMY_TYPES } from '../data/enemies.js';

/** Geïnterpoleerde HP-kansen bij voortgang 0..100. */
export function hpWeightsAt(progress, curve = CONFIG.spawn.hpCurve) {
  if (progress <= curve[0].at) return { ...curve[0].weights };
  for (let i = 0; i + 1 < curve.length; i++) {
    const a = curve[i], b = curve[i + 1];
    if (progress <= b.at) {
      const t = (progress - a.at) / (b.at - a.at);
      const out = {};
      for (const k of new Set([...Object.keys(a.weights), ...Object.keys(b.weights)])) out[k] = (a.weights[k] || 0) + ((b.weights[k] || 0) - (a.weights[k] || 0)) * t;
      return out;
    }
  }
  return { ...curve[curve.length - 1].weights };
}

function pickWeighted(entries, rng) {
  let total = 0;
  for (const [, w] of entries) total += w;
  if (total <= 0) return entries[0][0];
  let r = rng() * total;
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[entries.length - 1][0];
}

export class SpawnDirector {
  constructor({ rng = Math.random, types = ENEMY_TYPES, cfg = CONFIG.spawn } = {}) {
    this.rng = rng;
    this.types = types;
    this.cfg = cfg;
    this.strongInRow = 0;
    this.sinceChest = 0;
    this.nextChest = this.rollChest();
  }
  rollChest() { const [a, b] = this.cfg.chestEvery; return a + Math.floor(this.rng() * (b - a + 1)); }

  /** pool = [[typeId, gewicht], …] uit het bioom; progress = 0..100 */
  next(pool, progress) {
    this.sinceChest++;
    if (this.sinceChest >= this.nextChest) {
      this.sinceChest = 0;
      this.nextChest = this.rollChest();
      return 'chest';
    }
    const weights = hpWeightsAt(progress, this.cfg.hpCurve);
    // HP-klassen die in dit bioom echt bestaan
    const byHp = {};
    for (const [id, w] of pool) {
      const hp = this.types[id].maxHp;
      (byHp[hp] ||= []).push([id, w]);
    }
    let classes = Object.keys(byHp).map(hp => [hp, weights[hp] || 0]);
    if (this.strongInRow >= this.cfg.maxStrongInRow) classes = classes.filter(([hp]) => +hp < 3);
    // vangnet: geen passende klasse in dit bioom → neem wat er is (liefst < 3 HP)
    if (!classes.some(([, w]) => w > 0)) classes = Object.keys(byHp).map(hp => [hp, +hp < 3 ? 1 : 0.001]);
    const hp = pickWeighted(classes, this.rng);
    const id = pickWeighted(byHp[hp], this.rng);
    this.strongInRow = this.types[id].maxHp >= 3 ? this.strongInRow + 1 : 0;
    return id;
  }
}
