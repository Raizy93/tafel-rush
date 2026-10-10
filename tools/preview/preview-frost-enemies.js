// Frostpeak-vijanden: per rij move | attack | hurt, vergroot.
//   node tools/preview/preview-frost-enemies.js uit.png
import fs from 'node:fs';
import { encodePNG, Img } from '../lib/raster.js';
import { buildSlime, buildBat } from '../art/enemies.js';
import { buildPenguin, buildYeti, buildIceRock, SLIME_SNOW, SLIME_ICE, BAT_ICE } from '../art/frost_enemies.js';
const rows = [buildSlime(SLIME_SNOW), buildSlime(SLIME_ICE), buildBat(BAT_ICE), buildPenguin(), buildYeti(), buildIceRock()];
const img = new Img(12 * 32, rows.length * 32).fill('#b8d0e8');
rows.forEach((a, r) => [...a.move, ...a.attack, ...a.hurt].forEach((f, c) => img.blit(f, c * 32, r * 32)));
fs.writeFileSync(process.argv[2], encodePNG(img.scaled(4)));
