---
name: lumina-taste
description: Make interfaces look designed, not generated. Use for any web or app UI (landing, venue, shop, dashboard, settings, docs, auth, checkout, phone and desktop app screens): plan a page from a one-line brief with a rhythm and one bold idea, pick palettes, type by subject, light/dark and styles, add Apple-style scroll moments (pinned scenes, sideways rails, product reveals, counting figures), find and grade public-domain photos or draw the subject when there are none, and match an existing site, brand colour or logo, or export to Tailwind, Next.js and shadcn/ui. Use when a UI element is described loosely (rotating arrow, 9-dot menu, cmd-K box, bottom sheet) to get its real name and code. Use for charts, including story charts. Use to audit a page for overflow, contrast, focus, AI slop and default looks, rhythm, motion budget, touch targets and speed, and to keep a look stable with taste-profile.json. Vanilla HTML/CSS/TS and React, no dependencies.
---

# Lumina Taste

A design kit for coding agents: a **page composer** that plans the page's rhythm and one bold idea from the brief's own words, **24 OKLCH palettes** (light + dark, every pair WCAG-verified), **20 type pairings** chosen by subject, **39 visual styles**, **211 named UI patterns** (including **scroll moments** like a pinned scene, a sideways rail and a product reveal, and **9 page backdrops**), **47 subject drawings** for pages without photographs, a **photo finder that grades every picture to the palette**, **48 chart engines** (including charts that tell a story as you scroll), **27 page blueprints** (marketing pages, a native-feeling phone app, a desktop workspace), a **lockable taste profile**, a **Playwright auditor with a designer's critic** (rhythm, layout repeats, motion budget, app touch targets, speed), a **review pack** for judging screenshots, a **copy lint** and **36 eval briefs** with a score history per agent. Everything is plain TypeScript and CSS with zero runtime dependencies, in vanilla and React.

Run commands from this skill's directory with Node.js 20+. Pass absolute paths (or run from the user's project with the absolute script path). Search, install and token scripts need nothing installed; the auditor needs Playwright; the gallery needs `npm install` once.

## Non-negotiables

Read `references/anti-slop-rules.md` once per session. The short version:

1. **Tokens only.** Colours come from `--bg-*`, `--text-primary|secondary|muted`, `--border-*`, `--accent-*`, `--status-*`, `--chart-*`. Spacing from `--space-*` / `--gap-*` (4px grid). Never raw hex in components.
2. **One accent, one primary button per view.** Status colours mean status, never decoration.
3. **No slop:** no purple→blue/pink gradients, no gradient headline text, no blurry 40px shadows, no emoji as icons, no 5-badge headers, no duplicated filter bars per card, no rotated axis labels, no pies with 5+ slices, no 3D.
4. **Numbers are tabular** (`font-variant-numeric: tabular-nums`) in tables, KPIs, timers, prices and axes.
5. **Every control works by keyboard** and shows a `:focus-visible` ring. Motion uses `--dur-*` / `--ease-*` and collapses under reduced motion.
6. **Plain copy.** No hype words, clichés or exclamation marks; `node scripts/lint-copy.mjs <dir>` must pass. Say what the thing does in one short sentence.
7. **Finish with the auditor.** `node scripts/audit-ui.mjs <url> --taste` must report 0 errors and a taste score of 90 or more.

## Your defaults, reversed

Every model has a look it falls back on, and people now recognise it on sight: indigo buttons and Inter on white; or, when told to avoid that, cream, a book serif and a terracotta accent; or near-black with one acid green. Never swap one default for another. Before you install anything, name three nouns from the subject's world (stoneware, kiln, sea) and take the palette and typeface from them; give the page one risk and keep the rest quiet. If the result is still one of those looks, the subject must ask for it: say why on the page root (`<html data-look-reason="…">`). The critic flags the defaults it can measure. `references/ai-defaults.md` has the full list with a replacement for each, and a note for each model family (Claude, GPT and Codex, Gemini, shadcn-based tools).

## The loop for any page: compose, build, critique

Components are rarely what makes a page look generated; the plan is. Run this loop for every page or screen:

1. **Compose.** `node scripts/compose.mjs "<the user's brief in one line>"` prints a page plan: the design brief (audience, product, primary action, reading pattern, layout, density), a taste profile chosen for the domain, the **art direction** (one signature for this subject, the hero, a layout for every section so no two neighbours share a shape, and where colour and type sizes may go), the sections in order with real catalog ids and a copy formula for each, the states to build, what to avoid, and the install command. Add `--json` to read it as data, `--type <id>` to force a page type, and `--palette`, `--typeface`, `--mode` or `--style` to set the look you chose from the subject (they carry into the install command and the draft). Changed your mind after drafting? Run the install again with the new look: it keeps every part already installed (`--fresh` starts over) and re-themes the kit's own draft or blueprint page, adding the new palette to its stylesheet.
2. **Ask only what is open, and show the look.** The plan's "Ask first" section lists at most three questions the brief leaves unanswered (product name, look, main action, light or dark), each with a default. Ask them in one short message; if the brief answers them, state your brief in two lines and go. A look is a style plus a palette: any style takes any palette (`--style linen --palette forest-brass`), and the composer suggests pairings per domain. When the look is open, do not describe styles: run `node scripts/directions.mjs "<brief>" --out <dir>`, which renders three fitting styles on the same content in one `directions.html` (labelled A, B, C, each with its `--style` flag), and let the person point. "A, but lighter" is a fine answer: keep the style, change the mode or palette. Then lock it (`--lock style,palette`). **Nobody to ask** (a batch job, a subagent, an owner who said "just build it")? Take each question's default, build, and list the defaults you took at the end of your reply so they can be changed. If they sent a reference image or site, read `references/reading-a-reference.md` first.
3. **Install and build** exactly what the plan lists. The quickest correct start is `node scripts/compose.mjs "<brief>" --project <folder> --write`: it runs the install and writes a first draft to `index.html` (never over a page that is already there). A marketing page with a hero is composed band by band from the brief's facts (see "What the plan decides" below), with a TODO list for what the brief did not say. Every other page type is drafted from the brief too: pricing, contact, a shop's product, checkout, docs, a changelog, a status page, sign-in, a 404, a directory, an article and every app screen keep their blueprint's anatomy (`lumina-taste/page.css`, `page.js`) but carry only the brief's plans, prices, address, basket, services, releases, records and fields; app rows are seeded samples labelled with the brief's nouns. (`install-taste.mjs --blueprints <id> --name "<Name>"` starts from a blueprint by hand.) A sample has its own number of things (three tickets, three products, six people, two days): change the count to the real one. The blocks lay out one to four of anything without an empty column or a card alone on a row, so never pad a set to fit. Start from its blueprint when it names one. Follow the section order; skip optional sections you cannot fill with real content rather than inventing it.
4. **Write real copy** with the plan's formulas and `references/copy-patterns.md` (headlines, buttons, empty states, errors, pricing, FAQ): the product's name, real numbers, specific benefits. Never ship lorem ipsum, "Acme", "John Doe" or "Feature one"; the critic fails them. **Never invent customers, quotes, reviews, logos, awards or figures.** If the user gave none, leave that optional section out, or use facts about the product itself (what it does, its limits, its price), and end your reply with a short list of what you assumed and what you still need from them. **No photographs?** `node scripts/find-images.mjs --fill <page> --subject "<the business>"` finds public-domain and CC0 photographs for the page's art panels, downloads them with a credits file and sets them in place (`references/images.md`); look at every one and replace any that do not show the subject itself. Where nothing fits, keep the `art-panel` with the subject's own motif (Workflow I): never a grey box, a stranger's face or a detailed drawing of the product in place of its photograph. For tables, charts and lists, `node scripts/sample-data.mjs users|invoices|orders|series|revenue|funnel|cohort|events` prints realistic, seeded data.
5. **Build the states** the plan lists (loading, empty, error) as well as the happy path.
5b. **Show, do not tell.** Words are captions: a heading and at most one sentence per section, one line per card, and something to look at in every section (the product, a document, a chart, one figure set large). Where you were about to write a paragraph, use the replacement in `references/composition.md` §8b (fee tiles, stacking cards, a scroll statement, a dark media band). Then add motion: `data-entrance` on the hero, `data-scroll` on `<main>`, and at most two moments (§8c).
6. **Do the detail pass.** A page that works is not yet a page that looks designed. Look at it: `node scripts/audit-ui.mjs <page> --taste --screenshots <a temp folder>` writes a first-screen and a full-page picture at 1440px and 390px; open those pictures and read them (delete the folder afterwards). Go through the sixteen looks in `references/composition.md` §10: one left edge, headings broken by sense, one clear first thing, the accent in three places at most, no two neighbouring sections the same shape, cards and pictures in a set matching. Fix what you see before you run the audit.
7. **Critique.** `node scripts/audit-ui.mjs <url> --product "<the product's name>"` (it implies `--taste`; add `--screenshots <dir>` for a first-screen and a full-page capture of every run) fails the page while the kit's sample brands and people (Halyard, Ana López…) are still on it, lists the sample sentences and figures you have not rewritten (and which blueprint or part each came from), links that still lead to the sample's own pages, phone number or email, and links that point nowhere, and checks it like a designer would: type steps, accent hues, corner radii, one primary per screen, reading width, heading order, cards inside cards, section rhythm, a clear first thing to look at, three sections in a row with the same shape, runs of centred sections, content off the shared left edge, a heading that breaks inside a hyphenated word, a heading that strands its last word, the accent used as wallpaper, placeholder copy and long button labels. Fix every error, then warnings, until the score is 90 or more. Then take screenshots at 390px and 1440px and look at them.

### What the plan decides before any code

- **Rhythm.** One line per page, e.g. `hero ▇ XL · tiles ▇ · steps ▁ ✦ pinned scene · visit ▇ dark · close ▁ XL brand`: each band's density (▇ busy, ▁ quiet), type scale (XL only for the first screen and the close) and ground (plain, well, the one dark band, the one brand band, a picture). Never three busy bands in a row, no two neighbours on the same ground or layout, and the close repeats the action. `--write` drafts carry it as `data-tone`, `data-rhythm` and `data-scale`; keep the rules if you move a section (`references/page-flow.md` §0b).
- **One bold idea**, from the brief's own figure ("the £40,000 fixed price set huge on navy") and where it lives. Everything else stays quieter. With no figure in the brief, the plan asks for one.
- **Moments**, at most two, never side by side, marked ✦ in the strip: a pinned scene for a product's three or more steps, a sideways rail for five or more things, a picture's zoom, the statement, figures that count up.
- **Words from the brief, band by band.** `--write` composes a marketing draft from the brief's facts: prices with what they buy, times and days, the address, phone and hours, named people, steps, claims, counts with their period. Each band is drawn from them or left out; nothing from a sample business survives. What the brief did not say is one TODO list at the top of the draft and under "Still needed" in the plan. Give the composer more facts and the page grows.
- **Every band shows something.** Panels carry the subject's own motif (never the same twice on a page), software gets its product on a device (a live kit screen built from the brief's words, never a sample document), prices and counts are set large, opening hours become a table. `--images` also runs find-images on the draft (it downloads, so it is off by default).
- **Lettering by subject.** Trades get `stamped`, construction `stencil`, events `stadium`, health `hyperlegible`, travel and transport `signage`, law `legal`, developer tools `workbench` (light), education `schoolbook`. The plan gives the reason; `--typeface` wins.
- **Apps as a flow.** For a phone app, desktop work app, dashboard, admin list, inbox, settings, assistant, agent or directory, the plan lists the screens in the order they are used (first run → first useful screen → one record → settings) and the words for the empty, loading and error states, from the brief's nouns ("No bookings yet", "Loading bookings", "Bookings could not load"). `--write` drafts a phone app as every screen side by side (`?screen=home` opens one) and the others as their main screen with the record in a drawer or inspector; every draft opens with `?state=loading|empty|error`.
- **Never invented tiers or customers.** One price is one plan; columns are the brief's fields ("bookings with dog, owner, date and status"); rows say they are samples by their names ("Customer 03").
- **Brand from what the user has.** `--brand-from "#e63312"`, `--brand-from logo.svg` (dominant colours read in headless Chromium) or `--brand-from ./old-site/index.html` / a URL (sniff reads its CSS variables and fonts) gives the nearest palette or the brand's accent solved for contrast, a typeface with a reason and a tone note. It never hands back a default look; the plan says why.

`evals/evals.json` holds 36 real briefs; `node scripts/eval-score.mjs <output> --brief <slug>` scores any page you build for one of them (audit, taste, brief checks and hygiene, out of 100). The blueprints score 99 on average as reference answers.

## Look at it like a designer

The auditor measures; your eyes judge. After the audit passes:

1. `node scripts/review-page.mjs <page> --out <dir>` writes a review pack: the first screen at 1440×900 and 390×844 in light and dark, a squint (blurred, grey) of each with what stands out, the whole page in screen-height slices, `review.json` (per section: what it gives the eye, layout, ground, density; the type jump; scroll moments; app checks; speed) and `review.md`.
2. Open every picture and answer the seven questions in `review.md` in your own words: clear in 3 seconds? what stands out at a squint, and is it the right thing? one bold idea? any section a template? every section something to look at? does the type jump? would a demanding designer ship it, and if not, the three changes? Name sections and sizes; "looks good" is not an answer (`references/review.md` has a worked example). Fix, then run the pack again.
3. Before and after, or yours against another page: `node scripts/compare-pages.mjs ours=<page> other=<page> --out <dir>` letters them at random; score with `judge.md`, then `--record "A>B" --reason "…"` reveals the names and keeps a tally per source.

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
   - Style (optional): one of 39 looks in `tokens/styles/source.json` (studio, swiss, editorial, neobrutal, terminal, glass, soft, clay, retro, blueprint, lucid, flat, minimal, paper, elevated, newsprint, mono, graphite, atelier, nordic, kraft, midnight, playful, enterprise, zen, tonal, system, noir, bauhaus, ticker, linen, signal, ledger, volt, civic, trace, graph, ember, pixel). `--style swiss` brings its palette, mode, type and radius; explicit flags still win. Pick a style only when the brief names a mood; default is none.
2. **Install only what the page needs** (writes `taste-profile.json`, copies tokens + chosen files + their imports, nothing else). `--framework static` is for plain HTML with no build step; pages work from `file://`. `vanilla` copies the TypeScript sources for a bundler; `react` copies the `.react.tsx` wrappers.

   **Static, from a blueprint** (when `compose.mjs` says "start from the blueprint"). One command writes the finished page into the project folder:
   ```sh
   node scripts/install-taste.mjs --project /abs/app --framework static --blueprints venue
   # → /abs/app/index.html, main.css, main.js and taste-profile.json. An index.html that is already there is never replaced: the page goes to venue/ beside it.
   ```
   Everything in that page is sample content: every brand, person, sentence, number and link. Rewrite all of it (step 4 of the loop). When the page needs a part or a chart the blueprint lacks, run the same command again with `--components <ids>` and/or `--charts <ids>` added and link `lumina-taste/lumina.css` and `lumina.js` after `main.css`.

   **Static, from snippets** (when it says "build from the snippets"). Files go to `<project>/lumina-taste/` unless you pass `--dest`: one `lumina.css`, one `lumina.js` (enhances every `[data-lt]` element on load, charts on `lumina.charts`) and `snippets/<id>.html` to paste.
   ```html
   <html lang="en" data-palette="navy-sand" data-mode="light" data-type="financial" data-density="balanced" data-radius="balanced" data-motion="snappy">
   <link rel="stylesheet" href="lumina-taste/lumina.css"><script defer src="lumina-taste/lumina.js"></script>
   <body>
     <header class="lt-nav-simple" data-lt="navbar-simple">…</header>
     <main>
       <!-- Section blocks (hero, features, pricing, FAQ…) go straight in <main>, one after another. They centre and pad themselves. -->
       <section class="lt-hero-split">…</section>
       <!-- Anything that is not a section block (an app screen, a chart, a table) gets a container from you. -->
       <div class="lt-container lt-stack"> … <div id="mrr"></div> … </div>
     </main>
   </body>
   <script>addEventListener('DOMContentLoaded', () => lumina.charts['multi-line-chart'](document.getElementById('mrr'),
     { x: ['Jan', 'Feb', 'Mar'], series: [{ name: 'Team', values: [12, 14, 18] }] }, { title: 'Team plan pulled ahead', subtitle: 'MRR, £k' }));</script>
   ```
   Only the charts you pass to `--charts` are in `lumina.charts`; the installer lists them. `node scripts/search.mjs --card <chart-id>` prints the data shape and the options.

   Things people trip on: **fonts** need nothing (pages use faces already on the device, chosen to match, and work offline; the web-font link the installer prints is optional). **One mode only**: the auditor flips `data-mode` to test light and dark; if the page ships one, pass `--modes dark` (or `light`). **Anchors**: give each section an `id` and point nav links at them; `--product` audits list links that go nowhere.
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

Starting fresh on one of these stacks: `install-taste.mjs --framework tailwind` writes the static kit plus `tailwind.css` (Tailwind v4 `@theme inline` on the kit tokens; `dark:` follows `data-mode`). `--framework next` writes an App Router `app/layout.tsx` with the no-flash theme script, `app/globals.css`, `app/page.tsx` from the blueprint or blocks (with `--name`), and `app/lumina-enhance.tsx` for behaviour; it never overwrites your own `app/*` files and installs no packages.

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
6. Options that carry the story, on every line and area chart: `highlight: 'Team'` (one series in colour, the rest grey; on grouped bars it names the series to emphasise), `annotations: [{ at, label }]` (events), `target: { value, label }` (a goal or limit line), `band: { lower, upper }` (a range behind the line), `forecastFrom: index` (dashed from there on, and the tooltip says forecast), `step: true` (values that hold then jump). `forecast-chart`, `step-chart`, `ridgeline-chart` and `cohort-grid` wrap the common cases.
7. Formats: `formatNumber(v, { prefix: '£', compact: true })` → `£24.4k`; `{ suffix: ' fps', decimals: 1 }` → `60.1 fps`; `{ percent: true, sign: true }` → `+12.4%`; dates → `Nov 24`.

## Workflow E · Whole pages from blueprints

| Blueprint | id | Starts you with |
| --- | --- | --- |
| Product / SaaS landing | `landing` | Mega-menu navbar, one-CTA hero, live product frame, a pinned three-step scene, bento, quote, CTA band, contrast footer |
| Financial & analytics dashboard | `dashboard` | Collapsible sidebar, one filter row, ten compact KPIs with sparklines on one surface, one main chart with its breakdown beside it, a sortable 24-row table with a sticky header; loading and error states |
| Editorial portfolio | `editorial` | Serif/sans, generous measure, selected work as results on a sideways rail, essay with pull quote |
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
| Developer tool landing | `devtool` | Floating pill nav over a grid hero with circuit traces, install command beside the action, typed terminal, tabbed code, API rows, figures, one quote |
| Agent workspace | `agent` | Workspace switcher and sessions by project, a composer over a dither backdrop, and a running session with a plan, a diff and an approval bar; empty and running states |
| Place or venue | `venue` | What it is and where, offers with prices on art panels, a booking bar that answers in a sentence, address and opening hours, questions |
| Support inbox | `inbox` | Views, conversation list with search and unread state, thread with reply or note, customer details; one pane at a time on phones; empty state |
| Calculator | `calculator` | Money fields and sliders, a live answer with the one action (pinned on phones), a chart that explains it, questions |
| Episode page | `episode` | Title and guest, a player that stays in reach, chapters that seek, a readable transcript with a progress bar, earlier episodes |
| Local or professional service | `practice` | Who it is for and where, services and fees as ruled rows with prices in one column, the first visit in three steps, people with their qualifications, address and opening hours, questions, a booking band with the phone number |
| Charity or community group | `cause` | The claim as a fact with three true figures, how to get help with session times, where each pound goes as one bar that adds up, ways to help as rows, one giving action |
| Maker or product brand | `shop` | The object and its price in the first screen, the range as three art panels at one ratio, how it is made as a pinned scene, a before-and-after glaze slider, materials and care as plain facts, delivery and returns, a buying band |
| Event or conference | `event` | The date and place above a statement headline with three figures, the programme as timed rows, speakers as ruled rows with their talks, three tickets, venue and door times, questions |
| Phone app screen | `mobile` | Collapsing large title, one headline figure with a week of bars, whole-row lists, primary action above bottom tabs, a bottom-sheet form; loading and empty states |
| Phone app, whole flow | `app-phone` | Six working screens (choose, today, detail, pay, tickets, settings) side by side on desktop and one at a time on a phone: tab bar, large title, swipe rows, pull to refresh, a sheet with detents; `?screen=` opens one; loading, empty and error states |
| Desktop work app | `workspace` | Saved views in a resizable sidebar, a calm dense table with sticky header, an inspector, J/K, ⌘K and `?` shortcuts, a delay dialog that updates the row; one pane at a time below 860px; loading, empty and error states |

```sh
node scripts/install-taste.mjs --project /abs/app --blueprints dashboard --dest src/pages
```

Open any data blueprint with `?state=loading`, `?state=empty` or `?state=error` (status: `incident`, store: `sold-out`, assistant: `streaming`, agent: `running`) to see the other states; blocks marked `data-view="…"` switch, and buttons with `data-set-state` switch live. Ship every state your page has, not just the happy path.

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
| `taste-type-scale` (`--taste`) | Collapse sizes to 5–7 steps: the type scale is `--step--1` to `--step-5` for reading and headings, `--text-ui`, `--text-ui-sm` and `--text-ui-xs` for interface text; sizes within 8% count as one. |
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
| `taste-no-visual` | A section of words only: give it a picture, a motif, a figure set large, a document or a chart, or fold it into a neighbour. |
| `taste-same-layout` | Two neighbours with the same block, columns and ground: change one's layout or ground. |
| `taste-density` | Three dense sections in a row: put a quiet one (a statement, a picture band) between them. |
| `taste-type-jump` | The headline is under 2.5× the body on a marketing page: set it larger, or the body smaller. |
| `taste-motion-*` | More than two scroll moments, two side by side, two pinned scenes, film with sound or no pause, a counter with no number, a pinned scene under `overflow: hidden`. Keep the two best. |
| `app-touch-target` · `app-safe-area` · `app-states` | On app screens at phone width: controls under 44px, a fixed bottom bar without `env(safe-area-inset-bottom)`, a declared state with no view. |
| `perf-*` (`--perf`, and `--strict` as warnings) | A lazy largest picture, no `fetchpriority`, layout shift over 0.1, heavy fonts, JS or CSS, images without width and height or more than twice their box. |

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

## Workflow H2 · Composition: layouts that fit the subject

The blocks are the same for every page; what makes a page look designed for its subject is how they are composed. `references/composition.md` is the full guide. The tools:

| Where | Attribute | Effect |
| --- | --- | --- |
| A heading-and-body block (features, offers, steps, figures, quotes, team, posts, integrations) | `data-layout="rail"` | Heading in a left column that stays put, body on the right. Grids drop a column; three items become rows; steps run down a line. |
| | `data-layout="centre"` | Heading centred above a symmetrical body. |
| | `data-layout="split"` | Heading left, its lede right, on one line. |
| Any block | `data-space="tight"` / `"open"` | Pull a proof strip close; let a lone quote stand apart. |
| Any section | `data-tone="well"` / `"dark"` | A tinted band, or the page's one dark band. Sections differ by space, scale and ground, not by rules or a label over every heading. |
| `<main>` | `data-separators="rules"`, `data-numbered` | Rules and numbered labels, for a real publication only. |

Three heroes: `hero-split` (something to show: a product frame, or `<div data-part="visual">` with a device frame, code, a chart, a photograph or an art panel), `hero-centered` (a wide picture under the words, or a backdrop) and `hero-statement` (no picture: one very large headline, then a ruled row with the pitch, the action and three facts).

Rules: one signature per page; never the same shape twice in a row; at most two rails; centre only what is symmetrical; the accent in three places at most; one left edge from the logo to the footer. `compose.mjs` assigns layouts that satisfy these; the critic reports the ones it can measure.


Sections that show instead of tell (each replaces a paragraph):

| Block | Use it for |
| --- | --- |
| `scroll-statement` | The one claim of the page, 12 to 25 words, lighting up word by word as it scrolls |
| `stack-cards` | Three to five steps as large cards that pin and stack, each with a picture |
| `media-band` | One claim and one large picture on a dark band, with three figures. One per page |
| `gallery-rail` | Five to twelve pictures at one ratio in a row that runs off the edge and snaps |
| `bento-grid` in a plain section | Up to six things with a figure each: fees, plans, ways to help |
| `invoice-sheet` | The document a product or service produces, as the picture |

Any section takes `data-tone="dark"` for the page's one dark band (the palette's own dark colours, scoped).

### Motion: scroll moments, with restraint

Read `references/motion.md`. One entrance (`data-entrance` on the hero), the reveal (`data-scroll` on `<main>`), and at most two scroll moments per page, never next to each other, never on app screens or forms. The critic counts them.

| Moment | Use | Part |
| --- | --- | --- |
| Pinned scene | One frame (a phone, a screen) changing over three or four steps | `sticky-story` (`data-mark` on what each step is about) |
| Sideways scroll | Five to eight pieces of work to browse | `side-scroll` (pins on wide screens, a swipe row on phones) |
| Product reveal | The single strongest product picture | `product-reveal`, or `data-zoom="open"` on any picture |
| Zoom, statement, stack | A big photo; the one claim; steps with pictures | `data-zoom`, `scroll-statement`, `stack-cards` |
| Numbers that settle | Three or four true quantities | bare `data-count` on the figure (`stats-band` has it); `data-lt="number-settle"` on `<main>` elsewhere |
| Before and after | One picture in two states | `before-after` (a native range: keyboard, drag, touch) |
| Video hero | A real 8 to 20 second film of the subject | `hero-video`: the film in `data-src`, a still first, a pause button |
| Page changes | A list picture opening into its page | install `view-transition`, `<html data-vt>` on both pages, the same `data-vt-name` on both pictures |

Write the true value in the HTML (the count's final number, every step's picture): no script, reduced motion and print all show the page at rest. Animate transform and opacity only; no scroll listeners; no `overflow: hidden` above a pinned block. The auditor runs with reduced motion, so also look at the page with motion on at several scroll positions (1440 and 390) before you ship.
## Workflow I · Subjects that are not software, and no photographs

Most pages are not for software, and a software page with the words changed never fits. `compose.mjs` reads the subject from the brief and plans the page that subject needs; each has a blueprint that is already that page.

| The brief is about | Page type | Blueprint | What carries the page |
| --- | --- | --- | --- |
| A dentist, clinic, physio, salon, solicitor, accountant, plumber, tutor | `service-landing` | `practice` | Services and fees as ruled rows, the first visit, named people, where to find them |
| A café, restaurant, bar, bakery, distillery, hotel, museum | `venue` | `venue` | What is on offer with prices, a booking bar, the address and opening hours |
| A maker, a shop, a product brand, a subscription box | `brand-landing` | `shop` | The object and its price, the range at one ratio, how it is made, delivery and returns |
| A charity, food bank, club, campaign | `cause` | `cause` | The claim with true figures, how to get help, where the money goes, ways to give |
| A conference, festival, course, wedding | `event` | `event` | The date and place, the programme as timed rows, speakers, tickets |
| A studio, agency, photographer, architect | `portfolio` | from parts | A statement and the work, large |
| Software | `landing`, `dev-landing` | `landing`, `devtool` | The product working: a real screen, a chart or code |

Never give the first five rows logo walls, feature grids, dashboards or "Start free". If the composer picked the wrong row, rerun it with `--type <page type>`. The blueprint's words are about one fictional business: rewrite every sentence for the real one (the critic lists what is left).

When the page needs a picture and there is none:

```html
<figure class="lt-art" data-tone="accent" data-shot="Bottle on pale stone, soft side light, 4:5">
  <p data-part="index">01</p><p data-part="name">Cleanser</p><p data-part="fact">150 ml · pH 5.5</p>
  <figcaption class="lt-visually-hidden">Dew Cleanser, 150 ml</figcaption>
</figure>
```

- The **art panel** sets the thing's name large on a tinted panel with one true fact. `data-variant="figure"` sets one number large instead ("20 min", "410"); `data-tone="swatch"` with `style="--art: <colour>"` shows the product's own colour; `data-frame` adds a printed keyline for a hero-sized panel. Vary `data-tone` (plain, `accent`, `ink`) across a set; add `data-backdrop="lines|dots|grain"` on a large one.
- `data-shot` is the photo brief for the owner. When the photo arrives, put the `<img>` first inside the figure and it covers the panel.
- `hero-split` takes it in `<div data-part="visual">` in place of the product frame; `offer-cards` uses it for each card.
- Rows or cards? Four or more things, or anything people compare by price or time (treatments, practice areas, a menu, a programme): `service-list`, ruled rows with every price in one column. Two to four things worth a picture each: `offer-cards`.
- Parts for places: `offer-cards` (things with prices), `booking-bar` (date, time, people, one answer in a sentence), `visit-info` (address, getting here, hours with today marked), `faq-section` for "before you come".
- A flat motif of the subject's own thing (`data-motif="cup"`, 47 of them; see Pictures below) is a sign, not a portrait: fine. Never a detailed drawing of the product or the building in place of its photograph, never a stock photo of something else, never a grey rectangle.
- No photographs of people either? `team-grid` with `data-variant="list"` sets them as ruled rows of name, role and one line instead of initials on tiles.

### Pictures: art-directed, not stock

- No photographs? `node scripts/find-images.mjs --fill <page> --subject "<the business>" --out <page dir>/images` searches Openverse and Commons (CC0 and public domain, one request at a time), skips artworks, watermarks, old photographs, people and off-topic matches, and sets the best match in each art panel's `data-shot` slot. It downloads: run it when the user wants photographs.
- Every picture is treated as one set: cropped to one ratio (`--ratio`, else the panels' own), graded to the page's palette (`--grade tint|duotone|mono|warm|cool|natural|none`), given a focal point (`object-position`; `--focus x,y` or `file@x,y`), and saved as WebP at 640, 1080 and 1600px with `srcset`, `sizes`, width and height, eager with `fetchpriority="high"` on the first screen and lazy below. `credits.json` records source, licence and treatment.
- **Curated first.** Each business type has a hand-checked starter set of public-domain and CC0 photographs (`engine/photos/<set>.json`: one per page-types domain, plus `cafe` and `bakery`, 231 in all, each with a focal point chosen by eye). `--fill` uses the set first and searches only for briefs the set cannot show; the hero chooses first, each photograph is used once, and the set's tones stay together. Where a third of a section or more is photographed, the rest gets curated stand-ins (marked "stand-in" in the log) rather than a mix of photos and drawings; replace them with the business's own pictures. `--starter <set>` lists a set (`--pick 1,3` or `--pick all` fetches it); `--no-complete` keeps the drawings; `--no-starter` searches only. Software: the picture is the product working (device-frame), not a stock photograph.
- The person's own photos: `node scripts/treat-images.mjs --page index.html` (or list the files).
- Where nothing fits, the art panel draws the subject's own thing: `data-motif` with one of 47 flat drawings (cup, loaf, crane, document, scales, bus, boat, paw, stethoscope, terminal, jar…; `references/images.md` lists them by kind), on a disc, `data-pattern="arch"`, `"floor"` or `"none"`. `--fill` picks and writes these; `data-motif="auto"` picks from `data-shot`. One stroke weight, theme tokens only.
- Software: show the product with `device-frame` `data-kind="laptop"` (and a phone in front), a real screenshot `<img>` in the screen, or a live screen built from the kit: `<div data-app="desktop|phone" inert>`. One device shot per page.
- Look at every picture before you keep it.

### Scenes, micro-interactions and the line weight

- **Scenes for a hero-sized panel.** `data-scene="cup bag"` on an `art-panel` draws two or three motifs on one ground (counter, line, water or road): the biggest stands behind, the next in front overlapping it, anything that does not stand hangs above, and only the first name, the subject, is in the accent. `data-scene="auto"` picks from `data-shot`; `pickScene(brief)` / `sceneSvg(names)` do the same in code. One scene per page, in the hero; single motifs elsewhere.
- **The line follows the lettering.** `--motif-stroke` is set per type pairing: heavy for slab, stamped, stencil and stadium, fine for didone, legal, editorial and bookish. Never set a stroke width on a drawing by hand.
- **Micro-interactions are built in** (`references/motion.md` §8): a pressed button sinks 1.5px and springs back (never a scale-up on hover), a switch thumb overshoots and settles, a tick draws itself, a field that fails on blur or submit shakes once with its message (never while typing), a copy button says "Copied" in place. All still under reduced motion and `data-motion="reduced"`.

## Workflow J · App screens and chart stories

Read `references/apps.md` and `references/chart-selection.md` §6–7.

- **Phone app.** Start from `app-phone` (the whole flow) or `mobile` (one screen). Put `data-app` on `<html>` and `viewport-fit=cover` in the viewport meta. Parts: `mobile-app-bar` (large title that shrinks on scroll), `bottom-nav` (three to five tabs, safe-area inset), `swipe-row` (actions on swipe; a focusable "More actions" button is the keyboard path), `pull-refresh` (always with its Refresh button), `bottom-sheet` with `data-detents="medium large"`, `segmented-control`, `number-stepper`. Touch targets 44px or more, one filled primary per screen, settings act at once.
- **Desktop work app.** Start from `workspace`: saved views in `app-sidebar`, a `pane-resizer` on each pane edge, `command-palette` on ⌘K, `shortcuts-sheet` on `?`, keys shown on the buttons they trigger, J/K move the selection and the inspector follows. The page never scrolls; panes do. Below 860px, one pane at a time.
- **Dashboards that hold a lot.** `dashboard`: eight to twelve `kpi-card`s with `size: 'compact'` on one surface, one main chart with its breakdown beside it, one filter row, a 20+ row `data-table` with a sticky header and a sparkline column.
- **A chart that makes a point.** `chart-story`: the question, the answer as a headline, one moment lit with a sentence, the rest muted. Two to four beats: `chart-story-scroll` builds the chart as the reader scrolls (still and complete under reduced motion and in print; set `--story-top` under a sticky header). One per page; never on app screens or dashboards.
- Every app blueprint ships `?state=loading|empty|error`.

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
- Families: controls (42), navigation (32), feedback (19), overlays (19), data (43), motion (12), backdrops (9), sections (35: heroes including a video hero, features, pricing, testimonials, FAQ, CTA, stats, newsletter, how it works, team, sign-in, 404, integrations, contact, blog, feature rows, logo cloud, article, before/after, project grid, showcase tabs, featured quote, the pinned scene, side scroll, product reveal, scroll statement, stack cards, media band, gallery rail, service list, offer cards, visit information). Full list: `catalog.json` or `--list`.

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

### Type

20 pairings, each chosen for a kind of subject (`references/typography.md` has the table): signage (transport), hyperlegible (health), stamped (trades, roasters), stadium (sport, events), legal (law, policy), workbench (developer tools on a light ground), schoolbook (children, education), stencil (construction), plus editorial, bookish, financial, dense, didone, humanist, geometric, rounded, swiss, slab, technical, and precision (app screens only). Find one by subject: `node scripts/search.mjs "font for a law firm" --kind typography`; install with `--type stamped` or `compose.mjs --typeface stamped`.

- Give the typeface a reason from the subject ("a slab, because the bags are stamped"). Never one stock sans for headline and body on a page with a hero.
- Use the scale steps (`--step--2` to `--step-5`), one `--step-5` per page. Headline and body differ by 200 or more in weight when they share a family.
- Variable faces expose what is loaded as `--axis-<role>-<axis>-min/-max`; optical sizing is automatic where a face has it; `stadium` sets `--stretch-display` for its wide headlines.
- Fonts need nothing: stacks fall back to installed faces with the same character. For production, self-host: `node scripts/fonts.mjs --pairing <id> --out <project>/fonts` writes WOFF2 files, `fonts.css` (swap, unicode-range, metric-matched fallback faces so nothing shifts) and `preload.html`. It downloads: run it only when the user wants self-hosted fonts (`--dry-run` prints the request).

Palettes are generated by `node scripts/build-tokens.mjs` from `tokens/palettes/source.json` and verified by `node scripts/test-contrast.mjs` (3,024 checks across 48 themes). To add a palette, add seeds there, rebuild and re-test; never hand-edit generated CSS.

## Live gallery

```sh
npm install && npm run preview      # builds preview/dist and opens http://127.0.0.1:4321/
```

Eight views: Elements (every pattern with a live, contained demo, numbered parts, plain-language aliases, its source code and a copyable agent prompt), Charts, Styles, Pages, Palettes, Compare (pairs people mix up, side by side), Moments (every scroll moment and micro-interaction playing in its own stage, with replay and a reduced-motion switch) and Before / after (a generic assistant-written section beside the kit's version of it). Switch palette, mode, type and style from the Theme panel. Demos never take over the page and never download anything.

## Map

```
SKILL.md                     this file
catalog.json                 every pattern/chart/blueprint/palette with aliases
engine/profiles/             taste profile engine, schema, default profile
engine/compose/              page types, domains and moods behind compose.mjs
evals/                       36 briefs (evals.json), fixtures, reference scores, history.json
tokens/                      base.css, layout.css, backdrops.css, composition.css, scroll.css, palettes/*.css (+ source.json), typography/, styles/
components/ui/<family>/      211 patterns (html, css, ts, react.tsx)
components/charts/           core/ + 48 chart engines (+ React wrappers)
blueprints/                  27 page blueprints (states via ?state=loading|empty|error|incident|sold-out|streaming|running)
references/                  anti-slop-rules, ai-defaults, review, images, motion, typography, apps, page-flow, composition, copy-patterns, reading-a-reference, chart-selection, which-one, palettes, harvest-log
scripts/                     compose, directions, search, install-taste, sniff, export-tokens, sample-data, find-images, treat-images, fonts, audit-ui, audit-all, review-page, compare-pages, lint-copy, eval-score, eval-run, eval-history, pack-skill, build-tokens, test-contrast, build, serve
```

Measure agents over time: `node scripts/eval-run.mjs --agent '<command with {prompt}>' --label <agent>` scores each brief and records it in `evals/history.json`; `node scripts/eval-history.mjs` prints the trend per agent and per brief. Install the skill lean into an agent's skills folder with `node scripts/pack-skill.mjs --out <skills-folder>/lumina-taste [--zip]` (no tests, gallery or dev files).
