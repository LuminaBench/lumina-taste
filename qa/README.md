# QA

Development helpers for looking at the kit. They write to `qa/artifacts/`, which is gitignored: nothing they make is ever committed. Most need the gallery running (`npm run serve`).

| Helper | What it does |
| --- | --- |
| `shot.mjs <url> <out.png> [w] [h] [mode]` | One screenshot. `FULL=1` for the whole page at rest, `MOTION=1` to keep motion |
| `clip.mjs <url> "<selector>" <out.png> [w] [mode]` | A screenshot of one element |
| `scroll-video.mjs <url> <out-dir> [w] [h] [mode]` | A slow scroll through a page with motion on, as a video |
| `slices.py <png> [height]` | Cut a full-page screenshot into slices for review |
| `sheet.mjs <out.png> <mode> <w> <h> <url…>` | Several pages on one contact sheet |
| `contact-sheet.mjs [base] [mode]` | Every blueprint at desktop and phone width |
| `stages.mjs`, `chart-stages.mjs` | Several elements, or several charts, on one sheet |
| `style-sheet.mjs` | Every style on one composed page |
| `compose-page.mjs` | Assemble a page from section snippets the way an agent would |
| `grid.mjs`, `views.mjs`, `shot-sections.mjs` | The gallery's element grid, views and sections |
| `overflow.mjs <url> [w]` | Elements that stick out past the viewport |
| `click-outline.mjs` | Controls that show a focus ring after a mouse click |

The checks that gate a release are not here: they are `npm test` (contrast, copy, unit, types, browser tests and the audit of every element and blueprint).
