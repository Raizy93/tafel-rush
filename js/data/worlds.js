// ---------------------------------------------------------------------------
// Wereld-definities. Een wereld = een reeks biomen (fases) + vijanden, props,
// (enemies = [type, gewicht]; welke HP-klasse spawnt bepaalt CONFIG.spawn),
// ambient-effecten, muziek en een boss. De tafels blijven overal hetzelfde:
// een wereld is visuele beloning, geen moeilijkheidsgraad.
//
//   phases   voortgang (0..100) → bioom + naam (banner + HUD-balk)
//   color    kleur van het bioom in de HUD-voortgangsbalk
//   unlock   { type: 'free' } of { type: 'boss', world, label } – zie systems/Worlds.js
//
// Nieuwe wereld toevoegen:
//   1) assets genereren (zie tools/art/world.js en tools/art/frostpeak.js) → atlas.worlds.<id>
//   2) hier een definitie toevoegen met dezelfde structuur + in WORLD_ORDER zetten
//   3) vijanden in data/enemies.js, boss in BOSSES
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';

export const WORLDS = {
  greenwood: {
    id: 'greenwood',
    name: 'GREENWOOD',
    desc: 'HET BETOVERDE BOS',
    music: 'run',
    bossMusic: 'boss',
    boss: 'guardian',
    unlock: { type: 'free' },
    color: '#c8f0c0',
    phases: CONFIG.run.phases,
    biomes: {
      edge: {
        name: 'BOSRAND', color: '#6cc44a',
        enemies: [['slime_green', 4], ['slime_blue', 2], ['mushroom', 3], ['beetle', 1]],
        props: { back: [['bush', 4], ['flowers0', 3], ['flowers1', 2], ['rock0', 2], ['rock1', 1], ['fern', 2], ['stump', 1], ['sign', 0.4], ['tuft', 4], ['shrooms', 1]], front: ['fg_leaves0'] },
        bridgeChance: 0.07,
        ambient: 'pollen',
        tint: null,
      },
      deep: {
        name: 'DIEPER BOS', color: '#2f9a6a',
        enemies: [['slime_green', 2], ['bat', 2], ['mushroom', 3], ['goblin', 3], ['beetle', 2]],
        props: { back: [['bush_deep', 4], ['fern', 4], ['shrooms', 2], ['log', 1], ['rock0', 1], ['stump', 1.5], ['tuft', 3]], front: ['fg_leaves0'] },
        bridgeChance: 0.06,
        ambient: 'leaves',
        rays: true,
      },
      ruins: {
        name: 'OUDE RUINES', color: '#e0a070',
        enemies: [['slime_blue', 2], ['bat', 2], ['goblin', 3], ['rock', 3], ['beetle', 1]],
        props: { back: [['pillar', 2], ['rock1', 2], ['bush_ruins', 3], ['crystal', 1], ['arch', 0.5], ['tuft', 2], ['flowers2', 1]], front: ['fg_leaves0'] },
        bridgeChance: 0.03,
        ambient: 'dust',
      },
      dark: {
        name: 'DONKER BOS', color: '#7a5ac8',
        enemies: [['bat_red', 3], ['slime_purple', 3], ['goblin', 2], ['rock', 2], ['beetle', 2]],
        props: { back: [['bush_dark', 4], ['glowshrooms', 3], ['lantern', 1], ['crystal', 1.5], ['rock2', 2], ['stump', 1]], front: ['fg_leaves1'] },
        bridgeChance: 0.05,
        ambient: 'fireflies',
      },
    },
  },

  frostpeak: {
    id: 'frostpeak',
    name: 'FROSTPEAK',
    desc: 'DE BEVROREN BERGEN',
    music: 'frost',
    bossMusic: 'frostBoss',
    boss: 'icegiant',
    unlock: { type: 'boss', world: 'greenwood', label: 'VERSLA DE WOUDWACHTER' },
    color: '#b4e4ff',
    phases: [
      { at: 0, biome: 'lake', name: 'BEVROREN MEER' },
      { at: 25, biome: 'caves', name: 'IJSGROTTEN' },
      { at: 50, biome: 'pass', name: 'BERGPAS' },
      { at: 75, biome: 'summit', name: 'NOORDERLICHT' },
    ],
    biomes: {
      lake: {
        name: 'BEVROREN MEER', color: '#8ad0ff',
        enemies: [['slime_snow', 4], ['bat_ice', 1], ['penguin', 3], ['icerock', 1]],
        props: { back: [['fp_snow0', 3], ['fp_snow1', 2], ['fp_pine', 2], ['fp_rock0', 2], ['fp_tuft', 4], ['fp_snowman', 0.6], ['fp_igloo', 0.35], ['fp_fence', 0.8]], front: ['fp_fg_branch'] },
        bridgeChance: 0.07,
        ambient: 'snow',
      },
      caves: {
        name: 'IJSGROTTEN', color: '#3a9ae8',
        enemies: [['slime_snow', 2], ['bat_ice', 3], ['slime_ice', 3], ['icerock', 2]],
        props: { back: [['fp_crystal0', 3], ['fp_crystal1', 2], ['fp_icicle', 3], ['fp_lantern', 0.8], ['fp_rock0', 1]], front: ['fp_fg_ice'] },
        bridgeChance: 0.05,
        ambient: 'sparkle',
      },
      pass: {
        name: 'BERGPAS', color: '#c8d4e8',
        enemies: [['slime_snow', 2], ['bat_ice', 1], ['penguin', 2], ['yeti', 3], ['icerock', 2]],
        props: { back: [['fp_rock0', 3], ['fp_rock1', 2], ['fp_cairn', 1.5], ['fp_fence', 1], ['fp_tuft', 3], ['fp_snow0', 2]], front: ['fp_fg_branch'] },
        bridgeChance: 0.04,
        ambient: 'blizzard',
      },
      summit: {
        name: 'NOORDERLICHT', color: '#7affc8',
        enemies: [['slime_snow', 1], ['bat_ice', 3], ['slime_ice', 2], ['yeti', 3], ['icerock', 2]],
        props: { back: [['fp_crystal0', 2], ['fp_crystal1', 1.5], ['fp_pine', 2], ['fp_snow0', 3], ['fp_lantern', 1], ['fp_snowman', 0.4]], front: ['fp_fg_ice'] },
        bridgeChance: 0.04,
        ambient: 'aurora',
        aurora: true,
      },
    },
  },

  stormrijk: {
    id: 'stormrijk',
    name: 'STORMRIJK',
    desc: 'HET RIJK VAN DONDER EN BLIKSEM',
    music: 'storm',
    bossMusic: 'stormBoss',
    boss: 'thunderdragon',
    unlock: { type: 'boss', world: 'frostpeak', label: 'VERSLA DE IJSREUS' },
    color: '#ffe24a',
    phases: [
      { at: 0, biome: 'plain', name: 'VERDORDE VLAKTE' },
      { at: 25, biome: 'charred', name: 'BLIKSEMWOUD' },
      { at: 50, biome: 'towers', name: 'STORMTORENS' },
      { at: 75, biome: 'eye', name: 'OOG VAN DE STORM' },
    ],
    // lightning: [min, max] seconden tussen bliksemflitsen (bewust zacht en niet te vaak)
    biomes: {
      plain: {
        name: 'VERDORDE VLAKTE', color: '#9a7ae0',
        enemies: [['snail', 4], ['crow', 2], ['toad', 3], ['crab', 1]],
        props: { back: [['sr_bush', 3], ['sr_tree', 2], ['sr_fence', 1], ['sr_rune', 0.6], ['sr_tuft', 4], ['sr_rock0', 1.5], ['sr_rod', 0.6]], front: ['sr_fg_thorns'] },
        bridgeChance: 0.06,
        ambient: 'rain',
        lightning: [5, 9],
      },
      charred: {
        name: 'BLIKSEMWOUD', color: '#ff7a2a',
        enemies: [['snail', 2], ['spark', 3], ['toad', 3], ['crab', 2]],
        props: { back: [['sr_stump', 3], ['sr_ash', 3], ['sr_tree', 2], ['sr_shrooms', 2], ['sr_rock0', 1]], front: ['sr_fg_thorns'] },
        bridgeChance: 0.04,
        ambient: 'embers',
        lightning: [6, 11],
      },
      towers: {
        name: 'STORMTORENS', color: '#6ad8ff',
        enemies: [['snail', 1], ['spark', 3], ['crow', 2], ['stormcloud', 3], ['crab', 2]],
        props: { back: [['sr_rock1', 2], ['sr_rod', 2], ['sr_lantern', 1], ['sr_rock0', 2], ['sr_rune', 1], ['sr_tuft', 2]], front: ['sr_fg_shards'] },
        bridgeChance: 0.05,
        ambient: 'static',
        lightning: [4, 8],
      },
      eye: {
        name: 'OOG VAN DE STORM', color: '#d890ff',
        enemies: [['spark', 2], ['crow', 3], ['stormcloud', 3], ['toad', 2], ['crab', 2]],
        props: { back: [['sr_crystal', 3], ['sr_rock1', 2], ['sr_rune', 1.5], ['sr_tuft', 2]], front: ['sr_fg_shards'] },
        bridgeChance: 0.04,
        ambient: 'rain',
        lightning: [3, 6],
        boltColor: '#d890ff',
      },
    },
  },
};

export const WORLD_ORDER = ['greenwood', 'frostpeak', 'stormrijk'];

// Vijandtypes en bosses staan in data/enemies.js (EnemyConfig).
export { ENEMY_TYPES, BOSSES } from './enemies.js';
