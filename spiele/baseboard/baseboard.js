/* Base B | BaseBoard
   Quiz im Raster erstellen, als Datei speichern und im Browser spielen.
   Alles läuft auf diesem Gerät: kein Server, kein Konto, keine Links pro Quiz.
   Dieselbe Datei steckt auch in jeder gespeicherten Quiz-Datei (.html), damit diese offline läuft. */
'use strict';
(() => {
  const NAME = 'BaseBoard';
  const FORMAT = 'base-b-baseboard';
  const SKRIPT_URL = (document.currentScript && document.currentScript.src) || '';
  const OFFLINE = !!document.getElementById('qw-daten');
  const wurzel = document.getElementById('qw');
  if (!wurzel) return;
  const BEWEGUNG = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const MAX_SPALTEN = 8;
  const MAX_ZEILEN = 10;
  const MAX_TEAMS = 12;
  const SPEICHER_ENTWURF = 'bb-baseboard-entwurf';
  const SPEICHER_SPIEL = 'bb-baseboard-spiel';
  const SKRIPT_ENDE = '<' + '/script>';

  /* ---------- Kleine Helfer ---------- */
  let zaehlerId = 0;
  const neueId = () => 'qw-' + (++zaehlerId);
  const $ = (s, el = document) => el.querySelector(s);
  const warte = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const begrenze = (n, a, b) => Math.max(a, Math.min(b, n));
  const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString('de-DE', { maximumFractionDigits: 3 }) : '-');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const gueltig = (k) => k != null && k !== false && k !== '';
  const ohneLeere = (k) => k.flat(Infinity).filter(gueltig);
  function haengeAn(el, ...k) { el.append(...ohneLeere(k)); }
  function ersetze(el, ...k) { el.replaceChildren(...ohneLeere(k)); }

  function h(tag, attrs, ...kinder) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kind of kinder.flat(Infinity)) {
      if (kind == null || kind === false || kind === '') continue;
      el.append(kind instanceof Node ? kind : String(kind));
    }
    return el;
  }

  function zufall(n) {
    const a = new Uint32Array(1);
    const grenze = Math.floor(0x100000000 / n) * n;
    let x;
    do { crypto.getRandomValues(a); x = a[0]; } while (x >= grenze);
    return x % n;
  }

  function liste(namen) {
    if (namen.length <= 1) return namen.join('');
    return namen.slice(0, -1).join(', ') + ' und ' + namen[namen.length - 1];
  }

  // Liest Zahlen auch in deutscher Schreibweise: 3.798 | 3,5 | 1.000,25 | ca. 40 km
  function leseZahl(t) {
    if (t == null) return NaN;
    const m = String(t).replace(/\s/g, '').match(/-?\d[\d.,]*/);
    if (!m) return NaN;
    let s = m[0].replace(/[.,]$/, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return parseFloat(s);
  }

  /* ---------- Linien-Icons (1,75 px, runde Enden) ---------- */
  const ICONS = {
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    haken: '<polyline points="5,12.5 10,17.5 19,7"/>',
    speichern: '<line x1="12" y1="4" x2="12" y2="15"/><polyline points="7.5,10.5 12,15 16.5,10.5"/><line x1="4.5" y1="19.5" x2="19.5" y2="19.5"/>',
    upload: '<line x1="12" y1="15" x2="12" y2="4"/><polyline points="7.5,8.5 12,4 16.5,8.5"/><line x1="4.5" y1="19.5" x2="19.5" y2="19.5"/>',
    spielen: '<polygon points="7,4.5 19,12 7,19.5"/>',
    stift: '<path d="M4 20h4L19 9l-4-4L4 16z"/><line x1="13.5" y1="6.5" x2="17.5" y2="10.5"/>',
    bild: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.7"/><polyline points="4,18 10,13 14,16 17,13.5 20.5,16.5"/>',
    beamer: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><line x1="12" y1="16.5" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/>',
    zurueck: '<polyline points="15,6 9,12 15,18"/>',
    weiter: '<polyline points="9,6 15,12 9,18"/>',
    uhr: '<circle cx="12" cy="13" r="8"/><polyline points="12,9 12,13 15,15"/><line x1="10" y1="2.5" x2="14" y2="2.5"/>',
    wuerfel: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>',
    los: '<polyline points="16,4 20,4 20,8"/><line x1="4" y1="20" x2="20" y2="4"/><polyline points="20,16 20,20 16,20"/><line x1="15" y1="15" x2="20" y2="20"/><line x1="4" y1="4" x2="9" y2="9"/>',
    ziel: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/>',
    rueckgaengig: '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><polyline points="4,3 4,8 9,8"/>',
    pokal: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/><line x1="12" y1="13" x2="12" y2="17"/><line x1="8.5" y1="20" x2="15.5" y2="20"/><line x1="10" y1="17" x2="14" y2="17"/>',
    datei: '<path d="M6 3.5h8l4 4v13H6z"/><polyline points="14,3.5 14,7.5 18,7.5"/>',
    team: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.5"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',
    schloss: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    drucker: '<polyline points="6.5,9 6.5,3.5 17.5,3.5 17.5,9"/><rect x="3.5" y="9" width="17" height="7.5" rx="1.5"/><rect x="6.5" y="14" width="11" height="6.5"/>',
    mond: '<path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z"/>',
    sonne: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="21.5" y2="12"/><line x1="5.3" y1="5.3" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="18.7" y2="18.7"/><line x1="5.3" y1="18.7" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="18.7" y2="5.3"/>',
  };
  const iconHtml = (n, g = 20, klasse = '') => `<svg${klasse ? ` class="${klasse}"` : ''} width="${g}" height="${g}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
  function icon(n, g = 20) {
    const t = document.createElement('template');
    t.innerHTML = iconHtml(n, g);
    return t.content.firstChild;
  }
  const BILDMARKE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><rect x="0" y="0" width="24" height="24" fill="#1C2E4A"/><rect x="28" y="18" width="24" height="6" fill="#6A1B2B"/><rect x="0" y="28" width="24" height="24" fill="#1C2E4A"/><rect x="28" y="28" width="24" height="24" fill="#1C2E4A"/></svg>';

  // Bit-Figur als Pixel-Grafik: '#' = Textfarbe, 'r' = Akzent (Cursor)
  const FIGUR = ['#.......', '#.......', '#..rrr..', '#.......', '#######.', '#.#..#..', '#######.', '#.....#.', '#######.', '..#..#..', '..#..#..'];
  function pixel(zeilen, hoehe) {
    const b = zeilen[0].length;
    const rects = zeilen.flatMap((z, y) => [...z].map((c, x) => (c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>`
      : c === 'r' ? `<rect class="r" x="${x}" y="${y}" width="1" height="1"/>` : ''))).join('');
    const t = document.createElement('template');
    t.innerHTML = `<svg class="qw-pixel" width="${Math.round(hoehe * b / zeilen.length)}" height="${hoehe}" viewBox="0 0 ${b} ${zeilen.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
    return t.content.firstChild;
  }

  /* ---------- Textformatierung ----------
     **fett**  ==markiert==  `Code`  ```Codeblock```  x^2^  H~2~O  [Text](https://...)  Links werden erkannt. */
  function formatiere(roh) {
    const ablage = [];
    const merke = (html) => '\u0000' + (ablage.push(html) - 1) + '\u0000';
    const link = (url, text) => merke(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
    let t = esc(String(roh || '').replace(/\r\n?/g, '\n'));
    t = t.replace(/```\n?([\s\S]*?)```/g, (_, c) => merke('<pre><code>' + c.replace(/\n$/, '') + '</code></pre>'));
    t = t.replace(/`([^`\n]+)`/g, (_, c) => merke('<code>' + c + '</code>'));
    t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) => link(url, text));
    t = t.replace(/https?:\/\/[^\s<\u0000]+[^\s<\u0000.,;:!?)]/g, (url) => link(url, url));
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/==(.+?)==/g, '<mark>$1</mark>');
    t = t.replace(/\^([^\s^]+)\^/g, '<sup>$1</sup>');
    t = t.replace(/~([^\s~]+)~/g, '<sub>$1</sub>');
    t = t.replace(/\n/g, '<br>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => ablage[Number(i)]);
  }
  const kurz = (t, n = 90) => {
    const tief = '₀₁₂₃₄₅₆₇₈₉';
    const hoch = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const s = String(t || '').replace(/~(\d+)~/g, (_, d) => [...d].map((c) => tief[c]).join('')).replace(/\^(\d+)\^/g, (_, d) => [...d].map((c) => hoch[c]).join('')).replace(/```|\*\*|==|`|\^|~/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 3) + '...' : s;
  };

  /* ---------- Datenmodell ---------- */
  const leeresFeld = () => ({ frage: '', antwort: '', frageBild: '', antwortBild: '', punkte: null, art: '' });
  const ARTEN = { '': 'Normal', doppelt: '2x', einsatz: 'Einsatz' };
  const leseArt = (v) => {
    const t = String(v == null ? '' : v).trim().toLowerCase();
    if (t === 'doppelt' || t === '2x' || t === 'x2' || t === 'doppel') return 'doppelt';
    if (t === 'einsatz' || t === 'joker' || t === 'wette') return 'einsatz';
    return '';
  };
  const maxEinsatz = () => Math.max(0, ...quiz.zeilen);
  function neuesQuiz(spalten = 5, zeilen = 5) {
    return {
      format: FORMAT, version: 1, titel: '',
      kategorien: Array.from({ length: spalten }, () => ''),
      zeilen: Array.from({ length: zeilen }, (_, i) => (i + 1) * 100),
      felder: Array.from({ length: spalten }, () => Array.from({ length: zeilen }, leeresFeld)),
      schaetz: { frage: '', antwort: '', einheit: '', bild: '' },
      einstellungen: { timer: 0, minus: true, ton: true },
    };
  }
  const text = (v, max = 5000) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
  const sicheresBild = (v) => (typeof v === 'string' && /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : '');
  const ganzzahl = (v, std) => {
    if (v === '' || v == null) return std;
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? begrenze(n, -1000000, 1000000) : std;
  };
  function normalisiere(roh) {
    if (!roh || typeof roh !== 'object') throw new Error('format');
    const kat = Array.isArray(roh.kategorien) ? roh.kategorien.slice(0, MAX_SPALTEN).map((k) => text(k, 80)) : [];
    const zei = Array.isArray(roh.zeilen) ? roh.zeilen.slice(0, MAX_ZEILEN).map((p, i) => ganzzahl(p, (i + 1) * 100)) : [];
    if (!kat.length || !zei.length) throw new Error('format');
    const felder = kat.map((_, s) => zei.map((__, z) => {
      const f = (Array.isArray(roh.felder) && Array.isArray(roh.felder[s]) && roh.felder[s][z]) || {};
      return {
        frage: text(f.frage), antwort: text(f.antwort),
        frageBild: sicheresBild(f.frageBild), antwortBild: sicheresBild(f.antwortBild),
        punkte: ganzzahl(f.punkte, null), art: leseArt(f.art),
      };
    }));
    const s = roh.schaetz || {};
    const e = roh.einstellungen || {};
    return {
      format: FORMAT, version: 1, titel: text(roh.titel, 120), kategorien: kat, zeilen: zei, felder,
      schaetz: { frage: text(s.frage), antwort: text(s.antwort, 60), einheit: text(s.einheit, 30), bild: sicheresBild(s.bild) },
      einstellungen: { timer: begrenze(ganzzahl(e.timer, 0), 0, 600), minus: e.minus !== false, ton: e.ton !== false },
    };
  }

  /* ---------- Zustand ---------- */
  let quiz = neuesQuiz();
  let spiel = null;
  const vorb = { teams: ['Team 1', 'Team 2'], amZug: null };
  let ansicht = 'start';
  let ungespeichert = false;
  const overlays = [];

  const katName = (s) => (quiz.kategorien[s] || '').trim() || 'Kategorie ' + (s + 1);
  const punkteVon = (s, z) => {
    const f = quiz.felder[s][z];
    return f.punkte == null ? quiz.zeilen[z] : f.punkte;
  };
  const hatInhalt = (f) => !!(f.frage.trim() || f.antwort.trim() || f.frageBild || f.antwortBild);
  const form = () => quiz.kategorien.length + 'x' + quiz.zeilen.length;
  function quizHash() {
    const s = JSON.stringify([quiz.titel, quiz.kategorien, quiz.zeilen]);
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
    return x.toString(36);
  }

  /* ---------- Zwischenspeicher (nur dieser Browser) ---------- */
  const lies = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const loesche = (k) => { try { localStorage.removeItem(k); } catch (e) { /* egal */ } };
  let entwurfTimer = null;
  let speicherWarnung = false;
  function geaendert() {
    ungespeichert = true;
    if (OFFLINE) return;
    clearTimeout(entwurfTimer);
    entwurfTimer = setTimeout(() => {
      try { localStorage.setItem(SPEICHER_ENTWURF, JSON.stringify({ zeit: Date.now(), quiz })); } catch (e) {
        if (!speicherWarnung) { speicherWarnung = true; toast('Das Quiz ist zu groß für den Zwischenspeicher. Bitte als HTML speichern.', 'fehler'); }
      }
    }, 400);
  }
  function speichereSpiel() {
    if (!spiel) return;
    const daten = { zeit: Date.now(), hash: spiel.hash, spiel: { ...spiel, verlauf: spiel.verlauf.slice(-20) } };
    if (!OFFLINE) daten.quiz = quiz;
    try { localStorage.setItem(SPEICHER_SPIEL, JSON.stringify(daten)); } catch (e) {
      try { delete daten.quiz; localStorage.setItem(SPEICHER_SPIEL, JSON.stringify(daten)); } catch (e2) { /* egal */ }
    }
  }
  function gueltigesSpiel(s, q) {
    return s && Array.isArray(s.teams) && s.teams.length && s.gespielt && typeof s.gespielt === 'object'
      && s.form === q.kategorien.length + 'x' + q.zeilen.length;
  }
  const datumKurz = (ms) => {
    const d = new Date(ms);
    const tage = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];
    const zz = (n) => String(n).padStart(2, '0');
    return `${tage[d.getDay()]}, ${zz(d.getDate())}.${zz(d.getMonth() + 1)}.${d.getFullYear()}, ${zz(d.getHours())}:${zz(d.getMinutes())} Uhr`;
  };

  /* ---------- Meldungen ---------- */
  let toastEl = null;
  let toastTimer = null;
  function toast(t, art = '') {
    if (!toastEl) toastEl = h('div', { class: 'qw-toast', role: 'status', 'aria-live': 'polite' });
    if (toastEl.parentNode !== wurzel) haengeAn(wurzel, toastEl);
    toastEl.textContent = (art === 'fehler' ? '✗ ' : '') + t;
    toastEl.className = 'qw-toast sichtbar ' + art;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('sichtbar'), 4500);
  }
  function leere() {
    ersetze(wurzel, ...(toastEl ? [toastEl] : []));
  }
  function nachOben() {
    const oben = wurzel.getBoundingClientRect().top + window.scrollY - 16;
    if (window.scrollY > oben) window.scrollTo(0, Math.max(0, oben));
  }

  /* ---------- Ebenen: Dialoge und Bühne ---------- */
  function oeffneEbene(el, opts = {}) {
    const ebene = { el, vorher: document.activeElement, ...opts };
    overlays.push(ebene);
    haengeAn(wurzel, el);
    document.documentElement.classList.add('qw-gesperrt');
    requestAnimationFrame(() => {
      const f = el.querySelector('[data-fokus]') || el.querySelector('button:not([disabled]), input, textarea');
      if (f) f.focus();
    });
    return () => schliesseEbene(ebene);
  }
  function schliesseEbene(ebene) {
    const i = overlays.indexOf(ebene);
    if (i < 0) return;
    overlays.splice(i, 1);
    if (ebene.schliessen) ebene.schliessen();
    ebene.el.remove();
    if (!overlays.length) document.documentElement.classList.remove('qw-gesperrt');
    if (ebene.vorher && document.contains(ebene.vorher)) ebene.vorher.focus();
  }
  function schliesseAlleEbenen() { while (overlays.length) schliesseEbene(overlays[overlays.length - 1]); }
  function fokusFalle(e, el) {
    const f = [...el.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea, select, a[href]')]
      .filter((x) => x.offsetParent !== null || x.classList.contains('unsichtbar'));
    if (!f.length) return;
    const erst = f[0];
    const letzt = f[f.length - 1];
    if (!el.contains(document.activeElement)) { e.preventDefault(); erst.focus(); }
    else if (e.shiftKey && document.activeElement === erst) { e.preventDefault(); letzt.focus(); }
    else if (!e.shiftKey && document.activeElement === letzt) { e.preventDefault(); erst.focus(); }
  }

  function modal(titel, { breit = false, etikett = '' } = {}) {
    const id = neueId();
    let zu = null;
    const box = h('div', { class: 'qw-modal' + (breit ? ' breit' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id });
    const hinter = h('div', { class: 'qw-hinter' }, box);
    const inhalt = h('div', { class: 'qw-modal-inhalt' });
    const fuss = h('div', { class: 'qw-modal-fuss' });
    haengeAn(box, 
      h('div', { class: 'qw-modal-kopf' },
        h('div', { class: 'qw-modal-titel' }, etikett && h('span', { class: 'etikett' }, etikett), h('h2', { id }, titel)),
        h('button', { class: 'kopf-knopf', type: 'button', 'aria-label': 'Schließen', onclick: () => zu && zu() }, icon('x'))),
      inhalt, fuss);
    return {
      box, inhalt, fuss,
      oeffne(opts = {}) {
        zu = oeffneEbene(hinter, {
          taste: (e) => {
            if (opts.taste && opts.taste(e)) return true;
            if (e.key === 'Escape') { zu(); return true; }
            return false;
          },
          schliessen: opts.schliessen,
        });
      },
      schliesse() { if (zu) zu(); },
    };
  }

  function bestaetige(frage, ja = 'Ja', nein = 'Abbrechen') {
    return new Promise((ok) => {
      let ergebnis = false;
      const m = modal(frage);
      m.inhalt.remove();
      haengeAn(m.fuss, 
        h('button', { class: 'knopf', type: 'button', 'data-fokus': true, onclick: () => { ergebnis = true; m.schliesse(); } }, ja),
        h('button', { class: 'knopf knopf-zwei', type: 'button', onclick: () => m.schliesse() }, nein));
      m.oeffne({ schliessen: () => ok(ergebnis) });
    });
  }

  /* ---------- Bausteine für Formulare ---------- */
  function feld(label, el, hinweis) {
    if (!el.id) el.id = neueId();
    return h('div', { class: 'feld' }, h('label', { for: el.id }, label), el, hinweis && h('p', { class: 'qw-klein' }, hinweis));
  }
  function haken(label, wert, setze) {
    return h('label', { class: 'qw-check' },
      h('input', { type: 'checkbox', checked: wert, onchange: (e) => setze(e.target.checked) }), label);
  }
  function zaehler(label, wert, min, max, setze, k) {
    return h('div', { class: 'feld' }, h('span', null, label),
      h('div', { class: 'qw-zaehler' },
        h('button', { type: 'button', 'data-k': k + '-', 'aria-label': label + ': weniger', disabled: wert <= min, onclick: () => setze(wert - 1) }, icon('minus')),
        h('output', { class: 'mono', 'aria-live': 'polite' }, String(wert)),
        h('button', { type: 'button', 'data-k': k + '+', 'aria-label': label + ': mehr', disabled: wert >= max, onclick: () => setze(wert + 1) }, icon('plus'))));
  }
  function knopf(text, onclick, { art = 'zwei', ic = null, klein = true, attrs = {} } = {}) {
    const k = 'knopf' + (art === 'zwei' ? ' knopf-zwei' : '') + (klein ? ' knopf-klein' : '');
    return h('button', { class: k, type: 'button', onclick, ...attrs }, ic && icon(ic), text);
  }
  function leiste(...kinder) { return h('div', { class: 'qw-leiste' }, ...kinder); }
  const platz = () => h('span', { class: 'qw-platz' });

  function texteditor({ label, wert, setze, platzhalter = '', zeilen = 3, beiBild = null }) {
    const ta = h('textarea', { class: 'eingabe qw-ta', rows: String(zeilen), placeholder: platzhalter, spellcheck: 'true' });
    ta.value = wert;
    const vorschau = h('div', { class: 'qw-vorschau qw-text', 'aria-hidden': 'true' });
    const aktualisiere = () => {
      vorschau.innerHTML = ta.value.trim() ? formatiere(ta.value) : '<span class="qw-leer">Vorschau</span>';
    };
    ta.addEventListener('input', () => { setze(ta.value); aktualisiere(); });
    const umschliesse = (vor, nach, std) => {
      const a = ta.selectionStart;
      const b = ta.selectionEnd;
      const auswahl = ta.value.slice(a, b) || std;
      ta.setRangeText(vor + auswahl + nach, a, b, 'end');
      ta.setSelectionRange(a + vor.length, a + vor.length + auswahl.length);
      ta.focus();
      ta.dispatchEvent(new Event('input'));
    };
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'b') { e.preventDefault(); umschliesse('**', '**', 'fett'); }
    });
    if (beiBild) {
      ta.addEventListener('paste', (e) => {
        const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith('image/'));
        if (item) { e.preventDefault(); beiBild(item.getAsFile()); }
      });
    }
    const tb = (titel, inhalt, fn) => h('button', { class: 'qw-tb', type: 'button', title: titel, 'aria-label': titel, onclick: fn, html: inhalt });
    const werkzeug = h('div', { class: 'qw-toolbar', role: 'toolbar', 'aria-label': label + ': Formatierung' },
      tb('Fett (Strg + B)', '<b>F</b>', () => umschliesse('**', '**', 'fett')),
      tb('Markieren', '<mark>ab</mark>', () => umschliesse('==', '==', 'wichtig')),
      tb('Code', '&lt;/&gt;', () => umschliesse('`', '`', 'Code')),
      tb('Codeblock', '{ }', () => umschliesse('```\n', '\n```', 'Code')),
      tb('Hochgestellt', 'x²', () => umschliesse('^', '^', '2')),
      tb('Tiefgestellt', 'x₂', () => umschliesse('~', '~', '2')),
      tb('Link einfügen', iconHtml('link', 18), () => umschliesse('[', '](https://)', 'Linktext')));
    if (!ta.id) ta.id = neueId();
    aktualisiere();
    return h('div', { class: 'feld qw-texteditor' }, h('label', { for: ta.id }, label), werkzeug, ta, vorschau);
  }

  function ladeBild(datei) {
    return new Promise((ok, nein) => {
      if (!datei || !/^image\//.test(datei.type)) { nein(new Error('bildtyp')); return; }
      const url = URL.createObjectURL(datei);
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const f = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * f));
        const hh = Math.max(1, Math.round(img.naturalHeight * f));
        const c = document.createElement('canvas');
        c.width = w; c.height = hh;
        const ctx = c.getContext('2d');
        const zeichne = (weiss) => { ctx.clearRect(0, 0, w, hh); if (weiss) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, hh); } ctx.drawImage(img, 0, 0, w, hh); };
        let d;
        if (datei.type === 'image/png' || datei.type === 'image/gif' || datei.type === 'image/webp') {
          zeichne(false);
          d = c.toDataURL('image/png');
          if (d.length > 900000) { zeichne(true); d = c.toDataURL('image/jpeg', 0.85); }
        } else { zeichne(true); d = c.toDataURL('image/jpeg', 0.85); }
        URL.revokeObjectURL(url);
        ok(d);
      };
      img.onerror = () => { URL.revokeObjectURL(url); nein(new Error('bild')); };
      img.src = url;
    });
  }

  function bildfeld(lies, setze, beschriftung) {
    const huelle = h('div', { class: 'qw-bildfeld' });
    const input = h('input', { type: 'file', accept: 'image/*', class: 'unsichtbar', 'aria-label': beschriftung });
    async function nimm(datei) {
      try { setze(await ladeBild(datei)); zeichne(); } catch (e) { toast('Dieses Bild konnte nicht geladen werden.', 'fehler'); }
    }
    input.addEventListener('change', () => { if (input.files[0]) nimm(input.files[0]); input.value = ''; });
    function zeichne() {
      const b = lies();
      ersetze(huelle, 
        b ? h('img', { src: b, alt: beschriftung }) : null,
        knopf(b ? 'Bild ersetzen' : 'Bild hinzufügen', () => input.click(), { ic: 'bild' }),
        b ? knopf('Bild entfernen', () => { setze(''); zeichne(); }, { ic: 'x' }) : h('span', { class: 'qw-klein' }, 'oder mit Strg + V ins Textfeld einfügen'),
        input);
    }
    zeichne();
    return { el: huelle, nimm };
  }

  function einstellungsFelder() {
    const e = quiz.einstellungen;
    const timer = h('input', {
      class: 'eingabe', type: 'number', min: '0', max: '600', step: '5', inputmode: 'numeric', value: String(e.timer),
      oninput: (ev) => { e.timer = begrenze(ganzzahl(ev.target.value, 0), 0, 600); geaendert(); },
    });
    return [
      feld('Timer pro Frage (Sekunden)', timer, '0 = kein Timer. Gestartet wird per Knopf oder mit T.'),
      haken('Falsche Antworten kosten Punkte', e.minus, (v) => { e.minus = v; geaendert(); }),
      haken('Ton, wenn die Zeit abgelaufen ist', e.ton, (v) => { e.ton = v; geaendert(); }),
    ];
  }

  /* ---------- Beamer-Modus ---------- */
  function beamerAn() { return wurzel.classList.contains('qw-beamer'); }
  async function beamer() {
    if (!beamerAn()) {
      wurzel.classList.add('qw-beamer');
      try { if (wurzel.requestFullscreen) await wurzel.requestFullscreen(); } catch (e) { /* ohne Vollbild weiter */ }
    } else beendeBeamer();
    if (ansicht === 'spiel') zeigeSpiel();
  }
  function beendeBeamer() {
    wurzel.classList.remove('qw-beamer');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && beamerAn()) { wurzel.classList.remove('qw-beamer'); if (ansicht === 'spiel' && !overlays.length) zeigeSpiel(); }
  });

  /* ---------- Ton ---------- */
  function piep() {
    if (!quiz.einstellungen.ton) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[660, 0], [440, 0.18], [330, 0.36]].forEach(([f, t]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square'; o.frequency.value = f; g.gain.value = 0.06;
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.16);
      });
      setTimeout(() => ctx.close(), 1000);
    } catch (e) { /* ohne Ton */ }
  }

  function timerElement(sekunden) {
    let rest = sekunden;
    let lauf = null;
    const zahl = h('span', { class: 'qw-timer-zahl mono' }, String(rest));
    const balken = h('span', { class: 'qw-timer-fuellung' });
    const status = h('span', { class: 'unsichtbar', 'aria-live': 'assertive' });
    const startKnopf = h('button', { class: 'knopf knopf-zwei knopf-klein', type: 'button', onclick: () => umschalten() }, icon('uhr'), h('span', null, 'Timer starten'));
    const neuKnopf = h('button', { class: 'kopf-knopf', type: 'button', 'aria-label': 'Timer zurücksetzen', title: 'Timer zurücksetzen', onclick: () => zuruecksetzen() }, icon('rueckgaengig'));
    const el = h('div', { class: 'qw-timer' }, startKnopf, h('span', { class: 'qw-timer-balken' }, balken), zahl, neuKnopf, status);
    function zeichne() {
      zahl.textContent = String(rest);
      balken.style.width = (rest / sekunden * 100) + '%';
      el.classList.toggle('aus', rest <= 0);
    }
    function stop() { clearInterval(lauf); lauf = null; startKnopf.lastChild.textContent = rest > 0 ? 'Weiter' : 'Zeit ist um'; }
    function umschalten() {
      if (lauf) { stop(); return; }
      if (rest <= 0) zuruecksetzen();
      startKnopf.lastChild.textContent = 'Pause';
      lauf = setInterval(() => {
        rest -= 1; zeichne();
        if (rest <= 0) { stop(); status.textContent = 'Zeit ist um.'; piep(); }
      }, 1000);
    }
    function zuruecksetzen() { clearInterval(lauf); lauf = null; rest = sekunden; startKnopf.lastChild.textContent = 'Timer starten'; status.textContent = ''; zeichne(); }
    zeichne();
    return { el, umschalten, stop: () => clearInterval(lauf) };
  }

  /* ---------- Dateien: speichern ---------- */
  function slug(t) {
    return String(t || '').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function dateiname(endung) {
    const d = new Date();
    const datum = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    return `${NAME}_${slug(quiz.titel) || 'Quiz'}_${datum}.${endung}`;
  }
  function herunterladen(name, inhalt, typ) {
    const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
    const a = h('a', { href: url, download: name, class: 'unsichtbar' });
    haengeAn(document.body, a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  }
  const alsDataUrl = (blob) => new Promise((ok, nein) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = nein;
    r.readAsDataURL(blob);
  });

  let paketCache = null;
  async function paket() {
    if (OFFLINE) {
      return {
        stil: $('#qw-stil').textContent, code: $('#qw-code').textContent,
        logoHell: ($('.logo-hell') || {}).src || '', logoDunkel: ($('.logo-dunkel') || {}).src || '',
      };
    }
    if (paketCache) return paketCache;
    const basis = SKRIPT_URL || location.href;
    const url = (p) => new URL(p, basis).href;
    const holen = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(u); return r; };
    const [tokens0, base, eigen, code] = await Promise.all(
      [url('/assets/css/tokens.css'), url('/assets/css/base.css'), url('baseboard.css'), basis].map((u) => holen(u).then((r) => r.text())));
    let tokens = tokens0;
    const schriften = [...new Set([...tokens.matchAll(/url\("([^"]+\.woff2?)"\)/g)].map((m) => m[1]))];
    for (const s of schriften) tokens = tokens.split(s).join(await alsDataUrl(await (await holen(url(s))).blob()));
    const logo = async (p) => { try { return await alsDataUrl(new Blob([await (await holen(url(p))).text()], { type: 'image/svg+xml' })); } catch (e) { return 'data:image/svg+xml,' + encodeURIComponent(BILDMARKE); } };
    paketCache = { stil: tokens + '\n' + base + '\n' + eigen, code, logoHell: await logo('/assets/img/web_logo_hell.svg'), logoDunkel: await logo('/assets/img/web_logo_dunkel.svg') };
    return paketCache;
  }

  function baueHtml(p) {
    const daten = JSON.stringify(quiz).replace(/</g, '\\u003c');
    const titel = esc(quiz.titel || 'Quiz');
    const thema = `<button class="kopf-knopf thema-knopf" type="button" aria-label="Dunkelmodus einschalten">${iconHtml('mond', 22, 'mond')}${iconHtml('sonne', 22, 'sonne')}</button>`;
    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${titel} | ${NAME} | Base B</title>
<meta name="generator" content="${NAME} | base-b.de">
<meta name="theme-color" content="#1C2E4A">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(BILDMARKE)}">
<script>try{if(localStorage.getItem('bb-thema')==='dunkel')document.documentElement.setAttribute('data-theme','dunkel')}catch(e){}${SKRIPT_ENDE}
<style id="qw-stil">
${p.stil.replace(/<\/style/gi, '<\\/style')}
</style>
</head>
<body class="qw-datei">
<header class="kopf"><div class="huelle"><a class="logo" href="https://base-b.de" aria-label="Base B, zur Webseite"><img class="logo-hell" src="${p.logoHell}" alt="Base B" width="157" height="34"><img class="logo-dunkel" src="${p.logoDunkel}" alt="Base B" width="157" height="34"></a><span class="etikett qw-datei-etikett">${NAME}</span>${thema}</div></header>
<main id="inhalt"><div class="huelle"><div id="qw" class="qw"><noscript><p class="fehlermeldung">✗ Diese Datei braucht JavaScript.</p></noscript></div></div></main>
<footer class="fuss"><div class="huelle"><span class="mono">Erstellt mit dem ${NAME} auf base-b.de | läuft auch ohne Internet</span></div></footer>
<script type="application/json" id="qw-daten">${daten}${SKRIPT_ENDE}
<script id="qw-code">
${p.code.replace(/<\/script/gi, '<\\/script')}
${SKRIPT_ENDE}
</body>
</html>
`;
  }

  async function speichereHtml() {
    try {
      herunterladen(dateiname('html'), baueHtml(await paket()), 'text/html;charset=utf-8');
      ungespeichert = false;
      toast('Gespeichert. Die Datei lässt sich hier wieder öffnen oder per Doppelklick direkt spielen.');
    } catch (e) {
      toast('Speichern hat nicht geklappt. Bitte die Seite neu laden und nochmal versuchen.', 'fehler');
    }
  }

  const csvFeld = (v) => { v = String(v == null ? '' : v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  function baueCsv(q = quiz) {
    const z = [['Titel', q.titel], ['Timer', q.einstellungen.timer], ['Minuspunkte', q.einstellungen.minus ? 'ja' : 'nein'], [],
      ['Kategorie', 'Punkte', 'Frage', 'Antwort', 'Art']];
    q.kategorien.forEach((k, s) => q.zeilen.forEach((p, zz) => {
      const f = q.felder[s][zz];
      z.push([(k || '').trim() || 'Kategorie ' + (s + 1), f.punkte == null ? p : f.punkte, f.frage, f.antwort, f.art ? ARTEN[f.art] : '']);
    }));
    if (q.schaetz.frage.trim() || q.schaetz.antwort.trim()) {
      z.push(['Schätzfrage', '', q.schaetz.frage, [q.schaetz.antwort, q.schaetz.einheit].filter((x) => x.trim()).join(' ')]);
    }
    return '﻿' + z.map((r) => r.map(csvFeld).join(';')).join('\r\n') + '\r\n';
  }
  function speichereCsv() {
    herunterladen(dateiname('csv'), baueCsv(), 'text/csv;charset=utf-8');
    const bilder = quiz.felder.flat().some((f) => f.frageBild || f.antwortBild) || quiz.schaetz.bild;
    if (bilder) toast('CSV gespeichert, aber ohne Bilder. Für Bilder bitte als HTML speichern.');
    else { ungespeichert = false; toast('CSV gespeichert. Lässt sich in Excel bearbeiten und hier wieder öffnen.'); }
  }

  /* ---------- Dateien: laden ---------- */
  async function leseText(datei) {
    const puffer = await datei.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(puffer); } catch (e) { return new TextDecoder('windows-1252').decode(puffer); }
  }

  function parseCsv(t) {
    t = t.replace(/^﻿/, '');
    const erste = t.split(/\r\n|\n|\r/).find((z) => z.trim()) || '';
    const trenner = [';', '\t', ','].map((c) => [c, erste.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
    const zeilen = [];
    let zeile = [];
    let wert = '';
    let inAnf = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (inAnf) {
        if (c === '"') { if (t[i + 1] === '"') { wert += '"'; i++; } else inAnf = false; } else wert += c;
      } else if (c === '"' && wert === '') inAnf = true;
      else if (c === trenner) { zeile.push(wert); wert = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && t[i + 1] === '\n') i++;
        zeile.push(wert); zeilen.push(zeile); zeile = []; wert = '';
      } else wert += c;
    }
    if (wert !== '' || zeile.length) { zeile.push(wert); zeilen.push(zeile); }
    return zeilen;
  }

  async function entpacke(puffer) {
    const dv = new DataView(puffer);
    let eocd = -1;
    for (let i = puffer.byteLength - 22; i >= Math.max(0, puffer.byteLength - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('zip');
    const anzahl = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const dateien = new Map();
    const dec = new TextDecoder();
    for (let n = 0; n < anzahl; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const nameLen = dv.getUint16(p + 28, true);
      dateien.set(dec.decode(new Uint8Array(puffer, p + 46, nameLen)), {
        methode: dv.getUint16(p + 10, true), groesse: dv.getUint32(p + 20, true), lokal: dv.getUint32(p + 42, true),
      });
      p += 46 + nameLen + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
    }
    async function lies2(name) {
      const d = dateien.get(name);
      if (!d) return null;
      const start = d.lokal + 30 + dv.getUint16(d.lokal + 26, true) + dv.getUint16(d.lokal + 28, true);
      const roh = new Uint8Array(puffer, start, d.groesse);
      if (d.methode === 0) return dec.decode(roh);
      if (typeof DecompressionStream === 'undefined') throw new Error('alt');
      return new Response(new Blob([roh]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    return { namen: [...dateien.keys()], lies: lies2 };
  }

  async function zeilenAusExcel(puffer) {
    const zip = await entpacke(puffer);
    const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
    const geteilt = [];
    const ss = await zip.lies('xl/sharedStrings.xml');
    if (ss) [...xml(ss).getElementsByTagName('si')].forEach((si) => geteilt.push([...si.getElementsByTagName('t')].map((t) => t.textContent).join('')));
    const blattName = zip.namen.includes('xl/worksheets/sheet1.xml') ? 'xl/worksheets/sheet1.xml'
      : zip.namen.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
    if (!blattName) throw new Error('blatt');
    const spalte = (ref) => [...(ref.match(/^[A-Z]+/) || ['A'])[0]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
    return [...xml(await zip.lies(blattName)).getElementsByTagName('row')].map((row) => {
      const r = [];
      [...row.getElementsByTagName('c')].forEach((c, i) => {
        const typ = c.getAttribute('t');
        const v = (c.getElementsByTagName('v')[0] || {}).textContent;
        let w = '';
        if (typ === 's') w = geteilt[Number(v)] || '';
        else if (typ === 'inlineStr') w = [...c.getElementsByTagName('t')].map((t) => t.textContent).join('');
        else w = v || '';
        r[c.getAttribute('r') ? spalte(c.getAttribute('r')) : i] = w;
      });
      return Array.from(r, (x) => (x == null ? '' : x));
    });
  }

  function quizAusZeilen(zeilen) {
    const norm = (s) => String(s == null ? '' : s).trim();
    const q = { titel: '', kategorien: [], zeilen: [], felder: [], schaetz: {}, einstellungen: { timer: 0, minus: true, ton: true } };
    const kopf = zeilen.findIndex((r) => norm(r[0]).toLowerCase() === 'kategorie');
    const spalten = new Map();
    zeilen.forEach((r, i) => {
      const a = norm(r[0]);
      const al = a.toLowerCase();
      if (i === kopf) return;
      if (i < kopf || (kopf < 0 && ['titel', 'timer', 'minuspunkte'].includes(al))) {
        if (al === 'titel') q.titel = norm(r[1]);
        else if (al === 'timer') q.einstellungen.timer = ganzzahl(leseZahl(r[1]), 0);
        else if (al === 'minuspunkte') q.einstellungen.minus = !/^(nein|n|0|false|aus)$/i.test(norm(r[1]));
        return;
      }
      const frage = String(r[2] == null ? '' : r[2]).replace(/\r\n?/g, '\n').trim();
      const antwort = String(r[3] == null ? '' : r[3]).replace(/\r\n?/g, '\n').trim();
      if (!a && !frage && !antwort) return;
      if (/^sch(ä|ae)tzfrage$/i.test(a)) {
        const m = antwort.match(/-?\d[\d.,]*/);
        q.schaetz = { frage, antwort: m ? m[0].replace(/[.,]$/, '') : antwort, einheit: m ? antwort.slice(m.index + m[0].length).trim() : '' };
        return;
      }
      const name = a || 'Kategorie';
      if (!spalten.has(name)) spalten.set(name, []);
      spalten.get(name).push({ punkte: leseZahl(r[1]), frage, antwort, art: leseArt(r[4]) });
    });
    if (!spalten.size) throw new Error('leer');
    const kats = [...spalten.keys()].slice(0, MAX_SPALTEN);
    const anz = Math.min(MAX_ZEILEN, Math.max(...kats.map((k) => spalten.get(k).length)));
    q.kategorien = kats;
    q.zeilen = Array.from({ length: anz }, (_, z) => {
      const haeufig = new Map();
      kats.forEach((k) => { const e = spalten.get(k)[z]; if (e && Number.isFinite(e.punkte)) haeufig.set(Math.round(e.punkte), (haeufig.get(Math.round(e.punkte)) || 0) + 1); });
      return haeufig.size ? [...haeufig.entries()].sort((a, b) => b[1] - a[1])[0][0] : (z + 1) * 100;
    });
    q.felder = kats.map((k) => q.zeilen.map((p, z) => {
      const e = spalten.get(k)[z];
      if (!e) return leeresFeld();
      return { frage: e.frage, antwort: e.antwort, art: e.art, punkte: Number.isFinite(e.punkte) && Math.round(e.punkte) !== p ? Math.round(e.punkte) : null };
    }));
    return normalisiere(q);
  }

  async function ladeDatei(datei) {
    const name = datei.name.toLowerCase();
    try {
      let q;
      if (/\.html?$/.test(name)) {
        const doc = new DOMParser().parseFromString(await leseText(datei), 'text/html');
        const d = doc.getElementById('qw-daten');
        if (!d) throw new Error('keinquiz');
        q = normalisiere(JSON.parse(d.textContent));
      } else if (name.endsWith('.json')) q = normalisiere(JSON.parse(await leseText(datei)));
      else if (name.endsWith('.xlsx')) q = quizAusZeilen(await zeilenAusExcel(await datei.arrayBuffer()));
      else if (/\.(csv|txt|tsv)$/.test(name)) q = quizAusZeilen(parseCsv(await leseText(datei)));
      else if (name.endsWith('.xls')) throw new Error('xls');
      else throw new Error('typ');
      quiz = q;
      spiel = null;
      vorb.amZug = null;
      geaendert();
      ungespeichert = false;
      toast(`"${quiz.titel || datei.name}" geladen.`);
      zeigeVorbereitung();
    } catch (e) {
      const m = {
        keinquiz: 'Diese HTML-Datei ist kein ' + NAME + '-Quiz.',
        xls: 'Bitte die Datei in Excel als .xlsx oder .csv speichern.',
        typ: 'Dieses Dateiformat kennt das ' + NAME + ' nicht. Möglich sind .html, .csv und .xlsx.',
        leer: 'In der Tabelle wurden keine Fragen gefunden. Spalten: Kategorie | Punkte | Frage | Antwort.',
      }[e.message];
      toast(m || 'Die Datei konnte nicht gelesen werden.', 'fehler');
    }
  }

  function dateiAblage() {
    const input = h('input', {
      type: 'file', class: 'unsichtbar', accept: '.html,.htm,.csv,.txt,.xlsx,.json',
      onchange: (e) => { const d = e.target.files[0]; if (d) ladeDatei(d); e.target.value = ''; },
    });
    const ablage = h('label', { class: 'qw-ablage' }, icon('upload', 24),
      h('span', { class: 'qw-ablage-titel' }, 'Datei auswählen oder hier ablegen'),
      h('span', { class: 'qw-klein' }, '.html oder .csv vom ' + NAME + ', auch Excel (.xlsx)'), input);
    ['dragenter', 'dragover'].forEach((ev) => ablage.addEventListener(ev, (e) => { e.preventDefault(); ablage.classList.add('drueber'); }));
    ['dragleave', 'drop'].forEach((ev) => ablage.addEventListener(ev, (e) => { e.preventDefault(); ablage.classList.remove('drueber'); }));
    ablage.addEventListener('drop', (e) => { const d = e.dataTransfer.files[0]; if (d) ladeDatei(d); });
    return ablage;
  }
  function oeffnenKnopf() {
    const input = h('input', { type: 'file', class: 'unsichtbar', accept: '.html,.htm,.csv,.txt,.xlsx,.json', onchange: (e) => { const d = e.target.files[0]; if (d) ladeDatei(d); e.target.value = ''; } });
    return [knopf('Öffnen', () => input.click(), { ic: 'upload' }), input];
  }

  /* ---------- Lösungsblatt (A4, für die Spielleitung) ---------- */
  function druckText(t) {
    return formatiere(t);
  }
  function loesungsblatt() {
    const alt = document.querySelector('.qw-druck');
    if (alt) alt.remove();
    const d = new Date();
    const zz = (n) => String(n).padStart(2, '0');
    const sonderText = (f) => (f.art === 'doppelt' ? '2x' : f.art === 'einsatz' ? 'Einsatz' : '');
    const bildHinweis = (b) => (b ? h('span', { class: 'qw-druck-bild' }, '[Bild]') : null);
    const blatt = h('div', { class: 'qw-druck', 'aria-hidden': 'true' },
      h('div', { class: 'qw-druck-kopf' },
        h('span', { html: BILDMARKE.replace('<svg ', '<svg width="30" height="30" ') }),
        h('span', { class: 'qw-druck-etikett' }, 'LÖSUNGSBLATT | ' + NAME.toUpperCase())),
      h('div', { class: 'qw-druck-titel' }, quiz.titel || 'Ohne Titel'),
      h('div', { class: 'qw-druck-meta' }, `${quiz.kategorien.length} Kategorien | ${quiz.zeilen.length} Zeilen | Stand: ${zz(d.getDate())}.${zz(d.getMonth() + 1)}.${d.getFullYear()} | Nur für die Spielleitung`),
      h('div', { class: 'qw-druck-spalten' },
        quiz.kategorien.map((_, sp) => h('section', { class: 'qw-druck-kat' },
          h('div', { class: 'qw-druck-katname' }, katName(sp)),
          quiz.zeilen.map((__, z) => {
            const f = quiz.felder[sp][z];
            return h('div', { class: 'qw-druck-frage' },
              h('div', { class: 'qw-druck-p' }, fmt(punkteVon(sp, z)), sonderText(f) ? h('span', { class: 'qw-druck-art' }, sonderText(f)) : null),
              h('div', { class: 'qw-druck-fa' },
                h('div', { class: 'qw-druck-f' }, h('span', { html: f.frage.trim() ? druckText(f.frage) : '<i class="qw-druck-leer">(leer)</i>' }), bildHinweis(f.frageBild)),
                h('div', { class: 'qw-druck-a' }, h('span', { html: f.antwort.trim() ? druckText(f.antwort) : '<i class="qw-druck-leer">(keine Antwort)</i>' }), bildHinweis(f.antwortBild))));
          }))),
        (quiz.schaetz.frage.trim() || quiz.schaetz.antwort.trim()) ? h('section', { class: 'qw-druck-kat' },
          h('div', { class: 'qw-druck-katname' }, 'Schätzfrage (Wer beginnt?)'),
          h('div', { class: 'qw-druck-frage' }, h('div', { class: 'qw-druck-p' }, '?'),
            h('div', { class: 'qw-druck-fa' },
              h('div', { class: 'qw-druck-f', html: druckText(quiz.schaetz.frage) }),
              h('div', { class: 'qw-druck-a' }, [quiz.schaetz.antwort, quiz.schaetz.einheit].filter((x) => x.trim()).join(' '))))) : null),
      h('div', { class: 'qw-druck-fuss' }, 'base-b.de | ' + NAME + ' | Lösungsblatt'));
    document.body.append(blatt);
    // Schrift verkleinern, bis alles auf eine A4-Seite passt (Druckbereich 186 x 273 mm)
    const mm = 96 / 25.4;
    const hoehe = 273 * mm;
    let pt = 10.5;
    blatt.style.fontSize = pt + 'pt';
    while (blatt.scrollHeight > hoehe && pt > 6) { pt -= 0.25; blatt.style.fontSize = pt + 'pt'; }
    const passt = blatt.scrollHeight <= hoehe;
    document.documentElement.classList.add('qw-druckt');
    const weg = () => { document.documentElement.classList.remove('qw-druckt'); blatt.remove(); window.removeEventListener('afterprint', weg); };
    window.addEventListener('afterprint', weg);
    if (!passt) toast('Sehr viel Text: Das Lösungsblatt braucht mehr als eine Seite.');
    setTimeout(() => window.print(), 50);
  }

  /* ---------- Beispiel ---------- */
  function beispiel() {
    const f = (frage, antwort) => ({ frage, antwort });
    const q = {
      titel: 'Beispiel: Bits, Office und Österreich',
      kategorien: ['Zahlensysteme', 'Office', 'Österreich', 'Allerlei'],
      zeilen: [100, 200, 300, 400],
      felder: [
        [f('Was ist **1011~2~** im Dezimalsystem?', '**11**'), f('Welchen Wert hat **B~16~** im Dezimalsystem?', '**11**, wie in Base B.'),
          f('Wie viele verschiedene Werte kann **ein Byte** speichern?', '**256**, also 2^8^'), f('Was ist **42** im Binärsystem?', '**101010~2~**\nGern geschehen.')],
        [f('Mit welchem Tastenkürzel wird kopiert?', '`Strg + C`'), f('Wie heißt die Excel-Funktion für den Durchschnitt?', '`=MITTELWERT()`'),
          f('Was bewirkt `Strg + Z`?', 'Die letzte Aktion wird **rückgängig** gemacht.'), f('Wofür stehen die Dollarzeichen in `=$A$1`?', '**Absoluter Bezug:** Spalte und Zeile bleiben beim Kopieren fest.')],
        [f('Wie heißt die Hauptstadt von Österreich?', '**Wien**'), f('Welcher Fluss fließt durch die Stadt Salzburg?', 'Die **Salzach**'),
          f('An wie viele Staaten grenzt Österreich?', 'An **8** Staaten.'), f('Welcher ist der größte See, der ganz in Österreich liegt?', 'Der **Attersee**.')],
        [f('Wie viele Minuten hat ein Tag?', '**1.440**'), f('Wofür steht H~2~O?', '**Wasser**'),
          f('Wie viele Felder hat ein Schachbrett?', '**64** (8 x 8)'), f('Was ist die Antwort auf die Frage nach dem Leben, dem Universum und dem ganzen Rest?', '**42**, laut Douglas Adams.')],
      ],
      schaetz: { frage: 'Wie hoch ist der **Großglockner**, der höchste Berg Österreichs?', antwort: '3.798', einheit: 'm' },
      einstellungen: { timer: 30, minus: true, ton: true },
    };
    q.felder[1][2].art = 'doppelt';
    q.felder[2][3].art = 'einsatz';
    return normalisiere(q);
  }

  /* =================================================================
     Ansicht: Start
     ================================================================= */
  function zeigeStart() {
    beendeBeamer(); schliesseAlleEbenen(); nachOben();
    ansicht = 'start';
    leere();
    const entwurf = OFFLINE ? null : lies(SPEICHER_ENTWURF);
    const gespeichert = OFFLINE ? null : lies(SPEICHER_SPIEL);
    let entwurfQuiz = null;
    let spielQuiz = null;
    try { if (entwurf && entwurf.quiz) entwurfQuiz = normalisiere(entwurf.quiz); } catch (e) { /* kaputt */ }
    try { if (gespeichert && gespeichert.quiz) spielQuiz = normalisiere(gespeichert.quiz); } catch (e) { /* kaputt */ }
    const entwurfHatInhalt = entwurfQuiz && (entwurfQuiz.titel || entwurfQuiz.felder.flat().some(hatInhalt));
    const fortsetzen = [];
    if (spielQuiz && gueltigesSpiel(gespeichert.spiel, spielQuiz)) {
      fortsetzen.push(h('div', { class: 'qw-fortsetzen-karte' },
        h('div', null, h('span', { class: 'etikett' }, 'Laufendes Spiel'), h('p', null, h('b', null, spielQuiz.titel || 'Ohne Titel')), h('p', { class: 'qw-klein' }, 'Stand: ' + datumKurz(gespeichert.zeit))),
        h('div', { class: 'qw-reihe' },
          knopf('Weiterspielen', () => { quiz = spielQuiz; spiel = gespeichert.spiel; zeigeSpiel(); }, { art: 'eins', ic: 'spielen' }),
          knopf('Verwerfen', () => { loesche(SPEICHER_SPIEL); zeigeStart(); }))));
    }
    if (entwurfHatInhalt) {
      fortsetzen.push(h('div', { class: 'qw-fortsetzen-karte' },
        h('div', null, h('span', { class: 'etikett' }, 'Zuletzt bearbeitet'), h('p', null, h('b', null, entwurfQuiz.titel || 'Ohne Titel')), h('p', { class: 'qw-klein' }, 'Stand: ' + datumKurz(entwurf.zeit))),
        h('div', { class: 'qw-reihe' },
          knopf('Weiter bearbeiten', () => { quiz = entwurfQuiz; spiel = null; zeigeEditor(); }, { art: 'eins', ic: 'stift' }),
          knopf('Spielen', () => { quiz = entwurfQuiz; spiel = null; zeigeVorbereitung(); }, { ic: 'spielen' }))));
    }

    let spalten = 5;
    let zeilen = 5;
    const groesse = h('div', { class: 'qw-zwei' });
    const zeichneGroesse = () => ersetze(groesse, 
      zaehler('Kategorien (Spalten)', spalten, 1, MAX_SPALTEN, (n) => { spalten = n; zeichneGroesse(); }, 'sp'),
      zaehler('Fragen pro Kategorie', zeilen, 1, MAX_ZEILEN, (n) => { zeilen = n; zeichneGroesse(); }, 'ze'));
    zeichneGroesse();
    groesse.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]');
      if (k) { const id = k.dataset.k; requestAnimationFrame(() => { const n = groesse.querySelector(`[data-k="${id}"]`); if (n && !n.disabled) n.focus(); }); }
    });

    async function neu() {
      if (entwurfHatInhalt && !(await bestaetige('Neues Quiz anlegen? Der zuletzt bearbeitete Entwurf wird dabei überschrieben.', 'Neu anlegen'))) return;
      quiz = neuesQuiz(spalten, zeilen);
      spiel = null;
      geaendert();
      zeigeEditor();
    }

    haengeAn(wurzel, 
      fortsetzen.length ? h('div', { class: 'qw-fortsetzen' }, fortsetzen) : null,
      h('div', { class: 'qw-start' },
        h('section', { class: 'karte qw-startkarte' },
          h('span', { class: 'etikett' }, 'Neu'), h('h2', null, 'Quiz erstellen'),
          h('p', { class: 'qw-klein' }, 'Raster festlegen, Kategorien benennen, Fragen eintragen. Alles lässt sich später noch ändern.'),
          groesse,
          knopf('Leeres Quiz anlegen', neu, { art: 'eins', ic: 'plus', klein: false })),
        h('section', { class: 'karte qw-startkarte' },
          h('span', { class: 'etikett' }, 'Öffnen'), h('h2', null, 'Quiz-Datei laden'),
          h('p', { class: 'qw-klein' }, 'Eine gespeicherte Datei wieder öffnen, um zu spielen oder weiterzuarbeiten.'),
          dateiAblage()),
        h('section', { class: 'karte qw-startkarte qw-apr' },
          h('div', { class: 'qw-reihe qw-zwischen' }, h('span', { class: 'etikett' }, 'Ausprobieren'), pixel(FIGUR, 44)),
          h('h2', null, 'Beispiel ansehen'),
          h('p', { class: 'qw-klein' }, '4 Kategorien, 16 Fragen und eine Schätzfrage. Zum Spielen, Abschauen oder als Vorlage für Excel.'),
          h('div', { class: 'qw-reihe' },
            knopf('Beispiel spielen', () => { quiz = beispiel(); spiel = null; zeigeVorbereitung(); }, { art: 'eins', ic: 'spielen' }),
            knopf('Bearbeiten', () => { quiz = beispiel(); spiel = null; geaendert(); zeigeEditor(); }, { ic: 'stift' })),
          h('button', { class: 'qw-textlink', type: 'button', onclick: () => herunterladen(`${NAME}_Vorlage.csv`, baueCsv(beispiel()), 'text/csv;charset=utf-8') }, icon('speichern', 18), 'CSV-Vorlage für Excel herunterladen'))),
      h('p', { class: 'qw-klein qw-schloss' }, icon('schloss', 16),
        OFFLINE ? 'Diese Datei läuft komplett auf Ihrem Gerät.'
          : 'Ihre Quizze bleiben auf Ihrem Gerät: kein Konto, kein Server, keine Links. Speichern heißt hier herunterladen. Der aktuelle Entwurf wird zusätzlich nur in diesem Browser zwischengespeichert.'));
  }

  /* =================================================================
     Ansicht: Editor
     ================================================================= */
  function zeigeEditor() {
    beendeBeamer(); schliesseAlleEbenen(); nachOben();
    ansicht = 'editor';
    leere();
    const titel = h('input', {
      class: 'eingabe qw-titel-eingabe', value: quiz.titel, maxlength: '120', placeholder: 'z. B. Wiederholung Kapitel 3',
      oninput: (e) => { quiz.titel = e.target.value; geaendert(); },
    });
    const steuerung = h('div', { class: 'qw-steuerung' });
    const raster = h('div', { class: 'qw-raster-huelle' });
    let start = quiz.zeilen[0] || 100;
    let schritt = quiz.zeilen.length > 1 ? quiz.zeilen[1] - quiz.zeilen[0] : 100;

    function neuZeichnen() {
      const fokus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
      zeichneSteuerung();
      zeichneRaster();
      if (fokus) { const n = wurzel.querySelector(`[data-k="${fokus}"]`); if (n && !n.disabled) n.focus(); }
    }
    async function setzeSpalten(n) {
      n = begrenze(n, 1, MAX_SPALTEN);
      if (n < quiz.kategorien.length) { await entferneSpalte(quiz.kategorien.length - 1); return; }
      while (quiz.kategorien.length < n) { quiz.kategorien.push(''); quiz.felder.push(quiz.zeilen.map(leeresFeld)); }
      geaendert(); neuZeichnen();
    }
    async function setzeZeilen(n) {
      n = begrenze(n, 1, MAX_ZEILEN);
      if (n < quiz.zeilen.length) { await entferneZeile(quiz.zeilen.length - 1); return; }
      while (quiz.zeilen.length < n) {
        const l = quiz.zeilen;
        const d = l.length >= 2 ? l[l.length - 1] - l[l.length - 2] : 100;
        l.push((l[l.length - 1] || 0) + (d || 100));
        quiz.felder.forEach((sp) => sp.push(leeresFeld()));
      }
      geaendert(); neuZeichnen();
    }
    async function entferneSpalte(s) {
      if (quiz.kategorien.length <= 1) return;
      if (quiz.felder[s].some(hatInhalt) && !(await bestaetige(`"${katName(s)}" mit allen Fragen entfernen?`, 'Entfernen'))) return;
      quiz.kategorien.splice(s, 1); quiz.felder.splice(s, 1);
      geaendert(); neuZeichnen();
    }
    async function entferneZeile(z) {
      if (quiz.zeilen.length <= 1) return;
      if (quiz.felder.some((sp) => hatInhalt(sp[z])) && !(await bestaetige(`Zeile ${z + 1} (${fmt(quiz.zeilen[z])} Punkte) mit allen Fragen entfernen?`, 'Entfernen'))) return;
      quiz.zeilen.splice(z, 1); quiz.felder.forEach((sp) => sp.splice(z, 1));
      geaendert(); neuZeichnen();
    }
    function verschiebeSpalte(s, d) {
      const t = s + d;
      if (t < 0 || t >= quiz.kategorien.length) return;
      [quiz.kategorien[s], quiz.kategorien[t]] = [quiz.kategorien[t], quiz.kategorien[s]];
      [quiz.felder[s], quiz.felder[t]] = [quiz.felder[t], quiz.felder[s]];
      geaendert(); neuZeichnen();
    }

    function zeichneSteuerung() {
      const startEl = h('input', { class: 'eingabe', type: 'number', step: '10', value: String(start), oninput: (e) => { start = ganzzahl(e.target.value, start); } });
      const schrittEl = h('input', { class: 'eingabe', type: 'number', step: '10', value: String(schritt), oninput: (e) => { schritt = ganzzahl(e.target.value, schritt); } });
      ersetze(steuerung, 
        zaehler('Kategorien (Spalten)', quiz.kategorien.length, 1, MAX_SPALTEN, setzeSpalten, 'sp'),
        zaehler('Fragen pro Kategorie (Zeilen)', quiz.zeilen.length, 1, MAX_ZEILEN, setzeZeilen, 'ze'),
        h('div', { class: 'qw-verteilen' },
          feld('Punkte ab', startEl), feld('Schritt', schrittEl),
          knopf('Punkte verteilen', () => { quiz.zeilen = quiz.zeilen.map((_, i) => start + i * schritt); geaendert(); neuZeichnen(); toast('Punkte neu verteilt.'); }, { attrs: { 'data-k': 'verteilen' } })));
    }

    function zelle(s, z) {
      const f = quiz.felder[s][z];
      const leer = !f.frage.trim() && !f.frageBild;
      return h('button', {
        class: 'qw-ezelle' + (leer ? ' leer' : ''), type: 'button', 'data-k': `z${s}-${z}`,
        'aria-label': `${katName(s)}, ${fmt(punkteVon(s, z))} Punkte: ${leer ? 'leer' : kurz(f.frage, 60)}. Bearbeiten.`,
        onclick: () => oeffneFeldEditor(s, z, neuZeichnen),
      },
      h('span', { class: 'qw-ezelle-kopf' },
        h('span', { class: 'mono', 'data-p': `${s}-${z}` }, fmt(punkteVon(s, z))),
        f.punkte != null && h('span', { class: 'qw-pille' }, 'eigene Punkte'),
        f.art && h('span', { class: 'qw-pille qw-pille-art' }, ARTEN[f.art]),
        (f.frageBild || f.antwortBild) && icon('bild', 16)),
      h('span', { class: 'qw-ezelle-text' }, leer ? 'Frage eintragen' : kurz(f.frage)),
      !leer && !f.antwort.trim() && !f.antwortBild && h('span', { class: 'qw-ezelle-warn' }, 'Antwort fehlt'));
    }

    function zeichneRaster() {
      const k = quiz.kategorien.length;
      const gitter = h('div', { class: 'qw-raster', style: `grid-template-columns: 112px repeat(${k}, minmax(176px, 1fr))` });
      haengeAn(gitter, h('div', { class: 'qw-ecke etikett' }, 'Punkte'));
      quiz.kategorien.forEach((name, s) => {
        haengeAn(gitter, h('div', { class: 'qw-ekat' },
          h('input', {
            class: 'eingabe qw-kat-eingabe', value: name, maxlength: '80', placeholder: 'Kategorie ' + (s + 1), 'data-k': 'k' + s,
            'aria-label': 'Name der Kategorie ' + (s + 1), oninput: (e) => { quiz.kategorien[s] = e.target.value; geaendert(); },
          }),
          h('div', { class: 'qw-ekat-knoepfe' },
            h('button', { class: 'qw-mini', type: 'button', 'data-k': 'l' + s, title: 'Nach links', 'aria-label': `Kategorie ${s + 1} nach links`, disabled: s === 0, onclick: () => verschiebeSpalte(s, -1) }, icon('zurueck', 18)),
            h('button', { class: 'qw-mini', type: 'button', 'data-k': 'r' + s, title: 'Nach rechts', 'aria-label': `Kategorie ${s + 1} nach rechts`, disabled: s === k - 1, onclick: () => verschiebeSpalte(s, 1) }, icon('weiter', 18)),
            h('button', { class: 'qw-mini qw-mini-weg', type: 'button', title: 'Spalte entfernen', 'aria-label': `Kategorie ${s + 1} entfernen`, disabled: k <= 1, onclick: () => entferneSpalte(s) }, icon('x', 18)))));
      });
      quiz.zeilen.forEach((p, z) => {
        haengeAn(gitter, h('div', { class: 'qw-ezeile' },
          h('input', {
            class: 'eingabe qw-zeilen-punkte', type: 'number', step: '10', value: String(p), 'data-k': 'p' + z, 'aria-label': `Punkte für Zeile ${z + 1}`,
            oninput: (e) => {
              if (e.target.value.trim() === '' || !Number.isFinite(Number(e.target.value))) return;
              quiz.zeilen[z] = ganzzahl(e.target.value, p); geaendert();
              quiz.kategorien.forEach((_, s) => { const el = gitter.querySelector(`[data-p="${s}-${z}"]`); if (el) el.textContent = fmt(punkteVon(s, z)); });
            },
          }),
          h('button', { class: 'qw-mini qw-mini-weg', type: 'button', title: 'Zeile entfernen', 'aria-label': `Zeile ${z + 1} entfernen`, disabled: quiz.zeilen.length <= 1, onclick: () => entferneZeile(z) }, icon('x', 18))));
        quiz.kategorien.forEach((_, s) => haengeAn(gitter, zelle(s, z)));
      });
      ersetze(raster, gitter);
    }

    const sq = quiz.schaetz;
    const schaetzBild = bildfeld(() => sq.bild, (v) => { sq.bild = v; geaendert(); }, 'Bild zur Schätzfrage');
    const [oeffnen, oeffnenInput] = oeffnenKnopf();

    haengeAn(wurzel, 
      leiste(
        knopf('Start', zeigeStart, { ic: 'zurueck' }), oeffnen, oeffnenInput, platz(),
        knopf('Als HTML speichern', speichereHtml, { ic: 'speichern' }),
        knopf('Als CSV speichern', speichereCsv, { ic: 'speichern' }),
        knopf('Lösungsblatt', loesungsblatt, { ic: 'drucker', attrs: { title: 'Fragen und Antworten kompakt auf einer A4-Seite drucken oder als PDF speichern' } }),
        knopf('Spielen', zeigeVorbereitung, { art: 'eins', ic: 'spielen' })),
      h('section', { class: 'karte qw-abschnitt' }, feld('Titel des Quiz', titel)),
      h('section', { class: 'karte qw-abschnitt', 'aria-labelledby': 'qw-h-raster' },
        h('div', { class: 'qw-karte-kopf' }, h('h2', { id: 'qw-h-raster' }, 'Raster'),
          h('p', { class: 'qw-klein' }, 'Feld anklicken, um Frage und Antwort einzutragen. Punkte gelten pro Zeile, einzelne Felder können eigene Punkte bekommen.')),
        steuerung, raster),
      h('section', { class: 'karte qw-abschnitt', 'aria-labelledby': 'qw-h-schaetz' },
        h('div', { class: 'qw-karte-kopf' }, h('h2', { id: 'qw-h-schaetz' }, 'Schätzfrage'), h('span', { class: 'qw-pille' }, 'optional')),
        h('p', { class: 'qw-klein' }, 'Entscheidet, welches Team beginnt: Alle Teams schätzen gleichzeitig, wer am nächsten dran ist, fängt an.'),
        texteditor({ label: 'Frage', wert: sq.frage, setze: (v) => { sq.frage = v; geaendert(); }, platzhalter: 'z. B. Wie hoch ist der Großglockner?', zeilen: 2, beiBild: (d) => schaetzBild.nimm(d) }),
        schaetzBild.el,
        h('div', { class: 'qw-zwei' },
          feld('Richtige Antwort (Zahl)', h('input', { class: 'eingabe', inputmode: 'decimal', value: sq.antwort, placeholder: '3.798', oninput: (e) => { sq.antwort = e.target.value; geaendert(); } })),
          feld('Einheit', h('input', { class: 'eingabe', value: sq.einheit, placeholder: 'm', maxlength: '30', oninput: (e) => { sq.einheit = e.target.value; geaendert(); } })))),
      h('section', { class: 'karte qw-abschnitt', 'aria-labelledby': 'qw-h-regeln' },
        h('h2', { id: 'qw-h-regeln' }, 'Spielregeln'),
        h('div', { class: 'qw-regeln' }, einstellungsFelder())),
      h('details', { class: 'qw-hilfe-text' },
        h('summary', null, 'Formatierung und CSV-Aufbau'),
        h('div', { class: 'qw-text', html: formatiere('**fett** wird **fett** | ==markiert== wird ==markiert== | `Code` wird `Code` | x^2^ wird x^2^ | H~2~O wird H~2~O\nLinks wie https://base-b.de werden automatisch klickbar. Videos am besten als Link einfügen.') }),
        h('p', { class: 'qw-klein' }, 'CSV und Excel: Spalten Kategorie | Punkte | Frage | Antwort | Art, eine Zeile pro Frage. In "Art" steht nichts, "2x" oder "Einsatz". Davor optional Zeilen wie "Titel; Mein Quiz", "Timer; 30" und "Minuspunkte; ja". Eine Zeile mit der Kategorie "Schätzfrage" wird zur Schätzfrage. Bilder gehen nur in der HTML-Datei mit.')));
    zeichneSteuerung();
    zeichneRaster();
  }

  function oeffneFeldEditor(s, z, danach) {
    const f = quiz.felder[s][z];
    const m = modal('Feld bearbeiten', { breit: true, etikett: `${katName(s)} | Zeile ${z + 1}` });
    const frageBild = bildfeld(() => f.frageBild, (v) => { f.frageBild = v; geaendert(); }, 'Bild zur Frage');
    const antwortBild = bildfeld(() => f.antwortBild, (v) => { f.antwortBild = v; geaendert(); }, 'Bild zur Antwort');
    const punkte = h('input', {
      class: 'eingabe', type: 'number', step: '10', value: f.punkte == null ? '' : String(f.punkte), placeholder: fmt(quiz.zeilen[z]),
      oninput: (e) => { f.punkte = e.target.value.trim() === '' ? null : ganzzahl(e.target.value, null); geaendert(); },
    });
    const frageEd = texteditor({ label: 'Frage', wert: f.frage, setze: (v) => { f.frage = v; geaendert(); }, platzhalter: 'Frage eintragen', beiBild: (d) => frageBild.nimm(d) });
    frageEd.querySelector('textarea').setAttribute('data-fokus', '');
    haengeAn(m.inhalt, 
      frageEd, frageBild.el,
      texteditor({ label: 'Antwort', wert: f.antwort, setze: (v) => { f.antwort = v; geaendert(); }, platzhalter: 'Antwort eintragen', zeilen: 2, beiBild: (d) => antwortBild.nimm(d) }),
      antwortBild.el,
      h('div', { class: 'qw-zwei' }, feld('Eigene Punkte für dieses Feld', punkte, `Leer lassen = Punkte der Zeile (${fmt(quiz.zeilen[z])}).`)),
      feldartWahl(f));
    const reihenfolge = [];
    quiz.kategorien.forEach((_, ss) => quiz.zeilen.forEach((__, zz) => reihenfolge.push([ss, zz])));
    const pos = reihenfolge.findIndex(([a, b]) => a === s && b === z);
    const gehe = (d) => { const ziel = reihenfolge[pos + d]; if (!ziel) return; m.schliesse(); oeffneFeldEditor(ziel[0], ziel[1], danach); };
    haengeAn(m.fuss, 
      knopf('Vorheriges', () => gehe(-1), { ic: 'zurueck', attrs: { disabled: pos <= 0 } }),
      knopf('Nächstes', () => gehe(1), { ic: 'weiter', attrs: { disabled: pos >= reihenfolge.length - 1 } }),
      platz(),
      knopf('Fertig', () => m.schliesse(), { art: 'eins', ic: 'haken', klein: false }));
    m.oeffne({
      schliessen: () => danach && danach(),
      taste: (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { gehe(1); return true; } return false; },
    });
  }

  function feldartWahl(f) {
    const name = neueId();
    const hilfe = h('p', { class: 'qw-klein', 'aria-live': 'polite' });
    const texte = {
      '': 'Ein ganz normales Feld.',
      doppelt: 'Doppelte Punkte. Auf dem Brett sieht das Feld normal aus, die Überraschung kommt beim Öffnen.',
      einsatz: `Das Team am Zug entscheidet vor der Frage, wie viele Punkte es setzt: höchstens ${fmt(maxEinsatz())} (der höchste Zeilenwert).`,
    };
    const zeige = () => { hilfe.textContent = texte[f.art]; };
    zeige();
    return h('fieldset', { class: 'qw-feldart' },
      h('legend', { class: 'feld-titel' }, 'Feldart'),
      h('div', { class: 'qw-pillen' }, Object.entries({ '': 'Normal', doppelt: '2x Punkte', einsatz: 'Einsatz-Feld' }).map(([wert, label]) =>
        h('label', { class: 'qw-wahl' }, h('input', { type: 'radio', name, value: wert, checked: f.art === wert, onchange: () => { f.art = wert; geaendert(); zeige(); } }), label))),
      hilfe);
  }

  /* =================================================================
     Ansicht: Spiel vorbereiten
     ================================================================= */
  function zeigeVorbereitung() {
    beendeBeamer(); schliesseAlleEbenen(); nachOben();
    ansicht = 'vorbereitung';
    leere();
    const k = quiz.kategorien.length;
    const z = quiz.zeilen.length;
    const alle = quiz.felder.flat();
    const leer = alle.filter((f) => !f.frage.trim() && !f.frageBild).length;
    let summe = 0;
    quiz.kategorien.forEach((_, s) => quiz.zeilen.forEach((__, zz) => { summe += Math.max(0, punkteVon(s, zz)) * (quiz.felder[s][zz].art === 'doppelt' ? 2 : 1); }));
    const sonder = alle.filter((f) => f.art).length;

    let laufend = null;
    if (spiel && gueltigesSpiel(spiel, quiz)) laufend = spiel;
    else if (OFFLINE) {
      const g = lies(SPEICHER_SPIEL);
      if (g && g.hash === quizHash() && gueltigesSpiel(g.spiel, quiz)) laufend = g.spiel;
    }

    const teamListe = h('div', { class: 'qw-teamliste' });
    const starterText = h('p', { class: 'qw-starter-stand', 'aria-live': 'polite' });
    function zeichneStarter() {
      ersetze(starterText, vorb.amZug != null && vorb.teams[vorb.amZug] != null
        ? h('span', null, 'Beginnt: ', h('b', null, vorb.teams[vorb.amZug] || 'Team ' + (vorb.amZug + 1)))
        : h('span', { class: 'qw-klein' }, 'Noch offen. Ohne Auswahl beginnt das erste Team.'));
    }
    function zeichneTeams() {
      ersetze(teamListe, ...vorb.teams.map((n, i) => h('div', { class: 'qw-teamzeile' },
        h('span', { class: 'mono qw-teamnr' }, String(i + 1)),
        h('input', { class: 'eingabe', value: n, maxlength: '40', placeholder: 'Team ' + (i + 1), 'aria-label': 'Name von Team ' + (i + 1), 'data-k': 't' + i, oninput: (e) => { vorb.teams[i] = e.target.value; zeichneStarter(); } }),
        h('button', {
          class: 'qw-mini qw-mini-weg', type: 'button', 'aria-label': `Team ${i + 1} entfernen`, title: 'Team entfernen', disabled: vorb.teams.length <= 1,
          onclick: () => { vorb.teams.splice(i, 1); if (vorb.amZug != null && vorb.amZug >= vorb.teams.length) vorb.amZug = null; zeichneTeams(); zeichneStarter(); },
        }, icon('x', 18)))),
      vorb.teams.length < MAX_TEAMS ? knopf('Team hinzufügen', () => {
        vorb.teams.push('Team ' + (vorb.teams.length + 1)); zeichneTeams();
        const n = teamListe.querySelector(`[data-k="t${vorb.teams.length - 1}"]`); if (n) { n.focus(); n.select(); }
      }, { ic: 'plus' }) : null);
    }
    const namen = () => vorb.teams.map((n, i) => n.trim() || 'Team ' + (i + 1));
    const starter = (tab) => oeffneStarter(namen(), tab, (i) => { vorb.amZug = i; zeichneStarter(); });
    zeichneTeams();
    zeichneStarter();

    const [oeffnen, oeffnenInput] = oeffnenKnopf();
    haengeAn(wurzel, 
      leiste(
        knopf('Start', zeigeStart, { ic: 'zurueck' }), oeffnen, oeffnenInput, platz(),
        knopf('Lösungsblatt', loesungsblatt, { ic: 'drucker', attrs: { title: 'Fragen und Antworten kompakt auf einer A4-Seite drucken oder als PDF speichern' } }),
        knopf('Bearbeiten', zeigeEditor, { ic: 'stift' }),
        OFFLINE ? knopf('Als HTML speichern', speichereHtml, { ic: 'speichern' }) : null),
      h('div', { class: 'qw-vorb-kopf' },
        h('span', { class: 'etikett' }, 'Spiel vorbereiten'),
        h(OFFLINE ? 'h1' : 'h2', { class: 'qw-gross-titel' }, quiz.titel || 'Ohne Titel'),
        h('p', { class: 'mono qw-klein' }, `${k} Kategorien | ${z} Zeilen | ca. ${fmt(summe)} Punkte im Spiel` + (sonder ? ` | ${sonder} Sonderfeld${sonder > 1 ? 'er' : ''} versteckt` : '')),
        leer ? h('p', { class: 'hinweis' }, `${leer} von ${k * z} Feldern sind noch leer. Spielen geht trotzdem.`) : null),
      h('div', { class: 'qw-vorb' },
        h('section', { class: 'karte qw-abschnitt', 'aria-labelledby': 'qw-h-teams' },
          h('div', { class: 'qw-karte-kopf' }, h('h2', { id: 'qw-h-teams' }, 'Teams'), h('span', { class: 'qw-klein mono' }, `max. ${MAX_TEAMS}`)),
          teamListe),
        h('div', { class: 'qw-vorb-rechts' },
          h('section', { class: 'karte qw-abschnitt', 'aria-labelledby': 'qw-h-wer' },
            h('h2', { id: 'qw-h-wer' }, 'Wer beginnt?'),
            starterText,
            h('div', { class: 'qw-reihe' },
              knopf('Würfeln', () => starter('wuerfeln'), { ic: 'wuerfel' }),
              knopf('Zufall', () => starter('zufall'), { ic: 'los' }),
              knopf('Schätzfrage', () => starter('schaetzen'), { ic: 'ziel' }))),
          h('section', { class: 'karte qw-abschnitt', 'aria-labelledby': 'qw-h-regeln2' },
            h('h2', { id: 'qw-h-regeln2' }, 'Spielregeln'), h('div', { class: 'qw-regeln' }, einstellungsFelder())))),
      h('div', { class: 'qw-reihe qw-startreihe' },
        knopf(laufend ? 'Neues Spiel starten' : 'Spiel starten', starteSpiel, { art: laufend ? 'zwei' : 'eins', ic: 'spielen', klein: false }),
        laufend ? knopf('Laufendes Spiel fortsetzen', () => { spiel = laufend; zeigeSpiel(); }, { art: 'eins', ic: 'weiter', klein: false }) : null));
  }

  async function starteSpiel() {
    if (spiel && gueltigesSpiel(spiel, quiz) && Object.keys(spiel.gespielt).length
      && !(await bestaetige('Neues Spiel starten? Der bisherige Spielstand geht verloren.', 'Neu starten'))) return;
    const namen = vorb.teams.map((n, i) => n.trim() || 'Team ' + (i + 1));
    const positiv = quiz.zeilen.map(Math.abs).filter(Boolean);
    spiel = {
      form: form(), hash: quizHash(), teams: namen.map((name) => ({ name, punkte: 0 })), gespielt: {},
      amZug: vorb.amZug != null && vorb.amZug < namen.length ? vorb.amZug : 0, verlauf: [],
      schritt: positiv.length ? Math.min(...positiv) : 100,
    };
    speichereSpiel();
    zeigeSpiel();
  }

  /* =================================================================
     Ansicht: Spiel
     ================================================================= */
  function merke() {
    spiel.verlauf.push(JSON.stringify({ teams: spiel.teams, gespielt: spiel.gespielt, amZug: spiel.amZug }));
    if (spiel.verlauf.length > 60) spiel.verlauf.shift();
  }
  function rueckgaengig(still = false) {
    const s = spiel.verlauf.pop();
    if (!s) { if (!still) toast('Nichts mehr rückgängig zu machen.'); return; }
    Object.assign(spiel, JSON.parse(s));
    speichereSpiel();
    if (!still) { toast('Rückgängig gemacht.'); zeigeSpiel(); }
  }
  const alleGespielt = () => quiz.kategorien.every((_, s) => quiz.zeilen.every((__, z) => spiel.gespielt[s + '-' + z]));

  function zeigeSpiel() {
    schliesseAlleEbenen();
    if (ansicht !== 'spiel') nachOben();
    ansicht = 'spiel';
    const fokus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
    leere();
    const k = quiz.kategorien.length;
    const z = quiz.zeilen.length;
    const brett = h('div', { class: 'qw-brett', style: `grid-template-columns: repeat(${k}, minmax(0, 1fr)); --qw-zeilen: ${z}` });
    quiz.kategorien.forEach((_, s) => haengeAn(brett, h('div', { class: 'qw-kat' }, katName(s))));
    quiz.zeilen.forEach((__, zz) => quiz.kategorien.forEach((_, s) => {
      const gespielt = !!spiel.gespielt[s + '-' + zz];
      haengeAn(brett, h('button', {
        class: 'qw-feld' + (gespielt ? ' gespielt' : ''), type: 'button', 'data-k': `f${s}-${zz}`,
        'aria-label': `${katName(s)}, ${fmt(punkteVon(s, zz))} Punkte${gespielt ? ', schon gespielt' : ''}`,
        onclick: () => oeffneFrage(s, zz),
      }, fmt(punkteVon(s, zz))));
    }));

    const schrittEl = h('input', {
      class: 'eingabe qw-schritt', type: 'number', step: '10', value: String(spiel.schritt), 'aria-label': 'Schritt für Plus und Minus',
      oninput: (e) => { const n = ganzzahl(e.target.value, spiel.schritt); if (n) { spiel.schritt = Math.abs(n); speichereSpiel(); } },
    });
    const teams = h('div', { class: 'qw-teams' }, spiel.teams.map((t, i) => {
      const am = i === spiel.amZug;
      const aendere = (d) => { merke(); t.punkte += d; speichereSpiel(); zeigeSpiel(); };
      return h('div', { class: 'qw-team' + (am ? ' am-zug' : '') },
        h('div', { class: 'qw-team-kopf' },
          h('button', {
            class: 'qw-team-name', type: 'button', 'data-k': 'n' + i, 'aria-pressed': am ? 'true' : 'false', title: 'Als "am Zug" markieren',
            onclick: () => { if (spiel.amZug !== i) { merke(); spiel.amZug = i; speichereSpiel(); zeigeSpiel(); } },
          }, t.name),
          am ? h('span', { class: 'etikett qw-amzug' }, 'Am Zug') : null),
        punkteKnopf(t, i),
        h('div', { class: 'qw-team-knoepfe' },
          h('button', { class: 'knopf knopf-zwei knopf-klein', type: 'button', 'data-k': 'm' + i, 'aria-label': `${t.name}: ${fmt(spiel.schritt)} Punkte abziehen`, onclick: () => aendere(-spiel.schritt) }, icon('minus')),
          h('button', { class: 'knopf knopf-zwei knopf-klein', type: 'button', 'data-k': 'a' + i, 'aria-label': `${t.name}: ${fmt(spiel.schritt)} Punkte dazu`, onclick: () => aendere(spiel.schritt) }, icon('plus'))));
    }));

    const nochOffen = quiz.kategorien.length * quiz.zeilen.length - Object.keys(spiel.gespielt).length;
    haengeAn(wurzel, 
      h('div', { class: 'qw-spielkopf' },
        h('h2', { class: 'qw-spieltitel' }, quiz.titel || NAME),
        h('div', { class: 'qw-reihe' },
          knopf('Wer beginnt?', () => oeffneStarter(spiel.teams.map((t) => t.name), 'wuerfeln', (i) => { merke(); spiel.amZug = i; speichereSpiel(); zeigeSpiel(); }), { ic: 'wuerfel', attrs: { 'data-k': 'wer' } }),
          knopf('Rückgängig', () => rueckgaengig(), { ic: 'rueckgaengig', attrs: { disabled: !spiel.verlauf.length, 'data-k': 'undo', title: 'Strg + Z' } }),
          knopf(beamerAn() ? 'Beamer aus' : 'Beamer', beamer, { ic: 'beamer', attrs: { 'data-k': 'beamer', title: 'Taste F' } }),
          knopf('Ergebnis', zeigeEnde, { ic: 'pokal', attrs: { 'data-k': 'ende' } }),
          beamerAn() ? null : knopf('Bearbeiten', zeigeEditor, { ic: 'stift' }),
          beamerAn() ? null : knopf('Teams', zeigeVorbereitung, { ic: 'team' }))),
      brett,
      teams,
      h('div', { class: 'qw-reihe qw-zwischen qw-spielfuss' },
        h('label', { class: 'qw-schritt-feld' }, 'Schritt für + und -', schrittEl),
        h('span', { class: 'qw-klein mono' }, nochOffen ? `${nochOffen} Felder offen` : 'Alle Felder gespielt'),
        h('p', { class: 'qw-klein qw-tasten' }, h('span', { class: 'kap' }, 'F'), ': Beamer | ', h('span', { class: 'kap' }, 'Strg + Z'), ': Rückgängig | Punkte anklicken zum direkten Ändern')));
    if (fokus) { const n = wurzel.querySelector(`[data-k="${fokus}"]`); if (n && !n.disabled) n.focus(); }
  }

  function punkteKnopf(t, i) {
    const b = h('button', {
      class: 'qw-punkte' + (t.punkte < 0 ? ' minus' : ''), type: 'button', 'data-k': 'p' + i, title: 'Punkte direkt ändern',
      'aria-label': `${t.name}: ${fmt(t.punkte)} Punkte. Zum Ändern anklicken.`,
      onclick: () => {
        const inp = h('input', { class: 'eingabe qw-punkte-feld', type: 'number', step: '10', value: String(t.punkte), 'aria-label': 'Punkte von ' + t.name });
        let erledigt = false;
        const fertig = (speichern) => {
          if (erledigt) return;
          erledigt = true;
          if (speichern && inp.value.trim() !== '') {
            const n = ganzzahl(inp.value, t.punkte);
            if (n !== t.punkte) { merke(); t.punkte = n; speichereSpiel(); }
          }
          zeigeSpiel();
          const n2 = wurzel.querySelector(`[data-k="p${i}"]`); if (n2) n2.focus();
        };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') fertig(true); if (e.key === 'Escape') { e.stopPropagation(); fertig(false); } });
        inp.addEventListener('blur', () => fertig(true));
        b.replaceWith(inp);
        inp.focus();
        inp.select();
      },
    }, fmt(t.punkte));
    return b;
  }

  /* ---------- Frage spielen ---------- */
  function oeffneFrage(s, z) {
    const f = quiz.felder[s][z];
    const key = s + '-' + z;
    const warGespielt = !!spiel.gespielt[key];
    merke();
    const vorherAmZug = spiel.amZug;
    const art = f.art;
    const basis = punkteVon(s, z);
    let punkte = art === 'doppelt' ? basis * 2 : basis;
    let einsatzOffen = art === 'einsatz';
    let einsatzTeam = null;
    const marken = new Map();
    let reihenfolge = [];
    const wirkung = (art, p) => (art === 'r' ? p : quiz.einstellungen.minus ? -p : 0);
    let zu = null;
    let fertig = false;

    const antwortKnopf = h('button', { class: 'knopf knopf-zwei', type: 'button', onclick: () => zeigeAntwort(antwort.hidden) }, h('span', null, 'Antwort zeigen'));
    const antwort = h('div', { class: 'qw-antwort', hidden: true },
      h('span', { class: 'etikett' }, 'Antwort'),
      h('div', { class: 'qw-text', html: f.antwort.trim() ? formatiere(f.antwort) : (f.antwortBild ? '' : '<span class="qw-leer">Keine Antwort hinterlegt.</span>') }),
      f.antwortBild ? h('div', { class: 'qw-medien' }, h('img', { src: f.antwortBild, alt: 'Bild zur Antwort' })) : null);
    function zeigeAntwort(an) {
      antwort.hidden = !an;
      antwortKnopf.firstChild.textContent = an ? 'Antwort verbergen' : 'Antwort zeigen';
    }

    const timer = quiz.einstellungen.timer > 0 ? timerElement(quiz.einstellungen.timer) : null;
    const punkteEl = h('input', {
      class: 'eingabe qw-fragepunkte', type: 'number', step: '10', value: String(punkte), 'aria-label': 'Punkte für diese Frage',
      oninput: (e) => {
        if (e.target.value.trim() === '') return;
        const neu = ganzzahl(e.target.value, punkte);
        marken.forEach((art, i) => { spiel.teams[i].punkte += wirkung(art, neu) - wirkung(art, punkte); });
        punkte = neu;
        zeichneWertung();
      },
    });
    const wertung = h('div', { class: 'qw-wertung' });
    function bewerte(i, art) {
      const alt = marken.get(i);
      if (alt) { spiel.teams[i].punkte -= wirkung(alt, punkte); marken.delete(i); reihenfolge = reihenfolge.filter((x) => x !== i); }
      if (alt !== art) { marken.set(i, art); reihenfolge.push(i); spiel.teams[i].punkte += wirkung(art, punkte); }
      const richtige = reihenfolge.filter((x) => marken.get(x) === 'r');
      spiel.amZug = richtige.length ? richtige[richtige.length - 1] : vorherAmZug;
      if (art === 'r' && marken.get(i) === 'r') zeigeAntwort(true);
      zeichneWertung();
      const n = wertung.querySelector(`[data-w="${art}${i}"]`); if (n && document.activeElement === document.body) n.focus();
    }
    function zeichneWertung() {
      const fokus = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.w : null;
      ersetze(wertung, ...spiel.teams.map((t, i) => {
        const m = marken.get(i);
        return h('div', { class: 'qw-wteam' + (m ? ' ' + (m === 'r' ? 'ist-richtig' : 'ist-falsch') : '') },
          h('div', { class: 'qw-wteam-kopf' },
            h('span', { class: 'qw-wteam-name' }, h('span', { class: 'mono qw-teamnr' }, String(i + 1)), t.name, i === einsatzTeam ? h('span', { class: 'qw-pille' }, 'setzt ' + fmt(punkte)) : null),
            h('span', { class: 'mono' + (t.punkte < 0 ? ' qw-minus' : '') }, fmt(t.punkte))),
          h('div', { class: 'qw-wknoepfe' },
            h('button', { class: 'qw-wknopf richtig', type: 'button', 'data-w': 'r' + i, 'aria-pressed': m === 'r' ? 'true' : 'false', onclick: () => bewerte(i, 'r') },
              h('span', { class: 'sym', 'aria-hidden': 'true' }, '✓'), 'richtig'),
            h('button', { class: 'qw-wknopf falsch', type: 'button', 'data-w': 'f' + i, 'aria-pressed': m === 'f' ? 'true' : 'false', onclick: () => bewerte(i, 'f') },
              h('span', { class: 'sym', 'aria-hidden': 'true' }, '✗'), 'falsch')));
      }));
      if (fokus) { const n = wertung.querySelector(`[data-w="${fokus}"]`); if (n) n.focus(); }
    }
    zeichneWertung();

    function abschliessen() {
      fertig = true;
      spiel.gespielt[key] = true;
      speichereSpiel();
      zu();
      zeigeSpiel();
      if (alleGespielt()) zeigeEnde();
    }
    function abbrechen() {
      fertig = true;
      rueckgaengig(true);
      zu();
      zeigeSpiel();
    }
    function freigeben() {
      fertig = true;
      marken.forEach((art, i) => { spiel.teams[i].punkte -= wirkung(art, punkte); });
      spiel.amZug = vorherAmZug;
      delete spiel.gespielt[key];
      speichereSpiel();
      zu();
      zeigeSpiel();
      toast('Feld ist wieder offen.');
    }

    let einsatzPanel = null;
    if (einsatzOffen) {
      const max = maxEinsatz();
      let wahlTeam = spiel.amZug;
      const teamWahl = h('div', { class: 'qw-pillen', role: 'radiogroup', 'aria-label': 'Welches Team setzt?' });
      const zeichneWahl = () => ersetze(teamWahl, spiel.teams.map((t, i) => h('button', {
        class: 'qw-wahlknopf', type: 'button', role: 'radio', 'aria-checked': i === wahlTeam ? 'true' : 'false',
        onclick: () => { wahlTeam = i; zeichneWahl(); },
      }, t.name, i === spiel.amZug ? h('span', { class: 'qw-klein' }, ' (am Zug)') : null)));
      zeichneWahl();
      const einsatzFehler = h('p', { class: 'fehlermeldung', hidden: true, role: 'alert' });
      const einsatzEl = h('input', { class: 'eingabe qw-einsatz-eingabe', type: 'number', min: '0', max: String(max), step: '10', value: String(Math.min(basis, max)), 'data-fokus': true, 'aria-label': 'Einsatz in Punkten' });
      const bestaetige2 = () => {
        const n = Number(einsatzEl.value);
        if (einsatzEl.value.trim() === '' || !Number.isFinite(n) || n < 0 || n > max) {
          einsatzFehler.textContent = `✗ Der Einsatz muss zwischen 0 und ${fmt(max)} Punkten liegen.`;
          einsatzFehler.hidden = false;
          einsatzEl.focus();
          return;
        }
        punkte = Math.round(n);
        einsatzTeam = wahlTeam;
        punkteEl.value = String(punkte);
        einsatzOffen = false;
        einsatzPanel.remove();
        const teil = buehne.querySelector('.qw-spielteil');
        teil.hidden = false;
        $('.qw-buehne-etikett', buehne).textContent = `${katName(s)} | Einsatz: ${fmt(punkte)} Punkte von ${spiel.teams[einsatzTeam].name}`;
        zeichneWertung();
        const k = buehne.querySelector('.qw-buehne-fuss .knopf'); if (k) k.focus();
      };
      einsatzPanel = h('div', { class: 'qw-einsatz' },
        h('div', { class: 'qw-sonder' }, pixel(FIGUR, 44), h('div', null, h('span', { class: 'qw-sonder-titel' }, 'Einsatz-Feld!'),
          h('span', { class: 'qw-klein' }, `Das Team entscheidet vor der Frage, wie viele Punkte es setzt. Höchstens ${fmt(max)}.`))),
        h('div', { class: 'feld' }, h('span', null, 'Welches Team setzt?'), teamWahl),
        h('div', { class: 'qw-reihe' },
          feld(`Einsatz (0 bis ${fmt(max)})`, einsatzEl),
          h('div', { class: 'qw-reihe qw-einsatz-schnell' }, [...new Set([Math.round(max / 4), Math.round(max / 2), max])].filter((x) => x > 0).map((w) =>
            knopf(fmt(w), () => { einsatzEl.value = String(w); einsatzFehler.hidden = true; })))),
        einsatzFehler,
        h('div', null, knopf('Frage zeigen', bestaetige2, { art: 'eins', ic: 'weiter', klein: false })));
      einsatzPanel.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === einsatzEl) { e.preventDefault(); e.stopPropagation(); bestaetige2(); } });
    }

    const id = neueId();
    const buehne = h('div', { class: 'qw-buehne', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id },
      h('div', { class: 'qw-buehne-inhalt' },
        h('div', { class: 'qw-buehne-kopf' },
          h('span', { class: 'etikett qw-buehne-etikett', id }, `${katName(s)} | ${art === 'doppelt' ? fmt(basis) + ' x 2 = ' + fmt(punkte) : art === 'einsatz' ? 'Einsatz-Feld' : fmt(basis)} Punkte`.replace('Einsatz-Feld Punkte', 'Einsatz-Feld')),
          warGespielt ? h('span', { class: 'qw-pille' }, 'schon gespielt') : null,
          platz(),
          h('button', { class: 'kopf-knopf', type: 'button', 'aria-label': 'Abbrechen, Feld bleibt offen', title: 'Abbrechen (Esc)', onclick: abbrechen }, icon('x'))),
        einsatzPanel,
        h('div', { class: 'qw-spielteil', hidden: einsatzOffen },
        art === 'doppelt' ? h('div', { class: 'qw-sonder', role: 'status' }, pixel(FIGUR, 44), h('div', null, h('span', { class: 'qw-sonder-titel' }, 'Doppelte Punkte!'), h('span', { class: 'qw-klein' }, `Diese Frage zählt ${fmt(punkte)} statt ${fmt(basis)} Punkte.`))) : null,
        h('div', { class: 'qw-frage-bereich' },
          h('div', { class: 'qw-frage qw-text', html: f.frage.trim() ? formatiere(f.frage) : (f.frageBild ? '' : '<span class="qw-leer">Für dieses Feld gibt es noch keine Frage.</span>') }),
          f.frageBild ? h('div', { class: 'qw-medien' }, h('img', { src: f.frageBild, alt: 'Bild zur Frage' })) : null),
        timer ? timer.el : null,
        h('div', { class: 'qw-reihe qw-zwischen' }, antwortKnopf,
          h('label', { class: 'qw-schritt-feld' }, 'Punkte für diese Frage', punkteEl)),
        antwort,
        h('div', { class: 'qw-wertung-kopf' }, h('span', { class: 'etikett' }, 'Wertung'),
          h('span', { class: 'qw-klein' }, quiz.einstellungen.minus ? 'Falsch zieht die Punkte ab. Nochmal klicken nimmt die Wertung zurück.' : 'Falsch gibt keine Minuspunkte. Nochmal klicken nimmt die Wertung zurück.')),
        wertung),
        h('div', { class: 'qw-reihe qw-buehne-fuss' },
          h('button', { class: 'knopf', type: 'button', 'data-fokus': true, onclick: abschliessen }, icon('haken'), 'Feld abschließen'),
          h('button', { class: 'knopf knopf-zwei', type: 'button', onclick: abbrechen }, 'Abbrechen'),
          warGespielt ? h('button', { class: 'knopf knopf-zwei', type: 'button', onclick: freigeben }, icon('rueckgaengig'), 'Feld wieder freigeben') : null,
          platz(),
          h('p', { class: 'qw-klein qw-tasten' },
            h('span', { class: 'kap' }, 'A'), ': Antwort | ', timer ? [h('span', { class: 'kap' }, 'T'), ': Timer | '] : null,
            h('span', { class: 'kap' }, '1-9'), ': richtig | ', h('span', { class: 'kap' }, 'Umschalt + 1-9'), ': falsch | ',
            h('span', { class: 'kap' }, 'Enter'), ': abschließen | ', h('span', { class: 'kap' }, 'Esc'), ': abbrechen'))));

    zu = oeffneEbene(buehne, {
      schliessen: () => { if (timer) timer.stop(); if (!fertig) { fertig = true; rueckgaengig(true); } },
      taste: (e) => {
        if (e.key === 'Escape') { abbrechen(); return true; }
        if (einsatzOffen) return false;
        if (e.target.matches('input, textarea')) { if (e.key === 'Enter') { e.target.blur(); return true; } return false; }
        if (e.ctrlKey || e.metaKey || e.altKey) return false;
        if (e.key === 'a' || e.key === 'A' || (e.key === ' ' && !e.target.closest('button'))) { zeigeAntwort(antwort.hidden); return true; }
        if ((e.key === 't' || e.key === 'T') && timer) { timer.umschalten(); return true; }
        if (e.key === 'Enter' && !e.target.closest('button')) { abschliessen(); return true; }
        const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
        if (m && Number(m[1]) <= spiel.teams.length) { bewerte(Number(m[1]) - 1, e.shiftKey ? 'f' : 'r'); return true; }
        return false;
      },
    });
  }

  /* ---------- Ergebnis ---------- */
  function zeigeEnde() {
    const m = modal('Ergebnis', { etikett: alleGespielt() ? 'Alle Felder gespielt' : 'Zwischenstand' });
    const sortiert = spiel.teams.map((t, i) => ({ ...t, i })).sort((a, b) => b.punkte - a.punkte);
    const top = sortiert[0].punkte;
    const sieger = sortiert.filter((t) => t.punkte === top);
    let satz;
    if (sieger.length > 1) satz = `Gleichstand zwischen ${liste(sieger.map((t) => t.name))}. Sehr diplomatisch.`;
    else satz = `${sieger[0].name} ${alleGespielt() ? 'gewinnt' : 'führt'} mit ${fmt(top)} Punkten.` + (top === 42 ? ' 101010₂. Gern geschehen.' : '');
    let platzNr = 0;
    let vorher = null;
    haengeAn(m.inhalt, 
      h('div', { class: 'qw-ende-kopf' }, pixel(FIGUR, 66), h('p', { class: 'qw-ende-satz' }, satz)),
      h('ol', { class: 'qw-rangliste' }, sortiert.map((t, n) => {
        if (t.punkte !== vorher) { platzNr = n + 1; vorher = t.punkte; }
        return h('li', { class: platzNr === 1 ? 'erster' : '' },
          h('span', { class: 'mono qw-platz-nr' }, platzNr + '.'), h('span', { class: 'qw-rang-name' }, t.name),
          h('span', { class: 'mono qw-rang-punkte' + (t.punkte < 0 ? ' qw-minus' : '') }, fmt(t.punkte)));
      })));
    haengeAn(m.fuss, 
      knopf('Zum Spielbrett', () => m.schliesse(), { art: 'eins', klein: false, attrs: { 'data-fokus': true } }),
      knopf('Neue Runde, gleiche Teams', async () => {
        m.schliesse();
        if (!(await bestaetige('Alle Punkte auf 0 setzen und alle Felder wieder öffnen?', 'Neue Runde'))) return;
        merke();
        spiel.teams.forEach((t) => { t.punkte = 0; });
        spiel.gespielt = {};
        speichereSpiel();
        zeigeSpiel();
      }, { ic: 'rueckgaengig', klein: false }));
    m.oeffne();
  }

  /* ---------- Wer beginnt? ---------- */
  function oeffneStarter(namen, startTab, fertig) {
    const m = modal('Wer beginnt?', { breit: true });
    let gewinner = null;
    let geschlossen = false;
    const aufraeumen = [];
    const ergebnis = h('p', { class: 'qw-starter-ergebnis', role: 'status', 'aria-live': 'polite' });
    const uebernehmen = h('button', { class: 'knopf', type: 'button', disabled: true, onclick: () => { fertig(gewinner); m.schliesse(); } }, icon('haken'), h('span', null, 'Übernehmen'));
    function setzeGewinner(i, satz) {
      gewinner = i;
      ergebnis.textContent = satz || '';
      ergebnis.classList.toggle('sieg', i != null);
      uebernehmen.disabled = i == null;
      uebernehmen.lastChild.textContent = i == null ? 'Übernehmen' : `${namen[i]} beginnt`;
    }

    const tabs = [['wuerfeln', 'Würfeln', 'wuerfel'], ['zufall', 'Zufall', 'los'], ['schaetzen', 'Schätzfrage', 'ziel']];
    const tabLeiste = h('div', { class: 'qw-tabs', role: 'tablist', 'aria-label': 'Verfahren' });
    const panel = h('div', { class: 'qw-tabpanel', role: 'tabpanel' });
    function waehle(tab, opts = {}) {
      aufraeumen.splice(0).forEach((fn) => fn());
      setzeGewinner(null, '');
      ersetze(tabLeiste, ...tabs.map(([kenn, label, ic]) => h('button', {
        class: 'qw-tab', type: 'button', role: 'tab', 'aria-selected': kenn === tab ? 'true' : 'false', tabindex: kenn === tab ? '0' : '-1',
        onclick: () => waehle(kenn), onkeydown: (e) => {
          const i = tabs.findIndex((t) => t[0] === kenn);
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length][0];
            waehle(n); const b = tabLeiste.querySelector('[aria-selected="true"]'); if (b) b.focus();
          }
        },
      }, icon(ic), label)));
      ersetze(panel, tab === 'wuerfeln' ? panelWuerfeln(opts.nur) : tab === 'zufall' ? panelZufall() : panelSchaetzen());
    }

    function wuerfelBild(w) {
      const an = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[w] || [];
      return h('span', { class: 'qw-wuerfel', role: 'img', 'aria-label': w ? 'Würfel zeigt ' + w : 'Würfel' },
        Array.from({ length: 9 }, (_, i) => h('i', { class: an.includes(i) ? 'an' : '' })));
    }

    function panelWuerfeln(nur) {
      const alle = namen.map((_, i) => i);
      let kandidaten = nur || alle;
      const werte = {};
      let sieger = [];
      const reihe = h('div', { class: 'qw-wuerfel-reihe' });
      const wurfKnopf = h('button', { class: 'knopf', type: 'button', 'data-fokus': true, onclick: wurf }, icon('wuerfel'), h('span', null, 'Würfeln'));
      function zeichne() {
        ersetze(reihe, ...namen.map((n, i) => h('div', { class: 'qw-wuerfel-team' + (kandidaten.includes(i) ? '' : ' raus') + (sieger.includes(i) ? ' sieg' : '') },
          wuerfelBild(werte[i] || 0), h('span', { class: 'qw-wuerfel-name' }, n))));
      }
      async function wurf() {
        if (sieger.length === 1) { kandidaten = alle; Object.keys(werte).forEach((k) => delete werte[k]); }
        sieger = [];
        wurfKnopf.disabled = true;
        setzeGewinner(null, '');
        if (BEWEGUNG) {
          for (let t = 0; t < 10; t++) {
            kandidaten.forEach((i) => { werte[i] = 1 + zufall(6); });
            zeichne();
            await warte(60 + t * 10);
            if (geschlossen) return;
          }
        }
        kandidaten.forEach((i) => { werte[i] = 1 + zufall(6); });
        const max = Math.max(...kandidaten.map((i) => werte[i]));
        sieger = kandidaten.filter((i) => werte[i] === max);
        zeichne();
        if (sieger.length === 1) {
          setzeGewinner(sieger[0], `${namen[sieger[0]]} würfelt eine ${max} und beginnt.`);
          wurfKnopf.lastChild.textContent = 'Neu würfeln';
        } else {
          kandidaten = sieger.slice();
          setzeGewinner(null, `Gleichstand mit ${max}: ${liste(sieger.map((i) => namen[i]))}. Die Würfel sind sich uneinig, also nochmal.`);
          wurfKnopf.lastChild.textContent = 'Nochmal würfeln';
          sieger = [];
        }
        wurfKnopf.disabled = false;
        wurfKnopf.focus();
      }
      zeichne();
      return h('div', { class: 'qw-panel' },
        h('p', { class: 'qw-klein' }, nur ? 'Nur die Teams mit Gleichstand würfeln.' : 'Jedes Team bekommt einen Wurf. Die höchste Zahl beginnt, bei Gleichstand wird nachgewürfelt.'),
        reihe, h('div', null, wurfKnopf));
    }

    function panelZufall() {
      const chips = namen.map((n) => h('span', { class: 'qw-los-team' }, n));
      const losKnopf = h('button', { class: 'knopf', type: 'button', 'data-fokus': true, onclick: auslosen }, icon('los'), 'Auslosen');
      async function auslosen() {
        losKnopf.disabled = true;
        setzeGewinner(null, '');
        const n = namen.length;
        const ziel = zufall(n);
        if (BEWEGUNG && n > 1) {
          const schritte = n * Math.max(2, Math.ceil(14 / n)) + ziel;
          for (let s = 0; s <= schritte; s++) {
            chips.forEach((c, i) => c.classList.toggle('aktiv', i === s % n));
            await warte(45 + Math.pow(s / schritte, 2) * 260);
            if (geschlossen) return;
          }
        }
        chips.forEach((c, i) => c.classList.toggle('aktiv', i === ziel));
        setzeGewinner(ziel, `${namen[ziel]} beginnt. Garantiert zufällig. Meistens.`);
        losKnopf.disabled = false;
      }
      return h('div', { class: 'qw-panel' },
        h('p', { class: 'qw-klein' }, 'Ein Team wird zufällig ausgelost.'),
        h('div', { class: 'qw-los' }, chips), h('div', null, losKnopf));
    }

    function panelSchaetzen() {
      const sq = quiz.schaetz;
      const vorhanden = !!(sq.frage.trim() || sq.antwort.trim());
      let eigeneFrage = '';
      let eigeneAntwort = '';
      const tipps = namen.map(() => '');
      const ausgabe = h('div', { class: 'qw-schaetz-ausgabe', 'aria-live': 'polite' });
      const timer = timerElement(quiz.einstellungen.timer || 30);
      aufraeumen.push(() => timer.stop());
      const kopf = vorhanden
        ? h('div', { class: 'qw-schaetz-frage' },
          h('div', { class: 'qw-text', html: sq.frage.trim() ? formatiere(sq.frage) : '<span class="qw-leer">Ohne Fragetext</span>' }),
          sq.bild ? h('div', { class: 'qw-medien' }, h('img', { src: sq.bild, alt: 'Bild zur Schätzfrage' })) : null)
        : h('div', { class: 'qw-zwei' },
          feld('Frage (optional)', h('input', { class: 'eingabe qw-text-eingabe', placeholder: 'Wie viele ...?', oninput: (e) => { eigeneFrage = e.target.value; } })),
          feld('Richtige Antwort', h('input', { class: 'eingabe', inputmode: 'decimal', placeholder: 'z. B. 1.250', oninput: (e) => { eigeneAntwort = e.target.value; } })));
      function aufloesen() {
        timer.stop();
        const richtig = leseZahl(vorhanden ? sq.antwort : eigeneAntwort);
        const einheit = vorhanden ? sq.einheit.trim() : '';
        if (!Number.isFinite(richtig)) { ersetze(ausgabe, h('p', { class: 'fehlermeldung' }, '✗ Bitte zuerst die richtige Antwort als Zahl eintragen.')); return; }
        const liste2 = tipps.map((t, i) => ({ i, tipp: leseZahl(t) })).filter((x) => Number.isFinite(x.tipp))
          .map((x) => ({ ...x, diff: Math.abs(x.tipp - richtig) })).sort((a, b) => a.diff - b.diff);
        if (!liste2.length) { ersetze(ausgabe, h('p', { class: 'fehlermeldung' }, '✗ Noch keine Schätzungen eingetragen.')); return; }
        const min = liste2[0].diff;
        const beste = liste2.filter((x) => x.diff === min).map((x) => x.i);
        const mitE = (n) => fmt(n) + (einheit ? ' ' + einheit : '');
        ersetze(ausgabe, 
          h('p', { class: 'qw-schaetz-richtig' }, h('span', { class: 'etikett' }, 'Richtig'), h('span', { class: 'mono' }, mitE(richtig))),
          h('table', { class: 'qw-tabelle' },
            h('thead', null, h('tr', null, h('th', null, 'Team'), h('th', null, 'Schätzung'), h('th', null, 'Abweichung'))),
            h('tbody', null, liste2.map((x) => h('tr', { class: beste.includes(x.i) ? 'sieg' : '' },
              h('td', null, namen[x.i]), h('td', { class: 'mono' }, mitE(x.tipp)), h('td', { class: 'mono' }, mitE(x.diff)))))),
          beste.length > 1 ? h('div', { class: 'qw-reihe' }, knopf('Unter diesen Teams würfeln', () => waehle('wuerfeln', { nur: beste }), { ic: 'wuerfel' })) : null);
        if (beste.length === 1) setzeGewinner(beste[0], min === 0 ? `Volltreffer: ${namen[beste[0]]} liegt genau richtig und beginnt.` : `${namen[beste[0]]} liegt mit ${mitE(min)} Abweichung am nächsten und beginnt.`);
        else setzeGewinner(null, `Gleichstand: ${liste(beste.map((i) => namen[i]))} liegen gleich nah dran.`);
      }
      return h('div', { class: 'qw-panel' },
        h('p', { class: 'qw-klein' }, vorhanden ? 'Alle Teams schätzen gleichzeitig. Wer am nächsten dran ist, beginnt.'
          : 'Im Quiz ist keine Schätzfrage hinterlegt. Hier spontan eine stellen, oder im Editor eine festlegen.'),
        kopf, timer.el,
        h('div', { class: 'qw-tipps' }, namen.map((n, i) => feld(n, h('input', { class: 'eingabe', inputmode: 'decimal', placeholder: 'Schätzung', 'data-fokus': i === 0 ? true : null, oninput: (e) => { tipps[i] = e.target.value; } })))),
        h('div', null, h('button', { class: 'knopf', type: 'button', onclick: aufloesen }, icon('ziel'), 'Auflösen')),
        ausgabe);
    }

    haengeAn(m.inhalt, tabLeiste, panel, ergebnis);
    haengeAn(m.fuss, uebernehmen, knopf('Schließen', () => m.schliesse(), { klein: false }));
    waehle(startTab);
    m.oeffne({ schliessen: () => { geschlossen = true; aufraeumen.forEach((fn) => fn()); } });
  }

  /* ---------- Tastatur ---------- */
  document.addEventListener('keydown', (e) => {
    const oben = overlays[overlays.length - 1];
    if (oben) {
      if (e.key === 'Tab') { fokusFalle(e, oben.el); return; }
      if (oben.taste && oben.taste(e)) e.preventDefault();
      return;
    }
    if (ansicht !== 'spiel' || e.target.matches('input, textarea, select')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); rueckgaengig(); }
    else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) beamer();
  });

  window.addEventListener('beforeunload', (e) => {
    if (OFFLINE && ungespeichert && ansicht === 'editor') { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- Dunkelmodus in gespeicherten Dateien (ohne site.js) ---------- */
  if (OFFLINE && !window.bbThema) {
    const setze = (t) => {
      if (t === 'dunkel') document.documentElement.setAttribute('data-theme', 'dunkel'); else document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('bb-thema', t); } catch (e) { /* egal */ }
      document.querySelectorAll('.thema-knopf').forEach((k) => {
        k.setAttribute('aria-label', t === 'dunkel' ? 'Hellen Modus einschalten' : 'Dunkelmodus einschalten');
        k.setAttribute('aria-pressed', t === 'dunkel' ? 'true' : 'false');
      });
    };
    const aktuell = () => (document.documentElement.getAttribute('data-theme') === 'dunkel' ? 'dunkel' : 'hell');
    setze(aktuell());
    document.querySelectorAll('.thema-knopf').forEach((k) => k.addEventListener('click', () => setze(aktuell() === 'dunkel' ? 'hell' : 'dunkel')));
  }

  /* ---------- Los geht's ---------- */
  if (OFFLINE) {
    try {
      quiz = normalisiere(JSON.parse($('#qw-daten').textContent));
      zeigeVorbereitung();
    } catch (e) {
      zeigeStart();
      toast('Die Quizdaten in dieser Datei sind beschädigt.', 'fehler');
    }
  } else zeigeStart();
})();
