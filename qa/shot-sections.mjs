// Dev helper: screenshot each gallery section into qa/artifacts (gitignored).
// Usage: node qa/shot-sections.mjs [baseUrl] [light|dark] [width] [route]
import { chromium } from '@playwright/test';

const [, , base = 'http://127.0.0.1:4399/', mode = 'light', w = '1440', route = '#/ui'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(base + route);
await page.evaluate((m) => (document.documentElement.dataset.mode = m), mode);
await page.waitForTimeout(1500);
const sections = await page.$$('section.g-section, .g-grid-charts');
for (const [i, s] of sections.entries()) {
  const id = (await s.getAttribute('id')) ?? `sec-${i}`;
  await s.screenshot({ path: `qa/artifacts/${id}-${mode}-${w}.png` });
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
