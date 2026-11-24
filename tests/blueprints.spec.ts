// The page blueprints: render, no overflow, one h1, re-skin across palettes and modes, key flows work.
import { expect, test } from '@playwright/test';
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ids = readdirSync(join(root, 'blueprints')).filter((d) => existsSync(join(root, 'blueprints', d, 'meta.json')));

test('there are 13 blueprints', () => expect(ids.length).toBe(13));

for (const id of ids) {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`${id} renders cleanly at ${vp.width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.setViewportSize(vp);
      await page.goto(`/blueprints/${id}/`);
      await expect(page.locator('main')).toBeVisible();
      expect(await page.locator('h1:visible').count()).toBe(1);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { message: 'horizontal page overflow' }).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }
  test(`${id} re-skins across palettes and modes`, async ({ page }) => {
    await page.goto(`/blueprints/${id}/`);
    const seen = await page.evaluate(() => {
      const html = document.documentElement;
      const out = new Set<string>();
      for (const p of ['cream-charcoal', 'black-signal', 'ochre-indigo', 'charcoal-sky']) for (const m of ['light', 'dark']) {
        html.dataset.palette = p; html.dataset.mode = m;
        out.add(getComputedStyle(document.body).backgroundColor + getComputedStyle(html).getPropertyValue('--accent-solid'));
      }
      return out.size;
    });
    expect(seen).toBe(8);
  });
}

test('pricing toggle switches every price', async ({ page }) => {
  await page.goto('/blueprints/pricing/');
  await page.click('#billing [data-value="monthly"]');
  await expect(page.locator('.pr-price data').nth(1)).toHaveText('£30');
  await expect(page.locator('#billnote')).toContainText('Billed monthly');
});

test('settings shows the save bar only when something changed', async ({ page }) => {
  await page.goto('/blueprints/settings/');
  await expect(page.locator('#savebar')).toBeHidden();
  await page.locator('.lt-switch').nth(2).click();
  await expect(page.locator('#savebar')).toBeVisible();
  await page.click('#discard');
  await expect(page.locator('#savebar')).toBeHidden();
});

test('directory filters, sorts and shows an empty state', async ({ page }) => {
  await page.goto('/blueprints/directory/');
  await expect(page.locator('#empty')).toBeHidden();
  await page.click('#pills [data-cat="data"]');
  await expect(page.locator('#count')).toHaveText('3 of 12 skills');
  await page.fill('#dir-q', 'zzz');
  await expect(page.locator('#empty')).toBeVisible();
  await page.click('#reset');
  await expect(page.locator('#count')).toHaveText('12 of 12 skills');
});

test('auth flow: email → code → workspace → done', async ({ page }) => {
  await page.goto('/blueprints/auth/');
  await page.fill('#au-email', 'lee@moss.studio');
  await page.click('#send');
  await expect(page.locator('#step-code')).toBeVisible();
  await page.locator('#otp input').first().click();
  await page.keyboard.type('246810');
  await expect(page.locator('#step-setup')).toBeVisible();
  await page.fill('#au-ws', 'Moss Studio');
  await page.click('#ws-form button[type="submit"]');
  await expect(page.locator('#ws-name')).toHaveText('Moss Studio');
});

test('dashboard global filter updates charts', async ({ page }) => {
  await page.goto('/blueprints/dashboard/');
  const before = await page.locator('#c-mrr .lt-xaxis text').count();
  await page.click('#filters [data-value="24"]');
  await expect.poll(() => page.locator('#c-mrr .lt-xaxis text').allTextContents()).not.toEqual([]);
  expect(await page.locator('#c-mrr [data-part="title"]').textContent()).toContain('Scale');
  expect(before).toBeGreaterThan(0);
});

test('gallery full-screen viewer loads and syncs the theme into the blueprint', async ({ page }) => {
  await page.goto('/#/pages/landing');
  const frame = page.frameLocator('iframe[data-blueprint]');
  await expect(frame.locator('h1')).toBeVisible();
  await page.click('#g-theme-btn');
  await page.click('#g-theme [data-axis="palette"][data-value="linen-oxblood"]');
  await expect.poll(() => page.locator('iframe[data-blueprint]').evaluate((f: HTMLIFrameElement) => f.contentDocument!.documentElement.dataset.palette)).toBe('linen-oxblood');
  await page.selectOption('#g-bp-switch', 'auth');
  await expect(page).toHaveURL(/#\/pages\/auth/);
});

test('admin: search, status filter, bulk bar and detail drawer', async ({ page }) => {
  await page.goto('/blueprints/admin/');
  await page.fill('#ad-q', 'kestrel');
  await expect(page.locator('.ad-table tbody tr:visible')).toHaveCount(1);
  await page.fill('#ad-q', 'zzz');
  await expect(page.locator('#ad-nomatch')).toBeVisible();
  await page.click('#ad-reset');
  await page.click('#ad-status [data-value="invited"]');
  await expect(page.locator('.ad-table tbody tr:visible')).toHaveCount(2);
  await page.locator('.ad-table tbody tr:visible input[type="checkbox"]').first().check({ force: true });
  await expect(page.locator('.ad-table [data-part="bar"]')).toBeVisible();
  await page.locator('.ad-table tbody tr:visible [data-user]').first().click();
  await expect(page.locator('#ad-drawer')).toBeVisible();
  await expect(page.locator('#ad-d-role')).toHaveText('Viewer');
});

for (const [id, state, shows] of [['admin', 'loading', '[data-view="loading"]'], ['admin', 'empty', '[data-view="empty"]'], ['admin', 'error', '[data-view="error"]'], ['status', 'incident', '.sp-incident'], ['store', 'sold-out', '.sp-sold'], ['checkout', 'error', '.co-error']] as const) {
  test(`${id} ?state=${state} shows its state and hides the ready view`, async ({ page }) => {
    await page.goto(`/blueprints/${id}/?state=${state}`);
    await expect(page.locator(shows)).toBeVisible();
    for (const el of await page.locator('[data-view="ready"]').all()) await expect(el).toBeHidden();
  });
}

test('admin error state: Try again returns to the table', async ({ page }) => {
  await page.goto('/blueprints/admin/?state=error');
  await page.click('[data-view="error"] [data-set-state="ready"]');
  await expect(page.locator('.ad-table')).toBeVisible();
});

test('store: size and plan change the price on the button', async ({ page }) => {
  await page.goto('/blueprints/store/');
  await page.click('#sp-size [data-value="250"]');
  await expect(page.locator('#sp-total')).toHaveText('£11.50');
  await page.locator('input[name="plan"][value="sub"]').check({ force: true });
  await expect(page.locator('#sp-total')).toHaveText('£10.35');
  await page.locator('.sp-thumbs [data-shot="cup"]').click();
  await expect(page.locator('#sp-stage')).toHaveAttribute('data-shot', 'cup');
});

test('checkout: delivery choice updates the summary and the Pay button', async ({ page }) => {
  await page.goto('/blueprints/checkout/');
  await expect(page.locator('#co-pay-total')).toHaveText('£161.95');
  await page.locator('input[name="ship"][value="9.95"]').check({ force: true });
  await expect(page.locator('#co-total')).toHaveText('£166.95');
  await expect(page.locator('#co-pay-total')).toHaveText('£166.95');
  await page.click('.co-pay');
  await expect(page.locator('#co-email')).toBeFocused();
});

test('changelog filter and status bars', async ({ page }) => {
  await page.goto('/blueprints/changelog/');
  await page.click('#cl-filter [data-value="fixed"]');
  await expect(page.locator('.cl-list li:visible')).toHaveCount(3);
  await page.goto('/blueprints/status/');
  await expect(page.locator('.lt-uptime ol').first().locator('li')).toHaveCount(90);
  await expect(page.locator('.lt-uptime li[data-s="down"]')).toHaveCount(1);
});
