// ---------------------------------------------------------------------------
// TitleScene – startscherm. Snel naar START, maar wel duidelijk kiezen wat je
// traint: één tafel, een mix, powertraining of "mijn moeilijke sommen".
// Links een compacte characterkeuze (CharacterSelector).
// Bovenaan de wereldkeuze (Greenwood, Frostpeak …): W of klik op de pijltjes.
// Toetsenbord: ←/→ modus · 1-9/0 tafel · ↑/↓ held · W wereld · Enter start · M geluid.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { Button, COLORS } from '../ui/UI.js';
import { CharacterSelector } from '../ui/CharacterSelector.js';
import { ALL_TABLES, POWER_TABLES, factsForTable, factsForTables } from '../training/facts.js';
import { fmtInt, fmtSec } from '../core/util.js';
import { Chests } from '../systems/Chests.js';
import { Worlds } from '../systems/Worlds.js';
import { AccountPanel } from '../ui/AccountPanel.js';
import { getOperation } from '../training/operations.js';

const W = CONFIG.width;
const MODES = [
  { id: 'training', label: 'TRAINING' },
  { id: 'mix', label: 'MIX' },
  { id: 'power', label: 'POWER' },
  { id: 'hard', label: 'MOEILIJK' },
];

export class TitleScene {
  constructor(game) { this.game = game; }

  enter() {
    const g = this.game;
    const s = g.profile.settings;
    this.mode = MODES.some(m => m.id === s.lastMode) ? s.lastMode : 'training';
    this.table = s.lastTable || 7;
    this.mix = new Set(s.lastMixTables && s.lastMixTables.length ? s.lastMixTables : [6, 7, 8]);
    this.op = s.operation === 'div' ? 'div' : 'mul';   // gekozen soort sommen
    this.hard = g.trainer.hardModeStatus(40, 4, this.op);
    if (this.mode === 'hard' && !this.hard.available) this.mode = 'training';
    this.world = g.world;
    this.worldId = Worlds.selected(g.profile).id;
    this.world.setWorld(this.worldId);
    this.camX = 0;
    this.selector = new CharacterSelector(g, { x: 8, y: 64, w: 162, h: 160 });
    this.time = 0;
    this.hover = null;
    this.buildButtons();
    g.particles.clear();
    g.effects.clear();
    g.audio.playMusic('menu');
    g.audio.setIntensity(0);
    this.queueTips();
  }

  /** Tips die op het startscherm passen (pas na de eerste run, zodat de start rustig blijft). */
  queueTips() {
    const g = this.game, P = g.profile;
    // app op het beginscherm (iPhone/iPad) met nog lege voortgang: uitleggen hoe je hem ophaalt
    if (g.isStandalone && g.isIOS && P.stats.totalAnswered === 0) { g.tips.queue('appImport'); return; }
    if (P.stats.runs < 1) return;
    // belangrijkste eerst: er verschijnt hooguit één tip per bezoek
    const fresh = Worlds.all().some(w => w.id !== 'greenwood' && Worlds.isUnlocked(P, w.id) && !P.profile.history.some(h => h.world === w.id));
    if (fresh) g.tips.queue('newWorld');
    if (Chests.total(P) > 0) g.tips.queue('firstChest');
    if (P.coins >= 400) g.tips.queue('coins');
    g.tips.queue('help');
  }
  tipsAllowed() { return this.time > 0.6; }

  buildButtons() {
    const px = 176, pw = 296;
    this.panelRect = { x: px, y: 64, w: pw, h: 160 };
    this.modeButtons = MODES.map((m, i) => new Button({
      x: px + 10 + i * 70, y: 73, w: 66, h: 19, label: m.label, id: m.id,
      onClick: () => this.setMode(m.id),
    }));
    this.tableButtons = ALL_TABLES.map((t, i) => new Button({
      x: px + 15 + i * 27, y: 110, w: 24, h: 22, label: String(t), id: t,
      onClick: () => this.pickTable(t),
    }));
    this.startButton = new Button({ x: px + pw / 2 - 74, y: 143, w: 148, h: 28, label: 'START RUN', kind: 'go', font: 'big', icon: null, onClick: () => this.start() });
    this.buttons = [...this.modeButtons, ...this.tableButtons, this.startButton];
  }

  setMode(id) {
    if (id === 'hard' && !this.hard.available) { this.game.audio.play('error'); this.mode = 'hard'; return; }
    if (this.mode !== id) this.game.audio.play('select');
    this.mode = id;
  }

  pickTable(t) {
    if (this.mode === 'mix') {
      if (this.mix.has(t)) { if (this.mix.size > 1) this.mix.delete(t); } else this.mix.add(t);
    } else {
      this.mode = this.mode === 'training' || this.mode === 'mix' ? this.mode : 'training';
      this.table = t;
    }
    this.game.audio.play('select');
  }

  /** Andere wereld bekijken/kiezen (vergrendeld = teaser, START gaat dan niet). */
  cycleWorld(dir = 1) {
    const ids = Worlds.all().map(w => w.id);
    this.worldId = ids[(ids.indexOf(this.worldId) + dir + ids.length) % ids.length];
    this.world.setWorld(this.worldId);
    this.camX = 0;
    this.game.audio.play('select');
    if (Worlds.isUnlocked(this.game.profile, this.worldId)) this.game.profile.updateSettings({ lastWorld: this.worldId });
  }
  get worldUnlocked() { return Worlds.isUnlocked(this.game.profile, this.worldId); }

  canStart() {
    if (!this.worldUnlocked) return false;
    if (this.mode === 'hard') return this.hard.available;
    if (this.mode === 'mix') return this.mix.size > 0;
    return true;
  }

  start() {
    const g = this.game;
    if (!this.canStart()) { g.audio.play('error'); return; }
    g.audio.play('confirm');
    const tables = this.mode === 'training' ? [this.table] : this.mode === 'mix' ? [...this.mix].sort((a, b) => a - b) : this.mode === 'power' ? POWER_TABLES : [];
    g.profile.updateSettings({ lastMode: this.mode, lastTable: this.table, lastMixTables: [...this.mix], lastWorld: this.worldId });
    g.startRun(TitleScene.runOptions(g, this.mode, tables, this.worldId, this.op));
  }

  /** Bouw de run-opties (pool) voor een modus. Ook gebruikt door "nog een run". */
  static runOptions(g, mode, tables, world = Worlds.selected(g.profile).id, op = g.profile.settings.operation || 'mul') {
    if (op !== 'div') op = 'mul';
    const deel = op === 'div';
    let pool, successPool = null, label;
    if (mode === 'training') { pool = factsForTable(tables[0], op); label = (deel ? 'DEELTAFEL VAN ' : 'TAFEL VAN ') + tables[0]; }
    else if (mode === 'mix') { pool = factsForTables(tables, op); label = (deel ? 'DEEL-MIX ' : 'MIX ') + tables.join(' '); }
    else if (mode === 'power') { pool = factsForTables(POWER_TABLES, op); label = deel ? 'DEEL-POWERTRAINING' : 'POWERTRAINING'; }
    else {
      const all = factsForTables(POWER_TABLES, op);
      pool = g.trainer.hardestFacts(15, 2, op);
      // aanvullen tot minstens 12 met de volgende-zwakste sommen (minder herhalend)
      if (pool.length < 12) {
        const rest = all.filter(k => !pool.includes(k)).sort((a, b) => g.trainer.mastery(a) - g.trainer.mastery(b));
        pool = [...pool, ...rest.slice(0, 12 - pool.length)];
      }
      successPool = all;
      label = deel ? 'MIJN MOEILIJKE DEELSOMMEN' : 'MIJN MOEILIJKE SOMMEN';
    }
    return { mode, tables, pool, successPool, label, world, op };
  }

  onKey(a) {
    const g = this.game;
    if (g.account && g.account.panelOpen) return;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    if (a.type === 'account') { if (this.accountRect) { g.audio.play('select'); AccountPanel.open(g); } return; }
    if (a.type === 'enter') { this.start(); return; }
    if (a.type === 'shop') { g.audio.play('select'); g.openEquipment(); return; }
    if (a.type === 'map') { g.audio.play('select'); g.openMap(); return; }
    if (a.type === 'world') { this.cycleWorld(1); return; }
    if (a.type === 'help') { g.audio.play('select'); g.openHelp('spelen'); return; }
    if (a.type === 'soort') { g.audio.play('select'); g.openSoort(); return; }
    if (a.type === 'progress') { g.audio.play('select'); g.openProgress(); return; }
    if (a.type === 'book') { g.audio.play('select'); g.openBook(Chests.total(g.profile) > 0 ? 'chests' : 'book'); return; }
    if (a.type === 'up' || a.type === 'down') { this.selector.cycle(a.type === 'up' ? -1 : 1); return; }
    if (a.type === 'left' || a.type === 'right') {
      const i = MODES.findIndex(m => m.id === this.mode);
      const n = (i + (a.type === 'left' ? -1 : 1) + MODES.length) % MODES.length;
      this.setMode(MODES[n].id);
      return;
    }
    if (a.type === 'digit') {
      const t = a.value === '0' ? 10 : +a.value;
      if (this.mode === 'power' || this.mode === 'hard') this.mode = 'training';
      this.pickTable(t);
    }
  }

  onPointer(kind, x, y) {
    if (kind === 'move') { this.hover = this.buttons.find(b => b.visible && b.contains(x, y)) || null; this.hoverPoint = { x, y }; return; }
    if (kind !== 'down') return;
    if (this.game.account && this.game.account.panelOpen) return;
    const ar = this.accountRect;
    if (ar && x >= ar.x && y >= ar.y && x < ar.x + ar.w && y < ar.y + ar.h) { this.game.audio.play('select'); AccountPanel.open(this.game); return; }
    if (this.selector.onPointer(x, y)) return;
    for (const [r, d] of this.worldArrows || []) if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) { this.cycleWorld(d); return; }
    const hr = this.helpRect;
    if (hr && x >= hr.x && y >= hr.y && x < hr.x + hr.w && y < hr.y + hr.h) { this.game.audio.play('select'); this.game.openHelp('spelen'); return; }
    const sr = this.soortRect;
    if (sr && x >= sr.x && y >= sr.y && x < sr.x + sr.w && y < sr.y + sr.h) { this.game.audio.play('select'); this.game.openSoort(); return; }
    const pr = this.progressRect;
    if (pr && x >= pr.x && y >= pr.y && x < pr.x + pr.w && y < pr.y + pr.h) { this.game.audio.play('select'); this.game.openProgress(); return; }
    const m = this.mapRect, bk = this.bookRect;
    if (m && x >= m.x && y >= m.y && x < m.x + m.w && y < m.y + m.h) { this.game.audio.play('select'); this.game.openMap(); return; }
    if (bk && x >= bk.x && y >= bk.y && x < bk.x + bk.w && y < bk.y + bk.h) { this.game.audio.play('select'); this.game.openBook(Chests.total(this.game.profile) > 0 ? 'chests' : 'book'); return; }
    const b = this.buttons.find(b => b.visible && b.enabled && b.contains(x, y));
    if (b) { b.onClick(); return; }
    for (const r of this.soundRects || []) if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) this.game.toggleSound(r.kind);
    const f = this.fsRect;
    if (f && x >= f.x && y >= f.y && x < f.x + f.w && y < f.y + f.h) this.game.toggleFullscreen();
  }

  update(dt) {
    this.time += dt;
    const g0 = this.game;
    if (!g0.profile.settings.opChosen && !this.toSoort && !(g0.account && g0.account.panelOpen)) { this.toSoort = true; g0.openSoort(); return; }
    this.camX += 34 * dt;
    this.world.update(dt, this.camX, 1);
    this.selector.update(dt);
    this.game.particles.update(dt);
    this.hover = this.game.input.usingTouch ? null : this.hover;
    // knopstatus
    for (const b of this.modeButtons) b.selected = b.id === this.mode;
    const showTables = this.mode === 'training' || this.mode === 'mix';
    for (const b of this.tableButtons) {
      b.visible = showTables;
      b.selected = this.mode === 'training' ? b.id === this.table : this.mix.has(b.id);
    }
    this.startButton.enabled = this.canStart();
    // moet de speler kiezen welke voortgang hij houdt? (na inloggen of een conflict)
    const acc = this.game.account;
    if (acc && acc.pendingChoice && !acc.panelOpen && this.time > 0.3) AccountPanel.open(this.game);
  }

  draw(ctx) {
    const g = this.game, ui = g.ui, f = g.font;
    this.world.drawBack(ctx);
    this.world.drawFront(ctx);

    // logo
    const bob = Math.round(Math.sin(this.time * 2) * 1.5);
    f.draw(ctx, 'TAFEL RUSH', W / 2 + 2, 14 + bob + 2, { font: 'big', scale: 2, align: 'center', color: '#3a1d10', outline: '#1a1324', shadow: false });
    f.draw(ctx, 'TAFEL RUSH', W / 2, 14 + bob, { font: 'big', scale: 2, align: 'center', color: ['#fffbe0', '#fff1a0', '#ffc93c', '#ff9a2a', '#e0481e'], outline: '#1a1324' });
    this.drawWorldPicker(ctx, ui);
    // knop naar de UITLEG (linksboven)
    this.helpRect = { x: 6, y: 6, w: 76, h: 17 };
    const hp0 = this.hoverPoint, hh = hp0 && hp0.x >= 6 && hp0.y >= 6 && hp0.x < 82 && hp0.y < 23;
    ui.panel(ctx, 6, 6, 76, 17, hh ? 'btn_hover' : 'btn');
    ui.text(ctx, ui.key('? UITLEG', 'H'), 44, 11, { align: 'center', color: '#ffc93c', outline: null, shadow: false });
    // knop VOORTGANG (meenemen naar een ander apparaat)
    this.progressRect = { x: 6, y: 25, w: 76, h: 17 };
    const hp1 = this.hoverPoint, ph = hp1 && hp1.x >= 6 && hp1.y >= 25 && hp1.x < 82 && hp1.y < 42;
    ui.panel(ctx, 6, 25, 76, 17, ph ? 'btn_hover' : 'btn');
    ui.text(ctx, ui.key('VOORTGANG', 'V'), 44, 30, { align: 'center', color: '#8ff2ff', outline: null, shadow: false });
    // knop SOORT: tafels of deeltafels (opent het keuzescherm)
    this.soortRect = { x: 6, y: 44, w: 76, h: 17 };
    const hp2 = this.hoverPoint, sh = hp2 && hp2.x >= 6 && hp2.y >= 44 && hp2.x < 82 && hp2.y < 61;
    ui.panel(ctx, 6, 44, 76, 17, sh ? 'btn_hover' : 'btn_go');
    ui.text(ctx, getOperation(this.op).symbol + ' ' + getOperation(this.op).label, 44, 49, { align: 'center', color: '#fff8ec', outline: null, shadow: false });

    // paneel
    const p = this.panelRect;
    ui.panel(ctx, p.x, p.y, p.w, p.h, 'panel');
    for (const b of this.modeButtons) b.draw(ctx, ui, this.hover === b);
    this.selector.draw(ctx, ui, g.input.usingTouch ? null : this.hoverPoint);

    const cx = p.x + p.w / 2;
    if (this.mode === 'training') {
      ui.text(ctx, this.op === 'div' ? 'KIES EEN DEELTAFEL:' : 'KIES EEN TAFEL:', cx, 98, { align: 'center', color: COLORS.dim });
    } else if (this.mode === 'mix') {
      ui.text(ctx, this.op === 'div' ? 'KIES MEERDERE DEELTAFELS:' : 'KIES MEERDERE TAFELS:', cx, 98, { align: 'center', color: COLORS.dim });
    } else if (this.mode === 'power') {
      ui.text(ctx, this.op === 'div' ? 'ALLE DEELTAFELS 2 T/M 10' : 'ALLE TAFELS VAN 2 T/M 10', cx, 102, { align: 'center', font: 'big', color: ['#e0ffff', '#4fd0ff'] });
      ui.text(ctx, 'DOOR ELKAAR. GA ERVOOR!', cx, 123, { align: 'center' });
    } else {
      if (this.hard.available) {
        ui.text(ctx, 'JOUW LASTIGSTE SOMMEN', cx, 102, { align: 'center', font: 'big', color: COLORS.gold });
        ui.text(ctx, `${this.hard.hardCount} SOMMEN DIE NOG SNELLER KUNNEN`, cx, 123, { align: 'center' });
      } else {
        ui.icon(ctx, 'lock', cx - 6, 97);
        ui.text(ctx, 'NOG NIET BESCHIKBAAR', cx, 112, { align: 'center', color: '#ffb0a0' });
        const need = this.hard.needAnswers;
        ui.text(ctx, need > 0 ? `SPEEL EERST NOG ${need} SOMMEN` : 'NOG GEEN LASTIGE SOMMEN GEVONDEN. TOP!', cx, 124, { align: 'center', color: COLORS.dim });
      }
    }
    for (const b of this.tableButtons) b.draw(ctx, ui, this.hover === b);
    this.startButton.draw(ctx, ui, this.hover === this.startButton);
    if (!ui.touch) ui.icon(ctx, 'enter', this.startButton.x + this.startButton.w + 6, this.startButton.y + 8);

    // statistieken
    const P = g.profile, rec = P.recordsFor(this.op);
    const items = [
      ['trophy', 'RECORD', fmtInt(rec.mostCorrect)],
      ['flame', 'COMBO', fmtInt(rec.bestCombo)],
      ['coin', 'COINS', fmtInt(P.coins)],
      ['check', 'SOMMEN', fmtInt(P.answeredFor(this.op))],
    ];
    const sy = 186, sw = 70;
    const sx0 = cx - (items.length * sw) / 2;
    ctx.fillStyle = '#2a2248'; ctx.fillRect(p.x + 8, sy - 6, p.w - 16, 1);
    items.forEach(([icon, label, val], i) => {
      const x = sx0 + i * sw + 4;
      ui.icon(ctx, icon, x, sy + 2);
      ui.text(ctx, label, x + 15, sy, { color: COLORS.dim, outline: null, shadow: false });
      ui.text(ctx, val, x + 15, sy + 9, { color: icon === 'coin' ? COLORS.gold : '#fff8ec' });
    });
    // knoppen naar de TAFELKAART en het PETBOEK (met teller voor ongeopende kisten)
    this.mapRect = { x: cx - 136, y: sy + 19, w: 132, h: 15 };
    this.bookRect = { x: cx + 4, y: sy + 19, w: 132, h: 15 };
    const hp = this.hoverPoint;
    const over = r => hp && hp.x >= r.x && hp.y >= r.y && hp.x < r.x + r.w && hp.y < r.y + r.h;
    for (const [r, icon, label] of [[this.mapRect, 'star', ui.key('TAFELKAART', 'K')], [this.bookRect, 'book', ui.key('PETBOEK', 'B')]]) {
      ui.panel(ctx, r.x, r.y, r.w, r.h, over(r) ? 'btn_hover' : 'btn');
      ui.icon(ctx, icon, r.x + 4, r.y + 1);
      ui.text(ctx, label, r.x + r.w / 2 + 6, r.y + 4, { align: 'center', outline: null, shadow: false });
    }
    const nChests = Chests.total(P);
    if (nChests > 0) {
      const r = this.bookRect, bx = r.x + r.w - 20, by = r.y + 2;
      ui.icon(ctx, 'chest_tafel', bx - 1, by - 1);
      const s = String(nChests), w = Math.max(9, s.length * 6 + 3), x = r.x + r.w - 2, y = r.y - 5;
      ctx.fillStyle = '#1a1324'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 11);
      ctx.fillStyle = Math.floor(this.time * 2) % 2 ? '#e8483f' : '#ff6a5a'; ctx.fillRect(x - w / 2, y, w, 9);
      ui.text(ctx, s, x + 1, y + 1, { align: 'center', outline: null, shadow: false });
    }

    // hint + geluid
    ui.text(ctx, ui.hint('← → MODUS  1-9 0 TAFEL  ↑↓ HELD  W WERELD  U UITRUSTING  K KAART  B PETS', 'TIK OP EEN MODUS, EEN TAFEL EN JE HELD. DAARNA OP START RUN!'), W / 2, 260, { align: 'center', color: '#e8e4ff' });
    const a = g.audio;
    ui.icon(ctx, a.sfxOn ? 'sound' : 'mute', W - 52, 6, a.sfxOn ? 1 : 0.6);
    ui.icon(ctx, 'music', W - 36, 6, a.musicOn ? 1 : 0.35);
    this.soundRects = [{ x: W - 54, y: 4, w: 15, h: 15, kind: 'sfx' }, { x: W - 38, y: 4, w: 15, h: 15, kind: 'music' }];
    this.fsRect = g.drawFullscreenButton(ctx, W - 18, 6);
    this.drawAccountButton(ctx, ui);
  }

  /** Rechtsboven: INLOGGEN, of je gebruikersnaam met een bolletje (groen = opgeslagen). */
  drawAccountButton(ctx, ui) {
    const acc = this.game.account;
    this.accountRect = null;
    if (!acc || !acc.enabled) return;
    const r = this.accountRect = { x: W - 96, y: 25, w: 90, h: 17 };
    const hp = this.hoverPoint, hov = hp && hp.x >= r.x && hp.y >= r.y && hp.x < r.x + r.w && hp.y < r.y + r.h;
    ui.panel(ctx, r.x, r.y, r.w, r.h, hov ? 'btn_hover' : 'btn');
    if (acc.loggedIn) {
      const dot = { ok: '#5fd65a', saving: '#ffc93c', offline: '#ff6a5a', conflict: '#ff6a5a' }[acc.sync] || '#a8a0c8';
      ctx.fillStyle = '#1a1324'; ctx.fillRect(r.x + 5, r.y + 5, 7, 7);
      ctx.fillStyle = dot; ctx.fillRect(r.x + 6, r.y + 6, 5, 5);
      // naam inkorten tot hij in de knop past
      let name = (acc.username || '').toUpperCase();
      if (this.game.font.measure(name) > 72) { while (name.length > 1 && this.game.font.measure(name + '..') > 72) name = name.slice(0, -1); name += '..'; }
      ui.text(ctx, name, r.x + 52, r.y + 5, { align: 'center', color: '#8ff2ff', outline: null, shadow: false });
    } else {
      ui.text(ctx, ui.key('INLOGGEN', 'L'), r.x + r.w / 2, r.y + 5, { align: 'center', color: '#7dff8a', outline: null, shadow: false });
    }
  }

  /** Wereldkeuze onder het logo: ◄ NAAM ► (vergrendeld: slotje + voorwaarde). */
  drawWorldPicker(ctx, ui) {
    const g = this.game, w = Worlds.get(this.worldId), open = this.worldUnlocked;
    const pw = open ? 196 : 262, px = Math.round(W / 2 - pw / 2), py = 47;
    ui.panel(ctx, px, py, pw, 15, 'panel');
    this.worldArrows = [[{ x: px - 2, y: py - 2, w: 22, h: 19 }, -1], [{ x: px + pw - 20, y: py - 2, w: 22, h: 19 }, 1]];
    const hp = this.hoverPoint;
    for (const [r, d] of this.worldArrows) {
      const hov = hp && hp.x >= r.x && hp.y >= r.y && hp.x < r.x + r.w && hp.y < r.y + r.h;
      ui.text(ctx, d < 0 ? '←' : '→', r.x + 11, py + 4, { align: 'center', color: hov ? '#ffc93c' : '#e8e4ff' });
    }
    if (open) {
      ui.text(ctx, 'WERELD: ' + w.name, W / 2, py + 4, { align: 'center', color: w.color || '#c8f0c0' });
      const fresh = w.id !== 'greenwood' && g.profile.worldBosses(w.id) === 0 && !g.profile.profile.history.some(h => h.world === w.id);
      if (fresh) ui.text(ctx, 'NIEUW!', px + pw + 4, py + 4, { color: Math.floor(this.time * 3) % 2 ? '#ffc93c' : '#ffffff' });
    } else {
      ui.icon(ctx, 'lock', px + 24, py + 1);
      ui.text(ctx, w.name + ': ' + Worlds.requirementLabel(w.id), W / 2 + 8, py + 4, { align: 'center', color: '#ffb0a0', outline: null, shadow: false });
    }
  }
}
