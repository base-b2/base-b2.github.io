/* BaseBite | Kalorienzähler von Base B
   Oberfläche, Navigation und Ansichten. Alle Daten bleiben lokal (siehe db.js). */
import * as db from './db.js';
import * as R from './rechner.js';
import * as off from './off.js';
import * as scanner from './scanner.js';
import * as dia from './diagramme.js';
import * as ex from './export.js';
import * as erin from './erinnerung.js';
import * as aw from './auswertung.js';

export const VERSION = '1.2.0';

/* ====================================================================== Hilfen */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { zahl, dez, lies } = R;
const nativ = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

const ICONS = {
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  links: '<polyline points="15,6 9,12 15,18"/>',
  rechts: '<polyline points="9,6 15,12 9,18"/>',
  buch: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  suche: '<circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="20.5" y2="20.5"/>',
  verlauf: '<polyline points="3.5,17 9,11 13,14.5 20.5,6.5"/><polyline points="15,6.5 20.5,6.5 20.5,12"/>',
  ziel: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8"/><path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8"/><path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16"/><path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><line x1="8" y1="8" x2="8" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/><line x1="14" y1="8" x2="14" y2="16"/><line x1="16.5" y1="8" x2="16.5" y2="16"/>',
  stern: '<polygon points="12,3.5 14.6,9 20.5,9.6 16,13.6 17.3,19.5 12,16.5 6.7,19.5 8,13.6 3.5,9.6 9.4,9"/>',
  stift: '<path d="M15.5 4.5l4 4L8 20H4v-4z"/><line x1="13" y1="7" x2="17" y2="11"/>',
  muell: '<polyline points="4,7 20,7"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/>',
  kopie: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  hoch: '<polyline points="6,15 12,9 18,15"/>',
  runter: '<polyline points="6,9 12,15 18,9"/>',
  menue: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
  schliessen: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  mond: '<path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z"/>',
  sonne: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="21.5" y2="12"/><line x1="5.3" y1="5.3" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="18.7" y2="18.7"/><line x1="5.3" y1="18.7" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="18.7" y2="5.3"/>',
  schloss: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  glocke: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  topf: '<path d="M4.5 10h15v6.5a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z"/><line x1="2.5" y1="10" x2="21.5" y2="10"/><path d="M9 6.5c0-1 1-1 1-2M14 6.5c0-1 1-1 1-2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.8" fill="currentColor"/>',
  speichern: '<line x1="12" y1="4" x2="12" y2="15"/><polyline points="7.5,10.5 12,15 16.5,10.5"/><line x1="4.5" y1="19.5" x2="19.5" y2="19.5"/>',
  upload: '<line x1="12" y1="15" x2="12" y2="4"/><polyline points="7.5,8.5 12,4 16.5,8.5"/><line x1="4.5" y1="19.5" x2="19.5" y2="19.5"/>',
  warnung: '<path d="M12 4l9 16H3z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/>',
  extern: '<path d="M14 4.5h5.5V10"/><line x1="19.5" y1="4.5" x2="11" y2="13"/><path d="M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10"/>',
};
const icon = (n, g = 22, klasse = '') => `<svg${klasse ? ` class="${klasse}"` : ''} width="${g}" height="${g}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- Datum ---------- */
const TAGE = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
const TAGE_LANG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const p2 = (n) => String(n).padStart(2, '0');
const isoLokal = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const heute = () => isoLokal(new Date());
const alsDatum = (iso) => new Date(iso + 'T12:00:00');
const plusTage = (iso, n) => { const d = alsDatum(iso); d.setDate(d.getDate() + n); return isoLokal(d); };
const kurz = (iso) => { const d = alsDatum(iso); return `${TAGE[d.getDay()]}, ${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`; };
const tagName = (iso) => {
  if (iso === heute()) return 'Heute';
  if (iso === plusTage(heute(), -1)) return 'Gestern';
  if (iso === plusTage(heute(), 1)) return 'Morgen';
  return TAGE_LANG[alsDatum(iso).getDay()];
};

/* Mahlzeiten und Anzeige kommen aus den Einstellungen (Menü → Einstellungen) */
let EIN = { ...db.EINSTELLUNGEN_STANDARD };
let MAHLZEITEN = db.MAHLZEITEN_STANDARD;   // alle, auch ausgeblendete, in der gewählten Reihenfolge
const sichtbareMahlzeiten = () => MAHLZEITEN.filter((m) => m.sichtbar);
async function ladeEinstellungen() {
  try { EIN = await db.einstellungen(); } catch (e) { EIN = { ...db.EINSTELLUNGEN_STANDARD }; }
  MAHLZEITEN = EIN.mahlzeiten;
}
const mahlzeitName = (k) => (MAHLZEITEN.find((m) => m.k === k) || { n: 'Ohne Mahlzeit' }).n;
function mahlzeitJetzt() {
  const h = new Date().getHours();
  const passend = h < 10 ? 'fruehstueck' : h < 14 ? 'mittag' : h >= 17 && h < 21 ? 'abend' : 'snacks';
  const s = sichtbareMahlzeiten();
  return s.some((m) => m.k === passend) ? passend : (s[0] || MAHLZEITEN[0]).k;
}
/** Auswahlliste der Mahlzeiten: sichtbare, dazu die gerade gewählte, falls sie ausgeblendet ist */
const mahlzeitOptionen = (gewaehlt) => MAHLZEITEN.filter((m) => m.sichtbar || m.k === gewaehlt)
  .map((m) => `<option value="${esc(m.k)}"${m.k === gewaehlt ? ' selected' : ''}>${esc(m.n)}</option>`).join('');
/** Aus Verlauf und Vorschlägen entfernt? Gilt, bis das Lebensmittel danach wieder eingetragen wird. */
const nichtAusgeblendet = (g) => {
  const t = EIN.verlaufAusgeblendet[g.key];
  const e = g.letzterGesamt || g.letzter;
  return !t || (e.erstellt || e.datum) > t;
};

/* ---------- Meldungen ---------- */
let meldungTimer;
function meldung(text, art = 'ok', aktion) {
  const m = $('#meldung');
  m.className = 'meldung meldung-' + art;
  m.innerHTML = `<span>${art === 'fehler' ? '✗ ' : art === 'ok' ? '✓ ' : ''}${esc(text)}</span>`;
  if (aktion) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'meldung-knopf'; b.textContent = aktion.text;
    b.onclick = () => { m.hidden = true; aktion.fn(); };
    m.appendChild(b);
  }
  m.hidden = false;
  clearTimeout(meldungTimer);
  meldungTimer = setTimeout(() => { m.hidden = true; }, aktion ? 8000 : 3500);
}

/* ---------- Dialog ---------- */
const dlg = () => $('#dialog');
function oeffneDialog(html, { titel, breit } = {}) {
  const d = dlg();
  d.className = breit ? 'dlg dlg-breit' : 'dlg';
  d.innerHTML = `<div class="dlg-kopf"><h2 id="dlg-titel">${esc(titel || '')}</h2><button type="button" class="symbol-knopf" data-schliessen aria-label="Schließen">${icon('schliessen')}</button></div><div class="dlg-inhalt">${html}</div>`;
  d.setAttribute('aria-labelledby', 'dlg-titel');
  $$('[data-schliessen]', d).forEach((b) => { b.onclick = () => schliesseDialog(); });
  if (!d.open) d.showModal();
  return d;
}
function schliesseDialog() {
  scanner.stoppe();
  if (dlg().open) dlg().close();
}
function bestaetige(text, { titel = 'Sicher?', ja = 'Ja', gefahr = false } = {}) {
  return new Promise((ok) => {
    const d = oeffneDialog(`<p>${text}</p><div class="knopfzeile"><button type="button" class="knopf ${gefahr ? 'knopf-gefahr' : ''}" id="dlg-ja">${esc(ja)}</button><button type="button" class="knopf knopf-zwei" id="dlg-nein">Abbrechen</button></div>`, { titel });
    let fertig = false;
    const ende = (w) => { if (fertig) return; fertig = true; schliesseDialog(); ok(w); };
    $('#dlg-ja', d).onclick = () => ende(true);
    $('#dlg-nein', d).onclick = () => ende(false);
    d.addEventListener('close', () => ende(false), { once: true });
  });
}

/* ---------- Bit-Figur (Pixel-Szenen für leere Zustände) ---------- */
const BIT = `<g class="bit-figur"><rect x="0" y="0" width="12" height="24"/><rect x="0" y="24" width="48" height="36"/>
<rect x="12" y="60" width="6" height="12"/><rect x="30" y="60" width="6" height="12"/>
<rect x="12" y="72" width="12" height="6"/><rect x="30" y="72" width="12" height="6"/>
<g class="bit-augen"><rect x="12" y="30" width="12" height="12" class="bit-weiss"/><rect x="30" y="30" width="12" height="12" class="bit-weiss"/>
<rect x="18" y="36" width="6" height="6"/><rect x="36" y="36" width="6" height="6"/></g>
<rect x="24" y="12" width="24" height="6" class="bit-cursor"/></g>`;
const SZENEN = {
  teller: { label: 'Bit-Figur steht neben einem leeren Teller', svg: `<g transform="translate(10,12)">${BIT}</g>
<g class="bit-ding"><rect x="84" y="78" width="96" height="6"/><rect x="96" y="84" width="72" height="6"/></g>
<g class="bit-akzent"><rect x="186" y="54" width="6" height="30"/><rect x="180" y="48" width="6" height="12"/><rect x="192" y="48" width="6" height="12"/></g>
<line x1="0" y1="90" x2="220" y2="90" class="bit-boden"/>` },
  lupe: { label: 'Bit-Figur sucht mit einer Lupe', svg: `<g transform="translate(10,12)">${BIT}</g>
<g class="bit-ding"><rect x="108" y="30" width="30" height="6"/><rect x="108" y="60" width="30" height="6"/><rect x="102" y="36" width="6" height="24"/><rect x="138" y="36" width="6" height="24"/>
<rect x="144" y="66" width="6" height="6"/><rect x="150" y="72" width="6" height="6"/><rect x="156" y="78" width="6" height="6"/></g>
<line x1="0" y1="90" x2="220" y2="90" class="bit-boden"/>` },
  waage: { label: 'Bit-Figur wartet neben einer Waage', svg: `<g transform="translate(10,12)">${BIT}</g>
<g class="bit-ding"><rect x="96" y="78" width="84" height="12"/></g>
<g class="bit-akzent"><rect x="126" y="82" width="24" height="4"/></g>
<line x1="0" y1="90" x2="220" y2="90" class="bit-boden"/>` },
};
const szene = (art) => `<svg class="bit-szene" viewBox="0 0 220 96" width="220" height="96" shape-rendering="crispEdges" role="img" aria-label="${SZENEN[art].label}">${SZENEN[art].svg}</svg>`;
const leer = (art, titel, text) => `<div class="leer">${szene(art)}<div><p class="leer-titel">${esc(titel)}</p><p class="leer-text">${text}</p></div></div>`;

/* ====================================================================== Thema */
function setzeThema(t) {
  if (t === 'dunkel') document.documentElement.setAttribute('data-theme', 'dunkel');
  else document.documentElement.removeAttribute('data-theme');
  db.lsSchreib('basebite.thema', t === 'dunkel' ? 'dunkel' : null);
  const k = $('#thema-knopf');
  if (k) {
    k.setAttribute('aria-pressed', t === 'dunkel' ? 'true' : 'false');
    k.setAttribute('aria-label', t === 'dunkel' ? 'Hellen Modus einschalten' : 'Dunkelmodus einschalten');
    k.innerHTML = icon(t === 'dunkel' ? 'sonne' : 'mond');
  }
  $('meta[name="theme-color"]').setAttribute('content', t === 'dunkel' ? '#24272E' : '#1C2E4A');
  if (nativ() && window.Capacitor.Plugins.StatusBar) {
    window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: t === 'dunkel' ? '#24272E' : '#1C2E4A' }).catch(() => {});
  }
}

/* ====================================================================== Profil und Ziel */
async function zielDaten() {
  const p = await db.profil();
  const v = R.zielVorschlag(p);
  const kcal = p.kcalManuell || (v && v.vorschlag) || null;
  return { profil: p, vorschlag: v, kcal, makro: kcal ? R.makroGramm(kcal, p.makro) : null };
}

/* ====================================================================== Router */
const ROUTEN = [
  [/^\/?$/, () => tagebuch(heute())],
  [/^\/tag\/(\d{4}-\d{2}-\d{2})$/, (m) => tagebuch(m[1])],
  [/^\/suche$/, (m, q) => suche(q)],
  [/^\/lebensmittel\/neu$/, (m, q) => lebensmittelFormular(null, q)],
  [/^\/lebensmittel\/(.+)$/, (m, q) => lebensmittelFormular(decodeURIComponent(m[1]), q)],
  [/^\/rezepte$/, () => rezepte()],
  [/^\/rezept\/(.+)$/, (m) => rezeptAnsicht(decodeURIComponent(m[1]))],
  [/^\/verlauf$/, () => verlauf()],
  [/^\/auswertung$/, () => auswertung()],
  [/^\/einstellungen$/, () => einstellungenSeite()],
  [/^\/ziele$/, () => ziele()],
  [/^\/erinnerungen$/, () => erinnerungen()],
  [/^\/daten$/, () => ihreDaten()],
  [/^\/info$/, () => info()],
];

async function route() {
  schliesseDialog();
  schliesseMenue();
  const roh = location.hash.replace(/^#/, '') || '/';
  const [pfad, qs] = roh.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  const main = $('#ansicht');
  for (const [re, fn] of ROUTEN) {
    const m = pfad.match(re);
    if (m) {
      try { await fn(m, q); } catch (e) {
        console.error(e);
        main.innerHTML = `<div class="huelle"><p class="fehlermeldung">✗ Hier ist etwas schiefgegangen: ${esc(e.message)}</p></div>`;
      }
      const reiter = pfad.startsWith('/suche') || pfad.startsWith('/lebensmittel') || pfad.startsWith('/rezept') ? 'suche'
        : pfad.startsWith('/verlauf') ? 'verlauf' : pfad.startsWith('/ziele') ? 'ziele' : pfad.startsWith('/auswertung') ? 'auswertung'
          : pfad === '/' || pfad === '' || pfad.startsWith('/tag') ? 'tagebuch' : '';
      $$('.app-navi a').forEach((a) => (a.dataset.navi === reiter ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      return;
    }
  }
  location.hash = '#/';
}
const geheZu = (h) => { if (location.hash === h) route(); else location.hash = h; };

/* ====================================================================== Tagebuch */
let wasserSperre = false;
async function tagebuch(datum) {
  const [eintraege, ziel, wasser, umfeld] = await Promise.all([
    db.perIndex('tagebuch', 'datum', datum), zielDaten(), db.hole('wasser', datum),
    db.bereich('tagebuch', 'datum', plusTage(datum, -42), datum)]);
  // Abschnitte: sichtbare Mahlzeiten, ausgeblendete nur, wenn an diesem Tag etwas darin steht, unbekannte als "Ohne Mahlzeit"
  const abschnitte = MAHLZEITEN.filter((m) => m.sichtbar || eintraege.some((e) => e.mahlzeit === m.k));
  for (const k of new Set(eintraege.map((e) => e.mahlzeit))) if (!MAHLZEITEN.some((m) => m.k === k)) abschnitte.push({ k, n: 'Ohne Mahlzeit', sichtbar: true });
  const tipps = Object.fromEntries(abschnitte.map((m) => [m.k, EIN.zeigeTipps && m.sichtbar
    ? aw.vorschlaege(umfeld, { mahlzeit: m.k, datum, max: 6 }).filter((g) => g.beiMahlzeit > 0 && nichtAusgeblendet(g)).slice(0, 3) : []]));
  eintraege.sort((a, b) => (a.erstellt || '').localeCompare(b.erstellt || ''));
  const summe = { kcal: 0, eiweiss: 0, fett: 0, kh: 0 };
  for (const e of eintraege) for (const k of Object.keys(summe)) summe[k] += Number(e[k]) || 0;
  const z = ziel.kcal;
  const uebrig = z ? z - summe.kcal : null;
  const anteil = z ? Math.min(100, (summe.kcal / z) * 100) : 0;

  const makroZeile = (k, name) => {
    const ist = summe[k], soll = ziel.makro ? ziel.makro[k] : null;
    const pz = soll ? Math.min(100, (ist / soll) * 100) : 0;
    return `<div class="makro"><div class="makro-kopf"><span>${name}</span><span class="mono">${dez(ist, 0)}${soll ? ` / ${zahl(soll)}` : ''} g</span></div>
<div class="balken" role="img" aria-label="${name}: ${dez(ist, 0)} von ${soll ? zahl(soll) : 'unbekannt'} Gramm"><span class="balken-fuell balken-${k}" style="width:${pz}%"></span></div></div>`;
  };

  const glaeser = (wasser && wasser.glaeser) || 0;
  const wz = ziel.profil.wasserZiel || 8;
  const anzahlKnopf = Math.max(wz, glaeser + 1);
  let glasHtml = '';
  for (let i = 0; i < anzahlKnopf; i++) {
    glasHtml += `<button type="button" class="glas${i < glaeser ? ' voll' : ''}${i >= wz ? ' extra' : ''}" data-glas="${i + 1}" aria-label="${i < glaeser ? `Glas ${i + 1} von ${wz}, getrunken. Tippen zum Zurücksetzen auf ${i}` : `Glas ${i + 1} trinken`}" aria-pressed="${i < glaeser}">
<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path class="glas-rand" d="M6 4h12l-1.5 16h-9z"/><path class="glas-wasser" d="M7.2 10h9.6l-1 9h-7.6z"/></svg></button>`;
  }

  const mahlzeitenHtml = abschnitte.map((m) => {
    const liste = eintraege.filter((e) => e.mahlzeit === m.k);
    const kc = liste.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
    return `<section class="mahlzeit" aria-labelledby="mz-${esc(m.k)}">
<div class="mahlzeit-kopf"><h3 id="mz-${esc(m.k)}">${esc(m.n)}${m.sichtbar ? '' : ' <span class="klein">(ausgeblendet)</span>'}</h3><span class="mono mahlzeit-summe">${zahl(kc)} kcal</span></div>
${liste.length ? `<ul class="eintraege">${liste.map((e) => `<li><button type="button" class="eintrag" data-eintrag="${esc(e.id)}">
<span class="eintrag-name">${esc(e.name)}${e.marke ? `<span class="eintrag-marke">${esc(e.marke)}</span>` : ''}</span>
<span class="eintrag-menge mono">${esc(e.einheitText || dez(e.menge, 1) + ' g')}</span><span class="eintrag-kcal mono">${zahl(e.kcal)}</span></button></li>`).join('')}</ul>` : ''}
${tipps[m.k].length ? `<div class="tipps" role="group" aria-label="Häufig zu ${esc(m.n)}, sofort eintragen">${tipps[m.k].map((g) => `<button type="button" class="tipp" data-tipp="${esc(m.k)}|${esc(g.key)}" aria-label="${esc(g.name)}, ${esc(g.letzter.einheitText || dez(g.letzter.menge, 1) + ' g')}, sofort zu ${esc(m.n)} eintragen">${icon('plus', 16)}<span class="tipp-name">${esc(g.name)}</span><span class="mono tipp-menge">${esc(g.letzter.einheitText || dez(g.letzter.menge, 1) + ' g')}</span></button>`).join('')}</div>` : ''}
${m.sichtbar && MAHLZEITEN.some((x) => x.k === m.k) ? `<a class="hinzu" href="#/suche?mahlzeit=${encodeURIComponent(m.k)}&datum=${datum}">${icon('plus', 20)}Hinzufügen</a>` : ''}
</section>`;
  }).join('');

  $('#ansicht').innerHTML = `<div class="huelle">
<div class="tag-navi">
<a class="symbol-knopf" href="#/tag/${plusTage(datum, -1)}" aria-label="Vorheriger Tag">${icon('links')}</a>
<label class="tag-titel"><span class="tag-name">${tagName(datum)}</span><span class="mono tag-datum">${kurz(datum)}</span>
<input type="date" id="tag-wahl" value="${datum}" aria-label="Datum wählen"></label>
<a class="symbol-knopf" href="#/tag/${plusTage(datum, 1)}" aria-label="Nächster Tag">${icon('rechts')}</a>
</div>
${datum !== heute() ? `<p class="zentriert"><a href="#/">Zu heute springen</a></p>` : ''}
${$('#verpasst-vorlage') ? $('#verpasst-vorlage').innerHTML : ''}
<section class="karte uebersicht" aria-label="Tagesübersicht">
<div class="drei">
<div><span class="etikett">Gegessen</span><span class="gross mono">${zahl(summe.kcal)}</span></div>
<div><span class="etikett">Ziel</span><span class="gross mono">${z ? zahl(z) : '-'}</span></div>
<div><span class="etikett">${uebrig != null && uebrig < 0 ? 'Darüber' : 'Übrig'}</span><span class="gross mono${uebrig != null && uebrig < 0 ? ' ueber' : ''}">${uebrig == null ? '-' : zahl(Math.abs(uebrig))}</span></div>
</div>
<div class="balken balken-gross" role="img" aria-label="${zahl(summe.kcal)} von ${z ? zahl(z) : 'unbekannt'} kcal"><span class="balken-fuell${uebrig != null && uebrig < 0 ? ' balken-ueber' : ''}" style="width:${anteil}%"></span></div>
${z ? '' : `<p class="klein">Noch kein Tagesziel. <a href="#/ziele">Ziel festlegen</a></p>`}
${EIN.zeigeMakros ? `<div class="makros">${makroZeile('eiweiss', 'Eiweiß')}${makroZeile('fett', 'Fett')}${makroZeile('kh', 'Kohlenhydrate')}</div>` : ''}
</section>
${EIN.zeigeWasser ? `<section class="karte wasser" aria-labelledby="wasser-titel">
<div class="mahlzeit-kopf"><h3 id="wasser-titel">Wasser</h3><span class="mono">${glaeser} / ${wz} Gläser | ${dez((glaeser * (ziel.profil.glasMl || 250)) / 1000, 2)} l</span></div>
<div class="glaeser">${glasHtml}</div>
</section>` : ''}
${eintraege.length ? '' : leer('teller', 'Leerer Teller.', 'Entweder ein Fastentag oder noch nichts eingetragen. Tippen Sie bei einer Mahlzeit auf Hinzufügen.')}
${mahlzeitenHtml}
</div>`;

  $('#tag-wahl').onchange = (e) => { if (e.target.value) geheZu('#/tag/' + e.target.value); };
  $$('[data-glas]').forEach((b) => {
    b.onclick = async () => {
      if (wasserSperre) return;
      wasserSperre = true;
      const n = Number(b.dataset.glas);
      const neu = n === glaeser ? n - 1 : n;
      await db.speichere('wasser', { datum, glaeser: Math.max(0, neu) });
      wasserSperre = false;
      await tagebuch(datum);
      const f = $(`[data-glas="${Math.max(1, neu)}"]`); if (f) f.focus();
    };
  });
  $$('[data-tipp]').forEach((b) => {
    b.onclick = () => {
      const [mz, ...rest] = b.dataset.tipp.split('|');
      const g = tipps[mz].find((x) => x.key === rest.join('|'));
      if (g) schnellEintragen(g, datum, mz, () => tagebuch(datum));
    };
  });
  $$('[data-eintrag]').forEach((b) => {
    b.onclick = () => eintragBearbeiten(eintraege.find((e) => e.id === b.dataset.eintrag), datum);
  });
}

/* ---------- Mengen-Dialog: neu eintragen, bearbeiten, Zutat ---------- */
function einheiten(lm) {
  const e = [{ k: 'g', name: lm.einheitHinweis === 'ml' ? 'Milliliter (wie Gramm)' : 'Gramm', g: 1 }];
  if (lm.packung > 0) e.push({ k: 'packung', name: `Packung (${dez(lm.packung, 1)} g)`, g: Number(lm.packung) });
  if (lm.portion > 0) e.push({ k: 'portion', name: `Portion (${dez(lm.portion, 1)} g)${lm.portionName && lm.portionName !== 'Portion' ? ' | ' + lm.portionName : ''}`, g: Number(lm.portion) });
  return e;
}
const basisVon = (lm) => ({
  kcal100: Number(lm.kcal100) || 0, eiweiss: lm.eiweiss ?? null, fett: lm.fett ?? null, kh: lm.kh ?? null,
  zucker: lm.zucker ?? null, ballast: lm.ballast ?? null, salz: lm.salz ?? null,
  packung: lm.packung || null, portion: lm.portion || null, portionName: lm.portionName || '', einheitHinweis: lm.einheitHinweis || '',
});

/**
 * lm: Lebensmittel (Werte pro 100 g) | ref: {store, id} | ziel: {art:'tagebuch'|'rezept'|'bearbeiten', datum, mahlzeit, rezeptId, eintrag}
 */
function mengenDialog(lm, ref, ziel) {
  const eh = einheiten(lm);
  const bearb = ziel.art === 'bearbeiten' ? ziel.eintrag : null;
  const start = bearb ? (eh.find((x) => x.k === bearb.einheit) || eh[0]) : (lm.letzteEinheit && eh.find((x) => x.k === lm.letzteEinheit)) || eh.find((x) => x.k === 'portion') || eh.find((x) => x.k === 'packung' && x.g <= 350) || eh[0];
  const startAnzahl = bearb ? (bearb.anzahl ?? bearb.menge) : lm.letzteAnzahl && start.k === lm.letzteEinheit ? lm.letzteAnzahl : start.k === 'g' ? 100 : 1;
  const mitMahlzeit = ziel.art !== 'rezept';
  const d = oeffneDialog(`
<p class="dlg-unter">${lm.marke ? esc(lm.marke) + ' | ' : ''}<span class="mono">${dez(lm.kcal100, 1)} kcal / 100 g</span></p>
<form id="menge-form" class="formular" novalidate>
<div class="zwei">
<div class="feld"><label for="m-anzahl">Menge</label><input class="eingabe" id="m-anzahl" inputmode="decimal" autocomplete="off" value="${esc(String(startAnzahl).replace('.', ','))}" required></div>
<div class="feld"><label for="m-einheit">Einheit</label><select class="eingabe" id="m-einheit">${eh.map((x) => `<option value="${x.k}"${x.k === start.k ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
</div>
<div class="ergebnis" aria-live="polite"><span class="etikett">Ergibt</span><div class="ergebnis-zahl mono" id="m-kcal">-</div><div class="ergebnis-rechnung mono" id="m-rechnung"></div><div class="naehr" id="m-naehr"></div></div>
${mitMahlzeit ? `<div class="zwei">
<div class="feld"><label for="m-mahlzeit">Mahlzeit</label><select class="eingabe" id="m-mahlzeit">${mahlzeitOptionen(bearb ? bearb.mahlzeit : ziel.mahlzeit)}</select></div>
<div class="feld"><label for="m-datum">Datum</label><input class="eingabe" type="date" id="m-datum" value="${bearb ? bearb.datum : ziel.datum}"></div>
</div>` : ''}
<p class="fehlermeldung" id="m-fehler" hidden></p>
<div class="knopfzeile">
<button type="submit" class="knopf">${bearb ? 'Speichern' : ziel.art === 'rezept' ? 'Als Zutat hinzufügen' : 'Eintragen'}</button>
${ref && ref.store !== 'eintrag' ? `<button type="button" class="knopf knopf-zwei" id="m-favorit" aria-pressed="${!!lm.favorit}">${icon('stern', 20, lm.favorit ? 'stern-voll' : '')}${lm.favorit ? 'Favorit' : 'Als Favorit'}</button>` : ''}
</div>
</form>
${bearb ? `<details class="aufklapp"><summary>${icon('kopie', 20)}Auf anderen Tag kopieren</summary>
<div class="zwei"><div class="feld"><label for="k-datum">Datum</label><input class="eingabe" type="date" id="k-datum" value="${plusTage(bearb.datum, 1)}"></div>
<div class="feld"><label for="k-mahlzeit">Mahlzeit</label><select class="eingabe" id="k-mahlzeit">${mahlzeitOptionen(bearb.mahlzeit)}</select></div></div>
<button type="button" class="knopf knopf-zwei" id="k-los">${icon('kopie', 20)}Kopieren</button></details>
<button type="button" class="knopf knopf-gefahr-zwei" id="m-loeschen">${icon('muell', 20)}Eintrag löschen</button>` : ''}`, { titel: lm.name });

  const anzahlFeld = $('#m-anzahl', d), einheitFeld = $('#m-einheit', d);
  const rechne = () => {
    const a = lies(anzahlFeld.value);
    const e = eh.find((x) => x.k === einheitFeld.value);
    if (!(a > 0)) { $('#m-kcal', d).textContent = '-'; $('#m-rechnung', d).textContent = ''; $('#m-naehr', d).innerHTML = ''; return null; }
    const g = R.runde(a * e.g, 1);
    const w = R.fuerMenge(lm, g);
    $('#m-kcal', d).textContent = `${zahl(w.kcal)} kcal`;
    $('#m-rechnung', d).textContent = `${e.k === 'g' ? '' : `${dez(a, 2)} x ${dez(e.g, 1)} g = `}${dez(g, 1)} g x ${dez(lm.kcal100, 1)} / 100`;
    const g1 = (x) => (x == null ? '-' : `${dez(x, 1)} g`);
    $('#m-naehr', d).innerHTML = `<span>Eiweiß <b class="mono">${g1(w.eiweiss)}</b></span><span>Fett <b class="mono">${g1(w.fett)}</b></span><span>KH <b class="mono">${g1(w.kh)}</b></span>`;
    return { a, e, g, w };
  };
  anzahlFeld.oninput = rechne;
  einheitFeld.onchange = () => { anzahlFeld.value = einheitFeld.value === 'g' ? '100' : '1'; rechne(); };
  rechne();
  setTimeout(() => { anzahlFeld.focus(); anzahlFeld.select(); }, 50);

  const fav = $('#m-favorit', d);
  if (fav) fav.onclick = async () => {
    lm.favorit = !lm.favorit;
    const obj = await db.hole(ref.store, ref.id);
    if (obj) { obj.favorit = lm.favorit; await db.speichere(ref.store, obj); }
    fav.setAttribute('aria-pressed', String(lm.favorit));
    fav.innerHTML = `${icon('stern', 20, lm.favorit ? 'stern-voll' : '')}${lm.favorit ? 'Favorit' : 'Als Favorit'}`;
  };

  $('#menge-form', d).onsubmit = async (ev) => {
    ev.preventDefault();
    const r = rechne();
    if (!r) { const f = $('#m-fehler', d); f.hidden = false; f.textContent = '✗ Bitte eine Menge größer als 0 eingeben.'; anzahlFeld.focus(); return; }
    const einheitText = r.e.k === 'g' ? `${dez(r.g, 1)} g` : `${dez(r.a, 2)} ${r.e.k === 'packung' ? (r.a === 1 ? 'Packung' : 'Packungen') : (r.a === 1 ? 'Portion' : 'Portionen')} (${dez(r.g, 1)} g)`;
    if (ziel.art === 'rezept') {
      const rz = await db.hole('rezepte', ziel.rezeptId);
      rz.zutaten.push({ name: lm.name, marke: lm.marke || '', menge: r.g, ...basisVon(lm), ref });
      await db.speichere('rezepte', rz);
      schliesseDialog();
      meldung(`${lm.name} zum Rezept hinzugefügt.`);
      geheZu('#/rezept/' + encodeURIComponent(ziel.rezeptId));
      return;
    }
    const datum = $('#m-datum', d).value || heute();
    const mahlzeit = $('#m-mahlzeit', d).value;
    const eintrag = {
      ...(bearb || { id: db.neueId('t'), erstellt: new Date().toISOString(), name: lm.name, marke: lm.marke || '', ref }),
      datum, mahlzeit, menge: r.g, anzahl: r.a, einheit: r.e.k, einheitText, ...r.w, basis: basisVon(lm),
    };
    await db.speichere('tagebuch', eintrag);
    if (ref && ref.store !== 'eintrag') {
      const obj = await db.hole(ref.store, ref.id);
      if (obj) { obj.zuletzt = new Date().toISOString(); obj.letzteEinheit = r.e.k; obj.letzteAnzahl = r.a; await db.speichere(ref.store, obj); }
    }
    schliesseDialog();
    meldung(bearb ? 'Gespeichert.' : `${zahl(r.w.kcal)} kcal bei ${mahlzeitName(mahlzeit)} eingetragen.`);
    geheZu('#/tag/' + datum);
  };

  if (bearb) {
    $('#k-los', d).onclick = async () => {
      const nd = $('#k-datum', d).value;
      if (!nd) return;
      const kopie = { ...bearb, id: db.neueId('t'), datum: nd, mahlzeit: $('#k-mahlzeit', d).value, erstellt: new Date().toISOString() };
      await db.speichere('tagebuch', kopie);
      schliesseDialog();
      meldung(`Kopiert auf ${kurz(nd)}.`, 'ok', { text: 'Anzeigen', fn: () => geheZu('#/tag/' + nd) });
    };
    $('#m-loeschen', d).onclick = async () => {
      await db.loesche('tagebuch', bearb.id);
      schliesseDialog();
      meldung('Eintrag gelöscht.', 'ok', { text: 'Rückgängig', fn: async () => { await db.speichere('tagebuch', bearb); route(); } });
      route();
    };
  }
}

function eintragBearbeiten(e) {
  const lm = { ...(e.basis || { kcal100: e.menge ? (e.kcal / e.menge) * 100 : 0 }), name: e.name, marke: e.marke };
  mengenDialog(lm, { store: 'eintrag', id: e.id }, { art: 'bearbeiten', eintrag: e });
}

/* ====================================================================== Lebensmittel suchen */
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const LISTEN = [['haeufig', 'Häufig'], ['verlauf', 'Verlauf'], ['favoriten', 'Favoriten'], ['eigene', 'Eigene'], ['rezepte', 'Rezepte']];
let sucheZustand = { reiter: 'haeufig', wort: '', offErgebnis: null, offFehler: null };

/** Einträge der letzten Wochen (Grundlage für Vorschläge und Verlauf) */
const tagebuchSeit = (tage) => db.bereich('tagebuch', 'datum', plusTage(heute(), -tage), plusTage(heute(), 1));

/** Lebensmittel aus einer Gruppe des Tagebuchs: aktuelle Werte der Quelle, falls vorhanden, sonst die gespeicherten des letzten Eintrags */
function lmAusGruppe(g, alle) {
  const e = g.letzter;
  const quelle = e.ref && alle.find((x) => x._store === e.ref.store && x.id === e.ref.id);
  const basis = e.basis || { kcal100: e.menge ? (e.kcal / e.menge) * 100 : 0 };
  const lm = quelle ? { ...quelle } : { ...basis, name: e.name, marke: e.marke || '', _store: null };
  lm.letzteEinheit = e.einheit || 'g';
  lm.letzteAnzahl = e.anzahl ?? e.menge;
  return { lm, ref: quelle ? { store: quelle._store, id: quelle.id } : null };
}

/** Schnell eintragen: gleiche Menge wie beim letzten Mal */
async function schnellEintragen(g, datum, mahlzeit, danach) {
  const vorlage = g.letzter;
  const neu = { ...vorlage, id: db.neueId('t'), datum, mahlzeit, erstellt: new Date().toISOString() };
  await db.speichere('tagebuch', neu);
  if (vorlage.ref && vorlage.ref.store && vorlage.ref.store !== 'eintrag') {
    const obj = await db.hole(vorlage.ref.store, vorlage.ref.id);
    if (obj) { obj.zuletzt = neu.erstellt; await db.speichere(vorlage.ref.store, obj); }
  }
  meldung(`${neu.name}, ${neu.einheitText || dez(neu.menge, 1) + ' g'}: ${zahl(neu.kcal)} kcal bei ${mahlzeitName(mahlzeit)} eingetragen.`, 'ok',
    { text: 'Rückgängig', fn: async () => { await db.loesche('tagebuch', neu.id); if (danach) danach(); } });
  if (danach) danach();
}

function gruppenZeile(g, { schnell, mitDatum } = {}) {
  const e = g.letzter;
  const menge = e.einheitText || `${dez(e.menge, 1)} g`;
  const info = mitDatum ? `zuletzt ${kurz(e.datum)} | ${menge}` : `${g.anzahl}x in 6 Wochen | zuletzt ${menge}`;
  return `<li class="lm-zeile"><button type="button" class="lm" data-gruppe="${esc(g.key)}">
<span class="lm-name"><span>${esc(g.name)}</span><span class="lm-marke">${g.marke ? esc(g.marke) + ' | ' : ''}${esc(info)}</span></span>
<span class="lm-kcal mono">${zahl(e.kcal)}<small> kcal</small></span></button>
${schnell ? `<button type="button" class="symbol-knopf schnell-knopf" data-schnell="${esc(g.key)}" aria-label="${esc(g.name)}, ${esc(menge)}, sofort eintragen">${icon('plus', 22)}</button>` : ''}
<button type="button" class="symbol-knopf weg-knopf" data-ausblenden="${esc(g.key)}" aria-label="${esc(g.name)} aus Verlauf und Vorschlägen entfernen">${icon('schliessen', 20)}</button></li>`;
}

/** Aus Verlauf und Vorschlägen entfernen (das Tagebuch bleibt unverändert). Kommt wieder, sobald es erneut eingetragen wird. */
async function ausblenden(g, danach) {
  EIN.verlaufAusgeblendet[g.key] = new Date().toISOString();
  await db.speichereEinstellungen(EIN);
  meldung(`${g.name} aus Verlauf und Vorschlägen entfernt.`, 'ok', {
    text: 'Rückgängig', fn: async () => { delete EIN.verlaufAusgeblendet[g.key]; await db.speichereEinstellungen(EIN); if (danach) danach(); },
  });
  if (danach) danach();
}

async function lokaleLebensmittel() {
  const [eigen, cache, rz] = await Promise.all([db.alle('lebensmittel'), db.alle('off_cache'), db.alle('rezepte')]);
  const rezeptLm = rz.filter((r) => r.zutaten && r.zutaten.length).map((r) => {
    const w = R.rezeptWerte(r);
    return { ...w.pro100, id: r.id, name: r.name, marke: 'Rezept', portion: w.portionGramm, portionName: 'Portion', favorit: r.favorit, zuletzt: r.zuletzt, letzteEinheit: r.letzteEinheit, letzteAnzahl: r.letzteAnzahl, _store: 'rezepte' };
  });
  return [...eigen.map((x) => ({ ...x, _store: 'lebensmittel' })), ...cache.map((x) => ({ ...x, _store: 'off_cache' })), ...rezeptLm];
}

function zeile(lm, mitBearbeiten) {
  return `<li class="lm-zeile"><button type="button" class="lm" data-lm="${esc(lm._store)}|${esc(lm.id)}">
<span class="lm-name"><span>${lm.favorit ? icon('stern', 16, 'stern-voll') : ''}${esc(lm.name)}</span>${lm.marke ? `<span class="lm-marke">${esc(lm.marke)}${lm._store === 'lebensmittel' ? ' | eigenes' : ''}</span>` : lm._store === 'lebensmittel' ? '<span class="lm-marke">eigenes</span>' : ''}</span>
<span class="lm-kcal mono">${zahl(lm.kcal100)}<small> kcal/100 g</small></span></button>
${mitBearbeiten && lm._store !== 'rezepte' ? `<a class="symbol-knopf" href="#/lebensmittel/${encodeURIComponent(lm.id)}" aria-label="${esc(lm.name)} bearbeiten">${icon('stift', 20)}</a>` : ''}
${mitBearbeiten && lm._store === 'rezepte' ? `<a class="symbol-knopf" href="#/rezept/${encodeURIComponent(lm.id)}" aria-label="Rezept ${esc(lm.name)} öffnen">${icon('stift', 20)}</a>` : ''}</li>`;
}

async function suche(q) {
  const kontext = {
    datum: q.datum || heute(), mahlzeit: q.mahlzeit || mahlzeitJetzt(), rezeptId: q.rezept || null,
  };
  const rezept = kontext.rezeptId ? await db.hole('rezepte', kontext.rezeptId) : null;
  if (q.neu === '1') sucheZustand = { reiter: 'haeufig', wort: '', offErgebnis: null, offFehler: null };
  if (!LISTEN.some(([k]) => k === sucheZustand.reiter)) sucheZustand.reiter = 'haeufig';
  const offline = off.nurOffline();
  $('#ansicht').innerHTML = `<div class="huelle">
<h1 class="seiten-titel">${rezept ? 'Zutat hinzufügen' : 'Lebensmittel'}</h1>
<p class="kontext">${rezept ? `Für Rezept: <b>${esc(rezept.name)}</b> | <a href="#/rezept/${encodeURIComponent(rezept.id)}">zurück</a>` : `Eintragen in: <b>${mahlzeitName(kontext.mahlzeit)}</b> | <span class="mono">${kurz(kontext.datum)}</span>`}</p>
<form id="such-form" class="such-form" role="search">
<label class="unsichtbar" for="such-wort">Lebensmittel oder Barcode</label>
<input class="eingabe" id="such-wort" type="search" enterkeyhint="search" autocomplete="off" placeholder="Name oder Barcode" value="${esc(sucheZustand.wort)}">
<button class="knopf" type="submit" aria-label="Suchen">${icon('suche')}</button>
<button class="knopf knopf-zwei" type="button" id="scan-knopf" aria-label="Barcode scannen">${icon('scan')}</button>
</form>
<p class="datenhinweis">${icon('schloss', 16)}<span>${offline ? '"Nur offline" ist an: Es wird nur auf diesem Gerät gesucht.' : 'Beim Suchen und Scannen wird nur das Suchwort bzw. der Barcode an Open Food Facts übertragen.'} <a href="#/daten">Ihre Daten</a></span></p>
<div id="such-ergebnis"></div>
<div class="reiter" role="group" aria-label="Liste wählen">
${LISTEN.map(([k, n]) => `<button type="button" class="reiter-knopf" data-liste="${k}" aria-pressed="${sucheZustand.reiter === k}">${n}</button>`).join('')}
</div>
<div id="liste"></div>
<div class="knopfzeile"><a class="knopf knopf-zwei" href="#/lebensmittel/neu">${icon('plus', 20)}Eigenes Lebensmittel</a><a class="knopf knopf-zwei" href="#/rezepte">${icon('topf', 20)}Rezepte</a></div>
</div>`;

  const alle = await lokaleLebensmittel();
  const finde = (key) => { const [st, ...rest] = key.split('|'); const id = rest.join('|'); return alle.find((x) => x._store === st && x.id === id); };
  const verknuepfe = (wurzel) => {
    $$('[data-lm]', wurzel).forEach((b) => {
      b.onclick = () => {
        const lm = finde(b.dataset.lm) || (sucheZustand.offErgebnis || []).find((x) => 'off_cache|' + x.id === b.dataset.lm);
        if (!lm) return;
        mengenDialog({ ...lm }, { store: lm._store || 'off_cache', id: lm.id }, kontext.rezeptId ? { art: 'rezept', rezeptId: kontext.rezeptId } : { art: 'tagebuch', ...kontext });
      };
    });
  };

  const zielVon = () => (kontext.rezeptId ? { art: 'rezept', rezeptId: kontext.rezeptId } : { art: 'tagebuch', ...kontext });
  let gruppen = [];
  const zeigeListe = async () => {
    let l = [];
    const r = sucheZustand.reiter;
    const box = $('#liste');
    if (r === 'haeufig' || r === 'verlauf') {
      const tb = await tagebuchSeit(r === 'haeufig' ? 42 : 120);
      gruppen = (r === 'haeufig'
        ? aw.vorschlaege(tb, { mahlzeit: kontext.mahlzeit, datum: kontext.datum, max: 40 })
        : aw.verlauf(tb, 200)).filter(nichtAusgeblendet).slice(0, r === 'haeufig' ? 12 : 40);
      if (!gruppen.length) {
        box.innerHTML = r === 'haeufig'
          ? leer('lupe', 'Noch keine Vorschläge.', 'Was Sie in sechs Wochen mindestens zweimal essen, erscheint hier, passend zur Mahlzeit. Bis dahin: oben suchen oder scannen.')
          : leer('lupe', 'Noch nichts gegessen.', 'Zumindest nichts eingetragen. Der Verlauf füllt sich mit jedem Eintrag.');
        return;
      }
      const schnell = !kontext.rezeptId;
      box.innerHTML = `${r === 'haeufig' ? `<p class="klein">Passend zu ${mahlzeitName(kontext.mahlzeit)}, nach Häufigkeit.${schnell ? ` ${icon('plus', 14)} trägt die gleiche Menge wie beim letzten Mal ein.` : ''}</p>` : ''}
<ul class="lm-liste">${gruppen.map((g) => gruppenZeile(g, { schnell, mitDatum: r === 'verlauf' })).join('')}</ul>`;
      $$('[data-gruppe]', box).forEach((b) => {
        b.onclick = () => {
          const g = gruppen.find((x) => x.key === b.dataset.gruppe);
          const { lm, ref } = lmAusGruppe(g, alle);
          mengenDialog(lm, ref, zielVon());
        };
      });
      $$('[data-schnell]', box).forEach((b) => {
        b.onclick = () => schnellEintragen(gruppen.find((x) => x.key === b.dataset.schnell), kontext.datum, kontext.mahlzeit, zeigeListe);
      });
      $$('[data-ausblenden]', box).forEach((b) => {
        b.onclick = () => ausblenden(gruppen.find((x) => x.key === b.dataset.ausblenden), zeigeListe);
      });
      return;
    }
    if (r === 'favoriten') l = alle.filter((x) => x.favorit).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (r === 'eigene') l = alle.filter((x) => x._store === 'lebensmittel').sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (r === 'rezepte') l = alle.filter((x) => x._store === 'rezepte').sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const leerTexte = {
      favoriten: ['Keine Favoriten.', 'Im Mengen-Dialog markieren Sie Lebensmittel mit "Als Favorit".'],
      eigene: ['Keine eigenen Lebensmittel.', 'Legen Sie mit "Eigenes Lebensmittel" etwas ohne Barcode an, z. B. Omas Apfelkuchen.'],
      rezepte: ['Noch keine Rezepte.', 'Die Küche ist kalt. <a href="#/rezepte">Rezept anlegen</a>'],
    };
    box.innerHTML = l.length ? `<ul class="lm-liste">${l.map((x) => zeile(x, r === 'eigene' || r === 'rezepte')).join('')}</ul>`
      : leer('lupe', leerTexte[r][0], leerTexte[r][1]);
    verknuepfe(box);
  };
  $$('[data-liste]').forEach((b) => {
    b.onclick = () => { sucheZustand.reiter = b.dataset.liste; $$('[data-liste]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); zeigeListe(); };
  });
  zeigeListe();

  const feld = $('#such-wort');
  const zeigeTreffer = () => {
    const w = norm(feld.value.trim());
    const box = $('#such-ergebnis');
    if (!w) { box.innerHTML = ''; return; }
    const lokal = alle.filter((x) => norm(x.name + ' ' + (x.marke || '')).includes(w))
      .sort((a, b) => (b.favorit ? 1 : 0) - (a.favorit ? 1 : 0) || (b.zuletzt || '').localeCompare(a.zuletzt || '')).slice(0, 30);
    const offListe = (sucheZustand.offErgebnis || []).filter((x) => !lokal.some((l) => l.id === x.id)).map((x) => ({ ...x, _store: 'off_cache' }));
    let html = `<h2 class="etikett abschnitt">Auf diesem Gerät</h2>`;
    html += lokal.length ? `<ul class="lm-liste">${lokal.map((x) => zeile(x)).join('')}</ul>` : '<p class="klein">Nichts gespeichert, das passt.</p>';
    if (sucheZustand.offFehler) html += `<p class="fehlermeldung">✗ ${esc(sucheZustand.offFehler)}</p>`;
    else if (sucheZustand.offErgebnis && sucheZustand.wort === feld.value.trim()) {
      html += `<h2 class="etikett abschnitt">Open Food Facts</h2>`;
      html += offListe.length ? `<ul class="lm-liste">${offListe.map((x) => zeile(x)).join('')}</ul>`
        : leer('lupe', 'Nichts gefunden.', 'Auch nicht hinter dem Joghurt. Versuchen Sie ein anderes Wort oder legen Sie das Lebensmittel selbst an.');
    } else if (!off.nurOffline()) html += `<p class="klein">Für Treffer aus Open Food Facts auf ${icon('suche', 16)} tippen.</p>`;
    box.innerHTML = html;
    verknuepfe(box);
  };
  feld.oninput = () => { sucheZustand.offErgebnis = null; sucheZustand.offFehler = null; zeigeTreffer(); };
  zeigeTreffer();

  $('#such-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const w = feld.value.trim();
    if (!w) { feld.focus(); return; }
    feld.blur();
    if (/^\d{8,14}$/.test(w)) { barcodeGefunden(w, kontext); return; }
    sucheZustand.wort = w;
    if (off.nurOffline()) { sucheZustand.offErgebnis = null; zeigeTreffer(); return; }
    $('#such-ergebnis').insertAdjacentHTML('beforeend', '<p class="klein mono" id="laedt">Frage Open Food Facts ...</p>');
    try {
      sucheZustand.offErgebnis = await off.suche(w);
      sucheZustand.offFehler = null;
    } catch (e) {
      sucheZustand.offErgebnis = null;
      sucheZustand.offFehler = off.fehlerText(e);
    }
    // neue Produkte sind jetzt lokal zwischengespeichert
    alle.splice(0, alle.length, ...(await lokaleLebensmittel()));
    zeigeTreffer();
  };
  $('#scan-knopf').onclick = () => scanDialog(kontext);
}

/* ---------- Barcode ---------- */
function scanDialog(kontext) {
  const d = oeffneDialog(`
<div class="scan-fenster"><video id="scan-video" playsinline muted></video><div class="scan-rahmen" aria-hidden="true"></div></div>
<p class="klein mono" id="scan-status">Kamera wird gestartet ...</p>
<form id="scan-form" class="formular" novalidate>
<div class="feld"><label for="scan-nummer">Oder Barcode-Nummer eintippen</label>
<div class="such-form"><input class="eingabe" id="scan-nummer" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="z. B. 4001234567890"><button class="knopf" type="submit">Los</button></div></div>
</form>
<p class="datenhinweis">${icon('schloss', 16)}<span>Das Kamerabild bleibt auf dem Gerät. Nur die erkannte Nummer wird an Open Food Facts geschickt${off.nurOffline() ? ' (derzeit aus: "Nur offline")' : ''}.</span></p>`, { titel: 'Barcode scannen' });
  const status = $('#scan-status', d);
  scanner.starte($('#scan-video', d), (code) => { schliesseDialog(); barcodeGefunden(code, kontext); })
    .then((art) => { status.textContent = `Barcode in den Rahmen halten. (${art})`; })
    .catch((e) => {
      status.className = 'fehlermeldung';
      status.textContent = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
        ? '✗ Kein Zugriff auf die Kamera. Erlauben Sie ihn in den Einstellungen oder tippen Sie die Nummer ein.'
        : '✗ Keine Kamera gefunden. Die Nummer unter dem Strichcode lässt sich auch abtippen.';
    });
  $('#scan-form', d).onsubmit = (ev) => {
    ev.preventDefault();
    const n = $('#scan-nummer', d).value.replace(/\D/g, '');
    if (n.length < 8) { status.className = 'fehlermeldung'; status.textContent = '✗ Ein Barcode hat 8 oder 13 Ziffern.'; return; }
    schliesseDialog();
    barcodeGefunden(n, kontext);
  };
}

async function barcodeGefunden(code, kontext) {
  meldung(`Barcode ${code} wird gesucht ...`, 'info');
  let r;
  try { r = await off.produktPerBarcode(code); } catch (e) {
    meldung(off.fehlerText(e), 'fehler');
    geheZu(`#/lebensmittel/neu?barcode=${code}&grund=fehler`);
    return;
  }
  if (!r.produkt) {
    geheZu(`#/lebensmittel/neu?barcode=${code}&grund=unbekannt`);
    return;
  }
  $('#meldung').hidden = true;
  const store = r.herkunft === 'eigen' ? 'lebensmittel' : 'off_cache';
  if (r.produkt.kcal100 == null) {
    meldung('Bei diesem Produkt fehlen die Kalorien. Bitte ergänzen.', 'info');
    geheZu(`#/lebensmittel/${encodeURIComponent(r.produkt.id)}`);
    return;
  }
  mengenDialog({ ...r.produkt }, { store, id: r.produkt.id }, kontext.rezeptId ? { art: 'rezept', rezeptId: kontext.rezeptId } : { art: 'tagebuch', ...kontext });
}

/* ====================================================================== Lebensmittel anlegen / bearbeiten */
async function lebensmittelFormular(id, q) {
  let lm = null, store = 'lebensmittel';
  if (id) {
    lm = await db.hole('lebensmittel', id);
    if (!lm) { lm = await db.hole('off_cache', id); store = 'off_cache'; }
    if (!lm) { geheZu('#/suche'); return; }
  }
  const v = lm || { name: q.name || '', marke: '', barcode: q.barcode || '' };
  const f = (k) => (v[k] == null ? '' : String(v[k]).replace('.', ','));
  const istOff = store === 'off_cache';
  const naehr = R.NAEHRWERTE.map((n) => `<div class="feld"><label for="f-${n}">${R.NAEHRWERT_NAMEN[n]} <span class="einheit">g / 100 g</span></label><input class="eingabe" id="f-${n}" inputmode="decimal" autocomplete="off" value="${f(n)}"></div>`).join('');
  $('#ansicht').innerHTML = `<div class="huelle schmal">
<h1 class="seiten-titel">${id ? (istOff ? 'Produkt prüfen' : 'Lebensmittel bearbeiten') : 'Neues Lebensmittel'}</h1>
${q.grund === 'unbekannt' ? `<div class="hinweis">${icon('info')}<div><p><b>Barcode <span class="mono">${esc(q.barcode)}</span> ist unbekannt.</b> Weder auf diesem Gerät noch bei Open Food Facts. Legen Sie das Produkt hier an, dann kennt BaseBite es beim nächsten Scan.</p></div></div>` : ''}
${q.grund === 'fehler' ? `<div class="hinweis">${icon('info')}<div><p>Open Food Facts war nicht erreichbar. Sie können das Produkt hier selbst anlegen.</p></div></div>` : ''}
${istOff ? `<div class="hinweis">${icon('info')}<div><p>Dieses Produkt stammt von Open Food Facts. Änderungen speichert BaseBite als <b>eigenes Lebensmittel</b>, die Daten bei Open Food Facts bleiben unverändert.</p></div></div>` : ''}
<form id="lm-form" class="formular" novalidate>
<div class="feld"><label for="f-name">Name *</label><input class="eingabe eingabe-text" id="f-name" required autocomplete="off" value="${esc(v.name)}"></div>
<div class="zwei">
<div class="feld"><label for="f-marke">Marke</label><input class="eingabe eingabe-text" id="f-marke" autocomplete="off" value="${esc(v.marke || '')}"></div>
<div class="feld"><label for="f-barcode">Barcode</label><input class="eingabe" id="f-barcode" inputmode="numeric" autocomplete="off" value="${esc(v.barcode || '')}"></div>
</div>
<fieldset class="gruppe"><legend>Kalorien</legend>
<div class="drei-feld">
<div class="feld"><label for="f-kcal100">kcal pro 100 g *</label><input class="eingabe" id="f-kcal100" inputmode="decimal" autocomplete="off" required value="${f('kcal100')}"></div>
<div class="feld"><label for="f-packung">Packung in g</label><input class="eingabe" id="f-packung" inputmode="decimal" autocomplete="off" value="${f('packung')}"></div>
<div class="feld"><label for="f-kcalpackung">kcal pro Packung</label><input class="eingabe" id="f-kcalpackung" inputmode="decimal" autocomplete="off" value="${v.kcal100 && v.packung ? String(R.kcalProPackung(v.kcal100, v.packung)) : ''}"></div>
</div>
<p class="klein" id="f-rechnung" aria-live="polite"></p>
</fieldset>
<div class="zwei">
<div class="feld"><label for="f-portion">Portion in g <span class="einheit">optional</span></label><input class="eingabe" id="f-portion" inputmode="decimal" autocomplete="off" value="${f('portion')}"></div>
<div class="feld"><label for="f-portionname">Bezeichnung der Portion</label><input class="eingabe eingabe-text" id="f-portionname" autocomplete="off" placeholder="z. B. 1 Riegel" value="${esc(v.portionName || '')}"></div>
</div>
<details class="aufklapp" ${R.NAEHRWERTE.some((n) => v[n] != null) ? 'open' : ''}><summary>Nährwerte pro 100 g (optional)</summary><div class="zwei">${naehr}</div></details>
<p class="fehlermeldung" id="f-fehler" hidden></p>
<div class="knopfzeile">
<button class="knopf" type="submit">${istOff ? 'Als eigenes speichern' : 'Speichern'}</button>
<button class="knopf knopf-zwei" type="button" id="f-abbrechen">Abbrechen</button>
</div>
${id && !istOff ? `<button type="button" class="knopf knopf-gefahr-zwei" id="f-loeschen">${icon('muell', 20)}Lebensmittel löschen</button>` : ''}
</form>
${q.barcode || v.barcode ? `<details class="aufklapp"><summary>${icon('extern', 20)}Bei Open Food Facts eintragen (optional)</summary>
<p>Open Food Facts lebt von Freiwilligen. Wenn Sie möchten, tragen Sie das Produkt dort ein, damit andere es auch finden: mit der kostenlosen App "Open Food Facts" (Barcode scannen, Fotos von Vorderseite und Nährwerttabelle machen) oder auf der Webseite nach Anmeldung.</p>
<p>BaseBite überträgt dabei <b>nichts</b> automatisch. <a href="${off.OFF_MITMACHEN}" target="_blank" rel="noopener">Mitmachen bei Open Food Facts</a></p></details>` : ''}
</div>`;

  const F = (k) => $('#f-' + k);
  const rechnung = $('#f-rechnung');
  const zeigeRechnung = () => {
    const k = lies(F('kcal100').value), p = lies(F('packung').value);
    rechnung.innerHTML = k > 0 && p > 0 ? `<span class="mono">${dez(p, 1)} g x ${dez(k, 1)} kcal / 100 g = ${zahl(R.kcalProPackung(k, p))} kcal pro Packung</span>` : '';
  };
  // kcal pro 100 g und pro Packung gegenseitig berechnen
  let zuletztGeaendert = 'kcal100';
  F('kcal100').oninput = () => { zuletztGeaendert = 'kcal100'; const k = lies(F('kcal100').value), p = lies(F('packung').value); if (k > 0 && p > 0) F('kcalpackung').value = String(R.kcalProPackung(k, p)); zeigeRechnung(); };
  F('kcalpackung').oninput = () => { zuletztGeaendert = 'kcalpackung'; const kp = lies(F('kcalpackung').value), p = lies(F('packung').value); if (kp > 0 && p > 0) F('kcal100').value = String(R.kcal100AusPackung(kp, p)).replace('.', ','); zeigeRechnung(); };
  F('packung').oninput = () => {
    const p = lies(F('packung').value);
    if (!(p > 0)) { zeigeRechnung(); return; }
    if (zuletztGeaendert === 'kcalpackung' && lies(F('kcalpackung').value) > 0) F('kcal100').value = String(R.kcal100AusPackung(lies(F('kcalpackung').value), p)).replace('.', ',');
    else if (lies(F('kcal100').value) > 0) F('kcalpackung').value = String(R.kcalProPackung(lies(F('kcal100').value), p));
    zeigeRechnung();
  };
  zeigeRechnung();
  $('#f-abbrechen').onclick = () => history.back();

  $('#lm-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const fehler = $('#f-fehler');
    const name = F('name').value.trim();
    let kcal100 = lies(F('kcal100').value);
    const packung = lies(F('packung').value), kp = lies(F('kcalpackung').value);
    if (!(kcal100 >= 0) && kp > 0 && packung > 0) kcal100 = R.kcal100AusPackung(kp, packung);
    const probleme = [];
    if (!name) probleme.push('einen Namen');
    if (kcal100 == null || kcal100 < 0) probleme.push('kcal pro 100 g (oder Packungsgröße und kcal pro Packung)');
    if (kcal100 > 900) probleme.push('höchstens 900 kcal pro 100 g (reines Fett hat ca. 900)');
    if (probleme.length) { fehler.hidden = false; fehler.textContent = '✗ Bitte angeben: ' + probleme.join(', ') + '.'; return; }
    const barcode = F('barcode').value.replace(/\D/g, '');
    const neu = {
      ...(store === 'lebensmittel' && lm ? lm : {}),
      id: store === 'lebensmittel' && lm ? lm.id : db.neueId('e'),
      quelle: 'eigen', name, marke: F('marke').value.trim(), barcode: barcode || undefined,
      kcal100: R.runde(kcal100, 1), packung: packung > 0 ? packung : null,
      portion: lies(F('portion').value) > 0 ? lies(F('portion').value) : null, portionName: F('portionname').value.trim(),
      geaendert: new Date().toISOString(),
    };
    if (!lm || store !== 'lebensmittel') neu.angelegt = new Date().toISOString();
    if (istOff) { neu.favorit = lm.favorit; neu.zuletzt = lm.zuletzt; }
    for (const n of R.NAEHRWERTE) { const x = lies(F(n).value); neu[n] = x == null ? null : x; }
    if (!neu.barcode) delete neu.barcode;
    await db.speichere('lebensmittel', neu);
    meldung('Lebensmittel gespeichert.');
    // direkt eintragen anbieten
    mengenDialog({ ...neu }, { store: 'lebensmittel', id: neu.id }, { art: 'tagebuch', datum: heute(), mahlzeit: mahlzeitJetzt() });
  };
  const lb = $('#f-loeschen');
  if (lb) lb.onclick = async () => {
    if (!(await bestaetige(`"${esc(lm.name)}" löschen? Einträge im Tagebuch bleiben erhalten.`, { titel: 'Lebensmittel löschen', ja: 'Löschen', gefahr: true }))) return;
    await db.loesche('lebensmittel', lm.id);
    meldung('Gelöscht.');
    sucheZustand.reiter = 'eigene';
    geheZu('#/suche');
  };
}

/* ====================================================================== Rezepte */
async function rezepte() {
  const liste = (await db.alle('rezepte')).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  $('#ansicht').innerHTML = `<div class="huelle schmal">
<h1 class="seiten-titel">Rezepte</h1>
<p class="klein">Mehrere Zutaten, einmal gewogen: BaseBite rechnet kcal pro 100 g und pro Portion aus.</p>
<form id="rz-neu" class="such-form"><label class="unsichtbar" for="rz-name">Name des neuen Rezepts</label><input class="eingabe eingabe-text" id="rz-name" placeholder="z. B. Linsensuppe" autocomplete="off"><button class="knopf" type="submit">${icon('plus', 20)}Anlegen</button></form>
${liste.length ? `<ul class="lm-liste">${liste.map((r) => {
    const w = R.rezeptWerte(r);
    return `<li class="lm-zeile"><a class="lm" href="#/rezept/${encodeURIComponent(r.id)}"><span class="lm-name"><span>${r.favorit ? icon('stern', 16, 'stern-voll') : ''}${esc(r.name)}</span><span class="lm-marke">${r.zutaten.length} Zutaten | ${zahl(r.portionen || 1)} Portionen</span></span>
<span class="lm-kcal mono">${zahl(w.kcalPortion)}<small> kcal/Portion</small></span></a></li>`;
  }).join('')}</ul>` : leer('teller','Noch keine Rezepte.', 'Die Küche ist kalt. Geben Sie oben einen Namen ein und tippen Sie auf Anlegen.')}
</div>`;
  $('#rz-neu').onsubmit = async (ev) => {
    ev.preventDefault();
    const name = $('#rz-name').value.trim();
    if (!name) { $('#rz-name').focus(); return; }
    const r = { id: db.neueId('r'), name, zutaten: [], portionen: 4, gesamtgewicht: null, angelegt: new Date().toISOString() };
    await db.speichere('rezepte', r);
    geheZu('#/rezept/' + encodeURIComponent(r.id));
  };
}

async function rezeptAnsicht(id) {
  const r = await db.hole('rezepte', id);
  if (!r) { geheZu('#/rezepte'); return; }
  const w = R.rezeptWerte(r);
  $('#ansicht').innerHTML = `<div class="huelle schmal">
<p class="kontext"><a href="#/rezepte">${icon('links', 16)}Alle Rezepte</a></p>
<form id="rz-form" class="formular" novalidate>
<div class="feld"><label for="rz-titel">Name</label><input class="eingabe eingabe-text" id="rz-titel" value="${esc(r.name)}" autocomplete="off"></div>
<h2 class="etikett abschnitt">Zutaten</h2>
${r.zutaten.length ? `<ul class="zutaten">${r.zutaten.map((z, i) => `<li><span class="lm-name">${esc(z.name)}<span class="lm-marke mono">${dez(z.kcal100, 1)} kcal/100 g | ${zahl(R.fuerMenge(z, z.menge).kcal)} kcal</span></span>
<label class="unsichtbar" for="z-${i}">Menge ${esc(z.name)} in Gramm</label><span class="zutat-menge"><input class="eingabe" id="z-${i}" data-zutat="${i}" inputmode="decimal" value="${String(z.menge).replace('.', ',')}"><span class="mono">g</span></span>
<button type="button" class="symbol-knopf" data-weg="${i}" aria-label="${esc(z.name)} entfernen">${icon('muell', 20)}</button></li>`).join('')}</ul>`
    : '<p class="klein">Noch keine Zutaten.</p>'}
<a class="knopf knopf-zwei" href="#/suche?rezept=${encodeURIComponent(r.id)}&neu=1">${icon('plus', 20)}Zutat hinzufügen</a>
<div class="zwei">
<div class="feld"><label for="rz-gewicht">Gesamtgewicht fertig, in g</label><input class="eingabe" id="rz-gewicht" inputmode="decimal" placeholder="${dez(w.zutatenGramm, 0)}" value="${r.gesamtgewicht ? String(r.gesamtgewicht).replace('.', ',') : ''}"></div>
<div class="feld"><label for="rz-portionen">Portionen</label><input class="eingabe" id="rz-portionen" inputmode="decimal" value="${String(r.portionen || 1).replace('.', ',')}"></div>
</div>
<p class="klein">Leer lassen = Summe der Zutaten (${dez(w.zutatenGramm, 0)} g). Beim Kochen verdampft Wasser: Wiegen Sie das fertige Gericht (ohne Topf), dann stimmen die Werte pro 100 g.</p>
<div class="karte ergebnis-karte" aria-live="polite">
<div class="drei"><div><span class="etikett">Gesamt</span><span class="gross mono">${zahl(w.kcalGesamt)}</span><span class="klein">kcal</span></div>
<div><span class="etikett">Pro 100 g</span><span class="gross mono">${zahl(w.pro100.kcal100)}</span><span class="klein">kcal</span></div>
<div><span class="etikett">Pro Portion</span><span class="gross mono">${zahl(w.kcalPortion)}</span><span class="klein mono">kcal | ${dez(w.portionGramm, 0)} g</span></div></div>
</div>
<div class="knopfzeile">
<button class="knopf" type="submit">Speichern</button>
<button class="knopf knopf-zwei" type="button" id="rz-eintragen" ${r.zutaten.length ? '' : 'disabled'}>Eintragen</button>
<button class="knopf knopf-zwei" type="button" id="rz-fav" aria-pressed="${!!r.favorit}">${icon('stern', 20, r.favorit ? 'stern-voll' : '')}Favorit</button>
</div>
<button type="button" class="knopf knopf-gefahr-zwei" id="rz-loeschen">${icon('muell', 20)}Rezept löschen</button>
</form></div>`;

  const sammle = () => {
    r.name = $('#rz-titel').value.trim() || r.name;
    $$('[data-zutat]').forEach((f) => { const m = lies(f.value); if (m > 0) r.zutaten[Number(f.dataset.zutat)].menge = m; });
    const g = lies($('#rz-gewicht').value); r.gesamtgewicht = g > 0 ? g : null;
    const p = lies($('#rz-portionen').value); r.portionen = p > 0 ? p : 1;
  };
  $('#rz-form').onsubmit = async (ev) => { ev.preventDefault(); sammle(); await db.speichere('rezepte', r); meldung('Rezept gespeichert.'); rezeptAnsicht(id); };
  $$('[data-zutat]').forEach((f) => { f.onchange = async () => { sammle(); await db.speichere('rezepte', r); rezeptAnsicht(id); }; });
  $('#rz-gewicht').onchange = $('#rz-portionen').onchange = async () => { sammle(); await db.speichere('rezepte', r); rezeptAnsicht(id); };
  $$('[data-weg]').forEach((b) => { b.onclick = async () => { sammle(); r.zutaten.splice(Number(b.dataset.weg), 1); await db.speichere('rezepte', r); rezeptAnsicht(id); }; });
  $('#rz-fav').onclick = async () => { sammle(); r.favorit = !r.favorit; await db.speichere('rezepte', r); rezeptAnsicht(id); };
  $('#rz-eintragen').onclick = async () => {
    sammle(); await db.speichere('rezepte', r);
    const ww = R.rezeptWerte(r);
    mengenDialog({ ...ww.pro100, name: r.name, marke: 'Rezept', portion: ww.portionGramm, portionName: 'Portion', favorit: r.favorit, letzteEinheit: r.letzteEinheit || 'portion', letzteAnzahl: r.letzteAnzahl || 1 },
      { store: 'rezepte', id: r.id }, { art: 'tagebuch', datum: heute(), mahlzeit: mahlzeitJetzt() });
  };
  $('#rz-loeschen').onclick = async () => {
    if (!(await bestaetige(`Rezept "${esc(r.name)}" löschen? Einträge im Tagebuch bleiben erhalten.`, { titel: 'Rezept löschen', ja: 'Löschen', gefahr: true }))) return;
    await db.loesche('rezepte', r.id); meldung('Rezept gelöscht.'); geheZu('#/rezepte');
  };
}

/* ====================================================================== Verlauf */
let verlaufTage = 30;
async function verlauf() {
  const [gewichte, ziel, tb] = await Promise.all([db.alle('gewicht'), zielDaten(), db.alle('tagebuch')]);
  gewichte.sort((a, b) => a.datum.localeCompare(b.datum));
  const h = heute();
  const ab = verlaufTage ? plusTage(h, -verlaufTage + 1) : '0000';
  const sichtbar = gewichte.filter((g) => g.datum >= ab);
  const schnittAlle = R.gleitenderSchnitt(gewichte);
  const schnitt = schnittAlle.filter((g) => g.datum >= ab);
  const zielKg = ziel.profil.ziel !== 'halten' ? ziel.profil.zielgewicht : null;
  const prog = R.prognose(gewichte, zielKg, h);
  let progLinie = null;
  if (prog && prog.datum && sichtbar.length) {
    // Prognoselinie höchstens über die halbe sichtbare Zeitspanne zeichnen, damit die Messungen lesbar bleiben
    const spanne = verlaufTage || Math.max(30, R.tagNr(h) - R.tagNr(gewichte[0].datum));
    const tage = Math.min(prog.tage, Math.max(14, Math.round(spanne / 2)));
    progLinie = { von: { datum: h, kg: prog.startKg }, bis: { datum: plusTage(h, tage), kg: R.runde(prog.startKg + (prog.steigungWoche / 7) * tage, 2) } };
  }

  // kcal pro Tag (letzte 14 Tage) und Wochenschnitt (nur Tage mit Einträgen)
  const proTag = new Map();
  for (const e of tb) proTag.set(e.datum, (proTag.get(e.datum) || 0) + (Number(e.kcal) || 0));
  const tage14 = [];
  for (let i = 13; i >= 0; i--) { const d = plusTage(h, -i); tage14.push({ label: d.slice(8, 10), titel: kurz(d), wert: Math.round(proTag.get(d) || 0) }); }
  const mitEintrag = [...proTag.entries()].map(([datum, wert]) => ({ datum, wert })).filter((x) => x.datum <= h);
  const wochen = R.wochenSchnitt(mitEintrag).slice(-8);
  const letzte = gewichte[gewichte.length - 1];
  const tempoPlan = ziel.profil.ziel === 'abnehmen' ? -ziel.profil.tempo : ziel.profil.ziel === 'zunehmen' ? ziel.profil.tempo : 0;
  let planDatum = null;
  if (zielKg && letzte && tempoPlan && Math.sign(zielKg - letzte.kg) === Math.sign(tempoPlan)) {
    planDatum = plusTage(h, Math.ceil(((zielKg - letzte.kg) / tempoPlan) * 7));
  }

  $('#ansicht').innerHTML = `<div class="huelle">
<h1 class="seiten-titel">Verlauf</h1>
<section class="karte" aria-labelledby="gw-titel">
<h2 id="gw-titel" class="h3">Gewicht eintragen</h2>
<form id="gw-form" class="gw-form" novalidate>
<div class="feld"><label for="gw-datum">Datum</label><input class="eingabe" type="date" id="gw-datum" value="${h}" max="${h}"></div>
<div class="feld"><label for="gw-kg">Gewicht in kg</label><input class="eingabe" id="gw-kg" inputmode="decimal" autocomplete="off" placeholder="${letzte ? dez(letzte.kg, 1) : '75,0'}"></div>
<button class="knopf" type="submit">Speichern</button>
</form>
<p class="fehlermeldung" id="gw-fehler" hidden></p>
</section>

<div class="reiter" role="group" aria-label="Zeitraum">
${[[30, '30 Tage'], [90, '90 Tage'], [365, '1 Jahr'], [0, 'Alles']].map(([t, n]) => `<button type="button" class="reiter-knopf" data-tage="${t}" aria-pressed="${verlaufTage === t}">${n}</button>`).join('')}
</div>

<section class="karte" aria-labelledby="kurve-titel">
<h2 id="kurve-titel" class="h3">Gewichtskurve</h2>
${sichtbar.length >= 1 ? `${dia.gewichtsDiagramm({ punkte: sichtbar, schnitt, zielKg, prognose: progLinie, titel: 'Gewichtskurve mit gleitendem 7-Tage-Schnitt' })}
<ul class="legende"><li><span class="lg lg-punkt"></span>Messung</li><li><span class="lg lg-schnitt"></span>7-Tage-Schnitt</li>${zielKg ? '<li><span class="lg lg-ziel"></span>Zielgewicht</li>' : ''}${progLinie ? '<li><span class="lg lg-prognose"></span>Prognose</li>' : ''}</ul>
<div class="drei kennzahlen"><div><span class="etikett">Aktuell</span><span class="gross mono">${dez(letzte.kg, 1)}</span><span class="klein">kg</span></div>
<div><span class="etikett">7-Tage-Schnitt</span><span class="gross mono">${dez(schnittAlle[schnittAlle.length - 1].kg, 1)}</span><span class="klein">kg</span></div>
<div><span class="etikett">Trend</span><span class="gross mono">${prog ? (prog.steigungWoche > 0 ? '+' : '') + dez(prog.steigungWoche, 2) : '-'}</span><span class="klein">kg/Woche</span></div></div>`
    : leer('waage', 'Keine Daten, keine Kurve.', 'Die Waage wartet geduldig. Tragen Sie oben Ihr erstes Gewicht ein.')}
</section>

<section class="karte" aria-labelledby="prog-titel">
<h2 id="prog-titel" class="h3">Prognose</h2>
${!zielKg ? '<p class="klein">Legen Sie unter <a href="#/ziele">Ziele</a> ein Zielgewicht fest (Ziel abnehmen oder zunehmen).</p>'
    : !prog ? '<p class="klein">Für eine Prognose braucht es mindestens drei Messungen. Am besten eine Woche lang täglich wiegen.</p>'
      : prog.erreicht ? '<p><b>Ziel erreicht.</b> Gratulation. Jetzt unter Ziele auf "Gewicht halten" umstellen?</p>'
        : `<p>${prog.datum ? `Nach dem Trend der letzten 4 Wochen (<span class="mono">${dez(prog.steigungWoche, 2)} kg</span> pro Woche) erreichen Sie <span class="mono">${dez(zielKg, 1)} kg</span> voraussichtlich am <b class="mono">${kurz(prog.datum)}</b>.` : `Der Trend der letzten 4 Wochen (<span class="mono">${dez(prog.steigungWoche, 2)} kg</span> pro Woche) zeigt nicht zum Ziel. Noch.`}</p>`}
${planDatum ? `<p class="klein">Laut Plan (<span class="mono">${dez(Math.abs(tempoPlan), 2)} kg</span> pro Woche): <span class="mono">${kurz(planDatum)}</span>. Prognosen sind Schätzungen, Wasser im Körper schwankt täglich um 1-2 kg.</p>` : ''}
</section>

<section class="karte" aria-labelledby="kcal-titel">
<h2 id="kcal-titel" class="h3">kcal pro Tag (14 Tage)</h2>
${mitEintrag.length ? `${dia.balkenDiagramm({ werte: tage14, ziel: ziel.kcal, titel: 'Kalorien pro Tag der letzten 14 Tage mit Ziellinie' })}
<ul class="legende"><li><span class="lg lg-balken"></span>bis Ziel</li><li><span class="lg lg-balken-ueber"></span>über Ziel</li>${ziel.kcal ? '<li><span class="lg lg-ziel"></span>Tagesziel</li>' : ''}</ul>` : '<p class="klein">Noch keine Einträge im Tagebuch.</p>'}
</section>

<section class="karte" aria-labelledby="woche-titel">
<h2 id="woche-titel" class="h3">Wochenschnitt</h2>
${wochen.length ? `${dia.balkenDiagramm({ werte: wochen.map((w) => ({ label: w.montag.slice(8, 10) + '.' + w.montag.slice(5, 7) + '.', titel: 'Woche ab ' + kurz(w.montag), wert: w.schnitt })), ziel: ziel.kcal, titel: 'Durchschnittliche Kalorien pro Woche' })}
<table class="tabelle"><thead><tr><th>Woche ab</th><th>Tage</th><th>Schnitt kcal</th>${ziel.kcal ? '<th>Differenz</th>' : ''}</tr></thead><tbody>
${wochen.slice().reverse().map((w) => `<tr><td class="mono">${kurz(w.montag)}</td><td class="mono">${w.tage}</td><td class="mono">${zahl(w.schnitt)}</td>${ziel.kcal ? `<td class="mono">${w.schnitt - ziel.kcal > 0 ? '+' : ''}${zahl(w.schnitt - ziel.kcal)}</td>` : ''}</tr>`).join('')}
</tbody></table><p class="klein">Gezählt werden nur Tage mit Einträgen.</p>` : '<p class="klein">Noch keine Einträge im Tagebuch.</p>'}
</section>

${gewichte.length ? `<details class="aufklapp karte"><summary>Alle Messungen (${gewichte.length})</summary>
<ul class="messungen">${gewichte.slice().reverse().map((g) => `<li><span class="mono">${kurz(g.datum)}</span><span class="mono">${dez(g.kg, 1)} kg</span><button type="button" class="symbol-knopf" data-gw-weg="${g.datum}" aria-label="Messung vom ${kurz(g.datum)} löschen">${icon('muell', 20)}</button></li>`).join('')}</ul></details>` : ''}
</div>`;

  $$('[data-tage]').forEach((b) => { b.onclick = () => { verlaufTage = Number(b.dataset.tage); verlauf(); }; });
  $('#gw-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const kg = lies($('#gw-kg').value), datum = $('#gw-datum').value;
    const f = $('#gw-fehler');
    if (!(kg >= 25 && kg <= 350) || !datum) { f.hidden = false; f.textContent = '✗ Bitte ein Gewicht zwischen 25 und 350 kg und ein Datum angeben.'; return; }
    await db.speichere('gewicht', { datum, kg: R.runde(kg, 1) });
    if (datum === h) { const p = await db.profil(); p.gewicht = R.runde(kg, 1); await db.speichere('profil', p); }
    meldung(`${dez(kg, 1)} kg am ${kurz(datum)} gespeichert.`);
    verlauf();
  };
  $$('[data-gw-weg]').forEach((b) => {
    b.onclick = async () => {
      const alt = gewichte.find((g) => g.datum === b.dataset.gwWeg);
      await db.loesche('gewicht', b.dataset.gwWeg);
      meldung('Messung gelöscht.', 'ok', { text: 'Rückgängig', fn: async () => { await db.speichere('gewicht', alt); verlauf(); } });
      verlauf();
    };
  });
}

/* ====================================================================== Auswertung */
let auswertungZeitraum = 'woche';
function zeitraum(art) {
  const h = heute();
  const montag = plusTage(h, -((alsDatum(h).getDay() + 6) % 7));
  if (art === 'woche') return { von: montag, bis: h, name: 'Diese Woche' };
  if (art === 'vorwoche') return { von: plusTage(montag, -7), bis: plusTage(montag, -1), name: 'Letzte Woche' };
  if (art === 'monat') return { von: plusTage(h, -29), bis: h, name: '30 Tage' };
  return { von: plusTage(h, -6), bis: h, name: '7 Tage' };
}

/** Rangliste als waagrechte Balken: Wert steht als Text daneben, Farbe trägt keine eigene Information */
function rangliste(eintraege, { wert, max, text, klasse, titel, nummern = true }) {
  return `<ol class="rang${nummern ? '' : ' rang-ohne-nr'}" aria-label="${esc(titel)}">${eintraege.map((x, i) => `<li class="rang-zeile">
${nummern ? `<span class="rang-nr mono" aria-hidden="true">${i + 1}</span>` : ''}
<span class="rang-inhalt"><span class="rang-kopf"><span class="rang-name">${esc(x.name)}${x.marke ? `<span class="rang-marke">${esc(x.marke)}</span>` : ''}</span><span class="rang-wert mono">${text(x)}</span></span>
<span class="rang-balken" title="${esc(x.name)}: ${esc(text(x).replace(/<[^>]+>/g, ''))}"><span class="rang-fuell ${klasse}" style="width:${max && wert(x) > 0 ? Math.max(2, (wert(x) / max) * 100) : 0}%"></span></span></span></li>`).join('')}</ol>`;
}

async function auswertung() {
  const z = zeitraum(auswertungZeitraum);
  const tb = await db.bereich('tagebuch', 'datum', z.von, z.bis);
  const s = aw.statistik(tb, z.von, z.bis);
  const ziel = (await zielDaten()).kcal;
  const mzListe = MAHLZEITEN.filter((m) => m.sichtbar || s.proMahlzeit[m.k]).map((m) => ({ name: m.n, kcal: s.proMahlzeit[m.k] || 0 }));
  const ohne = Object.entries(s.proMahlzeit).filter(([k]) => !MAHLZEITEN.some((m) => m.k === k)).reduce((a, [, v]) => a + v, 0);
  if (ohne) mzListe.push({ name: 'Ohne Mahlzeit', kcal: ohne });
  const maxMz = Math.max(1, ...mzListe.map((m) => m.kcal));
  $('#ansicht').innerHTML = `<div class="huelle">
<h1 class="seiten-titel">Auswertung</h1>
<div class="reiter" role="group" aria-label="Zeitraum">
${[['woche', 'Diese Woche'], ['vorwoche', 'Letzte Woche'], ['tage7', '7 Tage'], ['monat', '30 Tage']].map(([k, n]) => `<button type="button" class="reiter-knopf" data-zeitraum="${k}" aria-pressed="${auswertungZeitraum === k}">${n}</button>`).join('')}
</div>
<p class="kontext mono">${kurz(z.von)} - ${kurz(z.bis)}</p>
${!s.eintraege ? leer('teller', 'In diesem Zeitraum: nichts.', 'Keine Einträge, keine Statistik. Wählen Sie einen anderen Zeitraum oder tragen Sie im Tagebuch etwas ein.') : `
<section class="karte" aria-label="Kennzahlen">
<div class="drei">
<div><span class="etikett">Gesamt</span><span class="gross mono">${zahl(s.summe)}</span><span class="klein">kcal</span></div>
<div><span class="etikett">Schnitt/Tag</span><span class="gross mono">${zahl(s.schnittProTag)}</span><span class="klein">${ziel ? `Ziel ${zahl(ziel)}` : 'kcal'}</span></div>
<div><span class="etikett">Tage</span><span class="gross mono">${s.tageMit}/${s.tageGesamt}</span><span class="klein">mit Einträgen</span></div>
</div>
<p class="klein zentriert abstand-oben">${s.eintraege} Einträge | ${s.verschiedene} verschiedene Lebensmittel. Der Schnitt zählt nur Tage mit Einträgen.</p>
</section>

<section class="karte" aria-labelledby="haeufig-titel">
<h2 id="haeufig-titel" class="h3">Am häufigsten gegessen</h2>
<p class="klein">Wie oft ein Lebensmittel eingetragen wurde, an wie vielen Tagen und wie viel insgesamt.</p>
${rangliste(s.haeufig, { wert: (x) => x.anzahl, max: s.haeufig[0].anzahl, klasse: 'rang-anzahl', titel: 'Lebensmittel nach Häufigkeit',
    text: (x) => `${x.anzahl}x <span class="rang-neben">| ${x.tage} ${x.tage === 1 ? 'Tag' : 'Tage'} | ${dez(x.gramm, 0)} g</span>` })}
</section>

<section class="karte" aria-labelledby="top-titel">
<h2 id="top-titel" class="h3">Top 10 nach Kalorien</h2>
<p class="klein">Welche Lebensmittel zusammen die meisten kcal geliefert haben, mit Anteil an allen kcal im Zeitraum.</p>
${rangliste(s.topKcal, { wert: (x) => x.kcal, max: s.topKcal[0].kcal, klasse: 'rang-kcal', titel: 'Top 10 Lebensmittel nach Kalorien',
    text: (x) => `${zahl(x.kcal)} kcal <span class="rang-neben">| ${dez(x.anteil, 1)} %</span>` })}
<p class="klein abstand-oben">Die Top 10 liefern zusammen <b class="mono">${dez(s.topKcal.reduce((a, x) => a + x.anteil, 0), 1)} %</b> Ihrer kcal.</p>
</section>

<section class="karte" aria-labelledby="mz-titel">
<h2 id="mz-titel" class="h3">Nach Mahlzeit</h2>
${rangliste(mzListe, { wert: (x) => x.kcal, max: maxMz, klasse: 'rang-mahlzeit', titel: 'Kalorien nach Mahlzeit', nummern: false,
    text: (x) => `${zahl(x.kcal)} kcal <span class="rang-neben">| ${s.summe ? dez((x.kcal / s.summe) * 100, 0) : 0} %</span>` })}
</section>`}
</div>`;
  $$('[data-zeitraum]').forEach((b) => { b.onclick = () => { auswertungZeitraum = b.dataset.zeitraum; auswertung(); }; });
}

/* ====================================================================== Einstellungen */
async function einstellungenSeite() {
  await ladeEinstellungen();
  const tb = await db.alle('tagebuch');
  const anzahlJe = {};
  for (const e of tb) anzahlJe[e.mahlzeit] = (anzahlJe[e.mahlzeit] || 0) + 1;
  const standard = new Set(db.MAHLZEITEN_STANDARD.map((m) => m.k));
  const ausgeblendet = Object.keys(EIN.verlaufAusgeblendet).length;
  const schalter = (id, an, titel, text) => `<label class="schalter"><input type="checkbox" id="${id}"${an ? ' checked' : ''}><span class="schalter-bahn" aria-hidden="true"></span><span class="schalter-text">${titel}${text ? `<br><span class="klein">${text}</span>` : ''}</span></label>`;
  const dunkel = document.documentElement.getAttribute('data-theme') === 'dunkel';
  $('#ansicht').innerHTML = `<div class="huelle">
<h1 class="seiten-titel">Einstellungen</h1>
<p class="klein">Änderungen werden sofort gespeichert.</p>

<section class="karte" aria-labelledby="mz-einst">
<h2 id="mz-einst" class="h3">Mahlzeiten</h2>
<p class="klein">Ausgeblendete Mahlzeiten verschwinden aus Tagebuch und Auswahl. Einträge darin bleiben erhalten und erscheinen an ihrem Tag weiter.</p>
<ol class="mz-liste">${MAHLZEITEN.map((m, i) => `<li class="mz-zeile${m.sichtbar ? '' : ' mz-aus'}">
<label class="schalter mz-schalter"><input type="checkbox" data-mz-sichtbar="${i}"${m.sichtbar ? ' checked' : ''} aria-label="${esc(m.n)} anzeigen"><span class="schalter-bahn" aria-hidden="true"></span></label>
<label class="unsichtbar" for="mz-name-${i}">Name der Mahlzeit ${i + 1}</label>
<input class="eingabe eingabe-text mz-name" id="mz-name-${i}" data-mz-name="${i}" maxlength="30" value="${esc(m.n)}">
<span class="mz-knoepfe">
<button type="button" class="symbol-knopf" data-mz-hoch="${i}" aria-label="${esc(m.n)} nach oben"${i === 0 ? ' disabled' : ''}>${icon('hoch', 18)}</button>
<button type="button" class="symbol-knopf" data-mz-runter="${i}" aria-label="${esc(m.n)} nach unten"${i === MAHLZEITEN.length - 1 ? ' disabled' : ''}>${icon('runter', 18)}</button>
${standard.has(m.k) ? '' : `<button type="button" class="symbol-knopf" data-mz-weg="${i}" aria-label="${esc(m.n)} löschen">${icon('muell', 18)}</button>`}
</span>
<span class="klein mono mz-anzahl">${anzahlJe[m.k] || 0} Einträge</span></li>`).join('')}</ol>
<form id="mz-neu" class="such-form abstand-oben"><label class="unsichtbar" for="mz-neu-name">Neue Mahlzeit</label><input class="eingabe eingabe-text" id="mz-neu-name" maxlength="30" placeholder="z. B. Zwischenmahlzeit, Nach dem Sport" autocomplete="off"><button class="knopf" type="submit">${icon('plus', 20)}Hinzufügen</button></form>
<p class="fehlermeldung" id="mz-fehler" hidden></p>
<button type="button" class="knopf knopf-zwei knopf-klein abstand-oben" id="mz-standard">Mahlzeiten auf Standard zurücksetzen</button>
</section>

<section class="karte" aria-labelledby="anz-einst">
<h2 id="anz-einst" class="h3">Anzeige im Tagebuch</h2>
<div class="formular">
${schalter('e-makros', EIN.zeigeMakros, 'Makros anzeigen', 'Balken für Eiweiß, Fett und Kohlenhydrate')}
${schalter('e-wasser', EIN.zeigeWasser, 'Wasserzähler anzeigen', '')}
${schalter('e-tipps', EIN.zeigeTipps, 'Vorschläge bei den Mahlzeiten', 'Bis zu drei Knöpfe zum Sofort-Eintragen häufiger Lebensmittel')}
${schalter('e-dunkel', dunkel, 'Dunkelmodus', '')}
</div>
</section>

<section class="karte" aria-labelledby="vl-einst">
<h2 id="vl-einst" class="h3">Verlauf und Vorschläge</h2>
<p class="klein">${ausgeblendet ? `<span class="mono">${ausgeblendet}</span> ${ausgeblendet === 1 ? 'Lebensmittel ist' : 'Lebensmittel sind'} ausgeblendet. Sie erscheinen von selbst wieder, sobald Sie sie erneut eintragen.` : 'Nichts ausgeblendet. Mit dem x in Lebensmittel → Häufig bzw. Verlauf entfernen Sie Einträge aus diesen Listen.'}</p>
${ausgeblendet ? '<button type="button" class="knopf knopf-zwei knopf-klein" id="vl-zurueck">Alle wieder anzeigen</button>' : ''}
</section>
</div>`;

  const fehler = $('#mz-fehler');
  const sichern = async (text) => {
    if (!EIN.mahlzeiten.some((m) => m.sichtbar)) { fehler.hidden = false; fehler.textContent = '✗ Mindestens eine Mahlzeit muss sichtbar bleiben.'; return false; }
    fehler.hidden = true;
    await db.speichereEinstellungen(EIN);
    MAHLZEITEN = EIN.mahlzeiten;
    meldung(text || 'Gespeichert.');
    return true;
  };
  const neuZeichnen = () => einstellungenSeite();
  $$('[data-mz-sichtbar]').forEach((c) => {
    c.onchange = async () => {
      const m = EIN.mahlzeiten[Number(c.dataset.mzSichtbar)];
      m.sichtbar = c.checked;
      if (!(await sichern(`${m.n} ${m.sichtbar ? 'eingeblendet' : 'ausgeblendet'}.`))) { m.sichtbar = true; c.checked = true; return; }
      c.closest('.mz-zeile').classList.toggle('mz-aus', !m.sichtbar);
    };
  });
  $$('[data-mz-name]').forEach((f) => {
    f.onchange = async () => {
      const m = EIN.mahlzeiten[Number(f.dataset.mzName)];
      const n = f.value.trim();
      if (!n) { f.value = m.n; fehler.hidden = false; fehler.textContent = '✗ Eine Mahlzeit braucht einen Namen.'; return; }
      m.n = n; await sichern(`Umbenannt in ${n}.`);
    };
  });
  const tausche = async (i, j) => { const l = EIN.mahlzeiten; [l[i], l[j]] = [l[j], l[i]]; await sichern('Reihenfolge gespeichert.'); neuZeichnen(); };
  $$('[data-mz-hoch]').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.mzHoch); if (i > 0) tausche(i, i - 1); }; });
  $$('[data-mz-runter]').forEach((b) => { b.onclick = () => { const i = Number(b.dataset.mzRunter); if (i < EIN.mahlzeiten.length - 1) tausche(i, i + 1); }; });
  $$('[data-mz-weg]').forEach((b) => {
    b.onclick = async () => {
      const i = Number(b.dataset.mzWeg), m = EIN.mahlzeiten[i];
      if (anzahlJe[m.k]) { fehler.hidden = false; fehler.textContent = `✗ ${m.n} hat ${anzahlJe[m.k]} Einträge und kann daher nicht gelöscht werden. Blenden Sie die Mahlzeit stattdessen aus.`; return; }
      EIN.mahlzeiten.splice(i, 1);
      if (await sichern(`${m.n} gelöscht.`)) neuZeichnen(); else EIN.mahlzeiten.splice(i, 0, m);
    };
  });
  $('#mz-neu').onsubmit = async (ev) => {
    ev.preventDefault();
    const n = $('#mz-neu-name').value.trim();
    if (!n) { $('#mz-neu-name').focus(); return; }
    if (EIN.mahlzeiten.some((m) => m.n.toLowerCase() === n.toLowerCase())) { fehler.hidden = false; fehler.textContent = `✗ ${n} gibt es schon.`; return; }
    EIN.mahlzeiten.push({ k: 'm_' + Date.now().toString(36), n, sichtbar: true });
    if (await sichern(`${n} hinzugefügt.`)) neuZeichnen();
  };
  $('#mz-standard').onclick = async () => {
    // Standard-Mahlzeiten wiederherstellen, eigene bleiben (ausgeblendet) erhalten, damit ihre Einträge nicht verloren gehen
    const eigene = EIN.mahlzeiten.filter((m) => !standard.has(m.k)).map((m) => ({ ...m, sichtbar: false }));
    EIN.mahlzeiten = [...db.MAHLZEITEN_STANDARD.map((m) => ({ ...m })), ...eigene];
    if (await sichern('Mahlzeiten zurückgesetzt.')) neuZeichnen();
  };
  const anzeige = (id, feld, text) => { $(id).onchange = async (ev) => { EIN[feld] = ev.target.checked; await sichern(`${text} ${ev.target.checked ? 'an' : 'aus'}.`); }; };
  anzeige('#e-makros', 'zeigeMakros', 'Makros');
  anzeige('#e-wasser', 'zeigeWasser', 'Wasserzähler');
  anzeige('#e-tipps', 'zeigeTipps', 'Vorschläge');
  $('#e-dunkel').onchange = (ev) => setzeThema(ev.target.checked ? 'dunkel' : 'hell');
  const vz = $('#vl-zurueck');
  if (vz) vz.onclick = async () => { EIN.verlaufAusgeblendet = {}; await sichern('Alle Lebensmittel werden wieder angezeigt.'); neuZeichnen(); };
}

/* ====================================================================== Ziele */
async function ziele() {
  const p = await db.profil();
  const g = await db.alle('gewicht');
  const letztes = g.sort((a, b) => a.datum.localeCompare(b.datum)).pop();
  const opt = (wert, aktuell) => (String(wert) === String(aktuell) ? ' selected' : '');
  $('#ansicht').innerHTML = `<div class="huelle schmal">
<h1 class="seiten-titel">Ziele</h1>
<form id="ziel-form" class="formular" novalidate>
<fieldset class="gruppe"><legend>Profil</legend>
<div class="feld"><span class="feld-titel" id="geschlecht-titel">Geschlecht (für die Formel)</span>
<div class="wahl" role="radiogroup" aria-labelledby="geschlecht-titel">
${[['w', 'weiblich'], ['m', 'männlich'], ['d', 'keine Angabe']].map(([k, n]) => `<label class="wahl-knopf"><input type="radio" name="geschlecht" value="${k}"${p.geschlecht === k ? ' checked' : ''}><span>${n}</span></label>`).join('')}
</div></div>
<div class="drei-feld">
<div class="feld"><label for="z-alter">Alter</label><input class="eingabe" id="z-alter" inputmode="numeric" value="${p.alter ?? ''}"></div>
<div class="feld"><label for="z-groesse">Größe in cm</label><input class="eingabe" id="z-groesse" inputmode="numeric" value="${p.groesse ?? ''}"></div>
<div class="feld"><label for="z-gewicht">Gewicht in kg</label><input class="eingabe" id="z-gewicht" inputmode="decimal" value="${p.gewicht != null ? String(p.gewicht).replace('.', ',') : letztes ? String(letztes.kg).replace('.', ',') : ''}"></div>
</div>
<div class="feld"><label for="z-aktiv">Aktivität im Alltag</label><select class="eingabe" id="z-aktiv">${Object.entries(R.AKTIVITAET).map(([k, a]) => `<option value="${k}"${opt(k, p.aktivitaet)}>${a.text} | Faktor ${dez(a.faktor, 3)}</option>`).join('')}</select></div>
</fieldset>
<fieldset class="gruppe"><legend>Ziel</legend>
<div class="wahl" role="radiogroup" aria-label="Ziel">
${[['abnehmen', 'abnehmen'], ['halten', 'halten'], ['zunehmen', 'zunehmen']].map(([k, n]) => `<label class="wahl-knopf"><input type="radio" name="ziel" value="${k}"${p.ziel === k ? ' checked' : ''}><span>${n}</span></label>`).join('')}
</div>
<div class="zwei" id="tempo-zeile">
<div class="feld"><label for="z-tempo">Tempo</label><select class="eingabe" id="z-tempo">${[0.25, 0.5, 0.75, 1].map((t) => `<option value="${t}"${opt(t, p.tempo)}>${dez(t, 2)} kg pro Woche</option>`).join('')}</select></div>
<div class="feld"><label for="z-zielkg">Zielgewicht in kg</label><input class="eingabe" id="z-zielkg" inputmode="decimal" value="${p.zielgewicht != null ? String(p.zielgewicht).replace('.', ',') : ''}"></div>
</div>
</fieldset>
<div id="ziel-ergebnis" aria-live="polite"></div>
<fieldset class="gruppe"><legend>Tagesziel</legend>
<div class="feld"><label for="z-manuell">Eigenes Tagesziel in kcal <span class="einheit">leer = Vorschlag</span></label><input class="eingabe" id="z-manuell" inputmode="numeric" value="${p.kcalManuell ?? ''}"></div>
</fieldset>
<fieldset class="gruppe"><legend>Makros (Anteil an den kcal)</legend>
<div class="drei-feld">
<div class="feld"><label for="z-ew">Eiweiß %</label><input class="eingabe" id="z-ew" inputmode="numeric" value="${p.makro.eiweiss}"></div>
<div class="feld"><label for="z-fe">Fett %</label><input class="eingabe" id="z-fe" inputmode="numeric" value="${p.makro.fett}"></div>
<div class="feld"><label for="z-kh">Kohlenhydrate %</label><input class="eingabe" id="z-kh" inputmode="numeric" value="${p.makro.kh}"></div>
</div>
<div id="makro-ergebnis" class="klein mono" aria-live="polite"></div>
<button type="button" class="knopf knopf-zwei knopf-klein" id="makro-vorschlag">Vorschlag einsetzen</button>
</fieldset>
<fieldset class="gruppe"><legend>Wasser</legend>
<div class="zwei">
<div class="feld"><label for="z-wasser">Ziel in Gläsern</label><input class="eingabe" id="z-wasser" inputmode="numeric" value="${p.wasserZiel}"></div>
<div class="feld"><label for="z-glas">Glasgröße in ml</label><input class="eingabe" id="z-glas" inputmode="numeric" value="${p.glasMl}"></div>
</div></fieldset>
<p class="fehlermeldung" id="z-fehler" hidden></p>
<div class="knopfzeile"><button type="submit" class="knopf">Speichern</button></div>
</form>
<div class="hinweis">${icon('info')}<p>BaseBite rechnet mit Faustformeln und ersetzt keine ärztliche oder ernährungsfachliche Beratung. Bei Vorerkrankungen, in Schwangerschaft und Stillzeit, für Kinder und Jugendliche oder bei Essstörungen bitte Ziele nur mit ärztlicher Begleitung festlegen.</p></div>
</div>`;

  const lesen = () => {
    const n = { ...p, makro: { ...p.makro } };
    n.geschlecht = ($('input[name=geschlecht]:checked') || {}).value || '';
    n.alter = lies($('#z-alter').value); n.groesse = lies($('#z-groesse').value); n.gewicht = lies($('#z-gewicht').value);
    n.aktivitaet = $('#z-aktiv').value;
    n.ziel = ($('input[name=ziel]:checked') || {}).value || 'halten';
    n.tempo = Number($('#z-tempo').value); n.zielgewicht = lies($('#z-zielkg').value);
    n.kcalManuell = lies($('#z-manuell').value) > 0 ? Math.round(lies($('#z-manuell').value)) : null;
    n.makro = { eiweiss: lies($('#z-ew').value) || 0, fett: lies($('#z-fe').value) || 0, kh: lies($('#z-kh').value) || 0 };
    n.wasserZiel = Math.min(30, Math.max(1, Math.round(lies($('#z-wasser').value) || 8)));
    n.glasMl = Math.max(50, Math.round(lies($('#z-glas').value) || 250));
    return n;
  };
  const aktualisiere = () => {
    const n = lesen();
    $('#tempo-zeile').hidden = n.ziel === 'halten';
    const v = R.zielVorschlag(n);
    const box = $('#ziel-ergebnis');
    if (!v) { box.innerHTML = '<p class="klein">Geschlecht, Alter, Größe und Gewicht ausfüllen, dann rechnet BaseBite Ihren Bedarf aus.</p>'; $('#makro-ergebnis').textContent = ''; return n; }
    const aktiv = n.kcalManuell || v.vorschlag;
    const pr = R.pruefeZiel(n, aktiv);
    const b = R.bmi(n.gewicht, n.groesse);
    const bmrFormel = `10 x ${dez(n.gewicht, 1)} + 6,25 x ${dez(n.groesse, 0)} - 5 x ${dez(n.alter, 0)} ${n.geschlecht === 'm' ? '+ 5' : n.geschlecht === 'w' ? '- 161' : '- 78'}`;
    const html = `<div class="karte ergebnis-karte">
<div class="drei"><div><span class="etikett">Grundumsatz</span><span class="gross mono">${zahl(v.bmr)}</span><span class="klein">kcal</span></div>
<div><span class="etikett">Gesamtumsatz</span><span class="gross mono">${zahl(v.tdee)}</span><span class="klein">kcal</span></div>
<div><span class="etikett">Vorschlag</span><span class="gross mono akzent">${zahl(v.vorschlag)}</span><span class="klein">kcal/Tag</span></div></div>
<details class="aufklapp"><summary>So wird gerechnet</summary><p class="klein mono">Grundumsatz (Mifflin-St Jeor) = ${bmrFormel} = ${zahl(v.bmr)}<br>Gesamtumsatz = ${zahl(v.bmr)} x ${dez(R.AKTIVITAET[n.aktivitaet].faktor, 3)} = ${zahl(v.tdee)}<br>${n.ziel === 'halten' ? 'Ziel halten: keine Differenz' : `${n.ziel === 'abnehmen' ? 'Defizit' : 'Überschuss'} = ${dez(n.tempo, 2)} kg x 7.700 kcal / 7 Tage = ${zahl(Math.abs(v.differenz))}`}<br>Vorschlag = ${zahl(v.tdee)} ${v.differenz < 0 ? '-' : '+'} ${zahl(Math.abs(v.differenz))} = ${zahl(v.vorschlag)} (auf 10 gerundet)${b ? `<br>BMI = ${dez(n.gewicht, 1)} / ${dez(n.groesse / 100, 2)}² = ${dez(b, 1)}` : ''}</p></details>
</div>
${pr.warnungen.length ? `<div class="warnung" role="alert"><p class="warnung-titel">${icon('warnung')}Dieses Ziel ist ${n.kcalManuell ? '' : 'mit diesem Tempo '}nicht gesund</p>
<ul>${pr.warnungen.map((w) => `<li><b>${esc(w.titel)}.</b> ${esc(w.grund)}</li>`).join('')}</ul>
${pr.gegenvorschlag ? `<p>Gegenvorschlag: <b class="mono">${zahl(pr.gegenvorschlag.kcal)} kcal</b> pro Tag${n.ziel === 'abnehmen' ? ` (ca. <span class="mono">${dez(pr.gegenvorschlag.tempo, 2)} kg</span> pro Woche)` : ''}.</p>
<button type="button" class="knopf knopf-zwei knopf-klein" id="gegen-uebernehmen">Gegenvorschlag übernehmen</button>` : ''}
<p class="klein">BaseBite ersetzt keine ärztliche Beratung.</p></div>` : ''}`;
    // nur neu zeichnen, wenn sich etwas ändert (sonst verschwindet ein Knopf mitten im Antippen)
    if (box.dataset.html !== html) {
      const offen = !!box.querySelector('details[open]');
      box.innerHTML = html; box.dataset.html = html;
      if (offen && box.querySelector('details')) box.querySelector('details').open = true;
    }
    box.onclick = (ev) => {
      if (!ev.target.closest('#gegen-uebernehmen')) return;
      const aktuell = R.pruefeZiel(lesen(), lesen().kcalManuell || R.zielVorschlag(lesen()).vorschlag);
      if (aktuell.gegenvorschlag) { $('#z-manuell').value = aktuell.gegenvorschlag.kcal; aktualisiere(); }
    };
    const summe = n.makro.eiweiss + n.makro.fett + n.makro.kh;
    const mg = R.makroGramm(aktiv, n.makro);
    $('#makro-ergebnis').innerHTML = summe === 100
      ? `Bei ${zahl(aktiv)} kcal: Eiweiß ${zahl(mg.eiweiss)} g | Fett ${zahl(mg.fett)} g | KH ${zahl(mg.kh)} g`
      : `<span class="fehler-text">✗ Summe ist ${zahl(summe)} %, bitte auf 100 % bringen.</span>`;
    return n;
  };
  $('#ziel-form').oninput = aktualisiere;
  $('#ziel-form').onchange = aktualisiere;
  $('#makro-vorschlag').onclick = () => {
    const n = lesen();
    const v = n.ziel === 'abnehmen' ? [25, 30, 45] : [20, 30, 50];
    [$('#z-ew').value, $('#z-fe').value, $('#z-kh').value] = v.map(String);
    aktualisiere();
  };
  aktualisiere();
  $('#ziel-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const n = aktualisiere();
    const f = $('#z-fehler');
    if (n.makro.eiweiss + n.makro.fett + n.makro.kh !== 100) { f.hidden = false; f.textContent = '✗ Die Makro-Anteile müssen zusammen 100 % ergeben.'; return; }
    if (n.alter != null && (n.alter < 14 || n.alter > 110)) { f.hidden = false; f.textContent = '✗ Die Formel gilt für Erwachsene. Bitte ein Alter ab 14 Jahren angeben (unter 18 nur mit ärztlicher Begleitung).'; return; }
    f.hidden = true;
    await db.speichere('profil', n);
    if (n.gewicht > 0) { const d = heute(); if (!(await db.hole('gewicht', d))) await db.speichere('gewicht', { datum: d, kg: R.runde(n.gewicht, 1) }); }
    meldung('Ziele gespeichert.');
  };
}

/* ====================================================================== Erinnerungen */
async function erinnerungen() {
  const e = erin.lade();
  const status = erin.erlaubnisStatus();
  const statusText = { nativ: 'APK: Das System plant die Erinnerungen.', granted: 'Benachrichtigungen sind erlaubt.', denied: 'Benachrichtigungen sind blockiert. Erlauben Sie sie in den Einstellungen des Browsers bzw. von Android.', default: 'Benachrichtigungen sind noch nicht erlaubt.', 'nicht-unterstuetzt': 'Dieser Browser unterstützt keine Benachrichtigungen.' }[status];
  $('#ansicht').innerHTML = `<div class="huelle schmal">
<h1 class="seiten-titel">Erinnerungen</h1>
<form id="er-form" class="formular" novalidate>
${Object.entries(erin.ARTEN).map(([k, a]) => `<div class="karte er-karte">
<label class="schalter"><input type="checkbox" id="er-${k}"${e[k].an ? ' checked' : ''}><span class="schalter-bahn" aria-hidden="true"></span><span class="schalter-text">${a.titel}</span></label>
<div class="feld"><label for="er-${k}-zeit">Uhrzeit${k === 'wasser' ? 'en, mit Komma getrennt' : ''}</label><input class="eingabe" id="er-${k}-zeit" value="${esc(e[k].zeiten)}" ${k === 'wasser' ? '' : 'type="time"'}></div>
<p class="klein">${esc(a.text)}</p></div>`).join('')}
<p class="klein" id="er-status">${icon('glocke', 16)} ${esc(statusText)}</p>
<div class="knopfzeile"><button type="submit" class="knopf">Speichern</button><button type="button" class="knopf knopf-zwei" id="er-test">Test-Benachrichtigung</button></div>
</form>
<details class="aufklapp karte" ${erin.nativ() ? '' : 'open'}><summary>Was geht in der PWA, was in der APK?</summary>
<p><b>APK (installierte App):</b> Die Erinnerungen werden beim Speichern an Android übergeben und kommen jeden Tag zuverlässig zur eingestellten Zeit, auch wenn BaseBite geschlossen ist. Nach einem Neustart des Handys plant Android sie selbst neu.</p>
<p><b>PWA (im Browser bzw. zum Startbildschirm hinzugefügt):</b> Geplante Benachrichtigungen ohne Server gibt es im Browser nicht. BaseBite erinnert deshalb nur, solange die App geöffnet ist oder kurz im Hintergrund noch läuft. Was verpasst wurde, zeigt die App beim nächsten Öffnen oben im Tagebuch an. Für echte Erinnerungen bitte die APK verwenden.</p>
<p class="klein">Ein Push-Dienst würde zwar funktionieren, bräuchte aber einen Server, der weiß, wann Sie erinnert werden wollen. Das widerspricht dem Grundsatz "alles bleibt auf dem Gerät".</p>
</details>
</div>`;
  const sammle = () => {
    for (const k of Object.keys(erin.ARTEN)) { e[k].an = $('#er-' + k).checked; e[k].zeiten = $('#er-' + k + '-zeit').value.trim() || erin.ARTEN[k].standard; }
    return e;
  };
  $('#er-form').onsubmit = async (ev) => {
    ev.preventDefault();
    sammle();
    const irgendwas = Object.keys(erin.ARTEN).some((k) => e[k].an);
    if (irgendwas && erin.erlaubnisStatus() !== 'granted' && erin.erlaubnisStatus() !== 'nicht-unterstuetzt') {
      const r = await erin.erlaubnisAnfragen();
      if (r !== 'granted') meldung('Ohne Erlaubnis kann BaseBite nicht erinnern.', 'fehler');
    }
    for (const k of Object.keys(erin.ARTEN)) if (e[k].an && !erin.zeiten(e[k].zeiten).length) { meldung(`Bitte eine gültige Uhrzeit für ${erin.ARTEN[k].titel} angeben, z. B. 07:30.`, 'fehler'); return; }
    erin.speichere(e);
    try { await erin.planeNativ(e); } catch (x) { meldung('Planen fehlgeschlagen: ' + x.message, 'fehler'); return; }
    meldung('Erinnerungen gespeichert.');
    erinnerungen();
  };
  $('#er-test').onclick = async () => {
    const r = await erin.erlaubnisAnfragen();
    if (r !== 'granted') { meldung('Benachrichtigungen sind nicht erlaubt.', 'fehler'); return; }
    if (erin.nativ()) {
      await window.Capacitor.Plugins.LocalNotifications.schedule({ notifications: [{ id: 999, title: 'BaseBite', body: 'So sieht eine Erinnerung aus.', schedule: { at: new Date(Date.now() + 3000) }, smallIcon: 'ic_stat_basebite' }] });
      meldung('Kommt in 3 Sekunden.');
    } else {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('BaseBite', { body: 'So sieht eine Erinnerung aus.', icon: 'icons/icon-192.png', tag: 'basebite-test' });
    }
  };
}

/* ====================================================================== Ihre Daten */
async function ihreDaten() {
  const zaehle = {};
  for (const s of db.STORES) zaehle[s] = (await db.alle(s)).length;
  let schaetzung = '';
  if (navigator.storage && navigator.storage.estimate) {
    try { const s = await navigator.storage.estimate(); schaetzung = `${dez(s.usage / 1024 / 1024, 2)} MB belegt`; } catch (e) { /* egal */ }
  }
  let dauerhaft = null;
  if (navigator.storage && navigator.storage.persisted) { try { dauerhaft = await navigator.storage.persisted(); } catch (e) { /* egal */ } }
  const anzahl = (name) => { const s = name.split(' → ')[1]; return s && zaehle[s] != null ? ` <span class="mono klein">(${zaehle[s]})</span>` : ''; };
  $('#ansicht').innerHTML = `<div class="huelle schmal text">
<h1 class="seiten-titel">Ihre Daten</h1>
<div class="kernsatz">${icon('schloss')}<p><b>Gesundheitsdaten wie Gewicht und Ernährung bleiben ausschließlich auf diesem Gerät: kein Server, kein Konto, keine Weitergabe.</b> BaseBite setzt keine Cookies, zeigt keine Werbung und zählt keine Besuche.</p></div>

<h2 class="h3">Was wird gespeichert?</h2>
<div class="tabelle-huelle"><table class="tabelle daten-tabelle">
<thead><tr><th scope="col">Was wird gespeichert</th><th scope="col">Wo</th><th scope="col">Zweck</th><th scope="col">Wie lange</th></tr></thead>
<tbody>${db.SPEICHER.map((s) => `<tr><td data-label="Was"><b>${esc(s.was)}</b>${anzahl(s.name)}<br><span class="mono klein">${esc(s.name)}</span></td><td data-label="Wo">${esc(s.wo)}</td><td data-label="Zweck">${esc(s.zweck)}</td><td data-label="Wie lange">${s.wo === 'Cache Storage' ? 'Bis zur nächsten Version oder bis Sie es löschen' : 'Bis Sie es löschen'}</td></tr>`).join('')}</tbody>
</table></div>
<p class="klein">Alle drei Speicherorte liegen im Browser bzw. in der App auf diesem Gerät. Nichts davon wird an Base B oder an andere übertragen.${schaetzung ? ` Aktuell: <span class="mono">${schaetzung}</span>.` : ''}${dauerhaft === true ? ' Der Browser hat zugesagt, die Daten nicht automatisch zu löschen.' : dauerhaft === false ? ' Der Browser darf die Daten bei Speichermangel löschen, deshalb ist ein Backup wichtig.' : ''}</p>

<h2 class="h3">Was geht an Open Food Facts?</h2>
<p>Wenn Sie nach einem Lebensmittel suchen oder einen Barcode scannen, schickt BaseBite <b>nur das Suchwort bzw. die Barcode-Nummer</b> an Open Food Facts (gemeinnütziger Verein, Frankreich). Technisch bedingt sieht deren Server dabei Ihre IP-Adresse. Kein Gewicht, kein Tagebuch, kein Profil, kein Kamerabild.</p>
<p><a href="${off.OFF_DATENSCHUTZ}" target="_blank" rel="noopener">Datenschutzerklärung von Open Food Facts ${icon('extern', 16)}</a></p>
<label class="schalter karte"><input type="checkbox" id="nur-offline"${off.nurOffline() ? ' checked' : ''}><span class="schalter-bahn" aria-hidden="true"></span><span class="schalter-text"><b>Nur offline / eigene Lebensmittel</b><br><span class="klein">Schaltet alle Abfragen an Open Food Facts ab. Gesucht wird nur in eigenen und bereits gespeicherten Lebensmitteln.</span></span></label>

<h2 class="h3">Sichern und löschen</h2>
<div class="hinweis">${icon('warnung')}<p><b>Browserdaten löschen oder die App deinstallieren löscht alle Einträge.</b> Exportieren Sie deshalb regelmäßig ein Backup, z. B. einmal pro Woche. PWA und APK speichern getrennt: Zum Umziehen Backup in der einen exportieren und in der anderen importieren.</p></div>
<div class="knopfzeile">
<button type="button" class="knopf" id="exp-json">${icon('speichern', 20)}Backup exportieren</button>
<button type="button" class="knopf knopf-zwei" id="exp-csv">${icon('speichern', 20)}CSV exportieren</button>
</div>
<div class="knopfzeile">
<label class="knopf knopf-zwei datei-knopf">${icon('upload', 20)}Backup importieren<input type="file" id="imp-datei" accept=".json,.csv,application/json,text/csv"></label>
<button type="button" class="knopf knopf-gefahr" id="alles-weg">${icon('muell', 20)}Alle Daten löschen</button>
</div>
<p class="klein">JSON = vollständiges Backup (alles inklusive Einstellungen). CSV = Tagebuch, Gewicht und Wasser für Excel; beim Import einer CSV werden diese Einträge ergänzt.</p>
<p class="klein">Dateien heißen <span class="mono">BaseB_Kalorienzaehler_JJJJMMTT.json</span> bzw. <span class="mono">.csv</span>.</p>
</div>`;

  $('#nur-offline').onchange = (ev) => { db.lsSchreib('basebite.nurOffline', ev.target.checked ? '1' : null); meldung(ev.target.checked ? 'Nur offline: Keine Abfragen mehr an Open Food Facts.' : 'Open Food Facts ist wieder eingeschaltet.'); };
  $('#exp-json').onclick = async () => { try { meldung(await ex.exportJson()); } catch (e) { meldung('Export fehlgeschlagen: ' + e.message, 'fehler'); } };
  $('#exp-csv').onclick = async () => { try { meldung(await ex.exportCsv(Object.fromEntries(MAHLZEITEN.map((m) => [m.k, m.n])))); } catch (e) { meldung('Export fehlgeschlagen: ' + e.message, 'fehler'); } };
  $('#imp-datei').onchange = async (ev) => {
    const datei = ev.target.files[0];
    ev.target.value = '';
    if (!datei) return;
    const text = await datei.text();
    try {
      if (/\.csv$/i.test(datei.name) || datei.type.includes('csv')) {
        const r = await ex.importCsv(text, Object.fromEntries(MAHLZEITEN.map((m) => [m.k, m.n])));
        meldung(`Importiert: ${r.eintraege} Einträge, ${r.gewicht} Gewichte, ${r.wasser} Wassertage.`);
      } else {
        const s = JSON.parse(text);
        if (s.app !== 'BaseBite') throw new Error('Das ist keine BaseBite-Sicherung.');
        const ersetzen = await bestaetige(`Sicherung vom <span class="mono">${esc(kurz((s.exportiert || '').slice(0, 10) || heute()))}</span> einspielen.<br><br><b>Ja, ersetzen</b>: alle jetzigen Daten werden durch die Sicherung ersetzt.<br><b>Abbrechen</b>: Sicherung wird mit den jetzigen Daten zusammengeführt (gleiche Einträge werden überschrieben).`, { titel: 'Backup importieren', ja: 'Ja, ersetzen', gefahr: true });
        const n = await db.importiere(s, ersetzen);
        await ladeEinstellungen();
        setzeThema(db.lsLies('basebite.thema') === 'dunkel' ? 'dunkel' : 'hell');
        meldung(`${n} Datensätze importiert${ersetzen ? ' (ersetzt)' : ' (zusammengeführt)'}.`);
      }
      ihreDaten();
    } catch (e) { meldung(e instanceof SyntaxError ? 'Die Datei ist kein gültiges JSON.' : e.message, 'fehler'); }
  };
  $('#alles-weg').onclick = async () => {
    const ok = await bestaetige('Wirklich <b>alle</b> Daten von BaseBite auf diesem Gerät löschen? Tagebuch, Gewicht, Profil, Rezepte, eigene Lebensmittel, Einstellungen und der Offline-Speicher werden gelöscht. Das lässt sich nicht rückgängig machen.<br><br>Tipp: Vorher ein Backup exportieren.', { titel: 'Alle Daten löschen', ja: 'Endgültig löschen', gefahr: true });
    if (!ok) return;
    try {
      await erin.planeNativ({ eintragen: { an: false }, wiegen: { an: false }, wasser: { an: false } }).catch(() => {});
      await db.allesLoeschen();
      if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    } catch (e) { meldung('Löschen fehlgeschlagen: ' + e.message, 'fehler'); return; }
    document.documentElement.removeAttribute('data-theme');
    $('#ansicht').innerHTML = `<div class="huelle schmal">${leer('teller', 'Alles gelöscht.', 'Tabula rasa. Auf diesem Gerät liegt nichts mehr von BaseBite. Beim nächsten Öffnen startet die App wie neu.')}<p><a class="knopf" href="./">Neu starten</a></p></div>`;
  };
}

/* ====================================================================== Info */
function info() {
  $('#ansicht').innerHTML = `<div class="huelle schmal text">
<h1 class="seiten-titel">Über BaseBite</h1>
<p>BaseBite ist der Kalorienzähler von Base B. Er läuft vollständig auf Ihrem Gerät, auch offline.</p>
<p class="mono klein">Version ${VERSION} | ${nativ() ? 'APK' : 'PWA'}</p>
<h2 class="h3">Quellen und Lizenzen</h2>
<ul>
<li>Produktdaten: <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a>, Datenbank unter der Open Database License (ODbL), Inhalte unter der Database Contents License.</li>
<li>Barcode-Erkennung (Ersatz, falls der Browser keinen eigenen Scanner hat): ZXing, Apache-Lizenz 2.0.</li>
<li>Schriften: Lexend und JetBrains Mono, SIL Open Font License 1.1.</li>
<li>Grundumsatz nach Mifflin-St Jeor (1990), Faustwert 7.700 kcal pro kg Körperfett.</li>
</ul>
<div class="hinweis">${icon('info')}<p>BaseBite ersetzt keine ärztliche Beratung. Alle Werte sind Schätzungen.</p></div>
<p><a href="#/daten">Ihre Daten</a></p>
<p class="klein mono">base-b.de | kein Tracking, keine Werbung, nur Bits</p>
</div>`;
}

/* ====================================================================== Menü */
function schliesseMenue() {
  const m = $('#app-menue'), k = $('#menue-knopf');
  if (m) m.hidden = true;
  if (k) k.setAttribute('aria-expanded', 'false');
}

/* ====================================================================== Erststart */
function erststart() {
  if (db.lsLies('basebite.erststart')) return;
  const d = oeffneDialog(`
<p>BaseBite speichert alles <b>nur auf diesem Gerät</b>: Tagebuch, Gewicht, Profil, Rezepte und eigene Lebensmittel in der Datenbank des Browsers (IndexedDB), ein paar Einstellungen im localStorage und die App-Dateien für den Offline-Betrieb. Kein Konto, kein Server, keine Cookies.</p>
<p>Nur wenn Sie nach Lebensmitteln suchen oder einen Barcode scannen, geht <b>das Suchwort bzw. die Barcode-Nummer</b> an Open Food Facts. Das lässt sich unter Ihre Daten abschalten.</p>
<p class="klein">Browserdaten löschen oder App entfernen löscht alles. Bitte regelmäßig ein Backup exportieren.</p>
<div class="knopfzeile"><button type="button" class="knopf" id="erst-ok">Verstanden</button><a class="knopf knopf-zwei" href="#/daten" id="erst-daten">Ihre Daten ansehen</a></div>`, { titel: 'Willkommen bei BaseBite' });
  const bestaetigt = () => {
    db.lsSchreib('basebite.erststart', heute());
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  };
  $('#erst-ok', d).onclick = () => { bestaetigt(); schliesseDialog(); };
  $('#erst-daten', d).onclick = () => { bestaetigt(); };
}

/* ====================================================================== Start */
function verpasst(arten) {
  const vorlage = document.createElement('template');
  vorlage.id = 'verpasst-vorlage';
  vorlage.innerHTML = `<div class="hinweis verpasst">${icon('glocke')}<p>Erinnerung verpasst: ${arten.map((a) => erin.ARTEN[a].titel).join(', ')}. ${arten.includes('wiegen') ? '<a href="#/verlauf">Gewicht eintragen</a>' : ''}</p></div>`;
  document.body.appendChild(vorlage);
  if (location.hash === '' || location.hash === '#/') route();
}

function startNativ() {
  const P = window.Capacitor.Plugins;
  document.documentElement.classList.add('ist-nativ');
  if (P.App) P.App.addListener('backButton', () => {
    if (dlg().open) { schliesseDialog(); return; }
    if (location.hash && location.hash !== '#/' && location.hash !== '#') history.back();
    else P.App.exitApp();
  });
  if (P.LocalNotifications) {
    P.LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
      const z = a.notification && a.notification.extra && a.notification.extra.ziel;
      if (z) location.hash = z;
    });
    erin.planeNativ(erin.lade()).catch(() => {});
  }
  if (P.StatusBar) P.StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
}

function startPwa() {
  if (!('serviceWorker' in navigator)) return;
  // Der Service Worker lädt mit Internet immer frisch ("Netz zuerst"), ein Neuladen nach Updates ist daher nicht nötig.
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* ohne Service Worker kein Offline-Betrieb */ });
  erin.starteBrowserTakt(verpasst);
}

function start() {
  setzeThema(db.lsLies('basebite.thema') === 'dunkel' ? 'dunkel' : 'hell');
  $('#thema-knopf').onclick = () => setzeThema(document.documentElement.getAttribute('data-theme') === 'dunkel' ? 'hell' : 'dunkel');
  const mk = $('#menue-knopf'), menue = $('#app-menue');
  mk.onclick = (e) => { e.stopPropagation(); const auf = menue.hidden; menue.hidden = !auf; mk.setAttribute('aria-expanded', String(auf)); if (auf) $('a', menue).focus(); };
  document.addEventListener('click', (e) => { if (!e.target.closest('#app-menue, #menue-knopf')) schliesseMenue(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menue.hidden) { schliesseMenue(); mk.focus(); } });
  dlg().addEventListener('close', () => scanner.stoppe());
  dlg().addEventListener('click', (e) => { if (e.target === dlg()) schliesseDialog(); });   // Klick auf den Hintergrund
  window.addEventListener('hashchange', route);
  if (nativ()) startNativ(); else startPwa();
  ladeEinstellungen().then(route).then(erststart);
}

start();

// Für Tests in der Konsole
window.BaseBite = { db, R, VERSION };
