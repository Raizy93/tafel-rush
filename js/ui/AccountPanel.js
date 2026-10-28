// ---------------------------------------------------------------------------
// AccountPanel – vensters voor INLOGGEN, ACCOUNT MAKEN, je account en de keuze
// bij verschillende voortgang. Echte HTML-invulvakken (over de game heen), zodat
// schermtoetsenborden, wachtwoordbeheerders en tabben gewoon werken.
// Gebruikt de stijl en het venster van ClipboardPanel.
// ---------------------------------------------------------------------------
import { ClipboardPanel } from './ClipboardPanel.js';
import { ProgressCode } from '../storage/ProgressCode.js';
import { normalizeUsername, checkUsername, checkPassword } from '../net/syncLogic.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function field(id, label, type, extra = '') {
  return `<label class="cbp-label" for="${id}">${label}</label>
    <input id="${id}" type="${type}" spellcheck="false" autocorrect="off" autocapitalize="off" ${extra}>`;
}

export class AccountPanel {
  /** Opent het juiste venster: ingelogd → je account, anders → inloggen. */
  static open(game) {
    const acc = game.account;
    if (!acc || !acc.enabled || acc.panelOpen) return null;
    const p = new AccountPanel(game);
    if (acc.pendingChoice) p.showChoice();
    else if (acc.loggedIn) p.showAccount();
    else p.showLogin();
    return p;
  }

  constructor(game) {
    this.game = game;
    this.acc = game.account;
    this.acc.panelOpen = true;
    this.panel = new ClipboardPanel(() => { this.acc.panelOpen = false; game.input.focus(); });
    this.panel.el.classList.add('acp');
    this.box = this.panel.box;
    this.box.addEventListener('click', e => {
      const b = e.target.closest('button[data-a]');
      if (b && !b.disabled && this.actions[b.dataset.a]) this.actions[b.dataset.a]();
    });
    this.panel.el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && this.actions.enter) { e.preventDefault(); this.actions.enter(); }
    });
    this.actions = {};
  }

  close() { this.panel.close(); }

  render(html, actions) {
    this.box.innerHTML = html;
    this.actions = actions;
    this.msg = this.box.querySelector('.cbp-msg');
    const first = this.box.querySelector('input');
    if (first && !this.game.input.usingTouch) first.focus();
  }

  say(text, good = false) { if (this.msg) { this.msg.textContent = text; this.msg.style.color = good ? '#7dff8a' : '#ffb0a0'; } }

  /** Knoppen uit tijdens het wachten op internet. */
  async busy(label, fn) {
    const btns = [...this.box.querySelectorAll('button')];
    btns.forEach(b => { b.disabled = true; });
    this.say(label, true);
    try { await fn(); } catch (e) { this.say(e.message || 'Er ging iets mis.'); }
    btns.forEach(b => { b.disabled = false; });
  }

  val(id) { const el = this.box.querySelector('#' + id); return el ? el.value : ''; }

  // --- inloggen -----------------------------------------------------------------------
  showLogin(prefill = '') {
    this.render(`
      <h2>INLOGGEN</h2>
      <p>Log in om je voortgang te bewaren en op elk apparaat verder te spelen.</p>
      ${field('acp-user', 'Gebruikersnaam', 'text', `autocomplete="username" maxlength="20" value="${esc(prefill)}"`)}
      ${field('acp-pass', 'Wachtwoord', 'password', 'autocomplete="current-password" maxlength="72"')}
      <div class="cbp-msg"></div>
      <div class="cbp-row"><button class="go" data-a="login">INLOGGEN</button><button data-a="close">TERUG</button></div>
      <p class="cbp-small">Nog geen account? <button class="cbp-link" data-a="signup">Maak een account</button></p>
      <p class="cbp-small">Wachtwoord vergeten? Vraag het aan je juf of meester.</p>`, {
      login: () => this.doLogin(),
      enter: () => this.doLogin(),
      signup: () => this.showSignup(normalizeUsername(this.val('acp-user'))),
      close: () => this.close(),
    });
    this.lowercase('acp-user');
  }

  doLogin() {
    const u = this.val('acp-user'), pw = this.val('acp-pass');
    if (!u || !pw) { this.say('Vul je gebruikersnaam en wachtwoord in.'); return; }
    this.busy('Bezig met inloggen…', async () => {
      const decision = await this.acc.signIn(u, pw);
      this.afterLogin(decision);
    });
  }

  // --- account maken ------------------------------------------------------------------
  showSignup(prefill = '') {
    this.render(`
      <h2>ACCOUNT MAKEN</h2>
      <p class="cbp-warn">Gebruik niet je eigen naam! Verzin een gebruikersnaam, bijvoorbeeld <b>snelle_vos12</b>.</p>
      ${field('acp-user', 'Gebruikersnaam (3-20 tekens: letters, cijfers en _)', 'text', `autocomplete="username" maxlength="20" value="${esc(prefill)}"`)}
      ${field('acp-pass', 'Wachtwoord (minstens 6 tekens)', 'password', 'autocomplete="new-password" maxlength="72"')}
      ${field('acp-pass2', 'Wachtwoord nog een keer', 'password', 'autocomplete="new-password" maxlength="72"')}
      <p class="cbp-small">Schrijf je gebruikersnaam en wachtwoord ergens op, of laat je juf of meester het bewaren.</p>
      <div class="cbp-msg"></div>
      <div class="cbp-row"><button class="go" data-a="create">ACCOUNT MAKEN</button><button data-a="back">TERUG</button></div>`, {
      create: () => this.doSignup(),
      enter: () => this.doSignup(),
      back: () => this.showLogin(normalizeUsername(this.val('acp-user'))),
    });
    this.lowercase('acp-user');
  }

  doSignup() {
    const u = this.val('acp-user'), pw = this.val('acp-pass'), pw2 = this.val('acp-pass2');
    const bad = checkUsername(u) || checkPassword(pw) || (pw !== pw2 ? 'De twee wachtwoorden zijn niet hetzelfde.' : null);
    if (bad) { this.say(bad); return; }
    this.busy('Account maken…', async () => {
      const decision = await this.acc.signUp(u, pw);
      this.afterLogin(decision, true);
    });
  }

  afterLogin(decision, isNew = false) {
    if (decision === 'choose') { this.showChoice(); return; }
    this.close();
    this.game.goToTitle();
    this.game.toast(isNew ? 'ACCOUNT GEMAAKT! JE VOORTGANG WORDT BEWAARD' : decision === 'download' ? 'INGELOGD! JE VOORTGANG IS OPGEHAALD' : 'INGELOGD! JE VOORTGANG WORDT BEWAARD');
  }

  // --- je account ---------------------------------------------------------------------
  showAccount() {
    const a = this.acc;
    const status = { ok: 'Alles is opgeslagen in je account.', saving: 'Bezig met opslaan…', offline: 'Geen verbinding: je voortgang wordt opgeslagen zodra er weer internet is.', conflict: 'Je moet nog kiezen welke voortgang je houdt.', idle: 'Je voortgang wordt bewaard in je account.' }[a.sync] || '';
    this.render(`
      <h2>JOUW ACCOUNT</h2>
      <p>Ingelogd als <b class="cbp-name">${esc(a.username || '')}</b></p>
      <p>${status}</p>
      <div class="cbp-msg"></div>
      <div class="cbp-row"><button data-a="logout">UITLOGGEN</button><button class="go" data-a="close">SLUITEN</button></div>`, {
      close: () => this.close(),
      logout: () => this.doLogout(false),
    });
  }

  doLogout(force) {
    this.busy('Opslaan en uitloggen…', async () => {
      const done = await this.acc.signOut(force);
      if (done) { this.close(); this.game.toast('UITGELOGD. JE VOORTGANG STAAT VEILIG IN JE ACCOUNT'); return; }
      this.render(`
        <h2>NOG NIET OPGESLAGEN</h2>
        <p>Er is geen verbinding, dus je laatste voortgang staat nog niet in je account. Log je nu toch uit, dan ben je die kwijt.</p>
        <div class="cbp-msg"></div>
        <div class="cbp-row"><button class="go" data-a="stay">INGELOGD BLIJVEN</button><button data-a="force">TOCH UITLOGGEN</button></div>`, {
        stay: () => this.close(),
        force: () => this.doLogout(true),
      });
    });
  }

  // --- kiezen: account of dit apparaat ---------------------------------------------------
  showChoice() {
    const a = this.acc, ch = a.pendingChoice;
    if (!ch) { this.close(); return; }
    const line = p => { const s = ProgressCode.summary(p); return `${(p.stats && p.stats.totalAnswered) || 0} sommen gemaakt · ${s.coins} coins · ${s.pets} pets`; };
    const cloud = ch.cloud.data, here = this.game.profile.profile;
    this.render(`
      <h2>WELKE VOORTGANG HOUD JE?</h2>
      <p>Op je account staat andere voortgang dan op dit apparaat. Kies welke je wilt houden; de andere verdwijnt.</p>
      <p class="cbp-small"><b>Account:</b> ${line(cloud)}<br><b>Dit apparaat:</b> ${line(here)}</p>
      <div class="cbp-msg"></div>
      <div class="cbp-row"><button class="go" data-a="cloud">ACCOUNT</button><button data-a="local">DIT APPARAAT</button></div>`, {
      cloud: () => this.busy('Ophalen…', async () => { await a.resolveChoice('cloud'); this.close(); this.game.toast('JE VOORTGANG IS OPGEHAALD'); }),
      local: () => this.busy('Opslaan…', async () => { await a.resolveChoice('local'); this.close(); this.game.toast('JE VOORTGANG WORDT BEWAARD'); }),
    });
  }

  /** Gebruikersnaam altijd in kleine letters (zoals hij wordt opgeslagen). */
  lowercase(id) {
    const el = this.box.querySelector('#' + id);
    if (el) el.addEventListener('input', () => { const v = el.value.toLowerCase().replace(/\s/g, ''); if (v !== el.value) el.value = v; });
  }
}
