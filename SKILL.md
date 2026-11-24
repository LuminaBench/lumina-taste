---
name: lumina-taste
description: Make interfaces look designed, not generated. Use for any UI work (landing, pricing, dashboard, settings, docs, auth and onboarding pages) and for colour palettes, light/dark themes, type pairings, spacing, density, radius, motion and visual styles such as swiss, editorial, neobrutalism, glass or terminal. Use when someone describes a UI element loosely (rotating arrow, 9-dot menu, cmd-K box, OTP boxes, bottom sheet, speed dial, kanban, star rating, chat bubbles, carousel, lightbox) to get its real name and working code. Use for charts, including benchmark leaderboards, trade-off quadrants, Pareto frontiers, slope, dumbbell, waterfall, box plot, beeswarm, bump and small multiples. Use to audit a page for overflow, clipped or overlapping text, contrast, focus rings, dead buttons and AI slop (purple gradients, heavy shadows, emoji icons, hype copy), and to keep a product's look stable across edits with a lockable taste-profile.json. Vanilla HTML/CSS/TS and React, no dependencies.
---

# Lumina Taste

A design kit for coding agents: **18 OKLCH palettes** (light + dark, every pair WCAG-verified), **12 type pairings**, **16 visual styles**, **111 named UI patterns**, **38 chart engines**, **8 page blueprints**, a **lockable taste profile**, a **Playwright auditor** and a **copy lint**. Everything is plain TypeScript and CSS with zero runtime dependencies, in vanilla and React.

Run commands from this skill's directory with Node.js 20+. Pass absolute paths (or run from the user's project with the absolute script path). Search, install and token scripts need nothing installed; the auditor needs Playwright; the gallery needs `npm install` once.

## Non-negotiables

Read `references/anti-slop-rules.md` once per session. The short version:

1. **Tokens only.** Colours come from `--bg-*`, `--text-*`, `--border-*`, `--accent-*`, `--status-*`, `--chart-*`. Spacing from `--space-*` / `--gap-*` (4px grid). Never raw hex in components.
2. **One accent, one primary button per view.** Status colours mean status, never decoration.
3. **No slop:** no purple→blue/pink gradients, no gradient headline text, no blurry 40px shadows, no emoji as icons, no 5-badge headers, no duplicated filter bars per card, no rotated axis labels, no pies with 5+ slices, no 3D.
4. **Numbers are tabular** (`font-variant-numeric: tabular-nums`) in tables, KPIs, timers, prices and axes.
5. **Every control works by keyboard** and shows a `:focus-visible` ring. Motion uses `--dur-*` / `--ease-*` and collapses under reduced motion.
6. **Plain copy.** No hype words, clichés or exclamation marks; `node scripts/lint-copy.mjs <dir>` must pass. Say what the thing does in one short sentence.
7. **Finish with the auditor.** `node scripts/audit-ui.mjs <url>` must report 0 errors.

## Find the right thing first

People describe UI loosely. Search the catalog before writing anything:

```sh
node scripts/search.mjs "rotating arrow"            # → disclosure-chevron
node scripts/search.mjs "9 dots menu"               # → waffle-launcher
node scripts/search.mjs "bar when ticking rows"     # → bulk-action-bar
node scripts/search.mjs "chart with long labels"    # → horizontal-bar-chart
node scripts/search.mjs "dark finance palette" --kind palette
node scripts/search.mjs "thick borders hard shadows" --kind style   # → neobrutal
node scripts/search.mjs "login page with code" --json
node scripts/install-taste.mjs --list               # every id, grouped
```

`catalog.json` holds every pattern, chart, blueprint, palette, type pairing and style with its aliases, ARIA pattern, states, files and dependencies.

## Workflow A · Greenfield app

1. **Pick the taste** from the brief (or ask once if the brief is silent on mood):
   - Palette: `references/palettes.md` (consumer, dev-tool, editorial, data). Default `slate-forest`.
   - Typography: `tokens/typography/source.json` `use` field. Default `precision`.
   - Density: `spacious` for marketing/onboarding, `balanced` for products, `dense` for admin/trading.
   - Radius `sharp | balanced | soft`; motion `snappy | calm | reduced`.
   - Style (optional): one of 16 looks in `tokens/styles/source.json` (studio, swiss, editorial, neobrutal, terminal, glass, soft, clay, retro, blueprint, lucid, flat, minimal, paper, elevated, newsprint). `--style swiss` brings its palette, mode, type and radius; explicit flags still win. Pick a style only when the brief names a mood; default is none.
2. **Install only what the page needs** (writes `taste-profile.json`, copies tokens + chosen files + their imports, nothing else):
   ```sh
   node scripts/install-taste.mjs --project /abs/app --dest src/ui --framework react \
     --palette navy-sand --type swiss --density balanced \
     --components navbar-mega,button,accordion --charts multi-line-chart --lock palette
   ```
3. **Wire it:** import `src/ui/tokens/index.css` once; put the attributes on `<html>` (the installer prints them) or call `applyProfile()` / inline `bootstrapSnippet()` from `engine/profiles/profile.mjs` to avoid a theme flash.
4. **Lay out the page** with `references/page-flow.md`: answer its three questions, copy one of its seven layout recipes, then place components. Start from the closest blueprint (Workflow E) when one fits.
5. **Audit** (Workflow F) at 390px and 1440px, light and dark.

## Workflow B · Attach to an existing app

Use when the user already has styles you must not disturb.

```sh
node scripts/install-taste.mjs --project /abs/app --attach --root "#billing-panel" --components data-table,toast-stack
```

- `installMode: "attach"` scopes tokens to the wrapper: `<div id="billing-panel" data-palette="…" data-mode="…" …>`.
- Base styles use zero-specificity `:where()`, components use `@scope` and `lt-` / `data-part` names, so host CSS always wins and nothing leaks out.
- Match the host: pick the palette whose accent and canvas are nearest the host's, or pass `--override accent-solid="oklch(…)"`. Overrides are contrast-checked and rejected with the failing pair named.

## Workflow C · Change one thing, keep the rest

`taste-profile.json` is the source of truth across sessions and agents:

```json
{ "profileVersion": 1, "palette": "navy-sand", "mode": "light", "typography": "swiss",
  "density": "balanced", "radius": "soft", "motion": "snappy", "style": "none",
  "locks": ["palette", "overrides.accent-solid"], "overrides": {}, "installMode": "greenfield", "attachRoot": ".lt-root" }
```

- Before any visual edit, **read the profile**. Never change a locked field unless the user explicitly asks; then use `--unlock <axis>` or `--force`.
- Change one axis: `node scripts/install-taste.mjs --project /abs/app --density dense`. Locked axes are reported as "left unchanged" (exit code 3) and kept.
- Lock what the user signs off: `--lock palette,typography`. Unlock: `--unlock radius`.
- Schema: `engine/profiles/taste-profile.schema.json`. Serialisation is deterministic, so profiles diff cleanly.

## Workflow D · Charts

1. Write the one-sentence takeaway first; it becomes the title ("Team plan pulled ahead in 2026").
2. Pick the chart from `references/chart-selection.md` (data shape → chart, plus hard bans).
3. Install and render:
   ```ts
   import { render } from './ui/components/charts/multi-line-chart/multi-line-chart';
   render(el, { x: dates, series: [{ name: 'Team', values }, { name: 'Scale', values: v2 }] },
     { title: 'Team plan pulled ahead in 2026', subtitle: 'MRR by plan, £k', highlight: 'Team',
       format: { prefix: '£', suffix: 'k' }, source: 'Source: billing ledger' });
   ```
   React: `<MultiLineChart data={…} options={…} />` from the `.react.tsx` file.
4. Benchmark and leaderboard pages: `ranked-columns` (sorted, value on top, colour by group, hatched when missing), `leaderboard-table` (inline bar plus heat cells), `range-bar-chart` (p5–p95 with median), `tradeoff-scatter` (better-on-both quadrant) and `frontier-chart` (Pareto line). Pass `groups` so each group keeps its colour across every chart on the page.
5. Built in, never re-implement: gutter labels with dashed horizontal grid only, direct end labels, magnetic crosshair + fixed tooltip, arrow-key navigation, hidden data table, SVG/PNG export, theme-derived colours (`--chart-1…8`, `seqColor`, `divColor`), Canvas above 300 scatter points, re-render on theme change.
6. Formats: `formatNumber(v, { prefix: '£', compact: true })` → `£24.4k`; `{ suffix: ' fps', decimals: 1 }` → `60.1 fps`; `{ percent: true, sign: true }` → `+12.4%`; dates → `Nov 24`.

## Workflow E · Whole pages from blueprints

| Blueprint | id | Starts you with |
| --- | --- | --- |
| Product / SaaS landing | `landing` | Mega-menu navbar, one-CTA hero, live product frame, bento, quote, CTA band, contrast footer |
| Financial & analytics dashboard | `dashboard` | Collapsible sidebar, one global filter bar, KPI row, 2×2 chart grid, sortable table |
| Editorial portfolio | `editorial` | Serif/sans, generous measure, case-study cards, essay with pull quote |
| Documentation & changelog | `docs` | Tree nav, scrollspy rail, tabbed copyable code, callouts, timeline |
| Pricing & comparison | `pricing` | Monthly/annual pill toggle, 3 tiers, feature matrix, FAQ accordion |
| Settings & workspace | `settings` | Sectioned forms, switches, danger zone with confirm, sticky unsaved-changes bar |
| Directory / skills hub | `directory` | Search, filter pills, sort, preview cards, honest empty state |
| Auth & onboarding | `auth` | Split layout, email → OTP → workspace → done |

```sh
node scripts/install-taste.mjs --project /abs/app --blueprints dashboard --dest src/pages
```

Replace the sample copy and data with the user's; keep the anatomy. Blueprints use only components from the catalog, so every swap stays on-system.

## Workflow F · Audit and fix

```sh
node scripts/audit-ui.mjs http://localhost:5173/            # desktop 1440×900 + mobile 390×844, light + dark
node scripts/audit-ui.mjs ./dist/index.html --viewports mobile --modes dark
node scripts/audit-ui.mjs <url> --json report.json --screenshots qa/shots --strict
node scripts/lint-copy.mjs src/                                # hype words, clichés, generated tics in source
```

| Rule | Fix |
| --- | --- |
| `overflow` | Find the widest element named; constrain it (`min-width: 0`, `minmax(0, 1fr)`, wrap tables in a scrolling `role="region"`). Absolutely positioned children escape `overflow` unless the wrapper is `position: relative`. |
| `clipped-text` | Let it wrap, shorten it, or use `text-overflow: ellipsis` deliberately. On narrow charts stack labels above bars. |
| `overlap` | Increase spacing, thin labels (`tickIndices`), or relax positions (`relax()`). |
| `contrast` | Use a token pair from the verified set; on coloured fills pick text with `readableOn()`. |
| `focus-visible` | Add `:focus-visible { outline: var(--focus-width) solid var(--focus-ring) }` (or on the visible part for custom controls). |
| `tabular-nums` | Add `.lt-num` or `font-variant-numeric: tabular-nums`. |
| `dead-control` | Give it a handler, a real `href`, or make it a non-interactive element. |
| `covered-control` | Something sits on top of it: z-index, `pointer-events`, sticky headers. |
| `slop-copy` | Rewrite the sentence plainly: what it does, for whom, with a number if you have one. See section 9 of `references/anti-slop-rules.md`. |
| `slop-*` | See `references/anti-slop-rules.md`. |

Requires Playwright in the skill or the project (`npm i -D @playwright/test && npx playwright install chromium`). Exit code 1 on any error.

## Component conventions

- Files per pattern: `components/ui/<family>/<id>/<id>.html` (markup), `.css` (`@scope (.lt-<name>)`, tokens only), `.ts` (`enhance(root) → cleanup`), `.react.tsx` (same markup and behaviour).
- Parts are `data-part="…"` inside the scope; state is ARIA (`aria-expanded`, `aria-checked`, `aria-selected`) or `data-state`.
- Vanilla: paste the HTML, then `enhance(el)` or `autoEnhance(document, { accordion: enhance })` for every `[data-lt]`.
- Events: components emit `lt-change` (detail = new state); React wrappers surface it as `onChange` / `onX` props.
- Overlays use native `<dialog>`, the Popover API and CSS anchor positioning with a JS fallback.
- Families: controls (30), navigation (19), feedback (16), overlays (16), data (20), motion (10). Full list: `catalog.json` or `--list`.

## Tokens at a glance

| Token | Use |
| --- | --- |
| `--bg-canvas`, `--bg-surface-1/2/3` | Page, cards, wells/headers, hover/selected |
| `--border-hairline`, `--border-strong` | Dividers; input and control outlines (≥ 3:1) |
| `--text-primary/secondary/muted` | ≥ 7:1, ≥ 4.5:1, ≥ 4.5:1 on every surface |
| `--accent-solid`, `--accent-hover`, `--accent-ink`, `--accent-soft`, `--accent-text` | Primary fill, its hover, text on it, tint, accent text/links |
| `--status-positive/negative/warning/info` (+ `-soft`) | Status text/icons and tints |
| `--chart-1…8` | Categorical series, CVD-safe order |
| `--space-1…9`, `--gap-xs…xl`, `--control-h`, `--radius-*`, `--dur-*`, `--ease-*`, `--shadow-sm/md/overlay` | Rhythm, density, shape, motion, elevation |

Palettes are generated by `node scripts/build-tokens.mjs` from `tokens/palettes/source.json` and verified by `node scripts/test-contrast.mjs` (2,196 checks across 36 themes). To add a palette, add seeds there, rebuild and re-test; never hand-edit generated CSS.

## Live gallery

```sh
npm install && npm run preview      # builds preview/dist and opens http://127.0.0.1:4321/
```

Five views: Elements (every pattern with a live, contained demo, numbered parts, plain-language aliases and a copyable agent prompt), Charts, Styles, Pages and Palettes. Switch palette, mode, type and style from the Theme panel. Demos never take over the page and never download anything.

## Map

```
SKILL.md                     this file
catalog.json                 every pattern/chart/blueprint/palette with aliases
engine/profiles/             taste profile engine, schema, default profile
tokens/                      base.css, palettes/*.css (+ source.json), typography/, styles/
components/ui/<family>/      111 patterns (html, css, ts, react.tsx)
components/charts/           core/ + 38 chart engines (+ React wrappers)
blueprints/                  8 page blueprints
references/                  anti-slop-rules, page-flow, chart-selection, palettes, harvest-log
scripts/                     search, install-taste, audit-ui, audit-all, lint-copy, build-tokens, test-contrast, build, serve
```
