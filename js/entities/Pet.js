// ---------------------------------------------------------------------------
// Pet – cosmetische companion die achter de held aan rent of vliegt.
// Volgt met een beetje vertraging (voelt levendig), juicht bij combo-
// mijlpalen en bij de overwinning. Zeldzame pets hebben live effecten
// (gloed, spoor, juich-uitbarsting; zie PetFx). Heeft GEEN invloed op het spel.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { Animator, drawFrame } from '../core/Sprite.js';
import { damp } from '../core/util.js';
import { PetFx } from './PetFx.js';

export class Pet {
  /** def uit data/pets.js */
  constructor(game, def, x = 0) {
    this.game = game;
    this.def = def;
    this.sheet = game.assets.sheet(def.sheet);
    this.ani = new Animator(this.sheet, 'idle');
    this.x = x - def.follow;
    this.y = CONFIG.groundY - def.height;
    this.t = Math.random() * 6;
    this.cheerT = 0;
    this.hop = 0;
    this.fxState = {};
    this.moving = false;
  }

  /** Juichen (seconden). Bij een overwinning: lang. */
  cheer(dur = 1.2) {
    const fresh = this.cheerT <= 0;
    this.cheerT = Math.max(this.cheerT, dur);
    this.ani.play('cheer', true);
    if (fresh) PetFx.cheer(this.game.particles, this.def, this.sheet, this.x, this.y);
    if (this.def.flying) return;
    this.hop = 1;
  }

  update(dt, player) {
    this.t += dt;
    // bij ON FIRE / ULTRA (vuurspoor achter de held) houdt de pet extra afstand
    this.extra = damp(this.extra || 0, player.comboTier >= 3 ? 22 : 0, 4, dt);
    const targetX = player.x - this.def.follow - this.extra;
    this.x = damp(this.x, targetX, 7, dt);
    if (this.x > targetX + 6) this.x = targetX + 6;
    if (this.def.flying) this.y = CONFIG.groundY - this.def.height + Math.sin(this.t * 3) * 2;
    else this.y = CONFIG.groundY;
    this.moving = player.speed > 12;
    if (this.cheerT > 0) {
      this.cheerT -= dt;
      this.ani.play('cheer');
    } else {
      this.ani.play(this.moving ? 'run' : 'idle');
      this.ani.speed = this.moving ? Math.max(0.7, Math.min(1.8, player.speed / 100)) : 1;
    }
    this.ani.update(dt);
    PetFx.emit(this.game.particles, this.def, this.x, this.y, dt, this.fxState, { moving: this.moving, quality: this.game.quality });
  }

  draw(ctx, camX) {
    const x = Math.round(this.x - camX);
    if (x < -40 || x > CONFIG.width + 40) return;
    const w = Math.round(this.sheet.fw * 0.45);
    ctx.fillStyle = this.def.flying ? 'rgba(10,8,20,0.16)' : 'rgba(10,8,20,0.26)';
    ctx.fillRect(x - w, CONFIG.groundY - 1, w * 2 + 1, this.def.flying ? 1 : 2);
    PetFx.drawGlow(ctx, this.def, this.sheet, x, this.y, this.t);
    drawFrame(ctx, this.sheet, this.ani.name, this.ani.frame, x, this.y);
  }
}
