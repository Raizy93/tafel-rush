// Frostpeak: de 4 biomen als schermvullend voorbeeld + props-blad.
//   node tools/preview/preview-frostpeak.js uit.png
import fs from 'node:fs';
import { encodePNG, Img, pack } from '../lib/raster.js';
import { buildFrostLayers, buildFrostGround, buildFrostProps, FROST_BIOMES } from '../art/frostpeak.js';

const out = process.argv[2];
const keys = ['lake', 'caves', 'pass', 'summit'];
const all = new Img(480 * 2, 270 * 2);
const props = Object.fromEntries(buildFrostProps().map(p => [p.name, p.img]));
const place = { lake: ['fp_snow1', 'fp_pine', 'fp_snowman', 'fp_igloo', 'fp_fg_branch'], caves: ['fp_crystal1', 'fp_icicle', 'fp_crystal0', 'fp_lantern', 'fp_fg_ice'], pass: ['fp_rock1', 'fp_cairn', 'fp_fence', 'fp_tuft', 'fp_fg_branch'], summit: ['fp_crystal1', 'fp_pine', 'fp_lantern', 'fp_snow0', 'fp_fg_ice'] };
keys.forEach((k, i) => {
  const L = buildFrostLayers(k, 500 + 100 * (i + 1));
  const v = new Img(480, 270);
  v.blit(L.sky, 0, 0); v.blit(L.clouds, -50, 10); v.blit(L.far, -100, 0); v.blit(L.mid, -200, 0); v.blit(L.near, -300, 0);
  const g = buildFrostGround(FROST_BIOMES[k]);
  for (let x = 0; x < 480; x += 32) { const idx = x >= 320 && x < 416 ? 4 + ((x - 320) / 32) : (x / 32) % 4; v.blit(g.img.sub(idx * 32, 0, 32, 48), x, 222); }
  const [a, b, c, d, fg] = place[k];
  [[a, 40], [b, 120], [c, 190], [d, 250]].forEach(([n, x]) => v.blit(props[n], x, 227 - props[n].h));
  v.blit(props[fg], 430, 232);
  all.blit(v, (i % 2) * 480, Math.floor(i / 2) * 270);
});
fs.writeFileSync(out, encodePNG(all));
fs.writeFileSync(out.replace('.png', '_props.png'), encodePNG(pack(buildFrostProps(), 256).img.scaled(3)));
