# App screens

A page is read; an app is used. These rules are for screens people come back to every day: phone apps, desktop work apps and dashboards. Start from the `app-phone`, `workspace` or `dashboard` blueprint and keep their anatomy.

## Phone screens

Put `data-app` on `<html>` and `viewport-fit=cover` in the viewport meta. On a phone the page **is** the app: one screen at a time, edge to edge.

| Part | Use | Rules |
| --- | --- | --- |
| Large title | `mobile-app-bar` with `data-size="large"` | The title shrinks and fades as the list scrolls (a scroll timeline, no script) and hands over to the small title in the 44px bar. Back button says where it goes ("Today"), never just "Back". One text action on the right at most |
| Tab bar | `bottom-nav` | Three to five tabs, icon and label, 48px tall, `env(safe-area-inset-bottom)` under it. Tapping the current tab scrolls to the top. Each screen owns its own bar with its own `aria-current` |
| Lists | `swipe-row`, `row-list` | Whole-row targets 64px tall. Swipe towards the start reveals up to two actions; the keyboard path is the row's own button, visible on focus. A tap on another row only closes the open one |
| Refresh | `pull-refresh` | Only at the top of the list; the stamp says when it last updated; a Refresh button does the same for people who cannot pull |
| Sheets | `bottom-sheet` with `data-detents="medium large"` | Opens at medium; the grabber is a 44px button (press or ArrowUp for large); Escape and the scrim close; extras that would crowd the first view use `data-detent-only="large"` |
| Primary action | an action bar above the home indicator | The price on the button ("Pay £38.50"). One filled button per screen |
| Choices | `segmented-control`, `number-stepper`, `toggle-switch` | Settings act at once: no Save button |

- **Touch targets 44px or more**, in both directions. Text inputs 48px. On any touch screen (`@media (pointer: coarse)`) the tokens do most of it: `--control-h` becomes 44px, `--control-h-lg` 52px, and small controls (chips, segments, toolbar icons, sort headers) keep their look and gain an invisible 44px hit area from an inset `::before` sized by `--hit`.
- **Press states feel physical:** a quick dip in scale (`--press-scale`) and a tint, back on release. No hover-only affordances.
- **Push and back** slide (view transitions, off under reduced motion); tabs swap without a slide. Focus moves to the new screen's title.
- **Safe areas:** the status bar area at the top (`env(safe-area-inset-top)`), the home indicator at the bottom of every bar that touches the edge.
- Type is phone type, not page type: fixed sizes (30px large titles, 17px body, 13px secondary), not the page's fluid steps.
- **Showing a flow on a desktop:** the screens stand side by side as phones on a quiet ground, each with a one-line caption saying what to try ("Swipe a sailing left to set a reminder"). Overlays open inside their phone (`data-contained`), and every control works. Mark the phone frames `data-mock`.
- **States** live on the screen that has data: `?state=loading|empty|error`. An empty list says what will appear and when ("The first one tomorrow leaves at 07:10").

## Tablets and foldables

Between 768 and 1180px (an iPad either way up, a small laptop window) an app is neither a phone nor a desktop. Lay it out for the width:

| Blueprint | On a tablet | Upright (768–959px) |
| --- | --- | --- |
| `app-phone` | The tab bar becomes a sidebar; Today stays in the list pane while a sailing or Pay opens beside it (a split view); Tickets and Settings take both panes at a reading width | The sidebar narrows to a rail of icons with their names under them |
| `workspace` | The sidebar collapses to a rail of icons (`data-collapse-below="1100"` on `app-sidebar`); the table and the inspector stay side by side | The inspector narrows to 288px; columns that can wait (ship, arrival) step out |

- **Sheets become popovers.** A bottom sheet on a wide screen is a card beside the button that opened it, with every option in view (no detents, no grabber), Escape and the scrim still close it and focus goes back to the button. A phone keeps the sheet.
- **A foldable open across two screens** gets one pane per screen, with the hinge as the gap: `@media (horizontal-viewport-segments: 2)` and `env(viewport-segment-width 0 0)`, `env(viewport-segment-left 1 0)`. Where the browser has no segments, the width rule above is the fallback.
- No pane ever squeezes below its content: give grid columns `minmax(0, 1fr)`, let filter fields shrink (`flex: 1 1 0; min-width: 0`), and drop the least useful column before a label breaks inside a word.

## Native apps: the same tokens

`export-tokens.mjs` writes the palette, type, spacing, radii and motion for a native app, with the same values as the web and every contrast pair checked again on the colours it writes:

```sh
node scripts/export-tokens.mjs --format swiftui --palette petrol-peach --type financial > LuminaTokens.swift
node scripts/export-tokens.mjs --format compose --palette petrol-peach --package com.halyard.ui > LuminaTokens.kt
node scripts/export-tokens.mjs --format figma   --palette petrol-peach > lumina.tokens.json
```

- **SwiftUI:** `Color.Lumina.textPrimary` (a dynamic colour per token, light and dark, no asset catalogue), `.font(.Lumina.title)` on Dynamic Type text styles, `Lumina.Space.s4`, `Lumina.Radius.lg`, `Lumina.Motion.easeOut`.
- **Compose:** `LuminaTheme { … }` with `LuminaTheme.colors`, `.type` and `.shapes`, `LuminaSpacing`, `LuminaMotion`; no MaterialTheme (map onto one if the app uses Material components).
- **Figma:** Tokens Studio / W3C design tokens: sets `core`, `light` and `dark`, and the themes Light and Dark, which import as variable modes.
- App type reads at the platform's body size (17pt on iOS, 16sp on Android), stepped by the pairing's own ratio; the web sizes are in the Figma file.

## Desktop work apps

| Part | Use | Rules |
| --- | --- | --- |
| Sidebar | `app-sidebar` | Saved views with counts, not a site map. Every item filters or opens something on this page |
| Resizable panes | `pane-resizer` | One CSS custom property per pane (`--lt-sidebar-w`, `--inspector-w`); arrows, Home, End and Enter on the edge; limits so no pane collapses to nothing; remember the size |
| Command menu | `command-palette` | ⌘K, actions for the selected item first, then views, then help. The trigger looks like a search field with its key cap |
| Shortcuts | `shortcuts-sheet`, `kbd` | The keys that matter most in the status line; the rest behind `?`. Put the key on the button it triggers ("Delay sailing D") |
| Table | `data-table` | Dense but calm: 7px cell padding, rules between rows only, one tint for the selected row, colour only for exceptions (late, full), quiet text for the normal case |
| Inspector | a pane, not a modal | The selected item's one figure large, then sections with plain headings, actions pinned at the bottom |

- **Selection is the centre of the app:** J and K (and the arrows) move it, Enter opens it, the inspector follows. Keys never fire while typing.
- **The page never scrolls; panes do.** Below about 860px, one pane at a time: the inspector slides over the table with a back button, and Escape closes it.
- Loading keeps the layout (skeleton rows in the table's own frame); an error says what still works ("Your last copy is from 09:12").

## What the critic checks on an app

`audit-ui.mjs --taste` loads an app again at phone width for what a native app does without being asked:

| Rule | Fires when |
| --- | --- |
| `app-sheet-handle` | A bottom sheet has no grabber, or its grabber is not a `<button>` (pressing it, or ArrowUp, must do what a drag does) |
| `app-sheet-escape`, `app-sheet-focus` | A sheet opened from its button by keyboard stays open on Escape, or closes without giving focus back to the button |
| `app-gesture-conflict` | Swipe rows sit inside a sideways scroller, so one horizontal drag means two things |
| `app-gesture-edge` | Swipe rows reach the outer 20px of the screen, where the system's back gesture starts, and the part does not leave that strip alone (`data-edge-guard`; `swipe-row` and `swipe-actions` do) |
| `app-dynamic-type` | At 200% text (the root font size doubled), text is set in px and does not grow, is cut off, runs past the screen edge or sits on other text, or a control keeps a fixed height while its label grows |
| `app-reach` | Every filled primary action in the first screen is in its top half, out of a thumb's reach (a form's own submit, which rides with the keyboard, does not count) |

## Accessibility beyond the basics

Every page, app or not, is also loaded right to left, with a very long word, in forced colours and with Save-Data on (`a11y-*` rules), and `tests/a11y.spec.ts` walks every blueprint as a screen reader would.

- **The screen-reader walk:** one `main`; every navigation and side panel named when there are two; one h1; headings in order; a name on every control (a label hidden on a phone stays as a visually hidden name); images with alt, or `alt=""` for decoration; a live region where things change (counts, states, toasts); no duplicate ids; every `aria-labelledby`, `aria-controls` and `for` pointing at a real id. Callouts are `role="note"`, not landmarks.
- **Right to left:** logical properties only: `margin-inline-start: auto`, `inset-inline-end`, `padding-inline`, `text-align: start`. A switch's thumb and a swipe row's drag follow `:dir(rtl)`; arrows that mean "go on" flip.
- **Long words** (German, Finnish, Dutch compounds, long names): running text wraps anywhere when it must (`tokens/base.css`); numbers, times, codes and cells do not break (`overflow-wrap: break-word`).
- **Forced colours** (Windows contrast themes) remove fills and box-shadows: the selected segment and a switch's on state use `Highlight`, tracks and meters keep a `CanvasText` edge, and focus is always an outline.
- **Less data:** with Save-Data or `prefers-reduced-data`, films stay a still behind their play button and pictures below the first screen are `loading="lazy"`.

## Checklist

- [ ] `data-app` on the root; `viewport-fit=cover`; safe-area insets on every edge bar.
- [ ] Every touch target 44px or more; every gesture has a button or key.
- [ ] One filled primary per screen; settings act at once.
- [ ] Loading, empty and error states, each reachable with `?state=`.
- [ ] A tablet layout at 768–1180px (sidebar and two panes); sheets as popovers on wide screens.
- [ ] Sheets: a grabber that is a button, Escape closes, focus returns. Swipes clear of scrollers and the screen edge. The main action low on a phone.
- [ ] At 200% text nothing clips or overlaps; right to left mirrors; forced colours keep state visible.
- [ ] Screenshots at 390, 768, 1024 and 1440, light and dark; `audit-ui.mjs --taste` at 100.
