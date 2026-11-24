# Page flow

Where things go, and how a page breathes. Use this before placing a single component. Every rule here is implemented by at least one blueprint in `blueprints/`.

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

**Body.** Each section: a heading that states a benefit or a fact, one supporting sentence, then the evidence (feature grid, chart, table, quote). Alternate density: a dense section is followed by a calm one.

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
