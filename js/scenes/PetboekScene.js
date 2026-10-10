// ---------------------------------------------------------------------------
// PetboekScene – verzamelen! Drie tabs:
//   PETBOEK       alle pets als kaartjes, op pagina's: KIST-PETS (10) en per
//                 wereld 5 wereld-exclusieve pets. Gevonden = in kleur en
//                 bewegend; nog niet gevonden = gedempt achter een slotje
//                 (teaser, met "TE VINDEN IN …"). Enter = gebruiken (nog eens =
//                 zonder pet) · ontbrekende pet "lokken" met snoepjes (2× Enter);
//                 wereld-pets pas na het verslaan van de boss van die wereld.
//                 Bladeren: W, klik op de pagina, of ←/→ voorbij de rand.
//   KISTEN        houten kist (te koop), tafelkist en gouden kist (verdienen door
//                 te oefenen), met de kansen erbij. Enter = openen, Spatie = kopen.
//   WERELDKISTEN  Boskist, Sneeuwkist, Stormkist – alleen door de boss van die
//                 wereld te verslaan; er zitten alleen die wereld-pets in.
// Openen = korte show: kist wiebelt → springt open → pet verschijnt.
// Alle regels staan in systems/Chests.js en data/chests.js + data/pets.js.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from '../ui/UI.js';
import { Animator, drawFrame } from '../core/Sprite.js';
import { Chests } from '../systems/Chests.js';
import { Equipment } from '../systems/Equipment.js';
import { PETS, PET_ORDER, WORLD_PET_ORDER, ALL_PET_ORDER, RARITIES } from '../data/pets.js';
import { CHESTS, CHEST_ORDER, WORLD_CHEST_ORDER, ALL_CHEST_ORDER, WORLD_CHESTS, CHEST_RULES, TREATS } from '../data/chests.js';
import { WORLDS, BOSSES } from '../data/worlds.js';
import { Worlds } from '../systems/Worlds.js';
import { PetFx } from '../entities/PetFx.js';
import { fmtInt, clamp, easeOutCubic } from '../core/util.js';

const W = CONFIG.width, H = CONFIG.height;
const TABS = [{ id: 'book', label: 'PETBOEK' }, { id: 'chests', label: 'KISTEN' }, { id: 'wchests', label: 'WERELDKISTEN' }];
// pagina's van het petboek: kist-pets + één per wereld
const PAGES = [
  { id: 'kist', label: 'KIST-PETS', pets: PET_ORDER, color: '#ffc93c' },
  ...Object.keys(WORLD_PET_ORDER).map(w => ({ id: w, label: WORLDS[w].name, world: w, pets: WORLD_PET_ORDER[w], color: WORLDS[w].color })),
];
const COLS = 5, CW = 56, CH = 84, GX = 10, GY = 68, GAP = 3;
const DX = 308, DY = 50, DW = 164, DH = 190;    // detailpaneel (tab petboek)
const KX = 8, KY = 50, KW = 464, KH = 192;      // kistenpaneel

export class PetboekScene {
  constructor(game, tab = 'book') { this.game = game; this.startTab = tab; }

  enter() {
    const g = this.game, p = g.profile;
    this.tab = Math.max(0, TABS.findIndex(t => t.id === this.startTab));
    this.time = 0;
    this.toast = null;
    this.confirm = null;
    this.opening = null;
    this.hover = null;
    this.cardAni = {};
    for (const id of ALL_PET_ORDER) this.cardAni[id] = new Animator(g.assets.sheet(PETS[id].sheet), 'idle');
    // start op de pagina van de gekozen pet (of van een nieuwe pet)
    const cur = Equipment.equippedPet(p);
    const startId = ALL_PET_ORDER.find(id => Chests.isNew(p, id)) || (cur ? cur.id : 'fox');
    this.page = Math.max(0, PAGES.findIndex(pg => pg.pets.includes(startId)));
    this.sel = Math.max(0, PAGES[this.page].pets.indexOf(startId));
    this.chestAni = {};
    for (const k of ALL_CHEST_ORDER) this.chestAni[k] = new Animator(g.assets.sheet(CHESTS[k].sheet), 'idle');
    // "kisten" openen terwijl je alleen wereldkisten hebt → meteen naar die tab
    if (this.tabId === 'chests' && !CHEST_ORDER.some(k => Chests.count(p, k) > 0) && WORLD_CHEST_ORDER.some(k => Chests.count(p, k) > 0)) this.tab = 2;
    this.tabRects = TABS.map((t, i) => ({ x: 10 + i * 104, y: 31, w: 100, h: 17 }));
    this.pageRects = PAGES.map((pg, i) => ({ x: GX + i * 74, y: 51, w: 70, h: 14 }));
    this.backRect = { x: 150, y: 6, w: 70, h: 18 };
    this.layoutCards();
    this.layoutChests();
    this.setPreview(this.petId);
    g.particles.clear();
    g.audio.playMusic('menu');
    g.tips.queue('pages');
  }

  tipsAllowed() { return !this.opening && this.time > 0.4; }
  openHelp() { const tab = this.tabId === 'book' ? 'book' : 'chests'; this.game.audio.play('select'); this.game.openHelp(this.tabId === 'wchests' ? 'werelden' : 'pets', () => this.game.openBook(tab)); }

  get tabId() { return TABS[this.tab].id; }
  get pageDef() { return PAGES[this.page]; }
  get petId() { return this.pageDef.pets[this.sel]; }
  /** Kisten van de huidige kisten-tab. */
  get chestKinds() { return this.tabId === 'wchests' ? WORLD_CHEST_ORDER : CHEST_ORDER; }

  layoutCards() {
    this.cards = this.pageDef.pets.map((id, i) => ({ id, x: GX + (i % COLS) * (CW + GAP), y: GY + Math.floor(i / COLS) * (CH + GAP), w: CW, h: CH }));
  }
  layoutChests() {
    const kinds = this.chestKinds;
    this.chestCols = kinds.map((k, i) => ({ kind: k, x: KX + 6 + i * 152, y: KY + 4, w: 148, h: KH - 8 }));
    this.chestSel = Math.max(0, kinds.findIndex(k => Chests.count(this.game.profile, k) > 0));
  }
  setPage(i, selIndex = 0) {
    this.page = (i + PAGES.length) % PAGES.length;
    this.sel = Math.min(selIndex, this.pageDef.pets.length - 1);
    this.confirm = null;
    this.layoutCards();
    this.setPreview(this.petId);
    this.game.audio.play('select');
  }

  setPreview(id) {
    if (this.previewId === id) return;
    this.previewId = id;
    this.previewAni = new Animator(this.game.assets.sheet(PETS[id].sheet), 'idle');
    this.previewCycle = 0;
    this.previewFx = {};
    this.seenT = 0.8;
  }

  say(text, color = '#e8e4ff') { this.toast = { text, color, t: 2 }; }

  // --- acties --------------------------------------------------------------------------
  activatePet() {
    const g = this.game, p = g.profile, id = this.petId, pet = PETS[id];
    if (Chests.owns(p, id)) {
      const cur = Equipment.equippedPet(p);
      if (cur && cur.id === id) { Equipment.equipPet(p, null); g.audio.play('select'); this.say('ZONDER PET', '#c8c0e8'); }
      else { Equipment.equipPet(p, id); g.audio.play('confirm'); this.say(pet.name + ' LOOPT MET JE MEE!', '#7dff8a'); this.previewAni.play('cheer', true); this.burstPreview(); }
      return;
    }
    if (!Chests.canLure(p, id)) { g.audio.play('error'); this.say('VERSLA EERST ' + BOSSES[WORLDS[pet.world].boss].name, '#ffb0a0'); return; }
    const price = Chests.lurePrice(id);
    if (Chests.treats(p) < price) { g.audio.play('error'); this.say('NOG ' + fmtInt(price - Chests.treats(p)) + ' ' + TREATS.name + ' NODIG', '#ffb0a0'); return; }
    if (!this.confirm || this.confirm.id !== id) { this.confirm = { id, t: 2.5 }; g.audio.play('select'); return; }
    this.confirm = null;
    const res = Chests.lure(p, id);
    if (!res.ok) { g.audio.play('error'); this.say('KAN NIET', '#ffb0a0'); return; }
    Chests.markSeen(p, id);
    g.audio.play('reveal', { rarity: pet.rarity });
    this.say(pet.name + ' GEVONDEN!', RARITIES[pet.rarity].color);
    this.previewAni.play('cheer', true);
    this.burstPreview(true);
  }

  activateChest(buy = false) {
    const g = this.game, p = g.profile, kind = this.chestKinds[this.chestSel], c = CHESTS[kind];
    if (!buy && Chests.count(p, kind) > 0) { this.startOpening(kind); return; }
    if (!c.price) { g.audio.play('error'); this.say(c.world ? c.how + ' VOOR EEN ' + c.name : 'DEZE KIST VERDIEN JE DOOR TE OEFENEN', '#ffb0a0'); return; }
    if (p.coins < c.price) { g.audio.play('error'); this.say('NOG ' + fmtInt(c.price - p.coins) + ' COINS NODIG', '#ffb0a0'); return; }
    if (!this.confirm || this.confirm.id !== kind) { this.confirm = { id: kind, t: 2.5 }; g.audio.play('select'); return; }
    this.confirm = null;
    if (Chests.buy(p, kind).ok) {
      g.audio.play('coin');
      this.say(c.name + ' GEKOCHT!', COLORS.goldFlat);
      const col = this.chestCols[this.chestSel];
      g.particles.burst(col.x + col.w / 2, col.y + 80, { count: 20, colors: ['#ffc93c', '#fff1a0', '#ffffff'], speed: 110, g: 200, life: 0.7, screen: true });
    }
  }

  // --- kist openen (show) ------------------------------------------------------------------
  startOpening(kind) {
    const g = this.game;
    const res = Chests.open(g.profile, kind);
    if (!res.ok) { g.audio.play('error'); return; }
    if (!res.isNew) g.tips.queue('duplicate', true);
    const rank = RARITIES[res.rarity].order;
    this.opening = {
      res, kind, t: 0, phase: 'shake',
      shakeDur: 0.9 + rank * 0.18,          // zeldzamer = net iets langer spanning
      ani: new Animator(g.assets.sheet(CHESTS[kind].sheet), 'shake'),
      petAni: new Animator(g.assets.sheet(PETS[res.petId].sheet), 'cheer'),
      fx: {}, ticks: 0,
    };
    this.confirm = null;
    g.audio.play('chestTick');
  }

  advanceOpening() {
    const o = this.opening, g = this.game;
    if (o.phase === 'shake') { o.t = o.shakeDur; return; }   // overslaan
    if (o.phase === 'burst') { o.t = 0.55; return; }
    if (o.t < 0.5) return;
    this.opening = null;
    if (Chests.count(g.profile, this.chestKinds[this.chestSel]) <= 0) {
      const any = this.chestKinds.findIndex(k => Chests.count(g.profile, k) > 0);
      if (any >= 0) this.chestSel = any;
    }
    g.audio.play('select');
  }

  useOpenedPet() {
    const o = this.opening, g = this.game;
    Equipment.equipPet(g.profile, o.res.petId);
    Chests.markSeen(g.profile, o.res.petId);
    g.audio.play('confirm');
    this.say(PETS[o.res.petId].name + ' LOOPT MET JE MEE!', '#7dff8a');
    this.opening = null;
  }

  updateOpening(dt) {
    const o = this.opening, g = this.game;
    o.t += dt;
    if (o.phase === 'shake') {
      o.ani.update(dt);
      const tick = Math.floor(o.t / 0.3);
      if (tick > o.ticks) { o.ticks = tick; g.audio.play('chestTick'); }
      if (Math.random() < 0.4) g.particles.spawn({ x: W / 2 + (Math.random() - 0.5) * 60, y: 150, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, life: 0.6, size: 1, color: CHESTS[o.kind].color, screen: true, glow: true });
      if (o.t >= o.shakeDur) {
        o.phase = 'burst'; o.t = 0;
        o.ani.play('open', true);
        const rar = RARITIES[o.res.rarity];
        g.audio.play('chestPop');
        g.renderer.shake(o.res.rarity === 'legendary' ? 5 : o.res.rarity === 'epic' ? 3 : 1.5, 0.4);
        g.particles.burst(W / 2, 130, { count: 30 + rar.order * 20, colors: [rar.color, '#ffffff', CHESTS[o.kind].color], speed: 160 + rar.order * 40, g: 160, life: 1.1, size: [1, 2], screen: true, glow: true });
      }
    } else if (o.phase === 'burst') {
      o.ani.update(dt);
      if (o.t >= 0.55) {
        o.phase = 'reveal'; o.t = 0;
        g.audio.play('reveal', { rarity: o.res.rarity });
        const sheet = g.assets.sheet(PETS[o.res.petId].sheet);
        PetFx.cheer(g.particles, PETS[o.res.petId], sheet, W / 2, 128, { screen: true, scale: 2 });
      }
    } else {
      o.petAni.update(dt);
      if (o.petAni.name === 'cheer' && o.petAni.t > 1.6) o.petAni.play('idle', true);
      const sheet = g.assets.sheet(PETS[o.res.petId].sheet);
      PetFx.emit(g.particles, PETS[o.res.petId], W / 2, 128, dt, o.fx, { screen: true, scale: 2, moving: false });
      const rar = RARITIES[o.res.rarity];
      if (rar.order >= 2 && Math.random() < 0.25 * rar.order) g.particles.spawn({ x: Math.random() * W, y: -2, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 40, life: 3, size: 1, color: rar.color, screen: true, shrink: false });
    }
  }

  burstPreview(big = false) {
    const g = this.game, def = PETS[this.previewId];
    const sheet = g.assets.sheet(def.sheet);
    const c = this.previewFloor();
    PetFx.cheer(g.particles, def, sheet, c.x, c.y - this.hover2(def), { screen: true, scale: 2 });
    if (big) g.particles.burst(c.x, c.y - 30, { count: 30, colors: [RARITIES[def.rarity].color, '#ffffff'], speed: 120, g: 150, life: 0.9, screen: true });
  }

  previewFloor() { return { x: DX + DW / 2, y: DY + 104 }; }
  /** Zweefhoogte in de (2× vergrote) preview: net los van de grond. */
  hover2(def) { return def.flying ? 10 : 0; }

  // --- input -------------------------------------------------------------------------------
  onKey(a) {
    const g = this.game;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    if (this.opening) {
      const o = this.opening;
      if (o.phase === 'reveal' && o.res.isNew && (a.type === 'enter' || a.type === 'space') && o.t >= 0.5) { this.useOpenedPet(); return; }
      if (a.type === 'enter' || a.type === 'space' || a.type === 'escape') this.advanceOpening();
      return;
    }
    if (a.type === 'escape' || a.type === 'book') { g.audio.play('select'); g.goToTitle(); return; }
    if (a.type === 'help') { this.openHelp(); return; }
    if (a.type === 'next' || a.type === 'prev') { this.switchTab(this.tab + 1); return; }
    if (this.tabId === 'book') {
      const n = this.pageDef.pets.length, col = this.sel % COLS, row = Math.floor(this.sel / COLS);
      let s = this.sel;
      if (a.type === 'world') { this.setPage(this.page + 1, this.sel); return; }
      // voorbij de linker/rechterrand = vorige/volgende pagina
      if (a.type === 'left') { if (col === 0) { this.setPage(this.page - 1, row * COLS + COLS - 1); return; } s--; }
      else if (a.type === 'right') { if (col === COLS - 1 || s + 1 >= n) { this.setPage(this.page + 1, row * COLS); return; } s++; }
      else if (a.type === 'up' || a.type === 'down') s = n > COLS ? (s + COLS) % n : s;
      else if (a.type === 'enter' || a.type === 'space') { this.activatePet(); return; }
      else return;
      if (s !== this.sel) { this.sel = s; this.confirm = null; this.setPreview(this.petId); g.audio.play('select'); }
    } else {
      const kinds = this.chestKinds;
      if (a.type === 'left' || a.type === 'right') {
        this.chestSel = (this.chestSel + (a.type === 'left' ? kinds.length - 1 : 1)) % kinds.length;
        this.confirm = null; g.audio.play('select');
      } else if (a.type === 'enter') this.activateChest(false);
      else if (a.type === 'space' && this.tabId === 'chests') { this.chestSel = 0; this.activateChest(true); }
    }
  }

  switchTab(i) {
    const n = (i + TABS.length) % TABS.length;
    if (n === this.tab) return;
    this.tab = n; this.confirm = null;
    if (this.tabId !== 'book') this.layoutChests();
    this.game.audio.play('select');
  }

  onPointer(kind, x, y) {
    const inside = r => r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    if (kind === 'move') { this.hover = { x, y }; return; }
    if (kind !== 'down') return;
    const g = this.game;
    if (this.opening) {
      const o = this.opening;
      if (o.phase === 'reveal' && o.res.isNew && inside(this.useRect)) { this.useOpenedPet(); return; }
      this.advanceOpening();
      return;
    }
    if (inside(this.backRect)) { g.audio.play('select'); g.goToTitle(); return; }
    if (inside(this.helpRect)) { this.openHelp(); return; }
    const ti = this.tabRects.findIndex(inside);
    if (ti >= 0) { this.switchTab(ti); return; }
    if (this.tabId === 'book') {
      const pi = this.pageRects.findIndex(inside);
      if (pi >= 0) { if (pi !== this.page) this.setPage(pi); return; }
      const ci = this.cards.findIndex(inside);
      if (ci >= 0) {
        if (ci === this.sel) this.activatePet();
        else { this.sel = ci; this.confirm = null; this.setPreview(this.petId); g.audio.play('select'); }
        return;
      }
      if (inside(this.actionRect)) this.activatePet();
    } else {
      const ki = this.chestCols.findIndex(inside);
      if (ki < 0) return;
      if (ki !== this.chestSel) { this.chestSel = ki; this.confirm = null; g.audio.play('select'); }
      const col = this.chestCols[ki];
      if (inside(col.buyRect)) this.activateChest(true);
      else if (inside(col.openRect)) this.activateChest(false);
    }
  }

  // --- update ------------------------------------------------------------------------------
  update(dt) {
    const g = this.game;
    this.time += dt;
    g.particles.update(dt);
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    if (this.confirm) { this.confirm.t -= dt; if (this.confirm.t <= 0) this.confirm = null; }
    for (const a of Object.values(this.cardAni)) a.update(dt);
    for (const a of Object.values(this.chestAni)) a.update(dt);
    if (this.opening) { this.updateOpening(dt); return; }
    // preview-demo: idle → rennen → juichen
    this.previewCycle += dt;
    const owned = Chests.owns(g.profile, this.previewId);
    const ph = this.previewCycle % 6;
    const want = !owned ? 'idle' : ph < 2.2 ? 'idle' : ph < 4.6 ? 'run' : 'cheer';
    if (this.previewAni.name !== want && !(this.previewAni.name === 'cheer' && this.previewAni.t < 1.2)) {
      this.previewAni.play(want, true);
      if (want === 'cheer') this.burstPreview();
    }
    this.previewAni.update(dt);
    if (owned && this.tabId === 'book') {
      const def = PETS[this.previewId], f = this.previewFloor();
      PetFx.emit(g.particles, def, f.x, f.y - this.hover2(def), dt, this.previewFx, { screen: true, scale: 2, moving: this.previewAni.name === 'run' });
      // "NIEUW!" verdwijnt als je hem even bekeken hebt
      if (Chests.isNew(g.profile, this.previewId)) { this.seenT -= dt; if (this.seenT <= 0) Chests.markSeen(g.profile, this.previewId); }
    }
  }

  // --- tekenen -----------------------------------------------------------------------------
  draw(ctx) {
    const g = this.game, ui = g.ui, p = g.profile;
    const off = g.renderer.shakeOffset(g.dt);
    ctx.save();
    ctx.translate(off.x, off.y);
    g.world.drawBack(ctx);
    g.world.drawFront(ctx);
    ctx.fillStyle = 'rgba(12,8,24,0.7)';
    ctx.fillRect(-8, -8, W + 16, H + 16);

    // kop: titel, terug, snoepjes + coins
    ui.text(ctx, 'PETBOEK', 12, 8, { font: 'big', color: COLORS.gold });
    ui.panel(ctx, this.backRect.x, this.backRect.y, this.backRect.w, this.backRect.h, 'btn');
    ui.text(ctx, '< TERUG', this.backRect.x + 35, this.backRect.y + 5, { align: 'center', outline: null, shadow: false });
    this.helpRect = ui.helpButton(ctx, 224, 6);
    ui.panel(ctx, W - 92, 6, 86, 20, 'panel');
    ui.icon(ctx, 'coin', W - 86, 10);
    ui.text(ctx, fmtInt(p.coins), W - 13, 12, { align: 'right', color: COLORS.gold });
    ui.panel(ctx, W - 184, 6, 88, 20, 'panel');
    ui.icon(ctx, TREATS.icon, W - 178, 10);
    ui.text(ctx, fmtInt(Chests.treats(p)), W - 105, 12, { align: 'right', color: '#ff9ad0' });

    // tabs (met teller)
    const found = Chests.foundCount(p, ALL_PET_ORDER);
    const nOf = kinds => kinds.reduce((sum, k) => sum + Chests.count(p, k), 0);
    TABS.forEach((t, i) => {
      const r = this.tabRects[i], on = i === this.tab;
      ui.panel(ctx, r.x, r.y, r.w, r.h, on ? 'btn_on' : 'btn');
      const n = t.id === 'chests' ? nOf(CHEST_ORDER) : t.id === 'wchests' ? nOf(WORLD_CHEST_ORDER) : 0;
      const label = t.id === 'book' ? `${t.label} ${found}/${ALL_PET_ORDER.length}` : `${t.label} (${n})`;
      ui.text(ctx, label, r.x + r.w / 2, r.y + 5, { align: 'center', color: on ? '#3a1d10' : '#fff8ec', outline: on ? null : '#1a1324', shadow: false });
      if (t.id !== 'book' && n > 0 && !on) this.badge(ctx, ui, r.x + r.w - 4, r.y - 3, n);
    });

    if (this.tabId === 'book') { this.drawPages(ctx, ui, p); this.drawBook(ctx, ui, p); if (this.pageDef.world) this.drawWorldInfo(ctx, ui, p); }
    else this.drawChests(ctx, ui, p);

    // onderregel
    if (this.toast) ui.text(ctx, this.toast.text, W / 2, 258, { align: 'center', color: this.toast.color, alpha: Math.min(1, this.toast.t / 0.4) });
    else ui.text(ctx, this.tabId === 'book' ? 'PIJLTJES = KIES   W = VOLGENDE PAGINA   ENTER = GEBRUIK / LOK   TAB   ESC' : this.tabId === 'chests' ? '← → KIES KIST   ENTER = OPENEN   SPATIE = HOUTEN KIST KOPEN   TAB   ESC' : '← → KIES KIST   ENTER = OPENEN   TAB = PETBOEK   ESC = TERUG', W / 2, 258, { align: 'center', color: '#e8e4ff' });
    g.particles.draw(ctx, 0, true);
    if (this.opening) this.drawOpening(ctx, ui);
    ctx.restore();
  }

  badge(ctx, ui, x, y, n) {
    const s = String(n), w = Math.max(9, s.length * 6 + 3);
    ctx.fillStyle = '#1a1324'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 11);
    ctx.fillStyle = Math.floor(this.time * 2) % 2 ? '#e8483f' : '#ff6a5a'; ctx.fillRect(x - w / 2, y, w, 9);
    ui.text(ctx, s, x + 1, y + 1, { align: 'center', outline: null, shadow: false });
  }

  /** Pet tekenen: gevonden in kleur, anders gedempt (donker silhouet + vage kleur). */
  drawPet(ctx, def, ani, x, y, { scale = 1, locked = false } = {}) {
    const sheet = ani.sheet, a = locked ? 'idle' : ani.name, f = locked ? 0 : ani.frame;
    if (locked) {
      drawFrame(ctx, sheet, a, f, x, y, { scale, flashImg: this.game.assets.flash(def.sheet, '#120c18'), alpha: 0.85 });
      drawFrame(ctx, sheet, a, f, x, y, { scale, alpha: 0.34 });
      return;
    }
    PetFx.drawGlow(ctx, def, sheet, x, y, this.time, scale);
    drawFrame(ctx, sheet, a, f, x, y, { scale });
  }

  drawBook(ctx, ui, p) {
    const cur = Equipment.equippedPet(p);
    const hov = this.hover ? this.cards.find(c => this.hover.x >= c.x && this.hover.y >= c.y && this.hover.x < c.x + c.w && this.hover.y < c.y + c.h) : null;
    for (const [i, c] of this.cards.entries()) {
      const def = PETS[c.id], rar = RARITIES[def.rarity], owned = Chests.owns(p, c.id);
      const sel = i === this.sel;
      ui.panel(ctx, c.x, c.y, c.w, c.h, sel ? 'panel_light' : 'panel');
      // rand in de kleur van de zeldzaamheid (legendarisch glinstert)
      const shimmer = def.rarity === 'legendary' && owned ? (Math.floor(this.time * 6 + i) % 4 === 0 ? '#ffffff' : rar.color) : rar.frame;
      ctx.fillStyle = owned ? shimmer : '#4a4060';
      ctx.fillRect(c.x + 3, c.y + 2, c.w - 6, 1); ctx.fillRect(c.x + 3, c.y + c.h - 3, c.w - 6, 1);
      ctx.fillRect(c.x + 2, c.y + 3, 1, c.h - 6); ctx.fillRect(c.x + c.w - 3, c.y + 3, 1, c.h - 6);
      if (sel || hov === c) {
        ctx.fillStyle = sel ? '#ffc93c' : '#8a7ad0';
        ctx.fillRect(c.x + 1, c.y, c.w - 2, 1); ctx.fillRect(c.x + 1, c.y + c.h - 1, c.w - 2, 1);
        ctx.fillRect(c.x, c.y + 1, 1, c.h - 2); ctx.fillRect(c.x + c.w - 1, c.y + 1, 1, c.h - 2);
      }
      // zeldzaamheid: 1-4 bolletjes
      for (let k = 0; k <= rar.order; k++) {
        const bx = c.x + c.w / 2 - rar.order * 3 + k * 6 - 1;
        ctx.fillStyle = '#1a1324'; ctx.fillRect(bx - 1, c.y + 6, 5, 5);
        ctx.fillStyle = owned ? rar.color : '#6a6080'; ctx.fillRect(bx, c.y + 7, 3, 3);
      }
      // grondje + pet
      const fy = c.y + c.h - 16;
      ctx.fillStyle = '#2a2248'; ctx.fillRect(c.x + 6, fy, c.w - 12, 2);
      ctx.save(); ctx.beginPath(); ctx.rect(c.x + 3, c.y + 13, c.w - 6, c.h - 16); ctx.clip();
      this.drawPet(ctx, def, this.cardAni[c.id], c.x + c.w / 2, fy - (def.flying ? Math.min(14, def.height / 2) : 0), { locked: !owned });
      ctx.restore();
      if (!owned) ui.icon(ctx, 'lock', c.x + c.w / 2 - 6, c.y + 38);
      // onderschrift
      if (cur && cur.id === c.id) ui.text(ctx, 'MET JOU', c.x + c.w / 2, fy + 5, { align: 'center', color: '#7dff8a', outline: null, shadow: false });
      else if (owned && Chests.isNew(p, c.id)) ui.text(ctx, 'NIEUW!', c.x + c.w / 2, fy + 5, { align: 'center', color: Math.floor(this.time * 3) % 2 ? '#ffc93c' : '#ffffff', outline: null, shadow: false });
      else if (!owned) ui.text(ctx, '???', c.x + c.w / 2, fy + 5, { align: 'center', color: '#6a6080', outline: null, shadow: false });
    }

    // detailpaneel
    const id = this.previewId, def = PETS[id], rar = RARITIES[def.rarity], owned = Chests.owns(p, id);
    ui.panel(ctx, DX, DY, DW, DH, 'panel');
    ui.text(ctx, def.name, DX + DW / 2, DY + 7, { font: 'big', align: 'center', color: owned ? [rar.color, '#ffffff'] : ['#8a84a0', '#6a6080'] });
    ui.text(ctx, rar.name, DX + DW / 2, DY + 24, { align: 'center', color: rar.color, outline: null, shadow: false });
    const f = this.previewFloor();
    ctx.fillStyle = '#2a2248'; ctx.fillRect(DX + 14, f.y, DW - 28, 3);
    ctx.save(); ctx.beginPath(); ctx.rect(DX + 3, DY + 33, DW - 6, f.y - DY - 30); ctx.clip();
    this.drawPet(ctx, def, this.previewAni, f.x, f.y - this.hover2(def), { scale: 2, locked: !owned });
    ctx.restore();
    if (!owned) ui.icon(ctx, 'lock', f.x - 6, f.y - 40);
    const where = def.world ? 'TE VINDEN IN ' + WORLDS[def.world].name : 'NOG NIET GEVONDEN';
    ui.font.wrap(owned ? def.desc : where, DW - 14, { outline: false }).forEach((line, k) => ui.text(ctx, line, DX + DW / 2, f.y + 8 + k * 9, { align: 'center', color: owned ? '#e8e4ff' : '#a8a0c8', outline: null, shadow: false }));

    // actieknop
    const a = this.actionRect = { x: DX + 14, y: DY + DH - 44, w: DW - 28, h: 20 };
    let kind = 'btn', label, color = '#fff8ec', icon = null;
    if (owned) {
      const using = cur && cur.id === id;
      kind = using ? 'btn_go' : 'btn'; label = using ? 'MET JOU MEE' : 'GEBRUIK';
    } else {
      const price = Chests.lurePrice(id), can = Chests.treats(p) >= price && Chests.canLure(p, id);
      if (this.confirm && this.confirm.id === id) { kind = 'btn_on'; label = Math.floor(this.time * 4) % 2 ? 'ZEKER? ENTER' : 'ZEKER?'; color = '#3a1d10'; }
      else { kind = can ? 'btn' : 'btn_off'; label = 'LOK ' + fmtInt(price); icon = TREATS.icon; color = can ? '#ff9ad0' : '#a08090'; }
    }
    ui.panel(ctx, a.x, a.y, a.w, a.h, kind);
    const tw = ui.font.measure(label, { outline: kind !== 'btn_on' }), iw = icon ? 14 : 0;
    const tx = a.x + (a.w - tw - iw) / 2;
    if (icon) ui.icon(ctx, icon, tx, a.y + 3);
    ui.text(ctx, label, tx + iw, a.y + 6, { color, outline: kind === 'btn_on' ? null : '#1a1324', shadow: false });
    let sub = owned ? (cur && cur.id === id ? 'ENTER = ZONDER PET' : 'ALLEEN VOOR DE LOL') : 'OF VIND HEM IN EEN KIST';
    if (!owned && def.world) sub = !Worlds.isUnlocked(p, def.world) ? 'SPEEL EERST ' + WORLDS[def.world].name + ' VRIJ' : !Chests.canLure(p, id) ? 'LOKKEN NA ' + BOSSES[WORLDS[def.world].boss].name : 'OF VIND HEM IN DE ' + CHESTS[WORLD_CHESTS[def.world]].name;
    ui.text(ctx, sub, DX + DW / 2, a.y + a.h + 5, { align: 'center', color: COLORS.dim, outline: null, shadow: false });
  }

  drawChests(ctx, ui, p) {
    ui.panel(ctx, KX, KY, KW, KH, 'panel');
    const prog = p.collection.progress;
    for (const [i, col] of this.chestCols.entries()) {
      const c = CHESTS[col.kind], n = Chests.count(p, col.kind), sel = i === this.chestSel;
      ui.panel(ctx, col.x, col.y, col.w, col.h, sel ? 'panel_light' : 'panel');
      if (sel) {
        ctx.fillStyle = '#ffc93c';
        ctx.fillRect(col.x + 2, col.y + 1, col.w - 4, 1); ctx.fillRect(col.x + 2, col.y + col.h - 2, col.w - 4, 1);
      }
      const cx = col.x + col.w / 2;
      ui.text(ctx, c.name, cx, col.y + 7, { align: 'center', color: c.color });
      // kist (2×) – wiebelt als hij klaarstaat om open te gaan
      const ani = this.chestAni[col.kind];
      const ready = n > 0;
      const wob = ready && sel ? Math.round(Math.sin(this.time * 12) * (Math.floor(this.time * 1.2) % 3 === 0 ? 1 : 0)) : 0;
      ctx.save();
      if (!ready) ctx.globalAlpha = 0.45;
      drawFrame(ctx, ani.sheet, 'idle', ready ? ani.frame : 0, cx + wob, col.y + 76, { scale: 2 });
      ctx.restore();
      ui.text(ctx, '×' + n, cx, col.y + 79, { font: 'big', align: 'center', color: ready ? '#fff8ec' : '#6a6080' });
      // hoe kom je eraan + voortgang
      let how = c.how;
      if (col.kind === 'tafel') how = `NOG ${CHEST_RULES.stepsPerTafelChest - prog.steps} STAPJES OF VERSLA DE BOSS`;
      if (col.kind === 'gold') how = `NOG ${CHEST_RULES.goldsPerGoldChest - prog.golds}× NIEUW GOUD OP DE KAART`;
      if (col.kind === 'wood') how = 'TE KOOP: ' + fmtInt(c.price) + ' COINS';
      if (c.world) how = Worlds.isUnlocked(p, c.world) ? c.how + ' IN ' + WORLDS[c.world].name : 'SPEEL EERST ' + WORLDS[c.world].name + ' VRIJ';
      ui.font.wrap(how, col.w - 12, { outline: false }).forEach((line, k) => ui.text(ctx, line, cx, col.y + 97 + k * 9, { align: 'center', color: '#c8c0e8', outline: null, shadow: false }));
      // kansen
      const odds = Object.entries(c.odds);
      ctx.fillStyle = '#2a2248'; ctx.fillRect(col.x + 14, col.y + 117, col.w - 28, 1);
      odds.forEach(([r, pct], k) => {
        const oy = col.y + 121 + k * 9;
        ui.text(ctx, RARITIES[r].name, col.x + 22, oy, { color: RARITIES[r].color, outline: null, shadow: false });
        ui.text(ctx, pct + '%', col.x + col.w - 22, oy, { align: 'right', color: '#e8e4ff', outline: null, shadow: false });
      });
      // knoppen
      const by = col.y + col.h - 24;
      col.openRect = null; col.buyRect = null;
      const confirming = this.confirm && this.confirm.id === col.kind;
      if (col.kind === 'wood') {
        const two = ready;
        if (two) { col.openRect = { x: col.x + 8, y: by, w: 62, h: 18 }; col.buyRect = { x: col.x + 74, y: by, w: 66, h: 18 }; }
        else col.buyRect = { x: col.x + 14, y: by, w: col.w - 28, h: 18 };
      } else col.openRect = { x: col.x + 14, y: by, w: col.w - 28, h: 18 };
      if (col.openRect) this.button(ctx, ui, col.openRect, ready ? 'OPENEN' : 'NOG GEEN', ready ? 'btn_go' : 'btn_off', ready ? '#fff8ec' : '#8a84a0');
      if (col.buyRect) {
        const can = p.coins >= c.price;
        if (confirming) this.button(ctx, ui, col.buyRect, Math.floor(this.time * 4) % 2 ? 'ZEKER?' : 'ENTER!', 'btn_on', '#3a1d10');
        else this.button(ctx, ui, col.buyRect, fmtInt(c.price), can ? 'btn' : 'btn_off', can ? COLORS.goldFlat : '#c08080', 'coin');
      }
    }
    ui.text(ctx, this.tabId === 'wchests' ? 'IN EEN WERELDKIST ZITTEN ALLEEN DE 5 PETS VAN DIE WERELD' : 'EEN PET DIE JE AL HEBT GEEFT ' + TREATS.name + '. DAARMEE LOK JE ZELF EEN PET!', W / 2, KY + KH + 4, { align: 'center', color: '#ff9ad0', outline: null, shadow: false });
  }

  /** Paginabalk boven de kaartjes: KIST-PETS · GREENWOOD · FROSTPEAK · STORMRIJK */
  drawPages(ctx, ui, p) {
    PAGES.forEach((pg, i) => {
      const r = this.pageRects[i], on = i === this.page;
      ui.panel(ctx, r.x, r.y, r.w, r.h, on ? 'panel_light' : 'panel');
      if (on) { ctx.fillStyle = pg.color; ctx.fillRect(r.x + 2, r.y + r.h - 2, r.w - 4, 1); }
      const locked = pg.world && !Worlds.isUnlocked(p, pg.world);
      if (locked) ui.icon(ctx, 'lock', r.x + 2, r.y + 1, 0.7);
      ui.text(ctx, pg.label, r.x + r.w / 2 + (locked ? 5 : 0), r.y + 4, { align: 'center', color: on ? pg.color : locked ? '#8a84a0' : '#c8c0e8', outline: null, shadow: false });
      if (pg.pets.some(id => Chests.isNew(p, id)) && !on) this.badge(ctx, ui, r.x + r.w - 3, r.y - 4, '!');
    });
  }

  /** Onder de 5 wereld-pets: hoe je ze vindt en hoe ver je bent. */
  drawWorldInfo(ctx, ui, p) {
    const pg = this.pageDef, w = WORLDS[pg.world], chest = CHESTS[WORLD_CHESTS[pg.world]];
    const x = GX, y = GY + CH + GAP + 2, wd = COLS * (CW + GAP) - GAP, ht = 82;
    ui.panel(ctx, x, y, wd, ht, 'panel');
    ctx.fillStyle = w.color; ctx.fillRect(x + 3, y + 2, wd - 6, 1);
    ui.text(ctx, w.name + ' · ' + Chests.foundCount(p, pg.pets) + '/' + pg.pets.length + ' GEVONDEN', x + wd / 2, y + 8, { align: 'center', color: w.color });
    const ani = this.chestAni[chest.id];
    drawFrame(ctx, ani.sheet, 'idle', ani.frame, x + 34, y + 70, { scale: 1 });
    ui.text(ctx, '×' + Chests.count(p, chest.id), x + 34, y + 72, { align: 'center', color: '#fff8ec', outline: null, shadow: false });
    const open = Worlds.isUnlocked(p, pg.world), boss = BOSSES[w.boss].name;
    const lines = open
      ? ['ALLEEN TE VINDEN IN DE ' + chest.name + '.', 'VERSLA ' + boss + ' VOOR EEN ' + chest.name + '.', Chests.canLure(p, pg.pets[0]) ? 'MIS JE ER EEN? LOK HEM MET ' + TREATS.name + '.' : 'NA JE EERSTE OVERWINNING KUN JE OOK LOKKEN.']
      : ['DEZE WERELD IS NOG OP SLOT.', 'SPEEL EERST ' + w.name + ' VRIJ: ' + Worlds.requirementLabel(pg.world) + '.'];
    let ly = y + 22;
    lines.forEach((l, k) => ui.font.wrap(l, wd - 72, { outline: false }).forEach(part => { ui.text(ctx, part, x + 64, ly, { color: k === 0 ? '#e8e4ff' : '#c8c0e8', outline: null, shadow: false }); ly += 10; }));
    if (!open) ui.icon(ctx, 'lock', x + 28, y + 22);
  }

  button(ctx, ui, r, label, kind, color, icon) {
    ui.panel(ctx, r.x, r.y, r.w, r.h, kind);
    const tw = ui.font.measure(label, { outline: kind !== 'btn_on' }), iw = icon ? 14 : 0;
    const tx = r.x + (r.w - tw - iw) / 2;
    if (icon) ui.icon(ctx, icon, tx, r.y + 2);
    ui.text(ctx, label, tx + iw, r.y + 5, { color, outline: kind === 'btn_on' ? null : '#1a1324', shadow: false });
  }

  drawOpening(ctx, ui) {
    const o = this.opening, g = this.game;
    const rar = RARITIES[o.res.rarity], def = PETS[o.res.petId];
    const dim = o.phase === 'shake' ? Math.min(0.88, o.t * 3) : 0.9;
    ctx.fillStyle = `rgba(8,5,16,${dim})`;
    ctx.fillRect(-8, -8, W + 16, H + 16);
    const cx = W / 2, floor = 150;
    // lichtstralen (na het openspringen) in de kleur van de zeldzaamheid
    if (o.phase !== 'shake') {
      const k = o.phase === 'burst' ? easeOutCubic(clamp(o.t / 0.5, 0, 1)) : 1;
      const rot = this.time * (0.4 + rar.order * 0.25);
      const rays = 8 + rar.order * 4, len = (90 + rar.order * 40) * k;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16 + rar.order * 0.05;
      ctx.fillStyle = rar.color;
      for (let i = 0; i < rays; i++) {
        const a = rot + i / rays * Math.PI * 2, w = 0.1;
        ctx.beginPath();
        ctx.moveTo(cx, 118);
        ctx.lineTo(cx + Math.cos(a - w) * len, 118 + Math.sin(a - w) * len);
        ctx.lineTo(cx + Math.cos(a + w) * len, 118 + Math.sin(a + w) * len);
        ctx.fill();
      }
      ctx.globalAlpha = 0.35;
      const grad = ctx.createRadialGradient(cx, 118, 0, cx, 118, 60 * k + 10);
      grad.addColorStop(0, rar.color); grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.fillRect(cx - 80, 38, 160, 160);
      ctx.restore();
    }
    if (o.phase !== 'reveal') {
      // de kist (3×)
      drawFrame(ctx, o.ani.sheet, o.ani.name, o.ani.frame, cx, floor + 30, { scale: 3 });
      ui.text(ctx, CHESTS[o.kind].name, cx, 200, { align: 'center', color: CHESTS[o.kind].color });
      ui.text(ctx, 'ENTER = SNEL OPENEN', cx, 258, { align: 'center', color: COLORS.dim, outline: null, shadow: false });
      return;
    }
    // onthulling: pet groot in beeld
    const k = easeOutCubic(clamp(o.t / 0.45, 0, 1));
    const sc = 3;
    // grote pets (bijv. legendarisch) nooit over de titel heen: bovenkant minstens op y = 38
    const py = Math.max(floor - 12 + (1 - k) * 30 - (def.flying ? Math.min(30, def.height) : 0), 38 + o.petAni.sheet.anchor[1] * sc);
    ctx.save(); ctx.globalAlpha = k;
    PetFx.drawGlow(ctx, def, o.petAni.sheet, cx, py, this.time, sc);
    drawFrame(ctx, o.petAni.sheet, o.petAni.name, o.petAni.frame, cx, py, { scale: sc });
    ctx.restore();
    ui.text(ctx, rar.name, cx, 26, { align: 'center', color: rar.color, font: def.rarity === 'legendary' ? 'big' : 'small' });
    ui.text(ctx, def.name, cx, 168, { font: 'big', scale: 1, align: 'center', color: [rar.color, '#ffffff'] });
    if (o.res.isNew) {
      const blink = Math.floor(this.time * 3) % 2 === 0;
      ui.text(ctx, 'NIEUW IN JE PETBOEK!', cx, 190, { align: 'center', color: blink ? '#ffc93c' : '#ffffff' });
    } else {
      ui.text(ctx, 'AL IN JE PETBOEK', cx, 188, { align: 'center', color: '#c8c0e8' });
      ui.icon(ctx, TREATS.icon, cx - 40, 199);
      ui.text(ctx, '+' + o.res.treats + ' ' + TREATS.name, cx - 24, 201, { color: '#ff9ad0' });
    }
    if (o.t < 0.5) return;
    if (o.res.isNew) {
      this.useRect = { x: cx - 122, y: 222, w: 118, h: 22 };
      this.button(ctx, ui, this.useRect, 'GEBRUIK (ENTER)', 'btn_go', '#fff8ec');
      this.button(ctx, ui, { x: cx + 4, y: 222, w: 118, h: 22 }, 'VERDER (ESC)', 'btn', '#fff8ec');
    } else {
      this.useRect = null;
      this.button(ctx, ui, { x: cx - 60, y: 222, w: 120, h: 22 }, 'VERDER (ENTER)', 'btn_go', '#fff8ec');
    }
  }
}
