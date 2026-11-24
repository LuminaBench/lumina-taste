// Dev helper: full-page screenshots of the element grid, cut into 1440×1700 tiles in qa/artifacts/grid.
// Usage: node qa/grid.mjs [baseUrl] [route] [mode]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [, , base = 'http://127.0.0.1:4399/', route = '#/ui', mode = ''] = process.argv;
mkdirSync('qa/artifacts/grid', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(base + route);
if (mode) await page.evaluate((m) => (document.documentElement.dataset.mode = m), mode);
await page.waitForTimeout(1500);
// Scroll through so lazy previews mount.
const H = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(120); }
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(900);
const full = await page.evaluate(() => document.documentElement.scrollHeight);
const tag = route.replace(/[^a-z0-9]+/gi, '_') + (mode ? '-' + mode : '');
let i = 0;
for (let y = 0; y < full; y += 1700, i++) {
  await page.screenshot({ path: `qa/artifacts/grid/${tag}-${i}.png`, fullPage: true, clip: { x: 0, y, width: 1440, height: Math.min(1700, full - y) } });
}
console.log(errors.length ? errors.join('\n') : `ok (${i} tiles, ${full}px)`);
await browser.close();
