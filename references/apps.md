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

- **Touch targets 44px or more**, in both directions. Text inputs 48px.
- **Press states feel physical:** a quick dip in scale (`--press-scale`) and a tint, back on release. No hover-only affordances.
- **Push and back** slide (view transitions, off under reduced motion); tabs swap without a slide. Focus moves to the new screen's title.
- **Safe areas:** the status bar area at the top (`env(safe-area-inset-top)`), the home indicator at the bottom of every bar that touches the edge.
- Type is phone type, not page type: fixed sizes (30px large titles, 17px body, 13px secondary), not the page's fluid steps.
- **Showing a flow on a desktop:** the screens stand side by side as phones on a quiet ground, each with a one-line caption saying what to try ("Swipe a sailing left to set a reminder"). Overlays open inside their phone (`data-contained`), and every control works. Mark the phone frames `data-mock`.
- **States** live on the screen that has data: `?state=loading|empty|error`. An empty list says what will appear and when ("The first one tomorrow leaves at 07:10").

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

## Checklist

- [ ] `data-app` on the root; `viewport-fit=cover`; safe-area insets on every edge bar.
- [ ] Every touch target 44px or more; every gesture has a button or key.
- [ ] One filled primary per screen; settings act at once.
- [ ] Loading, empty and error states, each reachable with `?state=`.
- [ ] Screenshots at 390 and 1440, light and dark; `audit-ui.mjs --taste` at 100.
