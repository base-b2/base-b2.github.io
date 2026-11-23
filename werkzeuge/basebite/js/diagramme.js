/* BaseBite | Diagramme als selbst gezeichnetes SVG (keine Bibliothek). Farben kommen über CSS-Klassen aus den Token. */
import { tagNr, dez, zahl } from './rechner.js';

const B = 340, H = 210, L = 40, R = 10, O = 14, U = 28;   // Breite, Höhe, Ränder

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kurzDatum = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;

function achsenWerte(min, max, schritte = 4) {
  const roh = (max - min) / schritte || 1;
  const p = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= roh) || roh;
  const a = Math.floor(min / schritt) * schritt;
  const w = [];
  for (let v = a; v <= max + schritt * 0.001; v += schritt) w.push(Math.round(v * 1000) / 1000);
  if (w[w.length - 1] < max) w.push(w[w.length - 1] + schritt);
  return w;
}

/** Gewichtskurve: Messpunkte, gleitender 7-Tage-Schnitt, optional Ziellinie und Prognose (gestrichelt) */
export function gewichtsDiagramm({ punkte, schnitt, zielKg, prognose, titel }) {
  const alleX = punkte.map((p) => tagNr(p.datum));
  if (prognose) alleX.push(tagNr(prognose.bis.datum));
  const x0 = Math.min(...alleX), x1 = Math.max(...alleX, x0 + 1);
  const ys = punkte.map((p) => p.kg).concat(zielKg ? [zielKg] : []);
  const yw = achsenWerte(Math.min(...ys) - 0.5, Math.max(...ys) + 0.5);
  const y0 = yw[0], y1 = yw[yw.length - 1];
  const sx = (d) => L + ((tagNr(d) - x0) / (x1 - x0)) * (B - L - R);
  const sy = (v) => O + (1 - (v - y0) / (y1 - y0)) * (H - O - U);
  let s = `<svg class="dia" viewBox="0 0 ${B} ${H}" role="img" aria-label="${esc(titel)}">`;
  for (const v of yw) s += `<line class="dia-raster" x1="${L}" x2="${B - R}" y1="${sy(v)}" y2="${sy(v)}"/><text class="dia-achse" x="${L - 6}" y="${sy(v) + 3.5}" text-anchor="end">${dez(v, 1)}</text>`;
  const ticks = [x0, Math.round((x0 + x1) / 2), x1];
  for (const t of ticks) {
    const d = new Date(t * 86400000).toISOString().slice(0, 10);
    s += `<text class="dia-achse" x="${sx(d)}" y="${H - 8}" text-anchor="middle">${kurzDatum(d)}</text>`;
  }
  if (zielKg) s += `<line class="dia-ziel" x1="${L}" x2="${B - R}" y1="${sy(zielKg)}" y2="${sy(zielKg)}"/><text class="dia-achse dia-ziel-text" x="${B - R}" y="${sy(zielKg) - 4}" text-anchor="end">Ziel ${dez(zielKg, 1)}</text>`;
  if (prognose) s += `<line class="dia-prognose" x1="${sx(prognose.von.datum)}" y1="${sy(prognose.von.kg)}" x2="${sx(prognose.bis.datum)}" y2="${sy(prognose.bis.kg)}"/>`;
  for (const p of punkte) s += `<rect class="dia-punkt" x="${sx(p.datum) - 2.5}" y="${sy(p.kg) - 2.5}" width="5" height="5"><title>${kurzDatum(p.datum)}: ${dez(p.kg, 1)} kg</title></rect>`;
  if (schnitt.length > 1) s += `<polyline class="dia-schnitt" points="${schnitt.map((p) => `${sx(p.datum)},${sy(p.kg)}`).join(' ')}"/>`;
  return s + '</svg>';
}

/** Balken mit Ziellinie. werte: [{label, wert, titel}] */
export function balkenDiagramm({ werte, ziel, titel, einheit = 'kcal' }) {
  const max = Math.max(ziel || 0, ...werte.map((w) => w.wert), 1);
  const yw = achsenWerte(0, max * 1.05);
  const y1 = yw[yw.length - 1];
  const sy = (v) => O + (1 - v / y1) * (H - O - U);
  const n = werte.length || 1;
  const spalte = (B - L - R) / n;
  const breite = Math.max(4, Math.min(22, spalte * 0.66));
  let s = `<svg class="dia" viewBox="0 0 ${B} ${H}" role="img" aria-label="${esc(titel)}">`;
  for (const v of yw) s += `<line class="dia-raster" x1="${L}" x2="${B - R}" y1="${sy(v)}" y2="${sy(v)}"/><text class="dia-achse" x="${L - 6}" y="${sy(v) + 3.5}" text-anchor="end">${zahl(v)}</text>`;
  werte.forEach((w, i) => {
    const x = L + i * spalte + (spalte - breite) / 2;
    const ueber = ziel && w.wert > ziel;
    s += `<rect class="dia-balken${ueber ? ' dia-balken-ueber' : ''}" x="${x}" y="${sy(w.wert)}" width="${breite}" height="${Math.max(0, sy(0) - sy(w.wert))}"><title>${esc(w.titel || w.label)}: ${zahl(w.wert)} ${einheit}</title></rect>`;
    if (n <= 8 || i % Math.ceil(n / 7) === 0 || i === n - 1) s += `<text class="dia-achse" x="${x + breite / 2}" y="${H - 8}" text-anchor="middle">${esc(w.label)}</text>`;
  });
  if (ziel) s += `<line class="dia-ziel" x1="${L}" x2="${B - R}" y1="${sy(ziel)}" y2="${sy(ziel)}"/><text class="dia-achse dia-ziel-text" x="${B - R}" y="${sy(ziel) - 4}" text-anchor="end">Ziel ${zahl(ziel)}</text>`;
  return s + '</svg>';
}
