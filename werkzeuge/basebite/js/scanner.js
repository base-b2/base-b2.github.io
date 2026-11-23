/* BaseBite | Barcode-Scan mit der Kamera
   1. BarcodeDetector-API (Chrome auf Android), 2. Fallback ZXing (selbst gehostet in vendor/). Das Kamerabild verlässt das Gerät nie. */

const FORMATE = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
let aktiv = null;

async function hatDetector() {
  if (!('BarcodeDetector' in window)) return false;
  try {
    const f = await window.BarcodeDetector.getSupportedFormats();
    return FORMATE.some((x) => f.includes(x));
  } catch (e) { return false; }
}

function ladeZxing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  return new Promise((ok, fehler) => {
    const s = document.createElement('script');
    s.src = 'vendor/zxing.min.js';
    s.onload = () => ok(window.ZXing);
    s.onerror = () => fehler(new Error('ZXing konnte nicht geladen werden.'));
    document.head.appendChild(s);
  });
}

const pruefzifferOk = (code) => {
  if (!/^\d{8}$|^\d{12,13}$/.test(code)) return false;
  const z = code.padStart(13, '0').split('').map(Number);
  const s = z.slice(0, 12).reduce((a, d, i) => a + d * (i % 2 ? 3 : 1), 0);
  return (10 - (s % 10)) % 10 === z[12];
};
export { pruefzifferOk };

/** Startet den Scan im übergebenen <video>. Ruft treffer(code) einmal auf. */
export async function starte(video, treffer) {
  stoppe();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('keine-kamera');
  const zustand = { stopp: false, stream: null, reader: null };
  aktiv = zustand;
  const fertig = (code) => {
    if (zustand.stopp) return;
    if (!pruefzifferOk(code)) return;   // halbe Lesungen ignorieren
    stoppe();
    if (navigator.vibrate) navigator.vibrate(60);
    treffer(code);
  };
  if (await hatDetector()) {
    zustand.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
    video.srcObject = zustand.stream;
    await video.play();
    const det = new window.BarcodeDetector({ formats: FORMATE });
    const schleife = async () => {
      if (zustand.stopp) return;
      try {
        if (video.readyState >= 2) {
          const r = await det.detect(video);
          if (r.length) { fertig(r[0].rawValue); return; }
        }
      } catch (e) { /* einzelnes Bild nicht lesbar */ }
      setTimeout(schleife, 180);
    };
    schleife();
    return 'BarcodeDetector';
  }
  const ZXing = await ladeZxing();
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
  zustand.reader = new ZXing.BrowserMultiFormatReader(hints, 250);
  await zustand.reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, video, (r) => {
    if (r) fertig(r.getText());
  });
  return 'ZXing';
}

export function stoppe() {
  if (!aktiv) return;
  aktiv.stopp = true;
  if (aktiv.reader) { try { aktiv.reader.reset(); } catch (e) { /* schon gestoppt */ } }
  if (aktiv.stream) aktiv.stream.getTracks().forEach((t) => t.stop());
  aktiv = null;
}
