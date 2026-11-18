/* Base B | Startseite: Eingabezeile zum Suchen, Springen und für versteckte Befehle */
'use strict';
(() => {
  const form = document.getElementById('sprung');
  const eingabe = document.getElementById('sprung-eingabe');
  const feld = form.querySelector('.sprung-feld');
  const antwort = document.getElementById('sprung-antwort');
  const kacheln = [...document.querySelectorAll('#kacheln .kachel')];
  const keine = document.getElementById('keine-treffer');
  const filterKnoepfe = [...document.querySelectorAll('.filter-knopf')];
  let art = '';   // '' = alle, sonst werkzeug | leitfaden | spiel

  const SEITEN = ['/werkzeuge/zufallsgenerator/', '/werkzeuge/fotobox/', '/leitfaeden/', '/spiele/', '/spiele/baseboard/', '/ueber/'];
  const norm = (s) => s.toLowerCase().trim()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

  function zeige(html) {
    antwort.innerHTML = html;
    antwort.hidden = !html;
  }

  const BEFEHLE = {
    hilfe: () => zeige(`Bekannte Befehle:<ul>
      <li>Name eines Werkzeugs, z. B. zufall oder fotobox</li>
${window.bbThema && document.querySelector('.thema-knopf') ? '<li>dunkel | hell: Darstellung umschalten</li>' : ''}
      <li>plan b: irgendwohin</li>
      <li>42</li></ul>`),
    '42': () => zeige('101010₂. Gern geschehen.'),
    'plan b': () => { window.location.href = SEITEN[Math.floor(Math.random() * SEITEN.length)]; },
  };
  // Dunkelmodus-Befehle nur, wenn der Schalter eingeschaltet ist (siehe THEMA_SCHALTER in _werkstatt/seiten.py)
  if (document.querySelector('.thema-knopf')) {
    BEFEHLE.dunkel = () => { window.bbThema && window.bbThema.setze('dunkel'); zeige('Dunkelmodus an.'); };
    BEFEHLE.hell = () => { window.bbThema && window.bbThema.setze('hell'); zeige('Heller Modus an.'); };
  }
  BEFEHLE.help = BEFEHLE.hilfe;
  BEFEHLE['?'] = BEFEHLE.hilfe;
  BEFEHLE.planb = BEFEHLE['plan b'];

  function filtere() {
    const q = norm(eingabe.value);
    feld.classList.toggle('leer', !eingabe.value);
    let sichtbar = 0;
    kacheln.forEach((k) => {
      const text = norm(k.dataset.suche + ' ' + k.textContent);
      const passtArt = !art || k.dataset.art === art;
      const treffer = passtArt && (!q || BEFEHLE[q] || q.split(/\s+/).every((w) => text.includes(w)));
      k.hidden = !treffer;
      if (treffer) sichtbar++;
    });
    keine.hidden = sichtbar > 0;
    if (!q) zeige('');
  }

  eingabe.addEventListener('input', filtere);
  filterKnoepfe.forEach((b) => b.addEventListener('click', () => {
    art = b.dataset.art;
    filterKnoepfe.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    filtere();
  }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = norm(eingabe.value);
    if (!q) return;
    if (BEFEHLE[q]) { BEFEHLE[q](); return; }
    const erste = kacheln.find((k) => !k.hidden);
    if (erste) window.location.href = erste.getAttribute('href');
    else zeige('Dazu gibt es noch nichts. Tippen Sie hilfe für alle Befehle.');
  });
  feld.classList.add('leer');
  filtere();
})();
