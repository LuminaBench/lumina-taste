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
// Detail pages open in a showcase state (menus open, rows ticked); Reset mounts a clean demo.
const solo = async (page: Page, id: string) => {
  await page.goto(`/#/ui/${id}`);
  await expect(page.locator(`#ui-${id}`)).toBeVisible();
  await page.locator('[data-replay]').click();
  await page.waitForTimeout(760); // let the stage finish fitting (150 ms and 700 ms passes)
  return card(page, id);
};

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
  await page.goto('/#/palettes');
  const result = await page.evaluate(async () => {
    const html = document.documentElement;
    const ids = [...document.querySelectorAll<HTMLElement>('.g-pal[data-palette]')].map((o) => o.dataset.palette!);
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
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important} .g-prev-in{transform:none!important;width:auto!important} .g-prev{aspect-ratio:auto!important;min-height:220px;contain:none!important} .g-stretch::after{display:none}' });
  // Grid previews are inert thumbnails; make them live for this check.
  await page.evaluate(() => document.querySelectorAll('[inert]').forEach((n) => n.removeAttribute('inert')));
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
  test.setTimeout(300_000);
  const errors = errorsOf(page);
  await page.goto('/#/ui');
  const ids = await page.$$eval('.g-card', (c) => c.map((x) => x.getAttribute('data-id')!));
  expect(ids.length).toBeGreaterThanOrEqual(80);
  for (const id of ids) {
    await page.evaluate((i) => (location.hash = `#/ui/${i}`), id);
    await expect(page.locator(`#ui-${id}`)).toBeVisible();
    // Snapshot the buttons first: clicks open and close things, so live locators shift under us.
    const handles = (await card(page, id).locator('button:visible').elementHandles()).slice(0, 8);
    for (const h of handles) {
      if (!(await h.isEnabled().catch(() => false))) continue;
      await h.click({ timeout: 800 }).catch(() => {});
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
    // Inside the gallery the switch is contained: it flips the stage, never the page.
    const stage = page.locator('#ui-theme-switch .g-stage');
    const page0 = await page.evaluate(() => document.documentElement.dataset.mode);
    const before = await stage.getAttribute('data-mode');
    await s.locator('.lt-theme-switch').click();
    await expect.poll(() => stage.getAttribute('data-mode')).not.toBe(before);
    expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe(page0);
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
    // Contained demos only take ⌘K while focus is inside their box.
    await s.locator('[data-part="open"]').focus();
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

test.describe('added in 1.0', () => {
  test('rating: arrows change the value and the caption says it', async ({ page }) => {
    const s = await solo(page, 'rating');
    await s.locator('input[value="4"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('input[value="5"]')).toBeChecked();
    await expect(s.locator('[data-part="caption"]')).toHaveText('5 of 5 · Essential');
  });
  test('billing toggle swaps prices', async ({ page }) => {
    const s = await solo(page, 'billing-toggle');
    await s.locator('[data-period="monthly"]').click();
    await expect(s.locator('[data-price]')).toHaveText('£24');
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('[data-price]')).toHaveText('£19');
  });
  test('colour picker: hex field validates and applies', async ({ page }) => {
    const s = await solo(page, 'color-picker');
    const field = s.locator('input[type="text"]');
    await field.fill('#c0623f');
    await expect(s.locator('input[value="#c0623f"]')).toBeChecked();
    await field.fill('nope');
    await field.blur();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
  });
  test('time slots: arrows skip booked slots', async ({ page }) => {
    const s = await solo(page, 'time-slots');
    await s.locator('[aria-checked="true"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('[aria-checked="true"]')).toHaveText('11:30');
    await expect(s.locator('[data-part="summary"]')).toContainText('11:30');
  });
  test('speed dial opens, arrows move, Esc returns focus', async ({ page }) => {
    const s = await solo(page, 'speed-dial');
    const fab = s.locator('[data-part="fab"]');
    await fab.click();
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
    await fab.press('ArrowUp');
    await expect(s.locator('[role="menuitem"]').last()).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(s.locator('[role="menuitem"]').nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(fab).toBeFocused();
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
  });
  test('back to top appears after scrolling and returns', async ({ page }) => {
    const s = await solo(page, 'back-to-top');
    const btn = s.locator('[data-part="button"]');
    await expect(btn).toBeHidden();
    await s.locator('[data-part="scroller"]').evaluate((n) => { n.style.scrollBehavior = 'auto'; n.scrollTop = 500; });
    await expect(btn).toBeVisible();
    await btn.click();
    await expect.poll(() => s.locator('[data-part="scroller"]').evaluate((n) => n.scrollTop)).toBe(0);
  });
  test('drill-down menu goes in and back out', async ({ page }) => {
    const s = await solo(page, 'drilldown-menu');
    await s.locator('[data-target="products"]').click();
    await expect(s.locator('#lt-dd-products')).toBeVisible();
    await expect(s.locator('#lt-dd-products [data-part="back"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-target="products"]')).toBeFocused();
  });
  test('notification centre: mark all as read clears the count', async ({ page }) => {
    const s = await solo(page, 'notification-center');
    await s.locator('[data-part="bell"]').click();
    await expect(s.locator('[data-part="panel"]')).toBeVisible();
    await s.locator('[data-filter="unread"]').click();
    await expect(s.locator('[data-part="item"]:visible')).toHaveCount(3);
    await s.locator('[data-part="all"]').click();
    await expect(s.locator('[data-part="count"]')).toBeHidden();
    await expect(s.locator('[data-part="empty"]')).toBeVisible();
  });
  test('prompt composer: send is disabled until there is text; Cmd+Enter sends', async ({ page }) => {
    const s = await solo(page, 'prompt-composer');
    const send = s.locator('[data-part="send"]');
    await expect(send).toBeDisabled();
    await s.locator('textarea').fill('Summarise churn');
    await expect(send).toBeEnabled();
    await s.locator('textarea').press('ControlOrMeta+Enter');
    await expect(s.locator('textarea')).toHaveValue('');
    await expect(s.locator('[data-part="sent"]')).toContainText('Summarise churn');
  });
  test('kanban: Space, ArrowRight, Space moves a card', async ({ page }) => {
    const s = await solo(page, 'kanban-board');
    const card = s.locator('[data-col="todo"] [data-part="card"]').first();
    await card.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(s.locator('[data-col="doing"] [data-part="card"]')).toHaveCount(3);
    await expect(s.locator('[data-col="doing"] [data-part="n"]')).toHaveText('3');
    await expect(s.locator('[data-part="live"]')).toContainText('Dropped');
  });
  test('image compare follows the range input', async ({ page }) => {
    const s = await solo(page, 'image-compare');
    await s.locator('input[type="range"]').focus();
    await page.keyboard.press('End');
    await expect.poll(() => s.locator('.lt-compare').evaluate((n) => (n as HTMLElement).style.getPropertyValue('--pos'))).toBe('100%');
  });
  test('typewriter keeps the full sentence for screen readers', async ({ page }) => {
    const s = await solo(page, 'typewriter');
    await expect(s.locator('.lt-visually-hidden')).toContainText('dashboards, pricing pages, settings screens and onboarding flows');
  });
});

test('mouse clicks never leave a focus ring or outline box', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/#/ui');
  const ids = await page.$$eval('.g-card', (c) => c.map((x) => x.getAttribute('data-id')!));
  const bad: string[] = [];
  for (const id of ids) {
    await page.evaluate((i) => (location.hash = `#/ui/${i}`), id);
    await expect(page.locator(`#ui-${id}`)).toBeVisible();
    const stage = card(page, id);
    const handles = (await stage.locator('button:visible, [role="tab"]:visible, [role="radio"]:visible, label:visible').elementHandles()).slice(0, 6);
    for (const h of handles) {
      const box = await h.boundingBox().catch(() => null);
      if (!box || box.width < 4) continue;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(40);
      const ring = await stage.evaluate((root) => {
        const isText = (e: Element) => e.matches('input:not([type=checkbox],[type=radio],[type=range],[type=button],[type=submit]), textarea, select, [contenteditable]');
        for (const e of root.querySelectorAll<HTMLElement>('*')) {
          const cs = getComputedStyle(e);
          if (cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) === 0 || cs.visibility === 'hidden') continue;
          if (isText(e) || e.querySelector(':scope > input:focus-visible, :scope > textarea:focus-visible')) continue;
          return `${e.tagName.toLowerCase()}.${e.className}`.slice(0, 80);
        }
        return null;
      });
      if (ring) bad.push(`${id}: ${ring}`);
      await page.keyboard.press('Escape').catch(() => {});
      // Escape is a keyboard event: blur so the next click starts from a mouse state.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    }
  }
  expect([...new Set(bad)]).toEqual([]);
});
