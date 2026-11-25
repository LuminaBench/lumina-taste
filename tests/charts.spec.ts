// Every chart engine: renders at desktop and mobile, hover + keyboard interaction, export, publication rules.
import { expect, test } from '@playwright/test';

const noInteract = new Set(['radial-gauge', 'sparkline', 'kpi-card']);
// Vertical gridlines are banned on time and category axes (no cage). Charts whose x axis is a
// continuous value scale (scatter, ranges, distributions) keep light value guides.
const valueX = new Set(['range-bar-chart', 'dumbbell-chart', 'box-plot', 'beeswarm-chart', 'tradeoff-scatter', 'frontier-chart', 'gantt-chart', 'ridgeline-chart']);

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
      if (!valueX.has(r.id!)) expect(r.vgrid, `${r.id} has vertical gridlines`).toBe(0);
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
  // The gallery never downloads anything (export is off in previews); the React harness keeps it on.
  await page.goto('/_react/');
  await page.locator('[data-case="chart-bar"] [data-export="svg"]').scrollIntoViewIfNeeded();
  const [svgDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-case="chart-bar"] [data-export="svg"]')]);
  expect(svgDl.suggestedFilename()).toMatch(/\.svg$/);
  const [pngDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-case="chart-bar"] [data-export="png"]')]);
  expect(pngDl.suggestedFilename()).toMatch(/\.png$/);
});

test('donut never shows more than four parts', async ({ page }) => {
  await page.goto('/#/charts/donut-chart');
  expect(await page.locator('[data-chart="donut-chart"] path.lt-mark').count()).toBeLessThanOrEqual(4);
});

test('gallery previews never offer downloads', async ({ page }) => {
  await page.goto('/#/charts');
  await expect(page.locator('[data-chart]').first()).toBeVisible();
  await expect(page.locator('[data-export]')).toHaveCount(0);
});

test('forecast chart: dashed after the last measured point, a range, a goal line and an honest tooltip', async ({ page }) => {
  await page.goto('/#/charts/forecast-chart');
  const fig = page.locator('#chart-forecast-chart figure.lt-chart');
  await expect(fig.locator('path.lt-band')).toHaveCount(1);
  expect(await fig.locator('path.lt-line').count()).toBe(2);
  expect(await fig.locator('path.lt-line').nth(1).getAttribute('style')).toContain('stroke-dasharray');
  await expect(fig.locator('svg text', { hasText: 'Goal £300k' })).toHaveCount(1);
  await expect(fig.locator('[data-part="data"]')).toContainText('Dec 2026');
  const summary = await fig.locator('svg').first().getAttribute('aria-label');
  expect(summary ?? await fig.textContent()).toContain('forecast from');
});

test('new charts: steps are axis-aligned, every ridge has a median, cohort cells are all labelled', async ({ page }) => {
  await page.goto('/#/charts/step-chart');
  const d = await page.locator('#chart-step-chart path.lt-line').first().getAttribute('d');
  expect(d).toMatch(/^M[\d.]+ [\d.]+(H[\d.]+V[\d.]+)+$/);
  await page.goto('/#/charts/ridgeline-chart');
  await expect(page.locator('#chart-ridgeline-chart figure.lt-chart svg path.lt-line')).toHaveCount(6);
  await expect(page.locator('#chart-ridgeline-chart [data-part="data"] tbody tr')).toHaveCount(6);
  for (const mode of ['light', 'dark']) {
    await page.goto('/#/charts/cohort-grid');
    await page.evaluate((m) => document.querySelectorAll('[data-mode]').forEach((e) => e.setAttribute('data-mode', m)), mode);
    await page.waitForTimeout(400);
    const fig = page.locator('#chart-cohort-grid figure.lt-chart');
    const cells = await fig.locator('svg rect.lt-mark').count();
    const labels = await fig.locator('svg text', { hasText: /^\d+%$/ }).count();
    expect(cells, mode).toBe(65);
    expect(labels, mode).toBe(cells);
  }
});

test('grouped bars: highlight keeps one series in colour and greys the comparison', async ({ page }) => {
  await page.goto('/#/charts/grouped-bar-chart');
  const fills = await page.locator('#chart-grouped-bar-chart figure.lt-chart path.lt-mark').evaluateAll((els) => [...new Set(els.map((e) => (e as SVGElement).style.fill))]);
  expect(fills).toEqual(['var(--border-strong)', 'var(--chart-1)']);
});

