// ---------------------------------------------------------------------------
// EnemyManager – spawnt vijanden vóór de speler, kiest doelwitten, beheert de
// aanvals-projectielen (slash / pijl / plasma – data uit het character) en de
// hit- en defeat-effecten.
//
// Belangrijk voor de rekenflow: schade wordt LOGISCH direct toegepast (bij het
// goede antwoord). Het projectiel is alleen de visuele vertraging tot de
// inslag. Zo kan een snelle leerling al op de volgende vijand mikken terwijl
// de vorige nog geraakt wordt, en ontstaan er nooit dubbele hits.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { Enemy } from './Enemy.js';
import { SpawnDirector } from '../systems/SpawnDirector.js';
import { Animator, drawFrame } from '../core/Sprite.js';
import { rand, clamp } from '../core/util.js';

const KIND_TRAIL = { crit: '#ffe66a', ultra: '#ff7ae0', fire: '#ff9a2a' };
const PROJECTILE_SPEED = 760; // px/s – voor ALLE characters gelijk (zelfde timing)

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.shots = [];
    this.reset(0);
  }

  reset(playerX) {
    this.list = [];
    this.shots = [];
    this.nextX = playerX + 230;
    this.spawning = true;
    this.progress = 0;
    this.director = new SpawnDirector();
    this.pool = [['slime_green', 1]];
  }

  setEnemyPool(pool) { this.pool = pool; }

  get aliveCount() { return this.list.filter(e => e.alive).length; }

  /** Eerste vijand vóór de speler die nog HP heeft (logisch) → volgende doelwit. */
  front(playerX) {
    let best = null;
    for (const e of this.list) {
      if (!e.targetable || e.x < playerX - 6) continue;
      if (!best || e.x < best.x) best = e;
    }
    return best;
  }

  /** De eerstvolgende vijand (met HP) áchter een bepaalde vijand – voor de doorboor-aanval. */
  nextAfter(enemy) {
    let best = null;
    for (const e of this.list) {
      if (!e.targetable || e === enemy || e.x <= enemy.x) continue;
      if (!best || e.x < best.x) best = e;
    }
    return best;
  }

  /** Dichtstbijzijnde vijand die nog HP heeft – de speler stopt hiervoor. */
  blocker(playerX) { return this.front(playerX); }

  spawn(camX, speed) {
    if (!this.spawning) return;
    while (this.nextX < camX + CONFIG.width + 60) {
      const type = this.director.next(this.pool, this.progress);
      this.list.push(new Enemy(this.game, type, this.nextX));
      const spacing = clamp(speed * 1.1, 92, 190) + rand(-8, 26);
      this.nextX += spacing;
    }
  }

  /**
   * Stuur een aanval naar een doelwit (Enemy of Boss: alles met cx/cy).
   * attack = character.attack ({ effect, melee, launch, trail }); kind = normal|crit|ultra|fire.
   * onImpact wordt één keer aangeroepen bij de inslag.
   */
  launchAttack(from, target, attack, kind, onImpact, opts = {}) {
    const sheet = this.game.assets.sheet(attack.effect);
    const near = attack.melee && target.cx - from.x < 70;
    const anim = sheet.anims[kind] ? kind : 'normal';
    this.shots.push({
      x: near ? target.cx - 14 : from.x,
      y: from.y,
      target, kind, onImpact, near,
      ani: new Animator(sheet, anim),
      trail: KIND_TRAIL[kind] || attack.trail,
      hit: false,
      t: 0,
      delay: (near ? 0.05 : 0) + (opts.delay || 0),
    });
    if (opts.silent) return;
    this.game.audio.play(attack.sound || (attack.melee ? 'swing' : attack.effect === 'arrow' ? 'bow' : 'zap'), { throttle: 0.05 });
  }

  update(dt, playerX, camX, speed) {
    this.spawn(camX, speed);
    // van voor naar achter: iedere vijand houdt afstand tot de vorige (geen kluitjes)
    let prevX = -Infinity;
    for (const e of [...this.list].sort((a, b) => a.x - b.x)) {
      e.update(dt, playerX, e.alive ? prevX + 46 : -Infinity);
      if (e.alive) prevX = e.x;
    }
    for (const s of this.shots) {
      s.t += dt;
      s.ani.update(dt);
      if (s.hit) continue;
      if (s.delay > 0) { s.delay -= dt; continue; }
      if (s.near) { this.impact(s); continue; }
      const tx = s.target.cx - 8, ty = s.target.cy;
      const v = PROJECTILE_SPEED * dt;
      const dx = tx - s.x, dy = ty - s.y;
      const d = Math.hypot(dx, dy);
      if (d <= v || s.t > 0.6) { s.x = tx; s.y = ty; this.impact(s); }
      else {
        s.x += (dx / d) * v; s.y += (dy / d) * v;
        if (Math.random() < 0.8 * this.game.quality) this.game.particles.spawn({ x: s.x - 4 + rand(-3, 3), y: s.y + rand(-4, 4), vx: -40, vy: rand(-10, 10), life: 0.25, size: 1, color: s.trail });
      }
    }
    // slash speelt zijn boog uit; pijlen/plasma verdwijnen bij inslag
    this.shots = this.shots.filter(s => !(s.hit && (s.ani.done || s.ani.anim.loop)));
    this.list = this.list.filter(e => (e.alive || e.openT > 0) && e.x > camX - 60);
    for (const e of this.list) if (e.openT > 0) e.openT -= dt;
  }

  impact(s) {
    s.hit = true;
    s.onImpact && s.onImpact(s);
  }

  /** Visuele hit op een gewone vijand (+ defeat als dit de laatste HP was). */
  hitFx(e, result, kind) {
    const g = this.game, q = g.quality;
    const big = result.crit || kind === 'ultra' || kind === 'fire';
    if (!e.alive) return null;
    e.showHit(result);
    if (result.killed) return this.kill(e, kind);
    // niet-dodelijke hit: kleine vonk + splinters, pip springt weg
    g.effects.play('spark', big ? 'gold' : 'white', e.cx + 4, e.cy);
    g.particles.burst(e.cx + 2, e.cy, { count: Math.round((big ? 10 : 6) * q), colors: e.type.colors, speed: 90, angle: -0.6, spread: 2.2, g: 320, life: 0.45, size: [1, 2], ground: CONFIG.groundY + 2 });
    g.audio.play(e.type.armored ? 'clank' : 'hit', { throttle: 0.04, pitch: 1.15 });
    return { x: e.cx, y: e.cy, killed: false };
  }

  /** Vijand verslaan: defeat-effecten. Retourneert de positie voor munt-animaties. */
  kill(e, kind = 'normal') {
    const g = this.game;
    if (!e.alive) return { x: e.cx, y: e.cy, killed: true };
    e.alive = false;
    const q = g.quality;
    const big = kind === 'crit' || kind === 'ultra' || kind === 'fire';
    g.effects.play('spark', big ? 'gold' : 'white', e.cx, e.cy);
    if (e.type.chest) {
      e.ani.play('hurt', true);
      e.openT = 1.4;
      g.particles.burst(e.cx, e.cy - 4, { count: Math.round(18 * q), colors: ['#ffc93c', '#fff1a0', '#ffffff'], speed: 120, g: 300, life: 0.8, size: [1, 2], ground: CONFIG.groundY });
      g.audio.play('chest');
    } else {
      g.effects.play('poof', 'poof', e.x, e.y - 12);
      g.particles.burst(e.cx, e.cy, { count: Math.round((big || e.maxHp > 1 ? 22 : 14) * q), colors: e.type.colors, speed: big ? 150 : 110, g: 320, life: 0.7, size: [1, 3], ground: CONFIG.groundY + 2 });
      g.audio.play(kind === 'normal' ? 'hit' : 'crit', { throttle: 0.04 });
      g.audio.play('poof', { throttle: 0.06 });
    }
    return { x: e.cx, y: e.cy, killed: true };
  }

  drawEnemies(ctx, camX) {
    for (const e of this.list) {
      if (e.alive) e.draw(ctx, camX);
      else if (e.openT > 0) {
        ctx.globalAlpha = Math.min(1, e.openT * 2);
        e.draw(ctx, camX);
        ctx.globalAlpha = 1;
      }
    }
  }

  drawShots(ctx, camX) {
    for (const s of this.shots) if (s.near || !(s.delay > 0)) drawFrame(ctx, s.ani.sheet, s.ani.name, s.ani.frame, s.x - camX, s.y);
  }
}
