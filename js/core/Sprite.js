// ---------------------------------------------------------------------------
// Animator + tekenhulp voor sprite sheets.
// ---------------------------------------------------------------------------

export class Animator {
  constructor(sheet, anim) {
    this.sheet = sheet;
    this.play(anim || Object.keys(sheet.anims)[0], true);
    this.speed = 1;
  }
  play(name, restart = false) {
    if (!restart && this.name === name) return this;
    const a = this.sheet.anims[name];
    if (!a) throw new Error('Onbekende animatie ' + name);
    this.name = name;
    this.anim = a;
    this.t = 0;
    this.frame = 0;
    this.done = false;
    return this;
  }
  update(dt) {
    if (this.done) return;
    this.t += dt * this.speed;
    const f = Math.floor(this.t * this.anim.fps);
    if (this.anim.loop) this.frame = f % this.anim.frames;
    else if (f >= this.anim.frames) { this.frame = this.anim.frames - 1; this.done = true; }
    else this.frame = f;
  }
}

/**
 * Teken een frame. (x,y) is het ankerpunt (meestal de voeten).
 * opts: flip (spiegel horizontaal), alpha, flashImg (wit silhouet), scale
 */
export function drawFrame(ctx, sheet, animName, frame, x, y, opts = {}) {
  const a = sheet.anims[animName];
  const fw = sheet.fw, fh = sheet.fh;
  const sx = frame * fw, sy = a.row * fh;
  const ax = sheet.anchor ? sheet.anchor[0] : fw / 2;
  const ay = sheet.anchor ? sheet.anchor[1] : fh;
  const sc = opts.scale || 1;
  const img = opts.flashImg || sheet.img;
  const needSave = opts.flip || opts.alpha != null || sc !== 1;
  if (needSave) ctx.save();
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  if (opts.flip) {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(-sc, sc);
    ctx.drawImage(img, sx, sy, fw, fh, -ax, -ay, fw, fh);
  } else if (sc !== 1) {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(sc, sc);
    ctx.drawImage(img, sx, sy, fw, fh, -ax, -ay, fw, fh);
  } else {
    ctx.drawImage(img, sx, sy, fw, fh, Math.round(x - ax), Math.round(y - ay), fw, fh);
  }
  if (needSave) ctx.restore();
}

export function drawSprite(ctx, spr, x, y, opts = {}) {
  if (opts.alpha != null) { ctx.save(); ctx.globalAlpha *= opts.alpha; }
  ctx.drawImage(spr.img, spr.x, spr.y, spr.w, spr.h, Math.round(x), Math.round(y), spr.w, spr.h);
  if (opts.alpha != null) ctx.restore();
}

/** 9-slice paneel uit de UI-atlas. */
export function drawPanel(ctx, spr, x, y, w, h, slice = 8) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const s = slice, iw = spr.w - s * 2, ih = spr.h - s * 2;
  const img = spr.img, sx = spr.x, sy = spr.y;
  const cw = w - s * 2, ch = h - s * 2;
  ctx.drawImage(img, sx, sy, s, s, x, y, s, s);
  ctx.drawImage(img, sx + s + iw, sy, s, s, x + w - s, y, s, s);
  ctx.drawImage(img, sx, sy + s + ih, s, s, x, y + h - s, s, s);
  ctx.drawImage(img, sx + s + iw, sy + s + ih, s, s, x + w - s, y + h - s, s, s);
  if (cw > 0) {
    ctx.drawImage(img, sx + s, sy, iw, s, x + s, y, cw, s);
    ctx.drawImage(img, sx + s, sy + s + ih, iw, s, x + s, y + h - s, cw, s);
  }
  if (ch > 0) {
    ctx.drawImage(img, sx, sy + s, s, ih, x, y + s, s, ch);
    ctx.drawImage(img, sx + s + iw, sy + s, s, ih, x + w - s, y + s, s, ch);
  }
  if (cw > 0 && ch > 0) ctx.drawImage(img, sx + s, sy + s, iw, ih, x + s, y + s, cw, ch);
}
