# Reading a reference

People often show what they want instead of saying it: a screenshot, a link, "like this but ours". A reference tells you the look. It does not give you its brand, its words or its layout to copy. Read it in this order, write down what you see, then map each line to something in the kit.

## 1. What to read, in order

| Look at | Ask | Maps to |
| --- | --- | --- |
| The ground | Light or dark? Pure white/black, or warm, cool, tinted? | `--mode`, then a palette with that temperature (`node scripts/search.mjs "warm dark" --kind palette`) |
| The accent | One hue or several? Where is it used: buttons only, or also light and lines? | The palette's accent. Several accents in a reference still become one here. |
| Headline type | Serif, grotesque, geometric, mono? Heavy or light? Tight or open? | `--type` (`search.mjs "tight grotesque headline" --kind type`) |
| Corners | Square, slightly rounded, soft, pill? | `--radius sharp|balanced|soft` |
| Air | How much fits on one screen? | `--density compact|balanced|spacious` |
| Edges | Are things separated by hairlines, by fills, by shadows, or by space alone? | The style: `search.mjs "hairlines no shadows" --kind style` |
| Background | Flat, or a grid, dots, a wash of colour, pixels, lines? | `data-backdrop` (SKILL.md, Workflow H), or a style that brings one: `trace`, `graph`, `ember`, `pixel` |
| Signature parts | What two or three elements make it recognisable? | Catalog ids, below |

For a live site, `node scripts/sniff.mjs <url>` reads the first six rows for you and prints the nearest profile.

## 2. Parts people point at, and their names here

| In the reference | Use |
| --- | --- |
| A rounded bar of links floating at the top | `navbar-simple` (pill variant) or `segmented-control` for in-page views |
| A small rounded label above the headline ("New: …", "v2 is out") | `announcement-pill` |
| A box with an install command and a copy button | `command-chip` |
| Tabs that switch between large example screens | `showcase-tabs` |
| A big text box with a model or mode picker under it | `prompt-composer` |
| A menu that picks an account, workspace or model, in groups, with a tick | `switcher-menu` |
| A sidebar list of chats or runs with small status dots | `session-list` |
| Glowing lines running along a grid | `backdrop-circuit` on `data-backdrop="grid"` |
| A pixelated or halftone colour field | `backdrop-dither` |
| Colour glowing up from the bottom of a dark hero | `data-backdrop="wash"` |

Anything else: describe it the way the person would and search (`node scripts/search.mjs "the thing"`).

## 3. What not to take

- The name, the logo, the mascot, the illustrations and the photographs.
- The words. Write the page's copy from the product in front of you (references/copy-patterns.md).
- The exact layout, section for section. Use the page plan from `compose.mjs`; a reference decides the look, the plan decides the structure.
- Its mistakes: low-contrast grey text, five accents, a gradient headline, motion with no pause. Keep the kit's rules where the reference breaks them, and say so in one line.

## 4. Say it back before building

Two or three lines, so the person can correct you cheaply:

> From your reference I am taking: a near-black ground, one orange accent, heavy geometric headlines, square corners, a faint grid behind the hero. That is `--style trace`. I am not copying its layout or words. Building the landing page plan with that look.

If two looks could fit, do not guess: `node scripts/directions.mjs "<brief>" --styles trace,ember,graphite` puts them side by side on the person's own content.
