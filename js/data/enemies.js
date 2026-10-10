// ---------------------------------------------------------------------------
// EnemyConfig – alle vijandtypes en bosses als data.
//
//   maxHp    aantal hits (bij 1 damage per goed antwoord) om hem te verslaan
//   sheet    sprite sheet (assets/atlas.json) met rijen move / attack / hurt
//   flying   zweeft (fly = hoogte boven de grond)
//   barY     hoogte van de HP-pips boven het voetpunt (alleen bij maxHp > 1)
//   colors   kleuren voor hit-/defeat-particles
//   chest    schatkist: geen tegenaanval, extra coins
//
// Nieuwe vijand: sprite maken in tools/art/enemies.js, registreren in
// tools/build-assets.js, hier toevoegen en in een bioom zetten (data/worlds.js).
// ---------------------------------------------------------------------------

export const ENEMY_TYPES = {
  slime_green: { name: 'Slijmpie', sheet: 'slime_green', maxHp: 1, barY: 22, colors: ['#5fd65a', '#b8f57a', '#2e9a48'] },
  slime_blue: { name: 'Blauwslijm', sheet: 'slime_blue', maxHp: 1, barY: 22, colors: ['#4fb0ff', '#b4ecff', '#2c6fd0'] },
  bat: { name: 'Vleervlieg', sheet: 'bat', maxHp: 1, flying: true, fly: 38, barY: 16, colors: ['#6a42a0', '#9f78d6', '#ffd23a'] },
  bat_red: { name: 'Bloedvleer', sheet: 'bat_red', maxHp: 1, flying: true, fly: 42, barY: 16, colors: ['#a8304a', '#e0607a', '#ffd23a'] },
  chest: { name: 'Schatkist', sheet: 'chest', maxHp: 1, chest: true, barY: 22, colors: ['#ffc93c', '#fff1a0', '#b98352'] },

  mushroom: { name: 'Bospaddo', sheet: 'mushroom', maxHp: 2, barY: 29, colors: ['#e04040', '#f0dcc0', '#ff8a6a'] },
  goblin: { name: 'Bosgoblin', sheet: 'goblin', maxHp: 2, barY: 33, colors: ['#6aa344', '#a8d66a', '#3d8f44'] },
  slime_purple: { name: 'Schaduwslijm', sheet: 'slime_purple', maxHp: 2, barY: 22, colors: ['#a75ee8', '#e3a9ff', '#6d34b0'] },

  beetle: { name: 'Schildkever', sheet: 'beetle', maxHp: 3, barY: 24, colors: ['#2f6ea6', '#6cc0e4', '#ffc93c'], armored: true },
  rock: { name: 'Steenkruiper', sheet: 'rock', maxHp: 3, barY: 25, colors: ['#a0a9c2', '#6c7290', '#7dffb0'], armored: true },

  // --- Frostpeak ---
  slime_snow: { name: 'Sneeuwslijm', sheet: 'slime_snow', maxHp: 1, barY: 22, colors: ['#ffffff', '#e4eefa', '#b4c8e4'] },
  bat_ice: { name: 'IJsvleer', sheet: 'bat_ice', maxHp: 1, flying: true, fly: 40, barY: 16, colors: ['#5aa0e8', '#b4e4ff', '#ffffff'] },
  slime_ice: { name: 'IJsslijm', sheet: 'slime_ice', maxHp: 2, barY: 22, colors: ['#7ad8ff', '#d8f8ff', '#3a9ae8'] },
  penguin: { name: 'Pinguin', sheet: 'penguin', maxHp: 2, barY: 30, colors: ['#ffffff', '#323e56', '#ff9a2a'] },
  yeti: { name: 'Yeti-jong', sheet: 'yeti', maxHp: 2, barY: 30, colors: ['#ffffff', '#b4c4e0', '#5a90e0'] },
  icerock: { name: 'IJsklomp', sheet: 'icerock', maxHp: 3, barY: 28, colors: ['#9cd8ff', '#e0f6ff', '#2f74c0'], armored: true },

  // --- Stormrijk (allemaal eigen tekeningen) ---
  snail: { name: 'Stroomslak', sheet: 'snail', maxHp: 1, barY: 22, colors: ['#ffe24a', '#5a4878', '#a0c878'] },
  spark: { name: 'Vonkje', sheet: 'vonkje', maxHp: 1, flying: true, fly: 34, barY: 18, colors: ['#ffe24a', '#fff6b0', '#ffffff'] },
  crow: { name: 'Stormkraai', sheet: 'crow', maxHp: 1, flying: true, fly: 44, barY: 16, colors: ['#22223a', '#6ad8ff', '#ffe24a'] },
  toad: { name: 'Donderpad', sheet: 'toad', maxHp: 2, barY: 24, colors: ['#46704a', '#ffe24a', '#2e4e36'] },
  stormcloud: { name: 'Onweerswolkje', sheet: 'stormcloud', maxHp: 2, flying: true, fly: 46, barY: 20, colors: ['#6a6890', '#ffe24a', '#6a8ad8'] },
  crab: { name: 'Stormkreeft', sheet: 'crab', maxHp: 3, barY: 26, colors: ['#4a6aa8', '#6ad8ff', '#d8823a'], armored: true },
};

export const BOSSES = {
  // fx: kleuren voor stappen/stof, schokgolf, vonkjes rond de boss (kalm/boos) en het instorten
  guardian: {
    name: 'DE WOUDWACHTER', sheet: 'boss_guardian', maxHp: 18, colors: ['#a0a9c2', '#6c7290', '#56a03c', '#7dffb0'],
    fx: { step: ['#a88a6a', '#d8c0a0'], wave: ['#a0a9c2', '#d8c0a0', '#7dffb0'], slam: ['#a0a9c2', '#6c7290', '#d8c0a0'], spark: '#7dffb0', sparkAngry: '#ff5a5a', angry: ['#ff5a5a', '#ffe0d0', '#c21f3a'], death: ['#a0a9c2', '#6c7290', '#56a03c', '#262433'] },
  },
  // attack 'breath': bliksemstraal uit de bek (mouth = bek t.o.v. het voetpunt) i.p.v. een vuistslag + schokgolf
  thunderdragon: {
    name: 'DE DONDERDRAAK', sheet: 'boss_storm', maxHp: 18, colors: ['#ffe24a', '#fff6b0', '#4e4078', '#ffffff'],
    attack: 'breath', mouth: [-59, -55],
    fx: { step: ['#4e4078', '#8e82a0'], wave: ['#ffe24a', '#fff6b0', '#ffffff'], slam: ['#ffe24a', '#fff6b0', '#6ad8ff'], spark: '#ffe24a', sparkAngry: '#ff6ad8', angry: ['#ff6ad8', '#ffffff', '#b03ae0'], death: ['#4e4078', '#6e5ea0', '#ffe24a', '#120e22'], beam: ['#e0b020', '#ffe24a', '#ffffff'], beamAngry: ['#b03ae0', '#ff6ad8', '#ffffff'] },
  },
  icegiant: {
    name: 'DE IJSREUS', sheet: 'boss_frost', maxHp: 18, colors: ['#9cd8ff', '#e0f6ff', '#ffffff', '#3ac8ff'],
    fx: { step: ['#ffffff', '#c8dcf0'], wave: ['#ffffff', '#b4e4ff', '#3ac8ff'], slam: ['#ffffff', '#9cd8ff', '#5a96d6'], spark: '#a8f4ff', sparkAngry: '#ff8ab0', angry: ['#ff8ab0', '#ffffff', '#e0306a'], death: ['#ffffff', '#9cd8ff', '#5a96d6', '#1c3e7a'] },
  },
};
