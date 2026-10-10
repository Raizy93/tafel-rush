// ---------------------------------------------------------------------------
// Kisten voor het petboek: houten kist, tafelkist en gouden kist.
// Frame 40x36, kist staat op y = 34. Animaties:
//   idle  (4)  glimmer die over het deksel loopt
//   shake (4)  wiebelen vlak voor het openen
//   open  (6)  deksel klapt open, licht stroomt naar buiten
// Daarnaast kleine 12x12 iconen (voor knoppen en het resultaatscherm).
// ---------------------------------------------------------------------------
import { Img } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';

export const CHEST_FW = 40, CHEST_FH = 36;
const G = 34;

export const CHEST_STYLES = {
  wood: { body: ['#2e1a14', '#5a3422', '#8a5634', '#b98352'], lid: ['#3a2218', '#6a3e26', '#9c6238', '#c8925a'], band: ['#262433', '#45465e', '#6c7290', '#a0a9c2'], lock: P.gold, light: '#ffe6a0' },
  tafel: { body: ['#101e48', '#22408a', '#3a68c8', '#7ab0ff'], lid: ['#14265a', '#2a4ea0', '#4a82e0', '#9ccaff'], band: P.steel, lock: P.steel, light: '#b4ecff', emblem: true },
  // wereldkisten (alleen te verdienen door de boss van die wereld te verslaan)
  bos: { body: ['#2e1a14', '#5a3422', '#8a5634', '#b98352'], lid: ['#1c3a1a', '#2e6a2a', '#4e9a3a', '#86c85a'], band: ['#3a2a1a', '#6a4a2a', '#9a7040', '#c8a060'], lock: P.gold, light: '#c8ffa0', mark: 'leaf' },
  sneeuw: { body: ['#1e3a6a', '#3a6aa8', '#6aa4dc', '#b4dcff'], lid: ['#8aa4c8', '#b4c8e4', '#e4eefa', '#ffffff'], band: P.steel, lock: ['#1e4a8a', '#2f74c0', '#9cd8ff', '#ffffff'], light: '#d8f8ff', mark: 'snow' },
  storm: { body: ['#120e22', '#221a3a', '#362a56', '#4e4078'], lid: ['#1a1230', '#2e2250', '#46346e', '#6a52a0'], band: ['#4a3a1a', '#8a6a2a', '#c89a3a', '#f0d070'], lock: ['#8a6a10', '#e0b020', '#ffe24a', '#fff6b0'], light: '#ffe24a', mark: 'bolt' },
  gold: { body: ['#7a4413', '#c8811e', '#ffc93c', '#fff1a0'], lid: ['#8a4e16', '#d8922a', '#ffd84a', '#fff6c0'], band: ['#4a0e2a', '#8a1a4a', '#c8306a', '#ff7aa8'], lock: ['#5a0e1e', '#a3202e', '#e04a5a', '#ffb0a0'], light: '#fff6c0', gems: true },
};

function chestFrame(st, { shake = 0, open = 0, glint = -1 } = {}) {
  const L = new Img(CHEST_FW, CHEST_FH);
  const ox = Math.round(shake), cx = 20 + ox;
  const x0 = cx - 15, w = 30;
  // romp
  const by = G - 14;
  L.shadedBlock(x0, by, w, 14, st.body, { power: 6, bias: -0.32 });
  for (const k of [7, 20]) L.rect(x0 + k, by, 3, 14, st.band[1]), L.vline(x0 + k, by, G - 1, st.band[2]);
  L.hline(x0, x0 + w - 1, G - 1, st.body[0]);
  // planken / naden
  if (!st.gems && !st.emblem && !st.mark) for (const y of [by + 5, by + 10]) L.hline(x0 + 1, x0 + w - 2, y, st.body[1]);
  if (open > 0) {
    // binnenkant + licht
    L.rect(x0 + 2, by - 1, w - 4, 3, '#1a0e10');
  }
  // deksel: dicht = koepel; open = kantelt naar achteren (dunner en hoger)
  const lift = open * 9, thin = 1 - open * 0.55;
  const ly = by - 8 * thin - lift, lh = Math.max(3, Math.round(9 * thin));
  L.shadedEllipse(cx, ly + lh, 15, lh, st.lid, { bias: -0.2, clip: (x, y) => y <= ly + lh });
  L.rect(x0, Math.round(ly + lh), w, 2, st.lid[1]);
  for (const k of [7, 20]) L.rect(x0 + k, Math.round(ly + lh * 0.25), 3, Math.round(lh * 0.75) + 2, st.band[1]);
  // glimmer
  if (glint >= 0) {
    const gx = x0 + glint * (w + 8) - 4;
    for (let y = 0; y < lh + 2; y++) { const px = Math.round(gx + y * 0.6), py = Math.round(ly + lh + 1 - y); if (L.alpha(px, py) > 0) L.set(px, py, '#ffffffa0'); }
  }
  if (open === 0) {
    // slot
    L.shadedBlock(cx - 3, by - 3, 6, 7, st.lock, { power: 3 });
    L.rect(cx - 1, by + 1, 2, 2, OUTLINE);
    if (st.emblem) { // tafelkist: × op het deksel
      const ey = Math.round(ly + lh * 0.55);
      for (let i = -2; i <= 2; i++) { L.set(cx - 8 + i, ey + i, '#ffffff'); L.set(cx - 8 + i, ey - i, '#ffffff'); L.set(cx + 8 + i, ey + i, '#ffffff'); L.set(cx + 8 + i, ey - i, '#ffffff'); }
    }
    if (st.mark === 'leaf') { // boskist: blaadjes + bloemetje op het deksel
      const ey = Math.round(ly + lh * 0.45);
      for (const [x, s2] of [[cx - 9, 1], [cx + 9, -1]]) { L.poly([[x - 3 * s2, ey + 1], [x, ey - 3], [x + 3 * s2, ey + 1]], '#a8e070'); L.line(x - 2 * s2, ey, x + 2 * s2, ey - 1, '#3d8f44'); }
      L.set(cx + 13, ey - 2, '#ff8ad0'); L.set(cx + 12, ey - 2, '#ffd23a');
    }
    if (st.mark === 'snow') { // sneeuwkist: ijspegels aan de rand
      for (let x = x0 + 2; x < x0 + w - 2; x += 4) L.vline(x, by + 1, by + 2 + ((x * 3) % 3), '#c8ecff');
    }
    if (st.mark === 'bolt') { // stormkist: bliksemteken
      const ey = Math.round(ly + lh * 0.2);
      for (const x of [cx - 9, cx + 9]) L.poly([[x + 1, ey], [x - 2, ey + 4], [x, ey + 4], [x - 1, ey + 8], [x + 3, ey + 3], [x + 1, ey + 3]], '#ffe24a');
    }
    if (st.gems) for (const gx of [cx - 9, cx + 9]) { L.disc(gx, by + 7, 1.6, '#c21f3a'); L.set(gx - 1, by + 6, '#ff9ab0'); }
  }
  L.outline(OUTLINE);
  if (open > 0) L.rect(x0 + 3, by - 1, w - 6, 1, '#ffffff'); // gloed binnenin (lichtbundels tekent de game live)
  return L;
}

export function buildChestKind(kind) {
  const st = CHEST_STYLES[kind];
  return {
    idle: [0, 1, 2, 3].map(i => chestFrame(st, { glint: i === 0 ? -1 : (i - 1) / 2 })),
    shake: [-1, 1, -1.5, 1.5].map(s => chestFrame(st, { shake: s })),
    open: [0.15, 0.35, 0.6, 0.85, 1, 1].map(o => chestFrame(st, { open: o })),
  };
}
export const CHEST_KINDS = Object.keys(CHEST_STYLES);

/** 12x12 iconen: mini-kistjes + snoepje (dubbele pets) + boek. */
export function buildCollectIcons() {
  const out = [];
  for (const kind of CHEST_KINDS) {
    const st = CHEST_STYLES[kind];
    const L = new Img(12, 12);
    L.shadedBlock(1, 5, 10, 6, st.body, { power: 6 });
    L.shadedEllipse(6, 5, 5, 3, st.lid, { clip: (x, y) => y <= 5 });
    L.rect(1, 5, 10, 1, st.lid[1]);
    L.rect(5, 4, 2, 3, st.lock[2]);
    out.push({ name: 'chest_' + kind, img: L.outline(OUTLINE) });
  }
  {
    // snoepje (ingepakt), roze met witte streep
    const L = new Img(12, 12);
    L.poly([[0, 3], [3, 5], [3, 7], [0, 9]], '#ff7ab8');
    L.poly([[12, 3], [9, 5], [9, 7], [12, 9]], '#ff7ab8');
    L.shadedEllipse(6, 6, 3.5, 3, ['#a8306a', '#e04a8a', '#ff7ab8', '#ffc0e0']);
    L.line(4, 8, 7, 3, '#ffffff');
    out.push({ name: 'treat', img: L.outline(OUTLINE) });
  }
  {
    // boek met pootje
    const L = new Img(12, 12);
    L.rect(1, 1, 10, 10, '#8a3a2a');
    L.rect(2, 1, 9, 9, '#c8583a');
    L.rect(2, 10, 9, 1, '#fff8ec');
    L.disc(6.5, 6.5, 1.4, '#ffe0b0');
    for (const [x, y] of [[4.5, 4], [6.5, 3], [8.5, 4]]) L.set(x, y, '#ffe0b0');
    out.push({ name: 'book', img: L.outline(OUTLINE) });
  }
  return out;
}
