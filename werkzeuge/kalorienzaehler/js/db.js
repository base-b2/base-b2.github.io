/* BaseBite | lokale Datenbank (IndexedDB) und Einstellungen (localStorage)
   Alles bleibt auf dem Gerät. Die Beschreibung in SPEICHER wird 1:1 auf der Seite "Ihre Daten" angezeigt. */

const DB_NAME = 'basebite';
const DB_VERSION = 1;

/** Alles, was BaseBite speichert. Quelle für die Tabelle auf "Ihre Daten". */
export const SPEICHER = [
  { was: 'Eigene Lebensmittel', wo: 'IndexedDB', name: 'basebite → lebensmittel', zweck: 'Selbst angelegte Lebensmittel mit Nährwerten, Favoriten, zuletzt verwendet' },
  { was: 'Zwischengespeicherte Produkte', wo: 'IndexedDB', name: 'basebite → off_cache', zweck: 'Produkte, die von Open Food Facts abgerufen wurden, damit sie offline wieder verfügbar sind' },
  { was: 'Rezepte', wo: 'IndexedDB', name: 'basebite → rezepte', zweck: 'Rezepte mit Zutaten, Gesamtgewicht und Portionen' },
  { was: 'Tagebuch', wo: 'IndexedDB', name: 'basebite → tagebuch', zweck: 'Was Sie wann gegessen haben (Menge, kcal, Nährwerte)' },
  { was: 'Gewicht', wo: 'IndexedDB', name: 'basebite → gewicht', zweck: 'Ihr Gewicht pro Tag für Verlauf und Prognose' },
  { was: 'Wasser', wo: 'IndexedDB', name: 'basebite → wasser', zweck: 'Getrunkene Gläser pro Tag' },
  { was: 'Profil und Ziele', wo: 'IndexedDB', name: 'basebite → profil', zweck: 'Geschlecht, Alter, Größe, Gewicht, Aktivität, Ziele, Makro- und Wasserziel' },
  { was: 'Dunkelmodus', wo: 'localStorage', name: 'basebite.thema', zweck: 'Ob die App hell oder dunkel angezeigt wird' },
  { was: 'Erinnerungen', wo: 'localStorage', name: 'basebite.erinnerungen', zweck: 'Ein/aus, Uhrzeiten und wann zuletzt erinnert wurde' },
  { was: 'Nur offline', wo: 'localStorage', name: 'basebite.nurOffline', zweck: 'Ob Abfragen an Open Food Facts abgeschaltet sind' },
  { was: 'Erststart-Hinweis', wo: 'localStorage', name: 'basebite.erststart', zweck: 'Datum, an dem Sie den Hinweis beim ersten Start bestätigt haben' },
  { was: 'App-Dateien', wo: 'Cache Storage', name: 'basebite-v + Versionsnummer', zweck: 'HTML, CSS, JavaScript, Schriften und Icons, damit die App offline startet (keine persönlichen Daten)' },
];

export const STORES = ['lebensmittel', 'off_cache', 'rezepte', 'tagebuch', 'gewicht', 'wasser', 'profil'];

let verbindung = null;

export function oeffne() {
  if (verbindung) return verbindung;
  verbindung = new Promise((ok, fehler) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('lebensmittel')) db.createObjectStore('lebensmittel', { keyPath: 'id' }).createIndex('barcode', 'barcode');
      if (!db.objectStoreNames.contains('off_cache')) db.createObjectStore('off_cache', { keyPath: 'id' }).createIndex('barcode', 'barcode');
      if (!db.objectStoreNames.contains('rezepte')) db.createObjectStore('rezepte', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('tagebuch')) db.createObjectStore('tagebuch', { keyPath: 'id' }).createIndex('datum', 'datum');
      if (!db.objectStoreNames.contains('gewicht')) db.createObjectStore('gewicht', { keyPath: 'datum' });
      if (!db.objectStoreNames.contains('wasser')) db.createObjectStore('wasser', { keyPath: 'datum' });
      if (!db.objectStoreNames.contains('profil')) db.createObjectStore('profil', { keyPath: 'id' });
    };
    r.onsuccess = () => {
      r.result.onversionchange = () => { r.result.close(); verbindung = null; };
      ok(r.result);
    };
    r.onerror = () => { verbindung = null; fehler(r.error); };
    r.onblocked = () => fehler(new Error('Datenbank ist in einem anderen Fenster geöffnet.'));
  });
  return verbindung;
}

function anfrage(req) {
  return new Promise((ok, fehler) => { req.onsuccess = () => ok(req.result); req.onerror = () => fehler(req.error); });
}

async function mitStore(store, modus, fn) {
  const db = await oeffne();
  const tx = db.transaction(store, modus);
  const ergebnis = await fn(tx.objectStore(store));
  await new Promise((ok, fehler) => { tx.oncomplete = ok; tx.onerror = () => fehler(tx.error); tx.onabort = () => fehler(tx.error); });
  return ergebnis;
}

export const alle = (store) => mitStore(store, 'readonly', (s) => anfrage(s.getAll()));
export const hole = (store, key) => mitStore(store, 'readonly', (s) => anfrage(s.get(key)));
export const perIndex = (store, index, wert) => mitStore(store, 'readonly', (s) => anfrage(s.index(index).getAll(wert)));
export const speichere = (store, obj) => mitStore(store, 'readwrite', (s) => anfrage(s.put(obj)));
export const loesche = (store, key) => mitStore(store, 'readwrite', (s) => anfrage(s.delete(key)));
export const bereich = (store, index, von, bis) =>
  mitStore(store, 'readonly', (s) => anfrage((index ? s.index(index) : s).getAll(IDBKeyRange.bound(von, bis))));

export async function speichereViele(store, liste) {
  if (!liste.length) return;
  await mitStore(store, 'readwrite', (s) => Promise.all(liste.map((o) => anfrage(s.put(o)))));
}

export const neueId = (praefix) => `${praefix}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ---------- Profil ---------- */
export const PROFIL_STANDARD = {
  id: 'profil', geschlecht: '', alter: null, groesse: null, gewicht: null, aktivitaet: 'leicht',
  ziel: 'halten', tempo: 0.5, zielgewicht: null, kcalManuell: null,
  makro: { eiweiss: 20, fett: 30, kh: 50 }, wasserZiel: 8, glasMl: 250,
};
export async function profil() {
  const p = await hole('profil', 'profil');
  return { ...PROFIL_STANDARD, ...(p || {}), makro: { ...PROFIL_STANDARD.makro, ...((p && p.makro) || {}) } };
}

/* ---------- Sicherung ---------- */
export async function exportiere() {
  const daten = {};
  for (const s of STORES) daten[s] = await alle(s);
  return {
    app: 'BaseBite', herausgeber: 'Base B', format: 1, exportiert: new Date().toISOString(),
    einstellungen: einstellungenFuerExport(), daten,
  };
}

export async function importiere(sicherung, ersetzen) {
  if (!sicherung || sicherung.app !== 'BaseBite' || !sicherung.daten) throw new Error('Das ist keine BaseBite-Sicherung.');
  const db = await oeffne();
  const stores = STORES.filter((s) => Array.isArray(sicherung.daten[s]));
  const tx = db.transaction(stores, 'readwrite');
  let anzahl = 0;
  for (const s of stores) {
    const st = tx.objectStore(s);
    if (ersetzen) st.clear();
    for (const o of sicherung.daten[s]) { st.put(o); anzahl++; }
  }
  await new Promise((ok, fehler) => { tx.oncomplete = ok; tx.onerror = () => fehler(tx.error); tx.onabort = () => fehler(tx.error); });
  if (sicherung.einstellungen) einstellungenAusImport(sicherung.einstellungen);
  return anzahl;
}

/** Löscht die gesamte Datenbank, alle Einstellungen und den App-Cache */
export async function allesLoeschen() {
  if (verbindung) { (await verbindung).close(); verbindung = null; }
  await new Promise((ok, fehler) => {
    const r = indexedDB.deleteDatabase(DB_NAME);
    r.onsuccess = ok; r.onerror = () => fehler(r.error); r.onblocked = ok;
  });
  LS_SCHLUESSEL.forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* nicht verfügbar */ } });
  if (self.caches) {
    for (const k of await caches.keys()) if (k.startsWith('basebite-')) await caches.delete(k);
  }
}

/* ---------- Einstellungen im localStorage (immer in try/catch) ---------- */
const LS_SCHLUESSEL = ['basebite.thema', 'basebite.erinnerungen', 'basebite.nurOffline', 'basebite.erststart'];
export function lsLies(k, standard = null) {
  try { const v = localStorage.getItem(k); return v == null ? standard : v; } catch (e) { return standard; }
}
export function lsSchreib(k, v) {
  try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nicht verfügbar */ }
}
function einstellungenFuerExport() {
  const e = {};
  LS_SCHLUESSEL.filter((k) => k !== 'basebite.erststart').forEach((k) => { const v = lsLies(k); if (v != null) e[k] = v; });
  return e;
}
function einstellungenAusImport(e) {
  Object.entries(e).forEach(([k, v]) => { if (LS_SCHLUESSEL.includes(k) && typeof v === 'string') lsSchreib(k, v); });
}
