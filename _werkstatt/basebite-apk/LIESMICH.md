# BaseBite als APK bauen und installieren

Die APK nutzt **dieselben Dateien** wie die PWA (`werkzeuge/basebite/`). Verpackt wird mit **Capacitor**: Die App-Dateien stecken in der APK, BaseBite läuft damit vollständig offline und kann echte, vom System geplante Erinnerungen schicken. Kosten: keine. Play Store: nicht nötig.

Ordner: `_werkstatt/basebite-apk/` (wird von GitHub Pages nicht veröffentlicht).

| Datei | Zweck |
|---|---|
| `bauen.ps1` | Erledigt alles: Webdateien kopieren, Android-Projekt anlegen, Icons, Berechtigungen, APK bauen |
| `capacitor.config.json` | App-Name, Paketname `de.baseb.basebite`, Einstellungen für Benachrichtigungen |
| `package.json` | Liste der Capacitor-Pakete |
| `assets/` | Quellen für App-Icon und Startbild (aus der Bildmarke erzeugt) |
| `android-res/` | Weißes Benachrichtigungs-Icon (Android verlangt einfarbig) |
| `.gitignore` | Hält `node_modules/`, `www/`, `android/`, APK und Schlüssel aus dem Repo |

## Einmalig vorbereiten (ca. 30 min, meist Wartezeit)

1. **Node.js** installieren: nodejs.org → Version "LTS" → Installer mit Standardeinstellungen durchklicken.
2. **Android Studio** installieren: developer.android.com/studio → Installer mit Standardeinstellungen.
3. Android Studio einmal starten und den Einrichtungsassistenten ("Standard") durchlaufen lassen. Er lädt das passende Android SDK und bringt Java 21 mit. Ihr altes JDK 14 wird nicht gebraucht und muss nicht deinstalliert werden.
4. In Android Studio: **More Actions → SDK Manager → SDK Platforms**, "Android 15.0 (API 35)" anhaken → Apply. (Falls Sie das überspringen, lädt der erste Build es selbst nach.)
5. PowerShell **neu öffnen**, damit Node.js gefunden wird. Prüfen:

```powershell
node -v
```

Jetzt sehen Sie eine Versionsnummer wie `v22...`.

## APK bauen

1. PowerShell im Ordner `_werkstatt\basebite-apk` öffnen:

```powershell
cd "C:\Users\bauer\Webseite\base-b2.github.io\_werkstatt\basebite-apk"
```

2. Zum Ausprobieren eine Test-APK bauen (der erste Lauf dauert 5-10 min, danach ca. 1 min):

```powershell
.\bauen.ps1
```

Ergebnis: `BaseBite-test.apk` im selben Ordner.

3. Für den Alltag die **Release-APK mit eigenem Schlüssel** bauen:

```powershell
.\bauen.ps1 -Release
```

Beim ersten Mal fragt `keytool` nach einem Passwort (zweimal) und legt `basebite.keystore` an; danach fragt `apksigner` noch einmal nach dem Passwort. Ergebnis: `BaseBite.apk`.

> **Wichtig:** `basebite.keystore` und das Passwort sicher aufbewahren (z. B. Passwortmanager + Kopie auf USB-Stick). Updates lassen sich nur mit **demselben Schlüssel** über die installierte App installieren. Ohne Schlüssel müssten Sie deinstallieren, und das löscht alle Einträge in der App. Die Datei landet dank `.gitignore` nicht im Repo.

Warum nicht einfach immer die Test-APK? Sie ist mit einem Schlüssel signiert, der nur auf diesem PC liegt (`%USERPROFILE%\.android\debug.keystore`). Auf einem neuen PC passt er nicht mehr, Updates wären dann nicht möglich.

## Auf dem Handy installieren

1. APK aufs Handy bringen: per USB-Kabel in den Ordner `Download` kopieren, oder über OneDrive/Google Drive, oder per E-Mail an sich selbst.
2. Am Handy die Datei in **Dateien** (bzw. Eigene Dateien) antippen.
3. Android fragt beim ersten Mal: "Aus dieser Quelle installieren?" → **Einstellungen** → **Dieser Quelle vertrauen** einschalten → zurück.
4. **Installieren** antippen. Google Play Protect warnt eventuell vor einer "unbekannten App": **Details → Trotzdem installieren**. (Die Warnung kommt, weil die App nicht aus dem Play Store stammt.)
5. BaseBite öffnen. Beim ersten Speichern von Erinnerungen fragt Android nach der Erlaubnis für Benachrichtigungen, beim ersten Scannen nach der Kamera: beides erlauben.
6. Optional, damit Erinnerungen auf die Minute genau kommen: **Einstellungen → Apps → BaseBite → Wecker und Erinnerungen** erlauben. Bei manchen Herstellern (Samsung, Xiaomi, Huawei) zusätzlich unter **Akku** die Optimierung für BaseBite ausschalten.

Alternativ mit USB-Debugging (für Fortgeschrittene, `adb` liegt im Android SDK):

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r BaseBite.apk
```

## Update einspielen

1. Änderungen an `werkzeuge/basebite/` machen (wie bei der PWA).
2. `.\bauen.ps1 -Release` erneut ausführen.
3. Neue `BaseBite.apk` aufs Handy kopieren und antippen → **Aktualisieren**. Ihre Einträge bleiben erhalten.

Vorher sicherheitshalber in der App **Ihre Daten → Backup exportieren**.

## PWA und APK nebeneinander

PWA (im Browser) und APK speichern **getrennt**, auch wenn beide auf demselben Handy sind. Umziehen: in der einen **Ihre Daten → Backup exportieren**, in der anderen **Backup importieren**. In der APK landet das Backup im Ordner `Dokumente`.

## Was unterscheidet die APK von der PWA?

| | PWA | APK |
|---|---|---|
| Offline | ja (Service Worker) | ja (Dateien in der APK) |
| Erinnerungen | nur solange die App offen ist | zuverlässig, vom System geplant, auch nach Neustart |
| Backup-Datei | Download-Ordner | Ordner `Dokumente` |
| Updates | automatisch beim nächsten Öffnen mit Internet | neue APK installieren |
| Daten löschen | Browserdaten löschen | App deinstallieren |

## Wenn etwas hakt

| Meldung | Lösung |
|---|---|
| `Node.js fehlt` | Node.js installieren, PowerShell neu öffnen |
| `Android SDK nicht gefunden` | Android Studio einmal starten und den Einrichtungsassistenten abschließen |
| `Unsupported class file major version` oder `requires Java 21` | Android Studio ist nicht unter `C:\Program Files\Android\Android Studio` installiert. Dann vor dem Bauen `$env:JAVA_HOME` auf dessen Unterordner `jbr` setzen |
| Skript darf nicht ausgeführt werden | einmalig: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `npm install` scheitert hinter Schul-WLAN/Proxy | anderes Netz verwenden (z. B. Hotspot) |
| Android-Projekt kaputt | Ordner `android` löschen und `.\bauen.ps1` erneut starten, er wird neu angelegt |

Die Capacitor-Pakete sind auf Version 7 festgelegt (`package.json`). Spätere Versionen können andere Java- oder SDK-Stände brauchen; aktualisieren nur bei Bedarf.
