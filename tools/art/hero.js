// ---------------------------------------------------------------------------
// Character 1 – KAI (hero01): avonturier met energiezwaard en rode sjaal.
// Gebouwd op de gedeelde character-rig (tools/art/rig.js).
// ---------------------------------------------------------------------------
import { P } from '../lib/palette.js';
import { rad, buildCharacter, runLegs, runBob, runBackArm, IDLE_LEGS, ATTACK_LEGS, HIT_LEGS, HIT_LEAN, victoryLegs } from './rig.js';

export { CHAR_FW as HERO_FW, CHAR_FH as HERO_FH } from './rig.js';

const HEAD = [
  '.......hH.h....',
  '....hhHHHhHh...',
  '..DHHHHHHHHHH..',
  '.DHHHHHHHHHHHh.',
  'DDHHHHHHHHHHHHH',
  'DDRRRRRRRRRRRRq',
  'DDrHHsSSSSSSSS.',
  '.DHHsSSSSSWESS.',
  '..DHsSSSSSWESSS',
  '..DkssSSSSSSSS.',
  '...DksSSSSSmSS.',
  '....kssSSSSSS..',
  '.....kkssss....',
];
const HEAD_HURT = [
  '.......hH.h....',
  '....hhHHHhHh...',
  '..DHHHHHHHHHH..',
  '.DHHHHHHHHHHHh.',
  'DDHHHHHHHHHHHHH',
  'DDRRRRRRRRRRRRq',
  'DDrHHsSSSSSSSS.',
  '.DHHsSSSSSESSS.',
  '..DHsSSSSSSEES.',
  '..DkssSSSSESSSS',
  '...DksSSSSmmSS.',
  '....kssSSSSSS..',
  '.....kkssss....',
];
const HEAD_HAPPY = [
  '.......hH.h....',
  '....hhHHHhHh...',
  '..DHHHHHHHHHH..',
  '.DHHHHHHHHHHHh.',
  'DDHHHHHHHHHHHHH',
  'DDRRRRRRRRRRRRq',
  'DDrHHsSSSSSSSS.',
  '.DHHsSSSSSSSSS.',
  '..DHsSSSSSEESSS',
  '..DkssSSSSSSSS.',
  '...DksSSSSWWmS.',
  '....kssSSSmmS..',
  '.....kkssss....',
];

const TORSO = [
  '..qQQQQq..',
  '.qQQQQQQQ.',
  '.tTTTTTTU.',
  'tTTTTTTTUU',
  'tTTTTTTTUU',
  'tTTTTTTTTU',
  'BBBBBBGBBB',
  'tTTTTTTTTt',
  'ttTTtTTTtt',
];

/**
 * Zwaard-stijlen per wapen-tier (zie js/data/weapons.js). Elke stijl is
 * zichtbaar anders: lengte, breedte, kleur van kling en gevest, gloed.
 */
export const KAI_WEAPON_STYLES = {
  w0: { blade: P.steel, guard: P.gold, grip: P.leather[1], len: 13, width: 0.75, glow: '#8ff2ff' },                         // energiezwaard (start)
  w1: { blade: ['#26304a', '#5a6f9a', '#c8d8f0', '#ffffff'], guard: ['#4a5068', '#8a90a8', '#d8dcec', '#ffffff'], grip: '#5a1e22', pommel: '#e8483f', len: 15, width: 1.35, guardW: 3.4, glow: '#e0f0ff' }, // ridderzwaard
  w2: { blade: ['#3a1e6a', '#7a4ae0', '#c8a0ff', '#ffffff'], guard: P.gold, grip: '#2a1a4a', pommel: '#c8a0ff', len: 14, width: 1.0, glow: '#c890ff', aura: '#7a4ae0' },                                          // kristalzwaard
  w3: { blade: ['#8a1e12', '#e0481e', '#ffb02a', '#fff0a0'], guard: ['#3a1810', '#6a2a18', '#a03a20', '#e06a3a'], grip: '#2a1010', pommel: '#ffb02a', len: 15, width: 1.05, guardW: 3, glow: '#ff9a2a', aura: '#ff6a1e', flames: true }, // vlammenzwaard
};

function drawSword(L, hx, hy, angDeg, glow, st = KAI_WEAPON_STYLES.w0) {
  const a = rad(angDeg);
  const dx = Math.cos(a), dy = Math.sin(a);
  const len = st.len;
  L.thick(hx - dx * 3, hy - dy * 3, hx, hy, 0.6, st.grip);
  L.set(Math.round(hx - dx * 3.5), Math.round(hy - dy * 3.5), st.pommel || st.guard[2]);
  const gx = hx + dx * 1.5, gy = hy + dy * 1.5, gw = st.guardW || 2.5;
  L.thick(gx - dy * gw, gy + dx * gw, gx + dy * gw, gy - dx * gw, 0.6, st.guard[2]);
  L.set(Math.round(gx + dy * gw), Math.round(gy - dx * gw), st.guard[3]);
  const bx0 = hx + dx * 2.5, by0 = hy + dy * 2.5;
  const bx1 = hx + dx * len, by1 = hy + dy * len;
  if (glow) L.thick(bx0, by0, bx1, by1, 1.6, glow);
  else if (st.aura) L.thick(bx0, by0, bx1, by1, 1.25, st.aura); // altijd zichtbare gloed bij hogere tiers
  L.thick(bx0, by0, bx1 - dx, by1 - dy, st.width, st.blade[2]);
  L.line(bx0 - dy * 0.6, by0 + dx * 0.6, bx1 - dy * 0.6, by1 + dx * 0.6, st.blade[1]);
  L.line(bx0 + dy * 0.4, by0 - dx * 0.4, bx1 - dx * 1.5 + dy * 0.4, by1 - dy * 1.5 - dx * 0.4, st.blade[3]);
  L.set(Math.round(bx1), Math.round(by1), st.blade[3]);
  if (st.flames) {
    // vlammetjes langs de kling
    for (const f of [0.45, 0.7, 0.92]) {
      const fx = hx + dx * len * f - dy * 1.6, fy = hy + dy * len * f + dx * 1.6;
      L.set(Math.round(fx), Math.round(fy), '#ffe66a');
      L.set(Math.round(fx - dy), Math.round(fy + dx), '#ff9a2a');
    }
  }
}

/** Wapperende sjaal achter de held. */
function drawScarf(L, ctx, pose) {
  const sc = pose.scarf || { len: 7, wave: 1, lift: 0 };
  const t = ctx.t;
  let px = ctx.neckX - 2, py = ctx.torsoTop + 1;
  const n = sc.len;
  for (let i = 0; i < n; i++) {
    const nx = px - 2.1;
    const ny = py + 0.45 - (sc.lift || 0) * 0.3 + Math.sin(t * Math.PI * 2 + i * 0.9) * (sc.wave || 1) * (i / n) * 1.2;
    const r = i < 2 ? 1.5 : i < n - 2 ? 1.1 : 0.7;
    L.thick(px, py, nx, ny, r, P.scarf[2]);
    L.set(Math.round(nx), Math.round(ny + r), P.scarf[1]);
    px = nx; py = ny;
  }
  px = ctx.neckX - 2; py = ctx.torsoTop + 2;
  for (let i = 0; i < n - 3; i++) {
    const nx = px - 2.0;
    const ny = py + 0.9 + Math.sin(t * Math.PI * 2 + i * 0.9 + 1.7) * (sc.wave || 1) * (i / n) * 1.3;
    L.thick(px, py, nx, ny, i < 2 ? 1.2 : 0.8, P.scarf[1]);
    px = nx; py = ny;
  }
}

export const KAI_SPEC = {
  head: {
    normal: HEAD, hurt: HEAD_HURT, happy: HEAD_HAPPY,
    map: { D: P.hair[0], H: P.hair[1], h: P.hair[2], L: P.hair[3], S: P.skin[2], s: P.skin[1], k: P.skin[0], R: P.scarf[2], r: P.scarf[1], q: P.scarf[3], E: '#1a1324', W: '#fff8ec', m: P.skin[0] },
  },
  torso: { rows: TORSO, map: { q: P.scarf[1], Q: P.scarf[2], t: P.tunic[1], T: P.tunic[2], U: P.tunic[3], B: P.leather[1], G: P.gold[2] } },
  colors: {
    sleeve: [P.tunic[1], P.tunic[2]], skin: [P.skin[1], P.skin[2]], glove: [P.leather[1], P.leather[2]],
    pants: [P.pants[0], P.pants[1], P.pants[2]],
    boot: { back: [P.leather[0], P.leather[1], P.leather[1]], front: [P.leather[1], P.leather[2], P.leather[3]] },
  },
  back: drawScarf,
  weapon: (L, a, pose) => { if (pose.sword != null) drawSword(L, a.hx, a.hy, pose.sword, pose.glow); },
};

/** Kai-spec met een bepaald zwaard (wapen-tier). */
export function makeKaiSpec(style = KAI_WEAPON_STYLES.w0) {
  return { ...KAI_SPEC, weapon: (L, a, pose) => { if (pose.sword != null) drawSword(L, a.hx, a.hy, pose.sword, pose.glow && style.glow, style); } };
}

const S = (len, wave, lift) => ({ len, wave, lift });

export const KAI_POSES = {
  idle: p => {
    const s = Math.sin(p * Math.PI * 2);
    return { legs: IDLE_LEGS, arms: [{ upper: 10, fore: 40 }, { upper: 20 + s * 3, fore: 55 }], lean: 0.5, bob: s > 0.3 ? 1 : 0, sword: -35 + s * 4, scarf: S(5, 0.6, -2) };
  },
  run: (p, sprint) => {
    const ph = p * Math.PI * 2;
    const q = ph + Math.PI;
    return {
      legs: runLegs(p, sprint),
      arms: [runBackArm(p, sprint), sprint ? { upper: -55 + 8 * Math.sin(q), fore: -20 } : { upper: -25 + 30 * Math.sin(q), fore: 35 }],
      lean: sprint ? 4.5 : 2, bob: runBob(p),
      sword: sprint ? 175 : 172 + 8 * Math.sin(ph),
      scarf: S(sprint ? 9 : 7, sprint ? 0.8 : 1.2, sprint ? 2 : 1),
    };
  },
  attack: [
    { arms: [{ upper: 30, fore: 30 }, { upper: -150, fore: 30 }], lean: -1, sword: -150, scarf: S(7, 1, 1) },
    { arms: [{ upper: 20, fore: 20 }, { upper: -120, fore: 20 }], lean: 1, sword: -90, scarf: S(8, 1, 2) },
    { arms: [{ upper: -30, fore: 20 }, { upper: -80, fore: 0 }], lean: 5, sword: -15, glow: '#8ff2ff', scarf: S(9, 0.6, 3) },
    { arms: [{ upper: -40, fore: 20 }, { upper: -40, fore: 0 }], lean: 5, sword: 30, glow: '#8ff2ff', scarf: S(9, 0.8, 3) },
    { arms: [{ upper: -20, fore: 30 }, { upper: -10, fore: 10 }], lean: 4, sword: 60, scarf: S(8, 1, 2) },
    { arms: [{ upper: 0, fore: 40 }, { upper: 10, fore: 30 }], lean: 2, sword: 80, scarf: S(7, 1, 1) },
  ].map((p, i) => ({ legs: ATTACK_LEGS[i], ...p })),
  hit: [
    { arms: [{ upper: -60, fore: 40 }, { upper: -40, fore: 60 }], headTilt: -1, head: 'hurt', sword: -120, scarf: S(6, 2, 4) },
    { arms: [{ upper: -90, fore: 50 }, { upper: -70, fore: 40 }], headTilt: -1, head: 'hurt', sword: -140, scarf: S(6, 2.5, 5) },
    { arms: [{ upper: -50, fore: 50 }, { upper: -30, fore: 50 }], head: 'hurt', sword: -100, scarf: S(6, 2, 3) },
    { arms: [{ upper: 0, fore: 40 }, { upper: 10, fore: 50 }], sword: -40, scarf: S(6, 1, 0) },
  ].map((p, i) => ({ legs: HIT_LEGS[i], lean: HIT_LEAN[i], ...p })),
  victory: p => {
    const s = Math.sin(p * Math.PI * 2);
    return { ...victoryLegs(p), arms: [{ upper: 40 + s * 10, fore: 100 }, { upper: 155, fore: 10 }], armBehindHead: true, lean: 0, head: 'happy', sword: -62, glow: '#ffe66a', scarf: S(7, 1.5, 3) };
  },
};

export function buildHero(style = KAI_WEAPON_STYLES.w0) {
  return buildCharacter(makeKaiSpec(style), KAI_POSES);
}
