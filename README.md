# Singularity://Telemetry

A single-page static 3D visualization of AI capability growth. No build step, no framework,
no bundler — plain HTML + CSS + JS with three.js and Chart.js from CDN. Open it in any
IDE and edit; every file is hand-readable.

## How the pieces fit together

```
singularity-telemetry/
├── index.html            one 3D stage with four card-switchable telemetry views
├── instruments.html      legacy redirect to index.html (preserves hash deep links)
├── instruments.js        frontier + instrument terrains, controls, and chart overlay
├── main.js               legacy pre-unification script (not loaded)
├── style.css             shared design system
├── data.json             all terrain, chart, and label data
├── scripts/
│   ├── smoke.mjs         headless test — executes the unified app with stubbed
│   │                     browser/THREE/Chart APIs, asserts views/labels/overlay
│   └── refresh.mjs       calls Anthropic API + web search to regenerate data.json
└── .github/workflows/
    └── refresh.yml       cron (1st & 15th monthly): refresh data.json → commit →
                          your static host redeploys automatically
```

There is intentionally **no bundling**. `index.html` loads:
1. `style.css` (shared design system: colors, panels, labels, overlay, cards)
2. three.js r128 + Chart.js 4.4.1 from cdnjs
3. `instruments.js`, which `fetch()`es `data.json`

Hash links like `index.html#frontier` and `index.html#compute` preselect a view.
Old `instruments.html#compute` links redirect to the matching unified view.

`data.json` is the single source of truth — every 3D terrain, chart, and label reads
from it. Change a number there and the unified page updates.

## Run locally

Any static server from the project root:

```bash
npx serve .          # or: python3 -m http.server 8000
# open http://localhost:3000 (or :8000)
```

(Opening index.html via file:// won't work — `fetch('data.json')` needs http.)

## Test

```bash
node scripts/smoke.mjs
```

Executes the unified app headlessly. Catches runtime errors (not just syntax),
missing DOM wiring, undefined material params, deep-link, and overlay regressions.
Run it after every edit; it takes ~1 second.

## Deploy (Vercel)

```bash
npm i -g vercel && vercel   # from the project root; it's detected as a static site
```

Netlify / GitHub Pages / Cloudflare Pages work identically — there's nothing to build.

## Auto-refreshing data

`scripts/refresh.mjs` regenerates `data.json` via the Anthropic API with web search
(METR / Epoch / Stanford AI Index numbers), with sanity checks so a bad response can't
nuke the file. The GitHub Action runs it on the 1st & 15th; set the `ANTHROPIC_API_KEY`
repo secret. Add `node scripts/smoke.mjs` as a step before the commit if you want the
tests to gate the auto-deploy.

## Editing guide

| Want to change…            | Edit                                             |
|----------------------------|--------------------------------------------------|
| Numbers, models, labels    | `data.json`                                      |
| Colors / fonts / panels    | `:root` variables at the top of `style.css`      |
| Frontier terrain / controls| `instruments.js` (`buildFrontier`)               |
| Instrument views           | `instruments.js` (`INSTRUMENTS` registry + `buildTerrain`) |
| Chart pairs in the overlay | `chartSpec()` in `instruments.js`                |
