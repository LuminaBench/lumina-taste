# Composition

How to turn a correct page into a designed one. A page can pass every audit and still look like a stack of parts: same shape ten times, nothing to remember, no reason it belongs to this subject. Read this after `compose.mjs` and before you build. The composer's "Art direction" section applies these rules to your brief; this file explains them so you can adjust.

## 1. Start from the subject

Answer three questions in one line each before choosing any component.

1. **What does this audience trust?** Figures (finance, analytics), working code (developers), the object itself (shops, makers), a place and its hours (venues), plain words (public services), the work (studios).
2. **What is the one picture?** The single thing shown large in the first screen. If you cannot name it, the page has no centre.
3. **What should a visitor remember tomorrow?** One fact or one image. Everything else on the page is quieter than that.

## 2. One signature per page

A signature is the one move that makes the page this page. Pick one. Two signatures compete; none is a template.

| Subject | Signature | Built from |
| --- | --- | --- |
| Developer tool | Code that runs | `data-backdrop="grid spot"` + `backdrop-circuit` behind the hero, `command-chip` beside the button, `terminal-window` |
| Finance, analytics | The real thing, with real numbers | The document the product makes (`invoice-sheet`) or one chart with the finding as its title (`forecast-chart`, `multi-line-chart` with `highlight`) in the hero |
| App or SaaS | The product, working | `device-frame` holding the real screen, then `sticky-story` or `showcase-tabs` |
| Shop, brand | The objects as a set | `offer-cards` with photographs or art panels at one ratio, toned plain, accent, ink |
| Place, venue | A place you can find | One large art panel or photograph, "open now" in words (`visit-info`), `booking-bar` |
| Studio, publication | Set like print | `hero-statement`, `<main data-numbered data-separators="rules">` |
| Public service | The task, first | `hero-statement` naming the task, numbered `how-it-works`, underlined links |
| Practice, professional | Plain terms | `service-list` with every price in one column, named people with their registration, hairlines |
| Charity | The claim and the proof | `hero-statement` with three true figures, one bar showing where each pound goes |
| Event | The date, large | `hero-statement` with the date and place above the headline, the programme as timed `service-list` rows |

Everything that is not the signature is plain on purpose. No second animated thing, no second backdrop, no second large picture.

## 3. Rhythm: never the same shape twice in a row

Every section presents one of six shapes. Neighbours must differ.

| Shape | What it looks like | Blocks |
| --- | --- | --- |
| left | Heading on top, body below, all on the left edge | most blocks as they ship; `data-layout="split"` puts the lede to the right of the heading |
| rail | Heading in a narrow left column that stays put, body on the right | any heading-and-body block with `data-layout="rail"`; `faq-section`, `sticky-story` |
| centre | Heading centred above a symmetrical body | `data-layout="centre"`; `pricing-tiers`, `logo-cloud`, `hero-centered`, `showcase-tabs` |
| split | Two halves side by side | `hero-split`, `quote-feature`, `visit-info`, `contact-section` |
| alternating | Rows that swap sides | `feature-split` |
| panel | One contained panel | `cta-band`, `booking-bar`, `newsletter-signup` |

Rules:

- Count what the brief has, then choose: one to four of anything lays out cleanly (two tickets centre, four products go four across, three people become rows). Never add an item to fill a row, and never leave one alone on a row.
- At most two rails on a page, never adjacent. A rail suits a long body (six features, three quotes, eight integrations).
- Centre a section only when its body is symmetrical: three tiers, a row of logos, an even grid. Never centre body text.
- Three or more card grids in a row is a wall. Turn the middle one into rows (`rail`), a quote, or figures.
- Dense, then open: follow a busy section (a grid, a table) with a quiet one (one quote, three figures, a statement).

`compose.mjs` assigns a layout to each section so that this holds. If you add or remove a section, re-check the neighbours.

## 4. Page-level switches

Two attributes on `<main>` change the character of the whole page.

| Attribute | Effect | Use it for | Not for |
| --- | --- | --- | --- |
| `data-separators="rules"` | A hairline between sections | Editorial, studios, finance, public services, premium brands: pages that should read as printed | Pages that already alternate tinted bands. Use one or the other. |
| `data-numbered` | Section labels count 01, 02, 03 | Pages with four or more labelled sections that are read in order | Short pages, app screens |

Without either, alternate plain and tinted bands (`data-tone="well"`), never two tinted in a row.

## 5. The first screen

| Hero | When | The picture |
| --- | --- | --- |
| `hero-split` | There is something to show: a product screen, a chart, an object, a place | Right side. Software: the frame, with a real screenshot or a small live mock. Anything else: `<div data-part="visual">` with a `device-frame`, a `code-block`, a chart, a photograph or an `art-panel`. |
| `hero-centered` | A product that needs a wide picture under the words, or a hero with a backdrop | Below the buttons, full width. Good with `data-backdrop`. |
| `hero-statement` | The words are the product, or there is nothing worth showing | None. The headline is the picture: six to ten words that make a claim. |

Placing the picture:

- One large picture beats three small ones. Never a collage.
- Its top lines up with the top of the headline or its centre with the centre of the text block. Not in between.
- It may touch the right edge of the container. It never floats with equal space on all sides inside its half.
- A caption states what it shows in one line, in secondary ink, when that is not obvious.
- No picture is better than a wrong one. No stock photographs, no drawings of the product, no decorative shapes.

## 6. Colour budget

- The accent appears in three places at most: the primary button, small section labels, and one thing in the hero (a data series, an art panel, a trace). Count them.
- Ink, secondary ink and hairlines do the rest. If a section needs to stand out, give it space or a tinted band, not colour.
- Status colours mean status. Never green for "good feature", never red for emphasis.
- Dark mode is the same budget on a dark ground, not more glow.

## 7. Type

- Three sizes carry a marketing page: the headline, section headings (one size, every section) and body. Small uppercase labels are the fourth. A fifth size is a mistake.
- Headline length follows its size: at 100px, six to ten words; at 52px, up to twelve. Break by sense: read each line aloud.
- Body text is 60 to 72 characters a line. Ledes are shorter (44 to 56).
- Numbers people compare are tabular and share a unit. Write the unit once per column.
- Use the mono face for things that are code, ids, times and counters. Not for decoration.
- One typeface pairing per page. The style or profile sets it; do not add a third face.

## 8. Space and edges

- One left edge. Every section's content starts on the same vertical line; the eye should be able to run down it from the logo to the footer.
- Three distances, in a ratio near 1 : 2 : 4: inside a group, between groups, between sections. If two of them look the same, the grouping is lost.
- Sections are a full `--section-y` apart. `data-space="tight"` pulls a proof strip up to the section it supports; `data-space="open"` lets a lone quote stand apart.
- When a page feels crowded, remove a section before shrinking anything.

## 9. Tailor it to the brief

| The brief says | Do this |
| --- | --- |
| Not software (a practice, a place, a maker, a charity, an event) | Use that subject's page type and blueprint (SKILL.md, Workflow I). Never the software landing page with the words changed: its sections answer questions these visitors do not have |
| A named audience ("for accountants", "for parents") | Use their words in headings; pick density for how they read (experts: denser; anxious or hurried: larger, fewer things) |
| A mood word (calm, premium, bold, playful, technical) | Let it choose the style and the amount of space; do not add decoration to express it |
| What they have (a screenshot, photographs, real quotes, prices) | Build the page around the strongest real thing; leave out sections they have nothing for |
| What they lack | Say so at the end of your reply, with the `data-shot` photo briefs and the facts you assumed |
| An existing brand colour or logo | Keep it; fit the nearest palette around it (`sniff.mjs`, `--accent`) |
| "Like this site" | Take the look, not the layout or the words (references/reading-a-reference.md) |

## 10. The detail pass

Do this with the page open at 1440px and at 390px, after it works and before the audit. Each line is a look, not a script.

1. Run your eye down the left edge. Does anything start a few pixels off?
2. Read every heading's line breaks aloud. Move a word, or shorten the heading, where a line ends on "the", "a", "of".
3. Is any heading's last line a single short word? Rewrite it.
4. Squint. Is one thing in the first screen clearly first? Is the primary button the only filled one?
5. Count the accent. More than three places: remove one.
6. Do two neighbouring sections have the same shape? Change one.
7. Are cards in a row the same height, with their last lines (prices, links) on one baseline?
8. Do pictures in a set share one ratio and one tone logic?
9. Are all numbers in a column the same format, right-aligned or decimal-aligned, with one unit?
10. Is every icon the same family, stroke and size? Remove icons that say nothing.
11. Nested corners: is the inner radius smaller than the outer by the padding between them?
12. Is body text at least 16px on a phone and never wider than 72 characters?
13. On the phone: does the primary action fit in the first screen? Does anything touch the screen edge?
14. Hover and focus every interactive thing once. Is each state visible and consistent?
15. Read the copy as the audience. Remove any sentence that would be true of a competitor.
16. Check the page in the other colour mode. Does the picture still sit properly on its ground?

## 11. What the critic checks

`audit-ui.mjs --taste` reports the measurable half of this file: three neighbours with the same shape (`taste-monotony`), a run of centred sections (`taste-centred-run`), accent used in too many places (`taste-accent-budget`), content that leaves the shared left edge (`taste-edge`) headings that end on a stranded word (`taste-widow`) and headings that break inside a hyphenated word (`taste-heading-break`), next to its existing checks for type steps, radii, measure, rhythm and focal point. The other half is your eye: do the detail pass.
