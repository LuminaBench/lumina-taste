// The app blueprints (banking, fitness, booking, messaging, settings) on a phone and on a wide screen: the
// shell's screens, tabs and panes, and the new parts working in place (number pad, date strip and slots,
// composer, settings search, activity rings).
import { expect, test, type Page } from '@playwright/test';

const APPS = { banking: ['home', 'payment'], fitness: ['today', 'workout'], booking: ['bookings', 'booking'], messaging: ['chats', 'thread'], settings: ['settings', 'notifications'] } as const;
const phone = { width: 390, height: 844 };
/** Open an app screen and wait for the shell (a module script) to have taken over. */
const open = async (page: Page, url: string) => { await page.goto(url); const want = new URL(url, 'http://x').searchParams.get('screen'); if (want) await page.waitForFunction((w) => document.body.dataset.screen === w, want); else await page.waitForLoadState('load'); };
const shown = (page: Page) => page.$$eval('.as-screen', (els) => els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => (e as HTMLElement).dataset.screen));

for (const [app, [list, detail]] of Object.entries(APPS)) {
  test(`${app}: welcome, then the first useful screen; one screen on a phone, list and record side by side when wide`, async ({ page }) => {
    await page.setViewportSize(phone);
    await open(page, `/blueprints/app-${app}/`);
    expect(await shown(page)).toEqual(['welcome']);
    await expect(page.locator('.as-tabs')).toBeHidden();
    await page.locator('#screen-welcome .lt-btn[data-variant="primary"]').click();
    await expect.poll(() => shown(page)).toHaveLength(1);
    await expect(page.locator('.as-tabs')).toBeVisible();
    // Tabs: four at most, each with a label under its icon, the current one marked.
    const tabs = await page.$$eval('.as-tabs a', (as) => as.map((a) => ({ label: a.textContent!.trim(), icon: !!a.querySelector('svg'), h: a.getBoundingClientRect().height })));
    expect(tabs.length).toBeLessThanOrEqual(4);
    for (const t of tabs) { expect(t.label.length).toBeGreaterThan(2); expect(t.icon).toBe(true); expect(t.h).toBeGreaterThanOrEqual(44); }
    await expect(page.locator('.as-tabs a[aria-current="page"]')).toHaveCount(1);
    // A record on a phone hides the tab bar; on a wide screen it opens beside its list.
    await open(page, `/blueprints/app-${app}/?screen=${detail}`);
    expect(await shown(page)).toEqual([detail]);
    await expect(page.locator('.as-tabs')).toBeHidden();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => shown(page)).toEqual(expect.arrayContaining([list, detail]));
    await expect(page.locator('.as-side')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
  test(`${app}: loading, empty and error each have a view on the first useful screen`, async ({ page }) => {
    await page.setViewportSize(phone);
    for (const s of ['loading', 'empty', 'error']) {
      await open(page, `/blueprints/app-${app}/?state=${s}`);
      expect(await shown(page)).toEqual([list === 'settings' ? 'invoices' : list]);
      await expect(page.locator(`[data-view="${s}"]`).first()).toBeVisible();
      if (s !== 'loading') await expect(page.locator(`[data-view="${s}"] .lt-art`)).toBeVisible();
    }
  });
}

test('banking: the number pad builds the amount on the button; freezing the card frosts it', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-banking/?screen=home');
  await page.locator('#bk-send').click();
  const go = page.locator('#bk-send-go');
  await expect(go).toBeDisabled();
  for (const k of ['4', '0', '.', '5']) await page.locator(`#bk-pad [data-key="${k}"]`).click();
  await expect(page.locator('#bk-pad [data-part="value"]')).toHaveText('40.5');
  await expect(go).toHaveText('Send £40.50 to Priya');
  await page.keyboard.press('Backspace');
  await expect(page.locator('#bk-pad [data-part="value"]')).toHaveText('40.');
  await page.locator('.bk-to [data-name="Sam Okafor"]').click();
  await expect(go).toHaveText('Send £40.00 to Sam');
  await page.locator('#bk-pad [data-key="0"]').focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace');
  await page.keyboard.type('5000');
  await expect(page.locator('#bk-pad [data-part="value"]')).toHaveText('5,000');
  await expect(page.locator('#bk-pad')).toHaveAttribute('data-over', '');
  await expect(go).toBeDisabled();
  await open(page, '/blueprints/app-banking/?screen=card');
  await page.locator('#bk-freeze').check();
  await expect(page.locator('#bk-card')).toHaveAttribute('data-frozen', '');
});

test('booking: days skip the full ones by keyboard; the sheet repeats every choice', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-booking/?screen=book');
  const day = page.locator('#bo-days [aria-checked="true"]');
  await expect(day).toHaveAttribute('data-date', '2026-12-04');
  await day.focus();
  await page.keyboard.press('ArrowLeft');
  // Thursday 3 is full, so the arrow lands on Wednesday 2.
  await expect(page.locator('#bo-days [aria-checked="true"]')).toHaveAttribute('data-date', '2026-12-02');
  await page.locator('#bo-services [data-value="bath"]').click();
  await page.locator('#bo-slots [data-part="slot"]', { hasText: '13:00' }).click();
  await expect(page.locator('#bo-review')).toHaveText('Book 13:00');
  await page.locator('#bo-review').click();
  await expect(page.locator('#bo-c-when')).toHaveText('Wednesday 2 December');
  await expect(page.locator('#bo-c-time')).toHaveText('13:00 to 14:00');
  await expect(page.locator('#bo-c-what')).toHaveText('Bath and brush for Biscuit');
});

test('messaging: Send wakes only with text; a sent message joins your run and takes the read state', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-messaging/?screen=thread');
  const send = page.locator('.lt-composer [data-part="send"]');
  await expect(send).toBeDisabled();
  await page.locator('.lt-composer textarea').fill('See you at 10');
  await expect(send).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(page.locator('#ms-log > li').last().locator('[data-part="bubble"]').last()).toHaveText('See you at 10');
  await expect(page.locator('#ms-log [data-part="status"]')).toHaveCount(1);
  await expect(send).toBeDisabled();
  // The composer sits above the home indicator, never under it.
  const box = (await page.locator('.lt-composer').boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(844 + 1);
});

test('settings: search filters as you type and says when nothing matches; closing asks for a typed word', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-settings/?screen=settings');
  const q = page.locator('#se-groups [data-part="search"] input');
  await q.fill('late');
  const rows = page.locator('#se-groups [data-part="row"]:visible');
  await expect(rows).toHaveCount(2);
  await expect(page.locator('#se-groups mark').first()).toHaveText(/late/i);
  await q.fill('zebra');
  await expect(page.locator('#se-groups [data-part="empty"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#se-groups [data-part="row"]:visible')).not.toHaveCount(0);
  await open(page, '/blueprints/app-settings/?screen=close');
  await expect(page.locator('#se-close')).toBeDisabled();
  await page.locator('#se-confirm').fill('close');
  await expect(page.locator('#se-close')).toBeEnabled();
});

test('fitness: the rings show the true numbers; Pause holds the timer and says Resume', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-fitness/?screen=today');
  await expect(page.locator('.lt-rings dd b')).toHaveText(['430', '18', '9']);
  await open(page, '/blueprints/app-fitness/?screen=workout');
  await page.locator('#ft-pause').click();
  await expect(page.locator('#ft-pause')).toHaveAttribute('aria-pressed', 'true');
  const t = await page.locator('#ft-time').textContent();
  await page.waitForTimeout(1300);
  await expect(page.locator('#ft-time')).toHaveText(t!);
  await expect(page.locator('#ft-pause')).toHaveText(/Resume/);
});

// ------------------------------------------------------------------ native motion and feel (shared shell)
test('shell: a push slides, a tab cross-fades, and back returns focus to the row that opened the record, with the list where it was', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-banking/?screen=home');
  const scroller = page.locator('#screen-home .as-scroll');
  await scroller.evaluate((el) => { el.scrollTop = 420; });
  const row = page.locator('[data-pay="books"]');
  await row.click();
  // The push runs as a view transition named by its direction.
  expect(await page.evaluate(() => document.documentElement.dataset.nav)).toBe('forward');
  await page.waitForFunction(() => document.body.dataset.screen === 'payment' && !document.documentElement.dataset.nav);
  await expect(page.locator('#pay-h')).toBeFocused();
  await page.locator('#screen-payment [data-part="back"]').click();
  expect(await page.evaluate(() => document.documentElement.dataset.nav)).toBe('back');
  await page.waitForFunction(() => document.body.dataset.screen === 'home' && !document.documentElement.dataset.nav);
  await expect(row).toBeFocused();
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
  await page.locator('.as-tabs a[href="#screen-card"]').click();
  expect(await page.evaluate(() => document.documentElement.dataset.nav)).toBe('tab');
});

test('shell: under reduced motion every change is instant', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-banking/?screen=home');
  await page.locator('[data-pay="coffee"]').click();
  expect(await page.evaluate(() => [document.body.dataset.screen, document.documentElement.dataset.nav ?? ''])).toEqual(['payment', '']);
});

test('messaging: a chat swipes towards the start to show Mute and Archive; the More button is the keyboard path', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-messaging/?screen=chats');
  const first = page.locator('#ms-chats [data-part="row"]').first();
  const box = (await first.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width * 0.7 - i * 25, box.y + box.height / 2);
  await page.mouse.up();
  await expect(first).toHaveAttribute('data-open', '');
  // The drag did not open the chat underneath.
  expect(await page.evaluate(() => document.body.dataset.screen)).toBe('chats');
  // Keyboard: the row's More button opens the same actions and moves focus into them.
  const second = page.locator('#ms-chats [data-part="row"]').nth(1);
  await second.locator('[data-part="more"]').focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('data-open', '');
  await expect(second.locator('[data-action="mute"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#ms-chats [data-part="row"]')).toHaveCount(5);
  await expect(page.locator('.as-toast')).toHaveText('Climbing on Thursday archived');
});

test('banking: pull to refresh has a Refresh button that does the same; a new payment arrives at the top', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-banking/?screen=home');
  await page.locator('#bk-pull [data-part="refresh"]').click();
  await expect(page.locator('#bk-pull')).toHaveAttribute('data-state', 'refreshing');
  await expect(page.locator('#bk-pull [data-part="when"]')).toHaveText('Updated 09:41');
  await expect(page.locator('#bk-today > li').first()).toContainText('Fernhill Bakery');
  // The charts and marks in the list are not turned by the indicator's own styles.
  expect(await page.locator('#bk-chart svg').first().evaluate((s) => getComputedStyle(s).rotate)).toBe('none');
});

test('sheets: the whole sheet drags down to close once its content is at the top, and focus goes back', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page, '/blueprints/app-booking/?screen=book');
  await page.locator('#bo-review').click();
  const sheet = page.locator('#bo-sheet');
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(400);
  const head = (await sheet.locator('.as-sheet-head h2').boundingBox())!;
  await page.mouse.move(head.x + 20, head.y + 8);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(head.x + 20, head.y + 8 + i * 30);
  expect(await sheet.evaluate((d) => d.hasAttribute('data-dragging'))).toBe(true);
  await page.mouse.up();
  await expect(sheet).toBeHidden();
  await expect(page.locator('#bo-review')).toBeFocused();
});
