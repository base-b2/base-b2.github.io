# BaseBite | APK bauen
# Aufruf in diesem Ordner:   .\bauen.ps1            -> Test-APK (Debug-Signatur)
#                            .\bauen.ps1 -Release   -> APK mit eigenem Schlüssel (empfohlen für den Alltag)
# Voraussetzungen: Node.js (LTS) und Android Studio, siehe LIESMICH.md
param([switch]$Release)
$ErrorActionPreference = 'Stop'
$hier = $PSScriptRoot
$wurzel = (Resolve-Path (Join-Path $hier '..\..')).Path
Set-Location $hier

function Schritt($t) { Write-Host "`n== $t" -ForegroundColor Cyan }

# ---------- Umgebung ----------
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path $env:ANDROID_HOME)) { throw "Android SDK nicht gefunden ($env:ANDROID_HOME). Bitte Android Studio installieren und einmal starten." }
$jbr = @('C:\Program Files\Android\Android Studio\jbr', (Join-Path $env:LOCALAPPDATA 'Programs\Android Studio\jbr')) | Where-Object { Test-Path (Join-Path $_ 'bin\java.exe') } | Select-Object -First 1
if ($jbr) { $env:JAVA_HOME = $jbr; $env:Path = (Join-Path $jbr 'bin') + ';' + $env:Path }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js fehlt. Bitte die LTS-Version von nodejs.org installieren und PowerShell neu öffnen.' }

# ---------- 1. Webdateien nach www kopieren (gleiche Struktur wie auf base-b.de) ----------
Schritt 'Webdateien kopieren'
$www = Join-Path $hier 'www'
if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $www 'assets\css'), (Join-Path $www 'assets\fonts'), (Join-Path $www 'werkzeuge') | Out-Null
Copy-Item (Join-Path $wurzel 'assets\css\tokens.css'), (Join-Path $wurzel 'assets\css\base.css') (Join-Path $www 'assets\css')
Copy-Item (Join-Path $wurzel 'assets\fonts\*') (Join-Path $www 'assets\fonts')
Copy-Item (Join-Path $wurzel 'favicon.ico'), (Join-Path $wurzel 'favicon.svg'), (Join-Path $wurzel 'apple-touch-icon.png') $www
Copy-Item (Join-Path $wurzel 'werkzeuge\kalorienzaehler') (Join-Path $www 'werkzeuge') -Recurse
Remove-Item (Join-Path $www 'werkzeuge\kalorienzaehler\sw.js')   # in der App nicht nötig, Dateien liegen in der APK
$start = '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>BaseBite</title><script>location.replace("werkzeuge/kalorienzaehler/index.html")</script></head><body></body></html>'
[IO.File]::WriteAllText((Join-Path $www 'index.html'), $start, (New-Object Text.UTF8Encoding $false))

# ---------- 2. Pakete ----------
if (-not (Test-Path (Join-Path $hier 'node_modules'))) { Schritt 'Pakete installieren (einmalig, dauert etwas)'; npm install; if ($LASTEXITCODE) { throw 'npm install fehlgeschlagen' } }

# ---------- 3. Android-Projekt ----------
$neu = -not (Test-Path (Join-Path $hier 'android'))
if ($neu) { Schritt 'Android-Projekt anlegen'; npx cap add android; if ($LASTEXITCODE) { throw 'cap add fehlgeschlagen' } }
Schritt 'Webdateien und Plugins übertragen'
npx cap sync android; if ($LASTEXITCODE) { throw 'cap sync fehlgeschlagen' }

# ---------- 4. Icons, Benachrichtigungs-Icon, Berechtigungen ----------
Schritt 'Icons erzeugen'
npx capacitor-assets generate --android --iconBackgroundColor '#FFFFFF' --iconBackgroundColorDark '#FFFFFF' --splashBackgroundColor '#FFFFFF' --splashBackgroundColorDark '#24272E'
if ($LASTEXITCODE) { throw 'Icons konnten nicht erzeugt werden' }
$res = Join-Path $hier 'android\app\src\main\res'
Get-ChildItem (Join-Path $hier 'android-res') -Directory | ForEach-Object {
  $z = Join-Path $res $_.Name; New-Item -ItemType Directory -Force $z | Out-Null
  Copy-Item (Join-Path $_.FullName '*') $z -Force
}
$mf = Join-Path $hier 'android\app\src\main\AndroidManifest.xml'
$x = [IO.File]::ReadAllText($mf)
foreach ($p in 'CAMERA', 'POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM', 'RECEIVE_BOOT_COMPLETED', 'WAKE_LOCK') {
  if ($x -notmatch "permission\.$p`"") { $x = $x -replace '</manifest>', "    <uses-permission android:name=`"android.permission.$p`" />`n</manifest>" }
}
if ($x -notmatch 'android.hardware.camera"') { $x = $x -replace '</manifest>', "    <uses-feature android:name=`"android.hardware.camera`" android:required=`"false`" />`n</manifest>" }
[IO.File]::WriteAllText($mf, $x, (New-Object Text.UTF8Encoding $false))

# ---------- 5. Bauen ----------
Set-Location (Join-Path $hier 'android')
if (-not $Release) {
  Schritt 'Test-APK bauen (Debug)'
  .\gradlew.bat assembleDebug; if ($LASTEXITCODE) { throw 'Gradle-Build fehlgeschlagen' }
  Copy-Item 'app\build\outputs\apk\debug\app-debug.apk' (Join-Path $hier 'BaseBite-test.apk') -Force
  Set-Location $hier
  Write-Host "`nFertig: $(Join-Path $hier 'BaseBite-test.apk')" -ForegroundColor Green
  return
}

Schritt 'Release-APK bauen'
.\gradlew.bat assembleRelease; if ($LASTEXITCODE) { throw 'Gradle-Build fehlgeschlagen' }
Set-Location $hier
$ks = Join-Path $hier 'basebite.keystore'
if (-not (Test-Path $ks)) {
  Schritt 'Eigenen Signaturschlüssel anlegen (einmalig). Passwort gut merken und Datei sichern!'
  keytool -genkeypair -v -keystore $ks -alias basebite -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=Base B, C=AT'
  if ($LASTEXITCODE) { throw 'Schlüssel konnte nicht angelegt werden' }
}
$bt = Get-ChildItem (Join-Path $env:ANDROID_HOME 'build-tools') -Directory | Sort-Object { [version]($_.Name -replace '[^0-9.]', '') } | Select-Object -Last 1
$roh = Join-Path $hier 'android\app\build\outputs\apk\release\app-release-unsigned.apk'
$ausgerichtet = Join-Path $hier 'android\app\build\outputs\apk\release\app-release-aligned.apk'
& (Join-Path $bt.FullName 'zipalign.exe') -f -p 4 $roh $ausgerichtet; if ($LASTEXITCODE) { throw 'zipalign fehlgeschlagen' }
& (Join-Path $bt.FullName 'apksigner.bat') sign --ks $ks --ks-key-alias basebite --out (Join-Path $hier 'BaseBite.apk') $ausgerichtet
if ($LASTEXITCODE) { throw 'Signieren fehlgeschlagen' }
Write-Host "`nFertig: $(Join-Path $hier 'BaseBite.apk')" -ForegroundColor Green
