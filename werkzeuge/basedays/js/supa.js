/* BaseDays | Schlanker Supabase-Client (ohne fremde Bibliothek).
   Deckt genau ab, was BaseDays braucht:
   - Anmeldung (Supabase Auth / GoTrue): registrieren, anmelden, abmelden, Passwort zurücksetzen, Token erneuern
   - Daten (PostgREST): lesen, einfügen, ändern, löschen, upsert, Funktionen (RPC)
   - Live-Aktualisierung (Supabase Realtime, Phoenix-Protokoll über WebSocket): meldet "etwas hat sich geändert"
   Die Sitzung (Zugangs- und Erneuerungs-Token) liegt im localStorage dieses Geräts. */

const SPEICHER = 'basedays.sitzung';

export class SupaFehler extends Error {
  constructor(text, status = 0, code = '') { super(text); this.status = status; this.code = code; }
}

/** Technische Meldungen von Supabase in verständliches Deutsch übersetzen. */
function uebersetzen(status, j) {
  const roh = (j && (j.msg || j.error_description || j.message || j.error)) || '';
  const code = (j && (j.error_code || j.code)) || '';
  const r = String(roh).toLowerCase();
  if (status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Zu viele Versuche. Bitte ein paar Minuten warten.';
  if (code === 'invalid_credentials' || r.includes('invalid login credentials')) return 'E-Mail oder Passwort stimmt nicht.';
  if (code === 'email_not_confirmed' || r.includes('email not confirmed')) return 'Bitte zuerst die E-Mail-Adresse bestätigen (Link im Postfach).';
  if (code === 'user_already_exists' || r.includes('already registered')) return 'Für diese E-Mail-Adresse gibt es schon ein Konto.';
  if (code === 'weak_password' || r.includes('password should be')) return 'Das Passwort ist zu schwach (mindestens 8 Zeichen).';
  if (code === 'same_password') return 'Das neue Passwort muss sich vom alten unterscheiden.';
  if (code === 'validation_failed' || r.includes('unable to validate email')) return 'Bitte eine gültige E-Mail-Adresse eingeben.';
  if (code === 'signup_disabled') return 'Neue Konten sind gerade nicht möglich.';
  if (code === '42501' || r.includes('row-level security')) return 'Dafür fehlen Ihnen in diesem Kalender die Rechte.';
  if (code === '23514') return 'Eine Eingabe ist ungültig oder zu lang.';
  if (code === 'P0001' && roh) return roh;   // eigene Meldungen aus schema.sql sind schon Deutsch
  if (status === 401) return 'Ihre Anmeldung ist abgelaufen. Bitte neu anmelden.';
  return roh ? `Fehler vom Server: ${roh}` : `Fehler vom Server (${status}).`;
}

export class Supa {
  constructor(url, schluessel) {
    this.url = url.replace(/\/+$/, '');
    this.schluessel = schluessel;
    this.beobachter = new Set();
    this.erneuerung = null;
    try { this.sitzung = JSON.parse(localStorage.getItem(SPEICHER) || 'null'); } catch { this.sitzung = null; }
  }

  get benutzer() { return this.sitzung?.user || null; }
  get angemeldet() { return !!this.sitzung?.access_token; }

  /** fn(sitzung | null) bei jeder Änderung der Anmeldung. */
  beiAnmeldung(fn) { this.beobachter.add(fn); return () => this.beobachter.delete(fn); }

  setzeSitzung(s) {
    if (s && s.access_token) {
      this.sitzung = {
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        expires_at: s.expires_at || Math.floor(Date.now() / 1000) + Number(s.expires_in || 3600),
        user: s.user ? { id: s.user.id, email: s.user.email } : this.sitzung?.user || null,
      };
    } else this.sitzung = null;
    try {
      if (this.sitzung) localStorage.setItem(SPEICHER, JSON.stringify(this.sitzung));
      else localStorage.removeItem(SPEICHER);
    } catch { /* privater Modus: Sitzung gilt nur bis zum Schließen */ }
    for (const fn of this.beobachter) fn(this.sitzung);
  }

  // ---------- Grundfunktion ----------
  async anfrage(pfad, { methode = 'GET', body, kopf = {}, mitToken = true, nochmal = true } = {}) {
    const headers = { apikey: this.schluessel, ...kopf };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (mitToken) {
      const token = await this.gueltigesToken();
      if (!token) throw new SupaFehler('Bitte zuerst anmelden.', 401);
      headers.Authorization = `Bearer ${token}`;
    }
    let antwort;
    try {
      antwort = await fetch(this.url + pfad, { method: methode, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new SupaFehler(navigator.onLine === false ? 'Sie sind offline. Bitte später noch einmal versuchen.' : 'Keine Verbindung zum Server.', 0, 'netz');
    }
    if (antwort.status === 401 && mitToken && nochmal && this.sitzung?.refresh_token) {
      await this.erneuern(true);
      return this.anfrage(pfad, { methode, body, kopf, mitToken, nochmal: false });
    }
    const text = await antwort.text();
    let j = null;
    try { j = text ? JSON.parse(text) : null; } catch { j = null; }
    if (!antwort.ok) {
      if (antwort.status === 401 && mitToken) this.setzeSitzung(null);
      throw new SupaFehler(uebersetzen(antwort.status, j), antwort.status, (j && (j.error_code || j.code)) || '');
    }
    return j;
  }

  /** Liefert ein gültiges Zugangs-Token und erneuert es kurz vor Ablauf. */
  async gueltigesToken() {
    if (!this.sitzung) return null;
    if (this.sitzung.expires_at - 60 > Date.now() / 1000) return this.sitzung.access_token;
    await this.erneuern();
    return this.sitzung?.access_token || null;
  }

  /** Token erneuern; parallele Aufrufe teilen sich eine Anfrage. */
  erneuern(erzwingen = false) {
    if (!this.sitzung?.refresh_token) return Promise.resolve();
    if (!erzwingen && this.sitzung.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
    if (!this.erneuerung) {
      this.erneuerung = this.anfrage('/auth/v1/token?grant_type=refresh_token', {
        methode: 'POST', body: { refresh_token: this.sitzung.refresh_token }, mitToken: false,
      }).then((s) => this.setzeSitzung(s))
        .catch((e) => { if (e.code !== 'netz') this.setzeSitzung(null); throw e; })
        .finally(() => { this.erneuerung = null; });
    }
    return this.erneuerung;
  }

  // ---------- Anmeldung ----------
  /** Gibt true zurück, wenn sofort angemeldet; false, wenn erst die E-Mail bestätigt werden muss. */
  async registrieren(email, passwort, name, weiterleitung) {
    const s = await this.anfrage(`/auth/v1/signup?redirect_to=${encodeURIComponent(weiterleitung)}`, {
      methode: 'POST', mitToken: false, body: { email, password: passwort, data: { name } },
    });
    if (s && s.access_token) { this.setzeSitzung(s); return true; }
    return false;
  }

  async anmelden(email, passwort) {
    const s = await this.anfrage('/auth/v1/token?grant_type=password', { methode: 'POST', mitToken: false, body: { email, password: passwort } });
    this.setzeSitzung(s);
  }

  async abmelden() {
    try { if (this.sitzung) await this.anfrage('/auth/v1/logout', { methode: 'POST', nochmal: false }); } catch { /* lokal trotzdem abmelden */ }
    this.setzeSitzung(null);
  }

  async passwortVergessen(email, weiterleitung) {
    await this.anfrage(`/auth/v1/recover?redirect_to=${encodeURIComponent(weiterleitung)}`, { methode: 'POST', mitToken: false, body: { email } });
  }

  async passwortSetzen(neu) {
    await this.anfrage('/auth/v1/user', { methode: 'PUT', body: { password: neu } });
  }

  /**
   * Nach Klick auf den Link in einer Supabase-E-Mail steht die Sitzung im Adress-Anker:
   * #access_token=...&refresh_token=...&type=signup|recovery|magiclink  (oder #error=...).
   * Übernimmt sie und gibt { typ, fehler } zurück, sonst null.
   */
  ausAdresseUebernehmen(hash) {
    const h = hash.replace(/^#\/?/, '');
    if (!/(^|&)(access_token|error)=/.test(h)) return null;
    const p = new URLSearchParams(h);
    if (p.get('error')) return { typ: 'fehler', fehler: (p.get('error_description') || p.get('error')).replace(/\+/g, ' ') };
    this.setzeSitzung({
      access_token: p.get('access_token'), refresh_token: p.get('refresh_token'),
      expires_at: Number(p.get('expires_at')) || undefined, expires_in: p.get('expires_in'),
      user: this.benutzerAusToken(p.get('access_token')),
    });
    return { typ: p.get('type') || 'anmeldung', fehler: null };
  }

  /** Benutzer-ID und E-Mail aus dem JWT lesen (nur zur Anzeige; geprüft wird das Token vom Server). */
  benutzerAusToken(token) {
    try {
      const teil = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const daten = JSON.parse(decodeURIComponent(escape(atob(teil))));
      return { id: daten.sub, email: daten.email };
    } catch { return null; }
  }

  // ---------- Daten ----------
  holen(tabelle, abfrage = '') { return this.anfrage(`/rest/v1/${tabelle}${abfrage ? '?' + abfrage : ''}`); }

  einfuegen(tabelle, daten) {
    return this.anfrage(`/rest/v1/${tabelle}`, { methode: 'POST', body: daten, kopf: { Prefer: 'return=representation' } });
  }

  aendern(tabelle, filter, daten) {
    return this.anfrage(`/rest/v1/${tabelle}?${filter}`, { methode: 'PATCH', body: daten, kopf: { Prefer: 'return=representation' } });
  }

  loeschen(tabelle, filter) { return this.anfrage(`/rest/v1/${tabelle}?${filter}`, { methode: 'DELETE' }); }

  upsert(tabelle, daten, konflikt) {
    return this.anfrage(`/rest/v1/${tabelle}?on_conflict=${konflikt}`, {
      methode: 'POST', body: daten, kopf: { Prefer: 'resolution=merge-duplicates,return=representation' },
    });
  }

  rpc(name, argumente = {}) { return this.anfrage(`/rest/v1/rpc/${name}`, { methode: 'POST', body: argumente }); }

  // ---------- Live ----------
  live(tabellen, beiAenderung, beiStatus = () => {}) { return new Live(this, tabellen, beiAenderung, beiStatus); }
}

/** Supabase Realtime: abonniert Änderungen an Tabellen. Die Datenbank prüft dabei dieselben Zugriffsregeln. */
class Live {
  constructor(supa, tabellen, beiAenderung, beiStatus) {
    Object.assign(this, { supa, tabellen, beiAenderung, beiStatus });
    this.ref = 0; this.versuche = 0; this.gestoppt = false; this.ws = null; this.takt = null;
    this.thema = 'realtime:basedays';
    this.abmelden = supa.beiAnmeldung((s) => { if (s) this.senden(this.thema, 'access_token', { access_token: s.access_token }); });
    this.verbinden();
  }

  senden(topic, event, payload) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const ref = String(++this.ref);
    this.ws.send(JSON.stringify({ topic, event, payload, ref, join_ref: topic === this.thema ? this.joinRef : undefined }));
    return ref;
  }

  async verbinden() {
    if (this.gestoppt) return;
    const token = await this.supa.gueltigesToken().catch(() => null);
    if (!token) { this.beiStatus('aus'); return; }
    const adresse = `${this.supa.url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(this.supa.schluessel)}&vsn=1.0.0`;
    const ws = new WebSocket(adresse);
    this.ws = ws;
    ws.onopen = () => {
      this.joinRef = String(++this.ref);
      ws.send(JSON.stringify({
        topic: this.thema, event: 'phx_join', ref: this.joinRef, join_ref: this.joinRef,
        payload: {
          config: {
            broadcast: { self: false, ack: false }, presence: { key: '' }, private: false,
            postgres_changes: this.tabellen.map((t) => ({ event: '*', schema: 'public', table: t })),
          },
          access_token: token,
        },
      }));
      clearInterval(this.takt);
      this.takt = setInterval(() => this.senden('phoenix', 'heartbeat', {}), 25000);
    };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.event === 'phx_reply' && m.ref === this.joinRef) {
        if (m.payload?.status === 'ok') { this.versuche = 0; this.beiStatus('an'); } else this.beiStatus('fehler');
      } else if (m.event === 'postgres_changes') {
        this.beiAenderung(m.payload?.data?.table || '');
      } else if (m.event === 'phx_error' || (m.event === 'system' && m.payload?.status === 'error')) {
        this.beiStatus('fehler');
      }
    };
    ws.onclose = () => {
      clearInterval(this.takt);
      if (this.gestoppt) return;
      this.beiStatus('aus');
      const warte = [1000, 2000, 5000, 10000, 30000][Math.min(this.versuche++, 4)];
      setTimeout(() => this.verbinden(), warte);
    };
  }

  stoppen() {
    this.gestoppt = true;
    clearInterval(this.takt);
    this.abmelden();
    try { this.ws?.close(); } catch { /* egal */ }
  }
}
