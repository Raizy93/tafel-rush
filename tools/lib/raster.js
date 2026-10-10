// ---------------------------------------------------------------------------
// Tafel Rush – mini raster library for the PixelArt asset pipeline.
//
// Een klein, dependency-vrij "teken-canvas" voor Node.js. Alle sprites,
// sprite sheets, tilesets en achtergronden van de game worden hiermee
// pixel-voor-pixel gegenereerd en als PNG weggeschreven.
// ---------------------------------------------------------------------------
import zlib from 'node:zlib';

/** Parse '#rrggbb' / 'rrggbb' / 'rrggbbaa' naar [r,g,b,a]. */
export function rgba(hex, alpha = 255) {
  if (Array.isArray(hex)) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : alpha;
  return [r, g, b, a];
}

export function mix(c1, c2, t) {
  const a = rgba(c1), b = rgba(c2);
  return [0, 1, 2, 3].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
}

export function hex(c) {
  return '#' + c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
}

// 4x4 Bayer matrix voor ordered dithering (klassieke 16-bit look).
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
export function bayer(x, y) {
  return (BAYER4[y & 3][x & 3] + 0.5) / 16;
}

/** Kies een kleur uit een ramp (donker → licht) met dithering op waarde v (0..1). */
export function rampPick(ramp, v, x, y, dither = true) {
  const n = ramp.length;
  const f = Math.max(0, Math.min(0.9999, v)) * n;
  let i = Math.floor(f);
  const frac = f - i;
  // Alleen in een smalle overgangszone ditheren: strakke banden met een
  // geblokt randje, zoals in klassieke 16-bit sprites.
  if (i < n - 1) {
    if (frac >= 0.7) i++;
    else if (dither && frac > 0.4 && (frac - 0.4) / 0.3 > bayer(x, y)) i++;
  }
  return ramp[Math.min(n - 1, i)];
}

let seed = 1234567;
export function srand(s) { seed = s >>> 0 || 1; }
export function rnd() {
  // mulberry32
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
export const rpick = arr => arr[Math.floor(rnd() * arr.length)];

export class Img {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  clone() { const o = new Img(this.w, this.h); o.d.set(this.d); return o; }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) {
    x |= 0; y |= 0;
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }
  alpha(x, y) {
    x |= 0; y |= 0;
    if (!this.inside(x, y)) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }
  set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y) || c == null) return;
    c = rgba(c);
    const i = (y * this.w + x) * 4;
    if (c[3] >= 255) {
      this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255;
    } else if (c[3] > 0) {
      const a = c[3] / 255, ba = this.d[i + 3] / 255;
      const oa = a + ba * (1 - a);
      for (let k = 0; k < 3; k++) {
        this.d[i + k] = Math.round((c[k] * a + this.d[i + k] * ba * (1 - a)) / (oa || 1));
      }
      this.d[i + 3] = Math.round(oa * 255);
    }
  }
  /** Overschrijf (geen blending), ook voor transparant wissen. */
  put(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return;
    c = rgba(c);
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c[3];
  }
  clear(x, y) { this.put(x, y, [0, 0, 0, 0]); }
  fill(c) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.put(x, y, c); return this; }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  hline(x0, x1, y, c) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c); }
  vline(x, y0, y1, c) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c); }
  /** Bresenham-lijn. */
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** Dikke lijn met ronde kwast (straal r). */
  thick(x0, y0, x1, y1, r, c) {
    const len = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
    const steps = Math.ceil(len * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, c);
    }
  }
  disc(cx, cy, r, c) {
    const R = Math.ceil(r) + 1;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const px = Math.round(cx + x), py = Math.round(cy + y);
      const dx = px - cx, dy = py - cy;
      if (dx * dx + dy * dy <= r * r + 0.25) this.set(px, py, c);
    }
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.0) this.set(x, y, c);
      }
  }
  /** Gevulde polygon (scanline, even-odd). pts = [[x,y],...] */
  poly(pts, c) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
    }
  }
  /**
   * Gearceerde "bol" (bol/ellips) met lichtrichting en dithering —
   * de basis voor slimes, rotsen, bladerkruinen, boss-onderdelen …
   * ramp: kleuren donker → licht.
   */
  shadedEllipse(cx, cy, rx, ry, ramp, opt = {}) {
    const L = norm3(opt.light || [-0.55, -0.75, 0.6]);
    const squish = opt.squish ?? 1;
    const bias = opt.bias ?? -0.12;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d > 1.0) continue;
        if (opt.clip && !opt.clip(x, y)) continue;
        const nz = Math.sqrt(Math.max(0, 1 - d)) * squish;
        const n = norm3([nx, ny, nz]);
        let v = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
        v = v * 0.5 + 0.5 + bias; // 0..1
        if (opt.rim && d > 0.82 && ny > 0.2) v -= 0.12;
        this.set(x, y, rampPick(ramp, v, x, y, opt.dither !== false));
      }
  }
  /** Gearceerde afgeronde rechthoek (superellips) – voor stenen blokken. */
  shadedBlock(x0, y0, w, h, ramp, opt = {}) {
    const p = opt.power ?? 4;
    const cx = x0 + w / 2 - 0.5, cy = y0 + h / 2 - 0.5;
    const rx = w / 2, ry = h / 2;
    const L = norm3(opt.light || [-0.55, -0.75, 0.6]);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      const d = Math.pow(Math.abs(nx), p) + Math.pow(Math.abs(ny), p);
      if (d > 1) continue;
      const gx = Math.sign(nx) * Math.pow(Math.abs(nx), p - 1);
      const gy = Math.sign(ny) * Math.pow(Math.abs(ny), p - 1);
      const nz = Math.max(0.15, 1 - d) * 1.4;
      const n = norm3([gx, gy, nz]);
      let v = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
      v = v * 0.5 + 0.5 + (opt.bias ?? -0.1);
      this.set(x, y, rampPick(ramp, v, x, y, opt.dither !== false));
    }
  }
  /** Teken een karakter-matrix: rows = ['..ab', ...], map = {a:'#fff'} */
  pattern(rows, map, dx, dy, opt = {}) {
    const h = rows.length;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const c = map[ch];
        if (c == null) continue;
        const px = opt.flip ? dx + (row.length - 1 - x) : dx + x;
        const shear = opt.shear ? Math.round(opt.shear * (h - 1 - y)) : 0;
        this.set(px + shear, dy + y, c);
      }
    }
  }
  blit(src, dx, dy, opt = {}) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.get(opt.flipX ? src.w - 1 - x : x, opt.flipY ? src.h - 1 - y : y);
      if (c[3] === 0) continue;
      if (opt.alpha != null) c[3] = Math.round(c[3] * opt.alpha);
      if (opt.tint) { const t = rgba(opt.tint); c[0] = t[0]; c[1] = t[1]; c[2] = t[2]; }
      this.set(dx + x, dy + y, c);
    }
  }
  sub(x, y, w, h) {
    const o = new Img(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.put(i, j, this.get(x + i, y + j));
    return o;
  }
  /**
   * Voeg een 1px outline toe rond alle niet-transparante pixels.
   * diagonal=false geeft de typische "zachte" pixelart-outline.
   */
  outline(color, opt = {}) {
    const c = rgba(color);
    const src = this.clone();
    const diag = opt.diagonal ?? false;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (src.alpha(x, y) > 0) continue;
      let hit = src.alpha(x - 1, y) > 100 || src.alpha(x + 1, y) > 100 || src.alpha(x, y - 1) > 100 || src.alpha(x, y + 1) > 100;
      if (!hit && diag) hit = src.alpha(x - 1, y - 1) > 100 || src.alpha(x + 1, y - 1) > 100 || src.alpha(x - 1, y + 1) > 100 || src.alpha(x + 1, y + 1) > 100;
      if (hit) {
        if (opt.selective) {
          // selout: outline neemt een donkere variant van de buurkleur
          const n = [src.get(x - 1, y), src.get(x + 1, y), src.get(x, y - 1), src.get(x, y + 1)].find(p => p[3] > 100);
          this.put(x, y, mix(n, c, 0.75));
        } else this.put(x, y, c);
      }
    }
    return this;
  }
  /** Vervang kleuren via een map {'#aabbcc': '#ddeeff'} (palette swap). */
  swap(map) {
    const m = new Map(Object.entries(map).map(([k, v]) => [hex(rgba(k)), rgba(v)]));
    for (let i = 0; i < this.d.length; i += 4) {
      if (this.d[i + 3] === 0) continue;
      const k = hex([this.d[i], this.d[i + 1], this.d[i + 2]]);
      const v = m.get(k);
      if (v) { this.d[i] = v[0]; this.d[i + 1] = v[1]; this.d[i + 2] = v[2]; }
    }
    return this;
  }
  /** Schaal (nearest neighbour) – alleen voor previews. */
  scaled(k) {
    const o = new Img(this.w * k, this.h * k);
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.put(x, y, this.get((x / k) | 0, (y / k) | 0));
    return o;
  }
}

export function norm3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

// ---------------------------------------------------------------------------
// PNG encoder (RGBA, 8-bit, zonder filters behalve 'none') – geen dependencies.
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePNG(img) {
  const { w, h, d } = img;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(d.buffer, d.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Bouw een sprite sheet uit rijen frames: rows = [[Img, Img…], …] */
export function sheet(rows, fw, fh) {
  const cols = Math.max(...rows.map(r => r.length));
  const out = new Img(cols * fw, rows.length * fh);
  rows.forEach((r, j) => r.forEach((f, i) => out.blit(f, i * fw, j * fh)));
  return out;
}

/** Eenvoudige shelf-packer voor een atlas met losse sprites. */
export function pack(items, maxW = 512, pad = 1) {
  // items: [{name, img}]
  const sorted = [...items].sort((a, b) => b.img.h - a.img.h);
  let x = pad, y = pad, rowH = 0, W = 0;
  const rects = {};
  for (const it of sorted) {
    if (x + it.img.w + pad > maxW) { x = pad; y += rowH + pad; rowH = 0; }
    rects[it.name] = { x, y, w: it.img.w, h: it.img.h };
    x += it.img.w + pad; rowH = Math.max(rowH, it.img.h); W = Math.max(W, x);
  }
  const H = y + rowH + pad;
  const out = new Img(W, H);
  for (const it of sorted) { const r = rects[it.name]; out.blit(it.img, r.x, r.y); }
  return { img: out, rects };
}
