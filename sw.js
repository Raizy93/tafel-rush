// ---------------------------------------------------------------------------
// Service worker – maakt Tafel Rush offline speelbaar als web-app.
// Strategie "eerst netwerk, anders uit de cache": online krijg je altijd de
// nieuwste versie (updates komen vanzelf door), offline speel je verder met
// wat er de vorige keer is geladen. Bij het opstarten laadt de game al zijn
// bestanden (JS-modules, atlas.json, alle PNG's), dus na één keer online
// spelen staat alles in de cache.
// ---------------------------------------------------------------------------
const CACHE = 'tafel-rush-v1';
const CORE = ['./', './index.html', './css/style.css', './js/main.js', './manifest.webmanifest', './assets/atlas.json', './assets/app/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // oude caches opruimen
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))),
  );
});
