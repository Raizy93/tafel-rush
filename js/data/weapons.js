// ---------------------------------------------------------------------------
// Wapens (per character) en power-ups (voor alle helden).
//
// Wapens: iedere character heeft een eigen wapenlijn met 4 tiers. De tiers
// zijn voor ALLE characters even sterk – je koopt dus nooit "de sterkste
// held", alleen het wapen voor de held die je leuk vindt.
//   tier 0  startwapen (gratis)
//   tier 1  800    alleen uiterlijk (nieuw wapen + nieuwe aanvalskleur)
//   tier 2  2.000  PERFECT-antwoorden doen 2 damage
//   tier 3  5.000  PERFECT ×2 én +1 damage
// Tier N kopen kan pas als je tier N-1 hebt.
//
// Perks werken NIET op de boss ("oeroud pantser"): het bossgevecht blijft
// voor iedereen 18 goede antwoorden. Zie DamageSystem (appliesTo).
//
// sheet  = character sprite sheet met dit wapen (assets/atlas.json)
// effect = aanvals-sheet (slash/arrow/plasma + tier)
// ---------------------------------------------------------------------------

export const PERKS = {
  perfectDouble: { label: 'PERFECT = 2 DAMAGE', appliesTo: 'enemies' },
  plusOne: { label: '+1 DAMAGE', appliesTo: 'enemies' },
};

export const TIER_INFO = [
  { tier: 0, price: 0, perks: [] },
  { tier: 1, price: 800, perks: [] },
  { tier: 2, price: 2000, perks: ['perfectDouble'] },
  { tier: 3, price: 5000, perks: ['perfectDouble', 'plusOne'] },
];

const line = (character, id, sheet, effect, trails, names) => names.map((name, tier) => ({
  id: `${id}_w${tier}`,
  character,
  tier,
  name,
  price: TIER_INFO[tier].price,
  perks: TIER_INFO[tier].perks,
  sheet: tier === 0 ? sheet : `${sheet}_w${tier}`,
  effect: tier === 0 ? effect : `${effect}_w${tier}`,
  trail: trails[tier],
}));

export const WEAPONS = Object.fromEntries([
  ...line('hero01', 'kai', 'hero_kai', 'slash', ['#8ff2ff', '#e0ecff', '#c8a0ff', '#ff9a2a'],
    ['ENERGIEZWAARD', 'RIDDERZWAARD', 'KRISTALZWAARD', 'VLAMMENZWAARD']),
  ...line('ranger01', 'mila', 'hero_mila', 'arrow', ['#c2ff9a', '#e0e4f0', '#7aff9a', '#fff1a0'],
    ['HOUTEN BOOG', 'JACHTBOOG', 'ELFENBOOG', 'STERRENBOOG']),
  ...line('tech01', 'nova', 'hero_nova', 'plasma', ['#8ff2ff', '#ff9a2a', '#c890ff', '#fff1a0'],
    ['ARMKANON', 'KANON MK II', 'PLASMAKANON', 'NOVAKANON']),
].map(w => [w.id, w]));

// ---------------------------------------------------------------------------
// Power-ups: één keer kopen, geldt voor alle helden.
// ---------------------------------------------------------------------------
export const POWERUPS = {
  coinBonus: {
    id: 'coinBonus', name: 'COINBONUS', icon: 'coin', price: 1200,
    desc: '+10% COINS NA IEDERE RUN',
    value: 0.1,
  },
  comboShield: {
    id: 'comboShield', name: 'COMBOSCHILD', icon: 'shield', price: 2500,
    desc: '1 FOUT PER RUN: COMBO BLIJFT',
    charges: 1,
  },
  pierce: {
    id: 'pierce', name: 'DOORBOORDER', icon: 'sword', price: 3500,
    desc: 'ON FIRE: RAAKT OOK VOLGENDE',
    minComboTier: 3,
  },
};
