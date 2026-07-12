import state from './state.js';

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const randInt  = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const randFloat = (lo, hi, dp = 2) => parseFloat((Math.random() * (hi - lo) + lo).toFixed(dp));
const randPick  = arr => arr[Math.floor(Math.random() * arr.length)];

export function randomizeAll() {
  const WAVEFORMS = ['locked', 'unlocked'];
  const SYMMETRIES = ['none', 'mirrorX', 'mirrorY', 'fourFold'];

  // Grid counts
  state.cols = randInt(3, 16);
  state.rows = randInt(3, 16);

  // Column waveform
  state.colWaveform  = randPick(WAVEFORMS);
  state.colMaxWeight = randInt(2, 30);
  state.colPeak      = randFloat(0.1, 0.9);

  // Row waveform
  state.rowWaveform  = randPick(WAVEFORMS);
  state.rowMaxWeight = randInt(2, 30);
  state.rowPeak      = randFloat(0.1, 0.9);

  // Generation params
  state.noiseScale      = randFloat(0.10, 1.50);
  state.symmetry        = randPick(SYMMETRIES);
  state.rotationEnabled = Math.random() < 0.5;
  state.grammarEnabled  = Math.random() < 0.5;

  // Grammar matrix
  if (state.grammarEnabled) {
    state.grammar = {};
    for (const from of state.modules) {
      state.grammar[from.id] = state.modules
        .filter(() => Math.random() < 0.6)
        .map(m => m.id);
    }
  }

  // Module weights
  for (const mod of state.modules) {
    mod.weight = randInt(1, 10);
  }

  // Palette-based color randomisation (PRD §8)
  const H = randInt(0, 360);
  const S = randInt(30, 80);
  const palette = [
    hslToHex(H, S, 12),
    hslToHex(H, S, 50),
    hslToHex(H, S, 88),
  ];
  const NEUTRALS = ['#ffffff', '#111111'];
  for (let i = 0; i < palette.length; i++) {
    if (Math.random() < 0.3) palette[i] = randPick(NEUTRALS);
  }

  for (const mod of state.modules) {
    // Never override null state — Ø toggle is preserved (PRD §8)
    const pick = () => palette[randInt(0, palette.length - 1)];
    if (mod.fgColor !== null)     mod.fgColor     = pick();
    if (mod.bgColor !== null)     mod.bgColor     = pick();
    if (mod.strokeColor !== null) mod.strokeColor = pick();
  }
}
