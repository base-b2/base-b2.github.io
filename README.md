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

## Gestaltung

Alles folgt dem CD-Manual "Base B - Corporate Design Manual". Kurz: Bordeaux #6A1B2B, Tinte #1C2E4A, Lexend + JetBrains Mono, nur Zeichen von der deutschen Tastatur (Ausnahmen: →, tiefgestellte Basis, ✓ ✗).
