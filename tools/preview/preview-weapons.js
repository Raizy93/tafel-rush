// Toont per character alle 4 wapen-tiers (idle + 2 attack-frames + run), met grondlijn.
//   node tools/preview/preview-weapons.js uit.png
import fs from 'node:fs';
import { encodePNG, Img } from '../lib/raster.js';
import { buildHero, KAI_WEAPON_STYLES } from '../art/hero.js';
import { buildRanger, MILA_WEAPON_STYLES } from '../art/ranger.js';
import { buildTech, NOVA_WEAPON_STYLES } from '../art/tech.js';
import { CHAR_FW, CHAR_FH, CHAR_GROUND } from '../art/rig.js';

const out = process.argv[2];
const sets = [[buildHero, KAI_WEAPON_STYLES], [buildRanger, MILA_WEAPON_STYLES], [buildTech, NOVA_WEAPON_STYLES]];
const pick = [['idle', 0], ['attack', 1], ['attack', 2], ['run', 2]];
const rows = 3 * 4, cols = pick.length;
const img = new Img(cols * CHAR_FW + 8, rows * CHAR_FH).fill('#7cc4e8');
let r = 0;
for (const [build, styles] of sets) {
  for (const key of ['w0', 'w1', 'w2', 'w3']) {
    const { rows: fr, anims } = build(styles[key]);
    img.rect(0, r * CHAR_FH, 8, CHAR_FH, ['#5a5a5a', '#9a9ab0', '#c890ff', '#ffc93c'][+key[1]]);
    pick.forEach(([a, f], c) => {
      img.rect(8 + c * CHAR_FW, r * CHAR_FH + CHAR_GROUND + 1, CHAR_FW, 2, '#3d8f44');
      img.blit(fr[anims[a].row][f], 8 + c * CHAR_FW, r * CHAR_FH);
    });
    r++;
  }
}
fs.writeFileSync(out, encodePNG(img.scaled(3)));
