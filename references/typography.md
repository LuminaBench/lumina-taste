# Typography

Twenty pairings live in `tokens/typography/source.json` and become `[data-type="<id>"]` blocks in `tokens/typography/typography.css`. Pick one with `install-taste.mjs --type <id>` or `compose.mjs --typeface <id>`; `search.mjs "font for <subject>" --kind typography` finds them by subject.

## 1. Choose from the subject, not from habit

A typeface needs a reason that would not fit any other subject. Name three nouns from the subject's world (ai-defaults.md §3), then pick the face those nouns already use.

| Subject | Pairing | Why this face |
| --- | --- | --- |
| Transport, timetables, stations, wayfinding | `signage` | Overpass is drawn from road-sign lettering; its figures line up in a departures board |
| Health, clinics, pharmacies, care | `hyperlegible` | Atkinson Hyperlegible separates letters that are easy to confuse (I l 1, O 0), which matters for a dose or a time |
| Trades, roasters, breweries, workwear | `stamped` | A heavy slab reads like ink on kraft paper; a typewriter mono sets batch numbers like a label printer |
| Sport, fixtures, festivals, tickets | `stadium` | Wide, heavy headlines fill a scoreboard edge to edge; a narrower body keeps results compact |
| Law, contracts, policy, public records | `legal` | Literata was drawn for long reading on screens; firm, low-contrast serifs read as a document, not a magazine |
| Developer tools on a light ground | `workbench` | A sans and a mono from one family; the mono carries the accent instead of a neon colour on black |
| Children's learning, schools, libraries | `schoolbook` | Round, open headlines; a body face drawn to ease reading for early and struggling readers |
| Construction, civil works, plant hire | `stencil` | Tall condensed capitals, like hoarding and plant lettering, fit long project names in a narrow column |
| Publications, essays, portfolios | `editorial`, `bookish` | Text serifs with optical sizes |
| Trading, analytics, dense admin | `financial`, `dense` | Condensed headings fit more figures per row |
| Fashion, hotels | `didone` | Hairline contrast is the language of mastheads |
| Consumer apps, onboarding | `humanist`, `geometric`, `rounded` | Open shapes that stay friendly at small sizes |
| App screens with no hero (consoles, settings) | `precision`, `technical` | One neutral sans, or mono headlines for terminal products |

`precision` is marked `appsOnly`: one stock sans for headline and body is right inside an app, and it is the generated-page default on a marketing page (`taste-default-font`). Use another pairing for anything with a hero.

Never: Inter, Roboto, Arial, system-ui or Geist for headline and body alike on a page with a hero; a high-contrast book serif on cream with a terracotta accent unless the subject asks for it and the page says so (`data-look-reason`).

## 2. Scale

Each pairing sets a fluid modular scale, `--step-n2` to `--step-5`, from a base and a ratio at 360px and at 1440px (`base: [16, 18], ratio: [1.2, 1.3]` means 16px × 1.2ⁿ on a phone, 18px × 1.3ⁿ on a wide screen). Use the steps, never raw sizes:

| Step | Use |
| --- | --- |
| `--step-5` | The one display line per page (hero headline, the figure set large) |
| `--step-4`, `--step-3` | Section headings |
| `--step-2`, `--step-1` | Card titles, lede paragraphs |
| `--step-0` | Body text |
| `--step-n1`, `--step-n2` | Captions, table cells, axis labels (keep reading text at 12px or more) |

Dense pairings (`dense`, `financial`, `precision`) use a smaller base and a flatter ratio; display pairings (`didone`, `stencil`, `stadium`) a steeper ratio so the headline is a real event. Sections are set apart by scale: one step-5 per page, and the jump to the next heading should be visible from across the room.

## 3. Weight contrast

Headline and body differ by at least 200 in weight when they share a family (`--weight-display` vs `--weight-body`), and by at least 100 when the families differ. A heavy display over a regular body (`stamped` 800/400, `stencil` 800/400) gives hierarchy without size; a light display over a regular body (`didone`, `editorial`) relies on size instead. Do not set body text below 400 except in faces drawn wide (`schoolbook` uses Lexend at 350). Bold inside body copy is 600, never the display weight.

## 4. Variable fonts and optical sizing

Where a face is variable, typography.css exposes the axis range the webfont link loads as `--axis-<role>-<axis>-min` and `-max` (for example `--axis-display-wght-min: 700`). Stay inside those ranges: a weight outside them falls back to the nearest loaded one.

- **Optical size (`opsz`)**: `legal`, `bookish`, `editorial`, `swiss` and `stencil` load faces with an opsz axis and set `font-optical-sizing: auto`, so the browser uses the headline cut at 64px and the text cut at 16px from one file. Do not pin `font-variation-settings: "opsz"` by hand unless a size is fixed and you have looked at both cuts.
- **Width (`wdth`)**: `stadium` sets `--stretch-display: 125%` and `font-stretch` on the pairing; only its display face has a width axis, so body text stays at normal width.
- **Weight (`wght`)**: any weight in the loaded range is available; 650 or 750 for a headline is fine, and costs nothing extra.

## 5. Fonts with no download, a link, or self-hosted

1. **No download (the default).** Every stack names installed faces with the same character after the web font (Rockwell for Bitter, DIN Condensed for Big Shoulders, Charter for Literata, Arial Rounded for Fredoka). Pages work offline and make no third-party requests. Look at the page this way first: it is what most visitors see before any web font arrives.
2. **The link.** `webfont` in source.json is a Google Fonts CSS2 URL for exactly the families, axes and weights the pairing uses. It is one third-party request plus the files.
3. **Self-hosted (best for production).** `node scripts/fonts.mjs --pairing <id> --out <project>/fonts [--subsets latin,latin-ext] [--href /fonts/]` downloads the WOFF2 files for those weights (latin by default) and writes `fonts.css` (`font-display: swap`, `unicode-range`), `preload.html` (preloads the headline and body files) and `fonts.json` (sources, sizes, licence). It runs only when a person runs it; nothing in the kit calls it. `--dry-run` prints the request without downloading. All faces are SIL Open Font License 1.1: keep `fonts.json` with the files.

## 6. Metric-matched fallbacks

When a web font swaps in, text set in a fallback with different widths and heights reflows: lines break differently and the page jumps (layout shift). The stacks in typography.css name `"<Family> Fallback"` right after each web family. That name matches no installed font, so without self-hosting it is skipped. `fonts.mjs` defines it: it measures each downloaded file (units per em, ascent, descent, line gap and the average advance of ordinary English text) and writes a local face (Arial, Times New Roman or Courier New, or their metric twins Liberation and Arimo/Tinos/Cousine) with `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override`, so the fallback takes the web font's space line for line. Two faces per family: regular weights on the regular local face, 550 and up on the bold one.

Check it: load the page with the network throttled, screenshot before and after the fonts arrive, and compare the line breaks of the hero and the first paragraph.
