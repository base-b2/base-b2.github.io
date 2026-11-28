/* BaseDays | Datum: Rechnen und Formatieren in der Ortszeit des Geräts.
   Rein rechnend, kein DOM: wird auch von den Tests geladen. Woche beginnt am Montag. */

export const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const zwei = (n) => String(n).padStart(2, '0');

/** Mitternacht (Ortszeit) des Tages von d, als neues Objekt. */
export function tagesbeginn(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

/** "2026-11-24" in Ortszeit. */
export function schluessel(d) { return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`; }

/** "2026-11-24" -> Date (Ortszeit, 00:00). */
export function ausSchluessel(s) {
  const [j, m, t] = s.split('-').map(Number);
  return new Date(j, m - 1, t);
}

/** Tage addieren über das Kalenderdatum (sicher bei Sommerzeitwechsel). Uhrzeit bleibt erhalten. */
export function plusTage(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

/** Monate addieren; der Tag wird auf das Monatsende begrenzt (31.01. + 1 Monat = 28./29.02.). */
export function plusMonate(d, n) {
  const ziel = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  ziel.setDate(Math.min(d.getDate(), tageImMonat(ziel.getFullYear(), ziel.getMonth())));
  return ziel;
}

export function tageImMonat(jahr, monat) { return new Date(jahr, monat + 1, 0).getDate(); }

/** Ganze Kalendertage von a bis b (ohne Uhrzeit, sommerzeitsicher). */
export function tageZwischen(a, b) {
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
}

export function gleicherTag(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Montag der Woche von d (00:00). */
export function wochenbeginn(d) {
  const t = tagesbeginn(d);
  return plusTage(t, -((t.getDay() + 6) % 7));
}

/** Wochentag 0 = Montag ... 6 = Sonntag. */
export function wochentag(d) { return (d.getDay() + 6) % 7; }

/** Alle Tage des Monatsrasters: volle Wochen (Mo-So), die den Monat abdecken (4-6 Wochen). */
export function monatsraster(jahr, monat) {
  const erster = new Date(jahr, monat, 1);
  const start = wochenbeginn(erster);
  const letzter = new Date(jahr, monat, tageImMonat(jahr, monat));
  const wochen = Math.ceil((tageZwischen(start, letzter) + 1) / 7);
  return Array.from({ length: wochen * 7 }, (_, i) => plusTage(start, i));
}

/** Die sieben Tage der Woche von d. */
export function wochentage(d) {
  const start = wochenbeginn(d);
  return Array.from({ length: 7 }, (_, i) => plusTage(start, i));
}

/** ISO-Kalenderwoche. */
export function kalenderwoche(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const tag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - tag);
  const jahresbeginn = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - jahresbeginn) / 86400000 + 1) / 7);
}

// ---------- Formate laut CD ----------
/** "November 2026" */
export function fMonat(d) { return `${MONATE[d.getMonth()]} ${d.getFullYear()}`; }
/** "Di., 24.11.2026" (Kästen, Tabellen) */
export function fTagKurz(d) { return `${WOCHENTAGE_KURZ[wochentag(d)]}., ${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}`; }
/** "Dienstag, 24. November 2026" (Fließtext, Überschriften) */
export function fTagLang(d) { return `${WOCHENTAGE[wochentag(d)]}, ${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`; }
/** "24.11." */
export function fTagMonat(d) { return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.`; }
/** "09:30" (Raster und Listen mit führender Null) */
export function fUhrzeit(d) { return `${zwei(d.getHours())}:${zwei(d.getMinutes())}`; }
/** Wert für <input type="time"> */
export function zeitWert(d) { return fUhrzeit(d); }

/** "2026-11-24" + "09:30" -> Date (Ortszeit). Leere Zeit = 00:00. */
export function ausDatumUndZeit(datum, zeit) {
  const d = ausSchluessel(datum);
  if (zeit) { const [h, m] = zeit.split(':').map(Number); d.setHours(h, m, 0, 0); }
  return d;
}
