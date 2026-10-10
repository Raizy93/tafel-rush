// ---------------------------------------------------------------------------
// Enemy – kleine bos-vijand. Geen complexe AI: ze lopen/hoppen naar de speler
// toe en zijn visuele doelwitten voor goede antwoorden.
//
// HP via het generieke Health-systeem (zelfde basis als de boss):
//   takeDamage(damage) – logisch, direct bij het goede antwoord
//   showHit(result)    – visueel, als de aanval inslaat (flits, terugslag, pips)
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { Health } from '../systems/Health.js';
import { Animator, drawFrame } from '../core/Sprite.js';
import { rand, damp } from '../core/util.js';

export class Enemy {
  constructor(game, typeId, x) {
    this.game = game;
    this.typeId = typeId;
    this.enemyType = typeId;
    this.type = ENEMY_TYPES[typeId];
    this.sheet = game.assets.sheet(this.type.sheet);
    this.ani = new Animator(this.sheet, 'move');
    this.ani.t = rand(0, 1);
    this.health = new Health(this.type.maxHp);
    this.x = x;
    this.baseY = CONFIG.groundY - (this.type.fly || 0);
    this.y = this.baseY;
    this.t = rand(0, 6);
    this.alive = true;     // zichtbaar en nog niet "geknald"
    this.state = 'move';
    this.flashT = 0;
    this.lunge = 0;
    this.squash = 0;       // korte indruk-animatie bij een hit
    this.pipFlash = 0;
    this.walk = this.type.chest ? 0 : this.type.flying ? 14 : rand(6, 14);
  }

  // --- health-API (zelfde als Boss) ------------------------------------------------
  get maxHp() { return this.health.maxHp; }
  get hp() { return this.health.hp; }
  /** Kan nog geraakt worden (logische HP > 0). */
  get targetable() { return this.alive && this.health.alive; }
  takeDamage(damage) { return this.health.takeDamage(damage); }
  showHit(result) {
    this.health.showHit(result);
    this.flashT = result.crit ? 0.12 : 0.08;
    this.lunge = result.crit ? 7 : 4;      // terugslag (naar rechts, weg van de speler)
    this.squash = 0.12;
    this.pipFlash = 0.25;
  }

  attack() {
    if (!this.alive || this.type.chest) return;
    this.state = 'attack';
    this.ani.play('attack', true);
    this.lunge = -14;
  }

  /** minX: niet dichter dan dit naar links lopen (afstand tot de vijand ervoor). */
  update(dt, playerX, minX = -Infinity) {
    this.t += dt;
    if (this.state === 'attack' && this.ani.done) { this.state = 'move'; this.ani.play('move', true); }
    this.ani.update(dt);
    this.lunge = damp(this.lunge, 0, 6, dt);
    if (this.flashT > 0) this.flashT -= dt;
    if (this.squash > 0) this.squash -= dt;
    if (this.pipFlash > 0) this.pipFlash -= dt;
    // langzaam naar de speler toe, tot vlak voor de stopafstand
    const stopX = Math.max(playerX + CONFIG.speed.engageDistance + 4, minX);
    if (this.x > stopX) this.x = Math.max(stopX, this.x - this.walk * dt);
    if (this.type.flying) this.y = this.baseY + Math.sin(this.t * 4) * 3;
  }

  /** Middelpunt (voor aanval/impact). */
  get cx() { return this.x; }
  get cy() { return this.y - (this.type.flying ? 2 : 11); }

  draw(ctx, camX) {
    const x = this.x - camX + this.lunge;
    if (x < -40 || x > CONFIG.width + 40) return;
    if (!this.type.flying) {
      ctx.fillStyle = 'rgba(10,8,20,0.28)';
      ctx.fillRect(Math.round(x - 8), CONFIG.groundY - 1, 16, 2);
    } else {
      ctx.fillStyle = 'rgba(10,8,20,0.18)';
      ctx.fillRect(Math.round(x - 5), CONFIG.groundY - 1, 10, 1);
    }
    const sq = this.squash > 0 ? 1 : 0; // 1px "indeuken" bij een hit
    drawFrame(ctx, this.sheet, this.ani.name, this.ani.frame, x, this.y + sq);
    if (this.flashT > 0) drawFrame(ctx, this.sheet, this.ani.name, this.ani.frame, x, this.y + sq, { flashImg: this.game.assets.flash(this.type.sheet), alpha: 0.85 });
    if (this.alive && this.maxHp > 1) this.drawPips(ctx, x);
  }

  /** Compacte pixel-HP: ■■□ boven de vijand. */
  drawPips(ctx, x) {
    const n = this.maxHp, shown = Math.ceil(this.health.shownHp);
    const pw = 4, gap = 1, w = n * pw + (n - 1) * gap;
    const px = Math.round(x - w / 2), py = Math.round(this.y - this.type.barY - (this.type.flying ? 0 : 0));
    ctx.fillStyle = '#1a1324';
    ctx.fillRect(px - 1, py - 1, w + 2, 5);
    for (let i = 0; i < n; i++) {
      const full = i < shown;
      const bx = px + i * (pw + gap);
      ctx.fillStyle = full ? (this.type.armored ? '#ffc93c' : '#ff5a5a') : '#3a2a48';
      ctx.fillRect(bx, py, pw, 3);
      if (full) { ctx.fillStyle = this.type.armored ? '#fff1a0' : '#ffb0a0'; ctx.fillRect(bx, py, pw, 1); }
      // net verloren pip licht even wit op
      if (!full && i === shown && this.pipFlash > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, py, pw, 3); }
    }
  }
}
