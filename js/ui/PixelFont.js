// ---------------------------------------------------------------------------
// PixelFont – tekent tekst met de eigen bitmap-fonts op het pixel-canvas.
// Glyphs worden per stijl (kleur/outline/schaduw) één keer gerenderd en
// gecachet, zodat tekst tekenen per frame goedkoop is.
// ---------------------------------------------------------------------------
import { SMALL, HUGE } from './fontData.js';

const OUTLINE = '#1a1324';

function toGlyph(rows) {
  const h = rows.length, w = rows[0].length;
  const data = new Uint8Array(w * h);
  rows.forEach((r, y) => { for (let x = 0; x < w; x++) data[y * w + x] = r[x] === '#' ? 1 : 0; });
  return { w, h, data };
}

/** Scale2x (EPX): verdubbelt een glyph met afgevlakte diagonalen. */
function scale2x(g) {
  const W = g.w * 2, H = g.h * 2, out = new Uint8Array(W * H);
  const P = (x, y) => (x < 0 || y < 0 || x >= g.w || y >= g.h ? 0 : g.data[y * g.w + x]);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const p = P(x, y), A = P(x, y - 1), B = P(x + 1, y), C = P(x - 1, y), D = P(x, y + 1);
    const e0 = C === A && C !== D && A !== B ? A : p;
    const e1 = A === B && A !== C && B !== D ? B : p;
    const e2 = D === C && D !== B && C !== A ? C : p;
    const e3 = B === D && B !== A && D !== C ? D : p;
    out[(y * 2) * W + x * 2] = e0; out[(y * 2) * W + x * 2 + 1] = e1;
    out[(y * 2 + 1) * W + x * 2] = e2; out[(y * 2 + 1) * W + x * 2 + 1] = e3;
  }
  return { w: W, h: H, data: out };
}

export class PixelFont {
  constructor() {
    this.fonts = { small: {}, big: {}, huge: {} };
    for (const [ch, rows] of Object.entries(SMALL)) {
      const g = toGlyph(rows);
      this.fonts.small[ch] = g;
      this.fonts.big[ch] = scale2x(g);
    }
    // D: linkerhoeken scherp houden, anders lijkt hij op een O ("WERELOKAART")
    const D = this.fonts.big.D;
    if (D) for (const [x, y] of [[0, 0], [0, D.h - 1]]) D.data[y * D.w + x] = 1;
    for (const [ch, rows] of Object.entries(HUGE)) this.fonts.huge[ch] = toGlyph(rows);
    this.meta = { small: { h: 7, gap: 1 }, big: { h: 14, gap: 2 }, huge: { h: 13, gap: 2 } };
    this.cache = new Map();
  }

  glyph(font, ch) {
    const f = this.fonts[font];
    return f[ch] || f[ch.toUpperCase()] || (font === 'huge' ? this.fonts.big[ch] || this.fonts.big[ch.toUpperCase()] : null) || f['?'] || this.fonts.small['?'];
  }

  /** Gerenderde glyph-canvas voor een stijl. */
  glyphCanvas(font, ch, color, outline, shadow) {
    const key = font + '|' + ch + '|' + color + '|' + outline + '|' + shadow;
    let c = this.cache.get(key);
    if (c) return c;
    const g = this.glyph(font, ch);
    const o = outline ? 1 : 0, s = shadow ? 1 : 0;
    c = document.createElement('canvas');
    c.width = g.w + o * 2; c.height = g.h + o * 2 + s;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(c.width, c.height);
    const colors = Array.isArray(color) ? color.map(hexToRgb) : [hexToRgb(color)];
    const oc = outline ? hexToRgb(outline) : null;
    const put = (x, y, rgb) => { const i = (y * c.width + x) * 4; img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255; };
    const on = (x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h && g.data[y * g.w + x];
    if (outline) {
      for (let y = -1; y <= g.h + s; y++) for (let x = -1; x <= g.w; x++) {
        if (on(x, y)) continue;
        const near = on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) || on(x - 1, y - 1) || on(x + 1, y - 1) || on(x - 1, y + 1) || on(x + 1, y + 1) || (s && (on(x, y - 2) || on(x - 1, y - 2) || on(x + 1, y - 2)));
        if (near) put(x + o, y + o, oc);
      }
    }
    for (let y = 0; y < g.h; y++) {
      const rgb = colors[Math.min(colors.length - 1, Math.floor((y / g.h) * colors.length))];
      for (let x = 0; x < g.w; x++) if (on(x, y)) put(x + o, y + o, rgb);
    }
    ctx.putImageData(img, 0, 0);
    this.cache.set(key, c);
    return c;
  }

  measure(text, { font = 'small', scale = 1, outline = true } = {}) {
    const gap = this.meta[font].gap;
    let w = 0;
    for (const ch of String(text)) w += this.glyph(font, ch).w + gap;
    return Math.max(0, (w - gap + (outline ? 2 : 0)) * scale);
  }

  height(font = 'small', scale = 1) { return (this.meta[font].h + 2) * scale; }

  /**
   * Teken tekst. opts: font, color (hex of [hex..] verloop), outline, shadow,
   * align ('left'|'center'|'right'), scale, alpha.
   */
  draw(ctx, text, x, y, opts = {}) {
    const font = opts.font || 'small';
    const scale = opts.scale || 1;
    const outline = opts.outline === undefined ? OUTLINE : opts.outline;
    const shadow = opts.shadow ?? !!outline;
    const color = opts.color || '#fff8ec';
    const colorKey = Array.isArray(color) ? color.join(',') : color;
    text = String(text);
    const w = this.measure(text, { font, scale, outline: !!outline });
    let cx = Math.round(opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x);
    const cy = Math.round(y);
    const gap = this.meta[font].gap;
    if (opts.alpha != null) { ctx.save(); ctx.globalAlpha = opts.alpha; }
    for (const ch of text) {
      const g = this.glyph(font, ch);
      if (ch !== ' ') {
        const c = this.glyphCanvas(font, ch, Array.isArray(color) ? color : colorKey, outline, shadow);
        ctx.drawImage(c, cx, cy, c.width * scale, c.height * scale);
      }
      cx += (g.w + gap) * scale;
    }
    if (opts.alpha != null) ctx.restore();
    return w;
  }

  /** Breek tekst af op woorden binnen maxWidth. */
  wrap(text, maxWidth, opts = {}) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (this.measure(t, opts) > maxWidth && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
}

const rgbCache = new Map();
function hexToRgb(h) {
  let v = rgbCache.get(h);
  if (v) return v;
  const s = h.replace('#', '');
  v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  rgbCache.set(h, v);
  return v;
}
