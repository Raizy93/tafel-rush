// ---------------------------------------------------------------------------
// Vijanden van Greenwood. Allemaal kijken ze naar LINKS (naar de speler).
// Iedere vijand: 32x32 frames, voeten op y=30.
// Animaties: move (loop), attack (eenmalig), hurt (1 frame).
// ---------------------------------------------------------------------------
import { Img, rnd, srand } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';

export const EN_FW = 32, EN_FH = 32;
const G = 30;

function eyes(L, x, y, opt = {}) {
  // Twee boze ogen naar links, met witte glans
  const col = opt.color || '#1a1324';
  const w = opt.w || 2, h = opt.h || 3;
  for (const ex of [x, x + (opt.gap || 5)]) {
    L.rect(ex, y, w, h, col);
    L.set(ex, y, opt.glint || '#fff8ec');
  }
  if (opt.brow) {
    L.line(x - 1, y - 2, x + 2, y - 1, OUTLINE);
    L.line(x + (opt.gap || 5) + 2, y - 2, x + (opt.gap || 5) - 1, y - 1, OUTLINE);
  }
}

// --- Slime -------------------------------------------------------------------
function slimeFrame(ramp, sq, lift, eyeMode = 'normal', lean = 0) {
  const L = new Img(EN_FW, EN_FH);
  const rx = 10 * sq, ry = 8 / sq;
  const cy = G - ry - lift + 0.5;
  const cx = 16 + lean;
  L.shadedEllipse(cx, cy, rx, ry, ramp, { light: [-0.6, -0.8, 0.5] });
  // vlakke onderkant
  for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    for (let y = Math.round(G - lift - 1); y <= G - lift + 1; y++) if (L.alpha(x, y - 2) > 0 && L.alpha(x, y) === 0 && y <= G - lift) L.set(x, y, ramp[0]);
  }
  // glans
  L.set(Math.round(cx - rx * 0.45), Math.round(cy - ry * 0.55), ramp[3]);
  L.set(Math.round(cx - rx * 0.45) + 1, Math.round(cy - ry * 0.55), ramp[3]);
  L.set(Math.round(cx - rx * 0.45), Math.round(cy - ry * 0.55) + 1, ramp[3]);
  L.set(Math.round(cx - rx * 0.6), Math.round(cy - ry * 0.2), '#ffffff');
  // ogen
  const ey = Math.round(cy - 1);
  if (eyeMode === 'hurt') {
    for (const ex of [Math.round(cx - 6), Math.round(cx - 1)]) {
      L.line(ex, ey, ex + 2, ey + 2, OUTLINE); L.line(ex + 2, ey, ex, ey + 2, OUTLINE);
    }
  } else {
    eyes(L, Math.round(cx - 6), ey, { gap: 5, brow: eyeMode === 'angry' });
    // mond
    L.hline(Math.round(cx - 4), Math.round(cx - 2), ey + 4, ramp[0]);
  }
  return L.outline(OUTLINE);
}

export function buildSlime(ramp) {
  const hop = [
    [1.15, 0], [1.05, 1], [0.9, 4], [0.88, 6], [0.95, 4], [1.2, 0],
  ];
  return {
    move: hop.map(([s, l]) => slimeFrame(ramp, s, l)),
    attack: [slimeFrame(ramp, 1.25, 0, 'angry', 2), slimeFrame(ramp, 0.85, 3, 'angry', -4), slimeFrame(ramp, 0.8, 2, 'angry', -8), slimeFrame(ramp, 1.1, 0, 'angry', -2)],
    hurt: [slimeFrame(ramp, 1.3, 0, 'hurt')],
  };
}

// --- Paddenstoel-wezen -----------------------------------------------------------
function shroomFrame(step, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const bob = opt.bob ?? (step % 2 === 0 ? 0 : 1);
  const lean = opt.lean || 0;
  // voetjes
  const fl = [[-2, 0], [2, -1]][step % 2], fr = [[2, -1], [-2, 0]][step % 2];
  L.rect(12 + fl[0] + lean, G - 2 + fl[1], 4, 3, P.leather[1]);
  L.rect(18 + fr[0] + lean, G - 2 + fr[1], 4, 3, P.leather[2]);
  // steel/lijf
  L.shadedBlock(11 + lean, G - 13 + bob, 11, 12, P.cream, { power: 3 });
  // gezicht (naar links)
  if (opt.hurt) {
    L.line(13 + lean, G - 10 + bob, 15 + lean, G - 8 + bob, OUTLINE); L.line(15 + lean, G - 10 + bob, 13 + lean, G - 8 + bob, OUTLINE);
  } else {
    eyes(L, 12 + lean, G - 10 + bob, { gap: 5, h: 3, brow: true });
    L.hline(13 + lean, 16 + lean, G - 5 + bob, P.cream[0]);
  }
  // hoed
  const cx = 16.5 + lean * 1.4, cy = G - 13 + bob + (opt.capDrop || 0);
  L.shadedEllipse(cx, cy, 12, 8, P.capRed, { clip: (x, y) => y <= cy + 1 });
  L.hline(Math.round(cx - 11), Math.round(cx + 11), Math.round(cy + 2), P.capRed[0]);
  // stippen
  for (const [dx, dy, r] of [[-5, -3, 1.6], [3, -5, 1.3], [7, -1, 1.2], [-1, -6, 0.9], [-9, 0, 0.9]]) {
    L.disc(cx + dx, cy + dy, r, P.cream[2]);
  }
  return L.outline(OUTLINE);
}
export function buildMushroom() {
  return {
    move: [0, 1, 2, 3].map(i => shroomFrame(i)),
    attack: [shroomFrame(0, { lean: 2, capDrop: 1 }), shroomFrame(1, { lean: -3, bob: -1 }), shroomFrame(0, { lean: -6, bob: -2 }), shroomFrame(1, { lean: -2 })],
    hurt: [shroomFrame(0, { hurt: true, capDrop: 2 })],
  };
}

// --- Bosgoblin ---------------------------------------------------------------------
function goblinFrame(p, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const ph = p * Math.PI * 2;
  const lean = opt.lean || 0;
  const bob = opt.bob ?? -Math.round(Math.abs(Math.sin(ph)));
  const hx = 16 + lean, hy = G - 9 + bob;
  // benen (kijkt naar links → voorwaarts is -x)
  for (const [i, col] of [[0, P.leather[1]], [1, P.leather[2]]]) {
    const a = Math.sin(ph + i * Math.PI) * 0.6;
    const fx = hx + (i ? -1 : 1) - Math.sin(a) * 6, fy = hy + Math.cos(a) * 6;
    L.thick(hx + (i ? -1 : 1), hy, fx, fy, 1.2, col);
    L.rect(Math.round(fx) - 2, Math.round(fy) - 1, 3, 2, P.bark[1]);
  }
  // lijf (bladmantel)
  L.shadedEllipse(hx, hy - 4, 5, 6, P.leaf.slice(1, 5));
  L.hline(hx - 4, hx + 4, hy, P.leaf[1]);
  // speer/dolk in voorhand
  const ax = hx - 5, ay = hy - 4 + (opt.stab ? -1 : Math.round(Math.sin(ph)));
  const tipX = ax - (opt.stab ? 12 : 6);
  L.line(ax + 3, ay + 1, tipX, ay, P.wood[2]);
  L.disc(tipX - 1, ay, 1, P.steel[2]); L.set(tipX - 2, ay, P.steel[3]);
  L.disc(ax, ay, 1.3, P.goblin[2]);
  // hoofd
  const cy = hy - 13;
  L.shadedEllipse(hx - 1, cy, 6, 5, P.goblin);
  // oren
  L.poly([[hx + 4, cy - 2], [hx + 10, cy - 5], [hx + 5, cy + 1]], P.goblin[2]);
  L.poly([[hx - 6, cy - 1], [hx - 9, cy - 4], [hx - 5, cy - 3]], P.goblin[1]);
  // bladkap
  L.shadedEllipse(hx, cy - 3, 6, 3, P.leaf.slice(0, 4), { clip: (x, y) => y <= cy - 2 });
  L.set(hx + 1, cy - 7, P.leaf[3]); L.set(hx + 2, cy - 8, P.leaf[2]);
  if (opt.hurt) {
    L.line(hx - 5, cy - 1, hx - 3, cy + 1, OUTLINE); L.line(hx - 3, cy - 1, hx - 5, cy + 1, OUTLINE);
  } else {
    L.rect(hx - 5, cy - 1, 2, 2, '#ffe14a'); L.set(hx - 5, cy - 1, OUTLINE);
    L.rect(hx - 1, cy - 1, 2, 2, '#ffe14a'); L.set(hx - 1, cy - 1, OUTLINE);
    L.hline(hx - 5, hx - 2, cy + 3, P.goblin[0]); L.set(hx - 4, cy + 2, '#fff8ec');
  }
  return L.outline(OUTLINE);
}
export function buildGoblin() {
  return {
    move: [0, 1, 2, 3, 4, 5].map(i => goblinFrame(i / 6)),
    attack: [goblinFrame(0, { lean: 2, bob: 0 }), goblinFrame(0.25, { lean: -2, stab: true }), goblinFrame(0.25, { lean: -6, stab: true }), goblinFrame(0.5, { lean: -1 })],
    hurt: [goblinFrame(0, { hurt: true, lean: 2 })],
  };
}

// --- Schaduwvleer (vliegend) --------------------------------------------------------
function batFrame(p, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const ph = p * Math.PI * 2;
  const cx = 16 + (opt.lean || 0), cy = 15 + Math.round(Math.sin(ph) * 1.5);
  const wing = Math.sin(ph); // -1 .. 1
  const ramp = opt.ramp || P.bat;
  // vleugels
  for (const side of [-1, 1]) {
    const tipY = cy - 2 - wing * 8;
    const pts = [[cx + side * 3, cy - 2], [cx + side * 9, tipY - 2], [cx + side * 14, tipY + 3], [cx + side * 11, cy + 2 - wing * 2], [cx + side * 8, cy + 4 - wing * 3], [cx + side * 4, cy + 3]];
    L.poly(pts, side < 0 ? ramp[2] : ramp[1]);
    L.line(cx + side * 3, cy - 2, cx + side * 9, tipY - 2, ramp[3]);
  }
  // lijf
  L.shadedEllipse(cx, cy + 1, 5, 5, ramp);
  // oren
  L.poly([[cx - 4, cy - 3], [cx - 3, cy - 8], [cx - 1, cy - 4]], ramp[2]);
  L.poly([[cx + 1, cy - 4], [cx + 3, cy - 8], [cx + 4, cy - 3]], ramp[1]);
  if (opt.hurt) {
    L.line(cx - 3, cy, cx - 1, cy + 2, OUTLINE); L.line(cx - 1, cy, cx - 3, cy + 2, OUTLINE);
  } else {
    L.rect(cx - 3, cy, 2, 2, '#ffd23a'); L.rect(cx + 1, cy, 2, 2, '#ffd23a');
    L.set(cx - 3, cy, '#fff8ec'); L.set(cx + 1, cy, '#fff8ec');
    L.set(cx - 2, cy + 4, '#fff8ec'); L.set(cx + 1, cy + 4, '#fff8ec');
  }
  return L.outline(OUTLINE);
}
export function buildBat(ramp) {
  return {
    move: [0, 1, 2, 3].map(i => batFrame(i / 4, { ramp })),
    attack: [batFrame(0.25, { lean: 2, ramp }), batFrame(0.5, { lean: -4, ramp }), batFrame(0.75, { lean: -8, ramp }), batFrame(0, { lean: -2, ramp })],
    hurt: [batFrame(0.5, { hurt: true, ramp })],
  };
}

// --- Steenkruiper (mini-golem, ruïnes) --------------------------------------------
function rockFrame(step, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const bob = opt.bob ?? (step % 2);
  const lean = opt.lean || 0;
  const cx = 16 + lean;
  // pootjes
  const off = step % 2 === 0 ? [-1, 1] : [1, -1];
  L.rect(cx - 7 + off[0], G - 3, 4, 4, P.stone[1]);
  L.rect(cx + 3 + off[1], G - 3, 4, 4, P.stone[2]);
  // lijf
  L.shadedEllipse(cx, G - 10 + bob, 10, 8, P.stone, { light: [-0.5, -0.8, 0.5] });
  // scheurtjes
  L.line(cx + 3, G - 14 + bob, cx + 5, G - 10 + bob, P.stone[1]);
  L.line(cx + 5, G - 10 + bob, cx + 4, G - 7 + bob, P.stone[1]);
  // mos
  srand(77);
  for (let i = 0; i < 18; i++) {
    const x = cx - 8 + Math.floor(rnd() * 16), y = G - 18 + bob + Math.floor(rnd() * 3);
    if (L.alpha(x, y) > 0) L.set(x, y, rnd() < 0.5 ? P.moss[2] : P.moss[3]);
    if (L.alpha(x, y + 1) > 0) L.set(x, y + 1, P.moss[1]);
  }
  // gloeiende ogen
  if (opt.hurt) {
    L.line(cx - 6, G - 12 + bob, cx - 4, G - 10 + bob, OUTLINE); L.line(cx - 4, G - 12 + bob, cx - 6, G - 10 + bob, OUTLINE);
  } else {
    for (const ex of [cx - 7, cx - 1]) {
      L.rect(ex - 1, G - 12 + bob, 5, 4, P.stone[0]);
      L.rect(ex, G - 11 + bob, 3, 2, P.rune[2]); L.set(ex, G - 11 + bob, P.rune[3]); L.set(ex + 1, G - 11 + bob, P.rune[3]);
    }
  }
  return L.outline(OUTLINE);
}
export function buildRock() {
  return {
    move: [0, 1, 2, 3].map(i => rockFrame(i)),
    attack: [rockFrame(0, { lean: 2, bob: 1 }), rockFrame(1, { lean: -3, bob: -2 }), rockFrame(0, { lean: -7, bob: -1 }), rockFrame(1, { lean: -2 })],
    hurt: [rockFrame(0, { hurt: true, bob: 2 })],
  };
}

// --- Schatkist ---------------------------------------------------------------
function chestFrame(open, shake = 0) {
  const L = new Img(EN_FW, EN_FH);
  const x = 7 + shake, y = G - 12;
  L.shadedBlock(x, y, 18, 12, P.wood, { power: 6 });
  L.hline(x, x + 17, y + 3, P.wood[0]);
  // metalen banden
  L.rect(x + 3, y, 2, 12, P.gold[1]); L.rect(x + 13, y, 2, 12, P.gold[1]);
  L.vline(x + 3, y, y + 11, P.gold[2]); L.vline(x + 13, y, y + 11, P.gold[2]);
  if (open) {
    L.shadedBlock(x, y - 8, 18, 6, P.wood, { power: 6 });
    L.rect(x + 2, y - 2, 14, 3, '#2a1a12');
    L.rect(x + 3, y - 3, 12, 2, P.gold[2]); L.set(x + 6, y - 4, P.gold[3]); L.set(x + 11, y - 4, P.gold[3]);
  } else {
    L.shadedEllipse(x + 9, y + 1, 9, 5, P.wood, { clip: (px, py) => py <= y + 2 });
    L.rect(x + 3, y - 3, 2, 6, P.gold[2]); L.rect(x + 13, y - 3, 2, 6, P.gold[2]);
    L.rect(x + 7, y + 2, 4, 4, P.gold[2]); L.set(x + 8, y + 3, P.gold[0]); L.set(x + 8, y + 4, P.gold[0]);
  }
  return L.outline(OUTLINE);
}
export function buildChest() {
  return {
    move: [chestFrame(false), chestFrame(false), chestFrame(false, 1), chestFrame(false, -1)],
    attack: [chestFrame(false)],
    hurt: [chestFrame(true)],
  };
}

// --- Schildkever (gepantserd, 3 HP) --------------------------------------------------
const BEETLE = ['#121c34', '#1f3d66', '#2f6ea6', '#6cc0e4', '#d8f4ff'];
function beetleFrame(step, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const lean = opt.lean || 0;
  const bob = opt.bob ?? (step % 2);
  const cx = 19 + lean, cy = G - 9 + bob;
  // pootjes (achter het schild)
  const legs = [[-6, 0], [0, 1], [6, 0]];
  legs.forEach(([lx, ph], i) => {
    const sw = ((step + ph + i) % 2 === 0 ? 2 : -2);
    L.line(cx + lx, cy + 4, cx + lx - 2 + sw, G, BEETLE[0]);
    L.set(cx + lx - 2 + sw, G, BEETLE[1]);
  });
  // schild
  L.shadedEllipse(cx, cy, 11, 8, BEETLE, { light: [-0.5, -0.85, 0.5], bias: -0.16, clip: (x, y) => y <= cy + 5 });
  L.hline(cx - 10, cx + 10, cy + 5, BEETLE[0]);
  // pantserplaten + naad
  L.line(cx - 1, cy - 7, cx + 2, cy + 4, BEETLE[1]);
  for (const k of [-4, 0]) L.line(cx - 8, cy + k, cx - 4, cy + k - 2, BEETLE[1]);
  L.set(cx - 5, cy - 5, BEETLE[4]); L.set(cx - 4, cy - 6, BEETLE[4]); L.set(cx - 6, cy - 4, BEETLE[3]);
  // nagels
  for (const [nx, ny] of [[cx + 5, cy - 3], [cx + 7, cy + 1], [cx + 3, cy + 2]]) { L.set(nx, ny, '#ffc93c'); }
  // kop + hoorn
  const hx = cx - 12, hy = cy + 1;
  L.shadedEllipse(hx, hy, 4, 3.5, BEETLE.slice(0, 4));
  // gebogen neushoorn-hoorn (omhoog), blijft binnen het frame
  const hr = opt.horn || 0;
  L.thick(hx - 2, hy - 2, hx - 4, hy - 5, 1.1, '#e8dcc0');
  L.thick(hx - 4, hy - 5, hx - 3, hy - 9 - hr, 0.8, '#e8dcc0');
  L.set(hx - 2, hy - 10 - hr, '#ffffff');
  L.set(hx - 3, hy - 4, '#b8a888');
  if (opt.hurt) {
    L.line(hx - 2, hy - 1, hx, hy + 1, OUTLINE); L.line(hx, hy - 1, hx - 2, hy + 1, OUTLINE);
  } else {
    L.rect(hx - 2, hy - 1, 2, 2, '#ffe14a'); L.set(hx - 2, hy - 1, '#fff8ec');
  }
  return L.outline(OUTLINE);
}
export function buildBeetle() {
  return {
    move: [0, 1, 2, 3].map(i => beetleFrame(i)),
    attack: [beetleFrame(0, { lean: 2, horn: 1 }), beetleFrame(1, { lean: -2, bob: -1 }), beetleFrame(0, { lean: -4, horn: -1 }), beetleFrame(1, { lean: -1 })],
    hurt: [beetleFrame(0, { hurt: true, bob: 1 })],
  };
}
