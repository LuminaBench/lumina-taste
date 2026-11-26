// Chart stories: one question, one lit moment with a sentence, the rest muted, the answer as the headline;
// and the scroll-built variant, which is still and complete under reduced motion and in print.
import { expect, test } from '@playwright/test';

test('a chart story lights one moment and mutes the rest', async ({ page }) => {
  await page.goto('/#/charts/chart-story');
  const story = page.locator('[data-chart="chart-story"] .lt-chartstory');
  await expect(story.locator('[data-part="headline"]')).toContainText('most punctual route');
  await expect(story.locator('[data-part="question"]')).toBeVisible();
  // One moment, with its sentence on the chart.
  await expect(story.locator('.lt-story-moment')).toHaveCount(1);
  await expect(story.locator('.lt-story-note')).toHaveText('New timetable from 8 September');
  // The context series is muted; the accent is only on the moment.
  expect(await story.locator('.lt-story-base path[data-muted]').count()).toBeGreaterThan(0);
  const accentStrokes = await story.locator('svg path').evaluateAll((ps) => ps.filter((p) => (p.getAttribute('style') ?? '').includes('--accent-solid')).length);
  expect(accentStrokes).toBe(1);
  // No legend: the series are named at their ends.
  await expect(story.locator('text.lt-label')).toContainText('Ardmore route');
  // Still a real chart: keyboard and tooltip.
  await story.locator('svg.lt-chart-svg').focus();
  await page.keyboard.press('End');
  await expect(page.locator('.lt-chart-tooltip[data-show]')).toContainText('Ardmore route');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the scroll-built story shows the final chart, every moment lit, the steps as captions', async ({ page }) => {
    await page.goto('/#/charts/chart-story-scroll');
    const story = page.locator('[data-chart="chart-story-scroll"] .lt-chartstory');
    await expect(story).toHaveAttribute('data-static', '');
    await expect(story.locator('.lt-story-moment')).toHaveCount(3);
    for (const g of await story.locator('.lt-story-moment').all()) await expect(g).toHaveCSS('opacity', '1');
    await expect(story.locator('[data-part="reveal"]')).toHaveCount(0);
    await expect(story.locator('[data-part="stage"]')).toHaveCSS('position', 'static');
    await expect(story.locator('[data-part="step"]')).toHaveCount(3);
  });
});

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('the chart builds as the steps scroll past, one moment at a time', async ({ page }) => {
    await page.goto('/#/charts/chart-story-scroll');
    const story = page.locator('[data-chart="chart-story-scroll"] .lt-chartstory');
    await expect(story).not.toHaveAttribute('data-static', '');
    const reveal = story.locator('[data-part="reveal"]');
    const widthAt = async () => +(await reveal.evaluate((r) => parseFloat((r as SVGRectElement).style.width)));
    await expect(story.locator('.lt-story-moment[data-on]')).toHaveCount(1);
    const w0 = await widthAt();
    for (const i of [1, 2]) {
      await story.locator(`[data-part="step"][data-index="${i}"]`).evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect(story).toHaveAttribute('data-step', String(i));
      await expect(story.locator(`.lt-story-moment[data-step="${i}"]`)).toHaveAttribute('data-on', '');
      await expect(story.locator('.lt-story-moment[data-on]')).toHaveCount(1);
    }
    expect(await widthAt()).toBeGreaterThan(w0);
    // In print the whole chart shows, every moment lit, whatever step the reader stopped at.
    await page.emulateMedia({ media: 'print' });
    for (const g of await story.locator('.lt-story-moment').all()) await expect(g).toHaveCSS('opacity', '1');
    await expect(story.locator('[data-part="stage"]')).toHaveCSS('position', 'static');
  });
});
