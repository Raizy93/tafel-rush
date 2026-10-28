// ---------------------------------------------------------------------------
// Uitleg (scherm "UITLEG", toets H) + korte tips op het juiste moment.
// Alles als data: tekst aanpassen kan hier, zonder de schermen te veranderen.
// Korte zinnen, kindertaal (9-12 jaar). Het pixelfont kent geen accenten.
//
// Blokken in een hoofdstuk:
//   { p: 'tekst' }                       alinea (breekt vanzelf af)
//   { big: '7 × 8 = 56' }                grote tekst (zoals de som in de game)
//   { row: [ item, … ] }                 rij plaatjes met een onderschrift:
//        { icon, label } · { chest, label } · { pet, label } · { map, label } ·
//        { text, color, label } (gekleurd woord)
//   { keys: [[toets, uitleg], …] }        tabel met toetsen
// ---------------------------------------------------------------------------

export const HELP_CHAPTERS = [
  {
    id: 'spelen', title: 'ZO SPEEL JE', icon: 'target',
    blocks: [
      { p: 'TYP HET ANTWOORD EN DRUK OP ENTER. JE HELD VALT DAN AAN!', touch: 'TIK HET ANTWOORD OP DE CIJFERS ONDERIN EN DRUK OP OK. JE HELD VALT DAN AAN!' },
      { big: '7 × 8 = 56' },
      { p: 'HOE SNELLER, HOE BETER. HEEL SNEL GOED = PERFECT! EN DAT GEEFT EXTRA COINS.' },
      { p: 'GOED OP RIJ = EEN COMBO. BIJ 5, 10, 20 EN 30 GA JE STEEDS SNELLER EN VERDIEN JE MEER.' },
      { p: 'FOUT? DAN ZIE JE HET GOEDE ANTWOORD EVEN. JE COMBO BEGINT OPNIEUW, MAAR JE KUNT NIET AF.' },
      { row: [{ icon: 'bolt', label: 'PERFECT' }, { icon: 'flame', label: 'COMBO' }, { icon: 'coin', label: 'COINS' }, { icon: 'skull', label: 'BOSS' }] },
      { p: 'AAN HET EIND WACHT DE BOSS. IEDER GOED ANTWOORD IS EEN KLAP!' },
    ],
  },
  {
    id: 'modi', title: 'OEFENMODI', icon: 'check',
    blocks: [
      { p: 'KIES EERST LINKSBOVEN: TAFELS (7 × 8) OF DEELTAFELS (56 : 8). DE MODI HIERONDER GELDEN VOOR WAT JE KOOS.' },
      { keys: [['TRAINING', 'EEN TAFEL OEFENEN. KIES 1 T/M 10.'], ['MIX', 'KIES ZELF EEN PAAR TAFELS DOOR ELKAAR.'], ['POWER', 'ALLE TAFELS VAN 2 T/M 10.'], ['MOEILIJK', 'JOUW LASTIGSTE SOMMEN. GAAT OPEN ALS JE GENOEG HEBT GESPEELD.']] },
      { p: 'DE GAME ONTHOUDT WELKE SOMMEN NOG LASTIG ZIJN. DIE KOMEN VAKER TERUG, TOT JE ZE SNEL KENT.' },
      { p: 'TIP: EEN KORTE RUN ELKE DAG HELPT MEER DAN EEN HELE MIDDAG IN EEN KEER!' },
    ],
  },
  {
    id: 'kaart', title: 'DE TAFELKAART', icon: 'star', key: 'K',
    blocks: [
      { p: 'IEDER VAKJE IS EEN SOM. DE KLEUR LAAT ZIEN HOE GOED JE HEM KENT.' },
      { row: [{ map: 'new', label: 'NIEUW' }, { map: 'hard', label: 'BEGONNEN' }, { map: 'almost', label: 'OP WEG' }, { map: 'good', label: 'GOED' }, { map: 'gold', label: 'GOUD' }, { map: 'faded', label: 'DOF' }] },
      { p: 'EEN SOM KAN MAAR EEN STAPJE PER DAG OMHOOG. GOUD = OP 4 VERSCHILLENDE DAGEN SNEL EN GOED.' },
      { p: 'LANGZAAM GOED BRENGT JE TOT GROEN. VOOR GOUD MOET JE OOK SNEL ZIJN.' },
      { p: '14 DAGEN NIET GEOEFEND? DAN WORDT GOUD DOF. EEN KEER SNEL GOED EN HET IS WEER GOUD!' },
    ],
  },
  {
    id: 'uitrusting', title: 'COINS EN UITRUSTING', short: 'UITRUSTING', icon: 'sword', key: 'U',
    blocks: [
      { p: 'COINS VERDIEN JE MET GOEDE ANTWOORDEN, COMBO\'S, SCHATKISTEN EN DE BOSS.' },
      { row: [{ icon: 'coin', label: 'COINS' }, { icon: 'sword', label: 'WAPENS' }, { icon: 'shield', label: 'POWER-UPS' }] },
      { p: 'WAPENS: IEDERE HELD HEEFT 3 BETERE WAPENS (800, 2.000 EN 5.000 COINS). ZE ZIEN ER ANDERS UIT EN DOEN SOMS MEER DAMAGE.' },
      { p: 'POWER-UPS: COINBONUS, COMBOSCHILD EN DOORBOORDER. ZE GELDEN VOOR ALLE HELDEN.' },
      { p: 'DE BOSS BLIJFT ALTIJD EVEN STERK. ALLEEN GOED REKENEN VERSLAAT HEM! KAI, MILA EN NOVA ZIJN OOK EVEN STERK.' },
    ],
  },
  {
    id: 'pets', title: 'PETS EN KISTEN', icon: 'book', key: 'B',
    blocks: [
      { p: 'PETS LOPEN MET JE MEE. ZE ZIJN ALLEEN VOOR DE LOL. JE VINDT ZE IN KISTEN.' },
      { row: [{ chest: 'wood', label: 'HOUTEN KIST' }, { chest: 'tafel', label: 'TAFELKIST' }, { chest: 'gold', label: 'GOUDEN KIST' }] },
      { keys: [['HOUTEN', 'KOPEN VOOR 400 COINS.'], ['TAFEL', 'IEDERE 10 STAPJES OP DE TAFELKAART.'], ['GOUDEN', 'NIEUW GOUD OP DE KAART. MEESTE KANS OP LEGENDARISCH!']] },
      { row: [{ text: 'GEWOON', color: '#d8d0f0' }, { text: 'ZELDZAAM', color: '#6ac0ff' }, { text: 'EPISCH', color: '#d0a0ff' }, { text: 'LEGENDARISCH', color: '#ffc93c' }] },
      { p: 'AL EEN PET DIE JE KRIJGT? DAN KRIJG JE SNOEPJES. DAARMEE LOK JE ZELF EEN PET DIE JE NOG MIST.' },
    ],
  },
  {
    id: 'werelden', title: 'WERELDEN', icon: 'trophy', key: 'W',
    blocks: [
      { p: 'ER ZIJN 3 WERELDEN. DE TAFELS ZIJN OVERAL HETZELFDE, HET AVONTUUR NIET!' },
      { row: [{ text: 'GREENWOOD', color: '#c8f0c0', label: 'START' }, { text: '→', color: '#e8e4ff' }, { text: 'FROSTPEAK', color: '#b4e4ff', label: 'NA DE WOUDWACHTER' }, { text: '→', color: '#e8e4ff' }, { text: 'STORMRIJK', color: '#ffe24a', label: 'NA DE IJSREUS' }] },
      { p: 'IEDERE WERELD HEEFT 5 EIGEN PETS. DIE ZITTEN ALLEEN IN DE WERELDKIST VAN DAAR.' },
      { row: [{ chest: 'bos', label: 'BOSKIST' }, { chest: 'sneeuw', label: 'SNEEUWKIST' }, { chest: 'storm', label: 'STORMKIST' }] },
      { p: 'EEN WERELDKIST KRIJG JE ALS JE DE BOSS VAN DIE WERELD VERSLAAT. KIES JE WERELD OP DE WERELDKAART (KNOP BOVENAAN OF W).', touch: 'EEN WERELDKIST KRIJG JE ALS JE DE BOSS VAN DIE WERELD VERSLAAT. KIES JE WERELD OP DE WERELDKAART: TIK BOVENAAN OP KAART.' },
    ],
  },
  {
    id: 'toetsen', title: 'TOETSEN', touchTitle: 'BEDIENING', icon: 'enter',
    touchBlocks: [
      { keys: [['CIJFERS', 'TIK HET ANTWOORD OP DE CIJFERS ONDERIN'], ['OK', 'ANTWOORD GEVEN'], ['<', 'CIJFER WISSEN'], ['PAUZE', 'KNOP RECHTSBOVEN TIJDENS HET SPELEN'], ['KIEZEN', 'TIK OP EEN MODUS, TAFEL, HELD OF KNOP'], ['WERELD', 'TIK OP DE PIJLTJES BOVENAAN HET STARTSCHERM'], ['?', 'UITLEG BIJ HET SCHERM WAAR JE BENT'], ['VOORTGANG', 'NAAR EEN ANDER APPARAAT MET EEN QR-CODE'], ['DWARS', 'HOUD JE TELEFOON DWARS']] },
      { p: 'TIP: ZET TAFEL RUSH OP JE BEGINSCHERM. DAN SPEEL JE SCHERMVULLEND, OOK ZONDER INTERNET.' },
    ],
    blocks: [
      { keys: [['TIKKEN', 'TELEFOON OF TABLET: CIJFERS ONDERIN, OK = ENTER'], ['0 - 9', 'ANTWOORD TYPEN (OOK HET NUMPAD)'], ['ENTER', 'ANTWOORD GEVEN / KIEZEN'], ['BACKSPACE', 'CIJFER WISSEN'], ['← →', 'MODUS KIEZEN (STARTSCHERM)'], ['↑ ↓', 'HELD KIEZEN'], ['1 - 9, 0', 'TAFEL KIEZEN (0 = 10)'], ['W / S', 'WERELDKAART / TAFELS OF DEELTAFELS'], ['U / K / B', 'UITRUSTING / TAFELKAART / PETBOEK'], ['H', 'DEZE UITLEG'], ['V / L', 'VOORTGANG MEENEMEN / INLOGGEN'], ['M', 'GELUID AAN OF UIT'], ['F', 'VOLLEDIG SCHERM AAN OF UIT'], ['P / T', 'PAUZE / TERUG']] },
    ],
  },
];

// --- tips: één keer per onderwerp, op het moment dat het belangrijk wordt -------------
// Nooit tijdens het rekenen (alleen op het startscherm, resultaatscherm en in het petboek).
export const TIPS = {
  help: { icon: 'book', text: 'ALLES OVER DE GAME STAAT IN DE UITLEG. DRUK OP H OF KLIK OP ? UITLEG.', touch: 'ALLES OVER DE GAME STAAT IN DE UITLEG. TIK LINKSBOVEN OP ? UITLEG.' },
  firstChest: { icon: 'chest_wood', text: 'JE HEBT EEN KIST! OPEN HEM IN HET PETBOEK (B). ER ZIT EEN PET IN DIE MET JE MEELOOPT.', touch: 'JE HEBT EEN KIST! OPEN HEM IN HET PETBOEK. ER ZIT EEN PET IN DIE MET JE MEELOOPT.' },
  worldChest: { icon: 'chest_bos', text: 'EEN WERELDKIST! DAARIN ZITTEN PETS DIE JE ALLEEN IN DEZE WERELD KUNT VINDEN.' },
  mapStep: { icon: 'star', text: 'JE SOMMEN KLEUREN OP DE TAFELKAART (K). GOUD = OP 4 VERSCHILLENDE DAGEN SNEL EN GOED!', touch: 'JE SOMMEN KLEUREN OP DE TAFELKAART. GOUD = OP 4 VERSCHILLENDE DAGEN SNEL EN GOED!' },
  coins: { icon: 'coin', text: 'JE HEBT AL VEEL COINS! KOOP EEN HOUTEN KIST IN HET PETBOEK (B) OF EEN WAPEN BIJ UITRUSTING (U).', touch: 'JE HEBT AL VEEL COINS! KOOP EEN HOUTEN KIST IN HET PETBOEK OF EEN WAPEN BIJ UITRUSTING.' },
  newWorld: { icon: 'trophy', text: 'ER IS EEN NIEUWE WERELD OPEN! KIES HEM OP DE WERELDKAART (W).', touch: 'ER IS EEN NIEUWE WERELD OPEN! TIK BOVENAAN OP KAART EN KIES HEM.' },
  duplicate: { icon: 'treat', text: 'DEZE PET HAD JE AL. DAAROM KRIJG JE SNOEPJES. DAARMEE LOK JE ZELF EEN PET DIE JE MIST!' },
  appImport: { icon: 'star', text: 'AL VOORTGANG OP EEN ANDER APPARAAT? DRUK OP V OF KLIK OP VOORTGANG EN PLAK DE CODE.', touch: 'AL VOORTGANG OP EEN ANDER APPARAAT? TIK LINKSBOVEN OP VOORTGANG EN DAN OP CODE PLAKKEN.' },
  pages: { icon: 'book', text: 'HET PETBOEK HEEFT PAGINA\'S: DE KIST-PETS EN DE PETS VAN IEDERE WERELD. BLADER MET W.', touch: 'HET PETBOEK HEEFT PAGINA\'S: DE KIST-PETS EN DE PETS VAN IEDERE WERELD. TIK BOVENIN OP EEN PAGINA.' },
};
