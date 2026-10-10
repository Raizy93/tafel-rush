// ---------------------------------------------------------------------------
// DamageSystem – berekent de schade van één goed antwoord.
//
//   damage = player.getAttackDamage(context)   →  DamageSystem.forAnswer(…)
//   result = target.takeDamage(damage)          →  Health.takeDamage(…)
//
// Nu: altijd CONFIG.combat.baseDamage (1). Een PERFECT antwoord is een
// visuele CRITICAL zonder extra damage (critMultiplier = 1).
// Characters hebben GEEN invloed op damage (puur cosmetisch).
//
// Toekomstige upgrades zijn "modifiers": objecten met apply(damage, ctx) die
// een (aangepast) damage-object teruggeven. Voorbeelden onderaan.
// ---------------------------------------------------------------------------
import { CONFIG } from '../config.js';

export const DamageSystem = {
  /**
   * @param {object} ctx { tier, comboTier, modifiers?: Array<{id, apply(dmg, ctx)}> , rng? }
   * @returns {{amount:number, crit:boolean, tier:string, hits:number, tags:string[]}}
   */
  forAnswer(ctx, combat = CONFIG.combat) {
    const crit = combat.critTiers.includes(ctx.tier);
    let dmg = {
      amount: combat.baseDamage * (crit ? combat.critMultiplier : 1),
      crit,
      tier: ctx.tier,
      hits: 1,          // voor een toekomstige "double hit"
      tags: [],
    };
    // appliesTo: 'all' (standaard) | 'enemies' (niet op de boss – "oeroud pantser")
    const kind = ctx.targetKind || 'enemy';
    for (const m of ctx.modifiers || []) {
      if (m.appliesTo === 'enemies' && kind === 'boss') continue;
      dmg = m.apply({ ...dmg }, ctx) || dmg;
    }
    dmg.amount = Math.max(1, Math.round(dmg.amount));
    return dmg;
  },
};

/**
 * Voorbeeld-modifiers voor later (NIET actief). Een upgrade-systeem kan deze
 * op basis van het profiel aan player.modifiers toevoegen.
 */
export const EXAMPLE_MODIFIERS = {
  plusOne: { id: 'plusOne', apply: d => ({ ...d, amount: d.amount + 1, tags: [...d.tags, '+1'] }) },
  realCrits: { id: 'realCrits', apply: d => (d.crit ? { ...d, amount: d.amount * 2, tags: [...d.tags, 'crit×2'] } : d) },
  critChance: chance => ({ id: 'critChance', apply: (d, ctx) => ((ctx.rng || Math.random)() < chance ? { ...d, crit: true } : d) }),
};
