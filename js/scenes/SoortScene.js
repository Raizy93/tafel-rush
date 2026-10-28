// ---------------------------------------------------------------------------
// SoortScene – "WAT GA JE OEFENEN?": kies TAFELS of DEELTAFELS.
// Verschijnt de eerste keer vanzelf; daarna via de knop linksboven op het
// startscherm (of toets S). De keuze wordt onthouden (settings.operation).
//
//   ← / →  kiezen · Enter / klik  bevestigen · T  terug (als je al eens koos)
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from '../ui/UI.js';
import { OPERATIONS, OPERATION_ORDER } from '../training/operations.js';

const W = CONFIG.width;
const CARD_W = 150, CARD_H = 112, GAP = 24, CY = 82;
const EXAMPLE = { mul: ['7', '×', '8'], div: ['56', ':', '8'] };

export class SoortScene {
  constructor(game) { this.game = game; }

  enter() {
    const s = this.game.profile.settings;
    this.first = !s.opChosen;
    this.sel = Math.max(0, OPERATION_ORDER.indexOf(s.operation));
    this.time = 0;
    const x0 = Math.round(W / 2 - (CARD_W * 2 + GAP) / 2);
    this.cards = OPERATION_ORDER.map((id, i) => ({ id, x: x0 + i * (CARD_W + GAP), y: CY, w: CARD_W, h: CARD_H }));
    this.backRect = null;
  }

  choose(i) {
    const g = this.game, id = OPERATION_ORDER[i];
    g.audio.play('confirm');
    g.profile.updateSettings({ operation: id, opChosen: true });
    g.goToTitle();
  }

  onKey(a) {
    const g = this.game;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    if (a.type === 'left' || a.type === 'right' || a.type === 'next' || a.type === 'prev') {
      this.sel = (this.sel + (a.type === 'left' || a.type === 'prev' ? -1 : 1) + this.cards.length) % this.cards.length;
      g.audio.play('key');
      return;
    }
    if (a.type === 'enter' || a.type === 'space') { this.choose(this.sel); return; }
    if ((a.type === 'back' || a.type === 'soort') && !this.first) { g.audio.play('select'); g.goToTitle(); }
  }

  onPointer(kind, x, y) {
    const inside = r => r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    const i = this.cards.findIndex(c => inside(c));
    if (kind === 'move') { if (i >= 0) this.sel = i; return; }
    if (kind !== 'down') return;
    if (i >= 0) { this.choose(i); return; }
    if (inside(this.backRect)) { this.game.audio.play('select'); this.game.goToTitle(); }
  }

  update(dt) {
    this.time += dt;
    this.game.world.update(dt, this.time * 30, 1);
    this.game.particles.update(dt);
  }

  draw(ctx) {
    const g = this.game, ui = g.ui, f = g.font;
    g.world.drawBack(ctx);
    g.world.drawFront(ctx);
    ctx.fillStyle = 'rgba(12,8,24,0.62)';
    ctx.fillRect(0, 0, W, CONFIG.height);

    ui.text(ctx, 'WAT GA JE OEFENEN?', W / 2, 38, { font: 'big', align: 'center', color: ['#fffbe0', '#ffc93c', '#ff9a2a'] });
    if (!this.first) {
      this.backRect = { x: 6, y: 6, w: 84, h: 18 };
      ui.panel(ctx, 6, 6, 84, 18, 'btn');
      ui.text(ctx, ui.key('< TERUG', 'T'), 48, 11, { align: 'center', outline: null, shadow: false });
    }

    this.cards.forEach((c, i) => {
      const on = i === this.sel, bob = on ? Math.round(Math.sin(this.time * 4) * 1.5) : 0;
      const y = c.y + bob;
      ui.panel(ctx, c.x, y, c.w, c.h, on ? 'panel_light' : 'panel');
      if (on) { // gouden rand om de keuze
        ctx.fillStyle = Math.floor(this.time * 3) % 2 ? '#ffc93c' : '#fff1a0';
        ctx.fillRect(c.x - 2, y - 2, c.w + 4, 2); ctx.fillRect(c.x - 2, y + c.h, c.w + 4, 2);
        ctx.fillRect(c.x - 2, y - 2, 2, c.h + 4); ctx.fillRect(c.x + c.w, y - 2, 2, c.h + 4);
      }
      const [l, sym, r] = EXAMPLE[c.id];
      f.draw(ctx, `${l} ${sym} ${r}`, c.x + c.w / 2, y + 22, { font: 'big', scale: 2, align: 'center', color: on ? ['#fffbe0', '#ffc93c'] : '#c8c0e8', outline: '#1a1324' });
      ui.text(ctx, OPERATIONS[c.id].label, c.x + c.w / 2, y + 70, { font: 'big', align: 'center', color: on ? ['#d0ffd8', '#5fd65a'] : '#e8e4ff' });
      const sub = c.id === 'mul' ? 'KEERSOMMEN' : 'DEELSOMMEN';
      ui.text(ctx, sub, c.x + c.w / 2, y + 92, { align: 'center', color: COLORS.dim, outline: null, shadow: false });
    });

    ui.text(ctx, this.first ? 'JE KUNT LATER WISSELEN MET DE KNOP LINKSBOVEN OP HET STARTSCHERM.' : 'COINS, PETS EN WERELDEN ZIJN VOOR ALLEBEI HETZELFDE.', W / 2, 214, { align: 'center', color: '#e8e4ff' });
    ui.text(ctx, ui.hint('← → KIEZEN   ENTER = OEFENEN', 'TIK OP WAT JE WILT OEFENEN'), W / 2, 258, { align: 'center', color: '#e8e4ff' });
  }
}
