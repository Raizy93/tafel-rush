// Toont alle pets (idle | run | cheer) op ware grootte-verhouding, vergroot, met grondlijn.
//   node tools/preview/preview-pets.js uit.png [schaal]
import fs from 'node:fs';
import { encodePNG, Img } from '../lib/raster.js';
import { buildPet, PET_KINDS, PET_SPECS } from '../art/pets.js';

const out = process.argv[2];
const scale = +(process.argv[3] || 4);
const CELL_W = 48, CELL_H = 40;
const rows = PET_KINDS.map(k => ({ k, a: buildPet(k), S: PET_SPECS[k] }));
const cols = Math.max(...rows.map(r => r.a.idle.length + r.a.run.length + r.a.cheer.length)) + 2;
const img = new Img(cols * CELL_W, rows.length * CELL_H).fill('#2a2248');
rows.forEach(({ a, S }, r) => {
  const frames = [...a.idle, null, ...a.run, null, ...a.cheer];
  const gy = r * CELL_H + CELL_H - 3;
  img.rect(0, gy, cols * CELL_W, 1, '#3d8f44');
  frames.forEach((f, c) => { if (f) img.blit(f, c * CELL_W + CELL_W / 2 - S.anchor[0], gy - S.anchor[1]); });
});
fs.writeFileSync(out, encodePNG(img.scaled(scale)));
