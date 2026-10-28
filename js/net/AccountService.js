// ---------------------------------------------------------------------------
// AccountService – inloggen met gebruikersnaam + wachtwoord (Supabase Auth) en
// de voortgang synchroniseren met het schema "tafelrush".
//
// • Staat CONFIG.accounts.url/anonKey leeg, dan staat alles UIT en werkt de
//   game zoals altijd (alleen lokaal).
// • De game blijft lokaal spelen en opslaan; ingelogd gaat elke wijziging
//   daarnaast (gebundeld) naar het account. Geen internet? Dan later opnieuw.
// • Conflict (op een ander apparaat verder gespeeld) → de speler kiest.
// • Runs gaan via een "outbox" in localStorage, zodat ze offline niet verloren gaan.
// • Een account aanmaken gaat via de Edge Function "tafelrush-signup" (zie
//   supabase/functions/tafelrush-signup): die maakt het account meteen actief,
//   zonder e-mail (spelers hebben alleen een gebruikersnaam).
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { normalizeUsername, checkUsername, checkPassword, usernameToEmail, decideOnLogin, contentHash } from './syncLogic.js';

const LIB_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
const OUTBOX_KEY = 'tafelrush:outbox';
const PUSH_DELAY = 3000;

function readOutbox() { try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch (e) { return []; } }
function writeOutbox(list) { try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list.slice(-200))); } catch (e) { /* niet erg */ } }
function newId() { return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)); }

export class AccountService {
  constructor(game) {
    this.game = game;
    this.cfg = CONFIG.accounts || {};
    this.client = null;
    this.user = null;
    this.username = null;
    this.state = this.enabled ? 'loggedOut' : 'off';   // off | loggedOut | loggedIn
    this.sync = 'idle';                                // idle | saving | ok | offline | conflict
    this.pendingChoice = null;                         // { cloud } als de speler moet kiezen
    this.panelOpen = false;
    this.pushTimer = null;
    this.pushing = false;
    this.again = false;
    this.sigPets = '';
    this.sigWorlds = '';
  }

  get enabled() { return !!(this.cfg.url && this.cfg.anonKey); }
  get loggedIn() { return this.state === 'loggedIn'; }

  async getClient() {
    if (this.client) return this.client;
    const { createClient } = await import(LIB_URL);
    this.client = createClient(this.cfg.url, this.cfg.anonKey, {
      db: { schema: this.cfg.schema || 'tafelrush' },
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tafelrush-auth' },
    });
    return this.client;
  }

  /** Bij het opstarten: was je nog ingelogd? Dan meteen weer koppelen. */
  async init() {
    if (!this.enabled) return;
    this.game.profile.onSave(() => this.onLocalSave());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pushNow(); });
    window.addEventListener('online', () => this.pushNow());
    try {
      const c = await this.getClient();
      const { data } = await c.auth.getSession();
      if (data && data.session) await this.afterLogin(data.session.user);
    } catch (e) {
      this.sync = 'offline';
    }
  }

  // --- account maken / inloggen / uitloggen ----------------------------------------
  async signUp(name, password) {
    const username = normalizeUsername(name);
    const bad = checkUsername(username) || checkPassword(password);
    if (bad) throw new Error(bad);
    const c = await this.getClient().catch(() => { throw new Error('Geen verbinding. Is er internet?'); });
    const { error } = await c.functions.invoke(this.cfg.signupFunction || 'tafelrush-signup', { body: { username, password } });
    if (error) {
      // korte foutcode erachter, zodat de juf/meester kan zien wát er misging
      let msg = 'Account maken lukte niet. Probeer het later nog eens.', code = 'N';   // N = server niet bereikt
      const res = error.context;
      if (res && typeof res.json === 'function') {
        code = 'S' + (res.status || '');
        try { const body = await res.json(); if (body && body.error) msg = body.error; if (body && body.detail) code += ' ' + body.detail; } catch (e) { /* standaardmelding */ }
      } else if (error.name) code += ' ' + error.name;
      console.warn('Account maken mislukt:', code, error);
      throw new Error(/bezet|wachtwoord|tekens/i.test(msg) ? msg : `${msg} (fout: ${code})`);
    }
    return this.signIn(username, password);
  }

  async signIn(name, password) {
    const username = normalizeUsername(name);
    if (checkUsername(username) || !password) throw new Error('Vul je gebruikersnaam en wachtwoord in.');
    const c = await this.getClient().catch(() => { throw new Error('Geen verbinding. Is er internet?'); });
    const { data, error } = await c.auth.signInWithPassword({ email: usernameToEmail(username, this.cfg.emailDomain), password });
    if (error) throw new Error(error.status === 400 ? 'Gebruikersnaam of wachtwoord klopt niet.' : 'Inloggen lukte niet. Is er internet?');
    return this.afterLogin(data.user);
  }

  /** Uitloggen. Eerst alles opslaan; op dit apparaat begint het spel daarna weer leeg
   *  (zo ziet de volgende speler op een gedeeld apparaat jouw voortgang niet).
   *  force = ook uitloggen als het opslaan niet lukte. Retourneert false als er nog iets niet opgeslagen is. */
  async signOut(force = false) {
    if (!this.loggedIn) return true;
    await this.pushNow();
    const p = this.game.profile.profile;
    const unsaved = contentHash(p) !== p.meta.syncedHash || readOutbox().some(r => r.user_id === this.user.id);
    if (unsaved && !force) return false;
    try { await this.client.auth.signOut(); } catch (e) { /* lokaal uitloggen lukt altijd */ }
    writeOutbox(readOutbox().filter(r => r.user_id !== this.user.id));
    this.user = null; this.username = null; this.state = 'loggedOut'; this.sync = 'idle'; this.pendingChoice = null;
    await this.game.profile.reset();
    this.game.goToTitle();
    return true;
  }

  async afterLogin(user) {
    const c = this.client, P = this.game.profile;
    this.user = user;
    this.username = (user.user_metadata && user.user_metadata.username) || String(user.email || '').split('@')[0];
    // spelerrij (normaal al gemaakt door de Edge Function; dit is een vangnet)
    const { data: pl } = await c.from('players').select('username').eq('user_id', user.id).maybeSingle();
    if (pl) this.username = pl.username;
    else await c.from('players').insert({ user_id: user.id, username: this.username, display_name: this.username });
    c.from('players').update({ last_seen_at: new Date().toISOString() }).eq('user_id', user.id).then(() => {}, () => {});

    const { data: cloud, error } = await c.from('saves').select('data, revision').eq('user_id', user.id).maybeSingle();
    if (error) throw new Error('Je voortgang ophalen lukte niet. Probeer het zo nog eens.');
    if (cloud) cloud.revision = Number(cloud.revision);
    this.state = 'loggedIn';
    this.sigPets = this.sigWorlds = '';
    const decision = decideOnLogin(P.profile, cloud, user.id);
    if (decision === 'download') await this.useCloud(cloud);
    else if (decision === 'choose') { this.pendingChoice = { cloud }; this.sync = 'conflict'; }
    else {
      if (decision === 'fresh') await P.reset();
      P.profile.meta.accountId = user.id;
      P.profile.meta.cloudRevision = cloud ? cloud.revision : 0;
      if (decision === 'same') { this.sync = 'ok'; P.save(); this.flushOutbox(); }
      else await this.pushNow(true);
    }
    return decision;
  }

  // --- kiezen bij een conflict ------------------------------------------------------
  /** which = 'cloud' (voortgang van het account) of 'local' (dit apparaat). */
  async resolveChoice(which) {
    const ch = this.pendingChoice;
    if (!ch) return;
    this.pendingChoice = null;
    const P = this.game.profile;
    if (which === 'cloud') await this.useCloud(ch.cloud);
    else {
      P.profile.meta.accountId = this.user.id;
      P.profile.meta.cloudRevision = ch.cloud ? ch.cloud.revision : 0;
      await this.pushNow(true);
    }
    this.game.goToTitle();
  }

  async useCloud(cloud) {
    const P = this.game.profile;
    await P.importData(cloud.data);
    const m = P.profile.meta;
    m.accountId = this.user.id;
    m.cloudRevision = cloud.revision;
    m.syncedHash = contentHash(P.profile);
    this.sync = 'ok';
    await P.flush();
    this.flushOutbox();
  }

  // --- synchroniseren -----------------------------------------------------------------
  onLocalSave() {
    if (!this.loggedIn || this.pendingChoice) return;
    const p = this.game.profile.profile;
    if (contentHash(p) === p.meta.syncedHash) return;
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.pushNow(), PUSH_DELAY);
  }

  /** Voortgang nu naar het account sturen (force = ook als er niets veranderd lijkt). */
  async pushNow(force = false) {
    clearTimeout(this.pushTimer);
    if (!this.loggedIn || this.pendingChoice) return;
    const P = this.game.profile, p = P.profile;
    const hash = contentHash(p);
    if (!force && hash === p.meta.syncedHash) { await this.flushOutbox(); return; }
    if (this.pushing) { this.again = true; return; }
    this.pushing = true;
    this.sync = 'saving';
    try {
      const { data, error } = await this.client.rpc('save_progress', { p_data: p, p_profile_version: p.version, p_expected_revision: p.meta.cloudRevision || 0 });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row && row.saved) {
        p.meta.cloudRevision = Number(row.current_revision);
        p.meta.syncedHash = hash;
        this.sync = 'ok';
        P.save();
        await this.syncCollections();
        await this.flushOutbox();
      } else {
        // op een ander apparaat is intussen verder gespeeld: laten kiezen
        const { data: cloud } = await this.client.from('saves').select('data, revision').eq('user_id', this.user.id).maybeSingle();
        if (cloud) { cloud.revision = Number(cloud.revision); this.pendingChoice = { cloud }; this.sync = 'conflict'; }
      }
    } catch (e) {
      this.sync = 'offline';
    } finally {
      this.pushing = false;
      if (this.again) { this.again = false; this.onLocalSave(); }
    }
  }

  /** Pets en werelden ook als losse rijen bijwerken (handig om op te vragen). */
  async syncCollections() {
    const p = this.game.profile.profile, uid = this.user.id;
    const found = (p.collection && p.collection.found) || {};
    const petIds = Object.keys(found).sort();
    const sigPets = petIds.join(',');
    if (petIds.length && sigPets !== this.sigPets) {
      const rows = petIds.map(id => ({ user_id: uid, pet_id: id, found_at: new Date(found[id] || Date.now()).toISOString() }));
      const { error } = await this.client.from('pets').upsert(rows, { onConflict: 'user_id,pet_id', ignoreDuplicates: true });
      if (!error) this.sigPets = sigPets;
    }
    const w = p.worlds || { unlocked: {}, bosses: {} };
    const worldIds = Object.keys(w.unlocked).filter(id => w.unlocked[id]).sort();
    const sigWorlds = worldIds.map(id => id + ':' + (w.bosses[id] || 0)).join(',');
    if (worldIds.length && sigWorlds !== this.sigWorlds) {
      const rows = worldIds.map(id => ({ user_id: uid, world_id: id, bosses_defeated: w.bosses[id] || 0 }));
      const { error } = await this.client.from('worlds').upsert(rows, { onConflict: 'user_id,world_id' });
      if (!error) this.sigWorlds = sigWorlds;
    }
  }

  // --- runs ---------------------------------------------------------------------------
  /** Aan het eind van een run (alleen ingelogd). Eerst in de outbox, dan versturen. */
  recordRun(sum, { mode, tables, completed, world, op = 'mul' }) {
    if (!this.loggedIn) return;
    const clamp = n => Math.max(0, Math.round(n || 0));
    const answered = clamp(sum.answered), correct = Math.min(answered, clamp(sum.correct));
    writeOutbox([...readOutbox(), {
      user_id: this.user.id,
      client_run_id: newId(),
      played_at: new Date().toISOString(),
      mode, world,
      operation: op,
      tables: (tables || []).filter(t => t >= 1 && t <= 10),
      completed: !!completed,
      answered, correct,
      perfect: Math.min(correct, clamp(sum.perfect)),
      best_combo: clamp(sum.bestCombo),
      avg_rt_ms: clamp(sum.avgRt),
      coins: clamp(sum.coins),
      duration_ms: clamp(sum.durationMs),
    }]);
    this.flushOutbox();
  }

  async flushOutbox() {
    if (!this.loggedIn || this.flushing) return;
    const mine = readOutbox().filter(r => r.user_id === this.user.id);
    if (!mine.length) return;
    this.flushing = true;
    try {
      const { error } = await this.client.from('runs').upsert(mine, { onConflict: 'user_id,client_run_id', ignoreDuplicates: true });
      if (!error) {
        const sent = new Set(mine.map(r => r.client_run_id));
        writeOutbox(readOutbox().filter(r => !sent.has(r.client_run_id)));
      }
    } catch (e) { /* later opnieuw */ }
    this.flushing = false;
  }
}
