# Changelog

## 1.0.0

The first public release. A design skill for coding agents that plans a page from a one-line brief, builds it from a library of tasteful parts, and critiques the result the way a designer would.

### Plan
- `compose.mjs` turns a brief into a page plan for 34 page types: the look and typeface taken from the subject, a rhythm of quiet and loud sections, one bold idea, at most two scroll moments, and a first draft written from the brief's own facts. Nothing from a sample business survives; what the brief did not say is one TODO list.
- One-line business descriptions ("Kestrel Dental, family dentist on Harrogate Road…") land on the right page, keep the business's name and get a plain headline of what it is and where; twenty such briefs are a regression test.
- Five app blueprints that feel native on a phone and open into panes on a desktop: a bank, a fitness tracker, a customer's booking app, messaging and a settings-heavy tool, each with its welcome, empty, loading and error screens, plus a number pad, date strip, activity rings, settings groups and a message composer.
- `starter.mjs`: a finished starting point in one command for thirteen kinds of business and app: the page, the brand kit and one checklist of what is still sample.
- A gallery page shows every first screen, top bar and footer live, side by side; `compose --hero <id>` uses the one the person points at. A picture band never repeats the first screen's headline.
- Drafted charts are titled with their finding, written from the numbers; a dashboard leads with the figure the brief names. The plan offers other true headlines from the same facts. Every control has a pressed state.
- Apps are planned as flows (first run, first useful screen, one record, settings) with their empty, loading and error wording.
- The first screen is chosen from the subject, never by habit: product first, overlap, edge, bleed, a menu or departures board, a magazine cover, a mosaic, a tucked picture, a date poster, a full-screen film; with an ink, paper or brand top bar and a wordmark or contact foot.
- Your own media first: `media-intake.mjs` reads a folder of the business's photographs, logo, film and menu; the composer places every photograph before any stock one (the hero gets the best), reads the menu into prices, puts the logo in the top bar and makes every favicon and app icon size from it, and shows where each picture goes before building.
- Brand from what the user has: a colour, a logo or an old site. Never one of the looks every model falls back on.

### Build
- 221 UI patterns, 48 chart engines and 32 page blueprints in vanilla TypeScript, CSS and React, including a phone app flow, a desktop workspace and a dense dashboard.
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
