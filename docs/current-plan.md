# Phase 7 & 8 Implementation Plan

> Companion to `project-specification.md` and `implementation-plan.md`. Phases 7 and 8 add new features on top of the v1.0 baseline. Read the Specification before starting.

---

## 0. Context and constraints

The v1.0 app (Phases 1–6) is deployed at https://grid-composition-generator.vercel.app. It is a desktop-only, two-column layout (350px sidebar + canvas area). All architectural invariants from the Specification remain in force:

- **Zero runtime npm dependencies.** Vite is dev-only. No JSZip, no clipboard polyfill libraries, no PNG library.
- **Native APIs only** for export, clipboard, rasterisation: `Blob`, `URL.createObjectURL`, `XMLSerializer`, `<canvas>`, `navigator.clipboard`, `<dialog>`.
- **HTTPS-only deployment.** `navigator.clipboard` is always available; no `execCommand` fallback needed.
- **Static SVG output.** Exported SVG carries `viewBox` only, no `width`/`height` (per Specification §6.1, §9).

---

## 1. Feature overview

| Feature | Phase | Deployable result |
|---|---|---|
| Copy SVG to clipboard | 7a | New actions-bar button copies SVG to clipboard with transient feedback |
| Enhanced Export dialog | 7b | Single click on Export opens a modal with count + format + PNG width; supports SVG and PNG, single and multi-file |
| About section | 7c | New "About" section at the bottom of the sidebar with project description and GitHub link |
| Extended Grid Limits | 7d | Max grid columns and rows increased from 24 to 64 |
| Mobile-friendly UI | 8 | App renders correctly on phone screens; sidebar becomes a slide-in drawer |

**Sequencing:** 7a → 7b → 7c → 7d → 8. Phase 8 builds on 7b's export dialog for the share icon and 7c's About section which lives in the drawer.

---

## 2. Resolved decisions

| Question | Decision | Rationale |
|---|---|---|
| Canvas state after multi-export | Show last generation | Snapshotting `state._grid` adds complexity for marginal benefit |
| PNG width default and range | 1200px, 100–8000, step 100 | Common screen-friendly size; range covers thumbnail to print |
| Dialog memory | Session-persistent (module-level vars in `export-dialog.js`) | Low effort, good UX; resets on page reload |
| Copy SVG label | `⎘ Copy SVG` | Matches existing icon style (`↻`, `⚂`, `↓`) |
| Copy SVG availability | Desktop: actions-bar button + dialog secondary button. Mobile: dialog secondary button only | Two paths on desktop, one on mobile |
| Multiple downloads | Synchronous loop after `Promise.all` resolves all blob URLs | Avoids `setTimeout` popup-blocker issues |
| File naming | Single: `composition.svg/png`. Multi: `composition-01.svg`, `composition-02.svg`, … | Zero-padded for sortability |
| Mobile breakpoint | `@media (max-width: 768px)` | Standard tablet/phone threshold |
| Mobile drawer pattern | Slide in from left, full-height, `.is-open` class on `.sidebar` | Existing `<details>` sections work as-is inside drawer |
| Mobile share icon | Opens the same export dialog as desktop | One dialog, two entry points |
| Native `<dialog>` element | Yes, `showModal()` API | Free focus trap, Escape dismissal, `::backdrop` |

---

## 3. Phase 7a — Copy SVG

**Goal.** Add a `⎘ Copy SVG` button in the desktop actions bar that copies the serialized SVG string to the clipboard.

### Files to modify

```
src/export.js      ← extract prepareSVGString(); add copySVGToClipboard()
src/main.js        ← wire the new button
index.html         ← add the button to the actions bar
styles/main.css    ← optional: .btn-secondary.is-copied feedback state
```

### Key implementation notes

**`src/export.js` refactor.** Extract the clone → strip overlay → `XMLSerializer` sequence into `prepareSVGString()`:

```js
export function prepareSVGString() {
  const svg = document.getElementById('canvas-svg').cloneNode(true);
  svg.querySelector('#grid-overlay')?.remove();
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return new XMLSerializer().serializeToString(svg);
}

export function exportSVG() {
  const xml = prepareSVGString();
  // existing download logic
}

export async function copySVGToClipboard() {
  const xml = prepareSVGString();
  await navigator.clipboard.writeText(xml);
}
```

**Button feedback.** The wiring in `main.js` handles transient text changes:

```js
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
```

**HTML addition** in `index.html` actions bar, between Randomize and Export:

```html
<button class="btn-secondary" id="copy-svg">⎘ Copy SVG</button>
```

### Test checklist

- [ ] Click Copy SVG → clipboard contains a valid SVG string
- [ ] Paste into a text editor → it's a complete `<svg>...</svg>` with `viewBox` and no `width`/`height`
- [ ] Paste into Figma → renders correctly
- [ ] Button text changes to `✓ Copied!` for ~1.5s then reverts
- [ ] No regression on Export SVG button

---

## 4. Phase 7b — Export dialog

**Goal.** Replace direct export with a modal dialog that lets the user choose: number of generations (1–16), format (SVG or PNG), and PNG width. The dialog has both Download (primary) and Copy to clipboard (secondary) actions.

### Files to create / modify

```
src/export.js              ← add exportPNG, runBatchExport
src/ui/export-dialog.js    ← NEW: dialog DOM, form, open/close, calls into export.js
index.html                 ← add <dialog id="export-dialog">; rename Export button to "↓ Export…"
styles/main.css            ← <dialog> reset, ::backdrop overlay, form layout
src/main.js                ← wire export button to dialog.showModal()
```

### Key implementation notes

**Native `<dialog>`** placed at the end of `<body>` in `index.html`, outside `.app`:

```html
<dialog id="export-dialog">
  <form method="dialog" class="export-form">
    <h2>Export composition</h2>

    <label>
      Generations
      <select name="count">
        <option value="1">1</option>
        ...
        <option value="16">16</option>
      </select>
    </label>

    <fieldset class="format-group">
      <legend>Format</legend>
      <label><input type="radio" name="format" value="svg" checked> SVG</label>
      <label><input type="radio" name="format" value="png"> PNG</label>
    </fieldset>

    <label class="png-width-row">
      Width
      <input type="number" name="pngWidth" min="100" max="8000" step="100" value="1200">
      <span class="png-height-readout">× 1200 px</span>
    </label>

    <div class="dialog-actions">
      <button type="button" class="btn-secondary" id="dialog-copy">⎘ Copy SVG</button>
      <button type="button" class="btn-secondary" id="dialog-cancel">Cancel</button>
      <button type="submit" class="btn-primary" id="dialog-download">↓ Download</button>
    </div>
  </form>
</dialog>
```

**`src/export.js` additions:**

```js
export async function exportPNG(svgString, width, aspectW, aspectH) {
  const height = Math.round(width * aspectH / aspectW);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);

  const img = new Image();
  img.src = url;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(url);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// Generates N variations and downloads them all
export async function runBatchExport(count, format, pngWidth) {
  const blobs = [];
  for (let i = 0; i < count; i++) {
    generate(); render();
    const xml = prepareSVGString();
    if (format === 'svg') {
      blobs.push(new Blob([xml], { type: 'image/svg+xml' }));
    } else {
      blobs.push(await exportPNG(xml, pngWidth, state.aspectWidth, state.aspectHeight));
    }
  }

  // Trigger all downloads synchronously
  for (let i = 0; i < blobs.length; i++) {
    const url = URL.createObjectURL(blobs[i]);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: count === 1
        ? `composition.${format}`
        : `composition-${String(i + 1).padStart(2, '0')}.${format}`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

**Dialog state** (in `src/ui/export-dialog.js`) — module-level vars persist across opens within the session:

```js
let _lastCount  = 1;
let _lastFormat = 'svg';
let _lastWidth  = 1200;
```

On open, populate form from these. On submit, write back. On Cancel or Escape, do not write back.

**PNG height readout.** When user changes width or aspect ratio (between dialog opens), recompute `height = width * state.aspectHeight / state.aspectWidth` and update the readout span. The PNG width row is hidden via CSS when format is SVG.

**`src/main.js` change** — replace direct export click with dialog open:

```js
import { initExportDialog } from './ui/export-dialog.js';
const exportDialog = initExportDialog();
document.getElementById('export-svg').addEventListener('click', () => exportDialog.open());
```

The dialog also exposes `exportDialog.open()` for the mobile share icon to call later.

**Dialog styles** (rough sketch in `main.css`):

```css
#export-dialog {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border-accent);
  padding: 24px;
  min-width: 320px;
  font-family: 'IBM Plex Mono', monospace;
}
#export-dialog::backdrop { background: rgba(0, 0, 0, 0.6); }
.export-form { display: flex; flex-direction: column; gap: 14px; }
.dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
.png-width-row { display: flex; align-items: center; gap: 8px; }
.png-width-row.is-hidden { display: none; }
```

### Test checklist

- [ ] Click Export → dialog opens with last-used settings
- [ ] Cancel or Escape closes without doing anything
- [ ] SVG, count=1 → single `composition.svg` download
- [ ] SVG, count=4 → four files `composition-01.svg` … `composition-04.svg`
- [ ] PNG, count=1, width=1200 → single PNG, height matches aspect ratio
- [ ] PNG width input clamped to 100–8000
- [ ] PNG height readout updates as width changes
- [ ] Format = SVG → PNG width row hidden
- [ ] PNG, count=8 → eight PNG files download
- [ ] Copy to clipboard button copies the current single composition (not N)
- [ ] After multi-export, canvas shows the last generation
- [ ] Reopen dialog → previously selected count, format, width are remembered
- [ ] No layout shift when switching format radios

---

## 5. Phase 7c — About Section

**Goal.** Add an "About" section as the last item in the sidebar on both desktop and mobile (where it will appear in the slide-in drawer). It provides context about the project and links to the source code.

### Files to modify

```
index.html           ← add <details class="sidebar-section"> for About at the bottom of the sidebar
styles/main.css      ← optional: any specific styling for the about text or links
```

### Key implementation notes

**HTML addition** in `index.html` at the end of the `.sidebar`, after the Actions section:

```html
<details class="sidebar-section" open>
  <summary>About</summary>
  <div class="sidebar-content about-content">
    <p>A client-side web app for generating grid-based geometric compositions, inspired by Sol LeWitt's instruction-based art. Configure a module pool, set grid waveforms and generation rules, then export resolution-independent SVG.</p>
    <p><a href="https://github.com/nndrch/grid-composition-generator" target="_blank" rel="noopener noreferrer">View source on GitHub</a></p>
  </div>
</details>
```

**CSS additions** in `styles/main.css`:

```css
.about-content p {
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-dim);
  margin-bottom: 8px;
}
.about-content a {
  color: var(--accent);
  text-decoration: none;
}
.about-content a:hover {
  text-decoration: underline;
}
```

### Test checklist

- [ ] "About" section appears as the last item in the sidebar on desktop
- [ ] On mobile, "About" section is reachable by scrolling to the bottom of the slide-in drawer
- [ ] Description text matches the intended project summary
- [ ] GitHub link opens `https://github.com/nndrch/grid-composition-generator` in a new tab
- [ ] Link styling matches the rest of the application

---

## 6. Phase 7d — Extended Grid Limits

**Goal.** Increase the maximum allowed columns and rows from 24 to 64.

### Files to modify

```
index.html           ← update `max="24"` to `max="64"` for both column and row inputs
src/state.js         ← update validation limits for columns and rows to 64
src/ui/grid.js       ← update any hardcoded max values in UI sync logic
```

### Key implementation notes

**HTML update** in `index.html`:
Locate the inputs for `#grid-cols` and `#grid-rows` and update their `max` attributes:
```html
<input type="number" id="grid-cols" min="1" max="64" value="8">
<input type="number" id="grid-rows" min="1" max="64" value="8">
```

**State validation** in `src/state.js`:
Ensure the clamp function or maximum limit in the grid setter allows up to 64 instead of 24.

### Test checklist

- [ ] Typing 64 in the columns/rows input updates the grid successfully
- [ ] Typing 65 clamps down to 64
- [ ] The grid renders correctly with a 64x64 matrix
- [ ] Randomize all function handles values up to 64 for columns/rows (or uses a sensible default range while allowing max 64 manually)

---

## 7. Phase 8 — Mobile-friendly UI

**Goal.** Make the app usable on phone-size viewports by replacing the fixed sidebar with a slide-in drawer and surfacing primary actions in a topbar + bottom button.

### Mobile design

```
┌──────────────────────────────────┐
│  ☰                          ↑    │  ← topbar (hamburger left, share right)
│                                  │
│         ⚂ (dice icon)            │  ← randomize-all
│                                  │
│      [composition canvas]        │  ← fills available space
│                                  │
│                                  │
│  ┌────────────────────────────┐  │
│  │        GENERATE            │  │  ← bottom button, full width
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

Hamburger tap → existing sidebar slides in from the left, full height. Overlay (semi-transparent) appears over the canvas; tapping it or pressing Escape closes the drawer. Share icon → Generates a single 1200px PNG and shares it directly via `navigator.share()` (Option A: "Fast Share" bypassing the export dialog). Dice icon → calls `randomizeAll()` + `generate()` + UI sync. Generate button → `generate()` + `render()`.

The sidebar's existing actions section (Generate / Randomize / Copy SVG / Export) is hidden on mobile (`display: none`) — those actions are reachable from the mobile chrome.

### Files to create / modify

```
index.html           ← add mobile chrome (topbar, bottom bar, overlay)
styles/main.css      ← @media (max-width: 768px) overrides
src/ui/mobile-nav.js ← NEW: drawer toggle, overlay click, escape, dice click
src/main.js          ← init mobile-nav
```

### HTML additions

Add these elements outside `.app`, but inside `<body>`:

```html
<div class="mobile-topbar">
  <button class="mobile-icon-btn" id="mobile-menu" aria-label="Open controls">
    <svg viewBox="0 0 24 24" width="24" height="24"><!-- hamburger lines --></svg>
  </button>
  <button class="mobile-icon-btn" id="mobile-export" aria-label="Export">
    <svg viewBox="0 0 24 24" width="24" height="24"><!-- share/up arrow --></svg>
  </button>
</div>

<button class="mobile-icon-btn mobile-dice" id="mobile-randomize" aria-label="Randomize all">
  <svg viewBox="0 0 24 24" width="32" height="32"><!-- dice icon --></svg>
</button>

<button class="mobile-generate-btn" id="mobile-generate">Generate</button>

<div class="sidebar-overlay" id="sidebar-overlay" hidden></div>
```

### CSS structure

```css
/* Hide mobile chrome on desktop */
.mobile-topbar, .mobile-dice, .mobile-generate-btn, .sidebar-overlay { display: none; }

@media (max-width: 768px) {
  body { overflow: hidden; }
  .app { flex-direction: column; height: 100vh; }

  /* Sidebar becomes a drawer */
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: -100%;
    width: 85%;
    max-width: 350px;
    z-index: 100;
    transition: left 0.25s ease-out;
  }
  .sidebar.is-open { left: 0; }

  /* Hide desktop actions bar inside the drawer */
  .sidebar-section--actions { display: none; }

  /* Canvas fills the screen */
  .canvas-area {
    padding: 64px 16px 88px; /* room for topbar and bottom button */
  }

  /* Mobile chrome */
  .mobile-topbar {
    position: fixed; top: 0; left: 0; right: 0;
    height: 56px;
    background: var(--bg);
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 12px;
    z-index: 50;
  }
  .mobile-dice {
    position: fixed; top: 64px; left: 50%; transform: translateX(-50%);
    z-index: 40;
  }
  .mobile-generate-btn {
    position: fixed; bottom: 16px; left: 16px; right: 16px;
    height: 56px;
    background: transparent;
    border: 1px solid var(--accent);
    color: var(--text-bright);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    z-index: 50;
    display: block;
  }
  .sidebar-overlay {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    display: block;
  }
  .sidebar-overlay[hidden] { display: none; }
}
```

### `src/ui/mobile-nav.js`

```js
import { generate } from '../generate.js';
import { render } from '../render.js';
import { randomizeAll } from '../randomize.js';
// (Ensure prepareSVGString and exportPNG are exported from export.js)

export function initMobileNav({ canvasAPI, moduleAPI, gridAPI, genAPI, exportDialog, state }) {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuBtn = document.getElementById('mobile-menu');
  const exportBtn = document.getElementById('mobile-export');
  const diceBtn = document.getElementById('mobile-randomize');
  const genBtn  = document.getElementById('mobile-generate');

  const open  = () => { sidebar.classList.add('is-open');    overlay.hidden = false; };
  const close = () => { sidebar.classList.remove('is-open'); overlay.hidden = true; };

  menuBtn.addEventListener('click', open);
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  exportBtn.addEventListener('click', async () => {
    try {
      const { prepareSVGString, exportPNG } = await import('../export.js');
      const xml = prepareSVGString();
      const pngBlob = await exportPNG(xml, 1200, state.aspectWidth, state.aspectHeight);
      const file = new File([pngBlob], 'composition.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Grid Composition'
        });
      } else {
        // Fallback for browsers that don't support file sharing
        exportDialog.open();
      }
    } catch (err) {
      console.error('Error sharing:', err);
      exportDialog.open(); // Fallback on error
    }
  });

  diceBtn.addEventListener('click', () => {
    randomizeAll();
    generate(); render();
    canvasAPI.refresh(); moduleAPI.refresh(); gridAPI.refresh();
    genAPI.refresh(); genAPI.refreshMatrix();
  });

  genBtn.addEventListener('click', () => { generate(); render(); });
}
```

### Test checklist

- [ ] At 375px viewport: canvas fills screen, sidebar hidden, topbar + dice + generate visible
- [ ] Tap hamburger → sidebar slides in, overlay appears
- [ ] Tap overlay → sidebar closes
- [ ] Press Escape → sidebar closes
- [ ] All `<details>` sections inside drawer work
- [ ] Tap dice → canvas randomizes; UI in drawer reflects new state
- [ ] Tap Generate → canvas regenerates with current state
- [ ] Tap share icon → Native OS Share Sheet opens with a 1200px PNG file attached
- [ ] Tap share icon in an unsupported browser → Falls back to opening the custom export dialog
- [ ] Resize from desktop to mobile mid-session → layout transitions cleanly
- [ ] Resize from mobile to desktop → drawer state cleared, desktop sidebar visible
- [ ] No `body` scroll on mobile (only sidebar content scrolls)
- [ ] Touch targets ≥ 44px (topbar buttons, generate button)
- [ ] Sidebar on mobile is scrollable (all controls reachable)

---

## 8. Risk register

| Risk | Mitigation |
|---|---|
| Multiple browser downloads blocked by popup blocker | Trigger all `a.click()` synchronously in a tight loop after `Promise.all`; do not use `setTimeout` between |
| `<dialog>` styling defaults vary across browsers | Reset `padding`, `border`, `background` explicitly; test `::backdrop` in Firefox |
| `img.decode()` fails on certain SVGs | Wrap in try/catch; fall back to `img.onload` Promise |
| Mobile sidebar scroll vs. body scroll lock | Apply `overflow: hidden` to `body` only when drawer is open; use `overflow-y: auto` on `.sidebar` |
| iOS Safari `100vh` includes URL bar | Use `100dvh` instead of `100vh` in mobile media query |
| Grammar matrix is wide on mobile | Already has `overflow-x: auto`; keep as-is, drawer is wide enough |
| Native `<dialog>` not styled by `.app` parent context | Place `<dialog>` outside `.app`, at end of `<body>` |
| Clicking inside dialog while form has invalid PNG width | `<input min/max>` + clamp on submit |
| UI performance at 64x64 | 4096 cells might stress renderer. Mitigated because app uses native SVG DOM. |

---

## 9. Out of scope (Phase 7 & 8)

- Option B "Hybrid Share Dialog" (Mobile share icon opens custom dialog, but replaces "Download" with "Share"). Kept out of scope but detailed for a follow-up version if Option A's fast-share proves too restrictive.
- ZIP archive for multi-file export — would require a JS dependency
- WebP, JPEG, PDF formats — only SVG and PNG
- Custom dialog (non-`<dialog>`) for older browser support
- Drag/swipe gestures to open the mobile drawer
- Persisting dialog settings to `localStorage` (currently session-only via module vars)
- Animated transitions on canvas re-render after export

---

## 10. Working with an AI Agent — session prompt

```
I'm continuing the Grid Composition Generator on Phase 7 & 8.

Read these in order before writing code:
  - docs/project-specification.md (source of truth)
  - docs/archive/implementation-plan.md (Phases 1–6 baseline)
  - docs/current-plan.md (this plan)

Today, do Phase [7a/7b/7c/7d/8] only — do not stray into other phases.
Architectural invariants stand: zero runtime npm deps, native APIs only,
HTTPS-only deployment.

Commit as "phase [7a/7b/7c/7d/8]: <feature>".
```

Mid-session, if the AI Agent drifts: cite the section number from this plan
(e.g. "current-plan.md §4 says the dialog is `<dialog>`, not a div overlay").

End of session: summarise what was done, what's untested, what's deferred.
Open a PR, review the Vercel preview, merge.

---

## 11. Phase order rationale

The dependency graph is:

```
7a (Copy SVG)
  └── extracts prepareSVGString()
        ├── used by 7b (export dialog)
        │     └── exposes exportDialog.open()
        │           └── used by 8 (mobile share icon)
        └── still used by 7a's standalone copy button
7c (About section)
  └── independent HTML/CSS addition at the end of the sidebar
7d (Extended Grid Limits)
  └── independent logic modification to state/UI inputs
8 (Mobile UI)
  └── implements native `navigator.share()` using 7b's `exportPNG`, with a fallback to 7b's export dialog. Contains 7c (about section) inside its drawer.
```

Doing 7a first means 7b doesn't need to refactor `export.js` again. Doing 7b before 8 ensures `exportPNG` is available for the native share sheet generation, and provides the fallback dialog for unsupported browsers. 7c and 7d are independent but must be completed before or alongside 8 so the drawer has its final contents.

---

## 12. Done criteria

Phase 7 & 8 ships when:

- All Phase 7 and 8 sub-phases merged to `main`
- Vercel preview verified on:
  - Desktop Chrome (1440×900)
  - Mobile Safari iOS (Safari simulator or physical iPhone)
  - Mobile Chrome Android (DevTools mobile emulation)
- Test checklists in §3, §4, §5, §6, §7 all pass
- No regression on existing v1.0 features (run through Specification §10 edge cases)
- README updated with the new features in the Features list
- Tag commit `v1.2`
