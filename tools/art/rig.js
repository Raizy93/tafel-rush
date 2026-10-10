// ---------------------------------------------------------------------------
// Generieke character-rig voor ALLE speelbare characters.
//
// Iedere character gebruikt exact hetzelfde skelet (heup, romp, armen, benen,
// hoofd) en hetzelfde frame (48x56, voeten op y=52). Daardoor hebben alle
// characters automatisch dezelfde schaal, ground position en ankerpunt.
//
// Een character is een "spec": hoofd/romp-matrices, kleuren en een paar
// tekenhaken (cape/sjaal, wapen, voorarm). De animaties zijn pose-functies.
// Elke lagen-groep krijgt een eigen outline (16-bit look).
// ---------------------------------------------------------------------------
import { Img } from '../lib/raster.js';
import { OUTLINE } from '../lib/palette.js';

export const CHAR_FW = 48;
export const CHAR_FH = 56;
export const CHAR_GROUND = 52;          // y van de onderste voetpixel
export const CHAR_ANCHOR = [21, 52];    // ankerpunt (voeten) in het frame
export const THIGH = 6, SHIN = 6;

export const rad = d => (d * Math.PI) / 180;

/**
 * Teken één frame.
 * spec: {
 *   head: { normal, hurt, happy, map, dx },  torso: { rows, map },
 *   colors: { sleeve:[achter,voor], skin:[achter,voor], glove:[achter,voor],
 *             pants:[achter,voor,highlight], boot:{ back:[donker,mid], front:[donker,mid,licht] } },
 *   back(L, ctx)      – optioneel: cape/sjaal/rugzak/pijlkoker (achter alles)
 *   weapon(L, arm, pose, ctx) – optioneel: wapen in de voorhand
 *   frontArm(L, arm, pose, ctx) – optioneel: eigen voorarm (bijv. arm-kanon)
 * }
 * pose: { legs:[{thigh,shin}x2], arms:[{upper,fore}x2], lean, bob, head, headTilt,
 *         headBob, armBehindHead, ...character-specifieke velden }
 */
export function drawCharacter(spec, pose, t = 0) {
  const W = CHAR_FW, H = CHAR_FH;
  const hipX = pose.hipX ?? 21;
  const C = spec.colors;

  // benen: laagste voet altijd op de grond
  const legPts = pose.legs.map((lg, i) => {
    const hx = hipX + (i === 0 ? -1 : 1);
    const a1 = rad(lg.thigh), a2 = rad(lg.shin);
    const kx = hx + Math.sin(a1) * THIGH, ky = Math.cos(a1) * THIGH;
    const fx = kx + Math.sin(a2) * SHIN, fy = ky + Math.cos(a2) * SHIN;
    return { hx, kx, ky, fx, fy };
  });
  const maxDrop = Math.max(...legPts.map(l => l.fy));
  const hipY = Math.round(CHAR_GROUND - 2 - maxDrop + (pose.bob || 0));
  const lean = pose.lean || 0;
  const torsoTop = hipY - 9;
  const neckX = hipX + Math.round(lean);
  const ctx = { hipX, hipY, torsoTop, neckX, lean, t, W, H };

  const armPts = pose.arms.map((am, i) => {
    const sx = neckX + (i === 0 ? -2 : 2), sy = torsoTop + 3;
    const a1 = rad(am.upper), a2 = rad(am.upper + am.fore);
    const ex = sx + Math.sin(a1) * 4.5, ey = sy + Math.cos(a1) * 4.5;
    const hx = ex + Math.sin(a2) * 4.5, hy = ey + Math.cos(a2) * 4.5;
    return { sx, sy, ex, ey, hx, hy, a1, a2 };
  });
  ctx.arms = armPts;

  const drawArm = (L, a, back) => {
    const k = back ? 0 : 1;
    L.thick(a.sx, a.sy, a.ex, a.ey, 1.3, C.sleeve[k]);
    L.thick(a.ex, a.ey, a.hx, a.hy, 1.05, C.skin[k]);
    L.disc(a.hx, a.hy, 1.4, C.glove[k]);
  };
  const drawLeg = (L, l, back) => {
    const pants = back ? C.pants[0] : C.pants[1];
    L.thick(l.hx, hipY, l.kx, hipY + l.ky, 1.6, pants);
    L.thick(l.kx, hipY + l.ky, l.fx, hipY + l.fy - 1, 1.4, pants);
    if (!back && C.pants[2]) L.set(Math.round(l.kx + 1), Math.round(hipY + l.ky - 1), C.pants[2]);
    const bx = Math.round(l.fx), by = Math.round(hipY + l.fy);
    const boot = back ? C.boot.back : C.boot.front;
    L.rect(bx - 2, by - 3, 4, 3, boot[1]);
    L.rect(bx + 1, by - 1, 2, 2, boot[1]);
    L.hline(bx - 2, bx + 2, by, boot[0]);
    L.set(bx - 1, by - 3, boot[2] || boot[1]);
    if (C.boot.sole) L.hline(bx - 2, bx + 2, by, back ? C.boot.sole[0] : C.boot.sole[1]);
  };

  const layers = [];
  const layer = fn => { const L = new Img(W, H); fn(L); layers.push(L); };

  if (spec.back) layer(L => spec.back(L, ctx, pose));
  layer(L => drawArm(L, armPts[0], true));
  if (spec.backHand) layer(L => spec.backHand(L, armPts[0], pose, ctx));
  layer(L => drawLeg(L, legPts[0], true));
  layer(L => L.pattern(spec.torso.rows, spec.torso.map, hipX - 4, torsoTop, { shear: lean / 9 }));
  if (spec.torsoOver) layer(L => spec.torsoOver(L, ctx, pose));
  layer(L => drawLeg(L, legPts[1], false));

  const frontArm = L => {
    const a = armPts[1];
    if (spec.weaponBehindArm !== false && spec.weapon) spec.weapon(L, a, pose, ctx);
    if (spec.frontArm) spec.frontArm(L, a, pose, ctx); else drawArm(L, a, false);
    if (spec.weaponBehindArm === false && spec.weapon) spec.weapon(L, a, pose, ctx);
  };
  if (pose.armBehindHead) layer(frontArm);
  layer(L => {
    const h = spec.head;
    const rows = pose.head === 'hurt' ? h.hurt : pose.head === 'happy' ? h.happy : h.normal;
    L.pattern(rows, h.map, neckX - 6 + (h.dx || 0) + (pose.headTilt || 0), torsoTop - 12 + (h.dy || 0) + (pose.headBob || 0));
  });
  if (spec.headOver) layer(L => spec.headOver(L, ctx, pose));
  if (!pose.armBehindHead) layer(frontArm);

  const out = new Img(W, H);
  for (const L of layers) { L.outline(OUTLINE); out.blit(L, 0, 0); }
  return out;
}

// ---------------------------------------------------------------------------
// Gedeelde pose-bouwstenen (zelfde ritme/timing voor iedere character)
// ---------------------------------------------------------------------------

/** Beenwerk van de ren-cyclus. p = 0..1, sprint = bool. */
export function runLegs(p, sprint) {
  const ph = p * Math.PI * 2;
  const amp = sprint ? 58 : 44;
  return [0, 1].map(i => {
    const q = ph + (i === 0 ? Math.PI : 0);
    const th = amp * Math.sin(q) + (sprint ? 8 : 4);
    const bend = 12 + (sprint ? 95 : 80) * Math.max(0, Math.cos(q)) ** 1.2;
    return { thigh: th, shin: th - bend };
  });
}
export const runBob = p => -Math.round(Math.abs(Math.sin(p * Math.PI * 2)) * 1.4);
/** Zwaaiende (vrije) achterarm tijdens het rennen. */
export function runBackArm(p, sprint) {
  const q = p * Math.PI * 2;
  const amp = sprint ? 30 : 45;
  return { upper: amp * Math.sin(q), fore: 70 + 20 * Math.sin(q) };
}
export const IDLE_LEGS = [{ thigh: -12, shin: -2 }, { thigh: 14, shin: 4 }];
export const ATTACK_LEGS = [
  [{ thigh: -18, shin: -6 }, { thigh: 22, shin: 6 }],
  [{ thigh: -24, shin: -10 }, { thigh: 30, shin: 10 }],
  [{ thigh: -34, shin: -16 }, { thigh: 40, shin: 14 }],
  [{ thigh: -34, shin: -16 }, { thigh: 40, shin: 14 }],
  [{ thigh: -30, shin: -14 }, { thigh: 36, shin: 12 }],
  [{ thigh: -20, shin: -8 }, { thigh: 24, shin: 8 }],
];
export const HIT_LEGS = [
  [{ thigh: -6, shin: -6 }, { thigh: 20, shin: 2 }],
  [{ thigh: -14, shin: -10 }, { thigh: 26, shin: 6 }],
  [{ thigh: -10, shin: -20 }, { thigh: 30, shin: 0 }],
  [{ thigh: -6, shin: -8 }, { thigh: 18, shin: 4 }],
];
export const HIT_LEAN = [-4, -5, -3, 0];
export function victoryLegs(p) {
  const jump = Math.max(0, Math.sin(p * Math.PI * 2)) * 4;
  return {
    legs: jump > 1 ? [{ thigh: -20, shin: -50 }, { thigh: 30, shin: -30 }] : [{ thigh: -14, shin: -4 }, { thigh: 16, shin: 4 }],
    bob: -Math.round(jump),
  };
}

/**
 * Standaard animatieset. Iedere character levert dezelfde rijen met dezelfde
 * frame-aantallen en fps → identieke timing in de game.
 * poses: { idle(p), run(p, sprint), attack[6], hit[4], victory(p) }
 */
export const ANIM_LAYOUT = [
  ['idle', 4, 6, true],
  ['run', 8, 14, true],
  ['sprint', 8, 20, true],
  ['attack', 6, 28, false],
  ['hit', 4, 10, false],
  ['victory', 6, 8, true],
];

export function buildCharacter(spec, poses) {
  const rows = [], anims = {};
  for (const [name, n, fps, loop] of ANIM_LAYOUT) {
    const frames = [];
    for (let i = 0; i < n; i++) {
      const p = i / n;
      let pose;
      if (name === 'idle') pose = poses.idle(p);
      else if (name === 'run') pose = poses.run(p, false);
      else if (name === 'sprint') pose = poses.run(p, true);
      else if (name === 'attack') pose = poses.attack[i];
      else if (name === 'hit') pose = poses.hit[i];
      else pose = poses.victory(p);
      frames.push(drawCharacter(spec, pose, p));
    }
    anims[name] = { row: rows.length, frames: n, fps, loop };
    rows.push(frames);
  }
  return { rows, anims };
}
