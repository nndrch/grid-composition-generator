import state from './state.js';
import { getShape } from './shapes/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function render() {
  const svg = document.getElementById('canvas-svg');
  const vw = state.aspectWidth  * 100;
  const vh = state.aspectHeight * 100;

  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  svg.style.aspectRatio = `${state.aspectWidth} / ${state.aspectHeight}`;

  renderCells();
  renderGridOverlay(vw, vh);
}

function renderCells() {
  const cells = document.getElementById('cells');
  cells.innerHTML = '';
  if (!state._grid) return;

  const frag = document.createDocumentFragment();
  let y = 0;
  for (let row = 0; row < state.rows; row++) {
    const h = state._rowSizes[row];
    let x = 0;
    for (let col = 0; col < state.cols; col++) {
      const w = state._colSizes[col];
      const { mod, step } = state._grid[row][col];
      frag.appendChild(buildCell(mod, step, x, y, w, h));
      x += w;
    }
    y += h;
  }
  cells.appendChild(frag);
}

function buildCell(mod, step, x, y, w, h) {
  const g = el('g', {
    class: 'cell',
    transform: `translate(${x},${y})`,
    'data-module-id': mod.id,
  });

  if (mod.bgColor !== null) {
    g.appendChild(el('rect', {
      class: 'cell-bg',
      width: w,
      height: h,
      fill: mod.bgColor,
    }));
  }

  const shape = getShape(mod.shapeId);
  if (shape) {
    if (shape.type === 'builtin') {
      g.appendChild(el('path', {
        class: 'cell-shape-path',
        d: shape.pathFn(w, h, step),
        fill: mod.fgColor ?? 'none',
        stroke: mod.strokeColor ?? 'none',
        'stroke-width': mod.strokeWeight,
        'vector-effect': 'non-scaling-stroke',
      }));
    }
    // custom shape rendering added in Phase 4
  }

  return g;
}

function renderGridOverlay(vw, vh) {
  const overlay = document.getElementById('grid-overlay');
  overlay.innerHTML = '';
  if (!state.showGrid || !state._grid) return;

  const frag = document.createDocumentFragment();
  const lineAttrs = { stroke: 'rgba(0,0,0,0.25)', 'stroke-width': '0.5', 'vector-effect': 'non-scaling-stroke' };

  let x = 0;
  for (let col = 0; col <= state.cols; col++) {
    frag.appendChild(el('line', { ...lineAttrs, x1: x, y1: 0, x2: x, y2: vh }));
    if (col < state.cols) x += state._colSizes[col];
  }

  let y = 0;
  for (let row = 0; row <= state.rows; row++) {
    frag.appendChild(el('line', { ...lineAttrs, x1: 0, y1: y, x2: vw, y2: y }));
    if (row < state.rows) y += state._rowSizes[row];
  }

  overlay.appendChild(frag);
}

// In-place color update — no regeneration (PRD §6.9)
export function updateModuleColors(modId) {
  const mod = state.modules.find(m => m.id === modId);
  if (!mod) return;
  document.querySelectorAll(`.cell[data-module-id="${modId}"]`).forEach(g => {
    const bg = g.querySelector('.cell-bg');
    if (bg) {
      if (mod.bgColor === null) bg.remove();
      else bg.setAttribute('fill', mod.bgColor);
    } else if (mod.bgColor !== null) {
      const rect = el('rect', { class: 'cell-bg', width: g.__w, height: g.__h, fill: mod.bgColor });
      g.prepend(rect);
    }
    const path = g.querySelector('.cell-shape-path');
    if (path) {
      path.setAttribute('fill', mod.fgColor ?? 'none');
      path.setAttribute('stroke', mod.strokeColor ?? 'none');
      path.setAttribute('stroke-width', mod.strokeWeight);
    }
  });
}
