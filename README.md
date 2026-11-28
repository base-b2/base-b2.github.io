# Base B | base-b.de

Läuft im Browser. Bleibt auf dem Gerät. Statische Webseite für GitHub Pages, ohne Tracking, ohne Werbung, ohne externe Schriften.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Startseite mit Eingabezeile (Suche, Filter nach Art und Befehle: `hilfe`, `42`, `plan b`) |
| `404.html` | Fehlerseite |
| `werkzeuge/` | Übersicht, `zufallsgenerator/`, `fotobox/` |
| `spiele/baseboard/` | BaseBoard: Quiz im Raster erstellen, als .html/.csv speichern, mit Teams spielen (Logik in `baseboard.js`, Stil in `baseboard.css`) |
| `leitfaeden/` | Platzhalter |
| `spiele/` | Übersicht der Spiele |
| `ueber/`, `kontakt/`, `impressum/`, `datenschutz/` | Infoseiten |
| `fotobox/` | Weiterleitung von der alten Adresse auf `/werkzeuge/fotobox/` |
| `assets/css/tokens.css` | Farben, Schriften, Abstände (einzige Quelle) |
| `assets/css/base.css` | Grundstil, Kopf- und Fußzeile, Bausteine |
| `assets/js/site.js` | Menü; Dunkelmodus-Schalter vorerst aus (`THEMA_SCHALTER` in `_werkstatt/seiten.py`, `SPEICHERN` in `site.js`) |
| `assets/fonts/` | Lexend und JetBrains Mono (selbst gehostet, OFL) |
| `assets/img/` | Logo und Bildmarke |
| `_werkstatt/seiten.py` | Generator für alle Seiten (wird nicht veröffentlicht) |
| `aufgabe1ab/`, `aufgabe1c/` | Unabhängige Projekte, nicht verlinkt |

## Seiten ändern

Kopf- und Fußzeile stehen nur einmal in `_werkstatt/seiten.py`. Nach Änderungen dort (z. B. einem neuen Menüpunkt in der Liste `MENUE`) im Hauptordner ausführen:

```
python3 _werkstatt/seiten.py
```

Die Inhalte von Zufallsgenerator und Fotobox stehen in `_werkstatt/zufall_inhalt.html` und `_werkstatt/fotobox_inhalt.html`, Logik und Stil direkt in den jeweiligen Ordnern.

## Kalender-App (BaseDays)

Geteilter Kalender wie ein Familien- oder WG-Kalender: Monats-, Wochen- und Tagesansicht, mehrere Kalender pro Person, Teilen per Link mit Rollen (Besitzer:in, Bearbeiten, Nur lesen), Live-Aktualisierung, "erledigt"-Häkchen, Wiederholungen. Vorerst unverlinkt (`noindex`).

| Pfad | Inhalt |
|---|---|
| `werkzeuge/basedays/` | App (PWA): `index.html`, `app.css`, `sw.js`, `manifest.webmanifest`, `icons/` |
| `werkzeuge/basedays/js/` | `app.js` (Oberfläche), `ansichten.js` (Monat/Woche/Tag), `termine.js`, `wiederholung.js`, `datum.js`, `rechte.js` (Kernlogik), `supa.js` (Supabase-Client), `daten.js` / `demo.js` (Datenschicht mit bzw. ohne Server), `konfig.js` (Verbindung) |
| `_werkstatt/basedays/` | `schema.sql` (Datenbank + Zugriffsregeln), `rls-tests.sql`, `tests.html` (Logik-Tests), `LIESMICH.md` |

**Lokal starten** (im Hauptordner):

```
python -m http.server 8765 --bind 127.0.0.1
```

- App: http://127.0.0.1:8765/werkzeuge/basedays/ (ohne Supabase-Daten gibt es den Demo-Modus)
- Tests: http://127.0.0.1:8765/_werkstatt/basedays/tests.html

**Backend:** Supabase (Postgres, Auth, Realtime; Region Frankfurt). Die Zugriffsrechte stehen als Row Level Security in der Datenbank.

**Umgebungsvariablen:** Es gibt keine geheimen Werte im Code. In `werkzeuge/basedays/js/konfig.js` stehen nur die öffentliche Projekt-URL und der anon/publishable-Schlüssel.

Einrichtung, Datenmodell, Rechte-Tabelle, Veröffentlichen und der Weg zur Android-App stehen in [`_werkstatt/basedays/LIESMICH.md`](_werkstatt/basedays/LIESMICH.md).

## Gestaltung

Alles folgt dem CD-Manual "Base B - Corporate Design Manual". Kurz: Bordeaux #6A1B2B, Tinte #1C2E4A, Lexend + JetBrains Mono, nur Zeichen von der deutschen Tastatur (Ausnahmen: →, tiefgestellte Basis, ✓ ✗).
