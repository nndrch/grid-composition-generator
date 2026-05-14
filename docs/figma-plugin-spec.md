# Figma Plugin — Specification

> Companion to [`project-specification.md`](./project-specification.md). Describes the Figma plugin build target, a parallel deliverable to the web app at https://grid-composition-generator.vercel.app.

---

## 0. Context

The web app's primary output is SVG — a transport format. Users download it and re-import it into Figma/Illustrator to keep working. The Figma plugin removes that round-trip: the generator's output becomes native, editable Figma layers in the user's current file, on demand.

The web app stays live and unchanged. The plugin is an additional distribution channel reaching users who already live in Figma.

---

## 1. Goals & non-goals

### Goals

- Full feature parity with the v1.2 web app's **generation** surface: module pool, all built-in shapes, custom SVG upload, noise-driven generation, symmetry modes, grammar transitions, grid waveforms, aspect-ratio control, randomize-all.
- Output is **native Figma scene nodes** — every cell shape is an editable vector path, not a flattened image or embedded SVG.
- Zero-friction launch: plugin opens, user clicks Generate, a frame appears. No prior canvas state required.
- Reuse the existing pure generation core by direct import — no vendoring, no fork.

### Non-goals (explicit cuts vs. web)

- **No download / export buttons.** Figma's native menu (`File → Export…`, or Cmd+Shift+E on a selected frame) covers PNG / SVG / PDF / JPG. The plugin must not duplicate this.
- **No "Copy as SVG" / "Copy as PNG" buttons.** Same reason — Figma's "Copy as…" right-click menu covers it.
- **No mobile UI.** Plugins run on desktop Figma only.
- **No "show grid overlay" toggle in v1.** Figma has rulers and snapping; defer until users ask.

---

## 2. Architecture

Figma plugins have two execution contexts that exchange messages:

| Context | Capabilities | Limitations |
|---|---|---|
| **Sandbox** (`code.ts`) | `figma.*` scene-graph API, `figma.clientStorage` | No DOM, no `fetch`, no `DOMParser`, no `localStorage`, Realm-isolated VM |
| **UI iframe** (`ui.html` + `ui.ts`) | Full DOM, `DOMParser`, `FileReader`, `postMessage`, hand-written CSS | No direct `figma.*` access |

Communication is `postMessage` in both directions. All UI rendering and SVG sanitization happens in the iframe; all scene-node creation happens in the sandbox.

---

## 3. Code organization

The plugin lives **inside the existing repo** at `figma-plugin/`. It builds independently and consumes the shared generation core by relative import.

```
grid-composition-generator/                   # existing repo root
├── src/                                      # existing web app (unchanged)
│   ├── noise.js, grammar.js, symmetry.js,    # ← shared, imported by plugin
│   │   grid.js, generate.js, randomize.js
│   └── shapes/
│       ├── built-in.js                       # ← shared (pure path-data strings)
│       ├── custom.js                         # ← shared (DOMParser; iframe-only)
│       └── index.js                          # ← shared registry
└── figma-plugin/                             # NEW
    ├── manifest.json
    ├── package.json
    ├── tsconfig.json                         # allowJs: true, checkJs: false
    ├── vite.config.ts                        # two entries: code + ui
    ├── src/
    │   ├── code.ts                           # SANDBOX entry
    │   ├── ui.html
    │   ├── ui.ts                             # UI bootstrap
    │   ├── ui.css                            # ported from ../styles/
    │   ├── render.ts                         # Figma-node renderer (replaces ../src/render.js)
    │   ├── types.ts                          # postMessage payload types
    │   └── ui/                               # ported control components (TS)
    │       ├── canvas-setup.ts
    │       ├── generation-controls.ts
    │       ├── grid-controls.ts
    │       ├── grammar-matrix.ts
    │       ├── module-list.ts
    │       ├── numeric-input.ts
    │       └── shape-library.ts              # owns DOMParser sanitization
    └── dist/                                 # build output
        ├── code.js
        └── ui.html
```

`tsconfig.json` sets `"allowJs": true, "checkJs": false` so the TS plugin code can import the existing JS core without forcing a rewrite. Two top-level scripts on the repo's `package.json`:

- `npm run dev` — web app (unchanged)
- `npm run plugin:build` — `cd figma-plugin && vite build`

---

## 4. Feature parity matrix

| Web feature | In plugin? | Implementation notes |
|---|---|---|
| Module pool (add/remove, fg/bg/stroke colors, weight) | ✅ Full parity | Port [`src/ui/module-list.js`](../src/ui/module-list.js) into TS, keep CSS |
| Built-in shapes (QC, Square, Triangle, Circle × 4 steps) | ✅ Full parity | Reuse [`src/shapes/built-in.js`](../src/shapes/built-in.js) path-data builders |
| Custom SVG upload | ✅ Full parity | See §5 |
| Noise-driven generation | ✅ Full parity | Reuse [`src/noise.js`](../src/noise.js) + [`src/generate.js`](../src/generate.js) |
| Symmetry: Mirror X / Mirror Y / 4-fold | ✅ Full parity | Reuse [`src/symmetry.js`](../src/symmetry.js) |
| Grammar transitions matrix | ✅ Full parity | Reuse [`src/grammar.js`](../src/grammar.js) + port [`grammar-matrix.js`](../src/ui/grammar-matrix.js) |
| Grid waveforms (locked / unlocked, peak, max-weight up to 50) | ✅ Full parity | Reuse [`src/grid.js`](../src/grid.js) + port [`grid-controls.js`](../src/ui/grid-controls.js) |
| Aspect-ratio control + swap (no presets, per v1.2) | ✅ Full parity | Drives default frame size; see §6 |
| Randomize all | ✅ Full parity | Reuse [`src/randomize.js`](../src/randomize.js) |
| SVG download | ❌ Cut | Figma native Export |
| PNG export / Copy SVG / Share | ❌ Cut | Figma native Export / Copy as… |
| Grid overlay toggle | ❌ Cut (v1) | Figma rulers/snapping |
| Mobile nav | ❌ Cut | Desktop only |

---

## 5. Custom shapes — SVG upload only

Parity with the web app's approach. **No "pick from Figma selection"** in v1 (deferred — promising but adds API surface and edge cases like converting arbitrary Figma vector nodes to a normalized SVG).

### Ingest flow

1. User clicks **Upload SVG** in the plugin's Shape Library panel (ported from [`src/ui/shape-library.js`](../src/ui/shape-library.js)).
2. UI iframe opens a native file picker (`<input type="file" accept=".svg">`).
3. `FileReader.readAsText` reads the file contents in the iframe.
4. **In the iframe**, run the existing [`src/shapes/custom.js`](../src/shapes/custom.js) `ingestSvg()` function:
   - Parse via `DOMParser` (available in iframe).
   - Sanitize: remove `<script>` elements and all `on*` attributes.
   - Extract `viewBox` (or fall back to `width`/`height`, or 100×100 default).
   - Return `{ id, name, type: 'custom', svgContent, viewBox }`.
5. UI iframe `postMessage`s the sanitized shape record to the sandbox.
6. Sandbox stores it in an in-memory registry keyed by `id` for use during rendering.

### Sanitization invariant

`DOMParser` exists **only in the iframe**. The sandbox can never receive raw user-supplied SVG strings. The sanitized output crossing the postMessage boundary is the security contract; any future code path that would let raw SVG reach `figma.createNodeFromSvg` in the sandbox is a bug.

### Persistence

**Session-only** (matches the web app — custom shapes live in an in-memory `Map` in [`src/shapes/index.js`](../src/shapes/index.js) and are not persisted to `localStorage`). Closing and reopening the plugin clears the custom shape registry. The user re-uploads if needed. This is a deliberate choice to match web behavior and avoid stale-shape edge cases.

If a saved plugin state references a custom shape ID that no longer exists in the registry on next launch, the renderer treats those cells as empty (no shape drawn; background still applies).

---

## 6. Frame creation — no canvas state required

The plugin **must work on an empty file**. The user does not need to select or create a frame before launching.

### Default frame placement

On every ↻ Generate click:

1. Read the current aspect-ratio inputs from the UI (`aspectWidth`, `aspectHeight`, e.g. `1:1` or `16:9`).
2. Compute frame dimensions: scale the aspect ratio so its **long edge is 800 px**.
   - `1:1` → 800 × 800
   - `16:9` → 800 × 450
   - `4:3` → 800 × 600
   - `2:3` → 533 × 800
3. Create a `FrameNode` of that size via `figma.createFrame()`.
4. Position it using `figma.viewport.center` — the frame is placed centered on whatever the user is currently looking at, so it's always visible regardless of where they are in the file.
5. Parent it to `figma.currentPage` (no selection required).
6. Name it `Grid Composition N` where `N` is a running counter for the session.
7. After placement, call `figma.viewport.scrollAndZoomIntoView([newFrame])` so the user always sees the result.

### Generate behavior — append

Each ↻ Generate creates a **new sibling frame** placed to the right of the previously generated frame (with a 32 px gap), or wraps to a new row when the row gets wide. The plugin tracks the bounding box of the most recently placed frame in a sandbox-side module variable. Reopening the plugin resets this tracker (next frame placed at viewport center again).

This lets users compare variants side-by-side without losing any prior output.

### Selection-aware behavior (deferred to v2)

If the user has a frame selected, future v2 may "draw into" that frame instead of creating a new one. Out of scope for v1 — too much edge-case surface (sizing, clearing existing children, undo behavior).

---

## 7. Generation pipeline (sandbox side)

On receiving `{ type: 'generate', state }` from the UI:

1. Run `generate(state)` from [`src/generate.js`](../src/generate.js) — produces `_grid`, `_colSizes`, `_rowSizes`. This is unchanged web logic.
2. Compute frame dimensions per §6.
3. Create the parent `FrameNode`. Set `clipsContent = true`. Apply a fill if any module has a background; otherwise transparent.
4. For each `(row, col)` in `_grid`:
   - Create a cell `FrameNode` of size `_colSizes[col] × _rowSizes[row]` at the appropriate offset, with `clipsContent = true` (mirrors the web's nested `<svg overflow="hidden">`).
   - If `mod.bgColor != null`, add a `RectangleNode` background.
   - For built-in shapes: call `shape.pathFn(w, h, step)` to get the path-data string, wrap in `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><path d="..."/></svg>`, pass to `figma.createNodeFromSvg()`, then walk the result and apply fill/stroke/strokeWeight from the module config.
   - For custom shapes: wrap `shape.svgContent` in an SVG envelope sized to `shape.viewBox`, call `createNodeFromSvg`, scale the result via the parent cell frame's size, apply step mirroring via `relativeTransform` (matching the `STEP_TRANSFORMS` table at [`src/render.js:13`](../src/render.js#L13)), apply colors to all descendants.
5. Append the parent frame to `figma.currentPage` and scroll into view.

The renderer is the **only** file in the plugin that touches `figma.*` scene APIs. All generation logic stays pure and shared with the web app.

---

## 8. UI panel

A single `ui.html` iframe hosts the entire control panel. Ports the existing hand-written CSS from `/styles` directly. Panel sections, top to bottom:

1. **Canvas** — aspect ratio W/H inputs with swap `⇄` button (no presets, per v1.2)
2. **Modules** — module list (add/remove, per-module shape picker, fg/bg/stroke colors, weight)
3. **Shape Library** — custom SVG upload (built-ins are hidden from the library list, per v1.2; they remain selectable via the per-module dropdown)
4. **Generation** — randomize-all `⚂`, noise scale, symmetry mode, rotation toggle
5. **Grid** — cols/rows counts, waveform (locked/unlocked) per axis, peak, max-weight (up to 50)
6. **Grammar** — N×N transition matrix (when enabled)
7. **Action bar** — single `↻ Generate` button. No export buttons.

Each control sends a typed `postMessage` to the sandbox on commit. The sandbox holds canonical state; the UI is purely a view layer. This is a cleaner separation than the web app (which mutates a shared `state` object) but doesn't require rewriting the controls — only their event handlers.

---

## 9. Persistence

Plugin settings (everything in the web app's [`src/state.js`](../src/state.js) except the in-memory `_grid` / `_colSizes` / `_rowSizes` / `_noiseSeed`) are persisted via `figma.clientStorage.setAsync('grid-comp-state', stateSnapshot)` on every generate. Restored on plugin launch.

This matches the web app's `localStorage` behavior. Custom shapes are explicitly **not** persisted (see §5).

Storage key namespace: `gcg/v1/state` — versioned so future schema changes can migrate or reset cleanly.

---

## 10. Manifest

```json
{
  "name": "Grid Composition Generator",
  "id": "<assigned by Figma on publish>",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "networkAccess": { "allowedDomains": ["none"] }
}
```

`networkAccess: none` keeps parity with the web app's zero-runtime-dependency posture — the plugin is fully offline.

---

## 11. Distribution

- **Local dev**: Figma desktop → Plugins → Development → Import plugin from manifest → point at `figma-plugin/manifest.json`.
- **Publishing**: Figma Community listing once the v1 surface is stable. Free, public.
- **Versioning**: independent SemVer from the web app. Plugin v1.0.0 corresponds to web v1.2.x feature parity (minus export).

---

## 12. Open questions

These are flagged for future revisits, not v1 blockers:

1. **v2 selection-aware mode**: if a frame is selected, draw into it instead of creating a new sibling. UX needs: clear existing children? Resize? Confirm dialog?
2. **v2 "pick shape from Figma selection"**: let users add a custom shape by selecting any vector node in the file and clicking "Add as shape" — bypasses the SVG upload step entirely. Requires a shape-extraction layer that converts arbitrary Figma `VectorNode` data into the plugin's normalized `{svgContent, viewBox}` format.
3. **Custom shape persistence**: if users complain about re-uploading per session, persist via `clientStorage` with a size cap (Figma `clientStorage` has a 5 MB total quota per plugin).
4. **Grid overlay**: bring back the toggle if users miss it. Would render via `figma.createLine()` nodes inside the parent frame, on a sublayer flagged as locked.

---

## 13. Verification

End-to-end checks before considering v1 done:

1. **Empty file launch** — open a fresh Figma file with no frames, run the plugin, click ↻ Generate → a frame appears at viewport center, sized per aspect ratio.
2. **Built-in shapes** — cycle each shape (QC / Square / Triangle / Circle) through all 4 step variants → confirm Figma frame contents are true vectors (select a path, the pen tool can edit it).
3. **Custom SVG upload** — upload a clean SVG → renders. Upload one with `<script>` tags and `onload="alert(1)"` attributes → confirm the script/handlers are stripped before reaching the sandbox.
4. **Stroke weight** — change a module's stroke weight → re-generate → confirm Figma stroke matches.
5. **Append behavior** — click ↻ Generate three times → three sibling frames named `Grid Composition 1/2/3` appear in a row.
6. **Randomize** — ⚂ Randomize all → a fresh variant appends; previous frames remain untouched.
7. **Persistence** — close plugin, reopen → settings restored; custom shapes cleared.
8. **No export UI** — confirm no Export / Download / Copy buttons anywhere in the panel.
9. **Figma-native export** — select a generated frame, use `File → Export → SVG` → produces clean SVG (this is a sanity check on the scene graph being well-formed, not a plugin feature).
