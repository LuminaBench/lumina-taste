// The React implementations: every component mounts under StrictMode and its behaviour is wired.
import { expect, test } from '@playwright/test';

test('every React component mounts without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/_react/');
  const cases = page.locator('[data-case]');
  await expect(cases.first()).toBeVisible();
  expect(await cases.count()).toBeGreaterThanOrEqual(80);
  const empty = await page.$$eval('[data-case]', (els) => els.filter((e) => e.children.length < 2).map((e) => e.getAttribute('data-case')));
  expect(empty).toEqual([]);
  expect(errors).toEqual([]);
});

test('React wrappers forward behaviour and events', async ({ page }) => {
  await page.goto('/_react/');
  const log = () => page.evaluate(() => (window as unknown as { __ltLog: string[] }).__ltLog.join('\n'));
  await page.locator('[data-case="disclosure"] [data-part="trigger"]').click();
  await page.locator('[data-case="segmented"] [data-value="d"]').click();
  await page.locator('[data-case="pagination"] [data-part="next"]').click();
  await page.locator('[data-case="combobox"] input').fill('tok');
  await page.keyboard.press('Enter');
  await expect.poll(log).toContain('disclosure:true');
  await expect.poll(log).toContain('segmented:d');
  await expect.poll(log).toContain('page:4');
  await expect.poll(log).toContain('combobox:tok');
  // Idiomatic-React data table sorts
  await page.locator('[data-case="table"] th button').first().click();
  await expect(page.locator('[data-case="table"] th').nth(1)).toHaveAttribute('aria-sort', 'ascending');
  // Controlled dialog
  await page.locator('[data-open="dialog"]').click();
  await expect(page.locator('[data-case="dialogs"] dialog.lt-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(log).toContain('dialog:false');
  // Dropdown item via keyboard
  await page.locator('[data-case="dropdown"] [data-part="trigger"]').click();
  await page.keyboard.press('Enter');
  await expect.poll(log).toContain('dropdown:Rename');
});
