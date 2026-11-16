/* Base B | gemeinsame Funktionen: Dunkelmodus-Schalter und Menü */
'use strict';
(() => {
  const SCHLUESSEL = 'bb-thema';

  /* ---------- Dunkelmodus (nur per Schalter, Standard hell) ---------- */
  function setzeThema(thema) {
    if (thema === 'dunkel') document.documentElement.setAttribute('data-theme', 'dunkel');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(SCHLUESSEL, thema); } catch (e) { /* Speichern nicht möglich */ }
    document.querySelectorAll('.thema-knopf').forEach((k) => {
      k.setAttribute('aria-label', thema === 'dunkel' ? 'Hellen Modus einschalten' : 'Dunkelmodus einschalten');
      k.setAttribute('aria-pressed', thema === 'dunkel' ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('bb-thema', { detail: thema }));
  }
  const aktuellesThema = () => (document.documentElement.getAttribute('data-theme') === 'dunkel' ? 'dunkel' : 'hell');
  window.bbThema = { setze: setzeThema, aktuell: aktuellesThema };
  setzeThema(aktuellesThema());
  document.querySelectorAll('.thema-knopf').forEach((k) => {
    k.addEventListener('click', () => setzeThema(aktuellesThema() === 'dunkel' ? 'hell' : 'dunkel'));
  });

  /* ---------- Aufklappmenüs ---------- */
  const knoepfe = [...document.querySelectorAll('.navi-knopf')];
  function schliesseAlle(ausser) {
    knoepfe.forEach((k) => {
      if (k === ausser) return;
      k.setAttribute('aria-expanded', 'false');
      const m = document.getElementById(k.getAttribute('aria-controls'));
      if (m) m.hidden = true;
    });
  }
  knoepfe.forEach((k) => {
    k.addEventListener('click', (e) => {
      e.stopPropagation();
      const offen = k.getAttribute('aria-expanded') === 'true';
      schliesseAlle(k);
      k.setAttribute('aria-expanded', offen ? 'false' : 'true');
      const m = document.getElementById(k.getAttribute('aria-controls'));
      if (m) m.hidden = offen;
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navi-punkt')) schliesseAlle(null);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const offener = knoepfe.find((k) => k.getAttribute('aria-expanded') === 'true');
    schliesseAlle(null);
    if (offener) offener.focus();
  });

  /* ---------- Menü auf kleinen Bildschirmen ---------- */
  const kopf = document.querySelector('.kopf');
  const menueKnopf = document.querySelector('.menue-knopf');
  if (kopf && menueKnopf) {
    menueKnopf.addEventListener('click', () => {
      const offen = kopf.classList.toggle('offen');
      menueKnopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
      menueKnopf.querySelector('.menue-text').textContent = offen ? 'Schließen' : 'Menü';
    });
  }
})();
