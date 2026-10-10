// ---------------------------------------------------------------------------
// UitlegScene – "UITLEG": alles over de game in korte hoofdstukken, met echte
// plaatjes uit de game (kisten, pets, kleuren van de tafelkaart, iconen).
// Openen: knop "? UITLEG" / toets H op het startscherm, of het ?-knopje in
// het petboek, de tafelkaart en de uitrusting (opent meteen het juiste
// hoofdstuk). Inhoud staat in data/help.js.
//   ↑/↓ of klik = hoofdstuk · Esc / H / Enter op TERUG = terug
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from '../ui/UI.js';
import { Animator, drawFrame } from '../core/Sprite.js';
import { HELP_CHAPTERS } from '../data/help.js';
import { CHESTS } from '../data/chests.js';
import { LEVEL_BY_ID } from '../training/MasteryMap.js';

const W = CONFIG.width, H = CONFIG.height;
const LX = 8, LY = 32, LW = 124;          // hoofdstukkenlijst
const RX = 138, RY = 32, RW = 334, RH = 218; // inhoud

export class UitlegScene {
  /** back = functie die terug gaat naar waar je vandaan kwam */
  constructor(game, chapter = 'spelen', back = null) {
    this.game = game;
    this.startChapter = chapter;
    this.back = back || (() => game.goToTitle());
  }

  enter() {
    this.sel = Math.max(0, HELP_CHAPTERS.findIndex(c => c.id === this.startChapter));
    this.time = 0;
    this.hover = null;
    this.rows = HELP_CHAPTERS.map((c, i) => ({ x: LX + 4, y: LY + 6 + i * 25, w: LW - 8, h: 22 }));
    this.backRect = { x: 150, y: 6, w: 70, h: 18 };
    this.anis = {};
    this.game.particles.clear();
  }

  ani(sheetId, anim = 'idle') {
    return (this.anis[sheetId] ||= new Animator(this.game.assets.sheet(sheetId), anim));
  }

  goBack() { this.game.audio.play('select'); this.back(); }

  onKey(a) {
    const g = this.game;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    if (a.type === 'escape' || a.type === 'help') { this.goBack(); return; }
    if (a.type === 'up' || a.type === 'down' || a.type === 'left' || a.type === 'right' || a.type === 'next' || a.type === 'prev') {
      const d = a.type === 'up' || a.type === 'left' || a.type === 'prev' ? -1 : 1;
      this.sel = (this.sel + d + HELP_CHAPTERS.length) % HELP_CHAPTERS.length;
      g.audio.play('select');
    }
  }

  onPointer(kind, x, y) {
    const inside = r => r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    if (kind === 'move') { this.hover = this.rows.findIndex(inside); return; }
    if (kind !== 'down') return;
    if (inside(this.backRect)) { this.goBack(); return; }
    const i = this.rows.findIndex(inside);
    if (i >= 0 && i !== this.sel) { this.sel = i; this.game.audio.play('select'); }
  }

  update(dt) {
    this.time += dt;
    for (const a of Object.values(this.anis)) a.update(dt);
  }

  draw(ctx) {
    const g = this.game, ui = g.ui;
    g.world.drawBack(ctx);
    g.world.drawFront(ctx);
    ctx.fillStyle = 'rgba(12,8,24,0.72)';
    ctx.fillRect(0, 0, W, H);
    ui.text(ctx, 'UITLEG', 12, 8, { font: 'big', color: COLORS.gold });
    ui.panel(ctx, this.backRect.x, this.backRect.y, this.backRect.w, this.backRect.h, 'btn');
    ui.text(ctx, '< TERUG', this.backRect.x + 35, this.backRect.y + 5, { align: 'center', outline: null, shadow: false });

    // hoofdstukken
    ui.panel(ctx, LX, LY, LW, RH, 'panel');
    HELP_CHAPTERS.forEach((c, i) => {
      const r = this.rows[i], on = i === this.sel;
      ui.panel(ctx, r.x, r.y, r.w, r.h, on ? 'btn_on' : this.hover === i ? 'btn_hover' : 'btn');
      ui.icon(ctx, c.icon, r.x + 4, r.y + 4);
      const label = c.short || c.title;
      ui.text(ctx, label, r.x + 20, r.y + 7, { color: on ? '#3a1d10' : '#fff8ec', outline: on ? null : '#1a1324', shadow: false });
    });

    // inhoud
    const ch = HELP_CHAPTERS[this.sel];
    ui.panel(ctx, RX, RY, RW, RH, 'panel');
    ui.icon(ctx, ch.icon, RX + 10, RY + 9);
    ui.text(ctx, ch.title + (ch.key ? '  (' + ch.key + ')' : ''), RX + 28, RY + 8, { font: 'big', color: ['#fff1a0', '#ffc93c'] });
    let y = RY + 30;
    for (const b of ch.blocks) y = this.drawBlock(ctx, ui, b, RX + 12, y, RW - 24) + 5;

    ui.text(ctx, '↑ ↓ = HOOFDSTUK   ESC = TERUG', W / 2, 258, { align: 'center', color: '#e8e4ff' });
  }

  /** Tekent één blok en geeft de y onder het blok terug. */
  drawBlock(ctx, ui, b, x, y, w) {
    if (b.p) {
      for (const line of ui.font.wrap(b.p, w, { outline: false })) { ui.text(ctx, line, x, y, { color: '#e8e4ff', outline: null, shadow: false }); y += 10; }
      return y;
    }
    if (b.big) {
      ui.panel(ctx, x + w / 2 - 70, y, 140, 22, 'panel_light');
      ui.text(ctx, b.big, x + w / 2, y + 5, { font: 'big', align: 'center', color: '#fff8ec' });
      return y + 24;
    }
    if (b.keys) {
      const kw = Math.max(...b.keys.map(([k]) => ui.font.measure(k))) + 12;
      for (const [k, t] of b.keys) {
        ui.text(ctx, k, x, y, { color: COLORS.goldFlat, outline: null, shadow: false });
        for (const line of ui.font.wrap(t, w - kw, { outline: false })) { ui.text(ctx, line, x + kw, y, { color: '#e8e4ff', outline: null, shadow: false }); y += 10; }
        y += 2;
      }
      return y;
    }
    if (b.row) {
      const n = b.row.length, cw = w / n;
      const hasSprite = b.row.some(it => it.chest);
      const hgt = hasSprite ? 46 : b.row.some(it => it.label) ? 26 : 12;
      b.row.forEach((it, i) => {
        const cx = Math.round(x + cw * i + cw / 2);
        if (it.icon) ui.icon(ctx, it.icon, cx - 6, y);
        if (it.chest) { const a = this.ani(CHESTS[it.chest].sheet); drawFrame(ctx, a.sheet, 'idle', a.frame, cx, y + 34); }
        if (it.map) {
          const lv = LEVEL_BY_ID[it.map];
          ctx.fillStyle = '#1a1324'; ctx.fillRect(cx - 7, y - 1, 14, 14);
          ctx.fillStyle = lv.color; ctx.fillRect(cx - 6, y, 12, 12);
          ctx.fillStyle = lv.light; ctx.fillRect(cx - 6, y, 12, 2);
        }
        if (it.text) ui.text(ctx, it.text, cx, y + 2, { align: 'center', color: it.color || '#fff8ec' });
        if (it.label) ui.text(ctx, it.label, cx, y + (hasSprite ? 37 : 15), { align: 'center', color: '#a8a0c8', outline: null, shadow: false });
      });
      return y + hgt;
    }
    return y;
  }
}
