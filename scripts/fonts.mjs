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
// This makes network requests, so it runs only when a person runs it: nothing in the kit calls it.
// LT_GOOGLE_FONTS overrides the CSS2 endpoint (tests point it at a local stand-in).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fallbackFaces, fontMetrics } from './lib/font-metrics.mjs';
import { css2Url, parseWebfont } from './lib/webfont.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : args[i + 1]; };
const flag = (name) => args.includes(`--${name}`);
const pairings = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings;
const usage = () => {
  console.error(`Usage: node scripts/fonts.mjs --pairing <id> --out <dir> [--subsets latin,latin-ext] [--href <url prefix>] [--mono] [--dry-run]\nPairings: ${pairings.map((p) => p.id).join(', ')}`);
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

/** The @font-face blocks of a CSS2 response, each with the subset named in the comment before it. */
function parseCss(css) {
  const faces = [];
  for (const m of css.matchAll(/(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*{([^}]*)}/g)) {
    const body = m[2];
    const prop = (k) => body.match(new RegExp(`${k}\\s*:\\s*([^;]+);`))?.[1].trim();
    const src = body.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)\s*format\(\s*['"]?([\w-]+)['"]?\s*\)/);
    if (!src) continue;
    faces.push({
      subset: m[1] ?? 'all', family: prop('font-family')?.replace(/['"]/g, ''), style: prop('font-style') ?? 'normal',
      weight: prop('font-weight') ?? '400', stretch: prop('font-stretch') ?? null, unicodeRange: prop('unicode-range') ?? null,
      url: src[1], format: src[2],
    });
  }
  return faces;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const css = await get(url, 'css');
const faces = parseCss(css).filter((f) => subsets.includes(f.subset) || f.subset === 'all');
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

// Metric-matched fallbacks, measured from the regular-most upright file of each family.
let fallbacks = '';
const near400 = (w) => Math.abs(parseFloat(w) - 400);
for (const [family, list] of byFamily) {
  const pick = [...list].sort((a, b) => (a.style === 'normal' ? 0 : 1) - (b.style === 'normal' ? 0 : 1) || (a.subset === 'latin' ? 0 : 1) - (b.subset === 'latin' ? 0 : 1) || near400(a.weight) - near400(b.weight))[0];
  try {
    const m = fontMetrics(pick.buf);
    const kind = p.fonts?.find((x) => x.family === family)?.fallback ?? 'sans';
    const fb = fallbackFaces(family, m, kind);
    fallbacks += fb.css;
    manifest.files.find((x) => x.file === pick.file).metrics = { ...m, sizeAdjust: fb.sizeAdjust, fallback: kind };
  } catch (e) {
    console.warn(`  ${family}: could not measure metrics (${e.message}); no fallback face written.`);
  }
}
rules += `\n/* Metric-matched fallbacks: local faces scaled to each web font, named in the kit's font stacks. */\n${fallbacks}`;
writeFileSync(join(out, 'fonts.css'), rules);

// Preload the latin files for the headline and body faces (at most two requests ahead of the CSS).
const roleFamily = (role) => p.fonts?.find((f) => f.roles.includes(role))?.family;
const pre = [...new Set([roleFamily('display'), roleFamily('body')].filter(Boolean))]
  .map((fam) => manifest.files.filter((x) => x.family === fam && x.style === 'normal' && x.subset === (subsets.includes('latin') ? 'latin' : subsets[0])).sort((a, b) => near400(a.weight) - near400(b.weight))[0])
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
