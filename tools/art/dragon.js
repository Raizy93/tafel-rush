// ---------------------------------------------------------------------------
// Boss van Stormrijk: De Donderdraak – een nieuwe boss (geen variant van de
// golems): duistere draak met gloeiende bliksemaderen, grote vleugels, een
// gehoornde kop en een kern van bliksem in zijn borst. Kijkt naar links.
// Zelfde framemaat en animaties als de andere bosses (128x112, voeten op 108),
// zodat Boss.js hem zonder speciale code tekent:
//   idle (6)    ademen, vleugels deinen, staart zwaait
//   attack (6)  kop naar achteren → uithalen → bek open → BLIKSEMSTRAAL (frame 3)
//   hurt (2)    terugdeinzen     death (4) in elkaar zakken, aderen doven
// "angry" = tweede set rijen met paarse in plaats van gele bliksem.
// DRAGON_MOUTH = bekpositie in de aanvalsframes (voor de bliksemstraal in Boss.js).
// ---------------------------------------------------------------------------
import { Img, srand, rnd } from '../lib/raster.js';
import { OUTLINE } from '../lib/palette.js';

export const DRAGON_FW = 128, DRAGON_FH = 112;
const G = 108;

const SCALE = ['#120e22', '#221a3a', '#362a56', '#4e4078', '#6e5ea0'];   // schubben
const BELLY = ['#2a2238', '#4a3e5a', '#6a5c7a', '#8e82a0'];
const WING = ['#160e28', '#28183e', '#3c2858', '#563e7a'];
const HORN = ['#3a3040', '#6a6070', '#a8a0b0', '#e8e4f0'];
const CALM = ['#8a6a10', '#e0b020', '#ffe24a', '#fff6b0', '#ffffff'];
const ANGRY = ['#5a1a7a', '#b03ae0', '#ff6ad8', '#ffd0f4', '#ffffff'];
const DEAD = ['#2a2436', '#3a3248', '#4a4058', '#5a506a', '#6a6078'];

export const DRAGON_MOUTH = [7, 52];

function bez(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

/** Gloeiende ader langs een lijn, met kleine vertakkingen. */
function vein(L, x0, y0, x1, y1, V, seedN) {
  srand(seedN);
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 4);
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const nx = x0 + (x1 - x0) * t + (rnd() - 0.5) * 3, ny = y0 + (y1 - y0) * t + (rnd() - 0.5) * 3;
    L.line(px, py, nx, ny, V[2]);
    if (rnd() < 0.25) L.line(nx, ny, nx + (rnd() - 0.5) * 6, ny + (rnd() - 0.5) * 6, V[1]);
    px = nx; py = ny;
  }
}

/**
 * pose: { bob, breath (0..1), wing (-1..1), tail, head: [x,y], jaw (0..1), lean,
 *         sink, V (aderkleuren), flash, charge (0..1 bliksembol in de bek) }
 */
function drawDragon(pose) {
  const W = DRAGON_FW, H = DRAGON_FH;
  const bob = pose.bob || 0, lean = pose.lean || 0, sink = pose.sink || 0;
  const V = pose.V || CALM;
  const wing = pose.wing || 0, tail = pose.tail || 0, br = pose.breath || 0;
  const layers = [];
  const bx = 70 + lean, by = 70 + bob + sink; // romp-midden

  // --- achtervleugel (groot, achter het lijf) ---
  {
    const L = new Img(W, H);
    const sh = [bx + 8, by - 22];
    const tips = [[bx + 46, by - 58 - wing * 5], [bx + 56, by - 40 - wing * 4], [bx + 50, by - 16 - wing * 2], [bx + 34, by - 4]];
    const elbow = [bx + 30, by - 50 - wing * 4];
    L.poly([sh, elbow, tips[0], tips[1], tips[2], tips[3]], WING[1]);
    // membraan-banen
    for (let i = 0; i < 3; i++) {
      const a = tips[i], b2 = tips[i + 1];
      L.poly([elbow, a, [(a[0] + b2[0]) / 2 - 3, (a[1] + b2[1]) / 2 + 2]], WING[2]);
    }
    L.thick(sh[0], sh[1], elbow[0], elbow[1], 2.4, SCALE[3]);
    L.thick(elbow[0], elbow[1], tips[0][0], tips[0][1], 1.6, SCALE[3]);
    for (const t of tips.slice(1)) L.line(elbow[0], elbow[1], t[0], t[1], SCALE[2]);
    L.poly([[tips[0][0] - 2, tips[0][1] + 2], [tips[0][0] + 3, tips[0][1] - 6], [tips[0][0] + 3, tips[0][1] + 3]], HORN[2]);
    layers.push([L, () => { vein(L, elbow[0], elbow[1], tips[1][0] - 4, tips[1][1], V, 3); vein(L, elbow[0] - 2, elbow[1] + 4, tips[2][0] - 6, tips[2][1] - 2, V, 4); }]);
  }
  // --- staart ---
  {
    const L = new Img(W, H);
    const p0 = [bx + 18, by + 12], p1 = [bx + 46, by + 34 + tail * 4], p2 = [bx + 54, by + 4 - tail * 8];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, [x, y] = bez(p0, p1, p2, t);
      L.disc(x, y, 7 - t * 5.2, SCALE[t < 0.5 ? 2 : 3]);
      if (i % 5 === 2 && i < 22) { const [x2, y2] = bez(p0, p1, p2, t + 0.02); L.poly([[x - 2, y - 4 + t * 2], [x2 + 1, y2 - 9 + t * 3], [x + 3, y - 4 + t * 2]], SCALE[4]); }
    }
    // bliksemblad aan het eind
    const [ex, ey] = p2;
    L.poly([[ex - 2, ey + 2], [ex + 2, ey - 8], [ex + 1, ey - 2], [ex + 6, ey - 4], [ex + 1, ey + 5]], V[1]);
    layers.push([L, () => { L.line(ex, ey, ex + 2, ey - 6, V[3]); vein(L, p0[0], p0[1], bez(p0, p1, p2, 0.7)[0], bez(p0, p1, p2, 0.7)[1], V, 5); }]);
  }
  // --- achterpoot ---
  {
    const L = new Img(W, H);
    L.shadedEllipse(bx + 14, by + 16, 12, 13, SCALE.slice(0, 4));
    L.thick(bx + 16, by + 24, bx + 20, G - 6 - sink * 0.2, 4.5, SCALE[2]);
    L.shadedBlock(bx + 12, G - 9, 16, 9, SCALE.slice(0, 4), { power: 3 });
    for (const k of [0, 5, 10]) L.poly([[bx + 12 + k, G - 2], [bx + 9 + k, G + 1], [bx + 15 + k, G - 1]], HORN[2]);
    layers.push([L, null]);
  }
  // --- romp ---
  {
    const L = new Img(W, H);
    L.shadedEllipse(bx, by, 27 + br, 22 + br, SCALE, { light: [-0.6, -0.7, 0.55] });
    // buikplaten
    L.shadedEllipse(bx - 9, by + 6, 13, 15, BELLY, { clip: (x, y) => y > by - 8 });
    for (let k = 0; k < 4; k++) L.hline(bx - 19 + k, bx + 1 - k, by - 3 + k * 6, BELLY[0]);
    // rugstekels
    for (let k = 0; k < 4; k++) { const x = bx - 6 + k * 9, y = by - 21 + Math.abs(k - 1.2) * 2; L.poly([[x - 3, y + 3], [x + 2, y - 7], [x + 4, y + 3]], SCALE[4]); }
    const core = [bx - 7, by - 2];
    layers.push([L, () => {
      vein(L, core[0], core[1], bx + 18, by - 12, V, 6); vein(L, core[0], core[1], bx + 14, by + 14, V, 7); vein(L, core[0], core[1], bx - 4, by + 18, V, 8);
      // kern van bliksem in de borst
      const pr = 5 + br * 2;
      L.disc(core[0], core[1], pr + 2, V[1] + '60');
      L.disc(core[0], core[1], pr, V[2]);
      L.disc(core[0] - 1, core[1] - 1, pr * 0.5, V[4]);
    }]);
  }
  // --- voorpoot ---
  {
    const L = new Img(W, H);
    L.thick(bx - 14, by + 8, bx - 22, by + 24, 4.5, SCALE[3]);
    L.thick(bx - 22, by + 24, bx - 24, G - 7 - sink * 0.2, 4, SCALE[3]);
    L.shadedBlock(bx - 32, G - 8, 15, 8, SCALE.slice(1, 5), { power: 3 });
    for (const k of [0, 5, 10]) L.poly([[bx - 32 + k, G - 2], [bx - 36 + k, G + 1], [bx - 29 + k, G]], HORN[3]);
    layers.push([L, null]);
  }
  // --- nek + kop ---
  {
    const L = new Img(W, H);
    const [hx, hy] = pose.head || [30, 30];
    const n0 = [bx - 14, by - 14], n1 = [bx - 26, by - 30 + bob], n2 = [hx + 10, hy + 8];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20, [x, y] = bez(n0, n1, n2, t);
      L.disc(x, y, 10 - t * 3.2, SCALE[t < 0.5 ? 2 : 3]);
      if (i % 4 === 1) L.poly([[x + 2, y - 7], [x + 6, y - 13], [x + 7, y - 5]], SCALE[4]); // nekstekels
    }
    // halsplaten
    for (let i = 2; i <= 18; i += 4) { const [x, y] = bez(n0, n1, n2, i / 20); L.hline(Math.round(x - 6), Math.round(x - 1), Math.round(y + 5), BELLY[2]); }
    const jaw = pose.jaw || 0;
    // onderkaak (opent bij de aanval)
    L.poly([[hx + 6, hy + 4], [hx - 17, hy + 4 + jaw * 10], [hx - 14, hy + 9 + jaw * 11], [hx + 6, hy + 10]], SCALE[2]);
    for (let k = 0; k < 4; k++) L.set(hx - 13 + k * 4, hy + 4 + jaw * 9 - 1, HORN[3]);
    // schedel + snuit
    L.shadedEllipse(hx + 2, hy, 12, 9, SCALE, { light: [-0.6, -0.8, 0.5] });
    L.poly([[hx - 6, hy - 5], [hx - 21, hy + 1], [hx - 19, hy + 5], [hx - 4, hy + 5]], SCALE[3]);
    L.hline(Math.round(hx - 18), Math.round(hx - 5), Math.round(hy + 4), SCALE[1]);
    L.set(hx - 18, hy, SCALE[0]); L.set(hx - 17, hy + 1, SCALE[0]); // neusgat
    for (let k = 0; k < 3; k++) L.set(hx - 15 + k * 4, hy + 5, HORN[3]); // tandjes
    // hoorns (naar achteren gekromd)
    for (const [ox, oy, len, c] of [[4, -6, 22, HORN[2]], [9, -3, 16, HORN[1]]]) {
      const h0 = [hx + ox, hy + oy], h1 = [hx + ox + len * 0.5, hy + oy - len * 0.55], h2 = [hx + ox + len, hy + oy - len * 0.35];
      for (let i = 0; i <= 12; i++) { const t = i / 12, [x, y] = bez(h0, h1, h2, t); L.disc(x, y, 2.4 - t * 2, c); }
    }
    // wenkbrauwkam + oog
    L.poly([[hx - 7, hy - 6], [hx + 4, hy - 9], [hx + 2, hy - 4]], SCALE[4]);
    layers.push([L, () => {
      L.rect(hx - 4, hy - 4, 5, 3, '#120c18');
      L.rect(hx - 3, hy - 4, 4, 2, V[2]); L.set(hx - 3, hy - 4, V[4]);
      if (jaw > 0.2) {
        // bek gloeit van binnen
        L.poly([[hx - 14, hy + 5], [hx + 2, hy + 5], [hx - 14, hy + 4 + jaw * 9]], V[1] + 'c0');
      }
      if (pose.charge) {
        const cx = hx - 19, cy = hy + 5 + jaw * 4, r = 2 + pose.charge * 4;
        L.disc(cx, cy, r + 2, V[1] + '70'); L.disc(cx, cy, r, V[3]); L.disc(cx, cy, r * 0.5, '#ffffff');
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + pose.charge * 3; L.line(cx, cy, cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5), V[2]); }
      }
      vein(L, hx + 6, hy - 1, hx + 14, hy - 4, V, 9);
    }]);
  }
  // --- voorvleugel (opgevouwen bij de schouder, nooit over de kop) ---
  {
    const L = new Img(W, H);
    const sh = [bx - 2, by - 16], el = [bx + 12, by - 40 - wing * 4], tip = [bx + 30, by - 46 - wing * 6];
    L.poly([sh, el, tip, [bx + 24, by - 24], [bx + 10, by - 10]], WING[2]);
    L.poly([el, tip, [bx + 20, by - 30]], WING[3]);
    L.thick(sh[0], sh[1], el[0], el[1], 2.6, SCALE[3]);
    L.thick(el[0], el[1], tip[0], tip[1], 1.6, SCALE[4]);
    L.poly([[el[0] - 2, el[1]], [el[0] - 4, el[1] - 6], [el[0] + 2, el[1] - 2]], HORN[2]); // klauwtje
    layers.push([L, () => vein(L, el[0], el[1] + 2, bx + 18, by - 22, V, 10)]);
  }

  const out = new Img(W, H);
  for (const [L, glow] of layers) { L.outline(OUTLINE); if (glow) glow(); out.blit(L, 0, 0); }
  if (pose.flash) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = out.get(x, y);
      if (c[3] > 0) out.put(x, y, [Math.min(255, c[0] + 120), Math.min(255, c[1] + 120), Math.min(255, c[2] + 130), c[3]]);
    }
  }
  return out;
}

export function buildDragon() {
  const sets = {};
  for (const mode of ['calm', 'angry']) {
    const V = mode === 'angry' ? ANGRY : CALM;
    const idle = [0, 1, 2, 3, 4, 5].map(i => {
      const s = Math.sin((i / 6) * Math.PI * 2);
      return drawDragon({ bob: Math.round(s * 1.5), breath: (s + 1) / 2, wing: s, tail: s, head: [30, 30 + Math.round(s * 1.5)], V });
    });
    const attack = [
      { head: [38, 22], lean: 3, bob: -1, wing: 1, tail: 1, jaw: 0.2 },
      { head: [42, 18], lean: 4, bob: -2, wing: 1.3, tail: 1, jaw: 0.5, charge: 0.3 },
      { head: [24, 40], lean: -3, bob: 1, wing: -0.5, tail: -0.5, jaw: 1, charge: 0.7 },
      { head: [26, 44], lean: -5, bob: 2, wing: -1, tail: -1, jaw: 1, charge: 1 },
      { head: [26, 44], lean: -5, bob: 2, wing: -1, tail: -1, jaw: 0.8, charge: 0.4 },
      { head: [28, 36], lean: -2, bob: 1, wing: 0, tail: 0, jaw: 0.3 },
    ].map(p => drawDragon({ ...p, V, breath: 1 }));
    const hurt = [
      drawDragon({ head: [36, 26], lean: 5, bob: -1, wing: 1.2, jaw: 0.6, flash: true, V }),
      drawDragon({ head: [33, 28], lean: 3, bob: 0, wing: 0.6, jaw: 0.3, V }),
    ];
    const death = [0, 1, 2, 3].map(i => drawDragon({ head: [30 - i * 2, 34 + i * 12], lean: 3 + i * 2, sink: i * 5, wing: -1 - i * 0.3, tail: -i * 0.4, jaw: 0.5, V: i === 0 ? V : DEAD, flash: i === 0 }));
    sets[mode] = { idle, attack, hurt, death };
  }
  return sets;
}
