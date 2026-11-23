# BaseBite | Kurzanleitung

BaseBite zählt Kalorien, läuft offline und speichert alles nur auf Ihrem Handy.

## Starten

- **PWA:** base-b.de/werkzeuge/kalorienzaehler/ in Chrome öffnen → Menü (drei Punkte) → **Zum Startbildschirm hinzufügen** bzw. **App installieren**. Danach startet BaseBite wie eine App, auch ohne Internet.
- **APK:** siehe `_werkstatt/basebite-apk/LIESMICH.md`.
- Beim ersten Start erklärt ein Hinweis, was gespeichert wird. **Verstanden** antippen.

## 1. Ziel festlegen (einmalig)

1. Unten **Ziele** antippen.
2. Geschlecht, Alter, Größe, Gewicht und Aktivität eintragen.
3. Ziel (abnehmen, halten, zunehmen), Tempo und Zielgewicht wählen.

Jetzt sehen Sie Grundumsatz, Gesamtumsatz und den Vorschlag für Ihr Tagesziel. Unter **So wird gerechnet** steht die Rechnung. Ist ein Ziel ungesund, erscheint ein roter Kasten mit Begründung und **Gegenvorschlag übernehmen**.

4. Optional: eigenes Tagesziel, Makro-Anteile (Summe 100 %) und Wasserziel anpassen.
5. **Speichern** antippen.

## 2. Essen eintragen

1. Im **Tagebuch** bei der Mahlzeit auf **Hinzufügen** tippen.
2. Lebensmittel finden:
   - Name eintippen: Eigene und gespeicherte Lebensmittel erscheinen sofort. Für Treffer aus Open Food Facts auf die **Lupe** tippen.
   - Oder **Barcode-Symbol** antippen und den Strichcode in den Rahmen halten. Klappt das nicht, die Nummer unter dem Strichcode eintippen.
   - Oder unten **Zuletzt**, **Favoriten**, **Eigene** oder **Rezepte** wählen.
3. Menge eingeben und Einheit wählen (Gramm, Packung oder Portion). Das Feld **Ergibt** rechnet sofort, z. B. 150 g x 380 / 100 = 570 kcal.
4. **Eintragen** antippen.

Eintrag ändern, löschen oder auf einen anderen Tag kopieren: im Tagebuch auf den Eintrag tippen.

## 3. Unbekannter Barcode, eigene Lebensmittel

Findet BaseBite einen Barcode nicht, öffnet sich **Neues Lebensmittel** mit der Nummer schon eingetragen.

1. Name und **kcal pro 100 g** eintragen (steht auf der Packung in der Nährwerttabelle).
2. Optional Packungsgröße: **kcal pro Packung** rechnet sich automatisch, und umgekehrt.
3. Optional Portion und Nährwerte.
4. **Speichern**: Danach öffnet sich gleich der Mengen-Dialog zum Eintragen.

Eigene Lebensmittel ohne Barcode (z. B. Omas Apfelkuchen) legen Sie unter **Lebensmittel → Eigenes Lebensmittel** an. Bearbeiten: Reiter **Eigene** → Stift.

## 4. Rezepte

1. Menü (oben rechts) → **Rezepte** → Namen eingeben → **Anlegen**.
2. **Zutat hinzufügen** und Mengen eingeben.
3. Gekochtes Gericht (ohne Topf) wiegen und als **Gesamtgewicht** eintragen, Portionen angeben.

Jetzt sehen Sie kcal gesamt, pro 100 g und pro Portion. **Eintragen** trägt Portionen oder Gramm ins Tagebuch ein.

## 5. Wasser

Im Tagebuch für jedes Glas auf ein Glas-Symbol tippen. Nochmals auf das letzte volle Glas tippen nimmt es zurück.

## 6. Gewicht und Verlauf

1. Unten **Verlauf** antippen.
2. Gewicht eintragen (Datum lässt sich auch nachträglich ändern) → **Speichern**.

Die Kurve zeigt Messungen und den 7-Tage-Schnitt (glättet Wasserschwankungen), dazu Prognose, kcal pro Tag und Wochenschnitt. Am besten jeden Morgen zur gleichen Zeit wiegen.

## 7. Erinnerungen

Menü → **Erinnerungen** → einschalten, Uhrzeit(en) eintragen → **Speichern** → Benachrichtigungen erlauben.

In der **APK** kommen die Erinnerungen zuverlässig. In der **PWA** nur, solange BaseBite geöffnet ist; Verpasstes zeigt das Tagebuch beim nächsten Öffnen an.

## 8. Ihre Daten und Backup

Menü → **Ihre Daten**:
- Tabelle, was wo gespeichert ist.
- **Nur offline / eigene Lebensmittel**: keine Abfragen mehr an Open Food Facts.
- **Backup exportieren** (JSON, vollständig) und **CSV exportieren** (für Excel).
- **Backup importieren**: JSON ersetzt oder ergänzt alles, CSV ergänzt Tagebuch, Gewicht und Wasser.
- **Alle Daten löschen**.

Wichtig: Browserdaten löschen oder App deinstallieren löscht alles. **Einmal pro Woche ein Backup exportieren** und z. B. in OneDrive ablegen.

## Gut zu wissen

- Dunkelmodus: Mond-Symbol oben rechts.
- Tage wechseln: Pfeile neben dem Datum, oder auf das Datum tippen und einen Tag wählen.
- Open Food Facts erlaubt nur wenige Namenssuchen pro Minute. Kommt eine Fehlermeldung, kurz warten; Barcodes sind davon kaum betroffen.
- BaseBite ersetzt keine ärztliche Beratung.
