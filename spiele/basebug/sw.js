/* BaseBug | Service Worker: Netz zuerst, ohne Netz die gespeicherte Kopie (wie BaseDays). */
const VERSION = 'basebug-v2';
const DATEIEN = ['./', './index.html', './manifest.webmanifest', './app.css', './js/daten.js', './js/grafik.js', './js/stand.js', './js/ton.js', './js/spiel.js', './js/menue.js', '/assets/css/tokens.css',
  '/assets/fonts/lexend.woff', '/assets/fonts/jetbrains-mono.woff', '/favicon.ico', '/favicon.svg', '/favicon-192.png', '/favicon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil((async () => {
  const c = await caches.open(VERSION); await c.addAll(DATEIEN.map((u) => new Request(u, { cache: 'reload' }))); await self.skipWaiting(); })()); });
self.addEventListener('activate', (e) => { e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('basebug-') && k !== VERSION) await caches.delete(k);
  await self.clients.claim(); })()); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const nav = e.request.mode === 'navigate';
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    try { const a = await fetch(e.request, { cache: 'no-cache' }); if (a.ok) c.put(nav ? './index.html' : e.request, a.clone()); return a; }
    catch (f) { const k = nav ? await c.match('./index.html') : await c.match(e.request, { ignoreSearch: true }); if (k) return k; throw f; }
  })());
});
