/* BaseBite | Sicherung als JSON und CSV (Dateiname BaseB_Kalorienzaehler_JJJJMMTT.json/.csv) */
import { exportiere, alle, speichereViele, neueId } from './db.js';
import { lies } from './rechner.js';

const MAHLZEIT_CSV = { fruehstueck: 'Frühstück', mittag: 'Mittagessen', abend: 'Abendessen', snacks: 'Snacks' };

export function dateiname(endung, d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `BaseB_Kalorienzaehler_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.${endung}`;
}

const nativ = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

/** Datei speichern: im Browser als Download, in der APK im Ordner Dokumente (mit Teilen-Dialog als Ausweg) */
export async function speichereDatei(name, inhalt, typ) {
  if (nativ() && window.Capacitor.Plugins.Filesystem) {
    const { Filesystem, Share } = window.Capacitor.Plugins;
    try {
      await Filesystem.writeFile({ path: name, data: inhalt, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true });
      return `Gespeichert unter Dokumente/${name}`;
    } catch (e) {
      const r = await Filesystem.writeFile({ path: name, data: inhalt, directory: 'CACHE', encoding: 'utf8' });
      if (Share) await Share.share({ title: name, files: [r.uri] });
      return 'Datei zum Teilen bereitgestellt.';
    }
  }
  const blob = new Blob([inhalt], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return `Download gestartet: ${name}`;
}

export async function exportJson() {
  const s = await exportiere();
  return speichereDatei(dateiname('json'), JSON.stringify(s, null, 1), 'application/json');
}

/* ---------- CSV: Semikolon, Dezimalkomma, UTF-8 mit BOM (öffnet sauber in Excel) ---------- */
const SPALTEN = ['Datum', 'Art', 'Mahlzeit', 'Bezeichnung', 'Marke', 'Menge', 'Einheit', 'kcal', 'Eiweiss_g', 'Fett_g', 'Kohlenhydrate_g', 'Zucker_g', 'Ballaststoffe_g', 'Salz_g'];
const feld = (v) => {
  if (v == null) return '';
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportCsv() {
  const zeilen = [SPALTEN.join(';')];
  const tb = (await alle('tagebuch')).sort((a, b) => a.datum.localeCompare(b.datum) || (a.erstellt || '').localeCompare(b.erstellt || ''));
  for (const e of tb) {
    zeilen.push([e.datum, 'Eintrag', MAHLZEIT_CSV[e.mahlzeit] || e.mahlzeit, e.name, e.marke || '', e.menge, 'g', e.kcal,
      e.eiweiss, e.fett, e.kh, e.zucker, e.ballast, e.salz].map(feld).join(';'));
  }
  for (const g of (await alle('gewicht')).sort((a, b) => a.datum.localeCompare(b.datum))) {
    zeilen.push([g.datum, 'Gewicht', '', 'Körpergewicht', '', g.kg, 'kg', '', '', '', '', '', '', ''].map(feld).join(';'));
  }
  for (const w of (await alle('wasser')).sort((a, b) => a.datum.localeCompare(b.datum))) {
    if (w.glaeser) zeilen.push([w.datum, 'Wasser', '', 'Wasser', '', w.glaeser, 'Glas', '', '', '', '', '', '', ''].map(feld).join(';'));
  }
  return speichereDatei(dateiname('csv'), '﻿' + zeilen.join('\r\n') + '\r\n', 'text/csv;charset=utf-8');
}

function parseCsv(text) {
  const zeilen = [];
  let z = [], f = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c;
    } else if (c === '"') q = true;
    else if (c === ';') { z.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      z.push(f); f = ''; if (z.some((x) => x !== '')) zeilen.push(z); z = [];
    } else f += c;
  }
  z.push(f); if (z.some((x) => x !== '')) zeilen.push(z);
  return zeilen;
}

/** CSV im BaseBite-Format einlesen (ergänzt Einträge, Gewicht und Wasser). Doppelte Tagebuch-Zeilen werden übersprungen. */
export async function importCsv(text) {
  const zeilen = parseCsv(text);
  if (!zeilen.length || zeilen[0][0] !== 'Datum' || zeilen[0][1] !== 'Art') throw new Error('Unbekanntes CSV-Format. Erwartet wird eine CSV aus BaseBite.');
  const rueck = Object.fromEntries(Object.entries(MAHLZEIT_CSV).map(([k, v]) => [v, k]));
  const vorhanden = new Set((await alle('tagebuch')).map((e) => [e.datum, e.mahlzeit, e.name, e.menge, e.kcal].join('|')));
  const eintraege = [], gewicht = [], wasser = [];
  for (const r of zeilen.slice(1)) {
    const [datum, art, mahlzeit, name, marke, menge, , kcal, ew, fe, kh, zu, ba, sa] = r;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) continue;
    if (art === 'Gewicht' && lies(menge) > 0) gewicht.push({ datum, kg: lies(menge) });
    else if (art === 'Wasser') wasser.push({ datum, glaeser: lies(menge) || 0 });
    else if (art === 'Eintrag') {
      const m = lies(menge) || 0, k = lies(kcal) || 0;
      const e = { id: neueId('t'), datum, mahlzeit: rueck[mahlzeit] || 'snacks', name: name || 'Unbenannt', marke, menge: m, kcal: k,
        eiweiss: lies(ew), fett: lies(fe), kh: lies(kh), zucker: lies(zu), ballast: lies(ba), salz: lies(sa), erstellt: new Date().toISOString() };
      // Werte pro 100 g zurückrechnen, damit die Menge später geändert werden kann
      if (m > 0) {
        e.basis = { kcal100: (k / m) * 100 };
        for (const n of ['eiweiss', 'fett', 'kh', 'zucker', 'ballast', 'salz']) e.basis[n] = e[n] == null ? null : (e[n] / m) * 100;
      }
      const sig = [e.datum, e.mahlzeit, e.name, e.menge, e.kcal].join('|');
      if (!vorhanden.has(sig)) { eintraege.push(e); vorhanden.add(sig); }
    }
  }
  await speichereViele('tagebuch', eintraege);
  await speichereViele('gewicht', gewicht);
  await speichereViele('wasser', wasser);
  return { eintraege: eintraege.length, gewicht: gewicht.length, wasser: wasser.length };
}
