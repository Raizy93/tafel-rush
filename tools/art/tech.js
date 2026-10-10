// ---------------------------------------------------------------------------
// Character 3 – NOVA (tech01): futuristische jonge runner met arm-kanon.
// Silhouet: piekhaar + koptelefoon, korte witte jas met lichtlijnen,
// batterij-rugzak met antenne, dik arm-kanon, sneakers met gloeiende zolen.
// Gebouwd op de gedeelde character-rig (tools/art/rig.js).
// ---------------------------------------------------------------------------
import { P } from '../lib/palette.js';
import { rad, buildCharacter, runLegs, runBob, runBackArm, IDLE_LEGS, ATTACK_LEGS, HIT_LEGS, HIT_LEAN, victoryLegs } from './rig.js';

const JACKET = ['#3a4260', '#8a94b8', '#d0d8ee', '#ffffff'];
const GLOW = P.energy; // ['#1e6b9c', '#2fb6e6', '#8ff2ff', '#ffffff']
const SKIN = ['#7a4a34', '#b0704e', '#dca07a', '#f6c8a0'];
const HAIR = ['#4a4a7a', '#b8c0ec', '#ffffff'];
const DARK = ['#141a2e', '#22304e', '#34466e'];

const HEAD = [
  '..h...hh..h....',
  '..hh.hHh.hh....',
  '.hHHhHHHhHHh...',
  'DHHHHHHHHHHHh..',
  'DHHHHHHHHHHHHh.',
  'DHHVVVVVVVVVVv.',
  'DDcCHsSSSSSSSS.',
  '.DCcCsSSSSWESS.',
  '..CcCsSSSSWESSS',
  '..DkssSSSSSSSS.',
  '...DksSSSSSmSS.',
  '....kssSSSSSS..',
  '.....kkssss....',
];
const HEAD_HURT = [
  '..h...hh..h....',
  '..hh.hHh.hh....',
  '.hHHhHHHhHHh...',
  'DHHHHHHHHHHHh..',
  'DHHHHHHHHHHHHh.',
  'DHHVVVVVVVVVVv.',
  'DDcCHsSSSSSSSS.',
  '.DCcCsSSSSESSS.',
  '..CcCsSSSSSEES.',
  '..DkssSSSSESSSS',
  '...DksSSSSmmSS.',
  '....kssSSSSSS..',
  '.....kkssss....',
];
const HEAD_HAPPY = [
  '..h...hh..h....',
  '..hh.hHh.hh....',
  '.hHHhHHHhHHh...',
  'DHHHHHHHHHHHh..',
  'DHHHHHHHHHHHHh.',
  'DHHVVVVVVVVVVv.',
  'DDcCHsSSSSSSSS.',
  '.DCcCsSSSSSSSS.',
  '..CcCsSSSSEESSS',
  '..DkssSSSSSSSS.',
  '...DksSSSSWWmS.',
  '....kssSSSmmS..',
  '.....kkssss....',
];
const TORSO = [
  '..dDDDDd..',
  '.dJJJJJJd.',
  '.JJJcJJJL.',
  'JJJJcJJJLL',
  'JjJJcJJJLL',
  'JjJJcJJJJL',
  'BBBBBBcBBB',
  'pPPPPPPPPp',
  'ppPPpPPPpp',
];

/** Batterij-rugzak met antenne. */
function drawPack(L, ctx, pose) {
  const x = ctx.neckX - 7, y = ctx.torsoTop + 1;
  L.rect(x, y, 4, 8, DARK[1]);
  L.vline(x, y, y + 7, DARK[2]);
  const pulse = pose.packGlow ?? (0.5 + 0.5 * Math.sin(ctx.t * Math.PI * 2));
  L.rect(x + 1, y + 2, 2, 4, pulse > 0.5 ? GLOW[2] : GLOW[1]);
  L.set(x + 1, y + 2, GLOW[3]);
  L.vline(x + 1, y - 4, y - 1, DARK[2]);
  L.set(x + 1, y - 5, GLOW[2]);
}

/**
 * Arm-kanon-stijlen per wapen-tier (zie js/data/weapons.js): body-kleur,
 * lengte/dikte, kleur van de lichtring en de lading.
 */
export const NOVA_WEAPON_STYLES = {
  w0: { body: JACKET, len: 8.5, r: 2.1, ring: GLOW, fins: false },                                                              // armkanon (start)
  w1: { body: ['#1e1e28', '#4a4a5e', '#8a8aa2', '#c8c8dc'], len: 9.5, r: 2.4, ring: ['#8a3a0e', '#e0701e', '#ff9a2a', '#fff0c0'], fins: true }, // kanon Mk II
  w2: { body: JACKET, len: 9.5, r: 2.4, ring: ['#4a1e8a', '#8a4ae0', '#c890ff', '#ffffff'], fins: true, aura: '#8a4ae0' },          // plasma-kanon
  w3: { body: P.gold, len: 10.5, r: 2.6, ring: ['#c8811e', '#fff1a0', '#ffffff', '#ffffff'], fins: true, aura: '#ffc93c' },        // nova-kanon
};

/** Bovenarm in jas-mouw + dik arm-kanon i.p.v. onderarm. */
function drawCannonArm(L, a, pose, st = NOVA_WEAPON_STYLES.w0) {
  L.thick(a.sx, a.sy, a.ex, a.ey, 1.4, JACKET[2]);
  const B = st.body, R = st.ring;
  const dx = Math.sin(a.a2), dy = Math.cos(a.a2);
  const len = st.len;
  const mx = a.ex + dx * len, my = a.ey + dy * len;
  if (st.aura) L.thick(a.ex, a.ey, mx, my, st.r + 0.9, st.aura);
  L.thick(a.ex, a.ey, mx, my, st.r, B[1]);
  L.thick(a.ex, a.ey, a.ex + dx * (len - 1.5), a.ey + dy * (len - 1.5), st.r - 0.9, B[2]);
  // bovenrand licht
  L.line(a.ex - dy * 1.6, a.ey - dx * 1.6, mx - dy * 1.6, my - dx * 1.6, B[3]);
  // vinnen (hogere tiers)
  if (st.fins) {
    const fx = a.ex + dx * 2.5, fy = a.ey + dy * 2.5;
    L.thick(fx - dy * (st.r + 0.5), fy + dx * (st.r + 0.5), fx - dy * (st.r + 2), fy + dx * (st.r + 2) - 1, 0.6, B[0]);
  }
  // gloeiende ringen
  for (const k of st.fins ? [3.5, 6.5] : [4]) {
    const rx = a.ex + dx * k, ry = a.ey + dy * k;
    L.thick(rx - dy * (st.r + 0.1), ry + dx * (st.r + 0.1), rx + dy * (st.r + 0.1), ry - dx * (st.r + 0.1), 0.6, R[2]);
  }
  // loop
  L.disc(mx, my, 1.4, DARK[1]);
  L.set(Math.round(mx + dx), Math.round(my + dy), pose.charge ? R[3] : R[1]);
  if (pose.charge) {
    L.disc(mx + dx * 2, my + dy * 2, 1.2 + pose.charge * 1.4, pose.charge > 0.8 ? R[3] : R[2]);
  }
}

export const NOVA_SPEC = {
  head: {
    normal: HEAD, hurt: HEAD_HURT, happy: HEAD_HAPPY,
    map: { D: HAIR[0], H: HAIR[1], h: HAIR[2], V: '#4fe8ff', v: '#2a3a5a', C: DARK[1], c: '#7af0ff', S: SKIN[2], s: SKIN[1], k: SKIN[0], E: '#1a1324', W: '#fff8ec', m: SKIN[0] },
  },
  torso: { rows: TORSO, map: { d: DARK[0], D: DARK[1], J: JACKET[2], j: JACKET[1], L: JACKET[3], c: GLOW[2], B: DARK[0], p: DARK[0], P: DARK[1] } },
  colors: {
    sleeve: [JACKET[1], JACKET[2]], skin: [SKIN[1], SKIN[2]], glove: [DARK[1], DARK[2]],
    pants: [DARK[0], DARK[1], GLOW[2]],
    boot: { back: [JACKET[0], JACKET[1], JACKET[1]], front: [JACKET[1], JACKET[3], JACKET[3]], sole: [GLOW[1], GLOW[2]] },
  },
  back: drawPack,
  frontArm: (L, a, pose) => drawCannonArm(L, a, pose),
};

export const NOVA_POSES = {
  idle: p => {
    const s = Math.sin(p * Math.PI * 2);
    return { legs: IDLE_LEGS, arms: [{ upper: 10, fore: 40 }, { upper: 30 + s * 3, fore: 45 }], lean: 0.5, bob: s > 0.3 ? 1 : 0 };
  },
  run: (p, sprint) => {
    const q = p * Math.PI * 2 + Math.PI;
    return {
      legs: runLegs(p, sprint),
      arms: [runBackArm(p, sprint), sprint ? { upper: -45 + 6 * Math.sin(q), fore: 15 } : { upper: -5 + 28 * Math.sin(q), fore: 60 }],
      lean: sprint ? 4.5 : 2, bob: runBob(p),
    };
  },
  attack: [
    { arms: [{ upper: 30, fore: 30 }, { upper: 65, fore: 20 }], lean: 0, charge: 0.3 },
    { arms: [{ upper: 20, fore: 30 }, { upper: 85, fore: 5 }], lean: 1, charge: 1 },
    { arms: [{ upper: -10, fore: 40 }, { upper: 78, fore: 12 }], lean: -1, charge: 0.6 },
    { arms: [{ upper: -10, fore: 40 }, { upper: 84, fore: 6 }], lean: 2, charge: 0.2 },
    { arms: [{ upper: 0, fore: 40 }, { upper: 60, fore: 30 }], lean: 2 },
    { arms: [{ upper: 5, fore: 40 }, { upper: 40, fore: 45 }], lean: 2 },
  ].map((p, i) => ({ legs: ATTACK_LEGS[i], ...p })),
  hit: [
    { arms: [{ upper: -60, fore: 40 }, { upper: -40, fore: 60 }], headTilt: -1, head: 'hurt', packGlow: 1 },
    { arms: [{ upper: -90, fore: 50 }, { upper: -70, fore: 40 }], headTilt: -1, head: 'hurt', packGlow: 0 },
    { arms: [{ upper: -50, fore: 50 }, { upper: -30, fore: 50 }], head: 'hurt', packGlow: 1 },
    { arms: [{ upper: 0, fore: 40 }, { upper: 20, fore: 50 }] },
  ].map((p, i) => ({ legs: HIT_LEGS[i], lean: HIT_LEAN[i], ...p })),
  victory: p => {
    const s = Math.sin(p * Math.PI * 2);
    return { ...victoryLegs(p), arms: [{ upper: 40 + s * 10, fore: 100 }, { upper: 165, fore: 0 }], armBehindHead: true, lean: 0, head: 'happy', charge: 0.6 + 0.4 * Math.max(0, s), packGlow: 1 };
  },
};

export function buildTech(style = NOVA_WEAPON_STYLES.w0) {
  return buildCharacter({ ...NOVA_SPEC, frontArm: (L, a, pose) => drawCannonArm(L, a, pose, style) }, NOVA_POSES);
}
