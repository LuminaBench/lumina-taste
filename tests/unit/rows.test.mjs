// Boxes side by side end level; the hosted gallery is a showroom where nothing downloads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RAGGED_ROWS, judgeRaggedRows } from '../../scripts/lib/critic.mjs';
import { loadChromium } from '../../scripts/lib/browser.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const card = (h, extra = '') => `<article style="height:${h}px;background:#eee;border:1px solid #ccc;border-radius:12px${extra}"></article>`;
const page = (body) => `<!doctype html><body style="margin:40px;background:#fff">${body}</body>`;

test('a row of cards that starts level must end level; stretched rows and bento columns pass', { timeout: 60000 }, async (t) => {
  const chromium = await loadChromium(import.meta.url);
  if (!chromium) return t.skip('no browser');
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
    const rows = async (html) => { await p.setContent(page(html)); return p.evaluate(RAGGED_ROWS); };
    const ragged = await rows(`<section style="display:grid;grid-template-columns:2fr 1fr;gap:16px;align-items:start">${card(400)}${card(380)}</section>`);
    assert.equal(ragged.length, 1);
    assert.equal(judgeRaggedRows(ragged)[0].rule, 'taste-ragged-row');
    assert.deepEqual(await rows(`<section style="display:grid;grid-template-columns:2fr 1fr;gap:16px">${card(400)}<article style="background:#eee;border:1px solid #ccc"><p>short</p></article></section>`), [], 'a stretched row is level');
    // Bento: one tall tile beside two stacked ones.
    assert.deepEqual(await rows(`<section style="display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:200px;gap:16px">${card(200)}<article style="grid-row:span 2;background:#eee;border:1px solid #ccc"></article>${card(200)}</section>`), []);
    // A staggered set says so and is left alone.
    assert.deepEqual(await rows(`<section data-variant="stagger" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">${card(400)}${card(300)}</section>`), []);
  } finally { await b.close(); }
});

test('the hosted gallery is a showroom: every page carries it, and a download only says so', { timeout: 60000 }, async (t) => {
  const dist = join(root, 'preview/dist');
  if (!existsSync(join(dist, 'index.html'))) return t.skip('gallery not built');
  const pages = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? (d.name.startsWith('_') ? [] : pages(join(dir, d.name))) : d.name.endsWith('.html') ? [join(dir, d.name)] : []));
  const missing = pages(dist).filter((f) => !readFileSync(f, 'utf8').includes('showroom.js'));
  assert.deepEqual(missing, []);
  assert.ok(!readFileSync(join(dist, '_react/index.html'), 'utf8').includes('showroom.js'), 'the React harness keeps downloads for the tests');
  const chromium = await loadChromium(import.meta.url);
  if (!chromium) return t.skip('no browser');
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ acceptDownloads: true });
    await p.goto(pathToFileURL(join(dist, 'blueprints/dashboard/index.html')).href);
    let downloaded = false;
    p.on('download', () => { downloaded = true; });
    await p.evaluate(() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['x'])); a.download = 'chart.svg'; a.click(); });
    await p.waitForTimeout(400);
    assert.equal(downloaded, false);
    assert.match(await p.locator('[role="status"]').last().textContent(), /showroom/);
  } finally { await b.close(); }
});

test('the showroom export has no test folders and nothing that points at the site root', { timeout: 120000 }, (t) => {
  if (!existsSync(join(root, 'preview/dist/index.html'))) return t.skip('gallery not built');
  const out = join(root, '.tmp', 'showroom-test');
  const r = spawnSync(process.execPath, [join(root, 'scripts/export-showroom.mjs'), '--no-build', '--no-check', '--out', out], { encoding: 'utf8' });
  try {
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.ok(readdirSync(out).every((e) => !e.startsWith('_')), 'no _react, _hc or _mt');
    assert.ok(existsSync(join(out, 'showroom.js')) && existsSync(join(out, 'index.html')));
  } finally { rmSync(out, { recursive: true, force: true }); }
});
