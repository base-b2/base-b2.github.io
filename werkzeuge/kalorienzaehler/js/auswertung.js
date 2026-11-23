/* BaseBite | Auswertungen aus dem Tagebuch: Vorschläge (häufig gegessen), Verlauf, Statistik.
   Reine Funktionen ohne Datenbankzugriff, damit sie sich in der Konsole nachprüfen lassen. */
import { tagNr, runde } from './rechner.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').trim();

/** Ein Lebensmittel erkennt BaseBite an seiner Quelle (eigenes, Open Food Facts, Rezept), sonst an Name + Marke */
export const schluessel = (e) => (e.ref && e.ref.id && e.ref.store !== 'eintrag' ? `${e.ref.store}|${e.ref.id}` : `name|${norm(e.name)}|${norm(e.marke)}`);

const spaeter = (a, b) => a.datum.localeCompare(b.datum) || (a.erstellt || '').localeCompare(b.erstellt || '');

/** Einträge nach Lebensmittel zusammenfassen */
export function gruppiere(eintraege) {
  const g = new Map();
  for (const e of eintraege) {
    const k = schluessel(e);
    if (!g.has(k)) g.set(k, { key: k, name: e.name, marke: e.marke || '', anzahl: 0, tage: new Set(), gramm: 0, kcal: 0, mahlzeiten: {}, letzter: e, letzterJe: {} });
    const x = g.get(k);
    if (!x.letzterJe[e.mahlzeit] || spaeter(e, x.letzterJe[e.mahlzeit]) > 0) x.letzterJe[e.mahlzeit] = e;
    x.anzahl += 1;
    x.tage.add(e.datum);
    x.gramm += Number(e.menge) || 0;
    x.kcal += Number(e.kcal) || 0;
    x.mahlzeiten[e.mahlzeit] = (x.mahlzeiten[e.mahlzeit] || 0) + 1;
    if (spaeter(e, x.letzter) > 0) { x.letzter = e; x.name = e.name; x.marke = e.marke || ''; }
  }
  return [...g.values()];
}

/**
 * Vorschläge: was in den letzten `tage` Tagen mindestens zweimal gegessen wurde.
 * Punkte = 3 x Anzahl bei dieser Mahlzeit + Anzahl insgesamt + bis zu 4 Punkte, je kürzer es her ist.
 * Was an diesem Tag bei dieser Mahlzeit schon eingetragen ist, wird nicht vorgeschlagen.
 */
export function vorschlaege(eintraege, { mahlzeit, datum, tage = 42, max = 8 } = {}) {
  const ende = tagNr(datum);
  const fenster = eintraege.filter((e) => { const n = tagNr(e.datum); return n <= ende && n > ende - tage; });
  const schonDa = new Set(eintraege.filter((e) => e.datum === datum && e.mahlzeit === mahlzeit).map(schluessel));
  return gruppiere(fenster)
    .filter((x) => x.anzahl >= 2 && !schonDa.has(x.key))
    .map((x) => {
      const seit = Math.max(0, ende - tagNr(x.letzter.datum));
      const beiMahlzeit = x.mahlzeiten[mahlzeit] || 0;
      // Menge wie beim letzten Mal bei DIESER Mahlzeit (Snack-Portion statt Mittagsportion)
      return { ...x, letzter: x.letzterJe[mahlzeit] || x.letzter, beiMahlzeit, punkte: runde(3 * beiMahlzeit + x.anzahl + 4 / (1 + seit / 7), 2) };
    })
    .sort((a, b) => b.punkte - a.punkte || a.name.localeCompare(b.name, 'de'))
    .slice(0, max);
}

/** Verlauf: jedes Lebensmittel einmal, das zuletzt gegessene zuerst */
export function verlauf(eintraege, max = 40) {
  return gruppiere(eintraege).sort((a, b) => spaeter(b.letzter, a.letzter)).slice(0, max);
}

/** Statistik für einen Zeitraum (von/bis inklusive, Format JJJJ-MM-TT) */
export function statistik(eintraege, von, bis) {
  const im = eintraege.filter((e) => e.datum >= von && e.datum <= bis);
  const gruppen = gruppiere(im);
  const summe = im.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
  const tageMit = new Set(im.map((e) => e.datum)).size;
  const tageGesamt = tagNr(bis) - tagNr(von) + 1;
  const proMahlzeit = {};
  for (const e of im) proMahlzeit[e.mahlzeit] = (proMahlzeit[e.mahlzeit] || 0) + (Number(e.kcal) || 0);
  return {
    eintraege: im.length, verschiedene: gruppen.length, summe: runde(summe), tageMit, tageGesamt,
    schnittProTag: tageMit ? runde(summe / tageMit) : 0,
    haeufig: gruppen.slice().sort((a, b) => b.anzahl - a.anzahl || b.kcal - a.kcal).slice(0, 10)
      .map((x) => ({ ...x, tage: x.tage.size, gramm: runde(x.gramm), kcal: runde(x.kcal) })),
    topKcal: gruppen.slice().sort((a, b) => b.kcal - a.kcal).slice(0, 10)
      .map((x) => ({ ...x, tage: x.tage.size, gramm: runde(x.gramm), kcal: runde(x.kcal), anteil: summe ? runde((x.kcal / summe) * 100, 1) : 0 })),
    proMahlzeit,
  };
}
