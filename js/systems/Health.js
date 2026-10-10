// ---------------------------------------------------------------------------
// Health – generieke levenspunten voor ALLES wat geraakt kan worden
// (gewone vijanden én de boss). Puur JS, geen DOM → testbaar in Node.
//
// Twee lagen:
//   hp       – logische HP. Gaat DIRECT omlaag bij een goed antwoord, zodat
//              snelle antwoorden nooit dubbel op een al verslagen vijand gaan.
//   shownHp  – zichtbare HP (pips/balk). Gaat omlaag op het moment dat de
//              aanval visueel inslaat (showHit), zodat beeld en gevoel kloppen.
// ---------------------------------------------------------------------------

export class Health {
  constructor(maxHp = 1) {
    this.maxHp = Math.max(1, maxHp);
    this.hp = this.maxHp;
    this.shownHp = this.maxHp;
  }

  get alive() { return this.hp > 0; }
  get ratio() { return this.hp / this.maxHp; }

  /**
   * Breng schade toe (logisch). damage = { amount, crit, ... } (zie DamageSystem).
   * @returns {{applied:number, before:number, after:number, killed:boolean, crit:boolean, damage:object}}
   */
  takeDamage(damage) {
    const before = this.hp;
    if (before <= 0) return { applied: 0, before, after: before, killed: false, crit: !!damage.crit, damage };
    const amount = Math.max(0, Math.round(damage.amount));
    this.hp = Math.max(0, before - amount);
    return { applied: before - this.hp, before, after: this.hp, killed: before > 0 && this.hp === 0, crit: !!damage.crit, damage };
  }

  /** Visuele inslag van een eerder toegebrachte hit. */
  showHit(result) {
    this.shownHp = Math.max(this.hp, this.shownHp - result.applied);
    return this.shownHp;
  }
}
