// ---------------------------------------------------------------------------
// Wereldkaart – één pixel-art kaart van 480x270 (schermvullend).
//   eiland met drie gebieden: Greenwood (bos, linksonder), Frostpeak (bergen,
//   midden-boven), Stormrijk (donker stormland, rechts) + een mistig eiland
//   rechtsboven (teaser), met een houten brug ernaartoe.
// Het pad, de plekken, slotjes, held, bliksem en mist tekent de game zelf
// (js/scenes/WereldkaartScene.js); de posities komen uit js/data/worldmap.js,
// zodat hier niets op het pad of de plekken komt te staan.
// ---------------------------------------------------------------------------
import { Img, rampPick, srand, rnd } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';
import { MAP_W, MAP_H, MAP_NODES, allSegments, distToPath } from '../../js/data/worldmap.js';

const GRASS = ['#173a2a', '#24603a', '#357a3e', '#4a9a44', '#6cbc52'];
const SNOW = ['#7a94bc', '#9cb4d8', '#c4d6ee', '#e4eefa', '#f8fcff'];
const STORM = ['#18121f', '#241a30', '#32263f', '#433452', '#564668'];
const MIST = ['#262838', '#33374a', '#444a60', '#596078'];
const WATER = ['#0b1838', '#102654', '#173872', '#1f4c92', '#2d66b0'];
const SHORE = { G: ['#8a6a55', '#c9a98a', '#e8d2b0'], F: ['#5a80b8', '#9cd8ff', '#e0f6ff'], S: ['#2a2038', '#45385a', '#5e4e78'], M: ['#2a2c3a', '#3e4256', '#555c74'] };
const ROCK = ['#1c1a26', '#34334a', '#555874', '#7c82a0', '#b4bcd4'];
const DEAD = ['#120c18', '#2a1e30', '#4a3a50'];
const BOLT = ['#a87a10', '#ffd23a', '#fff8b0'];

// eiland = overlappende vlekken (x, y, straal); het mistige eiland apart
const MAIN = [[95, 190, 92], [58, 142, 54], [150, 132, 74], [222, 84, 80], [300, 118, 70], [366, 166, 90], [422, 198, 52], [205, 214, 74], [282, 216, 70], [400, 116, 44], [145, 228, 60]];
const ISLE = [[436, 52, 30], [450, 62, 22], [424, 62, 20], [440, 38, 18]];
// gebieden: per gebied een paar middelpunten (dichtstbijzijnde wint, met grillige rand)
const CENTERS = [['G', 95, 188], ['G', 165, 218], ['G', 205, 232], ['F', 226, 70], ['F', 285, 88], ['F', 170, 70], ['S', 370, 165], ['S', 305, 222], ['S', 425, 205]];

/** Gladde ruis (value noise, herhaalbaar via de seed). */
function makeNoise(seedN) {
  srand(seedN);
  const G = 64, grid = Array.from({ length: G * G }, () => rnd());
  const g = (i, j) => grid[((j % G) + G) % G * G + ((i % G) + G) % G];
  const n = (x, y, s) => {
    const fx = x / s, fy = y / s, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = g(ix, iy), b = g(ix + 1, iy), c = g(ix, iy + 1), d = g(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  return (x, y) => n(x, y, 40) * 0.55 + n(x + 100, y + 37, 17) * 0.3 + n(x + 300, y + 91, 7) * 0.15;
}

const blobVal = (blobs, x, y) => blobs.reduce((m, [bx, by, r]) => Math.max(m, 1 - Math.hypot(x - bx, y - by) / r), -1);
const nodeDist = (x, y) => Math.min(...MAP_NODES.map(n => Math.hypot(x - n.x, y - n.y)));

export function buildWorldMap() {
  const L = new Img(MAP_W, MAP_H);
  const noise = makeNoise(4242), noise2 = makeNoise(777);
  const kind = new Array(MAP_W * MAP_H);   // 'W' water of gebied G/F/S/M
  const at = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? 'W' : kind[y * MAP_W + x]);

  // 1. land, water en gebieden
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const nz = noise(x, y) - 0.5;
    const main = blobVal(MAIN, x, y) + nz * 0.42, isle = blobVal(ISLE, x, y) + nz * 0.42;
    let k = 'W';
    if (isle > 0.32 && isle >= main) k = 'M';
    else if (main > 0.32) {
      let best = Infinity;
      CENTERS.forEach(([id, cx, cy], i) => {
        const j = (noise2(x * 1.8 + i * 57, y * 1.8) - 0.5) * 64 + (noise2(x * 4.5, y * 4.5 + i * 91) - 0.5) * 18;
        const d = Math.hypot(x - cx, y - cy) + j;
        if (d < best) { best = d; k = id; }
      });
    }
    kind[y * MAP_W + x] = k;
    const shade = noise(x * 1.7 + 50, y * 1.7) * 0.85 + (1 - y / MAP_H) * 0.15;
    if (k === 'W') {
      const depth = Math.max(main, isle) + 0.6;   // dichter bij land = lichter
      L.put(x, y, rampPick(WATER, depth * 0.8 + nz * 0.25, x, y));
    } else {
      const ramp = k === 'G' ? GRASS : k === 'F' ? SNOW : k === 'S' ? STORM : MIST;
      L.put(x, y, rampPick(ramp, shade, x, y));
    }
  }
  // 2. kust: strandje, donkere rand en schuim
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const k = at(x, y);
    if (k === 'W') {
      if (['G', 'F', 'S', 'M'].includes(at(x, y - 1)) || ['G', 'F', 'S', 'M'].includes(at(x - 1, y)) || ['G', 'F', 'S', 'M'].includes(at(x + 1, y))) { if ((x + y) % 2 === 0) L.set(x, y, [168, 228, 255, 110]); }
      continue;
    }
    const water1 = at(x, y + 1) === 'W' || at(x - 1, y) === 'W' || at(x + 1, y) === 'W' || at(x, y - 1) === 'W';
    const water2 = at(x, y + 2) === 'W' || at(x - 2, y) === 'W' || at(x + 2, y) === 'W' || at(x, y - 2) === 'W';
    if (water1) L.put(x, y, OUTLINE);
    else if (water2) L.put(x, y, rampPick(SHORE[k], noise(x * 3, y * 3), x, y));
    else if (at(x, y + 3) === 'W') L.put(x, y, SHORE[k][0]);   // klifje aan de zuidkant
  }
  // golfjes op zee
  srand(99);
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(rnd() * MAP_W), y = Math.floor(rnd() * MAP_H);
    if (at(x, y) === 'W' && at(x + 3, y) === 'W' && blobVal(MAIN, x, y) < 0.1) { L.set(x, y, '#4a86c8'); L.set(x + 1, y, '#6aa8e8'); L.set(x + 2, y, '#4a86c8'); }
  }

  const free = (x, y, r = 10, nr = 18) => distToPath(x, y) > r && nodeDist(x, y) > nr;
  const inKind = (x, y, k, m = 3) => at(x, y) === k && at(x - m, y) === k && at(x + m, y) === k && at(x, y + m) === k && at(x, y - m) === k;
  const items = [];   // [y, tekenfunctie] → op volgorde van y (achter → voor)

  // 3. Greenwood: bomen (rond en dennen) + ruïnes
  srand(1311);
  for (let y = 8; y < MAP_H - 6; y += 8) for (let x = 6; x < MAP_W; x += 9) {
    const px = x + Math.floor(rnd() * 7) - 3, py = y + Math.floor(rnd() * 6) - 3;
    if (rnd() < 0.3 || !inKind(px, py, 'G', 5) || !free(px, py)) continue;
    if (rnd() < 0.72) items.push([py, () => roundTree(L, px, py)]);
    else items.push([py, () => pine(L, px, py, 9 + Math.floor(rnd() * 4), P.leaf)]);
  }
  for (const [bx, by, w, h] of [[146, 204, 7, 9], [156, 207, 6, 6], [138, 210, 5, 4], [168, 200, 4, 7]]) {
    if (free(bx, by, 7, 14) && at(bx, by) === 'G') items.push([by + h, () => { L.shadedBlock(bx, by, w, h, P.stone, { power: 6 }); L.hline(bx, bx + w - 1, by + h, OUTLINE); }]);
  }

  // 4. Frostpeak: bergen met sneeuwtoppen, sneeuwdennen en een bevroren meer
  srand(2027);
  const lake = [180, 60, 14, 6];
  if (free(lake[0], lake[1], 16, 24)) items.push([lake[1] - 10, () => frozenLake(L, ...lake)]);
  for (let y = 22; y < 150; y += 15) for (let x = 140; x < 330; x += 19) {
    const px = x + Math.floor(rnd() * 9) - 4, py = y + Math.floor(rnd() * 7) - 3;
    const h = 16 + Math.floor(rnd() * 14);
    if (!inKind(px, py, 'F', 8) || !free(px, py - h / 2, 14, 24) || Math.hypot(px - lake[0], py - lake[1]) < 24) continue;
    items.push([py, () => mountain(L, px, py, h)]);
  }
  for (let i = 0; i < 40; i++) {
    const px = 140 + Math.floor(rnd() * 190), py = 30 + Math.floor(rnd() * 120);
    if (inKind(px, py, 'F', 4) && free(px, py)) items.push([py, () => pine(L, px, py, 8, ['#14363e', '#1e4c52', '#2a6262', '#e4eefa'])]);
  }

  // 5. Stormrijk: dode bomen, puntige rotsen en gloeiende scheuren
  srand(3391);
  for (let y = 100; y < MAP_H - 6; y += 12) for (let x = 280; x < MAP_W - 4; x += 13) {
    const px = x + Math.floor(rnd() * 7) - 3, py = y + Math.floor(rnd() * 7) - 3;
    if (rnd() < 0.35 || !inKind(px, py, 'S', 5) || !free(px, py)) continue;
    const r = rnd();
    if (r < 0.5) items.push([py, () => deadTree(L, px, py)]);
    else if (r < 0.93) items.push([py, () => crag(L, px, py, 6 + Math.floor(rnd() * 6))]);
    else items.push([py, () => crack(L, px, py)]);
  }

  // 6. mistig eiland: donkere rotspieken (de mist zelf beweegt in de game)
  for (const [px, py, h] of [[446, 44, 16], [424, 36, 11], [458, 54, 9]]) items.push([py, () => crag(L, px, py, h, MIST)]);

  items.sort((a, b) => a[0] - b[0]).forEach(([, fn]) => fn());

  // 7. houten brug waar het pad over water gaat
  for (const [[x0, y0], [x1, y1]] of allSegments()) {
    const len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let d = 0; d < len; d += 3) {
      const x = x0 + (x1 - x0) * d / len, y = y0 + (y1 - y0) * d / len;
      if (at(Math.round(x), Math.round(y)) !== 'W') continue;
      for (let s = -3; s <= 3; s++) L.set(x + nx * s, y + ny * s, s === -3 || s === 3 ? P.wood[0] : P.wood[2]);
      L.set(x + nx * -4, y + ny * -4, P.wood[3]); L.set(x + nx * 4, y + ny * 4, P.wood[3]);
    }
  }
  return L;
}

// --- kleine onderdelen ------------------------------------------------------------------
function roundTree(L, x, y) {
  L.rect(x, y - 2, 2, 4, P.bark[1]);
  L.set(x, y + 2, OUTLINE); L.set(x + 1, y + 2, OUTLINE);
  L.ellipse(x + 0.5, y - 5, 6, 5, OUTLINE);
  L.shadedEllipse(x + 0.5, y - 5, 5, 4.2, P.leaf);
}

function pine(L, x, y, h, ramp) {
  L.rect(x, y - 1, 1, 3, P.bark[1]);
  for (let t = 0; t < 3; t++) {
    const ty = y - 2 - t * (h * 0.28), w = (3 - t) * 2 + 1;
    L.poly([[x - w - 1, ty + 1], [x + 0.5, ty - h * 0.42 - 1], [x + w + 2, ty + 1]], OUTLINE);
    L.poly([[x - w, ty], [x + 0.5, ty - h * 0.42], [x + w + 1, ty]], ramp[1]);
    L.poly([[x - w, ty], [x + 0.5, ty - h * 0.42], [x + 0.5, ty]], ramp[2]);
    L.hline(x - w + 1, x, ty - 1, ramp[ramp.length - 1]);
  }
}

function mountain(L, x, y, h) {
  const w = Math.round(h * 0.95), top = [x, y - h];
  L.poly([[x - w - 1, y + 1], [top[0], top[1] - 1], [x + w + 1, y + 1]], OUTLINE);
  L.poly([[x - w, y], top, [x, y]], ROCK[3]);          // lichte kant (licht van links)
  L.poly([[x, y], top, [x + w, y]], ROCK[1]);           // schaduwkant
  const cap = 0.42, cy = y - h + h * cap, cw = w * cap;
  L.poly([[x - cw, cy], top, [x, cy + 2], [x - cw * 0.4, cy - 1]], SNOW[4]);
  L.poly([[x, cy + 2], top, [x + cw, cy], [x + cw * 0.5, cy + 2]], SNOW[2]);
  L.line(x, y - h + 1, x, y - 2, ROCK[2]);
}

function frozenLake(L, x, y, rx, ry) {
  L.ellipse(x, y, rx + 1, ry + 1, OUTLINE);
  L.shadedEllipse(x, y, rx, ry, ['#2f74c0', '#5aa8e8', '#9cd8ff', '#e0f6ff'], { squish: 0.3 });
  L.line(x - rx + 4, y - 1, x - 2, y - 3, '#ffffff'); L.line(x + 2, y + 1, x + rx - 5, y - 1, '#e0f6ff');
}

function deadTree(L, x, y) {
  L.vline(x, y - 9, y, DEAD[1]); L.vline(x + 1, y - 7, y, DEAD[0]);
  L.line(x, y - 6, x - 3, y - 9, DEAD[1]); L.line(x + 1, y - 4, x + 4, y - 8, DEAD[1]);
  L.set(x - 3, y - 10, DEAD[2]); L.set(x + 4, y - 9, DEAD[2]);
  L.hline(x - 1, x + 2, y + 1, OUTLINE);
}

function crag(L, x, y, h, ramp = STORM) {
  const w = Math.max(3, Math.round(h * 0.45));
  L.poly([[x - w - 1, y + 1], [x, y - h - 1], [x + w + 1, y + 1]], OUTLINE);
  L.poly([[x - w, y], [x, y - h], [x + w, y]], ramp[2]);
  L.poly([[x, y], [x, y - h], [x + w, y]], ramp[1]);
  L.line(x - w + 1, y - 1, x - 1, y - h + 2, ramp[ramp.length - 1]);
}

function crack(L, x, y) {
  let cx = x, cy = y;
  for (let i = 0; i < 6; i++) { const nx = cx + (i % 2 ? 2 : -1), ny = cy + 1; L.line(cx, cy, nx, ny, BOLT[1]); cx = nx; cy = ny; }
  L.set(x, y, BOLT[2]);
}
