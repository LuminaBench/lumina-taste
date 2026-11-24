# Lumina Taste

Interfaces that look designed, not generated. A taste kit for coding agents: 18 verified palettes, 84 named UI patterns, 22 publication-grade charts and 8 page blueprints, plus an auditor that catches slop before your users do.

## Install

With Git and Node.js 20 or newer installed, run this command and select your coding agent.

```sh
npx skills add LuminaBench/lumina-taste -g
```

Open a fresh agent session in your project and try one of these prompts.

> Use lumina-taste to build a pricing page for my app with a monthly/annual toggle. Navy and sand, soft corners.

> Use lumina-taste to add a sortable accounts table and a revenue chart to my existing dashboard without touching my current styles.

> Use lumina-taste to audit http://localhost:3000 on mobile and dark mode, then fix everything it finds.

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
| **UI patterns** | 84 | Rotating chevrons, sliding pill toggles, OTP input, ⌘K palette, bulk action bar, query builder, flip clock, stacking cards… Vanilla HTML/CSS/TS **and** React, keyboard-complete, `@scope`-isolated. |
| **Charts** | 22 | Line, area, bars, diverging, lollipop, scatter (Canvas at scale), bubble, sparkline, heatmaps, candlestick, donut, gauge, funnel, Sankey, radar, KPI card. Magnetic crosshair, direct labels, SVG/PNG export. |
| **Page blueprints** | 8 | Landing, dashboard, editorial, docs, pricing, settings, directory, auth. |
| **Taste profile** | 1 file | `taste-profile.json` pins palette, mode, type, density, radius and motion. Lock what you love; agents leave locked parts alone. |
| **Auditor** | 11 rules | Overflow, clipped or overlapping text, contrast, focus rings, tabular numbers, dead controls, purple gradients, heavy shadows, emoji icons. Desktop + mobile, light + dark. |

Ask for things the way you'd describe them: "the rotating arrow", "the 9 dots menu", "the bar that appears when I tick rows". The catalog knows them by those names.

<details>
<summary>CLI commands for search, install, audit and the live gallery</summary>

Run these from the installed skill directory or a clone of this repository.

```sh
node scripts/search.mjs "bar when ticking rows"
node scripts/install-taste.mjs --project /path/to/app --framework react --palette slate-forest --components data-table,command-palette --charts kpi-card
node scripts/install-taste.mjs --project /path/to/app --attach --root "#panel" --components toast-stack
node scripts/install-taste.mjs --project /path/to/app --density dense            # locked axes stay put
node scripts/audit-ui.mjs http://localhost:3000 --viewports desktop,mobile --modes light,dark
```

The installer copies only what you ask for plus the files those import, and writes `taste-profile.json`. Colour overrides are contrast-checked before they are accepted. The auditor needs Playwright (`npm i -D @playwright/test && npx playwright install chromium`).

**Live gallery**

```sh
npm install
npm run preview
```

Switch all 18 palettes, light/dark, density, radius, type and motion in real time, try every pattern, hover every chart and open each blueprint full-screen. `npm test` runs the contrast checks, unit tests, type checks, 87 browser tests and the full audit.

</details>

## License

You can use, modify and ship the components, charts, palettes and blueprints in personal or commercial websites, apps, SaaS products and client work for free, with no royalties or attribution required. The CLI, auditor and `SKILL.md` use MIT. The design library license prohibits redistributing, rebranding or reselling the catalog as a competing UI kit, template pack, dataset or Agent Skill. [Full license](LICENSE)

---

**Support** · [LuminaBench](https://luminabench.com) · [Sponsor LuminaBench on GitHub](https://github.com/sponsors/LuminaBench)
