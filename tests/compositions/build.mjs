// Builds the first-screen composition test pages in memory: every hero composition with each kind of picture
// (a photograph, a scene of drawings, a device), plus the bars and feet. The photograph is an SVG stand-in so
// nothing binary is involved; "white" is the worst case for words over a picture. Used by
// tests/compositions.spec.ts, which writes them next to the gallery build.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneSvg } from '../../scripts/lib/image-motifs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ui = (fam, id, ext) => join(root, 'components/ui', fam, id, `${id}.${ext}`);
const PARTS = [['controls', 'button'], ['data', 'device-frame'], ['data', 'art-panel'], ['navigation', 'navbar-simple'], ['navigation', 'navbar-centered'], ['navigation', 'site-footer'], ['navigation', 'footer-minimal'],
  ['blocks', 'hero-split'], ['blocks', 'hero-centered'], ['blocks', 'hero-statement'], ['blocks', 'hero-video'], ['blocks', 'hero-board'], ['blocks', 'hero-cover'], ['blocks', 'hero-mosaic'], ['blocks', 'media-band'], ['blocks', 'offer-cards'], ['blocks', 'feature-split']];

const photo = (fill) => {
  const svg = fill === 'white' ? '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#fff"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#c9b28f"/><stop offset="1" stop-color="#4b3626"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><circle cx="1100" cy="420" r="260" fill="#e9dcc3"/><rect x="300" y="620" width="900" height="80" fill="#2b1d14"/></svg>';
  return `<img src="data:image/svg+xml,${encodeURIComponent(svg)}" alt="A table by a window" width="1600" height="1000">`;
};
const device = readFileSync(ui('data', 'device-frame', 'html'), 'utf8').match(/<figure class="lt-device" data-kind="laptop"[\s\S]*?<\/figure>/)[0];
export const SLOTS = {
  photo: () => photo('warm'),
  white: () => photo('white'),
  scene: () => `<figure class="lt-art" data-scene="cup bag" data-shot="The roastery, 5:4">${sceneSvg(['cup', 'bag'])}<p data-part="name">Juniper Coffee</p><figcaption class="lt-visually-hidden">Juniper Coffee</figcaption></figure>`,
  device: () => device,
};
const ARW = '<svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const cta = '<div data-part="cta"><a class="lt-btn" data-variant="primary" data-size="lg" href="#next">Book a tasting</a><a class="lt-btn" data-variant="ghost" data-size="lg" href="#next">See the coffees ' + ARW + '</a></div>';
const copy = '<div data-part="copy"><p data-part="eyebrow">Roastery and café, Bristol</p><h1 id="h">Coffee roasted forty steps from your cup</h1><p data-part="lede">We roast three coffees every Tuesday in the room behind the counter.</p>' + cta + '</div>';
const facts = '<dl data-part="facts"><div><dt>coffees</dt><dd>3</dd></div><div><dt>steps to the cup</dt><dd>40</dd></div><div><dt>a bag</dt><dd>£11</dd></div></dl>';
const foot = `<div data-part="foot"><div data-part="pitch"><p data-part="lede">Roasted on Tuesdays.</p>${cta}</div>${facts}</div>`;
const rows = '<li><b>Huila, Colombia</b><data value="3.40">£3.40</data><small>Dark chocolate, red apple</small></li><li><b>Sidama, Ethiopia</b><data value="3.60">£3.60</data><small>Peach, jasmine</small></li><li><b>Cerrado, Brazil</b><data value="3.20">£3.20</data><small>Hazelnut</small></li>';
const dep = ['06:40', '07:10', '07:40'].map((t) => `<li><time datetime="${t}">${t}</time><b>Moss Quay</b><span>Pier 1</span><span data-part="status">On time</span></li>`).join('');
const media = (v) => `<div data-part="media">${v.replace('<figure class="lt-art"', '<figure class="lt-art" data-part="poster"').replace('<img ', '<img data-part="poster" ')}<video data-part="video" muted loop playsinline preload="none" aria-hidden="true" hidden><source data-src="" type="video/mp4"></video><button type="button" data-part="toggle" aria-label="Pause the film" hidden>II</button></div>`;
const vcopy = '<div data-part="copy"><h1 id="h">Across to Moss Quay in 22 minutes</h1><div data-part="side"><p data-part="lede">Every half hour from 06:40.</p><div data-part="cta"><a class="lt-btn" data-variant="primary" data-size="lg" href="#next">See today’s sailings</a></div></div></div>';

/** Every composition: [name, (picture) => markup, the pictures it takes]. */
export const HEROES = {
  'split': [(v) => `<section class="lt-hero-split" aria-labelledby="h">${copy}<div data-part="visual">${v}</div></section>`, ['photo', 'scene', 'device']],
  'overlap': [(v) => `<section class="lt-hero-split" data-variant="overlap" aria-labelledby="h">${copy}<div data-part="visual">${v}</div></section>`, ['photo', 'scene', 'device']],
  'edge': [(v) => `<section class="lt-hero-split" data-variant="edge" aria-labelledby="h">${copy}<div data-part="visual">${v}</div></section>`, ['photo', 'scene', 'device']],
  'product': [(v) => `<section class="lt-hero-split" data-variant="product" aria-labelledby="h">${copy}<div data-part="visual">${v}</div></section>`, ['photo', 'scene', 'device']],
  'bleed': [(v) => `<section class="lt-hero-split" data-variant="bleed" data-tone="dark" data-calm="start" aria-labelledby="h">${copy}<div data-part="visual">${v}</div></section>`, ['photo', 'white', 'scene', 'device']],
  'wide': [(v) => `<section class="lt-hero-centered" data-variant="wide" aria-labelledby="h"><h1 id="h">Coffee roasted forty steps from your cup</h1><p data-part="lede">Three coffees, roasted every Tuesday.</p>${cta}<div data-part="visual">${v}</div></section>`, ['photo', 'scene', 'device']],
  'tucked': [(v) => `<section class="lt-hero-statement" data-variant="tucked" aria-labelledby="h"><p data-part="eyebrow">Roastery, Bristol</p><div data-part="visual">${v}</div><h1 id="h">Coffee roasted forty steps from your cup</h1>${foot}</section>`, ['photo', 'scene', 'device']],
  'poster': [(v) => `<section class="lt-hero-statement" data-variant="poster" data-tone="accent" aria-labelledby="h"><p data-part="eyebrow">Weaver’s Hall, Halifax</p><p data-part="date"><time datetime="2027-05-14">14–15</time><span>May 2027</span></p><h1 id="h">Two days on making public services people can use</h1><div data-part="visual">${v}</div>${foot}</section>`, ['photo', 'scene', 'device']],
  'menu': [(v) => `<section class="lt-hero-board" data-variant="menu" aria-labelledby="h"><div data-part="copy"><h1 id="h">Three coffees, roasted on Tuesdays</h1><p data-part="lede">Roasted behind the counter.</p>${cta}</div><figure data-part="board" data-tone="dark"><figcaption><b>On the bar today</b><span>Cup</span></figcaption><ol data-part="rows">${rows}</ol></figure><div data-part="visual">${v}</div></section>`, ['photo', 'scene', 'device']],
  'departures': [(v) => `<section class="lt-hero-board" data-variant="departures" aria-labelledby="h"><div data-part="copy"><h1 id="h">Across to Moss Quay in 22 minutes</h1><p data-part="lede">Every half hour.</p>${cta}</div><figure data-part="board" data-tone="dark"><figcaption><b>Departures</b><span>Kestrel Point</span></figcaption><ol data-part="rows">${dep}</ol></figure><div data-part="visual">${v}</div></section>`, ['photo', 'scene', 'device']],
  'cover': [(v) => `<section class="lt-hero-cover" aria-labelledby="h"><h1 id="h" data-part="masthead" style="--cover-len: 14">Juniper Coffee</h1><p data-part="dateline"><span>Roastery, Bristol</span><time datetime="2026-11">November 2026</time></p><div data-part="visual">${v}</div><div data-part="copy"><p data-part="lede">Coffee roasted forty steps from your cup.</p>${cta}</div></section>`, ['photo', 'scene', 'device']],
  'mosaic': [(v) => `<section class="lt-hero-mosaic" aria-labelledby="h">${copy}<ul data-part="tiles">${[v, v, v, v].map((x) => `<li>${x}</li>`).join('')}</ul></section>`, ['photo', 'scene', 'device']],
  'film': [(v) => `<section class="lt-hero-video" data-variant="full" data-tone="dark" data-lt="hero-video" aria-labelledby="h">${vcopy}${media(v)}</section>`, ['photo', 'white', 'scene', 'device']],
};
const nav = (attrs = '') => `<header class="lt-nav-simple" data-lt="navbar-simple"${attrs}><a href="#h" data-part="brand"><span data-part="mark" aria-hidden="true"></span>Larkspur Ceramics</a><nav aria-label="Main"><ul data-part="links"><li><a href="#next">The range</a></li><li><a href="#next">How it is made</a></li><li><a href="#next">Materials and care</a></li><li><a href="#next">Delivery</a></li></ul></nav><div data-part="actions"><a class="lt-btn" data-variant="primary" data-size="sm" href="#next">Shop the range</a></div><button type="button" data-part="toggle" aria-expanded="false" aria-controls="p" aria-label="Menu"><svg class="lt-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><div id="p" data-part="panel" hidden><ul><li><a href="#next">The range</a></li></ul></div></header>`;
const wordmark = '<footer class="lt-footer" data-variant="wordmark"><div data-part="top"><div data-part="about"><a data-part="brand" href="#h">Larkspur Ceramics</a><p>Thrown in Stroud.</p></div><nav data-part="cols" aria-label="Footer"><div><h2>Shop</h2><ul><li><a href="#next">The range</a></li></ul></div></nav></div><p data-part="wordmark" aria-hidden="true" style="--wordmark-len: 17">Larkspur Ceramics</p><div data-part="legal"><span>© 2026 Larkspur Ceramics Ltd</span><span>Stroud</span></div></footer>';
const contact = '<footer class="lt-footer" data-variant="contact"><div data-part="top"><div data-part="reach"><p>Ring, or write</p><a href="tel:+441174960130">0117 496 0130</a><a href="mailto:hello@juniper.example">hello@juniper.example</a></div><div data-part="where"><address>Juniper Coffee<br>14 Mill Lane<br>Bristol</address><p>Open Tuesday to Sunday</p></div></div><div data-part="legal"><span>© 2026 Juniper Coffee</span></div></footer>';

const shell = (body, { mode = 'light', dir = 'ltr' } = {}) => `<!doctype html><html lang="en" dir="${dir}" data-palette="porcelain-teal" data-mode="${mode}" data-type="humanist" data-density="balanced" data-radius="balanced" data-motion="reduced">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Compositions</title><link rel="stylesheet" href="./comp.css"><style>body{margin:0;background:var(--bg-canvas)}</style></head>
<body>${body}<script type="module" src="./comp.js"></script></body></html>`;

/** Returns { 'comp.js', 'comp.css', '<hero>--<slot>.html'…, 'nav-<variant>.html', 'feet.html' }. */
export async function compositionFiles() {
  const css = PARTS.map(([f, id]) => `import ${JSON.stringify(ui(f, id, 'css'))};`).join('\n');
  const tokens = ['tokens/base.css', 'tokens/layout.css', 'tokens/backdrops.css', 'tokens/composition.css', 'tokens/scroll.css', 'tokens/palettes/all.css', 'tokens/typography/typography.css', 'components/ui/_shared/shared.css'].map((t) => `import ${JSON.stringify(join(root, t))};`).join('\n');
  const res = await build({ stdin: { contents: `${tokens}\n${css}\nimport { enhance } from ${JSON.stringify(ui('navigation', 'navbar-simple', 'ts').replace(/\.ts$/, ''))};\ndocument.querySelectorAll('.lt-nav-simple').forEach((n) => enhance(n as HTMLElement));\n`, resolveDir: root, loader: 'ts', sourcefile: 'comp-entry.ts' }, bundle: true, write: false, format: 'esm', target: 'es2022', outdir: '/out', entryNames: 'comp', logLevel: 'error' });
  const out = {};
  for (const f of res.outputFiles) out[f.path.split('/').pop()] = f.text;
  for (const [name, [fn, slots]] of Object.entries(HEROES)) for (const slot of slots) out[`${name}--${slot}.html`] = shell(`${nav()}<main>${fn(SLOTS[slot]())}<section id="next" style="height:60vh"></section></main>`);
  out['rtl-overlap.html'] = shell(`${nav()}<main>${HEROES.overlap[0](SLOTS.photo())}</main>`, { dir: 'rtl' });
  out['rtl-bleed.html'] = shell(`${nav()}<main>${HEROES.bleed[0](SLOTS.white())}</main>`, { dir: 'rtl' });
  for (const [k, attrs] of Object.entries({ ink: ' data-tone="dark"', brand: ' data-tone="accent"', split: ' data-variant="split" data-tone="dark"', minimal: ' data-variant="minimal" data-tone="dark"' })) for (const mode of ['light', 'dark']) out[`nav-${k}-${mode}.html`] = shell(`${nav(attrs)}<main><section id="next" style="height:40vh"></section></main>`, { mode });
  out['feet.html'] = shell(`<main id="next"></main>${wordmark}${contact}`);
  return out;
}
