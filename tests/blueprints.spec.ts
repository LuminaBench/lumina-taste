// The page blueprints: render, no overflow, one h1, re-skin across palettes and modes, key flows work.
import { expect, test } from '@playwright/test';
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ids = readdirSync(join(root, 'blueprints')).filter((d) => existsSync(join(root, 'blueprints', d, 'meta.json')));

test('there are 27 blueprints', () => expect(ids.length).toBe(27));

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

for (const [id, state, shows] of [['admin', 'loading', '[data-view="loading"]'], ['admin', 'empty', '[data-view="empty"]'], ['admin', 'error', '[data-view="error"]'], ['status', 'incident', '.sp-incident'], ['store', 'sold-out', '.sp-sold'], ['checkout', 'error', '.co-error'], ['assistant', 'empty', '.as-empty'], ['assistant', 'streaming', '.as-stop'], ['assistant', 'error', '[data-part="error"]'], ['agent', 'empty', '.ag-ideas'], ['agent', 'running', '.ag-plan'], ['mobile', 'loading', '[data-view="loading"]'], ['mobile', 'empty', '.lt-empty'], ['inbox', 'empty', '.ib-zero']] as const) {
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

test('gallery viewer switches a blueprint between its page states', async ({ page }) => {
  await page.goto('/#/pages/admin');
  await page.click('[data-state="empty"]');
  await expect(page.locator('iframe[data-blueprint]')).toHaveAttribute('src', /\?state=empty$/);
  await expect(page.frameLocator('iframe[data-blueprint]').locator('[data-view="empty"]')).toBeVisible();
  await page.click('[data-state=""]');
  await expect(page.frameLocator('iframe[data-blueprint]').locator('.ad-table')).toBeVisible();
});

test('assistant: a question streams an answer, Stop ends it, suggestions fill the composer', async ({ page }) => {
  await page.goto('/blueprints/assistant/');
  await page.fill('#as-input', 'How many trials converted?');
  await page.keyboard.press('Enter');
  await expect(page.locator('#as-thread [data-role="user"]').last()).toHaveText('How many trials converted?');
  await expect(page.locator('#as-stop')).toBeVisible();
  await page.click('#as-stop');
  await expect(page.locator('#as-stop')).toBeHidden();
  await page.click('#as-new');
  await expect(page.locator('.as-empty')).toBeVisible();
  await page.locator('[data-suggest]').first().click();
  await expect(page.locator('#as-input')).toHaveValue('Why did churn rise in October?');
});

test('assistant: history is a drawer on phones and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blueprints/assistant/');
  await expect(page.locator('#as-rail')).not.toBeInViewport();
  await page.click('#as-menu');
  await expect(page.locator('#as-rail')).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator('#as-menu')).toBeFocused();
});

test('devtool: code tabs switch, the command copies, the hero backdrop can be paused', async ({ page }) => {
  await page.goto('/blueprints/devtool/');
  await page.getByRole('tab', { name: 'Python' }).click();
  await expect(page.locator('#dv-code-py')).toBeVisible();
  await expect(page.locator('#dv-code-node')).toBeHidden();
  await page.locator('.lt-command [data-part="copy"]').click();
  await expect(page.locator('.lt-command [data-part="msg"]')).toHaveText('Command copied.');
  const pause = page.locator('.lt-circuit [data-part="pause"]');
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  // The floating nav sits over the hero, so the hero's backdrop starts at the top of the page.
  expect((await page.locator('.lt-hero-centered').boundingBox())!.y).toBeLessThanOrEqual(1);
});

test('agent: a task starts a session; approving the edit advances the plan', async ({ page }) => {
  await page.goto('/blueprints/agent/');
  await expect(page.locator('.lt-dither canvas')).toBeVisible();
  await page.fill('#ag-input', 'Add a retry to the export job');
  await page.keyboard.press('Enter');
  await expect(page.locator('#ag-run-h')).toHaveText('Add a retry to the export job');
  await expect(page.locator('.ag-home')).toBeHidden();
  await expect(page.locator('.ag-plan li[data-s="running"]')).toHaveText(/Round each line before summing/);
  await page.click('#ag-approve');
  await expect(page.locator('.ag-plan li[data-s="running"]')).toHaveText(/Run the 212 ledger tests/);
  await expect(page.locator('#ag-status')).toContainText('Edit approved');
  await expect(page.locator('#ag-approve')).toHaveCount(0);
});

test('agent: the sidebar is a drawer on phones; the switcher changes workspace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blueprints/agent/');
  await expect(page.locator('#ag-side')).not.toBeInViewport();
  await page.click('#ag-menu');
  await expect(page.locator('#ag-side')).toBeInViewport();
  await page.locator('.lt-switcher [data-part="trigger"]').click();
  await page.locator('[role="menuitemradio"][data-value="larkspur/staging"]').click();
  await expect(page.locator('.lt-switcher [data-part="meta"]')).toHaveText('Staging');
  await page.keyboard.press('Escape');
  await expect(page.locator('#ag-menu')).toBeFocused();
});

test('mobile: the sheet keeps a bad amount open with a reason, then sends', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blueprints/mobile/');
  await page.click('#mb-add');
  await expect(page.locator('#mb-sheet')).toBeVisible();
  await page.getByRole('radio', { name: 'In 30 days' }).click();
  await expect(page.locator('#mb-sheet')).toBeVisible();
  await page.getByRole('button', { name: 'Send invoice' }).click();
  await expect(page.locator('#mb-amount-hint')).toHaveText('Enter an amount, for example 250.00.');
  await expect(page.locator('#mb-sheet')).toBeVisible();
  await page.fill('#mb-amount', '250');
  await page.selectOption('#mb-client', 'Kestrel Labs');
  await page.getByRole('button', { name: 'Send invoice' }).click();
  await expect(page.locator('#mb-sheet')).toBeHidden();
  await expect(page.locator('#mb-toast')).toHaveText('Invoice sent to Kestrel Labs');
  await expect(page.locator('#mb-add')).toBeFocused();
});

test('mobile: the large title hands over to the bar; the app stays a phone column on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/blueprints/mobile/');
  await expect(page.locator('.lt-appbar')).not.toHaveAttribute('data-scrolled', '');
  await page.locator('.mb-app').evaluate((el) => { el.scrollTop = 200; });
  await expect(page.locator('.lt-appbar')).toHaveAttribute('data-scrolled', '');
  await page.setViewportSize({ width: 1440, height: 900 });
  expect((await page.locator('.mb-app').boundingBox())!.width).toBeLessThanOrEqual(430);
});

test('venue: a weekday has no tastings, a weekend answers with places left', async ({ page }) => {
  await page.goto('/blueprints/venue/');
  const result = page.locator('.lt-booking [data-part="result"]');
  await page.locator('.lt-booking .lt-date input').fill('25/11/2026'); await page.locator('.lt-booking .lt-date input').blur();
  await page.getByRole('button', { name: 'Check availability' }).click();
  await expect(result).toHaveText('No tastings on Wednesday 25 November. They run on Saturdays and Sundays.');
  await page.locator('.lt-booking .lt-date input').fill('28/11/2026'); await page.locator('.lt-booking .lt-date input').blur();
  await page.getByRole('button', { name: 'Check availability' }).click();
  await expect(result).toHaveText(/^Saturday 28 November at 12:00: \d places left\. 2 held for 10 minutes while you pay\.$/);
  await expect(page.locator('.lt-visit tr[data-today]')).toHaveCount(1);
  // Every link on the page goes somewhere real.
  const dead = await page.$$eval('a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')!).filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));
  expect(dead).toEqual([]);
});

test('inbox: open a conversation, search the list, send a reply', async ({ page }) => {
  await page.goto('/blueprints/inbox/');
  await page.locator('[data-conv="1"]').click();
  await expect(page.locator('#ib-subject')).toHaveText('Export stops at 10,000 rows');
  await expect(page.locator('[data-conv="1"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-conv="1"]')).not.toHaveAttribute('data-unread', '');
  await page.fill('#ib-search', 'alert');
  await expect(page.locator('#ib-convs li:visible')).toHaveCount(1);
  await page.fill('#ib-search', 'zzz');
  await expect(page.locator('#ib-nomatch')).toBeVisible();
  await page.fill('#ib-search', '');
  await page.fill('#ib-input', 'The limit is 10,000 rows on Team. I have raised yours to 50,000.');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('.lt-chat [data-part="group"]').last()).toContainText('I have raised yours to 50,000.');
  await page.click('#ib-close');
  await expect(page.locator('#ib-status')).toContainText('Closed');
});

test('inbox: one pane at a time on a phone, with a way back', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blueprints/inbox/');
  await expect(page.locator('.ib-list')).toBeVisible();
  await expect(page.locator('.ib-thread')).toBeHidden();
  await page.locator('[data-conv="2"]').click();
  await expect(page.locator('.ib-thread')).toBeVisible();
  await expect(page.locator('.ib-list')).toBeHidden();
  await page.click('#ib-back');
  await expect(page.locator('.ib-list')).toBeVisible();
});

test('calculator: the answer follows the inputs', async ({ page }) => {
  await page.goto('/blueprints/calculator/');
  const monthly = page.locator('#ca-monthly');
  await expect(monthly).toHaveText('£1,591');
  await page.fill('#ca-deposit-in', '100000'); await page.locator('#ca-deposit-in').blur();
  await expect(page.locator('#ca-loan')).toHaveText('£225,000');
  await expect(page.locator('#ca-ltv')).toHaveText('69%');
  await expect(monthly).toHaveText('£1,296');
  await expect(page.locator('#ca-deposit-hint')).toHaveText('31% of the price.');
  await page.locator('#ca-term-in').fill('30');
  await expect(page.locator('#ca-summary')).toContainText('over 30 years');
  await expect(monthly).toHaveText('£1,187');
  await page.getByRole('radio', { name: 'Interest only' }).click();
  await expect(monthly).toHaveText('£909');
  await expect(page.locator('#ca-summary')).toContainText('still owed at the end');
  await expect(page.locator('#ca-chart figure.lt-chart')).toHaveCount(1);
});

test('episode: a chapter seeks the player and becomes the current one', async ({ page }) => {
  await page.goto('/blueprints/episode/');
  await page.locator('[data-seek="612"]').click();
  await expect(page.locator('#ep-player [data-part="now"]')).toHaveText('10:12');
  await expect(page.locator('[data-seek="612"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#ep-chapters [aria-current]')).toHaveCount(1);
  await page.locator('#ep-player [data-part="seek"]').focus();
  await page.keyboard.press('End');
  await expect(page.locator('[data-seek="1560"]')).toHaveAttribute('aria-current', 'true');
});

// ---- subject pages: a practice, a cause, a shop, an event
const deadAnchors = (page: import('@playwright/test').Page) => page.$$eval('a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')!).filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));

test('practice: the price leads, the fees are tiles, the plan is a document, open-now is large', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/blueprints/practice/');
  await expect(page.locator('#top [data-part="figure"]')).toHaveText('£68');
  await expect(page.locator('#fees .lt-bento [data-part="figure"]')).toHaveCount(6);
  const big = await page.$$eval('#fees [data-part="figure"]', (els) => Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize))));
  expect(big).toBeGreaterThanOrEqual(44);
  await expect(page.locator('#first-visit li')).toHaveCount(3);
  await expect(page.locator('#first-visit .lt-invoice [data-part="total"] td')).toHaveText('£258.00');
  const now = page.locator('.lt-visit [data-part="now"]');
  await expect(now).not.toBeEmpty();
  expect(await now.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(44);
  // The find-us band is dark inside a light page: its ground is darker than the page's.
  const grounds = await page.evaluate(() => [document.body, document.querySelector('#visit')!].map((e) => getComputedStyle(e).backgroundColor));
  expect(grounds[0]).not.toEqual(grounds[1]);
  await expect(page.locator('.lt-visit tr[data-today]')).toHaveCount(1);
  await expect(page.locator('header .pr-tel')).toHaveAttribute('href', /^tel:\+44/);
  expect(await deadAnchors(page)).toEqual([]);
});

test('cause: the money bar adds up to a pound and sections are numbered', async ({ page }) => {
  await page.goto('/blueprints/cause/');
  const parts = await page.$$eval('.cs-bar span', (els) => els.map((e) => parseInt(e.textContent ?? '0', 10)));
  expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  const widths = await page.$$eval('.cs-bar span', (els) => els.map((e) => e.getBoundingClientRect().width));
  expect(widths[0]).toBeGreaterThan(widths[1] * 5);
  // Sections stand on their own: no small label over the headings, no rules between sections.
  await expect(page.locator('main > section:not([class*="hero"]) > header > [data-part="eyebrow"]')).toHaveCount(0);
  expect(await page.locator('main').getAttribute('data-separators')).toBeNull();
  await expect(page.locator('h1')).toHaveText(/410 households/);
  expect(await deadAnchors(page)).toEqual([]);
});

test('shop: three pieces at one ratio with prices, facts as ruled rows', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/blueprints/shop/');
  const ratios = await page.$$eval('.lt-offers .lt-art', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return Math.round((r.width / r.height) * 100); }));
  expect(ratios.length).toBe(3);
  expect(new Set(ratios).size).toBe(1);
  await expect(page.locator('.lt-offers [data-part="foot"] b')).toHaveText(['£28', '£24', '£64']);
  await expect(page.locator('.sh-facts > div')).toHaveCount(6);
  expect(await deadAnchors(page)).toEqual([]);
});

test('event: the programme is timed rows on one grid, three tickets, the date is a <time>', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/blueprints/event/');
  const names = await page.$$eval('#programme li h3', (els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(names.length).toBe(8);
  expect(new Set(names).size).toBe(1);
  const times = await page.$$eval('#programme [data-part="when"]', (els) => els.map((e) => e.textContent));
  expect(times.every((t) => /^\d\d:\d\d$/.test(t ?? ''))).toBe(true);
  await expect(page.locator('#tickets [data-part="tier"]')).toHaveCount(3);
  await expect(page.locator('.lt-hero-statement time').first()).toHaveAttribute('datetime', '2027-05-14');
  // Speakers are ruled rows: names share one left edge, talks share another, and no tiles are shown.
  const rows = await page.$$eval('#speakers li', (lis) => ({ names: new Set(lis.map((li) => Math.round(li.querySelector('strong')!.getBoundingClientRect().left))).size, talks: new Set(lis.map((li) => Math.round(li.querySelector('p')!.getBoundingClientRect().left))).size, tiles: lis.filter((li) => getComputedStyle(li.querySelector('[data-part="avatar"]')!).display !== 'none').length }));
  expect(rows).toEqual({ names: 1, talks: 1, tiles: 0 });
  expect(await deadAnchors(page)).toEqual([]);
});

