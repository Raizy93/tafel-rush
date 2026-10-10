// Toont alle characters per animatie onder elkaar, met grondlijn en ankerlijn.
import fs from 'node:fs';
import { sheet, encodePNG, Img } from '../lib/raster.js';
import { buildHero } from '../art/hero.js';
import { buildRanger } from '../art/ranger.js';
import { buildTech } from '../art/tech.js';
import { CHAR_FW, CHAR_FH, CHAR_GROUND, CHAR_ANCHOR } from '../art/rig.js';
const out = process.argv[2];
const only = process.argv[3]; // optioneel: alleen deze animatie
const chars = [buildHero(), buildRanger(), buildTech()];
const anims = Object.keys(chars[0].anims).filter(a => !only || a === only);
const rows = [];
for (const a of anims) for (const c of chars) rows.push(c.rows[c.anims[a].row]);
const s = sheet(rows, CHAR_FW, CHAR_FH);
const bg = new Img(s.w, s.h).fill('#7cc4e8');
for (let y = 0; y < s.h; y += CHAR_FH) {
  bg.rect(0, y + CHAR_GROUND + 1, s.w, 2, '#3d8f44');
  if ((y / CHAR_FH) % 3 === 0) bg.rect(0, y, s.w, 1, '#ff3a3a');
  for (let x = 0; x < s.w; x += CHAR_FW) bg.rect(x + CHAR_ANCHOR[0], y + CHAR_GROUND + 1, 1, 2, '#ffff00');
}
bg.blit(s, 0, 0);
fs.writeFileSync(out, encodePNG(bg.scaled(only ? 4 : 2)));
