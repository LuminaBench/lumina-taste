// App screens: the phone app flow (tabs, push and back, sheet with detents, swipe rows, pull to refresh),
// the desktop work app (keys, command menu, inspector, resizable panes) and the dense dashboard.
import { expect, test, type Page } from '@playwright/test';

const phone = { width: 390, height: 844 };
const app = (q = '') => `/blueprints/app-phone/${q}`;
const visibleScreen = (page: Page) => page.locator('.ap-frame[data-current]');

test.describe('phone app', () => {
  test('marks itself as an app and keeps phone-sized targets', async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto(app('?screen=home'));
    await expect(page.locator('html')).toHaveAttribute('data-app', '');
    const small = await page.$$eval('.ap-frame[data-current] :is(.ap-tabs a, .lt-swiperow [data-part="main"], .ap-choices button, [data-part="refresh"], .lt-appbar button)', (els) =>
      els.filter((e) => (e as HTMLElement).offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent?.trim(), h: Math.round(r.height) }; }).filter((x) => x.h < 44));
    expect(small).toEqual([]);
    // The bars that touch the screen edge leave room for the home indicator.
    const css = await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join('\n'));
    expect(css).toContain('safe-area-inset-bottom');
  });

  test('a harbour tap goes straight to Today, and the tab bar switches screens', async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto(app());
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'start');
    await page.click('[data-harbour="Kestrel Isle"]');
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'home');
    await expect(page.locator('#ap-harbour')).toHaveText('Kestrel Isle');
    await page.click('#screen-home .ap-tabs a[href="#screen-tickets"]');
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'tickets');
    await expect(page.locator('#screen-home')).toBeHidden();
    await expect(page.locator('#screen-tickets .ap-tabs a[aria-current="page"]')).toHaveText('Tickets');
    await page.click('#screen-tickets .ap-tabs a[href="#screen-settings"]');
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'settings');
    await expect(page.locator('#set-h')).toBeFocused();
  });

  test('push and back: a sailing opens, the back button returns to Today', async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto(app('?screen=home'));
    await page.click('.ap-next');
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'sailing');
    await page.click('#screen-sailing [data-part="back"]');
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'home');
  });

  test('the tickets sheet opens from the keyboard, changes detent, and Escape closes it', async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto(app('?screen=sailing'));
    await page.locator('#ap-choose').focus();
    await page.keyboard.press('Enter');
    const sheet = page.locator('#ap-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('data-detent', 'medium');
    await expect(page.locator('#ap-sheet [data-part="grab"]')).toBeFocused();
    await expect(page.locator('#ap-dog')).toBeHidden();
    await page.keyboard.press('ArrowUp');
    await expect(sheet).toHaveAttribute('data-detent', 'large');
    await expect(page.locator('#ap-sheet [data-part="grab"]')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.ap-extras')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(page.locator('#ap-choose')).toBeFocused();
  });

  test('on a desktop the sheet opens inside its phone', async ({ page }) => {
    await page.goto(app('?screen=sailing'));
    await page.click('#ap-choose');
    await expect(page.locator('#ap-sheet')).toHaveAttribute('data-contained-open', '');
    const [sheet, device] = await Promise.all([page.locator('#ap-sheet').boundingBox(), page.locator('#screen-sailing .ap-device').boundingBox()]);
    expect(sheet!.x).toBeGreaterThanOrEqual(device!.x - 1);
    expect(sheet!.x + sheet!.width).toBeLessThanOrEqual(device!.x + device!.width + 1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#ap-sheet')).toBeHidden();
  });

  test('tickets change the total on the sheet, the checkout and the Pay button', async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto(app('?screen=sailing'));
    await page.click('#ap-choose');
    await page.click('#ap-sheet .lt-stepper:has(#ap-adults) [data-part="inc"]');
    await expect(page.locator('#ap-sheet-total')).toHaveText('£51.00');
    await page.click('#ap-vehicle [data-value="0"]');
    await expect(page.locator('#ap-sheet-total')).toHaveText('£37.50');
    await page.click('#ap-to-pay');
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'pay');
    await expect(page.locator('#ap-pay-label')).toHaveText('£37.50');
    await expect(page.locator('#ap-lines')).toContainText('3 adults');
    await page.click('#ap-pay');
    await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'tickets');
    await expect(page.locator('#ap-toast')).toContainText('Paid £37.50');
  });

  test('swipe rows: a drag opens the actions, and a keyboard button does the same', async ({ page }) => {
    await page.goto(app('?screen=home'));
    const row = page.locator('#ap-later [data-part="row"]').first();
    const box = (await row.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(row).toHaveAttribute('data-open', '');
    await expect(row.locator('[data-part="actions"]')).not.toHaveAttribute('inert', '');
    // A tap elsewhere closes it, and the tap does not navigate.
    await page.locator('#ap-later [data-part="row"]').nth(1).locator('[data-part="main"]').click();
    await expect(row).not.toHaveAttribute('data-open', '');
    await expect(page.locator('.ap-frame[data-current]')).toHaveAttribute('data-screen', 'home');

    // Keyboard: the hidden-until-focused button opens the actions and moves focus into them.
    const more = row.locator('[data-part="more"]');
    await more.focus();
    await page.keyboard.press('Enter');
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('[data-action="remind"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(page.locator('#ap-toast')).toContainText('remind you');
    await expect(row.locator('[data-part="actions"]')).toHaveAttribute('inert', '');
  });

  test('pull to refresh has a button that does the same', async ({ page }) => {
    await page.goto(app('?screen=home'));
    await page.click('#ap-pull [data-part="refresh"]');
    await expect(page.locator('#ap-pull')).toHaveAttribute('data-state', 'refreshing');
    await expect(page.locator('#ap-pull [data-part="when"]')).toHaveText('Updated 09:41');
    await expect(page.locator('#ap-pull')).not.toHaveAttribute('data-state', 'refreshing');
  });

  test('settings act at once: appearance switches the theme', async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto(app('?screen=settings'));
    await page.click('#ap-appearance [data-value="dark"]');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
    await page.click('#ap-remind', { force: true });
    await expect(page.locator('#ap-remind-when')).toBeHidden();
  });

  for (const state of ['loading', 'empty', 'error']) {
    test(`?state=${state} opens Today in that state`, async ({ page }) => {
      await page.setViewportSize(phone);
      await page.goto(app(`?state=${state}`));
      await expect(visibleScreen(page)).toHaveAttribute('data-screen', 'home');
      await expect(page.locator(`#screen-home [data-view="${state}"]`)).toBeVisible();
      await expect(page.locator('#screen-home [data-view="ready"]')).toBeHidden();
    });
  }
});

test.describe('desktop work app', () => {
  const ws = '/blueprints/workspace/';
  const selectedTime = (page: Page) => page.locator('#ws-rows tr[aria-selected="true"] [data-k="dep"]');

  test('J and K move the selection and the inspector follows', async ({ page }) => {
    await page.goto(ws);
    await expect(selectedTime(page)).toHaveText('10:15');
    await page.locator('#ws-rows tr[aria-selected="true"]').focus();
    await page.keyboard.press('j');
    await expect(selectedTime(page)).toHaveText('10:50');
    await expect(page.locator('#ws-i-time')).toHaveText('10:50');
    await page.keyboard.press('k');
    await page.keyboard.press('k');
    await expect(selectedTime(page)).toHaveText('09:20');
  });

  test('D delays the selected sailing through a dialog', async ({ page }) => {
    await page.goto(ws);
    await page.locator('#ws-rows tr[aria-selected="true"]').focus();
    await page.keyboard.press('d');
    await expect(page.locator('#ws-delay-dialog')).toBeVisible();
    await page.click('#ws-d-mins [data-value="30"]');
    await expect(page.locator('#ws-d-go')).toHaveText('Delay by 30 min');
    await page.click('#ws-d-go');
    await expect(page.locator('#ws-delay-dialog')).toBeHidden();
    await expect(page.locator('#ws-rows tr[aria-selected="true"] [data-k="status"]')).toHaveText('30 min late');
    await expect(page.locator('#ws-toast')).toContainText('30 min late');
  });

  test('the command menu opens with ⌘K and runs a view', async ({ page }) => {
    await page.goto(ws);
    await page.locator('#ws-rows tr[aria-selected="true"]').focus();
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.locator('#ws-cmdk dialog')).toBeVisible();
    await page.keyboard.type('running');
    await page.keyboard.press('Enter');
    await expect(page.locator('#ws-cmdk dialog')).toBeHidden();
    await expect(page.locator('#ws-rows tr:visible')).toHaveCount(2);
    await expect(page.locator('a[data-filter="delayed"]')).toHaveAttribute('aria-current', 'page');
  });

  test('? shows the shortcuts and / filters the table', async ({ page }) => {
    await page.goto(ws);
    await page.locator('#ws-rows tr[aria-selected="true"]').focus();
    await page.keyboard.press('?');
    await expect(page.locator('#ws-keys dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#ws-keys dialog')).toBeHidden();
    await expect(page.locator('#ws-keys [data-part="open"]')).toBeFocused();
    await page.keyboard.press('/');
    await expect(page.locator('#ws-q')).toBeFocused();
    await page.keyboard.type('Moss');
    await expect(page.locator('#ws-count')).toHaveText('8 sailings');
  });

  test('a view with nothing in it says so', async ({ page }) => {
    await page.goto(ws);
    await page.click('a[data-filter="cancelled"]');
    await expect(page.locator('#ws-none')).toBeVisible();
    await page.click('#ws-show-all');
    await expect(page.locator('#ws-count')).toHaveText('24 sailings');
  });

  test('panes resize by keyboard and by drag', async ({ page }) => {
    await page.goto(ws);
    const edge = page.locator('.ws-r2');
    const inspector = page.locator('#ws-inspector');
    const w0 = (await inspector.boundingBox())!.width;
    await edge.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(edge).toHaveAttribute('aria-valuenow', '384');
    expect((await inspector.boundingBox())!.width).toBeGreaterThan(w0);
    await page.keyboard.press('End');
    await expect(edge).toHaveAttribute('aria-valuenow', '520');
    await page.keyboard.press('Enter');
    await expect(edge).toHaveAttribute('aria-valuenow', '368');
    const b = (await edge.boundingBox())!;
    await page.mouse.move(b.x + 1, b.y + 200);
    await page.mouse.down();
    await page.mouse.move(b.x - 60, b.y + 200, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => +(await edge.getAttribute('aria-valuenow'))!).toBeGreaterThanOrEqual(420);
  });

  test('on a narrow window the inspector opens over the table and Escape closes it', async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto(ws);
    await expect(page.locator('#ws-inspector')).toBeHidden();
    await page.locator('#ws-rows tr').nth(8).click();
    await expect(page.locator('#ws-inspector')).toBeVisible();
    await expect(page.locator('#ws-i-h')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#ws-inspector')).toBeHidden();
  });

  for (const [state, shows] of [['loading', '.ws-skel'], ['empty', '#ws-empty-h'], ['error', '#ws-error-h']]) {
    test(`?state=${state} shows its state`, async ({ page }) => {
      await page.goto(`${ws}?state=${state}`);
      await expect(page.locator(shows)).toBeVisible();
      await expect(page.locator('.ws-table[data-view="ready"]')).toBeHidden();
    });
  }
});

test.describe('dense dashboard', () => {
  test('ten figures with sparklines, one main chart, and a long table whose header stays put', async ({ page }) => {
    await page.goto('/blueprints/dashboard/');
    await expect(page.locator('.bp-kpis .lt-kpi')).toHaveCount(10);
    expect(await page.locator('.bp-kpis .lt-kpi .lt-spark').count()).toBe(10);
    expect(await page.locator('.bp-table tbody tr').count()).toBeGreaterThanOrEqual(20);
    const wrap = page.locator('.bp-table');
    await wrap.evaluate((el) => { el.scrollTop = 300; });
    const [th, box] = await Promise.all([page.locator('.bp-table thead th').first().boundingBox(), wrap.boundingBox()]);
    expect(Math.abs(th!.y - box!.y)).toBeLessThanOrEqual(2);
    // Direct labels, no legend, and no more than four series on the main chart.
    expect(await page.locator('#c-mrr path.lt-line').count()).toBeLessThanOrEqual(4);
  });

  test('?state=loading and ?state=error replace the figures', async ({ page }) => {
    await page.goto('/blueprints/dashboard/?state=loading');
    await expect(page.locator('.bp-loading')).toBeVisible();
    await expect(page.locator('.bp-kpis[data-view="ready"]')).toBeHidden();
    await page.goto('/blueprints/dashboard/?state=error');
    await expect(page.locator('#bp-err-h')).toBeVisible();
    await page.click('.bp-error [data-set-state="ready"]');
    await expect(page.locator('.bp-kpis[data-view="ready"]')).toBeVisible();
  });
});

// Tablets (768 to 1180px) and foldables: the phone app becomes a sidebar and two panes, its sheet a popover;
// the work app keeps the table and the inspector side by side with the sidebar as a rail of icons.
test.describe('tablet and foldable layouts', () => {
  test('the phone app on a tablet: a sidebar, Today beside the sailing, and pages that never scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(app('?screen=home'));
    await expect(page.locator('#ap-side')).toBeVisible();
    await expect(page.locator('#ap-side a[aria-current="page"]')).toHaveText('Today');
    await expect(page.locator('#screen-home .ap-tabs')).toBeHidden();
    const [list, detail] = await Promise.all([page.locator('#screen-home').boundingBox(), page.locator('#screen-sailing').boundingBox()]);
    expect(list!.x + list!.width).toBeLessThanOrEqual(detail!.x + 1);
    expect(detail!.height).toBeLessThanOrEqual(768);
    await page.locator('#ap-later [data-id="1230"] [data-part="main"]').click();
    await expect(page.locator('#screen-home')).toBeVisible();
    await expect(page.locator('#sail-h')).toBeFocused();
    await page.click('#ap-side a[data-tab="tickets"]');
    await expect(page.locator('#screen-tickets')).toBeVisible();
    await expect(page.locator('#screen-home')).toBeHidden();
    await expect(page.locator('#ap-side a[aria-current="page"]')).toHaveText('Tickets');
    for (const width of [768, 1024, 1180]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    // Upright, the sidebar is a rail of icons with their names under them.
    await page.setViewportSize({ width: 768, height: 1024 });
    expect((await page.locator('#ap-side').boundingBox())!.width).toBeLessThan(100);
    // The foldable's two-pane rule is in the stylesheet, with the width rule as the fallback.
    const css = await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules].map((r) => r.cssText)).join('\n'));
    expect(css).toContain('horizontal-viewport-segments: 2');
  });

  test('on a tablet the tickets sheet is a popover by its button: every option shown, Escape closes, focus returns', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(app('?screen=sailing'));
    await page.click('#ap-choose');
    const sheet = page.locator('#ap-sheet');
    await expect(sheet).toBeVisible();
    await expect(page.locator('#ap-sheet [data-part="grab"]')).toBeHidden();
    await expect(page.locator('#ap-dog')).toBeAttached();
    await expect(page.locator('.ap-extras')).toBeVisible();
    await expect(page.locator('#ap-adults')).toBeFocused();
    const box = (await sheet.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(420);
    expect(box.y + box.height).toBeLessThan(768 - 40);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(page.locator('#ap-choose')).toBeFocused();
  });

  test('the work app on a tablet: a rail of icons, the table and the inspector side by side', async ({ page }) => {
    for (const width of [768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/blueprints/workspace/');
      await expect(page.locator('.lt-sidebar')).toHaveAttribute('data-collapsed', '');
      await expect(page.locator('#ws-inspector')).toBeVisible();
      // The sidebar narrows with a short transition: wait for it to settle.
      await expect.poll(async () => (await page.locator('.ws-main').boundingBox())!.width).toBeGreaterThan(380);
      const [main, insp] = await Promise.all([page.locator('.ws-main').boundingBox(), page.locator('#ws-inspector').boundingBox()]);
      expect(main!.x + main!.width).toBeLessThanOrEqual(insp!.x + 1);
      // Every part of the main pane fits it: the table scrolls inside its own frame if it must.
      const over = await page.evaluate(() => [...document.querySelectorAll('.ws-main > *')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible').map((e) => e.className));
      expect(over, `${width}`).toEqual([]);
      await page.locator('#ws-rows tr').nth(9).click();
      await expect(page.locator('#ws-inspector')).toBeVisible();
    }
  });
});
