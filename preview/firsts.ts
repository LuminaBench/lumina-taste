// First screens, side by side: every hero composition the composer can choose, live, so a person picks by pointing.
// The pages are the compositions test's own (built into first-screens/ by scripts/build.mjs).
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const FIRSTS: Array<[string, string, string, string]> = [
  ['product--device', 'Product first', 'hero-split data-variant="product"', 'Software: the screen large, the words beneath.'],
  ['menu--scene', 'Menu board', 'hero-board data-variant="menu"', 'Prices people come for, as the picture.'],
  ['departures--scene', 'Departures board', 'hero-board data-variant="departures"', 'Times people come for: a ferry, a bus, a class.'],
  ['bleed--scene', 'Bleed', 'hero-split data-variant="bleed"', 'A place with one great photograph; a scrim only under the words.'],
  ['overlap--scene', 'Overlap', 'hero-split data-variant="overlap"', 'One object breaking the grid.'],
  ['edge--scene', 'Edge', 'hero-split data-variant="edge"', 'A calm service: the picture full height to the edge.'],
  ['cover--scene', 'Cover', 'hero-cover', 'A name worth setting big, like a magazine.'],
  ['mosaic--scene', 'Mosaic', 'hero-mosaic', 'Three to five things of one range, together.'],
  ['poster--scene', 'Poster', 'hero-statement data-variant="poster"', 'A date set enormous on the brand colour.'],
  ['tucked--scene', 'Tucked', 'hero-statement data-variant="tucked"', 'The claim large, one small true picture in it.'],
  ['wide--scene', 'Wide', 'hero-centered data-variant="wide"', 'One centred claim over a picture edge to edge.'],
  ['film--scene', 'Film', 'hero-video data-variant="full"', 'A real 8 to 20 second film is the first screen.'],
];
const BARS: Array<[string, string, string]> = [
  ['nav-ink-light', 'Ink bar', 'navbar-simple data-tone="dark"'],
  ['nav-brand-light', 'Brand bar', 'navbar-simple data-tone="accent"'],
  ['nav-split-light', 'Split bar', 'navbar-simple data-variant="split"'],
  ['nav-minimal-light', 'Minimal bar', 'navbar-simple data-variant="minimal"'],
];

export function viewFirsts(main: HTMLElement) {
  const tile = (file: string, name: string, markup: string, note: string, h = 900) => `<a class="g-page-card g-first" href="./first-screens/${file}.html" target="_blank" rel="noopener">
      <div class="g-page-thumb" data-audit-ignore style="aspect-ratio: 1440 / ${h}"><iframe tabindex="-1" aria-hidden="true" loading="lazy" title="${esc(name)}" src="./first-screens/${file}.html" style="height:${h}px"></iframe></div>
      <div class="g-card-body"><div class="g-card-title"><h3>${esc(name)}</h3></div><code class="g-api">${esc(markup)}</code>${note ? `<p>${esc(note)}</p>` : ''}</div>
    </a>`;
  main.innerHTML = `<section class="g-hero g-hero-sm"><h1>Which first screen?</h1><p class="g-sub">Every way the kit opens a page, live. The composer chooses one from the subject and says why; point at another and it uses that.</p><p class="g-meta">${FIRSTS.length} first screens · ${BARS.length} top bars · 2 footers</p></section>
    <h2 class="g-first-h">First screens</h2>
    <div class="g-page-grid">${FIRSTS.map(([f, n, m, w]) => tile(f, n, m, w)).join('')}</div>
    <h2 class="g-first-h">Top bars</h2>
    <div class="g-page-grid g-bars">${BARS.map(([f, n, m]) => tile(f, n, m, '', 220)).join('')}</div>
    <h2 class="g-first-h">Footers</h2>
    <div class="g-page-grid">${tile('feet', 'Wordmark and contact', 'site-footer data-variant="wordmark" / "contact"', 'The name across the column, or the phone and address set large.', 900)}</div>`;
  const ro = new ResizeObserver((entries) => entries.forEach((en) => (en.target as HTMLElement).style.setProperty('--s', String(en.contentRect.width / 1440))));
  main.querySelectorAll<HTMLElement>('.g-page-thumb').forEach((t) => ro.observe(t));
  return () => ro.disconnect();
}
