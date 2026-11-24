# QA

`qa/artifacts/` holds screenshots and audit reports written by `scripts/audit-ui.mjs`, the Playwright suite and the helpers below. It is gitignored: nothing in it is ever committed.

Dev helpers (need a running `npm run serve`):

- `node qa/shot-sections.mjs [baseUrl] [light|dark] [width] [route]` — one screenshot per gallery section.
- `node qa/contact-sheet.mjs [baseUrl] [mode]` — full-page desktop + mobile shots of every blueprint.
- `node qa/overflow.mjs <url> [width]` — list elements that stick out past the viewport.
- `node qa/shot.mjs <url> <out.png> [width] [height] [mode]` — single screenshot.
