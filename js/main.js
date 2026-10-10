// ---------------------------------------------------------------------------
// Tafel Rush – opstarten.
// 1) profiel laden (lokaal)  2) assets laden met laadbalk  3) game starten.
// ---------------------------------------------------------------------------
import { Assets } from './core/Assets.js';
import { Game } from './core/Game.js';
import { AudioManager } from './audio/AudioManager.js';
import { ProfileService } from './storage/ProfileService.js';
import { createDefaultAdapter } from './storage/StorageAdapter.js';

const canvas = document.getElementById('game');

function drawLoading(p, msg = 'LADEN') {
  // simpele laadbalk vóór het font geladen is
  const ctx = canvas.getContext('2d');
  canvas.width = 480; canvas.height = 270;
  ctx.fillStyle = '#120c18';
  ctx.fillRect(0, 0, 480, 270);
  ctx.fillStyle = '#2c2048';
  ctx.fillRect(140, 132, 200, 8);
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(140, 132, Math.round(200 * p), 8);
  ctx.fillStyle = '#a8a0c8';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(msg, 240, 124);
}

async function boot() {
  canvas.style.width = '100%';
  drawLoading(0);
  const profile = new ProfileService(createDefaultAdapter());
  await profile.load();
  const assets = new Assets('');
  await assets.load(p => drawLoading(p));
  const audio = new AudioManager({ sfx: profile.settings.sfx, music: profile.settings.music });
  canvas.style.width = '';
  const game = new Game({ canvas, assets, profile, audio });
  window.tafelRush = game; // handig voor debuggen in de console
  game.start();
  setupWebApp();
  // geopend via een voortgangs-QR/link? Dan meteen aanbieden (na bevestiging) en
  // de code uit de adresbalk halen, zodat hij niet blijft staan of opnieuw start.
  if (location.hash.startsWith('#voortgang=')) {
    const code = location.hash.slice(1);
    history.replaceState(null, '', location.pathname + location.search);
    game.openProgress(code);
  }
}

/** Web-app: offline spelen (service worker) en vragen of de opslag blijvend mag zijn
 *  (Safari kan anders na een tijdje gegevens van websites opruimen). */
function setupWebApp() {
  const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

boot().catch(err => {
  console.error(err);
  drawLoading(0, 'FOUT BIJ LADEN: ' + err.message);
});
