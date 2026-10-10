// ---------------------------------------------------------------------------
// Wereld-exclusieve pets – 5 per wereld, alleen te vinden in de wereldkist
// van die wereld (de boss daar verslaan). Zelfde opzet als pets.js:
// kijken naar RECHTS, framemaat/anker/frames in WORLD_PET_SPECS, en hoe
// zeldzamer, hoe groter en spectaculairder.
//   Greenwood  eekhoorntje, egeltje, kolibrie, bloesemhert, feeënvlinder
//   Frostpeak  sneeuwhaasje, ijsbeertje, rendiertje, luchtnarwal, mammoetje
//   Stormrijk  bliksemgekko, lantaarnvisje, donderbij, stormgriffioen, stormfeniks
// Bewust anders dan de 10 kist-pets en alle vijanden (geen vos/uil/slijm/
// schildpad/wolf/kat/draak/kraai/wolkje/pinguïn).
// ---------------------------------------------------------------------------
import { Img } from '../lib/raster.js';
import { OUTLINE } from '../lib/palette.js';

const TAU = Math.PI * 2;
const EYE = '#1a1324';
const F = (idle, run, cheer) => ({ idle, run, cheer });

export const WORLD_PET_SPECS = {
  squirrel: { fw: 24, fh: 24, anchor: [12, 22], frames: F(4, 6, 4) },
  hedgehog: { fw: 24, fh: 24, anchor: [12, 22], frames: F(4, 6, 6) },
  hummingbird: { fw: 24, fh: 24, anchor: [12, 22], frames: F(6, 6, 6) },
  deer: { fw: 32, fh: 34, anchor: [16, 32], frames: F(6, 6, 6) },
  butterfly: { fw: 38, fh: 34, anchor: [19, 32], frames: F(8, 8, 8) },
  bunny: { fw: 24, fh: 26, anchor: [12, 24], frames: F(4, 6, 4) },
  polarbear: { fw: 26, fh: 24, anchor: [13, 22], frames: F(4, 6, 4) },
  reindeer: { fw: 28, fh: 30, anchor: [14, 28], frames: F(4, 6, 6) },
  narwhal: { fw: 38, fh: 28, anchor: [19, 26], frames: F(6, 6, 6) },
  mammoth: { fw: 44, fh: 38, anchor: [22, 36], frames: F(6, 6, 8) },
  gecko: { fw: 26, fh: 22, anchor: [13, 20], frames: F(4, 6, 4) },
  anglerfish: { fw: 24, fh: 26, anchor: [12, 24], frames: F(6, 6, 6) },
  bee: { fw: 24, fh: 24, anchor: [12, 22], frames: F(6, 6, 6) },
  griffin: { fw: 36, fh: 34, anchor: [18, 32], frames: F(6, 6, 6) },
  phoenix: { fw: 40, fh: 36, anchor: [20, 34], frames: F(8, 8, 8) },
};

function eye(L, x, y, closed = false, happy = false, col = EYE) {
  if (happy) { L.set(x - 1, y + 1, col); L.set(x, y, col); L.set(x + 1, y + 1, col); return; }
  if (closed) { L.hline(x - 1, x + 1, y + 1, col); return; }
  L.rect(x, y, 2, 2, col); L.set(x, y, '#ffffff');
}
const blinkAt = (mode, p) => mode === 'idle' && p > 0.75;

// ============================== GREENWOOD ==============================
// --- Eekhoorntje (gewoon): grote pluimstaart, eikel in de pootjes --------------
const SQ = ['#4a2414', '#7a3e20', '#a86230', '#d8924e'];
function squirrel(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1], ph = p * TAU;
  const lift = mode === 'cheer' ? Math.round(Math.max(0, Math.sin(ph)) * 5) : mode === 'run' ? Math.round(Math.max(0, Math.sin(ph)) * 3) : 0;
  const by = G - 6 - lift;
  // pluimstaart (achter, krult omhoog)
  const sw = Math.sin(ph) * 1.2;
  L.shadedEllipse(6 + sw * 0.3, by - 3, 4.5, 6.5, SQ);
  L.shadedEllipse(4.5 + sw, by - 9, 4, 4, SQ);
  L.set(3 + sw, by - 12, SQ[3]); L.set(4 + sw, by - 13, SQ[3]);
  // pootjes
  const o = mode === 'run' ? Math.round(Math.sin(ph) * 2) : 0;
  L.rect(10 + o, G - 2 - lift, 3, 2, SQ[0]); L.rect(14 - o, G - 2 - lift, 3, 2, SQ[0]);
  // lijf + buik
  L.shadedEllipse(13, by + 1, 5, 5, SQ);
  L.shadedEllipse(15, by + 2, 2.5, 3.5, ['#d8c0a0', '#f4e4c8']);
  // kop
  const hy = by - 6;
  L.shadedEllipse(16, hy, 4.2, 3.8, SQ);
  L.poly([[13.5, hy - 2], [14, hy - 7], [16, hy - 3]], SQ[2]); L.set(14, hy - 7, SQ[3]);
  L.set(20, hy + 1, EYE); // neus
  eye(L, 17, hy - 1, blinkAt(mode, p), mode === 'cheer');
  // eikel (bij juichen omhoog gestoken)
  const ay = mode === 'cheer' ? hy - 6 : by;
  L.shadedEllipse(19, ay + 1, 2, 2.4, ['#8a5a20', '#c08a3a', '#e8b860']);
  L.rect(17, ay - 1, 4, 1, '#5a3a1a'); L.set(19, ay - 2, '#5a3a1a');
  return L.outline(OUTLINE);
}

// --- Egeltje (gewoon): stekels met besjes; juichen = rollen als bal ---------------
const HH = ['#2e1e16', '#4e3424', '#76523a', '#a07a58'];
function hedgehog(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1], ph = p * TAU;
  if (mode === 'cheer') {
    // opgerold balletje dat stuitert en draait
    const lift = Math.round(Math.abs(Math.sin(ph)) * 6), cx = 12, cy = G - 6 - lift;
    L.shadedEllipse(cx, cy, 6, 6, HH);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + ph; L.line(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, HH[i % 2 ? 3 : 2]); }
    L.set(cx + Math.cos(ph) * 3, cy + Math.sin(ph) * 3, '#e8483f');
    return L.outline(OUTLINE);
  }
  const bob = mode === 'run' ? Math.round(Math.abs(Math.sin(ph))) : 0;
  const by = G - 4 - bob;
  const o = mode === 'run' ? Math.round(Math.sin(ph) * 1.5) : 0;
  L.rect(8 + o, G - 1, 2, 2, '#3a2a20'); L.rect(14 - o, G - 1, 2, 2, '#3a2a20');
  // stekelrug
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + i / 10 * Math.PI * 0.9, x0 = 11 + Math.cos(a) * 5, y0 = by + Math.sin(a) * 5;
    L.line(x0, y0, 11 + Math.cos(a) * 9, by + Math.sin(a) * 8, HH[i % 2 ? 2 : 1]);
    L.set(11 + Math.cos(a) * 9, by + Math.sin(a) * 8, HH[3]);
  }
  L.shadedEllipse(11, by, 7, 4.5, HH, { clip: (x, y) => y <= by + 3 });
  // gezichtje (licht) + spitse snuit
  L.shadedEllipse(17, by + 1, 4, 3.2, ['#c8a07a', '#e8c8a0', '#f8e4c8']);
  L.poly([[19, by], [23, by + 1.5], [19, by + 3]], '#e8c8a0');
  L.set(22, by + 1, EYE); L.set(23, by + 1, EYE);
  eye(L, 17, by - 1, blinkAt(mode, p));
  L.set(16, by + 2, '#ff9aa0');
  // besjes + blaadje op de stekels
  L.disc(7, by - 6, 1.2, '#e8483f'); L.set(6, by - 7, '#ffb0a0');
  L.disc(11, by - 7, 1, '#c21f3a');
  L.poly([[13, by - 7], [16, by - 9], [15, by - 6]], '#5fd65a');
  return L.outline(OUTLINE);
}

// --- Kolibrie (zeldzaam): piepklein, zoemende vleugels, lange snavel -----------------
const HB = ['#0e4a3a', '#1a7a5a', '#2eb07a', '#7ae8b0'];
function hummingbird(p, mode, S) {
  const L = new Img(S.fw, S.fh), ph = p * TAU;
  const cy = 11 + Math.round(Math.sin(ph) * 1.5) - (mode === 'cheer' ? Math.round(Math.sin(p * Math.PI) * 4) : 0);
  const tilt = mode === 'run' ? 1 : 0;
  // staart (gevorkt, links)
  L.poly([[8, cy + 1], [3, cy + 4 + tilt], [5, cy + 1], [2, cy + 1 - tilt]], HB[1]);
  // vleugelflits (snel: twee posities over elkaar, half doorzichtig)
  const up = Math.floor(p * 12) % 2 === 0;
  L.poly([[11, cy - 1], [7, cy - 9], [13, cy - 2]], up ? '#c8f8e8c0' : '#c8f8e860');
  L.poly([[11, cy], [5, cy + 5], [12, cy + 2]], up ? '#c8f8e860' : '#c8f8e8c0');
  // lijf
  L.shadedEllipse(11, cy + 1, 4.5, 3, HB);
  L.shadedEllipse(12, cy + 2.5, 2.5, 1.5, ['#e8d8f0', '#fff4ff']);
  // kop met rode keel
  L.shadedEllipse(15, cy - 1, 2.8, 2.6, HB);
  L.rect(15, cy, 2, 2, '#ff4a6a'); L.set(16, cy, '#ff9ab0');
  // lange snavel
  L.line(17, cy - 1, 22 + (mode === 'cheer' ? 0 : 0), cy - 1 + tilt, '#2a2030');
  eye(L, 15, cy - 2, false, mode === 'cheer');
  L.outline(OUTLINE);
  // bloemblaadje bij de snavel (glinster)
  if (mode === 'cheer') { L.set(22, cy - 4, '#ff9ad0'); L.set(21, cy - 5, '#ff9ad0'); L.set(23, cy - 5, '#ffffff'); }
  return L;
}

// --- Bloesemhert (episch): reekalf met een gewei vol bloesem --------------------------
const DEER = ['#5a3218', '#8a5228', '#b87a40', '#e0a868'];
function deer(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1], ph = p * TAU;
  const cheer = mode === 'cheer', run = mode === 'run';
  const rear = cheer ? Math.max(0, Math.sin(p * Math.PI)) : 0; // steigeren
  const by = G - 12 - (run ? Math.round(Math.max(0, Math.sin(ph * 2)) * 1.5) : 0) - Math.round(rear * 2);
  // dunne pootjes (galop bij rennen)
  const legs = run ? [Math.sin(ph) * 3, Math.sin(ph + Math.PI) * 3] : [0, 0];
  for (const [x, o, c, front] of [[9, legs[0], DEER[1], 0], [12, legs[1], DEER[0], 0], [19, legs[1], DEER[1], 1], [22, legs[0], DEER[0], 1]]) {
    const fy = front ? G - rear * 6 : G;
    L.line(x, by + 3, x + o, fy - 1, c); L.line(x + 1, by + 3, x + 1 + o, fy - 1, c);
    L.set(Math.round(x + o), fy, '#2a1810'); L.set(Math.round(x + o) + 1, fy, '#2a1810');
  }
  // lijf met witte stipjes + staartje
  L.shadedEllipse(15, by + 1, 8, 4.5, DEER);
  for (const [x, y] of [[11, by - 1], [14, by - 2], [17, by - 1], [13, by + 1], [16, by + 1]]) L.set(x, y, '#fff4e0');
  L.poly([[7, by - 2], [5, by - 4], [7.5, by]], '#fff4e0');
  // nek + kop (kijkt naar rechts)
  const hx = 23 + Math.round(rear), hy = by - 6 - Math.round(rear * 3);
  L.thick(19, by - 1, hx - 1, hy + 2, 2, DEER[2]);
  L.shadedEllipse(hx, hy, 3.6, 3, DEER);
  L.poly([[hx + 2, hy - 0.5], [hx + 6, hy + 1], [hx + 2, hy + 2.5]], DEER[3]);
  L.set(hx + 5, hy + 1, EYE);
  L.poly([[hx - 3, hy - 2], [hx - 6, hy - 4], [hx - 2, hy - 1]], DEER[2]); // oor
  eye(L, hx, hy - 1, blinkAt(mode, p), cheer);
  // gewei met bloesem
  const ax = hx - 1, ay = hy - 3;
  L.line(ax, ay, ax - 2, ay - 6, '#d8c0a0'); L.line(ax - 1, ay - 3, ax - 5, ay - 5, '#d8c0a0');
  L.line(ax + 1, ay, ax + 3, ay - 6, '#c8b090'); L.line(ax + 2, ay - 3, ax + 5, ay - 5, '#c8b090');
  L.outline(OUTLINE);
  const pink = ['#ff8ad0', '#ffc0e8', '#ffffff'];
  for (const [x, y, k] of [[ax - 2, ay - 7, 0], [ax - 5, ay - 6, 1], [ax + 3, ay - 7, 0], [ax + 5, ay - 6, 1], [ax, ay - 5, 2]]) {
    L.set(x, y, pink[k]); L.set(x + 1, y, pink[0]); L.set(x, y - 1, pink[1]);
  }
  // juichen: blaadjesregen in de sprite
  if (cheer) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + p * 3; L.set(16 + Math.cos(a) * 13, by - 6 + Math.sin(a) * 8, pink[i % 2]); }
  return L;
}

// --- Feeënvlinder (legendarisch): grote pastelvleugels, glinsterlijf ----------------------
function butterfly(p, mode, S) {
  const L = new Img(S.fw, S.fh), ph = p * TAU;
  const cheer = mode === 'cheer';
  const cx = 19, cy = 16 + Math.round(Math.sin(ph) * 1.5) - (cheer ? Math.round(Math.sin(p * Math.PI) * 3) : 0);
  // vleugelslag: breedte wisselt (van voren gezien openen/sluiten)
  const open = 0.35 + 0.65 * Math.abs(Math.cos(ph * (cheer ? 2 : 1)));
  const UP = ['#6a3ab0', '#a070e8', '#f0a0e8', '#ffe0f8'], LO = ['#2a6ab0', '#4aa0e8', '#8ad8ff', '#e0f8ff'];
  for (const side of [-1, 1]) {
    const k = side * open;
    // bovenvleugel
    L.poly([[cx, cy - 1], [cx + k * 6, cy - 12], [cx + k * 16, cy - 13], [cx + k * 17, cy - 4], [cx + k * 4, cy + 1]], UP[1]);
    L.poly([[cx + k * 2, cy - 2], [cx + k * 7, cy - 10], [cx + k * 13, cy - 10], [cx + k * 12, cy - 5]], UP[2]);
    // ondervleugel
    L.poly([[cx, cy + 1], [cx + k * 12, cy + 2], [cx + k * 13, cy + 10], [cx + k * 6, cy + 12], [cx + k * 2, cy + 5]], LO[1]);
    L.poly([[cx + k * 3, cy + 3], [cx + k * 10, cy + 4], [cx + k * 9, cy + 9], [cx + k * 5, cy + 9]], LO[2]);
    // stippen
    L.disc(cx + k * 11, cy - 8, 1.4 * open + 0.3, UP[3]);
    L.disc(cx + k * 8, cy + 6, 1.2 * open + 0.3, LO[3]);
  }
  // lijfje + kopje + voelsprieten
  L.shadedEllipse(cx, cy + 1, 1.8, 6, ['#3a2a5a', '#6a4a9a', '#b090e0']);
  L.disc(cx, cy - 6, 2.2, '#6a4a9a');
  L.line(cx - 1, cy - 8, cx - 4, cy - 13, '#3a2a5a'); L.line(cx + 1, cy - 8, cx + 4, cy - 13, '#3a2a5a');
  L.set(cx - 4, cy - 14, '#ffe0f8'); L.set(cx + 4, cy - 14, '#ffe0f8');
  eye(L, cx - 1, cy - 7, false, cheer || mode === 'run', '#ffffff');
  L.outline('#2a1a4a');
  // glinsters rond de vlinder (draaien mee)
  for (let i = 0; i < 4; i++) {
    const a = ph + i / 4 * TAU, x = cx + Math.cos(a) * 17, y = cy + Math.sin(a) * 12;
    L.set(x, y, '#ffffff'); L.set(x - 1, y, '#ffc0e8'); L.set(x + 1, y, '#ffc0e8'); L.set(x, y - 1, '#c0e8ff'); L.set(x, y + 1, '#c0e8ff');
  }
  if (cheer) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + p * 2, r = 8 + Math.sin(p * Math.PI) * 8; L.set(cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 2 ? '#ffe0f8' : '#e0f8ff'); }
  return L;
}

// ============================== FROSTPEAK ==============================
const WHITE = ['#8a9ab8', '#c4d0e4', '#eef4fc', '#ffffff'];
// --- Sneeuwhaasje (gewoon): lange oren, rode sjaal ----------------------------------------
function bunny(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1], ph = p * TAU;
  const lift = mode === 'cheer' ? Math.round(Math.max(0, Math.sin(ph)) * 6) : mode === 'run' ? Math.round(Math.max(0, Math.sin(ph)) * 4) : 0;
  const by = G - 5 - lift;
  const tuck = lift > 2 ? -2 : 0;
  // achterpoot + staartje
  L.shadedEllipse(8, by + 2, 3.5, 2.6, WHITE);
  L.rect(5 + tuck, G - 1 - lift, 6, 2, WHITE[1]);
  L.disc(4, by - 1, 1.8, '#ffffff');
  // lijf
  L.shadedEllipse(11, by, 5.5, 4.2, WHITE);
  L.rect(14 - tuck, G - 1 - lift, 3, 2, WHITE[1]);
  // kop + oren
  const hy = by - 5;
  L.shadedEllipse(15, hy, 3.8, 3.4, WHITE);
  const ear = mode === 'cheer' ? -1 : Math.round(Math.sin(ph) * 0.8);
  L.thick(13, hy - 2, 11 + ear, hy - 10, 1.2, WHITE[2]); L.line(13, hy - 3, 11.5 + ear, hy - 8, '#ffb0c8');
  L.thick(15, hy - 2, 15 + ear, hy - 10, 1.2, WHITE[2]); L.line(15, hy - 3, 15 + ear, hy - 8, '#ffb0c8');
  L.set(19, hy + 1, '#ff8aa8');
  eye(L, 16, hy - 1, blinkAt(mode, p), mode === 'cheer');
  // rode sjaal met wapperende punt
  L.hline(12, 17, hy + 3, '#e8483f'); L.hline(12, 17, hy + 4, '#b02a3a');
  const fl = Math.round(Math.sin(ph * 2) * 1);
  L.poly([[12, hy + 3], [7, hy + 2 + fl], [7, hy + 5 + fl], [12, hy + 5]], '#e8483f');
  return L.outline(OUTLINE);
}

// --- IJsbeertje (gewoon): rond, op vier pootjes, blauwe sjaal ------------------------------
function polarbear(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1], ph = p * TAU;
  const cheer = mode === 'cheer';
  const bob = mode === 'run' ? Math.round(Math.abs(Math.sin(ph))) : 0;
  if (cheer) {
    // zit rechtop en zwaait
    const by = G - 7;
    L.shadedEllipse(12, by, 6, 6.5, WHITE);
    L.rect(7, G - 2, 4, 2, WHITE[1]); L.rect(13, G - 2, 4, 2, WHITE[1]);
    const wave = Math.round(Math.sin(ph * 2) * 2);
    L.thick(16, by - 2, 20, by - 7 + wave, 1.6, WHITE[2]);
    L.shadedEllipse(14, by - 8, 4.6, 4, WHITE);
    L.disc(10.5, by - 11, 1.6, WHITE[2]); L.disc(17, by - 11, 1.6, WHITE[2]);
    L.set(18, by - 7, EYE); eye(L, 15, by - 9, false, true);
    L.hline(10, 18, by - 4, '#2f8ae0'); L.hline(10, 18, by - 3, '#1e5ab0');
    return L.outline(OUTLINE);
  }
  const by = G - 6 - bob;
  const o = mode === 'run' ? Math.round(Math.sin(ph) * 1.5) : 0;
  for (const [x, oo, c] of [[6, o, WHITE[1]], [9, -o, WHITE[0]], [15, -o, WHITE[1]], [18, o, WHITE[0]]]) L.rect(x + oo, by + 3, 3, G - by - 3, c);
  L.shadedEllipse(12, by, 8, 5, WHITE);
  // kop
  const hy = by - 3;
  L.shadedEllipse(19, hy, 4.5, 3.8, WHITE);
  L.disc(17, hy - 3.5, 1.5, WHITE[2]);
  L.shadedEllipse(22.5, hy + 1, 2, 1.6, WHITE);
  L.set(24, hy, EYE);
  eye(L, 19, hy - 1, blinkAt(mode, p));
  // sjaal
  L.vline(15, hy - 1, hy + 4, '#2f8ae0'); L.vline(16, hy - 1, hy + 4, '#1e5ab0');
  L.poly([[15, hy + 3], [13, hy + 7], [16, hy + 6]], '#2f8ae0');
  return L.outline(OUTLINE);
}

// --- Rendiertje (zeldzaam): geweitje, rode halsband met belletjes ----------------------------
const RD = ['#4a2a18', '#7a4a2a', '#a8703e', '#d8a068'];
function reindeer(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1], ph = p * TAU;
  const cheer = mode === 'cheer', run = mode === 'run';
  const lift = cheer ? Math.round(Math.max(0, Math.sin(ph)) * 4) : 0;
  const by = G - 10 - lift - (run ? Math.round(Math.abs(Math.sin(ph)) * 1) : 0);
  const legs = run ? [Math.sin(ph) * 2.5, Math.sin(ph + Math.PI) * 2.5] : [0, 0];
  for (const [x, o, c] of [[7, legs[0], RD[0]], [10, legs[1], RD[1]], [16, legs[1], RD[0]], [19, legs[0], RD[1]]]) {
    L.line(x, by + 3, x + o, G - 1 - lift, c); L.line(x + 1, by + 3, x + 1 + o, G - 1 - lift, c);
    L.set(Math.round(x + o), G - lift, '#1a1010'); L.set(Math.round(x + o) + 1, G - lift, '#1a1010');
  }
  L.shadedEllipse(13, by + 1, 7.5, 4.2, RD);
  L.disc(5.5, by - 1, 1.6, '#fff4e0'); // wit staartje
  // kop
  const hx = 21, hy = by - 6;
  L.thick(17, by - 1, hx - 1, hy + 2, 2, RD[2]);
  L.shadedEllipse(hx, hy, 3.6, 3, RD);
  L.poly([[hx + 2, hy - 0.5], [hx + 5, hy + 1], [hx + 2, hy + 2.5]], RD[3]);
  L.disc(hx + 5, hy + 1, 1.1, '#c21f3a'); // rood neusje
  L.poly([[hx - 3, hy - 1], [hx - 6, hy - 2], [hx - 2, hy]], RD[1]);
  eye(L, hx, hy - 1, blinkAt(mode, p), cheer);
  // geweitje
  L.line(hx - 1, hy - 3, hx - 3, hy - 9, '#e8d8b8'); L.line(hx - 2, hy - 6, hx - 5, hy - 7, '#e8d8b8');
  L.line(hx + 1, hy - 3, hx + 2, hy - 9, '#d8c8a8'); L.line(hx + 1, hy - 6, hx + 4, hy - 7, '#d8c8a8');
  // halsband met belletjes
  L.line(17, by - 3, 19, by + 1, '#c21f3a'); L.line(18, by - 3, 20, by + 1, '#e8483f');
  const ring = cheer ? Math.round(Math.sin(ph * 3)) : 0;
  L.disc(19 + ring, by + 2, 1.3, '#ffc93c'); L.set(19 + ring, by + 1, '#fff1a0');
  L.outline(OUTLINE);
  if (cheer) for (const [x, y] of [[23, by - 2], [25, by + 1]]) { L.set(x + ring, y, '#fff1a0'); L.set(x + 1 + ring, y - 1, '#ffffff'); } // rinkel-glinsters
  return L;
}

// --- Luchtnarwal (episch): zwemt door de lucht, gloeiende hoorn -------------------------------
const NW = ['#1e3a6a', '#2e5a9a', '#4a86c8', '#7ab4e8'];
function narwhal(p, mode, S) {
  const L = new Img(S.fw, S.fh), ph = p * TAU;
  const cheer = mode === 'cheer';
  const roll = cheer ? Math.sin(p * Math.PI) : 0;
  const cy = 15 + Math.round(Math.sin(ph) * 2) - Math.round(roll * 4);
  const wave = Math.sin(ph * (mode === 'run' ? 2 : 1));
  // staartvin (golft)
  const tx = 6, ty = cy + Math.round(wave * 2);
  L.poly([[tx + 5, cy], [tx - 3, ty - 5], [tx + 1, ty], [tx - 3, ty + 5]], NW[1]);
  // lijf
  L.thick(tx + 4, cy, 14, cy + wave * 0.5, 3, NW[2]);
  L.shadedEllipse(20, cy, 9, 5.5, NW);
  L.shadedEllipse(21, cy + 2.5, 7, 2.5, ['#a8c8e8', '#dcecfa', '#ffffff']);
  // vlekjes op de rug
  for (const [x, y] of [[15, cy - 3], [19, cy - 4], [23, cy - 3]]) L.set(x, y, NW[0]);
  // vinnetje
  L.poly([[19, cy + 2], [16, cy + 7 + Math.round(wave)], [21, cy + 3]], NW[1]);
  eye(L, 25, cy - 1, blinkAt(mode, p), cheer);
  L.set(27, cy + 2, NW[0]);
  L.outline('#0e1a3a');
  // lange gedraaide hoorn met gloeiende punt (na de outline)
  for (let i = 0; i < 9; i++) L.set(29 + i, cy - 2 - i * 0.35, i % 2 ? '#e8f4ff' : '#b4d8f4');
  L.disc(38, cy - 5, 1.2, '#8affff'); L.set(37, cy - 5, '#ffffff');
  if (cheer) for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + p * 4; L.set(20 + Math.cos(a) * 14, cy + Math.sin(a) * 9, i % 2 ? '#ffffff' : '#b4f4ff'); }
  return L;
}

// --- Mammoetje (legendarisch): groot, wollig, slurf, slagtandjes -------------------------------
const MM = ['#2e140c', '#5a2614', '#86401e', '#b0602e'];
function mammoth(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1], ph = p * TAU;
  const cheer = mode === 'cheer', run = mode === 'run';
  const bob = run ? Math.round(Math.abs(Math.sin(ph))) : Math.round(Math.sin(ph) * 0.6);
  const by = G - 15 - bob;
  // poten (dik, stampen)
  const legs = run ? [Math.sin(ph) * 2, Math.sin(ph + Math.PI) * 2] : [0, 0];
  for (const [x, o, c] of [[9, legs[0], MM[0]], [15, legs[1], MM[1]], [24, legs[1], MM[0]], [30, legs[0], MM[1]]]) {
    L.shadedBlock(Math.round(x + o), by + 6, 6, G - by - 6, [c, MM[2], MM[2]], { power: 3 });
    L.hline(Math.round(x + o), Math.round(x + o) + 5, G, '#e8d8b8');
  }
  // wollig lijf
  L.shadedEllipse(20, by, 15, 10, MM);
  for (let i = 0; i < 26; i++) { const x = 7 + (i * 11) % 27, y = by - 6 + (i * 7) % 13; L.line(x, y, x - 1, y + 2, MM[i % 2 ? 1 : 3]); }
  // hangende vachtfranje onder het lijf (typisch mammoet, geen olifant)
  for (let x = 7; x < 33; x += 2) { const len = 3 + ((x * 7) % 4); L.line(x, by + 7, x - 1, by + 7 + len, MM[(x >> 1) % 2 ? 1 : 2]); }
  // bult op de kop/schouder
  L.shadedEllipse(28, by - 7, 6, 4, MM);
  // sneeuw op de rug
  for (let x = 10; x < 30; x++) { const y = Math.round(by - 9.5 + Math.abs(x - 20) * 0.12); L.set(x, y, '#ffffff'); if (x % 3 === 0) L.set(x, y + 1, '#dce8f6'); }
  L.disc(6, by + 1, 2, MM[1]); // staartpluim
  // kop
  const hx = 34, hy = by - 3;
  L.shadedEllipse(hx, hy, 7, 7, MM);
  L.shadedEllipse(hx - 4, hy - 1, 3.5, 4.5, MM.slice(0, 3)); // oor
  for (let i = 0; i < 6; i++) L.set(hx - 2 + i, hy - 7, i % 2 ? '#ffffff' : '#dce8f6');
  eye(L, hx + 2, hy - 2, blinkAt(mode, p), cheer);
  // slurf (bij juichen omhoog: trompetteren)
  const pts = cheer ? [[hx + 5, hy + 2], [hx + 9, hy - 2], [hx + 10, hy - 8], [hx + 8, hy - 12]] : [[hx + 5, hy + 2], [hx + 8, hy + 6], [hx + 8, hy + 11], [hx + 6, hy + 13 + Math.round(Math.sin(ph))]];
  for (let i = 0; i < pts.length - 1; i++) L.thick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2.2 - i * 0.4, MM[2]);
  // grote, gekromde slagtanden
  for (const [dx, c] of [[0, '#fff4e0'], [1, '#e8d8b8']]) {
    L.line(hx + 3 + dx, hy + 4, hx + 5 + dx, hy + 9, c); L.line(hx + 5 + dx, hy + 9, hx + 9 + dx, hy + 10, c); L.line(hx + 9 + dx, hy + 10, hx + 11 + dx, hy + 7, c);
  }
  L.outline(OUTLINE);
  if (cheer) {
    // trompetstoot: sneeuwvlokjes en noorderlicht-glinsters uit de slurf
    const [ex, ey] = pts[pts.length - 1], k = Math.sin(p * Math.PI);
    for (let i = 0; i < 7; i++) { const a = -1.9 + i * 0.25, r = 3 + k * 9 + (i % 2) * 2; L.set(ex + Math.cos(a) * r, ey + Math.sin(a) * r, ['#ffffff', '#7affc8', '#b4e4ff', '#c890ff'][i % 4]); }
  }
  return L;
}

// ============================== STORMRIJK ==============================
const VOLT = ['#8a6a10', '#e0b020', '#ffe24a', '#fff6b0'];
// --- Bliksemgekko (gewoon): laag lijf, gele zigzagstreep, vonkjes ---------------------------
const GK = ['#0e2a1e', '#1a4a32', '#2e7048', '#4a9a62'];
function gecko(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1], ph = p * TAU;
  const cheer = mode === 'cheer', run = mode === 'run';
  const lift = cheer ? Math.round(Math.max(0, Math.sin(ph)) * 4) : 0;
  const by = G - 4 - lift;
  const sw = Math.sin(ph * (run ? 2 : 1));
  // gekrulde staart
  L.thick(8, by, 4, by + 1 + sw, 1.3, GK[2]);
  L.thick(4, by + 1 + sw, 2, by - 2 + sw, 1, GK[3]);
  // pootjes (gespreid, wisselen bij rennen)
  for (const [x, s] of [[9, 1], [17, -1]]) {
    const o = run ? Math.round(sw * 2 * s) : 0;
    L.line(x, by + 1, x - 2 + o, G - lift, GK[1]); L.line(x + 1, by + 1, x + 3 - o, G - lift, GK[1]);
  }
  L.shadedEllipse(13, by, 7, 2.8, GK);
  // kop
  L.shadedEllipse(21, by - 1, 3.5, 2.6, GK);
  L.disc(21.5, by - 3, 1.6, '#ffe24a'); L.rect(21, by - 4, 2, 2, EYE); L.set(22, by - 4, '#ffffff'); // grote ogen bovenop
  if (cheer) L.hline(23, 24, by, '#ff8aa8'); // tongetje
  L.outline(OUTLINE);
  // zigzag-bliksemstreep over de rug (na outline, gloeit)
  for (let i = 0; i < 6; i++) L.set(8 + i * 2, by - 2 + (i % 2), VOLT[2]), L.set(9 + i * 2, by - 2 + (i % 2 ? 0 : 1), VOLT[1]);
  if (run || cheer) { const k = Math.floor(p * 6) % 3; L.set(9 + k * 4, G - lift, VOLT[3]); }
  return L;
}

// --- Lantaarnvisje (gewoon): zwevende diepzeevis met lichtje ------------------------------------
const AF = ['#140a24', '#26143e', '#3c2462', '#5a3a8a'];
function anglerfish(p, mode, S) {
  const L = new Img(S.fw, S.fh), ph = p * TAU;
  const cheer = mode === 'cheer';
  const cy = 15 + Math.round(Math.sin(ph) * 1.5) - (cheer ? Math.round(Math.sin(p * Math.PI) * 3) : 0);
  const fin = Math.sin(ph * 2);
  L.poly([[6, cy], [1, cy - 4 - fin], [2, cy], [1, cy + 4 + fin]], AF[2]); // staart
  L.shadedEllipse(12, cy, 7, 6, AF);
  L.poly([[10, cy - 5], [8, cy - 9], [13, cy - 6]], AF[3]); // rugvin
  L.poly([[11, cy + 3], [9, cy + 7 + Math.round(fin)], [13, cy + 4]], AF[3]);
  // grote bek met tandjes
  const open = cheer ? 3 : 1 + Math.round(Math.max(0, fin));
  L.poly([[15, cy + 1], [20, cy], [19, cy + 2 + open], [15, cy + 3]], '#0a0414');
  for (const x of [16, 18]) { L.set(x, cy + 1, '#ffffff'); L.set(x + 1, cy + 2 + open, '#ffffff'); }
  eye(L, 15, cy - 3, blinkAt(mode, p), false);
  L.outline('#0a0414');
  // hengeltje met lichtje (gloeit)
  L.line(14, cy - 5, 17, cy - 10, AF[3]); L.line(17, cy - 10, 20, cy - 9, AF[3]);
  const glow = cheer ? 2.2 : 1.4 + Math.abs(Math.sin(ph * 2)) * 0.6;
  L.disc(21, cy - 8, glow + 1, '#ffe24a50');
  L.disc(21, cy - 8, glow, '#ffe24a'); L.set(21, cy - 9, '#ffffff');
  return L;
}

// --- Donderbij (zeldzaam): dikke hommel met bliksemstreep ------------------------------------------
function bee(p, mode, S) {
  const L = new Img(S.fw, S.fh), ph = p * TAU;
  const cheer = mode === 'cheer';
  const cy = 12 + Math.round(Math.sin(ph) * 1.5) - (cheer ? Math.round(Math.sin(p * Math.PI) * 4) : 0);
  // zoemende vleugels
  const up = Math.floor(p * 12) % 2 === 0;
  L.ellipse(11, cy - 6, 3, 4, up ? '#d8f0ffc0' : '#d8f0ff60');
  L.ellipse(14, cy - 6, 3, 4, up ? '#d8f0ff60' : '#d8f0ffc0');
  // lijf met strepen
  L.shadedEllipse(11, cy + 1, 7, 5, ['#8a6a10', '#e0b020', '#ffd23a', '#fff1a0']);
  for (const x of [7, 11]) L.vline(x, cy - 3, cy + 5, '#1a1324'), L.vline(x + 1, cy - 3, cy + 5, '#2a2030');
  // angel
  L.poly([[4, cy], [1, cy + 1], [4, cy + 2]], '#2a2030');
  // kop + voelsprieten
  L.shadedEllipse(18, cy, 3.6, 3.4, ['#1a1324', '#2a2030', '#3e3448']);
  L.line(18, cy - 3, 20, cy - 7, '#2a2030'); L.line(19, cy - 3, 22, cy - 6, '#2a2030');
  eye(L, 18, cy - 1, blinkAt(mode, p), cheer, '#ffffff');
  L.outline(OUTLINE);
  // gele bliksemstreep dwars over het lijf + vonkjes aan de sprietpuntjes
  L.line(13, cy - 3, 12, cy, '#fff6b0'); L.line(12, cy, 15, cy + 1, '#fff6b0'); L.line(15, cy + 1, 14, cy + 4, '#fff6b0');
  L.set(20, cy - 8, '#ffe24a'); L.set(22, cy - 7, '#ffe24a');
  if (cheer) { L.set(23, cy - 9, '#ffffff'); L.set(21, cy - 10, '#ffffff'); }
  return L;
}

// --- Stormgriffioen (episch): adelaarskop, leeuwenlijf, bliksemveren -------------------------------
const GR = ['#2a1e14', '#5a4028', '#8a6a40', '#c09a60'];
const FEA = ['#1a2a5a', '#2a4a9a', '#4a7ad8', '#8ab4ff'];
function griffin(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1], ph = p * TAU;
  const cheer = mode === 'cheer', run = mode === 'run';
  const wing = Math.sin(ph * (cheer ? 2 : 1)) * (cheer ? 1.3 : run ? 1 : 0.4);
  const by = G - 11 - (run ? Math.round(Math.max(0, Math.sin(ph * 2)) * 1.5) : 0) - (cheer ? Math.round(Math.max(0, Math.sin(p * Math.PI)) * 3) : 0);
  // achtervleugel
  L.poly([[16, by - 4], [10, by - 14 - wing * 5], [4, by - 16 - wing * 6], [8, by - 8], [14, by - 2]], FEA[0]);
  // leeuwenstaart met pluim
  L.thick(8, by, 3, by - 3 + Math.round(Math.sin(ph)), 1, GR[2]);
  L.disc(2.5, by - 4 + Math.round(Math.sin(ph)), 1.6, GR[1]);
  // poten: achter leeuw, voor klauw
  const legs = run ? [Math.sin(ph) * 2.5, Math.sin(ph + Math.PI) * 2.5] : [0, 0];
  for (const [x, o, c, talon] of [[9, legs[0], GR[1], 0], [12, legs[1], GR[0], 0], [21, legs[1], GR[1], 1], [24, legs[0], GR[0], 1]]) {
    L.thick(x, by + 3, x + o, G - 1, 1, c);
    if (talon) { L.set(Math.round(x + o) + 1, G, '#ffc93c'); L.set(Math.round(x + o) - 1, G, '#ffc93c'); L.set(Math.round(x + o), G, '#ffc93c'); }
    else L.hline(Math.round(x + o) - 1, Math.round(x + o) + 1, G, c);
  }
  // lijf
  L.shadedEllipse(16, by + 1, 9, 5, GR);
  L.shadedEllipse(22, by - 1, 5, 5.5, ['#8a8a9a', '#c8c8d8', '#f0f0ff', '#ffffff']); // veren borst
  // adelaarskop
  const hx = 26, hy = by - 7;
  L.shadedEllipse(hx, hy, 4.5, 4, ['#8a8a9a', '#c8c8d8', '#f0f0ff', '#ffffff']);
  L.poly([[hx + 3, hy - 1], [hx + 8, hy + 1], [hx + 6, hy + 3], [hx + 3, hy + 2]], '#ffc93c');
  L.set(hx + 7, hy + 2, '#c8811e');
  L.poly([[hx - 3, hy - 2], [hx - 6, hy - 6], [hx - 1, hy - 3]], FEA[2]); // kuif
  eye(L, hx + 1, hy - 2, blinkAt(mode, p), cheer);
  // voorvleugel (opgeheven, met bliksemveren)
  const tip = [14 - wing * 2, by - 20 - wing * 6];
  L.poly([[20, by - 3], [17, by - 13 - wing * 4], tip, [12, by - 9], [16, by - 1]], FEA[1]);
  L.poly([[18, by - 5], [16, by - 13 - wing * 4], tip, [14, by - 9]], FEA[2]);
  L.outline(OUTLINE);
  // bliksem in de veren (na outline)
  L.line(tip[0] + 1, tip[1] + 2, tip[0] + 3, tip[1] + 6, VOLT[2]); L.line(tip[0] + 3, tip[1] + 6, tip[0] + 2, tip[1] + 9, VOLT[2]);
  L.set(tip[0], tip[1], '#ffffff');
  if (cheer) { for (let i = 0; i < 4; i++) L.set(hx + 9 + i, hy - 4 + (i % 2) * 2, VOLT[i % 2 ? 2 : 3]); }
  return L;
}

// --- Stormfeniks (legendarisch): vogel van paarse en gele bliksem ----------------------------------
function phoenix(p, mode, S) {
  const L = new Img(S.fw, S.fh), ph = p * TAU;
  const cheer = mode === 'cheer';
  const cx = 22, cy = 19 + Math.round(Math.sin(ph) * 1.5) - (cheer ? Math.round(Math.sin(p * Math.PI) * 4) : 0);
  const flap = Math.sin(ph * (cheer ? 2 : 1));
  const PU = ['#2a1050', '#52209a', '#8a44d8', '#c890ff'];
  const GO = ['#a0600e', '#e0a020', '#ffd84a', '#fff4b0'];
  // lange staartlinten naar links, met een "oog" aan het eind
  for (let k = 0; k < 3; k++) {
    let px = cx - 5, py = cy + 1;
    for (let i = 0; i < 16; i++) {
      const nx = px - 1.05, ny = cy + 1 + (k - 1) * (1 + i * 0.22) + Math.sin(ph + i * 0.5 + k) * 1.1;
      L.thick(px, py, nx, ny, i < 10 ? 0.9 : 0.6, i > 11 ? GO[2] : PU[2 + (k % 2)]);
      px = nx; py = ny;
    }
    L.disc(px - 1, py, 1.6, GO[2]); L.set(px - 1, py, PU[0]);
  }
  // achtervleugel (V omhoog)
  const bt = [cx - 9, cy - 15 - flap * 6];
  L.poly([[cx - 1, cy - 2], bt, [cx - 13, cy - 8 - flap * 3], [cx - 9, cy - 5], [cx - 11, cy - 2 - flap], [cx - 5, cy]], PU[1]);
  // lijf
  L.shadedEllipse(cx, cy, 6.5, 4.2, PU);
  L.shadedEllipse(cx + 2, cy + 1.5, 4, 2.4, GO.slice(0, 3));
  // kop + snavel + kuif
  const hx = cx + 9, hy = cy - 5;
  L.thick(cx + 4, cy - 1, hx - 1, hy + 1, 1.8, PU[2]);
  L.shadedEllipse(hx, hy, 3.4, 3, PU);
  L.poly([[hx + 2.5, hy - 0.5], [hx + 6.5, hy + 1], [hx + 2.5, hy + 2]], GO[2]);
  for (const [dx, h, c] of [[-3, 5, PU[3]], [-1, 7, GO[2]], [1, 5, PU[3]]]) L.thick(hx + dx, hy - 2, hx + dx - 3, hy - 2 - h, 0.6, c);
  eye(L, hx + 1, hy - 1, false, cheer || mode === 'run', '#ffffff');
  // voorvleugel: veren-waaier met geschulpte achterrand
  const ft = [cx - 4 - flap * 2, cy - 19 - flap * 7];
  const fan = [[cx + 1, cy - 1], [cx + 1, cy - 9 - flap * 4], ft, [cx - 9, cy - 14 - flap * 5], [cx - 7, cy - 9 - flap * 3], [cx - 10, cy - 8 - flap * 2], [cx - 7, cy - 4 - flap], [cx - 7, cy - 2], [cx - 2, cy - 1]];
  L.poly(fan, PU[2]);
  L.poly([[cx, cy - 2], [cx, cy - 9 - flap * 4], ft, [cx - 5, cy - 10 - flap * 4]], PU[3]);
  L.outline('#140828');
  // gele bliksem langs de vleugelrand (gloeit)
  let x = ft[0], y = ft[1];
  for (let i = 0; i < 4; i++) { const nx = x + (i % 2 ? 2 : -2), ny = y + 3; L.line(x, y, nx, ny, GO[3]); x = nx; y = ny; }
  L.set(ft[0], ft[1], '#ffffff'); L.set(bt[0], bt[1], GO[2]);
  // ronddraaiende vonken
  for (let i = 0; i < 3; i++) { const an = ph + i / 3 * TAU, sx = cx + Math.cos(an) * 16, sy = cy - 4 + Math.sin(an) * 9; L.set(sx, sy, '#ffffff'); L.set(sx - 1, sy, GO[2]); L.set(sx + 1, sy, GO[2]); L.set(sx, sy - 1, PU[3]); L.set(sx, sy + 1, PU[3]); }
  if (cheer) { const r = 6 + Math.sin(p * Math.PI) * 10; for (let i = 0; i < 10; i++) { const an = i / 10 * TAU + p; L.set(cx + Math.cos(an) * r, cy - 4 + Math.sin(an) * r * 0.8, i % 2 ? GO[2] : PU[3]); } }
  return L;
}

export const WORLD_PET_BUILDERS = { squirrel, hedgehog, hummingbird, deer, butterfly, bunny, polarbear, reindeer, narwhal, mammoth, gecko, anglerfish, bee, griffin, phoenix };
