// ---------------------------------------------------------------------------
// Frostpeak – wereld-assets (tweede wereld). Zelfde lagen en maten als
// Greenwood (zie world.js), zodat World.js ze zonder aanpassingen tekent:
//   sky 480x270 · clouds 960x140 · far/mid/near 960x270 · ground 32x48 tegels
// Biomen (fases): lake (bevroren meer) → caves (ijsgrotten) → pass (bergpas,
// sneeuwstorm) → summit (top met noorderlicht; het licht zelf beweegt live).
// ---------------------------------------------------------------------------
import { Img, rampPick, srand, rnd, mix } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';
import { LAYER_W, VIEW_W, VIEW_H, TILE_W, TILE_H, wrap, rgb, pineTree, trunk } from './world.js';

const SNOW = ['#8aa4c8', '#b4c8e4', '#dce8f6', '#f4f9ff', '#ffffff'];
const ICE = ['#1e4a8a', '#2f74c0', '#5aa8e8', '#9cd8ff', '#e0f6ff'];

export const FROST_BIOMES = {
  lake: {
    sky: ['#4a8ad8', '#6aa8ea', '#94ccf6', '#c8e8fc', '#f0faff'],
    sun: { x: 120, y: 50, r: 14, color: ['#fff2c0', '#fffae0', '#ffffff'] },
    cloud: ['#a8c0dc', '#dce8f6', '#ffffff'],
    far: [['#6a88c0', '#8aa8d8', '#b0c8e8'], ['#5a78b0', '#7a98c8', '#9cb8e0']],
    pine: ['#14363e', '#1e4c52', '#2a6262', '#3e7a72'],
    pineNear: ['#0e2a32', '#173e44', '#225454', '#2e6a62'],
    trunk: ['#1e1418', '#3a2a28', '#5a4034', '#7a5a46'],
    snow: SNOW,
    dirt: ['#2a2a3e', '#3e3e58', '#545a76', '#6e7896'],
    water: ['#1e4a8a', '#3a7ac8', '#7ab8ec', '#c8ecff'],
    frozenLake: true,
  },
  caves: {
    sky: ['#060c22', '#0c1838', '#142a56', '#1e3e76', '#2c5694'],
    sun: null,
    cloud: null,
    far: [['#122650', '#1a3466', '#244680'], ['#0e1e42', '#142a56', '#1c386c']],
    crystal: ['#1e5ab0', '#3a9ae8', '#7ad8ff', '#d8f8ff', '#ffffff'],
    rockIce: ['#0e1a38', '#18284e', '#243a68', '#345084', '#4a6ea4'],
    snow: ['#3a5a90', '#5a80b8', '#86ace0', '#b8d8f8', '#e0f2ff'],
    dirt: ['#0c1430', '#142040', '#1c2c54', '#26386a'],
    water: ['#0e2a5a', '#1e4a8a', '#3a7ac8', '#8ad0ff'],
    cave: true,
  },
  pass: {
    sky: ['#4a5878', '#66749a', '#8896b6', '#aab6d0', '#d0d8e8'],
    sun: null,
    cloud: ['#6a7896', '#8a98b4', '#b0bcd2'],
    far: [['#56648a', '#6e7ca2', '#8a98bc'], ['#46547a', '#5a688e', '#7482a8']],
    rock: ['#2a2c40', '#40445e', '#5a607e', '#7a82a0', '#a0aac4'],
    trunk: ['#1e1418', '#3a2a28', '#5a4034', '#7a5a46'],
    snow: ['#9aa8c4', '#bcc8de', '#dce4f2', '#f2f6fc', '#ffffff'],
    dirt: ['#24263a', '#363a52', '#4a506c', '#626a88'],
    water: ['#2a4a7a', '#4a72a8', '#7aa4d4', '#c0dcf4'],
  },
  summit: {
    sky: ['#03061a', '#060e2c', '#0c1a44', '#14285a', '#1e3a6c'],
    sun: { x: 400, y: 46, r: 11, color: ['#c8d4f4', '#e8eeff', '#ffffff'], moon: true },
    cloud: null,
    far: [['#0a1430', '#101c40', '#18284e'], ['#060e24', '#0c1632', '#121e40']],
    crystal: ['#1e5ab0', '#3a9ae8', '#7ad8ff', '#d8f8ff', '#ffffff'],
    pine: ['#040c18', '#081624', '#0e2030', '#162c3e'],
    trunk: ['#06060e', '#100e1a', '#1a1626', '#262034'],
    snow: ['#3a4e80', '#5670a4', '#7c98c8', '#a8c0e4', '#d4e2f8'],
    dirt: ['#0a0e22', '#121a34', '#1c2646', '#283458'],
    water: ['#0e2050', '#1e3a7a', '#3a64a8', '#7aa8e0'],
    stars: true,
  },
};

// --- lucht -----------------------------------------------------------------------------
function skyLayer(b) {
  const L = new Img(VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y++) {
    const v = Math.min(0.999, Math.pow(y / 215, 1.1));
    for (let x = 0; x < VIEW_W; x++) L.put(x, y, rampPick(b.sky, v, x, y));
  }
  if (b.sun) {
    const s = b.sun;
    for (let r = s.r + 14; r > s.r; r -= 4) L.ellipse(s.x, s.y, r, r, [...rgb(s.color[0]), 26]);
    L.shadedEllipse(s.x, s.y, s.r, s.r, s.color, { light: [-0.3, -0.4, 0.9], bias: 0.15 });
    if (s.moon) { L.disc(s.x + 3, s.y - 3, 2.5, '#aeb6dc'); L.disc(s.x - 4, s.y + 4, 1.6, '#b8c0e4'); }
  }
  if (b.stars) {
    srand(77);
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(rnd() * VIEW_W), y = Math.floor(rnd() * 170);
      const big = rnd() < 0.1;
      L.put(x, y, big ? '#ffffff' : rnd() < 0.5 ? '#8a9ad8' : '#c8d4f4');
      if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L.put(x + dx, y + dy, '#5a6ab0');
    }
  }
  if (b.cave) {
    // ijspegels aan het plafond + ijsglans
    srand(31);
    for (let x = 0; x < VIEW_W; x += 3) {
      const h = 6 + Math.abs(Math.sin(x * 0.07)) * 14 + rnd() * 10;
      for (let y = 0; y < h; y++) L.put(x, y, rampPick(b.rockIce, 0.6 - y / h * 0.5, x, y));
    }
    for (let i = 0; i < 26; i++) {
      const x = rnd() * VIEW_W, len = 10 + rnd() * 34, w = 2 + rnd() * 3;
      L.poly([[x - w, 0], [x + w, 0], [x, len]], ICE[1]);
      L.poly([[x - w * 0.2, 0], [x + w, 0], [x, len]], ICE[2]);
      L.line(x, 2, x, len - 3, ICE[3]);
    }
  }
  return L;
}

// --- wolken (of sneeuwbuien) ------------------------------------------------------------
function cloudLayer(b, seedN) {
  const L = new Img(LAYER_W, 140);
  if (!b.cloud) return L;
  srand(seedN);
  const heavy = b === FROST_BIOMES.pass;
  const n = heavy ? 11 : 6;
  for (let i = 0; i < n; i++) {
    const cx = 40 + i * (LAYER_W / n) + rnd() * 40, cy = (heavy ? 20 : 30) + rnd() * (heavy ? 40 : 60), s = (heavy ? 0.9 : 0.6) + rnd() * 0.6;
    wrap(LAYER_W, x => {
      const blobs = [[0, 0, 22], [-20, 6, 15], [22, 5, 16], [-8, -9, 14], [10, -7, 13], [36, 9, 10], [-34, 10, 9]];
      for (const [dx, dy, r] of blobs) L.shadedEllipse(x + dx * s, cy + dy * s, r * s * 1.25, r * s * 0.8, b.cloud, { light: [-0.3, -0.9, 0.4], bias: 0.1, clip: (px, py) => py < cy + 10 * s });
    }, cx);
  }
  return L;
}

// --- besneeuwde bergrug ---------------------------------------------------------------------
function snowRidge(L, baseY, amp, freqs, ramp, snow, seedN, opt = {}) {
  srand(seedN);
  const phases = freqs.map(() => rnd() * Math.PI * 2);
  const W = L.w;
  for (let x = 0; x < W; x++) {
    let h = 0;
    freqs.forEach((f, i) => { h += Math.sin((x / W) * Math.PI * 2 * f + phases[i]) / (i + 1); });
    h = opt.peaky ? Math.abs(h) * 1.5 - 0.4 : h;
    const top = Math.round(baseY - h * amp);
    const cap = Math.max(2, Math.round((h + 0.5) * (opt.snowDepth || 10)) + ((x * 13) % 5 === 0 ? 2 : 0));
    for (let y = top; y < L.h; y++) {
      const d = (y - top) / (L.h - top);
      let c;
      if (y - top < cap) c = rampPick(snow, 0.95 - (y - top) / cap * 0.45 - (Math.sin(x * 0.21) > 0.3 ? 0.2 : 0), x, y);
      else c = rampPick(ramp, 1 - Math.min(0.99, d * 2.2), x, y);
      L.put(x, y, c);
    }
  }
}

function farLayer(b, seedN) {
  const L = new Img(LAYER_W, VIEW_H);
  if (b.cave) {
    snowRidge(L, 150, 26, [3, 7, 13], b.far[0], b.rockIce.slice(2), seedN, { snowDepth: 4 });
    // gloeiende aders in de ijswand
    srand(seedN + 5);
    for (let i = 0; i < 18; i++) {
      let x = rnd() * LAYER_W, y = 170 + rnd() * 60;
      for (let k = 0; k < 14; k++) { x += rnd() * 3 - 1; y += rnd() * 2 - 1.2; L.set(x, y, b.crystal[k % 3 === 0 ? 2 : 1]); }
    }
    snowRidge(L, 205, 12, [4, 9], b.far[1], b.rockIce.slice(1, 4), seedN + 1, { snowDepth: 3 });
    return L;
  }
  snowRidge(L, b === FROST_BIOMES.pass ? 150 : 160, b === FROST_BIOMES.pass ? 52 : 40, [2, 5, 11], b.far[0], b.snow, seedN, { peaky: true, snowDepth: b === FROST_BIOMES.summit ? 6 : 14 });
  snowRidge(L, 200, 18, [3, 8], b.far[1], b.snow.slice(0, 4), seedN + 2, { snowDepth: 6 });
  if (b.frozenLake) {
    // bevroren meer aan de horizon
    for (let y = 204; y < 222; y++) for (let x = 0; x < LAYER_W; x++) {
      const v = 0.85 - (y - 204) / 30 + ((x + y * 3) % 37 === 0 ? 0.2 : 0);
      L.put(x, y, rampPick(['#7aa4d8', '#a8ccf0', '#d4ecff', '#ffffff'], v, x, y));
    }
    for (let i = 0; i < 30; i++) { const x = (i * 97) % LAYER_W, y = 208 + (i * 7) % 12; L.hline(x, x + 6 + (i % 3) * 4, y, '#ffffff'); }
  }
  return L;
}

/** Den met sneeuw op de takken. */
function snowPine(L, cx, baseY, h, ramp, snow) {
  pineTree(L, cx, baseY, h, ramp);
  // sneeuw op iedere "verdieping"
  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const ty = baseY - t * h * 0.22;
    const w = h * 0.38 * (1 - t / (tiers + 0.5));
    for (let x = Math.floor(cx - w); x <= cx + w; x++) {
      const k = 1 - Math.abs(x - cx) / (w + 0.01);
      const y = Math.round(ty - k * h * 0.36 * 0.55);
      if (L.alpha(x, y) === 0) continue;
      L.set(x, y, snow[3]); L.set(x, y - 1, snow[4]);
      if ((x * 7) % 5 === 0) L.set(x, y + 1, snow[2]);
    }
  }
  // topje
  L.set(cx, baseY - (tiers - 1) * h * 0.22 - h * 0.36, snow[4]);
}

function iceSpire(L, x, baseY, h, w, ramp) {
  L.poly([[x - w, baseY], [x - w * 0.3, baseY - h * 0.6], [x, baseY - h], [x + w * 0.4, baseY - h * 0.55], [x + w, baseY]], ramp[1]);
  L.poly([[x, baseY - h], [x + w * 0.4, baseY - h * 0.55], [x + w, baseY], [x + w * 0.1, baseY]], ramp[2]);
  L.line(x - w * 0.15, baseY - h * 0.85, x - w * 0.4, baseY - 4, ramp[3]);
  L.set(x, baseY - h + 1, ramp[4] || '#ffffff');
}

function midLayer(b, seedN) {
  const L = new Img(LAYER_W, VIEW_H);
  srand(seedN);
  if (b.cave || b === FROST_BIOMES.summit) {
    // ijskristal-zuilen
    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * LAYER_W + rnd() * 40;
      const h = 50 + rnd() * 70, w = 8 + rnd() * 10;
      wrap(LAYER_W, xx => {
        iceSpire(L, xx, 232, h, w, b.crystal);
        iceSpire(L, xx + w * 1.3, 232, h * 0.55, w * 0.6, b.crystal);
      }, x);
    }
    if (b === FROST_BIOMES.summit) for (let i = 0; i < 7; i++) {
      const x = 70 + i * 140 + rnd() * 30;
      wrap(LAYER_W, xx => { trunk(L, Math.round(xx - 2), 180, 232, 5, b.trunk); snowPine(L, xx, 205, 70, b.pine, b.snow); }, x);
    }
    for (let x = 0; x < LAYER_W; x += 16) wrap(LAYER_W, xx => L.shadedEllipse(xx, 232, 16, 10, b.snow.slice(0, 3)), x + rnd() * 8);
    return L;
  }
  if (b === FROST_BIOMES.pass) {
    // rotsblokken met sneeuwkappen
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * LAYER_W + rnd() * 50, r = 22 + rnd() * 20;
      wrap(LAYER_W, xx => {
        L.shadedEllipse(xx, 232 - r * 0.5, r * 1.2, r, b.rock.slice(0, 4), { clip: (px, py) => py < 232 });
        L.shadedEllipse(xx - r * 0.15, 232 - r * 1.25, r * 0.95, r * 0.42, b.snow, { clip: (px, py) => py < 232 - r * 1.05 });
      }, x);
    }
    for (let x = 0; x < LAYER_W; x += 18) wrap(LAYER_W, xx => L.shadedEllipse(xx, 232, 18, 9, b.snow.slice(0, 3)), x + rnd() * 10);
    return L;
  }
  // bevroren meer: rij besneeuwde dennen
  for (let i = 0; i < 14; i++) {
    const x = (i / 14) * LAYER_W + rnd() * 40;
    const h = 60 + rnd() * 40;
    const base = 222 - rnd() * 6;
    wrap(LAYER_W, xx => { trunk(L, Math.round(xx - 3), 200, 232, 6, b.trunk.map(c => mix(c, b.pine[0], 0.4))); snowPine(L, xx, base, h, b.pine, b.snow); }, x);
  }
  for (let x = 0; x < LAYER_W; x += 18) wrap(LAYER_W, xx => L.shadedEllipse(xx, 232, 18, 10, b.snow.slice(1, 4)), x + rnd() * 10);
  return L;
}

function nearLayer(b, seedN) {
  const L = new Img(LAYER_W, VIEW_H);
  srand(seedN);
  if (b.cave) {
    // grote ijspegels van boven + stalagmieten
    for (let i = 0; i < 6; i++) {
      const x = (i / 6) * LAYER_W + rnd() * 80, w = 14 + rnd() * 12, len = 70 + rnd() * 70;
      wrap(LAYER_W, xx => {
        L.shadedBlock(Math.round(xx - w * 1.4), 0, Math.round(w * 2.8), 20, b.rockIce, { power: 3 });
        L.poly([[xx - w, 14], [xx + w, 14], [xx + w * 0.1, len]], ICE[1]);
        L.poly([[xx - w * 0.1, 14], [xx + w, 14], [xx + w * 0.1, len]], ICE[2]);
        L.line(xx - w * 0.5, 18, xx, len - 8, ICE[3]);
        L.set(Math.round(xx + w * 0.1), Math.round(len), ICE[4]);
      }, x);
    }
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 240 + rnd() * 60, h = 40 + rnd() * 50;
      const w = 12 + rnd() * 6;
      wrap(LAYER_W, xx => iceSpire(L, xx, 228, h, w, b.crystal), x);
    }
    return L;
  }
  if (b === FROST_BIOMES.pass) {
    // hoge rotsnaalden met sneeuw + houten paal met touw
    for (let i = 0; i < 4; i++) {
      const x = 80 + i * 240 + rnd() * 60, w = 24 + rnd() * 12, top = 60 + rnd() * 50;
      wrap(LAYER_W, xx => {
        L.poly([[xx - w, 228], [xx - w * 0.5, top + 20], [xx, top], [xx + w * 0.55, top + 26], [xx + w, 228]], b.rock[1]);
        L.poly([[xx, top], [xx + w * 0.55, top + 26], [xx + w, 228], [xx + w * 0.2, 228]], b.rock[2]);
        L.poly([[xx - w * 0.55, top + 22], [xx, top - 2], [xx + w * 0.58, top + 26], [xx + w * 0.1, top + 16]], b.snow[3]);
        L.line(xx - w * 0.3, top + 40, xx - w * 0.6, 220, b.rock[0]);
      }, x);
    }
    for (let i = 0; i < 3; i++) {
      const x = 200 + i * 320;
      wrap(LAYER_W, xx => {
        L.rect(Math.round(xx), 150, 4, 80, b.trunk[1]); L.vline(Math.round(xx), 150, 229, b.trunk[2]);
        L.set(Math.round(xx) + 1, 149, b.snow[4]); L.hline(Math.round(xx) - 1, Math.round(xx) + 4, 150, b.snow[3]);
        for (let k = 0; k < 160; k++) { const t = k / 160; L.set(xx + 2 + t * 160, 156 + Math.sin(t * Math.PI) * 22, b.trunk[2]); }
        ['#e8483f', '#ffd23a', '#4fb0ff', '#5fd65a', '#ffffff'].forEach((c, k) => {
          const t = (k + 1) / 6, fx = xx + 2 + t * 160, fy = 156 + Math.sin(t * Math.PI) * 22;
          L.rect(Math.round(fx), Math.round(fy) + 1, 5, 6, c);
        });
      }, x);
    }
    return L;
  }
  // grote besneeuwde dennen (meer + top)
  const n = b === FROST_BIOMES.summit ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * LAYER_W + rnd() * 80;
    const h = 150 + rnd() * 40;
    wrap(LAYER_W, xx => {
      trunk(L, Math.round(xx - 5), 150, 228, 10, b.trunk);
      snowPine(L, xx, 196, h, b.pineNear || b.pine, b.snow);
    }, x);
  }
  return L;
}

// --- grond --------------------------------------------------------------------------------
function groundTile(b, variant) {
  const L = new Img(TILE_W, TILE_H);
  srand(2000 + variant * 23);
  const top = 4;
  for (let y = top + 6; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
    L.put(x, y, rampPick(b.dirt, 0.85 - (y - top) / TILE_H * 0.9, x, y));
  }
  // ijslaagjes / kristalletjes in de grond
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rnd() * 26) + 2, y = top + 16 + Math.floor(rnd() * 24);
    L.put(x, y, ICE[2]); L.put(x + 1, y, ICE[3]); L.put(x, y + 1, ICE[1]);
  }
  if (b.cave) {
    // glad ijs als vloer
    for (let y = top; y < top + 9; y++) for (let x = 0; x < TILE_W; x++) {
      const v = y === top ? 0.98 : 0.75 - (y - top) * 0.06 + ((x + variant * 5) % 11 === 0 ? 0.15 : 0);
      L.put(x, y, rampPick(b.snow, v, x, y));
    }
    L.line(4 + variant * 5, top + 2, 10 + variant * 5, top + 2, '#ffffff');
    return L;
  }
  // sneeuwlaag met zachte bultjes
  for (let x = 0; x < TILE_W; x++) {
    const bump = Math.round(Math.sin((x + variant * 9) * 0.35) * 1.2 + Math.sin((x + variant * 4) * 0.9) * 0.6);
    const t0 = top - 1 - bump;
    for (let y = t0; y < top + 8 + ((x + variant) % 4 === 0 ? 2 : 0); y++) {
      const v = 1 - (y - t0) / 12;
      L.put(x, y, rampPick(b.snow, v, x, y));
    }
  }
  // glinsters in de sneeuw
  for (let i = 0; i < 3; i++) L.put(Math.floor(rnd() * 31), top + 1 + Math.floor(rnd() * 4), '#ffffff');
  if (variant === 3) { L.put(9, top + 2, b.snow[1]); L.put(12, top + 3, b.snow[1]); L.put(21, top + 2, b.snow[1]); L.put(24, top + 3, b.snow[1]); } // pootafdrukjes
  return L;
}

function bridgeTiles(b) {
  // 3 tegels: oever-links, brug (houten planken over ijswater), oever-rechts
  const tiles = [];
  for (let kind = 0; kind < 3; kind++) {
    const L = new Img(TILE_W, TILE_H);
    for (let y = 14; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      L.put(x, y, rampPick(b.water, 0.75 - (y - 14) / 40, x, y));
      if ((x + y * 5) % 19 === 0 && y > 18) L.put(x, y, b.water[3]);
    }
    // ijsschotsjes
    L.rect(3 + kind * 7, 16, 6, 2, b.snow[3]); L.rect(18 - kind * 4, 22, 5, 2, b.snow[2]);
    if (kind !== 1) {
      const g = groundTile(b, 2);
      for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
        const edgeX = kind === 0 ? 20 - Math.max(0, y - 10) * 0.6 : 12 + Math.max(0, y - 10) * 0.6;
        if (kind === 0 ? x < edgeX : x >= edgeX) L.put(x, y, g.get(x, y));
      }
    }
    for (let x = 0; x < TILE_W; x++) for (let y = 3; y < 9; y++) {
      const v = y === 3 ? 0.95 : y === 8 ? 0.1 : 0.55;
      L.put(x, y, x % 8 === 7 ? P.wood[0] : rampPick(P.wood, v, x, y));
    }
    for (let x = 0; x < TILE_W; x++) if ((x * 5) % 7 < 4) L.put(x, 2, b.snow[4]); // sneeuw op de planken
    if (kind === 1) { L.rect(14, 9, 4, 30, P.wood[1]); L.vline(14, 9, 38, P.wood[2]); }
    tiles.push(L);
  }
  return tiles;
}

export function buildFrostGround(b) {
  const tiles = [];
  for (let v = 0; v < 4; v++) tiles.push(groundTile(b, v));
  tiles.push(...bridgeTiles(b));
  const out = new Img(TILE_W * tiles.length, TILE_H);
  tiles.forEach((t, i) => out.blit(t, i * TILE_W, 0));
  return { img: out, count: tiles.length, bridge: [4, 5, 6] };
}

export function buildFrostLayers(key, seedBase) {
  const b = FROST_BIOMES[key];
  return { sky: skyLayer(b), clouds: cloudLayer(b, seedBase + 1), far: farLayer(b, seedBase + 2), mid: midLayer(b, seedBase + 3), near: nearLayer(b, seedBase + 4) };
}

// --- props (in dezelfde props-atlas als Greenwood, met prefix fp_) ------------------------------
export function buildFrostProps() {
  const items = [];
  const add = (name, img, outline = true) => items.push({ name, img: outline ? img.outline(OUTLINE) : img });
  const S = SNOW;
  // sneeuwhoopje / besneeuwde struik
  for (const [i, w] of [[0, 30], [1, 40]]) {
    const L = new Img(w, 18);
    L.shadedEllipse(w / 2, 17, w / 2 - 1, 12, S, { clip: (x, y) => y < 17 });
    if (i === 1) for (let k = 0; k < 6; k++) { const x = 6 + k * 5; L.set(x, 10 - (k % 2), '#1e4c52'); L.set(x + 1, 11, '#2a6262'); }
    add('fp_snow' + i, L);
  }
  // kleine besneeuwde den
  {
    const L = new Img(24, 40);
    L.rect(11, 32, 3, 8, '#3a2a28');
    snowPine(L, 12, 36, 34, FROST_BIOMES.lake.pine, S);
    add('fp_pine', L);
  }
  // sneeuwpop
  {
    const L = new Img(22, 32);
    L.shadedEllipse(11, 25, 8, 6.5, S);
    L.shadedEllipse(11, 15, 6, 5, S);
    L.shadedEllipse(11, 7, 4.5, 4, S);
    L.rect(7, 1, 8, 3, '#1a1a2e'); L.rect(5, 3, 12, 1, '#1a1a2e'); L.hline(7, 14, 3, '#c21f3a');
    L.set(9, 6, '#1a1324'); L.set(12, 6, '#1a1324');
    L.poly([[7, 8], [3, 9], [7, 9.5]], '#ff8a2a'); // wortelneus naar links
    L.hline(6, 16, 11, '#e8483f'); L.rect(14, 11, 2, 5, '#e8483f'); // sjaal
    for (const y of [15, 18]) L.set(11, y, '#1a1324');
    L.line(5, 15, 0, 11, '#5a4034'); L.line(17, 15, 21, 11, '#5a4034');
    add('fp_snowman', L);
  }
  // rotsen met sneeuw
  for (const [i, w, h] of [[0, 22, 14], [1, 32, 20]]) {
    const L = new Img(w + 2, h + 2);
    L.shadedEllipse(w / 2, h / 2 + 2, w / 2, h / 2, FROST_BIOMES.pass.rock.slice(0, 4), { clip: (x, y) => y < h + 1 });
    L.shadedEllipse(w / 2 - 1, h / 2 - 1, w / 2 - 2, h / 4, S, { clip: (x, y) => y < h / 2 + 1 });
    add('fp_rock' + i, L);
  }
  // ijskristallen
  for (const [i, s] of [[0, 1], [1, 1.5]]) {
    const L = new Img(Math.round(18 * s), Math.round(24 * s));
    const c = FROST_BIOMES.caves.crystal;
    const H = L.h - 1;
    iceSpire(L, 6 * s, H, 20 * s, 4 * s, c);
    iceSpire(L, 12 * s, H, 13 * s, 3 * s, c);
    add('fp_crystal' + i, L);
  }
  // stalagmiet van ijs
  {
    const L = new Img(14, 30);
    iceSpire(L, 7, 29, 28, 6, ICE);
    add('fp_icicle', L);
  }
  // iglo
  {
    const L = new Img(48, 26);
    L.shadedEllipse(24, 25, 22, 20, S, { clip: (x, y) => y < 25 });
    for (const y of [12, 18]) for (let x = 4; x < 45; x++) if (L.alpha(x, y)) L.set(x, y, S[1]);
    for (let x = 8; x < 42; x += 7) for (let y = 7; y < 25; y++) if (L.alpha(x + ((y / 6) | 0) % 2 * 3, y)) L.set(x + ((y / 6) | 0) % 2 * 3, y, S[1]);
    L.shadedEllipse(8, 25, 7, 8, S, { clip: (x, y) => y < 25 });
    L.ellipse(7, 25, 4, 6, '#1a1a36');
    add('fp_igloo', L);
  }
  // hekje met sneeuw
  {
    const L = new Img(34, 18);
    for (const x of [2, 15, 28]) { L.rect(x, 3, 3, 15, P.wood[1]); L.vline(x, 3, 17, P.wood[2]); L.hline(x - 1, x + 3, 2, S[4]); }
    for (const y of [7, 12]) { L.hline(2, 30, y, P.wood[2]); L.hline(2, 30, y + 1, P.wood[0]); }
    for (let x = 3; x < 30; x += 2) L.set(x, 6, S[3]);
    add('fp_fence', L);
  }
  // steenmannetje
  {
    const L = new Img(16, 22);
    const R = FROST_BIOMES.pass.rock.slice(0, 4);
    L.shadedEllipse(8, 19, 7, 3, R); L.shadedEllipse(8, 14, 5.5, 2.6, R); L.shadedEllipse(8, 9.5, 4, 2.2, R); L.shadedEllipse(8, 5.5, 2.6, 1.8, R);
    L.hline(6, 10, 3, S[4]);
    add('fp_cairn', L);
  }
  // blauwe lantaarn
  {
    const L = new Img(12, 36);
    L.rect(5, 10, 2, 26, P.wood[1]);
    L.rect(2, 2, 8, 10, '#1a2040'); L.rect(3, 4, 6, 6, '#7ad8ff'); L.rect(4, 5, 4, 4, '#e0f8ff');
    L.hline(1, 10, 1, '#3a4a70'); L.hline(2, 9, 12, '#3a4a70'); L.hline(2, 9, 0, S[4]);
    add('fp_lantern', L);
  }
  // berijpt grasplukje
  {
    const L = new Img(12, 8);
    for (let k = 0; k < 5; k++) { const x = 2 + k * 2; L.vline(x, 2 + (k % 2) * 2, 7, k % 2 ? '#6a9aa8' : '#a8d0dc'); L.set(x, 2 + (k % 2) * 2, '#ffffff'); }
    add('fp_tuft', L);
  }
  // voorgrond: besneeuwde takken (silhouet) en ijsscherven
  {
    const L = new Img(60, 40);
    srand(951);
    const ramp = ['#0c1e2a', '#123040', '#1a4050'];
    for (let k = 0; k < 6; k++) {
      const bx = 6 + k * 8 + rnd() * 4, a = -Math.PI / 2 + (k - 2.5) * 0.3;
      for (let s = 0; s < 32; s++) {
        const x = bx + Math.cos(a) * s, y = 40 + Math.sin(a) * s;
        for (let q = -2; q <= 2; q++) L.set(Math.round(x + q), Math.round(y), ramp[q < 0 ? 0 : q > 0 ? 2 : 1]);
        if (s % 5 === 0) L.set(Math.round(x), Math.round(y) - 1, '#c8dcec');
      }
    }
    add('fp_fg_branch', L, false);
  }
  {
    const L = new Img(56, 40);
    const ramp = ['#081430', '#0e2048', '#183064'];
    for (const [x, h, w] of [[6, 30, 6], [18, 38, 8], [30, 24, 5], [42, 34, 7], [52, 18, 4]]) {
      L.poly([[x - w, 40], [x, 40 - h], [x + w, 40]], ramp[1]);
      L.poly([[x, 40 - h], [x + w, 40], [x + w * 0.2, 40]], ramp[2]);
      L.line(x - w * 0.2, 40 - h * 0.8, x - w * 0.5, 38, '#2a4a8a');
    }
    add('fp_fg_ice', L, false);
  }
  return items;
}
