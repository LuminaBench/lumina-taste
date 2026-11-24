// Dev helper: screenshots of the pass-8 additions into qa/artifacts/pass8 (gitignored).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] ?? 'http://127.0.0.1:4399/';
const out = 'qa/artifacts/pass8';
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const errs = [];
async function shot(name, url, sel, { w = 1440, h = 900, mode = 'light', palette } = {}) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
  await p.addInitScript((t) => { try { localStorage.setItem('lt-gallery', JSON.stringify(t)); } catch {} }, { mode, palette: palette ?? 'slate-forest' });
  await p.goto(base + url);
  await p.waitForTimeout(700);
  const loc = sel ? p.locator(sel).first() : null;
  if (loc) { await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await loc.screenshot({ path: `${out}/${name}.png` }); }
  else await p.screenshot({ path: `${out}/${name}.png` });
  await p.close();
}
await shot('charts-treemap', '#/charts', '[data-chart="treemap"]');
await shot('charts-gantt', '#/charts', '[data-chart="gantt-chart"]', { mode: 'dark', palette: 'charcoal-sky' });
await shot('charts-waffle', '#/charts', '[data-chart="waffle-chart"]');
await shot('charts-radial', '#/charts', '[data-chart="radial-bar-chart"]', { mode: 'dark', palette: 'carbon-amber' });
for (const id of ['settings-list', 'api-key-field', 'usage-meters', 'plan-card', 'team-members', 'danger-zone']) await shot('ui-' + id, '#/ui/' + id, '[data-stage]');
for (const s of ['ledger', 'volt', 'civic']) await shot('style-' + s, '#/styles/' + s, null);
await b.close();
console.log(errs.length ? errs.join('\n') : 'no page errors');
