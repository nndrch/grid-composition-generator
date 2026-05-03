import state from '../state.js';
import { computeTrackSizes } from '../grid.js';
import { createNumericInput } from './numeric-input.js';

let _onGenerate = () => {};
let _onRender   = () => {};

// ── Waveform preview strip ────────────────────────────────────────────────────

function buildStrip(getSizes) {
  const strip = document.createElement('div');
  strip.className = 'waveform-strip';

  const refresh = () => {
    strip.innerHTML = '';
    const sizes = getSizes();
    if (!sizes.length) return;
    const total = sizes.reduce((s, v) => s + v, 0);
    for (const size of sizes) {
      const bar = document.createElement('div');
      bar.className = 'waveform-bar';
      bar.style.width = `${(size / total) * 100}%`;
      strip.appendChild(bar);
    }
  };

  refresh();
  return { el: strip, refresh };
}

// ── Single axis block (Columns or Rows) ───────────────────────────────────────

function buildAxisBlock(label, axis) {
  const isCol = axis === 'col';
  const getCount     = () => isCol ? state.cols          : state.rows;
  const getWaveform  = () => isCol ? state.colWaveform   : state.rowWaveform;
  const getMinWeight = () => isCol ? state.colMinWeight  : state.rowMinWeight;
  const getMaxWeight = () => isCol ? state.colMaxWeight  : state.rowMaxWeight;
  const getPeak      = () => isCol ? state.colPeak       : state.rowPeak;
  const getTotalUnits = () => (isCol ? state.aspectWidth : state.aspectHeight) * 100;

  const recomputeSizes = () => {
    const sizes = computeTrackSizes(getCount(), getWaveform(), getMinWeight(), getMaxWeight(), getPeak(), getTotalUnits());
    if (isCol) state._colSizes = sizes; else state._rowSizes = sizes;
    return sizes;
  };

  const block = document.createElement('div');
  block.className = 'axis-block';

  const title = document.createElement('div');
  title.className = 'axis-title';
  title.textContent = label;
  block.appendChild(title);

  // Count
  const count = createNumericInput({
    label: 'Count', min: 1, max: 24, step: 1, value: getCount(),
    onChange: v => {
      if (isCol) state.cols = v; else state.rows = v;
      _onGenerate();
      stripAPI.refresh();
    },
  });
  block.appendChild(count.el);

  // Distribution select
  const distRow = document.createElement('div');
  distRow.className = 'select-row';
  const distLbl = document.createElement('span');
  distLbl.className = 'select-label';
  distLbl.textContent = 'Distribution';
  const distSel = document.createElement('select');
  [['locked', 'Locked'], ['sawtooth', 'Sawtooth'], ['sine', 'Sine']].forEach(([val, txt]) => {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = txt;
    if (val === getWaveform()) opt.selected = true;
    distSel.appendChild(opt);
  });
  distRow.appendChild(distLbl);
  distRow.appendChild(distSel);
  block.appendChild(distRow);

  // Min / Max / Peak
  const minInput = createNumericInput({
    label: 'Min weight', min: 1, max: 10, step: 1, value: getMinWeight(),
    disabled: getWaveform() === 'locked',
    onChange: v => {
      if (isCol) state.colMinWeight = v; else state.rowMinWeight = v;
      recomputeSizes(); _onRender(); stripAPI.refresh();
    },
  });

  const maxInput = createNumericInput({
    label: 'Max weight', min: 1, max: 10, step: 1, value: getMaxWeight(),
    onChange: v => {
      if (isCol) state.colMaxWeight = v; else state.rowMaxWeight = v;
      recomputeSizes(); _onRender(); stripAPI.refresh();
    },
  });

  const peakInput = createNumericInput({
    label: 'Peak', min: 0, max: 1, step: 0.01, value: getPeak(),
    disabled: getWaveform() === 'locked',
    onChange: v => {
      if (isCol) state.colPeak = v; else state.rowPeak = v;
      recomputeSizes(); _onRender(); stripAPI.refresh();
    },
  });

  block.appendChild(minInput.el);
  block.appendChild(maxInput.el);
  block.appendChild(peakInput.el);

  distSel.addEventListener('change', () => {
    const wf = distSel.value;
    if (isCol) state.colWaveform = wf; else state.rowWaveform = wf;
    const locked = wf === 'locked';
    minInput.setDisabled(locked);
    peakInput.setDisabled(locked);
    recomputeSizes(); _onRender(); stripAPI.refresh();
  });

  // Preview strip
  const stripAPI = buildStrip(() => {
    recomputeSizes();
    return isCol ? state._colSizes : state._rowSizes;
  });
  block.appendChild(stripAPI.el);

  const refresh = () => {
    count.setValue(getCount());
    distSel.value = getWaveform();
    minInput.setValue(getMinWeight());
    maxInput.setValue(getMaxWeight());
    peakInput.setValue(getPeak());
    const locked = getWaveform() === 'locked';
    minInput.setDisabled(locked);
    peakInput.setDisabled(locked);
    recomputeSizes();
    stripAPI.refresh();
  };

  return { el: block, refresh };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initGridControls(sectionEl, { onGenerate, onRender }) {
  _onGenerate = onGenerate;
  _onRender   = onRender;

  const content = document.createElement('div');
  content.className = 'section-content';

  const colBlock = buildAxisBlock('Columns', 'col');
  const rowBlock = buildAxisBlock('Rows', 'row');
  content.appendChild(colBlock.el);
  content.appendChild(rowBlock.el);

  sectionEl.appendChild(content);

  return {
    refresh() { colBlock.refresh(); rowBlock.refresh(); },
  };
}
