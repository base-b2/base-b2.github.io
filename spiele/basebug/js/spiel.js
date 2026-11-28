/* BaseBug | Spiel: Spielfeld, Wellen, Türme, Held, Bosse, Drops. */
'use strict';
const $ = (id) => document.getElementById(id);
const reduziert = matchMedia('(prefers-reduced-motion: reduce)').matches;
let F = {};
function farben() { const s = getComputedStyle(document.documentElement);
  for (const k of ['grund', 'flaeche', 'text', 'nebentext', 'akzent', 'lavendel', 'aprikose', 'eisblau', 'erfolg', 'fehler', 'linie']) F[k] = s.getPropertyValue('--bb-' + k).trim(); }

/* ---------- Pixelbilder ---------- */
function bild(c, b, x, y, s, blink) {
  const n = b.length, u = s / n, m = { T: F.text, A: F.akzent, G: F.grund, P: F.aprikose, E: F.eisblau, L: F.lavendel };
  for (let r = 0; r < n; r++) for (let k = 0; k < b[r].length; k++) {
    const ch = b[r][k]; if (ch === '.' || (ch === 'A' && blink)) continue;
    c.fillStyle = m[ch]; c.fillRect(x + k * u, y + r * u, u + 0.5, u + 0.5);
  }
}
function zeichneTurm(c, a, cx, cy, s, lv, eis) {
  const u = s / 9, o = (x, y, f, w = 1, h = 1) => { c.fillStyle = f; c.fillRect(cx - s / 2 + x * u, cy - s / 2 + y * u, w * u + 0.5, h * u + 0.5); };
  const t = F.text, ak = F.akzent;
  o(1, 1, eis ? F.eisblau : F[TUERME[a].farbe], 7, 7); c.strokeStyle = t; c.lineWidth = Math.max(1, u * 0.5); c.strokeRect(cx - s / 2 + u, cy - s / 2 + u, 7 * u, 7 * u);
  if (a === 'pfeil') { o(3, 3, t, 3, 3); o(4, 1, ak, 1, 3); }
  if (a === 'kanone') { o(2, 3, t, 5, 4); o(3.5, 1, t, 2, 3); o(4, 4, ak, 1, 1); }
  if (a === 'frost') { o(4, 2, t, 1, 5); o(2, 4, t, 5, 1); o(3, 3, t); o(5, 3, t); o(3, 5, t); o(5, 5, t); o(4, 4, ak); }
  if (a === 'flak') { o(2, 5, t, 5, 2); o(2.5, 2, t, 1, 3); o(5.5, 2, t, 1, 3); o(2.5, 1.5, ak, 1, 1); o(5.5, 1.5, ak, 1, 1); }
  if (a === 'blitz') { o(5, 2, t); o(4, 3, t); o(3, 4, t, 3, 1); o(4, 5, t); o(3, 6, t); o(5, 4, ak); }
  if (a === 'laser') { o(3, 4, t, 3, 3); o(4, 1, t, 1, 3); o(4, 0.5, ak, 1, 1); }
  if (a === 'mine') { o(2, 5, t, 5, 2); o(3, 3, ak, 1, 2); o(5, 3, ak, 1, 2); o(4, 2, ak, 1, 1); }
  for (let i = 0; i < lv; i++) o(1.5 + i * 1.3, 8.2, i >= 3 ? ak : t, 0.9, 0.7);
}

/* ---------- Spielfeld ---------- */
const W = 9, H = 15, WAND = 12.4;
const PADS = []; for (const y of [3, 5, 7, 9, 11]) for (const x of [1, 3, 5, 7]) PADS.push({ x, y });
const BAHNEN = [0.5, 2.5, 4.5, 6.5, 8.5];
const cv = $('feld'), g = cv.getContext('2d'); let Z = 40;
function groesse() { const b = $('buehne').getBoundingClientRect(); Z = Math.max(10, Math.floor(Math.min((b.width - 14) / W, (b.height - 14) / H))); const d = devicePixelRatio || 1;
  cv.width = W * Z * d; cv.height = H * Z * d; cv.style.width = W * Z + 'px'; cv.style.height = H * Z + 'px'; g.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', () => { if (!$('spiel').hidden) groesse(); });

const gruppe = (b) => b.art === 'luft' ? 'luft' : 'boden';
let S = null;
function levelInfo(L, hf) {
  if (hf != null) return { L: (hf + 1) * 10, wellen: 20, hf, mult: HAERTE.mult, kap: hf };
  return { L, wellen: 10, hf: null, mult: 1, kap: Math.min(2, Math.floor((L - 1) / 10)) };
}
function starteLevel(info) {
  const hw = heldWerte(), h = HELDEN[SP.held], b = ausrBonus();
  const hp = Math.round(100 + b.netzteil);
  S = { info, welle: 1, gold: 120, hp, hpMax: hp, tuerme: new Map(), bugs: [], schuesse: [], effekte: [], feuer: [], laeuft: false, spawn: [], pause: false, ende: false,
    mod: { tatk: 1 + b.kopfhoerer / 100, trate: 1, rw: 0, hatk: 1, hrate: 1, krit: 0, gold: 1, zins: 0, cd: 1 },
    pad: null, kills: 0, t: 0, frierT: 0, beute: { bits: 0, items: [] }, schaden: false, faehigGenutzt: false, maxTuerme: 0, tempo3: true,
    held: { id: SP.held, atk: hw.atk, rate: hw.rate, krit: hw.krit, cdMax: h.f.cd, cd: 5, schild: 0, turbo: 0, sudo: 0, frost: 0, feuer: 0 } };
  $('menue').hidden = true; $('spiel').hidden = false;
  const fb = $('faehig-bild').getContext('2d'); fb.clearRect(0, 0, 56, 56); bild(fb, h.bild, 0, 0, 56); $('faehig-name').textContent = h.f.n;
  $('s-level').textContent = info.hf != null ? 'HÄRTETEST ' + (info.hf + 1) : 'LEVEL ' + info.L;
  tempoZeigen(); groesse(); blattZu(); anzeige();
}
function anzeige() { if (!S) return;
  $('s-welle').textContent = 'Welle ' + Math.min(S.welle, S.info.wellen) + '/' + S.info.wellen + (S.welle % 5 === 0 ? ' | Boss' : '');
  $('s-gold').textContent = Math.floor(S.gold); $('s-hp').textContent = Math.max(0, Math.ceil(S.hp));
  $('start').disabled = S.laeuft; $('start').textContent = S.laeuft ? 'Welle läuft ...' : (S.welle % 5 === 0 ? 'Boss-Welle ' : 'Welle ') + S.welle + ' starten';
  const h = S.held; $('faehig-cd').style.height = (h.cd > 0 ? Math.min(1, h.cd / (h.cdMax * S.mod.cd)) * 100 : 0) + '%'; $('faehig').disabled = h.cd > 0 || !S.laeuft; }
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
  S.bugs.push({ id, art: gg.art, x, y, wx: x, hp, max: hp, schild: id === 'schild' ? hp * 0.5 : 0, schildMax: id === 'schild' ? hp * 0.5 : 0,
    atk: gg.atk * fa * (gg.boss ? BOSSMULT[w] || 1 : 1), v: gg.v * (1 + L * 0.008), gr: gg.gr, gold: gg.gold * (1 + 0.05 * (L - 1)),
    lahm: 0, stop: 0, phase: Math.random() * 6, t: 0, ft: 0, ft2: 0, dir: Math.random() < 0.5 ? -1 : 1, unten: false, beiss: 0 });
  if (gg.boss) { S.effekte.push({ t: 1.6, art: 'ansage', text: gg.n }); }
}

/* ---------- Kampf ---------- */
function turmWerte(t) { const a = TUERME[t.a], l = t.lv, s = S.held.sudo > 0 ? 2 : 1;
  return { atk: a.atk * S.mod.tatk * Math.pow(WACHS.turm, l - 1) * s, rate: a.rate * S.mod.trate * (1 + 0.1 * (l - 1)) * s, rw: a.rw ? a.rw + S.mod.rw + 0.15 * (l - 1) : 0 }; }
function schaden(b, d, quelle) {
  if (b.hp <= 0) return;
  if (b.schild > 0) { const ab = Math.min(b.schild, d); b.schild -= ab; d -= ab; }
  b.hp -= d; stat(quelle === 'held' ? 'dmg_held' : 'dmg_turm', Math.round(d));
}
function ziel(x, y, rw, ziele, aus) { let z = null, best = -9;
  for (const b of S.bugs) { if (b.hp <= 0 || b.unten || (aus && aus.has(b)) || !ziele.includes(gruppe(b))) continue;
    if (Math.hypot(b.x - x, b.y - y) <= rw && b.y > best) { best = b.y; z = b; } }
  return z; }
function kette(von, z, atk, n, ziele, quelle) { const ge = new Set(); let akt = z;
  for (let i = 0; i < n && akt; i++) { ge.add(akt); schaden(akt, atk, quelle); S.effekte.push({ x: von.x, y: von.y, x2: akt.x, y2: akt.y, t: 0.15, art: 'blitz' }); von = akt;
    let nx = null, nb = 1.8; for (const b of S.bugs) { if (b.hp > 0 && !b.unten && !ge.has(b) && ziele.includes(gruppe(b))) { const d = Math.hypot(b.x - akt.x, b.y - akt.y); if (d < nb) { nb = d; nx = b; } } } akt = nx; } }

function schritt(dt) {
  S.t += dt; const h = S.held, L = S.info.L;
  if (S.laeuft) { S.zeit += dt; while (S.spawn.length && S.spawn[0].t <= S.zeit) erzeuge(S.spawn.shift().a); }
  if (S.laeuft && h.cd > 0) h.cd -= dt;
  for (const k of ['schild', 'turbo', 'sudo', 'frost']) if (h[k] > 0) h[k] -= dt;
  if (S.frierT > 0) S.frierT -= dt;
  /* Bugs bewegen */
  for (const b of S.bugs) {
    b.phase += dt * 8; b.t += dt; b.lahm -= dt; b.stop -= dt;
    const gg = GEGNER[b.id];
    if (gg.boss) { b.ft += dt; b.ft2 += dt;
      if ((b.id === 'speicherleck' && b.ft > 3) || (b.id === 'kernel' && b.ft > 4)) { b.ft = 0; if (S.bugs.length < 60) erzeuge('mini', b.x, b.y + 0.3); }
      if ((b.id === 'bluescreen' && b.ft2 > 7) || (b.id === 'kernel' && b.ft2 > 9)) { b.ft2 = 0; S.frierT = 1.5; S.effekte.push({ t: 0.6, art: 'blau' }); } }
    if (h.frost > 0 || b.stop > 0) continue;
    const v = b.v * (b.lahm > 0 ? 0.5 : 1);
    if (b.id === 'ente') { b.x += b.dir * 0.9 * dt; if (b.x < 0.4 || b.x > 8.6) b.dir *= -1; b.y += 0.35 * dt;
      if (b.y > WAND - 1.2) { b.weg = true; S.effekte.push({ x: b.x, y: b.y, t: 0.8, art: 'text', text: 'Quak!' }); ton('quak'); } continue; }
    if (b.art === 'tunnel') b.unten = (b.t % 3.2) > 2.1 && b.y < WAND - 1;
    if (b.y < WAND - b.gr) {
      b.y += v * (b.unten ? 1.4 : 1) * dt;
      if (b.id === 'schleife') b.x = 4.5 + Math.sin(b.t * 1.1) * 3.8;
      else if (b.art === 'luft') b.x = b.wx + Math.sin(b.t * 2) * 0.45;
      else b.x = b.wx + Math.sin(b.phase * 0.15) * 0.1;
    } else { b.unten = false; b.beiss += dt;
      if (b.beiss >= 1) { b.beiss = 0; if (h.schild <= 0) { S.hp -= b.atk; S.schaden = true; S.effekte.push({ x: b.x, y: WAND, t: 0.3, art: 'treffer' }); vib(30); } } }
  }
  /* Held */
  h.feuer -= dt;
  if (h.feuer <= 0) { const hx = 4.5, hy = 13.2, z = ziel(hx, hy, 99, ['boden', 'luft']);
    if (z) { const HD = HELDEN[h.id]; h.feuer = 1 / (h.rate * S.mod.hrate * (h.turbo > 0 ? 4 : 1));
      let atk = h.atk * S.mod.hatk; const krit = Math.random() < h.krit + S.mod.krit; if (krit) { atk *= 2; stat('krit'); }
      if (HD.art === 'kette') kette({ x: hx, y: hy }, z, atk, HD.kette, ['boden', 'luft'], 'held');
      else S.schuesse.push({ x: hx, y: hy, z, atk, fl: HD.fl, frost: HD.art === 'frost', v: 11, held: true, krit }); } }
  /* Türme */
  for (const t of S.tuerme.values()) {
    const a = TUERME[t.a]; if (!a.rw) continue; t.strahl = null; if (S.frierT > 0) continue;
    const w = turmWerte(t), tx = PADS[t.p].x + 0.5, ty = PADS[t.p].y + 0.5; t.cd -= dt;
    if (t.a === 'laser') { const z = ziel(tx, ty, w.rw, a.ziele); t.strahl = z; if (!z) continue;
      if (t.lv >= 4) { const dx = z.x - tx, dy = z.y - ty, l = Math.hypot(dx, dy) || 1;
        for (const b of S.bugs) { if (b.unten) continue; const q = ((b.x - tx) * dx + (b.y - ty) * dy) / l; if (q < 0 || q > w.rw) continue;
          if (Math.abs((b.x - tx) * dy - (b.y - ty) * dx) / l < 0.4) schaden(b, w.atk * w.rate * dt, 'turm'); } }
      else schaden(z, w.atk * w.rate * dt, 'turm'); continue; }
    if (t.cd > 0) continue; const z = ziel(tx, ty, w.rw, a.ziele); if (!z) continue; t.cd = 1 / w.rate;
    if (t.a === 'blitz') { kette({ x: tx, y: ty }, z, w.atk, t.lv >= 4 ? 5 : 3, a.ziele, 'turm'); continue; }
    S.schuesse.push({ x: tx, y: ty, z, atk: w.atk, fl: a.fl || (t.a === 'flak' && t.lv >= 4 ? 0.8 : 0), flZiele: a.ziele, frost: t.a === 'frost', eis: t.a === 'frost' && t.lv >= 4,
      brand: t.a === 'kanone' && t.lv >= 4, v: t.a === 'kanone' ? 6 : 10, a: t.a });
    if (t.a === 'pfeil' && t.lv >= 4) { const z2 = ziel(tx, ty, w.rw, a.ziele, new Set([z])); if (z2) S.schuesse.push({ x: tx, y: ty, z: z2, atk: w.atk, v: 10, a: 'pfeil' }); }
  }
  /* Geschosse */
  for (const s of S.schuesse) { const dx = s.z.x - s.x, dy = s.z.y - s.y, d = Math.hypot(dx, dy); const q = s.held ? 'held' : 'turm';
    if (d < 0.2 || (s.z.hp <= 0 && d < 0.6) || s.z.weg) { s.weg = true;
      if (s.z.unten) continue;
      if (s.fl) { for (const b of S.bugs) if (!b.unten && Math.hypot(b.x - s.z.x, b.y - s.z.y) <= s.fl && (!s.flZiele || s.flZiele.includes(gruppe(b)))) schaden(b, s.atk, q);
        S.effekte.push({ x: s.z.x, y: s.z.y, t: 0.35, art: 'boom', r: s.fl });
        if (s.brand) S.feuer.push({ x: s.z.x, y: s.z.y, t: 2, atk: s.atk * 0.4 }); }
      else { schaden(s.z, s.atk, q); if (s.frost) { s.z.lahm = 1.6; if (s.eis && Math.random() < 0.2) s.z.stop = 1; } }
      if (s.krit) S.effekte.push({ x: s.z.x, y: s.z.y - 0.3, t: 0.5, art: 'text', text: 'Krit' });
      continue; }
    s.x += dx / d * s.v * dt; s.y += dy / d * s.v * dt; }
  S.schuesse = S.schuesse.filter((s) => !s.weg);
  for (const f of S.feuer) { f.t -= dt; for (const b of S.bugs) if (b.art !== 'luft' && !b.unten && Math.hypot(b.x - f.x, b.y - f.y) < 0.7) schaden(b, f.atk * dt, 'turm'); }
  S.feuer = S.feuer.filter((f) => f.t > 0);
  /* Besiegte */
  for (const b of S.bugs) if (b.hp <= 0 && !b.tot) besiegt(b);
  S.bugs = S.bugs.filter((b) => !b.tot && !b.weg);
  for (const e of S.effekte) e.t -= dt; S.effekte = S.effekte.filter((e) => e.t > 0);
  if (S.hp <= 0 && !S.ende) { S.ende = true; levelEnde(false); }
  else if (S.laeuft && !S.spawn.length && !S.bugs.length && !S.ende) welleFertig();
}
function besiegt(b) {
  b.tot = true; const gg = GEGNER[b.id], L = S.info.L, w = S.welle;
  const gd = Math.round(b.gold * S.mod.gold); S.gold += gd; S.kills++;
  stat('kills'); stat('gold', gd); if (b.art === 'luft') stat('kills_luft');
  if (gg.boss) stat('bosse'); if (b.id === 'ente') { stat('enten'); erfolg('ente'); ton('quak'); }
  SP.gesehen.gegner[b.id] = 1;
  S.effekte.push({ x: b.x, y: b.y, t: 0.6, art: 'gold', w: gd });
  if (b.id === 'virus') { erzeuge('mini', b.x - 0.25, b.y); erzeuge('mini', b.x + 0.25, b.y); }
  if (gg.boss) { S.effekte.push({ x: b.x, y: b.y, t: 0.8, art: 'boom', r: 1.5 }); vib(120); }
  /* Drops */
  const hfBonus = S.info.hf != null ? 0.5 : 0;
  let bits = 0, rar = null;
  if (b.id === 'ente') { bits = 30 + L * 2; rar = Math.max(1, rollRar(0.6 + hfBonus)); }
  else if (gg.boss) { bits = Math.round((20 + L * 3) * (w >= 10 ? 2 : 1)); const ch = { 5: 0.3, 10: 0.65, 15: 0.5, 20: 1 }[w] || 0.3;
    if (Math.random() < ch) rar = rollRar((w >= 10 ? 1 : 0.5) + hfBonus); }
  else { if (Math.random() < 0.03) bits = 3 + L; if (Math.random() < 0.004) rar = Math.min(1, rollRar(0)); }
  if (bits) { S.beute.bits += bits; S.effekte.push({ x: b.x, y: b.y + 0.4, t: 1, art: 'text', text: '+' + bits + ' Bits' }); ton('muenze'); }
  if (rar != null) { const it = neuesItem(rar); S.beute.items.push(it); S.effekte.push({ x: b.x, y: b.y - 0.5, t: 1.4, art: 'text', text: RAR[rar].n + '!' }); ton('drop'); vib(60); }
}
function faehigkeit() { const h = S.held; if (h.cd > 0 || !S.laeuft) return; h.cd = h.cdMax * S.mod.cd; S.faehigGenutzt = true; stat('faehig');
  if (h.id === 'bit') { S.hp = Math.min(S.hpMax, S.hp + S.hpMax * 0.3); h.schild = 3; }
  if (h.id === 'pixel') h.turbo = 5;
  if (h.id === 'cache') h.frost = 3;
  if (h.id === 'root') h.sudo = 6;
  if (h.id === 'byte') { let best = null, bn = -1; for (const b of S.bugs) { if (b.unten) continue; let n = 0; for (const c of S.bugs) if (Math.hypot(b.x - c.x, b.y - c.y) < 1.8) n++; if (n > bn) { bn = n; best = b; } }
    if (best) { const x = best.x, y = best.y; for (const b of S.bugs) if (!b.unten && Math.hypot(b.x - x, b.y - y) < 1.8) schaden(b, h.atk * S.mod.hatk * 10, 'held'); S.effekte.push({ x, y, t: 0.6, art: 'boom', r: 1.8 }); } }
  S.effekte.push({ t: 0.5, art: 'licht' }); ton('faehig'); vib(40); anzeige(); }
$('faehig').onclick = faehigkeit;

function welleFertig() {
  S.laeuft = false; stat('wellen');
  if (S.info.hf != null && S.welle >= 11) erfolg('b11');
  if (S.welle >= S.info.wellen) { S.ende = true; levelEnde(true); return; }
  let bonus = 15 + S.welle * 3, z = S.mod.zins;
  for (const t of S.tuerme.values()) if (t.a === 'mine') { bonus += TUERME.mine.gold * (1 + 0.6 * (t.lv - 1)); if (t.lv >= 4) z += 0.05; }
  bonus += Math.floor(S.gold * z); bonus = Math.round(bonus); S.gold += bonus; stat('gold', bonus); S.welle++;
  if (Math.floor(S.gold) === 42) erfolg('g42');
  const w = $('wahl'); w.innerHTML = ''; $('wahl-et').textContent = 'WELLE ' + (S.welle - 1) + ' GESCHAFFT | +' + bonus + ' GOLD';
  for (const k of [...KARTEN].sort(() => Math.random() - 0.5).slice(0, 3)) { const b = document.createElement('button'); b.innerHTML = `<b>${k.n}</b><span>${k.t}</span>`;
    b.onclick = () => { k.f(S); $('ov-wahl').hidden = true; ton('klick'); anzeige(); }; w.appendChild(b); }
  $('ov-wahl').hidden = false; anzeige(); speichern();
}
function levelEnde(sieg) {
  blattZu(); const info = S.info, L = info.L, hf = info.hf; let st = 0, bits = 0, extra = [];
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
  bitsDazu(bits); speichern();
  $('ende-et').textContent = (hf != null ? 'HÄRTETEST ' + (hf + 1) : 'LEVEL ' + L) + (sieg ? ' GESCHAFFT' : ' VERLOREN');
  $('ende-t').textContent = sieg ? (st === 3 ? 'Fehlerfrei kompiliert.' : 'Geschafft.') : 'Bluescreen.';
  $('ende-sterne').innerHTML = sieg ? [1, 2, 3].map((i) => `<span class="${i <= st ? 'an' : 'aus'}">■</span>`).join('') : '';
  $('ende-bits').textContent = '+' + (bits + S.beute.bits) + ' Bits';
  const beute = S.beute.items.map((it) => RAR[it.r].n + ': ' + itemName(it)).concat(extra);
  $('ende-p').innerHTML = (sieg ? `Bugs besiegt: ${S.kills}` : `Welle ${S.welle} von ${info.wellen}. Die Bugs feiern. Kurz.`) +
    (beute.length ? '<br><b>Beute:</b> ' + beute.join('<br>') : '');
  const naechst = sieg && hf == null && L < MAXLV;
  $('ende-weiter').textContent = naechst ? 'Nächstes Level' : 'Zum Menü';
  $('ende-weiter').onclick = () => { $('ov-ende').hidden = true; if (naechst) { gewLv = L + 1; starteLevel(levelInfo(L + 1)); } else { S = null; menueZeigen(); } };
  $('ende-nochmal').onclick = () => { $('ov-ende').hidden = true; starteLevel(levelInfo(L, hf)); };
  $('ov-ende').hidden = false;
}
function levelVerlassen() { if (S && S.beute.bits) bitsDazu(S.beute.bits); stat('niederlagen'); S = null; speichern(); menueZeigen(); }

/* ---------- Bedienung im Level ---------- */
function blattZu() { $('blatt-bau').hidden = true; $('blatt-turm').hidden = true; if (S) S.pad = null; }
for (const b of document.querySelectorAll('[data-zu]')) b.onclick = blattZu;
cv.addEventListener('pointerdown', (e) => {
  if (!S || S.ende) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / Z, y = (e.clientY - r.top) / Z;
  /* Gummiente antippen geht auch */
  const i = PADS.findIndex((p) => x >= p.x - 0.1 && x <= p.x + 1.1 && y >= p.y - 0.1 && y <= p.y + 1.1);
  if (i < 0) { blattZu(); return; } S.pad = i; ton('klick');
  if (S.tuerme.has(i)) turmBlatt(); else bauBlatt();
});
function bauBlatt() { $('blatt-turm').hidden = true; const n = $('bauwahl'); n.innerHTML = '';
  for (const id in TUERME) { const t = TUERME[id], b = document.createElement('button'); b.disabled = S.gold < t.k;
    b.innerHTML = `<canvas width="72" height="72" style="width:36px;height:36px"></canvas><span class="n">${t.n}</span><span class="k">${t.k}</span>`;
    zeichneTurm(b.querySelector('canvas').getContext('2d'), id, 36, 36, 68, 0);
    b.onclick = () => { if (S.gold < t.k || S.pad == null) return; S.gold -= t.k; S.tuerme.set(S.pad, { a: id, p: S.pad, lv: 1, cd: 0, wert: t.k });
      S.maxTuerme = Math.max(S.maxTuerme, S.tuerme.size); SP.gesehen.tuerme[id] = 1; stat('gebaut');
      S.effekte.push({ x: PADS[S.pad].x + 0.5, y: PADS[S.pad].y + 0.5, t: 0.3, art: 'bau' }); ton('bau'); blattZu(); anzeige(); };
    n.appendChild(b); }
  $('blatt-bau').hidden = false; }
const aufKosten = (t) => Math.round(TUERME[t.a].k * 0.75 * t.lv);
function turmBlatt() { const t = S.tuerme.get(S.pad); if (!t) return blattZu(); $('blatt-bau').hidden = true; const a = TUERME[t.a], w = turmWerte(t);
  $('t-name').textContent = a.n + ' | Stufe ' + t.lv;
  $('t-info').innerHTML = (t.a === 'mine' ? `+${Math.round(a.gold * (1 + 0.6 * (t.lv - 1)))} Gold je Welle.` : `Atk. ${w.atk.toFixed(0)} | Rate ${w.rate.toFixed(1)}/s | Reichweite ${w.rw.toFixed(1)}`) +
    `<br>${t.lv >= 4 ? '<b>Aktiv:</b>' : '<b>Stufe 4:</b>'} ${a.spez}`;
  const k = aufKosten(t); $('t-auf').textContent = t.lv >= TURM_MAX ? 'Maximum' : 'Ausbauen ' + k; $('t-auf').disabled = t.lv >= TURM_MAX || S.gold < k;
  $('t-weg').textContent = 'Verkaufen ' + Math.floor(t.wert * 0.6); $('blatt-turm').hidden = false; }
$('t-auf').onclick = () => { const t = S.tuerme.get(S.pad); if (!t) return; const k = aufKosten(t); if (t.lv >= TURM_MAX || S.gold < k) return; S.gold -= k; t.wert += k; t.lv++;
  stat('ausgebaut'); if (t.lv >= 5) erfolg('stufe5'); S.effekte.push({ x: PADS[t.p].x + 0.5, y: PADS[t.p].y + 0.5, t: 0.3, art: 'bau' }); ton('bau'); turmBlatt(); anzeige(); };
$('t-weg').onclick = () => { const t = S.tuerme.get(S.pad); if (!t) return; S.gold += Math.floor(t.wert * 0.6); S.tuerme.delete(S.pad); stat('verkauft'); blattZu(); anzeige(); };
$('start').onclick = starteWelle;
$('pause').onclick = () => { S.pause = true; $('ov-pause').hidden = false; };
$('weiter').onclick = () => { S.pause = false; $('ov-pause').hidden = true; };
$('aufgeben').onclick = () => { $('ov-pause').hidden = true; levelVerlassen(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.laeuft && !S.ende) { S.pause = true; $('ov-pause').hidden = false; } if (document.hidden) speichern(); });

/* ---------- Zeichnen ---------- */
function zeichneBug(b) {
  const gg = GEGNER[b.id], s = b.gr * Z * 2, x0 = b.x * Z - s / 2, y0 = b.y * Z - s / 2 + (b.art === 'luft' ? Math.sin(b.phase) * 2 : 0);
  if (b.unten) { g.fillStyle = F.nebentext; g.globalAlpha = 0.5; for (let i = 0; i < 3; i++) g.fillRect(x0 + i * s / 3, y0 + s * 0.6, s / 4, s / 4); g.globalAlpha = 1; return; }
  if (b.lahm > 0 || b.stop > 0 || S.held.frost > 0) { g.fillStyle = F.eisblau; g.fillRect(x0 - 2, y0 - 2, s + 4, s + 4); }
  if (b.art === 'luft') { g.fillStyle = F.linie; g.globalAlpha = 0.6; g.fillRect(x0 + s * 0.2, y0 + s * 1.15, s * 0.6, s * 0.12); g.globalAlpha = 1; }
  bild(g, gg.bild, x0, y0, s);
  if (b.schild > 0) { g.strokeStyle = F.text; g.lineWidth = 2; g.strokeRect(x0 - 3, y0 - 3, s + 6, s + 6); }
  if (b.hp < b.max) { g.fillStyle = F.linie; g.fillRect(x0, y0 - 7, s, 4); g.fillStyle = F.fehler; g.fillRect(x0, y0 - 7, s * Math.max(0, b.hp / b.max), 4); }
}
function zeichneFestung() {
  const h = S.held, muster = [1, 0, 1, 1];
  for (let i = 0; i < W * 2; i++) { g.fillStyle = muster[i % 4] ? F.text : F.akzent; g.fillRect(i * Z / 2 + 1, WAND * Z, Z / 2 - 2, Z * 0.4); }
  g.fillStyle = F.flaeche; g.fillRect(0, (WAND + 0.45) * Z, W * Z, (H - WAND) * Z);
  const q = Math.max(0, S.hp / S.hpMax); g.fillStyle = F.linie; g.fillRect(Z * 0.3, (WAND + 0.6) * Z, W * Z - Z * 0.6, 6); g.fillStyle = q > 0.35 ? F.erfolg : F.fehler; g.fillRect(Z * 0.3, (WAND + 0.6) * Z, (W * Z - Z * 0.6) * q, 6);
  if (h.schild > 0) { g.strokeStyle = F.akzent; g.lineWidth = 3; g.strokeRect(2, (WAND - 0.15) * Z, W * Z - 4, Z * 0.7); }
  const mx = 2.9 * Z, my = 12.95 * Z, mw = 3.2 * Z, mh = 1.55 * Z;
  g.fillStyle = F.text; g.fillRect(mx, my, mw, mh); g.fillStyle = S.frierT > 0 ? F.lavendel : F.eisblau; g.fillRect(mx + Z * 0.15, my + Z * 0.15, mw - Z * 0.3, mh - Z * 0.3);
  g.fillStyle = F.text; g.fillRect(4.3 * Z, my + mh, 0.4 * Z, 0.15 * Z); g.fillRect(3.8 * Z, my + mh + 0.15 * Z, 1.4 * Z, 0.12 * Z);
  for (let i = 0; i < 8; i++) { g.fillStyle = F.linie; g.fillRect((0.3 + i * 0.32) * Z, 14.4 * Z, 0.26 * Z, 0.2 * Z); g.fillRect((6.15 + i * 0.32) * Z, 14.4 * Z, 0.26 * Z, 0.2 * Z); }
  const hs = 1.15 * Z; bild(g, HELDEN[h.id].bild, 4.5 * Z - hs / 2, my + (mh - hs) / 2 + (reduziert ? 0 : Math.sin(S.t * 3) * 1.5), hs, !reduziert && S.t % 1 > 0.6);
  if (h.turbo > 0 || h.sudo > 0 || h.frost > 0) { g.strokeStyle = F.akzent; g.lineWidth = 2; g.strokeRect(mx - 3, my - 3, mw + 6, mh + 6); }
}
function text(t, x, y, gr, f, mono) { g.fillStyle = f; g.font = `700 ${gr}px ${mono ? '"JetBrains Mono", Consolas, monospace' : 'Lexend, Arial, sans-serif'}`; g.textAlign = 'center'; g.fillText(t, x, y); }
function zeichnen() {
  if (!S) return; const bg = [F.eisblau, F.lavendel, F.aprikose][S.info.kap];
  g.fillStyle = F.grund; g.fillRect(0, 0, W * Z, H * Z);
  for (const x of [0, 2, 4, 6, 8]) { g.fillStyle = bg; g.globalAlpha = 0.6; g.fillRect(x * Z + Z * 0.1, 0, Z * 0.8, WAND * Z); g.globalAlpha = 1; }
  PADS.forEach((p, i) => { if (S.tuerme.has(i)) return; g.strokeStyle = S.pad === i ? F.akzent : F.linie; g.lineWidth = S.pad === i ? 2 : 1.5; g.setLineDash([4, 3]);
    g.strokeRect(p.x * Z + 3, p.y * Z + 3, Z - 6, Z - 6); g.setLineDash([]); g.fillStyle = F.linie; g.fillRect((p.x + 0.45) * Z, (p.y + 0.3) * Z, Z * 0.1, Z * 0.4); g.fillRect((p.x + 0.3) * Z, (p.y + 0.45) * Z, Z * 0.4, Z * 0.1); });
  const sel = S.pad != null && S.tuerme.get(S.pad);
  if (sel && TUERME[sel.a].rw) { const w = turmWerte(sel); g.strokeStyle = F.akzent; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.arc((PADS[sel.p].x + 0.5) * Z, (PADS[sel.p].y + 0.5) * Z, w.rw * Z, 0, 7); g.stroke(); g.setLineDash([]); }
  for (const f of S.feuer) { g.fillStyle = F.aprikose; g.globalAlpha = Math.min(1, f.t); g.fillRect((f.x - 0.6) * Z, (f.y - 0.6) * Z, 1.2 * Z, 1.2 * Z); g.globalAlpha = 1; }
  for (const t of S.tuerme.values()) { const p = PADS[t.p]; zeichneTurm(g, t.a, (p.x + 0.5) * Z, (p.y + 0.5) * Z, Z * 0.95, t.lv, S.frierT > 0);
    if (S.pad === t.p) { g.strokeStyle = F.akzent; g.lineWidth = 2; g.strokeRect(p.x * Z, p.y * Z, Z, Z); }
    if (t.strahl && t.strahl.hp > 0) { g.strokeStyle = F.akzent; g.lineWidth = t.lv >= 4 ? 4 : 2; g.beginPath(); g.moveTo((p.x + 0.5) * Z, (p.y + 0.15) * Z); g.lineTo(t.strahl.x * Z, t.strahl.y * Z); g.stroke(); } }
  for (const b of S.bugs) if (b.art !== 'luft') zeichneBug(b);
  for (const b of S.bugs) if (b.art === 'luft') zeichneBug(b);
  zeichneFestung();
  for (const s of S.schuesse) { const r = s.a === 'kanone' ? Z * 0.12 : s.held ? Z * 0.09 : Z * 0.07; g.fillStyle = s.frost ? F.eisblau : s.a === 'kanone' ? F.text : F.akzent; g.fillRect(s.x * Z - r, s.y * Z - r, r * 2, r * 2);
    if (s.frost) { g.strokeStyle = F.text; g.lineWidth = 1; g.strokeRect(s.x * Z - r, s.y * Z - r, r * 2, r * 2); } }
  for (const e of S.effekte) {
    if (e.art === 'boom') { const r = (e.r || 0.5) * Z * (1 - e.t / 0.8 + 0.3); g.strokeStyle = F.akzent; g.lineWidth = 2; g.strokeRect(e.x * Z - r, e.y * Z - r, r * 2, r * 2); }
    if (e.art === 'blitz') { g.strokeStyle = F.akzent; g.lineWidth = 3; g.beginPath(); g.moveTo(e.x * Z, e.y * Z); g.lineTo((e.x + e.x2) / 2 * Z + 5, (e.y + e.y2) / 2 * Z - 5); g.lineTo(e.x2 * Z, e.y2 * Z); g.stroke(); }
    if (e.art === 'gold') text('+' + e.w, e.x * Z, (e.y - (0.6 - e.t)) * Z, Math.round(Z * 0.3), F.nebentext, true);
    if (e.art === 'text') text(e.text, e.x * Z, (e.y - (1 - e.t) * 0.6) * Z, Math.round(Z * 0.34), F.akzent);
    if (e.art === 'treffer') { g.fillStyle = F.fehler; g.globalAlpha = Math.min(1, e.t * 2); g.fillRect(e.x * Z - Z * 0.3, WAND * Z, Z * 0.6, Z * 0.4); g.globalAlpha = 1; }
    if (e.art === 'bau') { const r = Z * 0.5 * (1 + (0.3 - e.t)); g.strokeStyle = F.erfolg; g.lineWidth = 2; g.strokeRect(e.x * Z - r, e.y * Z - r, r * 2, r * 2); }
    if (e.art === 'licht' && !reduziert) { g.fillStyle = F.akzent; g.globalAlpha = e.t * 0.25; g.fillRect(0, 0, W * Z, H * Z); g.globalAlpha = 1; }
    if (e.art === 'blau' && !reduziert) { g.fillStyle = F.eisblau; g.globalAlpha = e.t * 0.7; g.fillRect(0, 0, W * Z, H * Z); g.globalAlpha = 1; }
    if (e.art === 'ansage') { g.fillStyle = F.text; g.globalAlpha = Math.min(1, e.t); g.fillRect(0, H * Z * 0.38, W * Z, Z * 1.2); g.globalAlpha = 1;
      text('BOSS: ' + e.text, W * Z / 2, H * Z * 0.38 + Z * 0.78, Math.round(Z * 0.45), F.grund, true); }
  }
  if (!S.laeuft && !S.ende && !S.tuerme.size) text('Bauplatz antippen, Turm bauen.', W * Z / 2, Z * 1.4, Math.round(Z * 0.34), F.nebentext);
}
