// ---------------------------------------------------------------------------
// Tips – korte uitleg op het moment dat iets belangrijk wordt (eerste kist,
// eerste dubbele pet, nieuwe wereld …). Iedere tip verschijnt maar één keer
// (profile.settings.tipsSeen). Nooit tijdens het rekenen: een scene laat tips
// alleen toe als hij tipsAllowed() heeft en die true geeft.
//
//   game.tips.queue('firstChest')   in de wachtrij (als nog niet gezien)
//   Game tekent de tip boven de scene en geeft hem eerst de toetsen/klikken.
// Hooguit één tip per schermbezoek (de belangrijkste eerst in de wachtrij),
// zodat het nooit een rij pop-ups wordt.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { TIPS } from '../data/help.js';

const W = CONFIG.width;

export class Tips {
  constructor(game) {
    this.game = game;
    this.waiting = [];
    this.current = null; // { id, t }
    this.shown = 0;      // tips in dit schermbezoek
    this.urgent = new Set(); // tips die direct moeten (bijv. bij de eerste dubbele pet)
  }

  /** Nieuw scherm: wachtrij leeg, teller op nul (Game.setScene). */
  reset() { this.waiting = []; this.shown = 0; this.current = null; this.urgent = new Set(); }

  get seenList() {
    const s = this.game.profile.settings;
    if (!Array.isArray(s.tipsSeen)) s.tipsSeen = [];
    return s.tipsSeen;
  }
  seen(id) { return this.seenList.includes(id); }
  get active() { return !!this.current; }

  /** Tip klaarzetten (alleen als hij nog nooit getoond is). urgent = ook als er al een tip was. */
  queue(id, urgent = false) {
    if (!TIPS[id] || this.seen(id) || this.waiting.includes(id) || (this.current && this.current.id === id)) return;
    if (urgent) { this.urgent.add(id); this.waiting.unshift(id); } else this.waiting.push(id);
  }

  /** Alleen aanroepen als de huidige scene tips toelaat. */
  update(dt) {
    if (!this.current && this.waiting.length && (this.shown < 1 || this.urgent.has(this.waiting[0]))) {
      const id = this.waiting.shift();
      if (this.seen(id)) return;
      this.current = { id, t: 0 };
      this.shown++;
      this.seenList.push(id);
      this.game.profile.save();
      this.game.audio.play('select');
    }
    if (this.current) this.current.t += dt;
  }

  close() {
    if (!this.current || this.current.t < 0.6) return; // niet per ongeluk wegtikken
    this.current = null;
    this.game.audio.play('confirm');
  }
  /** Retourneert true als de tip de toets heeft afgehandeld. */
  onKey(a) {
    if (!this.current) return false;
    if (a.type === 'mute') return false;
    if (a.type === 'enter' || a.type === 'space' || a.type === 'escape') this.close();
    return true;
  }
  onPointer(kind) {
    if (!this.current) return false;
    if (kind === 'down') this.close();
    return true;
  }

  draw(ctx) {
    const c = this.current;
    if (!c) return;
    const ui = this.game.ui, tip = TIPS[c.id];
    const k = Math.min(1, c.t / 0.25);
    ctx.fillStyle = `rgba(8,5,16,${0.5 * k})`;
    ctx.fillRect(0, 0, W, CONFIG.height);
    const lines = ui.font.wrap(tip.text, 250, { outline: false });
    const pw = 300, ph = 40 + lines.length * 10, px = Math.round(W / 2 - pw / 2), py = Math.round(96 - ph / 2 + (1 - k) * 12);
    ui.panel(ctx, px, py, pw, ph, 'panel');
    ctx.fillStyle = '#ffc93c'; ctx.fillRect(px + 3, py + 2, pw - 6, 1);
    const bob = Math.round(Math.sin(c.t * 5) * 1);
    ui.icon(ctx, tip.icon, px + 12, py + 10 + bob);
    ui.text(ctx, 'TIP!', px + 30, py + 12, { font: 'big', color: ['#fff1a0', '#ffc93c'] });
    lines.forEach((l, i) => ui.text(ctx, l, px + 30, py + 30 + i * 10, { color: '#e8e4ff', outline: null, shadow: false }));
    if (c.t >= 0.6) ui.text(ctx, 'ENTER = OK', px + pw - 10, py + 12, { align: 'right', color: Math.floor(c.t * 2) % 2 ? '#a8a0c8' : '#e8e4ff', outline: null, shadow: false });
  }
}
