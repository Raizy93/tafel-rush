// ---------------------------------------------------------------------------
// UI-assets: 9-slice panelen/knoppen en 12x12 iconen.
// ---------------------------------------------------------------------------
import { Img } from '../lib/raster.js';
import { P, OUTLINE } from '../lib/palette.js';

/** 9-slice paneel 24x24 (slice = 8). */
function panel(fill, rimLight, rimDark, corner) {
  const L = new Img(24, 24);
  // buitenrand
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const edge = x === 0 || y === 0 || x === 23 || y === 23;
    const cornerCut = (x === 0 || x === 23) && (y === 0 || y === 23);
    if (cornerCut) continue;
    if (edge) { L.put(x, y, OUTLINE); continue; }
    const inner = x === 1 || y === 1;
    const innerB = x === 22 || y === 22;
    if (inner) L.put(x, y, rimLight);
    else if (innerB) L.put(x, y, rimDark);
    else if (x === 2 || y === 2 || x === 21 || y === 21) L.put(x, y, OUTLINE);
    else L.put(x, y, fill);
  }
  if (corner) for (const [cx, cy] of [[3, 3], [20, 3], [3, 20], [20, 20]]) {
    L.put(cx, cy, corner[0]); L.put(cx - 1 + 1, cy, corner[0]);
  }
  return L;
}

function button(top, mid, bot, pressed = false) {
  const L = new Img(24, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const cornerCut = (x === 0 || x === 23) && (y === 0 || y === 23);
    if (cornerCut) continue;
    if (x === 0 || y === 0 || x === 23 || y === 23) { L.put(x, y, OUTLINE); continue; }
    const shade = pressed ? 0 : 3;
    if (y >= 23 - shade) { L.put(x, y, bot); continue; }
    if (y === (pressed ? 2 : 1)) { L.put(x, y, top); continue; }
    L.put(x, y, mid);
  }
  if (pressed) for (let x = 1; x < 23; x++) L.put(x, 1, OUTLINE);
  return L;
}

export function buildPanels() {
  return {
    panel: panel('#1b1630', '#4a3f78', '#2a2248', ['#ffc93c']),
    panel_light: panel('#2b2450', '#6a5aa0', '#3a3068', null),
    btn: button('#7a6ec8', '#4a3f8a', '#2a2258'),
    btn_hover: button('#a296f0', '#6658b8', '#3a3078'),
    btn_on: button('#fff1a0', '#ffc93c', '#c8811e'),
    btn_go: button('#b8f57a', '#46b03e', '#1f6a2e'),
    btn_go_hover: button('#dcffb0', '#62cc4a', '#2a7e34'),
    btn_down: button('#a296f0', '#6658b8', '#3a3078', true),
    btn_off: button('#5a5470', '#3a3450', '#24203a'),
  };
}

// --- iconen 12x12 ---------------------------------------------------------------
const ICONS = {
  coin: [
    '....####....',
    '..##oooo##..',
    '.#ooyyyyoo#.',
    '.#oyyWyyyo#.',
    '#oyyWyyyyyo#',
    '#oyyWyyyyyo#',
    '#oyyWyyyyyo#',
    '#oyyyyyyyyo#',
    '.#oyyyyyyo#.',
    '.#ooyyyyoo#.',
    '..##oooo##..',
    '....####....',
  ],
  flame: [
    '.....#......',
    '....#r#.....',
    '....#rr#....',
    '...#rrr#.#..',
    '..#rroor##r#',
    '..#roooor#r#',
    '.#rooyyoorr#',
    '.#royyyyor#.',
    '.#royWWyor#.',
    '.#rooyyoor#.',
    '..#rroorr#..',
    '...######...',
  ],
  bolt: [
    '......####..',
    '.....#yyy#..',
    '....#yyy#...',
    '...#yyy#....',
    '..#yyyy####.',
    '.#yyyyyyyy#.',
    '.####yyyy#..',
    '....#yyy#...',
    '...#yyy#....',
    '..#yy##.....',
    '..#y#.......',
    '..##........',
  ],
  star: [
    '.....##.....',
    '.....#y#....',
    '....#yy#....',
    '#####yyy####',
    '#yyyyyWyyyy#',
    '.#yyyWWyyy#.',
    '..#yyyyyy#..',
    '..#yyyyyy#..',
    '.#yyy##yyy#.',
    '.#yy#..#yy#.',
    '#y##....##y#',
    '##........##',
  ],
  trophy: [
    '############',
    '#yyyWyyyyyy#',
    '#yyWyyyyyyy#',
    '#.#yyyyyy#.#',
    '#.#yyyyyy#.#',
    '.##yyyyyy##.',
    '...#yyyy#...',
    '....#yy#....',
    '....#yy#....',
    '...#oooo#...',
    '..#oooooo#..',
    '..########..',
  ],
  clock: [
    '...######...',
    '..#WWWWWW#..',
    '.#WWWW#WWW#.',
    '#WWWWW#WWWW#',
    '#WWWWW#WWWW#',
    '#WWWWW###WW#',
    '#WWWWWWWWWW#',
    '#WWWWWWWWWW#',
    '.#WWWWWWWW#.',
    '..#WWWWWW#..',
    '...######...',
    '............',
  ],
  check: [
    '............',
    '..........##',
    '.........#g#',
    '........#gg#',
    '.##....#gg#.',
    '#gg#..#gg#..',
    '#ggg##gg#...',
    '.#ggggg#....',
    '..#ggg#.....',
    '...###......',
    '............',
    '............',
  ],
  cross: [
    '............',
    '.##......##.',
    '#rr#....#rr#',
    '.#rr#..#rr#.',
    '..#rr##rr#..',
    '...#rrrr#...',
    '...#rrrr#...',
    '..#rr##rr#..',
    '.#rr#..#rr#.',
    '#rr#....#rr#',
    '.##......##.',
    '............',
  ],
  fullscreen: [
    '####....####',
    '#WW#....#WW#',
    '#W#......#W#',
    '##........##',
    '............',
    '............',
    '............',
    '............',
    '##........##',
    '#W#......#W#',
    '#WW#....#WW#',
    '####....####',
  ],
  fullscreen_exit: [
    '..#......#..',
    '..#W#..#W#..',
    '###W#..#W###',
    '#WWW#..#WWW#',
    '#####..#####',
    '............',
    '............',
    '#####..#####',
    '#WWW#..#WWW#',
    '###W#..#W###',
    '..#W#..#W#..',
    '..#......#..',
  ],
  sound: [
    '.....##.....',
    '....#W#..#..',
    '...#WW#...#.',
    '####WW#.#..#',
    '#WWWWW#..#.#',
    '#WWWWW#..#.#',
    '#WWWWW#..#.#',
    '####WW#.#..#',
    '...#WW#...#.',
    '....#W#..#..',
    '.....##.....',
    '............',
  ],
  mute: [
    '.....##.....',
    '....#W#.....',
    '...#WW#.....',
    '####WW#r...r',
    '#WWWWW#.r.r.',
    '#WWWWW#..r..',
    '#WWWWW#.r.r.',
    '####WW#r...r',
    '...#WW#.....',
    '....#W#.....',
    '.....##.....',
    '............',
  ],
  music: [
    '....########',
    '....#WWWWWW#',
    '....#W####W#',
    '....#W#..#W#',
    '....#W#..#W#',
    '....#W#..#W#',
    '..###W#.##W#',
    '.#WWWW##WWW#',
    '#WWWWW#WWWW#',
    '#WWWW#.#WW#.',
    '.####...##..',
    '............',
  ],
  lock: [
    '...######...',
    '..#WWWWWW#..',
    '..#W#..#W#..',
    '..#W#..#W#..',
    '.##########.',
    '.#yyyyyyyy#.',
    '.#yyyo#yyy#.',
    '.#yyy##yyy#.',
    '.#yyyy#yyy#.',
    '.#yyyyyyyy#.',
    '.##########.',
    '............',
  ],
  target: [
    '...######...',
    '..#rrrrrr#..',
    '.#rrWWWWrr#.',
    '#rrWWrrWWrr#',
    '#rWWrrrrWWr#',
    '#rWrrWWrrWr#',
    '#rWrrWWrrWr#',
    '#rWWrrrrWWr#',
    '#rrWWrrWWrr#',
    '.#rrWWWWrr#.',
    '..#rrrrrr#..',
    '...######...',
  ],
  sword: [
    '..........##',
    '.........#W#',
    '........#W#.',
    '.......#W#..',
    '......#W#...',
    '.....#W#....',
    '.##.#W#.....',
    '.#y#W#......',
    '..#y#.......',
    '.#o#y#......',
    '#o#.##......',
    '##..........',
  ],
  skull: [
    '...######...',
    '..#WWWWWW#..',
    '.#WWWWWWWW#.',
    '#WWWWWWWWWW#',
    '#WW##WW##WW#',
    '#WW##WW##WW#',
    '#WWWWWWWWWW#',
    '.#WWW##WWW#.',
    '..#WWWWWW#..',
    '..#W#W#W#...',
    '...#####....',
    '............',
  ],
  heart: [
    '............',
    '.###....###.',
    '#rWr#..#rrr#',
    '#rWrr##rrrr#',
    '#rrrrrrrrrr#',
    '#rrrrrrrrrr#',
    '.#rrrrrrrr#.',
    '..#rrrrrr#..',
    '...#rrrr#...',
    '....#rr#....',
    '.....##.....',
    '............',
  ],
  shield: [
    '..########..',
    '.#cccccccc#.',
    '#cWWcccccbc#',
    '#cWccccccbc#',
    '#cWccccccbc#',
    '#ccccccccbc#',
    '.#ccccccbc#.',
    '.#cccccbbc#.',
    '..#cccbbc#..',
    '...#cbbc#...',
    '....#cc#....',
    '.....##.....',
  ],
  enter: [
    '############',
    '#WWWWWWWWWW#',
    '#WWWWWWW#WW#',
    '#WWWWWWW#WW#',
    '#WW#WWWW#WW#',
    '#W##WWWW#WW#',
    '##########W#',
    '#W##WWWWWWW#',
    '#WW#WWWWWWW#',
    '#WWWWWWWWWW#',
    '#mmmmmmmmmm#',
    '############',
  ],
};
const ICON_MAP = {
  '#': OUTLINE, o: P.gold[1], y: P.gold[2], W: '#fff8ec', r: '#e8483f', g: '#5fd65a', m: '#a8a0c0', c: '#4fb0ff', b: '#2c6fd0',
};
const ICON_MAP_FLAME = { '#': OUTLINE, r: '#e0481e', o: '#ff9a2a', y: '#ffe66a', W: '#fffbe0' };

export function buildIcons() {
  const out = [];
  for (const [name, rows] of Object.entries(ICONS)) {
    const L = new Img(12, 12);
    L.pattern(rows, name === 'flame' ? ICON_MAP_FLAME : name === 'bolt' ? { ...ICON_MAP, y: '#8ff2ff' } : ICON_MAP, 0, 0);
    out.push({ name, img: L });
  }
  return out;
}
