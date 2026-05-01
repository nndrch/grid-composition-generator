# Grid Composition Generator — Handoff

> Drop all files in this folder into the repo root. Start every Claude Code session by pasting the prompt below.

---

## Files in this folder

| File | Role |
|---|---|
| `HANDOFF.md` | This file — start here |
| `grid-composition-prd.md` | Full product spec. Source of truth. Provide to Claude Code at the start of every session. |
| `implementation-plan.md` | 6-phase build plan with literal Claude Code prompts per phase. |
| `poc.html` | Working interactive prototype. Open directly in a browser — no install needed. |
| `schematic.html` | Layout reference. Shows sidebar sections and grammar matrix UI. |

---

## Open the PoC first

Before reading any spec, open `poc.html` in a browser. It demonstrates the complete core interaction — module pool, noise-driven generation, symmetry, grammar matrix, show grid, SVG + PNG export. Everything in the production app builds on this foundation.

**What the PoC proves:**
- Pre-oriented SVG path variants (4 steps) fill each cell exactly at any aspect ratio — no rotation transform overflow
- Noise-field module selection produces spatial coherence, not salt-and-pepper randomness
- Grammar transition matrix with toggle cells works as expected
- Symmetry modes (Mirror X/Y, 4-fold) operate on cell indices, not pixel positions

**What the PoC is missing (production adds):**
- Waveform track sizing (Locked/Sawtooth/Sine) instead of uniform grid
- Aspect ratio control (not fixed 600×600)
- Stroke color + stroke weight per module
- Custom SVG upload
- Randomize-all with palette logic
- Collapsible sidebar sections
- Vite build, modular file structure, Vercel deployment
- SVG export (no PDF — out of scope v1)

---

## Key architecture decisions — do not deviate

**1. Pre-oriented paths, never rotation transforms.**
Built-in shapes have 4 explicit path variants (step 0–3). Rotating a path around the center of a non-square cell causes bounding box overflow. The PoC fixed this; production must preserve it. See PRD §5.3.

**2. Step-based symmetry math.**
`applyFlipStep`: `flipX → step ^ 1`, `flipY → 3 - step`, both → `(step + 2) % 4`. See PRD §6.6.

**3. Shape registry.**
Shapes are not a hard-coded enum. Both built-ins and user uploads live in a shared registry. Modules reference shapes by `shapeId` string. See PRD §5.2.

**4. Unified color application.**
All colors (fgColor, bgColor, strokeColor, strokeWeight) are forcefully applied at render time. Original colors in uploaded SVGs are overwritten. `vector-effect="non-scaling-stroke"` is set on every path. See PRD §5.1.

**5. Waveform track sizing.**
Track sizes are computed from waveform parameters (Locked/Sawtooth/Sine + min/max/peak), not entered manually. Changing waveform params triggers re-render only — no regeneration. Changing count triggers regeneration. See PRD §6.3.

**6. Aspect ratio, not pixel dimensions.**
`aspectWidth` and `aspectHeight` are ratio integers. The SVG viewBox is `0 0 {aw*100} {ah*100}`. No pixel dimensions anywhere. Exported SVG has no `width`/`height` attributes — viewBox only, fully resolution-independent. See PRD §6.1.

**7. Zero runtime dependencies.**
No npm packages at runtime. Vite is dev-only. Export is native Blob API. See PRD §3.

---

## Starting Phase 1

1. Create the GitHub repo
2. Clone it locally
3. Copy all files from this folder into the repo root
4. Open a Claude Code session and paste:

```
I'm starting the Grid Composition Generator.

I'll give you three reference files — read all of them before writing any code:
  - grid-composition-prd.md  (full product spec, source of truth)
  - implementation-plan.md   (phased build plan)
  - poc.html                 (working prototype, for reference)

For this session only do Phase 1 from the implementation plan.
Scaffold the Vite + vanilla JS project. No functionality yet.
The sidebar must use <details>/<summary> for collapsible sections per PRD §4.1.
Commit with message "phase 1: project scaffold".
```

For every subsequent session:
```
I'm continuing the Grid Composition Generator.
Read grid-composition-prd.md and implementation-plan.md before doing anything.
Today we're doing Phase [N]: [paste the phase prompt from implementation-plan.md].
```

---

## Quick PRD reference

| Topic | Section |
|---|---|
| Sidebar collapsible sections | §4.1 |
| Module fields (fgColor, strokeColor, etc.) | §5.1 |
| Shape registry structure | §5.2 |
| Built-in shape paths (4 steps) | §5.3 |
| Custom SVG ingest + color application | §5.4 |
| Aspect ratio + coordinate space | §6.1 |
| State object | §6.2 |
| Waveform functions | §6.3 |
| Generation algorithm | §6.5 |
| Symmetry math | §6.6 |
| Noise functions | §6.7 |
| Grammar | §6.8 |
| Live update rules | §6.9 |
| Canvas controls + aspect ratio presets | §7.1 |
| Module pool UI + Ø buttons | §7.2 |
| Grid waveform controls + preview strip | §7.3 |
| Generation + grammar UI | §7.4 |
| Randomize-all spec + palette logic | §8 |
| SVG export | §9 |
| Edge cases | §10 |
| Custom SVG authoring guide | Appendix A |
