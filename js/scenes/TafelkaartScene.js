// ---------------------------------------------------------------------------
// TafelkaartScene – 10×10 overzicht van alle sommen, gekleurd op beheersing:
// grijs (nog niet geoefend) → rood → oranje → groen → GOUD (razendsnel).
// Goud kost minimaal 4 verschillende dagen (zie training/MasteryMap.js) en
// vervaagt na 14 dagen zonder oefenen ("even opfrissen").
// Rij = eerste getal, kolom = tweede getal (7×8 en 8×7 zijn aparte vakjes).
//
//   pijltjes / muis   som bekijken
//   Enter / knop      direct de tafel van die rij trainen
//   Esc / K           terug
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from '../ui/UI.js';
import { buildMasteryMap, LEVELS, LEVEL_BY_ID, stepsToGold } from '../training/MasteryMap.js';
import { fmtInt, fmtSec, clamp } from '../core/util.js';

const W = CONFIG.width, H = CONFIG.height;
const CELL = 19, GX = 30, GY = 44;          // raster
const PX = 230, PY = 32, PW = 242, PH = 222; // rechter paneel

export class TafelkaartScene {
  constructor(game) { this.game = game; }

  enter() {
    const g = this.game;
    this.map = buildMasteryMap(g.profile.masteryStore);
    this.time = 0;
    // start op de eerste "lastige" som, anders 7×8
    const hard = this.map.cells.find(c => c.level === 'hard');
    this.cur = hard ? { a: hard.a, b: hard.b } : { a: 7, b: 8 };
    this.sparkles = [];
    g.particles.clear();
  }

  cell(a, b) { return this.map.cells[(a - 1) * 10 + (b - 1)]; }

  train() {
    const g = this.game, t = this.cur.a;
    g.audio.play('confirm');
    g.profile.updateSettings({ lastMode: 'training', lastTable: t });
    g.startRun(g.runOptions('training', [t]));
  }

  onKey(a) {
    if (a.type === 'help') { this.game.audio.play('select'); this.game.openHelp('kaart', () => this.game.openMap()); return; }
    const g = this.game;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    if (a.type === 'escape' || a.type === 'map') { g.audio.play('select'); g.goToTitle(); return; }
    const mv = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] }[a.type];
    if (mv) {
      this.cur = { a: clamp(this.cur.a + mv[0], 1, 10), b: clamp(this.cur.b + mv[1], 1, 10) };
      g.audio.play('key');
      return;
    }
    if (a.type === 'enter' || a.type === 'space') this.train();
  }

  onPointer(kind, x, y) {
    const inside = r => r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    const b = Math.floor((x - GX) / CELL) + 1, a = Math.floor((y - GY) / CELL) + 1;
    const onGrid = a >= 1 && a <= 10 && b >= 1 && b <= 10;
    if (kind === 'move') { if (onGrid) this.cur = { a, b }; return; }
    if (kind !== 'down') return;
    if (inside(this.backRect)) { this.game.goToTitle(); return; }
    if (inside(this.helpRect)) { this.game.audio.play('select'); this.game.openHelp('kaart', () => this.game.openMap()); return; }
    if (inside(this.trainRect)) { this.train(); return; }
    if (onGrid) { this.cur = { a, b }; this.game.audio.play('select'); }
  }

  update(dt) {
    this.time += dt;
    this.game.particles.update(dt);
    // af en toe een glinstering op een gouden vakje
    if (Math.random() < 0.08) {
      const golds = this.map.cells.filter(c => c.level === 'gold');
      if (golds.length) {
        const c = golds[Math.floor(Math.random() * golds.length)];
        this.sparkles.push({ x: GX + (c.b - 1) * CELL + 3 + Math.random() * 13, y: GY + (c.a - 1) * CELL + 3 + Math.random() * 13, t: 0 });
      }
    }
    for (const s of this.sparkles) s.t += dt;
    this.sparkles = this.sparkles.filter(s => s.t < 0.5);
  }

  draw(ctx) {
    const g = this.game, ui = g.ui;
    g.world.drawBack(ctx);
    g.world.drawFront(ctx);
    ctx.fillStyle = 'rgba(12,8,24,0.72)';
    ctx.fillRect(0, 0, W, H);

    ui.text(ctx, 'TAFELKAART', 12, 8, { font: 'big', color: COLORS.gold });
    this.backRect = { x: 150, y: 6, w: 70, h: 18 };
    ui.panel(ctx, this.backRect.x, this.backRect.y, this.backRect.w, this.backRect.h, 'btn');
    ui.text(ctx, '< TERUG', this.backRect.x + 35, this.backRect.y + 5, { align: 'center', outline: null, shadow: false });
    this.helpRect = ui.helpButton(ctx, 224, 6);

    this.drawGrid(ctx, ui);
    this.drawPanel(ctx, ui);
    ui.text(ctx, 'GOUD = 4 DAGEN SNEL EN GOED   ENTER = TAFEL TRAINEN   ESC = TERUG', W / 2, 258, { align: 'center', color: '#e8e4ff' });
  }

  drawGrid(ctx, ui) {
    // koppen
    ui.text(ctx, '×', GX - 10, GY - 11, { color: COLORS.goldFlat });
    for (let i = 1; i <= 10; i++) {
      const hiC = i === this.cur.b, hiR = i === this.cur.a;
      ui.text(ctx, String(i), GX + (i - 1) * CELL + CELL / 2, GY - 10, { align: 'center', color: hiC ? COLORS.goldFlat : '#c8c0e8', outline: null, shadow: false });
      ui.text(ctx, String(i), GX - 4, GY + (i - 1) * CELL + 6, { align: 'right', color: hiR ? COLORS.goldFlat : '#c8c0e8', outline: null, shadow: false });
    }
    // vakjes (komen diagonaal tevoorschijn)
    ctx.fillStyle = '#1a1324';
    ctx.fillRect(GX - 1, GY - 1, CELL * 10 + 1, CELL * 10 + 1);
    for (const c of this.map.cells) {
      const appear = clamp(this.time * 3.2 - (c.a + c.b) * 0.08, 0, 1);
      if (appear <= 0) continue;
      const lv = LEVEL_BY_ID[c.level];
      const x = GX + (c.b - 1) * CELL, y = GY + (c.a - 1) * CELL;
      const inset = Math.round((1 - appear) * 6);
      ctx.fillStyle = lv.color;
      ctx.fillRect(x + inset, y + inset, CELL - 1 - inset * 2, CELL - 1 - inset * 2);
      if (appear < 1) continue;
      ctx.fillStyle = lv.light;
      ctx.fillRect(x, y, CELL - 1, 1); ctx.fillRect(x, y, 1, CELL - 1);
      ui.text(ctx, String(c.answer), x + CELL / 2, y + 6, { align: 'center', color: lv.text, outline: null, shadow: false });
      if (c.upToday) { // vandaag een stapje hoger: klein wit hoekje
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + CELL - 4, y + 1, 2, 2);
      }
    }
    for (const s of this.sparkles) {
      const k = Math.round(2 - Math.abs(s.t - 0.25) * 8);
      if (k < 0) continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(s.x) - k, Math.round(s.y), k * 2 + 1, 1);
      ctx.fillRect(Math.round(s.x), Math.round(s.y) - k, 1, k * 2 + 1);
    }
    // cursor
    const cx = GX + (this.cur.b - 1) * CELL, cy = GY + (this.cur.a - 1) * CELL;
    ctx.fillStyle = Math.floor(this.time * 3) % 2 ? '#ffffff' : '#ffc93c';
    ctx.fillRect(cx - 2, cy - 2, CELL + 3, 2); ctx.fillRect(cx - 2, cy + CELL - 1, CELL + 3, 2);
    ctx.fillRect(cx - 2, cy - 2, 2, CELL + 3); ctx.fillRect(cx + CELL - 1, cy - 2, 2, CELL + 3);
  }

  drawPanel(ctx, ui) {
    const m = this.map;
    ui.panel(ctx, PX, PY, PW, PH, 'panel');
    const x = PX + 10;
    // totaal
    ui.text(ctx, 'GOUD', x, PY + 8, { color: COLORS.goldFlat });
    ui.text(ctx, `${m.counts.gold} / 100`, PX + PW - 10, PY + 8, { align: 'right', color: '#fff8ec' });
    const bw = PW - 20;
    ctx.fillStyle = '#0e0b1a'; ctx.fillRect(x, PY + 19, bw, 5);
    let ox = x;
    for (const id of ['gold', 'faded', 'good', 'almost', 'hard']) {
      const w = Math.round((m.counts[id] / 100) * bw);
      ctx.fillStyle = LEVEL_BY_ID[id].color; ctx.fillRect(ox, PY + 19, w, 5);
      ox += w;
    }

    // geselecteerde som
    const c = this.cell(this.cur.a, this.cur.b), lv = LEVEL_BY_ID[c.level];
    const dy = PY + 32;
    ui.panel(ctx, x - 4, dy, PW - 12, 64, 'panel_light');
    ui.text(ctx, `${c.a} × ${c.b} = ${c.answer}`, x + 4, dy + 5, { font: 'big', color: '#fff8ec' });
    // niveau-blokje + label
    ctx.fillStyle = '#1a1324'; ctx.fillRect(x + 4, dy + 23, 9, 9);
    ctx.fillStyle = lv.color; ctx.fillRect(x + 5, dy + 24, 7, 7);
    ui.text(ctx, lv.label, x + 17, dy + 24, { color: lv.light });
    let hint = '';
    if (c.level === 'faded') hint = 'SNEL GOED = WEER GOUD';
    else if (c.level !== 'gold' && c.level !== 'new') {
      const n = stepsToGold(c.rec);
      hint = c.upToday ? 'VANDAAG AL OMHOOG!' : `NOG ${n} DAG${n === 1 ? '' : 'EN'} TOT GOUD`;
    }
    if (hint) ui.text(ctx, hint, PX + PW - 14, dy + 24, { align: 'right', color: c.upToday ? '#ffffff' : COLORS.dim, outline: null, shadow: false });
    const r = c.rec;
    if (r && r.seen) ui.text(ctx, `${r.seen}× GEOEFEND · ${r.correct}× GOED${r.avgRt ? ' · GEM. ' + fmtSec(r.avgRt) : ''}`, x + 4, dy + 35, { color: '#c8c0e8', outline: null, shadow: false });
    // knop: deze tafel trainen
    this.trainRect = { x: x + 2, y: dy + 46, w: PW - 24, h: 14 };
    ui.panel(ctx, this.trainRect.x, this.trainRect.y, this.trainRect.w, this.trainRect.h, 'btn_go');
    ui.text(ctx, `TRAIN DE TAFEL VAN ${c.a}  (ENTER)`, this.trainRect.x + this.trainRect.w / 2, this.trainRect.y + 4, { align: 'center', outline: null, shadow: false });

    // legenda
    const ly = dy + 72;
    LEVELS.forEach((l, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const lx = x + col * 112, yy = ly + row * 12;
      ctx.fillStyle = '#1a1324'; ctx.fillRect(lx, yy, 9, 9);
      ctx.fillStyle = l.color; ctx.fillRect(lx + 1, yy + 1, 7, 7);
      ctx.fillStyle = l.light; ctx.fillRect(lx + 1, yy + 1, 7, 1);
      ui.text(ctx, `${l.label} ${m.counts[l.id]}`, lx + 13, yy + 1, { color: '#e8e4ff', outline: null, shadow: false });
    });

    // voortgang per tafel
    const ty = ly + 40;
    ui.text(ctx, 'TAFELS (GOUD VAN 19)', x, ty, { color: COLORS.dim, outline: null, shadow: false });
    for (let t = 1; t <= 10; t++) {
      const col = t <= 5 ? 0 : 1, row = (t - 1) % 5;
      const tx = x + col * 112, yy = ty + 11 + row * 11;
      const info = m.tables[t];
      ui.text(ctx, '×' + t, tx, yy, { color: t === this.cur.a ? COLORS.goldFlat : '#e8e4ff', outline: null, shadow: false });
      const bx = tx + 20, bwid = 56;
      ctx.fillStyle = '#0e0b1a'; ctx.fillRect(bx, yy + 1, bwid, 5);
      ctx.fillStyle = LEVEL_BY_ID.good.color; ctx.fillRect(bx, yy + 1, Math.round((info.practiced / info.total) * bwid), 5);
      ctx.fillStyle = LEVEL_BY_ID.gold.light; ctx.fillRect(bx, yy + 1, Math.round((info.gold / info.total) * bwid), 5);
      if (info.master) ui.icon(ctx, 'star', bx + bwid + 3, yy - 3);
      else ui.text(ctx, String(info.gold), bx + bwid + 4, yy, { color: '#a8a0c8', outline: null, shadow: false });
    }
  }
}
