// ---------------------------------------------------------------------------
// VoortgangScene – "VOORTGANG": je voortgang meenemen naar een ander apparaat,
// zonder account, server of database (zie storage/ProgressCode.js).
//   Links  een QR-code: scan hem met de camera van het andere apparaat → de
//          game opent daar en neemt de voortgang over (na een bevestiging).
//   Rechts CODE KOPIEREN (om zelf te bewaren of te versturen) en CODE PLAKKEN.
// Ophalen vervangt de voortgang op dit apparaat; daarom altijd eerst een
// overzicht ("in de code" ↔ "op dit apparaat") en een bevestiging.
//
// De QR-code is een los, haarscherp <canvas> over de game heen (niet in de
// pixelart-buffer), zodat een camera hem zo makkelijk mogelijk leest.
//
// iPhone/iPad: een web-app op het beginscherm heeft een EIGEN opslag, los van
// Safari. Een gescande QR-code opent in Safari; daarom bieden we daar ook
// "KOPIEER VOOR DE APP" aan (het klembord wordt wél gedeeld). In de app tik je
// dan VOORTGANG → CODE PLAKKEN.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from '../ui/UI.js';
import { QRCode } from '../ui/QRCode.js';
import { ClipboardPanel } from '../ui/ClipboardPanel.js';
import { ProgressCode } from '../storage/ProgressCode.js';
import { fmtInt } from '../core/util.js';

const W = CONFIG.width, H = CONFIG.height;
const QR_BOX = { x: 14, y: 40, s: 182 };   // logische plek van de QR-code (vierkant)
const RX = 206, RY = 34, RW = 266, RH = 214;

export class VoortgangScene {
  /** importText: code of link die al klaarligt (bijv. uit een gescande QR-link) */
  constructor(game, importText = null) { this.game = game; this.importText = importText; this.fromLink = !!importText; }

  enter() {
    this.time = 0;
    this.toast = null;
    this.pending = null;   // { profile, sum, cur } wachtend op bevestiging
    this.code = null;
    this.qr = null;
    this.qrError = null;
    this.backRect = { x: 150, y: 6, w: 70, h: 18 };
    this.copyRect = { x: RX + 14, y: RY + 72, w: RW - 28, h: 20 };
    this.pasteRect = { x: RX + 14, y: RY + 150, w: RW - 28, h: 20 };
    this.makeCode();
    if (this.importText) this.startImport(this.importText);
  }

  exit() {
    if (this.qrEl) { this.qrEl.remove(); this.qrEl = null; }
    if (this.panel) { const p = this.panel; this.panel = null; p.onClose = null; p.close(); }
  }

  /** Plak-/kopieervenster (HTML) openen; zolang het open is negeert de game invoer. */
  openPanel(kind, opts) {
    const g = this.game;
    this.panel = ClipboardPanel[kind]({ ...opts, touch: g.input.usingTouch, onClose: () => { this.panel = null; g.input.focus(); } });
  }

  async makeCode() {
    try {
      this.code = await ProgressCode.make(this.game.profile.profile);
      this.link = ProgressCode.link(this.code);
      this.qr = QRCode.encode(this.link, 'L');
      this.qrDrawnFor = null;
    } catch (e) {
      this.qrError = e.message.includes('QR') ? 'TE VEEL VOOR EEN QR-CODE: GEBRUIK CODE KOPIEREN' : 'KON GEEN CODE MAKEN';
    }
  }

  say(text, color = '#e8e4ff', t = 2.4) { this.toast = { text, color, t }; }

  // --- bewaren -------------------------------------------------------------------------
  async copy() {
    const g = this.game;
    if (!this.link) return;
    g.audio.play('select');
    try {
      await navigator.clipboard.writeText(this.link);
      this.say('GEKOPIEERD! BEWAAR HEM GOED (BIJV. IN JE NOTITIES)', '#7dff8a', 3);
    } catch (e) {
      // geen toegang tot het klembord (bijv. iPhone): venster met een echte KOPIEER-knop
      this.openPanel('copy', { text: this.link, info: 'Tik op KOPIEER en bewaar de code goed (bijv. in je notities).',
        onCopied: () => this.say('GEKOPIEERD! BEWAAR HEM GOED (BIJV. IN JE NOTITIES)', '#7dff8a', 3) });
      return;
    }
    g.input.focus();
  }

  // --- ophalen -------------------------------------------------------------------------
  async paste() {
    const g = this.game;
    g.audio.play('select');
    let text = null;
    if (!g.isIOS && !g.input.usingTouch) {
      try { if (navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText(); } catch (e) { text = null; }
    }
    if (ProgressCode.extract(text)) { g.input.focus(); this.startImport(text); return; }
    this.openPanel('paste', { valid: t => !!ProgressCode.extract(t), onDone: t => this.startImport(t) });
  }

  async startImport(text) {
    const g = this.game;
    try {
      const profile = await ProgressCode.read(text);
      this.pending = { profile, text, sum: ProgressCode.summary(profile), cur: ProgressCode.summary(g.profile.profile), t: 0,
        // in Safari op iPhone/iPad (niet in de app zelf): ook naar de app kunnen sturen
        forApp: this.fromLink && g.isIOS && !g.isStandalone };
      g.audio.play('chest');
    } catch (e) {
      g.audio.play('error');
      this.say('DIT IS GEEN GELDIGE VOORTGANGSCODE', '#ffb0a0', 3);
    }
  }

  async confirmImport() {
    const g = this.game, p = this.pending;
    if (!p || p.t < 0.5) return;
    this.pending = null;
    await g.profile.importData(p.profile);
    g.tips.reset();
    g.audio.play('record');
    g.particles.burst(W / 2, 120, { count: 40, colors: ['#ffc93c', '#7dff8a', '#ffffff'], speed: 150, g: 160, life: 1, screen: true });
    this.say('VOORTGANG OPGEHAALD! VEEL PLEZIER', '#7dff8a', 3);
    this.makeCode(); // de code hoort nu bij de nieuwe voortgang
  }
  /** Code op het klembord zetten voor de app op het beginscherm (iPhone/iPad). */
  async copyForApp() {
    const g = this.game, p = this.pending;
    if (!p) return;
    const link = ProgressCode.link(ProgressCode.extract(p.text));
    try { await navigator.clipboard.writeText(link); p.copied = true; g.audio.play('confirm'); }
    catch (e) {
      this.openPanel('copy', { text: link, title: 'KOPIEER VOOR DE APP', info: 'Tik op KOPIEER. Daarna open je Tafel Rush via het icoon op je beginscherm.',
        onCopied: () => { p.copied = true; g.audio.play('confirm'); } });
    }
  }
  cancelImport() { this.pending = null; this.game.audio.play('select'); this.say('NIETS VERANDERD', '#c8c0e8'); }

  // --- input ---------------------------------------------------------------------------
  onKey(a) {
    const g = this.game;
    if (this.panel) return;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    if (this.pending) {
      if (this.pending.copied) { if (a.type === 'enter' || a.type === 'escape') { this.pending = null; g.goToTitle(); } return; }
      if (a.type === 'enter') this.confirmImport();
      else if (a.type === 'escape') this.cancelImport();
      return;
    }
    if (a.type === 'escape' || a.type === 'progress') { g.audio.play('select'); g.goToTitle(); }
  }

  onPointer(kind, x, y) {
    if (kind !== 'down' || this.panel) return;
    const inside = r => r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    if (this.pending) {
      if (this.pending.copied) { if (inside(this.okRect)) { this.pending = null; this.game.goToTitle(); } return; }
      if (inside(this.okRect)) this.confirmImport();
      else if (inside(this.noRect)) this.cancelImport();
      else if (this.pending.forApp && inside(this.appRect)) this.copyForApp();
      return;
    }
    if (inside(this.backRect)) { this.game.audio.play('select'); this.game.goToTitle(); }
    else if (inside(this.copyRect)) this.copy();
    else if (inside(this.pasteRect)) this.paste();
  }

  update(dt) {
    this.time += dt;
    this.game.particles.update(dt);
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    if (this.pending) this.pending.t += dt;
    this.placeQR();
  }

  /** Scherpe QR-code als los canvas precies op QR_BOX (volgt het schalen van de game). */
  placeQR() {
    const show = this.qr && !this.pending && !this.panel;
    if (!show) { if (this.qrEl) this.qrEl.style.display = 'none'; return; }
    if (!this.qrEl) {
      this.qrEl = document.createElement('canvas');
      this.qrEl.setAttribute('aria-label', 'QR-code met je voortgang');
      Object.assign(this.qrEl.style, { position: 'fixed', zIndex: 5, imageRendering: 'pixelated', pointerEvents: 'none', borderRadius: '4px' });
      document.body.appendChild(this.qrEl);
    }
    const r = this.game.canvas.getBoundingClientRect(), k = r.width / W;
    const css = Math.floor(QR_BOX.s * k);
    const left = Math.round(r.left + QR_BOX.x * k), top = Math.round(r.top + QR_BOX.y * k);
    const key = this.link + '|' + css;
    Object.assign(this.qrEl.style, { display: 'block', left: left + 'px', top: top + 'px', width: css + 'px', height: css + 'px' });
    if (this.qrDrawnFor === key) return;
    this.qrDrawnFor = key;
    const n = this.qr.size + 8, dpr = window.devicePixelRatio || 1;
    const mod = Math.max(1, Math.floor((css * dpr) / n));
    this.qrEl.width = this.qrEl.height = mod * n;
    QRCode.draw(this.qrEl.getContext('2d'), this.qr, 0, 0, mod);
  }

  // --- tekenen -------------------------------------------------------------------------
  draw(ctx) {
    const g = this.game, ui = g.ui, P = g.profile;
    g.world.drawBack(ctx);
    g.world.drawFront(ctx);
    ctx.fillStyle = 'rgba(12,8,24,0.72)';
    ctx.fillRect(0, 0, W, H);
    ui.text(ctx, 'VOORTGANG', 12, 8, { font: 'big', color: COLORS.gold });
    ui.panel(ctx, this.backRect.x, this.backRect.y, this.backRect.w, this.backRect.h, 'btn');
    ui.text(ctx, '< TERUG', this.backRect.x + 35, this.backRect.y + 5, { align: 'center', outline: null, shadow: false });

    // links: QR-code (het echte plaatje ligt er als los canvas overheen)
    ui.panel(ctx, QR_BOX.x - 6, QR_BOX.y - 6, QR_BOX.s + 12, QR_BOX.s + 12, 'panel_light');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(QR_BOX.x, QR_BOX.y, QR_BOX.s, QR_BOX.s);
    if (!this.qr) ui.font.wrap(this.qrError || 'CODE MAKEN...', QR_BOX.s - 20, { outline: false }).forEach((l, i) => ui.text(ctx, l, QR_BOX.x + QR_BOX.s / 2, QR_BOX.y + 80 + i * 10, { align: 'center', color: '#3a3050', outline: null, shadow: false }));

    // rechts: uitleg + knoppen
    ui.panel(ctx, RX, RY, RW, RH, 'panel');
    const line = (t, y, color = '#e8e4ff') => ui.font.wrap(t, RW - 24, { outline: false }).forEach((l, i) => ui.text(ctx, l, RX + 12, y + i * 10, { color, outline: null, shadow: false }));
    ui.text(ctx, 'MEENEMEN', RX + 12, RY + 9, { font: 'big', color: ['#d0ffd8', '#5fd65a'] });
    line('SCAN DE QR-CODE MET DE CAMERA VAN JE ANDERE TELEFOON OF TABLET. OF KOPIEER DE CODE EN BEWAAR HEM GOED.', RY + 28);
    this.button(ctx, ui, this.copyRect, 'CODE KOPIEREN', 'btn_go');
    ctx.fillStyle = '#2a2248'; ctx.fillRect(RX + 10, RY + 102, RW - 20, 1);
    ui.text(ctx, 'OPHALEN', RX + 12, RY + 110, { font: 'big', color: ['#e0ffff', '#4fd0ff'] });
    line(ui.hint('HEB JE EEN CODE VAN EEN ANDER APPARAAT? KOPIEER HEM EN KLIK HIERONDER.', 'HEB JE EEN CODE VAN EEN ANDER APPARAAT? KOPIEER HEM EN TIK HIERONDER.'), RY + 128);
    this.button(ctx, ui, this.pasteRect, 'CODE PLAKKEN', 'btn');
    line('DE CODE BLIJFT BIJ JOU: ER GAAT NIETS NAAR INTERNET. NA VEEL OEFENEN? MAAK DAN EEN NIEUWE CODE.', RY + 178, COLORS.dim);

    if (this.toast) ui.text(ctx, this.toast.text, W / 2, 258, { align: 'center', color: this.toast.color, alpha: Math.min(1, this.toast.t / 0.4) });
    else ui.text(ctx, ui.hint('ESC = TERUG', 'TIK OP TERUG OM TERUG TE GAAN'), W / 2, 258, { align: 'center', color: '#e8e4ff' });
    if (this.pending) this.drawConfirm(ctx, ui);
    g.particles.draw(ctx, 0, true);
    void P;
  }

  button(ctx, ui, r, label, kind) {
    ui.panel(ctx, r.x, r.y, r.w, r.h, kind);
    ui.text(ctx, label, r.x + r.w / 2, r.y + 6, { align: 'center', outline: '#1a1324', shadow: false });
  }

  drawConfirm(ctx, ui) {
    const p = this.pending;
    ctx.fillStyle = 'rgba(8,5,16,0.8)'; ctx.fillRect(0, 0, W, H);
    if (p.copied) { this.drawCopiedForApp(ctx, ui); return; }
    const pw = 320, ph = p.forApp ? 196 : 150, px = (W - pw) / 2, py = p.forApp ? 34 : 52;
    ui.panel(ctx, px, py, pw, ph, 'panel');
    ui.text(ctx, 'VOORTGANG OPHALEN?', W / 2, py + 9, { font: 'big', align: 'center', color: COLORS.gold });
    const row = (label, s, y, color) => {
      ui.text(ctx, label, px + 14, y, { color, outline: null, shadow: false });
      ui.text(ctx, `${s.practiced} ${s.practiced === 1 ? 'SOM' : 'SOMMEN'} · ${s.gold} GOUD · ${s.pets} ${s.pets === 1 ? 'PET' : 'PETS'} · ${fmtInt(s.coins)} COINS`, px + 14, y + 11, { color: '#e8e4ff', outline: null, shadow: false });
    };
    row('IN DE CODE:', p.sum, py + 32, '#7dff8a');
    row('NU OP DIT APPARAAT (WORDT VERVANGEN):', p.cur, py + 62, '#ffb0a0');
    ui.text(ctx, 'ZEKER WETEN?', W / 2, py + 92, { align: 'center', color: '#e8e4ff' });
    const by = py + (p.forApp ? 106 : ph - 34);
    this.okRect = { x: px + 22, y: by, w: 130, h: 22 };
    this.noRect = { x: px + pw - 152, y: by, w: 130, h: 22 };
    this.appRect = p.forApp ? { x: px + 22, y: py + ph - 34, w: pw - 44, h: 22 } : null;
    if (p.t >= 0.5) {
      this.button(ctx, ui, this.okRect, ui.hint('VERVANGEN (ENTER)', 'HIER OPHALEN'), 'btn_go');
      this.button(ctx, ui, this.noRect, ui.hint('ANNULEREN (ESC)', 'ANNULEREN'), 'btn');
      if (p.forApp) {
        ctx.fillStyle = '#2a2248'; ctx.fillRect(px + 14, py + 136, pw - 28, 1);
        ui.text(ctx, 'SPEEL JE VIA HET ICOON OP JE BEGINSCHERM?', W / 2, py + 144, { align: 'center', color: '#8ff2ff', outline: null, shadow: false });
        this.button(ctx, ui, this.appRect, 'KOPIEER VOOR DE APP', 'btn_go');
      }
    }
  }

  /** Na "KOPIEER VOOR DE APP": korte stappen om in de app te plakken. */
  drawCopiedForApp(ctx, ui) {
    const pw = 320, ph = 150, px = (W - pw) / 2, py = 52;
    ui.panel(ctx, px, py, pw, ph, 'panel');
    ui.text(ctx, 'GEKOPIEERD!', W / 2, py + 9, { font: 'big', align: 'center', color: ['#d0ffd8', '#5fd65a'] });
    ['1. OPEN TAFEL RUSH VIA HET ICOON OP JE BEGINSCHERM', '2. TIK LINKSBOVEN OP VOORTGANG', '3. TIK OP CODE PLAKKEN EN DAN OP PLAK', '4. KIES VERVANGEN'].forEach((l, i) => ui.text(ctx, l, px + 16, py + 34 + i * 14, { color: '#e8e4ff', outline: null, shadow: false }));
    this.okRect = { x: W / 2 - 60, y: py + ph - 34, w: 120, h: 22 };
    this.button(ctx, ui, this.okRect, 'OK', 'btn_go');
  }
}
