/* BaseDays | Tests der Kernlogik (Datum, Termine, Wiederholung, Rechte). Läuft im Browser über tests.html. */
import * as D from '/werkzeuge/basedays/js/datum.js';
import * as T from '/werkzeuge/basedays/js/termine.js';
import * as W from '/werkzeuge/basedays/js/wiederholung.js';
import * as R from '/werkzeuge/basedays/js/rechte.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function gleich(ist, soll, was = '') {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a !== b) throw new Error(`${was} erwartet ${b}, erhalten ${a}`);
}
const wahr = (x, was) => { if (!x) throw new Error(was || 'erwartet wahr'); };
const d = (j, m, t, h = 0, min = 0) => new Date(j, m - 1, t, h, min);
const k = D.schluessel;

// ---------- Datum ----------
test('Monatsraster November 2026 beginnt Montag 26.10. und hat 6 Wochen', () => {
  const r = D.monatsraster(2026, 10);
  gleich(k(r[0]), '2026-10-26'); gleich(r.length, 42); gleich(k(r.at(-1)), '2026-12-06');
});
test('Monatsraster Februar 2027 (beginnt Montag) hat genau 4 Wochen', () => {
  const r = D.monatsraster(2027, 1);
  gleich(r.length, 28); gleich(k(r[0]), '2027-02-01');
});
test('Wochenbeginn ist Montag, auch für Sonntag', () => {
  gleich(k(D.wochenbeginn(d(2026, 11, 29))), '2026-11-23');
  gleich(k(D.wochenbeginn(d(2026, 11, 23))), '2026-11-23');
});
test('plusMonate begrenzt auf Monatsende', () => {
  gleich(k(D.plusMonate(d(2026, 1, 31), 1)), '2026-02-28');
  gleich(k(D.plusMonate(d(2028, 1, 31), 1)), '2028-02-29');
});
test('plusTage über Sommerzeitwechsel behält die Uhrzeit', () => {
  const x = D.plusTage(d(2026, 10, 24, 9, 30), 1);
  gleich([x.getDate(), x.getHours(), x.getMinutes()], [25, 9, 30]);
});
test('Formate laut CD', () => {
  gleich(D.fTagKurz(d(2026, 11, 24)), 'Di., 24.11.2026');
  gleich(D.fTagLang(d(2026, 11, 15)), 'Sonntag, 15. November 2026');
  gleich(D.fMonat(d(2026, 3, 1)), 'März 2026');
  gleich(D.fUhrzeit(d(2026, 1, 1, 9, 5)), '09:05');
});
test('Kalenderwoche', () => {
  gleich(D.kalenderwoche(d(2026, 11, 24)), 48);
  gleich(D.kalenderwoche(d(2027, 1, 1)), 53);
});

// ---------- Termine: Umwandeln und Prüfen ----------
test('Ganztägig: Datensatz behält den Tag (unabhängig von der Zeitzone)', () => {
  const f = { calendar_id: 'k', titel: ' Urlaub ', ganztaegig: true, startDatum: '2026-12-24', endeDatum: '2026-12-26', wiederholung: 'keine' };
  const z = T.zuDatensatz(f);
  gleich([z.beginn, z.ende, z.titel], ['2026-12-24T00:00:00Z', '2026-12-26T00:00:00Z', 'Urlaub']);
  const t = T.ausDatensatz({ ...z, id: '1', beginn: '2026-12-24T00:00:00+00:00', ende: '2026-12-26T00:00:00+00:00' });
  gleich([k(t.start), k(t.ende)], ['2026-12-24', '2026-12-26']);
});
test('Mit Uhrzeit: Hin- und Rückweg Formular -> Datensatz -> Formular', () => {
  const f = { calendar_id: 'k', titel: 'Zahnarzt', ort: 'Braunau', beschreibung: '', ganztaegig: false,
    startDatum: '2026-12-01', startZeit: '09:30', endeDatum: '2026-12-01', endeZeit: '10:15',
    farbe: '', wiederholung: 'keine', wiederholungBis: '' };
  const zurueck = T.zuFormular(T.ausDatensatz({ id: '1', ...T.zuDatensatz(f) }));
  gleich(zurueck, f);
});
test('Validierung: Titel fehlt, Ende vor Beginn', () => {
  const f = T.neuesFormular(d(2026, 12, 1), 'k', d(2026, 11, 1));
  gleich(T.validieren(f).map((x) => x.feld), ['titel']);
  f.titel = 'X'; f.endeZeit = '08:00';
  gleich(T.validieren(f).map((x) => x.feld), ['endeDatum']);
});
test('Validierung: Titel zu lang, "bis" vor Beginn, fehlender Kalender', () => {
  const f = T.neuesFormular(d(2026, 12, 1), '', d(2026, 11, 1));
  f.titel = 'x'.repeat(121); f.wiederholung = 'woechentlich'; f.wiederholungBis = '2026-11-01';
  gleich(T.validieren(f).map((x) => x.feld), ['titel', 'calendar_id', 'wiederholungBis']);
});
test('Neuer Termin heute: nächste volle Stunde; um 23 Uhr endet er am Folgetag', () => {
  const a = T.neuesFormular(d(2026, 11, 24), 'k', d(2026, 11, 24, 14, 20));
  gleich([a.startZeit, a.endeZeit, a.endeDatum], ['15:00', '16:00', '2026-11-24']);
  const b = T.neuesFormular(d(2026, 11, 24), 'k', d(2026, 11, 24, 22, 40));
  gleich([b.startZeit, b.endeZeit, b.endeDatum], ['23:00', '00:00', '2026-11-25']);
});

// ---------- Wiederholung ----------
const termin = (start, ende, extra = {}) => ({ id: 't', titel: 'T', calendar_id: 'k', ganztaegig: false, start, ende, wiederholung: 'keine', wiederholungBis: null, ...extra });
test('Einzeltermin: nur im passenden Zeitraum', () => {
  const t = termin(d(2026, 12, 1, 9), d(2026, 12, 1, 10));
  gleich(W.vorkommen(t, d(2026, 12, 1), d(2026, 12, 2)).length, 1);
  gleich(W.vorkommen(t, d(2026, 12, 2), d(2026, 12, 3)).length, 0);
});
test('Termin, der genau um 00:00 endet, gehört nicht zum Folgetag', () => {
  const t = termin(d(2026, 12, 1, 22), d(2026, 12, 2, 0));
  gleich(W.vorkommen(t, d(2026, 12, 2), d(2026, 12, 3)).length, 0);
});
test('Wöchentlich: 5 Dienstage im Dezember 2026, Uhrzeit bleibt', () => {
  const t = termin(d(2026, 11, 3, 18), d(2026, 11, 3, 19), { wiederholung: 'woechentlich' });
  const v = W.vorkommen(t, d(2026, 12, 1), d(2027, 1, 1));
  gleich(v.map((x) => x.start.getDate()), [1, 8, 15, 22, 29]);
  wahr(v.every((x) => x.start.getHours() === 18), 'immer 18 Uhr');
});
test('Wöchentlich über den Sommerzeitwechsel: weiter 09:00 Ortszeit', () => {
  const t = termin(d(2026, 10, 18, 9), d(2026, 10, 18, 10), { wiederholung: 'woechentlich' });
  const v = W.vorkommen(t, d(2026, 10, 24), d(2026, 11, 2));
  gleich(v.map((x) => [x.start.getDate(), x.start.getHours()]), [[25, 9], [1, 9]]);
});
test('Monatlich am 31.: fällt in kurzen Monaten aus', () => {
  const t = termin(d(2026, 1, 31, 8), d(2026, 1, 31, 9), { wiederholung: 'monatlich' });
  const v = W.vorkommen(t, d(2026, 1, 1), d(2026, 8, 1));
  gleich(v.map((x) => x.start.getMonth() + 1), [1, 3, 5, 7]);
});
test('Jährlich am 29.02.: nur in Schaltjahren', () => {
  const t = termin(d(2028, 2, 29), d(2028, 2, 29), { ganztaegig: true, wiederholung: 'jaehrlich' });
  const v = W.vorkommen(t, d(2028, 1, 1), d(2033, 1, 1));
  gleich(v.map((x) => x.start.getFullYear()), [2028, 2032]);
});
test('Täglich mit "bis" (einschließlich)', () => {
  const t = termin(d(2026, 12, 1, 7), d(2026, 12, 1, 8), { wiederholung: 'taeglich', wiederholungBis: d(2026, 12, 3) });
  gleich(W.vorkommen(t, d(2026, 11, 1), d(2027, 1, 1)).length, 3);
});
test('Täglich seit Jahren: springt effizient zum Zeitraum', () => {
  const t = termin(d(2016, 1, 1, 7), d(2016, 1, 1, 8), { wiederholung: 'taeglich' });
  const v = W.vorkommen(t, d(2026, 12, 1), d(2026, 12, 8));
  gleich(v.length, 7); gleich(k(v[0].start), '2026-12-01');
});
test('Mehrtägiger Termin, der vor dem Zeitraum beginnt, wird gefunden', () => {
  const t = termin(d(2026, 11, 28), d(2026, 12, 2), { ganztaegig: true, wiederholung: 'monatlich' });
  const v = W.vorkommen(t, d(2026, 12, 1), d(2026, 12, 8));
  gleich(v.map((x) => k(x.start)), ['2026-11-28']);
});

// ---------- Anordnung ----------
test('proTag: mehrtägige Leiste auf jedem Tag, Leisten vor Uhrzeit-Terminen', () => {
  const urlaub = termin(d(2026, 12, 1), d(2026, 12, 3), { id: 'u', titel: 'Urlaub', ganztaegig: true });
  const frueh = termin(d(2026, 12, 2, 8), d(2026, 12, 2, 9), { id: 'f', titel: 'Früh' });
  const spaet = termin(d(2026, 12, 2, 18), d(2026, 12, 2, 19), { id: 's', titel: 'Spät' });
  const tage = D.wochentage(d(2026, 12, 2));
  const pt = T.proTag(T.vorkommenImZeitraum([spaet, urlaub, frueh], tage[0], D.plusTage(tage[6], 1)), tage);
  gleich(pt.get('2026-12-02').map((e) => e.v.termin.titel), ['Urlaub', 'Früh', 'Spät']);
  gleich(['2026-11-30', '2026-12-01', '2026-12-03', '2026-12-04'].map((x) => pt.get(x).length), [0, 1, 1, 0]);
  const am2 = pt.get('2026-12-02')[0];
  gleich([am2.beginntHier, am2.endetHier], [false, false]);
});
test('Über Mitternacht (22-02 Uhr) ist eine Leiste über zwei Tage', () => {
  const t = termin(d(2026, 12, 31, 22), d(2027, 1, 1, 2), { titel: 'Silvester' });
  const v = T.vorkommenImZeitraum([t], d(2026, 12, 1), d(2027, 2, 1));
  wahr(T.istLeiste(v[0]), 'Leiste');
  const pt = T.proTag(v, [d(2026, 12, 31), d(2027, 1, 1)]);
  gleich([pt.get('2026-12-31').length, pt.get('2027-01-01').length], [1, 1]);
});
test('spuren: überlappende Termine teilen sich die Breite, getrennte nicht', () => {
  const a = termin(d(2026, 12, 2, 9), d(2026, 12, 2, 11), { id: 'a', titel: 'A' });
  const b = termin(d(2026, 12, 2, 10), d(2026, 12, 2, 12), { id: 'b', titel: 'B' });
  const c = termin(d(2026, 12, 2, 14), d(2026, 12, 2, 15), { id: 'c', titel: 'C' });
  const tag = d(2026, 12, 2);
  const s = T.spuren(T.vorkommenImZeitraum([a, b, c], tag, D.plusTage(tag, 1)), tag);
  gleich(s.map((x) => [x.v.termin.titel, x.spalte, x.spalten, x.oben, x.hoehe]),
    [['A', 0, 2, 540, 120], ['B', 1, 2, 600, 120], ['C', 0, 1, 840, 60]]);
});
test('Farbe: eigene Terminfarbe vor Kalenderfarbe', () => {
  const kal = new Map([['k', { farbe: '#2F6690' }]]);
  gleich(T.terminFarbe({ calendar_id: 'k', farbe: null }, kal), '#2F6690');
  gleich(T.terminFarbe({ calendar_id: 'k', farbe: '#6A1B2B' }, kal), '#6A1B2B');
});

// ---------- Rechte (spiegeln schema.sql) ----------
test('Schreiben: Owner und Editor ja, Viewer und Fremde nein', () => {
  gleich(['owner', 'editor', 'viewer', undefined].map(R.darfSchreiben), [true, true, false, false]);
  gleich(['owner', 'editor', 'viewer', undefined].map(R.darfLesen), [true, true, true, false]);
});
test('Verwalten und Einladen: nur Owner', () => {
  gleich(['owner', 'editor', 'viewer'].map(R.darfEinladen), [true, false, false]);
});
test('Rollen ändern: nur Owner, nie die eigene, nie zu oder von Owner', () => {
  wahr(R.darfRolleAendern('owner', 'viewer', 'editor', false), 'Owner macht Viewer zu Editor');
  wahr(!R.darfRolleAendern('owner', 'owner', 'editor', true), 'eigene Rolle');
  wahr(!R.darfRolleAendern('owner', 'editor', 'owner', false), 'zweite:r Owner');
  wahr(!R.darfRolleAendern('editor', 'viewer', 'editor', false), 'Editor darf nicht');
});
test('Entfernen: Owner entfernt andere, jede:r tritt selbst aus, Owner nie', () => {
  wahr(R.darfEntfernen('owner', 'editor', false), 'Owner entfernt Editor');
  wahr(R.darfEntfernen('viewer', 'viewer', true), 'Viewer tritt aus');
  wahr(!R.darfEntfernen('editor', 'viewer', false), 'Editor entfernt andere');
  wahr(!R.darfEntfernen('owner', 'owner', true), 'Owner tritt aus');
});
test('Termin verschieben braucht Schreibrecht in beiden Kalendern', () => {
  wahr(R.darfTerminSpeichern('editor', 'owner'), 'Editor -> Owner-Kalender');
  wahr(!R.darfTerminSpeichern('editor', 'viewer'), 'in Lese-Kalender');
  wahr(!R.darfTerminSpeichern('viewer'), 'Viewer');
  gleich(R.beschreibbar([{ rolle: 'owner' }, { rolle: 'viewer' }, { rolle: 'editor' }]).length, 2);
});

// ---------- Ausführen ----------
const liste = document.getElementById('ergebnisse');
let ok = 0;
for (const t of tests) {
  const li = document.createElement('li');
  try { t.fn(); ok++; li.textContent = `✓ ${t.name}`; li.className = 'ok'; }
  catch (e) { li.textContent = `✗ ${t.name}: ${e.message}`; li.className = 'fehler'; console.error(t.name, e); }
  liste.append(li);
}
const sum = document.getElementById('summe');
sum.textContent = `${ok} von ${tests.length} Tests bestanden.`;
sum.className = ok === tests.length ? 'ok' : 'fehler';
document.title = `${ok === tests.length ? '✓' : '✗'} BaseDays Tests`;
window.testErgebnis = { ok, gesamt: tests.length };
