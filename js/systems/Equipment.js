// ---------------------------------------------------------------------------
// Equipment – wapens en power-ups: bezit, kopen, uitrusten en de "loadout"
// waarmee een run start. Puur JS (geen DOM, geen localStorage) → testbaar.
// Opslag loopt via ProfileService (unlocks.weapons / equippedWeapons / powerups).
//
//   const lo = Equipment.loadout(profile)       // bij de start van een run
//   lo.sheet       sprite sheet van held + wapen
//   lo.attack      aanvalsdefinitie (effect/trail uit het wapen)
//   lo.modifiers   DamageSystem-modifiers uit de wapen-perks
//   lo.powerups    { coinBonus, comboShield, pierce } (true/false)
// ---------------------------------------------------------------------------
import { WEAPONS, POWERUPS } from '../data/weapons.js';
import { PETS, PET_ORDER } from '../data/pets.js';
import { CharacterRegistry } from './CharacterRegistry.js';

/** Wapen-perks → DamageSystem-modifiers (volgorde: eerst ×2, dan +1). */
export const PERK_MODIFIERS = {
  perfectDouble: { id: 'perfectDouble', appliesTo: 'enemies', apply: d => (d.crit ? { ...d, amount: d.amount * 2, tags: [...d.tags, 'perfect×2'] } : d) },
  plusOne: { id: 'plusOne', appliesTo: 'enemies', apply: d => ({ ...d, amount: d.amount + 1, tags: [...d.tags, '+1'] }) },
};
const PERK_ORDER = ['perfectDouble', 'plusOne'];

export const Equipment = {
  weapon(id) { return WEAPONS[id]; },

  weaponsFor(charId) {
    return Object.values(WEAPONS).filter(w => w.character === charId).sort((a, b) => a.tier - b.tier);
  },

  starterWeapon(charId) { return this.weaponsFor(charId)[0]; },

  ownsWeapon(profile, w) {
    return w.tier === 0 || profile.getOwnedWeapons(w.character).includes(w.id);
  },

  equippedWeapon(profile, charId) {
    const w = WEAPONS[profile.getEquippedWeapon(charId)];
    return w && w.character === charId && this.ownsWeapon(profile, w) ? w : this.starterWeapon(charId);
  },

  /** 'equipped' | 'owned' | 'buyable' | 'tooExpensive' | 'needPrevious' */
  weaponStatus(profile, w) {
    if (this.equippedWeapon(profile, w.character).id === w.id) return 'equipped';
    if (this.ownsWeapon(profile, w)) return 'owned';
    const prev = this.weaponsFor(w.character).find(x => x.tier === w.tier - 1);
    if (prev && !this.ownsWeapon(profile, prev)) return 'needPrevious';
    return profile.coins >= w.price ? 'buyable' : 'tooExpensive';
  },

  /** Koop (en rust meteen uit). Retourneert { ok, reason, missing }. */
  buyWeapon(profile, w) {
    const st = this.weaponStatus(profile, w);
    if (st === 'equipped' || st === 'owned') return { ok: false, reason: 'owned' };
    if (st === 'needPrevious') return { ok: false, reason: 'needPrevious' };
    if (st === 'tooExpensive') return { ok: false, reason: 'coins', missing: w.price - profile.coins };
    if (!profile.spendCoins(w.price)) return { ok: false, reason: 'coins', missing: w.price - profile.coins };
    profile.addWeapon(w.character, w.id);
    profile.setEquippedWeapon(w.character, w.id);
    return { ok: true };
  },

  equipWeapon(profile, w) {
    if (!this.ownsWeapon(profile, w)) return false;
    profile.setEquippedWeapon(w.character, w.id);
    return true;
  },

  // --- power-ups ------------------------------------------------------------------
  powerups() { return Object.values(POWERUPS); },
  ownsPowerup(profile, id) { return profile.hasPowerup(id); },
  powerupStatus(profile, id) {
    if (profile.hasPowerup(id)) return 'owned';
    return profile.coins >= POWERUPS[id].price ? 'buyable' : 'tooExpensive';
  },
  buyPowerup(profile, id) {
    const p = POWERUPS[id];
    if (!p) return { ok: false, reason: 'unknown' };
    if (profile.hasPowerup(id)) return { ok: false, reason: 'owned' };
    if (!profile.spendCoins(p.price)) return { ok: false, reason: 'coins', missing: p.price - profile.coins };
    profile.addPowerup(id);
    return { ok: true };
  },

  // --- pets (puur cosmetisch; je vindt ze in kisten → systems/Chests.js) -------------
  // opslag: unlocks.owned.pets / unlocks.equipped.pet
  pets() { return PET_ORDER.map(id => PETS[id]); },
  ownsPet(profile, id) { return profile.owns('pets', id); },
  equippedPet(profile) {
    const id = profile.equipped.pet;
    return id && PETS[id] && this.ownsPet(profile, id) ? PETS[id] : null;
  },
  /** id = null → "geen pet". 'equipped' | 'owned' | 'locked' (nog niet gevonden) */
  petStatus(profile, id) {
    const cur = this.equippedPet(profile);
    if ((cur ? cur.id : null) === id) return 'equipped';
    if (id === null || this.ownsPet(profile, id)) return 'owned';
    return 'locked';
  },
  equipPet(profile, id) {
    if (id !== null && !this.ownsPet(profile, id)) return false;
    profile.equip('pet', id);
    return true;
  },

  /** DamageSystem-modifiers voor een wapen. */
  modifiersFor(w) {
    return PERK_ORDER.filter(id => w.perks.includes(id)).map(id => PERK_MODIFIERS[id]);
  },

  /** Alles wat een run nodig heeft voor de (gekozen) held. */
  loadout(profile, charId = CharacterRegistry.selected(profile).id) {
    const character = CharacterRegistry.get(charId);
    const weapon = this.equippedWeapon(profile, character.id);
    return {
      character,
      weapon,
      sheet: weapon.sheet,
      attack: { ...character.attack, effect: weapon.effect, trail: weapon.trail },
      modifiers: this.modifiersFor(weapon),
      powerups: Object.fromEntries(Object.keys(POWERUPS).map(id => [id, profile.hasPowerup(id)])),
      pet: this.equippedPet(profile),
    };
  },
};
