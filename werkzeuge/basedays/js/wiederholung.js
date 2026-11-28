/* BaseDays | Wiederholungen: Vorkommen eines Termins in einem Zeitraum berechnen.
   Regeln: keine, taeglich, woechentlich, monatlich, jaehrlich; optional "bis" (Tag, einschließlich).
   Monatlich am 31. fällt in Monaten ohne 31. aus, jährlich am 29.02. nur in Schaltjahren
   (wie in den meisten Kalender-Apps, statt auf einen anderen Tag zu rutschen). */
import { plusTage, tageZwischen } from './datum.js';

export const REGELN = {
  keine: 'Keine',
  taeglich: 'Täglich',
  woechentlich: 'Wöchentlich',
  monatlich: 'Monatlich',
  jaehrlich: 'Jährlich',
};

const MAX_VORKOMMEN = 2000;   // Sicherung gegen Endlosschleifen

/** Exklusives Ende eines Vorkommens (ganztägig: Tag nach dem letzten Tag; Dauer 0: +1 ms). */
export function endeExklusiv(start, ende, ganztaegig) {
  if (ganztaegig) return plusTage(ende, 1);
  return ende > start ? ende : new Date(start.getTime() + 1);
}

/** Start des n-ten Vorkommens oder null, wenn es diesen Tag nicht gibt (31. im April, 29.02.). */
export function nterStart(start, regel, n) {
  const j = start.getFullYear(), m = start.getMonth(), t = start.getDate();
  const h = start.getHours(), min = start.getMinutes();
  switch (regel) {
    case 'taeglich': return plusTage(start, n);
    case 'woechentlich': return plusTage(start, 7 * n);
    case 'monatlich': {
      const d = new Date(j, m + n, t, h, min);
      return d.getDate() === t ? d : null;
    }
    case 'jaehrlich': {
      const d = new Date(j + n, m, t, h, min);
      return d.getMonth() === m && d.getDate() === t ? d : null;
    }
    default: return n === 0 ? new Date(start) : null;
  }
}

/** Erstes n, ab dem gesucht werden muss (überspringt Vorkommen weit vor "von"). */
function startIndex(start, regel, von, dauerTage) {
  const puffer = dauerTage + 2;
  const tage = tageZwischen(start, von) - puffer;
  if (tage <= 0) return 0;
  switch (regel) {
    case 'taeglich': return tage;
    case 'woechentlich': return Math.floor(tage / 7);
    case 'monatlich': return Math.max(0, Math.floor(tage / 31));
    case 'jaehrlich': return Math.max(0, Math.floor(tage / 366));
    default: return 0;
  }
}

/**
 * Alle Vorkommen eines Termins, die den Zeitraum [von, bis) berühren.
 * termin: { start: Date, ende: Date, ganztaegig: bool, wiederholung: string, wiederholungBis: Date|null }
 * Ganztägig: start/ende sind 00:00 Ortszeit, ende ist der letzte Tag (einschließlich).
 * Rückgabe: [{ start, ende, n }] sortiert nach start.
 */
export function vorkommen(termin, von, bis) {
  const { start, ende, ganztaegig } = termin;
  const regel = REGELN[termin.wiederholung] ? termin.wiederholung : 'keine';
  const dauerMs = ende - start;
  const dauerTage = tageZwischen(start, ende);
  const grenze = termin.wiederholungBis ? plusTage(termin.wiederholungBis, 1) : null;   // exklusiv
  const liste = [];

  if (regel === 'keine') {
    if (start < bis && endeExklusiv(start, ende, ganztaegig) > von) liste.push({ start: new Date(start), ende: new Date(ende), n: 0 });
    return liste;
  }

  for (let n = startIndex(start, regel, von, dauerTage), schritte = 0; schritte < MAX_VORKOMMEN; n++, schritte++) {
    const s = nterStart(start, regel, n);
    if (s === null) continue;
    if (s >= bis) break;
    if (grenze && s >= grenze) break;
    const e = ganztaegig ? plusTage(s, dauerTage) : new Date(s.getTime() + dauerMs);
    if (endeExklusiv(s, e, ganztaegig) > von) liste.push({ start: s, ende: e, n });
  }
  return liste;
}
