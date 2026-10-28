// ---------------------------------------------------------------------------
// WereldkaartScene – de WERELDKAART: klik op een wereld; je held loopt erheen.
// Vergrendeld = grijs met slotje + voorwaarde; verslagen boss = vlaggetje.
// Rechtsboven ligt een geheimzinnig eiland in de mist ("BINNENKORT").
// Net vrijgespeeld? Dan tekent het pad zich, springt het slot open en loopt
// je held er vanzelf heen (settings.mapSeen onthoudt wat je al zag).
//
//   ← → / klik  wereld kiezen · Enter / SPEEL HIER  spelen · T / W  terug
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from '../ui/UI.js';
import { drawFrame, Animator } from '../core/Sprite.js';
import { Equipment } from '../systems/Equipment.js';
import { Worlds } from '../systems/Worlds.js';
import { WORLDS, BOSSES } from '../data/worlds.js';
import { WORLD_PET_ORDER } from '../data/pets.js';
import { MAP_NODES, segmentPoints, pointAlong, pathLength } from '../data/worldmap.js';

const W = CONFIG.width, H = CONFIG.height;
const PANEL = { x: 130, y: 202, w: 220, h: 50 };
const WALK_SPEED = 70;          // pixels per seconde over het pad
const REGION = { frostpeak: [226, 76], stormrijk: [370, 165] };

export class WereldkaartScene {
  constructor(game) { this.game = game; }

  enter() {
    const g = this.game, P = g.profile;
    this.time = 0;
    this.startWorld = Worlds.selected(P).id;
    this.heroIdx = Math.max(0, MAP_NODES.findIndex(n => n.id === this.startWorld));
    this.sel = this.heroIdx;
    this.hero = new Animator(g.assets.sheet(Equipment.loadout(P).sheet), 'idle');
    this.walk = null;              // { pts, t, len, to, then }
    this.queued = null;            // volgende doel als hij nog onderweg is
    this.flip = false;
    this.bolt = null; this.nextBolt = 1.5;
    this.flakes = Array.from({ length: 26 }, (_, i) => ({ x: 140 + ((i * 53) % 190), y: (i * 37) % 140, v: 6 + (i % 5) * 2 }));
    this.puffs = Array.from({ length: 9 }, (_, i) => ({ dx: (i * 17) % 40 - 20, dy: (i * 23) % 36 - 18, r: 12 + (i % 4) * 4, s: 0.4 + (i % 3) * 0.25, ph: i * 1.3 }));
    this.unlocking = null;         // nog niet geopend slotje tijdens de onthulling
    this.reveal = null;
    this.startReveal();
  }

  unlocked(i) { const n = MAP_NODES[i]; return !n.teaser && Worlds.isUnlocked(this.game.profile, n.id); }
  seen() { return this.game.profile.settings.mapSeen || ['greenwood']; }

  /** Nieuw vrijgespeelde wereld die nog niet op de kaart getoond is → onthullen. */
  startReveal() {
    const seen = this.seen();
    const i = MAP_NODES.findIndex((n, k) => !n.teaser && this.unlocked(k) && !seen.includes(n.id));
    if (i < 1) { this.reveal = null; return; }
    this.reveal = { idx: i, phase: 'path', t: 0 };
    this.unlocking = i;
    this.sel = i;
    this.game.audio.play('select');
  }

  finishReveal() {
    const r = this.reveal, id = MAP_NODES[r.idx].id;
    this.game.profile.updateSettings({ mapSeen: [...new Set([...this.seen(), id])] });
    this.reveal = null;
    this.startReveal();             // nog een? (bijv. twee werelden tegelijk vrijgespeeld)
  }

  /** Pad van plek a naar plek b (via de plekken ertussen). */
  route(a, b) {
    if (a === b) return null;
    const pts = [];
    if (b > a) for (let i = a + 1; i <= b; i++) pts.push(...(pts.length ? segmentPoints(i).slice(1) : segmentPoints(i)));
    else for (let i = a; i > b; i--) { const s = segmentPoints(i).slice().reverse(); pts.push(...(pts.length ? s.slice(1) : s)); }
    return pts;
  }

  walkTo(i, then = null) {
    if (!this.unlocked(i)) return false;
    // loopt hij al? dan eerst daar aankomen en daarna door naar het nieuwe doel
    if (this.walk) { this.queued = { i, then }; return true; }
    const pts = this.route(this.heroIdx, i);
    if (!pts) { if (then) then(); return true; }
    this.walk = { pts, t: 0, len: pathLength(pts), to: i, then };
    this.hero.play('run');
    return true;
  }

  select(i) {
    if (i === this.sel && !this.walk) return;
    this.sel = i;
    this.game.audio.play('key');
    this.walkTo(i);
  }

  play() {
    const g = this.game, i = this.sel;
    if (!this.unlocked(i)) { g.audio.play('error'); return; }
    g.audio.play('confirm');
    const go = () => { g.profile.updateSettings({ lastWorld: MAP_NODES[i].id }); g.goToTitle(); };
    if (this.walk && this.walk.to === i && !this.queued) this.walk.then = go;
    else if (this.queued && this.queued.i === i) this.queued.then = go;
    else if (!this.walkTo(i, go)) go();
  }

  back() { this.game.audio.play('select'); this.game.goToTitle(); }

  // --- invoer --------------------------------------------------------------------------
  onKey(a) {
    const g = this.game;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    if (this.reveal) { if (a.type === 'enter' || a.type === 'space') this.skipReveal(); return; }
    if (a.type === 'back' || a.type === 'world') { this.back(); return; }
    const d = { left: -1, up: -1, prev: -1, right: 1, down: 1, next: 1 }[a.type];
    if (d) { this.select(Math.max(0, Math.min(MAP_NODES.length - 1, this.sel + d))); return; }
    if (a.type === 'enter' || a.type === 'space') this.play();
  }

  onPointer(kind, x, y) {
    if (kind !== 'down') { this.hoverPoint = { x, y }; return; }
    if (this.reveal) { this.skipReveal(); return; }
    const inside = r => r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    if (inside(this.backRect)) { this.back(); return; }
    if (inside(this.playRect)) { this.play(); return; }
    const i = MAP_NODES.findIndex(n => Math.hypot(x - n.x, y - n.y) < 16);
    if (i < 0) return;
    if (i === this.sel && this.unlocked(i) && !this.walk) this.play();   // nog een keer tikken = spelen
    else this.select(i);
  }

  skipReveal() {
    const r = this.reveal;
    if (!r || r.phase === 'walk') return;
    r.phase = 'unlock'; r.t = 0.6;
  }

  // --- bijwerken -----------------------------------------------------------------------
  update(dt) {
    this.time += dt;
    const g = this.game;
    g.particles.update(dt);
    this.hero.update(dt);
    // onthulling: pad tekenen → slot open → erheen lopen
    const r = this.reveal;
    if (r) {
      r.t += dt;
      if (r.phase === 'path' && r.t >= 1.4) { r.phase = 'unlock'; r.t = 0; g.audio.play('chest'); }
      else if (r.phase === 'unlock' && r.t >= 0.7) {
        const n = MAP_NODES[r.idx];
        this.unlocking = null;
        g.particles.burst(n.x, n.y, { count: 26, colors: ['#ffc93c', '#fff1a0', '#ffffff'], speed: 90, g: 120, life: 0.8, screen: true });
        g.audio.play('record');
        r.phase = 'walk'; r.t = 0;
        this.walkTo(r.idx, () => this.finishReveal());
      }
    }
    // lopen over het pad
    const w = this.walk;
    if (w) {
      w.t += (dt * WALK_SPEED) / Math.max(1, w.len);
      if (w.t >= 1) {
        this.heroIdx = w.to; this.walk = null; this.hero.play('idle');
        const q = this.queued; this.queued = null;
        if (q) this.walkTo(q.i, q.then);
        else if (w.then) w.then();
      }
    }
    // bliksem boven Stormrijk (alleen als die open is)
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) {
      this.nextBolt = 2.5 + Math.random() * 3.5;
      if (this.unlocked(2)) this.bolt = { x: 330 + Math.random() * 90, t: 0.25 };
    }
    if (this.bolt) { this.bolt.t -= dt; if (this.bolt.t <= 0) this.bolt = null; }
    for (const f of this.flakes) { f.y += f.v * dt; f.x += Math.sin(this.time + f.y * 0.1) * 4 * dt; if (f.y > 140) f.y = 14; }
  }

  heroPos() {
    if (this.walk) {
      const p = pointAlong(this.walk.pts, this.walk.t);
      if (p.dx) this.flip = p.dx < 0;
      return p;
    }
    const n = MAP_NODES[this.heroIdx];
    return { x: n.x, y: n.y };
  }

  // --- tekenen -------------------------------------------------------------------------
  draw(ctx) {
    const g = this.game, ui = g.ui;
    drawFrame(ctx, g.assets.sheet('worldmap'), 'idle', 0, 0, 0);
    this.drawWeather(ctx);
    this.drawPaths(ctx);
    MAP_NODES.forEach((n, i) => this.drawNode(ctx, ui, n, i));
    this.drawMist(ctx);
    // held (halve grootte, voeten op het pad)
    const hp = this.heroPos();
    drawFrame(ctx, this.hero.sheet, this.hero.name, this.hero.frame, Math.round(hp.x) - 2, Math.round(hp.y) - 3, { scale: 0.5, flip: this.flip });

    // kop
    ui.text(ctx, 'WERELDKAART', 12, 8, { font: 'big', color: COLORS.gold });
    this.backRect = { x: 150, y: 6, w: 84, h: 18 };
    ui.panel(ctx, 150, 6, 84, 18, 'btn');
    ui.text(ctx, ui.key('< TERUG', 'T'), 192, 11, { align: 'center', outline: null, shadow: false });
    this.drawPanel(ctx, ui);
    if (this.reveal && this.reveal.phase !== 'walk') {
      const n = MAP_NODES[this.reveal.idx], wd = WORLDS[n.id];
      ui.text(ctx, 'NIEUWE WERELD: ' + wd.name + '!', W / 2, 34, { font: 'big', align: 'center', color: ['#fffbe0', '#ffc93c'] });
    }
    g.particles.draw(ctx, 0, true);
  }

  drawWeather(ctx) {
    // sneeuwvlokjes boven Frostpeak
    ctx.fillStyle = '#ffffff';
    for (const f of this.flakes) ctx.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
    // donkere wolken + bliksem boven Stormrijk
    const t = this.time;
    for (const [cx, cy, r] of [[338, 118, 16], [372, 112, 20], [404, 122, 15], [430, 140, 12]]) {
      const x = cx + Math.sin(t * 0.3 + cx) * 4;
      ctx.fillStyle = 'rgba(20,14,30,0.55)';
      ctx.beginPath(); ctx.ellipse(x, cy, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (this.bolt) {
      const b = this.bolt;
      ctx.fillStyle = 'rgba(255,248,176,0.18)'; ctx.fillRect(280, 100, 200, 160);
      ctx.fillStyle = '#fff8b0';
      let x = b.x, y = 118;
      for (let i = 0; i < 8; i++) { const nx = x + (i % 2 ? 3 : -2), ny = y + 5; ctx.fillRect(Math.min(x, nx), y, Math.abs(nx - x) + 1, 5); x = nx; y = ny; }
    }
    // vergrendelde gebieden: lichte nevel eroverheen
    MAP_NODES.forEach((n, i) => {
      const c = REGION[n.id];
      if (!c || this.unlocked(i) && this.unlocking !== i) return;
      for (const p of this.puffs) {
        const x = c[0] + p.dx * 2.2 + Math.sin(t * p.s + p.ph) * 6, y = c[1] + p.dy * 1.6;
        ctx.fillStyle = 'rgba(40,34,60,0.22)';
        ctx.beginPath(); ctx.ellipse(x, y, p.r * 1.6, p.r, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  drawPaths(ctx) {
    for (let i = 1; i < MAP_NODES.length; i++) {
      if (!this.unlocked(i - 1)) continue;
      const pts = segmentPoints(i), len = pathLength(pts);
      const open = this.unlocked(i) && this.unlocking !== i;
      let frac = open ? 1 : 1, bright = open;
      if (this.reveal && this.reveal.idx === i) { bright = true; frac = this.reveal.phase === 'path' ? Math.min(1, this.reveal.t / 1.4) : 1; }
      for (let d = 2; d < len * frac; d += 6) {
        const p = pointAlong(pts, d / len);
        if (bright) { ctx.fillStyle = '#1a1324'; ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 1, 4, 3); ctx.fillStyle = '#fff1a0'; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y), 2, 1); }
        else { ctx.fillStyle = 'rgba(200,192,232,0.45)'; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y), 2, 1); }
      }
    }
  }

  drawNode(ctx, ui, n, i) {
    const open = this.unlocked(i) && this.unlocking !== i, wd = WORLDS[n.id];
    const color = n.teaser ? '#6a7290' : open ? (wd.color || '#ffc93c') : '#6a6680';
    const sel = i === this.sel;
    if (sel) { // gouden ring om de gekozen plek
      ctx.fillStyle = Math.floor(this.time * 3) % 2 ? '#ffc93c' : '#fff1a0';
      ctx.beginPath(); ctx.arc(n.x, n.y, 11, 0, Math.PI * 2); ctx.arc(n.x, n.y, 9, 0, Math.PI * 2, true); ctx.fill();
    }
    ctx.fillStyle = '#1a1324'; ctx.beginPath(); ctx.ellipse(n.x, n.y + 1, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(n.x, n.y, 7.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(n.x - 4, n.y - 4, 5, 1);
    if (!open && !n.teaser) {
      const shake = this.unlocking === i && this.reveal && this.reveal.phase === 'unlock' ? Math.round(Math.sin(this.time * 60) * 1.5) : 0;
      ui.icon(ctx, 'lock', n.x - 6 + shake, n.y - 8);
    }
    if (n.teaser) ui.text(ctx, '?', n.x, n.y - 4, { align: 'center', color: '#e8e4ff' });
    // vlaggetje: boss van deze wereld al eens verslagen
    if (open && this.game.profile.worldBosses(n.id) > 0) {
      ctx.fillStyle = '#1a1324'; ctx.fillRect(n.x + 6, n.y - 15, 2, 13);
      ctx.fillStyle = '#e8e4ff'; ctx.fillRect(n.x + 6, n.y - 15, 1, 12);
      ctx.fillStyle = '#e8483f'; ctx.fillRect(n.x + 8, n.y - 15, 6, 4); ctx.fillRect(n.x + 8, n.y - 11, 4, 1);
    }
    // naam boven de plek
    const label = n.teaser ? '???' : wd.name;
    const heroHere = !this.walk && this.heroIdx === i;   // dan de naam boven zijn hoofd
    ui.text(ctx, label, n.x, n.y - (heroHere ? 38 : 22), { align: 'center', color: open || n.teaser ? (n.teaser ? '#c8c0e8' : color) : '#a8a0c8' });
  }

  drawMist(ctx) {
    // het geheimzinnige eiland blijft in de mist
    const n = MAP_NODES.find(m => m.teaser), t = this.time;
    if (!n) return;
    for (const p of this.puffs) {
      const x = n.x + p.dx * 1.2 + Math.sin(t * p.s + p.ph) * 5, y = n.y + p.dy * 0.9;
      ctx.fillStyle = 'rgba(190,196,220,0.20)';
      ctx.beginPath(); ctx.ellipse(x, y, p.r * 1.3, p.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawPanel(ctx, ui) {
    const g = this.game, n = MAP_NODES[this.sel], open = this.unlocked(this.sel), p = PANEL;
    ui.panel(ctx, p.x, p.y, p.w, p.h, 'panel');
    this.playRect = null;
    if (n.teaser) {
      ui.text(ctx, '???', p.x + 10, p.y + 7, { font: 'big', color: '#c8c0e8' });
      ui.text(ctx, 'EEN GEHEIM GEBIED IN DE MIST...', p.x + 10, p.y + 25, { color: '#e8e4ff', outline: null, shadow: false });
      ui.text(ctx, 'BINNENKORT!', p.x + 10, p.y + 36, { color: COLORS.gold, outline: null, shadow: false });
      return;
    }
    const wd = WORLDS[n.id], boss = BOSSES[wd.boss];
    ui.text(ctx, wd.name, p.x + 10, p.y + 7, { font: 'big', color: open ? wd.color : '#a8a0c8' });
    if (!open) {
      ui.icon(ctx, 'lock', p.x + 10, p.y + 23);
      ui.text(ctx, Worlds.requirementLabel(n.id), p.x + 26, p.y + 25, { color: '#ffb0a0', outline: null, shadow: false });
      ui.text(ctx, 'DAN GAAT DEZE WERELD OPEN!', p.x + 26, p.y + 36, { color: COLORS.dim, outline: null, shadow: false });
      return;
    }
    const beaten = g.profile.worldBosses(n.id), pets = WORLD_PET_ORDER[n.id] || [], found = pets.filter(id => g.profile.collection.found[id]).length;
    ui.text(ctx, `BOSS: ${boss ? boss.name : '?'}`, p.x + 10, p.y + 25, { color: '#e8e4ff', outline: null, shadow: false });
    ui.text(ctx, `${beaten ? beaten + '× VERSLAGEN   ' : ''}WERELD-PETS: ${found}/${pets.length}`, p.x + 10, p.y + 36, { color: found === pets.length && pets.length ? COLORS.gold : '#c8c0e8', outline: null, shadow: false });
    if (this.reveal) return;   // tijdens het openspringen nog geen knop
    const r = this.playRect = { x: p.x + p.w - 86, y: p.y + 6, w: 78, h: 16 };
    const hp = this.hoverPoint, hov = hp && hp.x >= r.x && hp.y >= r.y && hp.x < r.x + r.w && hp.y < r.y + r.h;
    ui.panel(ctx, r.x, r.y, r.w, r.h, hov ? 'btn_hover' : 'btn_go');
    ui.text(ctx, 'SPEEL HIER', r.x + r.w / 2, r.y + 4, { align: 'center', outline: null, shadow: false });
  }
}
