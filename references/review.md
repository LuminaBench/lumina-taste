# Reviewing a page like a designer

The auditor measures what can be measured. It cannot tell you whether the first screen says what the product is, whether the one bold idea is the right one, or whether a section is a template with new words. Those need eyes. This file gives the eyes a procedure: a review pack of pictures and measurements, a fixed checklist you answer in your own words, and a blind comparison when you need to know whether one page is better than another.

## 1. The review pack

```
node scripts/review-page.mjs <url | file | folder> [--out dir] [--slices 12] [--no-critic]
```

It writes, into a new folder (printed at the end; delete it when you are done):

| File | What it is for |
| --- | --- |
| `first-desktop-light.png`, `first-desktop-dark.png`, `first-mobile-light.png`, `first-mobile-dark.png` | The first screen at 1440×900 and 390×844, in both modes: the three-second test |
| `squint-desktop.png`, `squint-mobile.png` | The first screen blurred and grey: only size, weight and contrast are left, so you see what pulls the eye |
| `slice-desktop-01.png …`, `slice-mobile-01.png …` | The whole page cut into screen-height pieces, in order: what a visitor sees one scroll at a time |
| `review.json` | The measurements: for each section what it gives the eye (picture, drawing, chart, document, table, figure set large, rows), its layout (block, columns, heading position), its ground, its density; the type jump; the scroll moments; app checks at phone width; the three strongest areas at a squint and what is in them; the critic's findings and load speed |
| `review.md` | The checklist below, with the picture names and the measured facts beside each question, and a blank answer under each |

The pack does not judge. **You open every picture and answer every question.** Then you fix what the answers find, run the pack again, and answer again.

## 2. The checklist

1. **Is the first screen clear in 3 seconds?** What is it, who is it for, what is the one action?
2. **What stands out when you squint, and is it the right thing?**
3. **Is there one bold idea?** Name it.
4. **Does any section look like a template?** Name it.
5. **Is every section something to look at?**
6. **Does the type scale jump enough?**
7. **Would a demanding designer ship it?** If not, the three changes that would, most important first.

Rules for answering: name things (the section, the element, the size, the colour). Say what you see before what you think of it. "Looks good", "clean", "modern" and "professional" are not answers. An answer that would fit any page is wrong.

## 3. A worked example: good and bad answers

The page: a ceramics shop (the `shop` blueprint), first screen and slices 2 and 3.

| # | Bad answer | Good answer |
| --- | --- | --- |
| 1 | "Clear and clean, with a strong hero." | "Yes on the wide screen: a ceramics maker (*Stoneware, thrown in Stroud*), for people buying mugs, one green *Shop the range* button. On the phone the picture is pushed to the bottom edge, so for three seconds it is a serif headline and a paragraph: you know it is a maker, not what they make." |
| 2 | "The headline stands out." | "The 96px serif headline and the art panel pull equally; the panel's big circle is the darkest thing on the screen. The eye should land on the mug, but the panel is an abstract placeholder, not the mug, so the strongest thing on the screen says nothing." |
| 3 | "The design is bold and elegant." | "The bold idea is the size of the serif headline against small sans captions. It is a type idea, not a subject idea: nothing on the page could only belong to this potter." |
| 4 | "No, it looks custom." | "Slice 3 has two: three numbered steps beside a heading (the how-it-works block every template has), then a 3×2 grid of facts under a heading. Both are on near-white grounds with no picture." |
| 5 | "Mostly." | "No. The product row (slice 2) has tinted boxes with a name where the photographs should be, and slice 3 is two sections of words in a row. Only the first screen and the closing band give the eye something." |
| 6 | "Yes, good hierarchy." | "Yes: 96px headline over 15px body, a jump of 6.4. The section headings are a clear second step, well above the body." |
| 7 | "Yes, it's ready." | "No. 1. Real photographs of the three pieces in the product row and the hero (find-images, or the maker's own). 2. Turn the three steps into stack-cards, each with a picture of that step (the wheel, the kiln, the packed box). 3. Merge the facts grid into the product cards and drop the section." |

What makes the right column right: each answer could only be about this page, names where on the page, and the last one gives changes in order.

## 4. Blind comparison

When you have two versions (yours before and after, yours and another tool's, yours and a reference site saved to disk), judge them without knowing which is which.

```
node scripts/compare-pages.mjs ours=out/index.html rival=../their-output/index.html ref=saved/site.html --out qa/compare/round-1
```

Every page is screenshotted at the same size (first screen, the whole page up to eight screens, the phone's first screen) and given a random letter. The folder holds `A-first.png`, `A-full.png`, `A-phone.png`… , `sheet.png` (first screens side by side), `judge.md` (the rubric) and `.key.json` (which letter is which: do not open it before the verdict). Only the URLs given are loaded: outside fonts and pictures are blocked and counted in `round.json`, so a page is judged on what it ships.

Score each letter 1 to 5 on the rubric in `judge.md` (first screen, squint, one bold idea, something to look at, type, craft, not generated), decide, then record:

```
node scripts/compare-pages.mjs --out qa/compare/round-1 --record "B>A>C" --reason "B shows the mug at full width and its phone screen keeps it; A is a heading and three cards"
```

`A>B`, `A=B` and rankings work. Recording reveals the names and adds the result to a running tally per source (`compare-tally.json` beside the round folder, or `--tally file`); `--tally file` alone prints it. A source that keeps losing to a reference tells you where the kit is weak; a "win" against the generated default (`tests/fixtures/ai-default-saas.html`) is the least a page should do.

## 5. What the critic now measures for you

`audit-ui.mjs --taste` reports these from the same measurements as the pack (thresholds in `scripts/lib/critic.mjs`, chosen so every blueprint scores 100 and the default-look fixtures are caught):

| Rule | Fires when |
| --- | --- |
| `taste-no-visual` | A section of six words or more on a marketing page has nothing to look at: no picture, drawing, chart, document, table, rows that scan like a table, figure set at 40px or more, or quote set at 28px or more. Forms, questions, a closing line with its action and short strips are exempt |
| `taste-same-layout` | Two neighbouring sections are the same block with the same columns, or the same multi-column pattern with the heading in the same place, on the same ground |
| `taste-density` | Three sections in a row with text covering more than 12% of each, or five or more sections whose density differs by less than 3.5 points |
| `taste-type-jump` | The largest headline is less than 2.5 times the body text on a marketing page |
| `taste-motion-budget` | More than two big scroll moments (`data-zoom`, `data-parallax`, pinned scenes, sideways tracks, product reveals, hero video, stack-cards, scroll-statement, sticky-story), or two back to back. The `data-scroll` and `data-entrance` reveals do not count |
| `app-touch-target` | On an app (`data-app`, or no hero and an app shell, side nav or bottom bar) at phone width, a primary control (a filled button, a submit, anything in a bottom or tab bar) is under 44×44px |
| `app-safe-area` | A fixed bar on the bottom edge of the phone screen has no `env(safe-area-inset-bottom)` in its own or its children's rules |
| `app-states` | The page declares states (`meta.json` `states`, or `<html data-states="loading empty error">`) and has no `data-view` block for one of them |

`--perf` (and `--strict`, as warnings) loads the page cold at each width and reports `perf-lcp-lazy` (the largest picture is `loading="lazy"`: an error), `perf-lcp-priority` (it lacks `fetchpriority="high"`), `perf-cls` (layout shift over 0.1, with what moved), `perf-font-bytes` (over 300 KB, or more than six files), `perf-js-bytes` and `perf-css-bytes` (over 400 KB and 200 KB gzipped), `perf-img-dimensions` (images without width and height or an aspect-ratio) and `perf-img-oversized` (an image more than twice its box in both directions).
