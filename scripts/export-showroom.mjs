#!/usr/bin/env node
// The showroom: the gallery as a self-contained static site, published at luminabench.github.io/lumina-taste/ by
// .github/workflows/pages.yml, and ready to drop into a folder of any other site. Every path in it is relative, so it works under any base path; the
// routes are hash routes, so the host needs no rewrite rules. Nothing downloads and the demos' own links lead
// nowhere (preview/showroom.js). Test-only folders (_react, _hc, _mt) are left out.
//
//   node scripts/export-showroom.mjs                                  # → ./showroom/, checked under /lumina-taste/
//   node scripts/export-showroom.mjs --out ../site/skills/lumina-taste --base /skills/lumina-taste/
//   node scripts/export-showroom.mjs --no-build --no-check
//
// The check serves the export under the base path, opens every route, page and first screen in Chromium and fails
// on any request that 404s or any script error. It needs Playwright; without it the export is written unchecked.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i < 0 ? d : args[i + 1]; };
const out = resolve(opt('out', join(root, 'showroom')));
const base = `/${opt('base', '/lumina-taste/').replace(/^\/+|\/+$/g, '')}/`;
const dist = join(root, 'preview/dist');

if (!args.includes('--no-build')) {
  const b = spawnSync(process.execPath, [join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  if (b.status !== 0) { console.error(b.stderr || b.stdout); process.exit(1); }
}
if (!existsSync(join(dist, 'index.html'))) { console.error('No gallery build: run without --no-build.'); process.exit(1); }

// Copy, leaving out the test harness and test-only pages (every folder whose name starts with "_").
if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const e of readdirSync(dist)) if (!e.startsWith('_')) cpSync(join(dist, e), join(out, e), { recursive: true });

// Nothing in it may point at the site root: that would leave the showroom's folder.
const files = (d) => readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? files(join(d, x.name)) : [join(d, x.name)]));
const all = files(out);
const html = all.filter((f) => f.endsWith('.html'));
const rootRefs = html.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<(?:script|link|img|source|iframe)\b[^>]*\b(?:src|href)="(\/(?!\/)[^"]*)"/g)].map((m) => `${relative(out, f)}: ${m[1]}`));
const missingShowroom = html.filter((f) => !readFileSync(f, 'utf8').includes('showroom.js')).map((f) => relative(out, f));
const bytes = all.reduce((n, f) => n + statSync(f).size, 0);
// GitHub Pages: serve every file as it is (no Jekyll, which would hide folders starting with an underscore).
writeFileSync(join(out, '.nojekyll'), '');
writeFileSync(join(out, 'SHOWROOM.txt'), `Lumina Taste showroom: the kit's gallery as a static site.\nUpload the contents of this folder to ${base} (or any folder: every path is relative).\nBuilt from lumina-taste with: node scripts/export-showroom.mjs\n`);

let checked = null;
if (!args.includes('--no-check')) {
  const { loadChromium } = await import(pathToFileURL(join(root, 'scripts/lib/browser.mjs')).href);
  const chromium = await loadChromium(pathToFileURL(join(root, 'package.json')).href);
  if (chromium) checked = await check(chromium);
}
console.log(`Showroom: ${out}\n  ${html.length} pages, ${all.length} files, ${(bytes / 1048576).toFixed(1)} MB, for ${base}`);
if (rootRefs.length) console.log(`  ✗ ${rootRefs.length} asset path(s) start at the site root: ${rootRefs.slice(0, 5).join('; ')}`);
if (missingShowroom.length) console.log(`  ✗ ${missingShowroom.length} page(s) without showroom mode: ${missingShowroom.slice(0, 5).join(', ')}`);
if (checked) {
  console.log(`  ${checked.failures.length ? '✗' : '✓'} opened ${checked.visits} routes and pages under ${base}: ${checked.failures.length ? `${checked.failures.length} problem(s)` : 'no missing files, no script errors'}`);
  for (const f of checked.failures.slice(0, 12)) console.log(`    ${f}`);
} else if (!args.includes('--no-check')) console.log('  (not opened in a browser: Playwright is not installed)');
process.exit(rootRefs.length || missingShowroom.length || checked?.failures.length ? 1 : 0);

async function check(chromium) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  const server = createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (!url.startsWith(base)) { res.writeHead(404); return res.end(); }
    let f = join(out, url.slice(base.length));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' });
    res.end(readFileSync(f));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const failures = [];
  let visits = 0;
  const pages = [
    ...['', '#/charts', '#/styles', '#/pages', '#/first-screens', '#/palettes', '#/compare', '#/moments', '#/before-after', '#/ui/copy-button', '#/charts/bar'].map((h) => `${base}${h}`),
    ...html.filter((f) => !/[\\/]src[\\/]/.test(f) && relative(out, f) !== 'index.html').map((f) => base + relative(out, f).split('\\').join('/').replace(/index\.html$/, '')),
  ];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(origin)) failures.push(`${r.status()} ${r.url().slice(origin.length)}`); });
    page.on('requestfailed', (r) => { if (r.url().startsWith(origin)) failures.push(`failed ${r.url().slice(origin.length)}`); });
    page.on('pageerror', (e) => failures.push(`script error on ${page.url().slice(origin.length)}: ${e.message.slice(0, 120)}`));
    for (const p of pages) {
      await page.goto(origin + p, { waitUntil: 'load' }).catch((e) => failures.push(`could not open ${p}: ${e.message.slice(0, 80)}`));
      await page.waitForTimeout(p.includes('#') || p === base ? 900 : 150);
      visits++;
    }
  } finally { await browser.close(); server.close(); }
  return { visits, failures: [...new Set(failures)] };
}
