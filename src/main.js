import { generate } from './generate.js';
import { render } from './render.js';
import { exportSVG, copySVGToClipboard } from './export.js';
import { randomizeAll } from './randomize.js';
import { initCanvasSetup } from './ui/canvas-setup.js';
import { initModuleList } from './ui/module-list.js';
import { initGridControls } from './ui/grid-controls.js';
import { initGenerationControls } from './ui/generation-controls.js';
import { initExportDialog } from './ui/export-dialog.js';
import { initMobileNav } from './ui/mobile-nav.js';

// ── Persist <details> open/close state across the session ────────────────────

const DETAILS_KEY = 'gcg_sections';

function initDetailsState() {
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(DETAILS_KEY) ?? '{}'); } catch {}

  document.querySelectorAll('details.sidebar-section[id]').forEach(el => {
    if (el.id in saved) el.open = saved[el.id];
    el.addEventListener('toggle', () => {
      try {
        const s = JSON.parse(sessionStorage.getItem(DETAILS_KEY) ?? '{}');
        s[el.id] = el.open;
        sessionStorage.setItem(DETAILS_KEY, JSON.stringify(s));
      } catch {}
    });
  });
}

initDetailsState();

// ── Core actions ──────────────────────────────────────────────────────────────

function doGenerate() { generate(); render(); }
function doRender()   { render(); }

// ── Init UI sections ──────────────────────────────────────────────────────────

const canvasAPI = initCanvasSetup(
  document.getElementById('section-canvas')
);

let refreshGrammarMatrix = () => {};

const moduleAPI = initModuleList(
  document.getElementById('section-modules'),
  {
    onModulesChanged: () => { refreshGrammarMatrix(); },
  }
);

const gridAPI = initGridControls(
  document.getElementById('section-grid'),
  { onGenerate: doGenerate, onRender: doRender }
);

const genAPI = initGenerationControls(
  document.getElementById('section-generation'),
  { onGenerate: doGenerate }
);
refreshGrammarMatrix = () => genAPI.refreshMatrix();

// ── Export dialog ─────────────────────────────────────────────────────────────

const exportDialog = initExportDialog();

// ── Action buttons ────────────────────────────────────────────────────────────

document.getElementById('generate').addEventListener('click', doGenerate);

document.getElementById('randomize').addEventListener('click', () => {
  randomizeAll();
  doGenerate();
  canvasAPI.refresh();
  moduleAPI.refresh();
  gridAPI.refresh();
  genAPI.refresh();
  genAPI.refreshMatrix();
});

document.getElementById('copy-svg').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const original = btn.textContent;
  try {
    await copySVGToClipboard();
    btn.textContent = '✓ Copied!';
    btn.classList.add('is-copied');
  } catch {
    btn.textContent = '✗ Copy failed';
  }
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('is-copied');
  }, 1500);
});

document.getElementById('export-svg').addEventListener('click', () => exportDialog.open());

// ── Mobile nav ────────────────────────────────────────────────────────────────

initMobileNav({ canvasAPI, moduleAPI, gridAPI, genAPI, exportDialog });

// ── Boot ──────────────────────────────────────────────────────────────────────

doGenerate();
