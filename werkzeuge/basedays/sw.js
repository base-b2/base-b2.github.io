/* BaseDays | Service Worker: Programmdateien offline bereithalten (installierbare App).
   Strategie "Netz zuerst" wie bei BaseBite: Mit Internet kommen die Dateien immer frisch vom Server,
   nur ohne Netz oder bei sehr langsamer Verbindung die gespeicherte Kopie.
   Speichert nur Programmdateien, keine Termine. Anfragen an Supabase (fremder Server) werden nicht angefasst.
   VERSION nur hochzählen, wenn neue Dateien in DATEIEN dazukommen. */
const VERSION = 'basedays-v1';
const DATEIEN = [
  './', './index.html', './app.css', './manifest.webmanifest',
  './js/app.js', './js/konfig.js', './js/supa.js', './js/daten.js', './js/demo.js', './js/ansichten.js',
  './js/datum.js', './js/termine.js', './js/wiederholung.js', './js/rechte.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
  '/assets/css/tokens.css', '/assets/css/base.css', '/assets/fonts/lexend.woff', '/assets/fonts/jetbrains-mono.woff',
  '/favicon.ico', '/favicon.svg',
];
const WARTEZEIT_MS = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(DATEIEN.map((u) => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('basedays-') && k !== VERSION) await caches.delete(k);
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
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // Supabase nicht anfassen
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
