---
name: lumina-taste
description: Make interfaces look designed, not generated. Use for any UI work (landing, pricing, dashboard, settings, docs, auth, store, checkout, admin, status pages): plan a page from a one-line brief, show three looks to choose from, pick palettes, light/dark themes, type, density and visual styles (swiss, editorial, neobrutalism, glass, terminal…), patterned backgrounds (grid, dots, dither, circuit traces), and match an existing site or export to shadcn/ui and Tailwind. Use when a UI element is described loosely (rotating arrow, 9-dot menu, cmd-K box, OTP boxes, bottom sheet, kanban, carousel) to get its real name and working code. Use for charts, including leaderboards, trade-off quadrants, slope, waterfall, treemap and Gantt. Use to audit a page for overflow, clipped text, contrast, focus rings, dead buttons, AI slop (purple gradients, heavy shadows, emoji icons, hype copy) and page-level taste, and to keep a product's look stable with a lockable taste-profile.json. Vanilla HTML/CSS/TS and React, no dependencies.
---

# Lumina Taste

A design kit for coding agents: a **page composer** that turns a brief into a plan, **18 OKLCH palettes** (light + dark, every pair WCAG-verified), **12 type pairings**, **39 visual styles**, **179 named UI patterns** (including **9 page backdrops**: grid, dots, ruled lines, ticks, wash, spotlight, grain, dither, circuit traces), **42 chart engines**, **14 page blueprints**, a **lockable taste profile**, a **Playwright auditor with a page-level taste critic**, a **copy lint** and **30 eval briefs** to measure the result. Everything is plain TypeScript and CSS with zero runtime dependencies, in vanilla and React.

Run commands from this skill's directory with Node.js 20+. Pass absolute paths (or run from the user's project with the absolute script path). Search, install and token scripts need nothing installed; the auditor needs Playwright; the gallery needs `npm install` once.

## Non-negotiables

Read `references/anti-slop-rules.md` once per session. The short version:

1. **Tokens only.** Colours come from `--bg-*`, `--text-*`, `--border-*`, `--accent-*`, `--status-*`, `--chart-*`. Spacing from `--space-*` / `--gap-*` (4px grid). Never raw hex in components.
2. **One accent, one primary button per view.** Status colours mean status, never decoration.
3. **No slop:** no purple→blue/pink gradients, no gradient headline text, no blurry 40px shadows, no emoji as icons, no 5-badge headers, no duplicated filter bars per card, no rotated axis labels, no pies with 5+ slices, no 3D.
4. **Numbers are tabular** (`font-variant-numeric: tabular-nums`) in tables, KPIs, timers, prices and axes.
5. **Every control works by keyboard** and shows a `:focus-visible` ring. Motion uses `--dur-*` / `--ease-*` and collapses under reduced motion.
6. **Plain copy.** No hype words, clichés or exclamation marks; `node scripts/lint-copy.mjs <dir>` must pass. Say what the thing does in one short sentence.
7. **Finish with the auditor.** `node scripts/audit-ui.mjs <url> --taste` must report 0 errors and a taste score of 90 or more.

## The loop for any page: compose, build, critique

Components are rarely what makes a page look generated; the plan is. Run this loop for every page or screen:

1. **Compose.** `node scripts/compose.mjs "<the user's brief in one line>"` prints a page plan: the design brief (audience, product, primary action, reading pattern, layout, density), a taste profile chosen for the domain, the sections in order with real catalog ids and a copy formula for each, the states to build, what to avoid, and the install command. Add `--json` to read it as data, `--type <id>` to force a page type.
2. **Ask only what is open, and show the look.** The plan's "Ask first" section lists at most three questions the brief leaves unanswered (product name, look, main action, light or dark), each with a default. Ask them in one short message; if the brief answers them, state your brief in two lines and go. When the look is open, do not describe styles: run `node scripts/directions.mjs "<brief>" --out <dir>`, which renders three fitting styles on the same content in one `directions.html` (labelled A, B, C, each with its `--style` flag), and let the person point. "A, but lighter" is a fine answer: keep the style, change the mode or palette. Then lock it (`--lock style,palette`). If they sent a reference image or site, read `references/reading-a-reference.md` first.
3. **Install and build** exactly what the plan lists. Start from its blueprint when it names one. Follow the section order; skip optional sections you cannot fill with real content rather than inventing it.
4. **Write real copy** with the plan's formulas and `references/copy-patterns.md` (headlines, buttons, empty states, errors, pricing, FAQ): the product's name, real numbers, specific benefits. Never ship lorem ipsum, "Acme", "John Doe" or "Feature one"; the critic fails them. For tables, charts and lists, `node scripts/sample-data.mjs users|invoices|orders|series|revenue|funnel|cohort|events` prints realistic, seeded data.
5. **Build the states** the plan lists (loading, empty, error) as well as the happy path.
6. **Critique.** `node scripts/audit-ui.mjs <url> --product "<the product's name>"` (it implies `--taste`; add `--screenshots <dir>` for a first-screen and a full-page capture of every run) fails the page while the kit's sample brands and people (Halyard, Ana López…) are still on it, and checks it like a designer would: type steps, accent hues, corner radii, one primary per screen, reading width, heading order, cards inside cards, section rhythm, a clear first thing to look at, placeholder copy and long button labels. Fix every error, then warnings, until the score is 90 or more. Then take screenshots at 390px and 1440px and look at them.

`evals/evals.json` holds 30 real briefs; `node scripts/eval-score.mjs <output> --brief <slug>` scores any page you build for one of them (audit, taste, brief checks and hygiene, out of 100). The blueprints score 99 on average as reference answers.

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
node scripts/search.mjs --card dropdown-menu        # one item on one screen: when to pick it, parts, states, prompt, files
```

When two elements sound alike (tooltip or popover, modal or drawer, checkbox or switch), read `references/which-one.md`: one rule per pair.

`catalog.json` holds every pattern, chart, blueprint, palette, type pairing and style with its aliases, ARIA pattern, states, files and dependencies.

## Workflow A · Greenfield app

1. **Pick the taste.** `compose.mjs` proposes all of this from the brief; adjust it here (or ask once if the brief is silent on mood):
   - Palette: `references/palettes.md` (consumer, dev-tool, editorial, data). Default `slate-forest`.
   - Typography: `tokens/typography/source.json` `use` field. Default `precision`.
   - Density: `spacious` for marketing/onboarding, `balanced` for products, `dense` for admin/trading.
   - Radius `sharp | balanced | soft`; motion `snappy | calm | reduced`.
   - Style (optional): one of 35 looks in `tokens/styles/source.json` (studio, swiss, editorial, neobrutal, terminal, glass, soft, clay, retro, blueprint, lucid, flat, minimal, paper, elevated, newsprint, mono, graphite, atelier, nordic, kraft, midnight, playful, enterprise, zen, tonal, system, noir, bauhaus, ticker, linen, signal, ledger, volt, civic). `--style swiss` brings its palette, mode, type and radius; explicit flags still win. Pick a style only when the brief names a mood; default is none.
2. **Install only what the page needs** (writes `taste-profile.json`, copies tokens + chosen files + their imports, nothing else). `--framework static` is for plain HTML with no build step: it writes one `lumina.css`, one `lumina.js` (enhances every `[data-lt]` element on load, charts on `lumina.charts`) and `snippets/<id>.html` to paste; pages work from `file://`. `vanilla` copies the TypeScript sources for a bundler; `react` copies the `.react.tsx` wrappers.

   Static page recipe:
   ```html
   <html data-palette="navy-sand" data-mode="light" data-type="financial" data-density="balanced" data-radius="balanced" data-motion="snappy">
   <link rel="stylesheet" href="ui/lumina.css"><script defer src="ui/lumina.js"></script>
   <main class="lt-container lt-stack"> … markup pasted from ui/snippets/ … <div id="mrr"></div> </main>
   <script>addEventListener('DOMContentLoaded', () => lumina.charts['multi-line-chart'](document.getElementById('mrr'),
     { x: ['Jan', 'Feb', 'Mar'], series: [{ name: 'Team', values: [12, 14, 18] }] }, { title: 'Team plan pulled ahead', subtitle: 'MRR, £k' }));</script>
   ```
   Only the charts you pass to `--charts` are in `lumina.charts`. `node scripts/search.mjs --card <chart-id>` prints its data shape. A blueprint installed this way is a complete page in `<dest>/<id>/` with its own `main.css` and `main.js`: move it into place and edit its words and data, or build your page from `snippets/` with `lumina.css`; do not mix the two on one page.
   ```sh
   node scripts/install-taste.mjs --project /abs/app --dest src/ui --framework react \
     --palette navy-sand --type swiss --density balanced \
     --components navbar-mega,button,accordion --charts multi-line-chart --lock palette
   ```
3. **Wire it:** import `src/ui/tokens/index.css` once; put the attributes on `<html>` (the installer prints them) or call `applyProfile()` / inline `bootstrapSnippet()` from `engine/profiles/profile.mjs` to avoid a theme flash.
4. **Lay out the page** with `references/page-flow.md`: answer its three questions, copy one of its seven layout recipes, then place components. Start from the closest blueprint (Workflow E) when one fits, or assemble the page from the `blocks` family (hero, features, pricing, FAQ, CTA…).
5. **Audit** (Workflow F) at 390px and 1440px, light and dark.

## Workflow B · Attach to an existing app

Use when the user already has styles you must not disturb.

```sh
node scripts/install-taste.mjs --project /abs/app --attach --root "#billing-panel" --components data-table,toast-stack
```

- `installMode: "attach"` scopes tokens to the wrapper: `<div id="billing-panel" data-palette="…" data-mode="…" …>`.
- Base styles use zero-specificity `:where()`, components use `@scope` and `lt-` / `data-part` names, so host CSS always wins and nothing leaks out.
- Match the host: `node scripts/sniff.mjs <url>` measures its canvas, text and accent colours, fonts, radii and control heights and prints the nearest palette, type, radius and density as an install command, keeping the brand accent as an `--override` when no palette is close. Overrides are contrast-checked and rejected with the failing pair named.

### Already on Tailwind or shadcn/ui?

Keep the stack and bring the taste: `node scripts/export-tokens.mjs --format shadcn --palette navy-sand --type financial > app/globals.css` fills every shadcn variable (background, card, primary, muted, accent, ring, chart-1…5, sidebar-*, radius, fonts) with the palette's contrast-checked OKLCH values for light and `.dark`. `--format tailwind4` prints an `@theme` block with semantic colours (`bg-canvas`, `bg-surface`, `text-ink`, `text-ink-muted`, `bg-accent`, `text-accent-text`, `border-line`…); `--format tailwind3` prints a preset. `--profile taste-profile.json` reads the axes from a profile. The rules in this file still apply: one accent, one primary per screen, tokens only, then `audit-ui.mjs --taste`.

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
| Admin list | `admin` | Search, status filter, selectable rows, bulk bar, pagination, detail drawer; loading, empty and error states |
| Status page | `status` | Overall status, 90-day uptime per service, incident history, subscribe; incident state |
| Changelog | `changelog` | Tagged releases with dates and versions, filter, RSS and email |
| Store product page | `store` | Gallery, size, grind and subscription options, price on the button, reviews, mobile buy bar; sold-out state |
| Checkout | `checkout` | One column with sticky summary, delivery cards, Pay £X; declined-card state |
| AI assistant chat | `assistant` | History rail (a drawer on phones), reading-width conversation with prose, tables and code, pinned composer; empty, streaming and error states |

```sh
node scripts/install-taste.mjs --project /abs/app --blueprints dashboard --dest src/pages
```

Open any data blueprint with `?state=loading`, `?state=empty` or `?state=error` (status: `incident`, store: `sold-out`) to see the other states; blocks marked `data-view="…"` switch, and buttons with `data-set-state` switch live. Ship every state your page has, not just the happy path.

With `--framework static`, asking only for `--blueprints <id>` writes just that page (`<dest>/<id>/index.html`, `main.css`, `main.js`): move the three files to where the page lives and edit them. `compose.mjs` tells you whether to start from a blueprint or from snippets; use one, not both, unless you need a section the blueprint lacks (then add `--components` and link `lumina.css` after `main.css`).

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
| `taste-type-scale` (`--taste`) | Collapse sizes to 5–7 `--text-*` steps; sizes within 8% count as one. |
| `taste-colour-count` | One accent plus status colours; everything else neutral. |
| `taste-radius-mix` | Use `--radius-sm/md/lg/xl` only. |
| `taste-primary-count` | One filled accent button per screen; others secondary or ghost. |
| `taste-measure` | Reading text `max-width: var(--measure)`. |
| `taste-heading-order` | One h1; no skipped levels (visually hidden headings count). |
| `taste-nested-card` | Replace the inner card with a divider or heading. Product mockups can opt out with `data-mock`. |
| `taste-rhythm` | Every band uses `--section-y`. |
| `taste-focal` | Make one headline clearly larger than everything else in the first screen. |
| `taste-placeholder` | Error: replace with real copy or realistic sample data. |
| `taste-empty-visual` | A big frame with nothing inside reads as a missing image: put a real screenshot or a small live mockup in it, or remove it. CSS illustrations need `role="img"` and an `aria-label`. |
| `taste-button-label` | Verb + object, five words at most. Questions and example prompts (`data-suggest`) are exempt. |
| `taste-sample-copy` (`--product`) | Error: the kit's demo brands or people are still on the page. Replace them with the product's own. |

Requires Playwright in the skill or the project (`npm i -D @playwright/test && npx playwright install chromium`). Exit code 1 on any error.

## Workflow G · Restyle an existing page

Use when the user has a working page that looks generated and wants it designed, keeping its content.

1. Audit the page as it is: `node scripts/audit-ui.mjs <page> --taste`. Keep the score to compare.
2. `node scripts/compose.mjs "restyle <what the page is>"` prints restyle notes plus the section plan for that page type.
3. Install with `--framework static` (or your framework), add the `<html>` attributes, and delete the old colours, gradients, heavy shadows and emoji icons rather than overriding them.
4. Map each existing section onto the nearest block (hero, feature rows, pricing, testimonials, FAQ, CTA, footer) and move its words in unchanged. Wrap anything without a match in `.lt-band` + `.lt-container`.
5. Keep every action, but only one filled primary per screen; the rest become secondary or ghost. Point every `#anchor` at a real id.
6. Audit again and report both scores.

## Workflow H · Backdrops and patterned pages

A page background can carry a quiet pattern or light. It is one attribute on a hero, a band or `<body>`, built from the palette so it follows every theme:

```html
<section class="lt-hero-centered" data-backdrop="grid spot">…</section>
```

| Value | What it draws | Good for |
| --- | --- | --- |
| `grid` · `dots` · `lines` · `ticks` | Graph paper, a dot grid, ruled lines, registration marks. Pick one. | Developer tools, technical products, docs, dashboards' empty areas |
| `wash` | One accent hue rising from below the headline | A launch or product hero on a dark theme |
| `spot` | A soft light from the top | Any dark hero that feels flat |
| `grain` | Fine film grain | Taking the plastic edge off flat fills |
| `dither` + `backdrop-dither` | An ordered-dither pixel field that thins out towards the content | AI and agent apps, composer screens |
| `grid` + `backdrop-circuit` | A few accent traces with travelling pulses that route around the text, with a pause button | A single hero on a technical landing page |

Rules: one backdrop per screen, one hue, and the pattern fades before it reaches the text (so contrast never depends on it). Text over a wash sits on its own surface (a card, a chip, a composer). Tune with `--backdrop-size`, `--backdrop-strength`, `--backdrop-fade`, `--wash-start`, `--wash-strength`. Four styles bring a backdrop with them and put it behind heroes without any attribute: `trace` (grid + spotlight), `graph` (light graph paper), `ember` (wash + grain) and `pixel` (dither); `data-backdrop="none"` on a hero opts out. The script-drawn two install like any component (`--components backdrop-dither,backdrop-circuit`); everything else is CSS in `tokens/backdrops.css`, which every install includes.

## Component conventions

- Files per pattern: `components/ui/<family>/<id>/<id>.html` (markup), `.css` (`@scope (.lt-<name>)`, tokens only), `.ts` (`enhance(root) → cleanup`), `.react.tsx` (same markup and behaviour).
- Parts are `data-part="…"` inside the scope; state is ARIA (`aria-expanded`, `aria-checked`, `aria-selected`) or `data-state`.
- Vanilla: paste the HTML, then `enhance(el)` or `autoEnhance(document, { accordion: enhance })` for every `[data-lt]`.
- Events: components emit `lt-change` (detail = new state); React wrappers surface it as `onChange` / `onX` props.
- Overlays use native `<dialog>`, the Popover API and CSS anchor positioning with a JS fallback.
- Section blocks (`blocks` family) are full-width bands: put them straight inside `<main>`, one after another. Each centres its content in a 1180px container (`--container`), pads itself by half of `--section-y` so the gap between two sections is exactly `--section-y`, and takes `data-tone="well"` for a tinted band. Alternate plain and tinted; never wrap a block in another band or container. Navbars and footers align to the same container.
- Snippets from a static install start with a comment naming the parts. When it says the outer `-demo` element is a preview frame, keep what is inside and drop the frame (app-sidebar's `<aside>` goes straight into `.lt-shell`).
- Settings and account panels (settings list, plan card, usage meters, team members, danger zone) share one width, `--lt-panel-max` (default 720px). Set it once on the page (`--lt-panel-max: none` to fill the column) so they line up.
- Overriding a component's own spacing or size: component rules live in `@scope`, which wins ties against plain page CSS. Use two classes (`.lt-bulk.users-table { padding-bottom: 0 }`) or set the component's custom properties instead of fighting it with `!important`.
- Families: controls (37), navigation (28), feedback (18), overlays (19), data (36), motion (10), backdrops (9), sections (22: heroes, features, pricing, testimonials, FAQ, CTA, stats, newsletter, how it works, team, sign-in, 404, integrations, contact, blog, feature rows, logo cloud, article, before/after, project grid, showcase tabs). Full list: `catalog.json` or `--list`.

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

Palettes are generated by `node scripts/build-tokens.mjs` from `tokens/palettes/source.json` and verified by `node scripts/test-contrast.mjs` (2,268 checks across 36 themes). To add a palette, add seeds there, rebuild and re-test; never hand-edit generated CSS.

## Live gallery

```sh
npm install && npm run preview      # builds preview/dist and opens http://127.0.0.1:4321/
```

Six views: Elements (every pattern with a live, contained demo, numbered parts, plain-language aliases, its source code and a copyable agent prompt), Charts, Styles, Pages, Palettes and Compare (pairs people mix up, side by side). Switch palette, mode, type and style from the Theme panel. Demos never take over the page and never download anything.

## Map

```
SKILL.md                     this file
catalog.json                 every pattern/chart/blueprint/palette with aliases
engine/profiles/             taste profile engine, schema, default profile
engine/compose/              page types, domains and moods behind compose.mjs
evals/                       30 briefs (evals.json), fixtures and reference scores
tokens/                      base.css, layout.css, backdrops.css, palettes/*.css (+ source.json), typography/, styles/
components/ui/<family>/      179 patterns (html, css, ts, react.tsx)
components/charts/           core/ + 42 chart engines (+ React wrappers)
blueprints/                  14 page blueprints (states via ?state=loading|empty|error|incident|sold-out|streaming)
references/                  anti-slop-rules, page-flow, copy-patterns, reading-a-reference, chart-selection, which-one, palettes, harvest-log
scripts/                     compose, directions, search, install-taste, sniff, export-tokens, sample-data, audit-ui, audit-all, lint-copy, eval-score, eval-run, build-tokens, test-contrast, build, serve
```
