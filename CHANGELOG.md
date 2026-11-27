# Changelog

## 1.0.0

The first public release. A design skill for coding agents that plans a page from a one-line brief, builds it from a library of tasteful parts, and critiques the result the way a designer would.

### Plan
- `compose.mjs` turns a brief into a page plan for 36 page types: the look and typeface taken from the subject, a rhythm of quiet and loud sections, one bold idea, at most two scroll moments, and a first draft written from the brief's own facts. Nothing from a sample business survives; what the brief did not say is one TODO list.
- One-line business descriptions ("Kestrel Dental, family dentist on Harrogate Road…") land on the right page, keep the business's name and get a plain headline of what it is and where; twenty such briefs are a regression test.
- Seven app blueprints that feel native on a phone and open into panes on a desktop: a bank, a fitness tracker, a customer's booking app, messaging, a settings-heavy tool, a café to order ahead from and a podcast player, each with its welcome, empty, loading and error screens, plus a number pad, date strip, activity rings, settings groups and a message composer. They move like native apps: a push slides in over the screen it leaves, back reverses it and returns focus to the row that opened it, tabs cross-fade, a player rises from its mini player, sheets drag down to close, rows swipe to their actions and lists pull to refresh, all on the motion tokens and instant under reduced motion.
- Photographs are checked before they are placed (size for the slot, exposure, focus) and as the page shows them (blown up, squashed, repeated); a blurred one is left out with a plain reason, and narrow ones get a half-screen first screen instead of a soft full-screen one.
- The person's own film becomes the first screen, trimmed, sized and given a still (ffmpeg, or the Mac's own avconvert with nothing to install); a PDF menu is read into prices like a text one.
- A short software brief's product screen shows the product's own records as marked sample rows; the ship check lets them stand inside the drawn screen, never on the page itself.
- Boxes side by side end level: the critic flags a row of cards that starts level but ends ragged (taste-ragged-row), and the dashboard's chart row stretches.
- Side-scrolling rows show whole cards inside the page's margins, paged by Previous and Next (data-paged for a price list); a pinned row fades at the margins instead of running off the screen.
- The hosted gallery is a showroom: nothing downloads there, a short note says so; the theme switch is one cross-fade instead of a second-long recolour.
- First run needs nothing set up: the first draft installs the skill's one dependency (esbuild) in its own folder and says so.
- Off a Mac, a film or a PDF menu nothing can read says what to install (ffmpeg, pdftotext) and the page still builds.
- Safari: -webkit- twins for backdrop-filter, user-select and mask-image; anchor positioning, field sizing and typed attr() keep their fallbacks. Pages need Safari 17.4 or newer (CSS @scope).
- `export-showroom.mjs` (`npm run showroom`): the gallery as a static site for any folder of a website, checked under its base path; the demos' own links, mail links and forms do nothing there but say so.
- Safari: the whole browser suite passes in WebKit. Stacked first screens no longer collapse their picture to nothing (an aspect-ratio slot stretched by its row), and the accordion, flyout menu, number pad and bulk-select focus what was clicked, as Safari does not.
- The live showroom at luminabench.github.io/lumina-taste, published by a GitHub Pages workflow on every push to main after the export is checked under /lumina-taste/.
- The control you press stays put: disclosures open beneath their trigger, Copy/Copied and Expand/Collapse labels keep one width, ticked chips and carousel dots keep their size, a single-open accordion keeps the opened row on screen, closing an answer at the foot of a page no longer pulls the page down, and a short filtered list no longer stretches a phone's top nav. In the gallery, a demo that grows when pressed grows away from the control rather than re-centring under it.
- A site grows page by page: a second page type goes to its own file, joined to the first by its top bar, with a smooth cross-fade between pages while the bar holds still.
- `starter.mjs`: a finished starting point in one command for fifteen kinds of business and app: the page, the brand kit and one checklist of what is still sample.
- A gallery page shows every first screen, top bar and footer live, side by side; `compose --hero <id>` uses the one the person points at. A picture band never repeats the first screen's headline.
- Drafted charts are titled with their finding, written from the numbers; a dashboard leads with the figure the brief names. The plan offers other true headlines from the same facts. Every control has a pressed state.
- Apps are planned as flows (first run, first useful screen, one record, settings) with their empty, loading and error wording.
- The first screen is chosen from the subject, never by habit: product first, overlap, edge, bleed, a menu or departures board, a magazine cover, a mosaic, a tucked picture, a date poster, a full-screen film; with an ink, paper or brand top bar and a wordmark or contact foot.
- Your own media first: `media-intake.mjs` reads a folder of the business's photographs, logo, film and menu; the composer places every photograph before any stock one (the hero gets the best), reads the menu into prices, puts the logo in the top bar and makes every favicon and app icon size from it, and shows where each picture goes before building.
- Brand from what the user has: a colour, a logo or an old site. Never one of the looks every model falls back on.

### Build
- 221 UI patterns, 48 chart engines and 34 page blueprints in vanilla TypeScript, CSS and React, including a phone app flow, a desktop workspace and a dense dashboard.
- 24 palettes in light and dark (3,024 contrast checks), 20 type pairings chosen by subject with measured fallback faces, 39 styles.
- Scroll moments with restraint: a pinned scene, a sideways rail, a product reveal, figures that count up, a before-and-after slider, a video hero and page transitions. Micro-interactions on buttons, switches, ticks and fields. All still under reduced motion.
- Photographs come as one set with one look (bright, moody or editorial), as cut-outs on a coloured ground, with words over them only where a scrim sits behind the words, or as a collage.
- Pictures: hand-checked public-domain and CC0 photo sets for 26 kinds of business, a photo finder that crops, grades and sizes every picture as one set, and 47 flat drawings of the subject's own things (composable into scenes) when there are none.
- A brand kit from one line: wordmark, lockup, a favicon drawn from the subject, a share image, an email header and a one-page brand sheet (`brand-kit.mjs`).
- Installs as plain HTML, React, Tailwind v4 or Next.js (checked against real builds), and exports tokens for shadcn/ui, SwiftUI, Jetpack Compose and Figma.

### Critique
- `audit-ui.mjs` checks overflow, contrast, focus, dead controls and the AI defaults (indigo and Inter, cream and serif, black and acid, labels over every heading, walls of words, invented stats, stock faces), and a designer's measures: something to look at in every section, no layout twice in a row, density rhythm, the headline jump, the motion budget, app touch targets, sheets and gestures, 200% text, right to left, forced colours, long words and speed.
- A word budget (40 in the hero, about 140 a screen), a rule against one-colour pages (every palette now has a second colour, `--highlight`) and a rule against the kit's own default first screen.
- `review-page.mjs` writes a review pack (first screens, a squint view, slices, an eight-question checklist) for the agent to judge by eye; `compare-pages.mjs` runs blind side-by-side comparisons.
- 36 eval briefs with a score history per agent.
