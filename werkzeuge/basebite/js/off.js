/* BaseBite | Open Food Facts (einziger externer Dienst)
   Übertragen wird nur der Barcode bzw. das Suchwort (und technisch bedingt die IP-Adresse).
   Abgerufene Produkte landen im Zwischenspeicher off_cache und sind danach offline verfügbar. */
import { lsLies, speichere, speichereViele, perIndex, hole } from './db.js';
import { runde } from './rechner.js';

const BASIS = 'https://world.openfoodfacts.org';
const FELDER = 'code,product_name,product_name_de,generic_name_de,brands,nutriments,quantity,product_quantity,product_quantity_unit,serving_size,serving_quantity';
export const OFF_DATENSCHUTZ = 'https://world.openfoodfacts.org/privacy';
export const OFF_MITMACHEN = 'https://world.openfoodfacts.org/contribute';

export const nurOffline = () => lsLies('basebite.nurOffline') === '1';

async function abruf(url) {
  if (nurOffline()) throw new Error('offline-modus');
  if (navigator.onLine === false) throw new Error('kein-netz');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (r.status === 404) return null;
    if (r.status === 429) throw new Error('zu-viele');
    if (!r.ok) throw new Error('http-' + r.status);
    return await r.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('zeit');
    throw e;
  } finally { clearTimeout(t); }
}

const zahlOderNull = (x) => (x == null || x === '' || isNaN(Number(x)) ? null : runde(Number(x), 2));

/** Open-Food-Facts-Produkt in das BaseBite-Format umwandeln (Werte pro 100 g) */
export function wandle(p) {
  const n = p.nutriments || {};
  let kcal = n['energy-kcal_100g'];
  if (kcal == null && n.energy_100g != null) kcal = n.energy_100g / 4.184;   // kJ -> kcal
  const packung = Number(p.product_quantity) > 0 ? Number(p.product_quantity) : null;
  const portion = Number(p.serving_quantity) > 0 ? Number(p.serving_quantity) : null;
  return {
    id: 'off:' + p.code,
    quelle: 'off',
    barcode: String(p.code),
    name: (p.product_name_de || p.product_name || p.generic_name_de || '').trim() || 'Ohne Namen',
    marke: (p.brands || '').split(',')[0].trim(),
    kcal100: zahlOderNull(kcal),
    packung,
    portion,
    portionName: p.serving_size || '',
    einheitHinweis: p.product_quantity_unit === 'ml' ? 'ml' : '',
    eiweiss: zahlOderNull(n.proteins_100g),
    fett: zahlOderNull(n.fat_100g),
    kh: zahlOderNull(n.carbohydrates_100g),
    zucker: zahlOderNull(n.sugars_100g),
    ballast: zahlOderNull(n.fiber_100g),
    salz: zahlOderNull(n.salt_100g),
    abgerufen: new Date().toISOString(),
  };
}

/** Produkt per Barcode: erst lokal (eigene + Zwischenspeicher), dann Open Food Facts */
export async function produktPerBarcode(code) {
  code = String(code).replace(/\D/g, '');
  const eigen = await perIndex('lebensmittel', 'barcode', code);
  if (eigen.length) return { produkt: eigen[0], herkunft: 'eigen' };
  const cache = await hole('off_cache', 'off:' + code);
  if (cache) return { produkt: cache, herkunft: 'cache' };
  const j = await abruf(`${BASIS}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FELDER}`);
  if (!j || j.status !== 1 || !j.product) return { produkt: null, herkunft: 'off' };
  const p = wandle({ ...j.product, code });
  await speichere('off_cache', p);
  return { produkt: p, herkunft: 'off' };
}

/* Open Food Facts erlaubt ca. 10 Namenssuchen pro Minute. Darüber antwortet der Server ohne CORS-Freigabe,
   der Browser meldet dann nur "Failed to fetch". Deshalb bremst BaseBite selbst auf 8 pro Minute. */
const suchZeiten = [];
export function sucheMoeglichIn() {
  const jetzt = Date.now();
  while (suchZeiten.length && jetzt - suchZeiten[0] > 60000) suchZeiten.shift();
  return suchZeiten.length < 8 ? 0 : Math.ceil((60000 - (jetzt - suchZeiten[0])) / 1000);
}

/** Suche nach Namen in Open Food Facts. Ergebnisse mit kcal-Angabe werden zwischengespeichert. */
export async function suche(wort) {
  const warten = sucheMoeglichIn();
  if (warten) { const e = new Error('bremse'); e.sekunden = warten; throw e; }
  suchZeiten.push(Date.now());
  const q = new URLSearchParams({
    search_terms: wort, search_simple: '1', action: 'process', json: '1',
    page_size: '24', fields: FELDER, lc: 'de',   // kein sort_by: führt derzeit zu einer Antwort ohne CORS-Freigabe
  });
  const j = await abruf(`${BASIS}/cgi/search.pl?${q}`);
  const liste = ((j && j.products) || []).filter((p) => p.code).map(wandle).filter((p) => p.kcal100 != null);
  // vorhandene Favoriten/zuletzt-Werte nicht überschreiben
  const zusammen = [];
  for (const p of liste) {
    const alt = await hole('off_cache', p.id);
    zusammen.push(alt ? { ...p, favorit: alt.favorit, zuletzt: alt.zuletzt } : p);
  }
  await speichereViele('off_cache', zusammen);
  return zusammen;
}

/* Bei der Namenssuche antwortet Open Food Facts auf manche Suchwörter (oft solche ohne Treffer) und bei Überlastung
   mit einem Serverfehler ohne CORS-Freigabe. Der Browser sieht dann nur "keine Antwort" und kann die Fälle nicht
   unterscheiden. Die Meldung nennt deshalb beide Möglichkeiten. */
const TIPP_SUCHWORT = 'Vielleicht heißt das Produkt dort anders (kürzer suchen, Tippfehler prüfen oder Barcode scannen),';

export function fehlerText(e, art = 'suche') {
  const m = (e && e.message) || '';
  const tipp = art === 'suche' ? ` ${TIPP_SUCHWORT}` : '';
  if (m === 'offline-modus') return '"Nur offline" ist eingeschaltet. Es wurde nur in Ihren eigenen und gespeicherten Lebensmitteln gesucht.';
  if (m === 'kein-netz') return 'Keine Internetverbindung. Gesucht wurde nur auf diesem Gerät.';
  if (m === 'bremse') return `Open Food Facts erlaubt nur wenige Suchen pro Minute. Bitte ${e.sekunden} Sekunden warten.`;
  if (m === 'zu-viele' || m === 'zeit' || m.startsWith('http-') || e instanceof TypeError) {
    return art === 'suche'
      ? `Keine Treffer von Open Food Facts.${tipp} oder der Dienst ist kurz überlastet (in einer Minute erneut versuchen).`
      : 'Open Food Facts hat nicht geantwortet, vermutlich kurz überlastet. In einer Minute erneut versuchen oder das Produkt selbst anlegen.';
  }
  return art === 'suche' ? `Keine Treffer von Open Food Facts.${tipp} oder der Dienst ist nicht erreichbar.` : 'Open Food Facts ist gerade nicht erreichbar.';
}
