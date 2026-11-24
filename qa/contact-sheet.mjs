// Dev helper: full-page screenshots of every blueprint at desktop and mobile, tiled into one
// contact sheet in qa/artifacts (gitignored). Usage: node qa/contact-sheet.mjs [baseUrl] [mode]
import { chromium } from '@playwright/test';
import { readdirSync, existsSync } from 'node:fs';

const [, , base = 'http://127.0.0.1:4399/', mode = ''] = process.argv;
const ids = readdirSync('blueprints').filter((d) => existsSync(`blueprints/${d}/meta.json`));
const browser = await chromium.launch();
const errors = [];
for (const id of ids) {
  for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', (e) => errors.push(`${id}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${id}: ${m.text()}`));
    await page.goto(`${base}blueprints/${id}/`);
    if (mode) await page.evaluate((m) => (document.documentElement.dataset.mode = m), mode);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `qa/artifacts/bp-${id}-${tag}${mode ? '-' + mode : ''}.png`, fullPage: true });
    await page.close();
  }
}
console.log(errors.length ? errors.join('\n') : `no errors (${ids.length} blueprints)`);
await browser.close();
