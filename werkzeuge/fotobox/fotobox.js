/* Base B | Fotobox
   Greenscreen entfernen und neuen Hintergrund einsetzen. Alles läuft lokal im Browser:
   Das Foto wird nie hochgeladen. Für die Bildersuche geht nur das Suchwort an Openverse
   (https://api.openverse.org, ohne Schlüssel, Jugendfilter aktiv). */
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // Kleinere Arbeitsgrößen, damit es auch auf günstigen Tablets flüssig läuft
  const MAX_FOTO = 1400;
  const MAX_AUSGABE = 1920;
  const OPENVERSE = 'https://api.openverse.org/v1/images/';
  const PRO_SEITE = 24;

  // Kategorien: Anzeige -> englischer Suchbegriff (Openverse findet englisch deutlich mehr)
  const KATEGORIEN = [
    ['Weltall', 'galaxy nebula'], ['Strand', 'tropical beach'], ['Wald', 'forest'],
    ['Stadt', 'city skyline'], ['Tiere', 'wildlife animals'], ['Unterwasser', 'coral reef'],
    ['Berge', 'mountain landscape'], ['Fantasie', 'fantasy landscape'], ['Winter', 'snowy winter landscape'],
    ['Wüste', 'desert dunes'], ['Sonnenuntergang', 'sunset'], ['Burg', 'castle'],
  ];
  // Häufige deutsche Suchwörter übersetzen, alles andere wird so gesucht, wie es eingegeben wurde
  const WOERTER = {
    dschungel: 'jungle', urwald: 'jungle', meer: 'ocean', see: 'lake', fluss: 'river', wasserfall: 'waterfall',
    schnee: 'snow', eis: 'ice', vulkan: 'volcano', dinosaurier: 'dinosaur', weltraum: 'space', planet: 'planet',
    mond: 'moon', sterne: 'stars', regenbogen: 'rainbow', blumen: 'flowers', wiese: 'meadow', bauernhof: 'farm',
    pferd: 'horse', pferde: 'horses', hund: 'dog', katze: 'cat', löwe: 'lion', elefant: 'elephant', zoo: 'zoo',
    schloss: 'castle', ritter: 'knight', pyramide: 'pyramid', paris: 'paris', london: 'london', rom: 'rome',
    wien: 'vienna', berlin: 'berlin', fussball: 'football stadium', fußball: 'football stadium', stadion: 'stadium',
    insel: 'island', höhle: 'cave', unterwasser: 'underwater', nordlicht: 'aurora borealis', herbst: 'autumn forest',
    frühling: 'spring blossom', sommer: 'summer beach', nacht: 'night sky', himmel: 'sky', wolken: 'clouds',
    eisenbahn: 'railway', zug: 'train', flugzeug: 'airplane', rakete: 'rocket', auto: 'car', boot: 'boat',
  };

  const view = $('#view');
  const vctx = view.getContext('2d');

  const st = {
    foto: null, fotoDaten: null, frei: null, freiDaten: null,
    farbe: { r: 0, g: 177, b: 64 },
    tol: 60, weich: 25, saum: 60,
    hg: { art: 'farbe', farbe: '#DDEBF2' },
    pos: { cx: 0.5, unten: 1, h: 0.9 },   // Foto: Mitte x, Unterkante, Höhe (Anteile der Ausgabe)
    hgPos: { cx: 0.5, cy: 0.5, s: 1 },    // Hintergrund: Mitte und Zoom
    drehung: 0, spiegel: false, ziel: 'foto', waehlt: false,
    suche: { q: '', seite: 1, token: 0, gestartet: false },
  };

  /* ---------- Hilfen ---------- */
  function toast(text, ms = 3200) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('zeigen');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('zeigen'), ms);
  }
  function beschaeftigt(an, text = 'Einen Moment ...') { $('#busy').hidden = !an; $('#busy-text').textContent = text; }
  const naechsterFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  function passend(w, h, max) { const s = Math.min(1, max / Math.max(w, h)); return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))]; }
  function leinwand(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function alsLeinwand(quelle, w0, h0, max) {
    const [w, h] = passend(w0, h0, max);
    const c = leinwand(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(quelle, 0, 0, w, h);
    return c;
  }
  function ladeBild(src, cors, frist = 25000) {
    return new Promise((ok, fehler) => {
      const img = new Image();
      if (cors) img.crossOrigin = 'anonymous';
      const t = setTimeout(() => { img.src = ''; fehler(new Error('zeit')); }, frist);
      img.onload = () => { clearTimeout(t); ok(img); };
      img.onerror = () => { clearTimeout(t); fehler(new Error('laden')); };
      img.src = src;
    });
  }
  async function dateiAlsLeinwand(datei, max) {
    const url = URL.createObjectURL(datei);
    try { const img = await ladeBild(url, false); return alsLeinwand(img, img.naturalWidth, img.naturalHeight, max); }
    finally { URL.revokeObjectURL(url); }
  }

  /* ---------- Schritte ---------- */
  function zeigeSchritt(n) {
    $('#schritt1').hidden = n !== 1;
    $('#schritt2').hidden = n !== 2;
    $('#s1').className = n === 1 ? 'aktiv' : 'fertig';
    $('#s2').className = n === 2 ? 'aktiv' : '';
    $('#s1').toggleAttribute('aria-current', n === 1);
    $('#s2').toggleAttribute('aria-current', n === 2);
    if (n === 2 && !st.suche.gestartet) { st.suche.gestartet = true; suche(KATEGORIEN[0][1]); }
    window.scrollTo({ top: 0 });
  }

  /* ---------- Foto ---------- */
  async function fotoAusDatei(datei) {
    if (!datei) return;
    beschaeftigt(true, 'Foto wird geladen ...');
    await naechsterFrame();
    try { setzeFoto(await dateiAlsLeinwand(datei, MAX_FOTO)); }
    catch (e) { toast('Dieses Bild geht leider nicht. Nimm ein JPG oder PNG.'); }
    finally { beschaeftigt(false); }
  }
  function setzeFoto(c) {
    st.foto = c;
    st.fotoDaten = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
    st.frei = leinwand(c.width, c.height);
    st.freiDaten = new ImageData(c.width, c.height);
    st.farbe = findeGruen(st.fotoDaten);
    allesZuruecksetzen();
    entferneGruen();
    zeigeSchritt(2);
    zeichne();
  }

  /* ---------- Greenscreen-Farbe automatisch erkennen ---------- */
  function findeGruen(img) {
    const { data, width: w, height: h } = img;
    const rs = [], gs = [], bs = [];
    const schritt = Math.max(1, Math.floor(Math.min(w, h) / 160));
    const rand = Math.max(2, Math.round(Math.min(w, h) * 0.08));
    const nimm = (x, y) => {
      const i = (y * w + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      if (g > 35 && g > r * 1.12 && g > b * 1.12) { rs.push(r); gs.push(g); bs.push(b); }
    };
    for (let y = 0; y < h; y += schritt) for (let x = 0; x < w; x += schritt) if (x < rand || x >= w - rand || y < rand) nimm(x, y);
    if (rs.length < 30) { rs.length = gs.length = bs.length = 0; for (let y = 0; y < h; y += schritt * 2) for (let x = 0; x < w; x += schritt * 2) nimm(x, y); }
    if (rs.length < 30) return { r: 0, g: 177, b: 64 };
    const mitte = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    return { r: mitte(rs), g: mitte(gs), b: mitte(bs) };
  }

  /* ---------- Chroma-Key (Farbraum Cb/Cr, unabhängig von der Helligkeit) ---------- */
  function entferneGruen() {
    if (!st.fotoDaten) return;
    const s = st.fotoDaten.data, o = st.freiDaten.data, k = st.farbe;
    const kcb = -0.168736 * k.r - 0.331264 * k.g + 0.5 * k.b;
    const kcr = 0.5 * k.r - 0.418688 * k.g - 0.081312 * k.b;
    const klen = Math.hypot(kcb, kcr) || 1;
    const ux = kcb / klen, uy = kcr / klen;
    const A = 1 - st.tol / 100;
    const W = Math.max(0.01, (st.weich / 100) * 0.6);
    const lo = A - W;
    const saum = st.saum / 100;
    const dom = (k.g >= k.r && k.g >= k.b) ? 1 : (k.b >= k.r ? 2 : 0);
    for (let i = 0, n = s.length; i < n; i += 4) {
      let r = s[i], g = s[i + 1], b = s[i + 2];
      const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;
      const p = cb * ux + cr * uy;
      const q = Math.abs(cr * ux - cb * uy);
      const m = (p - 1.5 * q) / klen;
      let a;
      if (m >= A) a = 0; else if (m <= lo) a = 255; else { const t = (A - m) / W; a = 255 * t * t * (3 - 2 * t); }
      if (a > 0 && saum > 0) {
        if (dom === 1) { const lim = r > b ? r : b; if (g > lim) g -= (g - lim) * saum; }
        else if (dom === 2) { const lim = r > g ? r : g; if (b > lim) b -= (b - lim) * saum; }
        else { const lim = g > b ? g : b; if (r > lim) r -= (r - lim) * saum; }
      }
      o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = a;
    }
    st.frei.getContext('2d').putImageData(st.freiDaten, 0, 0);
  }

  /* ---------- Zeichnen ---------- */
  function ausgabeGroesse() {
    if (st.hg.art === 'bild') return [st.hg.leinwand.width, st.hg.leinwand.height];
    if (st.foto) { const [w, h] = passend(st.foto.height * 4 / 3, st.foto.height, MAX_AUSGABE); return [w, h]; }
    return [1600, 1200];
  }
  function begrenzeHg() {
    const p = st.hgPos;
    p.s = Math.min(4, Math.max(1, p.s));
    const lo = 1 - p.s / 2, hi = p.s / 2;
    p.cx = Math.min(hi, Math.max(lo, p.cx));
    p.cy = Math.min(hi, Math.max(lo, p.cy));
  }
  function zeichne() {
    if (st.waehlt && st.foto) {
      view.width = st.foto.width; view.height = st.foto.height;
      vctx.drawImage(st.foto, 0, 0);
      return;
    }
    const [W, H] = ausgabeGroesse();
    if (view.width !== W || view.height !== H) { view.width = W; view.height = H; }
    vctx.clearRect(0, 0, W, H);
    if (st.hg.art === 'bild') {
      begrenzeHg();
      const p = st.hgPos, dw = W * p.s, dh = H * p.s;
      vctx.drawImage(st.hg.leinwand, p.cx * W - dw / 2, p.cy * H - dh / 2, dw, dh);
    } else { vctx.fillStyle = st.hg.farbe; vctx.fillRect(0, 0, W, H); }
    if (st.frei) {
      const fh = st.pos.h * H, fw = fh * st.foto.width / st.foto.height;
      const x = st.pos.cx * W, y = st.pos.unten * H;   // Drehpunkt: unten Mitte
      vctx.save();
      vctx.imageSmoothingQuality = 'high';
      vctx.translate(x, y);
      vctx.rotate(st.drehung * Math.PI / 180);
      if (st.spiegel) vctx.scale(-1, 1);
      vctx.drawImage(st.frei, -fw / 2, -fh, fw, fh);
      vctx.restore();
    }
    if (st.hg.art === 'bild' && st.hg.quelle && $('#quelle-ins-bild').checked) schreibeQuelle(W, H, st.hg.quelle.text);
    aktualisiereRegler();
  }
  function schreibeQuelle(W, H, text) {
    const fs = Math.max(11, Math.round(H * 0.015));
    vctx.save();
    vctx.font = `${fs}px Lexend, "Segoe UI", Arial, sans-serif`;
    const pad = Math.round(fs * 0.5), maxW = W * 0.92;
    let t = text;
    while (vctx.measureText(t).width > maxW && t.length > 12) t = t.slice(0, -2);
    if (t !== text) t = t.slice(0, -3) + '...';
    const tw = vctx.measureText(t).width;
    vctx.fillStyle = 'rgba(0,0,0,0.45)';
    vctx.fillRect(W - tw - pad * 2, H - fs - pad * 2, tw + pad * 2, fs + pad * 2);
    vctx.fillStyle = 'rgba(255,255,255,0.92)';
    vctx.textBaseline = 'middle';
    vctx.fillText(t, W - tw - pad, H - pad - fs / 2);
    vctx.restore();
  }
  let geplant = false, neuKey = false;
  function plane(key) {
    if (key) neuKey = true;
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(() => { geplant = false; if (neuKey) { neuKey = false; entferneGruen(); } zeichne(); });
  }

  /* ---------- Regler ---------- */
  function aktualisiereRegler() {
    const g = $('#groesse');
    if (st.ziel === 'foto') { g.min = 10; g.max = 300; g.value = Math.round(st.pos.h * 100); }
    else { g.min = 100; g.max = 400; g.value = Math.round(st.hgPos.s * 100); }
    $('#groesse-wert').textContent = g.value + ' %';
    $('#drehen').value = st.drehung;
    $('#drehen-wert').textContent = st.drehung + ' Grad';
    const aus = st.ziel !== 'foto';
    $('#drehen').disabled = aus;
    $('#drehen-feld').classList.toggle('aus', aus);
    $('#spiegeln').disabled = aus;
    $('#spiegeln').classList.toggle('an', st.spiegel);
    $('#spiegeln').setAttribute('aria-pressed', st.spiegel ? 'true' : 'false');
  }
  function allesZuruecksetzen() {
    st.pos = { cx: 0.5, unten: 1, h: 0.9 };
    st.hgPos = { cx: 0.5, cy: 0.5, s: 1 };
    st.drehung = 0; st.spiegel = false;
  }
  $$('input[name="ziel"]').forEach((r) => r.addEventListener('change', () => { st.ziel = r.value; aktualisiereRegler(); }));
  $('#groesse').addEventListener('input', (e) => {
    const v = Number(e.target.value) / 100;
    if (st.ziel === 'foto') st.pos.h = v; else st.hgPos.s = v;
    plane();
  });
  $('#drehen').addEventListener('input', (e) => { st.drehung = Number(e.target.value); plane(); });
  $('#spiegeln').addEventListener('click', () => { st.spiegel = !st.spiegel; plane(); });
  $('#zuruecksetzen').addEventListener('click', () => { allesZuruecksetzen(); plane(); });
  function bindeRegler(id, schl) {
    const el = $('#' + id), aus = $('#' + id + '-wert');
    const upd = () => { st[schl] = Number(el.value); aus.textContent = el.value; };
    el.addEventListener('input', () => { upd(); plane(true); });
    upd();
  }
  bindeRegler('tol', 'tol');
  bindeRegler('soft', 'weich');

  /* ---------- Gesten: ziehen, mit zwei Fingern zoomen ---------- */
  const finger = new Map();
  function gestenInfo() {
    const a = [...finger.values()];
    const cx = a.reduce((s, p) => s + p.x, 0) / a.length;
    const cy = a.reduce((s, p) => s + p.y, 0) / a.length;
    const d = a.length >= 2 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) : 0;
    return { cx, cy, d };
  }
  function zoome(f) {
    if (st.ziel === 'foto') st.pos.h = Math.min(3, Math.max(0.1, st.pos.h * f));
    else { st.hgPos.s *= f; begrenzeHg(); }
  }
  view.addEventListener('pointerdown', (e) => {
    if (!st.foto) return;
    if (st.waehlt) { waehleFarbe(e); return; }
    e.preventDefault();
    view.setPointerCapture(e.pointerId);
    finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    view.classList.add('zieht');
  });
  view.addEventListener('pointermove', (e) => {
    if (!finger.has(e.pointerId)) return;
    const vorher = gestenInfo();
    finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const nachher = gestenInfo();
    const rect = view.getBoundingClientRect();
    const dx = (nachher.cx - vorher.cx) / rect.width, dy = (nachher.cy - vorher.cy) / rect.height;
    if (st.ziel === 'foto') { st.pos.cx += dx; st.pos.unten += dy; }
    else { st.hgPos.cx += dx; st.hgPos.cy += dy; begrenzeHg(); }
    if (finger.size >= 2 && vorher.d > 0 && nachher.d > 0) zoome(nachher.d / vorher.d);
    plane();
  });
  const fingerWeg = (e) => { finger.delete(e.pointerId); if (!finger.size) view.classList.remove('zieht'); };
  view.addEventListener('pointerup', fingerWeg);
  view.addEventListener('pointercancel', fingerWeg);
  view.addEventListener('wheel', (e) => {
    if (!st.foto || st.waehlt) return;
    e.preventDefault();
    zoome(Math.exp(-e.deltaY * 0.0015));
    plane();
  }, { passive: false });

  /* ---------- Grün selbst antippen ---------- */
  function setzeWaehlen(an) {
    st.waehlt = an;
    document.body.classList.toggle('waehlt', an);
    $('#farbe-hinweis').hidden = !an;
    $('#farbe-waehlen').classList.toggle('an', an);
    zeichne();
  }
  $('#farbe-waehlen').addEventListener('click', () => setzeWaehlen(!st.waehlt));
  function waehleFarbe(e) {
    const rect = view.getBoundingClientRect();
    const { width: w, height: h, data } = st.fotoDaten;
    const x = Math.floor((e.clientX - rect.left) / rect.width * w);
    const y = Math.floor((e.clientY - rect.top) / rect.height * h);
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y - 3; yy <= y + 3; yy++) for (let xx = x - 3; xx <= x + 3; xx++) {
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const i = (yy * w + xx) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
    if (!n) return;
    st.farbe = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
    setzeWaehlen(false);
    plane(true);
    toast('Farbe übernommen ✓');
  }

  /* ---------- Hintergründe: Openverse ---------- */
  KATEGORIEN.forEach(([name, q], i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fb-chip'; b.textContent = name;
    b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.addEventListener('click', () => {
      $$('.fb-chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      $('#suchfeld').value = '';
      suche(q, false, name);
    });
    $('#chips').append(b);
  });
  $('#suche').addEventListener('submit', (e) => {
    e.preventDefault();
    const roh = $('#suchfeld').value.trim();
    if (!roh) return;
    $$('.fb-chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    $('#suchfeld').blur();
    const q = roh.toLowerCase().split(/\s+/).map((w) => WOERTER[w] || w).join(' ');
    suche(q, false, roh);
  });
  $('#mehr').addEventListener('click', () => suche(st.suche.q, true, st.suche.anzeige));

  async function suche(q, anhaengen = false, anzeige = '') {
    const s = st.suche;
    if (!anhaengen) { s.q = q; s.seite = 1; s.anzeige = anzeige || KATEGORIEN[0][0]; s.anzahl = 0; $('#bilder').textContent = ''; }
    else s.seite++;
    const token = ++s.token;
    $('#mehr').hidden = true;
    $('#status').textContent = 'Suche läuft ...';
    try {
      const url = `${OPENVERSE}?q=${encodeURIComponent(s.q)}&page=${s.seite}&page_size=${PRO_SEITE}&mature=false&aspect_ratio=wide`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (token !== s.token) return;
      if (res.status === 429) throw new Error('viel');
      if (!res.ok) throw new Error('http');
      const json = await res.json();
      if (token !== s.token) return;
      const treffer = (json.results || []).filter((r) => r.thumbnail);
      treffer.forEach(zeigeTreffer);
      s.anzahl += treffer.length;
      $('#mehr').hidden = !(s.seite < (json.page_count || 0) && s.seite < 10);
      $('#status').innerHTML = s.anzahl
        ? `<b>${s.anzahl} Bilder</b> zu "${(s.anzeige || '').replace(/[<>&"]/g, '')}"`
        : 'Nichts gefunden. Probier ein anderes Wort, zum Beispiel eine Kategorie oben.';
    } catch (e) {
      if (token !== s.token) return;
      $('#status').textContent = e.message === 'viel'
        ? 'Zu viele Suchen auf einmal. Warte bitte eine Minute.'
        : 'Die Suche hat nicht geklappt. Ist das Tablet mit dem Internet verbunden?';
      if (anhaengen) $('#mehr').hidden = false;
    }
  }
  function zeigeTreffer(r) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fb-bild';
    b.setAttribute('aria-label', 'Hintergrund: ' + (r.title || 'ohne Titel'));
    const img = document.createElement('img');
    img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
    img.src = r.thumbnail;
    img.onerror = () => b.remove();
    b.append(img);
    b.addEventListener('click', () => waehleOpenverse(r, b));
    $('#bilder').append(b);
  }
  function markiere(btn) {
    $$('.fb-bild').forEach((t) => t.classList.remove('gewaehlt'));
    if (btn) btn.classList.add('gewaehlt');
  }
  function lizenz(r) {
    const l = (r.license || '').toLowerCase();
    if (l === 'cc0') return 'CC0';
    if (l === 'pdm') return 'Public Domain';
    return `CC ${l.toUpperCase()} ${r.license_version || ''}`.trim();
  }
  function quelleVon(r) {
    const titel = (r.title || 'Ohne Titel').slice(0, 70);
    const von = r.creator || 'unbekannt';
    const lic = lizenz(r);
    return { titel, von, lic, seite: r.foreign_landing_url || '', licUrl: r.license_url || '',
      text: `Hintergrund: "${titel}" von ${von} | ${lic} | via Openverse` };
  }
  async function waehleOpenverse(r, btn) {
    beschaeftigt(true, 'Hintergrund wird geladen ...');
    const t = r.thumbnail;
    const gross = t + (t.includes('?') ? '&' : '?') + 'full_size=true';
    for (const u of [gross, r.url, t].filter(Boolean)) {
      try {
        const img = await ladeBild(u, true);
        const c = alsLeinwand(img, img.naturalWidth, img.naturalHeight, MAX_AUSGABE);
        c.getContext('2d').getImageData(0, 0, 1, 1); // prüft, ob das Bild gespeichert werden darf
        setzeHg({ art: 'bild', leinwand: c, quelle: quelleVon(r) });
        markiere(btn);
        beschaeftigt(false);
        return;
      } catch (e) { /* nächste Quelle versuchen */ }
    }
    beschaeftigt(false);
    toast('Dieses Bild klappt leider nicht. Nimm ein anderes.');
  }
  function setzeHg(hg) {
    st.hg = hg;
    st.hgPos = { cx: 0.5, cy: 0.5, s: 1 };
    const q = $('#quelle');
    q.textContent = '';
    if (hg.art === 'bild' && hg.quelle) {
      const c = hg.quelle;
      q.append('Hintergrund: ');
      const a = document.createElement('a');
      a.href = c.seite || 'https://openverse.org'; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = `"${c.titel}"`;
      q.append(a, ` von ${c.von} | `);
      if (c.licUrl) { const l = document.createElement('a'); l.href = c.licUrl; l.target = '_blank'; l.rel = 'noopener'; l.textContent = c.lic; q.append(l); }
      else q.append(c.lic);
      q.append(' | via Openverse');
      q.hidden = false;
    } else q.hidden = true;
    plane();
  }
  $('#hg-farbe').addEventListener('input', (e) => { markiere(null); setzeHg({ art: 'farbe', farbe: e.target.value }); });
  $('#hg-datei').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    beschaeftigt(true, 'Hintergrund wird geladen ...');
    await naechsterFrame();
    try { const c = await dateiAlsLeinwand(f, MAX_AUSGABE); markiere(null); setzeHg({ art: 'bild', leinwand: c, quelle: null }); }
    catch (err) { toast('Dieses Bild geht leider nicht.'); }
    finally { beschaeftigt(false); }
  });
  $('#quelle-ins-bild').addEventListener('change', () => plane());

  /* ---------- Kamera ---------- */
  let strom = null, richtung = 'user', zaehlt = false;
  async function oeffneKamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) { $('#kamera-datei').click(); return; }
    $('#kamera').hidden = false;
    await starteStrom();
  }
  async function starteStrom() {
    stoppeStrom();
    try {
      strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: richtung }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      const v = $('#video');
      v.srcObject = strom;
      v.classList.toggle('gespiegelt', richtung === 'user');
      await v.play().catch(() => {});
    } catch (err) {
      schliesseKamera();
      toast('Die Kamera ist nicht erlaubt. Es öffnet sich die Kamera-App.');
      $('#kamera-datei').click();
    }
  }
  function stoppeStrom() { if (strom) strom.getTracks().forEach((t) => t.stop()); strom = null; }
  function schliesseKamera() { stoppeStrom(); zaehlt = false; $('#countdown').hidden = true; $('#kamera').hidden = true; }
  function ausloesen() {
    const v = $('#video');
    if (!v.videoWidth) { toast('Die Kamera ist noch nicht bereit.'); return; }
    const b = $('#blitz'); b.classList.remove('los'); void b.offsetWidth; b.classList.add('los');
    const c = alsLeinwand(v, v.videoWidth, v.videoHeight, MAX_FOTO);
    if (richtung === 'user') {   // Selfie so speichern, wie man sich im Bild gesehen hat
      const m = leinwand(c.width, c.height), mx = m.getContext('2d');
      mx.translate(c.width, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
      setTimeout(() => { schliesseKamera(); setzeFoto(alsLeinwand(m, m.width, m.height, MAX_FOTO)); }, 250);
      return;
    }
    setTimeout(() => { schliesseKamera(); setzeFoto(c); }, 250);
  }
  async function selbstausloeser(sek = 3) {
    if (zaehlt) return;
    zaehlt = true;
    const cd = $('#countdown');
    cd.hidden = false;
    for (let i = sek; i > 0; i--) { if (!zaehlt) return; cd.textContent = i; await new Promise((r) => setTimeout(r, 1000)); }
    cd.hidden = true;
    if (zaehlt) ausloesen();
    zaehlt = false;
  }
  $('#ausloesen').addEventListener('click', () => { if (!zaehlt) ausloesen(); });
  $('#timer').addEventListener('click', () => selbstausloeser(3));
  $('#wechseln').addEventListener('click', () => { richtung = richtung === 'user' ? 'environment' : 'user'; starteStrom(); });
  $('#kamera-zu').addEventListener('click', schliesseKamera);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#kamera').hidden) schliesseKamera(); else if (st.waehlt) setzeWaehlen(false);
  });

  /* ---------- Knöpfe ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-aktion]');
    if (!a) return;
    if (a.dataset.aktion === 'datei') $('#datei').click();
    else if (a.dataset.aktion === 'kamera') oeffneKamera();
    else if (a.dataset.aktion === 'hg-datei') $('#hg-datei').click();
  });
  $('#datei').addEventListener('change', (e) => { fotoAusDatei(e.target.files[0]); e.target.value = ''; });
  $('#kamera-datei').addEventListener('change', (e) => { fotoAusDatei(e.target.files[0]); e.target.value = ''; });
  $('#neues-foto').addEventListener('click', () => { setzeWaehlen(false); zeigeSchritt(1); });
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = [...(e.dataTransfer.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) fotoAusDatei(f);
  });

  /* ---------- Speichern als PNG ---------- */
  function dateiname() {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `BaseB_Fotobox_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
  }
  function alsPng() {
    if (st.waehlt) setzeWaehlen(false);
    if (neuKey) { neuKey = false; entferneGruen(); }
    zeichne();
    return new Promise((ok, fehler) => {
      try { view.toBlob((b) => (b ? ok(b) : fehler(new Error('blob'))), 'image/png'); } catch (err) { fehler(err); }
    });
  }
  $('#speichern').addEventListener('click', async () => {
    beschaeftigt(true, 'Bild wird gespeichert ...');
    try {
      const blob = await alsPng();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = dateiname();
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      toast('Gespeichert ✓ Schau in deinen Downloads nach.');
    } catch (err) {
      toast('Speichern hat nicht geklappt. Nimm einen anderen Hintergrund.');
    } finally { beschaeftigt(false); }
  });
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [probe] })) $('#teilen').hidden = false;
  } catch (e) { /* Teilen wird nicht unterstützt */ }
  $('#teilen').addEventListener('click', async () => {
    try {
      const blob = await alsPng();
      await navigator.share({ files: [new File([blob], dateiname(), { type: 'image/png' })], title: 'Fotobox' });
    } catch (err) { if (err && err.name !== 'AbortError') toast('Teilen geht hier nicht. Nimm "Bild speichern".'); }
  });

  zeigeSchritt(1);
})();
