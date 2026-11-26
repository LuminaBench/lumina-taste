# Page flow

Where things go, and how a page breathes. Use this before placing a single component. Every rule here is implemented by at least one blueprint in `blueprints/`.

## 0. Pick a layout in three questions

1. **Is it read once or used every day?** Read once (landing, pricing, article) → a single centred column with full-width bands. Used daily (app, dashboard, settings) → a fixed shell with a sidebar or top bar and a scrolling content area.
2. **How many things compete for attention?** One → centre it. Two → split 60/40, the important one left. Three or more → a grid of equal cards, then make one card wider.
3. **What is the one action?** Put it top-right in apps, under the headline on marketing pages. If you cannot name it, the page is not ready.

### Layout recipes

Every install ships these as classes in `tokens/layout.css` (zero specificity, so your CSS wins): `.lt-container`, `.lt-narrow`, `.lt-prose`, `.lt-band` (+ `data-tone="well"`), `.lt-stack`, `.lt-cluster`, `.lt-page-head`, `.lt-grid` (`--min` sets the card width), `.lt-split` (`data-ratio="half"`), `.lt-shell`, `.lt-settings`, `.lt-dash` (`.wide` spans both columns) and `.lt-skip`. Section blocks (heroes, features, FAQ, CTA bands…) are complete bands: each centres its content in the 1180px container, pads itself by half of `--section-y` (so two neighbours are exactly `--section-y` apart) and accepts `data-tone="well"` for a tinted background. Put them straight inside `<main>`, never inside another `.lt-band` or `.lt-container`, and follow the rhythm in section 0b: no two neighbours on the same ground. `.lt-shell` keeps its rail sticky and full height; `.lt-stack` and every grid here use `minmax(0, 1fr)` so wide tables shrink instead of widening the page.

The same recipes as plain CSS, if you prefer to write your own. All use `--space-*` / `--gap-*` and work at 390px.

```css
/* 1. Centred page column: landing, pricing, docs article */
.page { width: min(1180px, 100% - 32px); margin-inline: auto; }
.prose { max-width: var(--measure); }                         /* 68ch */
.band { padding-block: var(--section-y); }                    /* one band per idea */

/* 2. App shell: sidebar + scrolling main */
.shell { display: grid; grid-template-columns: auto minmax(0, 1fr); min-height: 100dvh; }
.shell > main { min-width: 0; padding: var(--space-6); }

/* 3. Page header: title left, one action right */
.page-head { display: flex; align-items: center; justify-content: space-between; gap: var(--gap-md); flex-wrap: wrap; }

/* 4. Card grid that never needs a breakpoint */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: var(--gap-lg); }

/* 5. Split: content and aside, stacks on narrow screens */
.split { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: var(--space-7); }
@media (max-width: 860px) { .split { grid-template-columns: 1fr; } }

/* 6. Settings: section nav + one form column */
.settings { display: grid; grid-template-columns: 200px minmax(0, 420px); gap: var(--space-7); }
@media (max-width: 720px) { .settings { grid-template-columns: 1fr; } }

/* 7. Dashboard: KPI row, then a two-up chart grid where the main story spans both */
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--gap-md); }
.charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap-lg); }
.charts > .wide { grid-column: 1 / -1; }
@media (max-width: 860px) { .charts { grid-template-columns: 1fr; } }
```

Rules that keep these simple:

- `minmax(0, 1fr)`, not `1fr`, for any column holding tables, code or charts, so they shrink instead of pushing the page wide.
- One container width per page. Bands can be full-bleed; text never is.
- Space between sections is larger than space inside them. If a page feels busy, add space before removing things; if it still feels busy, remove things.
- Do not nest cards inside cards. Use a divider or a heading instead.

## 0b. Plan the rhythm before any code

A page that is right section by section can still read as one section repeated. `compose.mjs` plans the order of the bands as a rhythm first and prints it as one line:

```
hero ▇ XL · statement ▁ L well · tiles ▇ · steps ▇ well · people ▁ · visit ▇ dark · questions ▁ · close ▁ XL brand
```

Each band has a **density** (▇ busy: a grid, a table, a form, many things; ▁ quiet: a statement, one quote, three figures, a short list), a **ground** (plain, `well` tint, the one `dark` band, the one `brand` band in the accent colour, or a `picture` band that is its own ground) and a **scale** (XL display type, L large type, or normal). The rules:

1. **Never three busy bands in a row.** The planner keeps the middle one to three things with a figure each, or adds a pause (a `scroll-statement` with the bold idea, or a figures band when the brief has figures).
2. **One dark band and one brand band at most**, matching the critic's accent budget. The dark band sits from the middle of the page on; a page with a dark picture band (`media-band`) takes no second dark band.
3. **The first screen and the close are the loudest.** Only they are set at display size. The close says the one action again: a closing band (`cta-band`, `booking-bar`, tickets, a contact form) that sat earlier is moved to the end.
4. **No two neighbours on the same ground**, unless one is a picture. Light bands alternate plain and tinted.
5. **No two neighbours with the same layout.** Layouts are assigned after the order is fixed; two parts that can only be laid out one way, and the same way, never stand side by side.

An app screen (dashboard, settings, inbox, sign-in) is one ground and as dense as its work needs; the rhythm names its regions and the band rules do not apply.

In a `--write` draft each band carries its beat: `data-tone` for the ground (`well`, `dark`, `accent`), `data-rhythm="quiet|busy"` and `data-scale="display|large"`. (Not `data-density`: that is the profile's density axis, and on a section it would reset `--section-y`.) If you add, remove or reorder a section, keep the five rules by hand.

## 0c. One bold idea per page

Every page gets one idea that is louder than everything else, chosen from the subject, not from a style: "the £40,000 fixed price set huge on navy", "the 7:30 opening time as the hero", "410 food parcels a week as the headline itself". The plan names it and where it lives (the hero's picture as an art panel in the brand colour, the headline at display size, or the dark picture band), and the draft says it in a comment after `<main>`. It comes from the brief's own figures first, in the order its visitors look for them (a trade: the price; a place: the opening time; a charity: the count with its period; software: how long the job takes), then from the art direction's signature. When the brief has no figure, the plan asks for one instead of inventing it. Everything else on the page stays quieter than the idea: no second huge figure, no second colour panel, no second moving thing.

## 1. Reading patterns

| Page type | Pattern | What it means for layout |
| --- | --- | --- |
| Marketing, landing, pricing | **Z-pattern** | Brand top-left, primary action top-right. Hero headline left or centred, CTA directly under it. The eye zig-zags down: alternate text and visuals, never two dense blocks side by side. |
| Dashboards, docs, settings, tables | **F-pattern** | People scan the top row, then down the left edge. Put the most important KPI first in the row, the most important chart top-left, and labels left-aligned. Never right-align labels people scan. |
| Editorial, essays | **Single column** | One reading column at `--measure` (68ch). Images may break out wider; text never does. |

## 2. Rhythm: the 4px / 8px grid

- Every margin, padding, gap and fixed size is a multiple of 4px. Use `--space-1…9` (4, 8, 12, 16, 24, 32, 48, 64, 96) for layout and the density-aware `--gap-*` inside components.
- **Related things sit closer than unrelated things.** Label → field: 4–8px. Field → field: 16px. Group → group: 32px. Section → section: `--section-y` (64–128px by density).
- Vertical rhythm beats horizontal: if a page feels cramped, add space between sections before you shrink type.
- One container width per page (`.bp-container`, 1180px max with a 16px gutter). Full-bleed backgrounds are fine; full-bleed text is not.

## 3. Calls to action

- **One primary action per view.** A second action, if any, is ghost or secondary. Three equal buttons is a decision the page refused to make.
- The primary CTA appears **above the fold** on landing and pricing pages, and again at the end. Nowhere else.
- Destructive actions sit apart: bottom of the form, in a "Danger zone", always behind a confirm dialog that names the thing being destroyed.
- In apps, the primary action for a page lives top-right of the page header ("Export", "New report"). Row actions live in the row or the bulk action bar, never in the page header.

## 4. Choosing navigation

| Situation | Use | Component |
| --- | --- | --- |
| Marketing site, ≤ 7 top-level destinations | Top navbar; one mega dropdown for the product menu | `navbar-mega` |
| Long articles, docs | Sticky top bar that hides on scroll down, plus a scrollspy "On this page" rail | `hide-on-scroll-header`, `scrollspy-toc` |
| App with 5–15 sections used daily | Collapsible left sidebar; collapses to icons below ~560px of container | `app-sidebar` |
| Mobile app, 3–5 primary destinations | Bottom navigation bar; everything else in a "More" sheet | `bottom-nav`, `bottom-sheet` |
| Deep hierarchies (docs, file systems) | Tree view in the left column plus breadcrumbs above the title | `tree-view`, `breadcrumbs` |
| Portfolio or small site, ≤ 5 links | Floating pill nav | `floating-pill-nav` |
| Power users | ⌘K command palette in addition to, never instead of, visible navigation | `command-palette` |

Never combine a left sidebar and a top navbar with the same links. Pick one source of truth.

## 5. Page anatomy

**Header.** 56–64px tall. Brand left, primary nav centre or left, account or CTA right. Sticky only if the page is long or an app; translucent background with `backdrop-filter: blur(8px)` at most.

**Hero (marketing only).** Eyebrow (≤ 4 words) → headline (≤ 12 words, `text-wrap: balance`) → one-sentence lede → one primary CTA (+ optional secondary) → one line of reassurance ("No card required"). Then show the product, real or realistic, not an illustration of people high-fiving.

**Body.** Each section: a heading that states a benefit or a fact, one supporting sentence, then the evidence (feature grid, chart, table, quote). Alternate density: a dense section is followed by a calm one, and never three busy bands in a row (section 0b).

**Dashboards.** Title row → **one global filter bar** → KPI row (2–4 cards) → chart grid (2 columns on desktop, 1 on mobile; the widest story spans both) → detail table. Cards inherit the global filters; a card may have at most one local toggle.

**Forms and settings.** Section navigation left (or a horizontal strip on mobile), sections as cards with a heading and one-line explanation, fields stacked in one column at most 420px wide. A sticky save bar appears only when something changed.

**Footer.** 3–5 balanced columns of 3–5 links each, a one-line brand statement, a single legal row. No newsletter pop-ups, no social icon wall, no second sitemap.

## 6. Whitespace by density

| Density | Section padding | Control height | Use for |
| --- | --- | --- | --- |
| `spacious` | 128px | 44px | Marketing, editorial, onboarding, anything read once |
| `balanced` | 96px | 36px | Most products |
| `dense` | 64px | 32px | Admin, monitoring, trading, tables with 10+ columns |

Density is a profile axis (`density`), not a per-component decision. Change it once and the whole page follows.

## 7. Responsive rules

- Design at 390px first. Every blueprint is checked at 390×844 and 1440×900 by `audit-ui.mjs`.
- **No horizontal page scroll, ever.** Wide tables scroll inside their own focusable container (`role="region"` + `tabindex="0"`).
- Components respond to **their container**, not the viewport (`@container`), so they work in sidebars, cards and attach mode.
- Touch targets ≥ 24×24px, ideally 44×44px for primary actions on mobile.
- Hide secondary navigation on mobile; never hide the primary action.

## 8. Before you ship a page

1. Squint: is there one obvious first thing to look at?
2. Count primary buttons in each viewport: one.
3. Check the 4px grid: no 13px, 22px or 37px values.
4. Resize to 390px: no horizontal scroll, no clipped text.
5. Tab through: every control has a visible focus ring, in a sensible order.
6. Run `node scripts/audit-ui.mjs <url>` and fix every finding.
