// ---------------------------------------------------------------------------
// QuestionPanel – DE rekensom. Altijd het belangrijkste element in beeld.
//   7 × 8 = [ 56 ]
// Groot, rustig en stabiel; reageert direct op elke toetsaanslag.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { COLORS } from './UI.js';

const TIER_FLASH = { perfect: '#ffc93c', fast: '#4fd0ff', good: '#5fd65a', slow: '#c8c0e8' };

export class QuestionPanel {
  constructor(game) {
    this.game = game;
    this.question = null;
    this.input = '';
    this.state = 'idle';     // idle | wrong
    this.flashT = 0;
    this.flashColor = null;
    this.shakeT = 0;
    this.popT = 0;
    this.correctAnswer = null;
    this.y = 52;
  }

  setQuestion(q) {
    this.question = q;
    this.input = '';
    this.state = 'idle';
    this.correctAnswer = null;
    this.popT = 0.09;
  }

  flashCorrect(tier) { this.flashT = 0.2; this.flashColor = TIER_FLASH[tier] || '#5fd65a'; }

  showWrong(answer) {
    this.state = 'wrong';
    this.correctAnswer = answer;
    this.shakeT = 0.3;
    this.flashT = 0;
  }

  update(dt) {
    if (this.flashT > 0) this.flashT -= dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.popT > 0) this.popT -= dt;
  }

  draw(ctx, ui, time) {
    const q = this.question;
    if (!q) return;
    const f = ui.font;
    const expr = `${q.a} ${q.symbol || '×'} ${q.b} =`;
    const sc = 2;
    const exprW = f.measure(expr, { font: 'huge', scale: sc });
    const boxW = 84;
    const gap = 10;
    const totalW = exprW + gap + boxW;
    const pw = Math.max(250, totalW + 36), ph = 50;
    let px = Math.round((CONFIG.width - pw) / 2);
    let py = this.y - (this.popT > 0 ? Math.round(this.popT * 30) : 0);
    if (this.shakeT > 0) px += Math.round(Math.sin(this.shakeT * 70) * 3 * (this.shakeT / 0.3));

    // paneel + rand-gloed
    ui.panel(ctx, px, py, pw, ph, 'panel');
    const rim = this.state === 'wrong' ? '#ff5a5a' : this.flashT > 0 ? this.flashColor : null;
    if (rim) {
      ctx.fillStyle = rim;
      ctx.globalAlpha = this.state === 'wrong' ? 1 : Math.min(1, this.flashT / 0.12);
      ctx.fillRect(px + 2, py + 1, pw - 4, 1); ctx.fillRect(px + 2, py + ph - 2, pw - 4, 1);
      ctx.fillRect(px + 1, py + 2, 1, ph - 4); ctx.fillRect(px + pw - 2, py + 2, 1, ph - 4);
      ctx.globalAlpha = 1;
    }

    const x0 = px + Math.round((pw - totalW) / 2);
    const ty = py + Math.round((ph - f.height('huge', sc)) / 2) + 1;
    ui.text(ctx, expr, x0, ty, { font: 'huge', scale: sc, color: ['#ffffff', '#ffffff', '#e8e4ff', '#c8c0f0'], outline: '#1a1324' });

    // antwoordvak
    const bx = x0 + exprW + gap, by = py + 7, bh = ph - 14;
    ui.panel(ctx, bx, by, boxW, bh, 'panel_light');
    let shown = this.input, color = ['#fff6c0', '#ffc93c'];
    if (this.state === 'wrong') { shown = String(this.correctAnswer); color = ['#d0ffd8', '#5fd65a']; }
    const iw = f.measure(shown || '0', { font: 'huge', scale: sc });
    const tx = bx + Math.round((boxW - (shown ? iw : 0)) / 2);
    if (shown) ui.text(ctx, shown, tx, ty, { font: 'huge', scale: sc, color, outline: '#1a1324' });
    // knipperende cursor
    if (this.state !== 'wrong' && this.input.length < CONFIG.answer.maxDigits && Math.floor(time * 2.4) % 2 === 0) {
      const cx = shown ? tx + iw + 2 : bx + boxW / 2 - 8;
      ctx.fillStyle = '#ffc93c';
      ctx.fillRect(Math.round(cx), by + bh - 9, 14, 3);
    }
    if (this.state === 'wrong') {
      ui.text(ctx, 'JUISTE ANTWOORD', bx + boxW / 2, py + ph + 2, { font: 'small', align: 'center', color: '#ffb0a0' });
    }
    this.rect = { x: px, y: py, w: pw, h: ph, boxX: bx, boxW };
  }
}

export { TIER_FLASH, COLORS };
