// ---------------------------------------------------------------------------
// Worlds – welke werelden er zijn, welke vrijgespeeld zijn en welke gekozen is.
// Puur JS (geen DOM) → testbaar. Opslag via ProfileService (profile.worlds).
//
//   unlock.type 'free'  altijd speelbaar (Greenwood)
//   unlock.type 'boss'  open zodra de boss van unlock.world één keer verslagen is
//
//   Worlds.checkUnlocks(profile)  → ids die nú (na een run) vrijgespeeld zijn
// ---------------------------------------------------------------------------
import { WORLDS, WORLD_ORDER } from '../data/worlds.js';

export const Worlds = {
  all() { return WORLD_ORDER.map(id => WORLDS[id]); },
  get(id) { return WORLDS[id] || WORLDS[WORLD_ORDER[0]]; },

  isUnlocked(profile, id) {
    const w = WORLDS[id];
    if (!w) return false;
    return w.unlock.type === 'free' || profile.isWorldUnlocked(id);
  },

  /** Tekst voor een vergrendelde wereld, bijv. "VERSLA DE WOUDWACHTER". */
  requirementLabel(id) {
    const u = WORLDS[id].unlock;
    return u.label || (u.type === 'boss' ? 'VERSLA DE BOSS VAN ' + WORLDS[u.world].name : '');
  },

  /** Gekozen wereld (laatst gespeeld), of de eerste als die niet (meer) open is. */
  selected(profile) {
    const id = profile.settings.lastWorld;
    return this.isUnlocked(profile, id) ? WORLDS[id] : WORLDS[WORLD_ORDER[0]];
  },

  /** Na een run: speel werelden vrij waarvan de voorwaarde nu klopt. */
  checkUnlocks(profile) {
    const fresh = [];
    for (const w of this.all()) {
      if (this.isUnlocked(profile, w.id)) continue;
      if (w.unlock.type === 'boss' && profile.worldBosses(w.unlock.world) > 0) {
        profile.unlockWorld(w.id);
        fresh.push(w.id);
      }
    }
    return fresh;
  },
};
