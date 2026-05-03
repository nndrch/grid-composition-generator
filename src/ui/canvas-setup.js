import state from '../state.js';
import { computeTrackSizes } from '../grid.js';
import { render } from '../render.js';

const PRESETS = [
  { label: '1:1',  w: 1,  h: 1  },
  { label: '4:3',  w: 4,  h: 3  },
  { label: '3:2',  w: 3,  h: 2  },
  { label: '16:9', w: 16, h: 9  },
  { label: '2:3',  w: 2,  h: 3  },
  { label: '9:16', w: 9,  h: 16 },
];

let _wInput, _hInput, _gridCheck;

function recomputeAndRender() {
  const totalW = state.aspectWidth  * 100;
  const totalH = state.aspectHeight * 100;
  state._colSizes = computeTrackSizes(state.cols, state.colWaveform, state.colMaxWeight, state.colPeak, totalW);
  state._rowSizes = computeTrackSizes(state.rows, state.rowWaveform, state.rowMaxWeight, state.rowPeak, totalH);
  render();
}

export function initCanvasSetup(sectionEl) {
  const content = document.createElement('div');
  content.className = 'section-content';

  // Aspect ratio label
  const arLabel = document.createElement('div');
  arLabel.className = 'control-label';
  arLabel.textContent = 'Aspect ratio';
  content.appendChild(arLabel);

  // W / H inputs
  const arRow = document.createElement('div');
  arRow.className = 'ar-row';

  const makeArInput = (lbl, getVal, setVal) => {
    const wrap = document.createElement('label');
    wrap.className = 'ar-input-wrap';
    const span = document.createElement('span');
    span.textContent = lbl;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = 1; inp.step = 1;
    inp.value = getVal();
    inp.className = 'ar-input';
    inp.addEventListener('change', () => {
      const v = Math.max(1, parseInt(inp.value) || 1);
      inp.value = v;
      setVal(v);
      recomputeAndRender();
    });
    wrap.appendChild(span);
    wrap.appendChild(inp);
    return { wrap, inp };
  };

  const w = makeArInput('W', () => state.aspectWidth,  v => { state.aspectWidth  = v; });
  const h = makeArInput('H', () => state.aspectHeight, v => { state.aspectHeight = v; });
  _wInput = w.inp; _hInput = h.inp;
  arRow.appendChild(w.wrap);
  arRow.appendChild(h.wrap);
  content.appendChild(arRow);

  // Preset buttons
  const presetsRow = document.createElement('div');
  presetsRow.className = 'presets-row';
  for (const p of PRESETS) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = p.label;
    btn.addEventListener('click', () => {
      state.aspectWidth  = p.w; state.aspectHeight = p.h;
      _wInput.value = p.w;     _hInput.value = p.h;
      recomputeAndRender();
    });
    presetsRow.appendChild(btn);
  }
  content.appendChild(presetsRow);

  // Show grid toggle
  const gridRow = document.createElement('label');
  gridRow.className = 'checkbox-row';
  _gridCheck = document.createElement('input');
  _gridCheck.type = 'checkbox';
  _gridCheck.checked = state.showGrid;
  _gridCheck.addEventListener('change', () => {
    state.showGrid = _gridCheck.checked;
    render();
  });
  gridRow.appendChild(_gridCheck);
  gridRow.appendChild(document.createTextNode(' Show grid'));
  content.appendChild(gridRow);

  sectionEl.appendChild(content);

  return {
    refresh() {
      _wInput.value  = state.aspectWidth;
      _hInput.value  = state.aspectHeight;
      _gridCheck.checked = state.showGrid;
    },
  };
}
