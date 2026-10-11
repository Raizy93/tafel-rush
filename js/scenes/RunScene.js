// ---------------------------------------------------------------------------
// RunScene – één run door een wereld (Greenwood, Frostpeak …; opts.world).
//
// Kernprincipe: DE TAFELS ZIJN DE GAME.
//   • Enter verwerkt het antwoord synchroon in de keydown-handler; de volgende
//     som staat er in dezelfde/volgende frame (geen modals, geen wachttijd).
//   • Goed  → aanval (slash/pijl/plasma), 1 hit op de vijand (vijanden kunnen
//             1-3 HP hebben), coins, combo, sneller rennen. Schade wordt direct
//             logisch toegepast; het effect slaat even later in. De volgende som
//             wacht NOOIT op een animatie.
//   • Fout  → combo weg, struikel-animatie, juiste antwoord ~1 s zichtbaar,
//             dan direct de volgende som.
//   • Voortgang → fases (bioom-wissels) → bossfight → resultaten.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { WORLDS } from '../data/worlds.js';
import { World } from '../world/World.js';
import { Player, PLAYER_SCREEN_X } from '../entities/Player.js';
import { EnemyManager } from '../entities/EnemyManager.js';
import { Boss } from '../entities/Boss.js';
import { Pet } from '../entities/Pet.js';
import { ComboSystem } from '../systems/ComboSystem.js';
import { Progression } from '../systems/Progression.js';
import { SessionStats } from '../training/SessionStats.js';
import { QuestionEngine } from '../training/QuestionEngine.js';
import { QuestionPanel } from '../ui/QuestionPanel.js';
import { HUD } from '../ui/HUD.js';
import { COLORS } from '../ui/UI.js';
import { fmtSec, rand } from '../core/util.js';
import { Equipment } from '../systems/Equipment.js';
import { POWERUPS } from '../data/weapons.js';
import { Chests } from '../systems/Chests.js';
import { Worlds } from '../systems/Worlds.js';

const TIER_LABEL = { perfect: 'PERFECT!', fast: 'SNEL!', good: 'GOED!', slow: 'GOED' };
const TIER_COLOR = { perfect: COLORS.gold, fast: ['#e0ffff', '#4fd0ff'], good: ['#d0ffd8', '#5fd65a'], slow: '#c8c0e8' };
const TIER_BANNER = [null, { icon: 'fire' }, { icon: 'blue', colors: ['#e0ffff', '#4fd0ff'] }, { icon: 'fire', colors: ['#ffe66a', '#ff6a1e'] }, { icon: 'ultra', colors: ['#ffe0ff', '#c040ff'] }];

export class RunScene {
  /**
   * @param game
   * @param {object} opts { mode, tables, pool, successPool, label }
   */
  constructor(game, opts) {
    this.game = game;
    this.opts = opts;
    this.worldDef = WORLDS[opts.world] || WORLDS.greenwood;
  }

  enter() {
    const g = this.game;
    this.world = g.world;
    this.world.setWorld(this.worldDef.id);
    // loadout = gekozen held + uitgerust wapen (perks) + power-ups
    this.loadout = Equipment.loadout(g.profile);
    this.player = new Player(g, this.loadout);
    this.shieldCharges = this.loadout.powerups.comboShield ? POWERUPS.comboShield.charges : 0;
    // cosmetische companion (als die gekocht en gekozen is)
    this.pet = this.loadout.pet ? new Pet(g, this.loadout.pet, this.player.x) : null;
    this.enemies = new EnemyManager(g);
    this.enemies.reset(0);
    this.enemies.setEnemyPool(this.worldDef.biomes[this.worldDef.phases[0].biome].enemies);
    this.combo = new ComboSystem();
    this.progression = new Progression({ ...CONFIG.run, phases: this.worldDef.phases });
    this.stats = new SessionStats();
    this.hud = new HUD(g);
    this.panel = new QuestionPanel(g);
    this.engine = new QuestionEngine({ trainer: g.trainer, pool: this.opts.pool, mode: this.opts.mode, tables: this.opts.tables, successPool: this.opts.successPool });
    this.boss = null;
    this.bossPhase = null;     // null | 'approach' | 'fight' | 'victory'
    this.bossWait = 0;
    this.freeze = 0;           // hitstop
    this.flash = 0;            // wit scherm-flits
    this.lockUntil = 0;        // na fout: tot wanneer de som "op slot" is
    this.wrongPending = false;
    this.pausedAccum = 0;
    this.pauseStart = 0;
    this.endT = 0;
    this.camX = -PLAYER_SCREEN_X;
    this.enterAt = 0;          // latentie-meting Enter → nieuwe som
    g.particles.clear();
    g.effects.clear();
    g.audio.playMusic(this.worldDef.music);
    g.audio.setIntensity(0);
    g.profile.noteRunStarted();
    this.state = g.profile.settings.tutorialSeen ? 'play' : 'tutorial';
    if (this.state === 'play') this.startRun();
  }

  startRun() {
    this.state = 'play';
    this.player.running = true;
    this.hud.banner('GO!', { colors: ['#d0ffd8', '#5fd65a'], dur: 0.8 });
    this.nextQuestion();
    this.runStart = performance.now();
  }

  nextQuestion() {
    const q = this.engine.next();
    this.panel.setQuestion(q);
    this.qStart = performance.now();
    this.pausedAccum = 0;
    this.wrongPending = false;
  }

  // --- input -----------------------------------------------------------------------
  onKey(a) {
    const g = this.game;
    if (a.type === 'mute') { g.toggleAllSound(); return; }
    switch (this.state) {
      case 'tutorial':
        if (a.type === 'enter' || a.type === 'space') { g.profile.updateSettings({ tutorialSeen: true }); g.audio.play('confirm'); this.startRun(); }
        else if (a.type === 'back') g.goToTitle();
        return;
      case 'paused':
        if (a.type === 'enter' || a.type === 'space' || a.type === 'pause') this.resume();
        else if (a.type === 'back') this.finishRun(false);
        return;
      case 'focuslost':
        if (a.type === 'back') this.finishRun(false); else this.resume();
        return;
      case 'ending':
        return;
    }
    // --- spelen ---
    if (a.type === 'pause') { this.pause('paused'); return; }
    const locked = this.wrongPending || this.bossPhase === 'victory';
    if (a.type === 'digit') {
      if (locked) return;
      if (this.panel.input.length < CONFIG.answer.maxDigits) {
        if (this.panel.input === '0') this.panel.input = '';
        this.panel.input += a.value;
      }
    } else if (a.type === 'backspace') {
      if (!locked) this.panel.input = this.panel.input.slice(0, -1);
    } else if (a.type === 'enter') {
      if (locked || this.panel.input === '') return;
      this.submit(a.time || performance.now());
    }
  }

  onPointer(kind, x, y) {
    if (kind !== 'down') return;
    const hit = r => r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    const pausedNow = this.state === 'paused' || this.state === 'focuslost';
    if (pausedNow && hit(this.stopRect)) { this.finishRun(false); return; }
    if (pausedNow && hit(this.resumeRect)) { this.resume(); return; }
    if (this.state === 'focuslost' || this.state === 'paused') { this.resume(); return; }
    if (this.state === 'play' && hit(this.pauseRect)) { this.pause('paused'); return; }
    // on-screen cijferbalk (touch)
    for (const k of this.keypadRects || []) {
      if (x >= k.x && y >= k.y && x < k.x + k.w && y < k.y + k.h) {
        this.keyFlash = k; this.keyFlashT = 0.1;
        this.onKey(k.action === 'enter' ? { type: 'enter', time: performance.now() } : k.action === 'backspace' ? { type: 'backspace' } : { type: 'digit', value: k.action });
        return;
      }
    }
    if (this.state === 'tutorial' && hit(this.tutBackRect)) { this.game.audio.play('select'); this.game.goToTitle(); return; }
    if (this.state === 'tutorial') { this.game.profile.updateSettings({ tutorialSeen: true }); this.startRun(); return; }
    for (const r of this.hud.soundRects || []) {
      if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) { this.game.toggleSound(r.kind); return; }
    }
    const f = this.hud.fsRect;
    if (f && x >= f.x && y >= f.y && x < f.x + f.w && y < f.y + f.h) this.game.toggleFullscreen();
  }

  onBlur() { if (this.state === 'play') this.pause('focuslost'); }

  pause(kind) {
    this.state = kind;
    this.pauseStart = performance.now();
  }
  resume() {
    if (this.state !== 'paused' && this.state !== 'focuslost') return;
    this.pausedAccum += performance.now() - this.pauseStart;
    if (this.wrongPending) this.lockUntil += performance.now() - this.pauseStart;
    this.state = 'play';
  }

  // --- antwoorden --------------------------------------------------------------------
  submit(now) {
    const g = this.game;
    const rt = Math.max(0, now - this.qStart - this.pausedAccum);
    const given = parseInt(this.panel.input, 10);
    const res = this.engine.submit(given, rt);
    this.stats.add(res);
    g.profile.noteAnswer(res.correct, res.tier);
    this.enterAt = now;
    if (res.correct) {
      this.onCorrect(res);
      this.nextQuestion(); // DIRECT de volgende som
    } else {
      this.onWrong(res);
      this.wrongPending = true;
      this.lockUntil = now + CONFIG.answer.wrongFeedbackMs;
    }
  }

  onCorrect(res) {
    const g = this.game;
    const tier = res.tier;
    const c = this.combo.hit();
    this.stats.bestCombo = this.combo.best;
    const ct = this.combo.tier;
    const kind = ct >= 4 ? 'ultra' : tier === 'perfect' ? 'crit' : ct >= 3 ? 'fire' : 'normal';

    // feedback bij de som
    this.panel.flashCorrect(tier);
    const pr = this.panel.rect || { x: 115, y: 52, w: 250, h: 50 };
    this.hud.popup(TIER_LABEL[tier], pr.x + pr.w - 34, pr.y + pr.h + 2, { color: TIER_COLOR[tier], font: tier === 'perfect' ? 'big' : 'small', life: 0.6, vy: -22 });
    this.hud.popup(fmtSec(res.rtMs), pr.x + 26, pr.y + pr.h + 3, { color: '#a8a0c8', life: 0.5, vy: -10 });

    // coins
    const C = CONFIG.coins;
    const coins = (C.perCorrect + (tier === 'perfect' ? C.perfectBonus : 0)) * this.combo.coinMult;
    let bonus = 0; // combo-bonussen regenen apart naar de teller

    // combo-mijlpalen
    if (c.tierUp) {
      const def = CONFIG.combo.tiers[c.tierUp];
      const b = TIER_BANNER[c.tierUp];
      this.hud.banner(def.label, { colors: b.colors || COLORS.gold, icon: b.icon, dur: 1.3 });
      g.audio.play('combo', { tier: c.tierUp });
      if (this.pet) this.pet.cheer(1.2);
      bonus += C.tierUpBonus[c.tierUp];
      if (c.tierUp >= 3) g.renderer.shake(2.5, 0.3);
      g.audio.setIntensity(c.tierUp);
    } else if (c.milestone) {
      this.hud.banner('COMBO ×' + c.milestone, { colors: ['#ffe0ff', '#c040ff'], icon: 'ultra', dur: 1.1 });
      g.audio.play('combo', { tier: 4 });
      if (this.pet) this.pet.cheer(1.2);
      bonus += 10;
    } else if (c.count >= 3) this.hud.comboPulse = 0.12;
    this.stats.coins += coins + bonus;
    this.coinShower(bonus);

    // voortgang
    if (!this.bossPhase) this.handleProgress(this.progression.onCorrect(tier, ct));

    // actie in de wereld: schade LOGISCH direct, visueel bij de inslag
    const target = this.pickTarget();
    const damage = this.player.getAttackDamage(tier, ct, target === this.boss ? 'boss' : 'enemy');
    const from = this.player.attackOrigin();
    const near = !!target && target.cx - this.player.x < 75;
    this.player.attack(kind, near && this.player.attackDef.melee);
    if (tier === 'perfect') g.particles.burst(this.player.x + 10, this.player.y - 22, { count: Math.round(8 * g.quality), colors: ['#fff1a0', '#ffffff'], speed: 70, g: 0, life: 0.4, drag: 3 });

    if (target) {
      const result = target.takeDamage(damage);
      this.enemies.launchAttack(from, target, this.player.attackDef, kind, () => this.onImpact(target, result, kind, coins));
      this.tryPierce(target, tier, ct, kind);
    } else {
      // geen doelwit (zeldzaam): aanval in de lucht, coins komen van de speler
      this.spawnCoins(this.player.x - this.camX + 10, this.player.y - 24, coins);
    }
  }

  /**
   * Power-up DOORBOORDER: vanaf ON FIRE raakt de aanval ook de volgende vijand.
   * Werkt nooit op de boss. Geen extra coins (coins blijven per goed antwoord).
   */
  tryPierce(target, tier, ct, kind) {
    const P = POWERUPS.pierce;
    if (!this.loadout.powerups.pierce || ct < P.minComboTier || target === this.boss) return;
    const next = this.enemies.nextAfter(target);
    if (!next || next.x - this.camX > CONFIG.width + 10) return;
    const result = next.takeDamage(this.player.getAttackDamage(tier, ct, 'enemy'));
    const from = { x: target.cx, y: target.cy };
    this.enemies.launchAttack(from, next, this.player.attackDef, kind, () => {
      this.hud.popup('DOORBOORD!', next.cx - this.camX, next.cy - 30, { color: '#ffb0ff', life: 0.5, vy: -20 });
      this.onImpact(next, result, kind, 0);
    }, { delay: 0.08, silent: true });
  }

  /**
   * Een aanval slaat in. target = Enemy of Boss (zelfde API: showHit, cx, cy).
   * result = uitkomst van target.takeDamage() (al bij het antwoord berekend).
   */
  onImpact(target, result, kind, coins) {
    const g = this.game, C = CONFIG.coins;
    const sx = target.cx - this.camX, sy = target.cy;
    if (result.crit) this.hud.popup('CRITICAL!', sx, sy - 22, { color: COLORS.gold, life: 0.55, vy: -26 });

    if (target === this.boss) {
      const killed = this.boss.showHit(result);
      g.effects.play('spark', result.crit ? 'gold' : 'white', target.cx + rand(-10, 10), target.cy + rand(-20, 10));
      g.particles.burst(target.cx, target.cy, { count: Math.round((result.crit ? 18 : 10) * g.quality), colors: this.boss.def.colors, speed: 130, g: 300, life: 0.6, size: [1, 3], ground: CONFIG.groundY });
      this.hud.popup('-' + result.applied, sx + rand(-14, 14), sy - 8, { color: '#ffffff', font: 'big', life: 0.7, vy: -30 });
      g.audio.play('bossHit', { crit: result.crit, throttle: 0.04 });
      g.renderer.shake(result.crit ? 3 : 1.5, 0.15);
      if (result.crit) this.freeze = 0.05;
      this.spawnCoins(sx, sy, coins);
      if (killed) this.victory();
      return;
    }

    const p = this.enemies.hitFx(target, result, kind) || { x: target.cx, y: target.cy, killed: false };
    if (target.maxHp > 1 && result.applied > 0) this.hud.popup('-' + result.applied, sx + 6, sy - 14, { color: result.killed ? '#ffffff' : '#ffb0a0', life: 0.5, vy: -24 });
    if (p.killed && (kind !== 'normal' || target.maxHp > 1)) { g.renderer.shake(kind === 'ultra' ? 2.5 : 1.5, 0.15); this.freeze = 0.03; }
    let total = coins;
    if (p.killed && target.type.chest) { total += C.chestBonus; this.stats.coins += C.chestBonus; this.hud.popup('+' + C.chestBonus, sx, sy - 20, { color: COLORS.gold, font: 'big' }); }
    if (total > 0) this.spawnCoins(sx, sy, total);
  }

  pickTarget() {
    if (this.boss && this.boss.targetable && this.boss.x - this.camX < CONFIG.width - 30) {
      // eerst eventuele resterende vijanden, dan de boss
      const e = this.enemies.front(this.player.x);
      if (e && e.x < this.boss.x) return e;
      return this.boss;
    }
    return this.enemies.front(this.player.x);
  }

  onWrong(res) {
    const g = this.game;
    // Power-up COMBOSCHILD: 1× per run blijft de combo staan (de fout telt wél gewoon mee)
    if (this.shieldCharges > 0 && this.combo.count > 0) {
      this.shieldCharges--;
      this.hud.banner('SCHILD!', { colors: ['#e0f4ff', '#4fb0ff'], sub: 'JE COMBO BLIJFT STAAN', dur: 1.2, y: 128 });
      g.particles.burst(this.player.x + 4, this.player.y - 20, { count: Math.round(16 * g.quality), colors: ['#4fb0ff', '#b4ecff', '#ffffff'], speed: 110, g: 120, life: 0.6 });
      g.audio.play('clank');
    } else {
      const lost = this.combo.break();
      this.hud.comboBroken(lost);
      g.audio.setIntensity(0);
    }
    this.panel.showWrong(res.answer);
    g.audio.play('error');
    if (this.boss && this.boss.alive && this.boss.ready) {
      this.boss.counter(() => { this.player.hit(); g.audio.play('stumble'); g.renderer.shake(2, 0.15); }, this.player.x + 6);
    } else {
      this.player.hit();
      g.audio.play('stumble');
      g.renderer.shake(1.5, 0.15);
      const e = this.enemies.blocker(this.player.x);
      if (e && e.x - this.player.x < 110) e.attack();
    }
  }

  victory() {
    const g = this.game;
    this.bossPhase = 'victory';
    this.freeze = 0.18;
    this.flash = 0.5;
    g.renderer.shake(6, 0.9);
    g.audio.play('bossDown');
    g.audio.stopMusic();
    const bonus = CONFIG.coins.bossBonus;
    this.stats.coins += bonus;
    setTimeout(() => {
      if (this.game.scene !== this) return;
      this.hud.banner('OVERWINNING!', { colors: COLORS.gold, sub: this.boss.def.name + ' IS VERSLAGEN', dur: 2.6, y: 120, icon: 'fire' });
      g.audio.play('victory');
      this.player.victory();
      if (this.pet) this.pet.cheer(10);
      this.coinShower(bonus);
    }, 900);
    this.endT = 3.6;
    this.state = 'ending';
  }

  handleProgress(r) {
    if (!r) return;
    const g = this.game;
    if (r.phaseChanged) {
      const ph = r.phaseChanged;
      this.world.setBiome(ph.biome);
      this.enemies.setEnemyPool(this.worldDef.biomes[ph.biome].enemies);
      this.hud.banner(ph.name, { colors: ['#ffffff', '#c8f0ff'], sub: this.worldDef.name, dur: 1.6, y: 128 });
      g.audio.play('phase');
    }
    if (r.bossReady) {
      this.bossPhase = 'approach';
      this.enemies.spawning = false;
      this.bossWait = 0;
      this.hud.banner('!! BOSS !!', { colors: ['#ffd0c0', '#ff3a3a'], sub: 'BLIJF REKENEN!', dur: 1.8, y: 128 });
      g.audio.play('bossWarn');
    }
  }

  // --- munten --------------------------------------------------------------------------
  spawnCoins(sx, sy, value) {
    const n = Math.max(1, Math.min(6, value));
    const per = Math.floor(value / n);
    let rest = value - per * n;
    for (let i = 0; i < n; i++) {
      const v = per + (rest-- > 0 ? 1 : 0);
      this.hud.flyCoin(sx + rand(-6, 6), sy + rand(-6, 6), v, i * 0.04);
    }
  }
  coinShower(value) {
    if (!value) return;
    const n = Math.min(10, value);
    const per = Math.floor(value / n);
    let rest = value - per * n;
    for (let i = 0; i < n; i++) this.hud.flyCoin(rand(140, 360), rand(130, 200), per + (rest-- > 0 ? 1 : 0), i * 0.05);
  }

  // --- update ------------------------------------------------------------------------
  update(dt) {
    const g = this.game;
    const now = performance.now();
    this.hud.update(dt);
    this.panel.update(dt);
    if (this.flash > 0) this.flash -= dt;
    if (this.state === 'paused' || this.state === 'focuslost') return;

    // na een fout: na de feedbacktijd direct de volgende som
    if (this.wrongPending && now >= this.lockUntil && this.state === 'play') this.nextQuestion();

    if (this.state === 'play' && !this.bossPhase) this.handleProgress(this.progression.tick(dt));
    if (this.state === 'play') this.stats.activeMs += dt * 1000;

    if (this.freeze > 0) { this.freeze -= dt; return; }

    // boss-flow
    if (this.bossPhase === 'approach') {
      this.bossWait += dt;
      if ((this.enemies.aliveCount === 0 || this.bossWait > 4) && !this.boss) {
        for (const e of this.enemies.list) if (e.alive) { e.health.hp = 0; this.enemies.kill(e); }
        const sx = this.camX + CONFIG.width + 70;
        this.boss = new Boss(g, this.worldDef.boss, sx, sx - 110);
        this.bossPhase = 'fight';
        g.audio.playMusic(this.worldDef.bossMusic);
      }
    }

    // speler: stoppen voor de eerstvolgende vijand of de boss
    const blocker = this.enemies.blocker(this.player.x);
    let blockX = blocker ? blocker.x - CONFIG.speed.engageDistance : Infinity;
    if (this.boss && this.boss.state !== 'dead') blockX = Math.min(blockX, this.boss.x - 150);
    if (this.state === 'tutorial') blockX = this.player.x; // wachten
    this.player.blockX = blockX;
    this.player.comboTier = this.combo.tier;
    this.player.update(dt);
    if (this.pet) this.pet.update(dt, this.player);
    this.camX = this.player.x - PLAYER_SCREEN_X;

    this.world.update(dt, this.camX, this.player.speedLevel);
    this.enemies.progress = this.progression.progress;
    this.enemies.update(dt, this.player.x, this.camX, this.player.speed);
    if (this.boss) this.boss.update(dt);
    g.effects.update(dt);
    g.particles.update(dt);

    if (this.state === 'ending') {
      this.endT -= dt;
      if (this.endT <= 0) this.finishRun(true);
    }
  }

  finishRun(completed) {
    const g = this.game;
    if (this.finished) return;
    this.finished = true;
    // Power-up COINBONUS: +10% van de verdiende coins aan het eind van de run
    if (this.loadout.powerups.coinBonus) {
      this.stats.coinBonus = Math.round(this.stats.coins * POWERUPS.coinBonus.value);
      this.stats.coins += this.stats.coinBonus;
    }
    const sum = this.stats.summary();
    const newRecords = g.profile.recordRun(sum, { mode: this.opts.mode, tables: this.opts.tables, completed, world: this.worldDef.id });
    // kisten voor tafelkaart-stapjes, nieuw goud en de verslagen boss
    const loot = Chests.awardForRun(g.profile, sum, { completed, world: this.worldDef.id });
    // nieuwe wereld vrijgespeeld? (Frostpeak na de Woudwachter)
    const newWorlds = Worlds.checkUnlocks(g.profile);
    g.showResults({ summary: sum, newRecords, completed, runOpts: this.opts, loot, newWorlds, world: this.worldDef });
  }

  // --- tekenen -----------------------------------------------------------------------
  draw(ctx) {
    const g = this.game, ui = g.ui;
    const off = g.renderer.shakeOffset(g.dt);
    ctx.save();
    ctx.translate(off.x, off.y);
    this.world.drawBack(ctx);
    this.enemies.drawEnemies(ctx, this.camX);
    if (this.boss) this.boss.draw(ctx, this.camX);
    if (this.pet) this.pet.draw(ctx, this.camX);
    this.player.draw(ctx, this.camX);
    this.enemies.drawShots(ctx, this.camX);
    g.effects.draw(ctx, this.camX);
    g.particles.draw(ctx, this.camX);
    this.world.drawFront(ctx);
    ctx.restore();

    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(1, this.flash * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
      ctx.globalAlpha = 1;
    }

    this.hud.draw(ctx, ui, this);
    this.hud.drawFlyingCoins(ctx);
    if (this.state !== 'tutorial' && this.bossPhase !== 'victory') this.panel.draw(ctx, ui, g.time);
    this.hud.drawOverlays(ctx, ui);
    g.particles.draw(ctx, 0, true);

    if (g.input.usingTouch && this.state === 'play') this.drawKeypad(ctx, ui); else this.keypadRects = null;
    // pauzeknop rechtsboven, onder de geluidsknoppen (op elk apparaat, zodat iedereen weet hoe het moet)
    this.pauseRect = null;
    if (this.state === 'play') {
      const w = ui.touch ? 58 : 72;
      const r = this.pauseRect = { x: CONFIG.width - 6 - w, y: 47, w, h: 17 };
      const hp = g.input.pointer, over = !ui.touch && hp.x >= r.x && hp.y >= r.y && hp.x < r.x + r.w && hp.y < r.y + r.h;
      ui.panel(ctx, r.x, r.y, r.w, r.h, over ? 'btn_hover' : 'btn');
      ctx.fillStyle = '#fff8ec'; ctx.fillRect(r.x + 6, r.y + 5, 2, 7); ctx.fillRect(r.x + 10, r.y + 5, 2, 7);
      ui.text(ctx, ui.key('PAUZE', 'P'), r.x + 15 + (r.w - 15) / 2, r.y + 5, { align: 'center', outline: null, shadow: false });
    }
    if (this.state === 'tutorial') this.drawTutorial(ctx, ui);
    if (this.state === 'paused') this.drawPause(ctx, ui, 'PAUZE', [ui.hint('P OF ENTER = VERDER   T = STOPPEN', 'JE COINS EN SOMMEN BLIJVEN BEWAARD')], true);
    if (this.state === 'focuslost') this.drawPause(ctx, ui, 'PAUZE', [ui.hint('KLIK OF DRUK OP EEN TOETS = VERDER', 'TIK OM VERDER TE SPELEN')], true);

    // latentie-meting: Enter → nieuwe som in beeld
    if (this.enterAt) {
      this.stats.latencies.push(performance.now() - this.enterAt);
      if (this.stats.latencies.length > 200) this.stats.latencies.shift();
      this.enterAt = 0;
    }
  }

  /** Cijferbalk voor touchscreens: op telefoon/tablet meteen, op een laptop na een aanraking.
   *  Onderin over de hele breedte, zodat beide duimen erbij kunnen en het spel zichtbaar blijft. */
  drawKeypad(ctx, ui) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'backspace', 'enter'];
    const kw = 37, gap = 2, h = 31, y = CONFIG.height - h - 3;
    const x0 = Math.round((CONFIG.width - (keys.length * kw + (keys.length - 1) * gap)) / 2);
    if (this.keyFlashT > 0) this.keyFlashT -= this.game.dt;
    this.keypadRects = keys.map((k, i) => ({ x: x0 + i * (kw + gap), y, w: kw, h, action: k }));
    for (const r of this.keypadRects) {
      const pressed = this.keyFlashT > 0 && this.keyFlash && this.keyFlash.action === r.action;
      ui.panel(ctx, r.x, r.y + (pressed ? 1 : 0), r.w, r.h, r.action === 'enter' ? 'btn_go' : pressed ? 'btn_down' : 'btn');
      const label = r.action === 'enter' ? 'OK' : r.action === 'backspace' ? '<' : r.action;
      ui.text(ctx, label, r.x + r.w / 2, r.y + 6 + (pressed ? 1 : 0), { font: 'big', align: 'center' });
    }
  }

  dim(ctx, a = 0.6) {
    ctx.fillStyle = `rgba(12,8,24,${a})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  drawTutorial(ctx, ui) {
    this.dim(ctx, 0.45);
    const w = 300, h = 124, x = (CONFIG.width - w) / 2, y = 64;
    ui.panel(ctx, x, y, w, h, 'panel');
    ui.text(ctx, 'ZO WERKT HET', CONFIG.width / 2, y + 10, { font: 'big', align: 'center', color: COLORS.gold });
    const lines = [ui.hint('TYP HET ANTWOORD EN DRUK OP ENTER.', 'TIK HET ANTWOORD EN DRUK OP OK.'), 'HOE SNELLER EN BETER JE REKENT,', 'HOE SNELLER JE RENT!', '', "BOUW COMBO'S OP VOOR SPECIALE BOOSTS."];
    lines.forEach((l, i) => ui.text(ctx, l, CONFIG.width / 2, y + 36 + i * 11, { align: 'center', color: i === 4 ? COLORS.cyan : '#fff8ec' }));
    const blink = Math.floor(this.game.time * 2) % 2 === 0;
    if (!ui.touch) ui.icon(ctx, 'enter', CONFIG.width / 2 - 64, y + h - 20);
    ui.text(ctx, ui.hint('ENTER = START!', 'TIK = START!'), CONFIG.width / 2 + 6, y + h - 18, { align: 'center', color: blink ? '#7dff8a' : '#d0ffd8' });
    const b = this.tutBackRect = { x: CONFIG.width / 2 - 42, y: y + h + 6, w: 84, h: 18 };
    ui.panel(ctx, b.x, b.y, b.w, b.h, 'btn');
    ui.text(ctx, ui.key('< TERUG', 'T'), b.x + b.w / 2, b.y + 5, { align: 'center', outline: null, shadow: false });
  }

  /** buttons = true: klikbare knoppen VERDER SPELEN en STOPPEN (naar de uitslag, alles blijft bewaard). */
  drawPause(ctx, ui, title, lines, buttons = false) {
    this.dim(ctx, 0.55);
    const w = 240, h = buttons ? 92 : 80, x = (CONFIG.width - w) / 2, y = 90;
    ui.panel(ctx, x, y, w, h, 'panel');
    ui.text(ctx, title, CONFIG.width / 2, y + 12, { font: 'big', align: 'center', color: COLORS.gold });
    lines.forEach((l, i) => ui.text(ctx, l, CONFIG.width / 2, y + 36 + i * 12, { align: 'center', color: buttons ? '#c8c0e8' : undefined }));
    this.stopRect = this.resumeRect = null;
    if (buttons) {
      const hp = this.game.input.pointer, over = r => hp && hp.x >= r.x && hp.y >= r.y && hp.x < r.x + r.w && hp.y < r.y + r.h;
      const go = this.resumeRect = { x: x + 14, y: y + h - 34, w: 120, h: 22 };
      const st = this.stopRect = { x: x + w - 14 - 86, y: y + h - 34, w: 86, h: 22 };
      ui.panel(ctx, go.x, go.y, go.w, go.h, over(go) ? 'btn_hover' : 'btn_go');
      ui.text(ctx, ui.hint('VERDER (P)', 'VERDER'), go.x + go.w / 2, go.y + 7, { align: 'center', color: '#ffffff', outline: null, shadow: false });
      ui.panel(ctx, st.x, st.y, st.w, st.h, over(st) ? 'btn_hover' : 'btn');
      ui.text(ctx, ui.hint('STOPPEN (T)', 'STOPPEN'), st.x + st.w / 2, st.y + 7, { align: 'center', color: '#ffb0a0', outline: null, shadow: false });
    }
  }
}
