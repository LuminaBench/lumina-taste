# Pictures

A page with the right photograph beats any amount of type. When the person has their own photographs, use those. When they do not, `scripts/find-images.mjs` finds openly licensed ones, and the art panel stands in until there is something better.

## Finding them

```sh
node scripts/find-images.mjs "sourdough loaf crust"                 # a numbered list; nothing is downloaded
node scripts/find-images.mjs "sourdough loaf crust" --pick 2 --out ./images
node scripts/find-images.mjs --fill index.html --subject "bakery" --out ./images
```

- Sources: Openverse (photo sites, Flickr, Wikimedia and more) and Wikimedia Commons.
- Licences: public domain and CC0 by default, which need no credit. `--license by` adds CC BY and CC BY-SA, which must be credited where they appear.
- Every download is written to `images/credits.json` and `images/CREDITS.md`: title, creator, licence, source page. Keep both with the site.
- `--fill` reads each art panel's `data-shot` brief, searches with it and the `--subject`, downloads the best match and sets it as the panel's `<img>`. It only uses photograph sources, skips paintings and museum scans, and needs the title to match both the brief and the subject. Where nothing passes, the art panel stays. `--dry-run` shows what it would choose.

## Choosing them

Search results are a first draft. Look at every picture before you keep it.

| Keep | Replace |
| --- | --- |
| The subject itself: the loaf, the mountain, the room, the tool | A picture of something nearby ("coffee" for a roaster's bag of beans) |
| One light and one ratio across a set (all 4:5, all window light) | A set of pictures shot in different light, sizes and moods |
| Pictures with space for type where type sits on them | A busy picture under a headline |
| A photograph of a place or an object | A stranger's face presented as a customer, a team member or a reviewer. Never |
| Fewer, larger pictures | A collage of small ones |

- Search with nouns, not moods: "rye loaf crust flour" finds more than "warm cosy bakery".
- A stock picture of a generic person at a laptop is worse than no picture: keep the art panel.
- Set `width` and `height` (or an aspect ratio) on every image, `loading="lazy"` below the first screen, and write `alt` that says what the picture shows.
- The critic fails pictures hot-linked from stock and placeholder services (`taste-stock-face`). Downloaded files in the project are fine.

## Placing them

- **Hero**: one large picture, in `hero-split`'s `<div data-part="visual">` or full width under `hero-centered`. Its top lines up with the headline's top, or its centre with the text block's centre.
- **A set** (the range, the rooms, the work): `offer-cards`, `project-grid` or `gallery-rail`, at one ratio.
- **The moment**: one picture large on a `media-band`, with `data-zoom` so it settles into place as it scrolls in.
- **Behind type**: only with a scrim or on the picture's calm side; check contrast with the audit.
