/* BaseBug | Moderne Vektorgrafiken (SVG) für Türme, Ausrüstung und Symbole.
   Spielfarben: bewusst etwas bunter als das Base B Corporate Design (nur innerhalb des Spiels). */
'use strict';
const GP = { tinte: '#1C2E4A', bordeaux: '#6A1B2B', rot: '#E0566B', orange: '#F29E4C', gelb: '#F7C948', gruen: '#3FB984',
  tuerkis: '#2EC4B6', blau: '#4C8DF2', violett: '#8E6CF2', weiss: '#FFFFFF', grau: '#A9AEBB' };
const RAR_FARBE = [GP.grau, GP.blau, GP.violett, GP.orange];
const GEGNER_FARBE = { bug: GP.violett, kaefer: '#2F8F6B', motte: '#6C7A96', wurm: '#D9822B', virus: GP.rot, schild: '#1F9E92', mini: GP.violett,
  ente: GP.gelb, speicherleck: GP.rot, schleife: GP.blau, bluescreen: '#2D63C8', kernel: '#B3364A' };

const T = GP.tinte, sw = 'stroke="' + T + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const basis = (f) => `<circle cx="32" cy="34" r="25" fill="${f}" ${sw}/><circle cx="32" cy="34" r="18" fill="#FFFFFF" fill-opacity=".22"/>`;
const SVG_TEILE = {
  turm_pfeil: basis(GP.blau) + `<path d="M15 26 Q32 6 49 26" fill="none" ${sw} stroke-width="4"/><path d="M32 44 V10" stroke="${GP.rot}" stroke-width="4.5" stroke-linecap="round"/><path d="M25 17 L32 8 L39 17" fill="none" stroke="${GP.rot}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="24" y="36" width="16" height="12" rx="5" fill="#fff" ${sw}/>`,
  turm_kanone: basis(GP.orange) + `<rect x="25" y="7" width="14" height="26" rx="5" fill="${T}"/><rect x="23" y="5" width="18" height="7" rx="3.5" fill="${GP.rot}" ${sw} stroke-width="2.5"/><circle cx="32" cy="39" r="13" fill="${T}"/><circle cx="27.5" cy="34.5" r="4" fill="#fff" fill-opacity=".4"/>`,
  turm_frost: basis(GP.tuerkis) + `<g stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M32 12V56M13 23L51 45M51 23L13 45"/></g><g stroke="${T}" stroke-width="2" stroke-linecap="round" fill="none"><path d="M27 15 L32 19 L37 15M27 53 L32 49 L37 53"/></g><circle cx="32" cy="34" r="7" fill="${GP.blau}" ${sw} stroke-width="2.5"/>`,
  turm_flak: basis(GP.gruen) + `<rect x="18" y="7" width="9" height="27" rx="3.5" fill="${T}"/><rect x="37" y="7" width="9" height="27" rx="3.5" fill="${T}"/><rect x="14" y="30" width="36" height="19" rx="8" fill="${T}"/><circle cx="24" cy="39.5" r="3.5" fill="${GP.gelb}"/><circle cx="40" cy="39.5" r="3.5" fill="${GP.gelb}"/>`,
  turm_blitz: basis(GP.violett) + `<path d="M37 7 L19 37 H31 L26 61 L47 29 H35 Z" fill="${GP.gelb}" ${sw}/>`,
  turm_laser: basis(GP.rot) + `<path d="M32 3V12" stroke="${GP.gelb}" stroke-width="5" stroke-linecap="round"/><path d="M32 10 L47 42 H17 Z" fill="#fff" ${sw}/><circle cx="32" cy="31" r="6" fill="${GP.rot}" ${sw} stroke-width="2.5"/>`,
  turm_mine: basis(GP.gelb) + `<ellipse cx="32" cy="47" rx="17" ry="6" fill="${GP.orange}" ${sw} stroke-width="2.5"/><ellipse cx="32" cy="40" rx="17" ry="6" fill="${GP.gelb}" ${sw} stroke-width="2.5"/><ellipse cx="32" cy="33" rx="17" ry="6" fill="${GP.orange}" ${sw} stroke-width="2.5"/><ellipse cx="32" cy="26" rx="17" ry="6" fill="${GP.gelb}" ${sw} stroke-width="2.5"/><path d="M48 8 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff" ${sw} stroke-width="1.5"/>`,
  item_tastatur: `<rect x="5" y="17" width="54" height="32" rx="8" fill="${T}"/>` +
    [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${10 + i * 7.6}" y="22" width="6" height="6" rx="2" fill="${[GP.rot, GP.orange, GP.gelb, GP.gruen, GP.blau, GP.violett][i]}"/>`).join('') +
    [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${10 + i * 7.6}" y="30" width="6" height="6" rx="2" fill="#fff"/>`).join('') + `<rect x="18" y="39" width="28" height="5" rx="2.5" fill="#fff"/>`,
  item_maus: `<rect x="17" y="6" width="30" height="52" rx="15" fill="#fff" ${sw} stroke-width="3.5"/><path d="M32 6V25M17 25H47" ${sw}/><rect x="29" y="11" width="6" height="10" rx="3" fill="${GP.rot}"/><path d="M24 45 H40" stroke="${GP.tuerkis}" stroke-width="4" stroke-linecap="round"/>`,
  item_kopfhoerer: `<path d="M12 40 V32 a20 20 0 0 1 40 0 V40" fill="none" stroke="${T}" stroke-width="5" stroke-linecap="round"/><rect x="7" y="33" width="15" height="24" rx="7" fill="${GP.violett}" ${sw}/><rect x="42" y="33" width="15" height="24" rx="7" fill="${GP.violett}" ${sw}/><circle cx="14.5" cy="45" r="3" fill="#fff"/><circle cx="49.5" cy="45" r="3" fill="#fff"/>`,
  item_netzteil: `<rect x="24" y="5" width="16" height="9" rx="3" fill="${T}"/><rect x="11" y="11" width="42" height="47" rx="9" fill="${T}"/><rect x="16" y="16" width="32" height="37" rx="6" fill="${GP.gruen}"/><path d="M35 19 L23 37 H31 L28 50 L41 31 H33 Z" fill="${GP.gelb}" ${sw} stroke-width="2.5"/>`,
  sym_gold: `<circle cx="32" cy="32" r="26" fill="${GP.gelb}" ${sw} stroke-width="4"/><circle cx="32" cy="32" r="17" fill="none" stroke="${GP.orange}" stroke-width="4"/><path d="M32 22V42M26 27H36M28 37H38" stroke="${T}" stroke-width="4" stroke-linecap="round"/>`,
  sym_hp: `<path d="M32 56 C10 41 6 30 9 21 C12 11 26 9 32 19 C38 9 52 11 55 21 C58 30 54 41 32 56Z" fill="${GP.rot}" ${sw} stroke-width="4"/><path d="M18 24 C19 19 23 17 26 18" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  sym_bits: `<rect x="9" y="9" width="46" height="46" rx="10" fill="${GP.bordeaux}"/><rect x="17" y="17" width="12" height="12" rx="2" fill="#fff"/><rect x="35" y="25" width="12" height="4" rx="1" fill="${GP.gelb}"/><rect x="17" y="35" width="12" height="12" rx="2" fill="#fff"/><rect x="35" y="35" width="12" height="12" rx="2" fill="#fff"/>`,
  sym_buch: `<path d="M10 12 Q10 8 14 8 H30 V56 H14 Q10 56 10 52Z" fill="${GP.violett}" ${sw}/><path d="M54 12 Q54 8 50 8 H34 V56 H50 Q54 56 54 52Z" fill="${GP.blau}" ${sw}/><path d="M30 8 Q32 6 34 8 V56 Q32 58 30 56Z" fill="${T}"/><path d="M16 18 H24M16 25 H24M40 18 H48M40 25 H48" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
  sym_kaffee: `<path d="M12 22 H44 V44 a12 12 0 0 1 -12 12 H24 a12 12 0 0 1 -12 -12 Z" fill="#fff" ${sw} stroke-width="3.5"/><rect x="16" y="26" width="24" height="7" rx="3" fill="#8A5A3B"/><path d="M44 28 h4 a7 7 0 0 1 0 14 h-4" fill="none" ${sw} stroke-width="3.5"/>`,
};
function svg(key, px) { const t = (SVG_TEILE[key] || '').replace(/<[^>]+>/g, (tag) => tag.replace(/stroke-width="[^"]*"(?=[^>]*stroke-width=)/g, '')); return `<svg viewBox="0 0 64 64" width="${px || 64}" height="${px || 64}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${t}</svg>`; }
/* Bilder für das Canvas (einmal vorbereitet) */
const IMG = {};
for (const k in SVG_TEILE) { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(k, 128)); IMG[k] = i; }
const svgFertig = (k) => IMG[k] && IMG[k].complete && IMG[k].naturalWidth;
