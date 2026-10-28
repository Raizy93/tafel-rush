// ---------------------------------------------------------------------------
// Profielschema + migraties.
//
// Eén versieerbaar profielobject bevat ALLE persoonlijke voortgang. Er staan
// bewust geen persoonsgegevens in (geen naam, e-mail, school …). Het profileId
// is een willekeurige lokale ID die later aan een account gekoppeld kan worden.
//
// Wijzig je het formaat? Verhoog PROFILE_VERSION en voeg een migratie toe aan
// MIGRATIONS (van versie n → n+1). Oude profielen worden dan automatisch
// bijgewerkt bij het laden.
// ---------------------------------------------------------------------------

export const PROFILE_VERSION = 6;

export function randomId() {
  const c = typeof crypto !== 'undefined' ? crypto : null;
  if (c && c.randomUUID) return c.randomUUID();
  return 'p-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function createDefaultProfile(now = Date.now()) {
  return {
    version: PROFILE_VERSION,
    meta: {
      profileId: randomId(),   // lokaal, anoniem; later te koppelen aan een account
      createdAt: now,
      updatedAt: now,
      revision: 0,             // telt op bij iedere save – handig voor sync/conflicten
      accountId: null,         // ingelogd: id van het account (Supabase) waar dit profiel bij hoort
      cloudRevision: 0,        // laatst bekende revision van de voortgang in het account
      syncedHash: null,        // vingerafdruk van de inhoud bij de laatste sync (zie net/syncLogic.js)
    },
    // Totale oefenstatistieken
    stats: {
      runs: 0,
      runsCompleted: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      totalPerfect: 0,
      totalPlayMs: 0,
      bossesDefeated: 0,
      // per soort som (keertafels tellen = totaal min de andere soorten)
      byOp: { div: { answered: 0, correct: 0 } },
    },
    // Persoonlijke records
    records: {
      mostCorrect: 0,
      bestCombo: 0,
      fastestAvgRt: 0,     // ms, 0 = nog geen
      bestAccuracy: 0,     // 0..1 (alleen runs met ≥ 20 antwoorden)
    },
    // Records van de andere soorten sommen (records hierboven = keertafels)
    opRecords: {
      div: { mostCorrect: 0, bestCombo: 0, fastestAvgRt: 0, bestAccuracy: 0 },
    },
    // Mastery per tafelsom: { "6x7": {seen, correct, wrong, avgRt, …} }
    mastery: {},
    // Valuta – los van stats zodat een shop dit later kan gebruiken
    currency: {
      coins: 0,
      lifetimeCoins: 0,
    },
    // Gekozen character (id uit data/characters.js)
    selectedCharacter: 'hero01',
    // Unlocks. characters = per character of hij vrijgespeeld/gekocht is.
    // (Characters met unlock.type 'free' zijn altijd speelbaar; zie CharacterRegistry.)
    // Ontwikkelversie: alle drie direct beschikbaar.
    unlocks: {
      characters: { hero01: true, ranger01: true, tech01: true },
      // Gekochte wapens per character (het startwapen tier 0 is altijd van jou)
      weapons: { hero01: [], ranger01: [], tech01: [] },
      // Uitgerust wapen per character (id uit data/weapons.js)
      equippedWeapons: { hero01: 'kai_w0', ranger01: 'mila_w0', tech01: 'nova_w0' },
      // Power-ups (gelden voor alle helden)
      powerups: { coinBonus: false, comboShield: false, pierce: false },
      owned: { skins: [], pets: [], trails: [], outfits: [], boards: [], effects: [] },
      equipped: { skin: null, pet: null, trail: null, outfit: null, board: null, effect: null },
    },
    // Verzamelen: kisten, snoepjes (voor dubbele pets) en voortgang naar de
    // volgende kist. Welke pets je hebt staat in unlocks.owned.pets.
    collection: defaultCollection(),
    // Werelden: welke open zijn en hoe vaak de boss per wereld verslagen is
    worlds: {
      unlocked: { greenwood: true },
      bosses: { greenwood: 0, frostpeak: 0, stormrijk: 0 },
    },
    // Instellingen
    settings: {
      sfx: true,
      music: true,
      tutorialSeen: false,
      lastMode: 'training',
      lastTable: 7,
      lastMixTables: [6, 7, 8],
      lastWorld: 'greenwood',
      operation: 'mul',      // gekozen soort sommen: 'mul' (tafels) of 'div' (deeltafels)
      opChosen: false,       // al eens gekozen? (anders eerst het keuzescherm)
      tipsSeen: [],          // ids van tips die al getoond zijn (data/help.js → TIPS)
    },
    // Korte geschiedenis van runs (voor toekomstige grafieken/dashboard)
    history: [],
  };
}

export function defaultCollection() {
  return {
    chests: { wood: 1, tafel: 0, gold: 0, bos: 0, sneeuw: 0, storm: 0 }, // één houten kist cadeau om te beginnen
    treats: 0,
    progress: { steps: 0, golds: 0 },        // op weg naar de volgende tafel-/gouden kist
    masterTables: [],                        // tafels waarvoor de "hele tafel goud"-kist al gegeven is
    found: {},                               // petId → tijdstip van vinden
    newPets: [],                             // nog niet bekeken in het petboek ("NIEUW!")
    opened: 0,
  };
}

/** Migraties: index = vanaf-versie. MIGRATIONS[1] zet v1 → v2, enz. */
export const MIGRATIONS = {
  // v1 → v2: characters kregen vaste ids (kai → hero01), een eigen unlock-map
  // en een top-level selectedCharacter.
  1: p => {
    const legacy = { kai: 'hero01' };
    const u = p.unlocks || {};
    const owned = { ...(u.owned || {}) };
    const equipped = { ...(u.equipped || {}) };
    const characters = { hero01: true, ranger01: true, tech01: true };
    for (const id of owned.characters || []) characters[legacy[id] || id] = true;
    p.selectedCharacter = legacy[equipped.character] || equipped.character || 'hero01';
    delete owned.characters;
    delete equipped.character;
    p.unlocks = { characters, owned, equipped };
    p.version = 2;
    return p;
  },
  // v2 → v3: wapens per character + power-ups (alles nog niet gekocht).
  2: p => {
    const u = p.unlocks || (p.unlocks = {});
    u.weapons = { hero01: [], ranger01: [], tech01: [], ...(u.weapons || {}) };
    u.equippedWeapons = { hero01: 'kai_w0', ranger01: 'mila_w0', tech01: 'nova_w0', ...(u.equippedWeapons || {}) };
    u.powerups = { coinBonus: false, comboShield: false, pierce: false, ...(u.powerups || {}) };
    p.version = 3;
    return p;
  },
  // v3 → v4: tafelkaart werkt voortaan met dag-niveaus (record.map). Bestaande
  // voortgang krijgt een bescheiden startniveau (max. oranje) – goud moet je
  // voortaan op 4 verschillende dagen verdienen.
  3: p => {
    for (const rec of Object.values(p.mastery || {})) {
      if (!rec || !rec.seen || rec.map) continue;
      rec.map = { level: rec.mastery != null && rec.mastery >= 0.65 ? 2 : 1, upDay: null, downDay: null, wrongDay: null };
    }
    p.version = 4;
    return p;
  },
  // v4 → v5: pets komen voortaan uit kisten. Gekochte pets blijven van jou;
  // iedereen krijgt één houten kist cadeau.
  4: p => {
    const c = p.collection = { ...defaultCollection(), ...(p.collection || {}) };
    const owned = (p.unlocks && p.unlocks.owned && p.unlocks.owned.pets) || [];
    for (const id of owned) c.found[id] = c.found[id] || Date.now();
    p.version = 5;
    return p;
  },
  // v5 → v6: werelden. Wie de Woudwachter al eens versloeg, krijgt Frostpeak meteen.
  5: p => {
    const beaten = (p.stats && p.stats.bossesDefeated) || 0;
    p.worlds = { unlocked: { greenwood: true, ...(beaten > 0 ? { frostpeak: true } : {}) }, bosses: { greenwood: beaten, frostpeak: 0 } };
    p.version = 6;
    return p;
  },
};

/**
 * Breng een (mogelijk oud of onvolledig) profiel naar de huidige versie.
 * Ontbrekende velden worden aangevuld met defaults (vooruit-compatibel).
 */
export function migrateProfile(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') return createDefaultProfile();
  let p = raw;
  while (p.version < PROFILE_VERSION) {
    const step = MIGRATIONS[p.version];
    if (!step) throw new Error(`Geen migratie van profielversie ${p.version}`);
    p = step(p);
  }
  return fillDefaults(p, createDefaultProfile());
}

function fillDefaults(target, defaults) {
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in target) || target[k] === undefined) target[k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && k !== 'mastery') fillDefaults(target[k], v);
  }
  return target;
}
