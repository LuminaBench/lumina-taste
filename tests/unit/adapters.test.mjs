// Token export for shadcn / Tailwind, the sniff round trip, brand from a colour, logo or site, and the
// Tailwind v4 and Next.js App Router installs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const node = (args) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });

test('export-tokens writes shadcn, tailwind4, tailwind3 and json', () => {
  const sh = node([join(root, 'scripts/export-tokens.mjs'), '--format', 'shadcn', '--palette', 'navy-sand']).stdout;
  for (const v of ['--background:', '--primary:', '--ring:', '--chart-5:', '--radius:', '.dark {']) assert.ok(sh.includes(v), v);
  assert.match(sh, /--primary: oklch\(/);
  const t4 = node([join(root, 'scripts/export-tokens.mjs'), '--format', 'tailwind4', '--palette', 'slate-forest']).stdout;
  assert.match(t4, /@theme \{[\s\S]*--color-accent: oklch/);
  const t3 = node([join(root, 'scripts/export-tokens.mjs'), '--format', 'tailwind3']).stdout;
  assert.match(t3, /module\.exports = \{/);
  const js = JSON.parse(node([join(root, 'scripts/export-tokens.mjs'), '--format', 'json', '--palette', 'paper-ink']).stdout);
  assert.equal(js.palette, 'paper-ink');
  assert.ok(js.dark['accent-solid'].startsWith('oklch('));
  assert.equal(node([join(root, 'scripts/export-tokens.mjs'), '--palette', 'nope']).status, 2);
});

test('sniff recovers the profile a blueprint was built with, and reads the brand colours a site declares', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-sniff-'));
  try {
    // A blueprint written to disk, read back from file:// (no server, so no port to collide on).
    const inst = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'static', '--blueprints', 'store', '--palette', 'cream-charcoal', '--type', 'didone']);
    assert.equal(inst.status, 0, inst.stderr);
    const r = node([join(root, 'scripts/sniff.mjs'), join(dir, 'index.html'), '--json']);
    assert.equal(r.status, 0, r.stderr);
    const p = JSON.parse(r.stdout).profile;
    assert.equal(p.palette, 'cream-charcoal');
    assert.equal(p.typography, 'didone');
    assert.equal(p.mode, 'light');
    writeFileSync(join(dir, 'site.html'), '<!doctype html><html><head><style>:root{--brand-primary:#c2410c;--text:#222;--bg:#fffaf5}body{background:var(--bg);color:var(--text);font-family:Georgia,serif}</style></head><body><h1>Kiln</h1><p>Stoneware.</p><a href="#">Shop</a></body></html>');
    const site = JSON.parse(node([join(root, 'scripts/sniff.mjs'), join(dir, 'site.html'), '--json']).stdout);
    assert.deepEqual(site.brandColours.map((b) => b.name), ['--brand-primary']);
    assert.ok(site.variables.some((v) => v.name === '--bg'));
    assert.deepEqual(site.fonts, ['Georgia']);
    assert.match(site.measured.accent, /oklch\(0\.55\d 0\.17\d 3[89]/, 'the declared brand colour is the accent');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('brand from a colour: the nearest palette, or the brand accent solved for contrast in each mode', async () => {
  const { fitPalette, solveAccent, checkOverrides, toLch, suggestType, toneNote, dominantColours, brandSourceKind } = await import(join(root, 'engine/compose/brand.mjs'));
  const palettes = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes;
  assert.deepEqual(['#e63312', 'logo.svg', './old/index.html', 'https://example.org', 'oklch(0.5 0.1 30)', 'nope'].map(brandSourceKind), ['colour', 'logo', 'site', 'site', 'colour', null]);
  for (const hex of ['#e63312', '#1d3a6e', '#0b7a5a', '#f5c400', '#7a3fb5', '#0f8a6c']) {
    const fit = fitPalette({ accent: toLch(hex) }, palettes);
    assert.ok(palettes.some((p) => p.id === fit.palette), hex);
    // Whatever is offered passes every contrast rule it takes part in.
    const pal = palettes.find((p) => p.id === fit.palette);
    if (fit.overrides) for (const m of ['light', 'dark']) assert.deepEqual(checkOverrides(pal.modes[m].tokens, fit.overrides), [], `${hex} ${m}`);
    if (fit.perMode) for (const m of ['light', 'dark']) if (fit.perMode[m]) assert.deepEqual(checkOverrides(pal.modes[m].tokens, fit.perMode[m]), [], `${hex} ${m} own shade`);
    assert.ok(suggestType({ accent: toLch(hex) }).reason.length > 20);
    assert.ok(toneNote(toLch(hex)).length > 20);
  }
  // The solver is the shipped palettes' own: given a palette's accent seed it lands on (nearly) the same solid.
  const slate = palettes.find((p) => p.id === 'slate-forest');
  const solid = slate.modes.light.tokens['accent-solid'].oklch.match(/[\d.]+/g).map(Number);
  const again = solveAccent(solid, slate.modes.light.tokens)['accent-solid'].match(/[\d.]+/g).map(Number);
  assert.ok(Math.abs(again[0] - solid[0]) < 0.02, `${again} vs ${solid}`);
  // k-means in OKLab: a red mark and a green block on white, with black text, give red and green, biggest first.
  const px = [...Array(500).fill([217, 72, 28, 255]), ...Array(300).fill([27, 77, 62, 255]), ...Array(900).fill([255, 255, 255, 255]), ...Array(80).fill([17, 17, 17, 255]), ...Array(50).fill([0, 0, 0, 0])];
  const cols = dominantColours(px);
  assert.equal(cols.length, 2);
  assert.ok(cols[0].lch[2] > 25 && cols[0].lch[2] < 45 && cols[1].lch[2] > 150 && cols[1].lch[2] < 190, JSON.stringify(cols));
});

test('compose --brand-from reads a logo in headless Chromium and a saved site with sniff, and carries the result into the plan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-brand-'));
  try {
    writeFileSync(join(dir, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#fff"/><circle cx="50" cy="60" r="40" fill="#d9481c"/><rect x="100" y="30" width="80" height="60" fill="#1b4d3e"/></svg>');
    const logo = JSON.parse(node([join(root, 'scripts/compose.mjs'), 'Home page for Kiln & Co, a pottery in Penryn', '--brand-from', join(dir, 'logo.svg'), '--json']).stdout).brand;
    assert.equal(logo.kind, 'logo');
    assert.ok(logo.colours.length >= 2 && logo.colours[0].lch[2] > 25 && logo.colours[0].lch[2] < 45, JSON.stringify(logo.colours));
    assert.ok(logo.palette && logo.type.typography && logo.tone && logo.note);
    writeFileSync(join(dir, 'site.html'), '<!doctype html><html><head><style>:root{--color-primary:#1d6fb8}body{background:#fff;color:#111;font-family:Georgia,serif}</style></head><body><h1>Harrow</h1><p>Law.</p></body></html>');
    const site = node([join(root, 'scripts/compose.mjs'), 'Website for Harrow & Finch, a law firm', '--brand-from', join(dir, 'site.html')]);
    assert.equal(site.status, 0, site.stderr);
    assert.match(site.stdout, /\*\*Brand from the site/);
    assert.match(site.stdout, /because the site already sets Georgia/);
    // A colour no palette holds is solved for each mode, and a draft carries it in a style block that passes the audit.
    const r = node([join(root, 'scripts/compose.mjs'), 'Landing page for Tally, an invoicing tool that sends an invoice in 30 seconds, £9 a month', '--brand-from', '#0f8a6c', '--project', join(dir, 'p'), '--write']);
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(join(dir, 'p', 'index.html'), 'utf8');
    assert.match(html, /<style>\/\* The brand's accent from --brand-from/);
    const a = node([join(root, 'scripts/audit-ui.mjs'), join(dir, 'p', 'index.html'), '--viewports', 'desktop']);
    assert.match(a.stdout, / 0 errors/, a.stdout);
    assert.equal(node([join(root, 'scripts/compose.mjs'), 'x', '--brand-from', 'nonsense']).status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('install --framework tailwind writes a v4 entry stylesheet whose theme follows the kit in both modes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-tw-'));
  try {
    const r = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'tailwind', '--palette', 'navy-sand', '--components', 'hero-split,faq-section']);
    assert.equal(r.status, 0, r.stderr);
    const css = readFileSync(join(dir, 'lumina-taste', 'tailwind.css'), 'utf8');
    assert.match(css, /^@import "tailwindcss";$/m);
    assert.match(css, /^@import "\.\/lumina\.css";$/m);
    assert.match(css, /@theme inline \{[\s\S]*--color-canvas: var\(--bg-canvas\);[\s\S]*--color-accent: var\(--accent-solid\);[\s\S]*--font-display: var\(--font-display\);[\s\S]*--radius-md: var\(--radius-md\);/);
    assert.match(css, /@custom-variant dark \(&:where\(\[data-mode="dark"\]/);
    assert.ok(!/oklch\(/.test(css), 'no colour is baked in: utilities follow data-mode');
    for (const f of ['lumina.css', 'lumina.js', 'snippets/hero-split.html']) assert.ok(existsSync(join(dir, 'lumina-taste', f)), f);
    assert.match(r.stdout, /tailwind\.css as your Tailwind v4 entry stylesheet/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('install --framework next writes an App Router layout with a no-flash theme script, global CSS and a page from the blueprint', async () => {
  const { htmlToJsx } = await import(join(root, 'engine/compose/jsx.mjs'));
  assert.equal(htmlToJsx('<section class="a" data-entrance style="--art: red; font-size: 2px"><svg stroke-width="1.5"><path d="M0"/></svg><img src="x.png" alt=""><label for="q">{x}</label><td colspan="2">y</td><!-- note --></section>'),
    '<section className="a" data-entrance style={{ "--art": "red", fontSize: "2px" } as import(\'react\').CSSProperties}><svg strokeWidth="1.5"><path d="M0" /></svg><img src="x.png" alt="" /><label htmlFor="q">{\'{\'}x{\'}\'}</label><td colSpan={2}>y</td>{/* note */}</section>');
  const dir = mkdtempSync(join(tmpdir(), 'lt-next-'));
  try {
    const r = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'next', '--blueprints', 'practice', '--palette', 'navy-sand', '--mode', 'dark', '--name', 'Harrow & Finch']);
    assert.equal(r.status, 0, r.stderr);
    const layout = readFileSync(join(dir, 'app', 'layout.tsx'), 'utf8');
    assert.match(layout, /import '\.\/globals\.css';/);
    assert.match(layout, /<html lang="en" data-palette="navy-sand" data-mode="dark"[^>]*suppressHydrationWarning>/);
    assert.match(layout, /<script dangerouslySetInnerHTML=\{\{ __html: themeBootstrap \}\} \/>/);
    assert.match(layout, /localStorage\.getItem\(\\"lt-mode\\"\)/);
    const globals = readFileSync(join(dir, 'app', 'globals.css'), 'utf8');
    assert.match(globals, /^@import "\.\.\/lumina-taste\/tokens\/index\.css";/m);
    assert.match(globals, /hero-split\/hero-split\.css";/);
    assert.match(globals, /lumina-taste\/pages\/practice\.css";/);
    for (const m of globals.matchAll(/@import "([^"]+)"/g)) assert.ok(existsSync(join(dir, 'app', m[1])), m[1]);
    const page = readFileSync(join(dir, 'app', 'page.tsx'), 'utf8');
    assert.match(page, /export default function Page\(\) \{/);
    assert.match(page, /<section className="lt-hero-split"/);
    assert.ok(!/\sclass="/.test(page) && !/<script/.test(page), 'JSX attributes, no scripts');
    assert.ok(page.includes('Harrow &amp; Finch') && !page.includes('Kestrel Dental'));
    const enhance = readFileSync(join(dir, 'app', 'lumina-enhance.tsx'), 'utf8');
    assert.match(enhance, /^'use client';/);
    for (const m of enhance.matchAll(/from '([^']+)'/g)) if (m[1].startsWith('.')) assert.ok(['.ts', '.tsx'].some((x) => existsSync(join(dir, 'app', m[1] + x))), m[1]);
    assert.ok(existsSync(join(dir, 'lumina-taste', 'components', 'ui', 'blocks', 'hero-split', 'hero-split.react.tsx')));
    // Your own files are never written over.
    writeFileSync(join(dir, 'app', 'page.tsx'), 'mine');
    node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'next', '--components', 'hero-split']);
    assert.equal(readFileSync(join(dir, 'app', 'page.tsx'), 'utf8'), 'mine');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
