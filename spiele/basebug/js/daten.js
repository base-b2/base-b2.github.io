/* BaseBug | Spieldaten: alle Basiswerte an einer Stelle, damit sich das Balancing leicht anpassen lässt. */
'use strict';
const SPIEL = 'basebug';
const MAXLV = 30;
const KAPITEL = [
  { n: 'Schreibtisch', k: 'k1' },
  { n: 'Serverraum', k: 'k2' },
  { n: 'Cloud', k: 'k3' },
];
/* Wachstum je Stufe (proportional, wie in vielen Spielen) */
const WACHS = {
  held: 1.10,        // Helden-Angriff je Heldenstufe
  turm: 1.35,        // Turm-Angriff je Turmstufe im Level
  gegnerHpLevel: 1.09, gegnerHpWelle: 1.07,
  gegnerAtkLevel: 1.06, gegnerAtkWelle: 1.04,
  item: 0.12,        // +12 % vom Grundwert je Ausrüstungsstufe
};
const BOSSMULT = { 5: 0.7, 10: 1.0, 15: 1.25, 20: 1.6 };
const FESTUNG_HP = 250;          // Grund-HP der Mauer
const KAFFEE_MAX = 3, KAFFEE_HEIL = 0.25;  // Kaffee: Tasse antippen heilt 25 %
const HAERTE = { mult: 1.5, empfohlen: [550, 1300, 2800] };

/* Bilder: 9x9 bzw. 7x7, T Text, A Akzent, G Grund, E Eisblau, L Lavendel, P Aprikose */
const HELDEN = {
  bit: { n: 'Bit', preis: 0, atk: 8, rate: 1.5, krit: 0.05, art: 'einzel', artT: 'Einzelschuss',
    f: { n: 'Strg + Z', t: 'Repariert 30 % der Festung und blockt 3 s jeden Schaden.', cd: 25 },
    info: 'Das Original. Solide, zuverlässig, etwas stur.',
    bild: ['.TT..AAA.', '.TT......', '.TT......', '.TTTTTTT.', '.TTGTTGT.', '.TTTTTTT.', '.TTTTTTT.', '..T...T..', '..T...T..'] },
  pixel: { n: 'Pixel', preis: 150, atk: 3.5, rate: 4.5, krit: 0.08, art: 'einzel', artT: 'Schnellfeuer',
    f: { n: 'Turbo', t: 'Feuert 5 s lang viermal so schnell.', cd: 20 },
    info: 'Klein, schnell, hat zu viel Kaffee getrunken.',
    bild: ['....A....', '....T....', '..TTTTT..', '..TGTGT..', '..TTTTT..', '..TTATT..', '..TTTTT..', '...T.T...', '...T.T...'] },
  byte: { n: 'Byte', preis: 300, atk: 14, rate: 0.75, krit: 0.05, art: 'flaeche', fl: 0.8, artT: 'Flächenschaden',
    f: { n: 'Bombe', t: 'Zehnfacher Schaden mitten in der dichtesten Gruppe.', cd: 18 },
    info: 'Acht Bits, ein Gedanke: Bumm.',
    bild: ['.........', '.TTTTTTT.', 'TTGTTTGTT', 'TTTTTTTTT', 'TATATATAT', 'TTTTTTTTT', '.TTTTTTT.', '.T.....T.', '.T.....T.'] },
  cache: { n: 'Cache', preis: 500, atk: 6, rate: 1.4, krit: 0.05, art: 'frost', artT: 'Verlangsamt',
    f: { n: 'Einfrieren', t: 'Alle Bugs stehen 3 s still.', cd: 24 },
    info: 'Merkt sich alles. Vor allem, wo die Bugs sind.',
    bild: ['.LLLLLLL.', '.LTTTTTL.', '..TTTTT..', '..TGTGT..', '..TTTTT..', '.TTTTTTT.', '.TTTTTTT.', '..T...T..', '..T...T..'] },
  root: { n: 'Root', preis: 800, atk: 7, rate: 1.1, krit: 0.1, art: 'kette', kette: 3, artT: 'Springt auf 3 Ziele',
    f: { n: 'sudo', t: 'Alle Türme 6 s mit doppeltem Angriff und doppelter Feuerrate.', cd: 30 },
    info: 'Hat alle Rechte. Nutzt sie auch.',
    bild: ['.A.A.A.A.', '.AAAAAAA.', '.TTTTTTT.', '.TGTTTGT.', '.TTTTTTT.', '.TTAAATT.', '.TTTTTTT.', '..T...T..', '.TT...TT.'] },
};
const HELD_MAX = 30;
const heldKosten = (lv) => Math.round(30 * Math.pow(1.22, lv - 1));

const TUERME = {
  pfeil: { n: 'Schütze', k: 40, atk: 9, rate: 1.6, rw: 2.6, ziele: ['boden', 'luft'], farbe: 'eisblau',
    info: 'Schnelle Einzelschüsse.', spez: 'Doppelschuss: trifft zwei Ziele.' },
  kanone: { n: 'Kanone', k: 70, atk: 24, rate: 0.55, rw: 2.3, fl: 0.9, ziele: ['boden'], farbe: 'aprikose',
    info: 'Flächenschaden, nur Bodenziele.', spez: 'Brand: der Boden brennt 2 s nach.' },
  frost: { n: 'Frost', k: 50, atk: 3, rate: 1.1, rw: 2.2, ziele: ['boden', 'luft'], farbe: 'lavendel',
    info: 'Verlangsamt um 50 %.', spez: 'Eisblock: 20 % Chance auf 1 s Stillstand.' },
  flak: { n: 'Flak', k: 60, atk: 15, rate: 1.8, rw: 3.0, ziele: ['luft'], farbe: 'eisblau',
    info: 'Holt Flieger vom Himmel, nur Luftziele.', spez: 'Splitter: Flächenschaden in der Luft.' },
  blitz: { n: 'Blitz', k: 90, atk: 13, rate: 0.8, rw: 2.4, kette: 3, ziele: ['boden', 'luft'], farbe: 'lavendel',
    info: 'Springt auf drei Ziele.', spez: 'Überspannung: springt auf fünf Ziele.' },
  laser: { n: 'Laser', k: 110, atk: 30, rate: 1, rw: 3.4, ziele: ['boden', 'luft'], farbe: 'lavendel',
    info: 'Dauerstrahl, Angriff pro Sekunde.', spez: 'Durchbohren: trifft alles auf der Linie.' },
  mine: { n: 'Goldmine', k: 60, atk: 0, rate: 0, rw: 0, gold: 15, ziele: [], farbe: 'aprikose',
    info: 'Bringt Gold nach jeder Welle.', spez: 'Zinsen: +5 % auf dein Gold je Welle.' },
};
const TURM_MAX = 5;

/* Gegner. art: boden | luft | tunnel | spezial | boss | ei */
const GEGNER = {
  bug: { n: 'Krabbler', art: 'boden', hp: 20, atk: 5, v: 0.8, gold: 4, gr: 0.32, ab: 1,
    faeh: 'Keine. Kommt in Massen.', info: 'Der gewöhnliche Bug. Steht in jedem Ticket.',
    bild: ['.T...T.', '..TTT..', 'TTTTTTT', '.TGTGT.', 'TTTTTTT', '.TTTTT.', 'T.....T'] },
  kaefer: { n: 'Panzerkäfer', art: 'boden', hp: 80, atk: 12, v: 0.45, gold: 10, gr: 0.42, ab: 4,
    faeh: 'Viel HP, langsam.', info: 'Lässt sich nicht hetzen. Auch nicht reparieren.',
    bild: ['..TTT..', '.TTTTT.', 'TTTATTT', 'TGTATGT', 'TTTATTT', '.TTTTT.', 'T.T.T.T'] },
  motte: { n: 'Motte', art: 'luft', hp: 14, atk: 4, v: 1.2, gold: 4, gr: 0.32, ab: 2,
    faeh: 'Fliegt: Kanone und Goldmine treffen sie nicht.', info: 'Der erste echte Bug der Geschichte war eine Motte. Sie ist stolz darauf.',
    bild: ['T.....T', 'TT...TT', 'TTTGTTT', 'ETTTTTE', 'EETTTEE', '.E.T.E.', '...T...'] },
  wurm: { n: 'Wurm', art: 'tunnel', hp: 26, atk: 6, v: 0.9, gold: 5, gr: 0.3, ab: 3,
    faeh: 'Gräbt sich immer wieder ein und ist dann nicht angreifbar.', info: 'Kommt durch jede Hintertür.',
    bild: ['..TTT..', '.TGTGT.', '.TTTTT.', '..TTT..', '.TTT...', 'TTT....', 'TT.....'] },
  virus: { n: 'Virus', art: 'spezial', hp: 28, atk: 5, v: 0.7, gold: 5, gr: 0.34, ab: 6,
    faeh: 'Teilt sich beim Besiegen in zwei Mini-Bugs.', info: 'Weiterleiten auf eigene Gefahr.',
    bild: ['A..A..A', '.AAAAA.', '.AGAGA.', 'AAAAAAA', '.AAAAA.', '.A.A.A.', 'A.....A'] },
  schild: { n: 'Schildwanze', art: 'spezial', hp: 34, atk: 7, v: 0.65, gold: 7, gr: 0.36, ab: 8,
    faeh: 'Trägt einen Schild mit 50 % Extra-HP.', info: 'Hat eine Firewall. Eine kleine.',
    bild: ['EEEEEEE', 'ETTTTTE', 'ETGTGTE', 'ETTTTTE', 'ETTTTTE', '.T...T.', 'T.....T'] },
  mini: { n: 'Mini-Bug', art: 'boden', hp: 8, atk: 2, v: 1.2, gold: 1, gr: 0.22, ab: 6,
    faeh: 'Schnell und klein.', info: 'Entsteht aus einem Virus. Fühlt sich unterschätzt.',
    bild: ['.T...T.', '..TTT..', '.TTTTT.', '.TGTGT.', '.TTTTT.', '..TTT..', '.T...T.'] },
  ente: { n: 'Gummiente', art: 'ei', hp: 1, atk: 0, v: 0.6, gold: 25, gr: 0.38, ab: 1,
    faeh: 'Taucht selten auf, watschelt weg, wenn man sie lässt. Droppt immer etwas.',
    info: 'Der beste Debugger der Welt. Hört zu, sagt nichts, quietscht manchmal.',
    bild: ['..AAA..', '.AAGAT.', '.AAAATT', '..AAA..', 'AAAAAA.', 'AAAAAA.', '.AAAA..'] },
  speicherleck: { n: 'Speicherleck', art: 'boss', hp: 320, atk: 20, v: 0.3, gold: 60, gr: 0.6, ab: 5, boss: true,
    faeh: 'Verliert alle 3 s einen Mini-Bug.', info: 'Wird mit der Zeit nicht kleiner. Nur alles andere voller.',
    bild: ['..AAAAA..', '.AAAAAAA.', 'AAGAAAGAA', 'AAAAAAAAA', 'AATTTTTAA', 'AAAAAAAAA', '.AAAAAAA.', '.A..A..A.', '.A.....A.'] },
  schleife: { n: 'Endlosschleife', art: 'luft', hp: 240, atk: 15, v: 0.5, gold: 60, gr: 0.55, ab: 5, boss: true,
    faeh: 'Fliegt in Schlangenlinien über das ganze Feld.', info: 'while (true) { nerven(); }',
    bild: ['...TTT...', '..T...T..', '.T.GTG.T.', 'T...T...T', '.T.....T.', '..TTATT..', '...T.T...', '..T...T..', '...TTT...'] },
  bluescreen: { n: 'Bluescreen', art: 'boss', hp: 620, atk: 35, v: 0.25, gold: 120, gr: 0.65, ab: 10, boss: true,
    faeh: 'Friert alle 7 s sämtliche Türme für 1,5 s ein.', info: 'Ein Problem ist aufgetreten. Es ist dieser Boss.',
    bild: ['EEEEEEEEE', 'ETTTTTTTE', 'ETGTTTGTE', 'ETTTTTTTE', 'ETTTTTTTE', 'ETTGGGTTE', 'EEEEEEEEE', '...TTT...', '.TTTTTTT.'] },
  kernel: { n: 'Kernel Panic', art: 'boss', hp: 900, atk: 50, v: 0.22, gold: 200, gr: 0.7, ab: 99, boss: true,
    faeh: 'Verliert Mini-Bugs und friert Türme ein. Nur im Härtetest.', info: 'Der Endgegner. Niemand weiß, wer ihn kompiliert hat.',
    bild: ['A.AAAAA.A', '.AAAAAAA.', 'AAGAAAGAA', 'AAAAAAAAA', 'AATATATAA', 'AAAAAAAAA', '.AAAAAAA.', 'A.A...A.A', 'A.......A'] },
};

/* Ausrüstung */
const SLOTS = {
  tastatur: { n: 'Tastatur', stat: 'Helden-Angriff', basis: 8, einh: '%',
    bild: ['.......', 'TTTTTTT', 'TGTGTGT', 'TTTTTTT', 'TGTTTGT', 'TTTTTTT', '.......'],
    namen: ['Folientastatur', 'Mechanische Tastatur', 'RGB-Tastatur', 'Tastatur mit Kapitälchen'] },
  maus: { n: 'Maus', stat: 'Helden-Feuerrate', basis: 6, einh: '%',
    bild: ['...T...', '..TTT..', '.TTATT.', '.TTTTT.', '.TTTTT.', '.TTTTT.', '..TTT..'],
    namen: ['Kugelmaus', 'Optische Maus', 'Gaming-Maus', 'Maus mit 42 Tasten'] },
  kopfhoerer: { n: 'Kopfhörer', stat: 'Turm-Angriff', basis: 6, einh: '%',
    bild: ['..TTT..', '.T...T.', 'T.....T', 'T.....T', 'TT...TT', 'TT...TT', '.......'],
    namen: ['Ohrstöpsel', 'Headset', 'Studio-Kopfhörer', 'Noise-Cancelling Deluxe'] },
  netzteil: { n: 'Netzteil', stat: 'Festung HP', basis: 20, einh: '',
    bild: ['.TTTTT.', '.T...T.', '.T.A.T.', '.T.A.T.', '.TTTTT.', '...T...', '..TTT..'],
    namen: ['Steckdosenleiste', 'Netzteil 300 W', 'Netzteil 850 W', 'USV mit Notstrom'] },
};
/* Sets: alle vier Plätze mit demselben Set = Set-Bonus (Schlüssel wie bei den Verbesserungen) */
const SETS = {
  buero: { n: 'Büro', t: 'Gold pro Bug +25 % und Erfahrung +15 %', boni: { gold: 25, xp: 15 } },
  gaming: { n: 'Gaming', t: 'Helden-Angriff +25 % und Helden-Feuerrate +15 %', boni: { hatk: 25, hrate: 15 } },
  server: { n: 'Server', t: 'Angriff aller Türme +20 % und Feuerrate aller Türme +10 %', boni: { tatk: 20, trate: 10 } },
  retro: { n: 'Retro', t: 'Max. HP der Festung +30 % und Selbstheilung 1 HP/s', boni: { hpmax: 30, regen: 1 } },
};
/* Zusatzbonus je Seltenheit: Selten bekommt den ersten, Episch die ersten zwei, Legendär alle drei */
const NEBEN = {
  tastatur: [{ k: 'krit', w: 3 }, { k: 'kritx', w: 30 }, { k: 'xp', w: 15 }],
  maus: [{ k: 'cd', w: 5 }, { k: 'krit', w: 4 }, { k: 'hrate', w: 10 }],
  kopfhoerer: [{ k: 'rw', w: 0.2 }, { k: 'trate', w: 8 }, { k: 'rabatt', w: 10 }],
  netzteil: [{ k: 'regen', w: 0.5 }, { k: 'dorn', w: 4 }, { k: 'hpmax', w: 10 }],
};
const FUSION_ANZAHL = 3;
const RAR = [
  { n: 'Gewöhnlich', m: 1, max: 10 },
  { n: 'Selten', m: 1.8, max: 20 },
  { n: 'Episch', m: 3, max: 30 },
  { n: 'Legendär', m: 5, max: 40 },
];

/* Erfahrung je besiegtem Gegner */
const EP = { bug: 1, kaefer: 3, motte: 1, wurm: 2, virus: 2, schild: 2, mini: 0.5, ente: 6, speicherleck: 15, schleife: 15, bluescreen: 25, kernel: 40 };
const epZiel = (stufe) => 6 + 4 * (stufe - 1);

/* Verbesserungen beim Aufstieg im Level. v = Wert je Seltenheit, Werte stapeln sich. */
const SELTEN = [
  { n: 'Gewöhnlich', w: 60 }, { n: 'Selten', w: 28 }, { n: 'Episch', w: 10 }, { n: 'Legendär', w: 2 },
];
const UPGRADES = [
  { id: 'hatk', n: 'Heldenmut', z: 'Helden-Angriff', v: [10, 18, 30, 50], e: '%' },
  { id: 'hrate', n: 'Schnellfeuer', z: 'Helden-Feuerrate', v: [8, 14, 24, 40], e: '%' },
  { id: 'krit', n: 'Glückstreffer', z: 'Krit.-Chance', v: [3, 6, 10, 16], e: '%', max: 60 },
  { id: 'kritx', n: 'Volltreffer', z: 'Krit.-Schaden (Basis 200 %)', v: [20, 40, 70, 120], e: '%' },
  { id: 'multi', n: 'Zweiter Lauf', z: 'Extra-Geschosse des Helden', v: [0, 0, 1, 1], e: '', minR: 2, max: 3 },
  { id: 'cd', n: 'Kurzer Draht', z: 'Abklingzeit der Spezialfähigkeit', v: [8, 14, 22, 35], e: '%', neg: true, max: 70 },
  { id: 'tatk', n: 'Schärfere Bits', z: 'Angriff aller Türme', v: [8, 14, 24, 40], e: '%' },
  { id: 'trate', n: 'Übertaktet', z: 'Feuerrate aller Türme', v: [6, 11, 18, 30], e: '%' },
  { id: 'rw', n: 'Weitblick', z: 'Reichweite aller Türme', v: [0.15, 0.3, 0.5, 0.8], e: '' },
  { id: 'rabatt', n: 'Großeinkauf', z: 'Rabatt auf Bauen und Ausbauen', v: [5, 8, 12, 18], e: '%', neg: true, max: 50 },
  { id: 'gold', n: 'Kopfgeld', z: 'Gold pro Bug', v: [10, 18, 30, 50], e: '%' },
  { id: 'xp', n: 'Lernkurve', z: 'Erfahrung pro Bug', v: [10, 18, 30, 50], e: '%' },
  { id: 'hpmax', n: 'Neues Netzteil', z: 'Max. HP der Festung', v: [10, 18, 30, 50], e: '%' },
  { id: 'regen', n: 'Selbstheilung', z: 'Festung heilt HP pro Sekunde', v: [0.5, 1, 1.8, 3], e: '' },
  { id: 'dorn', n: 'Stromzaun', z: 'Schaden/s an Bugs an der Mauer', v: [3, 6, 10, 18], e: '' },
  { id: 'heal', n: 'Reparatur', z: 'Festung sofort heilen (% der max. HP)', v: [20, 35, 55, 100], e: '%', einmal: true },
  { id: 'spende', n: 'Spende', z: 'Gold sofort', v: [40, 80, 140, 250], e: '', einmal: true },
];
/* Für wen gilt eine Verbesserung (Etikett auf der Karte) */
const FUER = { hatk: 'HELD', hrate: 'HELD', krit: 'HELD', kritx: 'HELD', multi: 'HELD', cd: 'HELD',
  tatk: 'ALLE TÜRME', trate: 'ALLE TÜRME', rw: 'ALLE TÜRME', rabatt: 'TÜRME',
  gold: 'GOLD', xp: 'ERFAHRUNG', spende: 'GOLD', hpmax: 'FESTUNG', regen: 'FESTUNG', dorn: 'FESTUNG', heal: 'FESTUNG' };
/* Karten für Turmarten, die im Level gebaut wurden ({t} = Turmname) */
const TURM_ATK = { n: '{t}-Training', z: 'Angriff aller {t}-Türme', v: [15, 25, 40, 65], e: '%' };
const TURM_EXTRA = {
  pfeil: { n: 'Giftpfeile', z: 'Gift: Schaden/s für 3 s (% vom Angriff)', v: [0, 0, 40, 70], e: '%' },
  kanone: { n: 'Splitterbombe', z: 'Explosionsradius', v: [0, 0, 0.3, 0.5], e: '' },
  frost: { n: 'Kältewelle', z: 'Zusätzliche Verlangsamung', v: [0, 0, 10, 20], e: '%', max: 35 },
  flak: { n: 'Radar', z: 'Reichweite der Flak', v: [0, 0, 0.6, 1], e: '' },
  blitz: { n: 'Überladung', z: 'Zusätzliche Sprünge', v: [0, 0, 1, 2], e: '' },
  laser: { n: 'Brennglas', z: 'Brand: Schaden/s für 3 s (% vom Angriff)', v: [0, 0, 25, 45], e: '%' },
  mine: { n: 'Goldader', z: 'Gold je Welle pro Mine', v: [0, 0, 10, 20], e: '' },
};

/* Tägliche Aufgaben (id = Statistik-Schlüssel) */
const AUFGABEN = [
  { id: 'kills', t: '{z} Bugs besiegen', z: [120, 220], b: 50 },
  { id: 'siege', t: '{z} Level schaffen', z: [2, 3], b: 60 },
  { id: 'gebaut', t: '{z} Türme bauen', z: [15, 30], b: 40 },
  { id: 'faehig', t: 'Spezialfähigkeit {z}-mal einsetzen', z: [5, 10], b: 40 },
  { id: 'bosse', t: '{z} Bosse besiegen', z: [2, 4], b: 60 },
  { id: 'kills_luft', t: '{z} Flieger besiegen', z: [30, 60], b: 50 },
  { id: 'ausgebaut', t: 'Türme {z}-mal ausbauen', z: [10, 20], b: 40 },
  { id: 'wellen', t: '{z} Wellen überstehen', z: [15, 30], b: 50 },
];

/* Meilensteine: Stufen [Ziel, Belohnung]; item = Seltenheit */
const MEILEN = [
  { id: 'kills', n: 'Kammerjäger', t: 'Bugs besiegen', s: [[100, { bits: 50 }], [1000, { bits: 200 }], [5000, { item: 2 }], [20000, { item: 3 }]] },
  { id: 'siege', n: 'Fortschritt', t: 'Level schaffen', s: [[5, { bits: 80 }], [15, { bits: 250 }], [30, { item: 2 }], [60, { item: 3 }]] },
  { id: 'bosse', n: 'Bossjäger', t: 'Bosse besiegen', s: [[3, { bits: 60 }], [15, { bits: 250 }], [40, { item: 2 }], [100, { item: 3 }]] },
  { id: 'sterne', n: 'Sternensammler', t: 'Sterne sammeln', s: [[15, { bits: 100 }], [45, { bits: 300 }], [90, { item: 3 }]] },
  { id: 'gebaut', n: 'Baumeister', t: 'Türme bauen', s: [[25, { bits: 40 }], [150, { bits: 150 }], [600, { item: 1 }], [2000, { item: 2 }]] },
  { id: 'kills_luft', n: 'Fliegenklatsche', t: 'Flieger besiegen', s: [[50, { bits: 40 }], [500, { bits: 200 }], [2000, { item: 2 }]] },
  { id: 'enten', n: 'Entenflüsterer', t: 'Gummienten besiegen', s: [[1, { bits: 50 }], [5, { item: 1 }], [15, { item: 2 }], [40, { item: 3 }]] },
  { id: 'itemauf', n: 'Schrauber', t: 'Ausrüstung verbessern', s: [[10, { bits: 60 }], [50, { bits: 250 }], [200, { item: 2 }]] },
  { id: 'aufgaben', n: 'Pflichtbewusst', t: 'Tägliche Aufgaben erledigen', s: [[5, { bits: 60 }], [30, { bits: 250 }], [100, { item: 3 }]] },
];

/* Erfolge (einmalig) */
const ERFOLGE = [
  { id: 'erster', n: 'Hallo Welt', t: 'Das erste Level schaffen.', b: 20 },
  { id: 'fehlerfrei', n: 'Fehlerfrei kompiliert', t: 'Ein Level ohne Schaden an der Festung schaffen.', b: 80 },
  { id: 'sparfuchs', n: 'Sparfuchs', t: 'Ein Level mit höchstens drei Türmen schaffen.', b: 80 },
  { id: 'handbetrieb', n: 'Handbetrieb', t: 'Ein Level ohne Spezialfähigkeit schaffen.', b: 50 },
  { id: 'ente', n: 'Quietschfidel', t: 'Eine Gummiente besiegen.', b: 50 },
  { id: 'stufe5', n: 'Voll ausgebaut', t: 'Einen Turm auf Stufe 5 bringen.', b: 40 },
  { id: 'zeitraffer', n: 'Zeitraffer', t: 'Ein Level auf dreifacher Geschwindigkeit schaffen.', b: 40 },
  { id: 'g42', n: 'Die Antwort', t: 'Eine Welle mit genau 42 Gold beenden.', b: 42 },
  { id: 'voll', n: 'Gut gerüstet', t: 'Alle vier Ausrüstungsplätze belegen.', b: 60 },
  { id: 'fusion', n: 'Verschmolzen', t: 'Zum ersten Mal Ausrüstung fusionieren.', b: 40 },
  { id: 'set', n: 'Komplett im Set', t: 'Vier Teile desselben Sets anlegen.', b: 120 },
  { id: 'legendaer', n: 'Legendär', t: 'Ein legendäres Ausrüstungsteil finden.', b: 150 },
  { id: 'alleh', n: 'Vollzählig', t: 'Alle Helden freischalten.', b: 300 },
  { id: 'b11', n: '1011₂', t: 'Im Härtetest Welle 11 erreichen.', b: 110 },
  { id: 'haerte', n: 'Härtetest bestanden', t: 'Einen Härtetest schaffen.', b: 200 },
  { id: 'befoerdert', n: 'Befördert', t: 'Spielerstufe 10 erreichen.', b: 150 },
  { id: 'kapitel', n: 'Durchgespielt', t: 'Level 30 schaffen.', b: 500 },
];

/* Statistik: Schlüssel und Beschriftung */
const STATS = [
  ['kills', 'Bugs besiegt'], ['bosse', 'Bosse besiegt'], ['kills_luft', 'Flieger besiegt'], ['enten', 'Gummienten besiegt'],
  ['siege', 'Level geschafft'], ['niederlagen', 'Level verloren'], ['wellen', 'Wellen überstanden'], ['hf', 'Härtetests geschafft'],
  ['gebaut', 'Türme gebaut'], ['ausgebaut', 'Türme ausgebaut'], ['verkauft', 'Türme verkauft'], ['gold', 'Gold verdient'],
  ['dmg_held', 'Schaden durch Helden'], ['dmg_turm', 'Schaden durch Türme'], ['krit', 'Kritische Treffer'], ['faehig', 'Fähigkeiten eingesetzt'],
  ['bits_ein', 'Bits verdient'], ['bits_aus', 'Bits ausgegeben'], ['items', 'Ausrüstung gefunden'], ['itemauf', 'Ausrüstung verbessert'],
  ['zerlegt', 'Ausrüstung zerlegt'], ['fusionen', 'Fusionen'], ['aufgaben', 'Tägliche Aufgaben erledigt'], ['zeit', 'Spielzeit'],
];

/* Spielerstufe (Konto): Erfahrung aus allem, was man tut. Jede Stufe bringt Bits, manche schalten etwas frei. */
const KONTO_EP = { kills: 1, wellen: 5, bosse: 25, siege: 40, aufgaben: 30, fusionen: 10, enten: 20 };
const kontoZiel = (st) => Math.round(150 * Math.pow(1.15, st - 1));
const kontoBits = (st) => 40 + st * 10;
const RAENGE = [[1, 'Praktikant:in'], [5, 'Junior-Dev'], [10, 'Entwickler:in'], [15, 'Senior-Dev'], [20, 'Architekt:in'], [30, 'CTO'], [40, 'Legende']];
const TURM_START = ['pfeil', 'kanone'];
const KONTO = {
  2: { turm: 'frost' }, 3: { turm: 'flak' }, 4: { turm: 'mine' }, 5: { startgold: 20 }, 6: { turm: 'blitz' }, 7: { kaffee: 1 },
  8: { turm: 'laser' }, 9: { item: 1 }, 10: { karten: 1 }, 11: { bitsPlus: 10 }, 12: { reroll: 1 }, 13: { item: 1 }, 14: { startgold: 30 },
  15: { item: 2 }, 16: { festung: 10 }, 17: { bitsPlus: 10 }, 18: { startgold: 30 }, 19: { item: 2 }, 20: { kaffee: 1, item: 3 },
  22: { festung: 10 }, 24: { reroll: 1 }, 25: { item: 3 }, 27: { bitsPlus: 15 }, 30: { aufstieg: 1, item: 3 }, 35: { festung: 15 }, 40: { item: 3, bitsPlus: 15 },
};

/* Skill-Bücher: je ein offensives und ein defensives Buch pro Level. Werte je Seltenheit [Gewöhnlich, Selten, Episch, Legendär].
   Reichweite 20 = ganze Karte. Aufwerten kostet Bits: Preis x BUCH_AUF[r]. */
const bp = (v) => (v > 0 ? '+' : '') + String(v).replace('.', ',');
const BUECHER = {
  scharf: { art: 'off', n: 'Scharfschützen-Handbuch', turm: 'pfeil', preis: 300, v: { rate: [-25, -15, -5, 0], atk: [0, 0, 10, 25] },
    t: (r, v) => `Schütze: Reichweite über die ganze Karte${v.rate[r] ? ', Feuerrate ' + bp(v.rate[r]) + ' %' : ''}${v.atk[r] ? ', Angriff ' + bp(v.atk[r]) + ' %' : ''}.` },
  radar: { art: 'off', n: 'Radar-Lehrbuch', turm: 'flak', preis: 400, v: { atk: [0, 10, 25, 50] },
    t: (r, v) => `Flak: Reichweite über die ganze Karte${v.atk[r] ? ', Angriff ' + bp(v.atk[r]) + ' %' : ''}.` },
  orbital: { art: 'off', n: 'Orbit-Laser für Anfänger', turm: 'laser', preis: 800, v: { atk: [-20, -10, 0, 15] },
    t: (r, v) => `Laser: Reichweite über die ganze Karte${v.atk[r] ? ', Angriff ' + bp(v.atk[r]) + ' %' : ''}.` },
  artillerie: { art: 'off', n: 'Artillerie-Fibel', turm: 'kanone', preis: 450, v: { rw: [2, 3, 4, 5], fl: [0.2, 0.3, 0.4, 0.6], rate: [-20, -15, -10, 0] },
    t: (r, v) => `Kanone: Reichweite ${bp(v.rw[r])}, Explosionsradius ${bp(v.fl[r])}${v.rate[r] ? ', Feuerrate ' + bp(v.rate[r]) + ' %' : ''}.` },
  eiszeit: { art: 'off', n: 'Eiszeit-Almanach', turm: 'frost', preis: 350, v: { rw: [0.5, 1, 1.5, 2], fl: [0.7, 1, 1.3, 1.6] },
    t: (r, v) => `Frost: Reichweite ${bp(v.rw[r])}, Treffer verlangsamen alle Bugs im Umkreis von ${bp(v.fl[r]).slice(1)}.` },
  tesla: { art: 'off', n: 'Tesla-Tagebuch', turm: 'blitz', preis: 600, v: { spr: [1, 2, 3, 4], weite: [2.3, 2.8, 3.2, 3.6] },
    t: (r, v) => `Blitz: ${bp(v.spr[r])} Sprünge, Sprungweite ${String(v.weite[r]).replace('.', ',')}.` },
  zinseszins: { art: 'def', n: 'Zinseszins für Dummies', turm: 'mine', preis: 500, v: { gold: [30, 50, 75, 100] },
    t: (r, v) => `Goldmine: ${bp(v.gold[r])} % Gold je Welle.` },
  katalog: { art: 'def', n: 'Großhändler-Katalog', preis: 350, sym: 'sym_gold', v: { rabatt: [5, 10, 15, 20] },
    t: (r, v) => `Türme bauen und ausbauen ${v.rabatt[r]} % günstiger.` },
  bollwerk: { art: 'def', n: 'Bauplan Bollwerk', preis: 400, sym: 'sym_hp', v: { hp: [10, 20, 30, 45] },
    t: (r, v) => `Festung ${bp(v.hp[r])} % max. HP.` },
  kochbuch: { art: 'def', n: 'Kaffee-Kochbuch', preis: 300, sym: 'sym_kaffee', v: { tasse: [1, 1, 2, 2], heil: [25, 30, 35, 45] },
    t: (r, v) => `Kaffee-Vorrat ${bp(v.tasse[r])}, eine Tasse heilt ${v.heil[r]} %.` },
  startkapital: { art: 'def', n: 'Startkapital-Ratgeber', preis: 300, sym: 'sym_gold', v: { gold: [40, 70, 100, 150] },
    t: (r, v) => `Start-Gold ${bp(v.gold[r])}.` },
  wartung: { art: 'def', n: 'Wartungsheft', preis: 450, sym: 'sym_hp', v: { regen: [0.5, 1, 1.5, 2.5] },
    t: (r, v) => `Festung heilt ${String(v.regen[r]).replace('.', ',')} HP pro Sekunde.` },
};
const BUCH_AUF = [1.5, 3, 6];
const buchText = (id, r) => BUECHER[id].t(r, BUECHER[id].v);
const GANZE_KARTE = 20;
const ARTN = { off: 'Offensiv', def: 'Defensiv' };
