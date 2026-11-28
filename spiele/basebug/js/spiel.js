/* BaseBug | Spiel: Spielfeld, Wellen, Türme, Held, Bosse, Erfahrung, Drops. */
'use strict';
const $ = (id) => document.getElementById(id);
const reduziert = matchMedia('(prefers-reduced-motion: reduce)').matches;
let F = {};
function farben() { const s = getComputedStyle(document.documentElement);
  for (const k of ['grund', 'flaeche', 'text', 'nebentext', 'akzent', 'lavendel', 'aprikose', 'eisblau', 'erfolg', 'fehler', 'linie']) F[k] = s.getPropertyValue('--bb-' + k).trim(); }

/* ---------- Zeichenhilfen ---------- */
function rr(c, x, y, w, h, r, fill, stroke, lw) {
  c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
  if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } }
function kreis(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = fill; c.fill(); }
function bild(c, b, x, y, s, blink, farbe, tFarbe) {
  const n = b.length, u = s / n, m = { T: tFarbe || F.text, A: F.akzent, G: F.grund, P: F.aprikose, E: F.eisblau, L: F.lavendel };
  for (let r = 0; r < n; r++) for (let k = 0; k < b[r].length; k++) {
    const ch = b[r][k]; if (ch === '.' || (ch === 'A' && blink)) continue;
    c.fillStyle = farbe && ch !== 'G' ? farbe : m[ch]; c.fillRect(x + k * u, y + r * u, u + 0.5, u + 0.5);
  }
}
function turmSymbol(c, a, cx, cy, s) {
  const u = s / 9, o = (x, y, f, w = 1, h = 1) => { c.fillStyle = f; c.fillRect(cx - s / 2 + x * u, cy - s / 2 + y * u, w * u + 0.5, h * u + 0.5); };
  const t = F.text, ak = F.akzent;
  if (a === 'pfeil') { o(3, 3, t, 3, 3); o(4, 1, ak, 1, 3); o(3, 6, t, 1, 1); o(5, 6, t, 1, 1); }
  if (a === 'kanone') { o(2, 4, t, 5, 3); o(3.5, 1.5, t, 2, 3); o(4, 5, ak, 1, 1); }
  if (a === 'frost') { o(4, 1.5, t, 1, 6); o(1.5, 4, t, 6, 1); o(2.5, 2.5, t); o(5.5, 2.5, t); o(2.5, 5.5, t); o(5.5, 5.5, t); o(4, 4, ak); }
  if (a === 'flak') { o(2, 5, t, 5, 2); o(2.5, 2, t, 1, 3); o(5.5, 2, t, 1, 3); o(2.5, 1.2, ak, 1, 1); o(5.5, 1.2, ak, 1, 1); }
  if (a === 'blitz') { o(5, 1.5, t); o(4, 2.5, t); o(3, 3.5, t, 3, 1); o(4, 4.5, t); o(3, 5.5, t); o(2, 6.5, t); o(5, 3.5, ak); }
  if (a === 'laser') { o(3, 4, t, 3, 3); o(4, 1.5, t, 1, 3); o(4, 0.8, ak, 1, 1); }
  if (a === 'mine') { o(2, 5, t, 5, 2); o(3, 3, ak, 1, 2); o(5, 3, ak, 1, 2); o(4, 2, ak, 1, 1); }
}
function zeichneTurm(c, a, cx, cy, s, lv, opt = {}) {
  const k = 'turm_' + a, y = cy - (opt.rueck ? s * 0.06 : 0);
  if (svgFertig(k)) c.drawImage(IMG[k], cx - s / 2, y - s / 2, s, s); else rr(c, cx - s / 2, cy - s / 2, s, s, s * 0.3, F[TUERME[a].farbe]);
  if (opt.eis) { c.globalAlpha = 0.55; kreis(c, cx, cy + s * 0.03, s * 0.4, GP.tuerkis); c.globalAlpha = 1; }
  if (lv) { const pw = s * 0.11, gap = s * 0.04, gesamt = lv * pw + (lv - 1) * gap; rr(c, cx - gesamt / 2 - 4, cy + s * 0.42, gesamt + 8, s * 0.13, s * 0.065, F.flaeche, F.linie, 1);
    for (let i = 0; i < lv; i++) rr(c, cx - gesamt / 2 + i * (pw + gap), cy + s * 0.445, pw, s * 0.08, s * 0.04, i >= 3 || opt.spez ? GP.orange : GP.tinte); }
  if (opt.spez) { kreis(c, cx + s * 0.36, cy - s * 0.36, s * 0.11, GP.orange); }
}

/* ---------- Spielfeld ---------- */
const W = 9, H = 15, WAND = 12.2;
const PADS = []; for (const y of [2.6, 4.6, 6.6, 8.6, 10.6]) for (const x of [1, 3, 5, 7]) PADS.push({ x, y });
const BAHNEN = [0.5, 2.5, 4.5, 6.5, 8.5];
const HELD_X = 4.5, HELD_Y = 13.55;
const cv = $('feld'), g = cv.getContext('2d'); let Z = 40;
const BREIT = matchMedia('(min-width: 1000px)');
function groesse() {
  const h = (id) => $(id).getBoundingClientRect().height, sp = $('spiel'), weit = BREIT.matches;
  const ziel = weit ? $('seite-blatt') : $('buehne');
  for (const id of ['blatt-bau', 'blatt-turm']) if ($(id).parentElement !== ziel) ziel.appendChild($(id));
  const frei = sp.clientHeight - h('s-kopf') - h('s-xp') - h('s-unten') - (weit ? 0 : h('boni')) - 32, breit = Math.min(sp.clientWidth - (weit ? 380 : 0), 560) - 16;
  Z = Math.max(10, Math.floor(Math.min(breit / W, frei / H))); const d = devicePixelRatio || 1;
  sp.style.setProperty('--fb', (W * Z + 2) + 'px');
  cv.width = W * Z * d; cv.height = H * Z * d; cv.style.width = W * Z + 'px'; cv.style.height = H * Z + 'px'; g.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', () => { if (!$('spiel').hidden) groesse(); });

const gruppe = (b) => b.art === 'luft' ? 'luft' : 'boden';
let S = null;
const B = (k) => (S && S.boni[k]) || 0;
const spezAktiv = (t) => t.lv >= 4 || B('t_' + t.a + '_spez') > 0;
const preis = (k) => Math.max(1, Math.round(k * Math.max(0.5, 1 - B('rabatt') / 100)));

function levelInfo(L, hf) {
  if (hf != null) return { L: (hf + 1) * 10, wellen: 20, hf, mult: HAERTE.mult, kap: hf };
  return { L, wellen: 10, hf: null, mult: 1, kap: Math.min(2, Math.floor((L - 1) / 10)) };
}
function starteLevel(info) {
  const hw = heldWerte(), h = HELDEN[SP.held], b = ausrBonus();
  const hp = Math.round((FESTUNG_HP + b.netzteil) * (1 + kontoWert('festung') / 100));
  S = { info, welle: 1, gold: 120 + kontoWert('startgold'), kaffeeMax: KAFFEE_MAX + kontoWert('kaffee'), reroll: kontoWert('reroll'), hp, hpMax: hp, hpBasis: hp, tuerme: new Map(), bugs: [], schuesse: [], effekte: [], partikel: [], feuer: [], laeuft: false, spawn: [], pause: false, ende: false,
    boni: {}, zahl: {}, ep: 0, stufe: 1, aufstiege: 0, pad: null, bauWahl: null, schiebe: null, kills: 0, t: 0, frierT: 0, wackel: 0,
    beute: { bits: 0, items: [] }, kaffee: 1, schaden: false, faehigGenutzt: false, maxTuerme: 0, tempo3: true, turmBonus: 1 + b.kopfhoerer / 100,
    held: { id: SP.held, atk: hw.atk, rate: hw.rate, krit: hw.krit, cdMax: h.f.cd, cd: 5, schild: 0, turbo: 0, sudo: 0, frost: 0, feuer: 0, schuss: 0 } };
  S.aufstiege = kontoWert('aufstieg'); S.boni = ausrBoni(); S.ausr = { ...S.boni }; S.set = aktivesSet();
  if (B('hpmax')) { S.hpMax = Math.round(S.hpBasis * (1 + B('hpmax') / 100)); S.hp = S.hpMax; }
  $('menue').hidden = true; $('spiel').hidden = false;
  const fb = $('faehig-bild').getContext('2d'); fb.clearRect(0, 0, 56, 56); bild(fb, h.bild, 0, 0, 56); $('faehig-name').textContent = h.f.n;
  $('faehig-tipp').innerHTML = `<b>${h.f.n}</b>${h.f.t}<br><span>Abklingzeit ${h.f.cd} s. Lädt während der Wellen.</span>`;
  $('s-level').textContent = info.hf != null ? 'HÄRTETEST ' + (info.hf + 1) : 'LEVEL ' + info.L;
  tempoZeigen(); autoZeigen(); groesse(); blattZu(); anzeige(); boniZeigen();
}
function anzeige() { if (!S) return;
  $('s-welle').textContent = 'Welle ' + Math.min(S.welle, S.info.wellen) + '/' + S.info.wellen + (S.welle % 5 === 0 ? ' | Boss' : '');
  $('s-gold').textContent = Math.floor(S.gold); $('s-hp').textContent = Math.max(0, Math.ceil(S.hp));
  $('start').disabled = S.laeuft; $('start').textContent = S.laeuft ? 'Welle läuft ...' : S.autoT > 0 && SP.opt.auto ? 'Nächste Welle in ' + Math.ceil(S.autoT) + ' s' : (S.welle % 5 === 0 ? 'Boss-Welle ' : 'Welle ') + S.welle + ' starten';
  const h = S.held, cdm = cdMax(); $('faehig-cd').style.height = (h.cd > 0 ? Math.min(1, h.cd / cdm) * 100 : 0) + '%'; $('faehig').classList.toggle('bereit', h.cd <= 0 && S.laeuft);
  const z = epZiel(S.stufe); $('xp-i').style.width = Math.min(100, S.ep / z * 100) + '%'; $('xp-t').textContent = 'Stufe ' + S.stufe + ' | ' + Math.floor(S.ep) + '/' + z + ' EP'; }
const cdMax = () => S.held.cdMax * Math.max(0.3, 1 - B('cd') / 100);
function tempoZeigen() { $('tempo').textContent = SP.opt.tempo + 'x'; }
$('tempo').onclick = () => { SP.opt.tempo = SP.opt.tempo % 3 + 1; if (SP.opt.tempo !== 3 && S) S.tempo3 = false; tempoZeigen(); speichern(); };

/* ---------- Wellen ---------- */
function bossFuer(w) { if (w === 20) return 'kernel'; if (w % 10 === 0) return 'bluescreen'; return (S.info.L + w / 5) % 2 ? 'speicherleck' : 'schleife'; }
function starteWelle() {
  if (S.laeuft || S.ende) return; S.laeuft = true; blattZu();
  const w = S.welle, L = S.info.L, boss = w % 5 === 0, hf = S.info.hf != null;
  const pool = ['bug']; for (const id of ['motte', 'wurm', 'kaefer', 'virus', 'schild']) if (hf || L >= GEGNER[id].ab) pool.push(id);
  let n = Math.min(28, 6 + w + Math.floor(L / 3)); if (boss) n = Math.ceil(n / 2);
  const liste = [];
  for (let i = 0; i < n; i++) liste.push(Math.random() < 0.4 ? 'bug' : pool[Math.random() * pool.length | 0]);
  if (boss) liste.push(bossFuer(w));
  if (Math.random() < 0.05) liste.splice(Math.random() * liste.length | 0, 0, 'ente');
  let t = 0.4; S.spawn = liste.map((a) => ({ a, t: t += Math.max(0.3, 1.1 - L * 0.015 - w * 0.03) })); S.zeit = 0;
  ton(boss ? 'boss' : 'welle'); if (boss) vib([60, 40, 60]); anzeige();
}
function erzeuge(id, x, y) {
  const gg = GEGNER[id], L = S.info.L, w = S.welle;
  let fh = Math.pow(WACHS.gegnerHpLevel, L - 1) * Math.pow(WACHS.gegnerHpWelle, w - 1) * S.info.mult;
  const fa = Math.pow(WACHS.gegnerAtkLevel, L - 1) * Math.pow(WACHS.gegnerAtkWelle, w - 1) * S.info.mult;
  if (gg.boss) fh *= BOSSMULT[w] || 1;
  if (x === undefined) { x = id === 'ente' ? 1 + Math.random() * 7 : BAHNEN[Math.random() * 5 | 0] + (Math.random() - 0.5) * 0.4; y = -0.5; }
  const hp = id === 'ente' ? 1 : gg.hp * fh;
  S.bugs.push({ id, art: gg.art, x, y, wx: x, hp, max: hp, hpAnz: hp, schild: id === 'schild' ? hp * 0.5 : 0,
    atk: gg.atk * fa * (gg.boss ? BOSSMULT[w] || 1 : 1), v: gg.v * (1 + L * 0.008), gr: gg.gr, gold: gg.gold * (1 + 0.05 * (L - 1)),
    lahm: 0, stop: 0, phase: Math.random() * 6, t: 0, ft: 0, ft2: 0, dir: Math.random() < 0.5 ? -1 : 1, unten: false, beiss: 0, treffT: 0, gift: 0, giftT: 0 });
  if (gg.boss) S.effekte.push({ t: 1.8, art: 'ansage', text: 'BOSS: ' + gg.n });
}

/* ---------- Kampf ---------- */
function turmWerte(t) { const a = TUERME[t.a], l = t.lv, s = S.held.sudo > 0 ? 2 : 1;
  let rw = a.rw ? a.rw + B('rw') + 0.15 * (l - 1) : 0; if (t.a === 'flak') rw += B('t_flak_extra');
  return { atk: a.atk * S.turmBonus * (1 + B('tatk') / 100) * (1 + B('t_' + t.a + '_atk') / 100) * Math.pow(WACHS.turm, l - 1) * s,
    rate: a.rate * (1 + B('trate') / 100) * (1 + 0.1 * (l - 1)) * s, rw }; }
function schaden(b, d, quelle) {
  if (b.hp <= 0) return;
  if (b.schild > 0) { const ab = Math.min(b.schild, d); b.schild -= ab; d -= ab; }
  b.hp -= d; b.treffT = 0.12; stat(quelle === 'held' ? 'dmg_held' : 'dmg_turm', Math.round(d));
}
function ziel(x, y, rw, ziele, aus) { let z = null, best = -9;
  for (const b of S.bugs) { if (b.hp <= 0 || b.unten || (aus && aus.has(b)) || !ziele.includes(gruppe(b))) continue;
    if (Math.hypot(b.x - x, b.y - y) <= rw && b.y > best) { best = b.y; z = b; } }
  return z; }
function kette(von, z, atk, n, ziele, quelle) { const ge = new Set(); let akt = z;
  for (let i = 0; i < n && akt; i++) { ge.add(akt); schaden(akt, atk, quelle); S.effekte.push({ x: von.x, y: von.y, x2: akt.x, y2: akt.y, t: 0.18, art: 'blitz' }); von = akt;
    let nx = null, nb = 1.8; for (const b of S.bugs) { if (b.hp > 0 && !b.unten && !ge.has(b) && ziele.includes(gruppe(b))) { const d = Math.hypot(b.x - akt.x, b.y - akt.y); if (d < nb) { nb = d; nx = b; } } } akt = nx; } }
function partikel(x, y, n, f, v = 2) { if (reduziert) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, s = v * (0.4 + Math.random());
  S.partikel.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.5 + Math.random() * 0.3, f, gr: 0.05 + Math.random() * 0.06 }); } }

function schritt(dt) {
  S.t += dt; const h = S.held;
  if (S.laeuft) { S.zeit += dt; while (S.spawn.length && S.spawn[0].t <= S.zeit) erzeuge(S.spawn.shift().a); }
  if (S.laeuft && h.cd > 0) h.cd -= dt;
  for (const k of ['schild', 'turbo', 'sudo', 'frost', 'schuss']) if (h[k] > 0) h[k] -= dt;
  if (S.frierT > 0) S.frierT -= dt; if (S.wackel > 0) S.wackel -= dt;
  if (B('regen') && S.laeuft) S.hp = Math.min(S.hpMax, S.hp + B('regen') * dt);
  const lahmF = Math.max(0.15, 0.5 - B('t_frost_extra') / 100);
  /* Bugs */
  for (const b of S.bugs) {
    b.phase += dt * 8; b.t += dt; b.lahm -= dt; b.stop -= dt; b.treffT -= dt; b.hpAnz += (b.hp - b.hpAnz) * Math.min(1, dt * 10);
    if (b.giftT > 0) { b.giftT -= dt; schaden(b, b.gift * dt, 'turm'); }
    const gg = GEGNER[b.id];
    if (gg.boss) { b.ft += dt; b.ft2 += dt;
      if ((b.id === 'speicherleck' && b.ft > 3) || (b.id === 'kernel' && b.ft > 4)) { b.ft = 0; if (S.bugs.length < 60) erzeuge('mini', b.x, b.y + 0.3); }
      if ((b.id === 'bluescreen' && b.ft2 > 7) || (b.id === 'kernel' && b.ft2 > 9)) { b.ft2 = 0; S.frierT = 1.5; S.effekte.push({ t: 0.6, art: 'blau' }); } }
    if (h.frost > 0 || b.stop > 0) continue;
    const v = b.v * (b.lahm > 0 ? lahmF : 1);
    if (b.id === 'ente') { b.x += b.dir * 0.9 * dt; if (b.x < 0.4 || b.x > 8.6) b.dir *= -1; b.y += 0.35 * dt;
      if (b.y > WAND - 1.2) { b.weg = true; S.effekte.push({ x: b.x, y: b.y, t: 0.9, art: 'text', text: 'Quak!' }); ton('quak'); } continue; }
    if (b.art === 'tunnel') b.unten = (b.t % 3.2) > 2.1 && b.y < WAND - 1;
    if (b.y < WAND - b.gr) {
      b.y += v * (b.unten ? 1.4 : 1) * dt;
      if (b.id === 'schleife') b.x = 4.5 + Math.sin(b.t * 1.1) * 3.8;
      else if (b.art === 'luft') b.x = b.wx + Math.sin(b.t * 2) * 0.45;
      else b.x = b.wx + Math.sin(b.phase * 0.15) * 0.1;
    } else { b.unten = false; b.beiss += dt;
      if (B('dorn')) schaden(b, B('dorn') * dt, 'turm');
      if (b.beiss >= 1) { b.beiss = 0; if (h.schild <= 0) { S.hp -= b.atk; S.schaden = true; S.wackel = 0.15; S.effekte.push({ x: b.x, y: WAND, t: 0.3, art: 'treffer' }); partikel(b.x, WAND, 4, F.fehler, 1.5); vib(30); } } }
  }
  /* Held */
  h.feuer -= dt;
  if (h.feuer <= 0) { const z = ziel(HELD_X, HELD_Y, 99, ['boden', 'luft']);
    if (z) { const HD = HELDEN[h.id]; h.feuer = 1 / (h.rate * (1 + B('hrate') / 100) * (h.turbo > 0 ? 4 : 1)); h.schuss = 0.12;
      const schuesse = 1 + B('multi'), ziele = [z]; const aus = new Set([z]);
      for (let i = 1; i < schuesse; i++) { const z2 = ziel(HELD_X, HELD_Y, 99, ['boden', 'luft'], aus); if (z2) { ziele.push(z2); aus.add(z2); } else ziele.push(z); }
      for (const zz of ziele) {
        let atk = h.atk * (1 + B('hatk') / 100); const krit = Math.random() < h.krit + B('krit') / 100; if (krit) { atk *= 2 + B('kritx') / 100; stat('krit'); }
        if (HD.art === 'kette') kette({ x: HELD_X, y: HELD_Y - 0.4 }, zz, atk, HD.kette, ['boden', 'luft'], 'held');
        else S.schuesse.push({ x: HELD_X, y: HELD_Y - 0.4, z: zz, atk, fl: HD.fl, frost: HD.art === 'frost', v: 11, held: true, krit, spur: [] }); } } }
  /* Türme */
  for (const t of S.tuerme.values()) {
    const a = TUERME[t.a]; t.rueck = Math.max(0, (t.rueck || 0) - dt); if (!a.rw) continue; t.strahl = null; if (S.frierT > 0) continue;
    const w = turmWerte(t), p = PADS[t.p], tx = p.x + 0.5, ty = p.y + 0.5, sp = spezAktiv(t); t.cd -= dt;
    if (t.a === 'laser') { const z = ziel(tx, ty, w.rw, a.ziele); t.strahl = z; if (!z) continue;
      const brand = B('t_laser_extra');
      if (sp) { const dx = z.x - tx, dy = z.y - ty, l = Math.hypot(dx, dy) || 1;
        for (const b of S.bugs) { if (b.unten) continue; const q = ((b.x - tx) * dx + (b.y - ty) * dy) / l; if (q < 0 || q > w.rw) continue;
          if (Math.abs((b.x - tx) * dy - (b.y - ty) * dx) / l < 0.4) { schaden(b, w.atk * w.rate * dt, 'turm'); if (brand) { b.gift = Math.max(b.gift, w.atk * brand / 100); b.giftT = 3; } } } }
      else { schaden(z, w.atk * w.rate * dt, 'turm'); if (brand) { z.gift = Math.max(z.gift, w.atk * brand / 100); z.giftT = 3; } } continue; }
    if (t.cd > 0) continue; const z = ziel(tx, ty, w.rw, a.ziele); if (!z) continue; t.cd = 1 / w.rate; t.rueck = 0.12;
    if (t.a === 'blitz') { kette({ x: tx, y: ty }, z, w.atk, (sp ? 5 : 3) + B('t_blitz_extra'), a.ziele, 'turm'); continue; }
    const fl = t.a === 'kanone' ? a.fl + B('t_kanone_extra') : (t.a === 'flak' && sp ? 0.8 : 0);
    S.schuesse.push({ x: tx, y: ty - 0.2, z, atk: w.atk, fl, flZiele: a.ziele, frost: t.a === 'frost', eis: t.a === 'frost' && sp, gift: t.a === 'pfeil' ? B('t_pfeil_extra') : 0,
      brand: t.a === 'kanone' && sp, v: t.a === 'kanone' ? 6 : 10, a: t.a, spur: [] });
    if (t.a === 'pfeil' && sp) { const z2 = ziel(tx, ty, w.rw, a.ziele, new Set([z])); if (z2) S.schuesse.push({ x: tx, y: ty - 0.2, z: z2, atk: w.atk, v: 10, a: 'pfeil', gift: B('t_pfeil_extra'), spur: [] }); }
  }
  /* Geschosse */
  for (const s of S.schuesse) { const dx = s.z.x - s.x, dy = s.z.y - s.y, d = Math.hypot(dx, dy); const q = s.held ? 'held' : 'turm';
    if (d < 0.2 || (s.z.hp <= 0 && d < 0.6) || s.z.weg) { s.weg = true;
      if (s.z.unten) continue;
      if (s.fl) { for (const b of S.bugs) if (!b.unten && Math.hypot(b.x - s.z.x, b.y - s.z.y) <= s.fl && (!s.flZiele || s.flZiele.includes(gruppe(b)))) schaden(b, s.atk, q);
        S.effekte.push({ x: s.z.x, y: s.z.y, t: 0.4, art: 'boom', r: s.fl }); partikel(s.z.x, s.z.y, 6, F.akzent, 2.5);
        if (s.brand) S.feuer.push({ x: s.z.x, y: s.z.y, t: 2, atk: s.atk * 0.4 }); }
      else { schaden(s.z, s.atk, q); partikel(s.z.x, s.z.y, 2, s.frost ? F.eisblau : F.akzent, 1.2);
        if (s.frost) { s.z.lahm = 1.6; if (s.eis && Math.random() < 0.2) s.z.stop = 1; }
        if (s.gift) { s.z.gift = Math.max(s.z.gift, s.atk * s.gift / 100); s.z.giftT = 3; } }
      if (s.krit) S.effekte.push({ x: s.z.x, y: s.z.y - 0.3, t: 0.6, art: 'text', text: 'Krit!' });
      continue; }
    s.spur.push([s.x, s.y]); if (s.spur.length > 4) s.spur.shift();
    s.x += dx / d * s.v * dt; s.y += dy / d * s.v * dt; }
  S.schuesse = S.schuesse.filter((s) => !s.weg);
  for (const f of S.feuer) { f.t -= dt; for (const b of S.bugs) if (b.art !== 'luft' && !b.unten && Math.hypot(b.x - f.x, b.y - f.y) < 0.7) schaden(b, f.atk * dt, 'turm'); }
  S.feuer = S.feuer.filter((f) => f.t > 0);
  for (const p of S.partikel) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; } S.partikel = S.partikel.filter((p) => p.t > 0);
  for (const b of S.bugs) if (b.hp <= 0 && !b.tot) besiegt(b);
  S.bugs = S.bugs.filter((b) => !b.tot && !b.weg);
  for (const e of S.effekte) e.t -= dt; S.effekte = S.effekte.filter((e) => e.t > 0);
  if (S.hp <= 0 && !S.ende) { S.ende = true; levelEnde(false); }
  else if (S.laeuft && !S.spawn.length && !S.bugs.length && !S.ende) welleFertig();
  if (S.aufstiege > 0 && $('ov-wahl').hidden && !S.ende) aufstiegZeigen();
  if (S.autoT > 0 && !S.laeuft) { S.autoT -= dt; if (S.autoT <= 0 && SP.opt.auto) starteWelle(); }
}
function besiegt(b) {
  b.tot = true; const gg = GEGNER[b.id], L = S.info.L, w = S.welle;
  const gd = Math.round(b.gold * (1 + B('gold') / 100)); S.gold += gd; S.kills++;
  stat('kills'); stat('gold', gd); if (b.art === 'luft') stat('kills_luft');
  if (gg.boss) stat('bosse'); if (b.id === 'ente') { stat('enten'); erfolg('ente'); ton('quak'); }
  SP.gesehen.gegner[b.id] = 1;
  S.effekte.push({ x: b.x, y: b.y, t: 0.7, art: 'gold', w: gd });
  partikel(b.x, b.y, gg.boss ? 24 : 8, b.id === 'virus' || gg.boss ? F.akzent : F.text, gg.boss ? 4 : 2.2);
  /* Erfahrung */
  S.ep += (EP[b.id] || 1) * (1 + B('xp') / 100);
  while (S.ep >= epZiel(S.stufe)) { S.ep -= epZiel(S.stufe); S.stufe++; S.aufstiege++; ton('drop'); }
  if (b.id === 'virus') { erzeuge('mini', b.x - 0.25, b.y); erzeuge('mini', b.x + 0.25, b.y); }
  if (gg.boss) { S.effekte.push({ x: b.x, y: b.y, t: 0.8, art: 'boom', r: 1.5 }); S.wackel = 0.4; vib(120); }
  /* Drops */
  const hfBonus = S.info.hf != null ? 0.5 : 0;
  let bits = 0, rar = null;
  if (b.id === 'ente') { bits = 30 + L * 2; rar = Math.max(1, rollRar(0.6 + hfBonus)); }
  else if (gg.boss) { bits = Math.round((20 + L * 3) * (w >= 10 ? 2 : 1)); const ch = { 5: 0.3, 10: 0.65, 15: 0.5, 20: 1 }[w] || 0.3;
    if (Math.random() < ch) rar = rollRar((w >= 10 ? 1 : 0.5) + hfBonus); }
  else { if (Math.random() < 0.08) bits = 2 + Math.ceil(L / 2); if (Math.random() < 0.006) rar = Math.min(1, rollRar(0));
    if (Math.random() < 0.04 && S.kaffee < S.kaffeeMax) { S.kaffee++; S.effekte.push({ x: b.x, y: b.y - 0.2, t: 1.2, art: 'text', text: '+1 Kaffee' }); S.effekte.push({ x: b.x, y: b.y, t: 0.7, art: 'kflug' }); } }
  if (bits) { S.beute.bits += bits; S.effekte.push({ x: b.x, y: b.y + 0.4, t: 1.1, art: 'text', text: '+' + bits + ' Bits' }); ton('muenze'); }
  if (rar != null) { const it = neuesItem(rar); S.beute.items.push(it); S.effekte.push({ x: b.x, y: b.y - 0.5, t: 1.5, art: 'text', text: RAR[rar].n + '!' }); ton('drop'); vib(60); }
}
function faehigkeit() { const h = S.held; if (h.cd > 0 || !S.laeuft) return; h.cd = cdMax(); S.faehigGenutzt = true; stat('faehig');
  if (h.id === 'bit') { S.hp = Math.min(S.hpMax, S.hp + S.hpMax * 0.3); h.schild = 3; }
  if (h.id === 'pixel') h.turbo = 5;
  if (h.id === 'cache') h.frost = 3;
  if (h.id === 'root') h.sudo = 6;
  if (h.id === 'byte') { let best = null, bn = -1; for (const b of S.bugs) { if (b.unten) continue; let n = 0; for (const c of S.bugs) if (Math.hypot(b.x - c.x, b.y - c.y) < 1.8) n++; if (n > bn) { bn = n; best = b; } }
    if (best) { const x = best.x, y = best.y; for (const b of S.bugs) if (!b.unten && Math.hypot(b.x - x, b.y - y) < 1.8) schaden(b, h.atk * (1 + B('hatk') / 100) * 10, 'held');
      S.effekte.push({ x, y, t: 0.6, art: 'boom', r: 1.8 }); partikel(x, y, 20, F.akzent, 4); S.wackel = 0.3; } }
  S.effekte.push({ t: 0.5, art: 'licht' }); ton('faehig'); vib(40); anzeige(); }
$('faehig').onclick = faehigkeit;
/* Info zur Fähigkeit: Maus darüber, Fokus oder lange drücken */
(() => { const f = $('faehig'), tp = $('faehig-tipp'); let tm = null;
  const an = () => { tp.hidden = false; }, aus = () => { tp.hidden = true; clearTimeout(tm); };
  f.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') an(); });
  f.addEventListener('pointerleave', aus); f.addEventListener('focus', an); f.addEventListener('blur', aus);
  f.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') tm = setTimeout(an, 350); });
  f.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') { clearTimeout(tm); setTimeout(() => { tp.hidden = true; }, 1600); } });
  f.addEventListener('contextmenu', (e) => e.preventDefault()); })();

/* ---------- Aufstieg mit Verbesserungen ---------- */
function rollSelten() { const sum = SELTEN.reduce((a, s) => a + s.w, 0) ; let x = Math.random() * sum;
  for (let i = 0; i < SELTEN.length; i++) { x -= SELTEN[i].w; if (x < 0) return i; } return 0; }
function angebote() {
  const typen = [...new Set([...S.tuerme.values()].map((t) => t.a))], out = [], ids = new Set(), anzahl = 3 + kontoWert('karten');
  for (let g2 = 0; out.length < anzahl && g2 < 200; g2++) {
    const r = rollSelten(), pool = [];
    for (const u of UPGRADES) if (r >= (u.minR || 0) && !(u.max && B(u.id) >= u.max)) pool.push({ ...u, key: u.id, w: 1 });
    for (const a of typen) { const tn = TUERME[a].n;
      pool.push({ ...TURM_ATK, n: TURM_ATK.n.replace('{t}', tn), z: TURM_ATK.z.replace('{t}', tn), key: 't_' + a + '_atk', turm: a, w: 1.4 });
      if (r >= 1 && !B('t_' + a + '_spez')) pool.push({ n: tn + ': Geheimtechnik', z: 'Spezialfähigkeit sofort: ' + TUERME[a].spez, v: [1, 1, 1, 1], key: 't_' + a + '_spez', turm: a, einmal: true, spez: true, w: 1.2 });
      const x = TURM_EXTRA[a]; if (r >= 2 && !(x.max && B('t_' + a + '_extra') >= x.max)) pool.push({ ...x, n: tn + ': ' + x.n, key: 't_' + a + '_extra', turm: a, w: 1.5 });
    }
    const frei = pool.filter((p) => !ids.has(p.key) && p.v[r] > 0); if (!frei.length) continue;
    let sum = frei.reduce((s, p) => s + p.w, 0), x = Math.random() * sum, c = frei[0];
    for (const p of frei) { x -= p.w; if (x < 0) { c = p; break; } }
    ids.add(c.key); out.push({ ...c, r, wert: c.v[r] });
  }
  return out;
}
const fz = (v, e, neg) => (neg ? '-' : '+') + (Math.round(v * 100) / 100).toLocaleString('de-DE') + (e ? ' ' + e : '');
function aufstiegZeigen(neuZiehen) {
  if (!neuZiehen) S.aufstiege--; const w = $('wahl'); w.innerHTML = '';
  $('wahl-et').textContent = 'AUFSTIEG | STUFE ' + (S.stufe - S.aufstiege); $('wahl-h').textContent = 'Verbesserung wählen';
  for (const k of angebote()) {
    const vor = B(k.key), n = S.zahl[k.key] || 0, b = document.createElement('button'); b.className = 'karte-wahl s' + k.r;
    const wertZeile = k.spez ? 'Dauerhaft für dieses Level' : k.einmal ? k.z + ': ' + fz(k.wert, k.e) :
      `${k.z}: ${vor ? '<span class="alt">' + fz(vor, k.e, k.neg) + '</span>' : '0'} -> <b class="neu">${fz(vor + k.wert, k.e, k.neg)}</b>`;
    const fuer = k.turm ? TUERME[k.turm].n.toUpperCase() : FUER[k.key] || '';
    b.innerHTML = `<span class="seltenheit">${SELTEN[k.r].n}${fuer ? ' | ' + fuer : ''}</span>${k.turm ? `<span class="karte-turm">${svg('turm_' + k.turm, 30)}</span>` : ''}<b>${k.n}</b><span>${k.spez ? k.z : wertZeile}</span>${k.spez ? '<span>' + wertZeile + '</span>' : ''}${n ? `<span class="stapel">${n}x gewählt</span>` : ''}`;
    b.onclick = () => { waehle(k); $('ov-wahl').hidden = true; ton('klick'); anzeige(); boniZeigen(); };
    w.appendChild(b);
  }
  if (S.reroll > 0) { const r = document.createElement('button'); r.className = 'knopf2'; r.textContent = 'Neu ziehen (' + S.reroll + ' übrig)';
    r.onclick = () => { S.reroll--; ton('klick'); aufstiegZeigen(true); }; w.appendChild(r); }
  $('ov-wahl').hidden = false; anzeige();
}
function boniName(k) { const m = k.match(/^t_(\w+)_(atk|spez|extra)$/);
  if (m) return TUERME[m[1]].n + ': ' + ({ atk: 'Training', spez: 'Geheimtechnik', extra: TURM_EXTRA[m[1]].n })[m[2]];
  const u = UPGRADES.find((x) => x.id === k); return u ? u.n : k; }
function boniZeigen() { if (!S) return;
  const l = Object.entries(S.boni).filter(([, w]) => w);
  const chip = ([k, w]) => { const m = k.match(/^t_(\w+)_(atk|spez|extra)$/), u = UPGRADES.find((x) => x.id === k);
    const txt = m ? (m[2] === 'spez' ? 'Spezialfähigkeit aktiv' : m[2] === 'atk' ? 'Angriff +' + w + ' %' : TURM_EXTRA[m[1]].z + ' ' + (TURM_EXTRA[m[1]].e ? '+' + w + ' %' : '+' + w)) : bonusText(k, w);
    const n = S.zahl[k] || 0, a = S.ausr[k] ? ' | davon Ausrüstung ' + (Math.round(S.ausr[k] * 100) / 100).toLocaleString('de-DE') : '';
    return `<span class="chip" title="${txt}${a}"><b>${boniName(k)}</b>${n ? ' ' + n + 'x' : ''}<i>${txt}</i></span>`; };
  const set = S.set ? `<span class="chip set" title="${SETS[S.set].t}"><b>Set ${SETS[S.set].n}</b><i>${SETS[S.set].t}</i></span>` : '';
  const html = set + l.map(chip).join('');
  $('boni').innerHTML = html || '<span class="leer">Noch keine Boni. Aufstiege bringen Verbesserungen.</span>';
  $('boni-seite').innerHTML = html || '<p class="leer">Noch keine Boni.</p>'; }
function waehle(k) {
  S.zahl[k.key] = (S.zahl[k.key] || 0) + 1;
  if (k.key === 'heal') { S.hp = Math.min(S.hpMax, S.hp + S.hpMax * k.wert / 100); return; }
  if (k.key === 'spende') { S.gold += k.wert; return; }
  S.boni[k.key] = B(k.key) + k.wert;
  if (k.key === 'hpmax') { const neu = Math.round(S.hpBasis * (1 + B('hpmax') / 100)); S.hp += neu - S.hpMax; S.hpMax = neu; }
}

function welleFertig() {
  S.laeuft = false; stat('wellen');
  if (S.info.hf != null && S.welle >= 11) erfolg('b11');
  if (S.welle >= S.info.wellen) { S.ende = true; levelEnde(true); return; }
  let bonus = 15 + S.welle * 3, z = 0;
  for (const t of S.tuerme.values()) if (t.a === 'mine') { bonus += TUERME.mine.gold * (1 + 0.6 * (t.lv - 1)) + B('t_mine_extra'); if (spezAktiv(t)) z += 0.05; }
  bonus += Math.floor(S.gold * z); bonus = Math.round(bonus); S.gold += bonus; stat('gold', bonus); S.welle++;
  if (Math.floor(S.gold) === 42) erfolg('g42');
  S.effekte.push({ t: 1.6, art: 'ansage', text: 'Welle ' + (S.welle - 1) + ' geschafft | +' + bonus + ' Gold', hell: true });
  ton('muenze'); anzeige(); speichern();
  if (SP.opt.auto) S.autoT = 2.5;
}
function levelEnde(sieg) {
  blattZu(); $('ov-wahl').hidden = true; const info = S.info, L = info.L, hf = info.hf; let st = 0, bits = 0, extra = [];
  if (S.beute.bits) bitsDazu(S.beute.bits);
  if (sieg) {
    stat('siege'); const q = S.hp / S.hpMax; st = q >= 0.7 ? 3 : q >= 0.35 ? 2 : 1;
    if (hf != null) { const erst = !SP.herausf[hf]; stat('hf'); erfolg('haerte'); SP.herausf[hf] = 1;
      bits = erst ? 400 * (hf + 1) : 120 * (hf + 1); const it = neuesItem(erst ? (hf >= 1 ? 3 : 2) : Math.max(1, rollRar(1)));
      extra.push(RAR[it.r].n + ': ' + itemName(it)); }
    else { const erst = !SP.sterne[L]; bits = Math.round((25 + L * 6 + st * 10) * (erst ? 1 : 0.35));
      SP.sterne[L] = Math.max(SP.sterne[L] || 0, st); if (L >= SP.frei && L < MAXLV) SP.frei = L + 1;
      if (L % 5 === 0 && !SP.garantie[L]) { SP.garantie[L] = 1; const r = L >= 25 ? 3 : L >= 15 ? 2 : 1; const it = neuesItem(r); bits += 20 * L;
        extra.push('Garantiert: ' + RAR[r].n + ': ' + itemName(it)); }
      if (L === MAXLV) erfolg('kapitel'); }
    erfolg('erster'); if (!S.schaden) erfolg('fehlerfrei'); if (S.maxTuerme <= 3) erfolg('sparfuchs'); if (!S.faehigGenutzt) erfolg('handbetrieb'); if (S.tempo3 && SP.opt.tempo === 3) erfolg('zeitraffer');
    ton('sieg');
  } else { stat('niederlagen'); bits = (S.welle - 1) * 4 + Math.floor(S.kills / 8); ton('niederlage'); vib([100, 50, 100]); }
  if (sieg && kontoWert('bitsPlus')) bits = Math.round(bits * (1 + kontoWert('bitsPlus') / 100));
  if (sieg) kontoEP(L * 5);
  bitsDazu(bits); speichern();
  $('ende-et').textContent = (hf != null ? 'HÄRTETEST ' + (hf + 1) : 'LEVEL ' + L) + (sieg ? ' GESCHAFFT' : ' VERLOREN');
  $('ende-t').textContent = sieg ? (st === 3 ? 'Fehlerfrei kompiliert.' : 'Geschafft.') : 'Bluescreen.';
  $('ende-sterne').innerHTML = sieg ? [1, 2, 3].map((i) => `<span class="${i <= st ? 'an' : 'aus'}">■</span>`).join('') : '';
  $('ende-bits').textContent = '+' + (bits + S.beute.bits) + ' Bits';
  const beute = S.beute.items.map((it) => RAR[it.r].n + ': ' + itemName(it)).concat(extra);
  $('ende-p').innerHTML = (sieg ? `Bugs besiegt: ${S.kills} | Stufe ${S.stufe} erreicht` : `Welle ${S.welle} von ${info.wellen}. Die Bugs feiern. Kurz.`) +
    (beute.length ? '<br><b>Beute:</b> ' + beute.join('<br>') : '');
  const naechst = sieg && hf == null && L < MAXLV;
  $('ende-weiter').textContent = naechst ? 'Nächstes Level' : 'Zum Menü';
  $('ende-weiter').onclick = () => { $('ov-ende').hidden = true; if (naechst) { gewLv = L + 1; starteLevel(levelInfo(L + 1)); } else { S = null; menueZeigen(); } };
  $('ende-nochmal').onclick = () => { $('ov-ende').hidden = true; starteLevel(levelInfo(L, hf)); };
  $('ende-menue').hidden = !naechst; $('ende-menue').onclick = () => { $('ov-ende').hidden = true; S = null; gewLv = Math.min(L + (sieg ? 1 : 0), SP.frei, MAXLV); menueZeigen(); };
  $('ov-ende').hidden = false; meldungZeigen();
}
function levelVerlassen() { if (S && S.beute.bits) bitsDazu(S.beute.bits); stat('niederlagen'); S = null; speichern(); menueZeigen(); }

/* ---------- Bedienung im Level ---------- */
function blattZu() { $('blatt-bau').hidden = true; $('blatt-turm').hidden = true; if (S) { S.pad = null; S.bauWahl = null; S.schiebe = null; } }
for (const b of document.querySelectorAll('[data-zu]')) b.onclick = blattZu;
cv.addEventListener('pointerdown', (e) => {
  if (!S || S.ende) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / Z, y = (e.clientY - r.top) / Z;
  const i = PADS.findIndex((p) => x >= p.x - 0.1 && x <= p.x + 1.1 && y >= p.y - 0.1 && y <= p.y + 1.1);
  if (x > 0.3 && x < 1.6 && y > 13.4 && y < 14.7) { kaffeeTrinken(); return; }
  if (S.schiebe != null) { if (i >= 0 && i !== S.schiebe) verschieben(S.schiebe, i); else blattZu(); return; }
  if (i < 0) { blattZu(); return; } S.pad = i; S.bauWahl = null; ton('klick');
  if (S.tuerme.has(i)) turmBlatt(); else bauBlatt();
});
function kaffeeTrinken() {
  if (!S.kaffee || S.hp >= S.hpMax) { S.effekte.push({ x: 1, y: 13.3, t: 0.9, art: 'text', text: S.kaffee ? 'Festung ist voll' : 'Kein Kaffee' }); return; }
  S.kaffee--; const plus = Math.round(S.hpMax * KAFFEE_HEIL); S.hp = Math.min(S.hpMax, S.hp + plus);
  S.effekte.push({ x: 1, y: 13.3, t: 1, art: 'text', text: '+' + plus + ' HP' }); partikel(1, 13.9, 10, F.erfolg, 2); ton('faehig'); anzeige();
}
function verschieben(von, nach) {
  const t = S.tuerme.get(von), u = S.tuerme.get(nach);
  S.tuerme.delete(von); t.p = nach; S.tuerme.set(nach, t);
  if (u) { u.p = von; S.tuerme.set(von, u); }
  S.effekte.push({ x: PADS[nach].x + 0.5, y: PADS[nach].y + 0.5, t: 0.3, art: 'bau' }); ton('bau');
  S.schiebe = null; S.pad = nach; turmBlatt();
}
function turmDaten(id) { const t = TUERME[id];
  if (id === 'mine') return `<b>${t.n}</b> ${t.info}<br>Ertrag ${t.gold} Gold je Welle | Stufe 4: ${t.spez}`;
  const w = turmWerte({ a: id, lv: 1 });
  return `<b>${t.n}</b> ${t.info}<br>Atk. ${w.atk.toFixed(0)}${id === 'laser' ? '/s' : ''} | ${id === 'laser' ? 'Dauerstrahl' : 'Rate ' + w.rate.toFixed(1) + '/s'} | Reichw. ${w.rw.toFixed(1)} | Ziele: ${t.ziele.map((z) => z === 'luft' ? 'Luft' : 'Boden').join(' + ')}<br>Stufe 4: ${t.spez}`; }
function bauBlatt() { $('blatt-turm').hidden = true; const n = $('bauwahl'); n.innerHTML = '';
  for (const id in TUERME) { const t = TUERME[id], k = preis(t.k), b = document.createElement('button');
    if (!turmFrei(id)) { b.disabled = true; b.className = 'gesperrt-turm'; b.innerHTML = `<span class="ico blur">${svg('turm_' + id, 38)}</span><span class="n">${t.n}</span><span class="k">ab St. ${turmAb(id)}</span>`;
      b.title = 'Wird ab Spielerstufe ' + turmAb(id) + ' freigeschaltet.'; n.appendChild(b); continue; }
    b.className = S.bauWahl === id ? 'gewaehlt' : ''; b.disabled = S.gold < k;
    b.innerHTML = `${svg('turm_' + id, 38)}<span class="n">${t.n}</span><span class="k">${k}</span>`;
    b.onclick = () => { S.bauWahl = id; ton('klick'); bauBlatt(); };
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') $('bau-info').innerHTML = turmDaten(id); });
    b.addEventListener('pointerleave', () => { $('bau-info').innerHTML = S.bauWahl ? turmDaten(S.bauWahl) : 'Turm antippen, um zu sehen, was er kann.'; });
    n.appendChild(b); }
  const id = S.bauWahl;
  $('bau-info').innerHTML = id ? turmDaten(id) : 'Turm antippen, um zu sehen, was er kann.';
  $('bau-ok').hidden = !id; if (id) { const k = preis(TUERME[id].k); $('bau-ok').textContent = 'Bauen | ' + k + ' Gold'; $('bau-ok').disabled = S.gold < k; }
  $('blatt-bau').hidden = false; }
$('bau-ok').onclick = () => { const id = S.bauWahl; if (!id || S.pad == null) return; const k = preis(TUERME[id].k); if (S.gold < k) return;
  S.gold -= k; S.tuerme.set(S.pad, { a: id, p: S.pad, lv: 1, cd: 0, wert: k }); S.maxTuerme = Math.max(S.maxTuerme, S.tuerme.size); SP.gesehen.tuerme[id] = 1; stat('gebaut');
  S.effekte.push({ x: PADS[S.pad].x + 0.5, y: PADS[S.pad].y + 0.5, t: 0.3, art: 'bau' }); partikel(PADS[S.pad].x + 0.5, PADS[S.pad].y + 0.5, 8, F.erfolg, 2); ton('bau'); blattZu(); anzeige(); };
const aufKosten = (t) => preis(Math.round(TUERME[t.a].k * 0.75 * t.lv));
function turmBlatt() { const t = S.tuerme.get(S.pad); if (!t) return blattZu(); $('blatt-bau').hidden = true; const a = TUERME[t.a], w = turmWerte(t);
  $('t-name').textContent = a.n + ' | Stufe ' + t.lv;
  const nx = t.lv < TURM_MAX ? turmWerte({ a: t.a, lv: t.lv + 1 }) : null;
  $('t-info').innerHTML = (t.a === 'mine' ? `+${Math.round(a.gold * (1 + 0.6 * (t.lv - 1)) + B('t_mine_extra'))} Gold je Welle.` :
    `Atk. ${w.atk.toFixed(0)}${nx ? ' <span class="plus">-> ' + nx.atk.toFixed(0) + '</span>' : ''} | Rate ${w.rate.toFixed(1)}/s | Reichw. ${w.rw.toFixed(1)}`) +
    `<br>${spezAktiv(t) ? '<b>Aktiv:</b>' : '<b>Stufe 4:</b>'} ${a.spez}` ;
  const k = aufKosten(t); $('t-auf').textContent = t.lv >= TURM_MAX ? 'Maximum' : 'Ausbauen ' + k; $('t-auf').disabled = t.lv >= TURM_MAX || S.gold < k;
  $('t-schieb').setAttribute('aria-pressed', S.schiebe != null);
  $('t-weg').textContent = 'Verkaufen ' + Math.floor(t.wert * 0.6); $('blatt-turm').hidden = false; }
$('t-auf').onclick = () => { const t = S.tuerme.get(S.pad); if (!t) return; const k = aufKosten(t); if (t.lv >= TURM_MAX || S.gold < k) return; S.gold -= k; t.wert += k; t.lv++;
  stat('ausgebaut'); if (t.lv >= 5) erfolg('stufe5'); S.effekte.push({ x: PADS[t.p].x + 0.5, y: PADS[t.p].y + 0.5, t: 0.3, art: 'bau' }); partikel(PADS[t.p].x + 0.5, PADS[t.p].y + 0.5, 10, F.akzent, 2); ton('bau'); turmBlatt(); anzeige(); };
$('t-schieb').onclick = () => { if (S.pad == null) return; S.schiebe = S.pad; ton('klick'); $('blatt-turm').hidden = true;
  S.effekte.push({ t: 1.8, art: 'ansage', text: 'Ziel-Bauplatz antippen', hell: true }); };
$('t-weg').onclick = () => { const t = S.tuerme.get(S.pad); if (!t) return; S.gold += Math.floor(t.wert * 0.6); S.tuerme.delete(S.pad); stat('verkauft'); blattZu(); anzeige(); };
$('start').onclick = starteWelle;
function autoZeigen() { $('auto').setAttribute('aria-pressed', !!SP.opt.auto); }
$('auto').onclick = () => { SP.opt.auto = !SP.opt.auto; autoZeigen(); speichern(); ton('klick'); if (SP.opt.auto && S && !S.laeuft && S.welle > 1) S.autoT = 1; };
autoZeigen();
$('pause').onclick = () => { S.pause = true; $('ov-pause').hidden = false; };
$('weiter').onclick = () => { S.pause = false; $('ov-pause').hidden = true; };
$('aufgeben').onclick = () => { $('ov-pause').hidden = true; levelVerlassen(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.laeuft && !S.ende) { S.pause = true; $('ov-pause').hidden = false; } if (document.hidden) speichern(); });

/* ---------- Zeichnen ---------- */
function zeichneBug(b) {
  const gg = GEGNER[b.id], s = b.gr * Z * 2, bob = b.art === 'luft' ? Math.sin(b.phase) * 2 : Math.abs(Math.sin(b.phase * 0.8)) * -1.5;
  const x0 = b.x * Z - s / 2, y0 = b.y * Z - s / 2 + bob;
  if (b.unten) { g.globalAlpha = 0.55; for (let i = 0; i < 3; i++) kreis(g, x0 + s * (0.25 + i * 0.25), y0 + s * 0.75, s * 0.12, F.nebentext); g.globalAlpha = 1; return; }
  if (b.lahm > 0 || b.stop > 0 || S.held.frost > 0) rr(g, x0 - 3, y0 - 3, s + 6, s + 6, s * 0.3, F.eisblau);
  if (b.giftT > 0) rr(g, x0 - 3, y0 - 3, s + 6, s + 6, s * 0.3, null, F.erfolg, 2);
  bild(g, gg.bild, x0, y0, s, false, b.treffT > 0 ? F.linie : null, GEGNER_FARBE[b.id]);
  if (b.schild > 0) rr(g, x0 - 4, y0 - 4, s + 8, s + 8, s * 0.3, null, F.text, 2);
  if (b.hp < b.max) { const bw = Math.max(s, Z * 0.5), bx = b.x * Z - bw / 2;
    rr(g, bx, y0 - 8, bw, 4, 2, F.linie); rr(g, bx, y0 - 8, bw * Math.max(0, b.hpAnz / b.max), 4, 2, gg.boss ? F.akzent : F.fehler); }
}
function zeichneFestung() {
  const h = S.held, muster = [1, 0, 1, 1];
  /* Mauer aus Bits */
  for (let i = 0; i < W * 2; i++) rr(g, i * Z / 2 + 2, WAND * Z, Z / 2 - 4, Z * 0.36, 3, muster[i % 4] ? F.text : F.akzent);
  /* Schreibtisch */
  rr(g, 0, (WAND + 0.5) * Z, W * Z, (H - WAND - 0.5) * Z + 12, 12, F.flaeche, F.linie, 1);
  const q = Math.max(0, S.hp / S.hpMax); rr(g, Z * 0.4, (WAND + 0.68) * Z, W * Z - Z * 0.8, 7, 4, F.linie); rr(g, Z * 0.4, (WAND + 0.68) * Z, (W * Z - Z * 0.8) * q, 7, 4, q > 0.35 ? F.erfolg : F.fehler);
  if (h.schild > 0) rr(g, 2, (WAND - 0.15) * Z, W * Z - 4, Z * 0.66, 8, null, F.akzent, 3);
  /* Monitor rechts hinten mit Code */
  const mx = 5.25 * Z, my = 13.0 * Z, mw = 3.1 * Z, mh = 1.55 * Z;
  rr(g, mx, my, mw, mh, 8, F.text); rr(g, mx + Z * 0.12, my + Z * 0.12, mw - Z * 0.24, mh - Z * 0.24, 5, S.frierT > 0 ? F.lavendel : F.eisblau);
  const zeilen = [[0.2, 1.1, 'text'], [0.4, 1.6, 'akzent'], [0.4, 0.9, 'text'], [0.2, 1.3, 'nebentext'], [0.6, 1.0, 'akzent']];
  const scroll = reduziert ? 0 : Math.floor(S.t * 2) % zeilen.length;
  for (let i = 0; i < 4; i++) { const zl = zeilen[(i + scroll) % zeilen.length]; rr(g, mx + Z * (0.25 + zl[0]), my + Z * (0.28 + i * 0.27), Z * zl[1], Z * 0.12, 3, F[zl[2]]); }
  if (!reduziert && S.t % 1 < 0.55) g.fillStyle = F.akzent, g.fillRect(mx + Z * 2.3, my + Z * 1.1, Z * 0.25, Z * 0.1);
  rr(g, mx + mw / 2 - Z * 0.15, my + mh, Z * 0.3, Z * 0.2, 2, F.text); rr(g, mx + mw / 2 - Z * 0.6, my + mh + Z * 0.18, Z * 1.2, Z * 0.12, 3, F.text);
  /* Kaffeetasse links */
  const kx = 0.5 * Z, ky = 13.6 * Z; if (svgFertig('sym_kaffee')) g.drawImage(IMG.sym_kaffee, kx - Z * 0.05, ky - Z * 0.05, Z * 0.85, Z * 0.85);
  if (!reduziert) { g.globalAlpha = 0.5; for (let i = 0; i < 2; i++) { const d = (S.t * 0.6 + i * 0.5) % 1; kreis(g, kx + Z * (0.2 + i * 0.2) + Math.sin(d * 6) * 2, ky - d * Z * 0.6, 2.5 * (1 - d), F.nebentext); } g.globalAlpha = 1; }
  for (let i = 0; i < S.kaffeeMax; i++) kreis(g, kx + Z * (0.1 + i * 0.22), ky + Z * 0.85, Z * 0.07, i < S.kaffee ? F.akzent : F.linie);
  if (S.kaffee && S.hp < S.hpMax * 0.6 && !reduziert) { g.globalAlpha = 0.5 + 0.5 * Math.sin(S.t * 6); rr(g, kx - 5, ky - 5, Z * 0.95, Z * 0.75, 8, null, F.akzent, 2); g.globalAlpha = 1; }
  /* Held groß vor der Tastatur */
  const hs = 1.45 * Z, hx = HELD_X * Z - hs / 2, hy = 12.85 * Z + (reduziert ? 0 : Math.sin(S.t * 3) * 1.5) - (h.schuss > 0 ? 2 : 0);
  if (h.turbo > 0 || h.sudo > 0 || h.frost > 0) { g.globalAlpha = 0.35 + 0.2 * Math.sin(S.t * 10); kreis(g, HELD_X * Z, hy + hs / 2, hs * 0.72, F.akzent); g.globalAlpha = 1; }
  bild(g, HELDEN[h.id].bild, hx, hy, hs, !reduziert && S.t % 1 > 0.6);
  /* Tastatur vor dem Helden */
  const tx = 3.3 * Z, ty = 14.25 * Z, tw = 2.4 * Z, th = 0.5 * Z; rr(g, tx, ty, tw, th, 6, F.text);
  for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) { const tipp = !reduziert && S.laeuft && ((Math.floor(S.t * 8) + i * 3 + r) % 11 === 0);
    rr(g, tx + Z * 0.14 + i * Z * 0.24, ty + Z * 0.08 + r * Z * 0.2 + (tipp ? 1 : 0), Z * 0.18, Z * 0.13, 2, tipp ? F.akzent : F.flaeche); }
}
function text(t, x, y, gr, f, mono, w) { g.fillStyle = f; g.font = `${w || 700} ${gr}px ${mono ? '"JetBrains Mono", Consolas, monospace' : 'Lexend, "Segoe UI", Arial, sans-serif'}`; g.textAlign = 'center'; g.fillText(t, x, y); }
function zeichnen() {
  if (!S) return; const bg = [F.eisblau, F.lavendel, F.aprikose][S.info.kap];
  g.save(); if (S.wackel > 0 && !reduziert) g.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
  g.fillStyle = F.grund; g.fillRect(-4, -4, W * Z + 8, H * Z + 8);
  for (const x of BAHNEN) { rr(g, (x - 0.38) * Z, -Z * 0.3, Z * 0.76, (WAND + 0.3) * Z, Z * 0.38, bg); }
  /* Bauplätze */
  PADS.forEach((p, i) => { if (S.tuerme.has(i)) return; const ziel = S.schiebe != null;
    rr(g, p.x * Z + 4, p.y * Z + 4, Z - 8, Z - 8, Z * 0.22, ziel ? F.aprikose : F.flaeche, S.pad === i || ziel ? F.akzent : F.linie, S.pad === i ? 2.5 : 1.5);
    g.fillStyle = F.linie; g.fillRect((p.x + 0.46) * Z, (p.y + 0.32) * Z, Z * 0.08, Z * 0.36); g.fillRect((p.x + 0.32) * Z, (p.y + 0.46) * Z, Z * 0.36, Z * 0.08); });
  /* Reichweite: ausgewählter Turm oder Bauvorschau */
  let rwT = S.pad != null && S.tuerme.get(S.pad); let rwP = rwT ? PADS[rwT.p] : null, rw = rwT && TUERME[rwT.a].rw ? turmWerte(rwT).rw : 0;
  if (!rwT && S.bauWahl && S.pad != null) { rwP = PADS[S.pad]; rw = turmWerte({ a: S.bauWahl, lv: 1 }).rw; }
  if (rwP && rw) { g.globalAlpha = 0.12; kreis(g, (rwP.x + 0.5) * Z, (rwP.y + 0.5) * Z, rw * Z, F.akzent); g.globalAlpha = 1;
    g.strokeStyle = F.akzent; g.setLineDash([5, 5]); g.lineWidth = 1.5; g.beginPath(); g.arc((rwP.x + 0.5) * Z, (rwP.y + 0.5) * Z, rw * Z, 0, 7); g.stroke(); g.setLineDash([]); }
  for (const f of S.feuer) { g.globalAlpha = Math.min(0.8, f.t * 0.5); kreis(g, f.x * Z, f.y * Z, 0.65 * Z, F.aprikose); g.globalAlpha = 1; }
  for (const t of S.tuerme.values()) { const p = PADS[t.p], ts = Z * 0.9;
    zeichneTurm(g, t.a, (p.x + 0.5) * Z, (p.y + 0.5) * Z, ts, t.lv, { eis: S.frierT > 0, rueck: t.rueck > 0, spez: B('t_' + t.a + '_spez') > 0 && t.lv < 4 });
    if (S.pad === t.p || S.schiebe === t.p) rr(g, p.x * Z + 1, p.y * Z + 1, Z - 2, Z - 2, Z * 0.25, null, F.akzent, 2.5);
    if (t.strahl && t.strahl.hp > 0) { g.strokeStyle = F.akzent; g.lineCap = 'round'; g.lineWidth = spezAktiv(t) ? 5 : 3; g.globalAlpha = 0.85; g.beginPath(); g.moveTo((p.x + 0.5) * Z, (p.y + 0.2) * Z); g.lineTo(t.strahl.x * Z, t.strahl.y * Z); g.stroke(); g.globalAlpha = 1; g.lineCap = 'butt'; } }
  for (const b of S.bugs) if (b.art !== 'luft') zeichneBug(b);
  for (const b of S.bugs) if (b.art === 'luft') zeichneBug(b);
  for (const s of S.schuesse) { const r = s.a === 'kanone' ? Z * 0.13 : s.held ? Z * 0.1 : Z * 0.075, f = s.frost ? F.eisblau : s.a === 'kanone' ? F.text : F.akzent;
    s.spur.forEach(([x, y], i) => { g.globalAlpha = (i + 1) / 10; kreis(g, x * Z, y * Z, r * (0.5 + i * 0.1), f); }); g.globalAlpha = 1;
    kreis(g, s.x * Z, s.y * Z, r, f); if (s.frost) { g.strokeStyle = F.text; g.lineWidth = 1; g.beginPath(); g.arc(s.x * Z, s.y * Z, r, 0, 7); g.stroke(); } }
  for (const p of S.partikel) { g.globalAlpha = Math.min(1, p.t * 2); kreis(g, p.x * Z, p.y * Z, p.gr * Z, p.f); } g.globalAlpha = 1;
  zeichneFestung();
  for (const e of S.effekte) {
    if (e.art === 'boom') { const k = 1 - e.t / 0.8, r = (e.r || 0.5) * Z * (0.3 + k); g.globalAlpha = e.t * 1.5; g.strokeStyle = F.akzent; g.lineWidth = 3; g.beginPath(); g.arc(e.x * Z, e.y * Z, r, 0, 7); g.stroke(); g.globalAlpha = 1; }
    if (e.art === 'blitz') { g.strokeStyle = F.akzent; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); g.moveTo(e.x * Z, e.y * Z);
      g.lineTo((e.x * 2 + e.x2) / 3 * Z + 5, (e.y * 2 + e.y2) / 3 * Z - 4); g.lineTo((e.x + e.x2 * 2) / 3 * Z - 5, (e.y + e.y2 * 2) / 3 * Z + 4); g.lineTo(e.x2 * Z, e.y2 * Z); g.stroke(); }
    if (e.art === 'gold') { g.globalAlpha = Math.min(1, e.t * 2); text('+' + e.w, e.x * Z, (e.y - (0.7 - e.t) * 0.8) * Z, Math.round(Z * 0.28), F.nebentext, true); g.globalAlpha = 1; }
    if (e.art === 'text') { g.globalAlpha = Math.min(1, e.t * 2); text(e.text, e.x * Z, (e.y - (1 - e.t) * 0.6) * Z, Math.round(Z * 0.34), F.akzent); g.globalAlpha = 1; }
    if (e.art === 'treffer') { g.globalAlpha = Math.min(1, e.t * 2); kreis(g, e.x * Z, WAND * Z + Z * 0.2, Z * 0.35, F.fehler); g.globalAlpha = 1; }
    if (e.art === 'bau') { const r = Z * 0.55 * (1 + (0.3 - e.t)); g.globalAlpha = e.t * 3; rr(g, e.x * Z - r, e.y * Z - r, r * 2, r * 2, r * 0.4, null, F.erfolg, 2.5); g.globalAlpha = 1; }
    if (e.art === 'licht' && !reduziert) { g.fillStyle = F.akzent; g.globalAlpha = e.t * 0.2; g.fillRect(0, 0, W * Z, H * Z); g.globalAlpha = 1; }
    if (e.art === 'blau' && !reduziert) { g.fillStyle = F.eisblau; g.globalAlpha = e.t * 0.7; g.fillRect(0, 0, W * Z, H * Z); g.globalAlpha = 1; }
    if (e.art === 'ansage') { const a = Math.min(1, e.t * 2, (1.8 - e.t) * 4); g.globalAlpha = a; rr(g, Z * 0.5, H * Z * 0.36, W * Z - Z, Z * 1.1, Z * 0.55, e.hell ? F.flaeche : F.text, e.hell ? F.akzent : null, 2);
      text(e.text, W * Z / 2, H * Z * 0.36 + Z * 0.7, Math.round(Z * (e.text.length > 24 ? 0.32 : 0.42)), e.hell ? F.text : F.grund, true); g.globalAlpha = 1; }
  }
  if (!S.laeuft && !S.ende && !S.tuerme.size) { text('Bauplatz antippen, Turm bauen.', W * Z / 2, Z * 1.5, Math.round(Z * 0.34), F.nebentext, false, 600); text('Kaffeetasse antippen: heilt die Festung.', W * Z / 2, Z * 2.05, Math.round(Z * 0.26), F.nebentext, false, 400); }
  g.restore();
}

/* ---------- Tastenkürzel (Desktop) ---------- */
document.addEventListener('keydown', (e) => {
  if (!S || $('spiel').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (!$('ov-wahl').hidden) { const n = +k; if (n >= 1 && n <= 3) { const b = $('wahl').children[n - 1]; if (b) { e.preventDefault(); b.click(); } } return; }
  if (!$('ov-pause').hidden) { if (k === 'escape' || k === 'p') { e.preventDefault(); $('weiter').click(); } return; }
  if (!$('ov-ende').hidden || !$('ov-meldung').hidden) return;
  if (k === ' ') { e.preventDefault(); starteWelle(); }
  else if (k === 'f') faehigkeit();
  else if (k === 'k') kaffeeTrinken();
  else if (k === 'a') $('auto').click();
  else if (k === '1' || k === '2' || k === '3') { SP.opt.tempo = +k; if (k !== '3') S.tempo3 = false; tempoZeigen(); speichern(); }
  else if (k === 'p') $('pause').click();
  else if (k === 'escape') { if (!$('blatt-bau').hidden || !$('blatt-turm').hidden || S.schiebe != null) blattZu(); else $('pause').click(); }
});
