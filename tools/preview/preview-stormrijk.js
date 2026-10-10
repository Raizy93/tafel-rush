// Stormrijk: de 4 biomen als schermvullend voorbeeld + props-blad.
//   node tools/preview/preview-stormrijk.js uit.png
import fs from 'node:fs';
import { encodePNG, Img, pack } from '../lib/raster.js';
import { buildStormLayers, buildStormGround, buildStormProps, STORM_BIOMES } from '../art/stormrijk.js';

const out = process.argv[2];
const keys = ['plain', 'charred', 'towers', 'eye'];
const all = new Img(480 * 2, 270 * 2);
const props = Object.fromEntries(buildStormProps().map(p => [p.name, p.img]));
const place = { plain: ['sr_bush', 'sr_tree', 'sr_fence', 'sr_rune', 'sr_fg_thorns'], charred: ['sr_stump', 'sr_ash', 'sr_tree', 'sr_shrooms', 'sr_fg_thorns'], towers: ['sr_rock1', 'sr_rod', 'sr_lantern', 'sr_rock0', 'sr_fg_shards'], eye: ['sr_crystal', 'sr_rock1', 'sr_rune', 'sr_tuft', 'sr_fg_shards'] };
keys.forEach((k, i) => {
  const L = buildStormLayers(k, 900 + 100 * (i + 1));
  const v = new Img(480, 270);
  v.blit(L.sky, 0, 0); v.blit(L.clouds, -50, 10); v.blit(L.far, -100, 0); v.blit(L.mid, -200, 0); v.blit(L.near, -300, 0);
  const g = buildStormGround(STORM_BIOMES[k]);
  for (let x = 0; x < 480; x += 32) { const idx = x >= 320 && x < 416 ? 4 + ((x - 320) / 32) : (x / 32) % 4; v.blit(g.img.sub(idx * 32, 0, 32, 48), x, 222); }
  const [a, b, c, d, fg] = place[k];
  [[a, 40], [b, 120], [c, 190], [d, 250]].forEach(([n, x]) => v.blit(props[n], x, 227 - props[n].h));
  v.blit(props[fg], 430, 232);
  all.blit(v, (i % 2) * 480, Math.floor(i / 2) * 270);
});
fs.writeFileSync(out, encodePNG(all));
fs.writeFileSync(out.replace('.png', '_props.png'), encodePNG(pack(buildStormProps(), 256).img.scaled(3)));
