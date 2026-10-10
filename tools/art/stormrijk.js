// ---------------------------------------------------------------------------
// Stormrijk – wereld-assets (derde wereld): duister, onweer en bliksem.
// Zelfde lagen en maten als Greenwood/Frostpeak, zodat World.js ze zo tekent:
//   sky 480x270 · clouds 960x140 · far/mid/near 960x270 · ground 32x48 tegels
// Biomen (fases):
//   plain   Verdorde vlakte   – paarse onweerslucht, dode bomen, regen
//   charred Bliksemwoud       – door bliksem verkoolde bomen met gloeiende scheuren
//   towers  Stormtorens       – zwevende rotsen en bliksemtorens met gloeiende bollen
//   eye     Oog van de storm  – een kolkende draaikolk met een fel lichtend hart
// De bliksemflitsen, regen en vonken zelf beweegt World.js live.
// ---------------------------------------------------------------------------
import { Img, rampPick, srand, rnd, mix } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';
import { LAYER_W, VIEW_W, VIEW_H, TILE_W, TILE_H, wrap, rgb, ridge, trunk } from './world.js';

const VOLT = ['#8a6a10', '#e0b020', '#ffe24a', '#fff6b0', '#ffffff'];   // gele bliksem
const ARC = ['#1a4a8a', '#2f8ae0', '#6ad8ff', '#d0f8ff', '#ffffff'];    // blauwe ontlading
const EMBER = ['#5a1010', '#c0301a', '#ff7a2a', '#ffc860', '#fff0c0'];

export const STORM_BIOMES = {
  plain: {
    sky: ['#0c0818', '#1a1230', '#2c1e48', '#40305e', '#5a4676'],
    cloud: ['#1c1430', '#2e2448', '#463a66'],
    far: [['#140e26', '#1c1434', '#261c44'], ['#0e0a1c', '#160f28', '#1e1636']],
    tree: ['#08060e', '#120e1c', '#1e1a2c', '#2c2640'],
    soil: ['#0e0a16', '#1a1424', '#261e34', '#342a46'],
    grass: ['#1e1636', '#2e2250', '#46346e', '#6a52a0'],
    water: ['#0a0c28', '#141a48', '#202c6a', '#4a5aa8'],
    glow: VOLT,
  },
  charred: {
    sky: ['#0a0408', '#1a0a12', '#2e1218', '#4a1c1e', '#6a2c22'],
    cloud: ['#1e0e14', '#30161c', '#4a2228'],
    far: [['#160a10', '#200e16', '#2c141c'], ['#0e060a', '#160a10', '#1e0e14']],
    tree: ['#060406', '#100a0c', '#1c1214', '#2a1c1c'],
    soil: ['#0c0808', '#181010', '#241818', '#322222'],
    grass: ['#1a1212', '#2a1c1a', '#3e2a24', '#5a3e30'],
    water: ['#140a10', '#2a1218', '#4a1e22', '#7a3a30'],
    glow: EMBER,
  },
  towers: {
    sky: ['#03080e', '#071420', '#0c2030', '#143044', '#1e4458'],
    cloud: ['#0a1824', '#122636', '#1c3648'],
    far: [['#08141e', '#0c1c28', '#122634'], ['#050c14', '#08121c', '#0c1a26']],
    stone: ['#0a1018', '#141e2a', '#202e3e', '#304458', '#4a6278'],
    soil: ['#0a0e16', '#121a24', '#1c2634', '#283648'],
    grass: ['#0e2030', '#163246', '#20485e', '#2e6a80'],
    water: ['#04101c', '#0a2034', '#123450', '#2a6a90'],
    glow: ARC,
  },
  eye: {
    sky: ['#05020c', '#10061e', '#200c36', '#36124e', '#521a66'],
    cloud: null,
    far: [['#0c0418', '#140824', '#1e0c32'], ['#070210', '#0c0418', '#120622']],
    obsidian: ['#06040c', '#100a1c', '#1c142e', '#2c2246', '#46386a'],
    soil: ['#06040a', '#0e0a16', '#181224', '#241c34'],
    grass: ['#1a0e30', '#2a1648', '#42246a', '#6a3aa0'],
    water: ['#0a0418', '#180a34', '#2a1458', '#5a2ea0'],
    glow: ['#4a1a8a', '#9a3ae0', '#d890ff', '#f4dcff', '#ffffff'],
    vortex: true,
  },
};

// --- hulpjes -------------------------------------------------------------------------
/** Kronkelige dode boom (takken vertakken recursief). */
function deadTree(L, x, baseY, h, ramp, seedN, glow = null) {
  srand(seedN);
  const branch = (x0, y0, ang, len, r, depth) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    L.thick(x0, y0, x1, y1, r, ramp[Math.min(ramp.length - 1, 1 + (depth % 2))]);
    if (glow && depth === 0) for (let k = 0; k < len; k += 3) L.set(x0 + Math.cos(ang) * k + (rnd() < 0.5 ? 1 : 0), y0 + Math.sin(ang) * k, glow[rnd() < 0.3 ? 3 : 2]);
    if (depth >= 4 || r < 0.6) return;
    const n = depth === 0 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = ang + (rnd() - 0.5) * 1.3 + (i - (n - 1) / 2) * 0.55;
      branch(x1, y1, a, len * (0.55 + rnd() * 0.2), r * 0.62, depth + 1);
    }
  };
  // stam met wortelvoet
  L.thick(x, baseY, x + 1, baseY - h * 0.45, Math.max(1.5, h * 0.05), ramp[1]);
  L.poly([[x - h * 0.08, baseY], [x, baseY - h * 0.12], [x + h * 0.09, baseY]], ramp[1]);
  branch(x + 1, baseY - h * 0.45, -Math.PI / 2 + (rnd() - 0.5) * 0.4, h * 0.3, Math.max(1.2, h * 0.04), 0);
}

/** Gloeiende scheur (willekeurige wandeling). */
function crackLine(L, x, y, len, ramp, dir = 1) {
  for (let k = 0; k < len; k++) {
    L.set(x, y, ramp[k % 4 === 0 ? 3 : 2]);
    x += dir * (rnd() < 0.7 ? 1 : 0); y += rnd() < 0.5 ? 1 : rnd() < 0.5 ? -1 : 0;
  }
}

/** Gekartelde bliksemschicht (vast getekend, bijv. in de verte). */
function bolt(L, x, y0, y1, ramp, width = 1) {
  let x0 = x, y = y0;
  while (y < y1) {
    const nx = x0 + (rnd() - 0.5) * 10, ny = y + 5 + rnd() * 7;
    L.thick(x0, y, nx, ny, width + 0.8, ramp[1] + '80');
    L.line(x0, y, nx, ny, ramp[3]);
    if (rnd() < 0.2) L.line(nx, ny, nx + (rnd() - 0.5) * 16, ny + 8, ramp[2]);
    x0 = nx; y = ny;
  }
}

// --- lucht ------------------------------------------------------------------------------
function skyLayer(b) {
  const L = new Img(VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y++) {
    const v = Math.min(0.999, Math.pow(y / 220, 1.25));
    for (let x = 0; x < VIEW_W; x++) L.put(x, y, rampPick(b.sky, v, x, y));
  }
  if (b.vortex) {
    // kolkende draaikolk: spiraalbanden rond een fel hart
    const cx = 300, cy = 70;
    for (let y = 0; y < 200; y++) for (let x = 0; x < VIEW_W; x++) {
      const dx = (x - cx) / 1.6, dy = y - cy, r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const band = Math.sin(a * 3 + r * 0.09);
      if (band > 0.55 && r < 210) L.put(x, y, rampPick(b.sky.slice(2), 0.9 - r / 260, x, y));
    }
    for (let r = 26; r > 2; r -= 3) L.ellipse(cx, cy, r * 1.6, r, [...rgb(r < 10 ? '#ffffff' : r < 18 ? b.glow[2] : b.glow[1]), r < 10 ? 255 : 60]);
  }
  srand(13);
  if (!b.vortex) {
    // verre bliksem achter de wolken (vast), de echte flitsen zijn live
    bolt(L, 70 + rnd() * 340, 20, 120 + rnd() * 40, b.glow);
  } else {
    for (let i = 0; i < 4; i++) { const x = 300 + (rnd() - 0.5) * 300; bolt(L, x, 70, 150 + rnd() * 30, b.glow); }
  }
  if (b === STORM_BIOMES.charred) {
    // rode gloed van brand aan de horizon
    for (let y = 150; y < 230; y++) for (let x = 0; x < VIEW_W; x++) {
      const k = (y - 150) / 80;
      if (rnd() < k * 0.5) L.set(x, y, [...rgb(EMBER[1]), Math.round(40 * k)]);
    }
  }
  return L;
}

function cloudLayer(b, seedN) {
  const L = new Img(LAYER_W, 140);
  if (!b.cloud) return L;
  srand(seedN);
  for (let i = 0; i < 12; i++) {
    const cx = 20 + i * 80 + rnd() * 30, cy = 18 + rnd() * 50, s = 0.9 + rnd() * 0.7;
    wrap(LAYER_W, x => {
      const blobs = [[0, 0, 22], [-20, 6, 15], [22, 5, 16], [-8, -9, 14], [10, -7, 13], [36, 9, 10], [-34, 10, 9]];
      for (const [dx, dy, r] of blobs) L.shadedEllipse(x + dx * s, cy + dy * s, r * s * 1.3, r * s * 0.8, b.cloud, { light: [-0.2, 0.9, 0.4], bias: 0.05 });
      // lichtrand aan de onderkant (weerkaatsing van de bliksem)
      for (let px = Math.round(x - 30 * s); px < x + 30 * s; px++) if ((px * 7) % 5 === 0) L.set(px, Math.round(cy + 12 * s), b.cloud[2]);
    }, cx);
  }
  return L;
}

function farLayer(b, seedN) {
  const L = new Img(LAYER_W, VIEW_H);
  ridge(L, 165, 44, [2, 5, 11], b.far[0], seedN, { peaky: true });
  if (b === STORM_BIOMES.towers || b === STORM_BIOMES.eye) {
    // zwevende rotseilanden
    srand(seedN + 3);
    for (let i = 0; i < 7; i++) {
      const x = 60 + i * 140 + rnd() * 40, y = 70 + rnd() * 60, w = 16 + rnd() * 18;
      wrap(LAYER_W, xx => {
        L.poly([[xx - w, y], [xx + w, y], [xx + w * 0.3, y + w * 0.9], [xx - w * 0.2, y + w * 1.2]], b.far[0][1]);
        L.hline(Math.round(xx - w), Math.round(xx + w), Math.round(y), b.far[0][2]);
        L.set(xx, y + w * 1.2, b.glow[2]);
      }, x);
    }
  }
  ridge(L, 205, 16, [3, 8], b.far[1], seedN + 2);
  // gloeiende aders in de verre bergen
  srand(seedN + 9);
  for (let i = 0; i < 10; i++) { const x = rnd() * LAYER_W; crackLine(L, x, 175 + rnd() * 30, 10, b.glow.map(c => mix(c, b.far[0][0], 0.45))); }
  return L;
}

function midLayer(b, seedN) {
  const L = new Img(LAYER_W, VIEW_H);
  srand(seedN);
  if (b === STORM_BIOMES.towers) {
    // stenen torentjes met bliksemspitsen
    for (let i = 0; i < 7; i++) {
      const x = (i / 7) * LAYER_W + rnd() * 50, h = 60 + rnd() * 50, w = 12 + rnd() * 6;
      wrap(LAYER_W, xx => {
        L.shadedBlock(Math.round(xx - w / 2), 232 - h, Math.round(w), h, b.stone.slice(0, 4), { power: 6 });
        L.poly([[xx - w / 2 - 3, 232 - h], [xx, 232 - h - 14], [xx + w / 2 + 3, 232 - h]], b.stone[2]);
        L.vline(Math.round(xx), 232 - h - 26, 232 - h - 14, b.stone[3]);
        L.disc(xx, 232 - h - 28, 2.4, b.glow[2]); L.set(xx, 232 - h - 29, '#ffffff');
        for (let y = 232 - h + 8; y < 230; y += 12) L.hline(Math.round(xx - w / 2), Math.round(xx + w / 2), y, b.stone[0]);
        L.rect(Math.round(xx - 2), 232 - h + 12, 4, 6, b.glow[1]);
      }, x);
    }
    return L;
  }
  if (b === STORM_BIOMES.eye) {
    // obsidiaan-spitsen met paarse gloed
    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * LAYER_W + rnd() * 40, h = 40 + rnd() * 70, w = 8 + rnd() * 9;
      wrap(LAYER_W, xx => {
        L.poly([[xx - w, 232], [xx - w * 0.2, 232 - h], [xx + w, 232]], b.obsidian[2]);
        L.poly([[xx - w * 0.2, 232 - h], [xx + w, 232], [xx + w * 0.2, 232]], b.obsidian[3]);
        L.line(xx - w * 0.2, 232 - h + 4, xx - w * 0.5, 230, b.glow[1]);
      }, x);
    }
    return L;
  }
  // dode bomen (vlakte) of verkoolde bomen (woud)
  const charred = b === STORM_BIOMES.charred;
  const n = charred ? 12 : 9;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * LAYER_W + rnd() * 50, h = 70 + rnd() * 50, seed = seedN * 17 + i;
    wrap(LAYER_W, xx => deadTree(L, xx, 232, h, b.tree.map(c => mix(c, b.far[0][2], 0.35)), seed, charred ? b.glow.map(c => mix(c, '#000000', 0.3)) : null), x);
  }
  for (let x = 0; x < LAYER_W; x += 18) wrap(LAYER_W, xx => L.shadedEllipse(xx, 232, 16, 8, b.grass.slice(0, 3)), x + rnd() * 10);
  return L;
}

function nearLayer(b, seedN) {
  const L = new Img(LAYER_W, VIEW_H);
  srand(seedN);
  if (b === STORM_BIOMES.towers) {
    // grote bliksemtoren met spoelringen en een gloeiende bol
    for (let i = 0; i < 3; i++) {
      const x = 140 + i * 320 + rnd() * 40, top = 50 + rnd() * 30;
      wrap(LAYER_W, xx => {
        L.shadedBlock(Math.round(xx - 7), top + 20, 14, 228 - top - 20, b.stone, { power: 8 });
        for (let y = top + 34; y < 200; y += 16) { L.shadedEllipse(xx, y, 14, 3, ['#4a3a1a', '#8a6a2a', '#c89a3a', '#f0d070']); }
        L.shadedEllipse(xx, top + 10, 11, 11, b.glow.slice(0, 4), { bias: 0.15 });
        L.disc(xx - 3, top + 7, 2, '#ffffff');
        L.shadedBlock(Math.round(xx - 18), 214, 36, 14, b.stone, { power: 4 });
      }, x);
    }
    return L;
  }
  if (b === STORM_BIOMES.eye) {
    for (let i = 0; i < 4; i++) {
      const x = 90 + i * 240 + rnd() * 50, h = 120 + rnd() * 60, w = 18 + rnd() * 10;
      wrap(LAYER_W, xx => {
        L.poly([[xx - w, 228], [xx - w * 0.4, 228 - h * 0.6], [xx + w * 0.1, 228 - h], [xx + w * 0.5, 228 - h * 0.55], [xx + w, 228]], b.obsidian[1]);
        L.poly([[xx + w * 0.1, 228 - h], [xx + w * 0.5, 228 - h * 0.55], [xx + w, 228], [xx + w * 0.3, 228]], b.obsidian[2]);
        srand(seedN + i);
        crackLine(L, Math.round(xx - w * 0.3), Math.round(228 - h * 0.5), 40, b.glow, 0);
      }, x);
    }
    return L;
  }
  const charred = b === STORM_BIOMES.charred;
  for (let i = 0; i < 3; i++) {
    const x = (i / 3) * LAYER_W + rnd() * 90, h = 170 + rnd() * 40, seed = seedN * 5 + i;
    wrap(LAYER_W, xx => {
      deadTree(L, xx, 230, h, b.tree, seed, charred ? b.glow : null);
      if (charred) { srand(seed); for (let k = 0; k < 3; k++) crackLine(L, Math.round(xx - 2 + k * 2), 150 + k * 20, 26, b.glow, 0); }
    }, x);
  }
  return L;
}

// --- grond ------------------------------------------------------------------------------------
function groundTile(b, variant) {
  const L = new Img(TILE_W, TILE_H);
  srand(3000 + variant * 29 + b.soil[0].charCodeAt(2));
  const top = 4;
  for (let y = top + 5; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) L.put(x, y, rampPick(b.soil, 0.85 - (y - top) / TILE_H * 0.9, x, y));
  if (b === STORM_BIOMES.towers) {
    // stenen platen met lichtgevende voegen
    for (let y = top; y < top + 9; y++) for (let x = 0; x < TILE_W; x++) L.put(x, y, rampPick(b.stone.slice(1), y === top ? 0.95 : 0.55 - (y - top) * 0.04, x, y));
    L.vline((variant * 11) % 32, top, top + 8, b.stone[0]);
    L.hline(0, 31, top + 9, b.glow[1]);
    if (variant % 2) L.hline(4, 12, top + 9, b.glow[2]);
    return L;
  }
  // gloeiende scheurtjes in de grond
  if (variant % 2 === 0) crackLine(L, 2 + Math.floor(rnd() * 22), top + 14 + Math.floor(rnd() * 22), 6 + Math.floor(rnd() * 5), b.glow.map(c => mix(c, b.soil[1], 0.35)), 1);
  // grasrand (paars, verdord of as)
  for (let x = 0; x < TILE_W; x++) {
    const h = 3 + ((x * 5 + variant * 3) % 4 === 0 ? 2 : 0);
    for (let y = top + 6 - h; y < top + 7 + ((x + variant) % 3 === 0 ? 1 : 0); y++) L.put(x, y, rampPick(b.grass, 1 - (y - (top + 6 - h)) / (h + 3), x, y));
  }
  for (let i = 0; i < 5; i++) { const x = Math.floor(rnd() * 31); L.put(x, top - 1, b.grass[3]); L.put(x, top, b.grass[2]); }
  if (variant === 1) L.put(14, top - 1, b.glow[3]); // vonkje in het gras
  return L;
}

function bridgeTiles(b) {
  const tiles = [];
  for (let kind = 0; kind < 3; kind++) {
    const L = new Img(TILE_W, TILE_H);
    for (let y = 14; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
      L.put(x, y, rampPick(b.water, 0.75 - (y - 14) / 40, x, y));
      if ((x * 3 + y * 7) % 29 === 0 && y > 18) L.put(x, y, b.glow[2]); // weerkaatsing van de bliksem
    }
    if (kind !== 1) {
      const g = groundTile(b, 2);
      for (let y = 0; y < TILE_H; y++) for (let x = 0; x < TILE_W; x++) {
        const edgeX = kind === 0 ? 20 - Math.max(0, y - 10) * 0.6 : 12 + Math.max(0, y - 10) * 0.6;
        if (kind === 0 ? x < edgeX : x >= edgeX) L.put(x, y, g.get(x, y));
      }
    }
    const wood = ['#140e10', '#2a1e1e', '#3e2e2a', '#58443a'];
    for (let x = 0; x < TILE_W; x++) for (let y = 3; y < 9; y++) {
      const v = y === 3 ? 0.95 : y === 8 ? 0.1 : 0.55;
      L.put(x, y, x % 8 === 7 ? wood[0] : rampPick(wood, v, x, y));
    }
    if (kind === 1) { L.rect(14, 9, 4, 30, wood[1]); L.vline(14, 9, 38, wood[2]); L.set(15, 9, b.glow[2]); }
    tiles.push(L);
  }
  return tiles;
}

export function buildStormGround(b) {
  const tiles = [];
  for (let v = 0; v < 4; v++) tiles.push(groundTile(b, v));
  tiles.push(...bridgeTiles(b));
  const out = new Img(TILE_W * tiles.length, TILE_H);
  tiles.forEach((t, i) => out.blit(t, i * TILE_W, 0));
  return { img: out, count: tiles.length, bridge: [4, 5, 6] };
}

export function buildStormLayers(key, seedBase) {
  const b = STORM_BIOMES[key];
  return { sky: skyLayer(b), clouds: cloudLayer(b, seedBase + 1), far: farLayer(b, seedBase + 2), mid: midLayer(b, seedBase + 3), near: nearLayer(b, seedBase + 4) };
}

// --- props (gedeelde props-atlas, prefix sr_) ---------------------------------------------------
export function buildStormProps() {
  const items = [];
  const add = (name, img, outline = true) => items.push({ name, img: outline ? img.outline(OUTLINE) : img });
  const PL = STORM_BIOMES.plain, CH = STORM_BIOMES.charred, TW = STORM_BIOMES.towers, EY = STORM_BIOMES.eye;
  // dood struikje
  {
    const L = new Img(28, 18);
    srand(5);
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.32; L.thick(14, 17, 14 + Math.cos(a) * (10 + rnd() * 4), 17 + Math.sin(a) * (11 + rnd() * 4), 0.7, PL.tree[2 + (k % 2)]); }
    add('sr_bush', L);
  }
  // kleine dode boom
  { const L = new Img(30, 44); deadTree(L, 15, 43, 40, ['#120e1c', '#1e1a2c', '#2c2640', '#3c3456'], 77); add('sr_tree', L); }
  // verkoolde stronk met gloed
  {
    const L = new Img(22, 18);
    trunk(L, 3, 4, 17, 15, CH.tree);
    L.poly([[3, 4], [7, 0], [9, 4], [13, 1], [18, 4]], CH.tree[1]);
    srand(9); crackLine(L, 6, 6, 9, EMBER, 1); crackLine(L, 12, 9, 7, EMBER, 1);
    add('sr_stump', L);
  }
  // rots met bliksemader
  for (const [i, w, h, glow] of [[0, 22, 14, VOLT], [1, 30, 18, ARC]]) {
    const L = new Img(w + 2, h + 2);
    L.shadedEllipse(w / 2, h / 2 + 2, w / 2, h / 2, TW.stone.slice(0, 4), { clip: (x, y) => y < h + 1 });
    srand(30 + i); crackLine(L, 4, h / 2, w - 8, glow, 1);
    add('sr_rock' + i, L);
  }
  // bliksemafleider
  {
    const L = new Img(12, 40);
    L.rect(5, 6, 2, 34, '#4a5266'); L.vline(5, 6, 39, '#7a8296');
    L.poly([[3, 6], [6, 0], [9, 6]], '#9aa2b6');
    L.rect(2, 36, 8, 4, '#2a3040');
    L.set(6, 0, '#ffffff');
    add('sr_rod', L);
  }
  // gloeiende paddenstoeltjes (geel)
  {
    const L = new Img(16, 14);
    const g = ['#8a6a10', '#e0b020', '#ffe24a', '#fff6b0'];
    L.rect(4, 7, 2, 7, '#c8b8d8'); L.shadedEllipse(5, 6, 5, 4, g, { clip: (x, y) => y <= 7 });
    L.rect(11, 9, 2, 5, '#c8b8d8'); L.shadedEllipse(12, 8.5, 3.5, 3, g, { clip: (x, y) => y <= 9 });
    add('sr_shrooms', L);
  }
  // kapot hek
  {
    const L = new Img(34, 18);
    const w = ['#1e1620', '#34282e', '#4a3a3e'];
    for (const [x, hgt] of [[2, 15], [15, 10], [28, 13]]) { L.rect(x, 18 - hgt, 3, hgt, w[1]); L.vline(x, 18 - hgt, 17, w[2]); }
    L.line(2, 7, 16, 10, w[2]); L.line(15, 12, 30, 9, w[1]);
    add('sr_fence', L);
  }
  // runensteen met bliksemteken
  {
    const L = new Img(16, 26);
    L.shadedBlock(1, 2, 14, 24, TW.stone.slice(0, 4), { power: 3 });
    L.poly([[9, 6], [5, 13], [8, 13], [6, 20], [11, 11], [8, 11]], VOLT[2]);
    add('sr_rune', L);
  }
  // zwevend kristal (paars)
  {
    const L = new Img(14, 24);
    L.poly([[7, 0], [12, 9], [7, 20], [2, 9]], EY.glow[1]); L.poly([[7, 0], [12, 9], [7, 20]], EY.glow[2]); L.line(7, 2, 5, 9, EY.glow[3]);
    L.ellipse(7, 23, 4, 1, '#2a1448');
    add('sr_crystal', L);
  }
  // gele lantaarn
  {
    const L = new Img(12, 36);
    L.rect(5, 10, 2, 26, '#34282e');
    L.rect(2, 2, 8, 10, '#1a1420'); L.rect(3, 4, 6, 6, '#ffe24a'); L.rect(4, 5, 4, 4, '#fff6b0');
    L.hline(1, 10, 1, '#4a3a50'); L.hline(2, 9, 12, '#4a3a50');
    add('sr_lantern', L);
  }
  // as-hoopje met gloeiende kooltjes
  {
    const L = new Img(20, 9);
    L.shadedEllipse(10, 9, 9, 5, ['#1a1416', '#2e2628', '#463c3e'], { clip: (x, y) => y < 9 });
    for (const [x, y] of [[6, 6], [11, 5], [14, 7], [9, 7]]) L.set(x, y, EMBER[2 + ((x + y) % 2)]);
    add('sr_ash', L);
  }
  // paars grasplukje
  {
    const L = new Img(12, 8);
    for (let k = 0; k < 5; k++) { const x = 2 + k * 2; L.vline(x, 2 + (k % 2) * 2, 7, k % 2 ? PL.grass[2] : PL.grass[3]); }
    add('sr_tuft', L);
  }
  // voorgrond: doornen-silhouet en kristalscherven
  {
    const L = new Img(60, 40);
    srand(961);
    const ramp = ['#05030a', '#0c0814', '#140e20'];
    for (let k = 0; k < 7; k++) {
      let x = 4 + k * 8 + rnd() * 3, y = 40, a = -Math.PI / 2 + (k - 3) * 0.28;
      for (let s = 0; s < 30; s++) {
        x += Math.cos(a); y += Math.sin(a); a += (rnd() - 0.5) * 0.25;
        L.set(Math.round(x), Math.round(y), ramp[1]); L.set(Math.round(x) + 1, Math.round(y), ramp[2]);
        if (s % 6 === 3) { L.set(Math.round(x) - 1, Math.round(y) - 1, ramp[1]); L.set(Math.round(x) - 2, Math.round(y) - 2, ramp[0]); }
      }
    }
    add('sr_fg_thorns', L, false);
  }
  {
    const L = new Img(56, 40);
    for (const [x, h, w] of [[6, 26, 5], [18, 36, 7], [31, 22, 5], [43, 32, 7], [53, 16, 4]]) {
      L.poly([[x - w, 40], [x, 40 - h], [x + w, 40]], '#0c0618'); L.poly([[x, 40 - h], [x + w, 40], [x + w * 0.2, 40]], '#180c2c');
      L.line(x - w * 0.2, 40 - h * 0.8, x - w * 0.4, 38, '#4a1a8a');
    }
    add('sr_fg_shards', L, false);
  }
  return items;
}
