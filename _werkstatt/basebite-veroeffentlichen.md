# BaseBite veröffentlichen

BaseBite liegt unter `werkzeuge/kalorienzaehler/` und ist schon jetzt unter base-b.de/werkzeuge/kalorienzaehler/ erreichbar, aber **nirgends verlinkt** und mit `noindex` für Suchmaschinen gesperrt.

## Der kleine Schritt zum Veröffentlichen

1. In `_werkstatt/seiten.py` ganz oben `BASEBITE_OEFFENTLICH = False` auf `True` ändern.
2. In `werkzeuge/kalorienzaehler/index.html` die Zeile `<meta name="robots" content="noindex, nofollow">` (und den Kommentar darüber) löschen.
3. Im Hauptordner ausführen:

```powershell
python _werkstatt/seiten.py
```

Das ergänzt automatisch:
- den Menüpunkt **Werkzeuge → BaseBite**,
- die Kachel auf der Startseite und unter **Werkzeuge**,
- den Abschnitt zu BaseBite in der **Datenschutzerklärung** (`/datenschutz/`) und passt den Satz "Nichts auf Ihrem Gerät gespeichert" an.

4. In `werkzeuge/kalorienzaehler/sw.js` die Zeile `const VERSION = 'basebite-v1';` auf `v2` erhöhen (siehe unten), hochladen, 1-2 Minuten warten, prüfen.

Die Ausgabe mit `False` ist geprüft identisch mit den jetzigen Seiten; der Schalter ändert also nur, was zu BaseBite gehört.

> Hinweis: Die Datenschutzerklärung liegt im Repo unter `/datenschutz/` (im Menü unter "Über"), nicht unter `/ueber/datenschutz/`.

## Bei jeder Änderung an BaseBite

Der Service Worker liefert die App-Dateien aus dem Speicher des Handys (damit sie offline läuft). Damit Änderungen ankommen, in `sw.js` die `VERSION` hochzählen (`basebite-v2`, `basebite-v3` ...). Die App zeigt dann beim nächsten Öffnen "Neue Version von BaseBite ist da" mit **Neu laden**. Neue Dateien zusätzlich in die Liste `DATEIEN` in `sw.js` eintragen.

## Entwurf: Abschnitt für die Datenschutzerklärung

Dieser Text ist bereits in `seiten.py` (`BASEBITE_DATENSCHUTZ`) hinterlegt und erscheint als eigener Punkt unter "Werkzeuge":

> **BaseBite (Kalorienzähler):** Tagebuch, Gewicht, Profil (Geschlecht, Alter, Größe, Ziele), Rezepte und eigene Lebensmittel speichert BaseBite ausschließlich in Ihrem Browser bzw. in der App auf Ihrem Gerät (IndexedDB), dazu wenige Einstellungen wie Dunkelmodus und Erinnerungszeiten (localStorage) und die Programmdateien für den Offline-Betrieb (Cache Storage). Diese Speicherung ist technisch nötig, damit der von Ihnen gewünschte Kalorienzähler funktioniert. Es gibt kein Konto und keinen Server: Diese Daten, auch Gesundheitsdaten wie Gewicht und Ernährung, erreichen weder mich noch Dritte. Sie bleiben gespeichert, bis Sie sie in der App unter "Ihre Daten" löschen, die Browserdaten löschen oder die App entfernen. Cookies setzt BaseBite nicht.
>
> Nur wenn Sie nach einem Lebensmittel suchen oder einen Barcode scannen, schickt Ihr Gerät das Suchwort bzw. die Barcode-Nummer an Open Food Facts (Open Food Facts, gemeinnütziger Verein nach französischem Recht, Paris). Dabei wird technisch bedingt Ihre IP-Adresse übermittelt. Weitere Daten, insbesondere Ihr Tagebuch, Gewicht oder Kamerabild, werden nicht übertragen. Rechtsgrundlage ist Ihre Nutzung dieser Funktion (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Für die Verarbeitung bei Open Food Facts gilt deren Datenschutzerklärung. Mit der Einstellung "Nur offline" schalten Sie diese Abfragen vollständig ab.

Der vorhandene Abschnitt **Hosting** (GitHub Pages, IP-Adresse, Server-Logs) bleibt unverändert und gilt auch für BaseBite. Ergänzungsvorschlag dort, falls Sie es genauer haben möchten:

> GitHub speichert dabei Zugriffsdaten (u. a. IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browser) in Server-Logs. Auf diese Logs habe ich keinen Zugriff. GitHub Inc. sitzt in den USA; die Übermittlung stützt sich auf das EU-US Data Privacy Framework, unter dem GitHub zertifiziert ist.

## Kurzer Hinweis auf der Werkzeug-Seite

In der App ist schon alles sichtbar: Erststart-Hinweis, der Satz unter dem Suchfeld ("Beim Suchen und Scannen wird nur das Suchwort bzw. der Barcode an Open Food Facts übertragen. Ihre Daten") und die Seite **Ihre Daten** im Menü. Die Kachel auf base-b.de sagt: "Kalorien zählen, auch offline. Tagebuch, Gewicht und Ziele bleiben auf Ihrem Gerät."

## Bitte rechtlich selbst prüfen

Ich bin kein Anwalt; diese Punkte sollten Sie (oder eine fachkundige Stelle) vor dem Veröffentlichen klären:

- [ ] **Speichern auf dem Endgerät ohne Einwilligung:** IndexedDB/localStorage gelten rechtlich wie Cookies. Ausnahme, wenn sie "unbedingt erforderlich" für einen vom Nutzer ausdrücklich gewünschten Dienst sind (Österreich: § 165 Abs. 3 TKG 2021; Deutschland: § 25 Abs. 2 Nr. 2 TDDDG). Für Tagebuch und Profil ist das gut vertretbar. Bei **Dunkelmodus** und **Erinnerungszeiten** prüfen, ob sie ebenfalls darunterfallen (sie werden nur gespeichert, wenn Sie sie selbst einstellen).
- [ ] **Gesundheitsdaten (Art. 9 DSGVO):** Da die Daten nie das Gerät verlassen, verarbeiten Sie als Anbieter sie nach meinem Verständnis nicht. Bitte bestätigen lassen, dass damit keine Einwilligung nach Art. 9 Abs. 2 lit. a nötig ist.
- [ ] **Rechtsgrundlage Open Food Facts:** Art. 6 Abs. 1 lit. b oder f DSGVO, oder Einwilligung? Die Übertragung löst der Nutzer selbst aus; "Nur offline" ist abschaltbar.
- [ ] **Drittlandübermittlung GitHub (USA):** aktuellen Stand des EU-US Data Privacy Framework und die Zertifizierung von GitHub prüfen.
- [ ] **Verantwortlicher und Impressum:** Passt die bestehende Angabe (Privatperson, nicht kommerziell) zu einem Gesundheits-Werkzeug? Österreich: Offenlegung nach § 25 MedienG; Deutschland: § 5 DDG.
- [ ] **Haftung und Gesundheitshinweis:** Die App zeigt "ersetzt keine ärztliche Beratung" und warnt vor ungesunden Zielen. Prüfen, ob ein ausdrücklicher Haftungsausschluss gewünscht ist und ob die App kein Medizinprodukt im Sinne der MDR ist (nach meinem Verständnis nicht, da allgemeines Wellness-Werkzeug ohne Diagnose oder Therapie).
- [ ] **Open-Food-Facts-Lizenz:** Die Produktdaten stehen unter der ODbL; die App nennt die Quelle unter "Über BaseBite". Prüfen, ob die Namensnennung so reicht.
- [ ] **APK außerhalb des Play Stores weitergeben:** Wenn Sie die APK auch anderen geben (z. B. Schüler:innen), gelten dieselben Punkte; zusätzlich die Altersfrage (Kalorienzählen bei Jugendlichen) bedenken.
