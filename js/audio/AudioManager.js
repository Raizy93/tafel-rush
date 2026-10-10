// ---------------------------------------------------------------------------
// AudioManager – chiptune-geluidseffecten en muziek, volledig gesynthetiseerd
// met de Web Audio API (geen bestanden, geen rechten-issues, ~0 KB).
//
// • SFX zijn kort en zacht: coin, hit, crit, combo, error, boss …
// • Muziek is een kleine sequencer met lagen die meegroeien met de combo-tier.
// • Alles is uit te zetten (sfx/muziek los). Audio start pas na een
//   gebruikersactie (browser-regel).
// Nieuwe geluiden toevoegen: zie SFX hieronder (naam → functie).
// ---------------------------------------------------------------------------

export class AudioManager {
  constructor({ sfx = true, music = true } = {}) {
    this.sfxOn = sfx;
    this.musicOn = music;
    this.ctx = null;
    this.intensity = 0;
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.lastPlay = new Map();
  }

  /** Moet vanuit een user-gesture aangeroepen worden (klik/toets). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.sfxOn ? 0.55 : 0;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.22 : 0;
      this.musicBus.connect(this.master);
      this.noise = this.makeNoise();
      if (this.pendingTrack) { this.playMusic(this.pendingTrack); this.pendingTrack = null; }
    }
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') this.ctx.resume();
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setSfx(on) {
    this.sfxOn = on;
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.02);
  }
  setMusic(on) {
    this.musicOn = on;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.05);
  }

  // --- bouwstenen -----------------------------------------------------------------
  tone(type, freq, t, dur, vol, opts = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opts.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (opts.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; node.connect(f); node = f; }
    node.connect(g);
    g.connect(opts.bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noiseHit(t, dur, vol, { type = 'bandpass', freq = 1200, q = 1, to, bus } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
  }

  /** Speel een effect. Throttle voorkomt een kakofonie bij snelle reeksen. */
  play(name, opts = {}) {
    if (!this.ctx || !this.sfxOn) return;
    const fn = SFX[name];
    if (!fn) return;
    const now = this.ctx.currentTime;
    const min = opts.throttle ?? 0.03;
    if (now - (this.lastPlay.get(name) || 0) < min) return;
    this.lastPlay.set(name, now);
    fn(this, now + 0.005, opts);
  }

  // --- muziek ---------------------------------------------------------------------
  playMusic(name) {
    if (!this.ctx) { this.pendingTrack = name; return; }
    if (this.track === TRACKS[name]) return;
    this.track = TRACKS[name];
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }
  stopMusic() {
    this.track = null;
    clearInterval(this.timer); this.timer = null;
  }
  setIntensity(level) { this.intensity = level; }

  schedule() {
    if (!this.track || !this.ctx) return;
    const spb = 60 / this.track.bpm / 4; // 16e noten
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.track.play(this, this.step, this.nextTime, this.intensity, spb);
      this.nextTime += spb;
      this.step++;
    }
  }
}

// --- noot-hulp -------------------------------------------------------------------
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

// --- Effecten -----------------------------------------------------------------------
const SFX = {
  coin(a, t) {
    a.tone('square', NOTE(88), t, 0.05, 0.12, { lp: 6000 });
    a.tone('square', NOTE(95), t + 0.05, 0.12, 0.1, { lp: 6000 });
  },
  hit(a, t, o) {
    const p = o.pitch || 1;
    a.noiseHit(t, 0.12, 0.35, { type: 'bandpass', freq: 2400 * p, to: 500, q: 0.8 });
    a.tone('square', 420 * p, t, 0.09, 0.14, { to: 90, lp: 3000 });
  },
  crit(a, t) {
    a.noiseHit(t, 0.16, 0.45, { type: 'bandpass', freq: 3200, to: 400, q: 0.7 });
    a.tone('square', 560, t, 0.1, 0.16, { to: 110, lp: 3500 });
    [84, 88, 91, 96].forEach((n, i) => a.tone('triangle', NOTE(n), t + 0.04 + i * 0.035, 0.12, 0.09));
  },
  swing(a, t) {
    a.noiseHit(t, 0.08, 0.12, { type: 'highpass', freq: 2500, to: 6000, q: 0.5 });
  },
  bow(a, t) {   // pees die losschiet
    a.tone('triangle', 520, t, 0.07, 0.1, { to: 260 });
    a.noiseHit(t, 0.05, 0.06, { type: 'highpass', freq: 4000 });
  },
  zap(a, t) {   // plasma-schot
    a.tone('square', 380, t, 0.09, 0.07, { to: 1400, lp: 4000 });
  },
  clank(a, t) { // treffer op pantser
    a.tone('square', 1250, t, 0.06, 0.06, { to: 900, lp: 6000 });
    a.noiseHit(t, 0.07, 0.18, { type: 'bandpass', freq: 3500, to: 1800, q: 2 });
  },
  combo(a, t, o) {
    const base = 72 + (o.tier || 1) * 2;
    [0, 4, 7, 12, 16].forEach((n, i) => a.tone('square', NOTE(base + n), t + i * 0.045, 0.14, 0.08, { lp: 5000 }));
  },
  error(a, t) {
    a.tone('triangle', 220, t, 0.18, 0.18, { to: 140 });
    a.tone('square', 110, t, 0.14, 0.05, { to: 80, lp: 900 });
  },
  stumble(a, t) {
    a.noiseHit(t, 0.1, 0.15, { type: 'lowpass', freq: 700, to: 200 });
  },
  poof(a, t) {
    a.noiseHit(t, 0.18, 0.18, { type: 'lowpass', freq: 1800, to: 300 });
  },
  chest(a, t) {
    [79, 83, 86, 91].forEach((n, i) => a.tone('square', NOTE(n), t + i * 0.06, 0.12, 0.08, { lp: 5000 }));
  },
  phase(a, t) {
    [67, 71, 74, 79].forEach((n, i) => a.tone('triangle', NOTE(n), t + i * 0.08, 0.3, 0.1));
  },
  bossWarn(a, t) {
    for (let i = 0; i < 3; i++) a.tone('sawtooth', 110, t + i * 0.32, 0.26, 0.12, { to: 82, lp: 900 });
  },
  bossHit(a, t, o) {
    a.noiseHit(t, 0.22, 0.5, { type: 'lowpass', freq: 1400, to: 120 });
    a.tone('sine', o.crit ? 130 : 90, t, 0.22, 0.4, { to: 40 });
    if (o.crit) [86, 91, 95].forEach((n, i) => a.tone('square', NOTE(n), t + 0.03 + i * 0.03, 0.08, 0.06, { lp: 6000 }));
  },
  thunder(a, t) { // verre donder: zacht gerommel (niet schrikken)
    a.noiseHit(t, 1.4, 0.22, { type: 'lowpass', freq: 420, to: 60 });
    a.noiseHit(t + 0.12, 0.9, 0.12, { type: 'lowpass', freq: 900, to: 120 });
  },
  zapBig(a, t) { // bliksemstraal van de Donderdraak
    a.tone('sawtooth', 1400, t, 0.25, 0.08, { to: 120, lp: 5000 });
    a.noiseHit(t, 0.3, 0.3, { type: 'bandpass', freq: 3000, to: 600, q: 0.8 });
    a.tone('square', 90, t + 0.05, 0.25, 0.12, { to: 40, lp: 800 });
  },
  slam(a, t) {
    a.noiseHit(t, 0.35, 0.55, { type: 'lowpass', freq: 600, to: 60 });
    a.tone('sine', 70, t, 0.35, 0.5, { to: 30 });
  },
  bossDown(a, t) {
    for (let i = 0; i < 6; i++) a.noiseHit(t + i * 0.12, 0.3, 0.4, { type: 'lowpass', freq: 900 - i * 100, to: 80 });
    a.tone('sawtooth', 200, t, 1.0, 0.12, { to: 40, lp: 800 });
  },
  victory(a, t) {
    const mel = [72, 76, 79, 84, 79, 84, 88];
    mel.forEach((n, i) => a.tone('square', NOTE(n), t + i * 0.11, i === mel.length - 1 ? 0.6 : 0.12, 0.09, { lp: 5000 }));
    [48, 55, 60].forEach((n, i) => a.tone('triangle', NOTE(n), t + 0.66 + i * 0.01, 0.7, 0.12));
  },
  select(a, t) { a.tone('square', NOTE(84), t, 0.05, 0.07, { lp: 5000 }); },
  confirm(a, t) { a.tone('square', NOTE(79), t, 0.05, 0.08, { lp: 5000 }); a.tone('square', NOTE(86), t + 0.05, 0.1, 0.08, { lp: 5000 }); },
  key(a, t) { a.tone('triangle', NOTE(96), t, 0.025, 0.035); },
  record(a, t) { [76, 79, 83, 88, 91].forEach((n, i) => a.tone('triangle', NOTE(n), t + i * 0.07, 0.2, 0.1)); },
  // --- kisten (petboek) ---
  chestTick(a, t) {
    a.noiseHit(t, 0.05, 0.12, { type: 'bandpass', freq: 1600, q: 2 });
    a.tone('square', NOTE(70 + Math.floor(Math.random() * 3)), t, 0.04, 0.05, { lp: 3000 });
  },
  chestPop(a, t) {
    a.noiseHit(t, 0.35, 0.35, { type: 'lowpass', freq: 3500, to: 300 });
    a.tone('triangle', NOTE(60), t, 0.3, 0.18, { to: NOTE(84) });
  },
  reveal(a, t, o) {
    const r = o.rarity || 'common';
    const mel = { common: [72, 76, 79], rare: [72, 76, 79, 84], epic: [74, 78, 81, 86, 90], legendary: [72, 76, 79, 84, 79, 84, 88, 91, 96] }[r];
    const step = r === 'legendary' ? 0.09 : 0.07;
    mel.forEach((n, i) => a.tone(r === 'common' ? 'triangle' : 'square', NOTE(n), t + i * step, i === mel.length - 1 ? 0.5 : 0.12, 0.08, { lp: 5000 }));
    if (r === 'epic' || r === 'legendary') [48, 55, 60, 64].forEach((n, i) => a.tone('triangle', NOTE(n + (r === 'epic' ? 2 : 0)), t + mel.length * step + i * 0.01, 0.8, 0.1));
    if (r === 'legendary') for (let i = 0; i < 6; i++) a.tone('triangle', NOTE(96 + (i % 3) * 3), t + 0.9 + i * 0.06, 0.1, 0.05);
  },
};

// --- Muziek ---------------------------------------------------------------------------
// Akkoorden als MIDI-grondtonen + type. 16 stappen per maat.
function makeTrack({ bpm, chords, scale, minorish = true, boss = false, bells = false, dark = false }) {
  const lead = boss
    ? [0, -1, 3, -1, 2, -1, 0, -1, 5, -1, 3, -1, 2, 0, -1, -1]
    : [0, -1, 2, -1, 4, -1, 2, 4, 5, -1, 4, -1, 2, -1, 0, -1];
  return {
    bpm,
    play(a, step, t, lvl, spb) {
      const bar = Math.floor(step / 16) % chords.length;
      const s = step % 16;
      const root = chords[bar];
      const third = minorish && (bar % 2 === 0) ? 3 : 4;
      const bus = a.musicBus;
      // bas
      if (s % 4 === 0 || (lvl >= 2 && s % 4 === 2)) a.tone('triangle', NOTE(root - 12), t, spb * 1.8, 0.32, { bus });
      // arpeggio
      const arpStep = lvl >= 2 ? 1 : 2;
      if (s % arpStep === 0) {
        const notes = [0, third, 7, 12, 7, third];
        const n = root + 12 + notes[(s / arpStep) % notes.length] + (lvl >= 4 ? 12 : 0);
        a.tone('square', NOTE(n), t, spb * 0.9, 0.05 + lvl * 0.006, { bus, lp: 1800 + lvl * 700 });
      }
      // drums
      if (s % 8 === 0 || (boss && s % 8 === 6)) {
        a.tone('sine', 150, t, 0.12, 0.45, { bus, to: 45 });
      }
      if (lvl >= 1 && s % 2 === 1) a.noiseHit(t, 0.03, 0.05, { type: 'highpass', freq: 7000, bus });
      if (lvl >= 2 && s % 8 === 4) a.noiseHit(t, 0.12, 0.16, { type: 'bandpass', freq: 1800, q: 0.7, bus });
      // donkere zaagtand-puls (Stormrijk)
      if (dark && s % 2 === 0) a.tone('sawtooth', NOTE(root - 24 + (s % 8 === 6 ? 7 : 0)), t, spb * 0.8, 0.05, { bus, lp: 520 + lvl * 160 });
      // ijsklokjes (Frostpeak): hoge, glinsterende tonen
      if (bells && s % 4 === 2) a.tone('triangle', NOTE(root + 36 + [0, 7, 12, 3][(s >> 2) % 4]), t, spb * 2.5, 0.028, { bus });
      // melodie op hogere intensiteit
      if (lvl >= 3) {
        const li = lead[s];
        if (li >= 0) a.tone('square', NOTE(root + 24 + scale[li % scale.length]), t, spb * 1.6, 0.045, { bus, lp: 3200, detune: 6 });
      }
    },
  };
}

const TRACKS = {
  run: makeTrack({ bpm: 132, chords: [57, 53, 60, 55], scale: [0, 2, 3, 5, 7, 8, 10] }),
  boss: makeTrack({ bpm: 148, chords: [50, 46, 43, 45], scale: [0, 2, 3, 5, 7, 8, 10], boss: true }),
  frost: makeTrack({ bpm: 126, chords: [62, 58, 55, 57], scale: [0, 2, 3, 5, 7, 8, 10], bells: true }),
  frostBoss: makeTrack({ bpm: 150, chords: [50, 46, 48, 45], scale: [0, 2, 3, 5, 7, 8, 10], boss: true, bells: true }),
  storm: makeTrack({ bpm: 138, chords: [52, 48, 50, 47], scale: [0, 2, 3, 5, 7, 8, 11], dark: true }),
  stormBoss: makeTrack({ bpm: 156, chords: [45, 41, 43, 40], scale: [0, 1, 3, 5, 7, 8, 10], boss: true, dark: true }),
  menu: makeTrack({ bpm: 104, chords: [60, 57, 53, 55], scale: [0, 2, 4, 5, 7, 9, 11], minorish: false }),
};
