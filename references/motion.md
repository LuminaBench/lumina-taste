# Motion: how a page moves

The best product pages move very little, and every movement shows the product. Motion is a way to hand the visitor one thing at a time: the claim, then the object, then what it does. It is never decoration, and a page with nothing moving is better than a page where everything does.

Everything here is CSS first (scroll-driven animations, `position: sticky`, view transitions), with small enhancers only where CSS cannot do the job. All of it animates `transform` and `opacity` only, stops completely under reduced motion, and shows the page at rest in print and without script.

## 1. The budget: one entrance, the reveal, two moments

| Layer | What | How | Per page |
| --- | --- | --- | --- |
| Entrance | The hero's headline rises, then the lede and action, then the picture | `data-entrance` on the hero | One |
| Reveal | Each section's heading and body rise into place as they arrive | `data-scroll` on `<main>` | Everywhere, quietly |
| Moments | A scene the visitor scrolls through | The blocks and attributes below | **Two at most, never next to each other** |
| Small | Figures count, a slider, a pause button | `data-count`, `before-after`, `hero-video` | Where they carry a fact |

Two moments means two. A pinned story and a sideways rail on one page is the limit; add a product reveal and one has to go. Put a quiet section (words and a picture, no motion) between two moments, and keep moments off app screens, forms, checkout and documentation entirely.

## 2. Which moment, when

| Moment | Use it for | Do not use it for | Block or attribute |
| --- | --- | --- | --- |
| **Pinned scene** | A product whose screen or state changes in three or four steps: plan, pick, confirm | A list of features that do not follow one another | `sticky-story` (one frame in each step's state, `data-mark` on what each step is about) |
| **Sideways scroll** | Work people browse: projects, a range, rooms, a collection of five to eight | Two to four things (use `offer-cards`), anything people must compare side by side | `side-scroll` (pins on wide screens; a swipe row on phones) |
| **Product reveal** | The single strongest picture of the product, once | Text people must read while it moves; more than one per page | `product-reveal`, or `data-zoom="open"` on any picture |
| **Zoom** | A large photograph or screen settling to full size | Small pictures, pictures in a grid | `data-zoom` (used by `media-band`) |
| **Statement** | The one claim of the page, lighting up word by word | Anything longer than 25 words | `scroll-statement` |
| **Stack** | Three to five steps as large cards that slide over each other | Steps without a picture each | `stack-cards` |
| **Numbers that settle** | Three or four true quantities: people, crossings, minutes, a price | Years, phone numbers, times of day, anything that is not a quantity | `data-count` on the figure (`stats-band` has it built in) |
| **Before and after** | One picture in two states: a room, a document, a photograph | Two different pictures; feature lists (that is a table) | `before-after` |
| **Video hero** | A real film of the subject, 8 to 20 seconds, no sound | A stock clip, a screen recording with text to read, sound | `hero-video` |
| **Page changes** | A list whose picture opens into its own page: products, projects, articles | Apps where people work quickly between screens | `<html data-vt>` + `data-vt-name` |

The pinned scene and the stack both tell steps: pick the scene when the *same frame* changes (a phone screen across three steps), the stack when each step has its *own* picture.

## 3. Timing and easing

| Token | Value | For |
| --- | --- | --- |
| `--ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | Anything that arrives: the entrance, counts, a picture landing, page changes. Fast out, a long soft landing, like something heavy being set down |
| `--dur-entrance` | 760ms | The hero headline |
| `--dur-moment` | 1100ms | A moment played on a timer (inside a preview box) |
| `--dur-count` | 1400ms | A figure counting to its value |
| `--dur-1` to `--dur-4`, `--ease-out`, `--ease-spring` | 90 to 320ms | Controls: buttons, the slider knob, toggles (`tokens/base.css`) |
| `--dur-press`, `--dur-release`, `--ease-release`, `--dur-toggle`, `--ease-overshoot`, `--dur-draw`, `--dur-shake`, `--dur-confirm` | 70 to 420ms | Micro-interactions (section 8, `tokens/scroll.css`) |
| *(none)* | `linear` | Anything scrubbed by scroll. The scroll is the easing; an eased scrub feels like lag |

Scrubbed ranges: a reveal runs over `entry 0%` to `entry 70%`; a zoom or reveal is finished by `cover 40–45%` (the picture is still in the lower half of the screen); a pinned slide uses the pinned stretch, `contain 6%` to `contain 94%`, so the first and last frames rest for a moment. If a picture is still moving when it reaches the middle of the screen, the range is too long.

## 4. Reduced motion, print and no script

- `prefers-reduced-motion: reduce` and `data-motion="reduced"` on `<html>`: nothing animates, nothing pins, nothing plays. The pinned scene becomes rows (each step beside its own picture), the sideways rail becomes a swipe row, counts show their number, the film keeps its still and offers a play button, page changes snap.
- Print: every animation is off and every figure is its true value (a count in progress finishes on `beforeprint`).
- No script: the same as reduced motion, except the CSS-only moments (statement, zoom, reveal) still run where supported. Nothing is ever hidden waiting for a script.
- The truth is always in the HTML: a count's final number, every step's picture, the slider at 50%.
- The auditor and the gallery's screenshots run with reduced motion, so they show the page at rest. Check moments yourself with motion on (section 7).

## 5. Performance

- Animate `transform` and `opacity` only. Never `top`, `left`, `width`, `height`, `margin` or `filter` on scroll.
- No scroll listeners. Scroll-driven animations run off the main thread; where an enhancer must know what is on screen it uses `IntersectionObserver`, and where it must measure it uses `ResizeObserver` (`side-scroll` measures its travel once per resize, never per frame).
- Sticky needs every ancestor without `overflow: hidden` or `auto`. Use `overflow-x: clip` when a section must not scroll sideways.
- A film is fetched only when it will play: `preload="none"` and the path in `data-src` until then. Under 4 MB, H.264, no audio track.
- One pinned section per page. Two pinned sections means the visitor scrolls through four screens of nothing moving forward.

## 6. Smooth page changes

Cross-document view transitions make a multi-page site feel like one place: the page cross-fades, and the picture someone clicked flies into its place on the next page.

```html
<html data-vt …>                                         <!-- on every page that takes part -->
<a href="/chairs/larkspur"><figure data-vt-name="chair-larkspur">…</figure></a>   <!-- the list -->
<figure data-vt-name="chair-larkspur">…</figure>          <!-- the detail page's hero -->
```

- Install the `view-transition` component: its CSS holds `@view-transition { navigation: auto; types: lt-page; }` inside `prefers-reduced-motion: no-preference`, and strips the animation from any page without `data-vt`, so the attribute is the switch. (It is not in `tokens/scroll.css` because every page would then take part in navigations, including pages inside iframes.)
- Names must be unique on a page and identical on both pages. Name only the one picture that travels (each card gets its own name on the list), not every card on the detail page.
- `data-vt-name` becomes `view-transition-name` through typed `attr()` where supported; the `view-transition` enhancer copies it elsewhere (`data-lt="view-transition"` on `<body>`, or `usePageTransitions()` in React).
- Inside one page (a filter, a layout switch, a card opening in place) use `withViewTransition(update)` from the same component.
- Keep pages fast: the old page's picture holds until the new page renders.

## 7. Checking it

1. Audit at rest: `node scripts/audit-ui.mjs <page> --taste` (reduced motion).
2. Look with motion on: the gallery's Moments view (`#/moments`) plays every moment and micro-interaction in its own stage, with a replay button and a reduced-motion switch on each. On your own page: screenshots at several scroll positions with motion allowed (`reducedMotion: 'no-preference'` in Playwright), at 1440 and 390. At every position, is one thing clearly moving and everything else still? Is any text being read while it moves?
3. Scroll with the keyboard (Space, Page Down) and tab through a pinned rail: every link must come into view.
4. Turn on reduced motion in the system and scroll the page once more: it should read as a finished, still page.

## 8. Micro-interactions: how a control answers a touch

Small, quick and physical, so a control feels made rather than painted. They are built into the controls; use the tokens if you make your own.

| Control | What it does | Tokens |
| --- | --- | --- |
| Button (`button`, `copy-button`) | Pressed, it sinks 1.5px at once; let go, it springs back past its rest by a hair and settles. Hover changes the fill only: a button never grows | `--press-settle`, `--dur-press`, `--dur-release`, `--ease-release` |
| Switch (`toggle-switch`) | Held, the thumb stretches toward where it will go; it crosses with a small overshoot and settles | `--press-stretch`, `--dur-toggle`, `--ease-overshoot` |
| Checkbox (`checkbox`) | The box gives a little and springs back; the tick draws itself just after the box fills, and goes at once when unticked | `--dur-draw`, `--delay-draw` |
| Field (`text-field`) | A field that fails its check on leaving it, or on submit, shakes once, gently, and its message arrives from just above. Never while typing | `--dur-shake`, `--shake-x`, `--dur-confirm` |
| Copy (`copy-button`) | The icon turns to a tick and "Copied" rolls up in the label's place; the label keeps its width | `--dur-confirm` |

Rules:

- `transform` and `opacity` only (the tick's stroke is paint, not layout). Nothing reflows, so nothing next to the control moves.
- Overshoot belongs to small things: a thumb, a tick, a button's last pixel. Never a card, a sheet or a page.
- No scale-up on hover, anywhere. A hover changes a fill, a border or a shadow.
- Under `prefers-reduced-motion: reduce` and `data-motion="reduced"` every one of these is still: the distances are zero, the durations 1ms, the curves linear, and the shake and the arrivals do not run. In print nothing animates.
- `data-pressing` on a button, switch, checkbox or copy button holds its pressed look, for demos and tests.

## 9. Drawings that match the lettering

Art-panel drawings (`data-motif`, `data-scene`) take their line weight from the page's type pairing: `--motif-stroke` is set per pairing in `art-panel.css`, heavy for slab, stamped, stencil and stadium, fine for didone, legal, editorial and bookish. A scene (`data-scene="cup bag"`: two or three motifs on one ground, the biggest behind, the first name in the accent) keeps one line weight across its sizes. Nothing about them moves.
