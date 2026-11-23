/* BaseBite | Tägliche Erinnerungen
   APK (Capacitor): echte lokale Benachrichtigungen, vom System geplant, auch wenn die App geschlossen ist.
   PWA: Ohne Server gibt es im Browser keine geplanten Benachrichtigungen. Die App erinnert nur, solange sie geöffnet
   oder im Hintergrund noch aktiv ist, und zeigt beim nächsten Öffnen an, was fällig war. */
import { lsLies, lsSchreib } from './db.js';

export const ARTEN = {
  eintragen: { titel: 'Eintragen', text: 'Schon eingetragen, was Sie heute gegessen haben?', standard: '19:30' },
  wiegen: { titel: 'Wiegen', text: 'Zeit für die Waage. Am besten morgens, vor dem Frühstück.', standard: '07:30' },
  wasser: { titel: 'Wasser', text: 'Ein Glas Wasser wäre jetzt gut.', standard: '10:00, 14:00, 17:00' },
};
const NATIV_ID = { eintragen: 100, wiegen: 200, wasser: 300 };

export const nativ = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()
  && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications);

export function lade() {
  let e = {};
  try { e = JSON.parse(lsLies('basebite.erinnerungen', '{}')) || {}; } catch (x) { e = {}; }
  for (const [k, a] of Object.entries(ARTEN)) e[k] = { an: false, zeiten: a.standard, ...(e[k] || {}) };
  e.zuletzt = e.zuletzt || {};
  return e;
}
export const speichere = (e) => lsSchreib('basebite.erinnerungen', JSON.stringify(e));

/** "10:00, 14:00" -> [{h:10,m:0}, ...] (ungültige Zeiten werden ignoriert) */
export function zeiten(text) {
  return String(text || '').split(/[,;\s]+/).map((t) => t.match(/^(\d{1,2})[:.](\d{2})$/))
    .filter(Boolean).map((m) => ({ h: +m[1], m: +m[2] })).filter((z) => z.h < 24 && z.m < 60).slice(0, 6);
}
const hhmm = (z) => `${String(z.h).padStart(2, '0')}:${String(z.m).padStart(2, '0')}`;

export function erlaubnisStatus() {
  if (nativ()) return 'nativ';
  if (!('Notification' in window)) return 'nicht-unterstuetzt';
  return Notification.permission;   // default | granted | denied
}

export async function erlaubnisAnfragen() {
  if (nativ()) {
    const r = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
    return r.display === 'granted' ? 'granted' : 'denied';
  }
  if (!('Notification' in window)) return 'nicht-unterstuetzt';
  return Notification.requestPermission();
}

/** In der APK: alle Erinnerungen neu beim System planen */
export async function planeNativ(e) {
  if (!nativ()) return;
  const LN = window.Capacitor.Plugins.LocalNotifications;
  const offen = await LN.getPending();
  if (offen.notifications.length) await LN.cancel({ notifications: offen.notifications.map((n) => ({ id: n.id })) });
  const liste = [];
  for (const [k, a] of Object.entries(ARTEN)) {
    if (!e[k].an) continue;
    zeiten(e[k].zeiten).forEach((z, i) => liste.push({
      id: NATIV_ID[k] + i, title: 'BaseBite: ' + a.titel, body: a.text,
      schedule: { on: { hour: z.h, minute: z.m }, allowWhileIdle: true },
      smallIcon: 'ic_stat_basebite', extra: { ziel: k === 'wiegen' ? '#/verlauf' : '#/' },
    }));
  }
  if (liste.length) await LN.schedule({ notifications: liste });
}

async function zeige(art) {
  const a = ARTEN[art];
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('BaseBite: ' + a.titel, { body: a.text, icon: 'icons/icon-192.png', badge: 'icons/icon-maskable-192.png', tag: 'basebite-' + art, data: { ziel: art === 'wiegen' ? '#/verlauf' : '#/' } });
  } catch (x) { /* Benachrichtigung nicht möglich */ }
}

/** PWA: jede halbe Minute prüfen, ob eine Erinnerung fällig ist. Liefert beim Start die heute verpassten. */
export function starteBrowserTakt(beiVerpasst) {
  if (nativ()) return;
  const heute = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const pruefe = (start) => {
    const e = lade();
    const jetzt = new Date();
    const minuten = jetzt.getHours() * 60 + jetzt.getMinutes();
    const verpasst = [];
    let geaendert = false;
    for (const art of Object.keys(ARTEN)) {
      if (!e[art].an) continue;
      for (const z of zeiten(e[art].zeiten)) {
        const schluessel = `${art}@${hhmm(z)}`;
        const faellig = z.h * 60 + z.m;
        if (minuten < faellig || e.zuletzt[schluessel] === heute()) continue;
        e.zuletzt[schluessel] = heute(); geaendert = true;
        if (start && minuten - faellig > 2) verpasst.push(art);
        else if ('Notification' in window && Notification.permission === 'granted') zeige(art);
      }
    }
    if (geaendert) speichere(e);
    if (start && verpasst.length && beiVerpasst) beiVerpasst([...new Set(verpasst)]);
  };
  pruefe(true);
  setInterval(() => pruefe(false), 30000);
}
