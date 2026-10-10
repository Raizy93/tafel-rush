// ---------------------------------------------------------------------------
// World – de visuele wereld: parallax-lagen, grond, props en sfeer-effecten.
// De wereld is puur visuele progressie: je kunt niet "vallen" of botsen.
// Eén World-object wordt gedeeld door alle scenes; setWorld() wisselt tussen
// Greenwood, Frostpeak en Stormrijk (assets per wereld in atlas.worlds).
// Bliksem (biome.lightning) is bewust zacht: een korte, lichte flits met
// minstens een paar seconden ertussen – geen stroboscoop. onThunder() laat de
// game er een zacht donder-geluid bij spelen.
// Coördinaten: wereld-x in pixels; camX = linkerrand van het beeld.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { WORLDS } from '../data/worlds.js';
import { drawSprite } from '../core/Sprite.js';
import { rand, choice } from '../core/util.js';

const LAYERS = [
  // [naam, parallax-factor]
  ['far', 0.1],
  ['mid', 0.28],
  ['near', 0.55],
];

function weighted(list) {
  let t = 0;
  for (const [, w] of list) t += w;
  let r = Math.random() * t;
  for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
  return list[0][0];
}

export class World {
  constructor(assets, worldId = 'greenwood', biome = 'edge') {
    this.assets = assets;
    this.def = WORLDS[worldId];
    this.worldId = worldId;
    this.W = CONFIG.width; this.H = CONFIG.height;
    this.camX = 0;
    this.t = 0;
    this.cloudDrift = 0;
    this.columns = new Map();
    this.genCol = 0;
    this.bridgeQueue = [];
    this.props = [];
    this.nextBackX = 40;
    this.nextFrontX = 380;
    this.ambient = [];
    this.speedLines = [];
    this.quality = 1;
    this.setBiome(biome, true);
  }

  get biome() { return this.def.biomes[this.biomeKey]; }

  setBiome(key, instant = false) {
    if (key === this.biomeKey) return;
    this.prevLayers = instant ? null : this.layers;
    this.prevBiomeKey = this.biomeKey;
    this.biomeKey = key;
    this.layers = this.assets.biome(this.worldId, key);
    this.fade = instant ? 1 : 0;
    this.initAmbient();
  }

  /** Andere wereld kiezen (en resetten op het eerste bioom). */
  setWorld(worldId, biome) {
    if (worldId !== this.worldId && WORLDS[worldId]) { this.def = WORLDS[worldId]; this.worldId = worldId; this.biomeKey = null; }
    this.reset(biome || this.def.phases[0].biome);
  }

  /** Reset voor een nieuwe run of het titelscherm. */
  reset(biome = this.def.phases[0].biome) {
    this.columns.clear();
    this.genCol = 0;
    this.bridgeQueue = [];
    this.props = [];
    this.nextBackX = 40;
    this.nextFrontX = 380;
    this.camX = 0;
    this.biomeKey = null;
    this.setBiome(biome, true);
  }

  // --- grond ------------------------------------------------------------------------
  column(c) {
    let col = this.columns.get(c);
    if (col) return col;
    if (c < this.genCol) {
      // links van het startpunt (negatieve kolommen): gewone grond
      col = { tile: ((c % 4) + 4) % 4, biome: this.biomeKey };
      this.columns.set(c, col);
      return col;
    }
    // kolommen worden op volgorde gegenereerd zodat bruggen kloppen
    while (this.genCol <= c) {
      let tile;
      if (this.bridgeQueue.length) tile = this.bridgeQueue.shift();
      else if (this.genCol > 8 && Math.random() < (this.biome.bridgeChance || 0) * 0.25) {
        const len = 2 + Math.floor(Math.random() * 2);
        this.bridgeQueue = [...Array(len).fill(5), 6];
        tile = 4;
      } else tile = Math.floor(Math.random() * 4);
      this.columns.set(this.genCol, { tile, biome: this.biomeKey });
      this.genCol++;
    }
    return this.columns.get(c);
  }

  isBridge(worldX) {
    return this.column(Math.floor(worldX / 32)).tile >= 4; // genereert de kolom zo nodig
  }

  // --- props --------------------------------------------------------------------------
  spawnProps() {
    const ahead = this.camX + this.W + 80;
    while (this.nextBackX < ahead) {
      const x = this.nextBackX;
      this.nextBackX += rand(26, 80) / Math.max(0.6, this.quality);
      if (this.isBridge(x) || this.isBridge(x + 24)) continue;
      const name = weighted(this.biome.props.back);
      const spr = this.assets.sprite('props', name);
      this.props.push({ spr, x, y: CONFIG.groundY + 1 - spr.h + (name === 'tuft' || name.startsWith('flowers') ? 1 : 0), plane: 'back', name });
    }
    while (this.nextFrontX < ahead * 1.35) {
      const x = this.nextFrontX;
      this.nextFrontX += rand(340, 720);
      const name = choice(this.biome.props.front);
      this.props.push({ spr: this.assets.sprite('props', name), x, y: this.H - 30, plane: 'front', name });
    }
    // opruimen
    if (this.props.length > 80) this.props = this.props.filter(p => p.x - this.camX * (p.plane === 'front' ? 1.35 : 1) > -120);
  }

  // --- sfeer --------------------------------------------------------------------------
  initAmbient() {
    const kind = this.biome.ambient;
    const base = { fireflies: 26, snow: 46, blizzard: 90, sparkle: 30, aurora: 28, rain: 80, embers: 34, static: 26 }[kind] || 22;
    this.strike = null;
    this.nextStrike = this.biome.lightning ? rand(1.5, this.biome.lightning[0]) : Infinity;
    const n = Math.round(base * this.quality);
    this.ambient = [];
    for (let i = 0; i < n; i++) this.ambient.push(this.makeMote(kind, true));
  }
  makeMote(kind, anywhere) {
    const m = { kind, x: rand(0, this.W), y: anywhere ? rand(20, 220) : -4, t: rand(0, 10), s: rand(0.5, 1.2) };
    if (kind === 'leaves') { m.color = choice(['#79c25a', '#c2ec7c', '#e0a040', '#3d8f44']); m.vy = rand(10, 22); }
    if (kind === 'pollen') { m.color = choice(['#fff6c0', '#ffffff', '#ffe66a']); m.vy = rand(-4, 4); }
    if (kind === 'dust') { m.color = choice(['#ffe0a0', '#ffc87a', '#fff0c0']); m.vy = rand(-6, -1); }
    if (kind === 'fireflies') { m.color = choice(['#d8ff7a', '#fff36a', '#7affd0']); m.vy = rand(-5, 5); }
    if (kind === 'snow') { m.color = choice(['#ffffff', '#ffffff', '#e4eefa', '#c8dcf0']); m.vy = rand(12, 26); m.big = Math.random() < 0.2; }
    if (kind === 'blizzard') { m.color = choice(['#ffffff', '#e4eefa', '#dce4f2']); m.vy = rand(40, 75); m.big = Math.random() < 0.25; }
    if (kind === 'sparkle') { m.color = choice(['#7ad8ff', '#d8f8ff', '#ffffff']); m.vy = rand(-4, 4); }
    if (kind === 'rain') { m.color = choice(['#8a9ad8', '#a8b4e8', '#6a78b8']); m.vy = rand(170, 230); }
    if (kind === 'embers') { m.color = choice(['#ff7a2a', '#ffc860', '#ff4a1a']); m.vy = rand(-26, -10); }
    if (kind === 'static') { m.color = choice(['#6ad8ff', '#d0f8ff', '#ffe24a']); m.vy = rand(-3, 3); }
    if (kind === 'aurora') { m.color = choice(['#7affc8', '#a8ffe0', '#c890ff', '#ffffff']); m.vy = rand(-6, 2); }
    return m;
  }

  update(dt, camX, speed = 0) {
    this.t += dt;
    const dx = camX - this.camX;
    this.camX = camX;
    this.cloudDrift += dt * 5;
    if (this.fade < 1) { this.fade = Math.min(1, this.fade + dt / 2.4); if (this.fade >= 1) this.prevLayers = null; }
    this.spawnProps();
    // ambient (scherm-ruimte; beweegt mee met de snelheid)
    for (const m of this.ambient) {
      m.t += dt;
      m.x -= dx * 0.6 * m.s + (m.kind === 'leaves' ? 6 * dt : m.kind === 'snow' ? 8 * dt : m.kind === 'blizzard' ? 90 * dt * m.s : m.kind === 'rain' ? 40 * dt : 0);
      if (m.kind === 'static' && Math.random() < 0.08) { m.x += rand(-3, 3); m.y += rand(-3, 3); }
      if (m.kind === 'embers') m.x += Math.sin(m.t * 4 + m.s * 9) * 0.3;
      m.y += m.vy * dt + Math.sin(m.t * 2) * 0.15;
      if (m.kind === 'leaves') m.x += Math.sin(m.t * 3) * 0.4;
      if (m.x < -6) { m.x += this.W + 12; m.y = rand(10, 220); }
      if (m.x > this.W + 6) m.x -= this.W + 12;
      if (m.y > 226) { Object.assign(m, this.makeMote(m.kind, false)); m.x = rand(0, this.W); }
      if (m.y < 0) m.y = 220;
    }
    // bliksem
    if (this.biome.lightning) {
      this.nextStrike -= dt;
      if (this.nextStrike <= 0) {
        const [a, b] = this.biome.lightning;
        this.nextStrike = rand(a, b);
        this.strike = this.makeStrike();
        this.onThunder && this.onThunder();
      }
    }
    if (this.strike) { this.strike.t += dt; if (this.strike.t > 0.45) this.strike = null; }
    // snelheidsstrepen
    const level = speed;
    if (level > 1.25 && Math.random() < (level - 1.1) * 0.9 * this.quality) {
      this.speedLines.push({ x: this.W + 10, y: rand(30, 215), len: rand(18, 60), v: rand(500, 900) * level, a: rand(0.25, 0.55) });
    }
    for (const l of this.speedLines) l.x -= l.v * dt;
    this.speedLines = this.speedLines.filter(l => l.x + l.len > -10);
  }

  drawLayer(ctx, img, factor, y = 0, extra = 0) {
    if (!img) return;
    const w = img.width;
    let off = -(((this.camX * factor + extra) % w) + w) % w;
    off = Math.round(off);
    ctx.drawImage(img, off, y);
    if (off + w < this.W) ctx.drawImage(img, off + w, y);
  }

  /** Eén bliksemschicht: gekartelde lijn van de wolken naar de horizon (+ zijtakje). */
  makeStrike() {
    const pts = [];
    let x = rand(60, this.W - 60), y = -4;
    const end = rand(120, 190);
    while (y < end) { pts.push([x, y]); x += rand(-12, 12); y += rand(8, 18); }
    pts.push([x, end]);
    const k = Math.floor(pts.length * rand(0.3, 0.6));
    const branch = [pts[k]];
    let bx = pts[k][0], by = pts[k][1];
    for (let i = 0; i < 3; i++) { bx += rand(6, 16) * (Math.random() < 0.5 ? -1 : 1); by += rand(8, 14); branch.push([bx, by]); }
    return { t: 0, pts, branch, color: this.biome.boltColor || '#ffe24a' };
  }

  drawStrike(ctx) {
    const st = this.strike;
    // twee korte opflakkeringen, dan uitdoven
    const k = st.t < 0.06 ? 1 : st.t < 0.12 ? 0.35 : st.t < 0.18 ? 0.9 : Math.max(0, 1 - (st.t - 0.18) / 0.27);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, c, a] of [[4, st.color, 0.25], [2, st.color, 0.7], [1, '#ffffff', 1]]) {
      ctx.globalAlpha = a * k; ctx.strokeStyle = c; ctx.lineWidth = w;
      for (const line of [st.pts, st.branch]) {
        ctx.beginPath(); ctx.moveTo(line[0][0], line[0][1]);
        for (const p of line.slice(1)) ctx.lineTo(p[0], p[1]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawBiomeLayers(ctx, L) {
    ctx.drawImage(L.sky, 0, 0);
    if (L === this.layers && this.strike) this.drawStrike(ctx); // achter wolken en bergen
    if (L === this.layers && this.biome.aurora) this.drawAurora(ctx); // achter de bergen
    this.drawLayer(ctx, L.clouds, 0.04, 0, this.cloudDrift);
    for (const [name, f] of LAYERS) this.drawLayer(ctx, L[name], f);
  }

  /** Alles achter de personages. */
  drawBack(ctx) {
    if (this.prevLayers) {
      this.drawBiomeLayers(ctx, this.prevLayers);
      ctx.globalAlpha = this.fade;
      this.drawBiomeLayers(ctx, this.layers);
      ctx.globalAlpha = 1;
    } else this.drawBiomeLayers(ctx, this.layers);

    if (this.biome.rays) this.drawRays(ctx);
    if (this.strike && this.strike.t < 0.2) {
      // zachte lichtflits over het landschap (max. ~12% helderheid)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (this.strike.t < 0.06 ? 0.12 : this.strike.t < 0.12 ? 0.04 : 0.09) * (1 - this.strike.t / 0.2);
      ctx.fillStyle = '#b8b0ff';
      ctx.fillRect(0, 0, this.W, CONFIG.groundY);
      ctx.restore();
    }

    // grond
    const c0 = Math.floor(this.camX / 32), c1 = Math.floor((this.camX + this.W) / 32);
    for (let c = c0; c <= c1; c++) {
      const col = this.column(c);
      const g = this.assets.biome(this.worldId, col.biome).ground;
      ctx.drawImage(g.img, col.tile * 32, 0, 32, 48, Math.round(c * 32 - this.camX), CONFIG.groundY - 4, 32, 48);
    }
    // achter-props
    for (const p of this.props) {
      if (p.plane !== 'back') continue;
      const x = p.x - this.camX;
      if (x < -p.spr.w || x > this.W) continue;
      drawSprite(ctx, p.spr, x, p.y);
    }
    // vuurvliegjes/stof achter de personages
    this.drawAmbient(ctx, false);
  }

  /** Voorgrond: bladeren, speed lines. */
  drawFront(ctx) {
    for (const p of this.props) {
      if (p.plane !== 'front') continue;
      const x = p.x - this.camX * 1.35;
      if (x < -p.spr.w || x > this.W) continue;
      drawSprite(ctx, p.spr, x, p.y);
    }
    this.drawAmbient(ctx, true);
    ctx.fillStyle = '#ffffff';
    for (const l of this.speedLines) {
      ctx.globalAlpha = l.a;
      ctx.fillRect(Math.round(l.x), Math.round(l.y), Math.round(l.len), 1);
    }
    ctx.globalAlpha = 1;
  }

  drawAmbient(ctx, front) {
    for (let i = 0; i < this.ambient.length; i++) {
      if ((i % 3 === 0) !== front) continue;
      const m = this.ambient[i];
      const x = Math.round(m.x), y = Math.round(m.y);
      if (m.kind === 'fireflies' || m.kind === 'sparkle' || m.kind === 'aurora' || m.kind === 'static') {
        const blink = 0.5 + 0.5 * Math.sin(m.t * 3 + i);
        ctx.globalAlpha = 0.18 * blink; ctx.fillStyle = m.color; ctx.fillRect(x - 2, y - 2, 5, 5);
        ctx.globalAlpha = 0.5 + 0.5 * blink; ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 1;
      } else if (m.kind === 'rain') {
        ctx.globalAlpha = 0.55; ctx.fillStyle = m.color;
        ctx.fillRect(x, y, 1, 4); ctx.fillRect(x - 1, y + 3, 1, 2);
        ctx.globalAlpha = 1;
      } else if (m.kind === 'embers') {
        const blink = 0.6 + 0.4 * Math.sin(m.t * 9 + i);
        ctx.globalAlpha = blink; ctx.fillStyle = m.color; ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 0.2 * blink; ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.globalAlpha = 1;
      } else if (m.kind === 'blizzard') {
        ctx.globalAlpha = 0.85; ctx.fillStyle = m.color;
        ctx.fillRect(x, y, m.big ? 4 : 3, 1);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = m.color;
        const big = m.big ? 2 : 1;
        ctx.fillRect(x, y, m.kind === 'leaves' ? 2 : big, big);
      }
    }
  }

  /** Noorderlicht: golvende, zacht oplichtende linten aan de hemel. */
  drawAurora(ctx) {
    const t = this.t, sx = this.camX * 0.02;
    const bands = [['#4affb0', 62, 0], ['#3ad8ff', 78, 2.1], ['#b070ff', 52, 4.2]];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const k = this.prevLayers ? this.fade : 1;
    for (const [color, base, ph] of bands) {
      ctx.fillStyle = color;
      for (let x = 0; x < this.W; x += 2) {
        const u = (x + sx) * 0.012;
        const y = base + Math.sin(u + t * 0.25 + ph) * 16 + Math.sin(u * 2.7 + t * 0.4) * 6;
        const h = 18 + Math.sin(u * 1.7 + t * 0.6 + ph) * 10;
        const a = (0.07 + 0.05 * Math.sin(u * 3 + t * 0.9 + ph)) * k;
        if (a <= 0.01) continue;
        ctx.globalAlpha = a * 0.6; ctx.fillRect(x, Math.round(y - h), 2, Math.round(h));
        ctx.globalAlpha = a; ctx.fillRect(x, Math.round(y - h * 0.45), 2, Math.round(h * 0.45));
      }
    }
    ctx.restore();
  }

  drawRays(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.07 * (this.prevLayers ? this.fade : 1);
    ctx.fillStyle = '#f0ffc0';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 150 - this.camX * 0.2) % 600 + 600) % 600 - 60 + Math.sin(this.t * 0.4 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 26, 0); ctx.lineTo(x + 110, 226); ctx.lineTo(x + 60, 226);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
