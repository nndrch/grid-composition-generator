# Implementation Plan v1.0

> Companion to `grid-composition-prd.md`. The PRD says **what**; this doc says **how and when**. Each phase produces a working, deployable app. Read the PRD before reading this.

---

## 1. Repo and tooling setup (one-time, before Phase 1)

### GitHub

Create a new public repo: `grid-composition-generator`. Do not initialize with a README — Claude Code will create everything.

### Vercel

1. Sign in to vercel.com with GitHub
2. Import the repo — Vite is auto-detected
3. Build command: `npm run build`, output directory: `dist`
4. Deploy. First deploy will be a blank page until Phase 1 ships.

Every push to `main` auto-deploys. Each PR gets a preview URL.

### Branching convention

One branch per phase: `phase-1-scaffold`, `phase-2-engine`, etc. PR to `main` at phase end. Vercel previews each PR.

---

## 2. Phase overview

| Phase | Focus | Deployable result |
|---|---|---|
| 1 | Project scaffold | Blank two-column shell live on Vercel |
| 2 | Core engine | Composition generates and renders |
| 3 | Full UI | All controls wired, PoC parity + new features |
| 4 | Custom SVG upload | Shape library with user uploads |
| 5 | Waveform grid controls | Rhythmic track sizing |
| 6 | Polish + export | Numeric inputs, randomize, SVG export, v1.0 |

---

## 3. Phase 1 — Project scaffold

**Goal.** Vite project that builds locally and deploys to Vercel. Two-column layout shell, no functionality.

**Files to create:**
```
package.json          ← { "devDependencies": { "vite": "latest" }, "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" } }
vite.config.js        ← minimal: defineConfig({ build: { outDir: 'dist' } })
vercel.json           ← { "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
.gitignore            ← node_modules, dist
index.html            ← two-column shell with sidebar + canvas area, CDN IBM Plex Mono
styles/main.css       ← layout: sidebar 350px fixed left, canvas area flex-grow
src/main.js           ← empty entry point
README.md             ← local dev instructions
```

**Sidebar structure in `index.html`:**
```html
<aside class="sidebar">
  <details class="sidebar-section" open>
    <summary class="section-label">Canvas</summary>
    <!-- placeholder -->
  </details>
  <details class="sidebar-section" open>
    <summary class="section-label">Modules</summary>
  </details>
  <details class="sidebar-section" open>
    <summary class="section-label">Grid</summary>
  </details>
  <details class="sidebar-section">
    <summary class="section-label">Generation</summary>
  </details>
  <div class="sidebar-section sidebar-section--actions">
    <button class="btn-primary" id="generate">↻ Generate</button>
    <button class="btn-secondary" id="randomize">⚂ Randomize all</button>
    <button class="btn-secondary" id="export-svg">↓ Export SVG</button>
  </div>
</aside>
<main class="canvas-area">
  <div class="canvas-frame">
    <svg id="canvas-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g id="cells"></g>
      <g id="grid-overlay"></g>
    </svg>
  </div>
</main>
```

**Claude Code prompt:**
> I'm starting the Grid Composition Generator. I'll give you `grid-composition-prd.md` and `implementation-plan.md` — read both before writing any code. For this session only do Phase 1: scaffold the Vite + vanilla JS project per the PRD §2 and §3. Create `package.json` with vite as the only dependency. Build the two-column layout shell with collapsible `<details>` sidebar sections per PRD §4.1. No functionality. The canvas area shows an empty `<svg id="canvas-svg">`. Style is minimal but must match the sidebar section structure exactly — later phases will fill each section. Commit as "phase 1: project scaffold".

**Test checklist:**
- `npm install` → ok
- `npm run dev` → page renders with sidebar + empty canvas
- `npm run build` → `dist/` produced
- Push → Vercel deploys successfully
- All 4 `<details>` sections open/close

---

## 4. Phase 2 — Core engine

**Goal.** Working composition generation and render. Hardcoded module pool, no UI controls yet.

**Files to create:**
```
src/state.js
src/shapes/index.js
src/shapes/built-in.js
src/grid.js
src/noise.js
src/symmetry.js
src/grammar.js
src/generate.js
src/render.js
src/main.js            ← wire generate() on load + Generate button click
```

**Key implementation notes:**

- `state.js` exports the full state object from PRD §6.2. Hard-code 2 module instances as defaults.
- `shapes/built-in.js`: implement `shapePathD(shape, w, h, step)` per PRD §5.3. Four step variants per shape. No rotation transforms anywhere.
- `grid.js`: implement `computeTrackSizes` and `getWaveWeight` per PRD §6.3. Default state uses `'locked'` waveform so initial output is a uniform grid.
- `generate.js`: implement `generate()` per PRD §6.5. Uses `smoothNoise`, `filterByGrammar`, `noiseWeightedPick`, `resolveSource`, `applyFlipStep`.
- `render.js`: `render()` reads `state._grid` and `state._colSizes`/`state._rowSizes`, builds cells with `DocumentFragment`, appends to `#cells`. Built-in shapes render as `<path>` with forceful fill/stroke/strokeWeight and `vector-effect="non-scaling-stroke"`.
- `main.js`: import and call `generate()` then `render()` on load. Wire the Generate button.

**Claude Code prompt:**
> Phase 2: core engine. Read PRD §5.2, §5.3, §6.2–6.8 carefully. Implement `src/state.js` (full state object), `src/shapes/index.js` (registry), `src/shapes/built-in.js` (shapePathD with 4 step variants — no rotation transforms, per PRD §5.3), `src/grid.js` (computeTrackSizes + getWaveWeight, per PRD §6.3), `src/noise.js`, `src/symmetry.js`, `src/grammar.js`, `src/generate.js`, `src/render.js`, and update `src/main.js` to call generate + render on load and on Generate button click. Hard-code 2 modules in state (a quarterCircle and a triangle). Grid starts 8×8 locked waveform. No sidebar controls yet. Commit as "phase 2: core engine".

**Test checklist:**
- Page loads and shows a composition
- Generate button reshuffles
- Quarter circles: all 4 step orientations present, none overflow their cell
- Triangles: same
- 8×8 grid is uniform (locked waveform)
- No `rotate()` transforms anywhere in the generated SVG

---

## 5. Phase 3 — Full UI

**Goal.** All sidebar controls wired. Feature parity with the PoC, plus the new features (stroke, collapsible sections, aspect ratio, waveform preview strips). No custom SVG upload yet.

**Files to create/modify:**
```
src/ui/numeric-input.js    ← shared slider+number component
src/ui/canvas-setup.js     ← aspect ratio inputs, preset buttons, show grid toggle
src/ui/module-list.js      ← pool list, shape picker, Ø buttons, FG/BG/stroke/weight
src/ui/grammar-matrix.js   ← matrix table, All/All off/Identity shortcuts
src/ui/grid-controls.js    ← cols/rows waveform controls, preview strip
src/ui/sidebar.js          ← composes all sections
src/randomize.js           ← randomize-all + palette generation
src/export.js              ← SVG export (PRD §9)
src/main.js                ← wire everything
```

**Key implementation notes:**

`numeric-input.js`: factory `createNumericInput({ min, max, step, value, label, onChange })` — returns a DOM fragment with a label, a range slider, and a number input, both wired bidirectionally.

`canvas-setup.js`: W and H number inputs (integers ≥ 1). Preset buttons (1:1, 4:3, etc.) set both and trigger re-render. Show grid checkbox toggles `#grid-overlay`.

`module-list.js`: render the pool as a dynamic list. Each item has:
- Shape picker button (dropdown of built-ins for now; phase 4 adds customs)
- FG / BG / STR color inputs + Ø buttons. Ø button sets field to `null`; when null, input is visually dimmed. Color input change updates DOM in-place without regenerating.
- Stroke weight number input (0–20)
- Weight slider + number (1–10)
- Remove button (disabled when pool has 1 item)
- Live 36×36 preview SVG

`grid-controls.js`: per axis — count slider+number, waveform dropdown, min/max sliders+numbers (disabled when locked), peak slider+number (disabled when locked). Below each: a visual preview strip of proportional bars computed from the current waveform. Strip updates live as sliders move. Count change triggers `generate()`. Waveform param changes trigger `render()` only.

`randomize.js`: implements PRD §8 exactly. Palette logic: HSL hue + 3 tones + neutral probability.

`export.js`: implements PRD §9 exactly. No `width`/`height` on exported SVG.

**Claude Code prompt:**
> Phase 3: full UI. Reference the PoC file `poc.html` if provided, and PRD §7, §8, §9. Create all `src/ui/*.js` files. Implement `src/randomize.js` per PRD §8. Implement `src/export.js` per PRD §9. Wire everything in `src/main.js`. Skip custom SVG upload — the shape picker only shows the 3 built-ins for now. The waveform preview strips must update live. Color changes must update the canvas in-place (no regenerate). Commit as "phase 3: full UI".

**Test checklist:**
- All `<details>` sections open/close with correct default states
- Aspect ratio presets change the SVG aspect-ratio visually
- Module add/remove works; minimum 1 enforced
- Ø button sets color to null; picker dims; canvas updates
- Stroke weight changes update canvas in-place
- Grammar matrix All/None/Identity buttons work
- Waveform type dropdown enables/disables min and peak controls correctly
- Waveform preview strip updates live
- Waveform param change = re-render only (composition stays)
- Randomize changes all correct params per PRD §8; preserves aspect ratio and pool shapes
- SVG export downloads; file has no width/height attributes; opens in Figma/Illustrator

---

## 6. Phase 4 — Custom SVG upload

**Goal.** Users can upload SVG files; they appear in the shape registry and are selectable in the module shape picker.

**Files to create/modify:**
```
src/shapes/custom.js       ← ingest, sanitize, register
src/shapes/index.js        ← extend registry with custom entries
src/ui/shape-library.js    ← upload UI, custom list with thumbnails + delete
src/ui/module-list.js      ← shape picker now includes custom shapes
src/render.js              ← dispatch built-in vs custom rendering path
```

**Key implementation notes per PRD §5.4:**

Sanitize: `DOMParser` → traverse all elements → remove `<script>`, strip all `on*` attributes. Reject if root element is not `<svg>`.

Color application at render time: clone inner DOM, traverse all descendants, set `fill`, `stroke`, `stroke-width`, `vector-effect` per the module's values.

Step transforms for custom shapes are pure scale mirrors (PRD §5.4). No overflow.

Custom shape thumbnail in library: render the shape at step 0 scaled to 36×36.

Shape picker: when a module's shape picker opens, list all registry entries grouped: Built-ins / Custom. Custom entries show the filename-derived name.

Deletion: remove from registry, update any module using that shapeId to `builtin:square`, show inline warning in that module item.

**Claude Code prompt:**
> Phase 4: custom SVG upload. Implement per PRD §5.4. Create `src/shapes/custom.js` for ingest + sanitization. Update `src/shapes/index.js` to manage both built-in and custom registry entries. Create `src/ui/shape-library.js` for the upload button + custom list (thumbnails + delete). Update `src/ui/module-list.js` so the shape picker lists customs too. Update `src/render.js` to dispatch by shape type. Color application must forcefully overwrite fill, stroke, stroke-width, and add vector-effect="non-scaling-stroke" to all inner elements per PRD §5.1. Commit as "phase 4: custom SVG upload".

**Test checklist:**
- Upload a minimal square SVG → appears in library and picker
- Assign it to a module → renders in canvas
- All 4 step orientations render correctly (mirror transforms, not rotation)
- FG color change recolours the custom shape in-place
- Upload SVG with `<script>` → stripped, no console errors
- Delete a shape in use → affected module falls back to builtin:square with warning
- File > 100KB → accepted with warning
- Non-SVG file → rejected with inline error

---

## 7. Phase 5 — Waveform grid controls (already in Phase 3)

Waveform controls are part of Phase 3. No separate phase needed — `computeTrackSizes` is implemented in Phase 2 and the UI is wired in Phase 3.

If additional waveform types are added in the future, `grid.js` is the only file to modify.

---

## 8. Phase 6 — Polish and v1.0

**Goal.** QA pass, edge cases, performance, README, tag v1.0.

**Polish checklist:**
- 24×24 grid + 8 modules: compose + render under 300ms
- All edge cases from PRD §10 confirmed
- Keyboard accessibility: all interactive elements focusable, all buttons have labels
- `<details>` open/close state persisted in `sessionStorage` (nice-to-have)
- README updated with live URL and 3 screenshots
- `vercel.json` confirmed correct
- Tag commit `v1.0`

**Claude Code prompt:**
> Phase 6: polish and v1.0. Run through every case in PRD §10. Performance test at 24×24 with 8 modules. Fix any regressions. Ensure all interactive elements are keyboard accessible. Update README.md with the live Vercel URL and usage screenshots. Commit as "phase 6: polish" and tag v1.0.

---

## 9. Working with Claude Code — session conventions

**Start of every session:**
```
I'm continuing the Grid Composition Generator.
Read grid-composition-prd.md and implementation-plan.md before doing anything.
Today we're doing Phase [N]: [paste phase prompt above].
```

**Mid-session drift:** if Claude Code strays from the spec, cite the PRD section number: "PRD §5.3 says no rotation transforms — please use the pre-oriented path variants."

**End of session:** ask Claude Code to summarize what was done, what's untested, and what's deferred. Then: commit → push → open PR → review Vercel preview → merge.

---

## 10. Local dev

```bash
npm install       # install vite
npm run dev       # hot-reload dev server at localhost:5173
npm run build     # production build → dist/
npm run preview   # serve dist/ locally
```
