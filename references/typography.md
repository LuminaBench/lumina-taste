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

- **Optical size (`opsz`)**: `legal`, `bookish`, `editorial`, `swiss` and `stencil` load faces with an opsz axis and set `font-optical-sizing: auto`, so the browser uses the headline cut at 64px and the text cut at 16px from one file. Do not pin `font-variation-settings: "opsz"` by hand unless a size is fixed and you have looked at both cuts. The cuts differ in width as well as contrast: Source Serif 4 is about 9% narrower at 72px than at 18px, Fraunces about 5% narrower at 72px than at 48px, Inter's display cut is visibly tighter. Judge a headline's line breaks in the real face, not in the fallback.
- **Width (`wdth`)**: `stadium` sets `--stretch-display: 125%` and `font-stretch` on the pairing; only its display face has a width axis, so body text stays at normal width. Archivo at 125% and 800 is wide: a five-word headline in a half-width column runs to five or six lines. Give stadium headlines the full width, or fewer words.
- **Weight (`wght`)**: any weight in the loaded range is available; 650 or 750 for a headline is fine, and costs nothing extra.

What Google actually serves (checked against every pairing's files): a variable family comes as one file per subset whatever range the URL asks for, and that file keeps the family's whole design space (Bitter's `700..800` file runs from 100 to 900). Its default instance is often an extreme: Bitter and Big Shoulders default to their hairline 100, Manrope, Nunito and Source Sans 3 to 200, Fraunces to 900. Anything that reads a file's default widths (a fallback calculator, a text-measuring tool) is measuring a weight the page never shows. Asking for separate weights of a variable family (`IBM+Plex+Sans:wght@400;500;600`) returns one `@font-face` per weight that all point at the same file; static families (Barlow, Barlow Condensed, Zilla Slab, IBM Plex Sans Condensed) get a file per weight.

## 5. Fonts with no download, a link, or self-hosted

1. **No download (the default).** Every stack names installed faces with the same character after the web font (Rockwell for Bitter, DIN Condensed for Big Shoulders, Charter for Literata, Arial Rounded for Fredoka). Pages work offline and make no third-party requests. Look at the page this way first: it is what most visitors see before any web font arrives.
2. **The link.** `webfont` in source.json is a Google Fonts CSS2 URL for exactly the families, axes and weights the pairing uses. It is one third-party request plus the files. Link `tokens/typography/fallbacks.css` after it so nothing moves when the files arrive (section 6).
3. **Self-hosted (best for production).** `node scripts/fonts.mjs --pairing <id> --out <project>/fonts [--subsets latin,latin-ext] [--href /fonts/] [--mono]` downloads the WOFF2 files for those weights (latin by default; a variable file once, however many weights point at it) and writes `fonts.css` (`font-display: swap`, `unicode-range`, metric-matched fallbacks), `preload.html` (preloads the headline and body files at the weights the pairing sets them in: Barlow Condensed's 600 cut for a 600 headline, not its 500) and `fonts.json` (sources, sizes, licence, measured metrics). It runs only when a person runs it; nothing in the kit calls it. `--dry-run` prints the request without downloading. A pairing is 32 to 258 KB of latin WOFF2 (bookish, two optical-size serifs, is the heaviest; rounded and geometric are under 40 KB). All faces are SIL Open Font License 1.1: keep `fonts.json` with the files.

## 6. Metric-matched fallbacks

When a web font swaps in, text set in a fallback with different widths and heights reflows: lines break differently and the page jumps (layout shift). The stacks in typography.css name `"<Family> Fallback"` right after each web family. That name matches no installed font, so on a page with no web font it is skipped and the installed faces after it show. Two ways to define it:

- **Self-hosted**: `fonts.mjs` writes it into `fonts.css`, measured from the files it downloaded.
- **The Google link**: link `tokens/typography/fallbacks.css` (every family, built by `npm run tokens` from the metrics stored in source.json). Do not link it on a page that loads no web font: it would replace Rockwell or Charter with a scaled Times or Arial.

Each fallback is a local face (Arial, Times New Roman or Courier New, or their metric twins Liberation and Arimo/Tinos/Cousine) with `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override`. Two faces per family, each matched where the pairing uses it: the regular face (weights up to 549) at the body weight and the desktop body size, or at the headline weight for a light headline face; the bold face (550 and up) at the headline weight and the size of `--step-4`, or at 600 for bold inside body copy. Widths are read at that instance (fvar, avar and HVAR), not at the file's default.

How close they get, measured in Chromium against the real files: paragraphs and ledes within ±1% of the web font's line length, headlines within ±3%, optical-size headline faces within ±5% across their size range (the fallback cannot change width with size, so Fraunces' hero at 76px runs 5% wide and its section heads 2 to 5% narrow). Figures set large are the exception: web fonts' tabular figures are up to 18% wider than Arial's, so a big number may wrap before the swap. Layout shift on the first screen with the files held back 1.5 s, without and with the fallbacks: venue in `stamped` 0.013 → 0, event in `stadium` 0.087 → 0 (phone), landing in `stencil` 0.093 → 0 and in `swiss` 0.098 → 0.001, cause in `humanist` 0.040 → 0; `editorial` stays at 0.07 because of Fraunces' optical sizes, and a row of buttons that only just fits can still flip to two rows.

Check it: load the page with the network throttled, screenshot before and after the fonts arrive, and compare the line breaks of the hero and the first paragraph. Re-measure after Google updates a face: `fonts.mjs --pairing <id> --out <dir> --mono --record` writes the new metrics into source.json; then `npm run tokens`.

## 7. What the real faces change

Seen with every pairing's real files on a specimen and two blueprints, at 1440 and 390, light and dark:

- **Figures.** Playfair Display draws old-style figures by default, so prices and counts set large went up and down the baseline; `didone` sets `font-feature-settings: "lnum" 1`. `tabular-nums` alone does not change figure style.
- **Tracking.** Heavy and display-cut faces need less negative tracking than the fallback suggests: Bitter 800 lost its word spaces at -0.02em (`stamped` is now -0.01em) and Inter's display optical size is already tight (`swiss` is now -0.025em). Mono headlines (`technical`) hold -0.04em because every glyph keeps its cell.
- **Tall vertical metrics.** Literata (ascent 1.18 em), Source Sans 3, Nunito, Manrope and Playfair have text boxes much taller than their letters. With tight leading the boxes reach into the line above; nothing touches on screen, but a checker that compares text boxes will report an overlap between an eyebrow and its headline, or a large inline time and the line above it.
- **Punctuation.** Overpass (`signage`) sets its middle dot close to the following word; spell separators as "a · b" with spaces on both sides, which the kit already does.
- **Weight in the dark.** No pairing needed a lighter weight in dark mode; the light headline faces (Fraunces 500, Playfair 500, Newsreader 500) hold up on near-black.
