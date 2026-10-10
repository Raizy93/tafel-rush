// ---------------------------------------------------------------------------
// Character 2 – MILA (ranger01): snelle ranger met kap-cape, pijlkoker en boog.
// Silhouet: puntige kap + wapperende cape + boog vóór het lichaam.
// Gebouwd op de gedeelde character-rig (tools/art/rig.js).
// ---------------------------------------------------------------------------
import { P } from '../lib/palette.js';
import { rad, buildCharacter, runLegs, runBob, runBackArm, IDLE_LEGS, ATTACK_LEGS, HIT_LEGS, HIT_LEAN, victoryLegs } from './rig.js';

const CAPE = ['#16351f', '#24583a', '#3a8a4a', '#76c45e'];
const HAIR = ['#5a1e12', '#9a3a1c', '#d0602a', '#ff9a4a'];
const SKIN = ['#6a3a28', '#9c5c3c', '#c98a5e', '#ebb68c'];
const TUNIC = ['#4a2c1a', '#7a5030', '#b07a48', '#e0b07a'];
const LEGS = ['#2a2420', '#463a2e', '#5e4e3c'];
const WOOD = ['#3a2010', '#6a3a1c', '#a0602e', '#d89a50'];

const HEAD = [
  '......gGGGg.....',
  '....gGGGGGGGl...',
  '..ggGGGGGGGGGl..',
  'gggGGGGGGGGGGGl.',
  '.ggGGGGGGGGGGGGl',
  '..gGGGGHHHHHHHGG',
  '..gGGGHHhHHHEEHG',
  '..gGGHHsSSSSWESS',
  '..gGGHsSSSSSWESS',
  '..gGGksSSSSSSSSS',
  '...gGksSSSSSmSS.',
  '....gkssSSSSSS..',
  '.....kkkssss....',
];
const HEAD_HURT = [
  '......gGGGg.....',
  '....gGGGGGGGl...',
  '..ggGGGGGGGGGl..',
  'gggGGGGGGGGGGGl.',
  '.ggGGGGGGGGGGGGl',
  '..gGGGGHHHHHHHGG',
  '..gGGGHHhHHHHHHG',
  '..gGGHHsSSSSESSS',
  '..gGGHsSSSSSSESS',
  '..gGGksSSSSSESSS',
  '...gGksSSSSmmSS.',
  '....gkssSSSSSS..',
  '.....kkkssss....',
];
const HEAD_HAPPY = [
  '......gGGGg.....',
  '....gGGGGGGGl...',
  '..ggGGGGGGGGGl..',
  'gggGGGGGGGGGGGl.',
  '.ggGGGGGGGGGGGGl',
  '..gGGGGHHHHHHHGG',
  '..gGGGHHhHHHHHHG',
  '..gGGHHsSSSSSSSS',
  '..gGGHsSSSSSEESS',
  '..gGGksSSSSSSSSS',
  '...gGksSSSSWWmS.',
  '....gkssSSSmmS..',
  '.....kkkssss....',
];
const TORSO = [
  '..cCCCCc..',
  '.cCCCCCCC.',
  '.tTTTyTTU.',
  'tTTTTTyTUU',
  'tTTTTTTyUU',
  'tTTTTTTTyU',
  'BBBBBBGBBB',
  'tTTTTTTTTt',
  'ttTTtTTTtt',
];

/** Wapperende kap-cape + pijlkoker op de rug. */
function drawBack(L, ctx, pose) {
  const c = pose.cape || { len: 11, wave: 1, lift: 0 };
  // cape als polygon: smal bij de schouders, wapperend naar een punt
  const N = 8, top = [], bot = [];
  const ph = ctx.t * Math.PI * 2;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const w = Math.sin(ph + s * 3) * (c.wave || 1) * 1.4 * s;
    top.push([ctx.neckX - 1 - s * c.len, ctx.torsoTop + 0.5 + s * (3.5 - (c.lift || 0) * 0.8) + w]);
    bot.push([ctx.neckX - 3 - s * c.len * 0.82, ctx.torsoTop + 7 + s * (5 - (c.lift || 0) * 0.7) + w * 1.2 - s * s * 3]);
  }
  const poly = [...top, ...bot.reverse()];
  L.poly(poly, CAPE[2]);
  // vouwlijn + randen
  for (let i = 0; i < N; i++) {
    const a = top[i], b = top[i + 1];
    L.line(a[0], a[1], b[0], b[1], CAPE[3]);
    const m0 = [(top[i][0] + bot[N - i][0]) / 2, (top[i][1] + bot[N - i][1]) / 2 + 1];
    const m1 = [(top[i + 1][0] + bot[N - i - 1][0]) / 2, (top[i + 1][1] + bot[N - i - 1][1]) / 2 + 1];
    if (i > 1) L.line(m0[0], m0[1], m1[0], m1[1], CAPE[1]);
    const c0 = bot[N - i], c1 = bot[N - i - 1];
    L.line(c0[0], c0[1], c1[0], c1[1], CAPE[0]);
  }
  // pijlkoker (schuin op de rug) met veren
  const qx0 = ctx.neckX - 5, qy0 = ctx.torsoTop + 8, qx1 = ctx.neckX - 1, qy1 = ctx.torsoTop - 2;
  L.thick(qx0, qy0, qx1, qy1, 1.4, WOOD[1]);
  L.line(qx0 + 1, qy0, qx1 + 1, qy1, WOOD[2]);
  L.set(qx1, qy1 - 2, '#e8483f'); L.set(qx1 + 1, qy1 - 2, '#fff8ec'); L.set(qx1 - 1, qy1 - 1, '#e8483f');
  L.set(qx1 + 2, qy1 - 3, '#e8483f'); L.set(qx1, qy1 - 3, '#fff8ec');
}

/**
 * Boog in de voorhand. pose.bow = { ang (graden; 0 = schiet naar rechts),
 * draw (0..1 hoe ver de pees getrokken is), arrow (pijl op de pees), glow }.
 */
/**
 * Boog-stijlen per wapen-tier (zie js/data/weapons.js): hout/kleur, grootte,
 * teruggekrulde punten (recurve), gloed en pijlpunt.
 */
export const MILA_WEAPON_STYLES = {
  w0: { wood: WOOD, R: 8, tips: P.gold[2], string: '#efe6d0', arrowTip: P.steel, glow: '#c2ff9a' },                                        // houten boog (start)
  w1: { wood: ['#1e100a', '#3e2214', '#6a3e22', '#a06a3a'], R: 9, tips: '#d8dcec', string: '#b8a888', recurve: true, arrowTip: P.steel, glow: '#e0f0ff' }, // jachtboog
  w2: { wood: ['#8a7a5a', '#cfc29c', '#fff6dc', '#ffffff'], R: 9, tips: P.gold[2], string: '#c2ff9a', recurve: true, aura: '#5fd65a', arrowTip: ['#1f6a3a', '#5fd65a', '#c2ff9a', '#ffffff'], glow: '#7aff9a' }, // elfenboog
  w3: { wood: P.gold, R: 10, tips: '#ffffff', string: '#fff1a0', recurve: true, aura: '#ffc93c', star: true, arrowTip: P.gold, glow: '#fff1a0' },                        // sterrenboog
};

function drawBow(L, a, pose, st = MILA_WEAPON_STYLES.w0) {
  const b = pose.bow;
  if (!b) return;
  const d = rad(b.ang || 0);
  const dx = Math.cos(d), dy = Math.sin(d);       // schietrichting
  const px = -dy, py = dx;                         // langs de latten
  const hx = a.hx, hy = a.hy;
  const R = st.R;
  const W = st.wood;
  const pts = [];
  for (let i = -R; i <= R; i++) {
    const s = i / R;
    let fwd = (1 - s * s) * 3.2 - 1;
    if (st.recurve && Math.abs(s) > 0.8) fwd += (Math.abs(s) - 0.8) * 9; // punten krullen naar voren
    pts.push([hx + px * i + dx * fwd, hy + py * i + dy * fwd]);
  }
  const glow = b.glow ? st.glow : st.aura;
  if (glow) for (let i = 0; i + 1 < pts.length; i++) L.thick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], b.glow ? 1.5 : 1.15, glow);
  for (let i = 0; i + 1 < pts.length; i++) L.thick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], R >= 10 ? 0.85 : 0.7, Math.abs(i - R) < 3 ? W[1] : W[2]);
  for (let i = 2; i + 2 < pts.length; i += 4) L.set(Math.round(pts[i][0]), Math.round(pts[i][1]), W[3]); // glans
  const t1 = pts[0], t2 = pts[pts.length - 1];
  L.set(Math.round(t1[0]), Math.round(t1[1]), st.tips); L.set(Math.round(t2[0]), Math.round(t2[1]), st.tips);
  if (st.star) { // sterretje bij de handgreep
    const sx = Math.round(hx + dx * 2), sy = Math.round(hy + dy * 2);
    L.set(sx, sy, '#ffffff'); L.set(sx + 1, sy, '#fff1a0'); L.set(sx - 1, sy, '#fff1a0'); L.set(sx, sy + 1, '#fff1a0'); L.set(sx, sy - 1, '#fff1a0');
  }
  // pees
  const pull = 1 + (b.draw || 0) * 8;
  const nx = hx - dx * pull, ny = hy - dy * pull;
  L.line(t1[0], t1[1], nx, ny, st.string);
  L.line(nx, ny, t2[0], t2[1], st.string);
  // pijl
  if (b.arrow) {
    const tipX = hx + dx * 5, tipY = hy + dy * 5;
    L.line(nx, ny, tipX, tipY, WOOD[3]);
    L.set(Math.round(tipX), Math.round(tipY), st.arrowTip[3]);
    L.set(Math.round(tipX - dx), Math.round(tipY - dy), st.arrowTip[2]);
    L.set(Math.round(nx - dx), Math.round(ny - dy + 1), '#e8483f');
    L.set(Math.round(nx - dx), Math.round(ny - dy - 1), '#e8483f');
  }
}

export const MILA_SPEC = {
  head: {
    normal: HEAD, hurt: HEAD_HURT, happy: HEAD_HAPPY, dx: -1,
    map: { g: CAPE[0], G: CAPE[1], l: CAPE[2], H: HAIR[1], h: HAIR[2], S: SKIN[2], s: SKIN[1], k: SKIN[0], E: '#1a1324', W: '#fff8ec', m: SKIN[0] },
  },
  torso: { rows: TORSO, map: { c: CAPE[1], C: CAPE[2], t: TUNIC[1], T: TUNIC[2], U: TUNIC[3], y: TUNIC[0], B: P.leather[0], G: P.gold[2] } },
  colors: {
    sleeve: [TUNIC[1], TUNIC[2]], skin: [SKIN[1], SKIN[2]], glove: [P.leather[1], P.leather[2]],
    pants: [LEGS[0], LEGS[1], LEGS[2]],
    boot: { back: [P.leather[0], P.leather[1], P.leather[1]], front: [P.leather[0], P.leather[1], P.leather[2]] },
  },
  back: drawBack,
  weapon: (L, a, pose) => drawBow(L, a, pose),
  weaponBehindArm: true,
};

const C = (len, wave, lift) => ({ len, wave, lift });

export const MILA_POSES = {
  idle: p => {
    const s = Math.sin(p * Math.PI * 2);
    return { legs: IDLE_LEGS, arms: [{ upper: 15, fore: 45 }, { upper: 25 + s * 3, fore: 30 }], lean: 0.5, bob: s > 0.3 ? 1 : 0, bow: { ang: -8 + s * 2 }, cape: C(12, 0.6, -3) };
  },
  run: (p, sprint) => {
    const q = p * Math.PI * 2 + Math.PI;
    return {
      legs: runLegs(p, sprint),
      arms: [runBackArm(p, sprint), sprint ? { upper: -50 + 6 * Math.sin(q), fore: 10 } : { upper: 10 + 25 * Math.sin(q), fore: 40 }],
      lean: sprint ? 4.5 : 2, bob: runBob(p),
      bow: { ang: sprint ? -40 : -15 + 8 * Math.sin(q) },
      cape: C(sprint ? 20 : 16, sprint ? 0.8 : 1.2, sprint ? 3 : 1),
    };
  },
  attack: [
    { arms: [{ upper: 50, fore: 70 }, { upper: 55, fore: 20 }], lean: 0, bow: { ang: -10, draw: 0.3, arrow: true }, cape: C(15, 1, 1) },
    { arms: [{ upper: 75, fore: 75 }, { upper: 82, fore: 5 }], lean: 1, bow: { ang: -4, draw: 1, arrow: true, glow: '#c2ff9a' }, cape: C(16, 1, 2) },
    { arms: [{ upper: 30, fore: 40 }, { upper: 85, fore: 0 }], lean: 4, bow: { ang: -2, draw: 0, glow: '#c2ff9a' }, cape: C(18, 0.6, 3) },
    { arms: [{ upper: 15, fore: 40 }, { upper: 85, fore: 0 }], lean: 4, bow: { ang: -2, draw: -0.15 }, cape: C(18, 0.8, 3) },
    { arms: [{ upper: 20, fore: 50 }, { upper: 65, fore: 10 }], lean: 3, bow: { ang: -10 }, cape: C(16, 1, 2) },
    { arms: [{ upper: 20, fore: 45 }, { upper: 40, fore: 20 }], lean: 2, bow: { ang: -12 }, cape: C(14, 1, 1) },
  ].map((p, i) => ({ legs: ATTACK_LEGS[i], ...p })),
  hit: [
    { arms: [{ upper: -60, fore: 40 }, { upper: -30, fore: 50 }], headTilt: -1, head: 'hurt', bow: { ang: -60 }, cape: C(13, 2, 4) },
    { arms: [{ upper: -90, fore: 50 }, { upper: -60, fore: 40 }], headTilt: -1, head: 'hurt', bow: { ang: -80 }, cape: C(13, 2.5, 5) },
    { arms: [{ upper: -50, fore: 50 }, { upper: -20, fore: 50 }], head: 'hurt', bow: { ang: -50 }, cape: C(13, 2, 3) },
    { arms: [{ upper: 0, fore: 40 }, { upper: 15, fore: 40 }], bow: { ang: -15 }, cape: C(13, 1, 0) },
  ].map((p, i) => ({ legs: HIT_LEGS[i], lean: HIT_LEAN[i], ...p })),
  victory: p => {
    const s = Math.sin(p * Math.PI * 2);
    return { ...victoryLegs(p), arms: [{ upper: 40 + s * 10, fore: 100 }, { upper: 160, fore: 5 }], armBehindHead: true, lean: 0, head: 'happy', bow: { ang: -90, glow: '#ffe66a' }, cape: C(15, 1.5, 3) };
  },
};

export function buildRanger(style = MILA_WEAPON_STYLES.w0) {
  return buildCharacter({ ...MILA_SPEC, weapon: (L, a, pose) => drawBow(L, a, pose, style) }, MILA_POSES);
}
