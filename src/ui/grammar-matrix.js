import state from '../state.js';
import { getShape } from '../shapes/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeThumb(mod) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24'); svg.setAttribute('height', '24');
  if (mod.bgColor) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('width', '24'); r.setAttribute('height', '24');
    r.setAttribute('fill', mod.bgColor);
    svg.appendChild(r);
  }
  const shape = getShape(mod.shapeId);
  if (shape?.type === 'builtin') {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', shape.pathFn(24, 24, 0));
    p.setAttribute('fill', mod.fgColor ?? 'none');
    svg.appendChild(p);
  }
  return svg;
}

function isAllowed(fromId, toId) {
  const allowed = state.grammar[fromId];
  if (!allowed) return false;
  return allowed.includes(toId);
}

function setAllowed(fromId, toId, on) {
  if (!state.grammar[fromId]) state.grammar[fromId] = [];
  if (on) {
    if (!state.grammar[fromId].includes(toId)) state.grammar[fromId].push(toId);
  } else {
    state.grammar[fromId] = state.grammar[fromId].filter(id => id !== toId);
  }
}

export function initGrammarMatrix(containerEl) {
  const panel = document.createElement('div');
  panel.className = 'grammar-panel';
  panel.hidden = true;

  let _tableEl = null;

  const refresh = () => {
    panel.innerHTML = '';

    const shortcuts = document.createElement('div');
    shortcuts.className = 'grammar-shortcuts';

    const mkShortcut = (label, fn) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = label;
      btn.addEventListener('click', () => { fn(); refresh(); });
      shortcuts.appendChild(btn);
    };

    mkShortcut('All on', () => {
      for (const from of state.modules)
        state.grammar[from.id] = state.modules.map(m => m.id);
    });
    mkShortcut('All off', () => {
      for (const from of state.modules) state.grammar[from.id] = [];
    });
    mkShortcut('Identity', () => {
      for (const from of state.modules) state.grammar[from.id] = [from.id];
    });

    panel.appendChild(shortcuts);

    // Build N×N table
    const table = document.createElement('table');
    table.className = 'grammar-table';

    // Header row (column labels = "to" modules)
    const thead = document.createElement('thead');
    const hRow = document.createElement('tr');
    hRow.appendChild(document.createElement('th')); // empty corner
    for (const mod of state.modules) {
      const th = document.createElement('th');
      th.className = 'grammar-th';
      th.title = `To: ${mod.id}`;
      th.appendChild(makeThumb(mod));
      hRow.appendChild(th);
    }
    thead.appendChild(hRow);
    table.appendChild(thead);

    // Body rows (row labels = "from" modules)
    const tbody = document.createElement('tbody');
    for (const fromMod of state.modules) {
      const tr = document.createElement('tr');
      const rowTh = document.createElement('th');
      rowTh.className = 'grammar-th';
      rowTh.title = `From: ${fromMod.id}`;
      rowTh.appendChild(makeThumb(fromMod));
      tr.appendChild(rowTh);

      for (const toMod of state.modules) {
        const td = document.createElement('td');
        const btn = document.createElement('button');
        const allowed = isAllowed(fromMod.id, toMod.id);
        const fromName = getShape(fromMod.shapeId)?.name ?? fromMod.id;
        const toName   = getShape(toMod.shapeId)?.name   ?? toMod.id;
        btn.type = 'button';
        btn.className = 'grammar-cell-btn' + (allowed ? ' is-active' : '');
        btn.setAttribute('aria-label',   `${fromName} → ${toName}`);
        btn.setAttribute('aria-pressed', allowed ? 'true' : 'false');
        btn.addEventListener('click', () => {
          const now = isAllowed(fromMod.id, toMod.id);
          setAllowed(fromMod.id, toMod.id, !now);
          btn.classList.toggle('is-active', !now);
          btn.setAttribute('aria-pressed', (!now).toString());
        });
        td.appendChild(btn);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    _tableEl = table;
    panel.appendChild(table);
  };

  containerEl.appendChild(panel);
  refresh();

  return {
    panel,
    refresh,
    show() { panel.hidden = false; },
    hide() { panel.hidden = true; },
    toggle() { panel.hidden = !panel.hidden; },
  };
}
