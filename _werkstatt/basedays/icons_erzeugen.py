"""BaseDays | App-Icons erzeugen (nur Python-Standardbibliothek).

Bildmarke negativ (Quadrate weiß, Cursor Aprikose) auf Tinte, laut CD erlaubt.
Tinte statt Weiß unterscheidet BaseDays auf dem Startbildschirm von BaseBite.
Aufruf im Hauptordner:  python _werkstatt/basedays/icons_erzeugen.py
"""
import os
import struct
import zlib

TINTE = (0x1C, 0x2E, 0x4A)
WEISS = (0xFF, 0xFF, 0xFF)
APRIKOSE = (0xF7, 0xE4, 0xD4)
# Bildmarke im 52er-Raster: (x, y, b, h, farbe)
BIT = [(0, 0, 24, 24, WEISS), (28, 18, 24, 6, APRIKOSE), (0, 28, 24, 24, WEISS), (28, 28, 24, 24, WEISS)]

ZIEL = os.path.join(os.path.dirname(__file__), '..', '..', 'werkzeuge', 'basedays', 'icons')


def png(pfad, groesse, anteil):
    marke = groesse * anteil
    einheit = marke / 52
    versatz = (groesse - marke) / 2
    rechtecke = [(versatz + x * einheit, versatz + y * einheit, versatz + (x + b) * einheit, versatz + (y + h) * einheit, f)
                 for x, y, b, h, f in BIT]
    zeilen = bytearray()
    for py in range(groesse):
        zeilen.append(0)
        for px in range(groesse):
            farbe = TINTE
            mx, my = px + 0.5, py + 0.5
            for x0, y0, x1, y1, f in rechtecke:
                if x0 <= mx < x1 and y0 <= my < y1:
                    farbe = f
                    break
            zeilen.extend(farbe)

    def block(typ, daten):
        return struct.pack('>I', len(daten)) + typ + daten + struct.pack('>I', zlib.crc32(typ + daten) & 0xFFFFFFFF)

    inhalt = (b'\x89PNG\r\n\x1a\n'
              + block(b'IHDR', struct.pack('>IIBBBBB', groesse, groesse, 8, 2, 0, 0, 0))
              + block(b'IDAT', zlib.compress(bytes(zeilen), 9))
              + block(b'IEND', b''))
    with open(pfad, 'wb') as d:
        d.write(inhalt)
    print('geschrieben:', os.path.normpath(pfad))


if __name__ == '__main__':
    os.makedirs(ZIEL, exist_ok=True)
    for g in (192, 512):
        png(os.path.join(ZIEL, f'icon-{g}.png'), g, 0.5)            # Bildmarke halb so breit wie das Icon
        png(os.path.join(ZIEL, f'icon-maskable-{g}.png'), g, 0.4)   # innerhalb der sicheren Zone (80 %)
