# v1.3 QA Test Plan

Manual verification checklist for the `simplify/v1.3-pass` branch.  
Local env: `npm run dev` → [http://localhost:5173](http://localhost:5173)

Check each box as you go. If anything fails, note the step and what happened.

---

## 1. Max weight ceiling → 50

- [x] Grid section → Columns → Distribution = Unlocked → drag Max weight slider to 50 → strip and grid show strong contrast (a few large tracks, many tiny ones)
- [x] Type `50` into the Max-weight number input → accepted
- [x] Type `60` → clamps to 50
- [x] Type `0` → clamps to 1
- [x] Distribution = Locked → Max weight control is disabled and has no visual effect
- [x] Repeat the above for the **Rows** axis
- [x] Click "⚂ Randomize all" 10× → no console errors; compositions vary; Max-weight values land in 2–30 range
- [x] Min/Peak controls and waveform preview strip still work normally

## 2. Built-in shapes hidden from library menu

- [x] Open Modules section → shape library shows only: divider, "Custom shapes" header, "No custom shapes uploaded yet." empty state, "+ Upload SVG" button, "Max 100 KB" hint — **no** "Built-in shapes" header or tile grid
- [x] No console errors on page load
- [x] Click a module's shape-picker dropdown → built-ins (Square, Triangle, Quarter circle, Circle) are still listed with icons
- [ ] Upload a custom SVG → appears in the library list with thumbnail and × delete button; empty state disappears
- [ ] Delete that custom shape → disappears from library and dropdown; any module using it falls back to `builtin:square`

## 3. Aspect-ratio swap button

- [x] Canvas section shows `W [input] ⇄ H [input]` on one row, swap button vertically centered — no preset buttons anywhere
- [x] Type `W=16, H=9` → canvas re-renders 16:9
- [x] Click ⇄ → values become `W=9, H=16`, canvas re-renders portrait
- [x] Click ⇄ again → back to 16:9
- [x] Swap with an Unlocked distribution active → track sizes recompute (waveform strips update)
- [x] "⚂ Randomize all" then swap → still consistent, no errors

## 4. Direct PNG export, dialog removed

- [x] Desktop: click "↓ Export PNG" → `composition.png` downloads immediately, 1200px wide, height proportional to aspect ratio (e.g. 16:9 → 1200×675) — open the file to confirm it renders
- [x] Desktop: click "⎘ Copy SVG" → "✓ Copied!" feedback shown; paste into a text editor → SVG markup with `viewBox`, no `width`/`height`, no `grid-overlay` group
- [x] DevTools mobile emulation: tap the topbar export icon → PNG downloads directly (emulation lacks `navigator.canShare({files})`, so it takes the fallback path)
- [ ] Real phone or share-capable browser, if available: export icon opens the native share sheet with the PNG attached
- [x] Press Escape → no errors (mobile drawer close handler still works; no dialog exists anymore)
- [x] Console stays clean of errors through all of the above

## 5. README

- [x] Skim README.md — aspect ratio bullet mentions the ⇄ swap, not presets; export bullets mention Copy SVG + PNG export, not "Export SVG"

## 6. Regression sweep (things v1.3 shouldn't have touched)

- [x] "Generate" button produces a new composition
- [x] Sidebar `<details>` sections collapse/expand and persist across reload (sessionStorage)
- [x] Grammar matrix (Generation section) still opens and toggles correctly
- [x] About section / link still works
- [x] Mobile emulation: drawer open/close, dice (randomize), Generate button, export icon — all functional

## Build sanity

- [x] `npm run build` succeeds
- [x] `npm run preview` serves a working app at the printed local URL

---

## Static sweep (already run, included for reference — should return nothing)

```
grep -rn "preset-btn\|presets-row\|export-dialog\|shape-lib-builtin-grid\|export-form\|format-group\|png-width-row\|dialog-actions\|png-height-readout" src/ styles/ index.html
```
