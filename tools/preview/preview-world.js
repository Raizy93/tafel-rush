import fs from 'node:fs';
import { encodePNG, Img, pack } from '../lib/raster.js';
import { buildBiomeLayers, buildGroundSheet, buildProps, BIOMES, TILE_W } from '../art/world.js';
const out = process.argv[2];
const keys = ['edge','deep','ruins','dark'];
const all = new Img(480*2, 270*2);
const props = Object.fromEntries(buildProps().map(p=>[p.name,p.img]));
keys.forEach((k,i)=>{
  const L = buildBiomeLayers(k, 100*(i+1));
  const v = new Img(480,270);
  v.blit(L.sky,0,0); v.blit(L.clouds,-50,10); v.blit(L.far,-100,0); v.blit(L.mid,-200,0); v.blit(L.near,-300,0);
  const g = buildGroundSheet(BIOMES[k]);
  for (let x=0;x<480;x+=32){ const t = (x/32)%4; const idx = x>=320&&x<416 ? 4+((x-320)/32) : t; v.blit(g.img.sub(idx*32,0,32,48), x, 222); }
  v.blit(props.bush, 40, 204); v.blit(props.rock1, 120, 210); v.blit(props.flowers0, 200, 214); v.blit(props.sign,250,196);
  v.blit(props[k==='ruins'?'pillar':'stump'], 290, 182); v.blit(props.fg_leaves0, 430, 232);
  all.blit(v, (i%2)*480, Math.floor(i/2)*270);
});
fs.writeFileSync(out, encodePNG(all.scaled(1)));
const pk = pack(buildProps(), 256);
fs.writeFileSync(out.replace('.png','_props.png'), encodePNG(pk.img.scaled(3)));
