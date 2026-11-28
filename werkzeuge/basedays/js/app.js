/* BaseDays | Oberfläche: Anmeldung, Kalenderliste, Ansichten, Dialoge, Live-Aktualisierung. */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './konfig.js';
import { SupaDaten } from './daten.js';
import { DemoDaten } from './demo.js';
import * as D from './datum.js';
import * as T from './termine.js';
import { REGELN } from './wiederholung.js';
import * as R from './rechte.js';
import { monat, raster, ansichtTitel, zeitText, esc, STUNDE } from './ansichten.js';

/* Kalenderfarben: Bordeaux, Tinte und Grau aus der CD-Palette, dazu fünf ruhige Töne, abgeleitet aus den
   Pastellen (Lavendel -> Pflaume, Eisblau -> Blau/Petrol, Aprikose -> Ocker) und dem Signalgrün, abgedunkelt,
   damit weiße Schrift darauf mindestens 4,5 : 1 Kontrast hat. */
export const FARBEN = [
  ['#6A1B2B', 'Bordeaux'], ['#1C2E4A', 'Tinte'], ['#5B4B8A', 'Pflaume'], ['#2F6690', 'Blau'],
  ['#1F6B6B', 'Petrol'], ['#1F7A47', 'Grün'], ['#8A5A1C', 'Ocker'], ['#5A6070', 'Grau'],
];
const farbName = (f) => FARBEN.find(([w]) => w.toLowerCase() === (f || '').toLowerCase())?.[1] || f;

const $ = (s, w = document) => w.querySelector(s);
const $$ = (s, w = document) => [...w.querySelectorAll(s)];
const schmal = matchMedia('(max-width: 700px)');
const WEITER = () => location.origin + location.pathname;

const z = {
  daten: null,
  ansicht: 'monat',
  datum: D.tagesbeginn(new Date()),
  gewaehlt: D.tagesbeginn(new Date()),
  profil: null,
  kalender: [],
  kal: new Map(),
  termine: [],
  vorkommen: [],
  vNachS: new Map(),
  haken: new Set(),
  live: null,
  liveStatus: '',
  zuletzt: 0,
  ladeNr: 0,
  gebunden: false,
  scrollSchluessel: '',
};

// ---------- Kleine Helfer ----------
let meldungZeit;
function meldung(text, fehler = false) {
  const m = $('#meldung');
  m.className = 'meldung' + (fehler ? ' meldung-fehler' : '');
  m.textContent = (fehler ? '✗ ' : '') + text;
  m.hidden = false;
  clearTimeout(meldungZeit);
  meldungZeit = setTimeout(() => { m.hidden = true; }, fehler ? 6000 : 3500);
}
const fehlerText = (e) => (e && e.message) || 'Unbekannter Fehler.';

function avatar(name, farbe, gross = false) {
  const z1 = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return `<span class="avatar${gross ? ' avatar-gross' : ''}" style="--f:${esc(farbe || '#5A6070')}" aria-hidden="true">${esc(z1)}</span>`;
}

function farbwahl(name, aktuell, mitKalenderfarbe = false) {
  const opt = (wert, titel) => `<label class="farbe" title="${esc(titel)}"><input type="radio" name="${name}" value="${wert}"${(aktuell || '').toLowerCase() === wert.toLowerCase() ? ' checked' : ''}>
<span class="farbe-punkt${wert ? '' : ' farbe-auto'}" style="--f:${wert || 'transparent'}"></span><span class="unsichtbar">${esc(titel)}</span></label>`;
  return `<div class="farbwahl">${mitKalenderfarbe ? opt('', 'Farbe des Kalenders') : ''}${FARBEN.map(([w, n]) => opt(w, n)).join('')}</div>`;
}

const SCHLIESSEN = `<button type="button" class="symbol-knopf" data-schliessen aria-label="Schließen"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>`;

/** Öffnet den Hauptdialog mit Inhalt; Klick auf [data-schliessen] oder neben den Dialog schließt ihn. */
function dialogOeffnen(html, klasse = '') {
  const d = $('#dialog');
  d.className = 'dlg ' + klasse;
  d.onclick = null; d.onchange = null;   // Handler des vorigen Dialogs entfernen
  d.innerHTML = html;
  if (!d.open) d.showModal();
  return d;
}
function dialogSchliessen() { const d = $('#dialog'); if (d.open) d.close(); }

/** Rückfrage mit Ja/Nein; optional muss ein Wort eingetippt werden. */
function frage(text, { ja = 'OK', gefahr = false, tippen = '' } = {}) {
  return new Promise((fertig) => {
    const d = $('#frage');
    d.innerHTML = `<form method="dialog" class="dlg-inhalt">
<p class="frage-text">${esc(text)}</p>
${tippen ? `<div class="feld"><label for="frage-tippen">Zur Sicherheit "${esc(tippen)}" eintippen</label><input id="frage-tippen" class="eingabe" autocomplete="off"></div>` : ''}
<div class="dlg-knoepfe"><button type="button" class="knopf knopf-zwei" value="nein">Abbrechen</button>
<button type="submit" class="knopf${gefahr ? ' knopf-gefahr' : ''}" value="ja"${tippen ? ' disabled' : ''}>${esc(ja)}</button></div></form>`;
    const ok = d.querySelector('[value="ja"]');
    if (tippen) d.querySelector('#frage-tippen').addEventListener('input', (e) => { ok.disabled = e.target.value.trim() !== tippen; });
    d.querySelector('[value="nein"]').onclick = () => d.close('nein');
    d.onclose = () => fertig(d.returnValue === 'ja');
    d.returnValue = '';
    d.showModal();
  });
}

// ---------- Start ----------
async function start() {
  registriereServiceWorker();
  bindeGlobal();
  const demo = sessionStorage.getItem('basedays.modus') === 'demo';
  if (demo) z.daten = new DemoDaten();
  else if (SUPABASE_URL && SUPABASE_ANON_KEY) z.daten = new SupaDaten(SUPABASE_URL, SUPABASE_ANON_KEY);
  else { torZeigen('nicht-verbunden'); return; }

  // Rückkehr über den Link aus einer E-Mail (Bestätigung, Passwort zurücksetzen)
  const r = z.daten.ausAdresseUebernehmen(location.hash);
  if (r) {
    history.replaceState(null, '', location.pathname);
    if (r.fehler) meldung(`Der Link aus der E-Mail funktioniert nicht (mehr): ${r.fehler}`, true);
    else if (r.typ === 'recovery') { torZeigen('neues-passwort'); return; }
    else if (r.typ === 'signup') meldung('E-Mail-Adresse bestätigt. Willkommen bei BaseDays!');
  }
  einladungMerken();
  z.daten.beiAnmeldung((s) => { if (!s) abgemeldet(); });
  if (z.daten.angemeldet) await appStarten();
  else torZeigen('anmelden');
}

function einladungMerken() {
  const m = location.hash.match(/^#\/einladung\/([0-9a-f-]{36})$/i);
  if (m) { sessionStorage.setItem('basedays.einladung', m[1]); history.replaceState(null, '', location.pathname); }
}

function abgemeldet() {
  z.live?.stoppen(); z.live = null;
  z.termine = []; z.kalender = []; z.kal = new Map(); z.haken = new Set();
  dialogSchliessen();
  if (z.daten?.demo) { sessionStorage.removeItem('basedays.modus'); location.reload(); return; }
  torZeigen('anmelden');
}

// ---------- Anmeldung ----------
const MARKE = `<div class="tor-marke"><svg viewBox="0 0 52 52" width="40" height="40" aria-hidden="true"><rect class="bm-q" x="0" y="0" width="24" height="24"/><rect class="bm-c" x="28" y="18" width="24" height="6"/><rect class="bm-q" x="0" y="28" width="24" height="24"/><rect class="bm-q" x="28" y="28" width="24" height="24"/></svg><span>BaseDays</span></div>
<p class="tor-unter">Der geteilte Kalender von Base B. Für Familie, WG und Projekte.</p>`;

function torZeigen(modus, info = '') {
  $('#app').hidden = true;
  const tor = $('#tor');
  tor.hidden = false;
  const einladung = sessionStorage.getItem('basedays.einladung');
  const einladungHinweis = einladung && (modus === 'anmelden' || modus === 'registrieren')
    ? '<p class="hinweis">Sie wurden zu einem Kalender eingeladen. Bitte melden Sie sich an oder erstellen Sie ein Konto, dann können Sie beitreten.</p>' : '';
  const feld = (id, label, attr) => `<div class="feld"><label for="${id}">${label}</label><input id="${id}" class="eingabe" ${attr}></div>`;
  const fehler = '<p class="fehlermeldung" role="alert" hidden></p>';
  let inhalt = '';
  switch (modus) {
    case 'nicht-verbunden':
      inhalt = `<p class="hinweis">BaseDays ist noch nicht mit einer Datenbank verbunden. Ein Kalender ohne Termine, sozusagen.</p>
<p class="tor-text">Die Einrichtung steht in <span class="mono">_werkstatt/basedays/LIESMICH.md</span>. Bis dahin können Sie die Oberfläche im Demo-Modus ausprobieren. Alles bleibt dabei nur in diesem Browser.</p>
<button type="button" class="knopf" id="demo-start">Demo ansehen</button>`;
      break;
    case 'anmelden':
      inhalt = `${einladungHinweis}<form id="tor-form" class="tor-form" novalidate>
${feld('t-email', 'E-Mail-Adresse', 'type="email" name="email" autocomplete="username" required')}
${feld('t-pw', 'Passwort', 'type="password" name="pw" autocomplete="current-password" required')}
${fehler}<button type="submit" class="knopf">Anmelden</button></form>
<p class="tor-links"><button type="button" class="link-knopf" data-tor="registrieren">Noch kein Konto? Registrieren</button>
<button type="button" class="link-knopf" data-tor="vergessen">Passwort vergessen?</button></p>`;
      break;
    case 'registrieren':
      inhalt = `${einladungHinweis}<form id="tor-form" class="tor-form" novalidate>
${feld('t-name', 'Ihr Name (sehen die anderen in geteilten Kalendern)', 'name="name" autocomplete="nickname" maxlength="60" required')}
${feld('t-email', 'E-Mail-Adresse', 'type="email" name="email" autocomplete="username" required')}
${feld('t-pw', 'Passwort (mindestens 8 Zeichen)', 'type="password" name="pw" autocomplete="new-password" minlength="8" required')}
${fehler}<button type="submit" class="knopf">Konto erstellen</button>
<p class="tor-klein">BaseDays speichert Ihren Namen, Ihre E-Mail-Adresse und Ihre Termine bei Supabase (Server in der EU), damit geteilte Kalender funktionieren. Kein Tracking, keine Werbung. <a href="/datenschutz/">Datenschutz</a></p></form>
<p class="tor-links"><button type="button" class="link-knopf" data-tor="anmelden">Schon ein Konto? Anmelden</button></p>`;
      break;
    case 'vergessen':
      inhalt = `<form id="tor-form" class="tor-form" novalidate>
<p class="tor-text">Sie bekommen eine E-Mail mit einem Link, über den Sie ein neues Passwort festlegen.</p>
${feld('t-email', 'E-Mail-Adresse', 'type="email" name="email" autocomplete="username" required')}
${fehler}<button type="submit" class="knopf">Link senden</button></form>
<p class="tor-links"><button type="button" class="link-knopf" data-tor="anmelden">Zurück zur Anmeldung</button></p>`;
      break;
    case 'neues-passwort':
      inhalt = `<form id="tor-form" class="tor-form" novalidate>
${feld('t-pw', 'Neues Passwort (mindestens 8 Zeichen)', 'type="password" name="pw" autocomplete="new-password" minlength="8" required')}
${fehler}<button type="submit" class="knopf">Passwort speichern</button></form>`;
      break;
    case 'info':
      inhalt = `<p class="hinweis">${esc(info)}</p>
<p class="tor-links"><button type="button" class="link-knopf" data-tor="anmelden">Zur Anmeldung</button></p>`;
      break;
  }
  tor.innerHTML = `<div class="tor-karte">${MARKE}${inhalt}</div>`;
  tor.querySelectorAll('[data-tor]').forEach((b) => b.addEventListener('click', () => torZeigen(b.dataset.tor)));
  $('#demo-start', tor)?.addEventListener('click', () => { sessionStorage.setItem('basedays.modus', 'demo'); location.reload(); });
  const form = $('#tor-form', tor);
  if (form) {
    form.addEventListener('submit', (e) => { e.preventDefault(); torAbschicken(modus, form); });
    form.querySelector('input')?.focus();
  }
}

async function torAbschicken(modus, form) {
  const w = Object.fromEntries(new FormData(form));
  const fehler = $('.fehlermeldung', form);
  const knopf = $('button[type="submit"]', form);
  const zeige = (t) => { fehler.textContent = '✗ ' + t; fehler.hidden = false; };
  fehler.hidden = true;
  const email = (w.email || '').trim();
  if ('email' in w && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return zeige('Bitte eine gültige E-Mail-Adresse eingeben.');
  if ('pw' in w && modus !== 'anmelden' && w.pw.length < 8) return zeige('Das Passwort braucht mindestens 8 Zeichen.');
  if ('pw' in w && !w.pw) return zeige('Bitte das Passwort eingeben.');
  if ('name' in w && !w.name.trim()) return zeige('Bitte einen Namen eingeben.');
  knopf.disabled = true;
  try {
    if (modus === 'anmelden') { await z.daten.anmelden(email, w.pw); await appStarten(); }
    else if (modus === 'registrieren') {
      const sofort = await z.daten.registrieren(email, w.pw, w.name.trim(), WEITER());
      if (sofort) await appStarten();
      else torZeigen('info', `Fast geschafft: Wir haben eine E-Mail an ${email} geschickt. Bitte bestätigen Sie Ihre Adresse über den Link darin. Danach können Sie sich anmelden.`);
    } else if (modus === 'vergessen') {
      await z.daten.passwortVergessen(email, WEITER());
      torZeigen('info', `Falls es ein Konto für ${email} gibt, ist jetzt eine E-Mail mit einem Link unterwegs.`);
    } else if (modus === 'neues-passwort') {
      await z.daten.passwortSetzen(w.pw);
      meldung('Neues Passwort gespeichert.');
      await appStarten();
    }
  } catch (e) { zeige(fehlerText(e)); knopf.disabled = false; }
}

// ---------- App ----------
async function appStarten() {
  $('#tor').hidden = true;
  $('#app').hidden = false;
  try {
    const gemerkt = JSON.parse(localStorage.getItem('basedays.ansicht') || 'null');
    if (gemerkt && ['monat', 'woche', 'tag'].includes(gemerkt.ansicht)) z.ansicht = gemerkt.ansicht;
  } catch { /* egal */ }
  zeichnen();
  try {
    await Promise.all([profilLaden(), kalenderLaden()]);
    await termineLaden();
  } catch (e) { meldung(fehlerText(e), true); }
  if (!z.live) z.live = z.daten.live(planeNeuLaden, (s) => { z.liveStatus = s; liveStatusZeigen(); });
  const token = sessionStorage.getItem('basedays.einladung');
  if (token) { sessionStorage.removeItem('basedays.einladung'); einladungZeigen(token); }
}

async function profilLaden() {
  z.profil = await z.daten.profilLaden();
  const k = $('#profil-knopf');
  k.innerHTML = avatar(z.profil.name, z.profil.farbe);
  k.setAttribute('aria-label', `Profil von ${z.profil.name} und Einstellungen`);
}

async function kalenderLaden() {
  z.kalender = await z.daten.kalenderLaden();
  z.kal = new Map(z.kalender.map((k) => [k.id, k]));
  seiteZeichnen();
}

/** Zeitraum der aktuellen Ansicht: { von, bis (exklusiv), tage }. */
function bereich() {
  if (z.ansicht === 'monat') {
    const tage = D.monatsraster(z.datum.getFullYear(), z.datum.getMonth());
    return { von: tage[0], bis: D.plusTage(tage.at(-1), 1), tage };
  }
  if (z.ansicht === 'woche') {
    const tage = D.wochentage(z.datum);
    return { von: tage[0], bis: D.plusTage(tage[0], 7), tage };
  }
  return { von: z.datum, bis: D.plusTage(z.datum, 1), tage: [z.datum] };
}

async function termineLaden() {
  const nr = ++z.ladeNr;
  const { von, bis } = bereich();
  const ids = z.kalender.filter((k) => k.sichtbar).map((k) => k.id);
  const [zeilen, haken] = await Promise.all([z.daten.termineLaden(ids, von, bis), z.daten.hakenLaden(von, bis)]);
  if (nr !== z.ladeNr) return;   // inzwischen weiter geblättert
  z.termine = zeilen.map(T.ausDatensatz);
  z.haken = new Set(haken.map((h) => `${h.event_id}|${h.datum}`));
  z.zuletzt = Date.now();
  zeichnen();
}

async function neuLaden() {
  try { await kalenderLaden(); await termineLaden(); }
  catch (e) { if (e.status !== 401) meldung(fehlerText(e), true); }
}

let neuLadenZeit;
function planeNeuLaden() { clearTimeout(neuLadenZeit); neuLadenZeit = setTimeout(neuLaden, 400); }

function liveStatusZeigen() {
  const texte = { an: 'Live: Änderungen erscheinen sofort.', aus: 'Keine Live-Verbindung. Aktualisiert jede Minute.', fehler: 'Live-Verbindung gestört. Aktualisiert jede Minute.', demo: 'Demo-Modus: nur in diesem Browser.' };
  const p = $('#live-status');
  p.textContent = texte[z.liveStatus] || '';
  p.dataset.status = z.liveStatus;
}

// ---------- Zeichnen ----------
function seiteZeichnen() {
  $('#kalenderliste').innerHTML = z.kalender.map((k) => `<li class="kal">
<label class="kal-wahl"><input type="checkbox" data-kal="${k.id}"${k.sichtbar ? ' checked' : ''}>
<span class="kal-box" style="--f:${esc(k.farbe)}" aria-hidden="true"></span><span class="kal-name">${esc(k.name)}</span></label>
${k.rolle !== 'owner' ? `<span class="kal-rolle">${R.ROLLEN[k.rolle].kurz}</span>` : ''}
<button type="button" class="kal-mehr" data-aktion="kalender-einstellungen" data-kal="${k.id}" aria-label="Einstellungen für ${esc(k.name)}">
<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></li>`).join('');
}

function zeichnen() {
  const { von, bis, tage } = bereich();
  z.vorkommen = T.vorkommenImZeitraum(z.termine.filter((t) => z.kal.get(t.calendar_id)?.sichtbar), von, bis);
  z.vNachS = new Map(z.vorkommen.map((v) => [v.schluessel, v]));
  const titel = ansichtTitel(z.ansicht, z.datum);
  $('#titel').textContent = schmal.matches ? titel.kurz : titel.lang;
  $$('[data-ansicht]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ansicht === z.ansicht)));
  const heute = D.tagesbeginn(new Date());
  const inhalt = $('#inhalt');
  inhalt.dataset.modus = z.ansicht;   // nicht data-ansicht: das ist das Merkmal der Umschaltknöpfe
  if (z.ansicht === 'monat') {
    inhalt.innerHTML = monat({ datum: z.datum, gewaehlt: z.gewaehlt, vorkommen: z.vorkommen, kal: z.kal, haken: z.haken, maxChips: schmal.matches ? 3 : 4, heute });
  } else {
    inhalt.innerHTML = raster({ tage, vorkommen: z.vorkommen, kal: z.kal, haken: z.haken, heute, jetzt: new Date() });
    const k = $('#raster-koerper');
    const sk = `${z.ansicht}|${D.schluessel(tage[0])}`;
    if (sk !== z.scrollSchluessel) {   // nur beim Blättern neu ausrichten, nicht bei Live-Aktualisierung
      z.scrollSchluessel = sk;
      const jetzt = new Date();
      const ziel = tage.some((d) => D.gleicherTag(d, jetzt)) ? Math.max(0, jetzt.getHours() - 2) : 7;
      k.scrollTop = ziel * STUNDE;
      z.letzterScroll = k.scrollTop;
    } else k.scrollTop = z.letzterScroll || 0;
    k.addEventListener('scroll', () => { z.letzterScroll = k.scrollTop; }, { passive: true });
  }
  $('.neu-knopf').hidden = !R.beschreibbar(z.kalender).length;
  try { localStorage.setItem('basedays.ansicht', JSON.stringify({ ansicht: z.ansicht })); } catch { /* egal */ }
}

function blaettern(richtung) {
  if (z.ansicht === 'monat') {
    z.datum = new Date(z.datum.getFullYear(), z.datum.getMonth() + richtung, 1);
    z.gewaehlt = D.gleicherTag(new Date(z.datum.getFullYear(), z.datum.getMonth(), 1), new Date(new Date().getFullYear(), new Date().getMonth(), 1))
      ? D.tagesbeginn(new Date()) : new Date(z.datum);
  } else {
    z.datum = D.plusTage(z.datum, richtung * (z.ansicht === 'woche' ? 7 : 1));
    z.gewaehlt = new Date(z.datum);
  }
  zeichnen();
  termineLaden().catch((e) => meldung(fehlerText(e), true));
}

function zuHeute() {
  z.datum = D.tagesbeginn(new Date());
  z.gewaehlt = new Date(z.datum);
  z.scrollSchluessel = '';
  zeichnen();
  termineLaden().catch((e) => meldung(fehlerText(e), true));
}

function ansichtWechseln(a) {
  if (a === z.ansicht) return;
  z.ansicht = a;
  z.datum = new Date(z.gewaehlt);
  zeichnen();
  termineLaden().catch((e) => meldung(fehlerText(e), true));
}

function seiteUmschalten(auf) {
  const offen = auf ?? !document.body.classList.contains('seite-offen');
  document.body.classList.toggle('seite-offen', offen);
  $('#seite-knopf').setAttribute('aria-expanded', String(offen));
  $('.seite-schleier').hidden = !offen;
  if (offen) $('#seite input, #seite button')?.focus();
}

// ---------- Ereignisse ----------
function bindeGlobal() {
  if (z.gebunden) return;
  z.gebunden = true;

  document.addEventListener('click', (e) => {
    const zu = e.target.closest('[data-schliessen]');
    if (zu) { zu.closest('dialog')?.close(); return; }
    const ansichtKnopf = e.target.closest('button[data-ansicht]');
    if (ansichtKnopf) { ansichtWechseln(ansichtKnopf.dataset.ansicht); return; }
    const el = e.target.closest('#app [data-aktion]');
    if (!el) return;
    const tag = el.dataset.tag ? D.ausSchluessel(el.dataset.tag) : null;
    switch (el.dataset.aktion) {
      case 'zurueck': blaettern(-1); break;
      case 'vor': blaettern(1); break;
      case 'heute': zuHeute(); break;
      case 'tag': {
        const anderer = tag.getMonth() !== z.datum.getMonth();
        z.gewaehlt = tag;
        if (anderer) { z.datum = new Date(tag.getFullYear(), tag.getMonth(), 1); zeichnen(); termineLaden().catch(() => {}); }
        else zeichnen();
        if (schmal.matches && el.classList.contains('mehr')) $('.tagesliste')?.scrollIntoView({ behavior: 'smooth' });
        break;
      }
      case 'tagansicht': z.gewaehlt = tag; z.ansicht = 'woche'; ansichtWechseln('tag'); break;
      case 'termin': terminZeigen(el.dataset.schluessel); break;
      case 'neu': terminFormular(null, tag || (z.ansicht === 'monat' ? z.gewaehlt : z.datum)); break;
      case 'slot': {
        if (e.target !== el) break;
        const min = Math.floor((e.clientY - el.getBoundingClientRect().top) / STUNDE * 2) * 30;
        const start = new Date(tag); start.setMinutes(Math.max(0, Math.min(min, 23 * 60)));
        terminFormular(null, tag, start);
        break;
      }
      case 'kalender-neu': kalenderDialog(null); break;
      case 'kalender-einstellungen': kalenderDialog(el.dataset.kal); break;
      case 'seite-zu': seiteUmschalten(false); break;
    }
  });

  $('#seite-knopf').addEventListener('click', () => seiteUmschalten());
  $('#profil-knopf').addEventListener('click', profilDialog);
  $('#kalenderliste').addEventListener('change', async (e) => {
    const cb = e.target.closest('input[data-kal]');
    if (!cb) return;
    const k = z.kal.get(cb.dataset.kal);
    k.sichtbar = cb.checked;
    zeichnen();
    try { await z.daten.sichtbarSetzen(k.id, k.sichtbar); if (k.sichtbar) await termineLaden(); }
    catch (err) { meldung(fehlerText(err), true); }
  });

  document.addEventListener('keydown', (e) => {
    if ($('#app').hidden || document.querySelector('dialog[open]')) return;
    if (e.target.closest('input, select, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && document.body.classList.contains('seite-offen')) seiteUmschalten(false);
    else if (e.key === 'ArrowLeft') blaettern(-1);
    else if (e.key === 'ArrowRight') blaettern(1);
    else if (e.key === 't') zuHeute();
    else if (e.key === 'n' && R.beschreibbar(z.kalender).length) terminFormular(null, z.ansicht === 'monat' ? z.gewaehlt : z.datum);
  });

  // Wischen auf dem Handy: links/rechts blättern
  let wisch = null;
  $('#inhalt').addEventListener('touchstart', (e) => { const t = e.touches[0]; wisch = { x: t.clientX, y: t.clientY }; }, { passive: true });
  $('#inhalt').addEventListener('touchend', (e) => {
    if (!wisch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - wisch.x, dy = t.clientY - wisch.y;
    wisch = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) blaettern(dx < 0 ? 1 : -1);
  }, { passive: true });

  schmal.addEventListener('change', () => { if (!$('#app').hidden) zeichnen(); });
  addEventListener('hashchange', () => {
    einladungMerken();
    const token = sessionStorage.getItem('basedays.einladung');
    if (token && z.daten?.angemeldet && !$('#app').hidden) { sessionStorage.removeItem('basedays.einladung'); einladungZeigen(token); }
    else if (location.hash === '#/' && !$('#app').hidden) { history.replaceState(null, '', location.pathname); zuHeute(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && z.daten?.angemeldet && !$('#app').hidden && Date.now() - z.zuletzt > 30000) neuLaden();
  });
  // Ersatz, falls Realtime nicht verbunden ist: jede Minute nachsehen
  setInterval(() => {
    if (document.visibilityState === 'visible' && z.daten && !z.daten.demo && z.daten.angemeldet && z.liveStatus !== 'an' && !$('#app').hidden) neuLaden();
  }, 60000);
  // "Jetzt"-Linie und Datumswechsel um Mitternacht
  setInterval(() => { if (!$('#app').hidden && !document.querySelector('dialog[open]') && z.ansicht !== 'monat') zeichnen(); }, 5 * 60000);
}

// ---------- Termin: ansehen ----------
function zeitBeschreibung(v) {
  const t = v.termin;
  if (t.ganztaegig) {
    return D.gleicherTag(v.start, v.ende) ? `${D.fTagLang(v.start)}, ganztägig` : `${D.fTagKurz(v.start)} - ${D.fTagKurz(v.ende)}, ganztägig`;
  }
  if (D.gleicherTag(v.start, v.ende)) return `${D.fTagLang(v.start)} | ${D.fUhrzeit(v.start)}-${D.fUhrzeit(v.ende)} Uhr`;
  return `${D.fTagKurz(v.start)} ${D.fUhrzeit(v.start)} Uhr - ${D.fTagKurz(v.ende)} ${D.fUhrzeit(v.ende)} Uhr`;
}

async function terminZeigen(schl) {
  const v = z.vNachS.get(schl);
  if (!v) return;
  const t = v.termin;
  const k = z.kal.get(t.calendar_id);
  const schreiben = R.darfSchreiben(k?.rolle);
  const fertig = z.haken.has(schl);
  const regel = t.wiederholung !== 'keine'
    ? `<p class="detail-zeile">Wiederholt sich: ${REGELN[t.wiederholung]}${t.wiederholungBis ? ` bis ${D.fTagKurz(t.wiederholungBis)}` : ''}</p>` : '';
  const d = dialogOeffnen(`<div class="dlg-kopf"><h2><span class="dlg-farbe" style="--f:${T.terminFarbe(t, z.kal)}" aria-hidden="true"></span>${esc(t.titel)}</h2>${SCHLIESSEN}</div>
<div class="dlg-inhalt">
<p class="detail-zeit">${esc(zeitBeschreibung(v))}</p>
${regel}
${t.ort ? `<p class="detail-zeile"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg><span class="unsichtbar">Ort:</span> ${esc(t.ort)}</p>` : ''}
${t.beschreibung ? `<p class="detail-text">${esc(t.beschreibung)}</p>` : ''}
<p class="dlg-unter">Kalender: ${esc(k?.name || '?')}${k && k.rolle === 'viewer' ? ' (nur lesen)' : ''}</p>
<label class="haken"><input type="checkbox" id="d-haken"${fertig ? ' checked' : ''}> Erledigt</label>
<p id="d-haken-alle" class="dlg-unter"></p>
${schreiben ? `<div class="dlg-knoepfe"><button type="button" class="knopf knopf-zwei knopf-gefahr-rand" id="d-loeschen">Löschen</button><button type="button" class="knopf" id="d-bearbeiten">Bearbeiten</button></div>` : ''}
</div>`);
  const hakenAlle = async () => {
    try {
      const alle = await z.daten.hakenVonAllen(t.id, v.datum);
      $('#d-haken-alle', d).textContent = alle.length ? `Erledigt von: ${alle.map((h) => (h.user_id === z.daten.ich ? 'Ihnen' : h.name)).join(', ')}` : '';
    } catch { /* nur Zusatzinfo */ }
  };
  hakenAlle();
  $('#d-haken', d).addEventListener('change', async (e) => {
    const an = e.target.checked;
    try {
      await z.daten.hakenSetzen(t.id, v.datum, an);
      if (an) z.haken.add(schl); else z.haken.delete(schl);
      zeichnen(); hakenAlle();
    } catch (err) { e.target.checked = !an; meldung(fehlerText(err), true); }
  });
  $('#d-bearbeiten', d)?.addEventListener('click', () => terminFormular(t));
  $('#d-loeschen', d)?.addEventListener('click', async () => {
    const text = t.wiederholung !== 'keine' ? `"${t.titel}" mit allen Wiederholungen löschen?` : `"${t.titel}" löschen?`;
    if (!(await frage(text, { ja: 'Löschen', gefahr: true }))) return;
    try {
      await z.daten.terminLoeschen(t.id);
      dialogSchliessen();
      z.termine = z.termine.filter((x) => x.id !== t.id);
      zeichnen(); meldung('Termin gelöscht.');
    } catch (err) { meldung(fehlerText(err), true); }
  });
}

// ---------- Termin: anlegen und bearbeiten ----------
function terminFormular(termin, tag, startZeit = null) {
  const kalender = R.beschreibbar(z.kalender);
  if (!kalender.length) { meldung('Sie haben keinen Kalender, in den Sie schreiben dürfen.', true); return; }
  let f;
  if (termin) f = T.zuFormular(termin);
  else {
    const standard = kalender.find((k) => k.sichtbar) || kalender[0];
    f = T.neuesFormular(tag, standard.id);
    if (startZeit) {
      const ende = new Date(startZeit.getTime() + 3600000);
      Object.assign(f, { startZeit: D.fUhrzeit(startZeit), endeDatum: D.schluessel(ende), endeZeit: D.fUhrzeit(ende) });
    }
  }
  const auswahl = kalender.map((k) => `<option value="${k.id}"${k.id === f.calendar_id ? ' selected' : ''}>${esc(k.name)}</option>`).join('');
  const regeln = Object.entries(REGELN).map(([w, n]) => `<option value="${w}"${w === f.wiederholung ? ' selected' : ''}>${n}</option>`).join('');
  const d = dialogOeffnen(`<div class="dlg-kopf"><h2>${termin ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>${SCHLIESSEN}</div>
<form class="dlg-inhalt" id="termin-form" novalidate>
<div class="feld"><label for="f-titel">Titel</label><input id="f-titel" class="eingabe" name="titel" maxlength="${T.GRENZEN.titel}" autocomplete="off" value="${esc(f.titel)}"></div>
<div class="feld"><label for="f-kal">Kalender</label><select id="f-kal" class="eingabe" name="calendar_id">${auswahl}</select></div>
<label class="haken"><input type="checkbox" name="ganztaegig" id="f-ganz"${f.ganztaegig ? ' checked' : ''}> Ganztägig</label>
<div class="zeit-block">
<fieldset class="feld datum-zeit"><legend class="feld-titel">Beginn</legend>
<input type="date" class="eingabe" name="startDatum" aria-label="Beginn Datum" value="${f.startDatum}"><input type="time" class="eingabe nur-zeit" name="startZeit" aria-label="Beginn Uhrzeit" value="${f.startZeit}" step="300"></fieldset>
<fieldset class="feld datum-zeit"><legend class="feld-titel">Ende</legend>
<input type="date" class="eingabe" name="endeDatum" aria-label="Ende Datum" value="${f.endeDatum}"><input type="time" class="eingabe nur-zeit" name="endeZeit" aria-label="Ende Uhrzeit" value="${f.endeZeit}" step="300"></fieldset>
</div>
<div class="zeile2">
<div class="feld"><label for="f-regel">Wiederholen</label><select id="f-regel" class="eingabe" name="wiederholung">${regeln}</select></div>
<div class="feld" id="f-bis-feld"><label for="f-bis">Wiederholen bis (optional)</label><input id="f-bis" type="date" class="eingabe" name="wiederholungBis" value="${f.wiederholungBis}"></div>
</div>
${termin && termin.wiederholung !== 'keine' ? '<p class="dlg-unter">Änderungen gelten für alle Wiederholungen.</p>' : ''}
<div class="feld"><label for="f-ort">Ort (optional)</label><input id="f-ort" class="eingabe" name="ort" maxlength="${T.GRENZEN.ort}" autocomplete="off" value="${esc(f.ort)}"></div>
<div class="feld"><label for="f-text">Beschreibung (optional)</label><textarea id="f-text" class="eingabe" name="beschreibung" rows="3" maxlength="${T.GRENZEN.beschreibung}">${esc(f.beschreibung)}</textarea></div>
<fieldset class="feld"><legend class="feld-titel">Farbe</legend>${farbwahl('farbe', f.farbe, true)}</fieldset>
<p class="fehlermeldung" role="alert" hidden></p>
<div class="dlg-knoepfe"><button type="button" class="knopf knopf-zwei" data-schliessen>Abbrechen</button><button type="submit" class="knopf">Speichern</button></div>
</form>`);
  const form = $('#termin-form', d);
  const el = (n) => form.elements[n];
  const ganzUmschalten = () => { form.classList.toggle('ist-ganztaegig', el('ganztaegig').checked); };
  const regelUmschalten = () => { $('#f-bis-feld', form).hidden = el('wiederholung').value === 'keine'; };
  ganzUmschalten(); regelUmschalten();
  el('ganztaegig').addEventListener('change', ganzUmschalten);
  el('wiederholung').addEventListener('change', regelUmschalten);

  // Beginn verschieben verschiebt das Ende mit (Dauer bleibt gleich)
  const zeitpunkt = (p) => D.ausDatumUndZeit(el(p + 'Datum').value, el('ganztaegig').checked ? '' : el(p + 'Zeit').value);
  let dauer = zeitpunkt('ende') - zeitpunkt('start');
  const startGeaendert = () => {
    if (!el('startDatum').value) return;
    const neu = new Date(zeitpunkt('start').getTime() + (dauer >= 0 ? dauer : 3600000));
    el('endeDatum').value = D.schluessel(neu);
    if (!el('ganztaegig').checked) el('endeZeit').value = D.fUhrzeit(neu);
  };
  const endeGeaendert = () => { if (el('endeDatum').value && el('startDatum').value) dauer = zeitpunkt('ende') - zeitpunkt('start'); };
  el('startDatum').addEventListener('change', startGeaendert);
  el('startZeit').addEventListener('change', startGeaendert);
  el('endeDatum').addEventListener('change', endeGeaendert);
  el('endeZeit').addEventListener('change', endeGeaendert);

  if (!termin) el('titel').focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const w = Object.fromEntries(new FormData(form));
    w.ganztaegig = el('ganztaegig').checked;
    $$('[aria-invalid]', form).forEach((x) => x.removeAttribute('aria-invalid'));
    const fehler = T.validieren(w);
    const box = $('.fehlermeldung', form);
    if (fehler.length) {
      box.textContent = '✗ ' + fehler.map((x) => x.text).join(' ');
      box.hidden = false;
      fehler.forEach((x) => el(x.feld)?.setAttribute('aria-invalid', 'true'));
      el(fehler[0].feld)?.focus();
      return;
    }
    const knopf = $('button[type="submit"]', form);
    knopf.disabled = true;
    try {
      const datensatz = T.zuDatensatz(w);
      if (termin) await z.daten.terminAendern(termin.id, datensatz);
      else await z.daten.terminAnlegen(datensatz);
      dialogSchliessen();
      meldung(termin ? 'Termin gespeichert.' : 'Termin eingetragen.');
      const kal = z.kal.get(datensatz.calendar_id);
      if (kal && !kal.sichtbar) { kal.sichtbar = true; z.daten.sichtbarSetzen(kal.id, true).catch(() => {}); seiteZeichnen(); }
      await termineLaden();
    } catch (err) { box.textContent = '✗ ' + fehlerText(err); box.hidden = false; knopf.disabled = false; }
  });
}

// ---------- Kalender: anlegen, einstellen, teilen ----------
async function kalenderDialog(kalId) {
  const k = kalId ? z.kal.get(kalId) : null;
  const verwalten = !k || R.darfVerwalten(k.rolle);
  const kopf = `<div class="dlg-kopf"><h2>${k ? esc(k.name) : 'Neuer Kalender'}</h2>${SCHLIESSEN}</div>`;
  const stamm = verwalten ? `<form class="dlg-abschnitt" id="kal-form" novalidate>
<div class="feld"><label for="k-name">Name</label><input id="k-name" class="eingabe" name="name" maxlength="60" autocomplete="off" value="${esc(k?.name || '')}" placeholder="z. B. Familie, WG, Projekt X"></div>
<fieldset class="feld"><legend class="feld-titel">Farbe</legend>${farbwahl('farbe', k?.farbe || FARBEN[z.kalender.length % FARBEN.length][0])}</fieldset>
<p class="fehlermeldung" role="alert" hidden></p>
<div class="dlg-knoepfe">${k ? '' : '<button type="button" class="knopf knopf-zwei" data-schliessen>Abbrechen</button>'}<button type="submit" class="knopf">${k ? 'Änderungen speichern' : 'Kalender anlegen'}</button></div>
</form>` : `<p class="dlg-unter dlg-abschnitt">Ihre Rolle: ${R.ROLLEN[k.rolle].name}. Farbe: ${esc(farbName(k.farbe))}.</p>`;
  const rest = k ? `<section class="dlg-abschnitt" aria-labelledby="k-mitglieder"><h3 id="k-mitglieder">Mitglieder</h3><ul class="mitglieder" id="mitglieder"><li class="dlg-unter">Wird geladen ...</li></ul></section>
${R.darfEinladen(k.rolle) ? `<section class="dlg-abschnitt" aria-labelledby="k-einladen"><h3 id="k-einladen">Einladen</h3>
<p class="dlg-unter">Wer den Link öffnet und ein Konto hat (oder eines erstellt), tritt dem Kalender bei. Der Link gilt 14 Tage und für beliebig viele Personen.${z.daten.demo ? ' Im Demo-Modus kann niemand beitreten.' : ''}</p>
<div class="einladen-zeile"><label class="unsichtbar" for="k-rolle">Rolle der Eingeladenen</label>
<select id="k-rolle" class="eingabe"><option value="editor">Darf bearbeiten</option><option value="viewer">Darf nur lesen</option></select>
<button type="button" class="knopf" id="k-link">Link erstellen</button></div>
<ul class="einladungen" id="einladungen"></ul></section>` : ''}
<section class="dlg-abschnitt gefahr-zone">${k.rolle === 'owner'
    ? '<button type="button" class="knopf knopf-zwei knopf-gefahr-rand" id="k-loeschen">Kalender löschen</button>'
    : '<button type="button" class="knopf knopf-zwei knopf-gefahr-rand" id="k-verlassen">Kalender verlassen</button>'}</section>` : '';
  const d = dialogOeffnen(`${kopf}<div class="dlg-inhalt">${stamm}${rest}</div>`);

  const form = $('#kal-form', d);
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const farbe = form.elements.farbe.value;
    const box = $('.fehlermeldung', form);
    if (!name) { box.textContent = '✗ Bitte einen Namen eingeben.'; box.hidden = false; form.elements.name.focus(); return; }
    try {
      if (k) { await z.daten.kalenderAendern(k.id, { name, farbe }); meldung('Kalender gespeichert.'); }
      else { await z.daten.kalenderAnlegen(name, farbe); meldung(`Kalender "${name}" angelegt.`); dialogSchliessen(); }
      await kalenderLaden(); zeichnen();
      if (k) $('.dlg-kopf h2', d).textContent = name;
    } catch (err) { box.textContent = '✗ ' + fehlerText(err); box.hidden = false; }
  });
  if (!k) { form.elements.name.focus(); return; }

  const linkVon = (token) => `${WEITER()}#/einladung/${token}`;
  async function mitgliederZeichnen() {
    try {
      const liste = await z.daten.mitgliederLaden(k.id);
      $('#mitglieder', d).innerHTML = liste.map((m) => {
        const selbst = m.user_id === z.daten.ich;
        const aendern = R.darfRolleAendern(k.rolle, m.rolle, m.rolle === 'editor' ? 'viewer' : 'editor', selbst);
        const rolle = aendern
          ? `<label class="unsichtbar" for="r-${m.user_id}">Rolle von ${esc(m.name)}</label><select class="eingabe eingabe-klein" id="r-${m.user_id}" data-rolle="${m.user_id}">
<option value="editor"${m.rolle === 'editor' ? ' selected' : ''}>Bearbeiten</option><option value="viewer"${m.rolle === 'viewer' ? ' selected' : ''}>Nur lesen</option></select>`
          : `<span class="mitglied-rolle">${R.ROLLEN[m.rolle].name}</span>`;
        const raus = !selbst && R.darfEntfernen(k.rolle, m.rolle, false)
          ? `<button type="button" class="symbol-knopf symbol-klein" data-raus="${m.user_id}" data-name="${esc(m.name)}" aria-label="${esc(m.name)} entfernen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>` : '';
        return `<li class="mitglied">${avatar(m.name, m.farbe)}<span class="mitglied-name">${esc(m.name)}${selbst ? ' (Sie)' : ''}</span>${rolle}${raus}</li>`;
      }).join('');
    } catch (err) { $('#mitglieder', d).innerHTML = `<li class="fehlermeldung">✗ ${esc(fehlerText(err))}</li>`; }
  }
  async function einladungenZeichnen() {
    const ul = $('#einladungen', d);
    if (!ul) return;
    try {
      const liste = await z.daten.einladungenLaden(k.id);
      ul.innerHTML = liste.map((e) => `<li class="einladung">
<div class="einladung-text"><span>${e.rolle === 'editor' ? 'Darf bearbeiten' : 'Darf nur lesen'}</span><span class="dlg-unter">gültig bis ${D.fTagKurz(new Date(e.gueltig_bis))}</span></div>
<input class="eingabe eingabe-klein einladung-link" readonly value="${esc(linkVon(e.token))}" aria-label="Einladungslink">
<div class="einladung-knoepfe">
<button type="button" class="knopf knopf-zwei knopf-klein" data-kopieren="${esc(linkVon(e.token))}">Kopieren</button>
<a class="knopf knopf-zwei knopf-klein" href="${esc(mailtoVon(k, e))}">Per E-Mail</a>
${navigator.share ? `<button type="button" class="knopf knopf-zwei knopf-klein" data-teilen="${esc(linkVon(e.token))}">Teilen</button>` : ''}
<button type="button" class="symbol-knopf symbol-klein" data-einladung-weg="${e.id}" aria-label="Link ungültig machen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4,7 20,7"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/></svg></button>
</div></li>`).join('');
    } catch (err) { ul.innerHTML = `<li class="fehlermeldung">✗ ${esc(fehlerText(err))}</li>`; }
  }
  function mailtoVon(kal, e) {
    const betreff = `Einladung zum Kalender "${kal.name}"`;
    const text = `Hallo,\n\nich lade Sie zu meinem Kalender "${kal.name}" in BaseDays ein. Über diesen Link können Sie beitreten:\n\n${linkVon(e.token)}\n\nDer Link gilt bis ${D.fTagKurz(new Date(e.gueltig_bis))}.\n\nViele Grüße\n${z.profil?.name || ''}`;
    return `mailto:?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`;
  }
  mitgliederZeichnen();
  einladungenZeichnen();

  d.onchange = async (e) => {
    const s = e.target.closest('select[data-rolle]');
    if (!s) return;
    try { await z.daten.rolleSetzen(k.id, s.dataset.rolle, s.value); meldung('Rolle geändert.'); }
    catch (err) { meldung(fehlerText(err), true); mitgliederZeichnen(); }
  };
  d.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'k-link') {
      b.disabled = true;
      try { await z.daten.einladungErstellen(k.id, $('#k-rolle', d).value); await einladungenZeichnen(); meldung('Einladungslink erstellt.'); }
      catch (err) { meldung(fehlerText(err), true); }
      b.disabled = false;
    } else if (b.dataset.kopieren) {
      try { await navigator.clipboard.writeText(b.dataset.kopieren); meldung('Link kopiert.'); }
      catch { b.closest('li').querySelector('input').select(); meldung('Bitte den markierten Link selbst kopieren (Strg + C).'); }
    } else if (b.dataset.teilen) {
      navigator.share({ title: `BaseDays: ${k.name}`, text: `Einladung zum Kalender "${k.name}"`, url: b.dataset.teilen }).catch(() => {});
    } else if (b.dataset.einladungWeg) {
      if (!(await frage('Diesen Einladungslink ungültig machen? Wer schon beigetreten ist, bleibt Mitglied.', { ja: 'Ungültig machen' }))) return;
      try { await z.daten.einladungLoeschen(b.dataset.einladungWeg); einladungenZeichnen(); } catch (err) { meldung(fehlerText(err), true); }
    } else if (b.dataset.raus) {
      if (!(await frage(`${b.dataset.name} aus "${k.name}" entfernen?`, { ja: 'Entfernen', gefahr: true }))) return;
      try { await z.daten.mitgliedEntfernen(k.id, b.dataset.raus); mitgliederZeichnen(); meldung(`${b.dataset.name} entfernt.`); } catch (err) { meldung(fehlerText(err), true); }
    } else if (b.id === 'k-loeschen') {
      if (!(await frage(`"${k.name}" mit allen Terminen für alle Mitglieder löschen? Das lässt sich nicht rückgängig machen.`, { ja: 'Endgültig löschen', gefahr: true, tippen: k.name.trim() }))) return;
      try { await z.daten.kalenderLoeschen(k.id); dialogSchliessen(); meldung(`"${k.name}" gelöscht.`); await neuLaden(); } catch (err) { meldung(fehlerText(err), true); }
    } else if (b.id === 'k-verlassen') {
      if (!(await frage(`"${k.name}" verlassen? Sie sehen die Termine danach nicht mehr, bis Sie wieder eingeladen werden.`, { ja: 'Verlassen', gefahr: true }))) return;
      try { await z.daten.mitgliedEntfernen(k.id, z.daten.ich); dialogSchliessen(); meldung(`Sie haben "${k.name}" verlassen.`); await neuLaden(); } catch (err) { meldung(fehlerText(err), true); }
    }
  };
}

// ---------- Einladung annehmen ----------
async function einladungZeigen(token) {
  let e;
  try { e = await z.daten.einladungAnsehen(token); } catch (err) { meldung(fehlerText(err), true); return; }
  if (!e) { meldung('Diese Einladung ist ungültig oder abgelaufen. Bitte um einen neuen Link bitten.', true); return; }
  const rolle = e.rolle === 'editor' ? 'Sie können Termine eintragen, ändern und löschen.' : 'Sie können die Termine ansehen, aber nicht ändern.';
  const d = dialogOeffnen(`<div class="dlg-kopf"><h2>Einladung</h2>${SCHLIESSEN}</div>
<div class="dlg-inhalt">
<p class="einladung-gross"><span class="kal-box" style="--f:${esc(e.farbe)}" aria-hidden="true"></span><span>${esc(e.von)} lädt Sie zum Kalender <b>${esc(e.kalender)}</b> ein.</span></p>
<p>${e.schon_mitglied ? 'Sie sind bereits Mitglied dieses Kalenders.' : rolle}</p>
<div class="dlg-knoepfe">${e.schon_mitglied ? '<button type="button" class="knopf" data-schliessen>OK</button>'
    : '<button type="button" class="knopf knopf-zwei" data-schliessen>Ablehnen</button><button type="button" class="knopf" id="e-ja">Beitreten</button>'}</div></div>`);
  $('#e-ja', d)?.addEventListener('click', async () => {
    try {
      await z.daten.einladungAnnehmen(token);
      dialogSchliessen();
      meldung(`Willkommen im Kalender "${e.kalender}".`);
      await neuLaden();
    } catch (err) { meldung(fehlerText(err), true); }
  });
}

// ---------- Profil ----------
function profilDialog() {
  const p = z.profil || { name: '', farbe: '#6A1B2B' };
  const dunkel = document.documentElement.getAttribute('data-theme') === 'dunkel';
  const demo = z.daten.demo;
  const d = dialogOeffnen(`<div class="dlg-kopf"><h2>Profil</h2>${SCHLIESSEN}</div>
<div class="dlg-inhalt">
<form class="dlg-abschnitt" id="p-form" novalidate>
<div class="profil-kopf">${avatar(p.name, p.farbe, true)}<span class="dlg-unter">${esc(z.daten.benutzer?.email || '')}</span></div>
<div class="feld"><label for="p-name">Name</label><input id="p-name" class="eingabe" name="name" maxlength="60" value="${esc(p.name)}" autocomplete="nickname"></div>
<fieldset class="feld"><legend class="feld-titel">Ihre Farbe</legend>${farbwahl('farbe', p.farbe)}</fieldset>
<p class="fehlermeldung" role="alert" hidden></p>
<div class="dlg-knoepfe"><button type="submit" class="knopf">Speichern</button></div>
</form>
<section class="dlg-abschnitt"><h3>Darstellung</h3>
<label class="haken"><input type="checkbox" id="p-dunkel"${dunkel ? ' checked' : ''}> Dunkelmodus</label></section>
${demo ? '' : `<form class="dlg-abschnitt" id="p-pw" novalidate><h3>Passwort ändern</h3>
<div class="feld"><label for="p-neu">Neues Passwort (mindestens 8 Zeichen)</label><input id="p-neu" class="eingabe" type="password" name="pw" autocomplete="new-password" minlength="8"></div>
<div class="dlg-knoepfe"><button type="submit" class="knopf knopf-zwei">Passwort ändern</button></div></form>`}
<section class="dlg-abschnitt gefahr-zone">
<button type="button" class="knopf knopf-zwei" id="p-ab">${demo ? 'Demo beenden' : 'Abmelden'}</button>
<button type="button" class="knopf knopf-zwei knopf-gefahr-rand" id="p-weg">${demo ? 'Demo-Daten zurücksetzen' : 'Konto löschen'}</button>
</section></div>`);
  const form = $('#p-form', d);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const box = $('.fehlermeldung', form);
    if (!name) { box.textContent = '✗ Bitte einen Namen eingeben.'; box.hidden = false; return; }
    try { await z.daten.profilSpeichern({ name, farbe: form.elements.farbe.value }); await profilLaden(); dialogSchliessen(); meldung('Profil gespeichert.'); }
    catch (err) { box.textContent = '✗ ' + fehlerText(err); box.hidden = false; }
  });
  $('#p-dunkel', d).addEventListener('change', (e) => {
    if (e.target.checked) document.documentElement.setAttribute('data-theme', 'dunkel');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('basedays.thema', e.target.checked ? 'dunkel' : 'hell'); } catch { /* egal */ }
  });
  $('#p-pw', d)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = e.target.elements.pw.value;
    if (pw.length < 8) { meldung('Das Passwort braucht mindestens 8 Zeichen.', true); return; }
    try { await z.daten.passwortSetzen(pw); e.target.reset(); meldung('Passwort geändert.'); } catch (err) { meldung(fehlerText(err), true); }
  });
  $('#p-ab', d).addEventListener('click', async () => { dialogSchliessen(); await z.daten.abmelden(); });
  $('#p-weg', d).addEventListener('click', async () => {
    const text = demo ? 'Alle Demo-Daten in diesem Browser löschen und neu beginnen?'
      : 'Konto endgültig löschen? Dabei werden Ihr Profil, alle Kalender, die Ihnen gehören (auch für die anderen Mitglieder), und alle Ihre Häkchen gelöscht. Das lässt sich nicht rückgängig machen.';
    if (!(await frage(text, { ja: demo ? 'Zurücksetzen' : 'Konto löschen', gefahr: true, tippen: demo ? '' : 'LÖSCHEN' }))) return;
    try { await z.daten.kontoLoeschen(); if (demo) location.reload(); else meldung('Ihr Konto wurde gelöscht.'); }
    catch (err) { meldung(fehlerText(err), true); }
  });
}

// ---------- Offline-Fähigkeit ----------
function registriereServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* geht auch ohne */ });
}

start().catch((e) => { console.error(e); meldung(fehlerText(e), true); });
