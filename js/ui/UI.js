// ---------------------------------------------------------------------------
// UI-hulpmiddelen op het pixel-canvas: panelen, iconen, knoppen.
// ---------------------------------------------------------------------------
import { drawPanel, drawSprite } from '../core/Sprite.js';

export const COLORS = {
  text: '#fff8ec',
  dim: '#a8a0c8',
  gold: ['#fff1a0', '#ffc93c'],
  goldFlat: '#ffc93c',
  green: '#7dff8a',
  red: '#ff5a5a',
  cyan: '#8ff2ff',
  purple: '#c890ff',
  tier: ['#fff8ec', '#ffe66a', '#8ff2ff', '#ff9a2a', '#ff7ae0'],
  tierGrad: [['#ffffff', '#c8c0e8'], ['#fff6c0', '#ffc93c'], ['#e0ffff', '#4fd0ff'], ['#ffe66a', '#ff6a1e'], ['#ffe0ff', '#c040ff']],
};

export class UI {
  constructor(game) {
    this.game = game;
    this.assets = game.assets;
    this.font = game.font;
    this.slice = this.assets.atlas.atlases.ui.slice;
    this.sprites = {};
  }
  spr(name) {
    return (this.sprites[name] ||= this.assets.sprite('ui', name));
  }
  panel(ctx, x, y, w, h, kind = 'panel') { drawPanel(ctx, this.spr(kind), x, y, w, h, this.slice); }
  icon(ctx, name, x, y, alpha) { drawSprite(ctx, this.spr(name), x, y, alpha != null ? { alpha } : undefined); }
  text(ctx, str, x, y, opts) { return this.font.draw(ctx, str, x, y, opts); }
  /** Speelt iemand met aanraken (telefoon/tablet)? Dan geen toetsen noemen. */
  get touch() { return this.game.input.usingTouch; }
  /** Tekst met toetsen (pc/laptop) of de tik-versie (touch). */
  hint(keys, tap) { return this.touch ? tap : keys; }
  /** Knoplabel met sneltoets, bijv. "PETBOEK (B)"; op touch zonder "(B)". */
  key(label, k) { return this.touch ? label : label + ' (' + k + ')'; }

  /** Klein ?-knopje (opent de uitleg). Retourneert de klik-rechthoek. */
  helpButton(ctx, x, y, hover = false) {
    const r = { x, y, w: 18, h: 18 };
    this.panel(ctx, x, y, r.w, r.h, hover ? 'btn_hover' : 'btn');
    this.text(ctx, '?', x + 9, y + 5, { align: 'center', color: '#ffc93c', outline: null, shadow: false });
    return r;
  }
}

/**
 * Eenvoudige canvas-knop. Wordt elke frame getekend; hover via pointer,
 * "focus" via toetsenbord. Klik roept onClick aan.
 */
export class Button {
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, w: 60, h: 20, label: '', icon: null, kind: 'btn', enabled: true, selected: false, font: 'small', scale: 1, visible: true }, o);
  }
  contains(px, py) { return this.visible && px >= this.x && py >= this.y && px < this.x + this.w && py < this.y + this.h; }
  draw(ctx, ui, hover) {
    if (!this.visible) return;
    const down = hover && ui.game.input.pointer.down;
    let kind = this.kind === 'go' ? (hover ? 'btn_go_hover' : 'btn_go') : this.selected ? 'btn_on' : hover ? 'btn_hover' : 'btn';
    if (!this.enabled) kind = 'btn_off';
    if (down && this.enabled) kind = this.kind === 'go' ? 'btn_go' : 'btn_down';
    const oy = down && this.enabled ? 1 : 0;
    ui.panel(ctx, this.x, this.y + oy, this.w, this.h, kind);
    const color = !this.enabled ? '#8a84a0' : this.selected ? '#3a1d10' : '#fff8ec';
    const outline = this.selected ? null : '#1a1324';
    const th = ui.font.height(this.font, this.scale);
    let tw = ui.font.measure(this.label, { font: this.font, scale: this.scale, outline: !!outline });
    const iconW = this.icon ? 14 : 0;
    const cx = this.x + (this.w - tw - iconW) / 2;
    const cy = this.y + oy + Math.floor((this.h - 3 - th) / 2) + 1;
    if (this.icon) ui.icon(ctx, this.icon, cx, this.y + oy + Math.floor((this.h - 3 - 12) / 2));
    ui.text(ctx, this.label, cx + iconW, cy, { font: this.font, scale: this.scale, color, outline, shadow: false });
  }
}
