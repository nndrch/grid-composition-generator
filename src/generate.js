import state from './state.js';
import { computeTrackSizes } from './grid.js';
import { smoothNoise, noiseWeightedPick } from './noise.js';
import { resolveSource, applyFlipStep } from './symmetry.js';
import { filterByGrammar } from './grammar.js';

export function generate() {
  if (state.modules.length === 0) return;
  state._noiseSeed = Math.random() * 10000;

  const totalW = state.aspectWidth  * 100;
  const totalH = state.aspectHeight * 100;

  state._colSizes = computeTrackSizes(
    state.cols, state.colWaveform, state.colMaxWeight, state.colPeak, totalW
  );
  state._rowSizes = computeTrackSizes(
    state.rows, state.rowWaveform, state.rowMaxWeight, state.rowPeak, totalH
  );

  const sourceCols = (state.symmetry === 'mirrorX' || state.symmetry === 'fourFold')
    ? Math.ceil(state.cols / 2) : state.cols;
  const sourceRows = (state.symmetry === 'mirrorY' || state.symmetry === 'fourFold')
    ? Math.ceil(state.rows / 2) : state.rows;

  const sourceCells = {};
  for (let row = 0; row < sourceRows; row++) {
    let prevMod = null;
    for (let col = 0; col < sourceCols; col++) {
      const n = smoothNoise(
        col * state.noiseScale,
        row * state.noiseScale,
        state._noiseSeed
      );
      const candidates = filterByGrammar(state.modules, prevMod, state);
      const mod = noiseWeightedPick(candidates, n);
      const step = state.rotationEnabled ? Math.floor(Math.random() * 4) : 0;
      sourceCells[`${col},${row}`] = { mod, step };
      prevMod = mod;
    }
  }

  state._grid = [];
  for (let row = 0; row < state.rows; row++) {
    const rowArr = [];
    for (let col = 0; col < state.cols; col++) {
      const { sourceCol, sourceRow, flipX, flipY } = resolveSource(col, row, state);
      const { mod, step } = sourceCells[`${sourceCol},${sourceRow}`];
      rowArr.push({ mod, step: applyFlipStep(step, flipX, flipY) });
    }
    state._grid.push(rowArr);
  }
}
