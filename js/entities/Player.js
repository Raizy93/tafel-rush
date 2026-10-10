// ---------------------------------------------------------------------------
// Player – de speelbare held. Rent automatisch; snelheid en acties worden
// volledig gestuurd door het rekenen (via RunScene).
// Volledig data-driven: welk character (sprite sheet, aanvalseffect,
// kleuren) komt uit data/characters.js via de CharacterRegistry. Alle
// characters delen dezelfde animatie-states, timing en gameplay-waarden.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';
import { CharacterRegistry } from '../systems/CharacterRegistry.js';
import { DamageSystem } from '../systems/DamageSystem.js';
import { Animator, drawFrame } from '../core/Sprite.js';
import { damp } from '../core/util.js';

export const PLAYER_SCREEN_X = 120;

export class Player {
  /**
   * @param game
   * @param loadout  uit Equipment.loadout(profile): { character, weapon, sheet, attack, modifiers }
   *                 (of een character-id: dan zonder wapen-upgrades)
   */
  constructor(game, loadout) {
    this.game = game;
    if (!loadout || typeof loadout === 'string') {
      const def = CharacterRegistry.get(loadout);
      loadout = { character: def, weapon: null, sheet: def.sheet, attack: def.attack, modifiers: [] };
    }
    this.def = loadout.character;
    this.weapon = loadout.weapon;
    this.attackInfo = loadout.attack;
    // Damage-modifiers komen uit het WAPEN (perks), niet uit de character:
    // characters blijven cosmetisch; ieder character heeft even sterke wapen-tiers.
    this.modifiers = loadout.modifiers || [];
    this.sheetId = loadout.sheet;
    this.sheet = game.assets.sheet(this.sheetId);
    this.ani = new Animator(this.sheet, 'idle');
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = CONFIG.groundY;
    this.speed = 0;
    this.boost = 0;
    this.state = 'run';       // run | attack | hit | victory
    this.stumbleT = 0;
    this.lunge = 0;           // visuele x-offset (uitval/terugslag)
    this.jump = 0;
    this.comboTier = 0;
    this.trail = [];
    this.trailT = 0;
    this.lastFrame = -1;
    this.flashT = 0;
    this.blockX = Infinity;   // niet voorbij deze x lopen (vijand/boss)
    this.running = true;
    this.ani.play('idle', true);
  }

  /**
   * Schade van één goed antwoord. targetKind 'boss' → wapen-perks tellen niet
   * (boss is immuun voor upgrades).
   */
  getAttackDamage(tier, comboTier = this.comboTier, targetKind = 'enemy') {
    return DamageSystem.forAnswer({ tier, comboTier, targetKind, modifiers: this.modifiers });
  }

  /** Aanvalsdefinitie: character (melee/launch) + wapen (effect/trail). */
  get attackDef() { return this.attackInfo; }

  /** Startpunt van de aanval in wereld-coördinaten. */
  attackOrigin() {
    const [dx, dy] = this.attackInfo.launch;
    return { x: this.x + this.lunge + dx, y: this.y + dy };
  }

  /** Snelheid t.o.v. basis (voor speed-lines/muziek). */
  get speedLevel() { return this.speed / CONFIG.speed.base; }

  attack(kind = 'normal', near = false) {
    if (this.state === 'victory') return;
    this.state = 'attack';
    this.ani.play('attack', true);
    this.ani.speed = kind === 'crit' ? 1.3 : 1.1;
    if (near) this.lunge = 7;
    this.boost = Math.min(this.boost + CONFIG.speed.boostOnCorrect, 120);
  }

  hit() {
    if (this.state === 'victory') return;
    this.state = 'hit';
    this.ani.play('hit', true);
    this.ani.speed = 1;
    this.stumbleT = CONFIG.speed.stumbleMs / 1000;
    this.lunge = -7;
    this.boost = 0;
    this.flashT = 0.12;
  }

  victory() {
    this.state = 'victory';
    this.ani.play('victory', true);
  }

  update(dt) {
    const S = CONFIG.speed;
    // --- snelheid ---------------------------------------------------------------
    this.boost *= Math.exp(-S.boostDecay * dt);
    let target = this.running ? S.base * S.tierMultiplier[this.comboTier] + this.boost : 0;
    if (this.stumbleT > 0) { this.stumbleT -= dt; target *= S.stumbleFactor; }
    if (this.state === 'victory') target = 0;
    this.speed = damp(this.speed, target, target > this.speed ? 5 : 7, dt);
    // stoppen voor een vijand/boss (zacht afremmen)
    const room = this.blockX - this.x;
    if (room < 40) this.speed = Math.min(this.speed, Math.max(0, room) * 5);
    this.x += this.speed * dt;
    if (this.x > this.blockX) this.x = this.blockX;

    this.lunge = damp(this.lunge, 0, 9, dt);
    if (this.flashT > 0) this.flashT -= dt;

    // --- animatie ----------------------------------------------------------------
    if ((this.state === 'attack' || this.state === 'hit') && this.ani.done) this.state = 'run';
    if (this.state === 'run') {
      const moving = this.speed > 10;
      const sprint = this.comboTier >= 2 && this.speed > S.base * 1.2;
      this.ani.play(!moving ? 'idle' : sprint ? 'sprint' : 'run');
      this.ani.speed = moving ? Math.max(0.6, Math.min(1.6, this.speed / (sprint ? 150 : 95))) : 1;
    }
    this.ani.update(dt);

    // stofwolkjes bij voetstappen
    if (this.state === 'run' && this.speed > 30 && (this.ani.name === 'run' || this.ani.name === 'sprint')) {
      if (this.ani.frame !== this.lastFrame && (this.ani.frame === 1 || this.ani.frame === 5)) {
        this.game.effects.play('dust', 'dust', this.x - 4, this.y, { alpha: 0.8 });
      }
    }
    this.lastFrame = this.ani.frame;

    // na-beelden (ULTRA)
    this.trailT -= dt;
    if (this.comboTier >= 4 && this.trailT <= 0 && this.speed > 40) {
      this.trailT = 0.045;
      this.trail.push({ x: this.x, anim: this.ani.name, frame: this.ani.frame, life: 0.22 });
    }
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter(t => t.life > 0);
  }

  /** Scherm-x van de speler (rekening houdend met uitval). */
  screenX(camX) { return this.x - camX + this.lunge; }

  draw(ctx, camX) {
    const sx = this.screenX(camX);
    // aura achter de held
    if (this.comboTier >= 3 && this.state !== 'victory') {
      const flame = this.game.assets.sheet('flame');
      const anim = this.comboTier >= 4 ? 'ultra' : 'fire';
      const f = Math.floor(this.game.time * 12) % 4;
      if (this.speed > 25) {
        // rennen: vuurspoor achter de held
        ctx.globalAlpha = 0.9;
        drawFrame(ctx, flame, anim, f, sx - 13, this.y - 6);
        ctx.globalAlpha = 0.7;
        drawFrame(ctx, flame, anim, (f + 2) % 4, sx - 22, this.y - 12);
        ctx.globalAlpha = 0.45;
        drawFrame(ctx, flame, anim, (f + 1) % 4, sx - 30, this.y - 4);
      } else {
        // stilstaan: compacte aura óm de held (geen "kampvuur" erachter)
        ctx.globalAlpha = 0.6;
        drawFrame(ctx, flame, anim, f, sx - 6, this.y - 1);
        drawFrame(ctx, flame, anim, (f + 2) % 4, sx + 7, this.y - 1);
      }
      ctx.globalAlpha = 1;
    }
    // na-beelden
    if (this.trail.length) {
      const ghost = this.game.assets.flash(this.sheetId, this.def.ghostColor || '#d070ff');
      for (const t of this.trail) {
        drawFrame(ctx, this.sheet, t.anim, t.frame, t.x - camX, this.y, { flashImg: ghost, alpha: t.life * 2.2 });
      }
    }
    // schaduw
    ctx.fillStyle = 'rgba(10,8,20,0.28)';
    ctx.fillRect(Math.round(sx - 9), this.y - 1, 20, 2);
    ctx.fillRect(Math.round(sx - 7), this.y, 16, 1);
    drawFrame(ctx, this.sheet, this.ani.name, this.ani.frame, sx, this.y - this.jump);
    if (this.flashT > 0) {
      const flashImg = this.game.assets.flash(this.sheetId, '#ff6a6a');
      drawFrame(ctx, this.sheet, this.ani.name, this.ani.frame, sx, this.y - this.jump, { flashImg, alpha: 0.55 });
    }
  }
}
