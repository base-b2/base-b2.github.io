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
const zufallSet = () => { const k = Object.keys(SETS); return k[Math.random() * k.length | 0]; };
for (const it of SP.items) if (!it.set) it.set = zufallSet();
function speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(SP)); } catch (e) {} }

/* Meldungen, die das Menü anzeigt (Erfolge, Belohnungen) */
const MELDUNGEN = [];
function melde(titel, text) { MELDUNGEN.push({ titel, text }); if (typeof meldungZeigen === 'function') meldungZeigen(); }

/* Statistik und Tagesaufgaben zählen gemeinsam */
function stat(k, n = 1) {
  SP.stat[k] = (SP.stat[k] || 0) + n;
  if (KONTO_EP[k] && n > 0) kontoEP(KONTO_EP[k] * n);
  if (SP.tag) for (const a of SP.tag.aufgaben) if (a.id === k && !a.abgeholt) a.fort = Math.min(a.ziel, a.fort + n);
}
const statWert = (k) => k === 'sterne' ? Object.values(SP.sterne).reduce((a, b) => a + b, 0) : (SP.stat[k] || 0);
function bitsDazu(n) { n = Math.round(n); SP.bits += n; stat('bits_ein', n); }
function bitsWeg(n) { if (SP.bits < n) return false; SP.bits -= n; stat('bits_aus', n); return true; }

/* Ausrüstung */
function neuesItem(r, slot) {
  const slots = Object.keys(SLOTS);
  const it = { id: SP.nid++, slot: slot || slots[Math.random() * slots.length | 0], r, lv: 1, inv: 0, set: zufallSet() };
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
/* Zusatzboni, Sets, Fusion */
const angelegteItems = () => Object.values(SP.angelegt).map(itemById).filter(Boolean);
const nebenBoni = (it) => NEBEN[it.slot].slice(0, it.r);
function aktivesSet() { const l = angelegteItems(); if (l.length < 4) return null; return l.every((i) => i.set === l[0].set) ? l[0].set : null; }
function ausrBoni() { const b = {}, add = (k, w) => { b[k] = (b[k] || 0) + w; };
  for (const it of angelegteItems()) for (const n of nebenBoni(it)) add(n.k, n.w);
  const s = aktivesSet(); if (s) for (const k in SETS[s].boni) add(k, SETS[s].boni[k]);
  return b; }
function bonusText(k, w) { const u = UPGRADES.find((x) => x.id === k);
  return (u ? u.z : k) + ' ' + (u && u.neg ? '-' : '+') + (Math.round(w * 100) / 100).toLocaleString('de-DE') + (u && u.e ? ' ' + u.e : ''); }
function fusionsGruppen() { const m = {};
  for (const it of SP.items) { if (it.r >= 3) continue; const k = it.slot + ':' + it.r; (m[k] = m[k] || []).push(it); }
  return Object.values(m).filter((l) => l.length >= FUSION_ANZAHL); }
function fusioniere(gruppe, bevorzugt) {
  /* Verbraucht die drei schwächsten Teile (bevorzugtes Teil zuerst), Ergebnis: nächste Seltenheit, Stufe 1, 50 % der investierten Bits zurück */
  let l = [...gruppe].sort((a, b) => a.lv - b.lv || a.inv - b.inv);
  if (bevorzugt) l = [bevorzugt, ...l.filter((i) => i !== bevorzugt)];
  l = l.slice(0, FUSION_ANZAHL);
  const zaehl = {}; for (const i of l) zaehl[i.set] = (zaehl[i.set] || 0) + 1;
  const set = Object.keys(zaehl).sort((a, b) => zaehl[b] - zaehl[a])[0];
  const rueck = Math.round(l.reduce((s, i) => s + i.inv, 0) * 0.5);
  const angelegtWar = l.some((i) => SP.angelegt[i.slot] === i.id);
  const ids = new Set(l.map((i) => i.id)); SP.items = SP.items.filter((i) => !ids.has(i.id));
  const neu = neuesItem(l[0].r + 1, l[0].slot); neu.set = set; stat('items', -1); stat('fusionen');
  if (angelegtWar) SP.angelegt[neu.slot] = neu.id;
  if (rueck) bitsDazu(rueck);
  return { neu, rueck };
}
function heldWerte(id = SP.held) {
  const h = HELDEN[id], lv = SP.helden[id] || 1, b = ausrBonus();
  return { lv, atk: h.atk * Math.pow(WACHS.held, lv - 1) * (1 + b.tastatur / 100), rate: h.rate * (1 + b.maus / 100), krit: h.krit };
}
function kampfkraft() {
  const h = heldWerte(), b = ausrBonus();
  return Math.round((h.atk * h.rate * (1 + h.krit) * 10 + FESTUNG_HP + b.netzteil + b.kopfhoerer * 4) * (1 + Object.keys(ausrBoni()).length * 0.03) * (aktivesSet() ? 1.15 : 1));
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
  SP.erfolge[id] = Date.now(); bitsDazu(e.b); kontoEP(25); melde('Erfolg: ' + e.n, e.t + ' | +' + e.b + ' Bits');
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

/* ---------- Spielerstufe ---------- */
function kontoEP(n, still) {
  if (!SP.konto) SP.konto = { st: 1, ep: 0 };
  SP.konto.ep += n;
  while (SP.konto.ep >= kontoZiel(SP.konto.st)) {
    SP.konto.ep -= kontoZiel(SP.konto.st); SP.konto.st++;
    if (still) continue;
    const st = SP.konto.st, b = KONTO[st] || {};
    const txt = [belohne({ bits: kontoBits(st), item: b.item })].concat(kontoText(b, true)).filter(Boolean).join(' | ');
    melde('Spielerstufe ' + st + (rang(st) !== rang(st - 1) ? ' | ' + rang(st) : ''), txt);
    if (st >= 10) erfolg('befoerdert');
  }
}
const rang = (st) => RAENGE.filter(([a]) => st >= a).pop()[1];
function kontoWert(k) { let s = 0; for (const st in KONTO) if (+st <= SP.konto.st && typeof KONTO[st][k] === 'number') s += KONTO[st][k]; return s; }
function turmAb(id) { if (TURM_START.includes(id)) return 1; for (const st in KONTO) if (KONTO[st].turm === id) return +st; return 1; }
const turmFrei = (id) => SP.konto.st >= turmAb(id);
function kontoText(b, ohneItem) { const t = [];
  if (b.turm) t.push('Neuer Turm: ' + TUERME[b.turm].n);
  if (b.startgold) t.push('Start-Gold +' + b.startgold);
  if (b.kaffee) t.push('Kaffee-Vorrat +' + b.kaffee);
  if (b.karten) t.push('4. Karte beim Aufstieg');
  if (b.reroll) t.push('Karten neu ziehen: +1 pro Level');
  if (b.bitsPlus) t.push('Bits aus Leveln +' + b.bitsPlus + ' %');
  if (b.festung) t.push('Festung +' + b.festung + ' % HP');
  if (b.buch) t.push('Zweiter Platz für Skill-Bücher');
  if (b.aufstieg) t.push('Level startet mit einem Aufstieg');
  if (b.item != null && !ohneItem) t.push('Ausrüstung (' + RAR[b.item].n + ')');
  return t; }
/* Bestehende Spielstände: Spielerstufe aus der bisherigen Statistik nachrechnen (ohne Bits nachzuzahlen) */
if (!SP.konto) { SP.konto = { st: 1, ep: 0 }; let ep = 0;
  for (const k in KONTO_EP) ep += (SP.stat[k] || 0) * KONTO_EP[k];
  ep += Object.keys(SP.erfolge).length * 25; kontoEP(ep, true); speichern(); }

/* Skill-Bücher: SP.buchR[id] = Seltenheit (gekauft), SP.buchAn = { off, def } */
if (!SP.buchR) { SP.buchR = {}; for (const id in (SP.buecher || {})) if (BUECHER[id]) SP.buchR[id] = 0; }
if (!SP.buchAn) { SP.buchAn = { off: null, def: null }; for (const id of (SP.buchAktiv || [])) if (BUECHER[id] && !SP.buchAn[BUECHER[id].art]) SP.buchAn[BUECHER[id].art] = id; }
const buchFrei = (id) => !BUECHER[id].turm || turmFrei(BUECHER[id].turm);
const buchAufKosten = (id) => Math.round(BUECHER[id].preis * BUCH_AUF[SP.buchR[id]]);
