// ---------------------------------------------------------------------------
// App-icoon (web-app / later App Store): 32x32 PixelArt, vergroot met nearest
// neighbour. Volledig gevuld vierkant (geen transparantie) zodat het ook als
// "maskable" icoon werkt: het belangrijke deel zit binnen de middelste 80%.
// Een groot gouden ×-teken met een vuurspoor, op een paarse achtergrond.
// ---------------------------------------------------------------------------
import { Img, rampPick } from '../lib/raster.js';
import { P } from '../lib/palette.js';

export function buildAppIcon() {
  const S = 32, L = new Img(S, S);
  // achtergrond: verloop paars → donker, met een zachte gloed achter het teken
  const BG = ['#120c18', '#1e1436', '#2e1e56', '#44307a'];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - 16, y - 15) / 22;
    L.put(x, y, rampPick(BG, 1 - d, x, y));
  }
  // sterretjes
  for (const [x, y] of [[5, 6], [26, 5], [25, 25], [7, 26]]) { L.put(x, y, '#c8c0e8'); }
  L.put(27, 12, '#ffffff');
  // vuurspoor links-onder (combo!)
  for (let i = 0; i < 6; i++) {
    const x = 6 + i, y = 22 + (i % 2);
    L.put(x, y, P.fire[1 + (i % 3)]); L.put(x, y - 1, P.fire[2]);
  }
  // groot × (dikke diagonalen, goud, met donkere rand)
  const stroke = (x0, y0, x1, y1) => {
    L.thick(x0, y0, x1, y1, 3.6, '#3a1d10');
  };
  const fill = (x0, y0, x1, y1) => {
    L.thick(x0, y0, x1, y1, 2.6, P.gold[1]);
    L.thick(x0, y0, x1, y1, 1.5, P.gold[2]);
  };
  stroke(9, 8, 23, 22); stroke(23, 8, 9, 22);
  fill(9, 8, 23, 22); fill(23, 8, 9, 22);
  // glans
  L.line(10, 8, 13, 11, P.gold[3]); L.line(22, 8, 20, 10, P.gold[3]);
  L.put(16, 15, '#ffffff');
  return L;
}
