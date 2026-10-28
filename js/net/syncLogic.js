// ---------------------------------------------------------------------------
// syncLogic – pure regels voor accounts en cloud-opslag (zonder netwerk, dus
// goed te testen). AccountService gebruikt deze functies.
// ---------------------------------------------------------------------------

/** Gebruikersnaam zoals hij wordt opgeslagen: kleine letters, zonder spaties eromheen. */
export function normalizeUsername(name) {
  return String(name || '').trim().toLowerCase();
}

/** null = goed, anders een foutmelding voor de speler. */
export function checkUsername(name) {
  const u = normalizeUsername(name);
  if (u.length < 3) return 'Je gebruikersnaam moet minstens 3 tekens hebben.';
  if (u.length > 20) return 'Je gebruikersnaam mag hooguit 20 tekens hebben.';
  if (!/^[a-z0-9_]+$/.test(u)) return 'Gebruik alleen letters, cijfers en _ (geen spaties).';
  return null;
}

export function checkPassword(pw) {
  if (!pw || pw.length < 6) return 'Kies een wachtwoord van minstens 6 tekens.';
  if (pw.length > 72) return 'Je wachtwoord is te lang.';
  return null;
}

/** Supabase Auth werkt met e-mailadressen; spelers hebben alleen een gebruikersnaam.
 *  Daarom een vast, niet-bestaand adres per gebruikersnaam (er wordt nooit gemaild). */
export function usernameToEmail(name, domain) {
  return normalizeUsername(name) + '@' + domain;
}

/** Heeft dit profiel echte voortgang (iets geoefend of verdiend)? */
export function hasProgress(p) {
  return !!p && !!((p.stats && p.stats.totalAnswered > 0) || (p.currency && p.currency.lifetimeCoins > 0));
}

/** Korte, stabiele vingerafdruk van de INHOUD van een profiel (zonder meta),
 *  om te zien of er sinds de laatste sync iets veranderd is. (FNV-1a, 32 bit) */
export function contentHash(p) {
  const { meta, ...rest } = p || {};
  const s = JSON.stringify(rest);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Wat doen we met de voortgang na het inloggen?
 *   local  = het profiel op dit apparaat
 *   cloud  = { data, revision } uit tafelrush.saves, of null (nog niets opgeslagen)
 * Uitkomst:
 *   'upload'   – dit apparaat naar het account sturen
 *   'download' – de voortgang van het account op dit apparaat zetten
 *   'same'     – al gelijk, niets te doen
 *   'fresh'    – dit apparaat hoort bij een ánder account: leeg beginnen
 *   'choose'   – beide hebben eigen voortgang: de speler laten kiezen
 */
export function decideOnLogin(local, cloud, userId) {
  const meta = (local && local.meta) || {};
  const linked = meta.accountId || null;
  const dirty = contentHash(local) !== meta.syncedHash;

  if (!cloud) return linked && linked !== userId ? 'fresh' : 'upload';

  if (linked === userId) {
    const known = meta.cloudRevision || 0;
    if (cloud.revision > known) return dirty ? 'choose' : 'download';   // ander apparaat was verder
    return dirty ? 'upload' : 'same';
  }
  if (linked) return 'download';                 // was van iemand anders: nooit mengen
  if (!hasProgress(local)) return 'download';    // dit apparaat is nog leeg
  if (!hasProgress(cloud.data)) return 'upload'; // account is nog leeg
  return 'choose';
}
