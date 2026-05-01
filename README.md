# Grid Composition Generator

A client-side web app for generating grid-based geometric compositions, inspired by Sol LeWitt's instruction-based art. Export as resolution-independent SVG.

## Local dev

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve dist/ locally
```

## Stack

- **Build:** Vite (dev only)
- **Renderer:** Native SVG DOM
- **Export:** Native Blob API
- **Hosting:** Vercel (auto-deploys from `main`)

## Branching

One branch per phase (`phase-1-scaffold`, `phase-2-engine`, …). PR to `main` at phase end.
