// ---------------------------------------------------------------------------
// Vijanden van Stormrijk – allemaal nieuw getekend (geen kleurvarianten).
// Zelfde opzet als enemies.js: 32x32 frames, voeten op y=30, kijken naar LINKS.
// Animaties: move (loop), attack (eenmalig), hurt (1 frame).
//   Stroomslak     1 HP  slak met een bliksemspiraal op zijn huisje
//   Vonkje         1 HP  zwevende bol elektriciteit (vliegt)
//   Stormkraai     1 HP  zwarte kraai met bliksemstaart (vliegt)
//   Donderpad      2 HP  pad met gloeiende strepen en een bliksem-keelzak
//   Onweerswolkje  2 HP  boos wolkje dat regent en bliksem laat vallen (vliegt)
//   Stormkreeft    3 HP  gepantserde kreeft met spoel-voelsprieten (gepantserd)
// ---------------------------------------------------------------------------
import { Img } from '../lib/raster.js';
import { OUTLINE } from '../lib/palette.js';
import { EN_FW, EN_FH } from './enemies.js';

const G = 30;
const TAU = Math.PI * 2;
const VOLT = ['#8a6a10', '#e0b020', '#ffe24a', '#fff6b0', '#ffffff'];
const ARC = ['#1a4a8a', '#2f8ae0', '#6ad8ff', '#d0f8ff', '#ffffff'];

function hurtEyes(L, x, y, gap = 5) {
  for (const ex of [x, x + gap]) { L.line(ex, y, ex + 2, y + 2, OUTLINE); L.line(ex + 2, y, ex, y + 2, OUTLINE); }
}
/** Klein gekarteld vonkje van (x,y) in richting dx (na de outline tekenen). */
function zap(L, x, y, len, ramp = VOLT, dx = -1) {
  let px = x, py = y;
  for (let i = 0; i < len; i++) {
    const nx = px + dx * 2, ny = py + (i % 2 ? 2 : -2);
    L.line(px, py, nx, ny, i === len - 1 ? ramp[4] : ramp[2 + (i % 2)]);
    px = nx; py = ny;
  }
}

// --- Stroomslak -------------------------------------------------------------------
const SNAIL = ['#1e1a2c', '#3a2e52', '#5a4878', '#8a74a8'];
const SLUG = ['#2a3a2a', '#466a44', '#6a9a5a', '#a0c878'];
function snailFrame(p, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const ph = p * TAU;
  const stretch = opt.stretch ?? Math.sin(ph) * 1.5;
  const lean = opt.lean || 0;
  // lijf (slak), kop naar links
  const hx = 8 - stretch + lean;
  L.shadedEllipse(15 + lean - stretch * 0.4, G - 2, 11 + stretch * 0.5, 2.6, SLUG, { clip: (x, y) => y <= G });
  L.shadedEllipse(hx, G - 5, 3.6, 4.4, SLUG);
  // oogsprieten
  const wig = Math.round(Math.sin(ph * 2));
  for (const [ox, h] of [[-2, 7], [1, 8]]) {
    L.line(hx + ox, G - 8, hx + ox - 1, G - 8 - h + wig, SLUG[1]);
    L.disc(hx + ox - 1, G - 9 - h + wig, 1.2, opt.zap ? VOLT[3] : SLUG[3]);
    L.set(hx + ox - 2, G - 9 - h + wig, OUTLINE);
  }
  // huisje met spiraal
  const sx = 19 + lean - stretch * 0.2, sy = G - 9;
  L.shadedEllipse(sx, sy, 8, 7.5, SNAIL);
  for (let a = 0; a < TAU * 2.2; a += 0.12) {
    const r = 1 + a * 0.85;
    L.set(sx + Math.cos(a) * r * 0.95, sy + Math.sin(a) * r * 0.9, a > TAU * 1.6 ? VOLT[1] : VOLT[2]);
  }
  L.set(sx, sy, VOLT[4]);
  if (opt.hurt) hurtEyes(L, hx - 3, G - 7, 3);
  L.outline(OUTLINE);
  if (opt.zap) { zap(L, hx - 3, G - 17 + wig, 4); zap(L, hx, G - 18 + wig, 3, ARC); }
  return L;
}
export function buildSnail() {
  return {
    move: [0, 1, 2, 3, 4, 5].map(i => snailFrame(i / 6)),
    attack: [snailFrame(0, { stretch: -1, zap: false }), snailFrame(0.1, { stretch: 1, zap: true }), snailFrame(0.2, { stretch: 2, lean: -3, zap: true }), snailFrame(0, { stretch: 0 })],
    hurt: [snailFrame(0, { hurt: true, stretch: -1.5 })],
  };
}

// --- Vonkje -------------------------------------------------------------------------
function sparkFrame(p, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const ph = p * TAU;
  const cx = 16 + (opt.lean || 0), cy = 15 + Math.round(Math.sin(ph) * 1.5);
  const big = opt.big || 0;
  // gekartelde stralen rondom (draaien)
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = ph * 0.5 + i / n * TAU;
    const r0 = 6, r1 = 10 + big * 3 + ((i + Math.floor(p * 4)) % 2) * 2;
    const mx = cx + Math.cos(a + 0.25) * (r0 + r1) / 2, my = cy + Math.sin(a + 0.25) * (r0 + r1) / 2;
    L.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, mx, my, VOLT[2]);
    L.line(mx, my, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, VOLT[3]);
  }
  L.disc(cx, cy, 6.5 + big, '#ffffff40');
  L.shadedEllipse(cx, cy, 5.5 + big * 0.5, 5.5 + big * 0.5, VOLT.slice(1), { bias: 0.25 });
  // boze oogjes
  if (opt.hurt) hurtEyes(L, cx - 4, cy - 1, 4);
  else {
    for (const ex of [cx - 4, cx]) { L.rect(ex, cy - 1, 2, 3, '#5a2a10'); L.set(ex, cy - 1, '#ffffff'); }
    L.line(cx - 5, cy - 3, cx - 2, cy - 2, '#5a2a10'); L.line(cx + 3, cy - 3, cx, cy - 2, '#5a2a10');
    L.hline(cx - 3, cx, cy + 3, '#5a2a10');
  }
  return L.outline('#5a3a0a');
}
export function buildSpark() {
  return {
    move: [0, 1, 2, 3].map(i => sparkFrame(i / 4)),
    attack: [sparkFrame(0, { big: 1, lean: 2 }), sparkFrame(0.25, { big: 2, lean: -3 }), sparkFrame(0.5, { big: 2, lean: -8 }), sparkFrame(0.75, { big: 0, lean: -2 })],
    hurt: [sparkFrame(0, { hurt: true })],
  };
}

// --- Stormkraai ------------------------------------------------------------------------
const CROW = ['#08080e', '#14141e', '#22223a', '#383a5a'];
function crowFrame(p, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const ph = p * TAU;
  const dive = opt.dive || 0;
  const cx = 17 + (opt.lean || 0), cy = 14 + Math.round(Math.sin(ph) * 1.5) + dive * 3;
  const flap = opt.flap ?? Math.sin(ph);
  // staart met bliksempunten (rechts)
  L.poly([[cx + 5, cy], [cx + 12, cy - 2 + dive * 2], [cx + 12, cy + 3 + dive * 2], [cx + 5, cy + 3]], CROW[1]);
  // achtervleugel
  L.poly([[cx + 2, cy - 1], [cx + 7, cy - 6 - flap * 7], [cx + 12, cy - 4 - flap * 8], [cx + 6, cy + 2]], CROW[1]);
  // lijf
  L.shadedEllipse(cx, cy + 1, 6.5, 4.2, CROW);
  // kop + snavel naar links
  L.shadedEllipse(cx - 6, cy - 2 + dive, 3.8, 3.4, CROW);
  L.poly([[cx - 9, cy - 3 + dive], [cx - 14, cy - 1 + dive * 2], [cx - 9, cy + dive]], '#4a4a5a');
  L.line(cx - 9, cy - 2 + dive, cx - 13, cy - 1 + dive * 2, '#8a8a9a');
  // voorvleugel
  L.poly([[cx - 1, cy - 1], [cx + 2, cy - 7 - flap * 8], [cx + 9, cy - 5 - flap * 9], [cx + 4, cy + 2]], CROW[2]);
  L.line(cx - 1, cy - 1, cx + 2, cy - 7 - flap * 8, CROW[3]);
  // pootjes
  L.set(cx - 1, cy + 5, '#c8a020'); L.set(cx + 2, cy + 5, '#c8a020');
  if (opt.hurt) hurtEyes(L, cx - 8, cy - 4 + dive, 3);
  else { L.rect(cx - 7, cy - 3 + dive, 2, 2, VOLT[2]); L.set(cx - 7, cy - 3 + dive, '#ffffff'); }
  L.outline(OUTLINE);
  // bliksemveren aan de staart (na outline)
  for (const dy of [-2, 1, 3]) L.line(cx + 12, cy + dy + dive * 2, cx + 15, cy + dy - 1 + dive * 2, ARC[2]);
  L.set(cx + 16, cy - 3 + dive * 2, ARC[4]);
  return L;
}
export function buildCrow() {
  return {
    move: [0, 1, 2, 3].map(i => crowFrame(i / 4)),
    attack: [crowFrame(0.25, { lean: 2, flap: 1 }), crowFrame(0.5, { lean: -2, dive: 1, flap: -0.5 }), crowFrame(0.5, { lean: -7, dive: 2, flap: -1 }), crowFrame(0, { lean: -2 })],
    hurt: [crowFrame(0.5, { hurt: true })],
  };
}

// --- Donderpad ----------------------------------------------------------------------------
const TOAD = ['#0e1a14', '#1c3226', '#2e4e36', '#46704a'];
function toadFrame(p, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const ph = p * TAU;
  const lift = opt.lift ?? Math.max(0, Math.sin(ph)) * 4;
  const sq = opt.sq ?? (lift > 0 ? -0.6 : 0.4 + Math.sin(ph) * 0.2);
  const sac = opt.sac || 0;
  const cx = 16 + (opt.lean || 0), by = G - 6 - lift;
  // achterpoten
  L.shadedEllipse(cx + 7, by + 3 + lift * 0.5, 4.5, 3.2, TOAD);
  L.hline(cx + 4, cx + 11, G - Math.round(lift * 0.3), TOAD[0]);
  // lijf
  L.shadedEllipse(cx, by, 9 + sq, 6.5 - sq, TOAD);
  // gloeiende strepen op de rug
  for (const [x0, y0] of [[-3, -5], [1, -6], [5, -4]]) L.line(cx + x0, by + y0, cx + x0 + 2, by + y0 + 3, VOLT[2]);
  // keelzak (licht op bij de aanval)
  if (sac > 0) { L.disc(cx - 7, by + 3, 2.5 + sac * 2.5, VOLT[1]); L.disc(cx - 7.5, by + 2.5, 1.5 + sac * 1.8, VOLT[3]); }
  // voorpootjes
  L.rect(cx - 7, by + 4, 3, Math.round(2 + lift * 0.3) + 2, TOAD[2]);
  // ogen bovenop (bol) naar links
  for (const ex of [cx - 6, cx - 1]) {
    L.disc(ex, by - 5, 2.3, TOAD[3]);
    if (opt.hurt) continue;
    L.rect(ex - 1, by - 6, 2, 2, VOLT[2]); L.set(ex - 1, by - 6, OUTLINE);
  }
  if (opt.hurt) hurtEyes(L, cx - 7, by - 6, 5);
  // brede mond
  L.line(cx - 9, by + 1, cx - 3, by + 2, TOAD[0]);
  L.outline(OUTLINE);
  if (sac > 0.6) { zap(L, cx - 11, by + 2, 4); zap(L, cx - 11, by + 5, 3, ARC); }
  return L;
}
export function buildToad() {
  return {
    move: [0, 1, 2, 3, 4, 5].map(i => toadFrame(i / 6)),
    attack: [toadFrame(0, { lift: 0, sq: 1, sac: 0.4 }), toadFrame(0, { lift: 0, sq: 1.4, sac: 1 }), toadFrame(0, { lift: 1, sq: 0, sac: 1, lean: -4 }), toadFrame(0, { lift: 0, sq: 0.4, sac: 0.2 })],
    hurt: [toadFrame(0, { hurt: true, lift: 0, sq: 1.6 })],
  };
}

// --- Onweerswolkje -------------------------------------------------------------------------
const CLOUD = ['#1a1828', '#2e2a44', '#48446a', '#6a6890'];
function cloudFrame(p, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const ph = p * TAU;
  const cx = 16 + (opt.lean || 0), cy = 11 + Math.round(Math.sin(ph) * 1);
  // regendruppels
  for (let i = 0; i < 4; i++) {
    const x = cx - 7 + i * 5, y = cy + 8 + ((Math.floor(p * 8) + i * 3) % 7);
    L.vline(x, y, y + 1, '#6a8ad8');
  }
  // wolkenbollen
  for (const [dx, dy, r] of [[-6, 2, 5], [6, 2, 5], [-2, -2, 6.5], [3, -3, 5.5], [0, 3, 6]]) L.shadedEllipse(cx + dx, cy + dy, r * 1.15, r, CLOUD, { light: [-0.4, -0.9, 0.4] });
  // boos gezicht naar links
  if (opt.hurt) hurtEyes(L, cx - 6, cy - 1, 5);
  else {
    for (const ex of [cx - 6, cx - 1]) { L.rect(ex, cy - 1, 2, 2, VOLT[2]); L.set(ex, cy - 1, '#ffffff'); }
    L.line(cx - 7, cy - 3, cx - 4, cy - 2, OUTLINE); L.line(cx + 2, cy - 3, cx - 1, cy - 2, OUTLINE);
    L.hline(cx - 5, cx - 2, cy + 3, CLOUD[0]);
  }
  L.outline(OUTLINE);
  // bliksem naar beneden bij de aanval
  if (opt.bolt) {
    let x = cx - 3, y = cy + 7;
    for (let i = 0; i < 5; i++) { const nx = x + (i % 2 ? 2 : -3), ny = y + 4; L.line(x, y, nx, ny, VOLT[3]); L.line(x + 1, y, nx + 1, ny, VOLT[2]); x = nx; y = ny; }
    L.set(x, y, '#ffffff');
  }
  return L;
}
export function buildStormCloud() {
  return {
    move: [0, 1, 2, 3, 4, 5].map(i => cloudFrame(i / 6)),
    attack: [cloudFrame(0, { lean: 2 }), cloudFrame(0.2, { lean: -1, bolt: true }), cloudFrame(0.4, { lean: -4, bolt: true }), cloudFrame(0.6, { lean: -1 })],
    hurt: [cloudFrame(0, { hurt: true })],
  };
}

// --- Stormkreeft ----------------------------------------------------------------------------
const SHELL = ['#0c1424', '#18284a', '#28427a', '#4a6aa8', '#8aa8d8'];
const COPPER = ['#5a2a10', '#a0521e', '#d8823a', '#ffc078'];
function crabFrame(step, opt = {}) {
  const L = new Img(EN_FW, EN_FH);
  const lean = opt.lean || 0, bob = opt.bob ?? (step % 2);
  const cx = 17 + lean, cy = G - 9 + bob;
  // pootjes (zijwaarts trippelen)
  for (let i = 0; i < 3; i++) {
    const o = ((step + i) % 2 ? 1 : -1);
    L.line(cx - 4 + i * 4, cy + 3, cx - 6 + i * 4 + o, G, SHELL[1]);
    L.line(cx + 4 + i * 3, cy + 3, cx + 7 + i * 3 - o, G, SHELL[0]);
  }
  // schild
  L.shadedEllipse(cx + 1, cy + 1, 10, 5, SHELL, { light: [-0.5, -0.85, 0.5] });
  L.hline(cx - 6, cx + 8, cy + 4, SHELL[0]);
  for (const [x, y] of [[-3, -4], [2, -5], [6, -3]]) L.set(cx + x, cy + y, SHELL[4]);
  // scharen naar links (open/dicht)
  const open = opt.open ?? 1;
  const kx = cx - 11 - (opt.reach || 0), ky = cy - 6;
  L.thick(cx - 6, cy + 1, kx + 1, ky + 4, 1.3, SHELL[2]);
  L.shadedEllipse(kx + 1, ky, 5, 4, SHELL);
  L.poly([[kx - 2, ky - 2], [kx - 9, ky - 3 - open * 2.5], [kx - 1, ky - 4]], SHELL[3]);
  L.poly([[kx - 2, ky + 1], [kx - 8, ky + 2 + open * 2.5], [kx - 1, ky + 3]], SHELL[2]);
  L.set(kx - 8, ky - 3 - Math.round(open * 2.5), SHELL[4]);
  // spoel-voelsprieten (koper met gloeiende punt)
  for (const [ox, h] of [[4, 6], [7, 8]]) {
    L.line(cx + ox, cy - 5, cx + ox - 1, cy - 5 - h, COPPER[1]);
    for (let y = cy - 7; y > cy - 5 - h; y -= 3) L.hline(cx + ox - 2, cx + ox, y, COPPER[2]);
    L.disc(cx + ox - 1, cy - 6 - h, 1.4, ARC[2]);
  }
  // oogjes op steeltjes
  if (opt.hurt) hurtEyes(L, cx - 5, cy - 7, 4);
  else for (const ex of [cx - 6, cx - 2]) { L.vline(ex + 1, cy - 7, cy - 4, SHELL[2]); L.rect(ex, cy - 9, 2, 2, '#ffffff'); L.set(ex, cy - 8, OUTLINE); }
  L.outline(OUTLINE);
  // ontlading tussen de voelsprieten en tussen de scharen
  if (opt.arc) {
    L.line(cx + 3, cy - 12, cx + 6, cy - 14, ARC[3]); L.set(cx + 4, cy - 14, '#ffffff');
    zap(L, kx - 9, ky - 4, 3, ARC); zap(L, kx - 8, ky + 3, 3, ARC);
  }
  return L;
}
export function buildCrab() {
  return {
    move: [0, 1, 2, 3].map(i => crabFrame(i, { open: i % 2 ? 0.4 : 1 })),
    attack: [crabFrame(0, { lean: 2, open: 1.5, arc: true }), crabFrame(1, { lean: -2, reach: 2, open: 0, arc: true }), crabFrame(0, { lean: -6, reach: 3, open: 1, arc: true }), crabFrame(1, { lean: -2, open: 0.6 })],
    hurt: [crabFrame(0, { hurt: true, bob: 2, open: 0.2 })],
  };
}
