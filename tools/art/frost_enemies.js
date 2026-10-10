// ---------------------------------------------------------------------------
// Vijanden van Frostpeak. Zelfde opzet als enemies.js: 32x32 frames, voeten op
// y=30, kijken naar LINKS. Animaties: move (loop), attack (eenmalig), hurt (1).
//   Sneeuwslijm (1 HP) en IJsvleer (1 HP) zijn kleurvarianten (enemies.js),
//   IJsslijm (2 HP) ook. Nieuw getekend: Pinguïn (2 HP), Yeti-jong (2 HP) en
//   IJsklomp (3 HP, gepantserd).
// ---------------------------------------------------------------------------
import { Img } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';
import { EN_FW, EN_FH } from './enemies.js';

const G = 30;
const ICE = ['#1e4a8a', '#2f74c0', '#5aa8e8', '#9cd8ff', '#e0f6ff'];
export const SLIME_SNOW = ['#7a94c0', '#b4c8e4', '#e4eefa', '#ffffff'];
export const SLIME_ICE = ['#1e5ab0', '#3a9ae8', '#7ad8ff', '#d8f8ff'];
export const BAT_ICE = ['#16306a', '#2a5ab0', '#5aa0e8', '#b4e4ff'];

function hurtEyes(L, x, y, gap = 5) {
  for (const ex of [x, x + gap]) { L.line(ex, y, ex + 2, y + 2, OUTLINE); L.line(ex + 2, y, ex, y + 2, OUTLINE); }
}

// --- Pinguïn (waggelt; aanval = buikschuiver) -------------------------------------
const PENG = ['#10141e', '#1e2636', '#323e56', '#4e5e7e'];
function penguinFrame(p, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const ph = p * Math.PI * 2;
  const slide = opt.slide || 0;      // 0..1: van rechtop naar liggend op de buik
  const lean = opt.lean || 0;
  const tilt = opt.tilt ?? Math.sin(ph) * 1.2; // waggelen
  const cx = 16 + lean, base = G;
  if (slide > 0.5) {
    // liggend, glijdt naar links
    const cy = base - 5;
    L.shadedEllipse(cx + 2, cy, 11, 5, PENG);
    L.shadedEllipse(cx, cy + 1.5, 8, 3, ['#c8d4e8', '#f0f6ff', '#ffffff']);
    L.shadedEllipse(cx - 9, cy - 2, 4.5, 4, PENG);
    L.poly([[cx - 13, cy - 2], [cx - 17, cy - 1], [cx - 13, cy]], '#ff9a2a');
    L.rect(cx - 11, cy - 4, 2, 2, '#ffffff'); L.set(cx - 11, cy - 3, OUTLINE);
    L.rect(cx - 12, cy - 7, 6, 2, '#e8483f'); // muts
    L.poly([[cx + 12, cy - 1], [cx + 15, cy - 3], [cx + 15, cy + 1]], '#ff9a2a');
    for (let k = 0; k < 4; k++) L.set(cx + 6 + k * 2, base - 1, '#ffffff'); // sneeuwspray
    return L.outline(OUTLINE);
  }
  // voetjes
  const f = Math.round(Math.sin(ph) * 1.5);
  L.rect(cx - 5 + f, base - 1, 4, 2, '#ff9a2a');
  L.rect(cx + 1 - f, base - 1, 4, 2, '#e07a1e');
  // lijf
  const by = base - 9;
  L.shadedEllipse(cx + tilt * 0.5, by, 7.5, 9, PENG);
  L.shadedEllipse(cx - 1 + tilt * 0.5, by + 1.5, 5, 6.5, ['#c8d4e8', '#f0f6ff', '#ffffff']);
  // vleugeltjes
  const flap = opt.flap ?? Math.round(Math.sin(ph * 2));
  L.poly([[cx + 5, by - 3], [cx + 10, by + 2 - flap], [cx + 6, by + 4]], PENG[1]);
  L.poly([[cx - 6, by - 2], [cx - 10, by + 2 + flap], [cx - 7, by + 4]], PENG[2]);
  // kop + snavel + muts met pompon
  const hy = by - 9 + Math.round(Math.abs(tilt) * 0.3);
  L.shadedEllipse(cx - 1 + tilt * 0.7, hy, 5.5, 5, PENG);
  L.shadedEllipse(cx - 3 + tilt * 0.7, hy + 1, 3, 2.6, ['#c8d4e8', '#f0f6ff']);
  L.poly([[cx - 6 + tilt, hy], [cx - 10 + tilt, hy + 1.2], [cx - 6 + tilt, hy + 2.2]], '#ff9a2a');
  L.shadedEllipse(cx - 1 + tilt * 0.7, hy - 3, 5.5, 2.6, ['#8a1a2a', '#c21f3a', '#e8483f'], { clip: (x, y) => y <= hy - 2 });
  L.hline(Math.round(cx - 6 + tilt * 0.7), Math.round(cx + 4 + tilt * 0.7), hy - 2, '#ffffff');
  L.disc(cx + 3 + tilt * 0.7, hy - 6, 1.5, '#ffffff');
  if (opt.hurt) hurtEyes(L, Math.round(cx - 5 + tilt), hy - 1, 4);
  else for (const ex of [Math.round(cx - 5 + tilt), Math.round(cx - 1 + tilt)]) { L.rect(ex, hy - 1, 2, 2, OUTLINE); L.set(ex, hy - 1, '#ffffff'); }
  return L.outline(OUTLINE);
}
export function buildPenguin() {
  return {
    move: [0, 1, 2, 3, 4, 5].map(i => penguinFrame(i / 6)),
    attack: [penguinFrame(0, { lean: 2, flap: -2, tilt: 0 }), penguinFrame(0, { slide: 1, lean: 0 }), penguinFrame(0, { slide: 1, lean: -7 }), penguinFrame(0, { lean: -2, tilt: 0 })],
    hurt: [penguinFrame(0, { hurt: true, lean: 2, tilt: 1 })],
  };
}

// --- Yeti-jong (pluizig; aanval = sneeuwbal gooien) -----------------------------------
const FUR = ['#7a8ab0', '#b4c4e0', '#e4ecf8', '#ffffff'];
const FACE = ['#2a4a8a', '#3a6ac0', '#5a90e0', '#8ab8f8'];
function yetiFrame(p, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const ph = p * Math.PI * 2;
  const lean = opt.lean || 0;
  const bob = opt.bob ?? -Math.round(Math.abs(Math.sin(ph)) * 1.5);
  const cx = 16 + lean, by = G - 10 + bob;
  // beentjes
  for (const [i, c] of [[0, FUR[1]], [1, FUR[0]]]) {
    const o = Math.round(Math.sin(ph + i * Math.PI) * 2);
    L.shadedBlock(cx - 5 + i * 6 + o, G - 6, 5, 6, [c, FUR[2], FUR[2]], { power: 3 });
    L.hline(cx - 5 + i * 6 + o, cx - 1 + i * 6 + o, G, FACE[0]);
  }
  // lijf (pluizig)
  L.shadedEllipse(cx, by, 9, 9, FUR);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; L.set(cx + Math.cos(a) * 9.5, by + Math.sin(a) * 9.5, FUR[k % 2 ? 2 : 1]); }
  // armen
  const raise = opt.throw || 0;
  L.thick(cx - 7, by - 1, cx - 11, by + 4 - raise * 12, 2, FUR[1]);
  L.thick(cx + 7, by - 1, cx + 10, by + 5, 2, FUR[0]);
  if (opt.ball) L.shadedEllipse(cx - 12 - (opt.ballX || 0), by + 1 - raise * 12, 3, 3, ['#b4c8e4', '#e4eefa', '#ffffff']);
  // gezicht (blauw) + hoorntjes
  const fy = by - 3;
  L.shadedEllipse(cx - 2, fy, 5, 4, FACE);
  L.poly([[cx - 6, by - 8], [cx - 9, by - 13], [cx - 4, by - 9]], '#e8dcc0');
  L.poly([[cx + 3, by - 9], [cx + 6, by - 14], [cx + 6, by - 8]], '#d0c4a8');
  if (opt.hurt) hurtEyes(L, cx - 6, fy - 2, 5);
  else {
    for (const ex of [cx - 6, cx - 1]) { L.rect(ex, fy - 2, 2, 2, '#ffffff'); L.set(ex, fy - 1, OUTLINE); }
    L.hline(cx - 5, cx - 1, fy + 2, FACE[0]); L.set(cx - 4, fy + 2, '#ffffff'); L.set(cx - 2, fy + 2, '#ffffff');
  }
  return L.outline(OUTLINE);
}
export function buildYeti() {
  return {
    move: [0, 1, 2, 3, 4, 5].map(i => yetiFrame(i / 6)),
    attack: [yetiFrame(0, { lean: 2, bob: 0, throw: 0.6, ball: true }), yetiFrame(0, { lean: 1, bob: -1, throw: 1, ball: true }), yetiFrame(0, { lean: -4, bob: 0, throw: 0.2, ball: true, ballX: 4 }), yetiFrame(0, { lean: -1, bob: 0 })],
    hurt: [yetiFrame(0, { hurt: true, lean: 2, bob: 1 })],
  };
}

// --- IJsklomp (mini-ijsgolem, 3 HP) -----------------------------------------------------
function iceRockFrame(step, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const bob = opt.bob ?? (step % 2);
  const lean = opt.lean || 0;
  const cx = 16 + lean;
  const off = step % 2 === 0 ? [-1, 1] : [1, -1];
  L.rect(cx - 7 + off[0], G - 3, 4, 4, ICE[1]);
  L.rect(cx + 3 + off[1], G - 3, 4, 4, ICE[2]);
  L.shadedBlock(cx - 10, G - 19 + bob, 20, 17, ICE, { power: 3.2 });
  // facetten
  L.line(cx - 2, G - 19 + bob, cx + 3, G - 9 + bob, ICE[2]);
  L.line(cx + 3, G - 9 + bob, cx + 9, G - 6 + bob, ICE[1]);
  L.set(cx - 6, G - 16 + bob, '#ffffff'); L.set(cx - 7, G - 15 + bob, '#ffffff');
  // kristallen bovenop
  for (const [x, h] of [[-6, 6], [-1, 9], [5, 5]]) {
    L.poly([[cx + x - 2, G - 18 + bob], [cx + x, G - 18 - h + bob], [cx + x + 2, G - 18 + bob]], ICE[3]);
    L.set(cx + x, G - 17 - h + bob, '#ffffff');
  }
  if (opt.hurt) hurtEyes(L, cx - 7, G - 12 + bob, 6);
  else for (const ex of [cx - 7, cx - 1]) {
    L.rect(ex - 1, G - 12 + bob, 5, 4, ICE[0]);
    L.rect(ex, G - 11 + bob, 3, 2, '#7affff'); L.set(ex, G - 11 + bob, '#ffffff');
  }
  return L.outline(OUTLINE);
}
export function buildIceRock() {
  return {
    move: [0, 1, 2, 3].map(i => iceRockFrame(i)),
    attack: [iceRockFrame(0, { lean: 2, bob: 1 }), iceRockFrame(1, { lean: -3, bob: -2 }), iceRockFrame(0, { lean: -7, bob: -1 }), iceRockFrame(1, { lean: -2 })],
    hurt: [iceRockFrame(0, { hurt: true, bob: 2 })],
  };
}
