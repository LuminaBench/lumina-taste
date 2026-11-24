# Lumina Taste

Interfaces that look designed, not generated. A taste kit for coding agents: 18 verified palettes, 35 visual styles, 165 named UI patterns, 42 publication-grade charts and 14 page blueprints, a page composer that turns a one-line brief into a plan, and an auditor with a page-level taste critic that catches slop before your users do.

## Install

With Git and Node.js 20 or newer installed, run this command and select your coding agent.

```sh
npx skills add LuminaBench/lumina-taste -g
```

Open a fresh agent session in your project and try one of these prompts.

> Use lumina-taste to build a pricing page for my app with a monthly/annual toggle. Navy and sand, soft corners.

> Use lumina-taste to add a sortable accounts table and a revenue chart to my existing dashboard without touching my current styles.

> Use lumina-taste to audit http://localhost:3000 on mobile and dark mode, then fix everything it finds.

> Use lumina-taste to restyle my landing page so it stops looking generated. Keep all the content.

<details>
<summary>Update or remove Lumina Taste</summary>

**Update**

```sh
npx skills update lumina-taste -g
```

Open a fresh agent session after updating. Components already copied into a project keep their version; ask your agent to reinstall the ones you want to refresh. Your `taste-profile.json` and its locks are kept.

**Remove**

```sh
npx skills remove lumina-taste -g
```

</details>

## What's inside

| | Count | Highlights |
| --- | ---: | --- |
| **Palettes** | 18 × light/dark | Cream & Charcoal, Deep Navy & Warm Sand, Matte Black & Signal Orange, Lab Monochrome & Acid Lime… Every text, control and chart pair is checked: primary text ≥ 7:1, all other text ≥ 4.5:1, UI marks ≥ 3:1. |
| **Type pairings** | 12 | Editorial serif + grotesque, precision dev sans + mono, financial condensed, warm humanist… Fluid `clamp()` scales, tabular numbers everywhere they matter. |
| **Visual styles** | 35 | Monochrome, graphite, atelier, nordic, kraft, midnight, playful, enterprise, zen, swiss, editorial, neobrutalism, terminal, glass, soft, clay, retro, blueprint, paper, newsprint… One attribute restyles borders, surfaces, shadows and fields across every component. |
| **UI patterns** | 165 | Rotating chevrons, sliding pill toggles, OTP input, ⌘K palette, bulk action bar, kanban board, chat thread, prompt composer, carousel, lightbox, swipe actions, @-mentions, plus ready page sections: heroes, pricing, FAQ, testimonials, sign-in, 404… Vanilla HTML/CSS/TS **and** React, keyboard-complete, `@scope`-isolated. |
| **Charts** | 42 | Benchmark leaderboards (ranked columns, leaderboard table, range bars, trade-off quadrant, Pareto frontier), line, area, bars, slope, dumbbell, waterfall, histogram, box plot, beeswarm, bump, small multiples, heatmaps, candlestick, Sankey, treemap, Gantt, waffle, radar… Magnetic crosshair, direct labels, keyboard navigation. |
| **Page blueprints** | 14 | Landing, dashboard, editorial, docs, pricing, settings, directory, auth, admin list, status page, changelog, store product page, checkout, AI assistant chat. Data pages ship loading, empty and error states. |
| **Page composer** | 20 page types | `compose.mjs "landing page for an invoicing tool"` prints the design brief, a profile chosen for the domain, the sections in order with real ids and a copy formula for each, the states to build and the install command. |
| **Taste profile** | 1 file | `taste-profile.json` pins palette, mode, type, density, radius, motion and style. Lock what you love; agents leave locked parts alone. |
| **Auditor** | 12 + 13 rules | Overflow, clipped or overlapping text, contrast, focus rings, tabular numbers, dead controls, purple gradients, heavy shadows, emoji icons, hype copy. `--taste` adds a page-level critic (type steps, accent hues, radii, one primary per screen, reading width, heading order, nested cards, section rhythm, focal point, placeholder copy, button labels) and a score out of 100. Desktop + mobile, light + dark. |
| **Evals** | 30 briefs | `eval-score.mjs` scores any page an agent builds for a brief; `eval-run.mjs` runs your agent over all of them. In ten pilot runs across ten page types, every agent following the skill finished with 0 audit errors under the rules of the day, most on the first or second audit; the generated-looking fixture page scores 26. Each round made the critic stricter: it now also fails empty placeholder visuals and the kit's own sample names left on a page, which puts the latest round at 90 on average when re-scored. |
| **Adapters** | 3 | `sniff.mjs <url>` matches an existing site to a profile; `export-tokens.mjs` writes shadcn/ui variables or a Tailwind 4 / 3 theme; `--framework static` installs one CSS and one JS file for plain HTML. |

Ask for things the way you'd describe them: "the rotating arrow", "the 9 dots menu", "the bar that appears when I tick rows". The catalog knows them by those names.

<details>
<summary>CLI commands for search, install, audit and the live gallery</summary>

Run these from the installed skill directory or a clone of this repository.

```sh
node scripts/compose.mjs "pricing page for a developer API"
node scripts/search.mjs "bar when ticking rows"
node scripts/search.mjs --card bulk-action-bar
node scripts/install-taste.mjs --project /path/to/app --framework react --palette slate-forest --components data-table,command-palette --charts kpi-card
node scripts/install-taste.mjs --project /path/to/app --attach --root "#panel" --components toast-stack
node scripts/install-taste.mjs --project /path/to/app --density dense            # locked axes stay put
node scripts/audit-ui.mjs http://localhost:3000 --taste
node scripts/sniff.mjs http://localhost:3000
node scripts/export-tokens.mjs --format shadcn --palette navy-sand > app/globals.css
node scripts/sample-data.mjs invoices --rows 20 --format csv
node scripts/eval-score.mjs ./out --brief saas-landing-invoicing
```

The installer copies only what you ask for plus the files those import, and writes `taste-profile.json`. Colour overrides are contrast-checked before they are accepted. The auditor needs Playwright (`npm i -D @playwright/test && npx playwright install chromium`).

**Live gallery**

```sh
npm install
npm run preview
```

Look up any element by describing it, see it live in a contained demo with its parts numbered, copy a prompt for your agent, and switch palette, mode, type and style from one panel. `npm test` runs the contrast checks, copy lint, unit tests, type checks, 177 browser tests and the full audit.

</details>

## License

You can use, modify and ship the components, charts, palettes and blueprints in personal or commercial websites, apps, SaaS products and client work for free, with no royalties or attribution required. The CLI, auditor and `SKILL.md` use MIT. The design library license prohibits redistributing, rebranding or reselling the catalog as a competing UI kit, template pack, dataset or Agent Skill. [Full license](LICENSE)

---

**Support** · [LuminaBench](https://luminabench.com) · [Sponsor LuminaBench on GitHub](https://github.com/sponsors/LuminaBench)
