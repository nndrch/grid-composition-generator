import state from '../state.js';
import { computeTrackSizes } from '../grid.js';
import { render } from '../render.js';

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

  // Swap button
  const swapBtn = document.createElement('button');
  swapBtn.type = 'button';
  swapBtn.className = 'ar-swap-btn';
  swapBtn.setAttribute('aria-label', 'Swap width and height');
  swapBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
         stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 7h13M7 7l4-4M7 7l4 4"/>
      <path d="M17 17H4M17 17l-4-4M17 17l-4 4"/>
    </svg>
  `;
  swapBtn.addEventListener('click', () => {
    const oldW = state.aspectWidth;
    state.aspectWidth = state.aspectHeight;
    state.aspectHeight = oldW;
    _wInput.value = state.aspectWidth;
    _hInput.value = state.aspectHeight;
    recomputeAndRender();
  });

  arRow.appendChild(w.wrap);
  arRow.appendChild(swapBtn);
  arRow.appendChild(h.wrap);
  content.appendChild(arRow);

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
