# Grid Composition Generator — Project Specification

> **For use with AI Agents.** Provide this document in full at the start of each session. Treat every section as authoritative. Update the changelog when decisions change.

## Current Development Phase

We are currently working on expanding the v1.0 baseline. 
**[→ View the Current Implementation Plan (Phases 7 & 8)](./current-plan.md)** 
Read the current plan before starting any new coding tasks.

---

## 1. Project overview

A client-side, single-page web app that generates grid-based geometric compositions and exports them as vector SVG files. Conceptually rooted in Sol LeWitt's instruction-based art — the system is the work, the output is one of many valid expressions of it.

Hosted as a static app on Vercel. No backend, no auth, no npm dependencies for export.

**Primary user actions:** set aspect ratio → build a module pool → configure grid waveforms → set generation rules → generate → export SVG.

---

## 2. File structure

```
/
├── index.html
├── src/
│   ├── main.js               ← entry point, wires all modules
│   ├── state.js              ← state object and defaults
│   ├── shapes/
│   │   ├── index.js          ← shape registry
│   │   ├── built-in.js       ← quarterCircle, square, triangle path generators
│   │   └── custom.js         ← SVG ingest, sanitize, mirror transforms
│   ├── grid.js               ← waveform computation, track geometry
│   ├── grammar.js            ← transition matrix, filterByGrammar
│   ├── noise.js              ← value noise, smoothNoise, noiseWeightedPick
│   ├── symmetry.js           ← resolveSource, applyFlipStep
│   ├── generate.js           ← composition generator
│   ├── render.js             ← SVG DOM rendering, in-place style updates
│   ├── export.js             ← SVG export only
│   ├── randomize.js          ← randomize-all logic and palette generation
│   └── ui/
│       ├── canvas-setup.js   ← aspect ratio inputs, show grid toggle
│       ├── module-list.js    ← module pool UI
│       ├── grammar-matrix.js ← transition matrix UI
│       ├── grid-controls.js  ← waveform controls per axis
│       ├── shape-library.js  ← built-in reference + custom upload list
│       └── numeric-input.js  ← shared slider + number sync component
├── styles/
│   └── main.css
├── public/
│   └── favicon.svg
├── package.json
├── vite.config.js
├── vercel.json
├── README.md
└── .gitignore
```

---

## 3. Stack

| Concern | Choice | Notes |
|---|---|---|
| Build tool | Vite | Dev server + production bundling |
| Renderer | Native SVG DOM | Output is already vector |
| SVG export | Native Blob API | No library needed |
| Noise | Inline value noise | ~15 lines, no library |
| Styling | Hand-written CSS | No framework |
| Hosting | Vercel | Static, GitHub integration, free tier |

`package.json` dev dep: `vite` only. No runtime dependencies.

---

## 4. Layout

Two-column layout. Fixed sidebar left; canvas fills remaining space.

- **Sidebar:** 350px, full height, scrollable, collapsible section groups
- **Canvas area:** flex-grow, SVG preview centered, scaled to fit the viewport while maintaining the user-defined aspect ratio via CSS `aspect-ratio`

### 4.1 Sidebar collapsible sections

Implemented as `<details>/<summary>` elements. Four are collapsible; Actions is always visible.

| Section | Default | Contains |
|---|---|---|
| **Canvas** | Open | Aspect ratio W/H inputs, show grid toggle |
| **Modules** | Open | Module pool list, add button, shape library |
| **Grid** | Open | Cols/rows waveform controls |
| **Generation** | Collapsed | Noise scale, symmetry, rotation, grammar |
| **Actions** | Always visible | Generate, Randomize, Export SVG |

Each collapsible section:
```html
<details class="sidebar-section" open>
  <summary class="section-label">Canvas</summary>
  <!-- controls -->
</details>
```

Actions section is a plain `<div class="sidebar-section sidebar-section--actions">`.

CSS: style `summary` as a clickable header, hide the default triangle disclosure marker and replace with a custom `+`/`−` indicator via `details[open] .section-label::after`.

---

## 5. Module system

### 5.1 Concept

The user builds a **module pool**: an ordered list of module instances. During generation each cell samples a 2D noise field and picks from the pool using a weighted distribution. Nearby cells sample nearby noise coordinates, producing spatial coherence.

Each module instance:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Unique instance ID |
| `shapeId` | string | Reference to shape in registry |
| `fgColor` | hex \| `null` | Fill color. `null` → `fill="none"` |
| `bgColor` | hex \| `null` | Background rect color. `null` → no rect rendered |
| `strokeColor` | hex \| `null` | Stroke color. `null` → `stroke="none"` |
| `strokeWeight` | number 0–20 | Stroke width applied uniformly |
| `weight` | integer 1–10 | Selection frequency weight |

**Unified color application rule.** The app has total control over colors at render time. For both built-in and custom SVG shapes, `fgColor`, `strokeColor`, and `strokeWeight` from the module are forcefully applied to every path and element. Original authored colors in uploaded SVGs are always overwritten. All strokes use `vector-effect="non-scaling-stroke"` for visually consistent line weight across cells of different sizes.

### 5.2 Shape registry

```js
// src/shapes/index.js
{
  id: string,           // 'builtin:quarterCircle' | 'builtin:square' | 'builtin:triangle' | 'custom:{uid}'
  name: string,
  type: 'builtin' | 'custom',
  pathFn: (w, h, step) => string,  // built-ins only
  svgContent: string,              // custom only — sanitized inner SVG markup
  viewBox: { w, h },               // custom only
}
```

### 5.3 Built-in shapes

All defined in local space `(0, 0, W, H)`. Stretch freely when `W ≠ H`. **Pre-oriented path variants are used instead of rotation transforms** — rotating a shape around a non-square cell center overflows the cell boundary. The 4 variants are derived by mirroring the base path across cell axes.

Steps: `0=TL`, `1=TR`, `2=BR`, `3=BL`

**Quarter circle:**
```
step 0 (TL): M 0,0 L W,0 A W,H 0 0 1 0,H Z
step 1 (TR): M W,0 L 0,0 A W,H 0 0 0 W,H Z
step 2 (BR): M W,H L 0,H A W,H 0 0 1 W,0 Z
step 3 (BL): M 0,H L W,H A W,H 0 0 0 0,0 Z
```

**Square** (all steps identical — rotation has no visual effect):
```
M 0,0 L W,0 L W,H L 0,H Z
```

**Right triangle:**
```
step 0 (TL): M 0,0 L W,0 L 0,H Z
step 1 (TR): M 0,0 L W,0 L W,H Z
step 2 (BR): M W,0 L W,H L 0,H Z
step 3 (BL): M 0,0 L W,H L 0,H Z
```

### 5.4 Custom shapes (uploaded SVGs)

**Ingest pipeline:**
1. `<input type="file" accept=".svg,image/svg+xml">` → `FileReader` reads as text
2. `DOMParser` parses string. Strip `<script>` elements and all `on*` attributes from every element.
3. Extract root `viewBox`. Fallback: derive from `width`/`height` attributes. Last resort: `0 0 100 100`.
4. Serialize everything inside the root `<svg>` as a string. Store as `svgContent`.
5. Register in the shape registry.

**Rendering custom shapes in a cell:**
```html
<g class="cell" transform="translate(x,y)" data-module-id="...">
  <!-- bgColor null → omit this rect entirely -->
  <rect class="cell-bg" width="W" height="H" fill="{bgColor}"/>
  <g class="cell-shape" transform="{stepTransform}">
    <g transform="scale(W/vbW, H/vbH)">
      <!-- sanitized SVG inner content with forceful color application -->
    </g>
  </g>
</g>
```

**Step transforms** — pure mirror operations, zero overflow:
```
step 0: (identity)
step 1: translate(W,0) scale(-1,1)
step 2: translate(W,H) scale(-1,-1)
step 3: translate(0,H) scale(1,-1)
```

**Color application at render time:** clone inner SVG DOM, traverse all descendants, forcefully set `fill`, `stroke`, `stroke-width`, and `vector-effect="non-scaling-stroke"` on every element according to the module's values.

---

## 6. Grid geometry and generation

### 6.1 Aspect ratio and coordinate space

The composition has no fixed pixel size — it is defined purely by an aspect ratio.

```js
state.aspectWidth  = 1   // positive integer, e.g. 1, 4, 16
state.aspectHeight = 1   // positive integer, e.g. 1, 3, 9
```

**Internal coordinate space:** `viewBox = "0 0 {aspectWidth * 100} {aspectHeight * 100}"`. This gives clean integer coordinates for all cell geometry. A 1:1 composition has viewBox `0 0 100 100`; a 16:9 composition has viewBox `0 0 1600 900`.

**Preview SVG in the browser:** the `<svg>` element has no fixed `width`/`height` attributes. It is sized by its CSS container using `aspect-ratio: {aspectWidth} / {aspectHeight}` and fills the available canvas area.

**SVG export:** the exported file carries the viewBox only. No `width`/`height` attributes are set, so the file is resolution-independent. Vector applications (Illustrator, Inkscape, Figma) will import it at whatever size they prefer and it will be perfectly scalable.

### 6.2 State object

```js
const state = {
  // Aspect ratio
  aspectWidth:  1,
  aspectHeight: 1,
  showGrid: false,

  // Grid tracks — each axis independent
  cols: 8,
  colWaveform:  'locked',  // 'locked' | 'sawtooth' | 'sine'
  colMinWeight: 1,         // 1–10
  colMaxWeight: 1,         // 1–10, must be >= colMinWeight
  colPeak:      0.5,       // 0.0–1.0, position of waveform peak

  rows: 8,
  rowWaveform:  'locked',
  rowMinWeight: 1,
  rowMaxWeight: 1,
  rowPeak:      0.5,

  // Derived track sizes (computed, not user-set)
  _colSizes: [],   // length = cols, values in viewBox units, sum = aspectWidth * 100
  _rowSizes: [],   // length = rows, values in viewBox units, sum = aspectHeight * 100

  // Module pool
  modules: [
    {
      id: 'mod_1',
      shapeId:      'builtin:quarterCircle',
      fgColor:      '#000000',
      bgColor:      '#e63946',
      strokeColor:  null,
      strokeWeight: 0,
      weight:       3,
    },
  ],

  // Generation
  rotationEnabled: true,
  noiseScale:      0.4,
  symmetry:        'none',   // 'none' | 'mirrorX' | 'mirrorY' | 'fourFold'
  grammarEnabled:  false,
  grammar:         {},       // { [fromId]: [allowedToId, ...] }

  // Internal
  _noiseSeed: 0,
  _grid:      null,          // 2D array: [row][col] = { mod, step }
};
```

### 6.3 Waveform track sizing

Track sizes are computed algorithmically. This gives rhythmic variation across the grid without manual per-track inputs.

```js
// src/grid.js

export function getWaveWeight(t, type, min, max, peak) {
  // t: normalized position 0..1 along the axis
  if (type === 'locked') return max;
  let dist = 0;
  if (type === 'sawtooth') {
    if (peak === 0)      dist = 1 - t;
    else if (peak === 1) dist = t;
    else dist = t < peak ? (t / peak) : (1 - (t - peak) / (1 - peak));
  } else if (type === 'sine') {
    const angle = t < peak
      ? (t / peak) * (Math.PI / 2)
      : (Math.PI / 2) + ((t - peak) / (1 - peak)) * (Math.PI / 2);
    dist = Math.sin(angle);
  }
  return min + (max - min) * dist;
}

export function computeTrackSizes(count, waveform, min, max, peak, totalUnits) {
  const weights = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    weights.push(getWaveWeight(t, waveform, min, max, peak));
  }
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  return weights.map(w => (w / totalWeight) * totalUnits);
}
```

`totalUnits` for columns = `aspectWidth * 100`. For rows = `aspectHeight * 100`.

**Waveform semantics:**
- `locked`: all tracks equal. `colMinWeight` and `colPeak` are ignored.
- `sawtooth`: linear ramp up to the peak position, then down. Peak at 0.0 = descending only. Peak at 1.0 = ascending only.
- `sine`: sinusoidal curve with its maximum at the peak position.

**When waveform params change:** recompute `_colSizes`/`_rowSizes`, re-render (reposition/resize cells). Do **not** regenerate — `_grid` contents stay, cells just resize. This lets the user tune rhythm without losing a composition.

**When col/row count changes:** full regeneration.

### 6.4 SVG structure

```html
<svg id="canvas-svg"
     viewBox="0 0 {aspectWidth*100} {aspectHeight*100}"
     xmlns="http://www.w3.org/2000/svg">
  <g id="cells"></g>
  <g id="grid-overlay"></g>
</svg>
```

No `width`/`height` attributes on the element. CSS sizes it via `aspect-ratio`.

Each cell:
```html
<g class="cell" transform="translate({x},{y})" data-module-id="{mod.id}">
  <rect class="cell-bg" width="{W}" height="{H}" fill="{bgColor}"/>
  <!-- shape: built-in path OR custom inner content with step transform -->
</g>
```

`x` and `y` are accumulated positions from `_colSizes` and `_rowSizes`.

### 6.5 Generation

```js
// src/generate.js
function generate() {
  if (state.modules.length === 0) return;
  state._noiseSeed = Math.random() * 10000;

  const totalW = state.aspectWidth  * 100;
  const totalH = state.aspectHeight * 100;

  state._colSizes = computeTrackSizes(
    state.cols, state.colWaveform, state.colMinWeight, state.colMaxWeight, state.colPeak, totalW
  );
  state._rowSizes = computeTrackSizes(
    state.rows, state.rowWaveform, state.rowMinWeight, state.rowMaxWeight, state.rowPeak, totalH
  );

  const sourceCols = (state.symmetry === 'mirrorX' || state.symmetry === 'fourFold')
    ? Math.ceil(state.cols / 2) : state.cols;
  const sourceRows = (state.symmetry === 'mirrorY' || state.symmetry === 'fourFold')
    ? Math.ceil(state.rows / 2) : state.rows;

  // Generate source region with grammar
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

  // Expand to full grid via symmetry
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
```

**Symmetry + waveforms note:** symmetry maps *content* (module + step) by index. The *physical cell size* at a mirrored index is governed entirely by the waveform — it need not equal the source cell size. An asymmetric waveform with `mirrorX` produces mirrored shapes stretched into different-sized cells. This is intentional.

### 6.6 Symmetry helpers

```js
// src/symmetry.js

// Steps: 0=TL, 1=TR, 2=BR, 3=BL
// flipX (mirror across vertical axis): step ^ 1
// flipY (mirror across horizontal axis): 3 - step
// both: (step + 2) % 4
export function applyFlipStep(step, flipX, flipY) {
  if (flipX && flipY) return (step + 2) % 4;
  if (flipX) return step ^ 1;
  if (flipY) return 3 - step;
  return step;
}

export function resolveSource(col, row, state) {
  const halfCols = Math.ceil(state.cols / 2);
  const halfRows = Math.ceil(state.rows / 2);
  let sourceCol = col, sourceRow = row, flipX = false, flipY = false;

  if ((state.symmetry === 'mirrorX' || state.symmetry === 'fourFold') && col >= halfCols) {
    sourceCol = state.cols - 1 - col;
    flipX = true;
  }
  if ((state.symmetry === 'mirrorY' || state.symmetry === 'fourFold') && row >= halfRows) {
    sourceRow = state.rows - 1 - row;
    flipY = true;
  }
  return { sourceCol, sourceRow, flipX, flipY };
}
```

### 6.7 Noise

```js
// src/noise.js

function valueNoise(ix, iy, seed) {
  const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.3) * 43758.5453;
  return n - Math.floor(n);
}

export function smoothNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = valueNoise(ix,     iy,     seed);
  const b = valueNoise(ix + 1, iy,     seed);
  const c = valueNoise(ix,     iy + 1, seed);
  const d = valueNoise(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (d - b - c + a) * ux * uy;
}

export function noiseWeightedPick(modules, noiseVal) {
  if (modules.length === 0) return null;
  const total = modules.reduce((s, m) => s + m.weight, 0);
  let t = noiseVal * total;
  for (const m of modules) {
    t -= m.weight;
    if (t <= 0) return m;
  }
  return modules[modules.length - 1];
}
```

### 6.8 Grammar

```js
// src/grammar.js

export function filterByGrammar(allModules, prevMod, state) {
  if (!state.grammarEnabled || !prevMod) return allModules;
  const allowedIds = state.grammar[prevMod.id];
  if (!allowedIds || allowedIds.length === 0) {
    console.warn(`Grammar: no successors for ${prevMod.id}, using full pool`);
    return allModules;
  }
  const filtered = allModules.filter(m => allowedIds.includes(m.id));
  return filtered.length > 0 ? filtered : allModules;
}
```

Grammar is a global transition matrix where rows = "from module" and columns = "to module". Applied left-to-right within each row of the source region only.

### 6.9 Live update rules

| Action | Behaviour |
|---|---|
| Change `fgColor` / `bgColor` / `strokeColor` / `strokeWeight` | Update DOM in-place via `data-module-id`; no regeneration |
| Change `weight` | State only; takes effect on next Generate |
| Change `aspectWidth` / `aspectHeight` | Recompute viewBox, recompute track sizes, re-render; no regeneration |
| Change waveform type / min / max / peak | Recompute `_colSizes`/`_rowSizes`, re-render; no regeneration |
| Change cols / rows | Full regeneration |
| Change noise scale / symmetry | Full regeneration |
| Toggle rotation / grammar | Takes effect on next Generate |
| Edit grammar matrix | Takes effect on next Generate |
| Add module | Appended to pool; grammar matrix row/col added; takes effect on next Generate |
| Remove module | Pruned from pool and grammar; takes effect on next Generate |
| Upload custom SVG | Added to registry; immediately selectable in shape picker |
| Delete custom SVG | Modules using it fall back to `builtin:square` with inline warning |

---

## 7. Controls

### 7.1 Canvas section

```
Aspect ratio
  W [number input, integer ≥ 1, default 1]
  H [number input, integer ≥ 1, default 1]

Show grid [checkbox]
```

Common presets shown as quick-select buttons below the inputs: `1:1`, `4:3`, `3:2`, `16:9`, `2:3`, `9:16`. Clicking a preset sets W and H and triggers re-render.

### 7.2 Modules section

**Module pool list:** one item per module.

```html
<div class="module-item" data-id="{mod.id}">
  <div class="module-preview">{36×36 SVG preview}</div>
  <div class="module-controls">
    <button class="shape-picker">{shape.name} ▾</button>
    <div class="color-row">
      <label>FG   <input type="color"> <button class="null-btn" title="Transparent">Ø</button></label>
      <label>BG   <input type="color"> <button class="null-btn" title="Transparent">Ø</button></label>
      <label>STR  <input type="color"> <button class="null-btn" title="None">Ø</button></label>
      <label>Wt   <input type="number" min="0" max="20" step="0.5"></label>
    </div>
    <div class="weight-row">
      Weight <input type="range" min="1" max="10"> <input type="number" min="1" max="10">
    </div>
  </div>
  <button class="remove-btn" aria-label="Remove">×</button>
</div>
```

The "Ø" button sets the corresponding color field to `null`. When a field is `null`, the color picker is visually dimmed and its value is ignored at render time.

The shape picker opens a dropdown listing all registered shapes (3 built-ins + any custom uploads) with a small thumbnail per shape.

Module preview (36×36 SVG) renders at step 0, updates live on any color or shape change.

**Below the list:** `+ Add module` button. Defaults: shape `builtin:quarterCircle`, FG `#000000`, BG `#ffffff`, stroke `null`, strokeWeight `0`, weight `1`.

**Shape library subsection** (inside Modules, below pool list):

- Read-only display of the 3 built-ins with thumbnails
- List of uploaded custom shapes with thumbnail + name + delete button
- `+ Upload SVG` button (triggers hidden `<input type="file">`)
- Max file size hint: 100 KB

### 7.3 Grid section

Two identical sub-blocks, one per axis (Columns / Rows).

```
Columns
  Count  [slider 1–24] [number 1–24]
  Distribution  [select: Locked | Sawtooth | Sine]
  Min weight    [slider 1–10] [number]   (disabled when Locked)
  Max weight    [slider 1–10] [number]
  Peak          [slider 0.0–1.0] [number] (disabled when Locked)

Rows
  (same controls)
```

When `Distribution = Locked`, Min weight and Peak controls are greyed out; only Max weight applies (all tracks equal).

A small visual preview strip below each axis shows the computed waveform profile as a row of proportional bars — updates live as sliders move.

### 7.4 Generation section

```
Noise scale   [slider 0.05–2.0] [number]  = 0.40
Symmetry      [select: None | Mirror X | Mirror Y | 4-fold]
Rotation      [toggle checkbox]
Grammar       [toggle checkbox]
              [Edit transitions →] button → opens grammar matrix panel
```

**Grammar matrix panel:** a square table (N×N modules). Rows = from, columns = to. Each cell is a small toggle button (filled = allowed, empty = blocked). Headers show module preview thumbnails.

Shortcut buttons: **All on**, **All off**, **Identity** (self-only, each module can only follow itself).

Grammar changes take effect on the next Generate.

### 7.5 Actions (always visible)

```
[↻ Generate]          ← primary button, always enabled
[⚂ Randomize all]    ← secondary button
[↓ Export SVG]        ← secondary button
```

---

## 8. Randomize all

A single button that randomizes generation parameters in one click, then calls `generate()`.

**What gets randomized:**

| Parameter | Logic |
|---|---|
| `cols` | Random integer 3–16 |
| `rows` | Random integer 3–16 |
| `colWaveform` / `rowWaveform` | Random pick from `['locked', 'sawtooth', 'sine']` |
| `colMinWeight` / `rowMinWeight` | Random integer 1–5 |
| `colMaxWeight` / `rowMaxWeight` | Random integer `minWeight`–10 |
| `colPeak` / `rowPeak` | Random float 0.1–0.9 |
| `noiseScale` | Random float 0.10–1.50, rounded to 2 dp |
| `symmetry` | Random pick from `['none','mirrorX','mirrorY','fourFold']` |
| `rotationEnabled` | Random boolean |
| `grammarEnabled` | Random boolean |
| `grammar` matrix | If enabled: each cell toggled on with probability 0.6 |
| Module `weight` | Random integer 1–10 per module |
| Module colors | Palette-based re-roll (see below) |

**What does NOT get randomized:**
- `aspectWidth` / `aspectHeight` — preserves layout intent
- Pool size and shape assignments — preserves the user's curated set
- Per-module `null` state for colors — the Ø toggle is not overridden
- `showGrid` toggle

**Palette logic.** Pure random per-color produces incoherent results. Instead:
1. Pick a random hue H (0–360) and saturation S (30–80%)
2. Generate three tones: dark `hsl(H, S, 12%)`, mid `hsl(H, S, 50%)`, light `hsl(H, S, 88%)`
3. With 30% probability, substitute any slot with a neutral (pure white or near-black)
4. For each module, assign two distinct palette values to `fgColor` and `bgColor`. If `strokeColor` is non-null, assign a third.

---

## 9. SVG export

```js
// src/export.js

export function exportSVG(state) {
  const svg = document.getElementById('canvas-svg').cloneNode(true);

  // Remove preview-only overlay
  svg.querySelector('#grid-overlay')?.remove();

  // No width/height attributes — purely viewBox-based, resolution-independent
  svg.removeAttribute('width');
  svg.removeAttribute('height');

  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: 'image/svg+xml' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'composition.svg',
  });
  a.click();
  URL.revokeObjectURL(a.href);
}
```

Output: `composition.svg`, no fixed dimensions, viewBox only. Opens at any size in any vector application. Grid overlay is excluded.

---

## 10. Validation and edge cases

| Case | Behaviour |
|---|---|
| Pool has 1 module | All cells get that module. Valid. |
| Pool empty | Cannot happen — remove button disabled at 1 item |
| All colors null | Module renders as invisible negative space. Valid. |
| `fgColor` null on custom SVG | `fill="none"` applied to all inner elements — stroke-only rendering |
| cols or rows = 1 | Valid; degenerate single-track grid |
| 24×24 grid (576 cells) | Use `DocumentFragment` for batch DOM appends |
| Custom SVG with no viewBox | Parse from `width`/`height`; last resort `0 0 100 100` |
| Custom SVG with `<script>` | Stripped during sanitization |
| Custom SVG > 100KB | Accepted; inline warning shown in library section |
| Custom SVG deleted while in use | Affected modules fall back to `builtin:square`; inline warning in module item |
| Symmetry on odd grid | Centre row/col not mirrored, just copied through |
| Symmetry + asymmetric waveform | Shape content mirrors by index; cell physical size follows waveform. Expected. |
| Grammar dead-end (all transitions blocked) | Fall back to full pool for that cell; `console.warn` |
| Waveform params changed | Re-render only (no regeneration) |
| Aspect ratio changed | Recompute viewBox + track sizes, re-render; no regeneration |

---

## 11. Deployment

**Vercel** via GitHub integration.

`vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

`vite.config.js` minimal:
```js
import { defineConfig } from 'vite';
export default defineConfig({ build: { outDir: 'dist' } });
```

---

## 12. Out of scope (v1)

- PDF export
- Undo / redo
- Named presets / localStorage persistence
- Seed-based reproducibility
- Module reordering (drag and drop)
- Manual click-and-drag grid sizing
- Animation
- 2D grammar (top-neighbor constraints)
- Custom shape persistence across sessions
- Renaming custom shapes
- User accounts / sharing

---

## 13. Implementation Status

**Status: v1.0 Baseline Built (Phases 1–6 Completed)**

The core features described in this PRD (Phases 1 through 6) have been fully implemented and deployed. This constitutes the v1.0 baseline.

For the historical record of how v1.0 was built, see `docs/archive/implementation-plan.md`.
For active development and upcoming features (Phase 7 onwards), refer to `docs/current-plan.md`.

---

## Appendix A — Authoring custom SVG modules

This guide is for users designing SVG files to upload as custom shapes.

### A.1 Coordinate system

Use a square viewBox. Recommended convention:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- shape here, drawn to fill 0,0 → 100,100 -->
</svg>
```

The generator stretches your shape to whatever cell aspect ratio it needs. A square viewBox minimises unexpected distortion.

**Always include an explicit `viewBox` attribute.**

### A.2 Fill to the edges

For shapes to tile cleanly with neighbours, geometry should reach the viewBox edges where you want a visual boundary.

Full-cell square:
```xml
<svg viewBox="0 0 100 100">
  <rect width="100" height="100" fill="black"/>
</svg>
```

Quarter circle (top-left):
```xml
<svg viewBox="0 0 100 100">
  <path d="M 0,0 L 100,0 A 100,100 0 0 1 0,100 Z" fill="black"/>
</svg>
```

A shape that doesn't reach the edges will appear as a motif floating in the background color — a valid design choice, but be intentional.

### A.3 Base orientation and mirroring

You only author **step 0** (the base orientation). The generator produces steps 1–3 automatically by mirroring:

- step 0: your original
- step 1: left-right mirror
- step 2: 180° (both mirrors)
- step 3: top-bottom mirror

These are **mirrors, not rotations**. A diagonal line from top-left to bottom-right becomes top-right to bottom-left after step 1. For shapes that should look identical in all orientations, design them rotationally symmetric (square, circle, 4-pointed star).

### A.4 Color rules

The app overwrites all colors at render time:

- **All `fill` attributes** → module `fgColor` (or `fill="none"` if null)
- **All `stroke` attributes** → module `strokeColor` (or `stroke="none"` if null)
- **All `stroke-width` attributes** → module `strokeWeight`
- `vector-effect="non-scaling-stroke"` added to all elements

Author with any colors — they will be replaced. Use `stroke-width` to establish visual hierarchy within your shape; a 2-unit stroke in a 100-unit viewBox equals 2% of cell width.

### A.5 What to avoid

- `<script>` and `on*` attributes — stripped during import
- External image/font references — SVG must be self-contained
- Gradients and filters — render fine in SVG export, but may behave unexpectedly in some viewers
- `<pattern>` with IDs — IDs may collide across cells; avoid
- `width`/`height` without `viewBox` — unreliable scaling

### A.6 Reference examples

```xml
<!-- Full-cell square -->
<svg viewBox="0 0 100 100">
  <rect width="100" height="100" fill="black"/>
</svg>

<!-- Diagonal stripe -->
<svg viewBox="0 0 100 100">
  <polygon points="0,0 30,0 100,70 100,100 70,100 0,30" fill="black"/>
</svg>

<!-- Circle touching all edges -->
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="black"/>
</svg>

<!-- Bordered square (stroke visible) -->
<svg viewBox="0 0 100 100">
  <rect x="2" y="2" width="96" height="96" fill="black" stroke="black" stroke-width="4"/>
</svg>

<!-- Floating motif (surrounded by BG color) -->
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="20" fill="black"/>
</svg>
```

### A.7 Upload checklist

- [ ] Explicit `viewBox` attribute present
- [ ] No `<script>` or `on*` attributes
- [ ] No external resource references
- [ ] Geometry reaches viewBox edges (if tiling is intended)
- [ ] Stroke widths set intentionally — they scale with cell size
- [ ] File under 100 KB

---

## 14. Changelog

| Date | Change |
|---|---|
| 2026-04-30 | Initial spec |
| 2026-04-30 | Module system: dynamic pool with per-instance colors |
| 2026-04-30 | Added: noise-driven selection, weights, symmetry modes |
| 2026-04-30 | Added: grammar / global transition matrix |
| 2026-05-01 | Renderer: pre-oriented paths replace rotation transform (fixes non-square cell overflow) |
| 2026-05-01 | Step-based symmetry math (`applyFlipStep`) |
| 2026-05-01 | Added: shape registry, custom SVG upload |
| 2026-05-01 | Added: per-module stroke color + weight; unified color application rule; `vector-effect="non-scaling-stroke"` |
| 2026-05-01 | Added: randomize-all with palette logic |
| 2026-05-01 | Added: Appendix A — authoring guide |
| 2026-05-01 | Track sizing: waveform distributions (Locked/Sawtooth/Sine) replacing manual per-track arrays |
| 2026-05-01 | Canvas model: aspect ratio replaces fixed pixel dimensions; viewBox-only SVG export |
| 2026-05-01 | Removed: PDF export (out of scope v1) |
| 2026-05-01 | Added: collapsible sidebar sections via `<details>/<summary>` |
| 2026-05-01 | Stack simplified: zero runtime npm dependencies |
| 2026-05-04 | Status update: Phases 1–6 (v1.0 baseline) fully implemented |
