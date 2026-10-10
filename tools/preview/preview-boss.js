import fs from 'node:fs';
import { sheet, encodePNG, Img } from '../lib/raster.js';
import { buildBoss, BOSS_FW, BOSS_FH } from '../art/boss.js';
const out = process.argv[2];
const b = buildBoss(process.argv[3] || 'guardian'); // node tools/preview/preview-boss.js uit.png [guardian|frost]
const rows = [[...b.calm.idle.slice(0,3), ...b.calm.hurt], [...b.calm.attack.slice(0,5)], [...b.angry.idle.slice(0,2), ...b.calm.death.slice(0,3)]];
const s = sheet(rows, BOSS_FW, BOSS_FH);
const bg = new Img(s.w, s.h).fill('#3a3560');
bg.blit(s,0,0);
fs.writeFileSync(out, encodePNG(bg.scaled(2)));
