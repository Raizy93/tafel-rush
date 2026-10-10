// ---------------------------------------------------------------------------
// Bosses – reuzen met hetzelfde skelet, ieder met een eigen stijl (BOSS_STYLES):
//   guardian  De Woudwachter (Greenwood): stenen golem met mos, boomtakken en
//             een groene rune-kern
//   frost     De IJsreus (Frostpeak): ijsgolem met sneeuwkappen, ijspegels,
//             een kristallen kroon, ijsbaard en een blauwe kern
// Kijken naar links. Frames 128x112, voeten op y=108. Animaties: idle, attack
// (vuistslag), hurt, death. Tweede set rijen: "angry" voor fase 2.
// ---------------------------------------------------------------------------
import { Img, srand, rnd } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';

export const BOSS_FW = 128, BOSS_FH = 112;
const G = 108;

const ICE_BODY = ['#10224e', '#1c3e7a', '#2e64aa', '#5a96d6', '#a8d4fa'];
export const BOSS_STYLES = {
  guardian: {
    body: P.stone, rune: P.rune, runeAngry: P.runeRed, dead: P.stone,
    deco: { top: P.moss[3], mid: P.moss[2], edge: P.moss[1], hang: [P.moss[2], P.moss[1]] },
    back: 'branches', head: 'twigs',
  },
  frost: {
    body: ICE_BODY, rune: ['#0e5a9a', '#3ac8ff', '#a8f4ff', '#ffffff'], runeAngry: ['#5a0e4a', '#e0306a', '#ff8ab0', '#fff0f4'], dead: ['#2a3a5a', '#4a5e84', '#6c84aa', '#94aacc', '#c0d0e8'],
    deco: { top: '#ffffff', mid: '#e4eefa', edge: '#b4c8e4', hang: ['#c8ecff', '#7ab8ec'] },
    back: 'crystals', head: 'crown',
  },
};

function mossify(L, cx, cy, rx, ry, seedN, amount = 1, D = BOSS_STYLES.guardian.deco) {
  srand(seedN);
  const ref = L.clone();
  const inside = (x, y) => ref.alpha(x, y) > 0;
  // klonterige mosplekken langs de bovenrand
  const n = Math.round(14 * amount);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (0.12 + 0.76 * rnd());
    const x = cx + Math.cos(a) * rx * 0.82, y = cy + Math.sin(a) * ry * 0.82;
    const r = 2 + rnd() * 2.6 * Math.min(1.4, amount + 0.3);
    for (let yy = -4; yy <= 4; yy++) for (let xx = -5; xx <= 5; xx++) {
      const px = Math.round(x + xx), py = Math.round(y + yy);
      if (!inside(px, py)) continue;
      const d = (xx * xx) / (r * r * 1.4) + (yy * yy) / (r * r * 0.8);
      if (d > 1) continue;
      const top = !inside(px, py - 1) || yy < -r * 0.4;
      L.set(px, py, top ? D.top : d > 0.6 ? D.edge : D.mid);
    }
  }
  // hangend mos
  for (let i = 0; i < Math.round(7 * amount); i++) {
    const x = Math.round(cx - rx * 0.7 + rnd() * rx * 1.4);
    let y = Math.round(cy - ry * 0.95);
    while (!inside(x, y) && y < cy) y++;
    y += 2;
    const len = 2 + Math.floor(rnd() * 5);
    for (let k = 0; k < len; k++) if (inside(x, y + k)) L.set(x, y + k, k === len - 1 ? D.hang[1] : D.hang[0]);
  }
}

function crack(L, pts, col) {
  for (let i = 0; i + 1 < pts.length; i++) L.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col);
}

/**
 * pose: { bob, lean, arm: {sx,sy, ex,ey, fx,fy} voor voorarm, back: {...}, eyes: ramp, core: ramp,
 *         pulse 0..1, flash (wit), sink (y-offset voor death), tilt }
 */
function drawBoss(pose, S = BOSS_STYLES.guardian) {
  const W = BOSS_FW, H = BOSS_FH;
  const ST = S.body, D = S.deco;
  const bob = pose.bob || 0, lean = pose.lean || 0, sink = pose.sink || 0;
  const runeR = pose.rune || S.rune;
  const layers = [];

  const bodyCx = 66 + lean, bodyCy = 62 + bob + sink;

  // --- achterarm ---
  {
    const L = new Img(W, H);
    const a = pose.back;
    L.shadedEllipse(a.sx, a.sy + sink, 11, 10, ST.slice(0, 4));
    L.thick(a.sx, a.sy + sink, a.ex, a.ey + sink, 7, ST[1]);
    L.shadedEllipse(a.ex, a.ey + sink, 8, 8, ST.slice(0, 4));
    L.thick(a.ex, a.ey + sink, a.fx, a.fy + sink, 7, ST[1]);
    L.shadedBlock(Math.round(a.fx - 9), Math.round(a.fy - 8 + sink), 18, 16, ST.slice(0, 4), { power: 3 });
    layers.push(L);
  }
  // --- benen ---
  {
    const L = new Img(W, H);
    L.shadedBlock(46 + Math.round(lean / 2), 84 + Math.max(0, bob) + sink, 16, G - 84 + 1, ST.slice(0, 4), { power: 4 });
    L.shadedBlock(72 + Math.round(lean / 2), 84 + Math.max(0, bob) + sink, 16, G - 84 + 1, ST.slice(1, 5), { power: 4 });
    L.hline(46, 61, G - 6 + sink, ST[0]); L.hline(72, 87, G - 6 + sink, ST[1]);
    layers.push(L);
  }
  // --- takken / boomkroon (of ijskristallen) op de rug ---
  if (S.back === 'crystals') {
    const L = new Img(W, H);
    const bx = bodyCx + 14, by = bodyCy - 18, sway = pose.sway || 0;
    for (const [dx, h, w, lean2] of [[-6, 30, 6, -2], [6, 40, 8, 3], [18, 28, 6, 6], [26, 18, 5, 8]]) {
      const x = bx + dx, tip = [x + lean2 + sway, by - h];
      L.poly([[x - w, by + 4], tip, [x + w, by + 4]], runeR[1]);
      L.poly([[x, by + 4], tip, [x + w, by + 4]], runeR[2]);
      L.line(x - w * 0.4, by, tip[0] - 1, tip[1] + 3, runeR[3]);
      L.set(tip[0], tip[1] + 1, '#ffffff');
    }
    layers.push(L);
  } else {
    const L = new Img(W, H);
    const bx = bodyCx + 14, by = bodyCy - 18;
    const br = [[bx, by, bx + 14, by - 26], [bx + 8, by - 12, bx + 26, by - 20], [bx - 6, by - 4, bx - 4, by - 32]];
    for (const [x0, y0, x1, y1] of br) { L.thick(x0, y0, x1, y1, 2.2, P.bark[2]); L.line(x0 + 1, y0, x1 + 1, y1, P.bark[3]); }
    const sway = pose.sway || 0;
    for (const [x, y, rx, ry] of [[bx + 15 + sway, by - 30, 13, 9], [bx + 28 + sway, by - 21, 10, 8], [bx - 4 + sway, by - 33, 11, 8], [bx + 5 + sway, by - 37, 9, 6]]) {
      L.shadedEllipse(x, y, rx, ry, P.leaf);
    }
    srand(5);
    for (let i = 0; i < 40; i++) {
      const x = bx - 14 + Math.floor(rnd() * 52), y = by - 48 + Math.floor(rnd() * 34);
      if (L.alpha(x, y) > 0 && L.alpha(x, y - 1) === 0) L.set(x, y, P.leaf[4]);
    }
    layers.push(L);
  }
  // --- romp ---
  {
    const L = new Img(W, H);
    L.shadedEllipse(bodyCx, bodyCy, 31, 27, ST, { light: [-0.6, -0.7, 0.55] });
    // platen/scheuren
    crack(L, [[bodyCx + 8, bodyCy - 22], [bodyCx + 12, bodyCy - 12], [bodyCx + 9, bodyCy - 4], [bodyCx + 16, bodyCy + 6]], ST[1]);
    crack(L, [[bodyCx + 20, bodyCy + 4], [bodyCx + 25, bodyCy + 12]], ST[1]);
    crack(L, [[bodyCx - 22, bodyCy + 12], [bodyCx - 14, bodyCy + 18], [bodyCx - 6, bodyCy + 17]], ST[1]);
    mossify(L, bodyCx, bodyCy, 31, 27, 11, 1.2, D);
    // rune-kern
    const kx = bodyCx - 2, ky = bodyCy + 4;
    const pr = 7 + (pose.pulse || 0) * 2;
    L.ellipse(kx, ky, pr + 3, pr + 3, [...hexToArr(runeR[1]), 70]);
    L.ellipse(kx, ky, pr, pr, [...hexToArr(runeR[2]), 90]);
    L.poly([[kx, ky - 7], [kx + 5, ky], [kx, ky + 7], [kx - 5, ky]], runeR[1]);
    L.poly([[kx, ky - 5], [kx + 3, ky], [kx, ky + 5], [kx - 3, ky]], runeR[2]);
    L.vline(kx, ky - 3, ky + 3, runeR[3]); L.set(kx - 1, ky - 1, runeR[3]);
    // rune-lijnen over de borst
    L.line(kx + 7, ky, kx + 14, ky - 6, runeR[1]); L.line(kx + 14, ky - 6, kx + 20, ky - 6, runeR[1]);
    L.line(kx - 2, ky + 9, kx + 4, ky + 16, runeR[1]);
    layers.push(L);
  }
  // --- hoofd ---
  {
    const L = new Img(W, H);
    // hoofd zit bóvenop de romp; de schouder van de voorarm valt er links-onder (nooit over het gezicht)
    const hx = bodyCx - 22 + Math.round(lean * 0.6), hy = bodyCy - 45 + Math.round(bob / 2);
    L.shadedBlock(hx - 2, hy - 2, 32, 27, ST, { power: 3 });
    // wenkbrauw-rots
    L.shadedBlock(hx - 2, hy + 4, 24, 7, ST.slice(0, 4), { power: 5 });
    mossify(L, hx + 14, hy + 10, 14, 12, 3, 0.4, D);
    // ogen
    const eyeRamp = pose.eyes || runeR;
    for (const ex of [hx + 2, hx + 12]) {
      L.rect(ex - 1, hy + 10, 9, 6, '#120c18');
      L.rect(ex, hy + 11, 7, 4, eyeRamp[1]);
      L.rect(ex + 1, hy + 12, 5, 2, eyeRamp[2]);
      L.set(ex + 1, hy + 12, eyeRamp[3]); L.set(ex + 2, hy + 12, eyeRamp[3]);
    }
    // mond
    L.rect(hx + 3, hy + 18, 14, 3, '#120c18');
    for (let i = 0; i < 4; i++) L.set(hx + 4 + i * 3, hy + 18, ST[3]);
    if (S.head === 'crown') {
      // ijsbaard (pegels onder de mond) + kristallen kroon
      for (let i = 0; i < 6; i++) {
        const x = hx + 1 + i * 3, len = 5 + ((i * 5) % 4) * 2;
        L.poly([[x - 1.5, hy + 21], [x + 1.5, hy + 21], [x, hy + 21 + len]], i % 2 ? D.hang[0] : D.hang[1]);
      }
      for (const [dx, h] of [[2, 7], [9, 11], [16, 14], [23, 9]]) {
        L.poly([[hx + dx - 2.5, hy], [hx + dx, hy - h], [hx + dx + 2.5, hy]], S.rune[2]);
        L.line(hx + dx, hy - h + 2, hx + dx, hy - 1, S.rune[3]);
      }
      L.hline(hx - 1, hx + 27, hy, S.rune[1]);
    } else {
      // hoorn-takjes
      L.thick(hx + 22, hy + 1, hx + 26, hy - 8, 1.4, P.bark[2]);
      L.thick(hx + 6, hy + 1, hx + 3, hy - 6, 1.4, P.bark[2]);
      L.shadedEllipse(hx + 3, hy - 7, 4, 3, P.leaf);
    }
    layers.push(L);
  }
  // --- voorarm ---
  {
    const L = new Img(W, H);
    const o = pose.arm;
    // schouder schuift mee met de romp (lean), elleboog half, vuist niet
    const a = { sx: o.sx + lean, sy: o.sy, ex: o.ex + Math.round(lean / 2), ey: o.ey, fx: o.fx, fy: o.fy };
    L.shadedEllipse(a.sx, a.sy + sink, 11, 11, ST);
    mossify(L, a.sx, a.sy + sink, 11, 11, 21, 0.4, D);
    L.thick(a.sx, a.sy + sink, a.ex, a.ey + sink, 7.5, ST[2]);
    L.shadedEllipse(a.ex, a.ey + sink, 9, 9, ST);
    L.thick(a.ex, a.ey + sink, a.fx, a.fy + sink, 7.5, ST[2]);
    L.shadedBlock(Math.round(a.fx - 11), Math.round(a.fy - 9 + sink), 22, 19, ST, { power: 3 });
    // knokkels
    for (let i = 0; i < 3; i++) L.hline(Math.round(a.fx - 9), Math.round(a.fx - 6), Math.round(a.fy - 4 + i * 4 + sink), ST[1]);
    // rune-band om pols
    L.thick(a.fx - 2, a.fy - 10 + sink, a.fx + 6, a.fy - 8 + sink, 1, runeR[2]);
    layers.push(L);
  }

  const out = new Img(W, H);
  for (const L of layers) { L.outline(OUTLINE); out.blit(L, 0, 0); }
  if (pose.flash) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = out.get(x, y);
      if (c[3] > 0) out.put(x, y, [Math.min(255, c[0] + 120), Math.min(255, c[1] + 120), Math.min(255, c[2] + 120), c[3]]);
    }
  }
  return out;
}

function hexToArr(h) {
  h = h.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function armRest(bob, sway = 0) {
  return {
    arm: { sx: 38, sy: 57 + bob, ex: 27 + sway, ey: 75 + bob, fx: 23 + sway, fy: 95 + Math.round(bob / 2) },
    back: { sx: 90, sy: 50 + bob, ex: 100 - sway, ey: 70 + bob, fx: 102 - sway, fy: 92 + Math.round(bob / 2) },
  };
}

export function buildBoss(styleId = 'guardian') {
  const S = BOSS_STYLES[styleId];
  const drawBoss_ = drawBoss;
  const drawBossS = pose => drawBoss_(pose, S);
  const sets = {};
  for (const mode of ['calm', 'angry']) {
    const rune = mode === 'angry' ? S.runeAngry : S.rune;
    const idle = [0, 1, 2, 3, 4, 5].map(i => {
      const s = Math.sin((i / 6) * Math.PI * 2);
      const bob = Math.round(s * 1.5);
      return drawBossS({ bob, ...armRest(bob, Math.round(s)), pulse: (s + 1) / 2, rune, sway: Math.round(s) });
    });
    const attack = [
      { bob: 1, lean: 3, arm: { sx: 38, sy: 55, ex: 25, ey: 40, fx: 24, fy: 22 } },
      { bob: 0, lean: 4, arm: { sx: 38, sy: 54, ex: 24, ey: 36, fx: 25, fy: 15 } },
      { bob: 2, lean: -3, arm: { sx: 37, sy: 57, ex: 20, ey: 54, fx: 12, fy: 70 } },
      { bob: 4, lean: -6, arm: { sx: 37, sy: 60, ex: 20, ey: 76, fx: 14, fy: 97 } },
      { bob: 3, lean: -5, arm: { sx: 37, sy: 60, ex: 20, ey: 76, fx: 14, fy: 97 } },
      { bob: 1, lean: -2, arm: { sx: 38, sy: 58, ex: 24, ey: 74, fx: 20, fy: 95 } },
    ].map(p => drawBossS({ ...armRest(p.bob), ...p, back: armRest(p.bob).back, pulse: 1, rune }));
    const hurt = [
      drawBossS({ bob: -1, lean: 5, ...armRest(-1, -2), flash: true, rune }),
      drawBossS({ bob: 0, lean: 3, ...armRest(0, -1), rune }),
    ];
    const death = [0, 1, 2, 3].map(i => drawBossS({ bob: 0, lean: 4 + i * 2, sink: i * 5, ...armRest(0, -i), rune: S.dead, eyes: S.dead, flash: i === 0 }));
    sets[mode] = { idle, attack, hurt, death };
  }
  return sets;
}
