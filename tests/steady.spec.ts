// Steady: pressing a control never moves the control itself. A disclosure opens below its trigger, a label that
// changes keeps its button's width, closing something at the foot of a page leaves the page where it was, and a
// filter that empties a list does not stretch the nav above it.
import { expect, test, type Locator, type Page } from '@playwright/test';

const box = async (l: Locator) => { const b = (await l.boundingBox())!; return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
/** Where `target` is before and after pressing it (and, by default, after pressing it again). */
async function press(page: Page, target: Locator, times = 2) {
  await target.scrollIntoViewIfNeeded();
  const before = await box(target);
  const after: (typeof before)[] = [];
  for (let i = 0; i < times; i++) { await target.click(); await page.waitForTimeout(500); after.push(await box(target)); }
  return { before, after };
}
const still = (a: { x: number; y: number; w: number; h: number }, b: typeof a, tol = 1) => {
  expect(Math.abs(a.x - b.x), 'moved sideways').toBeLessThanOrEqual(tol);
  expect(Math.abs(a.y - b.y), 'moved up or down').toBeLessThanOrEqual(tol);
  expect(Math.abs(a.w - b.w), 'changed width').toBeLessThanOrEqual(tol);
};
async function stage(page: Page, id: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/#/ui/${id}`);
  await expect(page.locator(`#ui-${id}`)).toBeVisible();
  await page.waitForTimeout(400);
  return page.locator(`#ui-${id} [data-stage]`);
}

test.describe('gallery stages hold the pressed control', () => {
  test('a disclosure opens below its trigger, which stays put', async ({ page }) => {
    const s = await stage(page, 'disclosure-chevron');
    const trigger = s.locator('[data-part="trigger"]').first();
    const open0 = await trigger.getAttribute('aria-expanded');
    const { before, after } = await press(page, trigger);
    for (const a of after) still(before, a);
    await expect(trigger).toHaveAttribute('aria-expanded', open0!);
  });
  test('a chip keeps its width when ticked', async ({ page }) => {
    const s = await stage(page, 'filter-chips');
    const chip = s.locator('button, [role="checkbox"], label').filter({ hasNotText: /^$/ }).nth(1);
    const { before, after } = await press(page, chip, 1);
    still(before, after[0]);
  });
});

test.describe('blueprint pages hold the pressed control', () => {
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

  test('closing an answer at the foot of the page leaves the page where it was', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blueprints/calculator/');
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const q = page.locator('.lt-faq-section summary').first();
    const before = await box(q);
    await q.click(); await page.waitForTimeout(500);
    still(before, await box(q));
    await expect(page.locator('.lt-faq-section details').first()).not.toHaveAttribute('open', '');
    // The blank space it borrowed goes back as the reader scrolls up, out of sight.
    await page.mouse.wheel(0, -2000); await page.waitForTimeout(300);
    expect(await page.locator('[data-lt-floor]').count()).toBe(0);
  });

  test('a filter that shortens the list does not stretch the nav on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blueprints/admin/');
    const tab = page.locator('#ad-status [data-value="invited"]');
    const before = await box(tab);
    await tab.click(); await page.waitForTimeout(400);
    still(before, await box(tab));
    await expect(page.locator('.ad-main .lt-pagination')).toHaveCSS('visibility', 'hidden');
  });

  test('Copy keeps its width when it says Copied', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blueprints/assistant/');
    await page.waitForTimeout(500);
    const copy = page.locator('button[data-action="copy"]').first();
    const retry = page.locator('button[data-action="retry"]').first();
    await copy.scrollIntoViewIfNeeded();
    const [c0, r0] = [await box(copy), await box(retry)];
    await copy.click(); await page.waitForTimeout(200);
    await expect(copy).toContainText('Copied');
    still(c0, await box(copy)); still(r0, await box(retry));
  });

  test('the phone screens slide sideways without moving the page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blueprints/app-phone/?screen=home');
    await page.waitForTimeout(400);
    const next = page.locator('[aria-label="Next screen"]');
    await page.evaluate(() => scrollTo(0, 60));
    const { before, after } = await press(page, next, 1);
    still(before, after[0]);
  });
});

test.describe('typing and type', () => {
  test('the search box keeps every letter on the home page, where the grid filters as you type', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.locator('#g-q').click();
    await page.keyboard.type('bottom sheet', { delay: 40 });
    await page.waitForTimeout(400);
    await expect(page.locator('#g-q')).toHaveValue('bottom sheet');
    await expect(page.locator('#g-q')).toBeFocused();
    // Picking a result empties the box, so the next page does not open with the old words in it.
    await page.keyboard.press('Enter');
    await expect(page.locator('#g-q')).toHaveValue('');
  });

  test('a heading never breaks inside a word: it takes the word\'s width, then gets smaller', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/blueprints/venue/');
    await page.evaluate(() => { document.querySelector('h1')!.textContent = 'Neighbourhood bakery on Chandos Road, Redland'; });
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.waitForTimeout(300);
    for (const w of [1180, 820, 390]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => { const h = document.querySelector('h1')!; const was = h.style.overflowWrap; h.style.overflowWrap = 'normal'; const out = { sw: h.scrollWidth, cw: h.clientWidth }; h.style.overflowWrap = was; return out; });
      expect(r.sw, `at ${w}px the longest word fits its line`).toBeLessThanOrEqual(r.cw + 1);
    }
  });
});
