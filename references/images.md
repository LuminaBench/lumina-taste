# Pictures

A page with the right photograph beats any amount of type. When the person has their own photographs, use those and treat them as a set. When they do not, `scripts/find-images.mjs` finds openly licensed ones, and until something fits, the art panel draws the subject's own thing.

## Finding them

```sh
node scripts/find-images.mjs "sourdough loaf crust"                 # a numbered list; nothing is downloaded
node scripts/find-images.mjs "sourdough loaf crust" --pick 2 --out ./images
node scripts/find-images.mjs --fill index.html --subject "bakery" --out ./images
```

- Sources: Openverse (photo sites, Flickr, Wikimedia and more) and Wikimedia Commons, asked one at a time.
- Licences: public domain and CC0 by default, which need no credit. `--license by` adds CC BY and CC BY-SA, which must be credited where they appear.
- What is left out: paintings, prints, museum scans and anything tagged as art; diagrams, logos and screenshots; watermarked stock previews; files under 1000 px or 40 kB; old and archival photographs (dates before 1970, "vintage", library and museum collections); pictures of people (a title that names a person, or two or more people tags), unless the search itself asks for people.
- How the rest is ranked: every word of a short search must be there as a word ("law office" never brings back "law enforcement" at a customs "office"), the whole phrase in the title or a tag counts most, and full-size sources come before ones that only serve a 1000 px preview. Black-and-white pictures, words printed in the picture, another business's shop sign and laptop-on-a-café-table stock rank lower.
- `--fill` reads each art panel's `data-shot` brief, searches with it and the `--subject` (most specific first, then plainer), and sets the best match as the panel's `<img>`. `--dry-run` shows what it would choose. Panels with no fitting photograph keep the art panel and get a motif (below).
- Every picture is recorded in `images/credits.json` (source, licence, creator, every file with its size, the ratio, grade, palette and focal point, the original's size) and `images/CREDITS.md`. Keep both with the site.

## Treating them: one set, not a collage

Every picture `find-images` downloads is treated before it reaches the page (`--no-treat` keeps it as it is). For the person's own photographs:

```sh
node scripts/treat-images.mjs shop.jpg mug.jpg@50,35 --out images --ratio 4/5
node scripts/treat-images.mjs --page index.html                       # every local <img>, rewritten in place
```

- **One ratio.** The whole set is cropped to one aspect ratio: `--ratio`, else the ratio most of the page's panels use (`--fill`), else the standard ratio most of the pictures already have. The crop slides to hold the most detail (edges and colour that stand out from their surroundings).
- **One grade, from the page's palette.** Palette from `--palette`, `--profile taste-profile.json`, or the page's own `taste-profile.json` / `<html data-palette>`. Contrast is stretched to the same range, mid-tones brought to the same brightness, and colour strength to the same level, so pictures from different cameras sit together. Then the tone: `tint` (default: shadows towards the palette's ink, highlights towards its paper, a little accent in the mid-tones), `duotone` (ink to paper, for a strong look), `mono`, `warm`, `cool`, `natural` (levels only) or `none`.
- **A focal point.** Found from the picture, or set by hand (`file@x,y` or `--focus x,y`, per cent or 0 to 1; `data-focus="x,y"` on an `<img>` with `--page`). It is written as `object-position`, so a phone that crops a wide picture keeps the subject.
- **Small files.** WebP at quality 0.8 in 640, 1080 and 1600 px wide, never upscaled (a smaller picture gets its own width as the top size). The `<img>` gets `srcset`, `sizes`, `width` and `height`; the first picture on the first screen gets `loading="eager" fetchpriority="high"`, every other one `loading="lazy"`; all get `decoding="async"`. `data-sizes` on a panel overrides `sizes`.
- **Originals stay out** of the page folder; `--keep-originals` puts them in `images/originals/`.
- The work runs in headless Chromium through Playwright (canvas, no image library). Without Playwright the files are copied as they are and a warning says so.

## Choosing them

Search results are a first draft. Look at every picture before you keep it.

| Keep | Replace |
| --- | --- |
| The subject itself: the loaf, the mountain, the room, the tool | A picture of something nearby ("coffee" for a roaster's bag of beans) |
| One light and one ratio across a set (the treatment helps; it cannot make a night shot match a sunny one) | A set shot in different light, sizes and moods |
| Pictures with space for type where type sits on them | A busy picture under a headline |
| A photograph of a place or an object | A stranger's face presented as a customer, a team member or a reviewer. Never |
| Fewer, larger pictures | A collage of small ones |

- Search with nouns, not moods: "rye loaf crust flour" finds more than "warm cosy bakery".
- A stock picture of a generic person at a laptop is worse than no picture: keep the art panel.
- Write `alt` that says what the picture shows (`--fill` uses the brief's first clause; rewrite it if the picture differs).
- The critic fails pictures hot-linked from stock and placeholder services (`taste-stock-face`). Downloaded files in the project are fine.

## No photograph: the subject's own thing (art panel motifs)

An art panel with `data-motif` draws a flat spot illustration of the business's own thing above its name: `cup`, `loaf`, `crane`, `document`, `scales`, `leaf`, `phone`, `chart`, `key`, `ticket`, `tool`, `house`, `tooth`, `bowl`, `scissors`, `book`, `vase`, `bag`. They share one 160 grid, one round-capped stroke weight and three token colours (ink, the accent, a pale tint), so they look like one illustrator's set in every palette, light and dark, and at any size.

```html
<figure class="lt-art" data-motif="loaf" data-shot="The rye loaf on a floured bench, 4:5">
  <svg data-part="motif" viewBox="0 0 160 160" aria-hidden="true" focusable="false">…</svg>
  <p data-part="name">Rye</p><p data-part="fact">Baked at six, gone by noon</p>
  <figcaption class="lt-visually-hidden">The rye loaf</figcaption>
</figure>
```

- Copy the SVG from the art panel's snippet, or let `find-images --fill` write it: it picks the motif from the brief and the subject's keywords, gives neighbouring panels different drawings where the brief allows, and a different ground when one repeats. With `data-lt="art-panel"` the script draws a `data-motif` that has no SVG yet; `data-motif="auto"` picks from `data-shot`.
- The ground: a soft disc by default; `data-pattern="arch"` sets the drawing in a niche that runs to the foot of the panel, `"floor"` on a lower band, `"none"` on the bare panel. One ground per panel, at most three grounds in a set.
- Vary the tone across a set (plain, `accent`, `ink`); the drawing follows. With `data-tone="swatch"` it is drawn in the swatch's own ink.
- A photograph covers it: put the `<img>` first in the figure (`--fill` removes the SVG when it sets a photograph).
- It is a sign of the subject, not a picture of the product: never draw the person's actual product in detail in place of its photograph. If no motif fits, leave the panel typographic.

## The product: device frames

For software, the picture is the product working. `device-frame` draws it as a product shot: `data-kind="laptop"` (a 16:10 lid in a thin near-black bezel on an aluminium base), `"phone"` (metal band, bezel, island, side buttons), `"tablet"`, `"browser"` or `"window"`, with a soft layered shadow inside the critic's limits.

- Put a real screenshot in the screen as an `<img>` when there is one (it is cropped from the top).
- Until then, build the screen from the kit's own parts in `<div data-app="desktop" inert>` (drawn at 1280 px) or `<div data-app="phone" inert>` (390 px): a segmented control, badges, a primary button, a bottom nav, a small table and one chart, with the product's real words and numbers. It is zoomed to the screen, so a phone reads as a phone at any size. Keep it `inert`: it is a picture, not controls. Say what it shows in the figure's hidden `figcaption`.
- One shot per page: a laptop with the phone in front of its corner, or one device alone.

## Placing them

- **Hero**: one large picture, in `hero-split`'s `<div data-part="visual">` or full width under `hero-centered`. Its top lines up with the headline's top, or its centre with the text block's centre.
- **A set** (the range, the rooms, the work): `offer-cards`, `project-grid` or `gallery-rail`, at one ratio.
- **The moment**: one picture large on a `media-band`, with `data-zoom` so it settles into place as it scrolls in.
- **Behind type**: only with a scrim or on the picture's calm side; check contrast with the audit.
