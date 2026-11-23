/* BaseBite | Service Worker: App-Dateien offline bereithalten.
   Strategie "Netz zuerst": Mit Internet kommen die Dateien immer frisch vom Server (Änderungen wirken sofort,
   keine gemischten alten und neuen Dateien). Nur ohne Netz oder bei sehr langsamer Verbindung kommt die gespeicherte Kopie.
   Speichert nur Programmdateien (Cache Storage), keine persönlichen Daten.
   Anfragen an Open Food Facts gehen immer direkt ins Netz und werden hier nicht zwischengespeichert. */
const VERSION = 'basebite-v4';
const DATEIEN = [
  './', './index.html', './app.css', './manifest.webmanifest',
  './js/app.js', './js/db.js', './js/rechner.js', './js/off.js', './js/scanner.js', './js/diagramme.js', './js/export.js', './js/erinnerung.js', './js/auswertung.js',
  './vendor/zxing.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
  '/assets/css/tokens.css', '/assets/css/base.css', '/assets/fonts/lexend.woff', '/assets/fonts/jetbrains-mono.woff',
  '/favicon.ico', '/favicon.svg', '/apple-touch-icon.png',
];
const WARTEZEIT_MS = 4000;   // danach gilt das Netz als zu langsam und die gespeicherte Kopie wird verwendet

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(DATEIEN.map((u) => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();   // neue Fassung sofort aktiv, kein Warten auf geschlossene Fenster
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('basebite-') && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function netzMitFrist(req) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), WARTEZEIT_MS);
  try { return await fetch(req, { signal: ctrl.signal, cache: 'no-cache' }); } finally { clearTimeout(t); }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // fremde Server (Open Food Facts) nicht anfassen
  const navigation = e.request.mode === 'navigate';
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    try {
      const antwort = await netzMitFrist(e.request);
      if (antwort.ok) c.put(navigation ? './index.html' : e.request, antwort.clone());
      return antwort;
    } catch (fehler) {
      const kopie = navigation ? await c.match('./index.html') : await c.match(e.request, { ignoreSearch: true });
      if (kopie) return kopie;
      throw fehler;
    }
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
