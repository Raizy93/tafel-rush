// ---------------------------------------------------------------------------
// Game – centrale coördinator: scenes, game-loop, gedeelde systemen.
//
//   Game
//    ├─ renderer, assets, font, ui, input, audio
//    ├─ profile (ProfileService)  → trainer (AdaptiveTrainer)
//    ├─ world, particles, effects (gedeeld tussen scenes)
//    └─ scene: TitleScene | RunScene | ResultsScene | EquipmentScene | TafelkaartScene | PetboekScene
//
// De loop gebruikt requestAnimationFrame met een begrensde dt. Input komt
// via events binnen en wordt direct naar de actieve scene gestuurd.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import { Particles, Effects } from './Particles.js';
import { PixelFont } from '../ui/PixelFont.js';
import { UI } from '../ui/UI.js';
import { World } from '../world/World.js';
import { AdaptiveTrainer } from '../training/AdaptiveTrainer.js';
import { TitleScene } from '../scenes/TitleScene.js';
import { RunScene } from '../scenes/RunScene.js';
import { ResultsScene } from '../scenes/ResultsScene.js';
import { EquipmentScene } from '../scenes/EquipmentScene.js';
import { TafelkaartScene } from '../scenes/TafelkaartScene.js';
import { PetboekScene } from '../scenes/PetboekScene.js';
import { UitlegScene } from '../scenes/UitlegScene.js';
import { Tips } from '../systems/Tips.js';

export class Game {
  constructor({ canvas, assets, profile, audio }) {
    this.canvas = canvas;
    this.assets = assets;
    this.profile = profile;
    this.audio = audio;
    this.renderer = new Renderer(canvas);
    this.font = new PixelFont();
    this.ui = new UI(this);
    this.input = new Input(this, canvas);
    this.trainer = new AdaptiveTrainer(profile.masteryStore);
    this.particles = new Particles(CONFIG.perf.maxParticles);
    this.effects = new Effects(assets);
    this.world = new World(assets, 'greenwood', 'edge');
    this.world.onThunder = () => this.audio.play('thunder', { throttle: 1 });
    this.scene = null;
    this.tips = new Tips(this); // korte tips op het juiste moment (nooit tijdens het rekenen)
    this.time = 0;
    this.dt = 0;
    this.quality = 1;
    this.frameTimes = [];
    this.workTimes = [];
    this.debug = /[?&]debug/.test(location.search);
    this.fps = 60;

    window.addEventListener('blur', () => this.scene && this.scene.onBlur && this.scene.onBlur());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.scene && this.scene.onBlur && this.scene.onBlur(); this.profile.flush(); }
    });
    window.addEventListener('pagehide', () => this.profile.flush());
    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
    // telefoon rechtop gedraaid: run pauzeren (het "draai je telefoon"-scherm staat dan voor de game)
    if (typeof matchMedia === 'function') {
      const portrait = matchMedia('(orientation: portrait) and (pointer: coarse)');
      const onTurn = () => { if (portrait.matches) { this.scene && this.scene.onBlur && this.scene.onBlur(); this.profile.flush(); } };
      portrait.addEventListener ? portrait.addEventListener('change', onTurn) : portrait.addListener(onTurn);
    }
  }

  start() {
    this.setScene(new TitleScene(this));
    this.last = performance.now();
    const loop = now => {
      // eerst de volgende frame aanvragen: één fout in een frame mag de game niet stilzetten
      requestAnimationFrame(loop);
      try { this.frame(now); } catch (e) { if (!this.lastFrameError) console.error(e); this.lastFrameError = e; }
    };
    requestAnimationFrame(loop);
    this.input.focus();
  }

  setScene(scene) {
    this.scene && this.scene.exit && this.scene.exit();
    this.scene = scene;
    this.tips.reset();
    scene.enter && scene.enter();
  }

  // --- navigatie ---------------------------------------------------------------------
  startRun(opts) { this.setScene(new RunScene(this, opts)); }
  goToTitle() { this.setScene(new TitleScene(this)); }
  showResults(data) { this.setScene(new ResultsScene(this, data)); }
  openEquipment(tab) { this.setScene(new EquipmentScene(this, tab)); }
  openMap() { this.setScene(new TafelkaartScene(this)); }
  openBook(tab) { this.setScene(new PetboekScene(this, tab)); }
  /** Uitleg openen bij een hoofdstuk; back = waar "terug" naartoe gaat. */
  openHelp(chapter, back) { this.setScene(new UitlegScene(this, chapter, back)); }
  /** Mag de huidige scene nu een tip tonen? */
  get tipsAllowed() { return !!(this.scene && this.scene.tipsAllowed && this.scene.tipsAllowed()); }
  runOptions(mode, tables, world) { return TitleScene.runOptions(this, mode, tables, world); }

  // --- input-dispatch ------------------------------------------------------------------
  dispatchKey(action) {
    this.audio.unlock();
    if (action.type === 'fullscreen') { this.toggleFullscreen(); return; }
    if (this.tips.active && this.tips.onKey(action)) return;
    this.scene && this.scene.onKey && this.scene.onKey(action);
  }
  dispatchPointer(kind, x, y, e) {
    if (this.tips.active && this.tips.onPointer(kind)) return;
    this.scene && this.scene.onPointer && this.scene.onPointer(kind, x, y, e);
  }

  toggleSound(kind) {
    if (kind === 'sfx') this.audio.setSfx(!this.audio.sfxOn);
    else this.audio.setMusic(!this.audio.musicOn);
    this.profile.updateSettings({ sfx: this.audio.sfxOn, music: this.audio.musicOn });
    this.audio.play('select');
  }
  // --- volledig scherm (knop rechtsboven of toets F) ------------------------------------
  get fullscreenSupported() { const d = document; return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled); }
  get isFullscreen() { const d = document; return !!(d.fullscreenElement || d.webkitFullscreenElement); }
  /** Geopend als web-app vanaf het beginscherm (dan is hij al schermvullend). */
  get isStandalone() {
    const mm = q => typeof matchMedia === 'function' && matchMedia(q).matches;
    return mm('(display-mode: fullscreen)') || mm('(display-mode: standalone)') || navigator.standalone === true;
  }
  /** Moet vanuit een klik of toets komen (eis van de browser). In een iframe
   *  zonder allow="fullscreen" kan het niet: dan verschijnt er een korte melding.
   *  Esc: de browser sluit volledig scherm altijd met Esc (veiligheidsregel).
   *  In Chrome/Edge/Chromebook "lenen" we Esc met de Keyboard Lock API: dan is
   *  Esc gewoon pauze, en verlaat je volledig scherm door Esc ingedrukt te houden.
   *  Andere browsers: zie onFullscreenChange (de run pauzeert dan mee). */
  toggleFullscreen() {
    const d = document, el = d.documentElement;
    const fail = () => { this.fullscreenMsg = 2.2; };
    try {
      if (this.isFullscreen) { this.leavingFullscreen = true; this.unlockEscape(); (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
      else if (this.fullscreenSupported) {
        const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
        if (p && p.then) p.then(() => this.lockEscape(), fail); else this.lockEscape();
        // sommige omgevingen (ingebouwde browsers) reageren helemaal niet: dan na 1,2 s toch een melding
        setTimeout(() => { if (!this.isFullscreen) fail(); }, 1200);
      } else fail();
    } catch (e) { fail(); }
    this.audio.play('select');
    this.input.focus();
  }
  /** Esc voor de game houden (alleen in volledig scherm, alleen Chromium-browsers). */
  lockEscape() {
    const kb = navigator.keyboard;
    if (kb && kb.lock) kb.lock(['Escape']).then(() => { this.escLocked = true; }, () => { this.escLocked = false; });
  }
  unlockEscape() {
    const kb = navigator.keyboard;
    if (kb && kb.unlock) kb.unlock();
    this.escLocked = false;
  }
  /** Volledig scherm veranderd (ook als de browser het zelf sloot, bijv. met Esc). */
  onFullscreenChange() {
    if (this.isFullscreen) return;
    this.unlockEscape();
    if (this.leavingFullscreen) { this.leavingFullscreen = false; return; } // zelf via knop/F: niet pauzeren
    // Esc sloot het volledige scherm tijdens een run: dan ook pauzeren, zodat die
    // ene druk op Esc niet "kwijt" is (in browsers zonder Keyboard Lock).
    const s = this.scene;
    if (s && s.state === 'play' && s.pause) s.pause('paused');
  }

  /** Teken de knop (icoon) en geef de klik-rechthoek terug (null = geen knop nodig). */
  drawFullscreenButton(ctx, x, y) {
    if (this.isStandalone) return null;
    const on = this.isFullscreen;
    this.ui.icon(ctx, on ? 'fullscreen_exit' : 'fullscreen', x, y, this.fullscreenSupported ? 1 : 0.35);
    return { x: x - 2, y: y - 2, w: 15, h: 15 };
  }

  toggleAllSound() {
    const on = !(this.audio.sfxOn || this.audio.musicOn);
    this.audio.setSfx(on);
    this.audio.setMusic(on);
    this.profile.updateSettings({ sfx: on, music: on });
  }

  // --- loop ---------------------------------------------------------------------------
  frame(now) {
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05; // na tab-wissel of hapering geen grote sprongen
    if (dt < 0) dt = 0;       // eerste rAF-tijdstempel kan vóór performance.now() liggen
    this.dt = dt;
    this.time += dt;
    this.trackPerformance(dt);

    const t0 = performance.now();
    const ctx = this.renderer.ctx;
    this.scene.update(dt);
    this.scene.draw(ctx);
    if (this.tipsAllowed || this.tips.active) { this.tips.update(dt); this.tips.draw(ctx); }
    if (this.fullscreenMsg > 0) {
      this.fullscreenMsg -= dt;
      const msg = this.input.touchDevice ? 'TIP: ZET TAFEL RUSH OP JE BEGINSCHERM' : 'VOLLEDIG SCHERM KAN HIER NIET (PROBEER F11)', mw = this.font.measure(msg), k = Math.min(1, this.fullscreenMsg * 2);
      const my = this.scene && this.scene.hud ? 48 : 24; // in de run onder de knoppenrij
      ctx.save(); ctx.globalAlpha = 0.85 * k; ctx.fillStyle = '#1a1324'; ctx.fillRect(CONFIG.width - mw - 10, my - 3, mw + 8, 13); ctx.restore();
      this.ui.text(ctx, msg, CONFIG.width - 6, my, { align: 'right', color: '#ffb0a0', alpha: k });
    }
    if (this.debug) this.drawDebug(ctx);
    this.renderer.present();
    this.workTimes.push(performance.now() - t0);
  }

  /**
   * Automatisch degraderen bij een trage framerate (minder particles/props).
   * Alleen als ons eigen werk per frame ook fors is: als de browser zelf op
   * 30 Hz draait (energiebesparing) helpt minder effecten namelijk niets.
   */
  trackPerformance(dt) {
    const ft = this.frameTimes;
    ft.push(dt * 1000);
    if (ft.length < 90) return;
    const avg = ft.reduce((a, b) => a + b, 0) / ft.length;
    const work = this.workTimes.length ? this.workTimes.reduce((a, b) => a + b, 0) / this.workTimes.length : 0;
    ft.length = 0;
    this.workTimes.length = 0;
    this.fps = Math.round(1000 / avg);
    this.workMs = work;
    if (avg > CONFIG.perf.degradeFrameMs && work > 6 && this.quality > 0.5) {
      this.quality = 0.5;
      this.particles.max = CONFIG.perf.lowMaxParticles;
      this.world.quality = 0.6;
    } else if (avg < 18 && this.quality < 1) {
      this.quality = 1;
      this.particles.max = CONFIG.perf.maxParticles;
      this.world.quality = 1;
    }
  }

  drawDebug(ctx) {
    const s = this.scene;
    const lat = s && s.stats ? s.stats.latencies : [];
    const avgLat = lat.length ? (lat.reduce((a, b) => a + b, 0) / lat.length).toFixed(1) : '-';
    const lines = [`FPS ${this.fps}  WERK ${(this.workMs || 0).toFixed(1)} MS  Q ${this.quality}`, `PARTICLES ${this.particles.count}`, `ENTER-NIEUWE SOM ${avgLat} MS`];
    if (s && s.engine && s.engine.current) {
      const k = s.engine.current.key;
      lines.push(`SOM ${k.replace('x', '×')}  M ${this.trainer.mastery(k).toFixed(2)}  NEED ${this.trainer.need(k).toFixed(2)}`);
    }
    // schermmaten (om problemen op telefoons te kunnen zien: open de game met ?debug)
    const vv = window.visualViewport, st = document.getElementById('stage'), sr = st ? st.getBoundingClientRect() : null, cr = this.canvas.getBoundingClientRect();
    lines.unshift('VENSTER ' + innerWidth + 'X' + innerHeight + (vv ? '  ZICHTBAAR ' + Math.round(vv.width) + 'X' + Math.round(vv.height) + ' +' + Math.round(vv.offsetTop) : '') + (sr ? '  STAGE ' + Math.round(sr.top) + '/' + Math.round(sr.height) : '') + '  GAME ' + Math.round(cr.top) + '/' + Math.round(cr.height));
    lines.forEach((l, i) => this.font.draw(ctx, l, 4, 190 + i * 10, { color: '#7dff8a' }));
  }
}
