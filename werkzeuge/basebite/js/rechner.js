/* BaseBite | Rechenfunktionen (ohne Seiteneffekte, im Browser-Konsolentest nachprüfbar) */

export const KCAL_PRO_KG = 7700;   // Faustwert: 1 kg Körperfett ~ 7.700 kcal

export const AKTIVITAET = {
  sitzend: { faktor: 1.2, text: 'Sitzend, kaum Bewegung' },
  leicht: { faktor: 1.375, text: 'Leicht aktiv (1-3x Sport pro Woche)' },
  maessig: { faktor: 1.55, text: 'Mäßig aktiv (3-5x Sport pro Woche)' },
  sehr: { faktor: 1.725, text: 'Sehr aktiv (6-7x Sport pro Woche)' },
  extrem: { faktor: 1.9, text: 'Extrem aktiv (körperliche Arbeit + Sport)' },
};

export const MINDEST_KCAL = { m: 1500, w: 1200, d: 1350 };

/** Runden auf n Nachkommastellen */
export const runde = (x, n = 0) => {
  const f = 10 ** n;
  return Math.round((Number(x) + Number.EPSILON) * f) / f;
};

/** Grundumsatz nach Mifflin-St Jeor (kcal/Tag).
 *  Männer: 10*kg + 6,25*cm - 5*Jahre + 5 | Frauen: ... - 161 | keine Angabe: Mittelwert (-78) */
export function grundumsatz({ geschlecht, alter, groesse, gewicht }) {
  if (!(alter > 0 && groesse > 0 && gewicht > 0)) return null;
  const s = geschlecht === 'm' ? 5 : geschlecht === 'w' ? -161 : -78;
  return 10 * gewicht + 6.25 * groesse - 5 * alter + s;
}

export function gesamtumsatz(profil) {
  const bmr = grundumsatz(profil);
  if (bmr == null) return null;
  return bmr * (AKTIVITAET[profil.aktivitaet] || AKTIVITAET.sitzend).faktor;
}

/** Tägliche Energiedifferenz für ein Tempo in kg/Woche */
export const tagesDifferenz = (tempoKgWoche) => (tempoKgWoche * KCAL_PRO_KG) / 7;

/** Vorschlag für das Tagesziel, auf 10 kcal gerundet */
export function zielVorschlag(profil) {
  const bmr = grundumsatz(profil);
  const tdee = gesamtumsatz(profil);
  if (bmr == null) return null;
  const tempo = Number(profil.tempo) || 0;
  let diff = 0;
  if (profil.ziel === 'abnehmen') diff = -tagesDifferenz(tempo);
  if (profil.ziel === 'zunehmen') diff = tagesDifferenz(tempo);
  return { bmr: runde(bmr), tdee: runde(tdee), differenz: runde(diff), vorschlag: runde((tdee + diff) / 10) * 10 };
}

export const bmi = (kg, cm) => (kg > 0 && cm > 0 ? kg / (cm / 100) ** 2 : null);

/** Prüft ein Tagesziel auf ungesunde Werte. Liefert Warnungen mit Begründung und einen Gegenvorschlag. */
export function pruefeZiel(profil, zielKcal) {
  const w = [];
  const bmr = grundumsatz(profil);
  const tdee = gesamtumsatz(profil);
  if (bmr == null || !zielKcal) return { warnungen: w, gegenvorschlag: null };
  const minimum = MINDEST_KCAL[profil.geschlecht] || MINDEST_KCAL.d;
  const kg = Number(profil.gewicht);
  if (zielKcal < bmr) {
    w.push({ titel: 'Ziel liegt unter Ihrem Grundumsatz',
      grund: `Ihr Grundumsatz beträgt ca. ${zahl(bmr)} kcal. So viel braucht Ihr Körper allein in Ruhe. Dauerhaft weniger zu essen kann zu Muskelabbau, Nährstoffmangel und Jo-Jo-Effekt führen.` });
  }
  if (zielKcal < minimum) {
    const wer = profil.geschlecht === 'm' ? 'Männer' : profil.geschlecht === 'w' ? 'Frauen' : 'Erwachsene';
    w.push({ titel: `Ziel liegt unter ca. ${zahl(minimum)} kcal`,
      grund: `Für ${wer} gelten ca. ${zahl(minimum)} kcal pro Tag als Untergrenze ohne ärztliche Begleitung. Darunter ist eine ausreichende Versorgung mit Nährstoffen kaum möglich.` });
  }
  // Abnahmetempo aus dem tatsächlichen Ziel ableiten
  const tempo = tdee ? ((tdee - zielKcal) * 7) / KCAL_PRO_KG : 0;
  if (tempo > 0.01 * kg) {
    w.push({ titel: 'Abnahmetempo über ca. 1 % des Körpergewichts pro Woche',
      grund: `Mit diesem Ziel nähmen Sie rechnerisch ca. ${dez(tempo, 2)} kg pro Woche ab, das sind ${dez((tempo / kg) * 100, 1)} % Ihres Gewichts. Empfohlen sind höchstens ca. 0,5-1 % (bei Ihnen ${dez(0.01 * kg, 2)} kg). Zu schnelles Abnehmen geht oft auf Kosten der Muskeln.` });
  }
  if (profil.ziel === 'abnehmen' && profil.zielgewicht > 0) {
    const zbmi = bmi(profil.zielgewicht, profil.groesse);
    if (zbmi && zbmi < 18.5) {
      const grenze = runde(18.5 * (profil.groesse / 100) ** 2, 1);
      w.push({ titel: 'Zielgewicht liegt im Untergewicht',
        grund: `Ihr Zielgewicht ergibt einen BMI von ${dez(zbmi, 1)}. Ein BMI unter 18,5 gilt als Untergewicht. Bei Ihrer Größe beginnt der Normalbereich bei ca. ${dez(grenze, 1)} kg.` });
    }
  }
  const aktuellBmi = bmi(kg, profil.groesse);
  if (profil.ziel === 'abnehmen' && aktuellBmi && aktuellBmi < 18.5) {
    w.push({ titel: 'Sie sind bereits im Untergewicht',
      grund: `Ihr aktueller BMI ist ${dez(aktuellBmi, 1)}. Abnehmen ist hier nicht sinnvoll. Bitte sprechen Sie mit einer Ärztin oder einem Arzt.` });
  }
  let gegenvorschlag = null;
  if (w.length) {
    const sicher = Math.min(Number(profil.tempo) || 0.5, 0.01 * kg, 0.75);
    const roh = profil.ziel === 'abnehmen' ? tdee - tagesDifferenz(sicher) : Math.max(zielKcal, tdee);
    // wie der Vorschlag auf 10 runden, Untergrenzen (Grundumsatz, Mindestmenge) aber nie unterschreiten
    const kcal = Math.max(Math.round(roh / 10) * 10, Math.ceil(Math.max(bmr, minimum) / 10) * 10);
    const tempoNeu = Math.max(0, ((tdee - kcal) * 7) / KCAL_PRO_KG);
    gegenvorschlag = { kcal, tempo: runde(tempoNeu, 2) };
  }
  return { warnungen: w, gegenvorschlag };
}

/** Makro-Grammziele aus kcal und Prozentanteilen (Eiweiß/KH 4 kcal/g, Fett 9 kcal/g) */
export function makroGramm(kcal, p = { eiweiss: 20, fett: 30, kh: 50 }) {
  return {
    eiweiss: runde((kcal * p.eiweiss) / 100 / 4),
    fett: runde((kcal * p.fett) / 100 / 9),
    kh: runde((kcal * p.kh) / 100 / 4),
  };
}

export const NAEHRWERTE = ['eiweiss', 'fett', 'kh', 'zucker', 'ballast', 'salz'];
export const NAEHRWERT_NAMEN = { eiweiss: 'Eiweiß', fett: 'Fett', kh: 'Kohlenhydrate', zucker: 'davon Zucker', ballast: 'Ballaststoffe', salz: 'Salz' };

/** Nährwerte für eine Menge in Gramm aus Werten pro 100 g. 150 g bei 380 kcal/100 g = 570 kcal. */
export function fuerMenge(lm, gramm) {
  const f = Number(gramm) / 100;
  const r = { kcal: runde((Number(lm.kcal100) || 0) * f) };
  for (const n of NAEHRWERTE) r[n] = lm[n] == null || lm[n] === '' ? null : runde(Number(lm[n]) * f, 1);
  return r;
}

export const kcalProPackung = (kcal100, packungG) => (kcal100 > 0 && packungG > 0 ? runde((kcal100 * packungG) / 100) : null);
export const kcal100AusPackung = (kcalPackung, packungG) => (kcalPackung > 0 && packungG > 0 ? runde((kcalPackung / packungG) * 100, 1) : null);

/** Rezept: Summe der Zutaten, Werte pro 100 g (bezogen auf das Gesamtgewicht nach dem Kochen) und pro Portion */
export function rezeptWerte(rezept) {
  const summe = { kcal: 0, gramm: 0 };
  for (const n of NAEHRWERTE) summe[n] = 0;
  for (const z of rezept.zutaten || []) {
    const m = Number(z.menge) || 0;
    summe.kcal += ((Number(z.kcal100) || 0) * m) / 100;
    summe.gramm += m;
    for (const n of NAEHRWERTE) summe[n] += ((Number(z[n]) || 0) * m) / 100;
  }
  const gesamt = Number(rezept.gesamtgewicht) > 0 ? Number(rezept.gesamtgewicht) : summe.gramm;
  const portionen = Number(rezept.portionen) > 0 ? Number(rezept.portionen) : 1;
  const pro100 = { kcal100: gesamt ? runde((summe.kcal / gesamt) * 100, 1) : 0 };
  for (const n of NAEHRWERTE) pro100[n] = gesamt ? runde((summe[n] / gesamt) * 100, 2) : 0;
  return {
    kcalGesamt: runde(summe.kcal), zutatenGramm: runde(summe.gramm), gesamtgewicht: runde(gesamt),
    pro100, portionGramm: runde(gesamt / portionen, 1), kcalPortion: runde(summe.kcal / portionen),
  };
}

/* ---------- Verlauf ---------- */
const TAG_MS = 86400000;
export const tagNr = (datum) => Math.round(Date.parse(datum + 'T12:00:00Z') / TAG_MS);
export const datumAusNr = (n) => new Date(n * TAG_MS).toISOString().slice(0, 10);

/** Gleitender Durchschnitt: für jeden Messtag der Mittelwert aller Messungen der letzten 7 Kalendertage (inkl. heute) */
export function gleitenderSchnitt(punkte, tage = 7) {
  const p = [...punkte].sort((a, b) => a.datum.localeCompare(b.datum));
  return p.map((pt) => {
    const n = tagNr(pt.datum);
    const fenster = p.filter((q) => { const m = tagNr(q.datum); return m <= n && m > n - tage; });
    return { datum: pt.datum, kg: runde(fenster.reduce((s, q) => s + q.kg, 0) / fenster.length, 2) };
  });
}

/** Lineare Regression kg über Tage (Steigung kg/Tag) */
export function trend(punkte) {
  if (punkte.length < 2) return null;
  const xs = punkte.map((p) => tagNr(p.datum));
  const ys = punkte.map((p) => p.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let z = 0, n = 0;
  xs.forEach((x, i) => { z += (x - mx) * (ys[i] - my); n += (x - mx) ** 2; });
  if (!n) return null;
  const steigung = z / n;
  return { steigung, achse: my - steigung * mx };
}

/** Prognose: an welchem Tag wird das Zielgewicht erreicht? Grundlage Trend der letzten 28 Tage */
export function prognose(punkte, zielKg, heute) {
  if (!(zielKg > 0) || punkte.length < 3) return null;
  const ende = tagNr(heute || punkte[punkte.length - 1].datum);
  const auswahl = punkte.filter((p) => tagNr(p.datum) > ende - 28);
  const t = trend(auswahl.length >= 3 ? auswahl : punkte);
  if (!t) return null;
  const aktuell = t.steigung * ende + t.achse;
  const richtung = zielKg - aktuell;
  if (Math.abs(richtung) < 0.05) return { erreicht: true, steigungWoche: runde(t.steigung * 7, 2) };
  if (Math.sign(richtung) !== Math.sign(t.steigung) || Math.abs(t.steigung) < 0.001)
    return { erreicht: false, datum: null, steigungWoche: runde(t.steigung * 7, 2) };
  const tag = Math.ceil((zielKg - t.achse) / t.steigung);
  return { erreicht: false, datum: datumAusNr(tag), tage: tag - ende, steigungWoche: runde(t.steigung * 7, 2), startKg: runde(aktuell, 1) };
}

/** Wochenschnitt (Wochen ab Montag) von Tageswerten {datum, wert} */
export function wochenSchnitt(werte) {
  const wochen = new Map();
  for (const w of werte) {
    const d = new Date(w.datum + 'T12:00:00');
    const montag = new Date(d); montag.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = montag.toISOString().slice(0, 10);
    if (!wochen.has(k)) wochen.set(k, []);
    wochen.get(k).push(w.wert);
  }
  return [...wochen.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([montag, l]) => ({ montag, tage: l.length, schnitt: runde(l.reduce((a, b) => a + b, 0) / l.length) }));
}

/* ---------- Formatierung (deutsch, Tausenderpunkt) ---------- */
export const zahl = (x) => (x == null || isNaN(x) ? '-' : Math.round(x).toLocaleString('de-DE'));
export const dez = (x, n = 1) => (x == null || isNaN(x) ? '-' : Number(x).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: n }));
/** Eingabe mit Komma oder Punkt lesen */
export const lies = (s) => {
  if (s == null) return null;
  const t = String(s).trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  const x = Number(t);
  return isNaN(x) ? null : x;
};
