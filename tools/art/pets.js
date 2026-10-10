// ---------------------------------------------------------------------------
// Pets / companions – puur cosmetisch, te vinden in kisten (zie js/data/pets.js).
// Ze kijken naar RECHTS. Hoe zeldzamer, hoe groter en spectaculairder:
//   gewoon      24x24, simpele animatie
//   zeldzaam    24-28 px, eigen glans/details (in de game: lichte particles)
//   episch      28-36 px, meer onderdelen + effecten in de sprite
//   legendarisch 34-46 px, meer frames, eigen "special" bij juichen
// Gloed, sporen en juich-effecten tekent de game er live bij (js/entities/PetFx.js).
// Animaties: idle, run, cheer (aantallen per pet in PET_SPECS).
// ---------------------------------------------------------------------------
import { Img } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';
import { WORLD_PET_BUILDERS, WORLD_PET_SPECS } from './world_pets.js';

/** Framematen + ankerpunt (voeten/zweefpunt) + aantal frames per animatie. */
export const PET_SPECS = {
  fox: { fw: 24, fh: 24, anchor: [12, 22], frames: { idle: 4, run: 6, cheer: 4 } },
  owl: { fw: 24, fh: 24, anchor: [12, 22], frames: { idle: 4, run: 6, cheer: 4 } },
  slime: { fw: 24, fh: 24, anchor: [12, 22], frames: { idle: 4, run: 6, cheer: 4 } },
  dragon: { fw: 28, fh: 28, anchor: [14, 26], frames: { idle: 4, run: 6, cheer: 6 } },
  wisp: { fw: 24, fh: 26, anchor: [12, 24], frames: { idle: 6, run: 6, cheer: 6 } },
  cat: { fw: 28, fh: 24, anchor: [14, 22], frames: { idle: 4, run: 6, cheer: 6 } },
  robo: { fw: 28, fh: 30, anchor: [14, 28], frames: { idle: 6, run: 6, cheer: 6 } },
  turtle: { fw: 36, fh: 30, anchor: [18, 28], frames: { idle: 6, run: 6, cheer: 6 } },
  star: { fw: 34, fh: 34, anchor: [17, 32], frames: { idle: 8, run: 8, cheer: 8 } },
  wolf: { fw: 46, fh: 38, anchor: [23, 36], frames: { idle: 6, run: 6, cheer: 8 } },
};

const TAU = Math.PI * 2;
const EYE = '#1a1324';


// --- 1. Vosje (gewoon, loopt) ---------------------------------------------------------
const FOX = ['#6a2a10', '#c0521c', '#f08a3a', '#ffc070'];
function foxFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1];
  const ph = p * TAU;
  const running = mode === 'run';
  const lift = mode === 'cheer' ? Math.round(Math.max(0, Math.sin(ph)) * 5) : running ? Math.round(Math.abs(Math.sin(ph)) * 1.5) : 0;
  const by = G - 6 - lift;
  const tailUp = mode === 'cheer' ? -4 : 0;
  const sw = Math.sin(ph * (running ? 1 : 0.5)) * 1.5;
  L.thick(7, by, 3, by - 3 + sw + tailUp, 2.4, FOX[1]);
  L.thick(3, by - 3 + sw + tailUp, 1.5, by - 6 + sw + tailUp, 1.8, FOX[2]);
  L.disc(1.5, by - 6.5 + sw + tailUp, 1.4, '#fff8ec');
  const legs = running ? [Math.sin(ph) * 2, Math.sin(ph + Math.PI) * 2] : [0, 0];
  for (const [x, o, c] of [[8, legs[0], FOX[0]], [10, legs[1], FOX[1]], [14, legs[1], FOX[0]], [16, legs[0], FOX[1]]]) {
    L.line(x, by + 3, x + o, G - lift, c);
    L.set(Math.round(x + o), G - lift, '#2a1810');
  }
  L.shadedEllipse(12, by + 1, 6.5, 4, FOX);
  L.shadedEllipse(15.5, by + 2, 2.4, 2.2, ['#d8cfc0', '#fff8ec', '#ffffff']);
  const hy = by - 4;
  L.shadedEllipse(17, hy, 4, 3.6, FOX);
  L.poly([[19.5, hy - 1], [23, hy + 1], [19.5, hy + 2.5]], FOX[2]);
  L.set(22, hy + 1, EYE);
  L.shadedEllipse(19, hy + 1.6, 1.8, 1.2, ['#d8cfc0', '#fff8ec']);
  L.poly([[14.5, hy - 2], [15.5, hy - 7], [17.5, hy - 2.5]], FOX[1]);
  L.poly([[17.5, hy - 2.5], [19, hy - 7], [20, hy - 2]], FOX[2]);
  L.set(15, hy - 6, '#2a1810'); L.set(19, hy - 6, '#2a1810');
  const blink = mode === 'idle' && p > 0.7;
  if (blink || mode === 'cheer') L.hline(18, 19, hy - 0.5, EYE);
  else { L.rect(18, hy - 1, 2, 2, EYE); L.set(18, hy - 1, '#fff8ec'); }
  return L.outline(OUTLINE);
}

// --- 2. Luchtuil (gewoon, vliegt) -------------------------------------------------------
const OWL = ['#1e3a6e', '#3a6ab0', '#6aa2e0', '#b4dcff'];
function owlFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh);
  const ph = p * TAU;
  const flap = Math.sin(ph * (mode === 'cheer' ? 2 : 1));
  const cy = 12 + Math.round(Math.sin(ph) * 1) - (mode === 'cheer' ? 2 : 0);
  for (const side of [-1, 1]) {
    const tipY = cy - 1 - flap * 5;
    L.poly([[12 + side * 3, cy - 2], [12 + side * 9, tipY], [12 + side * 8, cy + 3], [12 + side * 4, cy + 4]], side < 0 ? OWL[1] : OWL[2]);
    L.line(12 + side * 3, cy - 2, 12 + side * 9, tipY, OWL[3]);
  }
  L.shadedEllipse(12, cy + 1, 5, 6, OWL);
  L.shadedEllipse(12.5, cy + 3, 3, 3.6, ['#a8c8e8', '#e0f0ff', '#ffffff']);
  for (const [x, y] of [[11, cy + 2], [13, cy + 3], [12, cy + 5]]) L.set(x, y, OWL[2]);
  L.poly([[8, cy - 4], [8.5, cy - 8], [10.5, cy - 5]], OWL[1]);
  L.poly([[14, cy - 5], [16, cy - 8], [16.5, cy - 4]], OWL[1]);
  L.shadedEllipse(12.5, cy - 2, 4.5, 3.2, ['#a8c8e8', '#e0f0ff']);
  const shut = mode === 'idle' && p > 0.72;
  for (const ex of [10.5, 14.5]) {
    if (shut) { L.hline(Math.round(ex) - 1, Math.round(ex) + 1, cy - 2, EYE); continue; }
    L.disc(ex, cy - 2, 1.7, '#ffd23a');
    L.disc(ex + 0.4, cy - 2, 0.9, EYE);
    L.set(Math.round(ex), cy - 3, '#ffffff');
  }
  L.poly([[12, cy - 1], [13.5, cy - 1], [12.75, cy + 1]], '#ff9a2a');
  L.set(11, cy + 7, '#ff9a2a'); L.set(14, cy + 7, '#ff9a2a');
  return L.outline(OUTLINE);
}

// --- 3. Blaadjesslijm (gewoon, stuitert) ------------------------------------------------
const SLIME = ['#1c5a3a', '#2e9a48', '#5fd65a', '#b8f57a'];
const LEAF = ['#24603a', '#3d8f44', '#79c25a', '#c2ec7c'];
function slimeFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1];
  const ph = p * TAU;
  let lift = 0, sq = Math.sin(ph) * 0.5;
  if (mode === 'run') { const s = Math.sin(ph); lift = Math.max(0, s) * 4; sq = s < 0 ? s * 1.4 : -s * 0.6; }
  if (mode === 'cheer') { const s = Math.sin(ph); lift = Math.max(0, s) * 7; sq = s < 0 ? s * 1.6 : -0.8; }
  const rx = 7 - sq * 0.8, ry = 5.5 + sq;
  const cx = 12, by = G - ry - lift + 0.5;
  L.shadedEllipse(cx, by, rx, ry, SLIME, { clip: (x, y) => y <= G - lift });
  L.disc(cx - 3, by - 2.5, 1, '#e8ffc0');
  L.set(cx - 4, by - 1, '#e8ffc0');
  // oogjes (kijken naar rechts) + blosjes
  const happy = mode === 'cheer';
  for (const ex of [cx + 1, cx + 4]) {
    if (happy) { L.set(ex - 1, by - 1, EYE); L.set(ex, by - 2, EYE); L.set(ex + 1, by - 1, EYE); }
    else { L.rect(ex, by - 2, 1, 2, EYE); L.set(ex, by - 2, '#ffffff'); }
  }
  L.set(cx, by + 1, '#ff8a9a'); L.set(cx + 6, by + 1, '#ff8a9a');
  L.hline(cx + 2, cx + 3, by + 1, EYE);
  // spruitje
  const top = by - ry, wig = Math.round(Math.sin(ph * (happy ? 2 : 1)) * 1);
  L.line(cx, top, cx, top - 3, LEAF[1]);
  L.poly([[cx, top - 3], [cx - 4 + wig, top - 6], [cx - 1, top - 2]], LEAF[2]);
  L.poly([[cx, top - 3], [cx + 4 - wig, top - 7], [cx + 1, top - 2]], LEAF[3]);
  return L.outline(OUTLINE);
}

// --- 4. Gloeidraakje (zeldzaam, vliegt) ----------------------------------------------------
const EMBER = ['#5a1010', '#a82a1a', '#e0581e', '#ff9a4a'];
const EMBER_WING = ['#5a1010', '#b8361a', '#ff7a3a', '#ffc070'];
function dragonFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh);
  const ph = p * TAU;
  const flap = Math.sin(ph * (mode === 'cheer' ? 1 : 1));
  const cy = 16 + Math.round(Math.sin(ph) * 1);
  // staart met vlammetje
  L.thick(9, cy + 1, 5, cy + 4, 1.6, EMBER[1]);
  L.thick(5, cy + 4, 2.5, cy + 2 + Math.round(Math.sin(ph) * 1), 1.1, EMBER[2]);
  L.disc(1.5, cy + 1 + Math.round(Math.sin(ph) * 1), 1.3, '#ffc93c');
  L.set(1, cy + Math.round(Math.sin(ph) * 1), '#fff6c0');
  // achtervleugel
  L.poly([[11, cy - 2], [7, cy - 10 - flap * 3], [3, cy - 5 - flap * 2], [8, cy]], EMBER_WING[0]);
  // lijf + buik
  L.shadedEllipse(13, cy, 6, 4.2, EMBER);
  L.shadedEllipse(14, cy + 1.8, 3.6, 2, ['#e0a050', '#ffd890', '#fff0c0']);
  L.set(11, cy + 4, EMBER[0]); L.set(16, cy + 4, EMBER[0]); L.set(12, cy + 5, EMBER[0]); L.set(17, cy + 5, EMBER[0]);
  // stekels op de rug
  for (const x of [8, 11]) L.poly([[x - 1, cy - 3], [x - 0.5, cy - 5], [x + 1.5, cy - 3]], EMBER[3]);
  // voorvleugel (vlammend membraan)
  const wy = cy - 12 - flap * 4;
  L.poly([[13, cy - 2], [10, wy], [4, cy - 7 - flap * 3], [9, cy - 1]], EMBER_WING[1]);
  L.poly([[12, cy - 3], [10, wy + 3], [6, cy - 6 - flap * 2], [9, cy - 2]], EMBER_WING[2]);
  L.line(13, cy - 2, 10, wy, EMBER_WING[3]);
  // nek + kop
  const hx = 20, hy = cy - 5;
  L.thick(16, cy - 1, hx - 1, hy + 1, 1.9, EMBER[1]);
  L.shadedEllipse(hx, hy, 4.2, 3.4, EMBER);
  L.poly([[hx + 2.5, hy - 0.5], [hx + 6.5, hy + 1], [hx + 2.5, hy + 2.8]], EMBER[2]);
  L.set(hx + 5, hy, EYE);
  L.line(hx - 2, hy - 2, hx - 4, hy - 6, '#fff0c0'); L.set(hx - 4, hy - 6, '#ffffff');
  L.line(hx, hy - 3, hx - 1, hy - 6, '#fff0c0');
  L.rect(hx + 1, hy - 1, 2, 2, EYE); L.set(hx + 1, hy - 1, '#ffe66a');
  // vuurspuwen bij juichen
  if (mode === 'cheer' && p >= 0.15 && p < 0.85) {
    const k = Math.sin((p - 0.15) / 0.7 * Math.PI);
    const len = 2 + k * 5;
    for (let i = 0; i <= len; i++) L.disc(hx + 7 + i, hy + 1 + Math.sin(i + p * 9) * 0.6, 1.8 - i / len * 0.9, P.fire[Math.min(4, 1 + Math.floor((1 - i / len) * 3.9))]);
  }
  return L.outline(OUTLINE);
}

// --- 5. Dwaallichtje (zeldzaam, zweeft) ----------------------------------------------------
const WISP = ['#2a5ab0', '#4fa0ff', '#a8e0ff', '#ffffff'];
function wispFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh);
  const ph = p * TAU;
  const cy = 11 + Math.round(Math.sin(ph) * 1.5) - (mode === 'cheer' ? Math.round(Math.max(0, Math.sin(ph)) * 3) : 0);
  const cx = 13;
  // golvende staart naar achteren
  for (let i = 6; i >= 0; i--) {
    const t = i / 6;
    const x = cx - 2 - t * 9, y = cy + 3 + t * 3 + Math.sin(ph * (mode === 'run' ? 2 : 1) + t * 4) * 1.6;
    L.disc(x, y, 4.2 - t * 3.2, i > 3 ? WISP[1] : WISP[2]);
  }
  L.shadedEllipse(cx, cy, 6, 5.6, WISP, { bias: 0.05 });
  L.disc(cx - 2.5, cy - 2.5, 1.2, '#ffffff');
  // gezichtje
  const happy = mode === 'cheer';
  for (const ex of [cx + 1, cx + 4]) {
    if (happy) { L.set(ex - 1, cy, '#1a2a5a'); L.set(ex, cy - 1, '#1a2a5a'); L.set(ex + 1, cy, '#1a2a5a'); }
    else if (mode === 'idle' && p > 0.8) L.hline(ex, ex + 1, cy, '#1a2a5a');
    else { L.rect(ex, cy - 1, 2, 3, '#1a2a5a'); L.set(ex, cy - 1, '#ffffff'); }
  }
  L.set(cx, cy + 2, '#ff9ac8'); L.set(cx + 6, cy + 2, '#ff9ac8');
  L.outline('#1a2a5a');
  // twinkelingen (zeldzaam = extra glans in de sprite)
  const tw = [[3, 4], [21, 6], [20, 19], [6, 21]];
  tw.forEach(([x, y], i) => { if ((Math.floor(p * 6) + i) % 3 === 0) { L.set(x, y, '#ffffff'); L.set(x - 1, y, WISP[2]); L.set(x + 1, y, WISP[2]); L.set(x, y - 1, WISP[2]); L.set(x, y + 1, WISP[2]); } });
  return L;
}

// --- 6. Schaduwkat (zeldzaam, loopt) ---------------------------------------------------------
const CAT = ['#0e0a16', '#221a34', '#3a2c56', '#5a4880'];
const CAT_EYE = '#ff4ad8';
function catFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1];
  const ph = p * TAU;
  const running = mode === 'run';
  const lift = mode === 'cheer' ? Math.round(Math.max(0, Math.sin(ph)) * 4) : running ? Math.round(Math.max(0, Math.sin(ph * 2)) * 1) : 0;
  const by = G - 7 - lift;
  const stretch = running ? Math.sin(ph) * 1.2 : 0;
  // staart: sierlijk omhoog met paarse punt
  const sw = Math.sin(ph * (running ? 1 : 0.5)) * 2;
  L.thick(8, by - 1, 4, by - 6 + sw * 0.3, 1.3, CAT[2]);
  L.thick(4, by - 6 + sw * 0.3, 5 + sw, by - 11, 1.1, CAT[2]);
  L.disc(5.5 + sw, by - 12, 1.3, '#c040ff');
  L.set(5 + sw, by - 13, '#ff9ae8');
  // poten (galop)
  const a = running ? Math.sin(ph) * 2.5 : 0, b = running ? Math.sin(ph + Math.PI) * 2.5 : 0;
  for (const [x, o, c] of [[10, b, CAT[1]], [12, a, CAT[0]], [17, a, CAT[1]], [19, b, CAT[0]]]) {
    L.thick(x, by + 2, x + o, G - lift - 1, 0.8, c);
    L.set(Math.round(x + o) + 1, G - lift, c);
    L.set(Math.round(x + o), G - lift, c);
  }
  // lijf
  L.shadedEllipse(14 + stretch * 0.3, by + 1, 7 + stretch, 3.8, CAT);
  // kop
  const hx = 21 + stretch * 0.6, hy = by - 4;
  L.shadedEllipse(hx, hy, 4.2, 3.8, CAT);
  L.poly([[hx - 3.5, hy - 2], [hx - 3, hy - 7.5], [hx - 0.5, hy - 3]], CAT[2]);
  L.poly([[hx + 0.5, hy - 3], [hx + 2.5, hy - 7.5], [hx + 3.5, hy - 1.5]], CAT[3]);
  L.set(hx - 2.5, hy - 5, '#c040ff'); L.set(hx + 2, hy - 5, '#c040ff');
  const shut = mode === 'idle' && p > 0.7;
  for (const ex of [hx - 1, hx + 2]) {
    if (shut || mode === 'cheer') L.hline(ex, ex + 1, hy, CAT_EYE);
    else { L.rect(ex, hy - 1, 2, 2, CAT_EYE); L.set(ex + 1, hy - 1, '#ffffff'); }
  }
  L.set(hx + 4, hy + 1, '#ff9ae8');
  L.set(hx + 3, hy + 2, CAT[3]); L.set(hx + 5, hy + 1, CAT[3]); // snorharen
  L.outline('#05030a');
  // schaduwslierten bij de pootjes
  const sh = Math.floor(p * 6);
  for (let i = 0; i < 3; i++) {
    const x = 6 + ((sh * 3 + i * 7) % 18), y = G - ((sh + i) % 3);
    L.set(x, y, i === 1 ? '#c040ff' : '#7a3ab0');
  }
  return L;
}

// --- 7. Robo-maatje (episch, zweeft) -----------------------------------------------------------
const SCREEN = '#0c1428';
function roboFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh);
  const ph = p * TAU;
  const cheer = mode === 'cheer';
  const cy = 12 + Math.round(Math.sin(ph) * 1.5) - (cheer ? Math.round(Math.max(0, Math.sin(ph)) * 3) : 0);
  const cx = 14;
  // stuwstraal (breder + flakkerend)
  const fl = 0.5 + 0.5 * Math.sin(ph * 3);
  L.poly([[cx - 3, cy + 10], [cx + 2, cy + 10], [cx - 0.5, cy + 15 + fl * 3]], P.energy[0]);
  L.poly([[cx - 2, cy + 10], [cx + 1, cy + 10], [cx - 0.5, cy + 13 + fl * 2]], P.energy[2]);
  L.set(cx - 1, cy + 11, '#ffffff');
  // lijfje + armpjes
  L.shadedBlock(cx - 4, cy + 4, 8, 6, P.steel, { power: 3 });
  L.rect(cx - 2, cy + 6, 4, 2, P.energy[1]);
  L.set(cx - 1, cy + 6, P.energy[3]);
  const armUp = cheer ? -5 : Math.round(Math.sin(ph) * 1);
  L.thick(cx - 4, cy + 6, cx - 8, cy + 7 + armUp, 0.8, P.steel[1]);
  L.thick(cx + 4, cy + 6, cx + 8, cy + 7 + armUp, 0.8, P.steel[1]);
  L.disc(cx - 8.5, cy + 7 + armUp, 1.2, P.steel[2]);
  L.disc(cx + 8.5, cy + 7 + armUp, 1.2, P.steel[2]);
  // antenne met knipperbol
  L.line(cx + 1, cy - 6, cx + 3, cy - 10, P.steel[1]);
  const blink = Math.floor(p * 6) % 2 === 0;
  L.disc(cx + 3.5, cy - 11, 1.4, cheer ? '#ffe66a' : blink ? P.energy[2] : P.energy[1]);
  // TV-kop
  L.shadedBlock(cx - 9, cy - 6, 18, 12, ['#7088b0', '#b9cde6', '#e8f2ff', '#ffffff'], { power: 3.2 });
  L.shadedBlock(cx - 7, cy - 4, 14, 8, ['#0c1428', '#14223e', '#1c3058'], { power: 4, bias: -0.3 });
  L.set(cx - 6, cy - 3, '#3a5a90');
  // ogen op het scherm
  const look = mode === 'run' ? 1 : Math.round(Math.sin(ph) * 1);
  if (cheer) {
    for (const ex of [cx - 3, cx + 3]) { L.set(ex - 1, cy, P.energy[2]); L.set(ex, cy - 1, P.energy[2]); L.set(ex + 1, cy, P.energy[2]); }
  } else if (mode === 'idle' && p > 0.82) {
    L.hline(cx - 4, cx - 2, cy, P.energy[2]); L.hline(cx + 2, cx + 4, cy, P.energy[2]);
  } else {
    for (const ex of [cx - 4 + look, cx + 2 + look]) { L.rect(ex, cy - 2, 2, 4, P.energy[2]); L.set(ex, cy - 2, '#ffffff'); }
  }
  // oor-lampjes
  L.rect(cx - 10, cy - 1, 1, 3, fl > 0.5 ? '#ff5a5a' : '#8a2030');
  L.rect(cx + 9, cy - 1, 1, 3, P.energy[1]);
  L.outline(OUTLINE);
  // hologram-ringen bij juichen (episch extraatje)
  if (cheer) {
    const r = 3 + p * 10;
    for (let a = 0; a < 24; a++) {
      const ang = a / 24 * TAU;
      if ((a + Math.floor(p * 8)) % 3 === 0) continue;
      L.set(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.4 - 2, a % 2 ? P.energy[2] : '#ffffff');
    }
  }
  return L;
}

// --- 8. Bosschildpad (episch, loopt) --------------------------------------------------------------
const SHELL = ['#2a2418', '#4a3e26', '#6a5a34', '#8a7a48'];
const MOSS = ['#1f3b22', '#2f6b2e', '#56a03c', '#93d05a', '#c2ec7c'];
const TSKIN = ['#1e4a1a', '#3a7a2a', '#6ab040', '#a8e070'];
function turtleFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1];
  const ph = p * TAU;
  const running = mode === 'run', cheer = mode === 'cheer';
  const bob = running ? Math.round(Math.abs(Math.sin(ph)) * 1) : 0;
  const sy = G - 7 - bob;
  // pootjes (stevig, waggelend)
  const a = running ? Math.sin(ph) * 2 : 0, b = running ? Math.sin(ph + Math.PI) * 2 : 0;
  for (const [x, o, c] of [[9, a, TSKIN[0]], [13, b, TSKIN[1]], [21, b, TSKIN[0]], [25, a, TSKIN[1]]]) {
    L.thick(x, sy + 3, x + o, G - 1, 1.6, c);
    L.hline(Math.round(x + o) - 1, Math.round(x + o) + 2, G, TSKIN[0]);
  }
  // staartje
  L.poly([[6, sy + 2], [2, sy + 4], [6, sy + 4]], TSKIN[1]);
  // kop (met nek) – juicht: kop omhoog
  const hx = 30 + (running ? 1 : 0), hy = cheer ? sy - 6 - Math.round(Math.max(0, Math.sin(ph)) * 2) : sy - 1;
  L.thick(25, sy + 1, hx - 1, hy + 1, 2.4, TSKIN[1]);
  L.shadedEllipse(hx, hy, 4.4, 3.6, TSKIN);
  L.set(hx + 4, hy + 1, TSKIN[0]);
  const shut = mode === 'idle' && p > 0.75;
  if (shut || cheer) { L.hline(hx + 1, hx + 2, hy - 1, EYE); }
  else { L.rect(hx + 1, hy - 2, 2, 2, EYE); L.set(hx + 1, hy - 2, '#ffffff'); }
  L.hline(hx + 1, hx + 3, hy + 2, TSKIN[0]);
  if (cheer) L.set(hx + 2, hy + 3, '#ff7a9a');
  // schild: koepel met mosplaten
  const cx = 17;
  L.shadedEllipse(cx, sy, 12, 9, SHELL, { clip: (x, y) => y <= sy + 3 });
  L.hline(cx - 12, cx + 12, sy + 3, SHELL[0]);
  L.hline(cx - 11, cx + 11, sy + 4, '#c8a878');
  L.shadedEllipse(cx - 1, sy - 2, 10, 6.5, MOSS, { clip: (x, y) => y <= sy + 2 });
  // schildplaten (lijnen)
  for (const [x0, y0, x1, y1] of [[cx - 5, sy - 7, cx - 7, sy + 2], [cx + 3, sy - 8, cx + 5, sy + 2], [cx - 9, sy - 2, cx + 9, sy - 3]]) L.line(x0, y0, x1, y1, MOSS[1]);
  L.set(cx - 6, sy - 5, MOSS[4]); L.set(cx - 5, sy - 6, MOSS[4]); L.set(cx + 1, sy - 6, MOSS[4]);
  // paddenstoelen + bloemetje bovenop
  const glow = cheer && Math.floor(p * 6) % 2 === 0;
  const mush = (x, y, r) => {
    L.rect(x - 0.5, y, 2, 3, '#f0dcc0');
    L.shadedEllipse(x + 0.5, y, r, r * 0.7, glow ? ['#e04040', '#ff6a6a', '#ffb0a0', '#ffffff'] : P.capRed, { clip: (_, yy) => yy <= y });
    L.set(x - 1, y - 1, '#fff6e4'); L.set(x + 2, y - 2, '#fff6e4');
  };
  mush(cx - 3, sy - 8, 3.2);
  mush(cx + 3, sy - 6, 2.4);
  const fy = sy - 9 + (cheer ? -1 : 0);
  L.line(cx + 7, sy - 4, cx + 7, fy + 2, MOSS[2]);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) L.set(cx + 7 + dx, fy + 1 + dy, '#ffd23a');
  L.set(cx + 7, fy + 1, '#ff9a2a');
  L.outline(OUTLINE);
  // bij juichen: rondvliegende blaadjes (episch extraatje)
  if (cheer) {
    for (let i = 0; i < 5; i++) {
      const ang = p * TAU + i / 5 * TAU;
      const x = cx + Math.cos(ang) * 15, y = sy - 4 + Math.sin(ang) * 7;
      L.set(x, y, MOSS[3]); L.set(x + 1, y, MOSS[4]); L.set(x, y + 1, MOSS[2]);
    }
  }
  return L;
}

// --- 9. Sterrenkoning (legendarisch, zweeft) -----------------------------------------------------
const STAR = ['#c8811e', '#ffc93c', '#ffe66a', '#fff6c0', '#ffffff'];
function starPts(cx, cy, R, r, rot, sx = 1) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5 - Math.PI / 2;
    const rr = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rr * sx, cy + Math.sin(a) * rr]);
  }
  return pts;
}
function starFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh);
  const ph = p * TAU;
  const cheer = mode === 'cheer';
  const cx = 17, cy = 17 + Math.round(Math.sin(ph) * 1.5) - (cheer ? Math.round(Math.sin(p * Math.PI) * 3) : 0);
  // juichen = een rondje draaien (horizontaal "omdraaien")
  const sx = cheer ? Math.max(0.25, Math.abs(Math.cos(p * Math.PI * 2))) : 1;
  const back = cheer && Math.cos(p * Math.PI * 2) < 0;
  const tilt = mode === 'run' ? 0.12 : Math.sin(ph) * 0.06;
  L.poly(starPts(cx, cy, 11, 5, tilt, sx), STAR[1]);
  L.poly(starPts(cx - 0.6, cy - 0.6, 9, 4.3, tilt, sx), STAR[2]);
  L.poly(starPts(cx - 1.2, cy - 1.2, 5.5, 2.8, tilt, sx), STAR[3]);
  L.disc(cx - 3 * sx, cy - 3, 0.8, '#ffffff');
  // gezichtje (alleen aan de voorkant)
  if (!back && sx > 0.55) {
    const happy = cheer || mode === 'run';
    for (const ex of [cx - 2.5 * sx, cx + 2.5 * sx]) {
      if (happy) { L.set(ex - 1, cy, '#5a2a10'); L.set(ex, cy - 1, '#5a2a10'); L.set(ex + 1, cy, '#5a2a10'); }
      else if (mode === 'idle' && p > 0.86) L.hline(ex - 1, ex, cy, '#5a2a10');
      else { L.rect(ex - 1, cy - 1, 2, 3, '#5a2a10'); L.set(ex - 1, cy - 1, '#ffffff'); }
    }
    L.set(cx - 5 * sx, cy + 2, '#ff8a6a'); L.set(cx + 5 * sx, cy + 2, '#ff8a6a');
    L.hline(cx - 1, cx + 1, cy + 3, '#5a2a10');
    L.set(cx - 2, cy + 2, '#5a2a10'); L.set(cx + 2, cy + 2, '#5a2a10');
  }
  // kroontje
  const ky = cy - 12;
  L.poly([[cx - 3.5 * sx, ky + 3], [cx - 3.5 * sx, ky], [cx - 1.7 * sx, ky + 1.5], [cx, ky - 1], [cx + 1.7 * sx, ky + 1.5], [cx + 3.5 * sx, ky], [cx + 3.5 * sx, ky + 3]], '#ff9a2a');
  L.hline(cx - 3 * sx, cx + 3 * sx, ky + 2, '#ffe66a');
  L.set(cx, ky + 1, '#ff4a8a');
  L.outline('#5a2a10');
  // ronddraaiende mini-sterretjes (voor + achter)
  const n = 3;
  for (let i = 0; i < n; i++) {
    const ang = ph + i / n * TAU;
    const x = cx + Math.cos(ang) * 14, y = cy + 2 + Math.sin(ang) * 5;
    const c = Math.sin(ang) > 0 ? '#ffffff' : '#ffe66a';
    L.set(x, y, c); L.set(x - 1, y, '#ffc93c'); L.set(x + 1, y, '#ffc93c'); L.set(x, y - 1, '#ffc93c'); L.set(x, y + 1, '#ffc93c');
  }
  // juichen: stralenkrans
  if (cheer) {
    const r = 8 + Math.sin(p * Math.PI) * 6;
    for (let i = 0; i < 8; i++) {
      const ang = i / 8 * TAU + p;
      for (let k = 0; k < 3; k++) L.set(cx + Math.cos(ang) * (r + k), cy + Math.sin(ang) * (r + k), k === 2 ? '#ffffff' : '#fff1a0');
    }
  }
  return L;
}

// --- 10. IJswolf (legendarisch, loopt) -------------------------------------------------------------
const WOLF = ['#2a4a8a', '#5a8ad0', '#a8d0f8', '#eaf6ff'];
const ICE = ['#1e5ab0', '#4fd0ff', '#b4f4ff', '#ffffff'];
function crystal(L, x, y, h, w, lean = 0) {
  L.poly([[x - w, y], [x + lean, y - h], [x + w, y]], ICE[1]);
  L.poly([[x - w * 0.2, y], [x + lean, y - h], [x + w, y]], ICE[2]);
  L.set(x + lean, y - h + 1, '#ffffff');
}
function wolfFrame(p, mode, S) {
  const L = new Img(S.fw, S.fh), G = S.anchor[1];
  const ph = p * TAU;
  const running = mode === 'run', cheer = mode === 'cheer';
  const bob = running ? Math.round(Math.sin(ph * 2) * 1) : 0;
  const by = G - 14 - bob;
  // staart (groot en pluizig, met kristalpunt)
  const tw = Math.sin(ph * (running ? 1 : 0.5)) * 2;
  const tailPts = [[11, by - 1], [6, by - 4 + tw * 0.4], [3, by - 9 + tw], [5, by - 13 + tw]];
  for (let i = 0; i < tailPts.length - 1; i++) L.thick(tailPts[i][0], tailPts[i][1], tailPts[i + 1][0], tailPts[i + 1][1], 2.8 - i * 0.5, WOLF[i === 0 ? 1 : 2]);
  L.disc(4, by - 9 + tw, 2.2, WOLF[3]);
  crystal(L, 5, by - 13 + tw, 4, 1.5, -1);
  // poten: achter-paar donker, voor-paar licht; galop
  const leg = (x, o, c, k) => {
    const knee = [x + o * 0.4, by + 7 - Math.abs(k)];
    L.thick(x, by + 2, knee[0], knee[1], 1.6, c);
    L.thick(knee[0], knee[1], x + o, G - 1, 1.2, c);
    L.hline(Math.round(x + o) - 1, Math.round(x + o) + 2, G, WOLF[0]);
  };
  const s1 = running ? Math.sin(ph) : 0, s2 = running ? Math.sin(ph + 0.6) : 0;
  leg(14, s1 * -4, WOLF[0], s1);
  leg(28, s2 * 4, WOLF[0], s2);
  // lijf
  L.shadedEllipse(20, by, 11.5, 6.5, WOLF);
  L.shadedEllipse(21, by + 3.5, 8, 2.4, ['#a8d0f8', '#eaf6ff', '#ffffff']);
  leg(17, s1 * 4, WOLF[1], s1);
  leg(31, s2 * -4, WOLF[1], s2);
  // kristallen op de rug
  crystal(L, 14, by - 4, 5, 1.8, -1);
  crystal(L, 19, by - 5, 7, 2.2, -1);
  crystal(L, 24, by - 5, 5, 1.8, -1);
  // manen/borst
  const howl = cheer && p > 0.2 && p < 0.85;
  L.shadedEllipse(30, by - 3, 6, 7, WOLF);
  for (const [x, y] of [[27, by + 3], [30, by + 4], [33, by + 2]]) L.poly([[x - 1.5, y - 2], [x, y + 2], [x + 1.5, y - 2]], WOLF[3]);
  // kop
  const hx = howl ? 35 : 36, hy = howl ? by - 13 : by - 9;
  L.shadedEllipse(hx, hy, 5.6, 4.6, WOLF);
  if (howl) {
    // snuit omhoog, bek open
    L.poly([[hx + 1, hy - 2], [hx + 7, hy - 8], [hx + 8, hy - 6], [hx + 4, hy + 1]], WOLF[2]);
    L.poly([[hx + 3, hy], [hx + 8, hy - 4], [hx + 6, hy + 2]], WOLF[1]);
    L.set(hx + 7, hy - 8, EYE);
    L.hline(hx - 1, hx + 1, hy - 2, ICE[1]);
  } else {
    L.poly([[hx + 2, hy - 1.5], [hx + 9.5, hy + 0.5], [hx + 8.5, hy + 2.5], [hx + 2, hy + 3]], WOLF[2]);
    L.hline(hx + 3, hx + 8, hy + 2, WOLF[3]);
    L.set(hx + 9, hy, EYE); L.set(hx + 9, hy + 1, EYE);
    const shut = mode === 'idle' && p > 0.8;
    if (shut) L.hline(hx + 1, hx + 3, hy - 1, ICE[0]);
    else { L.rect(hx + 1, hy - 2, 3, 2, ICE[1]); L.set(hx + 2, hy - 2, '#ffffff'); }
  }
  // oren
  L.poly([[hx - 4, hy - 2], [hx - 3, hy - 9], [hx - 0.5, hy - 3]], WOLF[1]);
  L.poly([[hx - 1, hy - 3], [hx + 1, hy - 10], [hx + 2.5, hy - 2.5]], WOLF[2]);
  L.set(hx - 3, hy - 6, ICE[1]); L.set(hx + 1, hy - 7, ICE[1]);
  L.outline('#101a3a');
  // ijsadem / kristalregen bij het huilen
  if (cheer) {
    const k = Math.sin(p * Math.PI);
    for (let i = 0; i < 7; i++) {
      const ang = -1.0 + i * 0.12 + Math.sin(i * 3.1) * 0.05;
      const d = 6 + k * 10 + (i % 3) * 2;
      const x = hx + 7 + Math.cos(ang) * d, y = hy - 8 + Math.sin(ang) * d;
      L.set(x, y, i % 2 ? '#ffffff' : ICE[2]);
      if (i % 3 === 0) { L.set(x - 1, y, ICE[1]); L.set(x + 1, y, ICE[1]); L.set(x, y - 1, ICE[1]); L.set(x, y + 1, ICE[1]); }
    }
  }
  // ijzige glinsters in de vacht
  const g = Math.floor(p * 6);
  for (const [x, y, i] of [[17, by - 1, 0], [25, by + 1, 1], [31, by - 6, 2]]) if ((g + i) % 3 === 0) L.set(x, y, '#ffffff');
  return L;
}

// kist-pets + wereld-exclusieve pets (tools/art/world_pets.js)
const BUILDERS = { fox: foxFrame, owl: owlFrame, slime: slimeFrame, dragon: dragonFrame, wisp: wispFrame, cat: catFrame, robo: roboFrame, turtle: turtleFrame, star: starFrame, wolf: wolfFrame, ...WORLD_PET_BUILDERS };
Object.assign(PET_SPECS, WORLD_PET_SPECS);

/** { idle:[Img…], run:[Img…], cheer:[Img…] } */
export function buildPet(kind) {
  const f = BUILDERS[kind], S = PET_SPECS[kind];
  const out = {};
  for (const [anim, n] of Object.entries(S.frames)) out[anim] = Array.from({ length: n }, (_, i) => f(i / n, anim, S));
  return out;
}
export const PET_KINDS = Object.keys(BUILDERS);
