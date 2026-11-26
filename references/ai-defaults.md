# AI defaults, and how to reverse them

Every model that writes front-end code has a look it falls back on when nothing pushes it elsewhere. Users now recognise these looks on sight, and a page in one of them reads as generated however well it is built. This file names them, says how the critic spots them, and gives the move that replaces each one.

The one rule under all of it: **never swap one default for another.** Banning purple without saying what to use instead produces the next most likely default (cream and serif, or black and acid green). Every ban below comes with a replacement, and every look choice comes with a reason taken from the subject.

## 1. The four default looks

| Look | What it is | Where it comes from | The critic |
| --- | --- | --- | --- |
| **The 2023 SaaS default** | White or slate-50 ground, indigo or violet buttons (Tailwind indigo-500, `#6366f1`), an indigo-to-purple gradient somewhere, Inter or Geist for everything, cards with `rounded-xl shadow-sm` | Tailwind UI demos and shadcn defaults, copied into years of training code | `taste-default-look` (indigo accent + a stock sans), `slop-gradient` |
| **The 2025 "tasteful" default** | Cream ground (`#F4F1EA`, `#FAF8F5`), a high-contrast serif headline (Playfair, Newsreader, Fraunces, Instrument Serif), a terracotta, rust or forest-green accent | What models produce when told to avoid the first one. Anthropic's own design guidance now names it | `taste-default-look` (cream + book serif + terracotta or forest) |
| **Black and one acid colour** | Near-black ground, one neon green or vermilion accent, mono or grotesk type, often a glow | The developer-tool look of 2022 to 2024, averaged | `taste-default-look` (near-black + acid accent), `taste-glow` |
| **The broadsheet** | Hairline rules everywhere, zero radius, numbered sections, serif headings, no pictures | The "editorial" escape from cards, used for subjects that are not editorial | Not scored: judge it. It is right for a publication or a studio, wrong for a dentist |

These looks are not wrong in themselves. A coffee roaster may really want cream and a serif; a terminal tool may really be black and green. They are wrong when they arrive **regardless of the subject**. So:

- Pick the look from the subject (section 3). If it lands in one of the rows above, say why in one line on the page root: `<html data-look-reason="the client's shop front is cream with a gold serif sign">`. The critic then accepts it.
- If you cannot write that line from the brief, you defaulted. Choose again.

## 2. Tells beyond colour, and their replacements

| Tell | Replace with |
| --- | --- |
| Hero skeleton: pill badge, centred headline, softer restatement, two buttons, stat strip | One claim set large on the page's left edge, one action, and the thing itself (`hero-split` with the real screen or object, or `hero-statement`) |
| Three identical feature cards, each an icon in a tinted rounded square, a title and two lines (`taste-icon-tiles`) | The feature itself: a screen fragment, a document, a chart (`bento-grid` tiles of different sizes, `stack-cards`, `feature-split`). No icon at all is better than a decorative one |
| Emoji as icons (`slop-emoji`) | One outline icon set at one size, or no icon |
| Gradient text on headings (`slop-gradient-text`) | Solid ink; emphasis by weight or a quieter second half (`data-part="quiet"`) |
| Neon glow on dark (`taste-glow`) | Depth from surface steps and one hairline of light on the top edge |
| Glass with nothing behind it | An opaque surface. Blur only over a picture or moving content |
| `rounded-2xl` and `shadow-xl` on everything, `scale(1.05)` on every card hover (`taste-hover-scale`) | One radius vocabulary from the profile; one shadow; hover moves 1 to 2px or changes a border |
| Fade-up on every element | One entrance on the hero and the quiet section reveal (`tokens/scroll.css`); at most two scroll moments |
| Stat strip of 10x, 99.9%, 24/7, 50k+ (`taste-invented-stat`) | Figures the user gave, with a period and a unit. No figures, no strip |
| Testimonials with stock faces (`taste-stock-face`) | Real quotes with permission, or none. Initials, never a stranger's photograph |
| Inter, Roboto, Arial, system-ui or Geist for headings and body alike (`taste-default-font`) | A pairing chosen for the subject from `tokens/typography`, with real weight contrast between headline and body |
| "Unlock", "Seamless", "Supercharge", "the future of X" (`slop-copy`, `lint-copy`) | A noun and a verb from the product: "Send an invoice from your phone in 30 seconds" |
| Words in every section (`taste-text-wall`) | Something to look at in every section; words as captions (composition.md §8b) |

## 3. Choosing the look from the subject (the anti-prompt)

Do this before installing anything, in your head or in two lines to the user. It replaces "modern, clean, premium", which always produce the average.

1. **Three nouns from the subject's world.** Materials, tools, places: "stoneware, kiln, sea" for a potter; "ledger, stamp, invoice" for an accountant; "station, timetable, platform" for a transport app.
2. **A palette that comes from them.** Pick the shipped palette whose ground and accent relate to those nouns (`palettes.md`), or derive one with `--accent`. Say which noun it came from.
3. **A typeface for a reason.** "Slab, because the bags are stamped"; "a grotesk, because the timetable is". If the reason would fit any subject, it is not a reason.
4. **One risk.** One thing on the page that is bolder than the rest: the figure in the hero, the dark band, the statement, the colour of the product. Everything else stays quiet.
5. **Check the result against section 1.** If it is one of the four looks, write the `data-look-reason` line or choose again.
6. **Look at it.** Screenshots at 1440px and 390px, then the audit. Your own eye catches hierarchy; the critic catches the measurable defaults. Neither alone is enough.

If the user gives a vague brief ("make it look good", "modern landing page"), do not ask them to define taste. Run step 1 on whatever they told you about the product, state the result in two lines ("Stoneware greens and kiln-brick red, a slab headline, the mug large in the first screen"), and build.

## 4. If you are…

- **Claude.** With no direction you produce Inter, Lucide icons in tinted squares and shadowed cards. With a design skill pushing you off that, you produce cream, serif and terracotta. Take the palette from step 2 and write down why; do not reach for warm neutrals by habit.
- **GPT or Codex.** You lean on cards: card grids, pill clusters, stat strips, dashboard-style marketing pages. Default to no cards: a section is a heading and one picture; use a card only for something people click. One H1, one accent, a full-width first screen.
- **Gemini.** Reported to escape the purple-and-Inter look more often, but it has its own averages. Run the same checks; do not assume.
- **Any tool built on shadcn, v0, Lovable or Bolt.** Its theme ships slate neutrals, indigo or zinc primaries, Inter and `--radius: 0.5rem`. Replace the theme variables with the profile's tokens (`install-taste.mjs --framework react` writes them) before generating a single component, so the defaults cannot leak through.

## 5. What the critic measures

`audit-ui.mjs --taste` reports:

- **The default looks:** `taste-default-look` (the first three looks, judged in the mode the page was written in; silenced by `data-look-reason`), `taste-default-font` (one stock sans for headlines and body on a page with a hero), `taste-icon-tiles` (three or more icons in tinted rounded tiles), `taste-glow` (coloured glow on a dark ground), `taste-hover-scale` (cards that grow on hover), `taste-invented-stat` (10x, 24/7, 99.9% with no period stated), `taste-stock-face` (pictures from stock or placeholder services), next to the older `slop-gradient`, `slop-gradient-text`, `slop-emoji`, `slop-shadow` and `slop-copy`.
- **The template's shape:** `taste-no-visual` (a section of words with nothing to look at), `taste-same-layout` (two neighbouring sections with the same block or columns on the same ground), `taste-density` (three dense sections in a row, or the same density from top to bottom), `taste-type-jump` (a headline less than 2.5 times the body), `taste-motion-budget` (more than two big scroll moments, or two back to back), with the older `taste-text-wall`, `taste-monotony`, `taste-label-every-section` and `taste-hairlines`. Each default-look fixture in `tests/fixtures/` trips at least one of them: the SaaS and cream pages have a section of words with nothing to look at; the broadsheet has the same density everywhere.
- **Apps at phone width:** `app-touch-target` (a primary control under 44×44px), `app-safe-area` (a fixed bottom bar that ignores the home indicator), `app-states` (a declared loading, empty or error state with no view).
- **Speed** (`--perf`, and as warnings under `--strict`): a lazy or low-priority largest picture, layout shift over 0.1, heavy fonts, JS and CSS, images without dimensions or far larger than their box.

The thresholds live in `scripts/lib/critic.mjs` and were chosen by running them on every blueprint and on the default-look fixtures in `tests/fixtures/`.

## 6. What the critic cannot judge

Whether the copy is specific, whether the picture is the right picture, whether the one risk is the right risk, whether the first screen says what the product is in three seconds. The critic knows a section has a picture; it does not know the picture is a grey placeholder or a stranger's office. That is the detail pass (composition.md §10) and the review pack: `node scripts/review-page.mjs <page>` captures the first screen in both modes and widths, a squint, and the whole page in screens, and writes a checklist you answer by looking (`references/review.md`, with a worked example of good and bad answers). To know whether a change made the page better, compare the two versions blind with `scripts/compare-pages.mjs`.
