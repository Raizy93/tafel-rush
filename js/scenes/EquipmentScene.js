// ---------------------------------------------------------------------------
// EquipmentScene – "UITRUSTING" met twee tabs:
//   WAPENS     per held (4 tiers, zichtbaar op de held)
//   POWER-UPS  voor alle helden
// (Pets koop je niet: die vind je in kisten → PetboekScene. De gekozen pet
//  loopt wel mee in de preview.)
//
//   Tab / klik op tab   andere tab          ← / →   andere held bekijken
//   ↑ / ↓               regel kiezen        Enter   kopen (2× = bevestigen) of gebruiken
//   Esc / U             terug naar het startscherm
//
// Alle regels (prijzen, volgorde, perks) zitten in Equipment + data/*.js;
// deze scene is alleen de weergave en bediening.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from '../ui/UI.js';
import { Animator, drawFrame } from '../core/Sprite.js';
import { CharacterRegistry } from '../systems/CharacterRegistry.js';
import { Equipment } from '../systems/Equipment.js';
import { fmtInt } from '../core/util.js';

const W = CONFIG.width, H = CONFIG.height;
const TIER_DESC = ['STARTWAPEN', 'NIEUW UITERLIJK', 'PERFECT = 2 DAMAGE', 'PERFECT ×2 EN +1 DAMAGE'];
const TIER_COLOR = ['#8a84a0', '#c8d8f0', '#c890ff', '#ffc93c'];
const TABS = [
  { id: 'weapons', label: 'WAPENS' },
  { id: 'powerups', label: 'POWER-UPS' },
];
const RX = 164, RY = 32, RW = 308, RH = 222; // rechter paneel

export class EquipmentScene {
  constructor(game, tab = 'weapons') { this.game = game; this.startTab = tab; }

  enter() {
    const g = this.game;
    this.chars = CharacterRegistry.all().filter(c => CharacterRegistry.isUnlocked(c.id, g.profile));
    this.charIndex = Math.max(0, this.chars.findIndex(c => c.id === CharacterRegistry.selected(g.profile).id));
    this.tab = Math.max(0, TABS.findIndex(t => t.id === this.startTab));
    this.confirm = null;   // { index, t }
    this.toast = null;     // { text, color, t }
    this.time = 0;
    this.hover = -1;
    this.shot = null;
    this.tabRects = TABS.map((t, i) => ({ x: RX + 6 + i * 100, y: RY + 5, w: 96, h: 17 }));
    this.buildItems();
    g.particles.clear();
  }

  get character() { return this.chars[this.charIndex]; }
  get tabId() { return TABS[this.tab].id; }

  buildItems() {
    const p = this.game.profile, c = this.character;
    if (this.tabId === 'weapons') {
      this.items = Equipment.weaponsFor(c.id).map(w => ({ kind: 'weapon', w }));
      const eq = Equipment.equippedWeapon(p, c.id);
      this.sel = this.items.findIndex(it => it.w.id === eq.id);
    } else {
      this.items = Equipment.powerups().map(pu => ({ kind: 'powerup', p: pu }));
      this.sel = 0;
    }
    this.confirm = null;
    this.layoutRows();
  }

  layoutRows() {
    const step = this.tabId === 'powerups' ? 32 : 30, h = step - 3;
    this.rows = this.items.map((it, i) => {
      const y = RY + 28 + i * step;
      return { x: RX + 6, y, w: RW - 12, h, action: { x: RX + RW - 92, y: y + 4, w: 80, h: h - 8 } };
    });
  }

  // --- regels ---------------------------------------------------------------------
  status(it) {
    const p = this.game.profile;
    if (it.kind === 'weapon') return Equipment.weaponStatus(p, it.w);
    return Equipment.powerupStatus(p, it.p.id);
  }
  price(it) { return it.kind === 'weapon' ? it.w.price : it.p.price; }
  itemName(it) { return it.kind === 'weapon' ? it.w.name : it.p.name; }

  activate(i) {
    const g = this.game, p = g.profile, it = this.items[i];
    if (!it) return;
    const st = this.status(it);
    if (st === 'equipped' || (it.kind === 'powerup' && st === 'owned')) { g.audio.play('select'); return; }
    if (st === 'owned') {
      Equipment.equipWeapon(p, it.w);
      g.audio.play('confirm');
      this.say(this.itemName(it) + ' IN GEBRUIK', '#7dff8a');
      return;
    }
    if (st === 'needPrevious') { g.audio.play('error'); this.say('KOOP EERST HET VORIGE WAPEN', '#ffb0a0'); return; }
    if (st === 'tooExpensive') { g.audio.play('error'); this.say('NOG ' + fmtInt(this.price(it) - p.coins) + ' COINS NODIG', '#ffb0a0'); return; }
    // buyable → eerst bevestigen
    if (!this.confirm || this.confirm.index !== i) {
      this.confirm = { index: i, t: 2.5 };
      g.audio.play('select');
      return;
    }
    const res = it.kind === 'weapon' ? Equipment.buyWeapon(p, it.w) : Equipment.buyPowerup(p, it.p.id);
    this.confirm = null;
    if (res.ok) {
      g.audio.play('record');
      this.say('GEKOCHT!', COLORS.goldFlat);
      const r = this.rows[i];
      g.particles.burst(r.action.x + r.action.w / 2, r.action.y + 6, { count: 26, colors: ['#ffc93c', '#fff1a0', '#ffffff'], speed: 120, g: 200, life: 0.8, screen: true });
      if (this.petAni) this.petAni.play('cheer', true);
      this.cheerT = 1.5;
    } else {
      g.audio.play('error');
      this.say('KAN NIET', '#ffb0a0');
    }
  }

  say(text, color) { this.toast = { text, color, t: 1.8 }; }

  switchChar(dir) {
    if (this.chars.length < 2) return;
    this.charIndex = (this.charIndex + dir + this.chars.length) % this.chars.length;
    this.game.audio.play('select');
    if (this.tabId === 'weapons') this.buildItems();
  }

  switchTab(i) {
    if (i === this.tab) return;
    this.tab = (i + TABS.length) % TABS.length;
    this.game.audio.play('select');
    this.buildItems();
  }

  // --- input -----------------------------------------------------------------------
  onKey(a) {
    if (a.type === 'help') { this.game.audio.play('select'); this.game.openHelp('uitrusting', () => this.game.openEquipment(this.tabId)); return; }
    const g = this.game;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    if (a.type === 'back' || a.type === 'shop') { g.audio.play('select'); g.goToTitle(); return; }
    if (a.type === 'next' || a.type === 'prev') { this.switchTab(this.tab + (a.type === 'next' ? 1 : -1)); return; }
    if (a.type === 'left' || a.type === 'right') { this.switchChar(a.type === 'left' ? -1 : 1); return; }
    if (a.type === 'up' || a.type === 'down') {
      const d = a.type === 'up' ? -1 : 1;
      this.sel = (this.sel + d + this.items.length) % this.items.length;
      this.confirm = null;
      g.audio.play('select');
      return;
    }
    if (a.type === 'enter' || a.type === 'space') this.activate(this.sel);
  }

  onPointer(kind, x, y) {
    const inside = (r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    if (kind === 'move') { this.hover = this.rows.findIndex(inside); return; }
    if (kind !== 'down') return;
    if (this.backRect && inside(this.backRect)) { this.game.goToTitle(); return; }
    if (this.helpRect && inside(this.helpRect)) { this.game.audio.play('select'); this.game.openHelp('uitrusting', () => this.game.openEquipment(this.tabId)); return; }
    const ti = this.tabRects.findIndex(inside);
    if (ti >= 0) { this.switchTab(ti); return; }
    for (const [r, d] of this.arrowRects || []) if (inside(r)) { this.switchChar(d); return; }
    const i = this.rows.findIndex(inside);
    if (i < 0) return;
    if (inside(this.rows[i].action) || this.sel === i) { this.sel = i; this.activate(i); }
    else { this.sel = i; this.confirm = null; this.game.audio.play('select'); }
  }

  // --- preview ---------------------------------------------------------------------
  /** Wapen in de preview: geselecteerde regel (tab wapens), anders het uitgeruste. */
  previewWeapon() {
    const it = this.items[this.sel];
    if (it && it.kind === 'weapon') return it.w;
    return Equipment.equippedWeapon(this.game.profile, this.character.id);
  }
  /** Pet in de preview: de gekozen pet (kiezen gaat in het petboek). */
  previewPet() { return Equipment.equippedPet(this.game.profile); }

  update(dt) {
    const g = this.game;
    this.time += dt;
    g.particles.update(dt);
    if (this.confirm) { this.confirm.t -= dt; if (this.confirm.t <= 0) this.confirm = null; }
    if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
    if (this.cheerT > 0) this.cheerT -= dt;
    const w = this.previewWeapon();
    if (this.previewFor !== w.id) {
      this.previewFor = w.id;
      this.ani = new Animator(g.assets.sheet(w.sheet), 'idle');
      this.fx = g.assets.sheet(w.effect);
      this.cycle = 0.3;
    }
    const pet = this.previewPet();
    const pid = pet ? pet.id : null;
    if (this.previewPetId !== pid) {
      this.previewPetId = pid;
      this.petAni = pet ? new Animator(g.assets.sheet(pet.sheet), 'idle') : null;
    }
    // demo-lus: idle → aanval met projectiel
    this.cycle -= dt;
    if (this.cycle <= 0) {
      this.cycle = 1.7;
      this.ani.play('attack', true);
      this.shot = { x: 0, t: 0 };
      if (this.petAni && Math.random() < 0.5) this.petAni.play('cheer', true);
    }
    if (this.ani.name === 'attack' && this.ani.done) this.ani.play('idle', true);
    this.ani.update(dt);
    if (this.petAni) {
      if (this.petAni.name === 'cheer' && this.petAni.t > 0.9 && !(this.cheerT > 0)) this.petAni.play('idle', true);
      this.petAni.update(dt);
    }
    if (this.shot) { this.shot.t += dt; this.shot.x += 150 * dt; if (this.shot.t > 0.5) this.shot = null; }
  }

  // --- tekenen ---------------------------------------------------------------------
  draw(ctx) {
    const g = this.game, ui = g.ui, p = g.profile;
    g.world.drawBack(ctx);
    g.world.drawFront(ctx);
    ctx.fillStyle = 'rgba(12,8,24,0.66)';
    ctx.fillRect(0, 0, W, H);

    // titel + coins + terug
    ui.text(ctx, 'UITRUSTING', 12, 8, { font: 'big', color: COLORS.gold });
    ui.panel(ctx, W - 92, 6, 86, 20, 'panel');
    ui.icon(ctx, 'coin', W - 86, 10);
    ui.text(ctx, fmtInt(p.coins), W - 13, 12, { align: 'right', color: COLORS.gold });
    this.backRect = { x: 150, y: 6, w: 84, h: 18 };
    ui.panel(ctx, this.backRect.x, this.backRect.y, this.backRect.w, this.backRect.h, 'btn');
    ui.text(ctx, ui.key('< TERUG', 'T'), this.backRect.x + this.backRect.w / 2, this.backRect.y + 5, { align: 'center', outline: null, shadow: false });
    this.helpRect = ui.helpButton(ctx, 238, 6);

    this.drawPreview(ctx, ui, p);

    // rechts: tabs + lijst
    ui.panel(ctx, RX, RY, RW, RH, 'panel');
    TABS.forEach((t, i) => {
      const r = this.tabRects[i], on = i === this.tab;
      ui.panel(ctx, r.x, r.y, r.w, r.h, on ? 'btn_on' : 'btn');
      ui.text(ctx, t.label, r.x + r.w / 2, r.y + 5, { align: 'center', color: on ? '#3a1d10' : '#fff8ec', outline: on ? null : '#1a1324', shadow: false });
    });
    this.items.forEach((it, i) => this.drawRow(ctx, ui, it, i));
    const note = this.tabId === 'weapons' ? 'WAPENS VOOR ' + this.character.name + '   * DAMAGE WERKT NIET OP DE BOSS'
      : 'GELDEN VOOR ALLE HELDEN   ' + ui.key('PETS VIND JE IN KISTEN', 'B');
    ui.text(ctx, note, RX + RW / 2, RY + RH - 12, { align: 'center', color: '#8a84a0', outline: null, shadow: false });

    // melding (vervangt even de hint-regel onderaan)
    if (this.toast) {
      const a = Math.min(1, this.toast.t / 0.4);
      ui.text(ctx, this.toast.text, W / 2, 258, { align: 'center', color: this.toast.color, alpha: a });
    } else {
      ui.text(ctx, ui.hint('TAB = WAPENS / POWER-UPS   ↑↓ KIES   ENTER KOOP / GEBRUIK   T', 'TIK OP EEN TAB BOVENIN, DAARNA OP KOPEN OF GEBRUIK'), W / 2, 258, { align: 'center', color: '#e8e4ff' });
    }
    g.particles.draw(ctx, 0, true);
  }

  drawPreview(ctx, ui, p) {
    const lx = 8, ly = 32, lw = 150, lh = 222;
    ui.panel(ctx, lx, ly, lw, lh, 'panel');
    const c = this.character;
    ui.text(ctx, c.name, lx + lw / 2, ly + 9, { font: 'big', align: 'center', color: COLORS.gold });
    this.arrowRects = this.chars.length > 1 ? [[{ x: lx + 6, y: ly + 6, w: 18, h: 18 }, -1], [{ x: lx + lw - 24, y: ly + 6, w: 18, h: 18 }, 1]] : [];
    for (const [r, d] of this.arrowRects) ui.text(ctx, d < 0 ? '←' : '→', r.x + 9, r.y + 4, { font: 'big', align: 'center', color: '#e8e4ff' });
    // vloertje + held 2× vergroot (nearest neighbour, blijft scherp) + pet
    const fx = lx + lw / 2 - 6, fy = ly + 150;
    ctx.fillStyle = '#2a2248'; ctx.fillRect(lx + 10, fy, lw - 20, 3);
    ctx.save();
    ctx.beginPath(); ctx.rect(lx + 3, ly + 28, lw - 6, 128); ctx.clip();
    const pet = this.previewPet();
    if (this.petAni && pet) drawFrame(ctx, this.petAni.sheet, this.petAni.name, this.petAni.frame, fx - 44, fy - pet.height * 2, { scale: 2 });
    drawFrame(ctx, this.ani.sheet, this.ani.name, this.ani.frame, fx, fy, { scale: 2 });
    if (this.shot && this.fx) {
      const n = this.fx.anims.normal.frames;
      drawFrame(ctx, this.fx, 'normal', Math.min(Math.floor(this.shot.t * 16) % n, n - 1), fx + 36 + this.shot.x, fy - 44, { scale: 2 });
    }
    ctx.restore();
    // onderschrift: hangt af van de tab
    const w = this.previewWeapon();
    const line1 = w.name, line2 = TIER_DESC[w.tier], color = TIER_COLOR[w.tier];
    const tag = Equipment.equippedWeapon(p, c.id).id === w.id ? 'IN GEBRUIK' : Equipment.ownsWeapon(p, w) ? 'IN BEZIT' : 'VOORBEELD';
    ui.text(ctx, line1, lx + lw / 2, fy + 10, { align: 'center', color });
    ui.text(ctx, line2, lx + lw / 2, fy + 22, { align: 'center', color: '#e8e4ff', outline: null, shadow: false });
    ui.text(ctx, tag, lx + lw / 2, fy + 36, { align: 'center', color: tag === 'VOORBEELD' ? COLORS.dim : '#7dff8a', outline: null, shadow: false });
    ui.text(ctx, 'ALLE HELDEN EVEN STERK', lx + lw / 2, fy + 52, { align: 'center', color: COLORS.dim, outline: null, shadow: false });
  }

  drawRow(ctx, ui, it, i) {
    const r = this.rows[i];
    const sel = i === this.sel, hov = i === this.hover;
    ui.panel(ctx, r.x, r.y, r.w, r.h, sel ? 'panel_light' : 'panel');
    if (sel || hov) {
      ctx.fillStyle = sel ? '#ffc93c' : '#8a7ad0';
      ctx.fillRect(r.x + 2, r.y + 1, r.w - 4, 1); ctx.fillRect(r.x + 2, r.y + r.h - 2, r.w - 4, 1);
    }
    const st = this.status(it);
    const ty = r.y + Math.floor(r.h / 2) - 8;
    if (it.kind === 'weapon') {
      const w = it.w;
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = '#1a1324'; ctx.fillRect(r.x + 7 + k * 5, ty + 5, 4, 6);
        ctx.fillStyle = k < w.tier ? TIER_COLOR[w.tier] : '#3a2a48'; ctx.fillRect(r.x + 7 + k * 5, ty + 6, 4, 4);
      }
      ui.text(ctx, w.name, r.x + 26, ty, { color: TIER_COLOR[w.tier] });
      ui.text(ctx, TIER_DESC[w.tier] + (w.tier >= 2 ? ' *' : ''), r.x + 26, ty + 10, { color: '#a8a0c8', outline: null, shadow: false });
    } else {
      const pu = it.p;
      ui.icon(ctx, pu.icon, r.x + 7, ty + 2);
      ui.text(ctx, pu.name, r.x + 24, ty, { color: '#e0f4ff' });
      ui.text(ctx, pu.desc, r.x + 24, ty + 10, { color: '#a8a0c8', outline: null, shadow: false });
    }
    // actie-vak
    const a = r.action;
    const confirming = this.confirm && this.confirm.index === i;
    let kind = 'btn', label = '', color = '#fff8ec', icon = null;
    if (st === 'equipped') { kind = 'btn_go'; label = 'IN GEBRUIK'; }
    else if (st === 'owned') { if (it.kind === 'powerup') { kind = 'btn_go'; label = 'GEKOCHT'; } else label = 'GEBRUIK'; }
    else if (st === 'needPrevious') { kind = 'btn_off'; label = 'EERST VORIGE'; color = '#8a84a0'; icon = 'lock'; }
    else if (confirming) { kind = 'btn_on'; label = Math.floor(this.time * 4) % 2 ? ui.hint('ZEKER? ENTER', 'TIK NOG EENS') : 'ZEKER?'; color = '#3a1d10'; }
    else { kind = st === 'buyable' ? 'btn' : 'btn_off'; label = fmtInt(this.price(it)); icon = 'coin'; color = st === 'buyable' ? COLORS.goldFlat : '#c08080'; }
    ui.panel(ctx, a.x, a.y, a.w, a.h, kind);
    const tw = ui.font.measure(label, { outline: kind !== 'btn_on' });
    const iconW = icon ? 14 : 0;
    const cx = a.x + (a.w - tw - iconW) / 2;
    if (icon) ui.icon(ctx, icon, cx, a.y + Math.floor((a.h - 3 - 12) / 2), icon === 'lock' ? 0.7 : 1);
    ui.text(ctx, label, cx + iconW, a.y + Math.floor((a.h - 3 - 9) / 2) + 1, { color, outline: kind === 'btn_on' ? null : '#1a1324', shadow: false });
  }
}
