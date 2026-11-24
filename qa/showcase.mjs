// Dev helper: curated showcase screenshots into qa/artifacts/showcase (gitignored).
// Usage: node qa/showcase.mjs [baseUrl]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:4399/';
const out = 'qa/artifacts/showcase';
mkdirSync(out, { recursive: true });
const shots = [
  { name: '01-gallery-ui', url: '#/ui', theme: { palette: 'navy-sand', mode: 'light', type: 'swiss' }, scrollTo: '#fam-controls' },
  { name: '02-gallery-overlays-dark', url: '#/ui', theme: { palette: 'charcoal-sky', mode: 'dark', type: 'precision' }, scrollTo: '#fam-overlays' },
  { name: '03-charts-dark', url: '#/charts', theme: { palette: 'carbon-amber', mode: 'dark', type: 'financial' }, scrollTo: '[data-chart="multi-line-chart"]' },
  { name: '04-charts-light', url: '#/charts', theme: { palette: 'paper-ink', mode: 'light', type: 'editorial' }, scrollTo: '[data-chart="matrix-heatmap"]' },
  { name: '05-palettes', url: '#/palettes', theme: { palette: 'cream-charcoal', mode: 'light', type: 'humanist' } },
  { name: '06-blueprint-dashboard', url: 'blueprints/dashboard/', direct: true, theme: { palette: 'slate-forest', mode: 'dark', type: 'precision' } },
  { name: '07-blueprint-landing', url: 'blueprints/landing/', direct: true, theme: { palette: 'black-signal', mode: 'light', type: 'swiss' } },
  { name: '08-blueprint-pricing', url: 'blueprints/pricing/', direct: true, theme: { palette: 'ice-cobalt', mode: 'light', type: 'geometric' } },
  { name: '09-blueprint-docs', url: 'blueprints/docs/', direct: true, theme: { palette: 'terminal-phosphor', mode: 'dark', type: 'precision' } },
  { name: '10-mobile-auth', url: 'blueprints/auth/', direct: true, mobile: true, theme: { palette: 'sage-clay', mode: 'light', type: 'humanist' } },
];
const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage(s.mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(base + (s.url.startsWith('#') ? s.url : s.url));
  await page.evaluate((t) => { const h = document.documentElement; for (const [k, v] of Object.entries(t)) h.dataset[k] = v; try { localStorage.setItem('lt-gallery', JSON.stringify({ ...JSON.parse(localStorage.getItem('lt-gallery') ?? '{}'), ...t })); } catch {} }, s.theme);
  if (!s.direct) {
    await page.selectOption('#g-palette', s.theme.palette).catch(() => {});
    await page.selectOption('#g-type', s.theme.type).catch(() => {});
  }
  await page.waitForTimeout(500);
  if (s.scrollTo) await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - 140); }, s.scrollTo);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${s.name}.png` });
  await page.close();
}
await browser.close();
console.log(`wrote ${shots.length} screenshots to ${out}`);
