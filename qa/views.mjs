// Dev helper: screenshot every gallery view at 1440×900 (viewport, not full page) into qa/artifacts/views.
// Usage: node qa/views.mjs [baseUrl] [route…]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [, , base = 'http://127.0.0.1:4399/', ...routes] = process.argv;
const list = routes.length ? routes : ['#/', '#/ui/accordion', '#/ui/command-palette', '#/charts', '#/charts/multi-line-chart', '#/styles', '#/styles/neobrutal', '#/pages', '#/palettes'];
mkdirSync('qa/artifacts/views', { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const r of list) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errors.push(`${r}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${r}: ${m.text()}`));
  await page.goto(base + r);
  await page.waitForTimeout(1400);
  if (process.env.SCROLL) await page.evaluate((y) => scrollTo(0, +y), process.env.SCROLL);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `qa/artifacts/views/${r.replace(/[^a-z0-9]+/gi, '_') || 'home'}.png` });
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : `ok (${list.length} views)`);
