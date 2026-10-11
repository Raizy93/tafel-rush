// ---------------------------------------------------------------------------
// ResultsScene – "RUN COMPLETE". Statistieken tellen op, nieuwe records
// glimmen, en maximaal 5 sommen die nog beter/sneller kunnen (positief
// geformuleerd). Verdiende kisten staan onderaan. Enter = nog een run,
// Esc = menu, B = naar het petboek (kisten openen).
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { Button, COLORS } from '../ui/UI.js';
import { drawFrame, Animator } from '../core/Sprite.js';
import { fmtInt, fmtSec, clamp, easeOutCubic } from '../core/util.js';
import { parseKey } from '../training/facts.js';
import { Equipment } from '../systems/Equipment.js';
import { CHESTS, ALL_CHEST_ORDER } from '../data/chests.js';
import { WORLDS, BOSSES } from '../data/worlds.js';

const W = CONFIG.width;

export class ResultsScene {
  constructor(game, data) {
    this.game = game;
    this.data = data;
  }

  enter() {
    const g = this.game;
    this.t = 0;
    this.lockT = (this.data.newWorlds || []).length ? 1.9 : 1.0; // voorkom dat Enter-spam het scherm (of de wereld-melding) wegdrukt
    this.world = g.world;
    this.hero = new Animator(g.assets.sheet(Equipment.loadout(g.profile).sheet), this.data.completed ? 'victory' : 'idle');
    this.again = new Button({ x: W / 2 - 128, y: 236, w: 124, h: 24, label: 'NOG EEN RUN', kind: 'go', onClick: () => this.playAgain() });
    this.menu = new Button({ x: W / 2 + 6, y: 236, w: 122, h: 24, label: 'MENU', onClick: () => this.toMenu() });
    this.buttons = [this.again, this.menu];
    this.hover = null;
    this.recordSoundDone = false;
    this.unlockPopup = (this.data.newWorlds || []).length ? { id: this.data.newWorlds[0], t: -1.8 } : null;
    // tips over wat je net verdiende (verschijnen na de animaties, nooit over de wereld-melding)
    const loot = this.data.loot, tips = this.game.tips;
    if (loot && loot.chests.some(c => CHESTS[c.kind].world)) tips.queue('worldChest');
    else if (loot && loot.total) tips.queue('firstChest');
    if (this.data.summary.mapUps > 0) tips.queue('mapStep');
    g.audio.playMusic('menu');
    g.audio.setIntensity(0);
  }

  tipsAllowed() { return this.t > 2.4 && !this.unlockPopup; }

  playAgain() {
    if (this.lockT > 0) return;
    const o = this.data.runOpts;
    this.game.audio.play('confirm');
    // pool opnieuw bepalen (moeilijke sommen kunnen veranderd zijn)
    this.game.startRun(this.game.runOptions(o.mode, o.tables, o.world));
  }
  toMenu() {
    if (this.lockT > 0) return;
    this.game.audio.play('select');
    this.game.goToTitle();
  }

  onKey(a) {
    if (a.type === 'mute') { this.game.toggleAllSound(); return; }
    if (this.unlockPopup && this.unlockPopup.t >= 0) { if (this.unlockPopup.t > 0.8 && (a.type === 'enter' || a.type === 'space' || a.type === 'back')) { this.unlockPopup = null; this.game.audio.play('confirm'); } return; }
    if (a.type === 'enter' || a.type === 'space') this.playAgain();
    else if (a.type === 'back') this.toMenu();
    else if (a.type === 'book' && this.lockT <= 0) { this.game.audio.play('select'); this.game.openBook('chests'); }
  }
  onPointer(kind, x, y) {
    if (kind === 'move') { this.hover = this.buttons.find(b => b.contains(x, y)) || null; return; }
    if (kind === 'down') {
      if (this.unlockPopup && this.unlockPopup.t >= 0) { if (this.unlockPopup.t > 0.8) this.unlockPopup = null; return; }
      const b = this.buttons.find(b => b.contains(x, y));
      if (b) { b.onClick(); return; }
      const r = this.lootRect;
      if (r && this.lockT <= 0 && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) this.game.openBook('chests');
    }
  }

  update(dt) {
    this.t += dt;
    if (this.lockT > 0) this.lockT -= dt;
    this.hero.update(dt);
    this.world.update(dt, this.world.camX + 8 * dt, 0);
    this.game.particles.update(dt);
    this.again.enabled = this.menu.enabled = this.lockT <= 0;
    if (this.unlockPopup) {
      const u = this.unlockPopup, was = u.t;
      u.t += dt;
      if (was < 0 && u.t >= 0) { this.game.audio.play('reveal', { rarity: 'legendary' }); this.game.particles.burst(W / 2, 120, { count: 50, colors: ['#ffffff', '#b4e4ff', '#7ad8ff', '#ffc93c'], speed: 180, g: 120, life: 1.2, screen: true, glow: true }); }
    }
    if (!this.recordSoundDone && this.t > 1.2 && this.data.newRecords.length) { this.recordSoundDone = true; this.game.audio.play('record'); }
    if (!this.lootSoundDone && this.t > 1.6 && this.data.loot && this.data.loot.total) { this.lootSoundDone = true; this.game.audio.play('chest'); }
    // feestelijke glinsters
    if (this.data.completed && Math.random() < 0.3) this.game.particles.spawn({ x: Math.random() * W, y: -2, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 30, life: 3, size: 1, color: ['#ffc93c', '#fff1a0', '#7dff8a', '#8ff2ff', '#ff7ae0'][Math.floor(Math.random() * 5)], screen: true, shrink: false });
  }

  draw(ctx) {
    const g = this.game, ui = g.ui, s = this.data.summary;
    this.world.drawBack(ctx);
    this.world.drawFront(ctx);
    ctx.fillStyle = 'rgba(12,8,24,0.62)';
    ctx.fillRect(0, 0, W, CONFIG.height);
    g.particles.draw(ctx, 0, true);

    // titel
    const title = 'RUN COMPLETE';
    const tIn = easeOutCubic(clamp(this.t / 0.4, 0, 1));
    ui.text(ctx, title, W / 2, 8 + (1 - tIn) * -20, { font: 'big', scale: 2, align: 'center', color: this.data.completed ? ['#fffbe0', '#fff1a0', '#ffc93c', '#ff9a2a'] : ['#ffffff', '#c8c0e8'] });
    const bossName = BOSSES[(this.data.world || WORLDS.greenwood).boss].name;
    ui.text(ctx, this.data.completed ? bossName + ' IS VERSLAGEN!' : this.data.runOpts.label, W / 2, 42, { align: 'center', color: this.data.completed ? '#7dff8a' : COLORS.dim });

    // linker paneel: cijfers
    const lx = 14, ly = 56, lw = 222, lh = 160;
    ui.panel(ctx, lx, ly, lw, lh, 'panel');
    const k = easeOutCubic(clamp((this.t - 0.25) / 1.0, 0, 1));
    const rec = new Set(this.data.newRecords);
    const rows = [
      ['check', 'SOMMEN GEMAAKT', fmtInt(s.answered * k)],
      ['target', 'GOED', fmtInt(s.correct * k), rec.has('mostCorrect')],
      ['star', 'PERCENTAGE GOED', Math.round(s.accuracy * 100 * k) + '%', rec.has('bestAccuracy')],
      ['clock', 'GEM. REACTIETIJD', s.correct ? fmtSec(s.avgRt) : '-', rec.has('fastestAvgRt')],
      ['flame', 'BESTE COMBO', fmtInt(s.bestCombo * k), rec.has('bestCombo')],
      ['bolt', 'PERFECT ANTWOORDEN', fmtInt(s.perfect * k)],
      ['coin', 'VERDIENDE COINS', '+' + fmtInt(s.coins * k)],
    ];
    if (s.coinBonus) rows[6].push(false, `INCL. +${fmtInt(s.coinBonus)} COINBONUS`);
    rows.forEach(([icon, label, val, isRec], i) => {
      const y = ly + 9 + i * 21;
      if (this.t < 0.2 + i * 0.08) return;
      ui.icon(ctx, icon, lx + 10, y);
      ui.text(ctx, label, lx + 26, y + 2, { color: '#e8e4ff' });
      ui.text(ctx, val, lx + lw - 10, y - 1, { align: 'right', font: 'big', color: icon === 'coin' ? COLORS.gold : '#fff8ec' });
      if (rows[i][4] && this.t > 1.2) ui.text(ctx, rows[i][4], lx + 26, y + 11, { color: '#ffc93c', outline: null, shadow: false });
      if (isRec && this.t > 1.2) {
        const blink = Math.floor(this.t * 3) % 2 === 0;
        ui.text(ctx, 'RECORD!', lx + 26, y + 11, { color: blink ? '#ffc93c' : '#ff9a2a', outline: null, shadow: false });
      }
    });

    // rechter paneel: moeilijke sommen
    const rx = 244, ry = 56, rw = 222, rh = 160;
    ui.panel(ctx, rx, ry, rw, rh, 'panel');
    const hard = s.hardest;
    if (hard.length) {
      ui.text(ctx, 'OEFEN DEZE NOG EVEN', rx + rw / 2, ry + 8, { align: 'center', color: COLORS.gold });
      hard.forEach((h, i) => {
        const y = ry + 24 + i * 23;
        if (this.t < 0.5 + i * 0.12) return;
        const { a, b, answer } = parseKey(h.key);
        ui.panel(ctx, rx + 10, y - 3, rw - 20, 21, 'panel_light');
        ui.text(ctx, `${a} × ${b} = ${answer}`, rx + 18, y + 1, { font: 'big', color: '#fff8ec', scale: 1 });
        ui.icon(ctx, h.wrong ? 'target' : 'clock', rx + rw - 64, y + 1);
        ui.text(ctx, h.wrong ? 'OEFENEN' : 'SNELLER', rx + rw - 50, y + 3, { color: h.wrong ? '#ffb0a0' : COLORS.cyan, outline: null, shadow: false });
      });
      if (!this.drawMapLine(ctx, ui, rx + rw / 2, ry + rh - 14)) ui.text(ctx, hard.some(h => h.wrong) ? 'OEFENEN MAAKT JE STERKER!' : 'DEZE KUNNEN NOG SNELLER!', rx + rw / 2, ry + rh - 14, { align: 'center', color: COLORS.dim });
    } else {
      ui.text(ctx, 'TOP GEDAAN!', rx + rw / 2, ry + 50, { font: 'big', align: 'center', color: ['#d0ffd8', '#5fd65a'] });
      ui.text(ctx, 'ALLE SOMMEN GINGEN', rx + rw / 2, ry + 80, { align: 'center' });
      ui.text(ctx, 'SNEL EN GOED.', rx + rw / 2, ry + 92, { align: 'center' });
      this.drawMapLine(ctx, ui, rx + rw / 2, ry + 102);
      drawFrame(ctx, this.hero.sheet, this.hero.name, this.hero.frame, rx + rw / 2, ry + rh - 4);
    }

    this.drawLoot(ctx, ui);
    for (const b of this.buttons) b.draw(ctx, ui, this.hover === b);
    if (this.unlockPopup && this.unlockPopup.t >= 0) { this.drawUnlock(ctx, ui); return; }
    if (this.lockT <= 0 && !ui.touch) {
      ui.icon(ctx, 'enter', this.again.x - 15, this.again.y + 6);
      ui.text(ctx, 'T', this.menu.x + this.menu.w + 4, this.menu.y + 8, { color: COLORS.dim });
    }
  }

  /** Groot moment: een nieuwe wereld is vrijgespeeld (met een kijkje erin). */
  drawUnlock(ctx, ui) {
    const g = this.game, u = this.unlockPopup, w = WORLDS[u.id];
    const k = easeOutCubic(clamp(u.t / 0.35, 0, 1));
    ctx.fillStyle = `rgba(8,5,16,${0.75 * k})`; ctx.fillRect(0, 0, W, CONFIG.height);
    const pw = 300, ph = 176, px = Math.round(W / 2 - pw / 2), py = Math.round(48 + (1 - k) * 30);
    ui.panel(ctx, px, py, pw, ph, 'panel');
    ui.text(ctx, 'NIEUWE WERELD VRIJGESPEELD!', W / 2, py + 9, { align: 'center', color: Math.floor(u.t * 3) % 2 ? '#ffc93c' : '#ffffff' });
    // kijkje: eerste bioom van de nieuwe wereld, half zo groot
    const L = g.assets.biome(w.id, w.phases[0].biome);
    const vx = px + 30, vy = py + 24, vw = pw - 60, vh = 104;
    ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
    const sc = 0.5, off = (u.t * 20) % 480;
    ctx.drawImage(L.sky, vx, vy, 480 * sc, 270 * sc);
    for (const [img, f] of [[L.far, 0.2], [L.mid, 0.5], [L.near, 1]]) { const ox = -((off * f) % 960); ctx.drawImage(img, vx + ox * sc, vy, 960 * sc, 270 * sc); ctx.drawImage(img, vx + (ox + 960) * sc, vy, 960 * sc, 270 * sc); }
    ctx.restore();
    ctx.fillStyle = '#ffc93c'; ctx.fillRect(vx - 1, vy - 1, vw + 2, 1); ctx.fillRect(vx - 1, vy + vh, vw + 2, 1); ctx.fillRect(vx - 1, vy, 1, vh); ctx.fillRect(vx + vw, vy, 1, vh);
    ui.text(ctx, w.name, W / 2, py + 132, { font: 'big', align: 'center', color: ['#ffffff', '#b4e4ff', '#4fb0ff'] });
    ui.text(ctx, w.desc + '   ' + ui.key('KIES HEM OP HET STARTSCHERM', 'W'), W / 2, py + 151, { align: 'center', color: '#c8f0ff', outline: null, shadow: false });
    if (u.t > 0.8) ui.text(ctx, ui.hint('ENTER = VERDER', 'TIK = VERDER'), W / 2, py + ph + 6, { align: 'center', color: '#e8e4ff' });
  }

  /** Verdiende kisten (of hoe ver je bent tot de volgende). */
  drawLoot(ctx, ui) {
    const loot = this.data.loot;
    this.lootRect = null;
    if (!loot || this.t < 1.6) return;
    const y = 220;
    if (!loot.total) {
      ui.text(ctx, `NOG ${loot.stepsToNext} STAPJE${loot.stepsToNext === 1 ? '' : 'S'} OP DE TAFELKAART TOT DE VOLGENDE TAFELKIST`, W / 2, y + 2, { align: 'center', color: COLORS.dim, outline: null, shadow: false });
      return;
    }
    const per = {};
    for (const c of loot.chests) per[c.kind] = (per[c.kind] || 0) + c.n;
    const parts = ALL_CHEST_ORDER.filter(k => per[k]).map(k => ({ k, text: `+${per[k]} ${CHESTS[k].name}` }));
    const head = 'VERDIEND:', tail = '  ' + ui.hint('B = OPENEN', 'TIK = OPENEN');
    let w = ui.font.measure(head) + ui.font.measure(tail) + 4;
    for (const p of parts) w += 16 + ui.font.measure(p.text) + 8;
    let x = Math.round(W / 2 - w / 2);
    const k = easeOutCubic(clamp((this.t - 1.6) / 0.3, 0, 1));
    this.lootRect = { x: x - 4, y: y - 3, w: w + 8, h: 15 };
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(26,19,36,0.85)'; ctx.fillRect(x - 4, y - 3, w + 8, 15);
    x += ui.text(ctx, head, x, y + 1, { color: '#ffc93c' }) + 6;
    for (const p of parts) {
      const bob = Math.round(Math.sin(this.t * 6 + x) * 1);
      ui.icon(ctx, CHESTS[p.k].icon, x, y - 1 + bob);
      x += 16;
      x += ui.text(ctx, p.text, x, y + 1, { color: CHESTS[p.k].color }) + 8;
    }
    ui.text(ctx, tail.trim(), x, y + 1, { color: '#e8e4ff', outline: null, shadow: false });
    ctx.restore();
  }

  /** Tafelkaart-voortgang van deze run. Retourneert true als er iets te melden was. */
  drawMapLine(ctx, ui, x, y) {
    const s = this.data.summary;
    if (!s.mapUps || this.t < 1.0) return false;
    const text = s.newGolds ? `+${s.mapUps} STAPJES · +${s.newGolds} GOUD OP DE KAART!` : `+${s.mapUps} STAPJE${s.mapUps === 1 ? '' : 'S'} OP DE TAFELKAART!`;
    ui.text(ctx, text, x, y, { align: 'center', color: s.newGolds ? COLORS.goldFlat : '#7dff8a' });
    return true;
  }
}
