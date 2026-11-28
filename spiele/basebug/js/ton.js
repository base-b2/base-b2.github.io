/* BaseBug | Töne (selbst erzeugt, keine Dateien) und Vibration. Bewusst sparsam: nur bei wichtigen Ereignissen. */
'use strict';
let AC = null, letzterTon = {};
function ton(art) {
  if (!SP.opt.ton) return;
  const jetzt = performance.now(); if (letzterTon[art] && jetzt - letzterTon[art] < 120) return; letzterTon[art] = jetzt;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const folgen = {
      klick: [[660, 0.04]], bau: [[440, 0.05], [660, 0.06]], muenze: [[880, 0.04], [1320, 0.06]],
      drop: [[523, 0.07], [659, 0.07], [784, 0.1]], welle: [[330, 0.08], [440, 0.1]],
      boss: [[110, 0.25], [92, 0.3]], faehig: [[392, 0.06], [523, 0.06], [784, 0.12]],
      treffer: [[140, 0.06]], sieg: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2]],
      niederlage: [[392, 0.15], [330, 0.15], [262, 0.3]], quak: [[700, 0.05], [520, 0.09]],
    }[art] || [[440, 0.05]];
    let t = AC.currentTime;
    for (const [f, d] of folgen) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = art === 'boss' || art === 'treffer' ? 'sawtooth' : 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); t += d * 0.9;
    }
  } catch (e) {}
}
let letzteVib = 0;
function vib(ms) {
  if (!SP.opt.vib || !navigator.vibrate) return;
  const j = performance.now(); if (j - letzteVib < 800) return; letzteVib = j;
  try { navigator.vibrate(ms); } catch (e) {}
}
