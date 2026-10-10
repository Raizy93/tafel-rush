// ---------------------------------------------------------------------------
// Greenwood – wereld-assets.
// Per bioom (fase) worden parallax-lagen gemaakt die naadloos horizontaal
// tegelen, plus een tegelset voor de grond en een gedeelde props-atlas.
//
//   sky   480x270   (statisch, verloop + zon/maan)
//   clouds 960x140  (langzaam + drift)
//   far   960x270   (bergen / heuvels)
//   mid   960x270   (boomrij / ruïnes)
//   near  960x270   (grote bomen / zuilen)
//   ground tiles 32x48 (top op y=222 in beeld)
// ---------------------------------------------------------------------------
import { Img, rampPick, bayer, srand, rnd, mix, hex } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';

export const LAYER_W = 960;
export const VIEW_W = 480, VIEW_H = 270;
export const TILE_W = 32, TILE_H = 48;

// --- Biomen --------------------------------------------------------------------
export const BIOMES = {
  edge: {
    sky: ['#3d7fd6', '#5aa6ea', '#8fd0f4', '#c8ecfa', '#eefaf4'],
    sun: { x: 360, y: 58, r: 16, color: ['#ffe9a0', '#fff6d0', '#ffffff'] },
    cloud: ['#9fb8d8', '#d4e4f4', '#ffffff'],
    far: [['#5f7fb8', '#7a9ccc', '#9cbcdc'], ['#4f8a7a', '#64a07e', '#82b88a']],
    leaf: ['#1d4a34', '#2c6e3e', '#46984a', '#7cc45a', '#bde67a'],
    leafMid: ['#2f6a5a', '#3e8463', '#5a9e6c', '#80b878'],
    trunk: P.bark,
    grass: ['#2a6a2e', '#3f9a3a', '#6cc44a', '#a8e46a'],
    dirt: ['#3a2418', '#5e3a26', '#7e5232', '#a0703f'],
  },
  deep: {
    sky: ['#14402e', '#1f5a3c', '#2f7a4a', '#5aa45e', '#9cd27a'],
    sun: null,
    cloud: null,
    far: [['#1c4a3c', '#22584a', '#2c6a54'], ['#163c30', '#1d4d3c', '#255e46']],
    leaf: ['#0f2e22', '#18452e', '#25633a', '#3f8a44', '#7ab85a'],
    leafMid: ['#143a2e', '#1d5038', '#2a6a44', '#3f8550'],
    trunk: ['#160f14', '#2c1f20', '#4a3329', '#6a4c3a'],
    grass: ['#1d4e2a', '#2c7434', '#4ea03e', '#86cc58'],
    dirt: ['#2a1a14', '#46301f', '#5e4128', '#7a5634'],
  },
  ruins: {
    sky: ['#4a3a8a', '#8a5aa0', '#e07a7a', '#f6b07a', '#ffe0a0'],
    sun: { x: 300, y: 112, r: 22, color: ['#ff9a5a', '#ffc87a', '#fff0c0'] },
    cloud: ['#b0688a', '#e8a0a0', '#ffd6b8'],
    far: [['#5a4a8a', '#6a5a9a', '#7e6eaa'], ['#4a3c6e', '#5a4a7e', '#6a5a8e']],
    leaf: ['#1c3a2a', '#2c5a34', '#4a7e3c', '#7aa64a', '#b8d070'],
    leafMid: ['#3a3a5a', '#4a4e6a', '#5e647a', '#78807e'],
    trunk: P.bark,
    grass: ['#2e5a2e', '#477e36', '#6ea444', '#a4cc62'],
    dirt: ['#3a2a28', '#5a4038', '#7a5a4a', '#9a7860'],
  },
  dark: {
    sky: ['#07061a', '#0f0c2a', '#1c1640', '#2e2258', '#4a2e6a'],
    sun: { x: 380, y: 52, r: 14, color: ['#c8d0f0', '#e8ecff', '#ffffff'], moon: true },
    cloud: ['#1c1838', '#2c2650', '#3e3668'],
    far: [['#141232', '#1c1a40', '#24224e'], ['#0e0c26', '#151332', '#1c1a3e']],
    leaf: ['#0c0c1e', '#16163a', '#22265a', '#343c7a', '#5060a0'],
    leafMid: ['#0e0e24', '#161a36', '#202848', '#2c365a'],
    trunk: ['#0a0810', '#16121e', '#241c2e', '#342a40'],
    grass: ['#14223a', '#1e3450', '#2e4e6a', '#4a7488'],
    dirt: ['#120c18', '#1e1626', '#2c2036', '#3c2c48'],
  },
};

// Hulp: teken iets 3x zodat het naadloos tegelt.
export function wrap(w, fn, x) { fn(x); fn(x - w); fn(x + w); }

// --- Lucht -------------------------------------------------------------------------
function skyLayer(b) {
  const L = new Img(VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y++) {
    const v = Math.min(0.999, Math.pow(y / 210, 1.15));
    for (let x = 0; x < VIEW_W; x++) L.put(x, y, rampPick(b.sky, v, x, y));
  }
  if (b.sun) {
    const s = b.sun;
    // halo
    for (let r = s.r + 14; r > s.r; r -= 4) L.ellipse(s.x, s.y, r, r, [...rgb(s.color[0]), 26]);
    L.shadedEllipse(s.x, s.y, s.r, s.r, s.color, { light: [-0.3, -0.4, 0.9], bias: 0.15 });
    if (s.moon) {
      // kraters
      L.disc(s.x + 4, s.y - 3, 3, '#aeb6dc'); L.disc(s.x - 5, s.y + 5, 2, '#aeb6dc'); L.disc(s.x + 6, s.y + 7, 1.5, '#b8c0e4');
    }
  }
  if (b === BIOMES.dark) {
    srand(42);
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(rnd() * VIEW_W), y = Math.floor(rnd() * 160);
      const big = rnd() < 0.12;
      L.put(x, y, big ? '#ffffff' : rnd() < 0.5 ? '#9aa4d8' : '#c8d0f0');
      if (big) { L.put(x + 1, y, '#6a74b0'); L.put(x - 1, y, '#6a74b0'); L.put(x, y + 1, '#6a74b0'); L.put(x, y - 1, '#6a74b0'); }
    }
  }
  if (b === BIOMES.deep) {
    // bladerdak bovenin de lucht
    srand(7);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * VIEW_W, y = rnd() * 40 - 10, r = 12 + rnd() * 18;
      L.shadedEllipse(x, y, r * 1.3, r, b.leaf.slice(0, 3), { bias: -0.05 });
    }
  }
  return L;
}

export function rgb(h) { const c = h.replace('#', ''); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }

// --- Wolken ------------------------------------------------------------------------
function cloudLayer(b, seedN) {
  const L = new Img(LAYER_W, 140);
  if (!b.cloud) return L;
  srand(seedN);
  for (let i = 0; i < 7; i++) {
    const cx = 60 + i * 135 + rnd() * 40, cy = 30 + rnd() * 70, s = 0.6 + rnd() * 0.7;
    wrap(LAYER_W, x => {
      const blobs = [[0, 0, 22], [-20, 6, 15], [22, 5, 16], [-8, -9, 14], [10, -7, 13], [36, 9, 10], [-34, 10, 9]];
      for (const [dx, dy, r] of blobs) L.shadedEllipse(x + dx * s, cy + dy * s, r * s * 1.2, r * s * 0.8, b.cloud, { light: [-0.3, -0.9, 0.4], bias: 0.1, clip: (px, py) => py < cy + 10 * s });
    }, cx);
  }
  return L;
}

// --- Heuvels / bergen (periodiek hoogteveld) -----------------------------------------
export function ridge(L, baseY, amp, freqs, ramp, seedN, opt = {}) {
  srand(seedN);
  const phases = freqs.map(() => rnd() * Math.PI * 2);
  const W = L.w;
  for (let x = 0; x < W; x++) {
    let h = 0;
    freqs.forEach((f, i) => { h += Math.sin((x / W) * Math.PI * 2 * f + phases[i]) / (i + 1); });
    if (opt.peaky) h = Math.abs(h) * 1.4 - 0.4;
    const top = Math.round(baseY - h * amp);
    for (let y = top; y < L.h; y++) {
      const d = (y - top) / (L.h - top);
      let c = rampPick(ramp, 1 - Math.min(0.99, d * 2.2), x, y);
      if (y === top) c = ramp[ramp.length - 1];
      L.put(x, y, c);
    }
    // sneeuw/licht op toppen
    if (opt.snow && h > 0.75) for (let k = 0; k < 3; k++) L.put(x, top + k, k === 0 ? '#ffffff' : '#d8e4f4');
  }
}

function farLayer(b, seedN) {
  const L = new Img(LAYER_W, VIEW_H);
  if (b === BIOMES.deep) {
    // verre stammen in de mist
    srand(seedN);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * LAYER_W, w = 6 + rnd() * 10;
      wrap(LAYER_W, xx => L.rect(Math.round(xx), 0, Math.round(w), VIEW_H, b.far[0][rnd() < 0.5 ? 1 : 2]), x);
    }
    ridge(L, 205, 10, [3, 7], b.far[1], seedN + 1);
    return L;
  }
  ridge(L, 165, 38, [2, 5, 11], b.far[0], seedN, { peaky: b !== BIOMES.dark, snow: b === BIOMES.edge });
  if (b === BIOMES.ruins) {
    // ruïne-torens aan de horizon
    srand(seedN + 9);
    for (let i = 0; i < 4; i++) {
      const x = 80 + i * 240 + rnd() * 60, h = 40 + rnd() * 40, w = 14 + rnd() * 8;
      wrap(LAYER_W, xx => {
        L.rect(Math.round(xx), Math.round(190 - h), Math.round(w), Math.round(h + 30), b.far[1][1]);
        for (let k = 0; k < w; k += 4) L.rect(Math.round(xx + k), Math.round(190 - h - 4), 2, 4, b.far[1][1]);
        L.rect(Math.round(xx + w / 2 - 1), Math.round(190 - h + 10), 3, 5, b.far[0][0]);
      }, x);
    }
  }
  ridge(L, 200, 18, [3, 8], b.far[1], seedN + 2);
  return L;
}

// --- Boomkruin (cluster gearceerde bollen) -------------------------------------------
export function canopy(L, cx, cy, size, ramp, seedN, opt = {}) {
  srand(seedN);
  const n = opt.n || 7;
  const blobs = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * size * 0.55;
    blobs.push([cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 0.7, size * (0.45 + rnd() * 0.3)]);
  }
  blobs.sort((p, q) => q[1] - p[1]); // onderste eerst
  for (const [x, y, r] of blobs) L.shadedEllipse(x, y, r * 1.15, r, ramp, { light: [-0.5, -0.8, 0.45] });
  // bladpuntjes langs de bovenrand
  for (let i = 0; i < size * 3; i++) {
    const x = Math.round(cx - size * 1.4 + rnd() * size * 2.8);
    let y = Math.round(cy - size * 1.2);
    while (y < cy + size && L.alpha(x, y) === 0) y++;
    if (y < cy + size && rnd() < 0.6) L.set(x, y - 1, ramp[ramp.length - 2]);
  }
}

export function trunk(L, x, topY, bottomY, w, ramp, opt = {}) {
  for (let y = topY; y <= bottomY; y++) {
    const flare = y > bottomY - 8 ? Math.round((y - (bottomY - 8)) * 0.6) : 0;
    for (let i = -flare; i < w + flare; i++) {
      const u = (i + flare) / (w + flare * 2);
      let v = 0.75 - Math.abs(u - 0.35) * 1.4;
      if ((i * 7 + Math.floor(y / 3) * 3) % 11 === 0) v -= 0.25; // schorsgroeven
      L.set(x + i, y, rampPick(ramp, v, x + i, y));
    }
  }
  if (opt.knot) L.ellipse(x + w / 2, opt.knot, 2, 3, ramp[0]);
}

function midLayer(b, seedN) {
  const L = new Img(LAYER_W, VIEW_H);
  srand(seedN);
  if (b === BIOMES.ruins) {
    // zuilenrij met bogen + wat bomen
    for (let i = 0; i < 8; i++) {
      const x = i * 120 + 20;
      wrap(LAYER_W, xx => {
        const h = 70 + ((i * 37) % 30);
        const broken = i % 3 === 1;
        const top = 225 - h + (broken ? 25 : 0);
        L.shadedBlock(Math.round(xx), top, 14, 225 - top, b.leafMid, { power: 6 });
        L.rect(Math.round(xx) - 3, top, 20, 5, b.leafMid[2]); L.hline(Math.round(xx) - 3, Math.round(xx) + 16, top, b.leafMid[3]);
        if (!broken && i % 3 === 0) {
          // boog naar de volgende zuil
          for (let a = 0; a <= 40; a++) {
            const t = a / 40;
            const ax = xx + 14 + t * 106, ay = top + 2 - Math.sin(t * Math.PI) * 26;
            L.rect(Math.round(ax), Math.round(ay), 2, 7, b.leafMid[1]);
            L.set(Math.round(ax), Math.round(ay), b.leafMid[3]);
          }
        }
      }, x);
    }
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 190 + rnd() * 40;
      wrap(LAYER_W, xx => { trunk(L, Math.round(xx), 170, 230, 6, b.trunk); canopy(L, xx + 3, 160, 26, b.leaf.slice(0, 4), seedN + i); }, x);
    }
    return L;
  }
  // boomrij
  const count = b === BIOMES.edge ? 9 : 13;
  for (let i = 0; i < count; i++) {
    const x = (i / count) * LAYER_W + rnd() * 40;
    const size = (b === BIOMES.edge ? 26 : 30) + rnd() * 12;
    const cy = 180 - rnd() * 30 - (b === BIOMES.deep ? 30 : 0);
    const pine = b === BIOMES.edge && rnd() < 0.35;
    const seedT = seedN * 31 + i;
    wrap(LAYER_W, xx => {
      trunk(L, Math.round(xx - 3), Math.round(cy), 232, 7, b.trunk.map(c => mix(c, b.leafMid[0], 0.45)));
      if (pine) pineTree(L, xx, cy + 30, size * 1.6, b.leafMid);
      else canopy(L, xx, cy, size, b.leafMid, seedT);
    }, x);
  }
  // struiken-band onderaan
  for (let x = 0; x < LAYER_W; x += 18) {
    wrap(LAYER_W, xx => L.shadedEllipse(xx, 228, 16, 12, b.leafMid.slice(0, 3)), x + rnd() * 10);
  }
  return L;
}

export function pineTree(L, cx, baseY, h, ramp) {
  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const ty = baseY - t * h * 0.22;
    const w = h * 0.38 * (1 - t / (tiers + 0.5));
    const pts = [[cx - w, ty], [cx, ty - h * 0.36], [cx + w, ty]];
    for (let y = Math.floor(ty - h * 0.36); y <= ty; y++) {
      const k = (y - (ty - h * 0.36)) / (h * 0.36);
      const ww = w * k;
      for (let x = Math.floor(cx - ww); x <= cx + ww; x++) {
        const u = (x - (cx - ww)) / (ww * 2 + 0.001);
        L.set(x, y, rampPick(ramp, 0.85 - u * 0.6 - (y === Math.floor(ty) ? 0.2 : 0), x, y));
      }
    }
    void pts;
  }
}

function nearLayer(b, seedN) {
  const L = new Img(LAYER_W, VIEW_H);
  srand(seedN);
  if (b === BIOMES.ruins) {
    for (let i = 0; i < 4; i++) {
      const x = 100 + i * 240 + rnd() * 50;
      wrap(LAYER_W, xx => {
        const top = 95 + Math.round(rnd() * 30);
        L.shadedBlock(Math.round(xx), top, 24, 226 - top, P.stone.slice(0, 4), { power: 8 });
        // horizontale voegen
        for (let y = top + 14; y < 226; y += 14) L.hline(Math.round(xx) + 1, Math.round(xx) + 22, y, P.stone[0]);
        L.shadedBlock(Math.round(xx) - 5, top - 8, 34, 10, P.stone, { power: 8 });
        // klimop
        for (let k = 0; k < 40; k++) {
          const vx = Math.round(xx + rnd() * 24), vy = Math.round(top + rnd() * (226 - top) * 0.6);
          L.set(vx, vy, rnd() < 0.5 ? P.moss[2] : P.moss[1]); L.set(vx, vy + 1, P.moss[1]);
        }
      }, x);
    }
    return L;
  }
  const dark = b === BIOMES.dark;
  const n = b === BIOMES.edge ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * LAYER_W + rnd() * 80;
    const w = 14 + Math.round(rnd() * 8);
    const cy = 50 + rnd() * 40;
    wrap(LAYER_W, xx => {
      trunk(L, Math.round(xx), Math.round(cy), 228, w, b.trunk, { knot: cy + 60 });
      if (dark) {
        // kale, kronkelige takken
        L.thick(xx + w / 2, cy + 20, xx - 26, cy - 10, 2.2, b.trunk[2]);
        L.thick(xx - 26, cy - 10, xx - 36, cy - 26, 1.4, b.trunk[2]);
        L.thick(xx + w / 2, cy + 10, xx + w + 30, cy - 18, 2.2, b.trunk[2]);
        L.thick(xx + w + 30, cy - 18, xx + w + 34, cy - 34, 1.2, b.trunk[2]);
        canopy(L, xx + w / 2, cy - 8, 30, b.leaf.slice(0, 3), seedN * 7 + i, { n: 5 });
      } else {
        canopy(L, xx + w / 2, cy - 4, 44, b.leaf, seedN * 7 + i, { n: 9 });
      }
    }, x);
  }
  return L;
}

// --- Grondtegels --------------------------------------------------------------------
function groundTile(b, variant, opt = {}) {
  const L = new Img(TILE_W, TILE_H);
  srand(1000 + variant * 17 + (opt.seed || 0));
  const top = 4;
  const ruins = b === BIOMES.ruins;
  // aarde
  for (let y = top + 5; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
    const v = 0.85 - (y - top) / TILE_H * 0.9;
    L.put(x, y, rampPick(b.dirt, v, x, y));
  }
  if (ruins) {
    // kasseien-pad
    for (let row = 0; row < 3; row++) {
      const y0 = top + 4 + row * 9;
      const off = row % 2 ? 8 : 0;
      for (let k = -1; k < 3; k++) {
        const x0 = k * 16 + off;
        const s = P.stone.slice(1, 5);
        for (let y = y0; y < y0 + 8; y++) for (let x = x0; x < x0 + 15; x++) {
          if (x < 0 || x >= TILE_W) continue;
          const edge = y === y0 || x === x0;
          const v = edge ? 0.95 : 0.55 - (y - y0) * 0.04 - (row * 0.12);
          L.put(x, y, rampPick(s, v, x, y));
        }
      }
    }
  }
  // stenen en wortels
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(rnd() * 28) + 2, y = top + 14 + Math.floor(rnd() * 26);
    if (rnd() < 0.6) {
      L.put(x, y, b.dirt[3]); L.put(x + 1, y, b.dirt[3]); L.put(x, y + 1, b.dirt[1]); L.put(x + 1, y + 1, b.dirt[0]);
    }
  }
  // grasrand met sprietjes
  for (let x = 0; x < TILE_W; x++) {
    const h = 4 + ((x * 7 + variant * 3) % 5 === 0 ? 2 : 0) + (Math.sin(x * 0.9 + variant) > 0.6 ? 1 : 0);
    for (let y = top + 6 - h; y < top + 7 + ((x + variant) % 3 === 0 ? 2 : 0); y++) {
      const v = 1 - (y - (top + 6 - h)) / (h + 3);
      L.put(x, y, rampPick(b.grass, v, x, y));
    }
  }
  // grassprieten bovenop
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(rnd() * 31);
    L.put(x, top - 1, b.grass[3]); L.put(x, top, b.grass[2]);
    if (rnd() < 0.4) L.put(x + 1, top - 2, b.grass[3]);
  }
  if (opt.flowers && b !== BIOMES.dark) {
    for (let i = 0; i < 2; i++) {
      const x = 4 + Math.floor(rnd() * 24);
      const col = ['#ff6a6a', '#ffe14a', '#ffffff', '#c890ff'][Math.floor(rnd() * 4)];
      L.put(x, top - 1, col); L.put(x, top, b.grass[1]);
    }
  }
  return L;
}

function bridgeTiles(b) {
  // 3 tegels: oever-links, brug, oever-rechts. Water onder de planken.
  const tiles = [];
  const water = P.water;
  for (let kind = 0; kind < 3; kind++) {
    const L = new Img(TILE_W, TILE_H);
    // water + diepte
    for (let y = 14; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      const v = 0.75 - (y - 14) / 40;
      L.put(x, y, rampPick(dark(b) ? water.map(c => mix(c, '#100c28', 0.5)) : water, v, x, y));
      if ((x + y * 5) % 23 === 0 && y > 20) L.put(x, y, water[3]);
    }
    if (kind !== 1) {
      // oever: grond aan één kant, aflopend
      const g = groundTile(b, 2);
      for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
        const edgeX = kind === 0 ? 20 - Math.max(0, y - 10) * 0.6 : 12 + Math.max(0, y - 10) * 0.6;
        const inside = kind === 0 ? x < edgeX : x >= edgeX;
        if (inside) L.put(x, y, g.get(x, y));
      }
    }
    // planken
    for (let x = 0; x < TILE_W; x++) {
      for (let y = 3; y < 9; y++) {
        const v = y === 3 ? 0.95 : y === 8 ? 0.1 : 0.55;
        L.put(x, y, x % 8 === 7 ? P.wood[0] : rampPick(P.wood, v, x, y));
      }
    }
    // paal
    if (kind === 1) { L.rect(14, 9, 4, 30, P.wood[1]); L.vline(14, 9, 38, P.wood[2]); }
    tiles.push(L);
  }
  return tiles;
}
const dark = b => b === BIOMES.dark;

export function buildGroundSheet(b) {
  const tiles = [];
  for (let v = 0; v < 4; v++) tiles.push(groundTile(b, v, { flowers: v % 2 === 1 }));
  tiles.push(...bridgeTiles(b));
  const out = new Img(TILE_W * tiles.length, TILE_H);
  tiles.forEach((t, i) => out.blit(t, i * TILE_W, 0));
  return { img: out, count: tiles.length, bridge: [4, 5, 6] };
}

export function buildBiomeLayers(key, seedBase) {
  const b = BIOMES[key];
  return {
    sky: skyLayer(b),
    clouds: cloudLayer(b, seedBase + 1),
    far: farLayer(b, seedBase + 2),
    mid: midLayer(b, seedBase + 3),
    near: nearLayer(b, seedBase + 4),
  };
}

// --- Props ------------------------------------------------------------------------
export function buildProps() {
  const items = [];
  const add = (name, img, outline = true) => items.push({ name, img: outline ? img.outline(OUTLINE) : img });

  for (const [name, ramp] of [['bush', BIOMES.edge.leaf], ['bush_deep', BIOMES.deep.leaf], ['bush_dark', BIOMES.dark.leaf], ['bush_ruins', BIOMES.ruins.leaf]]) {
    const L = new Img(40, 24);
    canopy(L, 20, 15, 11, ramp, name.length * 13, { n: 6 });
    for (let x = 0; x < 40; x++) for (let y = 20; y < 24; y++) L.clear(x, y);
    add(name, L);
  }
  // bloemen
  for (const [i, cols] of [[0, ['#ff5a5a', '#ffd23a']], [1, ['#ffffff', '#c890ff']], [2, ['#ffd23a', '#ff8ad8']]]) {
    const L = new Img(16, 12);
    srand(300 + i);
    for (let k = 0; k < 4; k++) {
      const x = 2 + k * 3 + Math.floor(rnd() * 2), h = 4 + Math.floor(rnd() * 5);
      L.vline(x, 11 - h, 11, P.moss[2]);
      const c = cols[k % 2];
      L.set(x, 11 - h, '#ffffff'); L.set(x - 1, 11 - h, c); L.set(x + 1, 11 - h, c); L.set(x, 10 - h, c); L.set(x, 12 - h, c);
    }
    add('flowers' + i, L);
  }
  // rotsen
  for (const [i, w, h] of [[0, 20, 14], [1, 30, 18], [2, 14, 10]]) {
    const L = new Img(w + 2, h + 2);
    L.shadedEllipse(w / 2, h / 2 + 2, w / 2, h / 2, P.stone.slice(0, 4), { clip: (x, y) => y < h + 1 });
    srand(400 + i);
    for (let k = 0; k < w; k++) { const x = Math.floor(rnd() * w), y = 3 + Math.floor(rnd() * 3); if (L.alpha(x, y) && !L.alpha(x, y - 2)) L.set(x, y, P.moss[2]); }
    add('rock' + i, L);
  }
  // varen
  {
    const L = new Img(26, 18);
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.45;
      let x = 13, y = 17;
      for (let s = 0; s < 14; s++) {
        x += Math.cos(a + s * 0.06 * (k < 2 ? -1 : 1)); y += Math.sin(a + s * 0.06 * (k < 2 ? -1 : 1)) * 0.95 + s * 0.05;
        L.set(x, y, P.leaf[3]);
        if (s % 2 === 0 && s > 2) { L.set(x - 1, y + 1, P.leaf[2]); L.set(x + 1, y + 1, P.leaf[2]); }
      }
    }
    add('fern', L);
  }
  // paddenstoeltjes
  {
    const L = new Img(14, 10);
    L.rect(3, 5, 2, 5, P.cream[2]); L.shadedEllipse(4, 4, 4, 3, P.capRed, { clip: (x, y) => y <= 5 }); L.set(3, 2, '#fff');
    L.rect(9, 6, 2, 4, P.cream[2]); L.shadedEllipse(10, 5.5, 3, 2.5, P.capRed, { clip: (x, y) => y <= 6 });
    add('shrooms', L);
  }
  {
    const L = new Img(16, 14);
    const glow = ['#1a6a8a', '#2ab8e0', '#7af0ff', '#e0ffff'];
    L.rect(4, 7, 2, 7, '#a8b8e0'); L.shadedEllipse(5, 6, 5, 4, glow, { clip: (x, y) => y <= 7 });
    L.rect(11, 9, 2, 5, '#a8b8e0'); L.shadedEllipse(12, 8.5, 3.5, 3, glow, { clip: (x, y) => y <= 9 });
    add('glowshrooms', L);
  }
  // boomstronk
  {
    const L = new Img(24, 16);
    trunk(L, 4, 4, 15, 16, P.bark);
    L.ellipse(12, 4, 8, 2.5, P.wood[2]); L.ellipse(12, 4, 5, 1.5, P.wood[3]); L.set(12, 4, P.wood[1]);
    add('stump', L);
  }
  // omgevallen stam
  {
    const L = new Img(48, 14);
    for (let x = 4; x < 44; x++) for (let y = 3; y < 13; y++) L.set(x, y, rampPick(P.bark, 0.9 - (y - 3) / 10 - ((x * 5) % 9 === 0 ? 0.2 : 0), x, y));
    L.ellipse(43, 8, 3, 5, P.wood[2]); L.ellipse(43, 8, 1.5, 3, P.wood[3]);
    for (let x = 8; x < 40; x += 3) L.set(x, 3, P.moss[2]);
    add('log', L);
  }
  // wegwijzer
  {
    const L = new Img(22, 30);
    L.rect(9, 6, 3, 24, P.wood[1]); L.vline(9, 6, 29, P.wood[2]);
    L.poly([[1, 5], [17, 5], [21, 9], [17, 13], [1, 13]], P.wood[2]);
    L.hline(1, 17, 5, P.wood[3]); L.hline(3, 15, 9, P.wood[0]);
    add('sign', L);
  }
  // ruïnes
  {
    const L = new Img(20, 44);
    L.shadedBlock(2, 6, 16, 38, P.stone.slice(0, 4), { power: 8 });
    L.poly([[2, 6], [8, 2], [12, 7], [18, 4], [18, 10], [2, 10]], P.stone[2]);
    for (let y = 16; y < 44; y += 10) L.hline(3, 16, y, P.stone[0]);
    for (let k = 0; k < 14; k++) L.set(3 + (k * 5) % 14, 8 + (k * 7) % 30, P.moss[2]);
    add('pillar', L);
  }
  {
    const L = new Img(64, 52);
    for (const px of [2, 50]) { L.shadedBlock(px, 14, 12, 38, P.stone.slice(0, 4), { power: 8 }); }
    for (let a = 0; a <= 60; a++) {
      const t = a / 60, ax = 6 + t * 50, ay = 16 - Math.sin(t * Math.PI) * 14;
      L.rect(Math.round(ax), Math.round(ay), 3, 6, P.stone[2]); L.set(Math.round(ax), Math.round(ay), P.stone[3]);
    }
    for (let k = 0; k < 30; k++) L.set(4 + (k * 13) % 56, 4 + (k * 7) % 12, P.moss[2]);
    add('arch', L);
  }
  // rune-steen (boss-arena)
  {
    const L = new Img(18, 34);
    L.shadedBlock(1, 2, 16, 32, P.stone.slice(0, 4), { power: 3 });
    L.vline(9, 9, 22, P.rune[2]); L.line(5, 12, 9, 16, P.rune[2]); L.line(13, 18, 9, 22, P.rune[2]); L.set(9, 9, P.rune[3]);
    add('runestone', L);
  }
  // kristal
  {
    const L = new Img(16, 20);
    const c = ['#4a2a8a', '#8a5ae0', '#c8a0ff', '#ffffff'];
    L.poly([[4, 19], [3, 8], [6, 3], [9, 8], [8, 19]], c[1]); L.poly([[6, 3], [9, 8], [8, 19], [6, 19]], c[2]);
    L.poly([[9, 19], [10, 10], [13, 7], [14, 12], [13, 19]], c[1]); L.line(6, 4, 6, 12, c[3]);
    add('crystal', L);
  }
  // lantaarn op paal
  {
    const L = new Img(12, 36);
    L.rect(5, 10, 2, 26, P.wood[1]);
    L.rect(2, 2, 8, 10, '#2a2030'); L.rect(3, 4, 6, 6, '#ffd060'); L.rect(4, 5, 4, 4, '#fff6c0');
    L.hline(1, 10, 1, '#4a3a50'); L.hline(2, 9, 12, '#4a3a50');
    add('lantern', L);
  }
  // voorgrond-bladeren (donkere silhouetten)
  for (const [i, ramp] of [[0, ['#0c2418', '#143a24', '#1d4e2e']], [1, ['#080818', '#10102a', '#1a1a3a']]]) {
    const L = new Img(56, 40);
    srand(900 + i);
    for (let k = 0; k < 7; k++) {
      const bx = 6 + k * 7 + rnd() * 4, a = -Math.PI / 2 + (k - 3) * 0.32;
      for (let s = 0; s < 34; s++) {
        const r = s * 1.05, w = Math.sin((s / 34) * Math.PI) * 3.5;
        const x = bx + Math.cos(a) * r, y = 40 + Math.sin(a) * r + (s * s) * 0.012;
        for (let q = -w; q <= w; q++) L.set(Math.round(x + q), Math.round(y), ramp[q < -w / 3 ? 0 : q > w / 3 ? 2 : 1]);
      }
    }
    add('fg_leaves' + i, L, false);
  }
  // grasplukje
  {
    const L = new Img(12, 8);
    for (let k = 0; k < 5; k++) { const x = 2 + k * 2; L.vline(x, 2 + (k % 2) * 2, 7, k % 2 ? P.leaf[2] : P.leaf[3]); }
    add('tuft', L);
  }
  return items;
}
