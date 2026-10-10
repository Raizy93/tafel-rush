// Close-up: per pet idle[0], run[1], cheer[midden] naast elkaar, sterk vergroot.
//   node tools/preview/preview-pets-zoom.js uit.png [schaal] [pets,komma,gescheiden]
import fs from 'node:fs';
import { encodePNG, Img } from '../lib/raster.js';
import { buildPet, PET_KINDS, PET_SPECS } from '../art/pets.js';

const [out, sc = '6', only] = process.argv.slice(2);
const kinds = only ? only.split(',') : PET_KINDS;
const CW = 50, CH = 40;
const img = new Img(CW * 3 * Math.min(2, kinds.length), CH * Math.ceil(kinds.length / 2)).fill('#3a3260');
kinds.forEach((k, i) => {
  const a = buildPet(k), S = PET_SPECS[k];
  const fr = [a.idle[0], a.run[1], a.cheer[Math.floor(a.cheer.length / 2) - 1]];
  const ox = (i % 2) * CW * 3, gy = Math.floor(i / 2) * CH + CH - 3;
  img.rect(ox, gy, CW * 3, 1, '#3d8f44');
  fr.forEach((f, c) => img.blit(f, ox + c * CW + CW / 2 - S.anchor[0], gy - S.anchor[1]));
});
fs.writeFileSync(out, encodePNG(img.scaled(+sc)));
