/* BaseDays | HTML der Kalenderansichten (Monat, Woche, Tag) und der Tagesliste.
   Erzeugt nur Text; Klicks wertet app.js über data-aktion aus. Alle Inhalte von Nutzer:innen laufen durch esc(). */
import { WOCHENTAGE_KURZ, monatsraster, schluessel, gleicherTag, fTagLang, fUhrzeit, wochentag, kalenderwoche, plusTage } from './datum.js';
import { proTag, spuren, terminFarbe } from './termine.js';

export const STUNDE = 48;   // Höhe einer Stunde im Zeitraster (px)

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));
}

const erledigt = (haken, v) => haken.has(v.schluessel);

/** Zeitangabe eines Eintrags an einem bestimmten Tag ("ganztägig", "09:30-10:15", "ab 22:00", "bis 02:00"). */
export function zeitText(e) {
  const { v } = e;
  if (v.termin.ganztaegig) return 'ganztägig';
  if (e.leiste) {
    if (e.beginntHier) return `ab ${fUhrzeit(v.start)}`;
    if (e.endetHier) return `bis ${fUhrzeit(v.ende)}`;
    return 'ganztägig';
  }
  return `${fUhrzeit(v.start)}-${fUhrzeit(v.ende)}`;
}

function chip(e, tag, kal, haken) {
  const { v } = e;
  const f = terminFarbe(v.termin, kal);
  const fertig = erledigt(haken, v);
  const klassen = ['chip', e.leiste ? 'chip-leiste' : 'chip-zeit',
    e.leiste && !e.beginntHier ? 'weiter-links' : '', e.leiste && !e.endetHier ? 'weiter-rechts' : '', fertig ? 'erledigt' : ''].filter(Boolean).join(' ');
  const beschriftung = `${v.termin.titel}, ${zeitText(e)}${fertig ? ', erledigt' : ''}`;
  let inhalt;
  if (e.leiste) {
    const zeigen = e.beginntHier || wochentag(tag) === 0;
    inhalt = zeigen ? `${fertig ? '✓ ' : ''}${esc(v.termin.titel)}` : '&nbsp;';
  } else {
    inhalt = `<span class="chip-uhr">${fUhrzeit(v.start)}</span><span class="chip-text">${fertig ? '✓ ' : ''}${esc(v.termin.titel)}</span>`;
  }
  return `<button type="button" class="${klassen}" style="--f:${f}" data-aktion="termin" data-schluessel="${esc(v.schluessel)}" aria-label="${esc(beschriftung)}" title="${esc(beschriftung)}">${inhalt}</button>`;
}

/** Monatsraster wie im Wandkalender, darunter die Liste des gewählten Tages. */
export function monat({ datum, gewaehlt, vorkommen, kal, haken, maxChips, heute }) {
  const tage = monatsraster(datum.getFullYear(), datum.getMonth());
  const pt = proTag(vorkommen, tage);
  const zellen = tage.map((d) => {
    const k = schluessel(d);
    const liste = pt.get(k);
    const klassen = ['mtag', d.getMonth() !== datum.getMonth() ? 'fremd' : '', gleicherTag(d, heute) ? 'heute' : '',
      gleicherTag(d, gewaehlt) ? 'gewaehlt' : '', wochentag(d) >= 5 ? 'wochenende' : ''].filter(Boolean).join(' ');
    const sichtbar = liste.length > maxChips ? liste.slice(0, maxChips - 1) : liste;
    const rest = liste.length - sichtbar.length;
    const anzahl = liste.length ? `, ${liste.length} ${liste.length === 1 ? 'Termin' : 'Termine'}` : '';
    return `<div class="${klassen}" data-aktion="tag" data-tag="${k}">
<button type="button" class="mtag-nr" data-aktion="tag" data-tag="${k}" aria-label="${esc(fTagLang(d) + anzahl)}"${gleicherTag(d, gewaehlt) ? ' aria-pressed="true"' : ''}>${d.getDate()}</button>
<div class="mtag-liste">${sichtbar.map((e) => chip(e, d, kal, haken)).join('')}${rest > 0 ? `<button type="button" class="mehr" data-aktion="tag" data-tag="${k}">+${rest}</button>` : ''}</div>
</div>`;
  }).join('');
  return `<div class="monat">
<div class="monat-kopf" aria-hidden="true">${WOCHENTAGE_KURZ.map((w) => `<div>${w}</div>`).join('')}</div>
<div class="monat-raster" style="--wochen:${tage.length / 7}">${zellen}</div>
</div>
${tagesliste({ tag: gewaehlt, vorkommen, kal, haken })}`;
}

/** Liste der Termine eines Tages (unter dem Monat; auch für Bildschirmleser die bequemste Ansicht). */
export function tagesliste({ tag, vorkommen, kal, haken, kalNamen = true }) {
  const liste = proTag(vorkommen, [tag]).get(schluessel(tag));
  const eintraege = liste.map((e) => {
    const t = e.v.termin;
    const fertig = erledigt(haken, e.v);
    const unter = [kalNamen ? kal.get(t.calendar_id)?.name : '', t.ort].filter(Boolean).map(esc).join(' | ');
    return `<li><button type="button" class="eintrag${fertig ? ' erledigt' : ''}" data-aktion="termin" data-schluessel="${esc(e.v.schluessel)}" style="--f:${terminFarbe(t, kal)}">
<span class="eintrag-farbe" aria-hidden="true"></span>
<span class="eintrag-zeit mono">${zeitText(e)}</span>
<span class="eintrag-text"><span class="eintrag-titel">${fertig ? '✓ ' : ''}${esc(t.titel)}</span>${unter ? `<span class="eintrag-unter">${unter}</span>` : ''}</span>
</button></li>`;
  }).join('');
  return `<section class="tagesliste" aria-labelledby="tl-titel">
<div class="tl-kopf"><h2 id="tl-titel">${fTagLang(tag)}</h2>
<button type="button" class="knopf knopf-zwei knopf-klein" data-aktion="neu" data-tag="${schluessel(tag)}">Termin eintragen</button></div>
${liste.length ? `<ul class="tl-liste">${eintraege}</ul>` : '<p class="leer">Nichts geplant. Auch mal schön.</p>'}
</section>`;
}

/** Zeitraster für Woche (7 Tage) oder Tag (1 Tag). */
export function raster({ tage, vorkommen, kal, haken, heute, jetzt }) {
  const pt = proTag(vorkommen, tage);
  const einzeltag = tage.length === 1;
  const kopf = tage.map((d) => `<button type="button" class="rt${gleicherTag(d, heute) ? ' heute' : ''}" data-aktion="tagansicht" data-tag="${schluessel(d)}" aria-label="${esc(fTagLang(d))}">
<span class="rt-wt">${WOCHENTAGE_KURZ[wochentag(d)]}</span><span class="rt-nr">${d.getDate()}</span></button>`).join('');
  const ganztag = tage.map((d) => {
    const leisten = pt.get(schluessel(d)).filter((e) => e.leiste);
    return `<div class="rg-tag">${leisten.map((e) => chip(e, d, kal, haken)).join('')}</div>`;
  }).join('');
  const zeiten = Array.from({ length: 24 }, (_, h) => `<div class="rz"><span>${String(h).padStart(2, '0')}:00</span></div>`).join('');
  const spalten = tage.map((d) => {
    const kaesten = spuren(vorkommen, d).map((k) => {
      const t = k.v.termin;
      const fertig = erledigt(haken, k.v);
      const hoehe = Math.max(k.hoehe, 20) / 60 * STUNDE;
      const beschriftung = `${t.titel}, ${fUhrzeit(k.v.start)}-${fUhrzeit(k.v.ende)}${fertig ? ', erledigt' : ''}`;
      return `<button type="button" class="kasten${fertig ? ' erledigt' : ''}${hoehe < 34 ? ' flach' : ''}" data-aktion="termin" data-schluessel="${esc(k.v.schluessel)}"
style="--f:${terminFarbe(t, kal)};top:${k.oben / 60 * STUNDE}px;height:${hoehe}px;left:calc(${k.spalte} * 100% / ${k.spalten});width:calc(100% / ${k.spalten} - 2px)" aria-label="${esc(beschriftung)}">
<span class="kasten-zeit">${fUhrzeit(k.v.start)}</span><span class="kasten-titel">${fertig ? '✓ ' : ''}${esc(t.titel)}</span>${einzeltag && t.ort ? `<span class="kasten-ort">${esc(t.ort)}</span>` : ''}</button>`;
    }).join('');
    const linie = gleicherTag(d, jetzt) ? `<div class="jetzt" style="top:${(jetzt.getHours() * 60 + jetzt.getMinutes()) / 60 * STUNDE}px" aria-hidden="true"></div>` : '';
    return `<div class="rs${gleicherTag(d, heute) ? ' heute' : ''}" data-aktion="slot" data-tag="${schluessel(d)}">${kaesten}${linie}</div>`;
  }).join('');
  return `<div class="raster${einzeltag ? ' einzeltag' : ''}" style="--spalten:${tage.length};--stunde:${STUNDE}px">
<div class="raster-kopf"><div class="raster-ecke"><span class="etikett">KW ${kalenderwoche(tage[0])}</span></div>${kopf}</div>
<div class="raster-ganztag"><div class="raster-ecke"><span class="etikett">Ganzt.</span></div>${ganztag}</div>
<div class="raster-koerper" id="raster-koerper"><div class="raster-zeiten" aria-hidden="true">${zeiten}</div>${spalten}</div>
</div>`;
}

/** Titel über der Ansicht. */
export function ansichtTitel(ansicht, datum) {
  const MON = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
  if (ansicht === 'monat') return { lang: `${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][datum.getMonth()]} ${datum.getFullYear()}`, kurz: `${MON[datum.getMonth()]} ${datum.getFullYear()}` };
  if (ansicht === 'woche') {
    const a = plusTage(datum, -wochentag(datum)), b = plusTage(a, 6);
    const text = a.getMonth() === b.getMonth() ? `${MON[a.getMonth()]} ${a.getFullYear()}` : `${MON[a.getMonth()]} - ${MON[b.getMonth()]} ${b.getFullYear()}`;
    return { lang: text, kurz: text };
  }
  return { lang: fTagLang(datum), kurz: `${WOCHENTAGE_KURZ[wochentag(datum)]}., ${datum.getDate()}. ${MON[datum.getMonth()]}` };
}
