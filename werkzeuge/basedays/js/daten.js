/* BaseDays | Datenschicht für Supabase. Die Oberfläche spricht nur mit dieser Schnittstelle
   (gleiche Funktionen gibt es in demo.js ohne Server). Rechte prüft die Datenbank (schema.sql). */
import { Supa } from './supa.js';
import { plusTage } from './datum.js';

const q = encodeURIComponent;

export class SupaDaten {
  constructor(url, schluessel) {
    this.s = new Supa(url, schluessel);
    this.demo = false;
  }

  // ---------- Anmeldung ----------
  get angemeldet() { return this.s.angemeldet; }
  get benutzer() { return this.s.benutzer; }
  beiAnmeldung(fn) { return this.s.beiAnmeldung(fn); }
  ausAdresseUebernehmen(hash) { return this.s.ausAdresseUebernehmen(hash); }
  registrieren(email, pw, name, weiter) { return this.s.registrieren(email, pw, name, weiter); }
  anmelden(email, pw) { return this.s.anmelden(email, pw); }
  abmelden() { return this.s.abmelden(); }
  passwortVergessen(email, weiter) { return this.s.passwortVergessen(email, weiter); }
  passwortSetzen(neu) { return this.s.passwortSetzen(neu); }
  kontoLoeschen() { return this.s.rpc('bd_konto_loeschen').then(() => this.s.setzeSitzung(null)); }
  get ich() { return this.s.benutzer?.id; }

  // ---------- Profil ----------
  async profilLaden() {
    const r = await this.s.holen('profiles', `id=eq.${this.ich}&select=id,name,farbe`);
    return r[0] || { id: this.ich, name: '', farbe: '#6A1B2B' };
  }
  async profilSpeichern({ name, farbe }) {
    const r = await this.s.aendern('profiles', `id=eq.${this.ich}`, { name, farbe });
    return r[0];
  }

  // ---------- Kalender ----------
  async kalenderLaden() {
    const r = await this.s.holen('calendar_members',
      `select=rolle,sichtbar,calendars(id,name,farbe,erstellt_von)&user_id=eq.${this.ich}&order=beigetreten`);
    return r.filter((m) => m.calendars).map((m) => ({ ...m.calendars, rolle: m.rolle, sichtbar: m.sichtbar }));
  }
  async kalenderAnlegen(name, farbe) { return this.s.rpc('bd_kalender_anlegen', { p_name: name, p_farbe: farbe }); }
  async kalenderAendern(id, { name, farbe }) { return (await this.s.aendern('calendars', `id=eq.${id}`, { name, farbe }))[0]; }
  kalenderLoeschen(id) { return this.s.loeschen('calendars', `id=eq.${id}`); }
  sichtbarSetzen(kalId, sichtbar) {
    return this.s.aendern('calendar_members', `calendar_id=eq.${kalId}&user_id=eq.${this.ich}`, { sichtbar });
  }

  // ---------- Mitglieder und Einladungen ----------
  async mitgliederLaden(kalId) {
    const r = await this.s.holen('calendar_members', `select=user_id,rolle,profiles(name,farbe)&calendar_id=eq.${kalId}&order=beigetreten`);
    return r.map((m) => ({ user_id: m.user_id, rolle: m.rolle, name: m.profiles?.name || '?', farbe: m.profiles?.farbe || '#5A6070' }));
  }
  rolleSetzen(kalId, userId, rolle) { return this.s.aendern('calendar_members', `calendar_id=eq.${kalId}&user_id=eq.${userId}`, { rolle }); }
  mitgliedEntfernen(kalId, userId) { return this.s.loeschen('calendar_members', `calendar_id=eq.${kalId}&user_id=eq.${userId}`); }
  einladungenLaden(kalId) {
    return this.s.holen('invitations', `calendar_id=eq.${kalId}&gueltig_bis=gt.${q(new Date().toISOString())}&order=erstellt.desc`);
  }
  async einladungErstellen(kalId, rolle) { return (await this.s.einfuegen('invitations', { calendar_id: kalId, rolle, erstellt_von: this.ich }))[0]; }
  einladungLoeschen(id) { return this.s.loeschen('invitations', `id=eq.${id}`); }
  async einladungAnsehen(token) { return (await this.s.rpc('bd_einladung_ansehen', { p_token: token }))[0] || null; }
  einladungAnnehmen(token) { return this.s.rpc('bd_einladung_annehmen', { p_token: token }); }

  // ---------- Termine ----------
  /** Termine der Kalender, die [von, bis) berühren können (wiederholte immer; genaue Auswahl macht termine.js). */
  async termineLaden(kalIds, von, bis) {
    if (!kalIds.length) return [];
    const a = plusTage(von, -1).toISOString(), b = plusTage(bis, 1).toISOString();   // 1 Tag Puffer für Zeitzonen
    return this.s.holen('events',
      `calendar_id=in.(${kalIds.join(',')})&beginn=lt.${q(b)}&or=${q(`(ende.gte.${a},wiederholung.neq.keine)`)}&order=beginn&limit=5000`);
  }
  async terminAnlegen(datensatz) { return (await this.s.einfuegen('events', datensatz))[0]; }
  async terminAendern(id, datensatz) { return (await this.s.aendern('events', `id=eq.${id}`, datensatz))[0]; }
  terminLoeschen(id) { return this.s.loeschen('events', `id=eq.${id}`); }

  // ---------- Erledigt-Häkchen ----------
  async hakenLaden(von, bis) {
    const a = plusTage(von, -1), b = plusTage(bis, 1);
    const tag = (d) => d.toISOString().slice(0, 10);
    return this.s.holen('event_user_flags', `user_id=eq.${this.ich}&erledigt=is.true&datum=gte.${tag(a)}&datum=lte.${tag(b)}&select=event_id,datum`);
  }
  hakenSetzen(eventId, datum, erledigt) {
    if (erledigt) return this.s.upsert('event_user_flags', { event_id: eventId, user_id: this.ich, datum, erledigt: true }, 'event_id,user_id,datum');
    return this.s.loeschen('event_user_flags', `event_id=eq.${eventId}&user_id=eq.${this.ich}&datum=eq.${datum}`);
  }
  async hakenVonAllen(eventId, datum) {
    const r = await this.s.holen('event_user_flags', `event_id=eq.${eventId}&datum=eq.${datum}&erledigt=is.true&select=user_id,profiles(name,farbe)`);
    return r.map((h) => ({ user_id: h.user_id, name: h.profiles?.name || '?', farbe: h.profiles?.farbe }));
  }

  // ---------- Live ----------
  live(beiAenderung, beiStatus) {
    return this.s.live(['events', 'calendars', 'calendar_members', 'event_user_flags'], beiAenderung, beiStatus);
  }
}
