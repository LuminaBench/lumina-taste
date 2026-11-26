import { test, expect, type Page } from '@playwright/test';

// Behaviours that differ between engines. They run in every project: Chromium by default, and Safari's engine
// with LT_BROWSERS=webkit (Firefox with LT_BROWSERS=firefox). Each test names the difference it guards.

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
};
const solo = async (page: Page, id: string) => {
  await page.goto(`/#/ui/${id}`);
  await expect(page.locator(`#ui-${id}`)).toBeVisible();
  await page.locator('[data-replay]').click();
  await page.waitForTimeout(760);
  return page.locator(`#ui-${id} [data-stage]`);
};

test.describe('scroll moments in every engine', () => {
  // WebKit reports a ResizeObserver whose callback resizes what it observes as a page error ("ResizeObserver loop
  // completed with undelivered notifications"); Chromium stays quiet. The pinned scene, the sideways row and the
  // segmented control re-lay out on the next frame instead.
  for (const width of [1440, 390]) {
    test(`pinned scenes, sideways rows and figures scroll through without errors or overflow at ${width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const errors = errorsOf(page);
      for (const bp of ['landing', 'shop', 'event', 'editorial']) {
        await page.goto(`/blueprints/${bp}/`);
        await page.evaluate(() => document.fonts.ready);
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < height; y += 600) { await page.evaluate((top) => scrollTo(0, top), y); await page.waitForTimeout(60); }
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${bp} is no wider than the screen`).toBeLessThanOrEqual(width);
        // At rest again at the top, the first heading is in view and fully drawn.
        await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
        const h1 = page.locator('h1:visible').first();
        await expect(h1).toBeInViewport();
        expect(Number(await h1.evaluate((el) => getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
      }
      expect(errors).toEqual([]);
    });
  }
});

test('the live laptop screen fills its screen and stops at the bezel', async ({ page }) => {
  // WebKit resolved height: 100% inside the 16:10 screen against its border box, so the zoomed app ran under
  // the bezel; the app now takes its height from the ratio.
  const s = await solo(page, 'device-frame');
  const fit = await s.locator('.lt-device[data-kind="laptop"] [data-app]').first().evaluate((app) => {
    const screen = app.closest<HTMLElement>('[data-part="screen"]')!;
    const cs = getComputedStyle(screen);
    const r = screen.getBoundingClientRect(), a = app.getBoundingClientRect();
    const scale = r.width / screen.offsetWidth; // the gallery scales its previews
    const inner = (r.height / scale - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth)) * scale;
    return { app: a.height, inner, width: a.width, innerWidth: r.width - (parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)) * scale };
  });
  expect(Math.abs(fit.app - fit.inner)).toBeLessThan(2);
  expect(Math.abs(fit.width - fit.innerWidth)).toBeLessThan(2);
});

test.describe('keyboard paths where a click does not focus', () => {
  // Safari does not focus a button or a checkbox on click, and Tab skips them unless the person turns on "Press
  // Tab to highlight each item". The keyboard paths still work once the control has focus, and an open menu
  // closes on Escape wherever focus is.
  test('accordion: Enter opens, arrow keys move from a focused trigger', async ({ page }) => {
    const s = await solo(page, 'accordion');
    const t = s.locator('[data-part="trigger"]');
    await t.nth(1).focus();
    await page.keyboard.press('Enter');
    await expect(t.nth(1)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(t.nth(2)).toBeFocused();
  });
  test('flyout menu: a click opens it and Escape closes it with focus on the page', async ({ page }) => {
    const s = await solo(page, 'flyout-menu');
    await s.locator('[data-part="trigger"]').first().click();
    await expect(s.locator('#lt-fo-product')).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Escape');
    await expect(s.locator('#lt-fo-product')).toBeHidden();
  });
  test('tooltip: shows when its trigger is reached from the keyboard (Option+Tab in Safari)', async ({ page, browserName }) => {
    await solo(page, 'tooltip');
    // A focused button just before the trigger, then the platform's "next control" key: WebKit only matches
    // :focus-visible (and so shows the tooltip) for focus that comes from the keyboard.
    await page.locator('#ui-tooltip [aria-describedby="lt-tt-1"]').evaluate((a) => { const b = document.createElement('button'); b.id = 'probe-before'; b.textContent = 'before'; a.before(b); b.focus(); });
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(page.locator('#ui-tooltip [aria-describedby="lt-tt-1"]')).toBeFocused();
    await expect(page.locator('#lt-tt-1')).toBeVisible();
  });
});

test('copy button says Copied where clipboard permission cannot be granted', async ({ page }) => {
  // WebKit has no clipboard-write permission to grant; the button falls back to a hidden textarea and still answers.
  const s = await solo(page, 'copy-button');
  await s.locator('.lt-copy').click();
  await expect(s.locator('[data-part="text"]')).toHaveText('Copied');
});
