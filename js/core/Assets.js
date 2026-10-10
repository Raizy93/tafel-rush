// ---------------------------------------------------------------------------
// Assets – laadt assets/atlas.json en alle PNG's die daarin staan.
// Biedt sprite-sheets (met animaties), atlassen (losse sprites) en
// wereld-lagen. Maakt ook "flits"-varianten (wit) voor hit-effecten.
// ---------------------------------------------------------------------------

export class Assets {
  constructor(base = '') {
    this.base = base;
    this.atlas = null;
    this.images = new Map();
    this.flashCache = new Map();
  }

  async load(onProgress = () => {}) {
    const res = await fetch(this.base + 'assets/atlas.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('atlas.json niet gevonden');
    this.atlas = await res.json();
    const srcs = new Set();
    for (const s of Object.values(this.atlas.sheets)) srcs.add(s.src);
    for (const a of Object.values(this.atlas.atlases)) srcs.add(a.src);
    for (const w of Object.values(this.atlas.worlds)) for (const b of Object.values(w.biomes)) {
      for (const [k, v] of Object.entries(b)) srcs.add(k === 'ground' ? v.src : v);
    }
    let done = 0;
    await Promise.all([...srcs].map(src => this.loadImage(src).then(() => onProgress(++done / srcs.size))));
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { this.images.set(src, img); resolve(img); };
      img.onerror = () => reject(new Error('Kon niet laden: ' + src));
      img.src = this.base + src;
    });
  }

  img(src) { return this.images.get(src); }

  /** Sprite sheet: { img, fw, fh, anims, anchor } */
  sheet(id) {
    const s = this.atlas.sheets[id];
    if (!s) throw new Error('Onbekende sheet: ' + id);
    if (!s.img) s.img = this.images.get(s.src);
    return s;
  }

  /** Losse sprite uit een atlas: { img, x, y, w, h } */
  sprite(atlasId, name) {
    const a = this.atlas.atlases[atlasId];
    const r = a.rects[name];
    if (!r) throw new Error(`Onbekende sprite ${atlasId}/${name}`);
    return { img: this.images.get(a.src), ...r };
  }

  biome(world, key) {
    const ck = world + '/' + key;
    this.biomeCache ||= new Map();
    if (this.biomeCache.has(ck)) return this.biomeCache.get(ck);
    const b = this.atlas.worlds[world].biomes[key];
    const out = {
      sky: this.img(b.sky), clouds: this.img(b.clouds), far: this.img(b.far), mid: this.img(b.mid), near: this.img(b.near),
      ground: { img: this.img(b.ground.src), ...b.ground },
    };
    this.biomeCache.set(ck, out);
    return out;
  }

  /** Witte silhouet-versie van een sheet (voor de "hit flash"). */
  flash(id, color = '#ffffff') {
    const key = id + color;
    let c = this.flashCache.get(key);
    if (c) return c;
    const s = this.sheet(id);
    c = document.createElement('canvas');
    c.width = s.img.width; c.height = s.img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(s.img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
    this.flashCache.set(key, c);
    return c;
  }
}
