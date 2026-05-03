import { getBuiltinShapes, registerCustomShape, removeCustomShape } from '../shapes/index.js';
import { ingestSvg } from '../shapes/custom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let _containerEl = null;
let _onShapeRegistered = () => {};
let _onShapeDeleted = () => {};

// ── Thumbnail helpers ────────────────────────────────────────────────────────

export function makeCustomShapeThumbnail(shape, size = 36) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.style.display = 'block';
  svg.style.flexShrink = '0';

  const scaleG = document.createElementNS(SVG_NS, 'g');
  scaleG.setAttribute('transform', `scale(${size / shape.viewBox.w}, ${size / shape.viewBox.h})`);

  const parser = new DOMParser();
  const tempDoc = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${shape.svgContent}</svg>`,
    'image/svg+xml'
  );
  const root = tempDoc.documentElement;
  root.querySelectorAll('*').forEach(el => {
    el.setAttribute('fill', '#555');
    el.setAttribute('stroke', 'none');
    el.removeAttribute('stroke-width');
  });
  for (const child of [...root.childNodes]) {
    scaleG.appendChild(document.importNode(child, true));
  }

  svg.appendChild(scaleG);
  return svg;
}

// ── Entry row for custom shapes ──────────────────────────────────────────────

function buildCustomEntry(shape) {
  const row = document.createElement('div');
  row.className = 'shape-lib-item';
  row.dataset.shapeId = shape.id;

  const thumb = document.createElement('div');
  thumb.className = 'shape-lib-thumb';
  thumb.appendChild(makeCustomShapeThumbnail(shape, 36));

  const name = document.createElement('span');
  name.className = 'shape-lib-name';
  name.textContent = shape.name;

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'shape-lib-delete-btn';
  delBtn.setAttribute('aria-label', `Delete ${shape.name}`);
  delBtn.textContent = '×';
  delBtn.addEventListener('click', () => {
    removeCustomShape(shape.id);
    row.remove();
    updateEmptyState();
    _onShapeDeleted(shape.id);
  });

  row.appendChild(thumb);
  row.appendChild(name);
  row.appendChild(delBtn);
  return row;
}

function updateEmptyState() {
  if (!_containerEl) return;
  const customList = _containerEl.querySelector('.shape-lib-custom-list');
  const empty = _containerEl.querySelector('.shape-lib-empty');
  if (!customList || !empty) return;
  empty.hidden = customList.children.length > 0;
}

// ── Upload handler ───────────────────────────────────────────────────────────

function handleUpload(file) {
  if (!file) return;

  const errorEl = _containerEl.querySelector('.shape-lib-upload-error');
  const warningEl = _containerEl.querySelector('.shape-lib-upload-warning');
  errorEl.textContent = ''; errorEl.hidden = true;
  warningEl.textContent = ''; warningEl.hidden = true;

  if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
    errorEl.textContent = 'Only .svg files are accepted.';
    errorEl.hidden = false;
    return;
  }

  if (file.size > 100 * 1024) {
    warningEl.textContent = `Large file (${Math.round(file.size / 1024)} KB) — accepted, may slow rendering.`;
    warningEl.hidden = false;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const entry = ingestSvg(e.target.result, file.name);
      registerCustomShape(entry);
      const customList = _containerEl.querySelector('.shape-lib-custom-list');
      customList.appendChild(buildCustomEntry(entry));
      updateEmptyState();
      _onShapeRegistered(entry);
    } catch (err) {
      errorEl.textContent = `Upload failed: ${err.message}`;
      errorEl.hidden = false;
    }
  };
  reader.readAsText(file);
}

// ── Public init ──────────────────────────────────────────────────────────────

export function initShapeLibrary(containerEl, { onShapeRegistered, onShapeDeleted } = {}) {
  _onShapeRegistered = onShapeRegistered ?? (() => {});
  _onShapeDeleted    = onShapeDeleted    ?? (() => {});

  const wrap = document.createElement('div');
  wrap.className = 'shape-library';
  _containerEl = wrap;

  // Section divider
  const divider = document.createElement('div');
  divider.className = 'shape-lib-divider';
  wrap.appendChild(divider);

  // Built-in shapes (read-only reference)
  const builtinHeader = document.createElement('div');
  builtinHeader.className = 'shape-lib-section-label';
  builtinHeader.textContent = 'Built-in shapes';
  wrap.appendChild(builtinHeader);

  const builtinGrid = document.createElement('div');
  builtinGrid.className = 'shape-lib-builtin-grid';
  for (const shape of getBuiltinShapes()) {
    const item = document.createElement('div');
    item.className = 'shape-lib-item shape-lib-item--builtin';

    const thumbSvg = document.createElementNS(SVG_NS, 'svg');
    thumbSvg.setAttribute('viewBox', '0 0 36 36');
    thumbSvg.setAttribute('width', '36'); thumbSvg.setAttribute('height', '36');
    thumbSvg.style.display = 'block';
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', shape.pathFn(36, 36, 0));
    p.setAttribute('fill', '#555');
    thumbSvg.appendChild(p);

    const thumb = document.createElement('div');
    thumb.className = 'shape-lib-thumb';
    thumb.appendChild(thumbSvg);

    const name = document.createElement('span');
    name.className = 'shape-lib-name';
    name.textContent = shape.name;

    item.appendChild(thumb);
    item.appendChild(name);
    builtinGrid.appendChild(item);
  }
  wrap.appendChild(builtinGrid);

  // Custom shapes
  const customHeader = document.createElement('div');
  customHeader.className = 'shape-lib-section-label';
  customHeader.textContent = 'Custom shapes';
  wrap.appendChild(customHeader);

  const emptyMsg = document.createElement('p');
  emptyMsg.className = 'shape-lib-empty';
  emptyMsg.textContent = 'No custom shapes uploaded yet.';
  wrap.appendChild(emptyMsg);

  const customList = document.createElement('div');
  customList.className = 'shape-lib-custom-list';
  wrap.appendChild(customList);

  // Upload controls
  const uploadRow = document.createElement('div');
  uploadRow.className = 'shape-lib-upload-row';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.svg,image/svg+xml';
  fileInput.style.display = 'none';

  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.className = 'add-module-btn';
  uploadBtn.textContent = '+ Upload SVG';
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleUpload(fileInput.files[0]);
    fileInput.value = '';
  });

  const hint = document.createElement('span');
  hint.className = 'shape-lib-hint';
  hint.textContent = 'Max 100 KB';

  uploadRow.appendChild(uploadBtn);
  uploadRow.appendChild(fileInput);
  uploadRow.appendChild(hint);
  wrap.appendChild(uploadRow);

  const errorEl = document.createElement('p');
  errorEl.className = 'shape-lib-upload-error';
  errorEl.hidden = true;
  wrap.appendChild(errorEl);

  const warningEl = document.createElement('p');
  warningEl.className = 'shape-lib-upload-warning';
  warningEl.hidden = true;
  wrap.appendChild(warningEl);

  containerEl.appendChild(wrap);
  updateEmptyState();
}
