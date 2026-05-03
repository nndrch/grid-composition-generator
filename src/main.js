import { generate } from './generate.js';
import { render } from './render.js';
import { exportSVG } from './export.js';
import { randomizeAll } from './randomize.js';
import { initCanvasSetup } from './ui/canvas-setup.js';
import { initModuleList } from './ui/module-list.js';
import { initGridControls } from './ui/grid-controls.js';
import { initGenerationControls } from './ui/generation-controls.js';

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

// ── Action buttons ────────────────────────────────────────────────────────────

document.getElementById('generate').addEventListener('click', doGenerate);

document.getElementById('randomize').addEventListener('click', () => {
  randomizeAll();
  doGenerate();
  // Sync all UI to new state
  canvasAPI.refresh();
  moduleAPI.refresh();
  gridAPI.refresh();
  genAPI.refresh();
  genAPI.refreshMatrix();
});

document.getElementById('export-svg').addEventListener('click', exportSVG);

// ── Boot ──────────────────────────────────────────────────────────────────────

doGenerate();
