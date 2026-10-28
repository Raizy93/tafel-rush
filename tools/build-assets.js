// ---------------------------------------------------------------------------
// Tafel Rush – asset build.
//   node tools/build-assets.js
// Genereert alle PixelArt sprite sheets/achtergronden als PNG in /assets en
// schrijft assets/atlas.json met frame-maten en animatie-definities.
// De game leest uitsluitend atlas.json + de PNG's; deze tool is alleen nodig
// als je assets wilt aanpassen of uitbreiden.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG, sheet, pack } from './lib/raster.js';
import { P } from './lib/palette.js';
import { CHAR_FW, CHAR_FH, CHAR_ANCHOR } from './art/rig.js';
import { buildHero, KAI_WEAPON_STYLES } from './art/hero.js';
import { buildRanger, MILA_WEAPON_STYLES } from './art/ranger.js';
import { buildTech, NOVA_WEAPON_STYLES } from './art/tech.js';
import * as EN from './art/enemies.js';
import { buildPet, PET_KINDS, PET_SPECS } from './art/pets.js';
import { buildChestKind, CHEST_KINDS, CHEST_FW, CHEST_FH, buildCollectIcons } from './art/chests.js';
import { buildBoss, BOSS_FW, BOSS_FH } from './art/boss.js';
import * as FX from './art/effects.js';
import { buildBiomeLayers, buildGroundSheet, buildProps, BIOMES, TILE_W, TILE_H } from './art/world.js';
import { buildFrostLayers, buildFrostGround, buildFrostProps, FROST_BIOMES } from './art/frostpeak.js';
import * as FE from './art/frost_enemies.js';
import { buildStormLayers, buildStormGround, buildStormProps, STORM_BIOMES } from './art/stormrijk.js';
import * as SE from './art/storm_enemies.js';
import { buildDragon, DRAGON_FW, DRAGON_FH } from './art/dragon.js';
import { buildPanels, buildIcons } from './art/ui.js';
import { buildAppIcon } from './art/appicon.js';
import { buildWorldMap } from './art/worldmap.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = path.join(ROOT, 'assets');
const atlas = { version: 1, sheets: {}, atlases: {}, worlds: {} };
let bytes = 0;

function write(rel, img) {
  const file = path.join(A, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buf = encodePNG(img);
  fs.writeFileSync(file, buf);
  bytes += buf.length;
  return 'assets/' + rel.replace(/\\/g, '/');
}

/** Sprite sheet met benoemde animatie-rijen. */
function addSheet(id, rel, rowsByAnim, fw, fh, meta = {}) {
  if (atlas.sheets[id]) throw new Error('Dubbele sheet-naam: ' + id + ' (kies een unieke naam)');
  const rows = [], anims = {};
  for (const [name, def] of Object.entries(rowsByAnim)) {
    anims[name] = { row: rows.length, frames: def.frames.length, fps: def.fps, loop: def.loop ?? true };
    rows.push(def.frames);
  }
  atlas.sheets[id] = { src: write(rel, sheet(rows, fw, fh)), fw, fh, anims, ...meta };
}

// --- speelbare characters (gedeelde rig: zelfde frame, schaal en ankerpunt) --------
// Per character één sheet per wapen-tier (w0 = startwapen). Ids: hero_kai, hero_kai_w1 …
// (koppeling wapen → sheet staat in js/data/weapons.js)
for (const [id, file, build, styles] of [
  ['hero_kai', 'hero_kai', buildHero, KAI_WEAPON_STYLES],
  ['hero_mila', 'ranger_mila', buildRanger, MILA_WEAPON_STYLES],
  ['hero_nova', 'tech_nova', buildTech, NOVA_WEAPON_STYLES],
]) {
  for (const tier of ['w0', 'w1', 'w2', 'w3']) {
    const { rows, anims } = build(styles[tier]);
    const sid = tier === 'w0' ? id : id + '_' + tier;
    const f = tier === 'w0' ? file : file + '_' + tier;
    atlas.sheets[sid] = { src: write('characters/' + f + '.png', sheet(rows, CHAR_FW, CHAR_FH)), fw: CHAR_FW, fh: CHAR_FH, anims, anchor: CHAR_ANCHOR };
  }
}

// --- pets / companions (cosmetisch; framemaat verschilt per pet) ------------------------
for (const kind of PET_KINDS) {
  const a = buildPet(kind), S = PET_SPECS[kind];
  const big = a.idle.length > 4; // meer frames = zelfde tempo, vloeiender
  addSheet('pet_' + kind, 'pets/pet_' + kind + '.png', {
    idle: { frames: a.idle, fps: big ? 6 * a.idle.length / 4 : 6 },
    run: { frames: a.run, fps: 12 * a.run.length / 6 },
    cheer: { frames: a.cheer, fps: 10 * a.cheer.length / 4 },
  }, S.fw, S.fh, { anchor: S.anchor });
}

// --- kisten (petboek) -------------------------------------------------------------------
for (const kind of CHEST_KINDS) {
  const a = buildChestKind(kind);
  addSheet('chest_' + kind, 'ui/chest_' + kind + '.png', {
    idle: { frames: a.idle, fps: 8 },
    shake: { frames: a.shake, fps: 18 },
    open: { frames: a.open, fps: 16, loop: false },
  }, CHEST_FW, CHEST_FH, { anchor: [20, 34] });
}

// --- vijanden --------------------------------------------------------------------
const enemyAnims = (s, moveFps = 10) => ({
  move: { frames: s.move, fps: moveFps },
  attack: { frames: s.attack, fps: 14, loop: false },
  hurt: { frames: s.hurt, fps: 1, loop: false },
});
const anchor = [16, 30];
addSheet('slime_green', 'enemies/slime_green.png', enemyAnims(EN.buildSlime(P.slimeGreen)), 32, 32, { anchor });
addSheet('slime_blue', 'enemies/slime_blue.png', enemyAnims(EN.buildSlime(P.slimeBlue)), 32, 32, { anchor });
addSheet('slime_purple', 'enemies/slime_purple.png', enemyAnims(EN.buildSlime(P.slimePurple)), 32, 32, { anchor });
addSheet('mushroom', 'enemies/mushroom.png', enemyAnims(EN.buildMushroom(), 8), 32, 32, { anchor });
addSheet('goblin', 'enemies/goblin.png', enemyAnims(EN.buildGoblin(), 12), 32, 32, { anchor });
addSheet('bat', 'enemies/bat.png', enemyAnims(EN.buildBat(P.bat), 12), 32, 32, { anchor });
addSheet('bat_red', 'enemies/bat_red.png', enemyAnims(EN.buildBat(['#3a0e1e', '#6e1a30', '#a8304a', '#e0607a']), 12), 32, 32, { anchor });
addSheet('rock', 'enemies/rock_critter.png', enemyAnims(EN.buildRock(), 7), 32, 32, { anchor });
addSheet('chest', 'enemies/chest.png', enemyAnims(EN.buildChest(), 6), 32, 32, { anchor });
addSheet('beetle', 'enemies/beetle_armored.png', enemyAnims(EN.buildBeetle(), 8), 32, 32, { anchor });
// Frostpeak
addSheet('slime_snow', 'enemies/slime_snow.png', enemyAnims(EN.buildSlime(FE.SLIME_SNOW)), 32, 32, { anchor });
addSheet('slime_ice', 'enemies/slime_ice.png', enemyAnims(EN.buildSlime(FE.SLIME_ICE)), 32, 32, { anchor });
addSheet('bat_ice', 'enemies/bat_ice.png', enemyAnims(EN.buildBat(FE.BAT_ICE), 12), 32, 32, { anchor });
addSheet('penguin', 'enemies/penguin.png', enemyAnims(FE.buildPenguin(), 10), 32, 32, { anchor });
addSheet('yeti', 'enemies/yeti.png', enemyAnims(FE.buildYeti(), 10), 32, 32, { anchor });
addSheet('icerock', 'enemies/ice_rock.png', enemyAnims(FE.buildIceRock(), 7), 32, 32, { anchor });
// Stormrijk (allemaal nieuw getekend)
addSheet('snail', 'enemies/storm_snail.png', enemyAnims(SE.buildSnail(), 8), 32, 32, { anchor });
addSheet('vonkje', 'enemies/vonkje.png', enemyAnims(SE.buildSpark(), 12), 32, 32, { anchor });
addSheet('crow', 'enemies/storm_crow.png', enemyAnims(SE.buildCrow(), 12), 32, 32, { anchor });
addSheet('toad', 'enemies/thunder_toad.png', enemyAnims(SE.buildToad(), 10), 32, 32, { anchor });
addSheet('stormcloud', 'enemies/storm_cloud.png', enemyAnims(SE.buildStormCloud(), 10), 32, 32, { anchor });
addSheet('crab', 'enemies/storm_crab.png', enemyAnims(SE.buildCrab(), 8), 32, 32, { anchor });

// --- bosses (zelfde skelet, eigen stijl) -----------------------------------------------
for (const [id, style, file] of [['boss_guardian', 'guardian', 'boss_guardian'], ['boss_frost', 'frost', 'boss_icegiant']]) {
  const b = buildBoss(style);
  const defs = {};
  for (const mode of ['calm', 'angry']) {
    defs[mode + '_idle'] = { frames: b[mode].idle, fps: 6 };
    defs[mode + '_attack'] = { frames: b[mode].attack, fps: 12, loop: false };
    defs[mode + '_hurt'] = { frames: b[mode].hurt, fps: 14, loop: false };
    defs[mode + '_death'] = { frames: b[mode].death, fps: 4, loop: false };
  }
  addSheet(id, 'enemies/' + file + '.png', defs, BOSS_FW, BOSS_FH, { anchor: [66, 108] });
}
{
  // De Donderdraak: eigen tekening, zelfde maten/animaties als de andere bosses
  const b = buildDragon();
  const defs = {};
  for (const mode of ['calm', 'angry']) {
    defs[mode + '_idle'] = { frames: b[mode].idle, fps: 6 };
    defs[mode + '_attack'] = { frames: b[mode].attack, fps: 10, loop: false };
    defs[mode + '_hurt'] = { frames: b[mode].hurt, fps: 14, loop: false };
    defs[mode + '_death'] = { frames: b[mode].death, fps: 4, loop: false };
  }
  addSheet('boss_storm', 'enemies/boss_thunderdragon.png', defs, DRAGON_FW, DRAGON_FH, { anchor: [66, 108] });
}

// --- effecten ---------------------------------------------------------------------
// wereldkaart: één beeld van 480x270 (pad, plekken en held tekent de game zelf)
addSheet('worldmap', 'ui/worldmap.png', { idle: { frames: [buildWorldMap()], fps: 1 } }, 480, 270, { anchor: [0, 0] });
addSheet('coin', 'effects/coin.png', { spin: { frames: FX.buildCoin(), fps: 12 } }, 12, 12, { anchor: [6, 6] });
addSheet('slash', 'effects/slash.png', {
  normal: { frames: FX.buildSlash(P.energy), fps: 24, loop: false },
  crit: { frames: FX.buildSlash(P.gold.concat(['#ffffff'])), fps: 24, loop: false },
  ultra: { frames: FX.buildSlash(P.ultra), fps: 24, loop: false },
  fire: { frames: FX.buildSlash(P.fire), fps: 24, loop: false },
}, 48, 40, { anchor: [16, 20] });
addSheet('arrow', 'effects/arrow.png', {
  normal: { frames: FX.buildArrow(['#2a6a3a', '#5fd65a', '#c2ff9a']), fps: 16 },
  crit: { frames: FX.buildArrow(P.gold), fps: 16 },
  ultra: { frames: FX.buildArrow(P.ultra), fps: 16 },
  fire: { frames: FX.buildArrow(P.fire), fps: 16 },
}, 24, 8, { anchor: [20, 4] });
addSheet('plasma', 'effects/plasma.png', {
  normal: { frames: FX.buildPlasma(P.energy), fps: 16 },
  crit: { frames: FX.buildPlasma(P.gold.concat(['#ffffff'])), fps: 16 },
  ultra: { frames: FX.buildPlasma(P.ultra), fps: 16 },
  fire: { frames: FX.buildPlasma(P.fire), fps: 16 },
}, 16, 16, { anchor: [8, 8] });

// Aanvalseffecten per wapen-tier: alleen de 'normal'-variant krijgt de wapenkleur,
// crit/ultra/fire blijven herkenbaar gelijk. Ids: slash_w1, arrow_w2, plasma_w3 …
const WEAPON_FX = {
  slash: { build: FX.buildSlash, fw: 48, fh: 40, anchor: [16, 20], fps: 24, loop: false, crit: P.gold.concat(['#ffffff']),
    tiers: { w1: ['#3c4a6b', '#9ab0d0', '#e0ecff', '#ffffff'], w2: ['#3a1e6a', '#7a4ae0', '#c8a0ff', '#ffffff'], w3: P.fire } },
  arrow: { build: FX.buildArrow, fw: 24, fh: 8, anchor: [20, 4], fps: 16, loop: true, crit: P.gold,
    tiers: { w1: ['#4a5068', '#9a9ab0', '#e0e4f0'], w2: ['#1f6a3a', '#5fd65a', '#c2ff9a', '#ffffff'], w3: P.gold.concat(['#ffffff']) } },
  plasma: { build: FX.buildPlasma, fw: 16, fh: 16, anchor: [8, 8], fps: 16, loop: true, crit: P.gold.concat(['#ffffff']),
    tiers: { w1: ['#8a3a0e', '#e0701e', '#ff9a2a', '#fff0c0'], w2: ['#4a1e8a', '#8a4ae0', '#c890ff', '#ffffff'], w3: ['#c8811e', '#ffc93c', '#fff1a0', '#ffffff'] } },
};
for (const [fx, d] of Object.entries(WEAPON_FX)) {
  for (const [tier, ramp] of Object.entries(d.tiers)) {
    addSheet(fx + '_' + tier, 'effects/' + fx + '_' + tier + '.png', {
      normal: { frames: d.build(ramp), fps: d.fps, loop: d.loop },
      crit: { frames: d.build(d.crit), fps: d.fps, loop: d.loop },
      ultra: { frames: d.build(P.ultra), fps: d.fps, loop: d.loop },
      fire: { frames: d.build(P.fire), fps: d.fps, loop: d.loop },
    }, d.fw, d.fh, { anchor: d.anchor });
  }
}
addSheet('spark', 'effects/spark.png', {
  white: { frames: FX.buildSpark(['#8ff2ff', '#ffffff']), fps: 24, loop: false },
  gold: { frames: FX.buildSpark(['#ff9a2a', '#ffe66a', '#ffffff']), fps: 24, loop: false },
  red: { frames: FX.buildSpark(['#c21f3a', '#ff8a6a', '#ffffff']), fps: 24, loop: false },
}, 24, 24, { anchor: [12, 12] });
addSheet('poof', 'effects/poof.png', { poof: { frames: FX.buildPoof(), fps: 18, loop: false } }, 32, 32, { anchor: [16, 16] });
addSheet('dust', 'effects/dust.png', { dust: { frames: FX.buildDust(), fps: 14, loop: false } }, 12, 10, { anchor: [6, 9] });
addSheet('twinkle', 'effects/twinkle.png', { twinkle: { frames: FX.buildTwinkle(), fps: 12, loop: false } }, 9, 9, { anchor: [4, 4] });
addSheet('flame', 'effects/flame.png', {
  fire: { frames: FX.buildFlame(P.fire), fps: 12 },
  ultra: { frames: FX.buildFlame(['#6a1ea8', '#c040ff', '#ff7ae0', '#ffd0ff', '#ffffff']), fps: 12 },
  blue: { frames: FX.buildFlame(['#1e3a9c', '#2f7ae6', '#4fd0ff', '#b4f4ff', '#ffffff']), fps: 12 },
}, 16, 20, { anchor: [8, 18] });

// --- wereld -------------------------------------------------------------------------
atlas.worlds.greenwood = { biomes: {} };
['edge', 'deep', 'ruins', 'dark'].forEach((key, i) => {
  const L = buildBiomeLayers(key, 100 * (i + 1));
  const g = buildGroundSheet(BIOMES[key]);
  const base = `world/greenwood/${key}/`;
  atlas.worlds.greenwood.biomes[key] = {
    sky: write(base + 'sky.png', L.sky),
    clouds: write(base + 'clouds.png', L.clouds),
    far: write(base + 'far.png', L.far),
    mid: write(base + 'mid.png', L.mid),
    near: write(base + 'near.png', L.near),
    ground: { src: write(base + 'ground.png', g.img), tw: TILE_W, th: TILE_H, count: g.count, bridge: g.bridge },
  };
});
atlas.worlds.frostpeak = { biomes: {} };
['lake', 'caves', 'pass', 'summit'].forEach((key, i) => {
  const L = buildFrostLayers(key, 500 + 100 * (i + 1));
  const g = buildFrostGround(FROST_BIOMES[key]);
  const base = `world/frostpeak/${key}/`;
  atlas.worlds.frostpeak.biomes[key] = {
    sky: write(base + 'sky.png', L.sky),
    clouds: write(base + 'clouds.png', L.clouds),
    far: write(base + 'far.png', L.far),
    mid: write(base + 'mid.png', L.mid),
    near: write(base + 'near.png', L.near),
    ground: { src: write(base + 'ground.png', g.img), tw: TILE_W, th: TILE_H, count: g.count, bridge: g.bridge },
  };
});
atlas.worlds.stormrijk = { biomes: {} };
['plain', 'charred', 'towers', 'eye'].forEach((key, i) => {
  const L = buildStormLayers(key, 900 + 100 * (i + 1));
  const g = buildStormGround(STORM_BIOMES[key]);
  const base = `world/stormrijk/${key}/`;
  atlas.worlds.stormrijk.biomes[key] = {
    sky: write(base + 'sky.png', L.sky),
    clouds: write(base + 'clouds.png', L.clouds),
    far: write(base + 'far.png', L.far),
    mid: write(base + 'mid.png', L.mid),
    near: write(base + 'near.png', L.near),
    ground: { src: write(base + 'ground.png', g.img), tw: TILE_W, th: TILE_H, count: g.count, bridge: g.bridge },
  };
});
{
  // één props-atlas voor alle werelden (prefix fp_ = Frostpeak, sr_ = Stormrijk)
  const pk = pack([...buildProps(), ...buildFrostProps(), ...buildStormProps()], 256);
  atlas.atlases.props = { src: write('world/greenwood/props.png', pk.img), rects: pk.rects };
}

// --- UI ---------------------------------------------------------------------------
{
  const panels = buildPanels();
  const items = [...Object.entries(panels).map(([name, img]) => ({ name, img })), ...buildIcons(), ...buildCollectIcons()];
  const pk = pack(items, 128);
  atlas.atlases.ui = { src: write('ui/ui.png', pk.img), rects: pk.rects, slice: 8 };
  // favicon: de munt, 3x vergroot
  write('ui/favicon.png', FX.buildCoin()[0].scaled(3));
  // app-iconen (web-app op het beginscherm; later ook voor de App Store)
  const icon = buildAppIcon();
  write('app/icon-512.png', icon.scaled(16));
  write('app/icon-192.png', icon.scaled(6));
  write('app/apple-touch-icon.png', icon.scaled(6));
  write('app/icon-1024.png', icon.scaled(32)); // formaat dat de App Store vraagt
}

fs.writeFileSync(path.join(A, 'atlas.json'), JSON.stringify(atlas, null, 1));
console.log(`Assets gegenereerd: ${Object.keys(atlas.sheets).length} sheets, ${(bytes / 1024).toFixed(1)} KB PNG.`);
