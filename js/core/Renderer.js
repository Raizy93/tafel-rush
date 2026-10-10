// ---------------------------------------------------------------------------
// Renderer – tekent alles op een klein pixel-canvas (480x270) en schaalt dat
// scherp naar het scherm. Werkt in elk formaat (ook in een iframe):
//   1) buffer 480x270  → 2) display-canvas op integer veelvoud (nearest)
//   3) CSS-schaal past het in het venster (letterbox).
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';

export class Renderer {
  constructor(display) {
    this.W = CONFIG.width;
    this.H = CONFIG.height;
    this.display = display;
    this.dctx = display.getContext('2d', { alpha: false });
    this.buffer = document.createElement('canvas');
    this.buffer.width = this.W;
    this.buffer.height = this.H;
    this.ctx = this.buffer.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.cssScale = 1;
    this.rect = { x: 0, y: 0, w: this.W, h: this.H };
    this.shakeT = 0; this.shakeAmp = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.min(vw / this.W, vh / this.H);
    const cssW = Math.floor(this.W * s), cssH = Math.floor(this.H * s);
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.min(6, Math.ceil(s * dpr)));
    this.display.width = this.W * k;
    this.display.height = this.H * k;
    this.display.style.width = cssW + 'px';
    this.display.style.height = cssH + 'px';
    this.display.style.left = Math.floor((vw - cssW) / 2) + 'px';
    this.display.style.top = Math.floor((vh - cssH) / 2) + 'px';
    this.cssScale = s;
    this.rect = { x: Math.floor((vw - cssW) / 2), y: Math.floor((vh - cssH) / 2), w: cssW, h: cssH };
    this.dctx.imageSmoothingEnabled = false;
  }

  /** Scherm-coördinaten (CSS px) → logische pixel-coördinaten. */
  toLogical(clientX, clientY) {
    const r = this.display.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * this.W, y: ((clientY - r.top) / r.height) * this.H };
  }

  shake(amp, dur = 0.25) {
    if (amp > this.shakeAmp || this.shakeT <= 0) { this.shakeAmp = amp; this.shakeT = dur; this.shakeDur = dur; }
  }

  /** Huidige shake-offset (integer pixels). */
  shakeOffset(dt) {
    if (this.shakeT <= 0) return { x: 0, y: 0 };
    this.shakeT -= dt;
    const k = Math.max(0, this.shakeT / this.shakeDur) * this.shakeAmp;
    return { x: Math.round((Math.random() * 2 - 1) * k), y: Math.round((Math.random() * 2 - 1) * k) };
  }

  present() {
    this.dctx.imageSmoothingEnabled = false;
    this.dctx.drawImage(this.buffer, 0, 0, this.display.width, this.display.height);
  }
}
