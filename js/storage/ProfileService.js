// ---------------------------------------------------------------------------
// ProfileService – de ENIGE toegangslaag tot persoonlijke voortgang.
//
//   Game → ProfileService → StorageAdapter → localStorage   (nu)
//   Game → ProfileService → CloudAdapter   → account/API     (later)
//
// Het profiel staat in het geheugen; lezen is dus synchroon en snel (belangrijk
// tijdens het spelen). Opslaan gebeurt asynchroon en gebundeld (debounce).
// ---------------------------------------------------------------------------
import { createDefaultProfile, migrateProfile } from './profileSchema.js';

const KEY = 'profile';
const HISTORY_MAX = 60;

export class ProfileService {
  /** @param adapter zie StorageAdapter.js */
  constructor(adapter) {
    this.adapter = adapter;
    this.profile = createDefaultProfile();
    this.saveTimer = null;
    this.listeners = new Set();
    this.lastError = null;
  }

  // --- laden / opslaan ---------------------------------------------------------
  async load() {
    try {
      const raw = await this.adapter.read(KEY);
      if (raw) {
        try {
          this.profile = migrateProfile(JSON.parse(raw));
        } catch (e) {
          // kapot profiel niet weggooien maar apart bewaren
          await this.adapter.write(KEY + '.corrupt-' + Date.now(), raw);
          this.profile = createDefaultProfile();
          this.lastError = e;
        }
      }
    } catch (e) {
      this.lastError = e;
    }
    return this.profile;
  }

  /** Plan een save (gebundeld). */
  save(delay = 400) {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), delay);
  }

  /** Direct opslaan (bijv. bij einde run of pagehide). */
  async flush() {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const p = this.profile;
    p.meta.updatedAt = Date.now();
    p.meta.revision++;
    try {
      await this.adapter.write(KEY, JSON.stringify(p));
    } catch (e) {
      this.lastError = e; // bijv. quota of geblokkeerde opslag: spel gaat gewoon door
    }
    for (const fn of this.listeners) fn(p);
  }

  onSave(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Volledige export (voor toekomstige sync of handmatige back-up). */
  exportData() { return JSON.parse(JSON.stringify(this.profile)); }
  /** Voortgang vervangen (code/QR of account). De koppeling met een account blijft staan. */
  async importData(obj) {
    const old = this.profile.meta || {};
    this.profile = migrateProfile(obj);
    const m = this.profile.meta;
    m.accountId = old.accountId || null;
    m.cloudRevision = old.cloudRevision || 0;
    m.syncedHash = old.syncedHash || null;
    await this.flush();
  }
  async reset() { this.profile = createDefaultProfile(); await this.flush(); }

  // --- mastery-store (gebruikt door AdaptiveTrainer) -------------------------------
  get masteryStore() {
    const m = () => this.profile.mastery;
    return {
      get: k => m()[k],
      set: (k, rec) => { m()[k] = rec; },
      entries: () => Object.entries(m()),
    };
  }

  // --- coins / valuta ---------------------------------------------------------------
  get coins() { return this.profile.currency.coins; }
  addCoins(n) {
    const c = this.profile.currency;
    c.coins += n;
    c.lifetimeCoins += Math.max(0, n);
  }
  /** Voor een toekomstige shop. Retourneert true als het lukte. */
  spendCoins(n) {
    if (n <= 0 || this.profile.currency.coins < n) return false;
    this.profile.currency.coins -= n;
    this.save();
    return true;
  }

  // --- unlocks (voorbereid voor shop) --------------------------------------------------
  owns(type, id) { return (this.profile.unlocks.owned[type] || []).includes(id); }
  unlock(type, id) {
    const o = this.profile.unlocks.owned;
    (o[type] ||= []);
    if (!o[type].includes(id)) o[type].push(id);
    this.save();
  }
  equip(slot, id) { this.profile.unlocks.equipped[slot] = id; this.save(); }
  get equipped() { return this.profile.unlocks.equipped; }

  // --- verzamelen: kisten/snoepjes (regels staan in systems/Chests.js) ---------------
  get collection() { return this.profile.collection; }

  // --- werelden (regels staan in systems/Worlds.js) ------------------------------------
  isWorldUnlocked(id) { return this.profile.worlds.unlocked[id] === true; }
  unlockWorld(id) { this.profile.worlds.unlocked[id] = true; this.save(); }
  worldBosses(id) { return this.profile.worlds.bosses[id] || 0; }

  // --- characters (regels staan in CharacterRegistry) -----------------------------
  get selectedCharacter() { return this.profile.selectedCharacter; }
  selectCharacter(id) {
    if (this.profile.selectedCharacter === id) return;
    this.profile.selectedCharacter = id;
    this.save();
  }
  isCharacterUnlocked(id) { return this.profile.unlocks.characters[id] === true; }
  unlockCharacter(id) {
    this.profile.unlocks.characters[id] = true;
    this.save();
  }
  lockCharacter(id) { // vooral voor testen / toekomstige configuratie
    this.profile.unlocks.characters[id] = false;
    this.save();
  }

  // --- wapens & power-ups (regels staan in systems/Equipment.js) ----------------------
  getOwnedWeapons(charId) { return this.profile.unlocks.weapons[charId] || []; }
  addWeapon(charId, weaponId) {
    const w = this.profile.unlocks.weapons;
    (w[charId] ||= []);
    if (!w[charId].includes(weaponId)) w[charId].push(weaponId);
    this.flush(); // aankopen meteen vastleggen
  }
  getEquippedWeapon(charId) { return this.profile.unlocks.equippedWeapons[charId]; }
  setEquippedWeapon(charId, weaponId) {
    this.profile.unlocks.equippedWeapons[charId] = weaponId;
    this.save();
  }
  hasPowerup(id) { return this.profile.unlocks.powerups[id] === true; }
  addPowerup(id) {
    this.profile.unlocks.powerups[id] = true;
    this.flush();
  }

  // --- instellingen ------------------------------------------------------------------
  get settings() { return this.profile.settings; }
  updateSettings(patch) {
    Object.assign(this.profile.settings, patch);
    this.save();
  }

  get stats() { return this.profile.stats; }
  get records() { return this.profile.records; }

  /** Tussentijds bijhouden tijdens een run (zodat data niet verloren gaat). */
  noteAnswer(correct, tier) {
    const s = this.profile.stats;
    s.totalAnswered++;
    if (correct) s.totalCorrect++;
    if (tier === 'perfect') s.totalPerfect++;
    this.save(1500);
  }

  noteRunStarted() {
    this.profile.stats.runs++;
    this.save();
  }

  /**
   * Run afgerond: records bijwerken, coins bijschrijven en geschiedenis aanvullen.
   * Retourneert een lijst met verbroken records (voor het resultaatscherm).
   */
  recordRun(sum, { mode, tables, completed, world = 'greenwood' }) {
    const p = this.profile, r = p.records, s = p.stats;
    const newRecords = [];
    s.totalPlayMs += sum.durationMs || 0;
    if (completed) { s.runsCompleted++; s.bossesDefeated++; p.worlds.bosses[world] = (p.worlds.bosses[world] || 0) + 1; }
    if (sum.correct > r.mostCorrect) { r.mostCorrect = sum.correct; newRecords.push('mostCorrect'); }
    if (sum.bestCombo > r.bestCombo) { r.bestCombo = sum.bestCombo; newRecords.push('bestCombo'); }
    if (sum.correct >= 15 && sum.avgRt > 0 && (r.fastestAvgRt === 0 || sum.avgRt < r.fastestAvgRt)) { r.fastestAvgRt = Math.round(sum.avgRt); newRecords.push('fastestAvgRt'); }
    if (sum.answered >= 20 && sum.accuracy > r.bestAccuracy) { r.bestAccuracy = sum.accuracy; newRecords.push('bestAccuracy'); }
    this.addCoins(sum.coins);
    p.history.push({
      t: Date.now(), mode, tables, world, completed: !!completed,
      answered: sum.answered, correct: sum.correct, avgRt: Math.round(sum.avgRt), bestCombo: sum.bestCombo,
      perfect: sum.perfect, coins: sum.coins, ms: Math.round(sum.durationMs || 0),
    });
    if (p.history.length > HISTORY_MAX) p.history.splice(0, p.history.length - HISTORY_MAX);
    this.flush();
    return newRecords;
  }
}
