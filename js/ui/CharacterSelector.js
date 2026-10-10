// ---------------------------------------------------------------------------
// CharacterSelector – compacte horizontale characterkeuze (startscherm).
// Toont per character een kleine geanimeerde preview, de naam en of hij
// geselecteerd / vergrendeld is. Keuze wordt opgeslagen via ProfileService.
// Werkt voor ieder aantal characters uit data/characters.js (geen if-ranger).
// ---------------------------------------------------------------------------
import { CharacterRegistry } from '../systems/CharacterRegistry.js';
import { Equipment } from '../systems/Equipment.js';
import { Animator, drawFrame } from '../core/Sprite.js';
import { COLORS } from './UI.js';

export class CharacterSelector {
  /** rect = { x, y, w, h } van het paneel */
  constructor(game, rect) {
    this.game = game;
    this.rect = rect;
    this.chars = CharacterRegistry.all();
    this.selectedId = CharacterRegistry.selected(game.profile).id;
    this.anims = {};
    for (const c of this.chars) {
      // preview mét het uitgeruste wapen
      const sheet = game.assets.sheet(Equipment.loadout(game.profile, c.id).sheet);
      this.anims[c.id] = { sheet, idle: new Animator(sheet, 'idle'), run: new Animator(sheet, 'run') };
    }
    this.layout();
  }

  layout() {
    const r = this.rect, n = this.chars.length;
    const gap = 3, sw = Math.floor((r.w - 12 - gap * (n - 1)) / n), sh = 62;
    this.slots = this.chars.map((c, i) => ({ id: c.id, x: r.x + 6 + i * (sw + gap), y: r.y + 16, w: sw, h: sh }));
  }

  get selected() { return CharacterRegistry.get(this.selectedId); }

  select(id) {
    const g = this.game;
    if (!CharacterRegistry.isUnlocked(id, g.profile)) {
      // Later: hier een koop-/unlock-dialoog (CharacterRegistry.tryUnlock).
      g.audio.play('error');
      this.lockedHint = { id, t: 1.2 };
      return false;
    }
    if (id !== this.selectedId) g.audio.play('select');
    this.selectedId = id;
    g.profile.selectCharacter(id);
    this.anims[id].run.play('run', true);
    return true;
  }

  /** Volgende/vorige beschikbare character (toetsenbord). */
  cycle(dir) {
    const ids = this.chars.map(c => c.id);
    let i = ids.indexOf(this.selectedId);
    for (let k = 0; k < ids.length; k++) {
      i = (i + dir + ids.length) % ids.length;
      if (CharacterRegistry.isUnlocked(ids[i], this.game.profile)) { this.select(ids[i]); return; }
    }
  }

  slotAt(x, y) { return this.slots.find(s => x >= s.x && y >= s.y && x < s.x + s.w && y < s.y + s.h + 10) || null; }

  /** Retourneert true als de klik door de selector is afgehandeld. */
  onPointer(x, y) {
    const b = this.shopRect;
    if (b && x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) { this.game.audio.play('select'); this.game.openEquipment(); return true; }
    const s = this.slotAt(x, y);
    if (!s) return false;
    this.select(s.id);
    return true;
  }

  update(dt) {
    for (const a of Object.values(this.anims)) { a.idle.update(dt); a.run.update(dt); }
    if (this.lockedHint) { this.lockedHint.t -= dt; if (this.lockedHint.t <= 0) this.lockedHint = null; }
  }

  draw(ctx, ui, hoverPoint) {
    const g = this.game, r = this.rect;
    ui.panel(ctx, r.x, r.y, r.w, r.h, 'panel');
    ui.text(ctx, 'KIES JE HELD', r.x + r.w / 2, r.y + 6, { align: 'center', color: COLORS.dim, outline: null, shadow: false });
    const hover = hoverPoint ? this.slotAt(hoverPoint.x, hoverPoint.y) : null;

    for (const s of this.slots) {
      const c = CharacterRegistry.get(s.id);
      const sel = s.id === this.selectedId;
      const unlocked = CharacterRegistry.isUnlocked(s.id, g.profile);
      ui.panel(ctx, s.x, s.y, s.w, s.h, sel ? 'panel_light' : 'panel');
      if (sel || (hover && hover.id === s.id)) {
        ctx.fillStyle = sel ? '#ffc93c' : '#8a7ad0';
        ctx.fillRect(s.x + 2, s.y + 1, s.w - 4, 1); ctx.fillRect(s.x + 2, s.y + s.h - 2, s.w - 4, 1);
        ctx.fillRect(s.x + 1, s.y + 2, 1, s.h - 4); ctx.fillRect(s.x + s.w - 2, s.y + 2, 1, s.h - 4);
      }
      // grondje + preview (zelfde ankerpunt voor ieder character)
      const fx = s.x + s.w / 2 - 2, fy = s.y + s.h - 6;
      ctx.fillStyle = sel ? '#3d8f44' : '#2a2248';
      ctx.fillRect(s.x + 4, fy, s.w - 8, 2);
      const A = this.anims[s.id];
      const ani = sel ? A.run : A.idle;
      ctx.save();
      ctx.beginPath(); ctx.rect(s.x + 2, s.y + 2, s.w - 4, s.h - 4); ctx.clip();
      if (unlocked) drawFrame(ctx, A.sheet, ani.name, ani.frame, fx, fy);
      else drawFrame(ctx, A.sheet, 'idle', 0, fx, fy, { flashImg: g.assets.flash(c.sheet, '#120c18'), alpha: 0.9 });
      ctx.restore();
      if (!unlocked) {
        ui.icon(ctx, 'lock', s.x + s.w / 2 - 6, s.y + 20);
        ui.text(ctx, CharacterRegistry.requirementLabel(s.id), s.x + s.w / 2, s.y + 36, { align: 'center', color: COLORS.goldFlat });
      }
      ui.text(ctx, c.name, s.x + s.w / 2, s.y + s.h + 2, { align: 'center', color: sel ? COLORS.goldFlat : unlocked ? '#e8e4ff' : '#8a84a0' });
    }

    const c = this.selected;
    const by = r.y + r.h - 46;
    ui.text(ctx, c.name, r.x + r.w / 2, by, { font: 'big', align: 'center', color: COLORS.gold });
    ui.text(ctx, c.role, r.x + r.w / 2, by + 18, { align: 'center', color: '#c8f0ff' });
    if (this.lockedHint) ui.text(ctx, 'NOG VERGRENDELD', r.x + r.w / 2, by - 10, { align: 'center', color: '#ffb0a0', outline: null, shadow: false });
    // knop naar de UITRUSTING (wapens + power-ups)
    this.shopRect = { x: r.x + 14, y: by + 28, w: r.w - 28, h: 16 };
    const hov = hoverPoint && hoverPoint.x >= this.shopRect.x && hoverPoint.y >= this.shopRect.y && hoverPoint.x < this.shopRect.x + this.shopRect.w && hoverPoint.y < this.shopRect.y + this.shopRect.h;
    ui.panel(ctx, this.shopRect.x, this.shopRect.y, this.shopRect.w, this.shopRect.h, hov ? 'btn_hover' : 'btn');
    ui.icon(ctx, 'sword', this.shopRect.x + 4, this.shopRect.y + 1);
    ui.text(ctx, 'UITRUSTING (U)', this.shopRect.x + this.shopRect.w / 2 + 6, this.shopRect.y + 4, { align: 'center', outline: null, shadow: false });
  }
}
