# BaseDays | Einrichten, Testen, Veröffentlichen

BaseDays ist der geteilte Kalender von Base B: eine Web-App (PWA) unter `/werkzeuge/basedays/`, die Daten und Anmeldung über **Supabase** abwickelt. Dieser Ordner (`_werkstatt/basedays/`) wird von GitHub Pages nicht veröffentlicht.

| Datei | Zweck |
|---|---|
| `schema.sql` | Tabellen, Zugriffsregeln (Row Level Security), Funktionen, Realtime |
| `rls-tests.sql` | 24 Tests der Zugriffsregeln, laufen in einer Transaktion und hinterlassen nichts |
| `tests.html`, `tests.js` | 30 Tests der Kernlogik im Browser (Datum, Wiederholung, Anordnung, Rechte) |
| `icons_erzeugen.py` | erzeugt die App-Icons in `werkzeuge/basedays/icons/` |

## 1 Ausprobieren ohne Server (Demo)

Solange `werkzeuge/basedays/js/konfig.js` leer ist, zeigt BaseDays einen Hinweis mit dem Knopf **Demo ansehen**. Die Demo speichert alles nur im Browser (`localStorage`, Schlüssel `basedays.demo`), mit einer erfundenen Mitbewohnerin Mira im Kalender "WG".

Lokal starten (im Hauptordner):

```
python -m http.server 8765 --bind 127.0.0.1
```

Dann `http://127.0.0.1:8765/werkzeuge/basedays/` öffnen. Die Tests liegen unter `http://127.0.0.1:8765/_werkstatt/basedays/tests.html`.

## 2 Supabase einrichten (einmalig, ca. 15 min)

1. Auf supabase.com ein Konto anlegen und **New project** wählen. Region: **Central EU (Frankfurt)**. Das Datenbank-Passwort sicher aufbewahren, es gehört nirgends ins Repository.
2. **SQL Editor** öffnen, **New query** wählen, den Inhalt von `schema.sql` einfügen und **Run** klicken.
3. Neue Abfrage mit `rls-tests.sql` ausführen. Erwartet wird eine Zeile "Alle 24 Zugriffstests bestanden.".
4. **Authentication → URL Configuration**:
   - Site URL: `https://base-b.de/werkzeuge/basedays/`
   - Redirect URLs: `https://base-b.de/werkzeuge/basedays/` und zum Testen `http://127.0.0.1:8765/werkzeuge/basedays/`
5. **Authentication → Sign In / Providers → Email**: "Confirm email" an lassen. Mindestlänge des Passworts auf 8 setzen.
6. **E-Mail-Versand:** Der eingebaute Versand von Supabase schickt nur an Adressen aus dem eigenen Supabase-Team und nur wenige Mails pro Stunde. Für echte Nutzer:innen unter **Authentication → Emails → SMTP Settings** einen eigenen Versand eintragen, z. B. das Postfach von base-b.de beim Domain-Anbieter. Zum ersten Testen alternativ "Confirm email" vorübergehend ausschalten.
7. Optional: Unter **Authentication → Emails → Templates** die Texte der E-Mails auf Deutsch übersetzen.
8. **Project Settings → API** (bzw. "Data API" und "API Keys"): Project URL und den **anon**- bzw. **publishable**-Schlüssel in `werkzeuge/basedays/js/konfig.js` eintragen.

### Was ist geheim und was nicht?

- `SUPABASE_URL` und der anon/publishable-Schlüssel sind **öffentlich**. Sie stehen zwangsläufig im Browser-Code. Schutz bieten die Zugriffsregeln in `schema.sql`: Ohne Anmeldung gibt es nichts, und angemeldet nur die eigenen bzw. geteilten Kalender.
- **Geheim** sind das Datenbank-Passwort und der `service_role`- bzw. `secret`-Schlüssel. Sie werden für BaseDays nicht gebraucht und dürfen nie ins Repository. Falls Sie sie lokal notieren, dann in einer `.env`-Datei (steht in `.gitignore`).
- Passwörter speichert Supabase Auth nur als bcrypt-Hash. BaseDays selbst sieht sie nie.

## 3 Datenmodell

```
auth.users (Supabase)          1 Konto
  └─ profiles                  Name, Avatar-Farbe (Trigger legt Profil + "Mein Kalender" an)
calendars                      Name, Farbe, erstellt_von
  ├─ calendar_members          (calendar_id, user_id) -> rolle owner | editor | viewer, sichtbar
  ├─ invitations               token (Link), rolle, gueltig_bis (14 Tage, beliebig viele Personen)
  └─ events                    titel, beschreibung, ort, ganztaegig, beginn, ende, farbe,
       │                       wiederholung (keine | taeglich | woechentlich | monatlich | jaehrlich), wiederholung_bis
       └─ event_user_flags     (event_id, user_id, datum) -> erledigt  (je Person und Vorkommen)
```

- **Ganztägig** wird als `JJJJ-MM-TTT00:00:00Z` gespeichert, `ende` = letzter Tag einschließlich. So bleibt der Tag in jeder Zeitzone gleich.
- **Wiederholungen** werden nicht als einzelne Zeilen gespeichert, sondern beim Anzeigen berechnet (`js/wiederholung.js`). Änderungen gelten für die ganze Serie. "Nur diesen Termin ändern" wäre ein späterer Ausbau (Ausnahmen-Tabelle).

### Rechte

| | Besitzer:in (owner) | Bearbeiten (editor) | Nur lesen (viewer) |
|---|---|---|---|
| Termine sehen | ✓ | ✓ | ✓ |
| Termine anlegen, ändern, löschen | ✓ | ✓ | ✗ |
| Eigenes "erledigt"-Häkchen | ✓ | ✓ | ✓ |
| Kalender umbenennen, Farbe, einladen, Rollen ändern, Mitglieder entfernen, Kalender löschen | ✓ | ✗ | ✗ |
| Kalender verlassen | ✗ (stattdessen löschen) | ✓ | ✓ |

Verbindlich sind die Regeln in `schema.sql`. `js/rechte.js` spiegelt sie nur, damit die Oberfläche nichts Unerlaubtes anbietet.

## 4 Live-Aktualisierung

BaseDays abonniert über **Supabase Realtime** (WebSocket) Änderungen an Terminen, Kalendern, Mitgliedschaften und Häkchen. Realtime prüft dabei dieselben Zugriffsregeln. Kommt eine Meldung, lädt die App den sichtbaren Zeitraum neu (400 ms gebündelt).

Ersatz ohne Live-Verbindung: Neu laden beim Zurückkehren in den Tab und jede Minute, solange keine Live-Verbindung besteht.

Warum Realtime statt nur Polling? Ein Kalender wird oft gleichzeitig auf mehreren Handys offen gehalten. Mit Realtime erscheinen Änderungen in etwa einer Sekunde und es fallen keine ständigen Abfragen an. In der Gratis-Stufe sind 200 gleichzeitige Verbindungen enthalten.

Der Client (`js/supa.js`) ist bewusst selbst geschrieben, rund 250 Zeilen statt `supabase-js`. Er braucht keine fremde Bibliothek und keinen Build-Schritt und bleibt im Stil der übrigen Werkzeuge.

## 5 Veröffentlichen

1. Supabase wie oben einrichten, `konfig.js` ausfüllen, mit zwei Konten testen (Einladung, Rollen, Live).
2. **Datenschutzerklärung ergänzen** (Pflicht vor dem Verlinken): Konten, gespeicherte Daten (Name, E-Mail, Termine, Häkchen), Auftragsverarbeiter Supabase Inc. (Server Frankfurt, Auftragsverarbeitungsvertrag im Supabase-Dashboard abschließen), Löschung über "Konto löschen", Local Storage für Sitzung und Ansicht. Die Seite entsteht über `_werkstatt/seiten.py`.
3. Im CD-Manual bzw. im Base-B-Skill nachtragen:
   - Ausnahme "externer Dienst: Supabase für BaseDays"
   - die acht Kalenderfarben (siehe `FARBEN` in `js/app.js`)
   - die Namensregel "Base" + echtes Wort
4. In `werkzeuge/basedays/index.html` die `robots`-Zeile entfernen.
5. In `_werkstatt/seiten.py` eine Kachel und einen Menüpunkt ergänzen, analog zu `BASEBITE_OEFFENTLICH`, dann `python3 _werkstatt/seiten.py` ausführen.

## 6 Weg zur Android-App

BaseDays ist schon jetzt eine installierbare PWA: In Chrome auf Android **Menü → App installieren** wählen. Das liefert ein eigenes Icon und ein Vollbild-Fenster ohne Adressleiste.

Für eine echte APK bzw. den Play Store gibt es denselben Weg wie bei BaseBite (`_werkstatt/basebite-apk/`):

1. **Capacitor-Hülle** um `werkzeuge/basedays/`. Der Code bleibt derselbe. Wichtig: Die Supabase-Redirect-URLs um das App-Schema ergänzen (z. B. `de.baseb.basedays://`), damit Bestätigungs-Links in die App zurückführen.
2. **Erinnerungen:** lokale Benachrichtigungen per `@capacitor/local-notifications`, berechnet aus den geladenen Terminen.
3. **Push bei Änderungen anderer** ("Mira hat einen Termin eingetragen"): Firebase Cloud Messaging plus eine Supabase Edge Function, die bei neuen Terminen sendet. Dafür braucht es eine Tabelle für Geräte-Tokens.
4. **Offline-Lesen:** zuletzt geladene Termine in IndexedDB zwischenspeichern (wie BaseBite). Schreiben offline bräuchte eine Warteschlange mit Konfliktregeln und ist erst danach sinnvoll.

Alternativ zu Capacitor genügt für den Play Store auch eine TWA (Trusted Web Activity). Sie kann aber keine zuverlässigen lokalen Erinnerungen, deshalb wurde schon bei BaseBite Capacitor gewählt.

## 7 Bekannte Grenzen des MVP

- Wiederholungen nur als ganze Serie bearbeitbar
- Keine Erinnerungen und keine Push-Mitteilungen
- Ohne Netz sind Termine nicht sichtbar (die App-Hülle startet aber offline)
- Einladen dürfen nur Besitzer:innen
- Beim Löschen eines Kontos werden alle Kalender gelöscht, die dieser Person gehören, auch für die anderen Mitglieder
