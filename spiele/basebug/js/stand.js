/* BaseBug | Speicherstand, Ausrüstung, Aufgaben, Meilensteine, Erfolge. Alles nur im localStorage dieses Geräts. */
'use strict';
const SPEICHER = 'basebug.stand';
function leererStand() {
  return {
    v: 1, bits: 0, frei: 1, sterne: {}, herausf: {}, garantie: {},
    helden: { bit: 1 }, held: 'bit',
    items: [], angelegt: { tastatur: null, maus: null, kopfhoerer: null, netzteil: null }, nid: 1,
    stat: {}, gesehen: { gegner: {}, tuerme: {} },
    meil: {}, erfolge: {}, tag: null,
    opt: { ton: true, vib: true, tempo: 1 },
  };
}
let SP = leererStand();
try { const s = JSON.parse(localStorage.getItem(SPEICHER)); if (s && s.v === 1) SP = Object.assign(leererStand(), s); } catch (e) {}
function speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(SP)); } catch (e) {} }

/* Meldungen, die das Menü anzeigt (Erfolge, Belohnungen) */
const MELDUNGEN = [];
function melde(titel, text) { MELDUNGEN.push({ titel, text }); if (typeof meldungZeigen === 'function') meldungZeigen(); }

/* Statistik und Tagesaufgaben zählen gemeinsam */
function stat(k, n = 1) {
  SP.stat[k] = (SP.stat[k] || 0) + n;
  if (SP.tag) for (const a of SP.tag.aufgaben) if (a.id === k && !a.abgeholt) a.fort = Math.min(a.ziel, a.fort + n);
}
const statWert = (k) => k === 'sterne' ? Object.values(SP.sterne).reduce((a, b) => a + b, 0) : (SP.stat[k] || 0);
function bitsDazu(n) { n = Math.round(n); SP.bits += n; stat('bits_ein', n); }
function bitsWeg(n) { if (SP.bits < n) return false; SP.bits -= n; stat('bits_aus', n); return true; }

/* Ausrüstung */
function neuesItem(r, slot) {
  const slots = Object.keys(SLOTS);
  const it = { id: SP.nid++, slot: slot || slots[Math.random() * slots.length | 0], r, lv: 1, inv: 0 };
  SP.items.push(it); stat('items');
  if (r === 3) erfolg('legendaer');
  return it;
}
function rollRar(bonus) { const x = Math.random();
  if (x < 0.01 + bonus * 0.04) return 3; if (x < 0.07 + bonus * 0.12) return 2; if (x < 0.32 + bonus * 0.25) return 1; return 0; }
const itemName = (it) => SLOTS[it.slot].namen[it.r];
const itemWert = (it) => Math.round(SLOTS[it.slot].basis * RAR[it.r].m * (1 + WACHS.item * (it.lv - 1)) * 10) / 10;
const itemKosten = (it) => Math.round(15 * (it.r + 1) * Math.pow(1.18, it.lv - 1));
const itemZerlegen = (it) => Math.round(8 * (it.r + 1) * (it.r + 1) + it.inv * 0.5);
const itemById = (id) => SP.items.find((i) => i.id === id);
function ausrBonus() {
  const b = { tastatur: 0, maus: 0, kopfhoerer: 0, netzteil: 0 };
  for (const s in SP.angelegt) { const it = itemById(SP.angelegt[s]); if (it) b[s] = itemWert(it); }
  return b;
}
function heldWerte(id = SP.held) {
  const h = HELDEN[id], lv = SP.helden[id] || 1, b = ausrBonus();
  return { lv, atk: h.atk * Math.pow(WACHS.held, lv - 1) * (1 + b.tastatur / 100), rate: h.rate * (1 + b.maus / 100), krit: h.krit };
}
function kampfkraft() {
  const h = heldWerte(), b = ausrBonus();
  return Math.round(h.atk * h.rate * (1 + h.krit) * 10 + 100 + b.netzteil + b.kopfhoerer * 4);
}

/* Belohnungen vergeben: { bits, item: Seltenheit } -> Text */
function belohne(bel) {
  const t = [];
  if (bel.bits) { bitsDazu(bel.bits); t.push('+' + bel.bits + ' Bits'); }
  if (bel.item != null) { const it = neuesItem(bel.item); t.push(RAR[it.r].n + ': ' + itemName(it)); }
  return t.join(' | ');
}
const belohnungText = (bel) => [bel.bits ? bel.bits + ' Bits' : '', bel.item != null ? 'Ausrüstung (' + RAR[bel.item].n + ')' : ''].filter(Boolean).join(' + ');

/* Erfolge */
function erfolg(id) {
  if (SP.erfolge[id]) return;
  const e = ERFOLGE.find((x) => x.id === id); if (!e) return;
  SP.erfolge[id] = Date.now(); bitsDazu(e.b); melde('Erfolg: ' + e.n, e.t + ' | +' + e.b + ' Bits');
}
/* Meilensteine: nächste offene Stufe */
function meilStufe(m) { return SP.meil[m.id] || 0; }
function meilAbholbar(m) { const s = meilStufe(m); return s < m.s.length && statWert(m.id) >= m.s[s][0]; }

/* Tagesaufgaben: drei pro Tag, aus dem Datum ausgewählt */
function heute() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function tagPruefen() {
  const h = heute(); if (SP.tag && SP.tag.datum === h) return;
  let s = 0; for (const c of h) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const zufall = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
  const pool = [...AUFGABEN], wahl = [];
  while (wahl.length < 3) wahl.push(pool.splice(zufall() * pool.length | 0, 1)[0]);
  SP.tag = { datum: h, bonus: false, aufgaben: wahl.map((a) => {
    const z = Math.round(a.z[0] + (a.z[1] - a.z[0]) * zufall());
    return { id: a.id, t: a.t.replace('{z}', z), ziel: z, fort: 0, b: a.b, abgeholt: false }; }) };
  speichern();
}
function offeneBelohnungen() {
  tagPruefen(); let n = 0;
  for (const a of SP.tag.aufgaben) if (a.fort >= a.ziel && !a.abgeholt) n++;
  if (!SP.tag.bonus && SP.tag.aufgaben.every((a) => a.abgeholt)) n++;
  for (const m of MEILEN) if (meilAbholbar(m)) n++;
  return n;
}
