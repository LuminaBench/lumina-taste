// Every chart engine: renders at desktop and mobile, hover + keyboard interaction, export, publication rules.
import { expect, test } from '@playwright/test';

const noInteract = new Set(['radial-gauge', 'sparkline', 'kpi-card']);

for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`all charts render cleanly (${vp.name})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewportSize(vp);
    await page.goto('/#/charts');
    const cards = page.locator('[data-chart]');
    expect(await cards.count()).toBeGreaterThanOrEqual(16);
    const report = await page.$$eval('[data-chart]', (els) => els.map((c) => {
      const stage = c.querySelector<HTMLElement>('[data-chart-stage]')!;
      const svg = stage.querySelector('svg');
      const marks = stage.querySelectorAll('path, rect, circle, line, polygon, canvas').length;
      return { id: c.getAttribute('data-chart'), hasSvg: !!svg, marks, overflow: stage.scrollWidth > stage.clientWidth + 1, vgrid: stage.querySelectorAll('line.lt-vgrid').length };
    }));
    for (const r of report) {
      expect(r.hasSvg, `${r.id} svg`).toBe(true);
      expect(r.marks, `${r.id} marks`).toBeGreaterThan(2);
      expect(r.overflow, `${r.id} overflows its card at ${vp.width}px`).toBe(false);
      expect(r.vgrid, `${r.id} has vertical gridlines`).toBe(0);
    }
    expect(await page.$$eval('.lt-tick', (t) => t.every((x) => getComputedStyle(x).fontVariantNumeric.includes('tabular-nums')))).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('hover shows the crosshair tooltip on every interactive chart', async ({ page }) => {
  await page.goto('/#/charts');
  const ids = await page.$$eval('[data-chart]', (els) => els.map((e) => e.getAttribute('data-chart')!));
  for (const id of ids.filter((i) => !noInteract.has(i))) {
    const svg = page.locator(`[data-chart="${id}"] svg.lt-chart-svg`).first();
    await svg.scrollIntoViewIfNeeded();
    const box = (await svg.boundingBox())!;
    let shown = false;
    for (const [fx, fy] of [[0.5, 0.5], [0.35, 0.6], [0.65, 0.4], [0.5, 0.25], [0.2, 0.5], [0.8, 0.7], [0.3, 0.3], [0.6, 0.8]]) {
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
      if (await page.locator('.lt-chart-tooltip[data-show]').count()) { shown = true; break; }
    }
    expect(shown, `${id} tooltip on hover`).toBe(true);
    await page.mouse.move(0, 0);
  }
});

test('charts are keyboard navigable', async ({ page }) => {
  await page.goto('/#/charts/multi-line-chart');
  const svg = page.locator('svg.lt-chart-svg').first();
  await svg.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lt-chart-tooltip[data-show]')).toHaveCount(1);
  await page.keyboard.press('End');
  await expect(page.locator('.lt-chart-tooltip[data-show]')).toContainText('2026');
  await page.keyboard.press('Escape');
  await expect(page.locator('.lt-chart-tooltip[data-show]')).toHaveCount(0);
  await expect(page.locator('[data-part="live"]').first()).not.toBeEmpty();
});

test('one-click SVG and PNG export', async ({ page }) => {
  await page.goto('/#/charts/bar-chart');
  const [svgDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-export="svg"]')]);
  expect(svgDl.suggestedFilename()).toMatch(/\.svg$/);
  const [pngDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-export="png"]')]);
  expect(pngDl.suggestedFilename()).toMatch(/\.png$/);
});

test('donut never shows more than four parts', async ({ page }) => {
  await page.goto('/#/charts/donut-chart');
  expect(await page.locator('[data-chart="donut-chart"] path.lt-mark').count()).toBeLessThanOrEqual(4);
});
