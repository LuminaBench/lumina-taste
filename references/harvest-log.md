# Harvest log

lumina-taste v1.0.0 is clean-room code. Before writing it, a small set of stylesheets and chart/navigation source files from an older private LuminaBench web project was read once, in a temporary directory that was deleted afterwards. Only CSS, chart, theme and navigation code was inspected: no media, datasets, research archives, logos, brand marks, model names or site copy were opened or copied, and no file or line from that project is in this repository.

The ideas below were re-implemented from scratch against this kit's semantic tokens.

| Technique observed | Where it lives now |
| --- | --- |
| Theme switch built from a track, a thumb and two glyphs. The thumb travels on an overshooting spring (`cubic-bezier(0.3, 1.4, 0.5, 1)`), the idle glyph rests faintly on the far side, and the thumb widens slightly while pressed. | `components/ui/controls/theme-switch`, `--ease-spring` in `tokens/base.css` |
| Theme change revealed as a circle growing from the switch, using the View Transitions API with a plain fallback. | `components/ui/motion/view-transition` |
| Theme applied by an inline `<head>` script before first paint, with storage access wrapped in `try`. | `bootstrapSnippet()` in `engine/profiles/profile.mjs` |
| Paired light and dark categorical series colours, with the dark set lifted in lightness, not simply inverted. | `--chart-1…8` generated per mode by `scripts/build-tokens.mjs` |
| Chart tooltip anatomy: fixed position, clamped to `min(320px, 100vw − 24px)`, `pointer-events: none`, an accent top rule, an 80ms fade and no movement. On touch devices it pins open on tap. | `components/charts/core/tooltip.ts` |
| Keyboard focus on a chart point drawn as a dashed ring around the mark instead of a box outline. | `components/charts/core/charts.css` |
| SVG coordinates rounded to six decimals so server and client output stay identical. | `components/charts/core/svg.ts` |
| Disclosure chevrons that rotate in about 180ms with an ease-out curve. | `components/ui/controls/disclosure-chevron` |
| Display headings with tight negative tracking and an optional italic-serif emphasis word. | `--tracking-display`, `.lt-display`, the `editorial` pairing |
| `scrollbar-gutter: stable` and `scroll-padding-top` matched to the sticky header height, so anchors never hide under it. | `tokens/base.css` |
| `overscroll-behavior: contain` on menus, sheets and dialogs. | Overlay components |

Rejected on review: hard-coded hex colours, a sans stack of plain Arial, 40px-blur tooltip shadows (too heavy under the anti-slop rules), and a multi-colour gradient on the theme track.
