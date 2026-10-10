// ---------------------------------------------------------------------------
// PetFx – live effecten voor zeldzame pets (data: PETS[id].fx).
//   glow   zachte lichtgloed achter de pet ('lighter' = echt oplichten)
//   trail  spoor van deeltjes (vuurvonkjes, schaduw, ijskristallen …)
//   cheer  uitbarsting bij juichen (legendarisch: met stralenring)
// Gebruikt door Pet (in de wereld) en het petboek (op het scherm, vergroot).
// ---------------------------------------------------------------------------

export const PetFx = {
  /** Midden van de sprite t.o.v. het ankerpunt (x, y). */
  center(sheet, x, y, scale = 1) {
    return { x, y: y - (sheet.anchor[1] - sheet.fh / 2) * scale };
  },

  drawGlow(ctx, def, sheet, x, y, t, scale = 1) {
    const g = def.fx && def.fx.glow;
    if (!g) return;
    const c = this.center(sheet, x, y, scale);
    const pulse = g.pulse ? 0.85 + 0.15 * Math.sin(t * 3) : 1;
    const r = g.r * scale * pulse;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    grad.addColorStop(0, hexA(g.color, g.alpha));
    grad.addColorStop(0.55, hexA(g.color, g.alpha * 0.45));
    grad.addColorStop(1, hexA(g.color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    ctx.restore();
  },

  /** Spoor: state = { acc } per pet. moving = rent de pet? */
  emit(particles, def, x, y, dt, state, { screen = false, scale = 1, moving = true, quality = 1 } = {}) {
    const tr = def.fx && def.fx.trail;
    if (!tr) return;
    state.acc = (state.acc || 0) + dt * tr.rate * quality * (moving ? 1 : 0.5);
    while (state.acc >= 1) {
      state.acc -= 1;
      const sp = (tr.spread || 4) * scale;
      const fx = x + tr.from[0] * scale + (Math.random() - 0.5) * sp;
      const fy = y + tr.from[1] * scale + (Math.random() - 0.5) * sp * 0.7;
      particles.spawn({
        x: fx, y: fy,
        vx: (moving ? -18 - Math.random() * 20 : (Math.random() - 0.5) * 16) * scale,
        vy: (tr.vy + (Math.random() - 0.5) * 10) * scale,
        drag: 1.2, life: tr.life * (0.7 + Math.random() * 0.6),
        size: Math.random() < 0.3 ? 2 * scale : scale,
        color: tr.colors[Math.floor(Math.random() * tr.colors.length)],
        glow: !!tr.glowing, screen,
        ground: tr.ground && !screen ? y : null,
      });
    }
  },

  /** Uitbarsting bij juichen. */
  cheer(particles, def, sheet, x, y, { screen = false, scale = 1 } = {}) {
    const ch = def.fx && def.fx.cheer;
    if (!ch) return;
    const c = this.center(sheet, x, y, scale);
    particles.burst(c.x, c.y, { count: ch.count, colors: ch.colors, speed: ch.speed * scale, g: 90 * scale, life: 0.9, size: [scale, 2 * scale], screen, glow: true });
    if (ch.ring) {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        particles.spawn({ x: c.x, y: c.y, vx: Math.cos(a) * 70 * scale, vy: Math.sin(a) * 70 * scale, drag: 2.2, life: 0.7, size: scale, color: ch.colors[i % 2], glow: true, screen });
      }
    }
  },
};

function hexA(hex, a) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${Math.max(0, Math.min(1, a))})`;
}
