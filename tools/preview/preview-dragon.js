// De Donderdraak: idle | aanval | geraakt/dood (kalm + boos).
//   node tools/preview/preview-dragon.js uit.png
import fs from 'node:fs';
import { sheet, encodePNG, Img } from '../lib/raster.js';
import { buildDragon, DRAGON_FW, DRAGON_FH } from '../art/dragon.js';
const b = buildDragon();
const rows = [[...b.calm.idle.slice(0, 3), ...b.calm.hurt], [...b.calm.attack.slice(0, 5)], [...b.angry.idle.slice(0, 2), b.angry.attack[3], ...b.calm.death.slice(1, 3)]];
const s = sheet(rows, DRAGON_FW, DRAGON_FH);
const bg = new Img(s.w, s.h).fill('#5a4676');
bg.blit(s, 0, 0);
fs.writeFileSync(process.argv[2], encodePNG(bg.scaled(2)));
