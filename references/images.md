# Pictures

A page with the right photograph beats any amount of type. When the person has their own photographs, use those and treat them as a set. When they do not, `scripts/find-images.mjs` finds openly licensed ones, and until something fits, the art panel draws the subject's own thing.

## Finding them

```sh
node scripts/find-images.mjs --fill index.html --subject "coffee shop in York" --out ./images   # curated set first, then search
node scripts/find-images.mjs --starter bakery                       # the curated set for a kind of business
node scripts/find-images.mjs --starter bakery --pick 2,5 --out ./images
node scripts/find-images.mjs "sourdough loaf crust"                 # search: a numbered list; nothing is downloaded
node scripts/find-images.mjs "sourdough loaf crust" --pick 2 --out ./images
```

### Starter sets: curated first

Search results are a first draft; a starter set is a finished one. `engine/photos/<set>.json` holds 6 to 12 photographs per kind of business, each downloaded, looked at and kept only if a good designer would put it on a real site: the subject itself, no faces, no watermark, no words in the picture, no artworks or old archive photographs, sharp, well lit, at least 1600 px on the long side, and one light across the set. Only public domain and CC0, so no credit is owed (it is recorded anyway). The files are data, not pictures: `find-images` downloads, treats and credits them like any other photograph.

- **Which set.** `--starter <set>` names one (a set id, or a page-types domain such as `hospitality`). With `--fill` and no `--starter`, the set comes from `--subject`: a set whose own `words` the subject names (the longest wins, so "coffee shop" finds `cafe` before `commerce`), else the set of the subject's page-types domain. `--no-starter` searches only.
- **Which photograph for which panel.** Each panel's `data-shot` brief is matched against the photographs' `shot` keywords (earlier words in the brief count more; words that only name the business, such as "coffee" on a café page, count a third). Pairs are taken best first across the whole page, each photograph once, and once one is chosen, others of the same `tone` get a small lift so the set holds together. Briefs no photograph fits are searched for; with a set, the bare subject is never searched on its own (it brings back other businesses' shopfronts), so a panel nothing fits keeps its drawing. The hero (the first panel on the first screen) chooses first. Three gates come before any score:
  - **The head phrase.** The photograph must show what the brief is of: its head noun, plus one of that noun's own modifiers when it has any ("workshop units" needs "workshop", not just "units"; "a small office building" needs "office"). "X of Y" reads as Y ("a tray of cinnamon buns"), or either when X is a part or container ("the front of the shop"). Words that only describe (size, colour, state, number, position) do not count.
  - **One sense.** A word shared by the brief and the photograph must mean the same in both: kitchen units are not storage units, a cocktail bar is not a steel bar, a dining table is not a table of fees, a site crane is not a wading crane (`SENSES` in `scripts/lib/image-starter.mjs`; add a word there when a fill reads one two ways).
  - **No contradicted state.** A brief that asks for something finished never gets a photograph of a site, cranes or scaffolding, and the reverse.
- **Thin matches.** A match that passes the gates but shares little else, or only the business's own word, is "stand-in-level": the log says so. A panel alone in its section keeps its drawing rather than take one; in a set of siblings it is used and marked, to be replaced with the business's own picture.
- **One set, not a collage.** When a third or more of a section's panels have a photograph, its remaining panels get the closest unused photographs of the set rather than a mix of photographs and drawings; the log marks them "stand-in". They are on subject but not the brief: replace them with the business's own pictures. `--no-complete` keeps the drawings.
- **Treatment.** Each curated photograph's `focus` (chosen by eye) leads the crop, so a 3:2 picture cut to 4:5 keeps the cup, not the wall beside it. `alt` is the photograph's `shows`, which says what is actually in it.
- **Sets:** one per page-types domain (`professional`, `construction`, `trades`, `beauty`, `hospitality`, `media`, `property`, `social`, `finance`, `trading`, `devtool`, `analytics`, `health`, `public`, `commerce`, `editorial`, `productivity`, `creative`, `events`, `playful`, `enterprise`, `travel`, `education`, `transport`), plus finer sets where a domain holds very different places: `cafe` and `bakery`. For software (`devtool`, `analytics`, `productivity`, `trading`), the set is atmosphere for one band at most; the picture of a software product is the product working (device frames, below).

A photograph in a set:

```json
{
  "id": "filter-coffee-dripping-through",
  "shows": "Filter coffee dripping through a pour-over cone into a glass server",
  "shot": ["filter", "pour over", "drip", "dripper", "glass", "brew", "coffee", "kettle"],
  "orientation": "wide", "tone": "dark", "focus": {"x": 0.55, "y": 0.4},
  "title": "Drip brewing (Unsplash)", "creator": "…", "licence": "CC0 1.0",
  "licenceUrl": "https://creativecommons.org/publicdomain/zero/1.0/", "provider": "wikimedia",
  "page": "https://commons.wikimedia.org/wiki/File:…", "url": "https://upload.wikimedia.org/…/1920px-….jpg",
  "width": 1920, "height": 1280, "original": {"width": 5472, "height": 3648}
}
```

### Adding or changing a set

1. Search Wikimedia Commons (and Openverse) for public domain or CC0 photographs, one request at a time with a descriptive User-Agent. Commons holds tens of thousands of CC0 photographs imported from photo sites (titles ending "(Unsplash)"): `intitle:unsplash <noun>` finds modern, well-lit pictures of things.
2. Download the candidates to `qa/artifacts/` (never into the repo) and look at every one, full size. Keep only those that pass the list above; then look at the kept ones side by side and drop any that break the set's light.
3. For each: `shows` (one plain sentence, what is in it; it becomes the `alt`), `shot` (8 to 12 lower-case nouns a brief would use for it: the thing, the place, the action), `tone` (`light`, `dark`, `warm` or `cool`: the one a designer would name first), `orientation`, and `focus`: the point a crop must keep, chosen by looking (0 to 1 from the left and top of the picture).
4. `url` is the file at 1920 px wide (a standard Commons thumbnail size; the original when it is smaller), with no query string. Check that it still answers 200 with an image.
5. `domains` lists the page-types domains the set serves; `words` lists the subject words that pick it ahead of its domain. Write the file with `formatJson`. `tests/unit/photos.test.mjs` checks every set: 6 to 12 photographs, licences, sizes, sources, fields, and that every domain has one.
6. Delete the downloads.

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

An art panel with `data-motif` draws a flat spot illustration of the business's own thing above its name, one of 47:

| For | Motifs |
| --- | --- |
| Food and drink | `cup`, `loaf`, `bowl`, `glass` |
| Shops and makers | `bag`, `vase`, `hanger`, `bottle`, `gift`, `pot`, `box` |
| Building and trades | `crane`, `house`, `tool`, `key`, `van` |
| Professional, money and security | `document`, `scales`, `chart`, `coins`, `lens`, `lock` |
| Health and care | `stethoscope`, `tooth`, `glasses`, `paw`, `leaf` |
| Software | `terminal`, `server`, `phone`, `chat` |
| Places, travel and transport | `pin`, `suitcase`, `mountain`, `boat`, `bus`, `train`, `bike` |
| Events, media and making things | `ticket`, `calendar`, `mic`, `camera`, `pencil`, `envelope`, `book`, `scissors` |
| Charity and community | `jar`, `chat`, `bowl` |

Every domain the composer knows has at least two. They share one 160 grid, one round-capped stroke weight and three token colours (ink, the accent, a pale tint), so they look like one illustrator's set in every palette, light and dark, and at any size.

```html
<figure class="lt-art" data-motif="loaf" data-shot="The rye loaf on a floured bench, 4:5">
  <svg data-part="motif" viewBox="0 0 160 160" aria-hidden="true" focusable="false">…</svg>
  <p data-part="name">Rye</p><p data-part="fact">Baked at six, gone by noon</p>
  <figcaption class="lt-visually-hidden">The rye loaf</figcaption>
</figure>
```

- Copy the SVG from the art panel's snippet, or let `find-images --fill` write it: it picks the motif from the brief and the subject's keywords (`pickMotif` / `rankMotifs` in art-panel.ts and scripts/lib/image-motifs.mjs, the same rules: the first words of a brief count most, and pairs such as "house blend", "box office" or "personal trainer" are read as what they mean), gives neighbouring panels different drawings where the brief allows, and a different ground when one repeats. With `data-lt="art-panel"` the script draws a `data-motif` that has no SVG yet; `data-motif="auto"` picks from `data-shot`.
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
