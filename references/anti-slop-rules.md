# Anti-slop rules

"Slop" is the look of an interface assembled from defaults instead of decisions: a purple gradient hero, five badges in a header, a heavy blurred shadow under every card, emoji standing in for icons. These rules are concrete and testable. `node scripts/audit-ui.mjs <url>` checks the starred (★) items automatically.

Treat every rule as a ban unless the user explicitly asks for the banned thing. If they do, do it once, well, and leave a comment saying why.

## 1. Colour

| Ban | Do instead |
| --- | --- |
| ★ Generic purple→blue or pink→purple hero gradients (`#667eea → #764ba2` and friends) | A flat `--bg-canvas`, or one restrained surface step (`--bg-surface-2`) behind the hero. For light behind a hero use a backdrop (`data-backdrop="wash"` or `spot`): one accent hue, starting below the headline, never behind running text. Any other gradient stays within one hue family and under 0.06 OKLCH chroma. |
| Wallpaper: a pattern at full strength across the whole page, two patterns on one screen, or more than one moving background | One backdrop per screen (`data-backdrop="grid"`, `dots`, `lines`, `ticks`), in ink at 8–26%, masked so it fades out before the text. A moving one (circuit traces) has a pause button and stops under reduced motion. |
| ★ Gradient-filled headline text (`background-clip: text`) | Solid `--text-primary`. Emphasise one word with weight, an italic serif, or `--accent-text`. |
| Raw hex values in components | Semantic tokens only: `--bg-*`, `--text-*`, `--border-*`, `--accent-*`, `--status-*`, `--chart-*`. |
| More than one accent hue competing on a screen | One accent. Status colours are for status only, never decoration. |
| ★ Text under 4.5:1 contrast (7:1 for primary text) | Pick a different token. Every shipped palette pair is pre-verified. |
| Grey text on a coloured background | `--accent-ink` on `--accent-solid`; `--text-primary` on soft tints. |
| Pure `#000` on pure `#fff` for long reading | Palette canvas and `--text-primary` (already softened and verified). |

## 2. Depth and surfaces

| Ban | Do instead |
| --- | --- |
| ★ Heavy blurred drop shadows (blur ≥ 32px, or ≥ 16px blur at ≥ 35% opacity) | `--shadow-sm` for resting cards, `--shadow-overlay` for menus and dialogs. Most cards need only a `--border-hairline` outline. |
| Glassmorphism blur on content cards | Opaque `--bg-surface-1`. Reserve `backdrop-filter` for sticky headers, at most `blur(8px)` with an opaque-enough fill. |
| Cards inside cards inside cards | One level of card. Inside it, separate with spacing or a hairline. |
| A border **and** a shadow **and** a tinted background on the same box | Pick one depth cue. Two at most for overlays (hairline ring + shadow). |

## 3. Typography

| Ban | Do instead |
| --- | --- |
| ★ Proportional figures in tables, KPIs, timers, prices and axes | `font-variant-numeric: tabular-nums` (`.lt-num`, or automatic inside `table`, `time`, `data`, `output`). |
| Headline tracking left at 0 at display sizes | Use `--tracking-display` (negative) from the active pairing. |
| ★ A timid scale: a headline less than 2.5 times the body on a marketing page | `--step-5` or more for the headline; keep the body where it is. The jump is what tells the eye where to start. |
| More than two type families on a page (plus mono for code) | One pairing from `tokens/typography`. |
| Body text wider than ~75 characters | `max-width: var(--measure)` (68ch). |
| ALL CAPS for anything longer than a 3-word eyebrow | Sentence case. Eyebrows use `.lt-eyebrow` with +0.08em tracking. |
| Centered paragraphs longer than two lines | Left-align body copy. Centre only short heroes and empty states. |
| Orphaned last words in headings | `text-wrap: balance` on headings, `pretty` on paragraphs. |

## 4. Icons

| Ban | Do instead |
| --- | --- |
| ★ Emoji used as icons in buttons, nav, headings, list bullets or feature cards (🚀 ✨ 🔥 ✅) | Crisp inline SVG: 16px or 20px, `stroke-width: 1.5`, `stroke: currentColor`, round caps and joins. |
| Icons and chevrons off the text baseline or off-centre | Align with `display: inline-flex; align-items: center` and the `.lt-optical` utility. Play triangles shift 1px right; chevrons sit in a square box. |
| Mixed icon sets (filled + outline + duotone on one screen) | One style. This kit ships outline icons only. |
| A chevron that does not rotate when its panel opens | `disclosure-chevron`: rotate 90° (or 180°) with `--dur-2` and `--ease-out`. |
| An icon on every single button | Icons only where they add meaning: direction, status, a known action (copy, close, search). |

## 5. Layout and chrome

| Ban | Do instead |
| --- | --- |
| ★ 5-badge clutter headers ("NEW", "BETA", "v2", "HOT", "AI") | At most one badge per heading, at most two accent badges in view. |
| Duplicated filter bars on every card of a dashboard | One global filter bar at the top. Cards inherit it. A card may have one local toggle (e.g. a period switch). |
| Three CTAs of equal weight in the hero | One primary, at most one secondary (ghost or link). |
| ★ Horizontal scroll on mobile | Every layout must hold at 390px wide. Tables scroll inside their own container, never the page. |
| Spacing values off the 4px grid (13px, 22px, 37px) | `--space-*` (4, 8, 12, 16, 24, 32, 48, 64, 96) and density-aware `--gap-*`. |
| Fixed headers taller than 64px on mobile | 56px max, hide on scroll down, reveal on scroll up (`hide-on-scroll-header`). |
| Mobile bottom navs with more than 5 items | 3 to 5 items. Move the rest to a "More" sheet. |
| Footers with 8 link columns of uneven length | 3 to 5 balanced columns, a single legal line, nothing else. |
| ★ A small uppercase label over every section heading, "01 / SECTION" numbering | Headings that stand alone; a label only where it says something the heading cannot (a date, a place) |
| ★ Thin rules in every direction: between sections, under every row, around every box | Space, scale and a change of ground; rules only for tables and rows people compare |
| ★ A section that is only words | Something to look at in every section: the product, a picture, a document, a chart, rows that scan like a table, a figure set at 40px or more. Words are its captions |
| ★ Two neighbouring sections with the same layout on the same ground (zig-zag feature rows, two card grids) | Change the shape or the ground: a full-bleed picture, a figure, a `data-tone="well"` or `"dark"` band |
| ★ Dense section after dense section, or one density from top to bottom | Alternate: after a dense section, one picture or one large line with space round it |

## 6. Motion

| Ban | Do instead |
| --- | --- |
| UI transitions longer than 300ms for small controls | `--dur-1` (90ms) to `--dur-3` (200ms). Large surfaces (sheets, drawers) may use `--dur-4`. |
| `ease-in` on entrances | `--ease-out` for entrances, `--ease-in-out` for position swaps, `--ease-spring` for toggles and indicators. |
| Bouncy overshoot on everything | Spring overshoot only on small indicators (switch thumbs, segmented pills, checkmarks). |
| Animation that ignores `prefers-reduced-motion` | Every duration token collapses to 1ms under reduced motion. Never hard-code durations. |
| Scroll-jacking and parallax on content | Native scrolling. A one-time reveal (`scroll-reveal`) at most. |
| ★ More than two big scroll moments, or two back to back (sticky-story, side-scroll, stack-cards, scroll-statement, each `data-zoom`, each `data-parallax`) | Two at most, where they carry the subject, with a still section between them; one pinned scene per page. The quiet `data-scroll` reveal does not count. |
| ★ An entrance on every section, numbers counting up everywhere | `data-entrance` on the hero only; `data-count` on the few figures that are the point (six at most), each with a number in it. |
| ★ Film that plays with sound, or a moving hero with no pause | `muted` on any autoplaying video; the hero video starts from its script under the reader's motion setting and always has its `data-part="toggle"`. |
| ★ A pinned scene inside a box with `overflow: hidden`, `auto` or `scroll` | `overflow: clip` on that ancestor (it clips without making a scroll box), or move the scene out. |
| ★ Buttons that change width while loading | Keep the label in the flow (`visibility: hidden`) and overlay the spinner. |

## 7. Interaction and accessibility

| Ban | Do instead |
| --- | --- |
| ★ Missing visible focus | `:focus-visible` outline of `--focus-width` in `--focus-ring`. Never `outline: none` without a replacement. |
| ★ Dead controls (buttons that do nothing, `href="#"`) | Every control does something or is visibly disabled with `aria-disabled`. |
| Hover-only affordances | Everything reachable by keyboard and touch. Tooltips also open on focus. |
| Click targets smaller than 24×24px | `--control-h-sm` is the floor. Icon buttons get a square hit area. |
| ★ On a phone, primary controls (the main button, a submit, anything in a bottom or tab bar) under 44×44px | `min-height: 44px` at phone width, or an inset `::before` that grows the hit area to 44px. |
| ★ A fixed bottom bar that ignores the home indicator | `padding-bottom: calc(<padding> + env(safe-area-inset-bottom))` and `viewport-fit=cover` in the viewport meta. |
| ★ An app screen that only has its full state | A loading skeleton, an empty state with one action and an error with a way out, each a `data-view` block; declare them in `meta.json` `states` or `<html data-states>`. |
| Custom controls without roles | Follow the WAI-ARIA pattern named in each component's `catalog.json` entry. |
| Toasts that steal focus or vanish while hovered | `role="status"`, pause on hover and focus, swipe or Esc to dismiss. |

## 7b. Speed

`node scripts/audit-ui.mjs <page> --perf` checks these (★ all of them); `--strict` runs them as warnings.

| Ban | Do instead |
| --- | --- |
| `loading="lazy"` on the largest picture in the first screen | No `loading` attribute and `fetchpriority="high"` on that one picture; lazy for the rest. |
| Layout shift while loading (over 0.1) | Width and height on every image, space reserved for late content (charts, embeds), stylesheets in the head. |
| More than 300 KB of fonts, or more than six font files | One pairing, two weights each, a variable font or a subset. Or faces already on the device. |
| More than 400 KB of JS or 200 KB of CSS (gzipped) | Only the enhancers and parts the page uses. |
| Images without `width` and `height` | Both attributes at the picture's own size (or a CSS `aspect-ratio`). |
| A picture more than twice the size of its box | `srcset` with widths and `sizes`, so the phone gets a phone-sized file. |

## 8. Charts

See [chart-selection.md](chart-selection.md). The short version: no 3D, no pies with more than 4 slices, no rotated axis labels (use a horizontal bar), no vertical gridlines, no dual y-axes, no legends when a direct label fits.

## 9. Copy

Interface text should read like a careful person wrote it for this product. `node scripts/lint-copy.mjs <dir>` and the auditor's `slop-copy` rule flag the patterns below.

| Ban | Do instead |
| --- | --- |
| Hype verbs: unlock, supercharge, elevate, empower, unleash, revolutionise | Say what it does: "Export any report to CSV." |
| Empty adjectives: seamless, effortless, robust, world-class, cutting-edge, next-gen, state-of-the-art | A number or a fact: "Syncs in under 2 seconds." |
| Generated tics: delve into, dive into, a testament to, tapestry, embark on, navigate the complexity | Start with the point. |
| Filler openers: "In today's fast-paced world…", "Whether you're a startup or an enterprise…" | Delete the sentence. The next one is usually the real start. |
| "Take your X to the next level", "transform the way you work", "at your fingertips" | Describe the before and after in plain words. |
| Exclamation marks in UI strings | Calm, specific sentences. |
| Lorem ipsum in shipped previews | Realistic, short, domain-appropriate sample content. |
| Placeholder text as the only label | A visible label. Placeholder shows format only. |

Five habits that fix most copy:

1. **Lead with the noun people are looking for.** "Invoices", not "Manage your billing documents".
2. **One idea per sentence, under 20 words.** Headlines under 12 words.
3. **Buttons are verbs plus objects.** "Export CSV", "Invite teammate", never "Submit" or "Click here".
4. **Numbers beat adjectives.** "Answers in 200 ms" beats "blazing fast".
5. **Sentence case everywhere.** Title Case Reads Like An Advert.
