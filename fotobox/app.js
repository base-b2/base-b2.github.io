/* Fotobox – Greenscreen entfernen & Hintergrund einsetzen.
   Alles läuft lokal im Browser. Es wird kein Foto an einen Server geschickt.
   Hintergrund-Vorschläge: Openverse API (https://api.openverse.org), kein API-Key nötig. */
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const MAX_SRC = 2000;   // längste Seite des bearbeiteten Fotos (Pixel)
  const MAX_OUT = 2400;   // längste Seite des fertigen Bildes mit Hintergrund
  const OPENVERSE = 'https://api.openverse.org/v1/images/';

  // Schnellauswahl: Anzeige → englischer Suchbegriff (Openverse findet englisch deutlich mehr)
  const CATEGORIES = [
    ['🏖️ Strand', 'tropical beach'],
    ['🏔️ Berge', 'mountain landscape'],
    ['🌆 Stadt', 'city skyline'],
    ['🌃 Nachtstadt', 'city night lights'],
    ['🌌 Weltall', 'galaxy nebula'],
    ['🌲 Wald', 'forest'],
    ['💧 Wasserfall', 'waterfall'],
    ['🗼 Paris', 'eiffel tower'],
    ['🗽 New York', 'new york skyline'],
    ['🏜️ Wüste', 'desert dunes'],
    ['🐠 Unterwasser', 'coral reef'],
    ['🌠 Nordlicht', 'aurora borealis'],
    ['❄️ Winter', 'snowy winter landscape'],
    ['🏰 Burg', 'castle'],
    ['🌅 Sonnenuntergang', 'sunset'],
    ['🦁 Safari', 'savanna africa'],
  ];

  const view = $('#view');
  const vctx = view.getContext('2d');

  const st = {
    src: null,        // Canvas: Originalfoto (skaliert)
    srcData: null,    // ImageData des Originals
    keyed: null,      // Canvas: Foto mit entferntem Greenscreen
    keyedData: null,
    key: { r: 0, g: 177, b: 64 },
    tol: 60, soft: 25, spill: 60,
    bg: { type: 'none' },
    // Position des Fotorahmens als Anteil der Ausgabegröße
    pos: { cx: 0.5, bottom: 1, h: 1 },
    mirror: false,
    picking: false,
    search: { q: '', page: 1, token: 0 },
  };

  /* ---------- Hilfsfunktionen ---------- */
  function toast(msg, ms = 3200) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), ms);
  }
  function busy(on, text = 'Einen Moment …') {
    $('#busy').hidden = !on;
    $('#busyText').textContent = text;
  }
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

  function fitSize(w, h, max) {
    const s = Math.min(1, max / Math.max(w, h));
    return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
  }
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function toCanvas(drawable, w0, h0, max) {
    const [w, h] = fitSize(w0, h0, max);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(drawable, 0, 0, w, h);
    return c;
  }
  function loadImage(src, cors, timeout = 25000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (cors) img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => { img.src = ''; reject(new Error('timeout')); }, timeout);
      img.onload = () => { clearTimeout(timer); resolve(img); };
      img.onerror = () => { clearTimeout(timer); reject(new Error('load')); };
      img.src = src;
    });
  }
  async function imageFileToCanvas(file, max) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url, false);
      return toCanvas(img, img.naturalWidth, img.naturalHeight, max);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /* ---------- Foto laden ---------- */
  async function photoFromFile(file) {
    if (!file) return;
    busy(true, 'Foto wird geladen …');
    await nextFrame();
    try {
      setPhoto(await imageFileToCanvas(file, MAX_SRC));
    } catch (e) {
      toast('Dieses Bild konnte nicht geöffnet werden. Bitte ein JPG oder PNG verwenden.');
    } finally {
      busy(false);
    }
  }

  function setPhoto(canvas) {
    st.src = canvas;
    st.srcData = canvas.getContext('2d', { willReadFrequently: true })
      .getImageData(0, 0, canvas.width, canvas.height);
    st.keyed = makeCanvas(canvas.width, canvas.height);
    st.keyedData = new ImageData(canvas.width, canvas.height);
    st.key = autoKey(st.srcData);
    setPicking(false);
    resetPos();
    updateKeySwatch();
    processKey();
    document.body.classList.add('has-photo');
    render();
  }

  /* ---------- Greenscreen-Farbe automatisch erkennen ---------- */
  function autoKey(img) {
    const { data, width: w, height: h } = img;
    const rs = [], gs = [], bs = [];
    const step = Math.max(1, Math.floor(Math.min(w, h) / 160));
    const band = Math.max(2, Math.round(Math.min(w, h) * 0.08));
    const take = (x, y) => {
      const i = (y * w + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
      if (g > 35 && g > r * 1.12 && g > b * 1.12) { rs.push(r); gs.push(g); bs.push(b); }
    };
    // zuerst die Ränder (oben, links, rechts) – dort ist fast immer Greenscreen
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (x < band || x >= w - band || y < band) take(x, y);
      }
    }
    // sonst im ganzen Bild suchen
    if (rs.length < 30) {
      rs.length = gs.length = bs.length = 0;
      for (let y = 0; y < h; y += step * 2) for (let x = 0; x < w; x += step * 2) take(x, y);
    }
    if (rs.length < 30) return { r: 0, g: 177, b: 64 };
    const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    return { r: med(rs), g: med(gs), b: med(bs) };
  }

  /* ---------- Chroma-Key ----------
     Vergleich im Farbraum (Cb/Cr), unabhängig von der Helligkeit:
     Je stärker ein Pixel in Richtung der Greenscreen-Farbe zeigt, desto transparenter. */
  function processKey() {
    if (!st.srcData) return;
    const s = st.srcData.data, o = st.keyedData.data;
    const k = st.key;
    const kcb = -0.168736 * k.r - 0.331264 * k.g + 0.5 * k.b;
    const kcr = 0.5 * k.r - 0.418688 * k.g - 0.081312 * k.b;
    const klen = Math.hypot(kcb, kcr) || 1;
    const ux = kcb / klen, uy = kcr / klen;
    const A = 1 - st.tol / 100;                    // ab hier ganz transparent
    const W = Math.max(0.01, (st.soft / 100) * 0.6); // weicher Übergang
    const lo = A - W;                              // bis hier ganz sichtbar
    const spill = st.spill / 100;
    const dom = (k.g >= k.r && k.g >= k.b) ? 1 : (k.b >= k.r ? 2 : 0);

    for (let i = 0, n = s.length; i < n; i += 4) {
      let r = s[i], g = s[i + 1], b = s[i + 2];
      const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;
      const p = cb * ux + cr * uy;                 // Anteil in Key-Richtung
      const q = Math.abs(cr * ux - cb * uy);       // Abweichung quer dazu
      const m = (p - 1.5 * q) / klen;
      let a;
      if (m >= A) a = 0;
      else if (m <= lo) a = 255;
      else { const t = (A - m) / W; a = 255 * t * t * (3 - 2 * t); }

      if (a > 0 && spill > 0) {  // Grünstich (Farbsaum) entfernen
        if (dom === 1) { const lim = r > b ? r : b; if (g > lim) g -= (g - lim) * spill; }
        else if (dom === 2) { const lim = r > g ? r : g; if (b > lim) b -= (b - lim) * spill; }
        else { const lim = g > b ? g : b; if (r > lim) r -= (r - lim) * spill; }
      }
      o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = a;
    }
    st.keyed.getContext('2d').putImageData(st.keyedData, 0, 0);
  }

  /* ---------- Zeichnen ---------- */
  function setViewSize(w, h) {
    if (view.width !== w || view.height !== h) { view.width = w; view.height = h; }
  }
  function outSize() {
    if (st.bg.type === 'image') return [st.bg.canvas.width, st.bg.canvas.height];
    if (st.src) return [st.src.width, st.src.height];
    return [1600, 1000];
  }

  function render() {
    view.hidden = !st.src && st.bg.type === 'none';
    if (view.hidden) return;

    if (st.picking && st.src) {
      setViewSize(st.src.width, st.src.height);
      vctx.drawImage(st.src, 0, 0);
      return;
    }
    const [W, H] = outSize();
    setViewSize(W, H);
    vctx.clearRect(0, 0, W, H);
    if (st.bg.type === 'image') vctx.drawImage(st.bg.canvas, 0, 0);
    else if (st.bg.type === 'color') { vctx.fillStyle = st.bg.color; vctx.fillRect(0, 0, W, H); }

    if (st.src) {
      const fh = st.pos.h * H;
      const fw = fh * st.src.width / st.src.height;
      const x = st.pos.cx * W - fw / 2;
      const y = st.pos.bottom * H - fh;
      vctx.save();
      vctx.imageSmoothingQuality = 'high';
      if (st.mirror) {
        vctx.translate(x + fw, y);
        vctx.scale(-1, 1);
        vctx.drawImage(st.keyed, 0, 0, fw, fh);
      } else {
        vctx.drawImage(st.keyed, x, y, fw, fh);
      }
      vctx.restore();
    }
    if (st.bg.type === 'image' && st.bg.credit && $('#creditToggle').checked) {
      drawCredit(W, H, st.bg.credit.text);
    }
    $('#size').value = Math.round(st.pos.h * 100);
    $('#sizeOut').textContent = Math.round(st.pos.h * 100) + ' %';
  }

  function drawCredit(W, H, text) {
    const fs = Math.max(11, Math.round(H * 0.015));
    vctx.save();
    vctx.font = `${fs}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    const pad = Math.round(fs * 0.5);
    const maxW = W * 0.92;
    let t = text;
    while (vctx.measureText(t).width > maxW && t.length > 12) t = t.slice(0, -2);
    if (t !== text) t = t.slice(0, -1) + '…';
    const tw = vctx.measureText(t).width;
    vctx.fillStyle = 'rgba(0,0,0,0.45)';
    vctx.fillRect(W - tw - pad * 2, H - fs - pad * 2, tw + pad * 2, fs + pad * 2);
    vctx.fillStyle = 'rgba(255,255,255,0.92)';
    vctx.textBaseline = 'middle';
    vctx.fillText(t, W - tw - pad, H - pad - fs / 2);
    vctx.restore();
  }

  let rafPending = false, needKey = false;
  function schedule(rekey) {
    if (rekey) needKey = true;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (needKey) { needKey = false; processKey(); }
      render();
    });
  }

  /* ---------- Position / Gesten ---------- */
  function resetPos() { st.pos = { cx: 0.5, bottom: 1, h: 1 }; st.mirror = false; }

  function zoomAbout(f, px, py) {   // px/py: Anteil der Bildbreite/-höhe
    const nh = Math.min(6, Math.max(0.05, st.pos.h * f));
    f = nh / st.pos.h;
    st.pos.h = nh;
    st.pos.cx = px + (st.pos.cx - px) * f;
    st.pos.bottom = py + (st.pos.bottom - py) * f;
  }

  const pts = new Map();
  function gestureInfo() {
    const arr = [...pts.values()];
    const cx = arr.reduce((s, p) => s + p.x, 0) / arr.length;
    const cy = arr.reduce((s, p) => s + p.y, 0) / arr.length;
    const d = arr.length >= 2 ? Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y) : 0;
    return { cx, cy, d };
  }

  view.addEventListener('pointerdown', (e) => {
    if (!st.src) return;
    if (st.picking) { pickAt(e); return; }
    e.preventDefault();
    view.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    view.classList.add('dragging');
  });
  view.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const before = gestureInfo();
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const after = gestureInfo();
    const rect = view.getBoundingClientRect();
    st.pos.cx += (after.cx - before.cx) / rect.width;
    st.pos.bottom += (after.cy - before.cy) / rect.height;
    if (pts.size >= 2 && before.d > 0 && after.d > 0) {
      zoomAbout(after.d / before.d,
        (after.cx - rect.left) / rect.width,
        (after.cy - rect.top) / rect.height);
    }
    schedule();
  });
  const endPointer = (e) => {
    pts.delete(e.pointerId);
    if (!pts.size) view.classList.remove('dragging');
  };
  view.addEventListener('pointerup', endPointer);
  view.addEventListener('pointercancel', endPointer);
  view.addEventListener('wheel', (e) => {
    if (!st.src || st.picking) return;
    e.preventDefault();
    const rect = view.getBoundingClientRect();
    zoomAbout(Math.exp(-e.deltaY * 0.0015),
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height);
    schedule();
  }, { passive: false });

  $('#size').addEventListener('input', (e) => {
    const nh = Number(e.target.value) / 100;
    zoomAbout(nh / st.pos.h, st.pos.cx, st.pos.bottom);  // unten mittig fix
    schedule();
  });
  $('#centerBtn').addEventListener('click', () => { st.pos.cx = 0.5; schedule(); });
  $('#mirrorBtn').addEventListener('click', () => { st.mirror = !st.mirror; schedule(); });
  $('#resetBtn').addEventListener('click', () => { resetPos(); schedule(); });

  /* ---------- Greenscreen-Regler ---------- */
  function bindSlider(id, key, fmt = (v) => v) {
    const el = $('#' + id), out = $('#' + id + 'Out');
    const upd = () => { st[key] = Number(el.value); out.textContent = fmt(st[key]); };
    el.addEventListener('input', () => { upd(); schedule(true); });
    upd();
  }
  bindSlider('tol', 'tol');
  bindSlider('soft', 'soft');
  bindSlider('spill', 'spill', (v) => v + ' %');

  function updateKeySwatch() {
    const k = st.key;
    $('#keySwatch').style.background = `rgb(${k.r},${k.g},${k.b})`;
  }
  function setPicking(on) {
    st.picking = on;
    document.body.classList.toggle('picking', on);
    $('#pickBtn').classList.toggle('active', on);
    $('#pickHint').hidden = !on;
  }
  $('#pickBtn').addEventListener('click', () => { setPicking(!st.picking); render(); });
  $('#autoBtn').addEventListener('click', () => {
    if (!st.srcData) return;
    st.key = autoKey(st.srcData);
    setPicking(false); updateKeySwatch(); schedule(true);
    toast('Greenscreen-Farbe automatisch erkannt');
  });

  function pickAt(e) {
    const rect = view.getBoundingClientRect();
    const { width: w, height: h, data } = st.srcData;
    const x = Math.floor((e.clientX - rect.left) / rect.width * w);
    const y = Math.floor((e.clientY - rect.top) / rect.height * h);
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y - 3; yy <= y + 3; yy++) {
      for (let xx = x - 3; xx <= x + 3; xx++) {
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const i = (yy * w + xx) * 4;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
    }
    if (!n) return;
    st.key = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
    setPicking(false); updateKeySwatch(); schedule(true);
    toast('Farbe übernommen');
  }

  /* ---------- Hintergründe (Openverse) ---------- */
  const chipsEl = $('#chips');
  CATEGORIES.forEach(([label, q], i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = label;
    b.addEventListener('click', () => {
      $$('.chip').forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      $('#searchInput').value = '';
      search(q);
    });
    chipsEl.append(b);
    if (i === 0) b.classList.add('active');
  });
  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#searchInput').value.trim();
    if (!q) return;
    $$('.chip').forEach((c) => c.classList.remove('active'));
    $('#searchInput').blur();
    search(q);
  });
  $('#moreBtn').addEventListener('click', () => search(st.search.q, true));

  async function search(q, append = false) {
    const s = st.search;
    if (!append) { s.q = q; s.page = 1; $('#results').innerHTML = ''; }
    else s.page++;
    const token = ++s.token;
    $('#moreBtn').hidden = true;
    $('#resultsStatus').textContent = 'Suche läuft …';
    try {
      const url = `${OPENVERSE}?q=${encodeURIComponent(s.q)}&page=${s.page}&page_size=20&mature=false&aspect_ratio=wide`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (token !== s.token) return;
      if (res.status === 429) throw new Error('rate');
      if (!res.ok) throw new Error('http');
      const json = await res.json();
      if (token !== s.token) return;
      const items = (json.results || []).filter((r) => r.thumbnail);
      items.forEach(addResult);
      $('#moreBtn').hidden = !(s.page < (json.page_count || 0) && s.page < 10);
      $('#resultsStatus').textContent = (!append && !items.length)
        ? 'Keine Treffer – probier einen anderen Suchbegriff (am besten auf Englisch).' : '';
    } catch (e) {
      if (token !== s.token) return;
      $('#resultsStatus').textContent = e.message === 'rate'
        ? 'Zu viele Suchanfragen in kurzer Zeit – bitte eine Minute warten.'
        : 'Suche fehlgeschlagen. Bist du online?';
      if (append) $('#moreBtn').hidden = false;
    }
  }

  function addResult(r) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'thumb';
    b.title = r.title || '';
    const img = document.createElement('img');
    img.loading = 'lazy'; img.decoding = 'async';
    img.alt = r.title || 'Hintergrund';
    img.src = r.thumbnail;
    img.onerror = () => b.remove();
    b.append(img);
    b.addEventListener('click', () => chooseOpenverse(r, b));
    $('#results').append(b);
  }

  function markSelected(btn) {
    $$('.thumb').forEach((t) => t.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
  }

  function licenseName(r) {
    const l = (r.license || '').toLowerCase();
    if (l === 'cc0') return 'CC0';
    if (l === 'pdm') return 'Public Domain';
    return `CC ${l.toUpperCase()} ${r.license_version || ''}`.trim();
  }
  function makeCredit(r) {
    const title = (r.title || 'Ohne Titel').slice(0, 70);
    const creator = r.creator || 'unbekannt';
    const lic = licenseName(r);
    return {
      title, creator, lic,
      page: r.foreign_landing_url || '',
      licUrl: r.license_url || '',
      text: `Hintergrund: „${title}“ von ${creator} · ${lic} · via Openverse`,
    };
  }

  async function chooseOpenverse(r, btn) {
    busy(true, 'Hintergrund wird geladen …');
    const thumb = r.thumbnail;
    const full = thumb + (thumb.includes('?') ? '&' : '?') + 'full_size=true';
    const candidates = [full, r.url, thumb].filter(Boolean);
    for (const u of candidates) {
      try {
        const img = await loadImage(u, true);
        const c = toCanvas(img, img.naturalWidth, img.naturalHeight, MAX_OUT);
        c.getContext('2d').getImageData(0, 0, 1, 1); // prüft, ob das Bild exportierbar ist
        setBg({ type: 'image', canvas: c, credit: makeCredit(r) });
        markSelected(btn);
        busy(false);
        return;
      } catch (e) { /* nächste Quelle versuchen */ }
    }
    busy(false);
    toast('Dieses Bild lässt sich leider nicht verwenden – bitte ein anderes wählen.');
  }

  function setBg(bg) {
    st.bg = bg;
    const cr = $('#credit');
    cr.textContent = '';
    if (bg.type === 'image' && bg.credit) {
      const c = bg.credit;
      cr.append('Hintergrund: ');
      const a = document.createElement('a');
      a.href = c.page || 'https://openverse.org'; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = `„${c.title}“`;
      cr.append(a, ` von ${c.creator} · `);
      if (c.licUrl) {
        const l = document.createElement('a');
        l.href = c.licUrl; l.target = '_blank'; l.rel = 'noopener'; l.textContent = c.lic;
        cr.append(l);
      } else cr.append(c.lic);
      cr.append(' · via Openverse');
      cr.hidden = false;
    } else cr.hidden = true;
    schedule();
  }

  $('#noBgBtn').addEventListener('click', () => { markSelected(null); setBg({ type: 'none' }); });
  $('#bgColor').addEventListener('input', (e) => { markSelected(null); setBg({ type: 'color', color: e.target.value }); });
  $('#bgInput').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    busy(true, 'Hintergrund wird geladen …');
    await nextFrame();
    try {
      const c = await imageFileToCanvas(f, MAX_OUT);
      markSelected(null);
      setBg({ type: 'image', canvas: c, credit: null });
    } catch (err) {
      toast('Dieses Bild konnte nicht geöffnet werden.');
    } finally { busy(false); }
  });
  $('#creditToggle').addEventListener('change', () => schedule());

  /* ---------- Kamera ---------- */
  let stream = null, facing = 'user', shooting = false;

  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) {
      $('#camInput').click();   // Fallback: System-Kamera-App
      return;
    }
    $('#camModal').hidden = false;
    await startStream();
  }
  async function startStream() {
    stopStream();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      const v = $('#camVideo');
      v.srcObject = stream;
      v.classList.toggle('mirror', facing === 'user');
      await v.play().catch(() => {});
    } catch (err) {
      closeCamera();
      toast('Kamera nicht verfügbar oder nicht erlaubt. Es öffnet sich die Kamera-App.');
      $('#camInput').click();
    }
  }
  function stopStream() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  function closeCamera() {
    stopStream();
    shooting = false;
    $('#countdown').hidden = true;
    $('#camModal').hidden = true;
  }
  function capture() {
    const v = $('#camVideo');
    if (!v.videoWidth) { toast('Kamera ist noch nicht bereit.'); return; }
    const fl = $('#flash');
    fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
    const c = toCanvas(v, v.videoWidth, v.videoHeight, MAX_SRC);
    setTimeout(() => { closeCamera(); setPhoto(c); }, 250);
  }
  async function timedCapture(sec = 3) {
    if (shooting) return;
    shooting = true;
    const cd = $('#countdown');
    cd.hidden = false;
    for (let i = sec; i > 0; i--) {
      if (!shooting) return;
      cd.textContent = i;
      await new Promise((r) => setTimeout(r, 1000));
    }
    cd.hidden = true;
    if (shooting) capture();
    shooting = false;
  }
  $('#camShoot').addEventListener('click', () => { if (!shooting) capture(); });
  $('#camTimer').addEventListener('click', () => timedCapture(3));
  $('#camSwitch').addEventListener('click', () => { facing = facing === 'user' ? 'environment' : 'user'; startStream(); });
  $('#camClose').addEventListener('click', closeCamera);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#camModal').hidden) closeCamera();
      else if (st.picking) { setPicking(false); render(); }
    }
  });

  /* ---------- Buttons & Datei-Eingaben ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'pick-file') $('#fileInput').click();
    else if (act === 'open-camera') openCamera();
    else if (act === 'pick-bg') $('#bgInput').click();
  });
  $('#fileInput').addEventListener('change', (e) => { photoFromFile(e.target.files[0]); e.target.value = ''; });
  $('#camInput').addEventListener('change', (e) => { photoFromFile(e.target.files[0]); e.target.value = ''; });

  // Drag & Drop am Computer
  const stage = $('#stage');
  stage.addEventListener('dragover', (e) => { e.preventDefault(); });
  stage.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = [...(e.dataTransfer.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) photoFromFile(f);
  });

  $('#newBtn').addEventListener('click', () => {
    st.src = st.srcData = st.keyed = st.keyedData = null;
    setPicking(false);
    document.body.classList.remove('has-photo');
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- Export ---------- */
  function fileName(ext) {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `fotobox-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`;
  }
  function exportBlob() {
    if (st.picking) setPicking(false);
    if (needKey) { needKey = false; processKey(); }
    render();
    const png = st.bg.type === 'none';
    return new Promise((resolve, reject) => {
      try {
        view.toBlob((b) => (b ? resolve({ blob: b, ext: png ? 'png' : 'jpg' }) : reject(new Error('blob'))),
          png ? 'image/png' : 'image/jpeg', 0.92);
      } catch (err) { reject(err); }
    });
  }
  $('#downloadBtn').addEventListener('click', async () => {
    try {
      const { blob, ext } = await exportBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName(ext);
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      toast('Bild wird heruntergeladen ✔');
    } catch (err) {
      toast('Export nicht möglich – bitte einen anderen Hintergrund wählen.');
    }
  });

  // Teilen (z. B. Android-Teilen-Menü), nur wenn der Browser es kann
  try {
    const probe = new File([new Blob(['x'], { type: 'image/jpeg' })], 'x.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [probe] })) $('#shareBtn').hidden = false;
  } catch (e) { /* nicht unterstützt */ }
  $('#shareBtn').addEventListener('click', async () => {
    try {
      const { blob, ext } = await exportBlob();
      const file = new File([blob], fileName(ext), { type: blob.type });
      await navigator.share({ files: [file], title: 'Fotobox' });
    } catch (err) {
      if (err && err.name !== 'AbortError') toast('Teilen nicht möglich – bitte herunterladen.');
    }
  });

  /* ---------- Start ---------- */
  search(CATEGORIES[0][1]);
  render();
})();
