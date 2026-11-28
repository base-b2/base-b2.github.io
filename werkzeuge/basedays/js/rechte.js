/* BaseDays | Zugriffsrechte in geteilten Kalendern.
   Spiegelt die Regeln aus _werkstatt/basedays/schema.sql, damit die Oberfläche nur anbietet, was erlaubt ist.
   Verbindlich bleibt die Datenbank: Auch wenn hier etwas falsch wäre, lehnt sie unerlaubte Änderungen ab. */

export const ROLLEN = {
  owner: { name: 'Besitzer:in', kurz: 'Besitzer:in', rang: 3 },
  editor: { name: 'Bearbeiten', kurz: 'Bearbeiten', rang: 2 },
  viewer: { name: 'Nur lesen', kurz: 'Lesen', rang: 1 },
};

const gueltig = (r) => Object.prototype.hasOwnProperty.call(ROLLEN, r);

export const darfLesen = (rolle) => gueltig(rolle);
export const darfSchreiben = (rolle) => rolle === 'owner' || rolle === 'editor';
export const darfVerwalten = (rolle) => rolle === 'owner';   // umbenennen, Farbe, einladen, Mitglieder, löschen
export const darfEinladen = darfVerwalten;
export const darfAbhaken = (rolle) => gueltig(rolle);         // eigenes "erledigt" setzt jede Rolle

/** Darf ich (meineRolle) die Rolle eines Mitglieds von alt auf neu ändern? */
export function darfRolleAendern(meineRolle, alt, neu, istSelbst) {
  if (!darfVerwalten(meineRolle) || istSelbst) return false;
  if (alt === 'owner' || neu === 'owner') return false;   // es gibt genau eine Besitzerin / einen Besitzer
  return gueltig(alt) && gueltig(neu);
}

/** Darf ich dieses Mitglied entfernen (bzw. selbst austreten)? */
export function darfEntfernen(meineRolle, zielRolle, istSelbst) {
  if (zielRolle === 'owner') return false;   // Owner löscht stattdessen den Kalender
  if (istSelbst) return gueltig(meineRolle);
  return darfVerwalten(meineRolle);
}

/** Kalender, in die ich Termine eintragen darf. */
export function beschreibbar(kalenderListe) {
  return kalenderListe.filter((k) => darfSchreiben(k.rolle));
}

/** Darf ich einen Termin in kalenderVon ändern und (bei Kalenderwechsel) nach kalenderNach verschieben? */
export function darfTerminSpeichern(rolleVon, rolleNach) {
  return darfSchreiben(rolleVon) && darfSchreiben(rolleNach ?? rolleVon);
}
