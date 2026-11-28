/* BaseBug | Menü: Ausrüstung, Helden, Spielen, Aufgaben, Archiv, Einstellungen. */
'use strict';
let gewLv = Math.min(SP.frei, MAXLV), tab = 'spielen', unter = { aufgaben: 'taeglich', archiv: 'helden' }, zeigeHeld = null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const zahl = (n) => Math.round(n).toLocaleString('de-DE');
const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('de-DE');

/* Canvas mit data-b="held:bit" / "turm:pfeil" / "gegner:bug" / "item:maus" bemalen */
function malen(root) {
  for (const c of root.querySelectorAll('canvas[data-b]')) {
    const [art, id] = c.dataset.b.split(':'), x = c.getContext('2d'), s = c.width; x.clearRect(0, 0, s, s);
    if (art === 'held') bild(x, HELDEN[id].bild, 0, 0, s);
    if (art === 'turm') zeichneTurm(x, id, s / 2, s / 2, s * 0.95, 0);
    if (art === 'gegner') bild(x, GEGNER[id].bild, s * 0.1, s * 0.1, s * 0.8);
    if (art === 'item') bild(x, SLOTS[id].bild, s * 0.15, s * 0.15, s * 0.7);
  }
}
const cvs = (b, px, gesperrt) => `<canvas data-b="${b}" width="${px * 2}" height="${px * 2}" style="width:${px}px;height:${px}px" class="${gesperrt ? 'blur' : ''}"></canvas>`;
const sterneHtml = (st) => [1, 2, 3].map((i) => `<span class="${i <= st ? 'an' : 'aus'}">■</span>`).join('');
const balken = (a, z) => `<div class="balken"><i style="width:${Math.min(100, a / z * 100)}%"></i></div>`;
const seg = (id, opts) => `<div class="segment" role="tablist">${opts.map(([k, n]) => `<button role="tab" data-seg="${id}:${k}" aria-selected="${unter[id] === k}">${n}</button>`).join('')}</div>`;

function menueZeigen() {
  tagPruefen(); erfolgePruefen();
  $('menue').hidden = false; $('spiel').hidden = true;
  if (!bitsAnim) { $('m-bits').textContent = zahl(SP.bits); bitsAnz = SP.bits; }
  for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-selected', b.dataset.tab === tab);
  const n = offeneBelohnungen(); $('punkt-aufgaben').hidden = !n;
  const inh = $('inhalt'); inh.innerHTML = ({ spielen: tabSpielen, helden: tabHelden, ausruestung: tabAusruestung, aufgaben: tabAufgaben, archiv: tabArchiv })[tab]();
  malen(inh);
  for (const b of inh.querySelectorAll('[data-seg]')) b.onclick = () => { const [i, k] = b.dataset.seg.split(':'); unter[i] = k; ton('klick'); menueZeigen(); };
  for (const b of inh.querySelectorAll('[data-akt]')) b.onclick = () => { ton('klick'); AKTION[b.dataset.akt](b.dataset.wert, b); };
  speichern();
}
function erfolgePruefen() {
  if (Object.keys(HELDEN).every((h) => SP.helden[h])) erfolg('alleh');
  if (Object.values(SP.angelegt).every((v) => v != null && itemById(v))) erfolg('voll');
}

/* ---------- Spielen ---------- */
function tabSpielen() {
  const ki = Math.min(2, Math.floor((gewLv - 1) / 10)), k = KAPITEL[ki], st = SP.sterne[gewLv] || 0, erst = !SP.sterne[gewLv];
  const garant = gewLv % 5 === 0 && !SP.garantie[gewLv];
  const offen = offeneBelohnungen();
  let h = (offen ? `<button class="abhol-banner" data-akt="zuaufgaben">${IK.geschenk}Belohnungen abholbereit<span>${offen}</span></button>` : '') + `<div class="etikett">KAPITEL ${ki + 1}</div><h2>${k.n}</h2>
  <div class="buehnen-karte ${k.k}">
   <canvas id="vorschau" width="160" height="160" style="width:120px;height:120px"></canvas>
   <div class="levelwahl">
    <button class="ikon" data-akt="lvzur" aria-label="Level zurück" ${gewLv <= 1 ? 'disabled' : ''}>${IK.links}</button>
    <div><div class="etikett">LEVEL</div><div class="levelnr">${gewLv}</div><div class="sterne">${sterneHtml(st)}</div></div>
    <button class="ikon" data-akt="lvvor" aria-label="Level weiter" ${gewLv >= Math.min(SP.frei, MAXLV) ? 'disabled' : ''}>${IK.rechts}</button>
   </div>
   <div class="etikett">10 WELLEN | BOSS BEI WELLE 5 UND 10</div>
   <div class="belohnung-zeile">${erst ? 'Erstbelohnung' : 'Belohnung'}: ca. ${Math.round((25 + gewLv * 6 + 20) * (erst ? 1 : 0.35))} Bits${garant ? ' + garantiert Ausrüstung (' + RAR[gewLv >= 25 ? 3 : gewLv >= 15 ? 2 : 1].n + ')' : ''}</div>
  </div>
  <button class="knopf" data-akt="spielen">Spielen</button>
  <div class="etikett" style="margin-top:24px">HÄRTETESTS | 20 WELLEN, 4 BOSSE</div><div class="liste">`;
  const kk = kampfkraft();
  for (let i = 0; i < 3; i++) {
    const frei = SP.frei > (i + 1) * 10 || SP.sterne[(i + 1) * 10], done = SP.herausf[i];
    h += `<div class="zeile ${frei ? '' : 'gesperrt-zeile'}"><div style="flex:1"><b>Härtetest ${i + 1}: ${KAPITEL[i].n}</b>
     <p>${frei ? `Empfohlene Kampfkraft ${zahl(HAERTE.empfohlen[i])} | deine: ${zahl(kk)}` : `Ab Level ${(i + 1) * 10} geschafft`}</p>
     <p>${done ? 'Geschafft ✓ | Wiederholung: ' + 120 * (i + 1) + ' Bits + Ausrüstung' : 'Belohnung: ' + 400 * (i + 1) + ' Bits + ' + (i >= 1 ? 'legendäre' : 'epische') + ' Ausrüstung'}</p></div>
     <button class="knopf-klein" data-akt="haerte" data-wert="${i}" ${frei ? '' : 'disabled'}>${frei ? 'Start' : IK.schloss}</button></div>`;
  }
  return h + '</div>';
}
let vt = 0;
function vorschau() { const c = $('vorschau'); if (!c) return; const x = c.getContext('2d'); x.clearRect(0, 0, 160, 160); bild(x, HELDEN[SP.held].bild, 16, 12 + (reduziert ? 0 : Math.sin(vt * 3) * 3), 128, !reduziert && vt % 1 > 0.6); }

/* ---------- Helden ---------- */
function tabHelden() {
  const id = zeigeHeld || SP.held, h = HELDEN[id], lv = SP.helden[id], w = heldWerte(id);
  let s = `<div class="etikett">HELDEN</div><h2>Wer sitzt im PC?</h2><div class="helden">`;
  for (const k in HELDEN) { const x = HELDEN[k], hat = SP.helden[k];
    s += `<button class="held ${hat ? '' : 'gesperrt'}" data-akt="heldzeig" data-wert="${k}" aria-pressed="${id === k}">${cvs('held:' + k, 56)}<b>${x.n}</b><span>${hat ? 'Stufe ' + hat + (SP.held === k ? ' | aktiv' : '') : x.preis + ' Bits'}</span></button>`; }
  s += `</div><div class="detail"><div class="etikett">${lv ? 'STUFE ' + lv + ' / ' + HELD_MAX : 'GESPERRT'}</div><h2 style="margin:4px 0">${h.n}</h2><p>${h.info}</p>
  <table class="werte"><tr><th>Atk.</th><td>${fmt(w.atk)}${lv && lv < HELD_MAX ? ' <span class="plus">-> ' + fmt(w.atk * WACHS.held) + '</span>' : ''}</td></tr>
  <tr><th>Feuerrate</th><td>${fmt(w.rate, 2)}/s</td></tr><tr><th>Krit.</th><td>${Math.round(w.krit * 100)} % (doppelter Schaden)</td></tr>
  <tr><th>Angriff</th><td>${h.artT}</td></tr><tr><th>${h.f.n}</th><td>${h.f.t} Abklingzeit ${h.f.cd} s.</td></tr></table>`;
  if (!lv) s += `<button class="knopf" data-akt="heldkauf" data-wert="${id}" ${SP.bits < h.preis ? 'disabled' : ''}>Freischalten | ${h.preis} Bits</button>`;
  else { if (SP.held !== id) s += `<button class="knopf" data-akt="heldwahl" data-wert="${id}">Einsetzen</button>`;
    if (lv < HELD_MAX) s += `<button class="knopf2" data-akt="heldauf" data-wert="${id}" ${SP.bits < heldKosten(lv) ? 'disabled' : ''}>Verbessern | ${heldKosten(lv)} Bits</button>`;
    else s += '<p>Höchste Stufe erreicht.</p>'; }
  return s + '</div>';
}

/* ---------- Ausrüstung ---------- */
function tabAusruestung() {
  const b = ausrBonus();
  let s = `<div class="etikett">AUSRÜSTUNG</div><h2>Kampfkraft ${zahl(kampfkraft())}</h2><div class="ausr">`;
  const slotKnopf = (sl) => { const it = itemById(SP.angelegt[sl]);
    return `<button class="slot ${it ? 'r' + it.r : ''}" data-akt="${it ? 'item' : 'slotleer'}" data-wert="${it ? it.id : sl}">${cvs('item:' + sl, 40, !it)}<span>${it ? 'St. ' + it.lv : SLOTS[sl].n}</span></button>`; };
  s += `<div class="ausr-spalte">${slotKnopf('tastatur')}${slotKnopf('maus')}</div>${cvs('held:' + SP.held, 110)}<div class="ausr-spalte">${slotKnopf('kopfhoerer')}${slotKnopf('netzteil')}</div></div>
  <table class="werte">${Object.keys(SLOTS).map((sl) => `<tr><th>${SLOTS[sl].stat}</th><td>+${fmt(b[sl])}${SLOTS[sl].einh ? ' ' + SLOTS[sl].einh : ''}</td></tr>`).join('')}</table>
  <div class="etikett" style="margin-top:16px">INVENTAR | ${SP.items.length} TEILE</div>`;
  if (!SP.items.length) return s + '<p class="leer">Noch leer. Bosse, Gummienten und jedes fünfte Level lassen Ausrüstung fallen.</p>';
  const angelegt = new Set(Object.values(SP.angelegt));
  s += '<div class="inventar">';
  for (const it of [...SP.items].sort((a, c) => c.r - a.r || c.lv - a.lv))
    s += `<button class="item r${it.r}" data-akt="item" data-wert="${it.id}" aria-label="${esc(itemName(it))}">${cvs('item:' + it.slot, 36)}<span>St. ${it.lv}</span>${angelegt.has(it.id) ? '<i class="an-mark">✓</i>' : ''}</button>`;
  return s + '</div>';
}
function itemZeigen(id) {
  const it = itemById(id); if (!it) return; const sl = SLOTS[it.slot], an = SP.angelegt[it.slot] === it.id, k = itemKosten(it), max = RAR[it.r].max;
  const nachher = it.lv < max ? Math.round(sl.basis * RAR[it.r].m * (1 + WACHS.item * it.lv) * 10) / 10 : null;
  $('ov-item-inhalt').innerHTML = `<div class="item-gross r${it.r}">${cvs('item:' + it.slot, 72)}</div>
   <div class="etikett">${RAR[it.r].n.toUpperCase()} | ${sl.n.toUpperCase()}</div><h2>${esc(itemName(it))}</h2>
   <table class="werte"><tr><th>${sl.stat}</th><td>+${fmt(itemWert(it))}${sl.einh ? ' ' + sl.einh : ''}${nachher ? ' <span class="plus">-> ' + fmt(nachher) + '</span>' : ''}</td></tr>
   <tr><th>Stufe</th><td>${it.lv} / ${max}</td></tr></table>
   <button class="knopf" data-iakt="${an ? 'ab' : 'an'}">${an ? 'Ablegen' : 'Anlegen'}</button>
   <button class="knopf2" data-iakt="auf" ${it.lv >= max || SP.bits < k ? 'disabled' : ''}>${it.lv >= max ? 'Höchste Stufe' : 'Verbessern | ' + k + ' Bits'}</button>
   <button class="knopf2" data-iakt="zerlegen">Zerlegen | +${itemZerlegen(it)} Bits</button>
   <button class="knopf2" data-iakt="zu">Schließen</button>`;
  malen($('ov-item-inhalt'));
  for (const b of $('ov-item-inhalt').querySelectorAll('[data-iakt]')) b.onclick = () => {
    const a = b.dataset.iakt; ton('klick');
    if (a === 'an') SP.angelegt[it.slot] = it.id;
    if (a === 'ab') SP.angelegt[it.slot] = null;
    if (a === 'auf') { if (!bitsWeg(k)) return; it.inv += k; it.lv++; stat('itemauf'); ton('bau'); itemZeigen(id); menueZeigen(); return; }
    if (a === 'zerlegen') { if (b.dataset.sicher !== '1') { b.dataset.sicher = '1'; b.textContent = 'Wirklich zerlegen?'; return; }
      bitsDazu(itemZerlegen(it)); stat('zerlegt'); if (an) SP.angelegt[it.slot] = null; SP.items = SP.items.filter((x) => x.id !== it.id); ton('muenze'); }
    $('ov-item').hidden = true; menueZeigen(); };
  $('ov-item').hidden = false;
}

/* ---------- Aufgaben ---------- */
function tabAufgaben() {
  const ab = abholListe();
  let s = `<div class="etikett">AUFGABEN</div><h2>Zu tun</h2>`;
  if (ab.length) s += `<div class="abholen-box"><div class="etikett" style="color:var(--bb-text)">ABHOLBEREIT | ${ab.length}</div><div class="liste" style="margin-top:8px">` +
    ab.map((a) => `<div class="zeile"><div style="flex:1"><b>${a.n}</b><p>${a.bel}</p></div><button class="knopf-klein" data-akt="abholen" data-wert="${a.key}">Abholen</button></div>`).join('') +
    `</div>${ab.length > 1 ? '<button class="knopf" data-akt="alleab" style="margin-top:12px;height:48px;font-size:16px">Alle abholen</button>' : ''}</div>`;
  s += seg('aufgaben', [['taeglich', 'Täglich'], ['meilen', 'Meilensteine'], ['erfolge', 'Erfolge']]);
  if (unter.aufgaben === 'taeglich') {
    s += '<div class="liste">';
    for (const [i, a] of SP.tag.aufgaben.entries()) { const fertig = a.fort >= a.ziel;
      s += `<div class="zeile"><div style="flex:1"><b>${a.t}</b>${balken(a.fort, a.ziel)}<p>${zahl(a.fort)} / ${zahl(a.ziel)} | ${a.b} Bits</p></div>
      ${a.abgeholt ? '<span class="ok">✓</span>' : `<button class="knopf-klein" data-akt="tagab" data-wert="${i}" ${fertig ? '' : 'disabled'}>Abholen</button>`}</div>`; }
    const alle = SP.tag.aufgaben.every((a) => a.abgeholt);
    s += `<div class="zeile k2"><div style="flex:1"><b>Alle drei erledigt</b><p>Bonus: 50 Bits + Ausrüstung (Selten)</p></div>
     ${SP.tag.bonus ? '<span class="ok">✓</span>' : `<button class="knopf-klein" data-akt="tagbonus" ${alle ? '' : 'disabled'}>Abholen</button>`}</div></div>
     <p class="leer">Neue Aufgaben gibt es jeden Tag ab Mitternacht.</p>`;
  }
  if (unter.aufgaben === 'meilen') {
    s += '<div class="liste">';
    for (const m of MEILEN) { const st = meilStufe(m), w = statWert(m.id), fertig = st >= m.s.length, ziel = fertig ? m.s[m.s.length - 1][0] : m.s[st][0];
      s += `<div class="zeile"><div style="flex:1"><b>${m.n}</b> <span class="etikett">STUFE ${Math.min(st + 1, m.s.length)} / ${m.s.length}</span>
       <p>${m.t}: ${zahl(w)} / ${zahl(ziel)}</p>${balken(w, ziel)}
       <div class="stufen">${m.s.map(([z, bel], i) => `<span class="stufe ${i < st ? 'erledigt' : ''}">${zahl(z)}: ${belohnungText(bel)}${i < st ? ' ✓' : ''}</span>`).join('')}</div></div>
       ${fertig ? '<span class="ok">✓</span>' : `<button class="knopf-klein" data-akt="meil" data-wert="${m.id}" ${meilAbholbar(m) ? '' : 'disabled'}>Abholen</button>`}</div>`; }
    s += '</div>';
  }
  if (unter.aufgaben === 'erfolge') {
    const n = ERFOLGE.filter((e) => SP.erfolge[e.id]).length;
    s += `<p class="leer">${n} von ${ERFOLGE.length} freigeschaltet.</p><div class="liste">`;
    for (const e of ERFOLGE) { const ok = SP.erfolge[e.id];
      s += `<div class="zeile ${ok ? 'k1' : 'gesperrt-zeile'}"><span class="orden">${ok ? '✓' : IK.schloss}</span><div style="flex:1"><b>${e.n}</b><p>${e.t}</p></div><span class="etikett">${e.b} BITS</span></div>`; }
    s += '</div>';
  }
  return s;
}

/* ---------- Archiv: Enzyklopädie und Statistik ---------- */
function tabArchiv() {
  let s = `<div class="etikett">ARCHIV</div><h2>Enzyklopädie</h2>` + seg('archiv', [['helden', 'Helden'], ['tuerme', 'Türme'], ['gegner', 'Gegner'], ['statistik', 'Statistik']]);
  const eintrag = (b, gesperrt, name, tag, info, werte) => `<div class="eintrag">${cvs(b, 56, gesperrt)}<div style="flex:1"><b>${gesperrt ? '???' : name}</b> <span class="etikett">${tag}</span>
   ${gesperrt ? '<p>' + info + '</p>' : `<p>${info}</p><table class="werte klein">${werte.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>`}</div></div>`;
  if (unter.archiv === 'helden') for (const k in HELDEN) { const h = HELDEN[k];
    s += eintrag('held:' + k, !SP.helden[k], h.n, 'HELD', SP.helden[k] ? h.info : 'Noch nicht freigeschaltet.',
      [['Atk.', fmt(h.atk) + ' (+10 % je Stufe)'], ['Feuerrate', fmt(h.rate, 2) + '/s'], ['Krit.', Math.round(h.krit * 100) + ' %'], ['Angriff', h.artT], [h.f.n, h.f.t + ' (' + h.f.cd + ' s)'], ['Freischalten', h.preis ? h.preis + ' Bits' : 'von Anfang an']]); }
  if (unter.archiv === 'tuerme') for (const k in TUERME) { const t = TUERME[k], ges = !SP.gesehen.tuerme[k];
    s += eintrag('turm:' + k, ges, t.n, 'TURM', ges ? 'Noch nie gebaut.' : t.info,
      k === 'mine' ? [['Kosten', t.k + ' Gold'], ['Ertrag', t.gold + ' Gold je Welle (+60 % je Stufe)'], ['Stufe 4', t.spez]]
        : [['Atk.', t.atk + (k === 'laser' ? '/s' : '') + ' (+35 % je Stufe)'], ['Feuerrate', k === 'laser' ? 'Dauerstrahl' : fmt(t.rate, 2) + '/s'], ['Reichweite', fmt(t.rw)], ['Kosten', t.k + ' Gold'],
          ['Ziele', t.ziele.map((z) => z === 'luft' ? 'Luft' : 'Boden').join(' und ')], ['Stufe 4', t.spez]]); }
  if (unter.archiv === 'gegner') { const artN = { boden: 'BODEN', luft: 'LUFT', tunnel: 'UNTERGRUND', spezial: 'SPEZIAL', boss: 'BOSS', ei: 'EASTER EGG' };
    for (const k in GEGNER) { const e = GEGNER[k], ges = !SP.gesehen.gegner[k];
      s += eintrag('gegner:' + k, ges, e.n, ges ? '' : (e.boss ? 'BOSS | ' : '') + artN[e.art], ges ? 'Noch nicht besiegt.' : e.info,
        [['HP', e.hp], ['Atk.', e.atk + ' je Biss'], ['Tempo', fmt(e.v, 2)], ['Fähigkeit', e.faeh], ['Ab Level', e.ab > 30 ? 'Härtetest' : e.ab], ['Wachstum', '+9 % HP je Level, +7 % je Welle']]); } }
  if (unter.archiv === 'statistik') {
    const zeit = SP.stat.zeit || 0, extra = [['Sterne', statWert('sterne') + ' / ' + MAXLV * 3], ['Höchstes Level', Math.min(SP.frei, MAXLV)],
      ['Helden freigeschaltet', Object.keys(SP.helden).length + ' / ' + Object.keys(HELDEN).length], ['Kampfkraft', zahl(kampfkraft())],
      ['Erfolge', Object.keys(SP.erfolge).length + ' / ' + ERFOLGE.length], ['Gegner entdeckt', Object.keys(SP.gesehen.gegner).length + ' / ' + Object.keys(GEGNER).length]];
    s += '<table class="werte statistik">' + extra.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('') +
      STATS.map(([k, n]) => `<tr><th>${n}</th><td>${k === 'zeit' ? Math.floor(zeit / 3600) + ' h ' + Math.floor(zeit % 3600 / 60) + ' min' : zahl(SP.stat[k] || 0)}</td></tr>`).join('') + '</table>';
  }
  return s;
}

/* ---------- Aktionen ---------- */
const AKTION = {
  lvzur: () => { if (gewLv > 1) { gewLv--; menueZeigen(); } },
  lvvor: () => { if (gewLv < Math.min(SP.frei, MAXLV)) { gewLv++; menueZeigen(); } },
  spielen: () => starteLevel(levelInfo(gewLv)),
  haerte: (i) => starteLevel(levelInfo(null, +i)),
  heldzeig: (k) => { zeigeHeld = k; menueZeigen(); },
  heldwahl: (k) => { SP.held = k; menueZeigen(); },
  heldkauf: (k) => { if (!bitsWeg(HELDEN[k].preis)) return; SP.helden[k] = 1; SP.held = k; ton('drop'); melde('Neuer Held', HELDEN[k].n + ' ist jetzt im Team.'); menueZeigen(); },
  heldauf: (k) => { const lv = SP.helden[k]; if (lv >= HELD_MAX || !bitsWeg(heldKosten(lv))) return; SP.helden[k] = lv + 1; ton('bau'); menueZeigen(); },
  item: (id) => itemZeigen(+id),
  slotleer: (sl) => { const best = SP.items.filter((i) => i.slot === sl).sort((a, b) => itemWert(b) - itemWert(a))[0];
    if (best) { SP.angelegt[sl] = best.id; menueZeigen(); } else melde('Kein Teil', 'Für ' + SLOTS[sl].n + ' hast du noch nichts gefunden.'); },
  zuaufgaben: () => { tab = 'aufgaben'; menueZeigen(); },
  abholen: (key, btn) => abholen(key, btn),
  alleab: (_, btn) => { const r = btn.getBoundingClientRect(); let bits = 0, items = 0;
    for (const a of abholListe()) { const e = abholen(a.key, null, true); bits += e.bits; items += e.items; }
    flieg(r, bits, items); menueZeigen(); },
  tagab: (i, btn) => abholen('tag:' + i, btn),
  tagbonus: (_, btn) => abholen('bonus', btn),
  meil: (id, btn) => abholen('meil:' + id, btn),
};
for (const b of document.querySelectorAll('.tabs button')) b.onclick = () => { tab = b.dataset.tab; zeigeHeld = null; ton('klick'); menueZeigen(); $('inhalt').scrollTop = 0; };

/* ---------- Abholen mit Flug-Animation ---------- */
function abholListe() {
  tagPruefen(); const l = [];
  SP.tag.aufgaben.forEach((a, i) => { if (a.fort >= a.ziel && !a.abgeholt) l.push({ key: 'tag:' + i, n: 'Tagesaufgabe: ' + a.t, bel: a.b + ' Bits' }); });
  if (!SP.tag.bonus && SP.tag.aufgaben.every((a) => a.abgeholt)) l.push({ key: 'bonus', n: 'Tagesbonus: alle drei erledigt', bel: '50 Bits + Ausrüstung (Selten)' });
  for (const m of MEILEN) if (meilAbholbar(m)) { const [z, bel] = m.s[meilStufe(m)]; l.push({ key: 'meil:' + m.id, n: m.n + ': ' + zahl(z) + ' ' + m.t, bel: belohnungText(bel) }); }
  return l;
}
function abholen(key, btn, still) {
  const r = btn ? btn.getBoundingClientRect() : null, vorher = SP.bits, itemsVor = SP.items.length; let text = '';
  const [art, w] = key.split(':');
  if (art === 'tag') { const a = SP.tag.aufgaben[+w]; if (a.abgeholt || a.fort < a.ziel) return { bits: 0, items: 0 }; a.abgeholt = true; bitsDazu(a.b); stat('aufgaben'); }
  if (art === 'bonus') { if (SP.tag.bonus || !SP.tag.aufgaben.every((a) => a.abgeholt)) return { bits: 0, items: 0 }; SP.tag.bonus = true; text = belohne({ bits: 50, item: 1 }); }
  if (art === 'meil') { const m = MEILEN.find((x) => x.id === w); if (!meilAbholbar(m)) return { bits: 0, items: 0 }; const bel = m.s[meilStufe(m)][1]; SP.meil[w] = meilStufe(m) + 1; text = belohne(bel); }
  const e = { bits: SP.bits - vorher, items: SP.items.length - itemsVor };
  if (!still) { ton(e.items ? 'drop' : 'muenze'); flieg(r, e.bits, e.items); menueZeigen(); if (e.items) melde('Neue Ausrüstung', text); }
  return e;
}
let bitsAnz = SP.bits, bitsAnim = false;
function bitsZaehlen() {
  const start = bitsAnz, ziel = SP.bits, t0 = performance.now(); bitsAnim = true; const p = document.querySelector('#menue .pille');
  p.classList.remove('puls'); void p.offsetWidth; p.classList.add('puls');
  const schritt = (n) => { const k = Math.min(1, (n - t0) / 500); bitsAnz = Math.round(start + (ziel - start) * k); $('m-bits').textContent = zahl(bitsAnz);
    if (k < 1) requestAnimationFrame(schritt); else bitsAnim = false; };
  requestAnimationFrame(schritt);
}
function flieg(von, bits, items) {
  if (!bits && !items) return;
  if (reduziert || !von) { bitsAnim = false; bitsZaehlen(); return; }
  bitsAnim = true; $('m-bits').textContent = zahl(bitsAnz);
  const cx = von.left + von.width / 2, cy = von.top + von.height / 2;
  const flug = (cls, zielEl, i, fertig) => { const z = zielEl.getBoundingClientRect(), d = document.createElement('div'); d.className = 'flug ' + cls;
    const gr = cls ? 36 : 12; d.style.left = cx - gr / 2 + 'px'; d.style.top = cy - gr / 2 + 'px'; document.body.appendChild(d);
    const dx = z.left + z.width / 2 - cx, dy = z.top + z.height / 2 - cy, sx = (Math.random() - 0.5) * 90, sy = -30 - Math.random() * 70;
    d.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: `translate(${sx}px,${sy}px) scale(1.2)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${dx}px,${dy}px) scale(.5)`, opacity: 0.8 }], { duration: 800, delay: i * 55, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' })
      .onfinish = () => { d.remove(); if (fertig) fertig(); }; };
  const n = bits ? Math.min(12, Math.max(4, Math.round(bits / 12))) : 0;
  for (let i = 0; i < n; i++) flug('', $('m-bits'), i, i === n - 1 ? () => bitsZaehlen() : null);
  if (!n) bitsAnim = false;
  for (let i = 0; i < Math.min(items, 3); i++) flug('item', document.querySelector('.tabs [data-tab="ausruestung"]'), n + i * 3);
}

/* ---------- Meldungen (Erfolge, Belohnungen) ---------- */
function meldungZeigen() {
  if (!$('ov-meldung').hidden || !MELDUNGEN.length) return;
  const m = MELDUNGEN.shift(); $('meldung-t').textContent = m.titel; $('meldung-p').textContent = m.text; $('ov-meldung').hidden = false;
}
$('meldung-ok').onclick = () => { $('ov-meldung').hidden = true; if (!S && SP.bits !== bitsAnz) flieg($('meldung-ok').getBoundingClientRect(), SP.bits - bitsAnz, 0); if (S) S.pause = $('ov-pause').hidden ? false : S.pause; meldungZeigen(); if (!S) menueZeigen(); };

/* ---------- Einstellungen ---------- */
function einstellungen() {
  const dunkel = document.documentElement.getAttribute('data-theme') === 'dunkel';
  $('opt-ton').setAttribute('aria-checked', SP.opt.ton); $('opt-vib').setAttribute('aria-checked', SP.opt.vib); $('opt-dunkel').setAttribute('aria-checked', dunkel);
  $('ov-opt').hidden = false;
}
$('einst').onclick = einstellungen;
$('opt-ton').onclick = () => { SP.opt.ton = !SP.opt.ton; ton('klick'); speichern(); einstellungen(); };
$('opt-vib').onclick = () => { SP.opt.vib = !SP.opt.vib; vib(30); speichern(); einstellungen(); };
$('opt-dunkel').onclick = () => { const d = document.documentElement, dn = d.getAttribute('data-theme') !== 'dunkel';
  if (dn) d.setAttribute('data-theme', 'dunkel'); else d.removeAttribute('data-theme');
  try { localStorage.setItem('basebug.thema', dn ? 'dunkel' : 'hell'); } catch (e) {} farben(); einstellungen(); menueZeigen(); };
$('opt-zu').onclick = () => { $('ov-opt').hidden = true; };
$('opt-reset').onclick = () => { const b = $('opt-reset');
  if (b.dataset.sicher !== '1') { b.dataset.sicher = '1'; b.textContent = 'Wirklich alles löschen?'; return; }
  SP = leererStand(); speichern(); gewLv = 1; b.dataset.sicher = ''; b.textContent = 'Spielstand löschen'; $('ov-opt').hidden = true; menueZeigen(); };

/* ---------- Hauptschleife ---------- */
let letzt = performance.now(), anz = 0, sicher = 0;
function schleife(n) {
  const roh = Math.min(0.1, (n - letzt) / 1000); letzt = n; vt += roh;
  if (S) { if (!S.pause && !S.ende && $('ov-wahl').hidden && $('ov-meldung').hidden) {
      SP.stat.zeit = (SP.stat.zeit || 0) + roh;
      let rest = roh * SP.opt.tempo; while (rest > 0) { const d = Math.min(0.033, rest); schritt(d); rest -= d; if (!S || S.ende) break; }
      anz += roh; if (anz > 0.1 && S) { anz = 0; anzeige(); if (!$('blatt-turm').hidden) turmBlatt(); } }
    if (S) zeichnen(); }
  else if (!$('menue').hidden && tab === 'spielen') vorschau();
  sicher += roh; if (sicher > 15) { sicher = 0; speichern(); }
  requestAnimationFrame(schleife);
}
farben(); menueZeigen(); requestAnimationFrame(schleife);
if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
