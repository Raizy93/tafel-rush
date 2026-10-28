// ---------------------------------------------------------------------------
// Wereldkaart – waar alles ligt (logische pixels, 480x270).
// Gedeeld door de tekening (tools/art/worldmap.js: daar komen geen bomen op het
// pad of de plekken) en de game (js/scenes/WereldkaartScene.js).
//
//   nodes  plek per wereld (+ een geheimzinnig gebied in de mist)
//   path   tussenpunten van de vorige plek naar deze (de held loopt hierover)
// Een nieuwe wereld = hier een plek + pad erbij, en in data/worlds.js.
// ---------------------------------------------------------------------------

export const MAP_W = 480, MAP_H = 270;

export const MAP_NODES = [
  { id: 'greenwood', x: 92, y: 168, path: [] },
  { id: 'frostpeak', x: 222, y: 92, path: [[116, 152], [140, 142], [164, 130], [188, 110]] },
  { id: 'stormrijk', x: 352, y: 150, path: [[250, 100], [276, 114], [298, 138], [324, 152]] },
  // nog geen echte wereld: alleen een teaser in de mist
  { id: 'mist', x: 432, y: 54, teaser: true, path: [[378, 130], [394, 106], [408, 84], [420, 68]] },
];

/** Alle punten van het pad naar plek i (begint bij plek i-1). */
export function segmentPoints(i) {
  if (i <= 0) return [[MAP_NODES[0].x, MAP_NODES[0].y]];
  const a = MAP_NODES[i - 1], b = MAP_NODES[i];
  return [[a.x, a.y], ...b.path, [b.x, b.y]];
}

/** Hele pad als lijst van stukjes [[x0,y0],[x1,y1]] (voor de tekening). */
export function allSegments() {
  const out = [];
  for (let i = 1; i < MAP_NODES.length; i++) {
    const pts = segmentPoints(i);
    for (let k = 1; k < pts.length; k++) out.push([pts[k - 1], pts[k]]);
  }
  return out;
}

/** Afstand van een punt tot het pad (om er geen bomen op te zetten). */
export function distToPath(x, y) {
  let best = Infinity;
  for (const [[x0, y0], [x1, y1]] of allSegments()) {
    const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L));
    best = Math.min(best, Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)));
  }
  return best;
}

/** Punt op een pad (lijst punten) op fractie t (0..1), op afstand gemeten. */
export function pointAlong(pts, t) {
  const lens = [];
  let total = 0;
  for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); lens.push(l); total += l; }
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let k = 1; k < pts.length; k++) {
    if (d <= lens[k - 1] || k === pts.length - 1) {
      const f = lens[k - 1] ? Math.min(1, d / lens[k - 1]) : 1;
      return { x: pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, y: pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f, dx: pts[k][0] - pts[k - 1][0] };
    }
    d -= lens[k - 1];
  }
  const last = pts[pts.length - 1];
  return { x: last[0], y: last[1], dx: 0 };
}

export function pathLength(pts) {
  let total = 0;
  for (let k = 1; k < pts.length; k++) total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  return total;
}
