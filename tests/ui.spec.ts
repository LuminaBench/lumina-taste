// Gallery-level tests for every vanilla UI pattern: render, focus ring, click-through and
// per-component keyboard/pointer behaviour.
import { expect, test, type Page } from '@playwright/test';

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
};
const card = (page: Page, id: string) => page.locator(`#ui-${id} [data-stage]`);
const solo = async (page: Page, id: string) => { await page.goto(`/#/ui/${id}`); await expect(page.locator(`#ui-${id}`)).toBeVisible(); return card(page, id); };

test('all 80+ patterns render with non-empty stages and no errors', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/#/ui');
  const cards = page.locator('.g-card');
  expect(await cards.count()).toBeGreaterThanOrEqual(80);
  const empty = await page.$$eval('[data-stage]', (stages) =>
    stages.filter((s) => { const r = s.getBoundingClientRect(); return r.height < 60 || !s.firstElementChild || (s.firstElementChild as HTMLElement).getBoundingClientRect().height < 8; }).map((s) => s.closest('[data-id]')!.getAttribute('data-id')));
  expect(empty).toEqual([]);
  expect(errors).toEqual([]);
});

test('every pattern re-skins across all 36 palette × mode themes', async ({ page }) => {
  await page.goto('/#/ui');
  const result = await page.evaluate(async () => {
    const html = document.documentElement;
    const ids = [...document.querySelectorAll<HTMLOptionElement>('#g-palette option')].map((o) => o.value);
    const seen = new Set<string>();
    for (const id of ids) for (const mode of ['light', 'dark']) {
      html.dataset.palette = id; html.dataset.mode = mode;
      const cs = getComputedStyle(html);
      seen.add(`${cs.getPropertyValue('--bg-canvas')}|${cs.getPropertyValue('--accent-solid')}`);
    }
    return { themes: ids.length * 2, distinct: seen.size };
  });
  expect(result.themes).toBe(36);
  expect(result.distinct).toBe(36);
});

test('keyboard focus is visible on the first control of every stage', async ({ page }) => {
  await page.goto('/#/ui');
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  // Tag the first keyboard-focusable control of each stage, then compare pixels before/after focus.
  const ids = await page.evaluate(() => {
    const out: string[] = [];
    for (const stage of document.querySelectorAll<HTMLElement>('[data-stage]')) {
      const el = stage.querySelector<HTMLElement>('button:not([disabled]):not([tabindex="-1"]), a[href], input:not([type="hidden"]):not([disabled]), [tabindex="0"]');
      if (!el || el.offsetParent === null) continue;
      const id = stage.closest('[data-id]')!.getAttribute('data-id')!;
      el.setAttribute('data-focus-probe', id);
      out.push(id);
    }
    return out;
  });
  const missing: string[] = [];
  for (const id of ids) {
    const el = page.locator(`[data-focus-probe="${id}"]`);
    await el.scrollIntoViewIfNeeded();
    const box = (await el.boundingBox())!;
    const clip = { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.width + 16, height: box.height + 16 };
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    const before = await page.screenshot({ clip });
    await el.evaluate((n: HTMLElement) => n.focus({ focusVisible: true } as FocusOptions));
    const after = await page.screenshot({ clip });
    if (before.equals(after)) missing.push(id);
  }
  expect(missing).toEqual([]);
});

test('clicking every visible control in every stage never throws', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/#/ui');
  const ids = await page.$$eval('.g-card', (c) => c.map((x) => x.getAttribute('data-id')!));
  for (const id of ids) {
    const buttons = card(page, id).locator('button:visible');
    const n = Math.min(await buttons.count(), 8);
    for (let i = 0; i < n; i++) {
      const b = buttons.nth(i);
      if (!(await b.isEnabled()) || !(await b.isVisible())) continue;
      await b.click({ timeout: 2000, trial: false }).catch(() => {});
      await page.keyboard.press('Escape');
    }
  }
  expect(errors).toEqual([]);
});

test.describe('controls', () => {
  test('accordion: single open, arrow keys move', async ({ page }) => {
    const s = await solo(page, 'accordion');
    const t = s.locator('[data-part="trigger"]');
    await t.nth(1).click();
    await expect(t.nth(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(t.nth(0)).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('ArrowDown');
    await expect(t.nth(2)).toBeFocused();
  });
  test('disclosure chevron rotates and reveals', async ({ page }) => {
    const s = await solo(page, 'disclosure-chevron');
    await s.locator('[data-part="trigger"]').click();
    await expect(s.locator('[data-part="panel"]')).toHaveAttribute('data-state', 'open');
  });
  test('tree view: Right expands, Down moves', async ({ page }) => {
    const s = await solo(page, 'tree-view');
    await s.locator('[role="treeitem"]').first().focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('[role="treeitem"]').nth(1)).toHaveAttribute('aria-expanded', 'true');
  });
  test('theme switch flips data-mode', async ({ page }) => {
    const s = await solo(page, 'theme-switch');
    const before = await page.evaluate(() => document.documentElement.dataset.mode);
    await s.locator('.lt-theme-switch').click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.mode)).not.toBe(before);
  });
  test('segmented control: arrows select', async ({ page }) => {
    const s = await solo(page, 'segmented-control');
    await s.locator('[aria-checked="true"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('[data-value="1m"]')).toHaveAttribute('aria-checked', 'true');
  });
  test('checkbox: select all goes indeterminate', async ({ page }) => {
    const s = await solo(page, 'checkbox');
    expect(await s.locator('[data-part="all"] input').evaluate((i: HTMLInputElement) => i.indeterminate)).toBe(true);
    await s.locator('[data-part="all"]').click();
    await expect(s.locator('.lt-check:not([data-part="all"]) input:not(:disabled)').first()).toBeChecked();
  });
  test('otp: typing advances and paste fills', async ({ page }) => {
    const s = await solo(page, 'otp-input');
    const inputs = s.locator('input');
    await inputs.first().click();
    await page.keyboard.type('12');
    await expect(inputs.nth(2)).toBeFocused();
    await inputs.first().evaluate((el) => {
      const dt = new DataTransfer(); dt.setData('text', '987654');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(inputs.nth(5)).toHaveValue('4');
    await expect(s.locator('.lt-otp')).toHaveAttribute('data-state', 'complete');
  });
  test('range slider: keyboard steps update the bubble', async ({ page }) => {
    const s = await solo(page, 'range-slider');
    await s.locator('input').focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('[data-part="readout"]')).toHaveText('51%');
  });
  test('dual range: thumbs never cross', async ({ page }) => {
    const s = await solo(page, 'dual-range-slider');
    const [lo, hi] = [s.locator('input').nth(0), s.locator('input').nth(1)];
    await lo.focus();
    await page.keyboard.press('End');
    expect(+(await lo.inputValue())).toBeLessThanOrEqual(+(await hi.inputValue()) - 50);
  });
  test('button: loading keeps width', async ({ page }) => {
    const s = await solo(page, 'button');
    const b = s.locator('[data-demo-load]');
    const w = (await b.boundingBox())!.width;
    await b.click();
    await expect(b).toHaveAttribute('data-loading', '');
    expect(Math.abs((await b.boundingBox())!.width - w)).toBeLessThan(0.5);
  });
  test('split button menu opens with ArrowDown and closes on Escape', async ({ page }) => {
    const s = await solo(page, 'split-button');
    await s.locator('[data-part="toggle"]').focus();
    await page.keyboard.press('ArrowDown');
    await expect(s.locator('[role="menuitem"]').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-part="menu"]')).toBeHidden();
  });
  test('copy button morphs to Copied', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const s = await solo(page, 'copy-button');
    await s.locator('.lt-copy').click();
    await expect(s.locator('[data-part="text"]')).toHaveText('Copied');
  });
  test('tag input: Enter adds, Backspace removes', async ({ page }) => {
    const s = await solo(page, 'tag-input');
    const input = s.locator('input');
    await input.fill('new@studio.io');
    await page.keyboard.press('Enter');
    await expect(s.locator('[data-part="tag"]')).toHaveCount(6);
    await page.keyboard.press('Backspace');
    await expect(s.locator('[data-part="tag"]')).toHaveCount(5);
  });
  test('text field validates on blur', async ({ page }) => {
    const s = await solo(page, 'text-field');
    await s.locator('#lt-tf-email').fill('nope');
    await page.keyboard.press('Tab');
    await expect(s.locator('.lt-field').first()).toHaveAttribute('data-state', 'invalid');
    await s.locator('#lt-tf-email').fill('ana@studio.io');
    await expect(s.locator('.lt-field').first()).toHaveAttribute('data-state', 'valid');
  });
  test('date range picker: arrows + Enter pick a range', async ({ page }) => {
    const s = await solo(page, 'date-range-picker');
    await s.locator('[data-part="trigger"]').click();
    await expect(s.locator('[role="grid"] [tabindex="0"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await s.locator('[data-part="apply"]').click();
    await expect(s.locator('[data-part="value"]')).toHaveText('Nov 10 – Nov 12, 2026');
  });
  test('combobox filters and selects with Enter', async ({ page }) => {
    const s = await solo(page, 'combobox');
    await s.locator('input').fill('tok');
    await page.keyboard.press('Enter');
    await expect(s.locator('input')).toHaveValue('Tokyo');
  });
  test('number stepper respects limits', async ({ page }) => {
    const s = await solo(page, 'number-stepper');
    await s.locator('input').fill('50');
    await s.locator('input').blur();
    await expect(s.locator('[data-part="inc"]')).toBeDisabled();
  });
});

test.describe('navigation', () => {
  test('navbar mega dropdown opens on click and Esc closes', async ({ page }) => {
    const s = await solo(page, 'navbar-mega');
    await s.locator('[data-part="mega-trigger"]').click();
    await expect(s.locator('[data-part="mega"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-part="mega"]')).toBeHidden();
  });
  test('sidebar collapses', async ({ page }) => {
    const s = await solo(page, 'app-sidebar');
    await s.locator('[data-part="collapse"]').click();
    await expect(s.locator('.lt-sidebar')).toHaveAttribute('data-collapsed', '');
  });
  test('waffle grid: ArrowDown jumps a row', async ({ page }) => {
    const s = await solo(page, 'waffle-launcher');
    await s.locator('[data-part="trigger"]').click();
    await page.keyboard.press('ArrowDown');
    await expect(s.locator('[role="menuitem"]').nth(3)).toBeFocused();
  });
  test('account menu selects and closes', async ({ page }) => {
    const s = await solo(page, 'account-menu');
    await s.locator('[data-part="trigger"]').click();
    await s.locator('[role="menuitem"]').first().click();
    await expect(s.locator('[data-part="menu"]')).toBeHidden();
  });
  test('tabs: arrow switches panel', async ({ page }) => {
    const s = await solo(page, 'tabs');
    await s.locator('[role="tab"]').first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('#lt-tabp-2')).toBeVisible();
  });
  test('pagination moves pages', async ({ page }) => {
    const s = await solo(page, 'pagination');
    await s.locator('[data-part="next"]').click();
    await expect(s.locator('[aria-current="page"]')).toHaveText('7');
  });
  test('stepper wizard advances', async ({ page }) => {
    const s = await solo(page, 'stepper-wizard');
    await s.locator('[data-part="next"]').click();
    await expect(s.locator('[data-part="step"]').nth(2)).toHaveAttribute('aria-current', 'step');
  });
  test('breadcrumbs collapse when narrow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const s = await solo(page, 'breadcrumbs');
    await expect(s.locator('[data-part="more"]')).toBeVisible();
    await s.locator('[data-part="more"]').click();
    await expect(s.locator('li[data-collapsed]')).toHaveCount(0);
  });
});

test.describe('feedback', () => {
  test('odometer rolls to a new value', async ({ page }) => {
    const s = await solo(page, 'odometer');
    const before = await s.locator('.lt-odometer').getAttribute('data-value');
    await s.locator('[data-part="bump"]').click();
    await expect(s.locator('.lt-odometer')).not.toHaveAttribute('data-value', before!);
  });
  test('toast appears and dismisses on Escape', async ({ page }) => {
    const s = await solo(page, 'toast-stack');
    await s.locator('[data-toast="positive"]').click();
    await expect(page.locator('.lt-toasts [data-part="toast"]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('.lt-toasts [data-part="toast"]')).toHaveCount(0);
  });
  test('count-up reaches its target', async ({ page }) => {
    const s = await solo(page, 'count-up');
    await expect(s.locator('.lt-countup').first()).toHaveText('£24.4k', { timeout: 4000 });
  });
});

test.describe('overlays', () => {
  test('command palette: ⌘K, filter, Enter', async ({ page }) => {
    const s = await solo(page, 'command-palette');
    await page.keyboard.press('ControlOrMeta+k');
    await expect(s.locator('dialog')).toBeVisible();
    await page.keyboard.type('settings');
    await expect(s.locator('[role="option"]:not([hidden])')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(s.locator('dialog')).toBeHidden();
  });
  test('dropdown submenu opens with ArrowRight', async ({ page }) => {
    const s = await solo(page, 'dropdown-menu');
    await s.locator('[data-part="trigger"]').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('[data-part="submenu"] [role="menuitem"]').first()).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(s.locator('[data-part="submenu"]')).toBeHidden();
  });
  test('context menu opens on right click', async ({ page }) => {
    const s = await solo(page, 'context-menu');
    await s.locator('[data-part="area"]').click({ button: 'right' });
    await expect(s.locator('[data-part="menu"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-part="menu"]')).toBeHidden();
  });
  test('tooltip shows on keyboard focus', async ({ page }) => {
    await solo(page, 'tooltip');
    await page.keyboard.press('Tab'); // skip link etc. — focus first stage button directly instead
    await page.locator('#ui-tooltip [aria-describedby="lt-tt-1"]').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('#lt-tt-1')).toBeVisible();
  });
  test('popover opens and focuses its input', async ({ page }) => {
    const s = await solo(page, 'popover');
    await s.locator('[data-part="anchor"]').click();
    await expect(page.locator('#lt-pop-email')).toBeFocused();
  });
  test('modal dialog opens, Esc closes and focus returns', async ({ page }) => {
    const s = await solo(page, 'modal-dialog');
    await s.locator('[data-part="open"]').click();
    await expect(s.locator('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(s.locator('dialog')).toBeHidden();
    await expect(s.locator('[data-part="open"]')).toBeFocused();
  });
  test('drawer and bottom sheet open and close', async ({ page }) => {
    let s = await solo(page, 'drawer');
    await s.locator('[data-part="open"]').click();
    await expect(s.locator('dialog')).toBeVisible();
    await s.locator('[data-part="close"]').click();
    await expect(s.locator('dialog')).toBeHidden();
    s = await solo(page, 'bottom-sheet');
    await s.locator('[data-part="open"]').click();
    await expect(s.locator('dialog')).toBeVisible();
    await s.locator('[data-part="cancel"]').click();
    await expect(s.locator('dialog')).toBeHidden();
  });
  test('bulk action bar appears when a row is ticked', async ({ page }) => {
    const s = await solo(page, 'bulk-action-bar');
    await s.locator('tbody .lt-check').nth(1).click();
    await expect(s.locator('[data-part="bar"]')).toBeVisible();
    await expect(s.locator('[data-part="count"]')).toHaveText('1 selected');
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-part="bar"]')).toBeHidden();
  });
  test('query builder adds rules and groups', async ({ page }) => {
    const s = await solo(page, 'query-builder');
    await s.locator('[data-part="add-group"]').first().click();
    await expect(s.locator('[data-part="preview"]')).toContainText('(seats > 10 OR country is "US")');
  });
  test('coach mark tour walks three steps', async ({ page }) => {
    const s = await solo(page, 'coach-mark');
    await s.locator('[data-part="start"]').click();
    await expect(s.locator('[data-part="step"]')).toHaveText('Step 1 of 3');
    await s.locator('[data-part="next"]').click();
    await s.locator('[data-part="next"]').click();
    await s.locator('[data-part="next"]').click();
    await expect(s.locator('[data-part="layer"]')).toBeHidden();
  });
});

test.describe('data', () => {
  test('data table sorts with aria-sort and expands rows', async ({ page }) => {
    const s = await solo(page, 'data-table');
    await s.locator('[data-sort="name"]').click();
    await expect(s.locator('th').nth(1)).toHaveAttribute('aria-sort', 'ascending');
    await expect(s.locator('tbody tr[data-row] [data-k="name"]').first()).toHaveText('Halyard');
    await s.locator('[data-sort="mrr"]').click();
    await expect(s.locator('tbody tr[data-row] [data-k="mrr"]').first()).toHaveText('£390');
    await s.locator('[data-part="expand"]').first().click();
    await expect(s.locator('tr[data-detail]').first()).toBeVisible();
  });
  test('virtual list renders a window and End reaches row 10,000', async ({ page }) => {
    const s = await solo(page, 'virtual-list');
    expect(await s.locator('[role="option"]').count()).toBeLessThan(40);
    await s.locator('.lt-vlist').focus();
    await page.keyboard.press('End');
    await expect(s.locator('[aria-posinset="10000"]')).toBeVisible();
  });
  test('split pane resizes with arrows', async ({ page }) => {
    const s = await solo(page, 'split-pane');
    await s.locator('[data-part="grip"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('[data-part="grip"]')).toHaveAttribute('aria-valuenow', '44');
  });
  test('sortable list reorders by keyboard', async ({ page }) => {
    const s = await solo(page, 'sortable-list');
    await s.locator('[data-part="handle"]').first().focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await expect(s.locator('li span').first()).toHaveText('Active accounts');
  });
  test('filter bar removes and resets chips', async ({ page }) => {
    const s = await solo(page, 'filter-bar');
    await s.locator('[data-part="chip"]').first().click();
    await expect(s.locator('[data-part="chip"]')).toHaveCount(1);
    await s.locator('[data-part="reset"]').click();
    await expect(s.locator('[data-part="chip"]')).toHaveCount(2);
  });
});

test('search finds sloppy aliases', async ({ page }) => {
  await page.goto('/#/ui');
  for (const [q, id] of [['rotating arrow', 'disclosure-chevron'], ['9 dots menu', 'waffle-launcher'], ['bar when ticking rows', 'bulk-action-bar'], ['cmd k', 'command-palette']]) {
    await page.fill('#g-q', q);
    await expect(page.locator('.g-card').first()).toHaveAttribute('data-id', id);
  }
});
