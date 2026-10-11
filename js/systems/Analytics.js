// ---------------------------------------------------------------------------
// Analytics – anonieme tellingen via GoatCounter (meesterdanny.goatcounter.com).
//
// Geen cookies, geen persoonsgegevens, geen voortgang: alleen "dit gebeurde".
// Het telscript zelf staat in index.html (paginabezoeken). Hier sturen we
// extra seintjes (events) op een paar vaste momenten, allemaal onder
// "tafelrush/…" zodat ze in een gedeeld GoatCounter-account herkenbaar zijn.
// Lokaal (localhost) wordt niets geteld. Lukt het niet (offline, adblocker),
// dan gebeurt er niets en speelt de game gewoon door.
// ---------------------------------------------------------------------------

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.hostname.endsWith('.localhost') || location.hostname.endsWith('.test');
const RETRY = [1500, 4000, 10000];   // het telscript laadt los van de game (async)

function send(path, title, attempt = 0) {
  const gc = window.goatcounter;
  if (gc && typeof gc.count === 'function') {
    try { gc.count({ path: 'tafelrush/' + path, title: title || path, event: true }); } catch (e) { /* niet erg */ }
    return;
  }
  if (attempt < RETRY.length) setTimeout(() => send(path, title, attempt + 1), RETRY[attempt]);
}

export const Analytics = {
  /** Eén seintje, bijv. Analytics.event('run-gestart/training'). */
  event(path, title) {
    if (LOCAL) return;
    send(path, title);
  },

  /** Hoe is de game geopend: via een website (iframe), als app (beginscherm) of rechtstreeks. */
  opened(game) {
    let inFrame = false;
    try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
    const via = inFrame ? 'website' : game.isStandalone ? 'app' : 'rechtstreeks';
    this.event('geopend/' + via, 'Geopend via ' + via);
  },
};
