// ---------------------------------------------------------------------------
// Particles + sprite-effecten.
// Pixel-particles leven in een vaste pool (geen garbage tijdens het spelen).
// Positie in wereld-coördinaten, tenzij `screen: true`.
// De maximale hoeveelheid wordt automatisch verlaagd op trage apparaten.
// ---------------------------------------------------------------------------
import { Animator, drawFrame } from './Sprite.js';

export class Particles {
  constructor(max = 300) {
    this.max = max;
    this.pool = [];
    for (let i = 0; i < 400; i++) this.pool.push({ alive: false });
    this.count = 0;
  }

  spawn(o) {
    if (this.count >= this.max) return null;
    const p = this.pool.find(q => !q.alive);
    if (!p) return null;
    p.alive = true;
    p.x = o.x; p.y = o.y;
    p.vx = o.vx || 0; p.vy = o.vy || 0;
    p.g = o.g ?? 0;
    p.drag = o.drag ?? 0;
    p.life = p.maxLife = o.life || 0.6;
    p.size = o.size || 1;
    p.color = o.color || '#ffffff';
    p.color2 = o.color2 || null;
    p.screen = !!o.screen;
    p.glow = !!o.glow;
    p.shrink = o.shrink ?? true;
    p.ground = o.ground ?? null;
    this.count++;
    return p;
  }

  /** Explosie van pixels. */
  burst(x, y, { count = 12, colors = ['#fff'], speed = 90, spread = Math.PI * 2, angle = -Math.PI / 2, g = 260, life = 0.6, size = [1, 2], drag = 1.5, screen = false, ground = null, glow = false } = {}) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.35 + Math.random() * 0.75);
      this.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g, drag, screen, ground, glow,
        life: life * (0.6 + Math.random() * 0.6),
        size: Array.isArray(size) ? size[0] + Math.floor(Math.random() * (size[1] - size[0] + 1)) : size,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update(dt) {
    let n = 0;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      p.vy += p.g * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.ground != null && p.y > p.ground) { p.y = p.ground; p.vy *= -0.35; p.vx *= 0.6; }
      n++;
    }
    this.count = n;
  }

  draw(ctx, camX, screenLayer = false) {
    for (const p of this.pool) {
      if (!p.alive || p.screen !== screenLayer) continue;
      const t = p.life / p.maxLife;
      const s = p.shrink ? Math.max(1, Math.round(p.size * Math.min(1, t * 1.6))) : p.size;
      const x = Math.round(p.x - (screenLayer ? 0 : camX)), y = Math.round(p.y);
      if (p.glow && s >= 1) {
        ctx.globalAlpha = 0.25 * t;
        ctx.fillStyle = p.color;
        ctx.fillRect(x - s, y - s, s * 3, s * 3);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = p.color2 && t < 0.5 ? p.color2 : p.color;
      ctx.fillRect(x, y, s, s);
    }
  }

  clear() { for (const p of this.pool) p.alive = false; this.count = 0; }
}

/** Korte, eenmalige sprite-animaties (spark, poof, slash …). */
export class Effects {
  constructor(assets) {
    this.assets = assets;
    this.list = [];
  }
  play(sheetId, anim, x, y, opts = {}) {
    const sheet = this.assets.sheet(sheetId);
    const fx = { sheet, ani: new Animator(sheet, anim), x, y, vx: opts.vx || 0, vy: opts.vy || 0, flip: !!opts.flip, screen: !!opts.screen, alpha: opts.alpha ?? 1, scale: opts.scale || 1, delay: opts.delay || 0, onDone: opts.onDone };
    fx.ani.speed = opts.speed || 1;
    this.list.push(fx);
    return fx;
  }
  update(dt) {
    for (const fx of this.list) {
      if (fx.delay > 0) { fx.delay -= dt; continue; }
      fx.ani.update(dt);
      fx.x += fx.vx * dt; fx.y += fx.vy * dt;
      if (fx.ani.done && !fx.finished) { fx.finished = true; fx.onDone && fx.onDone(fx); }
    }
    this.list = this.list.filter(fx => !fx.finished);
  }
  draw(ctx, camX, screenLayer = false) {
    for (const fx of this.list) {
      if (fx.delay > 0 || fx.screen !== screenLayer) continue;
      drawFrame(ctx, fx.sheet, fx.ani.name, fx.ani.frame, fx.x - (screenLayer ? 0 : camX), fx.y, { flip: fx.flip, alpha: fx.alpha, scale: fx.scale });
    }
  }
  clear() { this.list = []; }
}
