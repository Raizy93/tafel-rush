// ---------------------------------------------------------------------------
// CharacterRegistry – één plek voor "welke characters zijn er en mag ik deze
// kiezen?". Combineert de data (data/characters.js) met het profiel
// (ProfileService). Puur JS → testbaar in Node.
//
// Unlock-regels (def.unlock.type):
//   free         altijd beschikbaar
//   coins        beschikbaar als profile.unlocks.characters[id] === true;
//                kopen via tryUnlock() (trekt coins af via ProfileService)
//   achievement  beschikbaar als het profiel hem vrijgespeeld heeft (zelfde vlag)
//   progress     idem; een toekomstig systeem zet de vlag als stat ≥ value
// ---------------------------------------------------------------------------
import { CHARACTERS, DEFAULT_CHARACTER, LEGACY_CHARACTER_IDS } from '../data/characters.js';
import { fmtInt } from '../core/util.js';

export const CharacterRegistry = {
  all() {
    return Object.values(CHARACTERS).sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  resolveId(id) {
    const r = LEGACY_CHARACTER_IDS[id] || id;
    return CHARACTERS[r] ? r : DEFAULT_CHARACTER;
  },
  get(id) {
    return CHARACTERS[this.resolveId(id)];
  },
  isUnlocked(id, profile) {
    const def = CHARACTERS[id];
    if (!def) return false;
    if (!def.unlock || def.unlock.type === 'free') return true;
    return !!(profile && profile.isCharacterUnlocked(id));
  },
  /** Korte tekst voor een vergrendeld character, bijv. "1.500 COINS". */
  requirementLabel(id) {
    const u = (CHARACTERS[id] || {}).unlock || {};
    if (u.type === 'coins') return fmtInt(u.price) + ' COINS';
    if (u.type === 'achievement') return 'PRESTATIE';
    if (u.type === 'progress') return 'SPEEL VERDER';
    return '';
  },
  /** Probeer te ontgrendelen (alleen 'coins'). Retourneert true bij succes. */
  tryUnlock(id, profile) {
    const def = CHARACTERS[id];
    if (!def || this.isUnlocked(id, profile)) return !!def;
    if (def.unlock.type !== 'coins') return false;
    if (!profile.spendCoins(def.unlock.price)) return false;
    profile.unlockCharacter(id);
    return true;
  },
  /** Geselecteerd character, met terugval als hij (nog) niet beschikbaar is. */
  selected(profile) {
    const id = this.resolveId(profile.selectedCharacter);
    return this.isUnlocked(id, profile) ? CHARACTERS[id] : CHARACTERS[DEFAULT_CHARACTER];
  },
};
