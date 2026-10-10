// ---------------------------------------------------------------------------
// Boss – De Woudwachter (Greenwood), De IJsreus (Frostpeak) of De Donderdraak
// (Stormrijk); alles uit BOSSES in data/enemies.js (sheet, HP, fx-kleuren, aanval).
// Aanval: 'slam' (vuistslag + schokgolf over de grond, standaard) of 'breath'
// (bliksemstraal uit de bek naar de held). Iedere goede som doet schade; bij een fout volgt een
// (onschuldige) tegenaanval. De speler kan niet verliezen.
// Gebruikt hetzelfde Health/damage-systeem als gewone vijanden:
//   takeDamage(damage) – logisch (direct)   showHit(result) – visueel (inslag)
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { BOSSES } from '../data/enemies.js';
import { Health } from '../systems/Health.js';
import { Animator, drawFrame } from '../core/Sprite.js';
import { damp, rand } from '../core/util.js';

export class Boss {
  constructor(game, id, x, targetX) {
    this.game = game;
    this.def = BOSSES[id];
    this.sheetId = this.def.sheet;
    this.sheet = game.assets.sheet(this.sheetId);
    this.ani = new Animator(this.sheet, 'calm_idle');
    this.x = x;
    this.targetX = targetX;
    this.y = CONFIG.groundY + 2;
    this.health = new Health(this.def.maxHp);
    this.chipHp = this.health.maxHp; // vertraagde "chip"-balk achter de echte HP
    this.state = 'enter';     // enter | idle | attack | hurt | dying | dead
    this.angry = false;
    this.flashT = 0;
    this.knock = 0;
    this.stepT = 0;
    this.deathT = 0;
    this.onSlam = null;
  }

  get mode() { return this.angry ? 'angry' : 'calm'; }
  get cx() { return this.x - 6; }
  get cy() { return this.y - 52; }
  get alive() { return this.state !== 'dying' && this.state !== 'dead'; }
  get targetable() { return this.alive && this.health.alive; }
  get maxHp() { return this.health.maxHp; }
  get hp() { return this.health.hp; }
  get shownHp() { return this.health.shownHp; }
  get ready() { return this.state !== 'enter'; }

  play(base, restart = false) { this.ani.play(this.mode + '_' + base, restart); }

  /** Logische schade (direct bij het goede antwoord). */
  takeDamage(damage) { return this.health.takeDamage(damage); }

  /** Visuele inslag. Retourneert true als de boss hiermee verslagen is. */
  showHit(result) {
    if (!this.alive) return false;
    this.health.showHit(result);
    this.flashT = result.crit ? 0.14 : 0.09;
    this.knock = result.crit ? 6 : 3;
    if (this.state !== 'attack' && this.state !== 'enter') { this.state = 'hurt'; this.play('hurt', true); }
    if (!this.angry && this.health.shownHp / this.maxHp <= CONFIG.boss.angryAt) {
      this.angry = true;
      this.game.renderer.shake(4, 0.4);
      this.game.particles.burst(this.cx, this.cy, { count: 30, colors: this.def.fx.angry, speed: 160, g: 120, life: 0.8 });
    }
    if (this.health.shownHp <= 0) {
      this.state = 'dying';
      this.deathT = 0;
      this.play('death', true);
      return true;
    }
    return false;
  }

  /** Tegenaanval bij een fout antwoord. onSlam wordt aangeroepen bij de klap. */
  counter(onSlam, targetX) {
    if (!this.alive || this.state === 'enter') return;
    this.state = 'attack';
    this.play('attack', true);
    this.slammed = false;
    this.onSlam = onSlam;
    this.slamTargetX = targetX;
  }

  update(dt) {
    this.ani.update(dt);
    if (this.wave) {
      const w = this.wave;
      w.x -= 460 * dt;
      const q = this.game.quality;
      this.game.particles.burst(w.x, CONFIG.groundY, { count: Math.round(3 * q), colors: this.def.fx.wave, speed: 90, angle: -Math.PI / 2, spread: 1.2, g: 500, life: 0.35, size: [1, 2], ground: CONFIG.groundY });
      if (w.x <= w.target) { this.wave = null; w.cb && w.cb(); }
    }
    if (this.beam) {
      const b = this.beam;
      b.t += dt;
      if (!b.hit && b.t >= 0.08) {
        b.hit = true;
        this.game.particles.burst(b.x1, b.y1, { count: Math.round(24 * this.game.quality), colors: this.def.fx.slam, speed: 150, angle: -Math.PI / 2, spread: 2.6, g: 380, life: 0.6, ground: CONFIG.groundY, glow: true });
        b.cb && b.cb();
      }
      if (b.t > 0.32) this.beam = null;
    }
    this.knock = damp(this.knock, 0, 8, dt);
    if (this.flashT > 0) this.flashT -= dt;
    this.chipHp = damp(this.chipHp, this.health.shownHp, 4, dt);

    switch (this.state) {
      case 'enter': {
        this.x -= 70 * dt;
        this.stepT -= dt;
        if (this.stepT <= 0) {
          this.stepT = 0.42;
          this.game.renderer.shake(2.5, 0.18);
          this.game.audio.play('slam', { throttle: 0.2 });
          this.game.particles.burst(this.x + rand(-20, 20), CONFIG.groundY, { count: 8, colors: this.def.fx.step, speed: 60, angle: -Math.PI / 2, spread: 2, g: 200, life: 0.5 });
        }
        if (this.x <= this.targetX) { this.x = this.targetX; this.state = 'idle'; this.play('idle', true); }
        break;
      }
      case 'attack':
        if (!this.slammed && this.ani.frame >= 3 && this.def.attack === 'breath') {
          // bliksemstraal: van de bek naar de grond vlak voor de held
          this.slammed = true;
          this.game.renderer.shake(4, 0.3);
          this.game.audio.play('zapBig');
          const [mx, my] = this.def.mouth;
          this.beam = { t: 0, x0: this.x + mx, y0: this.y + my, x1: this.slamTargetX ?? this.x - 150, y1: CONFIG.groundY, cb: this.onSlam, hit: false };
        } else if (!this.slammed && this.ani.frame >= 3) {
          this.slammed = true;
          this.game.renderer.shake(5, 0.3);
          this.game.audio.play('slam');
          this.game.particles.burst(this.x - 50, CONFIG.groundY, { count: Math.round(20 * this.game.quality), colors: this.def.fx.slam, speed: 140, angle: -Math.PI / 2, spread: 2.4, g: 400, life: 0.6, ground: CONFIG.groundY });
          // schokgolf rolt over de grond naar de held
          this.wave = { x: this.x - 50, target: this.slamTargetX ?? this.x - 150, cb: this.onSlam };
        }
        if (this.ani.done) { this.state = 'idle'; this.play('idle', true); }
        break;
      case 'hurt':
        if (this.ani.done) { this.state = 'idle'; this.play('idle', true); }
        break;
      case 'idle':
        this.play('idle');
        break;
      case 'dying':
        this.deathT += dt;
        if (Math.random() < 0.5) this.game.particles.burst(this.x + rand(-40, 40), this.y - rand(10, 90), { count: 4, colors: this.def.fx.death, speed: 80, g: 300, life: 0.8, size: [2, 3], ground: CONFIG.groundY });
        if (this.deathT > 1.6) this.state = 'dead';
        break;
    }
  }

  draw(ctx, camX) {
    if (this.state === 'dead') return;
    const x = this.x - camX + this.knock + (this.state === 'dying' ? rand(-2, 2) : 0);
    const alpha = this.state === 'dying' ? Math.max(0, 1 - Math.max(0, this.deathT - 0.8) / 0.8) : 1;
    // schaduw
    ctx.fillStyle = 'rgba(10,8,20,0.32)';
    ctx.fillRect(Math.round(x - 50), CONFIG.groundY - 1, 100, 3);
    // rune-vonkjes rond de boss
    if (this.alive && Math.random() < 0.25 * this.game.quality) {
      this.game.particles.spawn({ x: this.x + rand(-40, 40), y: this.y - rand(10, 100), vy: -rand(10, 25), life: 0.9, color: this.angry ? this.def.fx.sparkAngry : this.def.fx.spark, glow: true, shrink: false });
    }
    const flashImg = this.flashT > 0 ? this.game.assets.flash(this.sheetId) : null;
    drawFrame(ctx, this.sheet, this.ani.name, this.ani.frame, x, this.y, { flashImg, alpha });
    if (this.beam) this.drawBeam(ctx, camX);
  }

  /** Gekartelde bliksemstraal die iedere frame een beetje anders flikkert. */
  drawBeam(ctx, camX) {
    const b = this.beam, col = (this.angry && this.def.fx.beamAngry) || this.def.fx.beam;
    const k = 1 - b.t / 0.32;
    const pts = [[b.x0 - camX, b.y0]];
    const n = 9;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([b.x0 - camX + (b.x1 - b.x0) * t + rand(-4, 4), b.y0 + (b.y1 - b.y0) * t + rand(-7, 7)]);
    }
    pts.push([b.x1 - camX, b.y1]);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, c, a] of [[5, col[0], 0.35], [3, col[1], 0.7], [1, col[2], 1]]) {
      ctx.globalAlpha = a * k; ctx.strokeStyle = c; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
    ctx.restore();
  }
}
