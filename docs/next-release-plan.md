# Next-release Simplification Plan (post-v1.2)

> Companion to [`project-specification.md`](./project-specification.md) and the historical [`current-plan.md`](./current-plan.md) (Phases 7 & 8, now shipped). This plan covers a four-item simplification pass on the v1.2 baseline. Read the Specification before starting.

---

## 0. Context and constraints

The v1.2 app is deployed at https://grid-composition-generator.vercel.app. After getting a feel for the live UI, several surfaces are doing more work than they need to. This pass strips them back and pushes the grid distribution further by raising the Max-weight ceiling.

All architectural invariants from the Specification remain in force:

- **Zero runtime npm dependencies.** Vite is dev-only.
- **Native APIs only** for export, clipboard, rasterisation: `Blob`, `URL.createObjectURL`, `XMLSerializer`, `<canvas>`, `navigator.clipboard`, `navigator.share`.
- **HTTPS-only deployment.** `navigator.clipboard` and `navigator.share` are always available.
- **Static SVG output.** Exported SVG carries `viewBox` only, no `width`/`height`.

This pass deletes more than it adds. The default mode for every section below is "remove until it stops mattering, then stop."

---

## 1. Feature overview

| # | Feature | Deployable result |
|---|---|---|
| 1 | Grid Max-weight ceiling raised to 50 | `Max weight` slider/input on each axis accepts up to 50, producing much stronger contrast between large and small tracks. Randomize uses `2..30`. |
| 2 | Built-in shapes hidden from library menu | The "Shape library" sub-block inside the Modules section no longer lists built-in shapes. Built-ins remain available via the per-module shape picker dropdown. The library subsection only displays uploaded custom shapes (with thumbnails). |
| 3 | Aspect-ratio swap, no presets | The six preset buttons (1:1, 4:3, 3:2, 16:9, 2:3, 9:16) are removed. A compact `⇄` icon button placed between the W and H inputs swaps their values in one click. |
| 4 | One-click PNG export | The desktop actions bar gains a single "↓ Export PNG" button that downloads a 1200px PNG immediately. The export dialog and `src/ui/export-dialog.js` are deleted. Mobile share keeps using `navigator.share` with PNG@1200. Copy SVG button remains on desktop. |

---

## 2. Sequencing & rationale

The recommended order minimises rework. Land each as its own commit so a regression can be bisected cleanly.

```
1. Raise Max-weight ceiling     (smallest change, no UI ripple)
2. Hide built-ins from library  (delete-only inside one file)
3. Aspect-ratio swap button     (delete presets, add small icon button)
4. Export simplification        (largest delete; touches 5 files)
```

- **(1) before everything** because it's two number changes — verifying it in isolation is trivial.
- **(2) before (3)** because both touch the sidebar but in unrelated files (`shape-library.js` vs `canvas-setup.js`); doing them sequentially keeps each diff small.
- **(4) last** because it deletes a whole module (`export-dialog.js`) plus a whole `<dialog>` block in `index.html`, plus rewrites the mobile-nav fallback. Doing it last avoids any chance that earlier work depends on the dialog.

Commit prefix suggestion: `simplify:` (e.g. `simplify: raise max weight ceiling to 50`).

---

## 3. Feature 1 — Grid Max weight up to 50

**Goal.** Allow the Max-weight slider/input on each grid axis to reach 50, so unlocked distributions can produce dramatically larger tracks. Bump randomize range too so dice rolls actually use the new headroom.

### Files to modify

```
src/ui/grid-controls.js   ← change max from 10 to 50
src/randomize.js          ← change randInt(2, 10) to randInt(2, 30) for both axes
```

### Key implementation notes

**`src/ui/grid-controls.js:99`** — inside `buildAxisBlock`:

```js
const maxInput = createNumericInput({
  label: 'Max weight', min: 1, max: 50, step: 1, value: getMaxWeight(),
  // ...
});
```

**`src/randomize.js:28,33`** — inside `randomizeAll`:

```js
state.colMaxWeight = randInt(2, 30);
// ...
state.rowMaxWeight = randInt(2, 30);
```

`src/grid.js:getWaveWeight` already treats `max` as the high end of a normalized weight ratio — no algorithmic change required. A higher max means the largest track ratio (`max / min` with `min = 1`) climbs to 50:1 instead of 10:1. The renderer scales tracks proportionally to their summed weight, so visual proportions stay sensible.

### Test checklist

- [ ] Drag the Max-weight slider on Columns to 50 with Distribution = Unlocked → waveform strip and rendered grid show one or two very large tracks and many tiny ones.
- [ ] Type `50` into the number input → value accepted; same effect.
- [ ] Type `60` → clamped to 50.
- [ ] Set Distribution = Locked → Max-weight has no visible effect (all tracks equal — expected).
- [ ] Click Randomize all 10× → Max-weight values sit between 2 and 30, never above 30.
- [ ] No regression on Min/Peak controls or the waveform preview strip.

---

## 4. Feature 2 — Hide built-ins from the library menu

**Goal.** The Modules section's "Shape library" sub-block currently shows a 3-tile grid of built-in shapes (square, triangle, quarter circle) above the custom-uploads list. These are read-only references that don't actually do anything from the menu — selecting a shape happens in each module's per-row dropdown. Remove the built-in grid; the menu becomes custom-only.

### Files to modify

```
src/ui/shape-library.js   ← delete the "Built-in shapes" header + grid block
styles/main.css           ← remove `.shape-lib-builtin-grid` rule (unused after the change)
```

### Key implementation notes

**`src/ui/shape-library.js`** — inside `initShapeLibrary` (currently lines 136–169), delete:

```js
// Built-in shapes (read-only reference)
const builtinHeader = document.createElement('div');
builtinHeader.className = 'shape-lib-section-label';
builtinHeader.textContent = 'Built-in shapes';
wrap.appendChild(builtinHeader);

const builtinGrid = document.createElement('div');
builtinGrid.className = 'shape-lib-builtin-grid';
for (const shape of getBuiltinShapes()) {
  // ... thumbnail construction ...
}
wrap.appendChild(builtinGrid);
```

After the deletion, the `getBuiltinShapes` import at the top of the file becomes unused — drop it (`import { registerCustomShape, removeCustomShape } from '../shapes/index.js';`).

The "Custom shapes" header (still useful as a label since the upload control sits below it) stays as-is.

**`src/ui/module-list.js:140-202`** — the per-module shape picker dropdown (`makeShapePicker`) is **untouched**. Built-ins remain accessible there with their geometric icon previews; custom shapes still get their thumbnails. The icon IS the identity for built-ins, so no UX is lost.

**`styles/main.css`** — remove the `.shape-lib-builtin-grid` rule and any sibling rules that exclusively style built-in tiles. Leave `.shape-lib-section-label`, `.shape-lib-item`, `.shape-lib-thumb`, `.shape-lib-name`, etc. — they are still used by the custom list.

### Test checklist

- [ ] Open the Modules section → no "Built-in shapes" header or grid is visible. The library shows only the "Custom shapes" header, an empty-state message (when no uploads), and the `+ Upload SVG` button.
- [ ] Click a module's shape picker → dropdown shows the "Built-in" group (Square, Triangle, Quarter circle) with their icons, then "Custom" group below.
- [ ] Upload a custom SVG → it appears in the library list with its thumbnail and a × delete button.
- [ ] Delete a custom shape → it disappears from the library list and from the dropdown; any module using it falls back to `builtin:square` per spec §10 (unchanged).

---

## 5. Feature 3 — Aspect-ratio swap, no presets

**Goal.** Replace the row of preset aspect-ratio buttons with a single icon button between the W and H inputs that swaps their values. Designers who want a non-square ratio just type the numbers; flipping landscape ↔ portrait is one click.

### Files to modify

```
src/ui/canvas-setup.js   ← drop PRESETS array + presetsRow loop; insert swap button into arRow
styles/main.css          ← remove .presets-row and .preset-btn rules; add small .ar-swap-btn rule
```

### Key implementation notes

**`src/ui/canvas-setup.js`** — delete the `PRESETS` constant (current lines 5–12) and the entire `presetsRow` block (current lines 65–79).

In the existing `arRow` construction (current lines 35–63), insert a swap button between `w.wrap` and `h.wrap`:

```js
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
  state.aspectWidth  = state.aspectHeight;
  state.aspectHeight = oldW;
  _wInput.value = state.aspectWidth;
  _hInput.value = state.aspectHeight;
  recomputeAndRender();
});

arRow.appendChild(w.wrap);
arRow.appendChild(swapBtn);
arRow.appendChild(h.wrap);
```

**`styles/main.css`** — remove `.presets-row` and `.preset-btn` rules. Add:

```css
.ar-swap-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: 1px solid var(--border-accent);
  color: var(--text-dim);
  cursor: pointer;
  align-self: flex-end; /* aligns with the inputs (which sit beside their labels) */
}
.ar-swap-btn:hover { color: var(--text-bright); border-color: var(--text-dim); }
```

Adjust `align-self` value to match the existing `.ar-row` flex alignment if needed during implementation.

### Test checklist

- [ ] Canvas section shows `W [input] ⇄ H [input]` with no preset row below.
- [ ] Type `W=16, H=9` → canvas re-renders to 16:9.
- [ ] Click the swap button → values become `W=9, H=16`; canvas re-renders to 9:16.
- [ ] Click swap again → back to `W=16, H=9`.
- [ ] `state.aspectWidth` and `state.aspectHeight` remain integers ≥ 1 (the swap can't introduce invalid values because both inputs are validated on change).
- [ ] Show grid checkbox still works (unchanged).

---

## 6. Feature 4 — One-click PNG export

**Goal.** Replace the "Export…" button + dialog flow with a single button that downloads a 1200px PNG immediately. Drop the dialog and its memory of last-used settings. Keep the existing Copy SVG button on desktop. Mobile keeps using `navigator.share` with PNG@1200.

### Files to modify

```
index.html                  ← rename Export button; delete <dialog id="export-dialog"> block
src/main.js                 ← remove initExportDialog import + wiring; new direct-download handler
src/ui/mobile-nav.js        ← drop exportDialog argument; replace fallback with direct download
src/ui/export-dialog.js     ← DELETE FILE
src/export.js               ← remove unused exportSVG() helper
styles/main.css             ← remove dialog rules (#export-dialog, .export-form, .format-group, .png-width-row, .dialog-actions, .png-height-readout)
```

### Key implementation notes

**`index.html`** —

Rename the actions-bar Export button (currently at line 68) from `↓ Export…` to `↓ Export PNG` and change its id from `export-svg` to `export-png` (it no longer exports SVG — we already have Copy SVG). Keep the Copy SVG button as-is.

```html
<button class="btn-secondary" id="copy-svg">⎘ Copy SVG</button>
<button class="btn-secondary" id="export-png">↓ Export PNG</button>
```

Delete the entire `<dialog id="export-dialog">…</dialog>` block (currently lines 93–126).

**`src/main.js`** —

Remove the `initExportDialog` import and the `const exportDialog = initExportDialog();` line. Remove `exportDialog` from the `initMobileNav` call.

Replace the `export-svg` click handler with a direct PNG download (reuses `prepareSVGString` and `exportPNG` from `src/export.js`):

```js
import { prepareSVGString, copySVGToClipboard, exportPNG } from './export.js';
import state from './state.js';

document.getElementById('export-png').addEventListener('click', async () => {
  const xml  = prepareSVGString();
  const blob = await exportPNG(xml, 1200, state.aspectWidth, state.aspectHeight);
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: 'composition.png',
  });
  a.click();
  URL.revokeObjectURL(url);
});
```

(Add a `try/catch` if you want a small inline failure message — optional; the rasterisation pipeline is reliable.)

**`src/ui/mobile-nav.js`** —

The signature changes: `initMobileNav({ canvasAPI, moduleAPI, gridAPI, genAPI })` — drop `exportDialog`.

The current fallback path (`exportDialog.open()`) has nowhere to fall back to anymore. Replace it with a direct download — same code as the desktop handler:

```js
exportBtn.addEventListener('click', async () => {
  try {
    const xml = prepareSVGString();
    const pngBlob = await exportPNG(xml, 1200, state.aspectWidth, state.aspectHeight);
    const file = new File([pngBlob], 'composition.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Grid Composition' });
    } else {
      // Fallback: trigger a download
      const url = URL.createObjectURL(pngBlob);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: 'composition.png',
      });
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch {
    /* swallow — user can retry */
  }
});
```

The `state` import is still needed for aspect ratio. Keep it.

**`src/ui/export-dialog.js`** — delete the file.

**`src/export.js`** — `exportSVG()` (lines 9–18 currently) is unused after this change. Remove it. Keep `prepareSVGString`, `copySVGToClipboard`, and `exportPNG`.

**`styles/main.css`** — delete the entire export-dialog block (currently lines 734–822 or thereabouts):

```
#export-dialog
#export-dialog::backdrop
.export-form
.export-form h2
.form-row
.form-row select, .form-row input[type="number"]
.format-group
.format-group legend
.format-group label
.png-height-readout
.png-width-row.is-hidden
.dialog-actions
```

### Test checklist

- [ ] Desktop: click "↓ Export PNG" → PNG downloads immediately as `composition.png`, 1200px wide, height proportional to aspect ratio.
- [ ] Desktop: click "⎘ Copy SVG" → SVG copied to clipboard (unchanged behaviour).
- [ ] Mobile (or DevTools mobile emulation): tap the export icon in the topbar → native share sheet appears with a 1200px PNG attached.
- [ ] Mobile in a browser without `navigator.canShare({files})` (e.g. desktop emulation) → PNG downloads instead.
- [ ] Pressing Escape doesn't try to close any dialog (there isn't one).
- [ ] No console errors about a missing `export-svg` element or a missing `<dialog>` element.
- [ ] Search the codebase for `export-dialog`, `exportDialog`, `dialog-count`, `dialog-png-width`, `dialog-cancel`, `dialog-copy`, `dialog-download` → zero remaining references.

---

## 7. Risk register

| Risk | Mitigation |
|---|---|
| Mobile-share fallback breaks because the dialog is gone | Replace the fallback with a direct download — see §6. Test in DevTools by spoofing user-agent or simply running on desktop where `navigator.canShare` may return false. |
| `state` import in `mobile-nav.js` flagged as unused | It's still needed for aspect ratio in the share path — verify it stays imported after the edit. |
| Randomize stays at the old 2..10 ceiling | Update **both** `state.colMaxWeight` and `state.rowMaxWeight` lines in `randomize.js` (currently lines 28 and 33). |
| Max weight = 50 with high cell count produces very thin tracks | Expected. The waveform strip preview gives a live indication. No code change needed; user-facing concern only. |
| Removing `getBuiltinShapes` import in `shape-library.js` leaves a stale reference | After deletion, run the dev server and confirm no console error on Modules section render. |
| Stale CSS selectors after deletes | Use `grep -rn "preset-btn\|presets-row\|export-dialog\|shape-lib-builtin-grid\|export-form\|format-group\|png-width-row\|dialog-actions\|png-height-readout"` against `src/` and `index.html` to confirm no live references remain. |
| Accidentally deleting the `<dialog>` polyfill assumption | We never had one — Specification §0 / §3 confirms native `<dialog>` only. |

---

## 8. Out of scope (this pass)

- Returning to a Format chooser, batch generations, or PNG width slider on desktop — explicitly removed.
- Bringing back aspect-ratio presets in any form.
- Persisting any state to `localStorage` (e.g. last aspect, last Max weight).
- Rotating, scaling, or transforming custom shapes from the library menu.
- Drag-and-drop reordering of modules.
- New shape types or shape grouping.

---

## 9. Consolidated end-to-end test checklist

Run the dev server (`npm run dev`) and verify in a desktop browser:

- [ ] **Max weight**: Columns and Rows both accept Max weight up to 50; clamps above 50.
- [ ] **Randomize all**: Click 10× → Max-weight values stay within `2..30`.
- [ ] **Library menu**: No built-in shapes shown in the library subsection inside Modules.
- [ ] **Per-module dropdown**: Built-ins (square, triangle, quarter circle) still selectable with their icons.
- [ ] **Custom upload**: Uploading an SVG still adds it to the library list and to all dropdowns.
- [ ] **Aspect ratio**: Swap button between W and H exchanges values; canvas re-renders proportionally.
- [ ] **Export PNG**: Single click → 1200px PNG downloads with correct aspect ratio.
- [ ] **Copy SVG**: Still works on desktop; pasted into Figma it renders correctly.
- [ ] **Mobile share**: In mobile emulation or on a real phone, the export icon opens the native share sheet with a 1200px PNG.
- [ ] **No regressions**: Generate, Randomize all, sidebar collapsibles, grammar matrix, About link, mobile drawer all still work.
- [ ] **Static checks**: `grep` for the deleted ids/classes returns no live references.

---

## 10. Done criteria

This pass ships when:

- All four features merged to `main` (one commit per feature).
- Vercel preview verified on:
  - Desktop Chrome (1440×900)
  - Mobile Safari iOS (or DevTools emulation)
  - Mobile Chrome Android (DevTools emulation)
- The §9 consolidated checklist passes.
- No regressions against Specification §10 edge cases.
- README updated if any user-facing wording referenced the export dialog or the preset buttons.
- Tag commit `v1.3`.

---

## 11. AI agent session prompt

```
I'm continuing the Grid Composition Generator on the simplification pass.

Read these in order before writing code:
  - docs/project-specification.md  (source of truth)
  - docs/next-release-plan.md      (this plan)

Today, do feature [1/2/3/4] only — do not stray into others.
Architectural invariants stand: zero runtime npm deps, native APIs only,
HTTPS-only deployment.

Commit as "simplify: <feature>".
```

If the agent drifts mid-session, cite the section number from this plan
(e.g. "next-release-plan.md §6 says delete `src/ui/export-dialog.js`, not refactor it").
