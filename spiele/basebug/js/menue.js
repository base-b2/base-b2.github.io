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
    if (art === 'gegner') bild(x, GEGNER[id].bild, s * 0.1, s * 0.1, s * 0.8, false, null, GEGNER_FARBE[id]);
    if (art === 'item') bild(x, SLOTS[id].bild, s * 0.15, s * 0.15, s * 0.7);
  }
}
const cvs = (b, px, gesperrt) => /^(item|turm):/.test(b) ? `<span class="ico ${gesperrt ? 'blur' : ''}">${svg(b.replace(':', '_'), px)}</span>` : `<canvas data-b="${b}" width="${px * 2}" height="${px * 2}" style="width:${px}px;height:${px}px" class="${gesperrt ? 'blur' : ''}"></canvas>`;
const sterneHtml = (st) => [1, 2, 3].map((i) => `<span class="${i <= st ? 'an' : 'aus'}">■</span>`).join('');
const balken = (a, z) => `<div class="balken"><i style="width:${Math.min(100, a / z * 100)}%"></i></div>`;
const seg = (id, opts) => `<div class="segment" role="tablist">${opts.map(([k, n]) => `<button role="tab" data-seg="${id}:${k}" aria-selected="${unter[id] === k}">${n}</button>`).join('')}</div>`;

function menueZeigen() {
  tagPruefen(); erfolgePruefen(); kontoZeigen();
  $('menue').hidden = false; $('spiel').hidden = true;
  if (!bitsAnim) { $('m-bits').textContent = zahl(SP.bits); bitsAnz = SP.bits; }
  for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-selected', b.dataset.tab === tab);
  const n = offeneBelohnungen(); $('punkt-aufgaben').hidden = !n;
  const inh = $('inhalt'); inh.innerHTML = ({ spielen: tabSpielen, helden: tabHelden, ausruestung: tabAusruestung, aufgaben: tabAufgaben, archiv: tabArchiv })[tab]();
  malen(inh); meldungZeigen();
  for (const b of inh.querySelectorAll('[data-seg]')) b.onclick = () => { const [i, k] = b.dataset.seg.split(':'); unter[i] = k; ton('klick'); menueZeigen(); };
  for (const b of inh.querySelectorAll('[data-akt]')) b.onclick = () => { ton('klick'); AKTION[b.dataset.akt](b.dataset.wert, b); };
  speichern();
}
function erfolgePruefen() {
  if (Object.keys(HELDEN).every((h) => SP.helden[h])) erfolg('alleh');
  if (Object.values(SP.angelegt).every((v) => v != null && itemById(v))) erfolg('voll');
  if (aktivesSet()) erfolg('set');
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
  ${buchLeiste()}
  <button class="knopf" data-akt="spielen">Spielen</button>${(() => { const n = naechsteFreischaltung(); return n ? `<p class="leer" style="text-align:center">Nächste Freischaltung bei Spielerstufe ${n.st}: ${n.t}</p>` : ''; })()}
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
  `;
  const ab = ausrBoni(), akt = aktivesSet(), l = angelegteItems();
  s += `<div class="etikett" style="margin-top:12px">ZUSATZBONI IM LEVEL</div>` + (Object.keys(ab).length ? '<div class="chips">' + Object.entries(ab).map(([k, w]) => `<span class="chip">${bonusText(k, w)}</span>`).join('') + '</div>'
    : '<p class="leer">Seltene, epische und legendäre Teile bringen Zusatzboni. Vier Teile desselben Sets bringen einen Set-Bonus.</p>');
  s += `<div class="etikett" style="margin-top:12px">SETS</div><div class="sets">` + Object.entries(SETS).map(([id, st]) => { const n = l.filter((i) => i.set === id).length;
    return `<div class="set-zeile ${akt === id ? 'aktiv' : ''}"><b>${st.n}</b> <span class="etikett">${n} / 4${akt === id ? ' | AKTIV' : ''}</span><p>${st.t}</p></div>`; }).join('') + '</div>';
  const fg = fusionsGruppen();
  if (fg.length) s += `<button class="knopf" data-akt="fusionliste">${IK.fusion}Fusionieren möglich | ${fg.length}</button>`;
  s += `<div class="etikett" style="margin-top:16px">INVENTAR | ${SP.items.length} TEILE</div><p class="leer">${FUSION_ANZAHL} gleiche Teile (gleicher Platz, gleiche Seltenheit) lassen sich zur nächsten Seltenheit fusionieren.</p>`;
  if (!SP.items.length) return s + '<p class="leer">Noch leer. Bosse, Gummienten und jedes fünfte Level lassen Ausrüstung fallen.</p>';
  const angelegt = new Set(Object.values(SP.angelegt));
  s += '<div class="inventar">';
  for (const it of [...SP.items].sort((a, c) => c.r - a.r || c.lv - a.lv))
    s += `<button class="item r${it.r}" data-akt="item" data-wert="${it.id}" aria-label="${esc(itemName(it))}">${cvs('item:' + it.slot, 36)}<span>St. ${it.lv}</span><i class="set-mark">${SETS[it.set].n}</i>${angelegt.has(it.id) ? '<i class="an-mark">✓</i>' : ''}</button>`;
  return s + '</div>';
}
function itemZeigen(id) {
  const it = itemById(id); if (!it) return; const sl = SLOTS[it.slot], an = SP.angelegt[it.slot] === it.id, k = itemKosten(it), max = RAR[it.r].max;
  const fusGr = fusionsGruppen().find((gr) => gr.includes(it));
  const nachher = it.lv < max ? Math.round(sl.basis * RAR[it.r].m * (1 + WACHS.item * it.lv) * 10) / 10 : null;
  $('ov-item-inhalt').innerHTML = `<div class="item-gross r${it.r}">${cvs('item:' + it.slot, 72)}</div>
   <div class="etikett">${RAR[it.r].n.toUpperCase()} | ${sl.n.toUpperCase()}</div><h2>${esc(itemName(it))}</h2>
   <table class="werte"><tr><th>${sl.stat}</th><td>+${fmt(itemWert(it))}${sl.einh ? ' ' + sl.einh : ''}${nachher ? ' <span class="plus">-> ' + fmt(nachher) + '</span>' : ''}</td></tr>
   <tr><th>Stufe</th><td>${it.lv} / ${max}</td></tr><tr><th>Set</th><td>${SETS[it.set].n}</td></tr></table>
   <div class="etikett" style="text-align:left">SELTENHEITS-BONI</div>
   <ul class="neben">${NEBEN[it.slot].map((n, i) => `<li class="${i < it.r ? 'an' : ''}">${i < it.r ? '✓' : RAR[i + 1].n + ':'} ${bonusText(n.k, n.w)}</li>`).join('')}</ul>
   <p class="set-info"><b>Set ${SETS[it.set].n} (4 Teile):</b> ${SETS[it.set].t}</p>
   ${fusGr ? `<button class="knopf2" data-iakt="fusion">${IK.fusion}Fusionieren (${fusGr.length}/${FUSION_ANZAHL}) -> ${RAR[it.r + 1].n}</button>` : it.r < 3 ? `<p class="leer">Fusion: ${SP.items.filter((x) => x.slot === it.slot && x.r === it.r).length} / ${FUSION_ANZAHL} gleiche Teile</p>` : ''}
   <button class="knopf" data-iakt="${an ? 'ab' : 'an'}">${an ? 'Ablegen' : 'Anlegen'}</button>
   <button class="knopf2" data-iakt="auf" ${it.lv >= max || SP.bits < k ? 'disabled' : ''}>${it.lv >= max ? 'Höchste Stufe' : 'Verbessern | ' + k + ' Bits'}</button>
   <button class="knopf2" data-iakt="zerlegen">Zerlegen | +${itemZerlegen(it)} Bits</button>
   <button class="knopf2" data-iakt="zu">Schließen</button>`;
  malen($('ov-item-inhalt'));
  for (const b of $('ov-item-inhalt').querySelectorAll('[data-iakt]')) b.onclick = () => {
    const a = b.dataset.iakt; ton('klick');
    if (a === 'an') SP.angelegt[it.slot] = it.id;
    if (a === 'ab') SP.angelegt[it.slot] = null;
    if (a === 'fusion') { const { neu, rueck } = fusioniere(fusGr, it); erfolg('fusion'); ton('drop'); itemZeigen(neu.id); menueZeigen();
      melde('Fusioniert', RAR[neu.r].n + ': ' + itemName(neu) + ' (Set ' + SETS[neu.set].n + ')' + (rueck ? ' | +' + rueck + ' Bits zurück' : '')); return; }
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
    s += eintrag('turm:' + k, ges, t.n, 'TURM', ges ? (turmFrei(k) ? 'Noch nie gebaut.' : 'Ab Spielerstufe ' + turmAb(k) + '.') : t.info,
      k === 'mine' ? [['Kosten', t.k + ' Gold'], ['Ertrag', t.gold + ' Gold je Welle (+60 % je Stufe)'], ['Stufe 4', t.spez]]
        : [['Atk.', t.atk + (k === 'laser' ? '/s' : '') + ' (+35 % je Stufe)'], ['Feuerrate', k === 'laser' ? 'Dauerstrahl' : fmt(t.rate, 2) + '/s'], ['Reichweite', fmt(t.rw)], ['Kosten', t.k + ' Gold'],
          ['Freigeschaltet', 'ab Spielerstufe ' + turmAb(k)], ['Ziele', t.ziele.map((z) => z === 'luft' ? 'Luft' : 'Boden').join(' und ')], ['Stufe 4', t.spez]]); }
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
  fusionliste: () => { const fg = fusionsGruppen(); const o = $('ov-item-inhalt');
    o.innerHTML = `<div class="etikett">FUSION</div><h2>Fusionieren</h2><p>Je ${FUSION_ANZAHL} gleiche Teile werden zu einem Teil der nächsten Seltenheit (Stufe 1). Die schwächsten Teile werden zuerst verwendet, 50 % der investierten Bits gibt es zurück.</p>
      <div class="liste">${fg.map((gr, i) => `<div class="zeile r${gr[0].r}">${cvs('item:' + gr[0].slot, 36)}<div style="flex:1;text-align:left"><b>${itemName(gr[0])}</b><p>${gr.length} Stück | ${RAR[gr[0].r].n} -> ${RAR[gr[0].r + 1].n}</p></div><button class="knopf-klein" data-fus="${i}">Fusion</button></div>`).join('')}</div>
      <button class="knopf" data-fus="alle">Alle fusionieren</button><button class="knopf2" data-fus="zu">Schließen</button>`;
    malen(o); $('ov-item').hidden = false;
    for (const b of o.querySelectorAll('[data-fus]')) b.onclick = () => { const w = b.dataset.fus;
      if (w === 'zu') { $('ov-item').hidden = true; return; }
      const erg = []; if (w === 'alle') { let gr; let n = 0; while ((gr = fusionsGruppen()[0]) && n++ < 50) erg.push(fusioniere(gr)); } else erg.push(fusioniere(fg[+w]));
      erfolg('fusion'); ton('drop'); $('ov-item').hidden = true; menueZeigen();
      melde('Fusioniert', erg.map((e) => RAR[e.neu.r].n + ': ' + itemName(e.neu)).join(' | ')); }; },
  buecher: (art) => buecherZeigen(art),
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
  if (!$('ov-meldung').hidden || !MELDUNGEN.length || (S && !S.ende)) return;
  const m = MELDUNGEN.shift(); $('meldung-t').textContent = m.titel; $('meldung-p').textContent = m.text; $('ov-meldung').hidden = false;
}
$('meldung-ok').onclick = () => { $('ov-meldung').hidden = true; if (!S && SP.bits !== bitsAnz) flieg($('meldung-ok').getBoundingClientRect(), SP.bits - bitsAnz, 0); if (S) S.pause = $('ov-pause').hidden ? false : S.pause; meldungZeigen(); if (!S) menueZeigen(); };

/* ---------- Einstellungen ---------- */
function einstellungen() {
  const dunkel = document.documentElement.getAttribute('data-theme') === 'dunkel';
  $('opt-ton').setAttribute('aria-checked', SP.opt.ton); $('opt-vib').setAttribute('aria-checked', SP.opt.vib); $('opt-dunkel').setAttribute('aria-checked', dunkel);
  $('opt-meldung').textContent = ''; $('ov-opt').hidden = false;
}
$('einst').onclick = einstellungen;
$('opt-ton').onclick = () => { SP.opt.ton = !SP.opt.ton; ton('klick'); speichern(); einstellungen(); };
$('opt-vib').onclick = () => { SP.opt.vib = !SP.opt.vib; vib(30); speichern(); einstellungen(); };
$('opt-dunkel').onclick = () => { const d = document.documentElement, dn = d.getAttribute('data-theme') !== 'dunkel';
  if (dn) d.setAttribute('data-theme', 'dunkel'); else d.removeAttribute('data-theme');
  try { localStorage.setItem('basebug.thema', dn ? 'dunkel' : 'hell'); } catch (e) {} farben(); einstellungen(); menueZeigen(); };
$('opt-export').onclick = () => {
  speichern(); const d = new Date(), p = (n) => String(n).padStart(2, '0');
  const blob = new Blob([JSON.stringify({ spiel: 'BaseBug', version: 1, exportiert: d.toISOString(), stand: SP }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `BaseBug_Spielstand_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); $('opt-meldung').textContent = '✓ Spielstand gespeichert.'; };
$('opt-import').onclick = () => { $('opt-datei').value = ''; $('opt-datei').click(); };
$('opt-datei').onchange = async () => {
  const f = $('opt-datei').files[0]; if (!f) return;
  try { const j = JSON.parse(await f.text()); const st = j && j.spiel === 'BaseBug' ? j.stand : null;
    if (!st || st.v !== 1 || typeof st.bits !== 'number') throw new Error();
    SP = Object.assign(leererStand(), st); speichern(); gewLv = Math.min(SP.frei, MAXLV); bitsAnz = SP.bits;
    $('opt-meldung').textContent = '✓ Spielstand geladen: Level ' + Math.min(SP.frei, MAXLV) + ', ' + zahl(SP.bits) + ' Bits.'; menueZeigen();
  } catch (e) { $('opt-meldung').textContent = '✗ Diese Datei ist kein BaseBug-Spielstand.'; } };
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
      anz += roh; if (anz > 0.1 && S) { anz = 0; anzeige(); if (S && S.pad != null && S.tuerme.has(S.pad)) turmBlatt(); } }
    if (S) zeichnen(); }
  else if (!$('menue').hidden && tab === 'spielen') vorschau();
  sicher += roh; if (sicher > 15) { sicher = 0; speichern(); }
  requestAnimationFrame(schleife);
}
farben(); menueZeigen(); requestAnimationFrame(schleife);
if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

/* ---------- Spielerstufe ---------- */
function kontoZeigen() { const k = SP.konto, z = kontoZiel(k.st);
  $('konto-st').textContent = k.st; $('konto-i').style.width = Math.min(100, k.ep / z * 100) + '%'; $('konto').title = rang(k.st) + ' | ' + zahl(k.ep) + ' / ' + zahl(z) + ' EP'; }
function naechsteFreischaltung() { for (let st = SP.konto.st + 1; st <= 60; st++) if (KONTO[st] && kontoText(KONTO[st], true).length) return { st, t: kontoText(KONTO[st], true).join(', ') }; return null; }
$('konto').onclick = () => { const k = SP.konto, z = kontoZiel(k.st); let h = `<div class="etikett">SPIELERSTUFE</div><h2>${rang(k.st)}</h2>
  <div class="konto-gross"><span>${k.st}</span></div>${balken(k.ep, z)}<p>${zahl(k.ep)} / ${zahl(z)} EP bis Stufe ${k.st + 1}</p>
  <p class="leer">EP gibt es für Bugs (1), Wellen (5), Bosse (25), Gummienten (20), geschaffte Level (40 + 5 je Levelnummer), Tagesaufgaben (30), Fusionen (10) und Erfolge (25).</p>
  <div class="liste konto-liste">`;
  for (let st = 2; st <= 40; st++) { const b = KONTO[st] || {}, erreicht = k.st >= st, txt = [kontoBits(st) + ' Bits'].concat(kontoText(b));
    h += `<div class="zeile ${erreicht ? 'k1' : 'offen'} ${b.turm ? 'r2' : ''}"><span class="orden">${erreicht ? '✓' : st}</span><div style="flex:1;text-align:left"><b>Stufe ${st}${RAENGE.find(([a]) => a === st) ? ' | ' + rang(st) : ''}</b><p>${txt.join(' | ')}</p></div></div>`; }
  h += '</div><button class="knopf" id="konto-zu">Schließen</button>';
  $('ov-item-inhalt').innerHTML = h; $('ov-item').hidden = false; $('konto-zu').onclick = () => { $('ov-item').hidden = true; };
  const ziel = $('ov-item-inhalt').querySelectorAll('.konto-liste .zeile')[Math.max(0, k.st - 3)]; if (ziel) ziel.scrollIntoView({ block: 'center' }); };

/* ---------- Skill-Bücher ---------- */
const buchSym = (id, px) => BUECHER[id].turm ? svg('turm_' + BUECHER[id].turm, px) : svg(BUECHER[id].sym, px);
function buchLeiste() { let h = '<div class="buch-leiste"><span class="etikett">SKILL-BÜCHER</span><div class="buch-slots">';
  for (const art of ['off', 'def']) { const id = SP.buchAn[art], b = id && BUECHER[id];
    h += `<button class="buch-slot ${b ? 'voll r' + SP.buchR[id] : ''}" data-akt="buecher" data-wert="${art}">${b ? buchSym(id, 28) : svg('sym_buch', 28)}<span><small>${ARTN[art].toUpperCase()}</small>${b ? b.n : 'Buch wählen'}</span></button>`; }
  return h + '</div></div>'; }
var buchTab = 'off';
function buecherZeigen(art) { if (art) buchTab = art; const o = $('ov-item-inhalt');
  let h = `<div class="etikett">SKILL-BÜCHER</div><h2>Bibliothek</h2><p>Pro Level ein offensives und ein defensives Buch. Einmal gekauft, gehört es dir. Mit Bits zu höherer Seltenheit aufwerten.</p>
   <div class="segment">${['off', 'def'].map((a) => `<button data-buch="tab:${a}" aria-selected="${buchTab === a}">${ARTN[a]}</button>`).join('')}</div><div class="liste">`;
  for (const id in BUECHER) { const b = BUECHER[id]; if (b.art !== buchTab) continue;
    const r = SP.buchR[id], hat = r != null, an = SP.buchAn[b.art] === id, frei = buchFrei(id);
    let knoepfe = '';
    if (!frei) knoepfe = `<span class="etikett">ab St. ${turmAb(b.turm)}</span>`;
    else if (!hat) knoepfe = `<button class="knopf-klein" data-buch="kauf:${id}" ${SP.bits < b.preis ? 'disabled' : ''}>${b.preis} Bits</button>`;
    else { knoepfe = `<button class="knopf-klein ${an ? 'an' : ''}" data-buch="an:${id}">${an ? 'Ablegen' : 'Anlegen'}</button>`;
      if (r < 3) knoepfe += `<button class="knopf-klein auf" data-buch="auf:${id}" ${SP.bits < buchAufKosten(id) ? 'disabled' : ''}>${RAR[r + 1].n}<br>${buchAufKosten(id)}</button>`; }
    h += `<div class="zeile buch ${hat ? 'r' + r : ''} ${an ? 'buch-an' : ''} ${frei ? '' : 'gesperrt-zeile'}"><span class="buch-ico">${svg('sym_buch', 34)}<i>${buchSym(id, 20)}</i></span>
      <div style="flex:1;text-align:left"><b>${b.n}</b> <span class="etikett">${hat ? RAR[r].n.toUpperCase() : ''}</span><p>${buchText(id, hat ? r : 0)}</p>
      ${hat && r < 3 ? `<p class="naechst">${RAR[r + 1].n}: ${buchText(id, r + 1)}</p>` : ''}</div><div class="buch-knoepfe">${knoepfe}</div></div>`; }
  h += '</div><button class="knopf" data-buch="zu">Fertig</button>';
  o.innerHTML = h; $('ov-item').hidden = false;
  for (const btn of o.querySelectorAll('[data-buch]')) btn.onclick = () => { const [a, id] = btn.dataset.buch.split(':'); ton('klick');
    if (a === 'zu') { $('ov-item').hidden = true; menueZeigen(); return; }
    if (a === 'tab') { buchTab = id; buecherZeigen(); return; }
    const b = BUECHER[id];
    if (a === 'kauf') { if (!bitsWeg(b.preis)) return; SP.buchR[id] = 0; ton('drop'); if (!SP.buchAn[b.art]) SP.buchAn[b.art] = id; }
    if (a === 'an') SP.buchAn[b.art] = SP.buchAn[b.art] === id ? null : id;
    if (a === 'auf') { if (SP.buchR[id] >= 3 || !bitsWeg(buchAufKosten(id))) return; SP.buchR[id]++; ton('drop'); }
    speichern(); buecherZeigen(); }; }
