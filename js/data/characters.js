// ---------------------------------------------------------------------------
// Speelbare characters (data-driven). De game-code kent GEEN character-namen:
// alles wat verschilt staat hier. Gameplay is voor iedereen gelijk – de keuze
// is puur cosmetisch (zelfde damage, snelheid, coins en timing).
//
// Velden:
//   name, role         weergave in de selector
//   sheet              sprite sheet (atlas.json) met idle/run/sprint/attack/hit/victory
//                      → alle sheets komen uit de gedeelde rig (tools/art/rig.js):
//                        zelfde frame (48x56), schaal en voetpunt
//   attack.effect      projectiel-sheet: 'slash' | 'arrow' | 'plasma' (varianten normal/crit/ultra/fire)
//   attack.melee       true = slash verschijnt bij het doelwit (dichtbij); false = vliegt vanuit de hand
//   attack.launch      [dx, dy] startpunt t.o.v. het voetpunt
//   attack.trail       kleur van het spoor (normale aanval)
//   ghostColor         kleur van de na-beelden in ULTRA MODE
//   unlock             { type: 'free' } | { type: 'coins', price } |
//                      { type: 'achievement', id } | { type: 'progress', stat, value }
//   order              volgorde in de selector
// ---------------------------------------------------------------------------

export const CHARACTERS = {
  hero01: {
    id: 'hero01',
    name: 'KAI',
    role: 'ZWAARDHELD',
    sheet: 'hero_kai',
    attack: { effect: 'slash', melee: true, launch: [16, -20], trail: '#8ff2ff' },
    ghostColor: '#d070ff',
    unlock: { type: 'free' },
    order: 1,
  },
  ranger01: {
    id: 'ranger01',
    name: 'MILA',
    role: 'RANGER',
    sheet: 'hero_mila',
    attack: { effect: 'arrow', melee: false, launch: [18, -22], trail: '#c2ff9a' },
    ghostColor: '#7aff9a',
    unlock: { type: 'free' },
    order: 2,
  },
  tech01: {
    id: 'tech01',
    name: 'NOVA',
    role: 'TECH RUNNER',
    sheet: 'hero_nova',
    attack: { effect: 'plasma', melee: false, launch: [22, -21], trail: '#8ff2ff' },
    ghostColor: '#4fe8ff',
    unlock: { type: 'free' },
    order: 3,
  },
};

export const DEFAULT_CHARACTER = 'hero01';

/** Oude ids uit eerdere profielversies. */
export const LEGACY_CHARACTER_IDS = { kai: 'hero01' };
