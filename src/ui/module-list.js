import state from '../state.js';
import { getShape, getBuiltinShapes, getCustomShapes } from '../shapes/index.js';
import { makeCustomShapeThumbnail, initShapeLibrary } from './shape-library.js';
import { updateModuleColors, render } from '../render.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let _listEl = null;
let _onModulesChanged = () => {};

// moduleId → warning text (set when a shape is deleted from under a module)
const _warnings = new Map();

// ── Mini SVG preview (36×36, step 0) ────────────────────────────────────────

function makePreviewSvg(mod) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 36 36');
  svg.setAttribute('width', '36');
  svg.setAttribute('height', '36');
  svg.style.display = 'block';

  if (mod.bgColor !== null) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('width', '36'); rect.setAttribute('height', '36');
    rect.setAttribute('fill', mod.bgColor);
    svg.appendChild(rect);
  }

  const shape = getShape(mod.shapeId);
  if (shape?.type === 'builtin') {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', shape.pathFn(36, 36, 0));
    path.setAttribute('fill', mod.fgColor ?? 'none');
    path.setAttribute('stroke', mod.strokeColor ?? 'none');
    path.setAttribute('stroke-width', mod.strokeWeight);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(path);
  } else if (shape?.type === 'custom') {
    const scaleG = document.createElementNS(SVG_NS, 'g');
    scaleG.setAttribute('transform', `scale(${36 / shape.viewBox.w}, ${36 / shape.viewBox.h})`);

    const parser = new DOMParser();
    const tempDoc = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${shape.svgContent}</svg>`,
      'image/svg+xml'
    );
    const root = tempDoc.documentElement;
    root.querySelectorAll('*').forEach(node => {
      node.setAttribute('fill', mod.fgColor ?? 'none');
      node.setAttribute('stroke', mod.strokeColor ?? 'none');
      node.setAttribute('stroke-width', mod.strokeWeight);
      node.setAttribute('vector-effect', 'non-scaling-stroke');
    });
    for (const child of [...root.childNodes]) {
      scaleG.appendChild(document.importNode(child, true));
    }
    svg.appendChild(scaleG);
  }

  return svg;
}

function refreshPreview(previewEl, mod) {
  previewEl.innerHTML = '';
  previewEl.appendChild(makePreviewSvg(mod));
}

// ── Color control (label + color input + Ø button) ───────────────────────────

function makeColorControl(labelText, getColor, setColor, previewEl, mod) {
  const wrap = document.createElement('label');
  wrap.className = 'color-label';

  const lbl = document.createElement('span');
  lbl.textContent = labelText;

  const inp = document.createElement('input');
  inp.type = 'color';
  inp.value = getColor() ?? '#000000';
  inp.setAttribute('aria-label', `${labelText} color`);
  if (getColor() === null) inp.classList.add('is-null');

  const nullBtn = document.createElement('button');
  nullBtn.className = 'null-btn';
  nullBtn.type = 'button';
  nullBtn.textContent = 'Ø';
  nullBtn.title = 'Set to transparent / none';
  nullBtn.setAttribute('aria-label', `Set ${labelText} to none`);

  inp.addEventListener('input', () => {
    setColor(inp.value);
    inp.classList.remove('is-null');
    updateModuleColors(mod.id);
    refreshPreview(previewEl, mod);
  });

  nullBtn.addEventListener('click', () => {
    setColor(null);
    inp.classList.add('is-null');
    updateModuleColors(mod.id);
    refreshPreview(previewEl, mod);
  });

  wrap.appendChild(lbl);
  wrap.appendChild(inp);
  wrap.appendChild(nullBtn);
  return { wrap, inp };
}

// ── Shape picker dropdown ────────────────────────────────────────────────────

function makeShapeOptionEl(shape) {
  const opt = document.createElement('button');
  opt.type = 'button';
  opt.className = 'shape-option';
  opt.dataset.shapeId = shape.id;

  if (shape.type === 'builtin') {
    const mini = document.createElementNS(SVG_NS, 'svg');
    mini.setAttribute('viewBox', '0 0 24 24');
    mini.setAttribute('width', '24'); mini.setAttribute('height', '24');
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', shape.pathFn(24, 24, 0));
    p.setAttribute('fill', '#888');
    mini.appendChild(p);
    opt.appendChild(mini);
  } else if (shape.type === 'custom') {
    const mini = makeCustomShapeThumbnail(shape, 24);
    opt.appendChild(mini);
  }

  const name = document.createElement('span');
  name.textContent = shape.name;
  opt.appendChild(name);

  return opt;
}

function makeShapePicker(mod, previewEl) {
  const row = document.createElement('div');
  row.className = 'shape-row';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'shape-picker-btn';
  btn.textContent = (getShape(mod.shapeId)?.name ?? mod.shapeId) + ' ▾';

  const dropdown = document.createElement('div');
  dropdown.className = 'shape-dropdown';
  dropdown.hidden = true;

  const buildOptions = () => {
    dropdown.innerHTML = '';

    const builtins = getBuiltinShapes();
    const customs  = getCustomShapes();

    const addGroup = (label, shapes) => {
      if (shapes.length === 0) return;
      const header = document.createElement('div');
      header.className = 'shape-dropdown-group';
      header.textContent = label;
      dropdown.appendChild(header);

      for (const shape of shapes) {
        const opt = makeShapeOptionEl(shape);
        if (shape.id === mod.shapeId) opt.classList.add('is-active');
        opt.addEventListener('click', () => {
          mod.shapeId = shape.id;
          btn.textContent = shape.name + ' ▾';
          dropdown.hidden = true;
          // Clear fallback warning if the user picks a new shape
          _warnings.delete(mod.id);
          row.closest('.module-item')?.querySelector('.module-warning')?.remove();
          dropdown.querySelectorAll('.shape-option').forEach(o => o.classList.remove('is-active'));
          opt.classList.add('is-active');
          refreshPreview(previewEl, mod);
          render();
        });
        dropdown.appendChild(opt);
      }
    };

    addGroup('Built-in', builtins);
    addGroup('Custom', customs);
  };

  buildOptions();

  btn.addEventListener('click', e => {
    e.stopPropagation();
    buildOptions(); // refresh options in case customs changed
    dropdown.hidden = !dropdown.hidden;
  });

  document.addEventListener('click', () => { dropdown.hidden = true; });

  row.appendChild(btn);
  row.appendChild(dropdown);
  return { el: row };
}

// ── Full module item ─────────────────────────────────────────────────────────

function buildModuleItem(mod) {
  const item = document.createElement('div');
  item.className = 'module-item';
  item.dataset.id = mod.id;

  // Preview
  const preview = document.createElement('div');
  preview.className = 'module-preview';
  preview.appendChild(makePreviewSvg(mod));

  // Controls
  const controls = document.createElement('div');
  controls.className = 'module-controls';

  // Shape picker
  const { el: shapeRow } = makeShapePicker(mod, preview);
  controls.appendChild(shapeRow);

  // Fallback warning (shown when a custom shape was deleted)
  if (_warnings.has(mod.id)) {
    const warn = document.createElement('p');
    warn.className = 'module-warning';
    warn.textContent = _warnings.get(mod.id);
    controls.appendChild(warn);
  }

  // Color row
  const colorRow = document.createElement('div');
  colorRow.className = 'color-row';

  const { wrap: fgWrap } = makeColorControl('FG',  () => mod.fgColor,     v => { mod.fgColor     = v; }, preview, mod);
  const { wrap: bgWrap } = makeColorControl('BG',  () => mod.bgColor,     v => { mod.bgColor     = v; }, preview, mod);
  const { wrap: stWrap } = makeColorControl('STR', () => mod.strokeColor, v => { mod.strokeColor = v; }, preview, mod);

  // Stroke weight
  const swWrap = document.createElement('label');
  swWrap.className = 'color-label';
  const swLbl = document.createElement('span');
  swLbl.textContent = 'Wt';
  const swInp = document.createElement('input');
  swInp.type = 'number'; swInp.min = 0; swInp.max = 20; swInp.step = 0.5;
  swInp.value = mod.strokeWeight;
  swInp.className = 'stroke-weight-input';
  swInp.addEventListener('change', () => {
    mod.strokeWeight = Math.max(0, parseFloat(swInp.value) || 0);
    swInp.value = mod.strokeWeight;
    updateModuleColors(mod.id);
    refreshPreview(preview, mod);
  });
  swWrap.appendChild(swLbl);
  swWrap.appendChild(swInp);

  colorRow.appendChild(fgWrap);
  colorRow.appendChild(bgWrap);
  colorRow.appendChild(stWrap);
  colorRow.appendChild(swWrap);
  controls.appendChild(colorRow);

  // Weight row
  const weightRow = document.createElement('div');
  weightRow.className = 'weight-row';
  const wLbl = document.createElement('span');
  wLbl.className = 'weight-label';
  wLbl.textContent = 'Weight';
  const wRange = document.createElement('input');
  wRange.type = 'range'; wRange.min = 1; wRange.max = 10; wRange.value = mod.weight;
  const wNum = document.createElement('input');
  wNum.type = 'number'; wNum.min = 1; wNum.max = 10; wNum.value = mod.weight;
  wNum.className = 'weight-num-input';

  wRange.addEventListener('input', () => {
    mod.weight = parseInt(wRange.value);
    wNum.value = mod.weight;
  });
  wNum.addEventListener('change', () => {
    mod.weight = Math.min(10, Math.max(1, parseInt(wNum.value) || 1));
    wRange.value = mod.weight; wNum.value = mod.weight;
  });

  weightRow.appendChild(wLbl);
  weightRow.appendChild(wRange);
  weightRow.appendChild(wNum);
  controls.appendChild(weightRow);

  item.appendChild(preview);
  item.appendChild(controls);

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-btn';
  removeBtn.setAttribute('aria-label', 'Remove module');
  removeBtn.textContent = '×';
  removeBtn.disabled = state.modules.length <= 1;
  removeBtn.addEventListener('click', () => {
    if (state.modules.length <= 1) return;
    const idx = state.modules.indexOf(mod);
    if (idx !== -1) {
      state.modules.splice(idx, 1);
      _warnings.delete(mod.id);
      delete state.grammar[mod.id];
      for (const key of Object.keys(state.grammar)) {
        state.grammar[key] = state.grammar[key].filter(id => id !== mod.id);
      }
      _onModulesChanged();
    }
  });
  item.appendChild(removeBtn);

  return item;
}

// ── Public API ───────────────────────────────────────────────────────────────

function refresh() {
  if (!_listEl) return;
  _listEl.innerHTML = '';
  for (const mod of state.modules) {
    _listEl.appendChild(buildModuleItem(mod));
  }
  _listEl.querySelectorAll('.remove-btn').forEach(btn => {
    btn.disabled = state.modules.length <= 1;
  });
}

export function initModuleList(sectionEl, { onModulesChanged }) {
  _onModulesChanged = () => { refresh(); onModulesChanged(); };

  const content = document.createElement('div');
  content.className = 'section-content';

  _listEl = document.createElement('div');
  _listEl.className = 'module-list';
  content.appendChild(_listEl);

  // Add module button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'add-module-btn';
  addBtn.textContent = '+ Add module';
  addBtn.addEventListener('click', () => {
    const id = 'mod_' + Date.now();
    state.modules.push({
      id,
      shapeId:      'builtin:quarterCircle',
      fgColor:      '#000000',
      bgColor:      '#ffffff',
      strokeColor:  null,
      strokeWeight: 0,
      weight:       1,
    });
    state.grammar[id] = [];
    _onModulesChanged();
  });
  content.appendChild(addBtn);

  // Shape library (below pool list, inside Modules section)
  initShapeLibrary(content, {
    onShapeRegistered: () => {
      // Picker dropdowns rebuild on open (buildOptions called on click), nothing else needed
    },
    onShapeDeleted: (shapeId) => {
      // Fall back any module using the deleted shape to builtin:square
      let affected = false;
      for (const mod of state.modules) {
        if (mod.shapeId === shapeId) {
          mod.shapeId = 'builtin:square';
          _warnings.set(mod.id, 'Shape deleted — fell back to Square');
          affected = true;
        }
      }
      if (affected) {
        refresh();
        render();
      }
    },
  });

  sectionEl.appendChild(content);
  refresh();

  return { refresh };
}
