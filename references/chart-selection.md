# Choosing a chart

Pick the chart from the **shape of the data** and the **one sentence the reader should take away**, not from what looks impressive. Write that sentence first. It becomes the chart title ("Team plan pulled ahead in 2026"), not a label ("MRR by plan").

## 1. Decision matrix

| Data shape | Question the reader asks | Use | Engine id | Avoid |
| --- | --- | --- | --- | --- |
| One measure over time | Is it going up? | Line | `line-chart` | Columns for > 20 periods; area unless zero matters |
| One volume over time, zero matters | How much in total? | Smooth area | `area-chart` | Stacking a single series |
| 2–6 measures over time | Which one is winning? | Multi-line with direct labels, highlight one | `multi-line-chart` | Legends; more than 6 lines (use small multiples) |
| Parts of a total over time | How is the mix changing? | Stacked area (≤ 5 layers) | `stacked-area-chart` | Reading middle layers precisely (use multi-line) |
| Up to ~12 categories, short labels | Which is biggest? | Vertical bar | `bar-chart` | Rotated labels: switch to horizontal |
| Categories with long labels / a ranking | What's the top N? | Horizontal bar, sorted | `horizontal-bar-chart` | Alphabetical order unless the reader looks things up |
| Many similar ranked values | Where does each sit? | Lollipop | `lollipop-chart` | Heavy bars for values that differ by < 10% |
| 2–3 series across a few categories | How do groups compare? | Grouped bar | `grouped-bar-chart` | 4+ bars per group |
| Totals split into parts per category | What makes up each total? | Stacked bar | `stacked-bar-chart` | More than 5 segments |
| Signed changes, variances, deltas | What went up and what went down? | Diverging bar | `diverging-bar-chart` | Colour without a sign in the label |
| Two numeric measures per item | Are they related? | Scatter (Canvas above 300 points) | `scatter-plot` | Connecting the dots |
| Three numeric measures per item | Which items are big *and* high? | Bubble (≤ 40 items) | `bubble-chart` | Precise size comparison |
| A trend inside a table or KPI | Is it moving the right way? | Sparkline (line or bar) | `sparkline` | Axes, gridlines, tooltips |
| Daily values over months | When is it busy? | Calendar heatmap | `calendar-heatmap` | Exact values |
| Two categorical dimensions | Where are the hot spots? | Matrix heatmap | `matrix-heatmap` | Rainbow colour ramps |
| Open/high/low/close per period | How did the price trade? | Candlestick or OHLC + volume | `candlestick-chart` | Non-financial audiences (use line) |
| 2–4 parts of one whole | What share is each? | Donut | `donut-chart` | Pies with 5+ slices, 3D, exploded slices |
| One value vs. a goal | Are we on target? | Radial gauge | `radial-gauge` | Several gauges side by side (use bars with a target line) |
| Ordered steps with drop-off | Where do we lose people? | Funnel | `funnel-chart` | Unordered categories |
| Volume moving between stages | Where does it go? | Sankey | `sankey-chart` | Cycles; > ~20 links |
| 1–3 profiles over 5–8 attributes | How do the profiles differ? | Radar | `radar-chart` | > 3 series; attributes with different units |
| One headline metric | What's the number and is it good? | KPI stat card | `kpi-card` | Two numbers fighting in one card |

When two rows fit, prefer the one higher in this list: simpler charts are read faster.

## 2. Hard bans

- **No 3D** of any kind: no 3D pies, bars or extruded areas.
- **No pie or donut with more than 4 slices.** The donut engine folds extras into "Other" automatically.
- **No rotated x-axis labels.** If labels collide, thin them (`tickIndices`) or switch to a horizontal bar.
- **No vertical gridlines.** Dashed horizontal gridlines only, labels in a gutter. Bars carry their own values.
- **No dual y-axes.** Use two charts stacked with a shared x axis.
- **No legend when a direct label fits.** Label lines at their ends, bars at their tips, donut parts beside the ring.
- **No rainbow or sequential palettes for categories.** Use `--chart-1…8` in order (the order is colour-vision-deficiency safe).
- **No truncated bar axes.** Bars always start at zero. Lines may zoom.
- **No dark-on-dark or colour-only encoding.** Every mark has a tooltip, a keyboard path and a row in the hidden data table.
- **No animation that changes values while being read.** Charts draw once and update in place.

## 3. Colour rules

| Use | Tokens |
| --- | --- |
| Categories | `--chart-1` … `--chart-8` in order. Highlight one series and set the rest to `--border-strong` when the story is about one. |
| Sequential (heatmaps) | `seqColor(t)`: theme surface → `--accent-solid`, mixed in OKLab. |
| Diverging (deltas) | `divColor(t)`: `--status-negative` ← surface → `--status-positive`. |
| Good / bad | Only `--status-positive` / `--status-negative`, and always with a sign or an arrow in text. |

Mix colours in **OKLab**, never OKLCH, when one side is a near-grey: OKLCH interpolates hue through the grey's arbitrary hue and turns reds purple.

## 4. Anatomy every chart ships with

1. **Title** that states the finding, **subtitle** with the measure and unit.
2. **Gutter labels** in `tabular-nums`, formatted by `formatNumber` (`£24.4k`, `60.1 fps`, `12.5%`, `−3.1 pt`).
3. **Magnetic crosshair** (x-indexed charts) or **nearest-mark** hover, with a fixed-position tooltip that never flickers or clips.
4. **Keyboard**: the plot is focusable; arrows move through points, Home/End jump, Esc hides.
5. **Accessible summary** (`aria-label`) and a visually hidden **data table**.
6. **Source line** and **SVG/PNG export** buttons.

## 5. Agent checklist

- [ ] Wrote the one-sentence takeaway and used it as the title.
- [ ] Picked the chart from the matrix above, not from habit.
- [ ] Units in the subtitle and in every formatted number.
- [ ] Series ≤ 6, slices ≤ 4, bubbles ≤ 40, layers ≤ 5.
- [ ] Ran `node scripts/audit-ui.mjs <url>` and fixed every finding.
