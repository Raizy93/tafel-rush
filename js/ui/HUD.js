// ---------------------------------------------------------------------------
// HUD – rustig en overzichtelijk:
//   linksboven: combo      rechtsboven: coins + geluid
//   midden-boven: run-voortgang of boss-HP
// Plus niet-blokkerende banners (COMBO ×5, ON FIRE!, fase-namen),
// zwevende teksten (PERFECT!) en munten die naar de teller vliegen.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from './UI.js';
import { drawFrame } from '../core/Sprite.js';
import { easeOutBack, easeOutCubic, fmtInt, clamp } from '../core/util.js';

const W = CONFIG.width;

export class HUD {
  constructor(game) {
    this.game = game;
    this.banners = [];
    this.popups = [];
    this.flyCoins = [];
    this.displayCoins = 0;
    this.coinPulse = 0;
    this.comboPulse = 0;
    this.comboBreakT = 0;
    this.lostCombo = 0;
    this.coinTarget = { x: W - 52, y: 14 };
    this.buttons = [];
  }

  reset() {
    this.banners = []; this.popups = []; this.flyCoins = [];
    this.displayCoins = 0; this.coinPulse = 0; this.comboPulse = 0; this.comboBreakT = 0;
  }

  // --- feedback-API ------------------------------------------------------------------
  banner(text, { colors = COLORS.gold, sub = null, dur = 1.25, y = 124, scale = 1, icon = null } = {}) {
    // max 2 tegelijk; nieuwe vervangt oudste
    if (this.banners.length >= 2) this.banners.shift();
    for (const b of this.banners) b.y -= 22;
    this.banners.push({ text, colors, sub, dur, t: 0, y, scale, icon });
  }

  popup(text, x, y, { color = '#fff8ec', font = 'small', life = 0.7, vy = -28, scale = 1 } = {}) {
    if (this.popups.length > 10) this.popups.shift();
    this.popups.push({ text, x, y, vy, color, font, life, maxLife: life, scale });
  }

  /** Munt vliegt van (sx,sy) [scherm] naar de teller. value wordt opgeteld bij aankomst. */
  flyCoin(sx, sy, value, delay = 0) {
    this.flyCoins.push({ sx, sy, t: -delay, dur: 0.55 + Math.random() * 0.15, value, arc: 30 + Math.random() * 30 });
  }

  comboBroken(lost) { if (lost >= 3) { this.comboBreakT = 0.8; this.lostCombo = lost; } }

  update(dt) {
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter(b => b.t < b.dur);
    for (const p of this.popups) { p.life -= dt; p.y += p.vy * dt; p.vy *= Math.exp(-2.5 * dt); }
    this.popups = this.popups.filter(p => p.life > 0);
    for (const c of this.flyCoins) {
      c.t += dt;
      if (c.t >= c.dur && !c.done) {
        c.done = true;
        this.displayCoins += c.value;
        this.coinPulse = 0.15;
        this.game.audio.play('coin', { throttle: 0.045 });
      }
    }
    this.flyCoins = this.flyCoins.filter(c => !c.done);
    if (this.coinPulse > 0) this.coinPulse -= dt;
    if (this.comboPulse > 0) this.comboPulse -= dt;
    if (this.comboBreakT > 0) this.comboBreakT -= dt;
  }

  // --- tekenen -----------------------------------------------------------------------
  draw(ctx, ui, run) {
    this.drawCombo(ctx, ui, run.combo, run.shieldCharges || 0);
    this.drawCoins(ctx, ui);
    if (run.boss && run.boss.state !== 'enter') this.drawBossBar(ctx, ui, run.boss);
    else this.drawProgress(ctx, ui, run.progression, run.world);
    this.drawSoundButtons(ctx, ui);
  }

  /** Vliegende munten – getekend ACHTER het som-paneel, zodat de som leesbaar blijft. */
  drawFlyingCoins(ctx) {
    const coin = this.game.assets.sheet('coin');
    for (const c of this.flyCoins) {
      if (c.t < 0) continue;
      const k = easeOutCubic(clamp(c.t / c.dur, 0, 1));
      const x = c.sx + (this.coinTarget.x - c.sx) * k;
      const y = c.sy + (this.coinTarget.y - c.sy) * k - Math.sin(k * Math.PI) * c.arc;
      drawFrame(ctx, coin, 'spin', Math.floor((c.t * 14)) % 6, x, y);
    }
  }

  drawOverlays(ctx, ui) {
    for (const p of this.popups) {
      const a = Math.min(1, p.life / (p.maxLife * 0.4));
      ui.text(ctx, p.text, p.x, p.y, { font: p.font, align: 'center', color: p.color, alpha: a, scale: p.scale });
    }
    for (const b of this.banners) this.drawBanner(ctx, ui, b);
  }

  drawBanner(ctx, ui, b) {
    const tin = Math.min(1, b.t / 0.22);
    const tout = Math.max(0, (b.t - (b.dur - 0.25)) / 0.25);
    const x = W / 2 + (1 - easeOutBack(tin)) * 160 - tout * 40;
    const alpha = 1 - tout;
    const scale = b.scale;
    const w = ui.font.measure(b.text, { font: 'big', scale });
    ui.text(ctx, b.text, x, b.y, { font: 'big', align: 'center', color: b.colors, alpha, scale });
    if (b.icon) {
      const flame = this.game.assets.sheet('flame');
      const f = Math.floor(this.game.time * 12) % 4;
      ctx.globalAlpha = alpha;
      drawFrame(ctx, flame, b.icon, f, x - w / 2 - 12, b.y + 18);
      drawFrame(ctx, flame, b.icon, (f + 2) % 4, x + w / 2 + 12, b.y + 18);
      ctx.globalAlpha = 1;
    }
    if (b.sub) ui.text(ctx, b.sub, x, b.y + 18 * scale, { font: 'small', align: 'center', color: '#fff8ec', alpha });
  }

  drawCombo(ctx, ui, combo, shields = 0) {
    const x = 6, y = 6, w = 92, h = 38;
    ui.panel(ctx, x, y, w, h, 'panel');
    const tier = combo.tier;
    const col = tier >= 4 ? COLORS.tierGrad[(Math.floor(this.game.time * 8) % 3) + 2] : COLORS.tierGrad[tier];
    // icoon
    if (tier >= 1) {
      const flame = this.game.assets.sheet('flame');
      drawFrame(ctx, flame, tier >= 4 ? 'ultra' : tier === 2 ? 'blue' : 'fire', Math.floor(this.game.time * 12) % 4, x + 14, y + 28);
    } else ui.icon(ctx, 'flame', x + 7, y + 14, 0.5);
    ui.text(ctx, 'COMBO', x + 26, y + 5, { color: COLORS.dim, outline: null, shadow: false });
    const pulse = this.comboPulse > 0 ? 1 : 0;
    ui.text(ctx, '×' + combo.count, x + 26, y + 14 - pulse, { font: 'big', color: col });
    // meter naar volgende tier
    const next = combo.nextAt, prev = combo.prevAt;
    const mx = x + 6, my = y + h - 7, mw = w - 12;
    ctx.fillStyle = '#0e0b1a'; ctx.fillRect(mx, my, mw, 3);
    const r = next ? (combo.count - prev) / (next - prev) : 1;
    ctx.fillStyle = COLORS.tier[Math.min(4, tier + (next ? 1 : 0))];
    ctx.fillRect(mx, my, Math.round(mw * clamp(r, 0, 1)), 3);
    // comboschild klaar voor gebruik
    if (shields > 0) ui.icon(ctx, 'shield', x + w - 15, y + 5, 0.75 + 0.25 * Math.sin(this.game.time * 4));
    if (this.comboBreakT > 0) {
      const a = Math.min(1, this.comboBreakT / 0.3);
      ui.text(ctx, 'COMBO WEG', x + w / 2, y + h + 3 + (0.8 - this.comboBreakT) * 10, { align: 'center', color: '#ff8a8a', alpha: a });
    }
  }

  drawCoins(ctx, ui) {
    const w = 74, x = W - w - 6, y = 6;
    ui.panel(ctx, x, y, w, 22, 'panel');
    const bump = this.coinPulse > 0 ? 1 : 0;
    ui.icon(ctx, 'coin', x + 6, y + 5 - bump);
    ui.text(ctx, fmtInt(this.displayCoins), x + w - 7, y + 7 - bump, { align: 'right', color: COLORS.gold });
    this.coinTarget = { x: x + 12, y: y + 11 };
  }

  drawSoundButtons(ctx, ui) {
    const a = this.game.audio;
    const x = W - 50, y = 31;
    ui.icon(ctx, a.sfxOn ? 'sound' : 'mute', x, y, a.sfxOn ? 0.9 : 0.6);
    ui.icon(ctx, 'music', x + 16, y, a.musicOn ? 0.9 : 0.35);
    this.soundRects = [{ x: x - 2, y: y - 2, w: 15, h: 15, kind: 'sfx' }, { x: x + 14, y: y - 2, w: 15, h: 15, kind: 'music' }];
    this.fsRect = this.game.drawFullscreenButton(ctx, W - 18, y);
  }

  drawProgress(ctx, ui, prog, world) {
    const color = key => (world.def.biomes[key] && world.def.biomes[key].color) || '#fff';
    const w = 170, x = Math.round((W - w) / 2), y = 9;
    ui.panel(ctx, x - 6, y - 5, w + 26, 18, 'panel');
    const phases = prog.phases;
    for (let i = 0; i < phases.length; i++) {
      const a = phases[i].at / 100, b = (phases[i + 1] ? phases[i + 1].at : 100) / 100;
      const sx = x + Math.round(a * w), ex = x + Math.round(b * w);
      ctx.fillStyle = '#0e0b1a'; ctx.fillRect(sx, y + 1, ex - sx - 1, 6);
      const fill = clamp((prog.ratio - a) / (b - a), 0, 1);
      ctx.fillStyle = color(phases[i].biome);
      ctx.fillRect(sx, y + 1, Math.round((ex - sx - 1) * fill), 6);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(sx, y + 1, Math.round((ex - sx - 1) * fill), 1);
    }
    // marker
    const mx = x + Math.round(prog.ratio * w);
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(mx - 1, y - 1, 3, 10);
    ctx.fillStyle = '#1a1324'; ctx.fillRect(mx, y, 1, 8);
    ui.icon(ctx, 'skull', x + w + 3, y - 3);
    ui.text(ctx, prog.current.name, W / 2, y + 12, { align: 'center', color: color(world.biomeKey), font: 'small' });
  }

  drawBossBar(ctx, ui, boss) {
    const w = 210, x = Math.round((W - w) / 2), y = 10;
    ui.panel(ctx, x - 6, y - 6, w + 12, 20, 'panel');
    ctx.fillStyle = '#0e0b1a'; ctx.fillRect(x, y, w, 8);
    const r = boss.shownHp / boss.maxHp, rs = boss.chipHp / boss.maxHp;
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(x, y, Math.round(w * rs), 8);
    ctx.fillStyle = boss.angry ? '#ff3a3a' : '#e04040'; ctx.fillRect(x, y, Math.round(w * r), 8);
    ctx.fillStyle = '#ff9a8a'; ctx.fillRect(x, y, Math.round(w * r), 2);
    // één segment per HP (= per goed antwoord)
    for (let i = 1; i < boss.maxHp; i++) { ctx.fillStyle = 'rgba(14,11,26,0.7)'; ctx.fillRect(x + Math.round((w * i) / boss.maxHp), y, 1, 8); }
    ui.text(ctx, boss.def.name, W / 2, y + 12, { align: 'center', color: boss.angry ? '#ff8a8a' : '#ffd0a0' });
  }
}
