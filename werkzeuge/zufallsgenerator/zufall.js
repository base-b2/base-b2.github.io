/* Base B | Zufallsgenerator
   Alles läuft lokal im Browser. Hochgeladene Listen werden nicht gespeichert oder übertragen. */
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const SELTEN = ['Q', 'X', 'Y'];
  // Zusätzliche Zeichen, einzeln dazuschaltbar (doppelte Zeichen in mehreren Gruppen zählen nur einmal)
  const GRUPPEN = [
    { id: 'umlaute', name: 'Umlaute und ß', zeichen: ['Ä', 'Ö', 'Ü', 'ß'] },
    { id: 'franz', name: 'Französisch', zeichen: 'À Â Ç É È Ê Ë Î Ï Ô Œ Ù Û'.split(' ') },
    { id: 'span', name: 'Spanisch', zeichen: 'Á É Í Ñ Ó Ú'.split(' ') },
    { id: 'tuerk', name: 'Türkisch', zeichen: 'Ç Ğ İ Ö Ş Ü'.split(' ') },
    { id: 'skand', name: 'Skandinavisch', zeichen: 'Å Æ Ø'.split(' ') },
    { id: 'griech', name: 'Griechisch', zeichen: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'.split('').map((g) => `${g} (${g.toLowerCase()})`) },   // paarweise, sonst nicht von lateinischen zu unterscheiden
    { id: 'sonder', name: 'Sonderzeichen', zeichen: '! ? & % # @ * + = § $ € / ( )'.split(' ') },
  ];
  const RUHIG = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Sprüche nach dem Ziehen: zufällig, nie zweimal hintereinander derselbe
  const SPRUECHE = [
    'Kein Bit wurde bestochen.', 'Der Zufall hat entschieden.', 'Gezogen. Nicht geschoben.',
    'Ohne Absprache gezogen.', 'Ganz ohne Lieblinge.', 'Niemand hat nachgeholfen.',
    'Reklamationen bitte an den Zufall.', 'Diskussion zwecklos.', 'Frisch gemischt.', 'Unparteiisch wie immer.',
  ];
  let letzterSpruch = -1;
  function spruch() {
    let i;
    do { i = zufallInt(0, SPRUECHE.length - 1); } while (i === letzterSpruch && SPRUECHE.length > 1);
    letzterSpruch = i;
    return SPRUECHE[i];
  }

  const st = {
    listen: [],                 // { id, titel, werte: [] }
    pools: new Map(),           // Schlüssel -> Set der gezogenen Werte bzw. Indizes
    verlauf: [],
    letzte: null,               // { titel, werte: [...], zusatz, text }
    aktiv: new Set(ALPHABET.filter((b) => !SELTEN.includes(b))),
    gruppen: new Set(),         // eingeschaltete Zeichen-Gruppen
    laeuft: false,
  };

  /* ---------- Zufall (kryptografisch, ohne Modulo-Verzerrung) ---------- */
  function zufallInt(min, max) {
    const spanne = max - min + 1;
    if (spanne <= 1) return min;
    const grenze = Math.floor(0x100000000 / spanne) * spanne;
    const a = new Uint32Array(1);
    let x;
    do { crypto.getRandomValues(a); x = a[0]; } while (x >= grenze);
    return min + (x % spanne);
  }
  const zahlText = (n) => n.toLocaleString('de-DE');

  /* ---------- Buchstaben-Knöpfe ---------- */
  // Alle gerade angezeigten Zeichen: lateinisches Alphabet plus eingeschaltete Gruppen, ohne Doppelte
  function sichtbareZeichen() {
    const alle = [...ALPHABET];
    GRUPPEN.forEach((g) => { if (st.gruppen.has(g.id)) g.zeichen.forEach((z) => { if (!alle.includes(z)) alle.push(z); }); });
    return alle;
  }
  function zeichenKnopf(b) {
    const k = document.createElement('button');
    k.type = 'button'; k.className = 'zg-bs' + (b.length > 2 ? ' breit' : ''); k.textContent = b; k.dataset.b = b;
    k.addEventListener('click', () => {
      if (st.aktiv.has(b)) st.aktiv.delete(b); else st.aktiv.add(b);
      aktualisiereBuchstaben(); aktualisiere();
    });
    return k;
  }
  const bsBox = $('#buchstaben');
  ALPHABET.forEach((b) => bsBox.append(zeichenKnopf(b)));
  GRUPPEN.forEach((g) => {
    const p = document.createElement('button');
    p.type = 'button'; p.className = 'zg-gruppe-knopf'; p.textContent = g.name;
    p.setAttribute('aria-pressed', 'false');
    p.addEventListener('click', () => schalteGruppe(g, p));
    $('#gruppen').append(p);
  });
  function schalteGruppe(g, knopf) {
    const an = !st.gruppen.has(g.id);
    const ziel = $('#gruppen-felder');
    if (an) {
      st.gruppen.add(g.id);
      g.zeichen.forEach((z) => st.aktiv.add(z));
      const block = document.createElement('div');
      block.className = 'zg-gruppe'; block.dataset.gruppe = g.id;
      const titel = document.createElement('span');
      titel.className = 'zg-klein'; titel.textContent = g.name;
      const box = document.createElement('div');
      box.className = 'zg-buchstaben';
      g.zeichen.forEach((z) => box.append(zeichenKnopf(z)));
      block.append(titel, box);
      // Reihenfolge wie in GRUPPEN beibehalten
      const danach = [...ziel.children].find((c) => GRUPPEN.findIndex((x) => x.id === c.dataset.gruppe) > GRUPPEN.indexOf(g));
      ziel.insertBefore(block, danach || null);
    } else {
      st.gruppen.delete(g.id);
      const bleibt = new Set(sichtbareZeichen());
      g.zeichen.forEach((z) => { if (!bleibt.has(z)) st.aktiv.delete(z); });
      const block = ziel.querySelector(`[data-gruppe="${g.id}"]`);
      if (block) block.remove();
    }
    knopf.setAttribute('aria-pressed', an ? 'true' : 'false');
    aktualisiereBuchstaben(); aktualisiere();
  }
  $$('[data-buchstaben]').forEach((k) => k.addEventListener('click', () => {
    const art = k.dataset.buchstaben;
    const alle = sichtbareZeichen();
    st.aktiv = new Set(art === 'alle' ? alle : art === 'ohne' ? alle.filter((b) => !SELTEN.includes(b)) : []);
    aktualisiereBuchstaben(); aktualisiere();
  }));
  function aktualisiereBuchstaben() {
    const pool = st.pools.get(schluessel(konfig())) || new Set();
    $$('.zg-bs').forEach((k) => {
      const an = st.aktiv.has(k.dataset.b);
      k.setAttribute('aria-pressed', an ? 'true' : 'false');
      k.classList.toggle('gezogen', an && pool.has(k.dataset.b));
      k.setAttribute('aria-label', k.dataset.b + (pool.has(k.dataset.b) ? ' (gezogen)' : ''));
    });
    const alle = sichtbareZeichen();
    $('#buchstaben-zahl').textContent = `${alle.filter((b) => st.aktiv.has(b)).length} von ${alle.length} aktiv`;
  }

  /* ---------- Aktuelle Einstellung ---------- */
  function konfig() {
    const kat = $('#kategorie').value;
    if (kat === 'zahlen') {
      const b = $('input[name="bereich"]:checked').value;
      let min = 1, max = 100;
      if (b === 'eigen') { min = Math.round(Number($('#von').value)); max = Math.round(Number($('#bis').value)); }
      else [min, max] = b.split('-').map(Number);
      return { kat, typ: 'zahl', titel: `Zahlen ${zahlText(min)}-${zahlText(max)}`, min, max };
    }
    if (kat === 'buchstaben') return { kat, typ: 'werte', titel: 'Buchstaben', werte: sichtbareZeichen().filter((b) => st.aktiv.has(b)) };
    if (kat === 'wuerfel') {
      const w = $('input[name="seiten"]:checked').value;
      let seiten = w === 'eigen' ? Math.round(Number($('#seiten-zahl').value)) : Number(w);
      if (!Number.isFinite(seiten)) seiten = 6;
      seiten = Math.min(100, Math.max(1, seiten));
      return { kat, typ: 'wuerfel', titel: `Würfel (1-${seiten})`, seiten };
    }
    if (kat === 'muenze') return { kat, typ: 'muenze', titel: 'Münze' };
    if (kat === 'import') return { kat, typ: 'import', titel: 'Eigene Liste' };
    const liste = st.listen.find((l) => 'liste:' + l.id === kat);
    return { kat, typ: 'werte', titel: liste.titel, werte: liste.werte, liste: true };
  }
  function schluessel(k) {
    if (k.typ === 'zahl') return `zahl:${k.min}:${k.max}`;
    if (k.kat === 'buchstaben') return 'buchstaben';
    return k.kat;
  }
  const poolErlaubt = (k) => k.typ === 'zahl' || k.typ === 'werte';
  const entfernen = () => $('input[name="pool"]:checked').value === 'entfernen';

  function universumGroesse(k) {
    return k.typ === 'zahl' ? k.max - k.min + 1 : k.werte.length;
  }
  function anzahlWeg(k, weg) {
    if (!weg) return 0;
    if (k.kat === 'buchstaben') return k.werte.filter((b) => weg.has(b)).length;
    return weg.size;
  }

  /* ---------- Anzeige der Einstellungen ---------- */
  function zeigePanel() {
    const kat = $('#kategorie').value;
    const panel = kat.startsWith('liste:') ? 'liste' : kat;
    $$('.zg-panel').forEach((p) => { p.hidden = p.dataset.panel !== panel; });
    $('#eigener-bereich').hidden = $('input[name="bereich"]:checked').value !== 'eigen';
    $('#eigene-seiten').hidden = $('input[name="seiten"]:checked').value !== 'eigen';
  }

  function fehler(text) {
    const f = $('#fehler');
    f.textContent = text ? '✗ ' + text : '';
    f.hidden = !text;
  }

  function pruefe(k) {
    if (k.typ === 'import') return 'Bitte zuerst eine Datei auswählen oder eine Liste einfügen.';
    if (k.typ === 'zahl') {
      if (!Number.isFinite(k.min) || !Number.isFinite(k.max)) return 'Bitte bei "Von" und "Bis" ganze Zahlen eintragen.';
      if (k.min >= k.max) return '"Bis" muss größer sein als "Von".';
      if (k.max - k.min > 1e12) return 'Dieser Bereich ist zu groß.';
    }
    if (k.typ === 'werte' && k.werte.length < 1) return k.kat === 'buchstaben' ? 'Bitte mindestens einen Buchstaben auswählen.' : 'Diese Liste ist leer.';
    return '';
  }

  function aktualisiere() {
    zeigePanel();
    const k = konfig();
    const pf = $('#pool-feld');
    pf.disabled = !poolErlaubt(k);
    $('#ergebnis-titel').textContent = k.typ === 'import' ? 'Ergebnis' : k.titel;
    const z = $('#ziehen');
    z.disabled = k.typ === 'import';
    $('#ziehen-text').textContent = k.typ === 'wuerfel' ? 'Würfeln' : k.typ === 'muenze' ? 'Werfen' : 'Ziehen';
    const info = $('#pool-info');
    if (poolErlaubt(k) && !pruefe(k)) {
      const gesamt = universumGroesse(k);
      const weg = entfernen() ? anzahlWeg(k, st.pools.get(schluessel(k))) : 0;
      info.textContent = entfernen() ? `Noch im Pool: ${zahlText(gesamt - weg)} von ${zahlText(gesamt)}` : 'Wiederholungen erlaubt';
    } else info.textContent = '';
    if (k.kat === 'buchstaben') aktualisiereBuchstaben();
    fehler('');
  }

  /* ---------- Ziehen ---------- */
  function ziehe(k, n) {
    if (k.typ === 'wuerfel') {
      const w = Array.from({ length: n }, () => zufallInt(1, k.seiten));
      return { werte: w.map(String), zusatz: n > 1 ? `Summe: ${w.reduce((a, b) => a + b, 0)}` : '' };
    }
    if (k.typ === 'muenze') {
      const w = Array.from({ length: n }, () => (zufallInt(0, 1) ? 'Kopf' : 'Zahl'));
      return { werte: w, zusatz: '', text: true };
    }
    const key = schluessel(k);
    const ohneWiederholung = entfernen();
    if (!st.pools.has(key)) st.pools.set(key, new Set());
    const weg = st.pools.get(key);
    const gesamt = universumGroesse(k);
    const frei = ohneWiederholung ? gesamt - anzahlWeg(k, weg) : gesamt;
    if (frei <= 0) return { leer: true };
    const anzahl = ohneWiederholung ? Math.min(n, frei) : n;
    const ergebnis = [];

    if (k.typ === 'zahl') {
      const neu = new Set();
      if (ohneWiederholung && gesamt <= 200000 && frei < gesamt / 2) {
        const rest = [];
        for (let x = k.min; x <= k.max; x++) if (!weg.has(x)) rest.push(x);
        for (let i = 0; i < anzahl; i++) ergebnis.push(rest.splice(zufallInt(0, rest.length - 1), 1)[0]);
      } else {
        while (ergebnis.length < anzahl) {
          const x = zufallInt(k.min, k.max);
          if (ohneWiederholung && (weg.has(x) || neu.has(x))) continue;
          neu.add(x); ergebnis.push(x);
        }
      }
      if (ohneWiederholung) ergebnis.forEach((x) => weg.add(x));
      return { werte: ergebnis.map(zahlText), zusatz: anzahl < n ? `Nur noch ${anzahl} im Pool gewesen.` : '' };
    }

    // Buchstaben und Listen: über Indizes, damit doppelte Einträge erhalten bleiben
    const idsWeg = k.kat === 'buchstaben' ? new Set(k.werte.map((w, i) => (weg.has(w) ? i : -1)).filter((i) => i >= 0)) : weg;
    const rest = k.werte.map((_, i) => i).filter((i) => !ohneWiederholung || !idsWeg.has(i));
    for (let i = 0; i < anzahl; i++) {
      const j = ohneWiederholung ? rest.splice(zufallInt(0, rest.length - 1), 1)[0] : rest[zufallInt(0, rest.length - 1)];
      ergebnis.push(k.werte[j]);
      if (ohneWiederholung) weg.add(k.kat === 'buchstaben' ? k.werte[j] : j);
    }
    return { werte: ergebnis, zusatz: anzahl < n ? `Nur noch ${anzahl} im Pool gewesen.` : '', text: !!k.liste };
  }

  // Münze: Kopfseite zeigt das Bit (Maskottchen), Zahlseite eine 1
  const BIT = '<g transform="translate(32 20) scale(0.75)" shape-rendering="crispEdges">'
    + '<rect x="0" y="0" width="12" height="24" fill="#1C2E4A"/><rect x="24" y="12" width="24" height="6" fill="#6A1B2B"/>'
    + '<rect x="0" y="24" width="48" height="36" fill="#1C2E4A"/><rect x="12" y="30" width="12" height="12" fill="#FFFFFF"/>'
    + '<rect x="30" y="30" width="12" height="12" fill="#FFFFFF"/><rect x="18" y="36" width="6" height="6" fill="#1C2E4A"/>'
    + '<rect x="36" y="36" width="6" height="6" fill="#1C2E4A"/><rect x="12" y="60" width="6" height="12" fill="#1C2E4A"/>'
    + '<rect x="30" y="60" width="6" height="12" fill="#1C2E4A"/><rect x="12" y="72" width="12" height="6" fill="#1C2E4A"/>'
    + '<rect x="30" y="72" width="12" height="6" fill="#1C2E4A"/></g>';
  function muenzeSvg(seite) {
    const rand = '<circle cx="50" cy="50" r="47" fill="#F7E4D4" stroke="#1C2E4A" stroke-width="4"/>'
      + '<circle cx="50" cy="50" r="39" fill="none" stroke="#1C2E4A" stroke-width="1.5" stroke-dasharray="3 4"/>';
    const innen = seite === 'Kopf' ? BIT
      : '<text x="50" y="69" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="54" fill="#1C2E4A">1</text>';
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${rand}${innen}</svg>`;
  }
  function zeichneMuenzen(ziel, werte, landen) {
    ziel.textContent = '';
    ziel.classList.toggle('viele', werte.length > 1);
    ziel.classList.remove('text');
    werte.forEach((w) => {
      const s = document.createElement('span');
      s.className = 'zg-wert zg-muenze-wert';
      s.innerHTML = `<span class="zg-muenze${landen ? ' landet' : ''}" role="img" aria-label="${w}">${muenzeSvg(w)}</span><span class="zg-muenze-text">${w}</span>`;
      ziel.append(s);
    });
  }

  function zeichne(ziel, werte, text, leer) {
    ziel.textContent = '';
    ziel.classList.toggle('viele', werte.length > 1);
    ziel.classList.toggle('text', !!text);
    (werte.length ? werte : ['?']).forEach((w) => {
      const s = document.createElement('span');
      s.className = 'zg-wert' + (leer ? ' zg-leer' : '');
      s.textContent = w;
      ziel.append(s);
    });
  }

  function vorschauWert(k) {
    if (k.typ === 'zahl') return zahlText(zufallInt(k.min, k.max));
    if (k.typ === 'wuerfel') return String(zufallInt(1, k.seiten));
    if (k.typ === 'muenze') return zufallInt(0, 1) ? 'Kopf' : 'Zahl';
    return k.werte[zufallInt(0, k.werte.length - 1)];
  }

  async function los() {
    if (st.laeuft) return;
    const k = konfig();
    const problem = pruefe(k);
    if (problem) { fehler(problem); return; }
    fehler('');
    const n = Math.max(1, Math.min(50, Math.round(Number($('#anzahl').value)) || 1));
    $('#anzahl').value = n;
    const ziele = [$('#werte'), $('#gross-werte')];
    const muenze = k.typ === 'muenze';
    const text = !!k.liste;
    const male = (z, w, landen) => (muenze ? zeichneMuenzen(z, w, landen) : zeichne(z, w, text));

    if ($('#animation').checked && !RUHIG) {
      st.laeuft = true;
      ziele.forEach((z) => z.classList.add('rattert'));
      for (let i = 0; i < 12; i++) {
        const vorschau = Array.from({ length: n }, () => vorschauWert(k));
        ziele.forEach((z) => male(z, vorschau, false));
        await new Promise((r) => setTimeout(r, 30 + i * 8));
      }
      ziele.forEach((z) => z.classList.remove('rattert'));
      st.laeuft = false;
    }

    const r = ziehe(k, n);
    if (r.leer) {
      ziele.forEach((z) => zeichne(z, ['-'], false, true));
      setzeZusatz('Alle Werte wurden gezogen. "Neu beginnen" füllt den Pool wieder auf.');
      aktualisiere();
      return;
    }
    ziele.forEach((z) => (muenze ? zeichneMuenzen(z, r.werte, !RUHIG) : zeichne(z, r.werte, r.text)));
    setzeZusatz(r.zusatz || (k.typ === 'zahl' && n === 1 && r.werte[0] === '42' ? '101010₂. Gern geschehen.' : spruch()));
    $('#gross-titel').textContent = k.titel;
    st.letzte = { titel: k.titel, ...r };
    st.verlauf.unshift(...r.werte.slice().reverse());
    st.verlauf = st.verlauf.slice(0, 40);
    zeichneVerlauf();
    aktualisiere();
  }

  function setzeZusatz(t) { $('#zusatz').textContent = t; $('#gross-zusatz').textContent = t; }

  function zeichneVerlauf() {
    const v = $('#verlauf');
    v.textContent = '';
    if (!st.verlauf.length) { v.innerHTML = '<span class="zg-klein">Noch nichts.</span>'; return; }
    st.verlauf.forEach((w) => {
      const c = document.createElement('span');
      c.className = 'chip'; c.textContent = w;
      v.append(c);
    });
  }

  function neu() {
    const k = konfig();
    st.pools.delete(schluessel(k));
    st.verlauf = [];
    zeichneVerlauf();
    [$('#werte'), $('#gross-werte')].forEach((z) => zeichne(z, ['?'], false, true));
    setzeZusatz('Pool und Verlauf sind zurückgesetzt.');
    aktualisiere();
  }

  /* ---------- Großanzeige (Beamer) ---------- */
  const gross = $('#gross');
  function oeffneGross() {
    gross.hidden = false;
    $('#gross-titel').textContent = konfig().titel;
    if (!st.letzte) zeichne($('#gross-werte'), ['?'], false, true);
    if (gross.requestFullscreen) gross.requestFullscreen().catch(() => {});
    $('#gross-zu').focus();
  }
  function schliesseGross() {
    gross.hidden = true;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    $('#beamer').focus();
  }
  $('#beamer').addEventListener('click', oeffneGross);
  $('#gross-zu').addEventListener('click', (e) => { e.stopPropagation(); schliesseGross(); });
  gross.addEventListener('click', () => los());
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !gross.hidden) schliesseGross(); });
  document.addEventListener('keydown', (e) => {
    if (gross.hidden) return;
    if (e.key === 'Escape') { schliesseGross(); return; }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); los(); }
  });

  /* ---------- Eigene Listen: CSV, Text, Excel ---------- */
  function ersteSpalteAusText(text) {
    text = text.replace(/^﻿/, '');
    const zeilen = text.split(/\r\n|\n|\r/);
    const kopf = zeilen.find((z) => z.trim()) || '';
    const trenner = [';', '\t', ','].find((t) => kopf.includes(t));
    const erste = (z) => {
      if (!trenner) return z.trim();
      if (z.startsWith('"')) {
        const m = z.match(/^"((?:[^"]|"")*)"/);
        return m ? m[1].replace(/""/g, '"').trim() : z.trim();
      }
      return z.split(trenner)[0].trim();
    };
    return zeilen.map(erste).filter((w) => w !== '');
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
      const methode = dv.getUint16(p + 10, true);
      const groesse = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const kommLen = dv.getUint16(p + 32, true);
      const lokal = dv.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(puffer, p + 46, nameLen));
      dateien.set(name, { methode, groesse, lokal });
      p += 46 + nameLen + extraLen + kommLen;
    }
    async function lies(name) {
      const d = dateien.get(name);
      if (!d) return null;
      const start = d.lokal + 30 + dv.getUint16(d.lokal + 26, true) + dv.getUint16(d.lokal + 28, true);
      const roh = new Uint8Array(puffer, start, d.groesse);
      if (d.methode === 0) return dec.decode(roh);
      if (typeof DecompressionStream === 'undefined') throw new Error('alt');
      const strom = new Blob([roh]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Response(strom).text();
    }
    return { namen: [...dateien.keys()], lies };
  }

  async function ersteSpalteAusExcel(puffer) {
    const zip = await entpacke(puffer);
    const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
    const geteilt = [];
    const ss = await zip.lies('xl/sharedStrings.xml');
    if (ss) {
      [...xml(ss).getElementsByTagName('si')].forEach((si) => {
        geteilt.push([...si.getElementsByTagName('t')].map((t) => t.textContent).join(''));
      });
    }
    const blattName = zip.namen.includes('xl/worksheets/sheet1.xml') ? 'xl/worksheets/sheet1.xml'
      : zip.namen.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
    if (!blattName) throw new Error('blatt');
    const blatt = xml(await zip.lies(blattName));
    const werte = [];
    [...blatt.getElementsByTagName('row')].forEach((row) => {
      const zellen = [...row.getElementsByTagName('c')];
      const c = zellen.find((z) => /^A\d+$/.test(z.getAttribute('r') || '')) || (zellen[0] && !zellen[0].getAttribute('r') ? zellen[0] : null);
      if (!c) return;
      const typ = c.getAttribute('t');
      let w = '';
      if (typ === 's') w = geteilt[Number((c.getElementsByTagName('v')[0] || {}).textContent)] || '';
      else if (typ === 'inlineStr') w = [...c.getElementsByTagName('t')].map((t) => t.textContent).join('');
      else w = (c.getElementsByTagName('v')[0] || {}).textContent || '';
      w = String(w).trim();
      if (w) werte.push(w);
    });
    return werte;
  }

  function fuegeListeHinzu(werte, quelle) {
    if (werte.length < 2) { fehler('Die Liste braucht eine Überschrift und mindestens einen Eintrag.'); return; }
    const titel = werte[0].slice(0, 60);
    const eintraege = werte.slice(1);
    const id = String(st.listen.length + 1);
    st.listen.push({ id, titel, werte: eintraege });
    const opt = document.createElement('option');
    opt.value = 'liste:' + id;
    opt.textContent = `Liste: ${titel} (${eintraege.length})`;
    $('#kategorie').insertBefore(opt, $('#kategorie option[value="import"]'));
    $('#kategorie').value = opt.value;
    aktualisiere();
    setzeZusatz(`Liste "${titel}" mit ${eintraege.length} Einträgen ${quelle}.`);
  }

  async function ladeDatei(datei) {
    if (!datei) return;
    fehler('');
    try {
      const name = datei.name.toLowerCase();
      if (name.endsWith('.xlsx')) fuegeListeHinzu(await ersteSpalteAusExcel(await datei.arrayBuffer()), 'geladen');
      else if (name.endsWith('.xls')) fehler('Bitte die Datei in Excel als .xlsx oder .csv speichern.');
      else fuegeListeHinzu(ersteSpalteAusText(await datei.text()), 'geladen');
    } catch (e) {
      fehler(e.message === 'alt' ? 'Dieser Browser kann Excel-Dateien nicht öffnen. Bitte als CSV speichern.'
        : 'Die Datei konnte nicht gelesen werden. Bitte als .xlsx, .csv oder .txt mit einer Spalte speichern.');
    }
  }
  $('#datei').addEventListener('change', (e) => { ladeDatei(e.target.files[0]); e.target.value = ''; });
  const ablage = $('#ablage');
  ablage.addEventListener('dragover', (e) => { e.preventDefault(); ablage.classList.add('drueber'); });
  ablage.addEventListener('dragleave', () => ablage.classList.remove('drueber'));
  ablage.addEventListener('drop', (e) => {
    e.preventDefault(); ablage.classList.remove('drueber');
    ladeDatei(e.dataTransfer.files[0]);
  });
  $('#liste-uebernehmen').addEventListener('click', () => {
    fuegeListeHinzu(ersteSpalteAusText($('#liste-text').value), 'übernommen');
    $('#liste-text').value = '';
  });

  /* ---------- Ereignisse ---------- */
  $('#kategorie').addEventListener('change', aktualisiere);
  $$('input[name="bereich"], input[name="pool"], input[name="seiten"]').forEach((r) => r.addEventListener('change', aktualisiere));
  ['#von', '#bis', '#seiten-zahl'].forEach((s) => $(s).addEventListener('input', aktualisiere));
  $('#ziehen').addEventListener('click', los);
  $('#neu').addEventListener('click', neu);
  if (RUHIG) $('#animation').checked = false;

  aktualisiere();
})();
