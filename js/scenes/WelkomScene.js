// ---------------------------------------------------------------------------
// WelkomScene – "WIE SPEELT ER?": het eerste scherm als accounts aan staan en
// je (nog) niet bent ingelogd.
//   INLOGGEN · ACCOUNT MAKEN · ZONDER ACCOUNT SPELEN
// Daarna: de eerste keer "WAT GA JE OEFENEN?" (SoortScene), dan het startscherm.
// "Zonder account" geldt tot de browser/app sluit (AccountService.guest); na
// uitloggen verschijnt dit scherm meteen weer voor de volgende speler.
//
//   ↑ / ↓  kiezen · Enter / klik  bevestigen · L  inloggen
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from '../ui/UI.js';
import { AccountPanel } from '../ui/AccountPanel.js';

const W = CONFIG.width;

export class WelkomScene {
  constructor(game) { this.game = game; }

  enter() {
    this.time = 0;
    this.sel = 0;
    const bw = 200, x = Math.round(W / 2 - bw / 2);
    this.buttons = [
      { id: 'login', label: 'INLOGGEN', key: 'L', x, y: 92, w: bw, h: 30, style: 'btn_go', big: true },
      { id: 'signup', label: 'ACCOUNT MAKEN', x, y: 130, w: bw, h: 24, style: 'btn' },
      { id: 'guest', label: 'ZONDER ACCOUNT SPELEN', x: x + 20, y: 176, w: bw - 40, h: 18, style: 'btn', small: true },
    ];
  }

  get acc() { return this.game.account; }

  pick(id) {
    const g = this.game;
    if (this.acc.panelOpen) return;
    g.audio.play('select');
    if (id === 'login') AccountPanel.open(g);
    else if (id === 'signup') { const p = AccountPanel.open(g); if (p) p.showSignup(); }
    else { this.acc.guest = true; g.goToTitle(); }
  }

  onKey(a) {
    const g = this.game;
    if (this.acc.panelOpen) return;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    if (a.type === 'account') { this.pick('login'); return; }
    if (a.type === 'up' || a.type === 'down' || a.type === 'next' || a.type === 'prev') {
      const d = a.type === 'up' || a.type === 'prev' ? -1 : 1;
      this.sel = (this.sel + d + this.buttons.length) % this.buttons.length;
      g.audio.play('key');
      return;
    }
    if (a.type === 'enter' || a.type === 'space') this.pick(this.buttons[this.sel].id);
  }

  onPointer(kind, x, y) {
    if (this.acc.panelOpen) return;
    const i = this.buttons.findIndex(b => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h);
    if (kind === 'move') { if (i >= 0) this.sel = i; return; }
    if (kind === 'down' && i >= 0) this.pick(this.buttons[i].id);
  }

  update(dt) {
    this.time += dt;
    this.game.world.update(dt, this.time * 30, 1);
    this.game.particles.update(dt);
    // (bijv. nog op de achtergrond) toch ingelogd → meteen door
    if (this.acc.loggedIn && !this.acc.panelOpen) this.game.goToTitle();
  }

  draw(ctx) {
    const g = this.game, ui = g.ui, f = g.font;
    g.world.drawBack(ctx);
    g.world.drawFront(ctx);
    ctx.fillStyle = 'rgba(12,8,24,0.55)';
    ctx.fillRect(0, 0, W, CONFIG.height);

    const bob = Math.round(Math.sin(this.time * 2) * 1.5);
    f.draw(ctx, 'TAFEL RUSH', W / 2 + 2, 14 + bob + 2, { font: 'big', scale: 2, align: 'center', color: '#3a1d10', outline: '#1a1324', shadow: false });
    f.draw(ctx, 'TAFEL RUSH', W / 2, 14 + bob, { font: 'big', scale: 2, align: 'center', color: ['#fffbe0', '#fff1a0', '#ffc93c', '#ff9a2a', '#e0481e'], outline: '#1a1324' });
    ui.text(ctx, 'WIE SPEELT ER?', W / 2, 66, { font: 'big', align: 'center', color: ['#e0ffff', '#4fd0ff'] });

    this.buttons.forEach((b, i) => {
      const on = i === this.sel;
      ui.panel(ctx, b.x, b.y, b.w, b.h, b.style);
      if (on) { // gouden rand om de gekozen knop
        ctx.fillStyle = Math.floor(this.time * 3) % 2 ? '#ffc93c' : '#fff1a0';
        ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, 2); ctx.fillRect(b.x - 2, b.y + b.h, b.w + 4, 2);
        ctx.fillRect(b.x - 2, b.y - 2, 2, b.h + 4); ctx.fillRect(b.x + b.w, b.y - 2, 2, b.h + 4);
      }
      const label = b.key ? ui.key(b.label, b.key) : b.label;
      ui.text(ctx, label, b.x + b.w / 2, b.y + Math.round(b.h / 2) - (b.big ? 5 : 4), { font: b.big ? 'big' : undefined, align: 'center', color: b.small ? '#c8c0e8' : '#ffffff', outline: b.big ? undefined : null, shadow: false });
    });
    ui.text(ctx, 'MET EEN ACCOUNT WORDT JE VOORTGANG BEWAARD, OOK OP ANDERE APPARATEN.', W / 2, 160, { align: 'center', color: COLORS.dim, outline: null, shadow: false });
    ui.text(ctx, 'ZONDER ACCOUNT BLIJFT JE VOORTGANG ALLEEN OP DIT APPARAAT.', W / 2, 200, { align: 'center', color: COLORS.dim, outline: null, shadow: false });
    ui.text(ctx, ui.hint('↑ ↓ KIEZEN   ENTER = OK', 'TIK OP WAT JE WILT'), W / 2, 258, { align: 'center', color: '#e8e4ff' });
  }
}
