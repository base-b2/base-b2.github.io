/* BaseDays | Demo-Modus: dieselbe Schnittstelle wie daten.js, aber ohne Server.
   Alles liegt nur im localStorage dieses Browsers ("basedays.demo"). Teilen ist hier nur angedeutet:
   Es gibt eine erfundene Mitbewohnerin, Einladungslinks funktionieren nicht für andere Geräte. */
import { plusTage, schluessel, tagesbeginn } from './datum.js';
import { darfSchreiben, darfVerwalten } from './rechte.js';

const SPEICHER = 'basedays.demo';
const ICH = 'demo-ich';
const MIRA = 'demo-mira';
const id = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const kopie = (x) => JSON.parse(JSON.stringify(x));

function startdaten() {
  const heute = tagesbeginn(new Date());
  const zeit = (tage, h, m = 0) => { const d = plusTage(heute, tage); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const ganz = (tage) => `${schluessel(plusTage(heute, tage))}T00:00:00Z`;
  const k1 = id(), k2 = id();
  const ev = (calendar_id, titel, beginn, ende, extra = {}) => ({
    id: id(), calendar_id, titel, beginn, ende, ganztaegig: false, ort: '', beschreibung: '', farbe: null,
    wiederholung: 'keine', wiederholung_bis: null, erstellt_von: ICH, ...extra,
  });
  return {
    profile: { [ICH]: { id: ICH, name: 'Sam', farbe: '#6A1B2B' }, [MIRA]: { id: MIRA, name: 'Mira', farbe: '#1F6B6B' } },
    kalender: [
      { id: k1, name: 'Mein Kalender', farbe: '#1C2E4A', erstellt_von: ICH },
      { id: k2, name: 'WG', farbe: '#1F6B6B', erstellt_von: ICH },
    ],
    mitglieder: [
      { calendar_id: k1, user_id: ICH, rolle: 'owner', sichtbar: true },
      { calendar_id: k2, user_id: ICH, rolle: 'owner', sichtbar: true },
      { calendar_id: k2, user_id: MIRA, rolle: 'editor', sichtbar: true },
    ],
    einladungen: [],
    termine: [
      ev(k1, 'Zahnarzt', zeit(1, 9, 30), zeit(1, 10, 15), { ort: 'Stadtplatz 3' }),
      ev(k1, 'Sport', zeit(-6, 18), zeit(-6, 19, 30), { wiederholung: 'woechentlich' }),
      ev(k1, 'Urlaub', ganz(10), ganz(13), { ganztaegig: true, farbe: '#8A5A1C' }),
      ev(k2, 'Putzplan: Bad', ganz(-3), ganz(-3), { ganztaegig: true, wiederholung: 'woechentlich' }),
      ev(k2, 'Einkaufen', zeit(0, 17), zeit(0, 18), { beschreibung: 'Milch, Brot, Kaffee', erstellt_von: MIRA }),
      ev(k2, 'WG-Abend', zeit(3, 19), zeit(3, 22), { ort: 'Küche', erstellt_von: MIRA }),
      ev(k2, 'Miete überweisen', ganz(-20), ganz(-20), { ganztaegig: true, wiederholung: 'monatlich', farbe: '#6A1B2B' }),
    ],
    haken: [],
  };
}

export class DemoDaten {
  constructor() {
    this.demo = true;
    this.beobachter = new Set();
    try { this.d = JSON.parse(localStorage.getItem(SPEICHER) || 'null'); } catch { this.d = null; }
    if (!this.d) { this.d = startdaten(); this.sichern(); }
  }
  sichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(this.d)); } catch { /* egal */ } }
  async aendere(fn) { const r = fn(this.d); this.sichern(); return kopie(r ?? null); }
  rolle(kalId) { return this.d.mitglieder.find((m) => m.calendar_id === kalId && m.user_id === ICH)?.rolle; }
  pruefen(ok) { if (!ok) throw new Error('Dafür fehlen Ihnen in diesem Kalender die Rechte.'); }

  get angemeldet() { return true; }
  get benutzer() { return { id: ICH, email: 'demo@base-b.de' }; }
  get ich() { return ICH; }
  beiAnmeldung(fn) { this.beobachter.add(fn); return () => this.beobachter.delete(fn); }
  ausAdresseUebernehmen() { return null; }
  async abmelden() { for (const fn of this.beobachter) fn(null); }
  async kontoLoeschen() { localStorage.removeItem(SPEICHER); for (const fn of this.beobachter) fn(null); }
  async passwortSetzen() { throw new Error('Im Demo-Modus gibt es kein Passwort.'); }

  async profilLaden() { return kopie(this.d.profile[ICH]); }
  profilSpeichern({ name, farbe }) { return this.aendere((d) => Object.assign(d.profile[ICH], { name, farbe })); }

  async kalenderLaden() {
    return kopie(this.d.mitglieder.filter((m) => m.user_id === ICH).map((m) => ({
      ...this.d.kalender.find((k) => k.id === m.calendar_id), rolle: m.rolle, sichtbar: m.sichtbar,
    })));
  }
  kalenderAnlegen(name, farbe) {
    return this.aendere((d) => {
      const k = { id: id(), name, farbe, erstellt_von: ICH };
      d.kalender.push(k); d.mitglieder.push({ calendar_id: k.id, user_id: ICH, rolle: 'owner', sichtbar: true });
      return k;
    });
  }
  kalenderAendern(kalId, { name, farbe }) {
    this.pruefen(darfVerwalten(this.rolle(kalId)));
    return this.aendere((d) => Object.assign(d.kalender.find((k) => k.id === kalId), { name, farbe }));
  }
  kalenderLoeschen(kalId) {
    this.pruefen(darfVerwalten(this.rolle(kalId)));
    return this.aendere((d) => {
      const ids = new Set(d.termine.filter((t) => t.calendar_id === kalId).map((t) => t.id));
      d.kalender = d.kalender.filter((k) => k.id !== kalId);
      d.mitglieder = d.mitglieder.filter((m) => m.calendar_id !== kalId);
      d.termine = d.termine.filter((t) => t.calendar_id !== kalId);
      d.haken = d.haken.filter((h) => !ids.has(h.event_id));
    });
  }
  sichtbarSetzen(kalId, sichtbar) {
    return this.aendere((d) => { d.mitglieder.find((m) => m.calendar_id === kalId && m.user_id === ICH).sichtbar = sichtbar; });
  }

  async mitgliederLaden(kalId) {
    return kopie(this.d.mitglieder.filter((m) => m.calendar_id === kalId).map((m) => ({ user_id: m.user_id, rolle: m.rolle, ...this.d.profile[m.user_id] })));
  }
  rolleSetzen(kalId, userId, rolle) {
    this.pruefen(darfVerwalten(this.rolle(kalId)));
    return this.aendere((d) => { d.mitglieder.find((m) => m.calendar_id === kalId && m.user_id === userId).rolle = rolle; });
  }
  mitgliedEntfernen(kalId, userId) {
    this.pruefen(userId === ICH || darfVerwalten(this.rolle(kalId)));
    return this.aendere((d) => { d.mitglieder = d.mitglieder.filter((m) => !(m.calendar_id === kalId && m.user_id === userId)); });
  }
  async einladungenLaden(kalId) {
    return kopie(this.d.einladungen.filter((e) => e.calendar_id === kalId && new Date(e.gueltig_bis) > new Date()));
  }
  einladungErstellen(kalId, rolle) {
    this.pruefen(darfVerwalten(this.rolle(kalId)));
    return this.aendere((d) => {
      const e = { id: id(), calendar_id: kalId, token: id(), rolle, gueltig_bis: plusTage(new Date(), 14).toISOString() };
      d.einladungen.push(e); return e;
    });
  }
  einladungLoeschen(eid) { return this.aendere((d) => { d.einladungen = d.einladungen.filter((e) => e.id !== eid); }); }
  async einladungAnsehen() { return null; }
  async einladungAnnehmen() { throw new Error('Einladungen funktionieren nur mit verbundener Datenbank.'); }

  async termineLaden(kalIds) { return kopie(this.d.termine.filter((t) => kalIds.includes(t.calendar_id))); }
  terminAnlegen(z) {
    this.pruefen(darfSchreiben(this.rolle(z.calendar_id)));
    return this.aendere((d) => { const t = { ...z, id: id(), erstellt_von: ICH }; d.termine.push(t); return t; });
  }
  terminAendern(tid, z) {
    const alt = this.d.termine.find((t) => t.id === tid);
    this.pruefen(alt && darfSchreiben(this.rolle(alt.calendar_id)) && darfSchreiben(this.rolle(z.calendar_id)));
    return this.aendere(() => Object.assign(alt, z));
  }
  terminLoeschen(tid) {
    const alt = this.d.termine.find((t) => t.id === tid);
    this.pruefen(alt && darfSchreiben(this.rolle(alt.calendar_id)));
    return this.aendere((d) => { d.termine = d.termine.filter((t) => t.id !== tid); d.haken = d.haken.filter((h) => h.event_id !== tid); });
  }

  async hakenLaden() { return kopie(this.d.haken.filter((h) => h.user_id === ICH)); }
  hakenSetzen(eventId, datum, erledigt) {
    return this.aendere((d) => {
      d.haken = d.haken.filter((h) => !(h.event_id === eventId && h.datum === datum && h.user_id === ICH));
      if (erledigt) d.haken.push({ event_id: eventId, datum, user_id: ICH });
    });
  }
  async hakenVonAllen(eventId, datum) {
    return kopie(this.d.haken.filter((h) => h.event_id === eventId && h.datum === datum).map((h) => ({ user_id: h.user_id, ...this.d.profile[h.user_id] })));
  }

  live(_aenderung, beiStatus) { beiStatus('demo'); return { stoppen() {} }; }
}
