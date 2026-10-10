// ---------------------------------------------------------------------------
// Kisten + "snoepjes". Alle balans voor het verzamelen staat hier.
//
//   odds      kans (procent) per zeldzaamheid; binnen een zeldzaamheid is
//             iedere pet even waarschijnlijk. De kansen staan ook in de game.
//   price     alleen de houten kist is te koop (coins)
//
// Kisten verdien je door te OEFENEN (zie systems/Chests.js → awardForRun):
//   tafelkist   per CHEST_RULES.stepsPerTafelChest stapjes op de tafelkaart
//   wereldkist  voor iedere verslagen boss: de kist van die wereld (Boskist,
//               Sneeuwkist, Stormkist) met alleen de wereld-pets van daar
//   gouden kist per CHEST_RULES.goldsPerGoldChest nieuwe gouden vakjes, en de
//               eerste keer dat een hele tafel goud is
// Een pet die je al hebt levert SNOEPJES op. Met snoepjes lok je zelf een pet
// die je nog mist (prijs per zeldzaamheid).
// ---------------------------------------------------------------------------

export const CHESTS = {
  wood: {
    id: 'wood', name: 'HOUTEN KIST', sheet: 'chest_wood', icon: 'chest_wood', price: 400, color: '#e0a060',
    how: 'TE KOOP VOOR COINS',
    odds: { common: 72, rare: 23, epic: 4, legendary: 1 },
  },
  tafel: {
    id: 'tafel', name: 'TAFELKIST', sheet: 'chest_tafel', icon: 'chest_tafel', price: null, color: '#6ac0ff',
    how: 'STAPJES OP DE TAFELKAART + BOSS',
    odds: { common: 50, rare: 33, epic: 13, legendary: 4 },
  },
  gold: {
    id: 'gold', name: 'GOUDEN KIST', sheet: 'chest_gold', icon: 'chest_gold', price: null, color: '#ffc93c',
    how: 'NIEUW GOUD OP DE TAFELKAART',
    odds: { common: 22, rare: 36, epic: 27, legendary: 15 },
  },
};
export const CHEST_ORDER = ['wood', 'tafel', 'gold'];

// --- wereldkisten: alleen te verdienen door de boss van DIE wereld te verslaan,
// en er zitten alleen de 5 wereld-pets van die wereld in (data/pets.js).
Object.assign(CHESTS, {
  bos: { id: 'bos', name: 'BOSKIST', world: 'greenwood', sheet: 'chest_bos', icon: 'chest_bos', price: null, color: '#86c85a', how: 'VERSLA DE WOUDWACHTER', odds: { common: 55, rare: 28, epic: 12, legendary: 5 } },
  sneeuw: { id: 'sneeuw', name: 'SNEEUWKIST', world: 'frostpeak', sheet: 'chest_sneeuw', icon: 'chest_sneeuw', price: null, color: '#b4e4ff', how: 'VERSLA DE IJSREUS', odds: { common: 55, rare: 28, epic: 12, legendary: 5 } },
  storm: { id: 'storm', name: 'STORMKIST', world: 'stormrijk', sheet: 'chest_storm', icon: 'chest_storm', price: null, color: '#ffe24a', how: 'VERSLA DE DONDERDRAAK', odds: { common: 55, rare: 28, epic: 12, legendary: 5 } },
});
export const WORLD_CHEST_ORDER = ['bos', 'sneeuw', 'storm'];
/** wereld-id → wereldkist */
export const WORLD_CHESTS = { greenwood: 'bos', frostpeak: 'sneeuw', stormrijk: 'storm' };
export const ALL_CHEST_ORDER = [...CHEST_ORDER, ...WORLD_CHEST_ORDER];

export const CHEST_RULES = {
  stepsPerTafelChest: 10,   // stapjes op de tafelkaart → 1 tafelkist
  tafelChestPerBoss: 1,     // verslagen boss in een wereld ZONDER eigen kist → tafelkist
  worldChestPerBoss: 1,     // verslagen boss → wereldkist van die wereld (in plaats van de tafelkist)
  goldsPerGoldChest: 5,     // nieuwe gouden vakjes → 1 gouden kist
  goldChestPerMasterTable: 1, // eerste keer een hele tafel goud
  starterChests: { wood: 1 }, // cadeautje bij de start (en bij de update)
};

/** "Valuta" voor dubbele pets. Naam staat op één plek, zodat hij makkelijk te wijzigen is. */
export const TREATS = {
  name: 'SNOEPJES',
  one: 'SNOEPJE',
  icon: 'treat',
  forDuplicate: { common: 10, rare: 25, epic: 60, legendary: 150 },
  lurePrice: { common: 60, rare: 150, epic: 350, legendary: 800 },
};
