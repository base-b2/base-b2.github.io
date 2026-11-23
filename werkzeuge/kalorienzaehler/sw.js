/* BaseBite | Service Worker: App-Dateien offline bereithalten.
   Speichert nur Programmdateien (Cache Storage), keine persönlichen Daten.
   Anfragen an Open Food Facts gehen immer direkt ins Netz und werden hier nicht zwischengespeichert. */
const VERSION = 'basebite-v1';
const DATEIEN = [
  './', './index.html', './app.css', './manifest.webmanifest',
  './js/app.js', './js/db.js', './js/rechner.js', './js/off.js', './js/scanner.js', './js/diagramme.js', './js/export.js', './js/erinnerung.js',
  './vendor/zxing.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
  '/assets/css/tokens.css', '/assets/css/base.css', '/assets/fonts/lexend.woff', '/assets/fonts/jetbrains-mono.woff',
  '/favicon.ico', '/favicon.svg', '/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('basebite-') && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'weiter') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // fremde Server (Open Food Facts) nicht anfassen
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((r) => r || fetch(e.request)));
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const treffer = await c.match(e.request, { ignoreSearch: true });
    if (treffer) return treffer;
    return fetch(e.request);
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ziel = (e.notification.data && e.notification.data.ziel) || '#/';
  e.waitUntil((async () => {
    const fenster = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of fenster) if (f.url.includes('/kalorienzaehler/')) { await f.focus(); f.navigate(new URL('./' + ziel, self.registration.scope).href); return; }
    await self.clients.openWindow(new URL('./' + ziel, self.registration.scope).href);
  })());
});
