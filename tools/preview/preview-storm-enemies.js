// Stormrijk-vijanden: per rij move | attack | hurt, vergroot.
//   node tools/preview/preview-storm-enemies.js uit.png
import fs from 'node:fs';
import { encodePNG, Img } from '../lib/raster.js';
import { buildSnail, buildSpark, buildCrow, buildToad, buildStormCloud, buildCrab } from '../art/storm_enemies.js';
const rows = [buildSnail(), buildSpark(), buildCrow(), buildToad(), buildStormCloud(), buildCrab()];
const img = new Img(12 * 32, rows.length * 32).fill('#3a3050');
rows.forEach((a, r) => [...a.move, ...a.attack, ...a.hurt].forEach((f, c) => img.blit(f, c * 32, r * 32)));
fs.writeFileSync(process.argv[2], encodePNG(img.scaled(4)));
