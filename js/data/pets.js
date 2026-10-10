// ---------------------------------------------------------------------------
// Pets / companions – PUUR cosmetisch: geen invloed op damage, coins of het
// rekenen. Ze rennen/vliegen achter je held aan en juichen bij combo-mijlpalen
// en de overwinning. Je vindt ze in KISTEN (zie data/chests.js); kopen kan niet.
//
//   rarity  common | rare | epic | legendary – bepaalt de kans in een kist
//           én hoe spectaculair de pet is (grootte, animatie, effecten)
//   sheet   sprite sheet (assets/pets/*.png, rijen idle/run/cheer)
//   flying  zweeft (height = hoogte boven de grond), anders loopt hij
//   follow  afstand achter de held (px)
//   fx      live effecten (js/entities/PetFx.js):
//           glow  { color, r }                    lichtgloed achter de pet
//           trail { colors, rate, … }             spoor van deeltjes
//           cheer { colors, count, speed }        uitbarsting bij juichen
//   world   (alleen wereld-pets) de wereld waar je hem vindt: alleen in de
//           wereldkist van die wereld (boss verslaan) – zie data/chests.js
// Nieuwe pet: tekenen in tools/art/pets.js of world_pets.js (+ specs), dan hier
// toevoegen en in PET_ORDER of WORLD_PET_ORDER zetten. De build pakt hem op.
// ---------------------------------------------------------------------------

export const RARITIES = {
  common: { id: 'common', name: 'GEWOON', color: '#d8d0f0', frame: '#8a84a0', order: 0 },
  rare: { id: 'rare', name: 'ZELDZAAM', color: '#6ac0ff', frame: '#2f7ae6', order: 1 },
  epic: { id: 'epic', name: 'EPISCH', color: '#d0a0ff', frame: '#8a4ae0', order: 2 },
  legendary: { id: 'legendary', name: 'LEGENDARISCH', color: '#ffc93c', frame: '#ff9a2a', order: 3 },
};
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

export const PETS = {
  fox: {
    id: 'fox', name: 'VOSJE', rarity: 'common', sheet: 'pet_fox', flying: false, height: 0, follow: 26,
    desc: 'RENT VROLIJK ACHTER JE AAN',
  },
  owl: {
    id: 'owl', name: 'LUCHTUIL', rarity: 'common', sheet: 'pet_owl', flying: true, height: 30, follow: 22,
    desc: 'VLIEGT OVER JE SCHOUDER',
  },
  slime: {
    id: 'slime', name: 'BLAADJESSLIJM', rarity: 'common', sheet: 'pet_slime', flying: false, height: 0, follow: 24,
    desc: 'STUITERT ACHTER JE AAN',
  },
  dragon: {
    id: 'dragon', name: 'GLOEIDRAAKJE', rarity: 'rare', sheet: 'pet_dragon', flying: true, height: 32, follow: 26,
    desc: 'SPUWT VUURTJES BIJ COMBO\'S',
    fx: { trail: { colors: ['#ff9a2a', '#ffe66a', '#e0481e'], rate: 7, vy: 10, life: 0.6, from: [-12, 4] }, cheer: { colors: ['#ff9a2a', '#ffe66a', '#fffbe0'], count: 14, speed: 70 } },
  },
  wisp: {
    id: 'wisp', name: 'DWAALLICHTJE', rarity: 'rare', sheet: 'pet_wisp', flying: true, height: 28, follow: 24,
    desc: 'ZWEEFT EN GLINSTERT ZACHTJES',
    fx: { glow: { color: '#6ac0ff', r: 10, alpha: 0.22 }, trail: { colors: ['#a8e0ff', '#ffffff', '#4fa0ff'], rate: 8, vy: -6, life: 0.7, from: [-10, -10] }, cheer: { colors: ['#a8e0ff', '#ffffff'], count: 14, speed: 60 } },
  },
  cat: {
    id: 'cat', name: 'SCHADUWKAT', rarity: 'rare', sheet: 'pet_cat', flying: false, height: 0, follow: 28,
    desc: 'SLUIPT MEE IN DE SCHADUW',
    fx: { trail: { colors: ['#7a3ab0', '#c040ff', '#3a2c56'], rate: 9, vy: -8, life: 0.7, from: [-8, -2] }, cheer: { colors: ['#c040ff', '#ff7ae0', '#3a2c56'], count: 16, speed: 70 } },
  },
  robo: {
    id: 'robo', name: 'ROBO-MAATJE', rarity: 'epic', sheet: 'pet_robo', flying: true, height: 26, follow: 28,
    desc: 'ZWEEFT, PIEPT EN ZWAAIT',
    fx: { glow: { color: '#4fd0ff', r: 12, alpha: 0.2 }, trail: { colors: ['#4fd0ff', '#8ff2ff', '#ffffff'], rate: 16, vy: 30, life: 0.45, from: [-1, 2] }, cheer: { colors: ['#4fd0ff', '#8ff2ff', '#ffffff', '#ffe66a'], count: 24, speed: 90 } },
  },
  turtle: {
    id: 'turtle', name: 'BOSSCHILDPAD', rarity: 'epic', sheet: 'pet_turtle', flying: false, height: 0, follow: 32,
    desc: 'DRAAGT EEN HEEL BOS OP ZIJN RUG',
    fx: { glow: { color: '#93d05a', r: 14, alpha: 0.14 }, trail: { colors: ['#79c25a', '#c2ec7c', '#ffd23a'], rate: 6, vy: -14, life: 1.0, from: [-2, -18] }, cheer: { colors: ['#79c25a', '#c2ec7c', '#ff8a9a', '#ffd23a'], count: 26, speed: 90 } },
  },
  star: {
    id: 'star', name: 'STERRENKONING', rarity: 'legendary', sheet: 'pet_star', flying: true, height: 30, follow: 30,
    desc: 'STRAALT ALS DE ALLERFELSTE STER',
    fx: { glow: { color: '#ffc93c', r: 20, alpha: 0.32, pulse: true }, trail: { colors: ['#ffe66a', '#fff6c0', '#ffffff', '#ffc93c'], rate: 26, vy: -4, life: 0.9, from: [-6, -15], spread: 10, glowing: true }, cheer: { colors: ['#ffe66a', '#fff6c0', '#ffffff', '#ff9a2a'], count: 40, speed: 130, ring: true } },
  },
  wolf: {
    id: 'wolf', name: 'IJSWOLF', rarity: 'legendary', sheet: 'pet_wolf', flying: false, height: 0, follow: 36,
    desc: 'HUILT EEN STORM VAN IJSKRISTALLEN',
    fx: { glow: { color: '#4fd0ff', r: 22, alpha: 0.26, pulse: true }, trail: { colors: ['#b4f4ff', '#ffffff', '#4fd0ff'], rate: 24, vy: -10, life: 0.9, from: [-14, -10], spread: 12, glowing: true, ground: true }, cheer: { colors: ['#b4f4ff', '#ffffff', '#4fd0ff', '#1e5ab0'], count: 44, speed: 140, ring: true } },
  },
};

// --- wereld-exclusieve pets (5 per wereld: 2× gewoon, zeldzaam, episch, legendarisch) ---
const WP = (id, name, world, rarity, o) => ({ id, name, world, rarity, sheet: 'pet_' + id, flying: false, height: 0, follow: 26, ...o });
Object.assign(PETS, {
  // Greenwood
  squirrel: WP('squirrel', 'EEKHOORNTJE', 'greenwood', 'common', { follow: 24, desc: 'HUPPELT MEE MET ZIJN EIKEL' }),
  hedgehog: WP('hedgehog', 'EGELTJE', 'greenwood', 'common', { follow: 24, desc: 'ROLT ZICH OP ALS BALLETJE' }),
  hummingbird: WP('hummingbird', 'KOLIBRIE', 'greenwood', 'rare', { flying: true, height: 30, follow: 22, desc: 'ZOEMT ROND MET BLOEMBLAADJES',
    fx: { trail: { colors: ['#ff8ad0', '#ffc0e8', '#7ae8b0'], rate: 8, vy: 6, life: 0.7, from: [-8, -10] }, cheer: { colors: ['#ff8ad0', '#ffffff', '#7ae8b0'], count: 14, speed: 60 } } }),
  deer: WP('deer', 'BLOESEMHERT', 'greenwood', 'epic', { follow: 32, desc: 'EEN GEWEI VOL BLOESEM',
    fx: { glow: { color: '#ff8ad0', r: 13, alpha: 0.14 }, trail: { colors: ['#ff8ad0', '#ffc0e8', '#ffffff'], rate: 9, vy: 14, life: 1.1, from: [5, -26], spread: 8 }, cheer: { colors: ['#ff8ad0', '#ffc0e8', '#ffffff', '#86c85a'], count: 26, speed: 90 } } }),
  butterfly: WP('butterfly', 'ELFENVLINDER', 'greenwood', 'legendary', { flying: true, height: 30, follow: 30, desc: 'FLADDERT IN EEN WOLK VAN GLINSTERS',
    fx: { glow: { color: '#d890ff', r: 20, alpha: 0.3, pulse: true }, trail: { colors: ['#ffc0e8', '#c0e8ff', '#ffffff', '#d890ff'], rate: 24, vy: -4, life: 0.9, from: [-6, -14], spread: 12, glowing: true }, cheer: { colors: ['#ffc0e8', '#c0e8ff', '#ffffff', '#d890ff'], count: 40, speed: 120, ring: true } } }),
  // Frostpeak
  bunny: WP('bunny', 'SNEEUWHAASJE', 'frostpeak', 'common', { follow: 24, desc: 'HUPT MET ZIJN RODE SJAAL' }),
  polarbear: WP('polarbear', 'IJSBEERTJE', 'frostpeak', 'common', { follow: 26, desc: 'STAPT DAPPER DOOR DE SNEEUW' }),
  reindeer: WP('reindeer', 'RENDIERTJE', 'frostpeak', 'rare', { follow: 28, desc: 'RINKELT MET ZIJN BELLETJES',
    fx: { trail: { colors: ['#ffffff', '#e4eefa', '#ffc93c'], rate: 7, vy: -6, life: 0.8, from: [-10, -6] }, cheer: { colors: ['#ffc93c', '#fff1a0', '#ffffff'], count: 14, speed: 60 } } }),
  narwhal: WP('narwhal', 'LUCHTNARWAL', 'frostpeak', 'epic', { flying: true, height: 30, follow: 32, desc: 'ZWEMT DOOR DE LUCHT',
    fx: { glow: { color: '#8affff', r: 14, alpha: 0.16 }, trail: { colors: ['#ffffff', '#b4f4ff', '#8ad0ff'], rate: 12, vy: 8, life: 0.9, from: [-16, -2], spread: 6 }, cheer: { colors: ['#ffffff', '#b4f4ff', '#8affff'], count: 26, speed: 90 } } }),
  mammoth: WP('mammoth', 'MAMMOETJE', 'frostpeak', 'legendary', { follow: 38, desc: 'TROMPETTERT NOORDERLICHT',
    fx: { glow: { color: '#7affc8', r: 22, alpha: 0.24, pulse: true }, trail: { colors: ['#ffffff', '#e4eefa', '#7affc8', '#c890ff'], rate: 22, vy: -8, life: 0.9, from: [-16, -14], spread: 12, glowing: true, ground: true }, cheer: { colors: ['#ffffff', '#7affc8', '#b4e4ff', '#c890ff'], count: 44, speed: 130, ring: true } } }),
  // Stormrijk
  gecko: WP('gecko', 'BLIKSEMGEKKO', 'stormrijk', 'common', { follow: 24, desc: 'VONKT BIJ IEDERE STAP' }),
  anglerfish: WP('anglerfish', 'LANTAARNVISJE', 'stormrijk', 'common', { flying: true, height: 26, follow: 22, desc: 'BRENGT ZIJN EIGEN LAMPJE MEE' }),
  bee: WP('bee', 'DONDERBIJ', 'stormrijk', 'rare', { flying: true, height: 30, follow: 22, desc: 'ZOEMT EN KNETTERT',
    fx: { trail: { colors: ['#ffe24a', '#fff6b0', '#6ad8ff'], rate: 9, vy: 0, life: 0.5, from: [-10, -10] }, cheer: { colors: ['#ffe24a', '#ffffff'], count: 14, speed: 70 } } }),
  griffin: WP('griffin', 'STORMGRIFFIOEN', 'stormrijk', 'epic', { follow: 34, desc: 'HALF ADELAAR, HALF LEEUW',
    fx: { glow: { color: '#6ad8ff', r: 14, alpha: 0.16 }, trail: { colors: ['#6ad8ff', '#d0f8ff', '#ffe24a'], rate: 12, vy: -6, life: 0.7, from: [-4, -22], spread: 6 }, cheer: { colors: ['#6ad8ff', '#ffe24a', '#ffffff'], count: 26, speed: 100 } } }),
  phoenix: WP('phoenix', 'STORMFENIKS', 'stormrijk', 'legendary', { flying: true, height: 32, follow: 32, desc: 'VERRIJST UIT DE BLIKSEM',
    fx: { glow: { color: '#b070ff', r: 22, alpha: 0.3, pulse: true }, trail: { colors: ['#ffe24a', '#d890ff', '#ffffff', '#8a44d8'], rate: 26, vy: -6, life: 0.9, from: [-18, -14], spread: 10, glowing: true }, cheer: { colors: ['#ffe24a', '#d890ff', '#ffffff'], count: 44, speed: 140, ring: true } } }),
});

/** Kist-pets (houten/tafel/gouden kist). */
export const PET_ORDER = ['fox', 'owl', 'slime', 'dragon', 'wisp', 'cat', 'robo', 'turtle', 'star', 'wolf'];
/** Wereld-exclusieve pets per wereld (alleen in de wereldkist). */
export const WORLD_PET_ORDER = {
  greenwood: ['squirrel', 'hedgehog', 'hummingbird', 'deer', 'butterfly'],
  frostpeak: ['bunny', 'polarbear', 'reindeer', 'narwhal', 'mammoth'],
  stormrijk: ['gecko', 'anglerfish', 'bee', 'griffin', 'phoenix'],
};
export const ALL_PET_ORDER = [...PET_ORDER, ...Object.values(WORLD_PET_ORDER).flat()];

/** Pets van een zeldzaamheid: de kist-pets (world = null) of die van één wereld. */
export const petsOfRarity = (r, world = null) => (world ? WORLD_PET_ORDER[world] : PET_ORDER).filter(id => PETS[id].rarity === r);
