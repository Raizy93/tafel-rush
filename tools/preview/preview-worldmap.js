// Wereldkaart als voorbeeld (3x vergroot, met de plekken en het pad erop getekend).
//   node tools/preview/preview-worldmap.js uit.png
import fs from 'node:fs';
import { encodePNG } from '../lib/raster.js';
import { buildWorldMap } from '../art/worldmap.js';
import { MAP_NODES, allSegments } from '../../js/data/worldmap.js';

const L = buildWorldMap();
for (const [[x0, y0], [x1, y1]] of allSegments()) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  for (let d = 0; d < len; d += 5) L.disc(x0 + (x1 - x0) * d / len, y0 + (y1 - y0) * d / len, 1, '#fff1a0');
}
for (const n of MAP_NODES) { L.disc(n.x, n.y, 7, '#1a1324'); L.disc(n.x, n.y, 5, n.teaser ? '#6a7290' : '#ffc93c'); }
fs.writeFileSync(process.argv[2], encodePNG(L.scaled(3)));
console.log('ok');
