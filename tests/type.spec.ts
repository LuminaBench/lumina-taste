// Type pairings in the browser, with every web-font request blocked (the kit's zero-download default):
// each new pairing applies its faces, weights, width and optical sizing, and lays out without overflow.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../tokens/typography/source.json'), 'utf8'));
const NEW = ['signage', 'hyperlegible', 'stamped', 'stadium', 'legal', 'workbench', 'schoolbook', 'stencil'];
const firstFamily = (stack: string) => stack.split(',')[0].replace(/["']/g, '').trim();

test.beforeEach(async ({ context }) => {
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
});

for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`new pairings apply on a blueprint and fit (${vp.name})`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/blueprints/landing/');
    for (const id of NEW) {
      const p = source.pairings.find((x: { id: string }) => x.id === id);
      const r = await page.evaluate((id) => {
        document.documentElement.dataset.type = id;
        const h1 = document.querySelector('h1')!, body = document.body;
        const cs = getComputedStyle(h1), bs = getComputedStyle(body);
        return { h1Family: cs.fontFamily, h1Weight: cs.fontWeight, bodyFamily: bs.fontFamily, bodyWeight: bs.fontWeight, stretch: cs.fontStretch, optical: cs.fontOpticalSizing, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      }, id);
      expect(firstFamily(r.h1Family), id).toBe(firstFamily(p.display));
      expect(r.h1Family, `${id} names its metric-matched fallback`).toContain(`${firstFamily(p.display)} Fallback`);
      expect(firstFamily(r.bodyFamily), id).toBe(firstFamily(p.body));
      expect(Number(r.h1Weight) - Number(r.bodyWeight), `${id} weight contrast`).toBeGreaterThanOrEqual(200);
      expect(r.overflow, `${id} overflows at ${vp.width}px`).toBe(false);
      if (id === 'stadium') expect(r.stretch).toBe('125%');
      if (id === 'legal' || id === 'stencil') expect(r.optical).toBe('auto');
    }
  });
}

test('the gallery theme panel offers every pairing', async ({ page }) => {
  await page.goto('/');
  await page.click('#g-theme-btn');
  const ids = await page.$$eval('#g-theme [data-axis="type"]', (b) => b.map((x) => (x as HTMLElement).dataset.value));
  expect(ids).toEqual(source.pairings.map((p: { id: string }) => p.id));
});
