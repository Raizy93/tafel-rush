// ---------------------------------------------------------------------------
// Effect-sprites: munt, zwaard-slash (normaal/kritiek/ultra), impact-spark,
// rookwolk (poof), stofwolkje, ster-glinstering, combo-vlam.
// ---------------------------------------------------------------------------
import { Img, rampPick } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';

// --- Munt (12x12, 6 frames draaiend) -------------------------------------------
export function buildCoin() {
  const frames = [];
  const widths = [5, 4, 2.6, 0.9, 2.6, 4];
  widths.forEach((rw, i) => {
    const L = new Img(12, 12);
    const cx = 5.5, cy = 5.5;
    if (rw < 1.2) {
      L.rect(5, 1, 2, 10, P.gold[1]); L.vline(5, 1, 10, P.gold[2]);
    } else {
      L.shadedEllipse(cx, cy, rw, 5, P.gold, { light: [-0.7, -0.7, 0.4], bias: 0.05 });
      if (rw > 3) {
        // ingeslagen ster/teken
        L.vline(5, 3, 8, P.gold[1]); L.set(6, 3, P.gold[3]);
        L.set(4, 4, P.gold[3]);
      }
      L.set(Math.round(cx - rw * 0.5), 3, P.gold[3]);
    }
    frames.push(L.outline(OUTLINE));
  });
  return frames;
}

// --- Slash-boog (48x40, 5 frames) ------------------------------------------------
export function buildSlash(ramp, size = 1) {
  const frames = [];
  const W = 48, H = 40;
  const N = 5;
  for (let f = 0; f < N; f++) {
    const L = new Img(W, H);
    const t = f / (N - 1);
    const cx = 16, cy = 20;
    const R = (15 + t * 5) * size;
    const thick = (f === 0 ? 4 : f === 1 ? 9 : f === 2 ? 10 : f === 3 ? 6 : 3) * size;
    const a0 = -1.25 + t * 0.4, a1 = 1.15 + t * 0.2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - cx) / 1.25, dy = y - cy;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      if (a < a0 || a > a1) continue;
      // dikte neemt af naar de uiteinden (maanvorm)
      const u = (a - a0) / (a1 - a0);
      const th = thick * Math.sin(u * Math.PI);
      const d = R - r;
      if (d < 0 || d > th) continue;
      const v = 1 - d / Math.max(1, th); // buitenrand het felst
      L.set(x, y, rampPick(ramp, v * (f >= 3 ? 0.7 : 1), x, y));
    }
    frames.push(L);
  }
  return frames;
}

// --- Impact-spark (24x24, 4 frames) ----------------------------------------------
export function buildSpark(ramp) {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const L = new Img(24, 24);
    const c = 11.5;
    const len = [5, 10, 11, 8][f];
    const inner = [0, 2, 5, 7][f];
    const rays = 8;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
      const l = i % 2 ? len * 0.6 : len;
      for (let r = inner; r <= l; r++) {
        const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
        L.set(Math.round(x), Math.round(y), r > l - 2 ? ramp[1] : ramp[ramp.length - 1]);
      }
    }
    if (f < 2) L.disc(c, c, f === 0 ? 4 : 3, ramp[ramp.length - 1]);
    frames.push(L);
  }
  return frames;
}

// --- Poof (rookwolk bij verslagen vijand) 32x32, 6 frames -------------------------
export function buildPoof() {
  const frames = [];
  const ramp = ['#6a6488', '#a29cc0', '#dcd8f0', '#ffffff'];
  const puffs = [[0, 0, 1], [-7, 3, 0.75], [7, 2, 0.8], [-3, -6, 0.7], [5, -5, 0.65], [0, 7, 0.6]];
  for (let f = 0; f < 6; f++) {
    const L = new Img(32, 32);
    const t = f / 5;
    for (const [dx, dy, s] of puffs) {
      const r = (3 + t * 4) * s * (f === 5 ? 0.7 : 1);
      const k = 1 + t * 0.45;
      if (f >= 4 && s < 0.7) continue;
      L.shadedEllipse(16 + dx * k, 16 + dy * k - t * 3, r, r, ramp, { bias: 0.1 - t * 0.2 });
    }
    if (f >= 3) {
      // uitdunnen: gaten prikken
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (((x + y * 3) % (f === 3 ? 7 : f === 4 ? 4 : 2)) === 0) L.clear(x, y);
    }
    frames.push(f < 3 ? L.outline('#3a3456') : L);
  }
  return frames;
}

// --- Stofwolkje (voeten) 12x10, 4 frames ----------------------------------------
export function buildDust() {
  const frames = [];
  const ramp = ['#a88a6a', '#d8c0a0', '#f4ead8'];
  for (let f = 0; f < 4; f++) {
    const L = new Img(12, 10);
    const r = 1.5 + f * 1.1;
    L.shadedEllipse(4, 7 - f * 0.6, r, r * 0.8, ramp);
    L.shadedEllipse(8, 7.5 - f * 0.4, r * 0.7, r * 0.6, ramp);
    if (f >= 2) for (let y = 0; y < 10; y++) for (let x = 0; x < 12; x++) if ((x + y) % (f === 2 ? 3 : 2) === 0) L.clear(x, y);
    frames.push(L);
  }
  return frames;
}

// --- Glinster-ster 9x9, 4 frames -------------------------------------------------
export function buildTwinkle() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const L = new Img(9, 9);
    const l = [1, 3, 4, 2][f];
    L.hline(4 - l, 4 + l, 4, '#fff1a0'); L.vline(4, 4 - l, 4 + l, '#fff1a0');
    L.set(4, 4, '#ffffff');
    if (f === 2) { L.set(3, 3, '#ffe66a'); L.set(5, 3, '#ffe66a'); L.set(3, 5, '#ffe66a'); L.set(5, 5, '#ffe66a'); }
    frames.push(L);
  }
  return frames;
}

// --- Vlam (combo-icoon / on-fire aura) 16x20, 4 frames ------------------------------
export function buildFlame(ramp = P.fire) {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const L = new Img(16, 20);
    const sway = [0, 1, 0, -1][f];
    const layers = [[ramp[1], 7, 9], [ramp[2], 5, 7], [ramp[3], 3, 5], [ramp[4], 1.6, 3]];
    layers.forEach(([c, rx, ry], i) => {
      const cy = 13 - i * 0.6;
      for (let y = -ry * 2; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
        // druppelvorm: onderkant rond, bovenkant spits
        const yy = y < 0 ? y / (ry * 2) : y / ry;
        const w = y < 0 ? rx * (1 + yy) : rx * Math.sqrt(Math.max(0, 1 - yy * yy));
        const xs = x - sway * (y < 0 ? -yy : 0) * 2;
        if (Math.abs(xs) <= w) L.set(Math.round(8 + x), Math.round(cy + y), c);
      }
    });
    frames.push(L.outline(OUTLINE));
  }
  return frames;
}

// --- Pijl (ranger) 24x8, 2 frames: pijl met gloeiend spoor ------------------------
export function buildArrow(ramp) {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const L = new Img(24, 8);
    // spoor
    for (let x = 0; x < 10; x++) {
      const c = ramp[Math.min(ramp.length - 1, Math.floor((x / 10) * ramp.length))];
      L.set(x, 3 + ((x + f) % 3 === 0 ? -1 : 0), c);
      if (x > 4) L.set(x, 4, c);
    }
    // schacht
    L.hline(6, 18, 4, '#d89a50');
    L.hline(6, 18, 3, '#a0602e');
    // veren
    L.set(6, 2, '#e8483f'); L.set(7, 2, '#ffffff'); L.set(6, 5, '#e8483f'); L.set(7, 5, '#ffffff'); L.set(8, 2, '#e8483f'); L.set(8, 5, '#e8483f');
    // punt
    L.poly([[18, 1], [23, 3.5], [18, 6]], P.steel[2]);
    L.set(19, 3, P.steel[3]); L.set(20, 3, P.steel[3]);
    frames.push(L.outline(OUTLINE));
  }
  return frames;
}

// --- Plasma-schot (tech runner) 16x16, 4 frames: pulserende energiebol -------------
export function buildPlasma(ramp) {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const L = new Img(16, 16);
    const r = [4.2, 4.8, 4.4, 3.9][f];
    // staart
    for (let i = 1; i <= 3; i++) L.disc(8 - i * 2, 8 + (i % 2 ? 1 : -1) * (f % 2), Math.max(0.8, r - i * 1.2), ramp[Math.max(0, ramp.length - 2 - i)]);
    L.disc(8, 8, r, ramp[1]);
    L.disc(8.5, 7.5, r - 1.3, ramp[2]);
    L.disc(9, 7, Math.max(1, r - 2.6), ramp[ramp.length - 1]);
    frames.push(L);
  }
  return frames;
}
