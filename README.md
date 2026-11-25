# Lumina Taste

**Pages that look designed, not generated.** A design skill for coding agents: it plans a page from a one-line brief, builds it from a library of tasteful parts, and critiques the result the way a designer would, including the habits that make AI-built pages recognisable.

- **Plans before it builds.** `compose.mjs` turns "website for my bakery" into a page type, a look taken from the subject, sections in order with copy formulas, and a first draft.
- **Shows instead of tells.** Picture-led sections, figures set large, scroll statements, stacking cards, dark media bands, and openly licensed photographs found and credited for you.
- **Catches the defaults.** A Playwright critic flags indigo-and-Inter, cream-serif-and-terracotta, labels over every heading, walls of words, invented stats and stock faces, and scores the page out of 100.

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

| | | |
| --- | ---: | --- |
| **Page blueprints** | 25 | Complete pages to start from: landing, developer tool, practice, venue, shop, charity, event, dashboard, docs, checkout, assistant chat, agent workspace and more, each with its empty, loading and error states |
| **UI patterns** | 204 | Sections, controls, data views and motion parts, in vanilla TypeScript and React, found by describing them ("the bar that appears when I tick rows") |
| **Charts** | 46 | From leaderboards and Pareto frontiers to forecasts with ranges, all theme-aware and readable in both modes |
| **Palettes** | 24 × 2 | Light and dark, every text, control and chart pair contrast-checked |
| **Type pairings** | 12 | Fluid scales with tabular figures where numbers matter |
| **Styles** | 39 | Whole-page looks, each with its own radius, density and surface treatment |
| **Motion** | 3 layers | A hero entrance, sections that rise into place, pictures that settle as they scroll in. Plain CSS, still under reduced motion |
| **Composer** | 27 page types | Brief → plan → draft, with a look taken from the subject rather than a default |
| **Critic** | `--taste` | Layout, type, colour, rhythm, words against pictures, and the looks models fall back on |
| **Pictures** | `find-images.mjs` | Public-domain and CC0 photographs for a page's picture slots, downloaded with a credits file |
| **Evals** | 36 briefs | Score any page an agent builds; run your agent over all of them |

## How an agent uses it

1. **Compose**: `node scripts/compose.mjs "<brief>"` prints the plan; `--write` drafts the page.
2. **Choose the look from the subject**: three nouns from its world decide the palette and typeface (`references/ai-defaults.md`).
3. **Build and write**: real copy, something to look at in every section, no invented customers or figures.
4. **Look at it**: screenshots at 1440px and 390px, then the detail pass in `references/composition.md`.
5. **Critique**: `node scripts/audit-ui.mjs <page> --product "<name>"` until it reports no errors.

<details>
<summary>CLI commands for search, install, audit and the live gallery</summary>

Run these from the installed skill directory or a clone of this repository.

```sh
node scripts/compose.mjs "pricing page for a developer API"
node scripts/directions.mjs "landing page for a webhooks API" --out ./directions
node scripts/search.mjs "bar when ticking rows"
node scripts/search.mjs --card bulk-action-bar
node scripts/install-taste.mjs --project /path/to/app --framework react --palette slate-forest --components data-table,command-palette --charts kpi-card
node scripts/install-taste.mjs --project /path/to/app --attach --root "#panel" --components toast-stack
node scripts/install-taste.mjs --project /path/to/app --density dense            # locked axes stay put
node scripts/audit-ui.mjs http://localhost:3000 --taste
node scripts/sniff.mjs http://localhost:3000
node scripts/export-tokens.mjs --format shadcn --palette navy-sand > app/globals.css
node scripts/sample-data.mjs invoices --rows 20 --format csv
node scripts/find-images.mjs --fill index.html --subject "bakery"     # openly licensed photographs, credited
node scripts/eval-score.mjs ./out --brief saas-landing-invoicing
```

The installer copies only what you ask for plus the files those import, and writes `taste-profile.json`. Colour overrides are contrast-checked before they are accepted. The auditor needs Playwright (`npm i -D @playwright/test && npx playwright install chromium`).

**Live gallery**

```sh
npm install
npm run preview
```

Look up any element by describing it, see it live in a contained demo with its parts numbered, copy a prompt for your agent, and switch palette, mode, type and style from one panel. `npm test` runs the contrast checks, copy lint, unit tests, type checks, the browser tests and the full audit.

</details>

## License

You can use, modify and ship the components, charts, palettes and blueprints in personal or commercial websites, apps, SaaS products and client work for free, with no royalties or attribution required. The CLI, auditor and `SKILL.md` use MIT. The design library license prohibits redistributing, rebranding or reselling the catalog as a competing UI kit, template pack, dataset or Agent Skill. [Full license](LICENSE)

---

**Support** · [LuminaBench](https://luminabench.com) · [Sponsor LuminaBench on GitHub](https://github.com/sponsors/LuminaBench)
