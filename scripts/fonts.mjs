#!/usr/bin/env node
// Self-host a type pairing's web fonts, so a page makes no third-party font requests.
//
//   node scripts/fonts.mjs --pairing stamped --out /abs/project/fonts
//   node scripts/fonts.mjs --pairing legal --out ./fonts --subsets latin,latin-ext --href /assets/fonts/
//   node scripts/fonts.mjs --pairing stadium --dry-run          # print the request, download nothing
//
// Asks the Google Fonts CSS2 API for exactly the families, axes and weights the pairing's webfont link
// names (latin by default), downloads those WOFF2 files and writes, into --out:
//   fonts.css     @font-face rules (font-display: swap, unicode-range) for the files, plus metric-matched
//                 "<Family> Fallback" faces measured from the files themselves (size-adjust, ascent-,
//                 descent- and line-gap-override), which the kit's stacks already name: no layout shift
//                 when the web font arrives.
//   preload.html  <link rel="preload"> for the headline and body files, and the stylesheet link.
//   fonts.json    what was downloaded, from where, its size and licence.
// The faces are open-licence (SIL OFL 1.1); keep fonts.json with them.
//
// --record (kit maintainers) also writes the measured metrics into tokens/typography/source.json, from which
// `npm run tokens` builds tokens/typography/fallbacks.css. Run it for every pairing when Google updates a face.
//
// This makes network requests, so it runs only when a person runs it: nothing in the kit calls it.
// LT_GOOGLE_FONTS overrides the CSS2 endpoint (tests point it at a local stand-in).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { faceTargets, fallbackFaces, fontMetrics } from './lib/font-metrics.mjs';
import { formatJson } from './lib/json.mjs';
import { css2Url, mergeFaces, parseCss, parseWebfont } from './lib/webfont.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : args[i + 1]; };
const flag = (name) => args.includes(`--${name}`);
const pairings = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings;
const usage = () => {
  console.error(`Usage: node scripts/fonts.mjs --pairing <id> --out <dir> [--subsets latin,latin-ext] [--href <url prefix>] [--mono] [--dry-run] [--record]\nPairings: ${pairings.map((p) => p.id).join(', ')}`);
  process.exit(2);
};

const id = opt('pairing', null);
const p = pairings.find((x) => x.id === id);
if (!id || !p) usage();
const dry = flag('dry-run');
const outArg = opt('out', null);
if (!dry && !outArg) usage();
const out = outArg ? resolve(outArg) : null;
const subsets = opt('subsets', 'latin').split(',').map((s) => s.trim()).filter(Boolean);
const href = opt('href', '');
const ENDPOINT = process.env.LT_GOOGLE_FONTS ?? 'https://fonts.googleapis.com/css2';
// Font files may come only from Google's font host, or from the stand-in's own origin in tests.
const allowedHosts = new Set(['fonts.gstatic.com', new URL(ENDPOINT).host]);
// The CSS2 API picks the format from the User-Agent; a current browser's gets WOFF2.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Exactly what the pairing's webfont link asks for; --mono adds a mono face the link leaves out (at 400).
const specs = parseWebfont(p.webfont);
if (flag('mono')) {
  const m = p.fonts?.find((f) => f.roles.includes('mono'));
  if (m && !specs.some((s) => s.family === m.family)) specs.push(m.axes?.wght ? { family: m.family, axes: { wght: [400, 400] } } : { family: m.family, weights: [400] });
}
const url = css2Url(ENDPOINT, specs);
if (dry) {
  console.log(`Would request ${url}\nSubsets: ${subsets.join(', ')}. Nothing downloaded.`);
  process.exit(0);
}

async function get(u, as) {
  const res = await fetch(u, { headers: { 'user-agent': UA, accept: as === 'css' ? 'text/css,*/*;q=0.1' : '*/*' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${u}`);
  return as === 'css' ? res.text() : Buffer.from(await res.arrayBuffer());
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const css = await get(url, 'css');
const faces = mergeFaces(parseCss(css).filter((f) => subsets.includes(f.subset) || f.subset === 'all'));
if (!faces.length) { console.error(`No ${subsets.join('/')} faces in the response from ${new URL(url).origin}.`); process.exit(1); }
if (faces.some((f) => f.format !== 'woff2')) { console.error('The font service did not offer WOFF2 for every face; nothing written.'); process.exit(1); }

mkdirSync(out, { recursive: true });
const manifest = { pairing: p.id, name: p.name, source: url, licence: 'SIL Open Font License 1.1 (https://openfontlicense.org)', files: [] };
let rules = `/* ${p.name} (${p.id}), self-hosted: generated by lumina-taste scripts/fonts.mjs. Fonts: SIL Open Font License 1.1. */\n`;
const byFamily = new Map();
for (const f of faces) {
  const u = new URL(f.url);
  if (!allowedHosts.has(u.host)) throw new Error(`Refusing a font from ${u.host}: only fonts.gstatic.com is expected.`);
  const buf = await get(u.href, 'bin');
  if (buf.subarray(0, 4).toString('latin1') !== 'wOF2') throw new Error(`${u.href} is not a WOFF2 file`);
  const file = `${slug(f.family)}-${f.style}-${f.weight.replace(/\s+/g, '-')}${f.stretch && f.stretch !== '100%' ? `-w${parseFloat(f.stretch)}` : ''}-${f.subset}.woff2`;
  writeFileSync(join(out, file), buf);
  manifest.files.push({ file, family: f.family, style: f.style, weight: f.weight, stretch: f.stretch, subset: f.subset, bytes: buf.length });
  rules += `@font-face {\n  font-family: "${f.family}";\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n${f.stretch ? `  font-stretch: ${f.stretch};\n` : ''}  font-display: swap;\n  src: url("${href}${file}") format("woff2");\n${f.unicodeRange ? `  unicode-range: ${f.unicodeRange};\n` : ''}}\n`;
  if (!byFamily.has(f.family)) byFamily.set(f.family, []);
  byFamily.get(f.family).push({ ...f, file, buf });
}

// The upright file that covers weight w (a variable file's range, or the nearest static cut), latin first.
const span = (w) => { const [lo, hi = lo] = String(w).split(/\s+/).map(Number); return [lo, hi]; };
const distance = (f, w) => { const [lo, hi] = span(f.weight); return w < lo ? lo - w : w > hi ? w - hi : 0; };
const fileFor = (list, w) => [...list].sort((a, b) => (a.style === 'normal' ? 0 : 1) - (b.style === 'normal' ? 0 : 1) || (a.subset === 'latin' ? 0 : 1) - (b.subset === 'latin' ? 0 : 1) || distance(a, w) - distance(b, w))[0];

// Metric-matched fallbacks: each face measured at the weight and optical size the pairing sets the family at
// (a variable file is read at that instance; Google's files keep the whole axis, with an extreme default).
let fallbacks = '';
const measured = new Map();
for (const [family, list] of byFamily) {
  try {
    const at = faceTargets(p, family);
    const measure = (t) => { const f = fileFor(list, t.wght); return { file: f.file, ...fontMetrics(f.buf, t) }; };
    const m = { regular: measure(at.regular), bold: measure(at.bold) };
    if (at.phone) m.phone = { regular: measure(at.phone.regular), bold: measure(at.phone.bold) };
    const kind = p.fonts?.find((x) => x.family === family)?.fallback ?? 'sans';
    const fb = fallbackFaces(family, m, kind);
    fallbacks += fb.css;
    const entry = manifest.files.find((x) => x.file === m.regular.file);
    const strip = ({ wght, opsz }, avgWidth) => ({ wght, opsz, avgWidth });
    measured.set(family, { unitsPerEm: m.regular.unitsPerEm, ascent: m.regular.ascent, descent: m.regular.descent, lineGap: m.regular.lineGap, regular: strip(at.regular, m.regular.avgWidth), bold: strip(at.bold, m.bold.avgWidth), ...(m.phone ? { phone: { regular: strip(at.phone.regular, m.phone.regular.avgWidth), bold: strip(at.phone.bold, m.phone.bold.avgWidth) } } : {}) });
    entry.metrics = { unitsPerEm: m.regular.unitsPerEm, ascent: m.regular.ascent, descent: m.regular.descent, lineGap: m.regular.lineGap, regular: { ...at.regular, avgWidth: m.regular.avgWidth }, bold: { ...at.bold, avgWidth: m.bold.avgWidth }, sizeAdjust: fb.sizeAdjust, sizeAdjustBold: fb.sizeAdjustBold, fallback: kind };
  } catch (e) {
    console.warn(`  ${family}: could not measure metrics (${e.message}); no fallback face written.`);
  }
}
rules += `\n/* Metric-matched fallbacks: local faces scaled to each web font, named in the kit's font stacks. */\n${fallbacks}`;
writeFileSync(join(out, 'fonts.css'), rules);
if (flag('record')) {
  const srcPath = join(root, 'tokens/typography/source.json');
  const src = JSON.parse(readFileSync(srcPath, 'utf8'));
  for (const f of src.pairings.find((x) => x.id === p.id).fonts ?? []) if (measured.has(f.family)) f.metrics = measured.get(f.family);
  writeFileSync(srcPath, formatJson(src));
  console.log(`Recorded the metrics of ${[...measured.keys()].join(', ')} in tokens/typography/source.json; run npm run tokens.`);
}

// Preload the latin files for the headline and body faces at the weights the pairing sets them in (Barlow
// Condensed's 600 cut for a 600 headline, not its 500), at most two requests ahead of the CSS.
const roleFamily = (role) => p.fonts?.find((f) => f.roles.includes(role))?.family;
const firstSubset = subsets.includes('latin') ? 'latin' : subsets[0];
const pre = [...new Set([[roleFamily('display'), p.displayWeight], [roleFamily('body'), p.bodyWeight]].filter(([fam]) => fam).map(([fam, w]) => fileFor(manifest.files.filter((x) => x.family === fam && x.subset === firstSubset), w)))]
  .filter(Boolean);
const preload = `<!-- ${p.name}: self-hosted fonts. Put these in <head>, before the kit's stylesheets. -->\n${pre.map((x) => `<link rel="preload" href="${href}${x.file}" as="font" type="font/woff2" crossorigin>`).join('\n')}\n<link rel="stylesheet" href="${href}fonts.css">\n`;
writeFileSync(join(out, 'preload.html'), preload);
writeFileSync(join(out, 'fonts.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`Self-hosted ${p.name} (${p.id}) into ${out}`);
for (const x of manifest.files) console.log(`  ${x.file.padEnd(52)} ${kb(x.bytes)}`);
console.log(`  total ${kb(manifest.files.reduce((a, x) => a + x.bytes, 0))} in ${manifest.files.length} files; fonts.css, preload.html, fonts.json`);
console.log(`Next: paste preload.html into <head> and drop any fonts.googleapis.com link. The page keeps data-type="${p.id}".`);
console.log('Licence: SIL Open Font License 1.1. Keep fonts.json next to the files.');
