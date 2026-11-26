#!/usr/bin/env node
// Read an existing site's look and turn it into a lumina-taste profile, so new work matches it.
//
//   node scripts/sniff.mjs http://localhost:3000/
//   node scripts/sniff.mjs ./dist/index.html --json
//
// Measures the canvas, text and accent colours, heading and body fonts, corner radii and control
// heights, and the colours it declares as custom properties (a --brand or --color-primary is taken as the
// accent before any measured one), then picks the nearest palette (OKLab distance, accent weighted most), type pairing,
// radius and density, and prints the install command. When the site's accent is far from the
// nearest palette's, it adds a contrast-checked --override so the brand colour survives.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const target = args.find((a) => !a.startsWith('--'));
if (!target) { console.error('Usage: node scripts/sniff.mjs <url-or-file> [--json]'); process.exit(2); }
const url = /^(https?|file):/.test(target) ? target : pathToFileURL(resolve(target)).href;

let chromium;
for (const base of [import.meta.url, pathToFileURL(join(process.cwd(), 'package.json')).href]) {
  for (const name of ['@playwright/test', 'playwright']) {
    try { const mod = await import(pathToFileURL(createRequire(base).resolve(name)).href); chromium = mod.chromium ?? mod.default?.chromium; if (chromium) break; } catch { /* next */ }
  }
  if (chromium) break;
}
if (!chromium) { console.error('sniff needs Playwright: npm i -D @playwright/test && npx playwright install chromium'); process.exit(2); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(400);
const seen = await page.evaluate(() => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  // Canvas: the first opaque background from body up to html.
  let canvas = [255, 255, 255, 1];
  for (const el of [document.body, document.documentElement]) { const c = rgb(getComputedStyle(el).backgroundColor); if (c[3] > 0.5) { canvas = c; break; } }
  // Text: the colour used by the most body text.
  const tally = new Map();
  for (const el of document.querySelectorAll('p, li, td, span, a, h1, h2, h3')) { if (!vis(el)) continue; const n = (el.textContent ?? '').trim().length; if (!n) continue; const c = getComputedStyle(el).color; tally.set(c, (tally.get(c) ?? 0) + n); }
  const text = rgb([...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '#111');
  // Accent: the most common saturated fill on buttons and links, else the most common saturated link colour.
  const fills = new Map(), links = new Map();
  const sat = (c) => { const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return mx ? (mx - mn) / mx : 0; };
  for (const el of document.querySelectorAll('button, a, [role="button"], input[type="submit"]')) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const bg = rgb(cs.backgroundColor); if (bg[3] > 0.8 && sat(bg) > 0.25) fills.set(cs.backgroundColor, (fills.get(cs.backgroundColor) ?? 0) + 1);
    const fg = rgb(cs.color); if (sat(fg) > 0.3) links.set(cs.color, (links.get(cs.color) ?? 0) + 1);
  }
  const top = (m) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
  const accent = top(fills) ?? top(links);
  const fam = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).fontFamily : ''; };
  const radii = [...document.querySelectorAll('button, a.btn, [class*="btn"], [class*="button"], input, select, textarea, [class*="card"]')].filter(vis).map((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius)).filter((r) => r >= 0 && r < 40);
  const heights = [...document.querySelectorAll('button, input:not([type="checkbox"]):not([type="radio"]), select, [role="button"]')].filter(vis).map((e) => e.getBoundingClientRect().height).filter((h) => h >= 20 && h <= 72);
  const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  // The site's own colour variables: custom properties on :root / html / body whose values are colours.
  // Names that say "brand", "primary" or "accent" are the brand's colour, said by the site itself.
  const vars = [];
  const rootStyle = getComputedStyle(document.documentElement);
  const names = new Set();
  const walk = (rules) => { for (const r of rules) { try { if (r.cssRules) walk(r.cssRules); if (r.style && /(^|,)\s*(:root|html|body)\b/.test(r.selectorText ?? '')) for (const n of r.style) if (n.startsWith('--')) names.add(n); } catch { /* cross-origin */ } } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* cross-origin sheet */ } }
  for (const n of names) {
    const v = rootStyle.getPropertyValue(n).trim();
    if (!v || v.length > 60) continue;
    const probe = rgb(v); if (probe[3] === 0 && !/transparent/.test(v)) continue;
    // A value the canvas did not accept leaves the fill black: only keep real colours.
    if (!/^(#|rgb|hsl|oklch|oklab|lab|lch|color\(|[a-z]+$)/i.test(v)) continue;
    vars.push({ name: n, value: v, rgb: probe });
  }
  const brandish = vars.filter((x) => /brand|primary|accent|main|key|highlight/i.test(x.name) && !/(foreground|fg|text|ink|contrast|on-)/i.test(x.name) && sat(x.rgb) > 0.2);
  const fonts = [...new Set([...document.querySelectorAll('h1, h2, h3, p, a, button, li')].filter(vis).map((e) => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim()))].slice(0, 6);
  return { canvas, text, accent: accent ? rgb(accent) : null, heading: fam('h1') || fam('h2'), body: fam('p') || fam('body'), radius: med(radii), control: med(heights), vars: vars.map(({ name, value }) => ({ name, value })), brand: brandish.map((x) => ({ name: x.name, value: `rgb(${x.rgb.slice(0, 3).join(', ')})` })), fonts };
});
await browser.close();

// ---------------------------------------------------------------- colour maths (OKLab)
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const toLab = ([r, g, b]) => {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const okl = (str) => { const [L, C, h] = str.match(/[\d.]+/g).map(Number); return [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)]; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const toOklchStr = ([L, a, b]) => { const C = Math.hypot(a, b); const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360; return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`; };

// A colour the site names as its brand (--brand, --color-primary…) is the accent, before any measured one.
const brandRgb = seen.brand[0] ? seen.brand[0].value.match(/[\d.]+/g).map(Number) : null;
const site = { canvas: toLab(seen.canvas), text: toLab(seen.text), accent: brandRgb ? toLab(brandRgb) : seen.accent ? toLab(seen.accent) : null };
const mode = site.canvas[0] < 0.5 ? 'dark' : 'light';
const palettes = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes;
const ranked = palettes.map((p) => {
  const t = p.modes[mode].tokens;
  const d = dist(site.canvas, okl(t['bg-canvas'].oklch)) * 1 + dist(site.text, okl(t['text-primary'].oklch)) * 0.5 + (site.accent ? dist(site.accent, okl(t['accent-solid'].oklch)) * 2.5 : 0);
  return { id: p.id, name: p.name, d, accent: okl(t['accent-solid'].oklch) };
}).sort((a, b) => a.d - b.d);
const best = ranked[0];
const accentGap = site.accent ? dist(site.accent, best.accent) : 0;
const override = site.accent && accentGap > 0.06 ? toOklchStr(site.accent) : null;

// ---------------------------------------------------------------- type, radius, density
const pairings = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings;
const first = (stack) => (stack ?? '').split(',')[0].replace(/["']/g, '').trim().toLowerCase();
const serif = (stack) => /serif/.test(stack ?? '') && !/sans-serif/.test(stack ?? '') || /georgia|times|garamond|playfair|fraunces|charter|merriweather|lora|didot|bodoni|newsreader|source serif/i.test(stack ?? '');
const mono = (stack) => /mono|courier|consolas|menlo/i.test(stack ?? '');
let typography = pairings.find((p) => first(p.display) === first(seen.heading) || first(p.body) === first(seen.body))?.id;
if (!typography) {
  const h = seen.heading ?? '', b = seen.body ?? '';
  typography = mono(b) ? 'technical' : serif(h) && serif(b) ? 'bookish' : serif(h) ? (/didot|bodoni|playfair/i.test(h) ? 'didone' : 'editorial') : /futura|avenir|manrope|poppins|montserrat|circular|dm sans|outfit/i.test(h + b) ? 'geometric' : /helvetica|arial|neue haas|inter tight|swiss/i.test(h + b) ? 'swiss' : /nunito|rounded|quicksand/i.test(h + b) ? 'rounded' : 'precision';
}
const radius = seen.radius == null ? 'balanced' : seen.radius <= 4 ? 'sharp' : seen.radius <= 10 ? 'balanced' : 'soft';
const density = seen.control == null ? 'balanced' : seen.control < 34 ? 'dense' : seen.control > 42 ? 'spacious' : 'balanced';
const install = `node scripts/install-taste.mjs --project /abs/app --attach --palette ${best.id} --mode ${mode} --type ${typography} --radius ${radius} --density ${density}${override ? ` --override accent-solid="${override}"` : ''} --lock palette`;

const result = { url, brandColours: seen.brand, variables: seen.vars.slice(0, 40), fonts: seen.fonts, measured: { canvas: toOklchStr(site.canvas), text: toOklchStr(site.text), accent: site.accent ? toOklchStr(site.accent) : null, heading: seen.heading, body: seen.body, radiusPx: seen.radius, controlPx: seen.control ? Math.round(seen.control) : null }, profile: { palette: best.id, mode, typography, radius, density, overrides: override ? { 'accent-solid': override } : {} }, alternatives: ranked.slice(1, 3).map((r) => r.id), install };
if (asJson) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }
console.log(`Measured ${url}`);
console.log(`  canvas ${result.measured.canvas}, text ${result.measured.text}, accent ${result.measured.accent ?? 'none found'}`);
console.log(`  headings: ${seen.heading || '?'}\n  body: ${seen.body || '?'}`);
console.log(`  corner radius ~${seen.radius ?? '?'}px, controls ~${result.measured.controlPx ?? '?'}px tall`);
if (seen.brand.length) console.log(`  brand colours it declares: ${seen.brand.map((b) => `${b.name} ${b.value}`).join(', ')}`);
if (seen.fonts.length) console.log(`  faces in use: ${seen.fonts.join(', ')}`);
console.log('');
console.log(`Nearest look: ${best.id} (${best.name}), ${mode}; type ${typography}; radius ${radius}; density ${density}.`);
console.log(`Also close: ${result.alternatives.join(', ')}.`);
if (override) console.log(`The site's accent is its own, so it is kept as an override (contrast-checked on install).`);
console.log(`\n${install}\n\n--attach scopes the tokens to a wrapper so the existing styles stay untouched; drop it for a full restyle.`);
