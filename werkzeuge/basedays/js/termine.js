/* BaseDays | Termine: Umwandeln (Datenbank <-> App <-> Formular), Prüfen und Anordnen in den Ansichten.
   Rein rechnend, kein DOM: wird auch von den Tests geladen.

   Speicherformat (Datenbank):
   - Ganztägig: beginn/ende = "JJJJ-MM-TTT00:00:00Z", ende = letzter Tag (einschließlich). Der Tag bleibt in jeder Zeitzone gleich.
   - Mit Uhrzeit: echte Zeitpunkte (ISO mit Zeitzone), angezeigt in der Ortszeit des Geräts. */
import { ausSchluessel, schluessel, plusTage, ausDatumUndZeit, gleicherTag, zeitWert } from './datum.js';
import { vorkommen, endeExklusiv, REGELN } from './wiederholung.js';

export const GRENZEN = { titel: 120, ort: 200, beschreibung: 4000 };

/** Datensatz aus der Datenbank -> Termin mit Date-Objekten. */
export function ausDatensatz(z) {
  const ganz = !!z.ganztaegig;
  return {
    ...z,
    ganztaegig: ganz,
    start: ganz ? ausSchluessel(z.beginn.slice(0, 10)) : new Date(z.beginn),
    ende: ganz ? ausSchluessel(z.ende.slice(0, 10)) : new Date(z.ende),
    wiederholung: z.wiederholung || 'keine',
    wiederholungBis: z.wiederholung_bis ? ausSchluessel(z.wiederholung_bis) : null,
  };
}

/** Formularwerte -> Datensatz für die Datenbank (ohne id). Vorher validieren(). */
export function zuDatensatz(f) {
  const ganz = !!f.ganztaegig;
  const regel = REGELN[f.wiederholung] ? f.wiederholung : 'keine';
  return {
    calendar_id: f.calendar_id,
    titel: f.titel.trim(),
    ort: (f.ort || '').trim(),
    beschreibung: (f.beschreibung || '').trim(),
    ganztaegig: ganz,
    beginn: ganz ? `${f.startDatum}T00:00:00Z` : ausDatumUndZeit(f.startDatum, f.startZeit).toISOString(),
    ende: ganz ? `${f.endeDatum}T00:00:00Z` : ausDatumUndZeit(f.endeDatum, f.endeZeit).toISOString(),
    farbe: f.farbe || null,
    wiederholung: regel,
    wiederholung_bis: regel !== 'keine' && f.wiederholungBis ? f.wiederholungBis : null,
  };
}

/** Termin -> Formularwerte (zum Bearbeiten). */
export function zuFormular(t) {
  return {
    calendar_id: t.calendar_id,
    titel: t.titel,
    ort: t.ort || '',
    beschreibung: t.beschreibung || '',
    ganztaegig: t.ganztaegig,
    startDatum: schluessel(t.start),
    startZeit: t.ganztaegig ? '09:00' : zeitWert(t.start),
    endeDatum: schluessel(t.ende),
    endeZeit: t.ganztaegig ? '10:00' : zeitWert(t.ende),
    farbe: t.farbe || '',
    wiederholung: t.wiederholung || 'keine',
    wiederholungBis: t.wiederholungBis ? schluessel(t.wiederholungBis) : '',
  };
}

/** Vorbelegung für einen neuen Termin an einem Tag: nächste volle Stunde (heute) bzw. 09:00, eine Stunde lang. */
export function neuesFormular(tag, calendar_id, jetzt = new Date()) {
  let h = 9;
  if (gleicherTag(tag, jetzt)) h = Math.min(23, jetzt.getHours() + 1);
  const zwei = (n) => String(n).padStart(2, '0');
  return {
    calendar_id, titel: '', ort: '', beschreibung: '', ganztaegig: false,
    startDatum: schluessel(tag), startZeit: `${zwei(h)}:00`,
    endeDatum: schluessel(h === 23 ? plusTage(tag, 1) : tag), endeZeit: `${zwei((h + 1) % 24)}:00`,
    farbe: '', wiederholung: 'keine', wiederholungBis: '',
  };
}

/** Prüft Formularwerte. Rückgabe: Liste von { feld, text } (leer = in Ordnung). */
export function validieren(f) {
  const fehler = [];
  const datumOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const zeitOk = (s) => /^\d{2}:\d{2}$/.test(s || '');
  if (!f.titel || !f.titel.trim()) fehler.push({ feld: 'titel', text: 'Bitte einen Titel eingeben.' });
  else if (f.titel.trim().length > GRENZEN.titel) fehler.push({ feld: 'titel', text: `Der Titel darf höchstens ${GRENZEN.titel} Zeichen haben.` });
  if ((f.ort || '').length > GRENZEN.ort) fehler.push({ feld: 'ort', text: `Der Ort darf höchstens ${GRENZEN.ort} Zeichen haben.` });
  if ((f.beschreibung || '').length > GRENZEN.beschreibung) fehler.push({ feld: 'beschreibung', text: `Die Beschreibung darf höchstens ${GRENZEN.beschreibung} Zeichen haben.` });
  if (!f.calendar_id) fehler.push({ feld: 'calendar_id', text: 'Bitte einen Kalender wählen.' });
  if (!datumOk(f.startDatum)) fehler.push({ feld: 'startDatum', text: 'Bitte ein Startdatum wählen.' });
  if (!datumOk(f.endeDatum)) fehler.push({ feld: 'endeDatum', text: 'Bitte ein Enddatum wählen.' });
  if (!f.ganztaegig) {
    if (!zeitOk(f.startZeit)) fehler.push({ feld: 'startZeit', text: 'Bitte eine Startzeit wählen.' });
    if (!zeitOk(f.endeZeit)) fehler.push({ feld: 'endeZeit', text: 'Bitte eine Endzeit wählen.' });
  }
  if (fehler.some((x) => /Datum|Zeit/.test(x.feld))) return fehler;

  const start = f.ganztaegig ? ausSchluessel(f.startDatum) : ausDatumUndZeit(f.startDatum, f.startZeit);
  const ende = f.ganztaegig ? ausSchluessel(f.endeDatum) : ausDatumUndZeit(f.endeDatum, f.endeZeit);
  if (ende < start) fehler.push({ feld: 'endeDatum', text: 'Das Ende liegt vor dem Beginn.' });
  if (f.wiederholung && f.wiederholung !== 'keine' && f.wiederholungBis) {
    if (!datumOk(f.wiederholungBis)) fehler.push({ feld: 'wiederholungBis', text: 'Bitte ein gültiges Datum für "Wiederholen bis" wählen.' });
    else if (ausSchluessel(f.wiederholungBis) < ausSchluessel(f.startDatum)) fehler.push({ feld: 'wiederholungBis', text: '"Wiederholen bis" liegt vor dem Beginn.' });
  }
  return fehler;
}

/** Alle Vorkommen aller Termine im Zeitraum [von, bis). */
export function vorkommenImZeitraum(termine, von, bis) {
  const liste = [];
  for (const t of termine) {
    for (const v of vorkommen(t, von, bis)) {
      const datum = schluessel(v.start);
      liste.push({ termin: t, start: v.start, ende: v.ende, datum, schluessel: `${t.id}|${datum}` });
    }
  }
  return liste;
}

/** Läuft das Vorkommen über mehr als einen Kalendertag (oder ist ganztägig)? -> als Leiste anzeigen. */
export function istLeiste(v) {
  if (v.termin.ganztaegig) return true;
  const letzterMoment = new Date(endeExklusiv(v.start, v.ende, false).getTime() - 1);
  return !gleicherTag(v.start, letzterMoment);
}

function vergleich(a, b) {
  if (a.leiste !== b.leiste) return a.leiste ? -1 : 1;
  if (a.v.start - b.v.start) return a.v.start - b.v.start;
  if (a.leiste && b.v.ende - a.v.ende) return b.v.ende - a.v.ende;   // längere Leisten zuerst
  if (a.v.ende - b.v.ende) return a.v.ende - b.v.ende;
  return a.v.termin.titel.localeCompare(b.v.termin.titel, 'de');
}

/**
 * Verteilt Vorkommen auf Tage. Rückgabe: Map "JJJJ-MM-TT" -> sortierte Liste von
 * { v, leiste, beginntHier, endetHier }. Leisten (ganztägig/mehrtägig) zuerst, dann nach Uhrzeit.
 */
export function proTag(vorkommenListe, tage) {
  const karte = new Map(tage.map((d) => [schluessel(d), []]));
  for (const v of vorkommenListe) {
    const leiste = istLeiste(v);
    const bisEx = endeExklusiv(v.start, v.ende, v.termin.ganztaegig);
    for (const tag of tage) {
      const tagEnde = plusTage(tag, 1);
      if (v.start < tagEnde && bisEx > tag) {
        karte.get(schluessel(tag)).push({
          v, leiste,
          beginntHier: v.start >= tag,
          endetHier: bisEx <= tagEnde,
        });
      }
    }
  }
  for (const liste of karte.values()) liste.sort(vergleich);
  return karte;
}

/**
 * Ordnet Termine mit Uhrzeit eines Tages für das Zeitraster an (Wochen- und Tagesansicht).
 * Überlappende Termine teilen sich die Breite in Spalten.
 * Rückgabe: [{ v, oben, hoehe, spalte, spalten }], oben/hoehe in Minuten ab 00:00 des Tages.
 */
export function spuren(vorkommenListe, tag, mindestMinuten = 20) {
  const tagEnde = plusTage(tag, 1);
  const kaesten = vorkommenListe
    .filter((v) => !istLeiste(v) && v.start < tagEnde && endeExklusiv(v.start, v.ende, false) > tag)
    .map((v) => {
      const von = Math.max(0, (v.start - tag) / 60000);
      const bis = Math.min((tagEnde - tag) / 60000, (v.ende - tag) / 60000);
      return { v, oben: von, hoehe: Math.max(bis - von, 0), sichtEnde: Math.max(bis, von + mindestMinuten) };
    })
    .sort((a, b) => a.oben - b.oben || b.sichtEnde - a.sichtEnde);

  let gruppe = [], gruppenEnde = -1, spurenEnden = [];
  const abschliessen = () => { for (const k of gruppe) k.spalten = spurenEnden.length; gruppe = []; spurenEnden = []; };
  for (const k of kaesten) {
    if (k.oben >= gruppenEnde && gruppe.length) abschliessen();
    let spur = spurenEnden.findIndex((e) => e <= k.oben);
    if (spur === -1) { spur = spurenEnden.length; spurenEnden.push(k.sichtEnde); } else spurenEnden[spur] = k.sichtEnde;
    k.spalte = spur;
    gruppe.push(k);
    gruppenEnde = Math.max(gruppenEnde, k.sichtEnde);
  }
  abschliessen();
  return kaesten.map(({ v, oben, hoehe, spalte, spalten }) => ({ v, oben, hoehe, spalte, spalten }));
}

/** Farbe eines Termins: eigene Farbe, sonst die des Kalenders. */
export function terminFarbe(termin, kalenderNachId) {
  return termin.farbe || kalenderNachId.get(termin.calendar_id)?.farbe || '#1C2E4A';
}
