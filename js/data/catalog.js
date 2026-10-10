// ---------------------------------------------------------------------------
// Catalogus voor toekomstige unlocks (shop). Nog geen UI in deze versie, maar
// het datamodel staat klaar: ProfileService.spendCoins() + unlock() + equip().
// Types: characters, skins, pets, trails, outfits, boards (hoverboards), effects.
// ---------------------------------------------------------------------------

export const CATALOG = [
  // Characters staan in data/characters.js (met unlock-regels) – zie CharacterRegistry.tryUnlock().
  // Voorbeelden voor later (assets nog niet gemaakt):
  // { type: 'trails', id: 'rainbow', name: 'Regenboogspoor', price: 500 },
  // { type: 'pets', id: 'fox', name: 'Vosje', price: 1200 },
  // { type: 'boards', id: 'leafboard', name: 'Bladboard', price: 2500 },
];

/** Koop een item via het profiel. Retourneert true bij succes. */
export function purchase(profile, item) {
  if (profile.owns(item.type, item.id)) return true;
  if (!profile.spendCoins(item.price)) return false;
  profile.unlock(item.type, item.id);
  return true;
}
