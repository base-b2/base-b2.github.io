"""Base B | Seitengenerator

Erzeugt alle HTML-Seiten mit gemeinsamer Kopf- und Fußzeile.
Aufruf aus dem Hauptordner der Webseite:  python3 _werkstatt/seiten.py

Der Ordner _werkstatt wird von GitHub Pages nicht veröffentlicht.
Neue Menüpunkte: Liste MENUE unten ergänzen und das Skript erneut ausführen.
"""
import hashlib
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent

# ---------- Menü (erweiterbar) ----------
MENUE = [
    ("Werkzeuge", "werkzeuge", [
        ("Alle Werkzeuge", "/werkzeuge/", "liste"),
        ("Zufallsgenerator", "/werkzeuge/zufallsgenerator/", "wuerfel"),
        ("Fotobox", "/werkzeuge/fotobox/", "kamera"),
    ]),
    ("Leitfäden", "leitfaeden", [
        ("Alle Leitfäden", "/leitfaeden/", "buch"),
    ]),
    ("Spiele", "spiele", [
        ("Alle Spiele", "/spiele/", "spiel"),
        ("BaseBoard", "/spiele/baseboard/", "raster"),
    ]),
    ("Über", "ueber", [
        ("Über Base B", "/ueber/", "info"),
        ("Kontakt", "/kontakt/", "brief"),
        ("Impressum", "/impressum/", "absatz"),
        ("Datenschutz", "/datenschutz/", "schloss"),
    ]),
]

# ---------- Linien-Icons (1,75 px, runde Enden) ----------
ICONS = {
    "wuerfel": '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/>',
    "kamera": '<path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5L16 6.5h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
    "buch": '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    "spiel": '<rect x="2.5" y="7" width="19" height="11" rx="4"/><line x1="7.5" y1="10.5" x2="7.5" y2="14.5"/><line x1="5.5" y1="12.5" x2="9.5" y2="12.5"/><circle cx="15.5" cy="11" r="1" fill="currentColor"/><circle cx="17.5" cy="14" r="1" fill="currentColor"/>',
    "liste": '<line x1="9" y1="7" x2="20" y2="7"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="17" x2="20" y2="17"/><circle cx="5" cy="7" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="17" r="1" fill="currentColor"/>',
    "info": '<circle cx="12" cy="12" r="8.5"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.8" fill="currentColor"/>',
    "brief": '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><polyline points="4,7 12,13 20,7"/>',
    "absatz": '<line x1="5" y1="6" x2="19" y2="6"/><line x1="5" y1="10" x2="19" y2="10"/><line x1="5" y1="14" x2="19" y2="14"/><line x1="5" y1="18" x2="13" y2="18"/>',
    "schloss": '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    "raster": '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><line x1="3.5" y1="9.2" x2="20.5" y2="9.2"/><line x1="3.5" y1="14.8" x2="20.5" y2="14.8"/><line x1="9.2" y1="3.5" x2="9.2" y2="20.5"/><line x1="14.8" y1="3.5" x2="14.8" y2="20.5"/>',
    "runter": '<polyline points="6,9 12,15 18,9"/>',
    "pfeil": '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="13,6 19,12 13,18"/>',
    "zurueck": '<polyline points="15,6 9,12 15,18"/>',
    "mond": '<path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z"/>',
    "sonne": '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="21.5" y2="12"/><line x1="5.3" y1="5.3" x2="6.7" y2="6.7"/><line x1="17.3" y1="17.3" x2="18.7" y2="18.7"/><line x1="5.3" y1="18.7" x2="6.7" y2="17.3"/><line x1="17.3" y1="6.7" x2="18.7" y2="5.3"/>',
    "menue": '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
    "beamer": '<rect x="3" y="4.5" width="18" height="12" rx="2"/><line x1="12" y1="16.5" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/>',
    "bild": '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.7"/><polyline points="4,18 10,13 14,16 17,13.5 20.5,16.5"/>',
    "speichern": '<line x1="12" y1="4" x2="12" y2="15"/><polyline points="7.5,10.5 12,15 16.5,10.5"/><line x1="4.5" y1="19.5" x2="19.5" y2="19.5"/>',
    "upload": '<line x1="12" y1="15" x2="12" y2="4"/><polyline points="7.5,8.5 12,4 16.5,8.5"/><line x1="4.5" y1="19.5" x2="19.5" y2="19.5"/>',
    "spiegeln": '<line x1="12" y1="3" x2="12" y2="21"/><polyline points="8,7 3,12 8,17"/><polyline points="16,7 21,12 16,17"/>',
    "zuruecksetzen": '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><polyline points="4,3 4,8 9,8"/>',
    "pipette": '<path d="M14.5 4.5l5 5"/><path d="M17 7l-9.5 9.5L5 19l-1-1 2.5-2.5L16 6"/>',
    "teilen": '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><line x1="8.2" y1="10.8" x2="15.8" y2="6.7"/><line x1="8.2" y1="13.2" x2="15.8" y2="17.3"/>',
    "farbe": '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
    "wechseln": '<path d="M4 9a8 8 0 0 1 14-3l2 2"/><polyline points="20,4 20,8 16,8"/><path d="M20 15a8 8 0 0 1-14 3l-2-2"/><polyline points="4,20 4,16 8,16"/>',
    "schliessen": '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    "senden": '<path d="M4 12l16-8-6 16-2.5-6.5z"/><line x1="11.5" y1="13.5" x2="20" y2="4"/>',
}


def icon(name, groesse=20, klasse=""):
    k = f' class="{klasse}"' if klasse else ""
    return (f'<svg{k} width="{groesse}" height="{groesse}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')


def pixel(zeilen, hoehe, farbe="currentColor", akzent="#6A1B2B"):
    """Pixel-Grafik im Bit-Stil: '#' = Grundfarbe, 'r' = Bordeaux."""
    b, h = len(zeilen[0]), len(zeilen)
    rects = "".join(
        f'<rect x="{x}" y="{y}" width="1" height="1" fill="{farbe if c == "#" else akzent}"/>'
        for y, z in enumerate(zeilen) for x, c in enumerate(z) if c in "#r")
    return (f'<svg width="{round(hoehe * b / h)}" height="{hoehe}" viewBox="0 0 {b} {h}" '
            f'shape-rendering="crispEdges" aria-hidden="true">{rects}</svg>')


FIGUR = ["#.......", "#.......", "#..rrr..", "#.......", "#######.", "#.#..#..", "#######.",
         "#.....#.", "#######.", "..#..#..", "..#..#.."]


def kopf(aktiv=""):
    punkte = []
    for titel, kennung, eintraege in MENUE:
        aktuell = ' aria-current="page"'
        links = "".join(
            f'<li><a href="{url}"{aktuell if url == aktiv else ""}>{icon(ic)}{name}</a></li>'
            for name, url, ic in eintraege)
        punkte.append(
            f'<li class="navi-punkt"><button class="navi-knopf" type="button" aria-expanded="false" '
            f'aria-controls="menue-{kennung}">{titel}{icon("runter", 16)}</button>'
            f'<ul class="untermenue" id="menue-{kennung}" hidden>{links}</ul></li>')
    thema = (f'<button class="kopf-knopf thema-knopf" type="button" aria-label="Dunkelmodus einschalten">'
             f'{icon("mond", 22, "mond")}{icon("sonne", 22, "sonne")}</button>') if THEMA_SCHALTER else ""
    return f'''<header class="kopf">
<div class="huelle">
<a class="logo" href="/" aria-label="Base B, zur Startseite"><img class="logo-hell" src="/assets/img/web_logo_hell.svg" alt="Base B" width="157" height="34"><img class="logo-dunkel" src="/assets/img/web_logo_dunkel.svg" alt="Base B" width="157" height="34"></a>
<nav class="navi" aria-label="Hauptmenü"><ul class="navi-liste">{"".join(punkte)}</ul>{thema}</nav>
<div class="kopf-rechts">{thema}<button class="kopf-knopf menue-knopf" type="button" aria-expanded="false">{icon("menue", 20)}<span class="menue-text">Menü</span></button></div>
</div>
</header>'''


FUSS = '''<footer class="fuss">
<div class="huelle">
<nav aria-label="Fußzeile"><a href="/ueber/">Über Base B</a><a href="/kontakt/">Kontakt</a><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a></nav>
<span class="mono">base-b.de | kein Tracking, keine Werbung, nur Bits</span>
</div>
</footer>'''


# Dunkelmodus: vorerst ganz aus, die Seite ist immer hell. Der Code bleibt für später erhalten.
THEMA_SCHALTER = False   # True = Mond/Sonne-Schalter in der Kopfzeile anzeigen
# Dunkelmodus-Wahl speichern? Vorerst aus (kein Local Storage). Zum Einschalten hier und in assets/js/site.js (SPEICHERN) auf True/true setzen.
THEMA_SPEICHERN = False
THEMA_SKRIPT = "<script>try{if(localStorage.getItem('bb-thema')==='dunkel')document.documentElement.setAttribute('data-theme','dunkel')}catch(e){}</script>\n"


def seite(pfad, titel, inhalt, beschreibung="Werkzeuge, Leitfäden und Spiele für den Unterricht. Läuft im Browser, bleibt auf dem Gerät.",
          aktiv="", extra_kopf="", extra_skripte="", ohne_rahmen=False):
    voller_titel = "Base B" if titel == "Base B" else f"{titel} | Base B"
    rahmen_oben = "" if ohne_rahmen else kopf(aktiv)
    rahmen_unten = "" if ohne_rahmen else FUSS
    html = f'''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{voller_titel}</title>
<meta name="description" content="{beschreibung}">
<meta name="theme-color" content="#1C2E4A">
{THEMA_SKRIPT if THEMA_SPEICHERN else ""}<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/lexend.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
{extra_kopf}
</head>
<body>
<a class="unsichtbar" href="#inhalt">Zum Inhalt springen</a>
{rahmen_oben}
<main id="inhalt">
{inhalt}
</main>
{rahmen_unten}
<script src="/assets/js/site.js" defer></script>
{extra_skripte}
</body>
</html>
'''
    ziel = WURZEL / pfad
    ziel.parent.mkdir(parents=True, exist_ok=True)
    html = mit_version(html, ziel.parent)
    ziel.write_text(html, encoding="utf-8", newline="\n")   # immer Unix-Zeilenenden, auch unter Windows


def mit_version(html, ordner):
    """Hängt an eigene CSS-/JS-Dateien eine Kennung aus ihrem Inhalt an (datei.css?v=1a2b3c4d).
    Ändert sich eine Datei, lädt der Browser sie sofort neu statt eine alte Fassung aus dem Zwischenspeicher zu nehmen."""
    def ersetze(m):
        attr, pfad = m.group(1), m.group(2)
        datei = (WURZEL / pfad.lstrip("/")) if pfad.startswith("/") else (ordner / pfad)
        if not datei.is_file():
            return m.group(0)
        kennung = hashlib.md5(datei.read_bytes()).hexdigest()[:8]
        return f'{attr}="{pfad}?v={kennung}"'
    return re.sub(r'(href|src)="((?!https?:|//|data:)[^"?#]+\.(?:css|js))"', ersetze, html)


def seitenkopf(titel, einleitung="", krumen=None):
    k = ""
    if krumen:
        teile = [f'<a href="{u}">{n}</a>' for n, u in krumen] + [f'<span aria-current="page">{titel}</span>']
        k = f'<nav class="brotkrumen" aria-label="Brotkrumen">{" → ".join(teile)}</nav>'
    e = f'<p class="einleitung">{einleitung}</p>' if einleitung else ""
    return f'<div class="seitenkopf">{k}<h1>{titel}</h1>{e}</div>'


def kachel(url, etikett, titel, text, bild, klasse="", suche=""):
    art = etikett.lower().replace("ä", "ae")
    return f'''<a class="kachel {klasse}" href="{url}" data-suche="{suche}" data-art="{art}">
<div class="kachel-kopf">{bild}<span class="kachel-etikett">{etikett}</span></div>
<div class="kachel-titel">{titel}</div>
<div class="kachel-text">{text}</div>
<div class="kachel-mehr">Öffnen {icon("pfeil", 18)}</div>
</a>'''


KACHEL_ZUFALL = kachel("/werkzeuge/zufallsgenerator/", "WERKZEUG", "Zufallsgenerator",
                       "Zahlen, Buchstaben, Würfel, Münze oder Namen aus Ihrer Liste.", icon("wuerfel", 32),
                       suche="zufall zufallsgenerator zahl zahlen buchstaben würfel wuerfel münze muenze los losen auslosen namen liste stadt land fluss")
KACHEL_FOTOBOX = kachel("/werkzeuge/fotobox/", "WERKZEUG", "Fotobox",
                        "Greenscreen weg, neuer Hintergrund. Gemacht für Kinder ab 10.", icon("kamera", 32),
                        suche="fotobox foto kamera greenscreen hintergrund bild")
KACHEL_LEITFAEDEN = kachel("/leitfaeden/", "LEITFADEN", "Leitfäden",
                           "Word, Excel und Co. Schritt für Schritt. Die ersten folgen bald.", icon("buch", 32),
                           "kachel-lav", "leitfaden leitfäden anleitung word excel powerpoint office")
KACHEL_BASEBOARD = kachel("/spiele/baseboard/", "SPIEL", "BaseBoard",
                          "Fragen im Raster, Punkte für Teams. Das Quiz speichern Sie als Datei, ohne Konto.", icon("raster", 32),
                          "kachel-apr", "baseboard board quiz quizwand jeopardy fragen raster punkte teams klasse unterricht spiel")
KACHEL_SPIELE = kachel("/spiele/", "SPIEL", "Plattformer",
                       "Hüpfen mit Bits. In Arbeit, bitte nicht drängeln.", pixel(FIGUR, 40),
                       "kachel-apr", "spiel spiele plattformer game")


# ---------- Startseite ----------
def startseite():
    inhalt = f'''<div class="huelle start">
<div class="start-oben">
<h1>Willkommen auf <span style="white-space: nowrap">Base B.</span><span class="start-unter">Läuft im Browser. Bleibt auf dem Gerät.</span></h1>
<form class="sprung" id="sprung" role="search" autocomplete="off">
<label class="etikett" for="sprung-eingabe">Wohin soll es gehen?</label>
<div class="sprung-feld">
<span class="sprung-zeichen" aria-hidden="true">&gt;</span>
<span class="sprung-cursor" aria-hidden="true"></span>
<input id="sprung-eingabe" type="text" spellcheck="false" placeholder="zufall, fotobox, hilfe" aria-label="Suchwort eingeben">
<span class="sprung-taste" aria-hidden="true">Enter</span>
</div>
<div class="sprung-antwort" id="sprung-antwort" role="status" aria-live="polite" hidden></div>
</form>
</div>
<section aria-labelledby="alles">
<div class="alles-kopf">
<h2 class="etikett" id="alles">Alles auf Base B</h2>
<div class="filter" role="group" aria-label="Nach Art filtern">
<button type="button" class="filter-knopf" data-art="" aria-pressed="true">Alle</button>
<button type="button" class="filter-knopf" data-art="werkzeug" aria-pressed="false">Werkzeug</button>
<button type="button" class="filter-knopf" data-art="leitfaden" aria-pressed="false">Leitfaden</button>
<button type="button" class="filter-knopf" data-art="spiel" aria-pressed="false">Spiel</button>
</div>
</div>
<div class="kacheln" id="kacheln">
{KACHEL_ZUFALL}
{KACHEL_FOTOBOX}
{KACHEL_LEITFAEDEN}
{KACHEL_BASEBOARD}
{KACHEL_SPIELE}
</div>
<p class="kachel-text" id="keine-treffer" hidden>Dazu gibt es noch nichts. Geben Sie <span class="mono">hilfe</span> ein, um alle Befehle zu sehen.</p>
</section>
</div>'''
    seite("index.html", "Base B", inhalt,
          extra_kopf='<link rel="stylesheet" href="/assets/css/start.css">',
          extra_skripte='<script src="/assets/js/start.js" defer></script>')


def fehlerseite():
    # Comic-Szene: Bit ist gegen die Wand gelaufen und sieht Sterne
    ziegel = "".join(f'<path d="M222 {y} h60"/>' for y in range(38, 190, 18))
    fugen = "".join(f'<path d="M{252 if i % 2 == 0 else 237} {20 + 18 * i} v18"/><path d="M{267 if i % 2 == 1 else 282} {20 + 18 * i} v18"/>' for i in range(9))
    szene = f'''<svg class="bit-szene" viewBox="0 0 300 200" width="360" height="240" shape-rendering="crispEdges" role="img" aria-label="Bit-Figur ist gegen eine Wand gelaufen und sieht Sterne">
<rect x="222" y="20" width="60" height="170" class="sz-wand"/>
<g class="sz-fuge">{ziegel}{fugen}</g>
<line x1="20" y1="190" x2="290" y2="190" class="sz-boden"/>
<g class="sz-figur" transform="translate(154,112)">
<rect x="0" y="0" width="12" height="24"/><rect x="0" y="24" width="48" height="36"/>
<rect x="12" y="60" width="6" height="12"/><rect x="30" y="60" width="6" height="12"/>
<rect x="12" y="72" width="12" height="6"/><rect x="30" y="72" width="12" height="6"/>
<g class="sz-augen"><rect x="12" y="30" width="12" height="12" class="sz-weiss"/><rect x="30" y="30" width="12" height="12" class="sz-weiss"/>
<rect x="18" y="36" width="6" height="6"/><rect x="36" y="36" width="6" height="6"/></g>
<rect x="24" y="12" width="24" height="6" class="sz-cursor"/>
</g>
<g class="sz-aufprall"><path d="M148 130 h-10"/><path d="M148 146 h-14"/><path d="M148 162 h-10"/></g>
<g class="sz-sterne">
<path d="M138 96 h12 M144 90 v12"/><path d="M172 82 h12 M178 76 v12"/><path d="M202 98 h10 M207 93 v10"/>
</g>
</svg>'''
    inhalt = f'''<style>
.fehler-karte {{ background: var(--bb-aprikose); }}
[data-theme="dunkel"] .fehler-karte {{ background: var(--bb-flaeche); }}
.bit-szene {{ max-width: 100%; height: auto; }}
.sz-wand {{ fill: var(--bb-lavendel); }}
.sz-fuge path {{ stroke: var(--bb-nebentext); stroke-width: 1.5; fill: none; }}
.sz-boden {{ stroke: var(--bb-text); stroke-width: 3; }}
.sz-figur rect {{ fill: var(--bb-text); }}
.sz-figur .sz-weiss {{ fill: var(--bb-grund); }}
.sz-figur .sz-cursor {{ fill: var(--bb-akzent); animation: sz-blinken 1.1s steps(1) infinite; }}
.sz-aufprall path, .sz-sterne path {{ stroke: var(--bb-akzent); stroke-width: 3; fill: none; }}
.sz-sterne path {{ animation: sz-funkeln 1.2s steps(1) infinite; }}
.sz-sterne path:nth-child(2) {{ animation-delay: .4s; }}
.sz-sterne path:nth-child(3) {{ animation-delay: .8s; }}
.sz-augen {{ transform-box: fill-box; transform-origin: center; animation: sz-zwinkern 4s steps(1) infinite; }}
@keyframes sz-blinken {{ 50% {{ opacity: 0; }} }}
@keyframes sz-funkeln {{ 66% {{ opacity: 0; }} }}
@keyframes sz-zwinkern {{ 92% {{ transform: scaleY(.15); }} 96% {{ transform: none; }} }}
@media (prefers-reduced-motion: reduce) {{ .sz-figur .sz-cursor, .sz-sterne path, .sz-augen {{ animation: none; }} }}
</style>
<div class="huelle">
<div class="karte fehler-karte" style="margin-top: 48px; border: none; display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-end; padding: 40px">
<div style="flex: 1 1 320px; display: flex; flex-direction: column; gap: 14px">
<span class="etikett" style="color: var(--bb-akzent)">Fehler 404</span>
<h1>Hier ist nichts.</h1>
<p style="color: var(--bb-nebentext)">Diese Adresse hat sich verlaufen.</p>
<p><a class="knopf" href="/">{icon("zurueck", 20)}Zur Startseite</a></p>
</div>
{szene}
</div>
</div>'''
    seite("404.html", "Seite nicht gefunden", inhalt)


def werkzeuge():
    inhalt = f'''<div class="huelle">
{seitenkopf("Werkzeuge", "Alle Werkzeuge laufen direkt im Browser. Ohne Anmeldung, ohne Werbung.")}
<div class="kacheln">{KACHEL_ZUFALL}{KACHEL_FOTOBOX}</div>
</div>'''
    seite("werkzeuge/index.html", "Werkzeuge", inhalt, aktiv="/werkzeuge/")


def leitfaeden():
    zeichen = pixel(["#########", "#.......#", "#.##.##.#", "#.......#", "#.#####.#", "#.......#", "#.#####.#",
                     "#.......#", "#########"], 64)
    inhalt = f'''<div class="huelle">
{seitenkopf("Leitfäden")}
<div class="karte" style="background: var(--bb-lavendel); border: none; display: flex; gap: 24px; align-items: center; flex-wrap: wrap; padding: 32px">
<div style="color: var(--bb-text)">{zeichen}</div>
<div style="flex: 1 1 320px; display: flex; flex-direction: column; gap: 8px">
<h2>Die ersten Leitfäden sind in Arbeit.</h2>
<p>Hier erscheinen bald Schritt-für-Schritt-Anleitungen zu Word, Excel und Co., zum Lesen und als PDF zum Drucken.</p>
<p class="mono" style="font-size: 14px">Fortschritt: 0011₂ von 1010₂</p>
</div>
</div>
</div>'''
    seite("leitfaeden/index.html", "Leitfäden", inhalt, aktiv="/leitfaeden/")


def spiele():
    inhalt = f'''<div class="huelle">
{seitenkopf("Spiele")}
<div class="kacheln" style="margin-bottom: 24px">{KACHEL_BASEBOARD}</div>
<div class="karte" style="background: var(--bb-aprikose); border: none; display: flex; gap: 24px; align-items: center; flex-wrap: wrap; padding: 32px">
<div style="color: var(--bb-text)">{pixel(FIGUR, 88)}</div>
<div style="flex: 1 1 320px; display: flex; flex-direction: column; gap: 8px">
<h2>Ein Plattformer ist in Arbeit.</h2>
<p>Die Hauptfigur besteht aus Bits und übt noch das Springen.</p>
</div>
</div>
</div>'''
    seite("spiele/index.html", "Spiele", inhalt, aktiv="/spiele/")


def ueber():
    inhalt = f'''<div class="huelle">
{seitenkopf("Über Base B")}
<div class="text">
<p>Base B ist eine kleine Sammlung von Werkzeugen, die direkt im Browser laufen. Ohne Anmeldung, ohne Werbung und ohne Tracking. Dazu kommen bald Leitfäden für Office-Programme, die sich auch im Unterricht einsetzen lassen.</p>
<h2>Der Name</h2>
<p>Base B steht für eine Basis und für das Binärsystem: Im Hexadezimalsystem steht B für die Zahl 11, binär 1011. Diese vier Bits bilden das Logo. Außerdem steckt der Name des Machers darin: <b>Ba</b>uer <b>Seb</b>astian.</p>
<h2>Kontakt</h2>
<p>Fragen, Ideen oder einen Fehler gefunden? Schreiben Sie über das <a href="/kontakt/">Kontaktformular</a>.</p>
</div>
</div>'''
    seite("ueber/index.html", "Über Base B", inhalt, aktiv="/ueber/")


def kontakt():
    inhalt = f'''<div class="huelle">
{seitenkopf("Kontakt", "Das Formular öffnet Ihr E-Mail-Programm mit einer fertigen Nachricht. Es wird nichts über diese Webseite verschickt oder gespeichert.")}
<form class="karte" id="kontakt" style="max-width: 640px; display: flex; flex-direction: column; gap: 18px" novalidate>
<div class="feld"><label for="k-name">Ihr Name</label><input class="eingabe" id="k-name" name="name" autocomplete="name" style="font-family: var(--bb-font-text)"></div>
<div class="feld"><label for="k-betreff">Betreff</label><input class="eingabe" id="k-betreff" name="betreff" style="font-family: var(--bb-font-text)"></div>
<div class="feld"><label for="k-nachricht">Nachricht</label><textarea class="eingabe" id="k-nachricht" name="nachricht" required></textarea></div>
<p class="fehlermeldung" id="k-fehler" hidden>✗ Bitte schreiben Sie eine Nachricht.</p>
<div><button class="knopf" type="submit">{icon("senden", 20)}E-Mail-Programm öffnen</button></div>
<p class="kachel-text">Kein E-Mail-Programm eingerichtet? Schreiben Sie direkt an <a href="mailto:kontakt@base-b.de">kontakt@base-b.de</a>.</p>
</form>
</div>'''
    skript = '''<script>
(() => {
  const f = document.getElementById('kontakt');
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = f.name.value.trim(), betreff = f.betreff.value.trim(), text = f.nachricht.value.trim();
    const fehler = document.getElementById('k-fehler');
    if (!text) { fehler.hidden = false; f.nachricht.focus(); return; }
    fehler.hidden = true;
    const body = text + (name ? '\\n\\n' + name : '');
    window.location.href = 'mailto:kontakt@base-b.de?subject=' + encodeURIComponent(betreff || 'Nachricht über base-b.de')
      + '&body=' + encodeURIComponent(body);
  });
})();
</script>'''
    seite("kontakt/index.html", "Kontakt", inhalt, aktiv="/kontakt/", extra_skripte=skript)


def impressum():
    inhalt = f'''<div class="huelle">
{seitenkopf("Impressum")}
<div class="text">
<p><b>Verantwortlich für den Inhalt</b><br>Sebastian Bauer</p>
<p><b>Kontakt</b><br>E-Mail: <a href="mailto:kontakt@base-b.de">kontakt@base-b.de</a></p>
<p>Base B ist ein privates, nicht kommerzielles Projekt ohne Werbung und ohne Einnahmen.</p>
<h2>Bildquellen</h2>
<p>Hintergrundbilder in der Fotobox stammen von <a href="https://openverse.org" rel="noopener">Openverse</a> und stehen unter freien Lizenzen. Urheber und Lizenz werden beim jeweiligen Bild angezeigt.</p>
<h2>Schriften</h2>
<p>Lexend und JetBrains Mono, beide unter der SIL Open Font License 1.1.</p>
</div>
</div>'''
    seite("impressum/index.html", "Impressum", inhalt, aktiv="/impressum/")


def datenschutz():
    inhalt = f'''<div class="huelle">
{seitenkopf("Datenschutz", "Kurz gesagt: Base B sammelt keine Daten über Sie.")}
<div class="text">
<h2>Verantwortlich</h2>
<p>Sebastian Bauer, <a href="mailto:kontakt@base-b.de">kontakt@base-b.de</a></p>
<h2>Hosting</h2>
<p>Diese Webseite wird über GitHub Pages bereitgestellt (GitHub Inc.). Beim Aufruf verarbeitet GitHub technisch notwendige Daten wie die IP-Adresse, um die Seite auszuliefern und vor Missbrauch zu schützen. Details stehen in der <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">Datenschutzerklärung von GitHub</a>.</p>
<h2>Kein Tracking, keine Cookies</h2>
<p>Es gibt keine Analyse-Werkzeuge, keine Werbung und keine Cookies. Schriften und Grafiken liegen auf dieser Webseite selbst und werden nicht von fremden Servern geladen.</p>
<h2>Nichts auf Ihrem Gerät gespeichert</h2>
<p>Base B legt von sich aus nichts auf Ihrem Gerät ab, auch keine Einstellungen. Der Dunkelmodus gilt deshalb nur für die gerade geöffnete Seite. Einzige Ausnahme ist das BaseBoard, und nur, wenn Sie dort ausdrücklich "Auf diesem Gerät merken" einschalten (siehe unten).</p>
<h2>Werkzeuge</h2>
<ul>
<li><b>Zufallsgenerator:</b> Alle Eingaben und hochgeladenen Listen bleiben in Ihrem Browser. Nichts wird übertragen oder gespeichert.</li>
<li><b>BaseBoard:</b> Quizze werden nicht online gespeichert. Sie laden sie als Datei auf Ihr Gerät herunter und öffnen sie bei Bedarf wieder. Nur wenn Sie "Auf diesem Gerät merken" einschalten, legt Ihr Browser den aktuellen Entwurf und einen laufenden Spielstand im Speicher des Browsers ab (Local Storage, rechtlich wie ein Cookie). Diese Daten verlassen Ihr Gerät nicht. Schalten Sie das Häkchen wieder aus, werden sie sofort gelöscht.</li>
<li><b>Fotobox:</b> Fotos werden nur auf Ihrem Gerät bearbeitet und nie hochgeladen. Für die Suche nach Hintergrundbildern wird nur der eingegebene Suchbegriff an Openverse (WordPress.org) geschickt; die Vorschaubilder werden von den jeweiligen Bildquellen geladen. Dabei wird, wie bei jedem Abruf im Internet, Ihre IP-Adresse an diese Server übermittelt.</li>
</ul>
<h2>Kontakt</h2>
<p>Das Kontaktformular öffnet nur Ihr eigenes E-Mail-Programm. Über diese Webseite wird nichts verschickt. Ihre E-Mail wird nur zur Beantwortung verwendet.</p>
<h2>Ihre Rechte</h2>
<p>Base B selbst erhebt und speichert keine personenbezogenen Daten über Sie: Es gibt keine Konten, keine Formulare, die Daten verschicken, und keine Auswertung Ihres Besuchs. Personenbezogene Daten fallen nur an, wenn Sie mir eine E-Mail schreiben, sowie bei GitHub (Hosting) und Openverse (Bildersuche in der Fotobox), siehe oben.</p>
<p>Für diese Fälle haben Sie das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten sowie ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde. Wenden Sie sich dazu an <a href="mailto:kontakt@base-b.de">kontakt@base-b.de</a>.</p>
</div>
</div>'''
    seite("datenschutz/index.html", "Datenschutz", inhalt, aktiv="/datenschutz/")


def alte_fotobox():
    (WURZEL / "fotobox").mkdir(exist_ok=True)
    (WURZEL / "fotobox" / "index.html").write_text('''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Fotobox | Base B</title>
<meta http-equiv="refresh" content="0; url=/werkzeuge/fotobox/">
<link rel="canonical" href="/werkzeuge/fotobox/">
</head>
<body>
<p>Die Fotobox ist umgezogen: <a href="/werkzeuge/fotobox/">zur Fotobox</a>.</p>
</body>
</html>
''', encoding="utf-8", newline="\n")


def zufallsgenerator():
    inhalt = (WURZEL / "_werkstatt" / "zufall_inhalt.html").read_text(encoding="utf-8")
    inhalt = inhalt.replace("{SEITENKOPF}", seitenkopf(
        "Zufallsgenerator", "Kategorie wählen, Optionen setzen, ziehen.", [("Werkzeuge", "/werkzeuge/")]))
    for name in ICONS:
        inhalt = inhalt.replace("{ICON:" + name + "}", icon(name, 20))
    seite("werkzeuge/zufallsgenerator/index.html", "Zufallsgenerator", inhalt,
          "Zufallszahlen, Buchstaben, Würfel mit 1 bis 100 Seiten, Münze und Namen aus eigenen Listen.",
          aktiv="/werkzeuge/zufallsgenerator/",
          extra_kopf='<link rel="stylesheet" href="zufall.css">',
          extra_skripte='<script src="zufall.js" defer></script>')


def baseboard():
    inhalt = f'''<div class="huelle">
{seitenkopf("BaseBoard", "Das Quiz-Board von Base B: Fragen im Raster bauen, als Datei speichern und mit Teams im Browser spielen.", [("Spiele", "/spiele/")])}
<div id="qw" class="qw"><noscript><p class="fehlermeldung">✗ Das BaseBoard braucht JavaScript.</p></noscript></div>
</div>'''
    seite("spiele/baseboard/index.html", "BaseBoard", inhalt,
          "Quiz mit Kategorien und Punkten erstellen, als Datei speichern und im Browser mit Teams spielen. Ohne Konto, ohne Server.",
          aktiv="/spiele/baseboard/",
          extra_kopf='<link rel="stylesheet" href="baseboard.css">',
          extra_skripte='<script src="baseboard.js" defer></script>')


def fotobox():
    inhalt = (WURZEL / "_werkstatt" / "fotobox_inhalt.html").read_text(encoding="utf-8")
    for name in ICONS:
        inhalt = inhalt.replace("{ICON:" + name + "}", icon(name, 28))
    seite("werkzeuge/fotobox/index.html", "Fotobox", inhalt,
          "Greenscreen entfernen und neuen Hintergrund einsetzen, direkt im Browser.",
          extra_kopf='<link rel="stylesheet" href="fotobox.css">',
          extra_skripte='<script src="fotobox.js" defer></script>', ohne_rahmen=True)


if __name__ == "__main__":
    startseite(); fehlerseite(); werkzeuge(); leitfaeden(); spiele()
    ueber(); kontakt(); impressum(); datenschutz(); alte_fotobox(); baseboard()
    if (WURZEL / "_werkstatt" / "zufall_inhalt.html").exists(): zufallsgenerator()
    if (WURZEL / "_werkstatt" / "fotobox_inhalt.html").exists(): fotobox()
    print("Seiten erzeugt.")
