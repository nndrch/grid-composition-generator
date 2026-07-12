# Grid Composition Generator

A client-side web app for generating grid-based geometric compositions, inspired by Sol LeWitt's instruction-based art. Configure a module pool, set grid waveforms and generation rules, then export resolution-independent SVG.

**Live:** https://grid-composition-generator.vercel.app

## Features

- **Module pool** — build a set of shapes, each with independent fill, background, stroke color, and weight
- **Built-in shapes** — Quarter Circle, Square, Triangle, Circle (4 pre-oriented step variants each, no rotation overflow)
- **Custom SVG upload** — upload any SVG; colors are forcefully applied at render time; `<script>` and `on*` attributes are stripped on ingest
- **Noise-driven generation** — spatially coherent cell selection via 2D value noise
- **Symmetry modes** — Mirror X, Mirror Y, 4-fold
- **Grammar transitions** — N×N matrix constraining which modules can follow each other left-to-right
- **Grid waveforms** — Locked (uniform) or Unlocked (sawtooth) column/row sizing with peak control
- **Aspect ratio control** — W/H ratio inputs with one-click ⇄ swap; exported SVG is viewBox-only, fully resolution-independent
- **Randomize all** — one-click palette-coherent randomization of all generation parameters
- **Copy SVG** — copies viewBox-only SVG (no `width`/`height`) to the clipboard; opens at any size in Illustrator, Inkscape, Figma
- **PNG export** — one-click 1200px-wide PNG download; on mobile, exports via the native share sheet

## Usage

1. Set canvas aspect ratio (⇄ swaps W and H)
2. Add modules to the pool — choose a shape, set colors and weight
3. Optionally upload custom SVG shapes via the shape library
4. Configure grid waveforms (Columns / Rows)
5. Tune generation settings (noise scale, symmetry, rotation, grammar)
6. Click **↻ Generate** — or **⚂ Randomize all** to explore
7. Click **⎘ Copy SVG** to copy the SVG, or **↓ Export PNG** to download a PNG

## Local dev

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve dist/ locally
```

## Stack

| Concern | Choice |
|---|---|
| Build | Vite (dev only) |
| Renderer | Native SVG DOM |
| Export | Native Blob API |
| Noise | Inline value noise (~15 lines) |
| Styling | Hand-written CSS |
| Hosting | Vercel (auto-deploys from `main`) |

Zero runtime npm dependencies.

## Custom SVG authoring

Upload any SVG with an explicit `viewBox`. The app overwrites all fill, stroke, and stroke-width at render time — author with any colors. The 4 step orientations are produced by mirroring (not rotation). See `docs/project-specification.md` Appendix A for the full authoring guide.

## Archived ideas

- **Figma plugin** — archived July 2026, not being pursued. Was planned as a parallel build target drawing compositions as native, editable Figma layers. Spec preserved at [`docs/archive/figma-plugin-spec.md`](./docs/archive/figma-plugin-spec.md).
