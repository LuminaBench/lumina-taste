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

test('every pattern re-skins across all 48 palette × mode themes', async ({ page }) => {
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
  expect(result.themes).toBe(48);
  expect(result.distinct).toBe(48);
});

test('keyboard focus is visible on the first control of every stage', async ({ page, browserName }) => {
  // Two screenshots for each of about 175 controls; WebKit's screenshots of this long page take about a second each.
  test.setTimeout(browserName === 'webkit' ? 600_000 : 120_000);
  await page.goto('/#/ui');
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important} .g-prev-in{transform:none!important;width:auto!important} .g-prev{aspect-ratio:auto!important;min-height:220px;contain:none!important} .g-stretch::after{display:none}' });
  // Rings are for keyboard users: switch the page into keyboard modality.
  await page.keyboard.press('Shift');
  // Grid previews are inert thumbnails; make them live for this check.
  await page.evaluate(() => document.querySelectorAll('[inert]').forEach((n) => n.removeAttribute('inert')));
  // Let resize-driven components settle first (a backdrop hides its pause button when there is no room for traces).
  await page.waitForTimeout(300);
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
    // A control can hide itself once its part settles (a backdrop with no room for its motion drops its pause button).
    if (!(await el.isVisible())) continue;
    // Scrolled directly: Playwright's own scroll waits for a still element, and a live demo beside it may keep moving.
    await el.evaluate((n: HTMLElement) => n.scrollIntoView({ block: 'center' }));
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
  test('copy button morphs to Copied', async ({ page, context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
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
    // Keyboard modality first (a plain key press), then focus the trigger: Safari's Tab skips buttons by default.
    await page.keyboard.press('Shift');
    await page.locator('#ui-tooltip [aria-describedby="lt-tt-1"]').evaluate((el: HTMLElement) => el.focus({ focusVisible: true } as FocusOptions));
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

test('element pages show the real source in Code tabs', async ({ page }) => {
  await page.goto('/#/ui/rating');
  const code = page.locator('.g-src code');
  await expect(code).toContainText('lt-rating');
  await page.locator('.g-code-tabs [data-ext="ts"]').click();
  await expect(code).toContainText('export function enhance');
  await page.locator('.g-code-tabs [data-ext="react.tsx"]').click();
  await expect(code).toContainText('export function Rating');
});

test('Back returns to the same place in the element grid', async ({ page }) => {
  await page.goto('/#/');
  await page.evaluate(() => scrollTo(0, 1800));
  await page.waitForTimeout(150);
  const y = await page.evaluate(() => scrollY);
  await page.evaluate(() => (location.hash = '#/ui/kanban-board'));
  await expect(page.locator('#ui-kanban-board')).toBeVisible();
  await page.goBack();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y - 40);
});

test.describe('added in 1.0 (batch 2)', () => {
  test('filter chips: picking one turns All off, clearing turns it back on', async ({ page }) => {
    const s = await solo(page, 'filter-chips');
    const all = s.locator('[data-all]');
    await s.locator('[data-part="chip"]', { hasText: 'Engineering' }).click();
    await expect(all).toHaveAttribute('aria-pressed', 'true');
    await s.locator('[data-part="chip"]', { hasText: 'Design' }).click();
    await expect(all).toHaveAttribute('aria-pressed', 'false');
  });
  test('inline edit: Enter saves, Esc cancels', async ({ page }) => {
    const s = await solo(page, 'inline-edit');
    await s.locator('[data-part="edit"]').click();
    await s.locator('input').fill('Q1 plan');
    await page.keyboard.press('Enter');
    await expect(s.locator('[data-part="value"]')).toHaveText('Q1 plan');
    await s.locator('[data-part="edit"]').click();
    await s.locator('input').fill('nope');
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-part="value"]')).toHaveText('Q1 plan');
    await expect(s.locator('[data-part="edit"]')).toBeFocused();
  });
  test('mention input inserts a handle', async ({ page }) => {
    const s = await solo(page, 'mention-input');
    await s.locator('textarea').pressSequentially('Thanks @ri');
    await expect(s.locator('[role="listbox"]')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(s.locator('textarea')).toHaveValue('Thanks @riya ');
  });
  test('formatting toolbar: arrows move, aria-pressed toggles', async ({ page }) => {
    const s = await solo(page, 'formatting-toolbar');
    await s.locator('[data-cmd="bold"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('[data-cmd="italic"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(s.locator('[data-cmd="italic"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(s.locator('[data-part="text"]')).toHaveAttribute('data-italic', '');
  });
  test('carousel: next scrolls and the dot follows', async ({ page }) => {
    const s = await solo(page, 'carousel');
    await expect(s.locator('[data-part="prev"]')).toBeDisabled();
    await s.locator('[data-part="next"]').click();
    await expect.poll(() => s.locator('[data-part="track"]').evaluate((n) => n.scrollLeft)).toBeGreaterThan(50);
    await expect(s.locator('[data-part="dot"]').nth(1)).toHaveAttribute('aria-current', 'true');
  });
  test('hamburger opens, traps focus and closes on Escape', async ({ page }) => {
    const s = await solo(page, 'hamburger-menu');
    const t = s.locator('[data-part="toggle"]');
    await t.click();
    await expect(t).toHaveAttribute('aria-label', 'Close menu');
    await expect(s.locator('[data-part="panel"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-part="panel"]')).toBeHidden();
    await expect(t).toBeFocused();
  });
  test('lightbox: arrows step and count updates', async ({ page }) => {
    const s = await solo(page, 'lightbox');
    await s.locator('[data-i="1"]').click();
    await expect(s.locator('[data-part="count"]')).toHaveText('2 / 6');
    await page.keyboard.press('ArrowRight');
    await expect(s.locator('[data-part="count"]')).toHaveText('3 / 6');
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-i="2"]')).toBeFocused();
  });
  test('cookie consent: refusing is one click', async ({ page }) => {
    const s = await solo(page, 'cookie-consent');
    await s.locator('[data-choice="essential"]').click();
    await expect(s.locator('[data-part="done"]')).toHaveText('Saved: essential cookies only.');
  });
  test('setup checklist counts ticks', async ({ page }) => {
    const s = await solo(page, 'setup-checklist');
    await s.locator('[data-part="tick"]').nth(2).click();
    await expect(s.locator('[data-part="count"]')).toHaveText('3 of 5 done');
  });
  test('swipe actions: drag left past 30% deletes, buttons work too', async ({ page }) => {
    const s = await solo(page, 'swipe-actions');
    await expect(s.locator('[data-part="row"]')).toHaveCount(3);
    const row = s.locator('[data-part="row"]').first().locator('[data-part="content"]');
    const b = (await row.boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.8, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.1, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(s.locator('[data-part="row"]')).toHaveCount(2);
    await expect(s.locator('[data-part="live"]')).toContainText('Deleted');
    await s.locator('[data-part="row"]').first().hover();
    await s.locator('[data-part="row"]').first().locator('[data-act="archive"]').click();
    await expect(s.locator('[data-part="row"]')).toHaveCount(1);
  });
});

test('Compare view: every pair shows live thumbnails and a rule', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/#/compare');
  const pairs = page.locator('.g-cmp');
  expect(await pairs.count()).toBeGreaterThanOrEqual(12);
  const empty = await page.$$eval('.g-cmp', (els) => els.filter((s) => !s.querySelector('.g-rule')?.textContent?.trim() || s.querySelectorAll('.g-prev-in > *').length < 2).map((s) => s.id));
  expect(empty).toEqual([]);
  // Top-layer overlays are pictured open in thumbnails.
  await expect(page.locator('#cmp-tooltip-popover-hover-card [data-static-open]')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('element pages link to their comparison', async ({ page }) => {
  await page.goto('/#/ui/tooltip');
  await expect(page.locator('.g-confused .g-rule')).toContainText('tooltip');
  await page.locator('.g-confused .g-more').click();
  await expect(page).toHaveURL(/#\/compare\/tooltip-popover-hover-card/);
});

test('previews never scroll the page on load', async ({ page }) => {
  for (const r of ['/#/', '/#/compare', '/#/charts']) {
    await page.goto(r);
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => scrollY), r).toBe(0);
  }
});

test.describe('sections', () => {
  test('every section block renders with a heading and no errors', async ({ page }) => {
    const errors = errorsOf(page);
    await page.goto('/#/?f=blocks');
    const ids = await page.$$eval('.g-card', (c) => c.map((x) => x.getAttribute('data-id')!));
    expect(ids.length).toBeGreaterThanOrEqual(12);
    for (const id of ids) {
      await page.evaluate((i) => (location.hash = `#/ui/${i}`), id);
      await expect(page.locator(`#ui-${id} [data-stage] :is(h1, h2, h3)`).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
  test('newsletter: explains a bad email, confirms a good one', async ({ page }) => {
    const s = await solo(page, 'newsletter-signup');
    await s.locator('input').fill('ana@');
    await s.locator('button[type="submit"]').click();
    await expect(s.locator('[data-part="msg"]')).toContainText('looks incomplete');
    await s.locator('input').fill('ana@halyard.dev');
    await s.locator('button[type="submit"]').click();
    await expect(s.locator('[data-part="msg"]')).toContainText('Check ana@halyard.dev');
  });
  test('sign-in card: empty email is explained, valid email confirms', async ({ page }) => {
    const s = await solo(page, 'sign-in-card');
    await s.locator('form button[type="submit"]').click();
    await expect(s.locator('[data-part="msg"]')).toHaveText('Enter your work email.');
    await s.locator('input').fill('kai@kestrel.dev');
    await s.locator('form button[type="submit"]').click();
    await expect(s.locator('[data-part="msg"]')).toContainText('sign-in link');
  });
  test('wide elements get a full-width stage', async ({ page }) => {
    await page.goto('/#/ui/pricing-tiers');
    await expect(page.locator('.g-el.g-el-wide')).toBeVisible();
  });
});

test.describe('added in 1.0 (batch 3)', () => {
  test('password field: reveal toggles and strength rises', async ({ page }) => {
    const s = await solo(page, 'password-field');
    const input = s.locator('input');
    await input.fill('abc');
    await expect(s.locator('[data-part="strength"]')).toHaveText('Strength: Weak');
    await input.fill('Halyard-Taste-2026');
    await expect(s.locator('[data-part="strength"]')).toHaveText('Strength: Strong');
    await s.locator('[data-part="reveal"]').click();
    await expect(input).toHaveAttribute('type', 'text');
  });
  test('select menu: open with ArrowDown, typeahead, Enter chooses', async ({ page }) => {
    const s = await solo(page, 'select-menu');
    await s.locator('[data-part="trigger"]').focus();
    await page.keyboard.press('ArrowDown');
    await expect(s.locator('[role="listbox"]')).toBeVisible();
    await page.keyboard.press('v');
    await page.keyboard.press('Enter');
    await expect(s.locator('[data-part="value"]')).toHaveText('Viewer');
    await expect(s.locator('[data-part="trigger"]')).toBeFocused();
  });
  test('json viewer: Left collapses, Collapse all hides children', async ({ page }) => {
    const s = await solo(page, 'json-viewer');
    const nested = s.locator('[role="treeitem"][aria-level="2"][aria-expanded]').first();
    await nested.locator(':scope > [data-part="row"]').click();
    await expect(nested).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('ArrowRight');
    await expect(nested).toHaveAttribute('aria-expanded', 'true');
    await s.locator('[data-part="toggle-all"]').click();
    await expect(nested).toHaveAttribute('aria-expanded', 'false');
  });
  test('undo snackbar restores the row', async ({ page }) => {
    const s = await solo(page, 'undo-snackbar');
    await s.locator('li').nth(0).locator('[data-part="delete"]').click();
    await expect(s.locator('li').nth(0)).toBeHidden();
    await s.locator('[data-part="undo"]').click();
    await expect(s.locator('li').nth(0)).toBeVisible();
  });
  test('confirm popover: Esc cancels and returns focus', async ({ page }) => {
    const s = await solo(page, 'confirm-popover');
    await s.locator('[data-part="trigger"]').click();
    await expect(s.locator('[data-part="panel"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-part="trigger"]')).toBeFocused();
    await s.locator('[data-part="trigger"]').click();
    await s.locator('[data-part="confirm"]').click();
    await expect(s.locator('[data-part="trigger"]')).toHaveText('Revoked');
  });
  test('contact section lists missing fields', async ({ page }) => {
    const s = await solo(page, 'contact-section');
    await s.locator('button[type="submit"]').click();
    await expect(s.locator('[data-part="msg"]')).toContainText('Please fill in: name, work email, message');
  });
});

test.describe('added in 1.0 (batch 4)', () => {
  test('month calendar: arrows move by week, click reads the day', async ({ page }) => {
    const s = await solo(page, 'month-calendar');
    const days = s.locator('[data-part="day"]');
    await days.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(days.nth(7)).toBeFocused();
    await days.nth(8).click();
    await expect(s.locator('[data-part="sel"]')).toContainText('Board meeting');
  });
  test('order summary: valid code adds a discount row and lowers the total', async ({ page }) => {
    const s = await solo(page, 'order-summary');
    await s.locator('#lt-os-code').fill('team10');
    await s.locator('[data-part="promo"] button').click();
    await expect(s.locator('[data-part="discount-row"]')).toBeVisible();
    await expect(s.locator('[data-part="total"]')).toHaveText('£354.24');
  });
  test('pricing calculator updates the total and the sum', async ({ page }) => {
    const s = await solo(page, 'pricing-calculator');
    await s.locator('input[value="m"]').check({ force: true });
    await expect(s.locator('[data-part="total"]')).toHaveText('£373');
    await expect(s.locator('[data-part="breakdown"]')).toContainText('12 seats × £24');
  });
  test('comment thread: reply posts under the comment, text is escaped', async ({ page }) => {
    const s = await solo(page, 'comment-thread');
    await s.locator('[data-part="reply"]').first().click();
    await s.locator('[data-part="reply-form"] textarea').fill('<b>ok</b>');
    await s.locator('[data-part="reply-form"] button').click();
    await expect(s.locator('[data-part="replies"]').first()).toContainText('<b>ok</b>');
  });
  test('shortcuts sheet filters rows', async ({ page }) => {
    const s = await solo(page, 'shortcuts-sheet');
    await s.locator('[data-part="open"]').click();
    await s.locator('dialog input').fill('save');
    await expect(s.locator('dialog dl > div:visible')).toHaveCount(1);
  });
  test('search results tabs filter by kind', async ({ page }) => {
    const s = await solo(page, 'search-results');
    await s.locator('[data-kind="chart"]').click();
    await expect(s.locator('ol > li:visible')).toHaveCount(1);
  });
});

test.describe('site navigation', () => {
  test('flyout menu: click opens one panel, Down enters, Esc returns focus', async ({ page }) => {
    const s = await solo(page, 'flyout-menu');
    const product = s.locator('[data-part="trigger"]').first();
    await product.click();
    await expect(s.locator('#lt-fo-product')).toBeVisible();
    await s.locator('[data-part="trigger"]').nth(1).click();
    await expect(s.locator('#lt-fo-product')).toBeHidden();
    await expect(s.locator('#lt-fo-resources')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-part="trigger"]').nth(1)).toBeFocused();
    await product.focus();
    await page.keyboard.press('ArrowDown');
    await expect(s.locator('#lt-fo-product [role="menuitem"]').first()).toBeFocused();
  });
  test('simple navbar collapses into a menu button when narrow', async ({ page }) => {
    const s = await solo(page, 'navbar-simple');
    await s.locator('.lt-nav-simple').evaluate((n) => ((n as HTMLElement).style.width = '420px'));
    const toggle = s.locator('[data-part="toggle"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(s.locator('[data-part="panel"]')).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', 'Close menu');
  });
  test('sub-navigation marks the current section with aria-current', async ({ page }) => {
    const s = await solo(page, 'subnav');
    await expect(s.locator('[aria-current="page"]')).toHaveText('Overview');
  });
});

test.describe('settings and account', () => {
  test('settings list: a switch saves and says so', async ({ page }) => {
    const s = await solo(page, 'settings-list');
    await s.locator('[role="switch"]').first().click({ force: true });
    await expect(s.locator('[data-part="saved"]')).toContainText('Saved:');
  });
  test('api key: reveal, then a two-step roll', async ({ page }) => {
    const s = await solo(page, 'api-key-field');
    const key = s.locator('[data-part="key"]');
    const masked = await key.textContent();
    await s.locator('[data-part="reveal"]').click();
    await expect(key).not.toHaveText(masked!);
    const roll = s.locator('[data-part="roll"]');
    await roll.click();
    await expect(roll).toHaveText('Click again to roll');
    await roll.click();
    await expect(s.locator('[data-part="msg"]')).toContainText('New key created');
  });
  test('usage meters expose values and flag the nearly full one', async ({ page }) => {
    const s = await solo(page, 'usage-meters');
    await expect(s.locator('[role="meter"]')).toHaveCount(4);
    for (const m of await s.locator('[role="meter"]').all()) await expect(m).toHaveAttribute('aria-valuenow', /\d+/);
  });
  test('team members: rejects a bad email, escapes a good one', async ({ page }) => {
    const s = await solo(page, 'team-members');
    const input = s.locator('#lt-tm-email');
    await input.fill('nope');
    await s.locator('[data-part="invite"] button[type="submit"]').click();
    await expect(s.locator('[data-part="msg"]')).toContainText('full email');
    await input.fill('ana@halyard.io');
    await s.locator('[data-part="invite"] button[type="submit"]').click();
    await expect(s.locator('[data-part="msg"]')).toHaveText('Invite sent to ana@halyard.io.');
    await expect(s.locator('tbody tr')).toHaveCount(5);
  });
  test('danger zone: delete stays off until the name is typed', async ({ page }) => {
    const s = await solo(page, 'danger-zone');
    await s.locator('[data-part="open"]').click();
    const go = s.locator('[data-part="confirm"] button[type="submit"]');
    await expect(go).toBeDisabled();
    await s.locator('#lt-dz-input').fill('halyar');
    await expect(go).toBeDisabled();
    await s.locator('#lt-dz-input').fill('halyard');
    await go.click();
    await expect(s.locator('[data-part="msg"]')).toContainText('scheduled for deletion');
  });
});

test.describe('added in 1.0 (batch 5)', () => {
  test('assistant thread: copy announces, retry emits, streaming hides actions', async ({ page }) => {
    const s = await solo(page, 'assistant-thread');
    await expect(s.locator('[data-state="streaming"] [data-part="actions"]')).toHaveCount(0);
    const events = s.evaluate((el) => new Promise((r) => el.addEventListener('lt-change', (e) => r((e as CustomEvent).detail), { once: true })));
    await s.locator('[data-action="copy"]').first().click();
    await expect(s.locator('[data-part="live"]')).toHaveText('Answer copied.');
    await s.locator('[data-action="retry"]').first().click();
    expect(await events).toMatchObject({ action: 'retry' });
  });
  test('docs pager and project grid render their links', async ({ page }) => {
    let s = await solo(page, 'doc-pager');
    await expect(s.locator('a[rel="next"] strong')).toHaveText('Identify a user');
    s = await solo(page, 'project-grid');
    await expect(s.locator('li')).toHaveCount(6);
    await expect(s.locator('[data-part="media"] b').first()).toHaveText('01');
  });
});

test.describe('backdrops and app chrome', () => {
  test('switcher menu: choosing a row moves the tick, updates the trigger and emits', async ({ page }) => {
    const s = await solo(page, 'switcher-menu');
    const events = s.evaluate((el) => new Promise((r) => el.addEventListener('lt-change', (e) => r((e as CustomEvent).detail), { once: true })));
    await s.locator('[data-part="trigger"]').click();
    await s.locator('[role="menuitemradio"][data-value="larkspur/production"]').click();
    expect(await events).toMatchObject({ value: 'larkspur/production' });
    await expect(s.locator('[role="menuitemradio"][aria-checked="true"]')).toHaveCount(1);
    await expect(s.locator('[data-part="trigger"] [data-part="meta"]')).toHaveText('Production');
    await expect(s.locator('[data-part="trigger"]')).toHaveAttribute('aria-expanded', 'false');
  });
  test('session list: arrows move between sessions, click marks the current one', async ({ page }) => {
    const s = await solo(page, 'session-list');
    const links = s.locator('ul a');
    await links.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(links.nth(1)).toBeFocused();
    await links.nth(1).click();
    await expect(s.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(links.nth(1)).toHaveAttribute('aria-current', 'page');
  });
  test('command chip announces the copy', async ({ page }) => {
    const s = await solo(page, 'command-chip');
    await s.locator('[data-part="copy"]').click();
    await expect(s.locator('[data-part="msg"]')).toHaveText('Command copied.');
  });
  test('showcase tabs swap the framed example and keep one panel visible', async ({ page }) => {
    const s = await solo(page, 'showcase-tabs');
    await s.getByRole('tab', { name: 'Developer API' }).click();
    await expect(s.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    await expect(s.locator('[role="tabpanel"]:visible')).toHaveAttribute('data-mode', 'dark');
    await s.getByRole('tab', { name: 'Developer API' }).press('ArrowRight');
    await expect(s.getByRole('tab', { name: 'Clinic' })).toHaveAttribute('aria-selected', 'true');
  });
  test('circuit backdrop: traces keep off the text, and the pause button stops them', async ({ page }) => {
    const s = await solo(page, 'backdrop-circuit');
    await expect(s.locator('[data-part="trace"]').first()).toBeAttached();
    // No trace segment may cross the headline, the lede or the buttons.
    const crossing = await s.locator('.lt-circuit').evaluate((root) => {
      const box = root.getBoundingClientRect();
      const blocks = [...root.parentElement!.querySelectorAll('h3, p, a')].filter((n) => !root.contains(n)).map((n) => n.getBoundingClientRect());
      let hits = 0;
      for (const path of root.querySelectorAll<SVGPathElement>('[data-part="trace"]')) {
        const pts = [...path.getAttribute('d')!.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map((m) => [box.left + Number(m[1]), box.top + Number(m[2])]);
        for (let i = 1; i < pts.length; i++) {
          const l = Math.min(pts[i - 1][0], pts[i][0]), r = Math.max(pts[i - 1][0], pts[i][0]), t = Math.min(pts[i - 1][1], pts[i][1]), b = Math.max(pts[i - 1][1], pts[i][1]);
          if (blocks.some((k) => r > k.left && l < k.right && b > k.top && t < k.bottom)) hits++;
        }
      }
      return hits;
    });
    expect(crossing).toBe(0);
    const pause = s.locator('[data-part="pause"]');
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(s.locator('.lt-circuit')).toHaveAttribute('data-paused', '');
  });
  test('dither backdrop draws on its canvas and marks the host ready', async ({ page }) => {
    const s = await solo(page, 'backdrop-dither');
    await expect(s.locator('[data-backdrop~="dither"]')).toHaveAttribute('data-backdrop-ready', '');
    const inked = await s.locator('canvas').evaluate((c: HTMLCanvasElement) => { const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
    expect(inked).toBeGreaterThan(50);
  });
  test('css backdrops paint a pattern layer without changing the layout', async ({ page }) => {
    for (const id of ['backdrop-grid', 'backdrop-dots', 'backdrop-lines', 'backdrop-ticks', 'backdrop-wash', 'backdrop-spot', 'backdrop-grain']) {
      const s = await solo(page, id);
      const host = s.locator('[data-backdrop]').first();
      const layers = await host.evaluate((el) => [getComputedStyle(el, '::before').backgroundImage, getComputedStyle(el, '::after').backgroundImage].join(' '));
      expect(layers, id).toMatch(/gradient|url\(/);
      expect(await host.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), id).toBe(true);
    }
  });
});

test.describe('added in 1.0 (batch 6)', () => {
  test('date picker: typed dates are checked and rewritten; the grid picks by keyboard', async ({ page }) => {
    const s = await solo(page, 'date-picker');
    const input = s.locator('input');
    await s.evaluate((el) => { (window as any).__dates = []; el.addEventListener('lt-change', (e) => (window as any).__dates.push((e as CustomEvent).detail.value)); });
    const dates = () => page.evaluate(() => (window as any).__dates);
    await input.fill('31/02/2027'); await input.blur();
    await expect(s.locator('[data-part="hint"]')).toContainText('Enter a date like');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await input.fill('01.01.25'); await input.blur();
    await expect(s.locator('[data-part="hint"]')).toHaveText('Choose 25/11/2026 or later.');
    await input.fill('3 1 27'); await input.blur();
    await expect(input).toHaveValue('03/01/2027');
    await expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(await dates()).toEqual(['2027-01-03']);
    await s.locator('[data-part="open"]').click();
    await expect(s.locator('[data-part="month"]')).toHaveText('January 2027');
    await expect(s.locator('[data-date="2027-01-03"]')).toBeFocused();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight');
    await expect(s.locator('[data-date="2027-01-11"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(s.locator('[data-part="popover"]')).toBeHidden();
    await expect(input).toHaveValue('11/01/2027');
    expect(await dates()).toEqual(['2027-01-03', '2027-01-11']);
    await expect(s.locator('[data-part="open"]')).toBeFocused();
    await s.locator('[data-part="open"]').click();
    await page.keyboard.press('Escape');
    await expect(s.locator('[data-part="popover"]')).toBeHidden();
  });
  test('amount input: keeps digits, formats on blur, explains the limit', async ({ page }) => {
    const s = await solo(page, 'amount-input');
    const input = s.locator('input');
    await input.fill('12a,345.6789');
    await expect(input).toHaveValue('12345.67');
    await input.blur();
    await expect(input).toHaveValue('12,345.67');
    await expect(s.locator('[data-part="hint"]')).toHaveText('The most you can enter is £10,000.00.');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await input.fill('80'); await input.blur();
    await expect(input).toHaveValue('80.00');
    await expect(s.locator('[data-part="hint"]')).toHaveText('Up to £10,000 per transfer.');
  });
  test('hold to confirm: a click does nothing, a full hold confirms once', async ({ page }) => {
    const s = await solo(page, 'hold-to-confirm');
    const btn = s.locator('button');
    await btn.click();
    await expect(s.locator('.lt-hold')).not.toHaveAttribute('data-done', '');
    const box = (await btn.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 10);
    await page.mouse.down();
    await expect(s.locator('.lt-hold')).toHaveAttribute('data-done', '', { timeout: 3000 });
    await page.mouse.up();
    await expect(s.locator('[data-part="label"]')).toHaveText('Deleted');
    await expect(s.locator('[data-part="msg"]')).toHaveText('Deleted.');
  });
  test('hold to confirm works from the keyboard, and letting go early cancels', async ({ page }) => {
    const s = await solo(page, 'hold-to-confirm');
    await s.locator('button').focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('Space');
    await page.waitForTimeout(1200);
    await expect(s.locator('.lt-hold')).not.toHaveAttribute('data-done', '');
    await page.keyboard.down('Enter');
    await expect(s.locator('.lt-hold')).toHaveAttribute('data-done', '', { timeout: 3000 });
    await page.keyboard.up('Enter');
  });
  test('media player: play toggles, the scrubber seeks, speed cycles', async ({ page }) => {
    const s = await solo(page, 'media-player');
    const play = s.locator('[data-part="play"]');
    await play.click();
    await expect(play).toHaveAttribute('aria-label', 'Pause');
    await play.click();
    await expect(play).toHaveAttribute('aria-label', 'Play');
    const seek = s.locator('[data-part="seek"]');
    await seek.focus();
    await page.keyboard.press('Home');
    await expect(s.locator('[data-part="now"]')).toHaveText('0:00');
    await page.keyboard.press('End');
    await expect(s.locator('[data-part="now"]')).toHaveText('32:14');
    await expect(seek).toHaveAttribute('aria-valuetext', '32:14 of 32:14');
    await s.locator('[data-part="back"]').click();
    await expect(s.locator('[data-part="now"]')).toHaveText('31:59');
    const speed = s.locator('[data-part="speed"]');
    await speed.click();
    await expect(speed).toHaveText('1.25×');
    await speed.click(); await speed.click(); await speed.click();
    await expect(speed).toHaveText('1×');
  });
  test('terminal window ends with every line shown and the window never changes height', async ({ page }) => {
    const s = await solo(page, 'terminal-window');
    const term = s.locator('.lt-terminal');
    const h0 = (await term.boundingBox())!.height;
    await s.locator('[data-part="replay"]').click();
    await expect(term).toHaveAttribute('data-playing', '');
    expect(Math.abs((await term.boundingBox())!.height - h0)).toBeLessThan(1);
    await expect(term).not.toHaveAttribute('data-playing', '', { timeout: 8000 });
    await expect(s.locator('[data-part="screen"] p[data-pending]')).toHaveCount(0);
    await expect(s.locator('[data-part="screen"] p').first()).toHaveText('npx halyard init');
    expect(Math.abs((await term.boundingBox())!.height - h0)).toBeLessThan(1);
  });
  test('text reveal keeps the words and shows them', async ({ page }) => {
    const s = await solo(page, 'text-reveal');
    const h = s.locator('.lt-reveal');
    await expect(h).toHaveAttribute('data-in', '');
    await expect(h).toHaveText('Every number your team checks, on one page');
    expect(await h.locator('[data-w]').count()).toBe(8);
  });
  test('reading progress and the mobile app bar follow their scrolling panel', async ({ page }) => {
    let s = await solo(page, 'reading-progress');
    await s.locator('.lt-reading-demo').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => s.locator('.lt-reading').evaluate((el) => Number(getComputedStyle(el).getPropertyValue('--p')))).toBeGreaterThan(0.95);
    s = await solo(page, 'mobile-app-bar');
    await expect(s.locator('.lt-appbar')).not.toHaveAttribute('data-scrolled', '');
    await s.locator('.lt-appbar-demo').evaluate((el) => { el.scrollTop = 120; });
    await expect(s.locator('.lt-appbar')).toHaveAttribute('data-scrolled', '');
    const row = await s.locator('[data-part="row"]').boundingBox(), demo = await s.locator('.lt-appbar-demo').boundingBox();
    expect(Math.abs(row!.y - demo!.y)).toBeLessThan(3);
  });
  test('api endpoints open one by one; story, device, quote and rows render their parts', async ({ page }) => {
    let s = await solo(page, 'api-endpoint');
    const second = s.locator('details').nth(1);
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
    await expect(second.locator('caption')).toBeVisible();
    s = await solo(page, 'sticky-story');
    await expect(s.locator('li[data-active]')).toHaveCount(1);
    await expect(s.locator('li figure')).toHaveCount(3);
    s = await solo(page, 'device-frame');
    await expect(s.locator('.lt-device[data-kind="phone"] figcaption')).toHaveText('The payouts screen on a phone');
    s = await solo(page, 'quote-feature');
    await expect(s.locator('[data-part="results"] dd')).toHaveCount(3);
    s = await solo(page, 'row-list');
    await expect(s.locator('a')).toHaveCount(5);
    for (const a of await s.locator('a, button').all()) expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('places and products', () => {
  test('task list: ticking a row updates the count, the track and the event', async ({ page }) => {
    const s = await solo(page, 'task-list');
    await s.evaluate((el) => { (window as any).__t = []; el.addEventListener('lt-change', (e) => (window as any).__t.push((e as CustomEvent).detail)); });
    await expect(s.locator('[data-part="count"]')).toHaveText('2 of 5 done');
    await s.locator('li').nth(2).locator('label').click();
    await expect(s.locator('[data-part="count"]')).toHaveText('3 of 5 done');
    expect(await page.evaluate(() => (window as any).__t)).toEqual([{ name: 't3', done: true, doneCount: 3, total: 5 }]);
    expect(await s.locator('[data-part="track"] span').evaluate((el) => el.style.getPropertyValue('--p'))).toBe('60%');
    // Space ticks a focused row (focused directly: Safari's Tab skips checkboxes by default).
    for (const n of [3, 4]) { await s.locator('li').nth(n).locator('input').focus(); await page.keyboard.press('Space'); }
    await expect(s.locator('[data-part="count"]')).toHaveText('All 5 done');
  });
  test('visit info: marks today and says whether the place is open, in words', async ({ page }) => {
    await page.goto('/#/ui/visit-info');
    const s = card(page, 'visit-info');
    await expect(s.locator('tr[data-today]')).toHaveCount(1);
    await expect(s.locator('[data-part="now"]')).toHaveText(/^(Open now, until \d+:\d+|Opens today at \d+:\d+|Closed now(\. Opens (tomorrow|[A-Z][a-z]+day) at \d{1,2}(:\d{2})?)?)$/);
    await expect(s.locator('tbody tr')).toHaveCount(7);
  });
  test('booking bar: needs a date, then asks with date, time and people', async ({ page }) => {
    const s = await solo(page, 'booking-bar');
    await s.evaluate((el) => { (window as any).__b = []; el.addEventListener('lt-change', (e) => { const d = (e as CustomEvent).detail; if (d && 'people' in d) (window as any).__b.push(d); }); });
    await s.locator('.lt-stepper [data-part="inc"]').click();
    await s.locator('select').selectOption('14:00');
    await s.getByRole('button', { name: 'Check availability' }).click();
    expect(await page.evaluate(() => (window as any).__b)).toEqual([{ date: '2026-11-28', time: '14:00', people: 3 }]);
    await expect(s.locator('[data-part="result"]')).toContainText('Saturday 28 November at 14:00, 3 people');
    await s.locator('.lt-date input').fill(''); await s.locator('.lt-date input').blur();
    await s.getByRole('button', { name: 'Check availability' }).click();
    await expect(s.locator('[data-part="result"]')).toHaveText('Choose a date first.');
    await expect(s.locator('.lt-date input')).toBeFocused();
  });
  test('art panel: a photograph covers the placeholder type; offers link by name', async ({ page }) => {
    let s = await solo(page, 'art-panel');
    const fig = s.locator('.lt-art').first();
    await expect(fig.locator('figcaption')).toHaveText(/Huila/);
    expect(await fig.getAttribute('data-shot')).toContain('4:5');
    await fig.evaluate((el) => { const img = document.createElement('img'); img.alt = ''; img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%225%22/%3E'; el.prepend(img); });
    const covers = await fig.evaluate((el) => { const i = el.querySelector('img')!.getBoundingClientRect(), f = el.getBoundingClientRect(); return Math.abs(i.width - f.width) < 2 && Math.abs(i.height - f.height) < 2 && getComputedStyle(el.querySelector('img')!).zIndex === '1'; });
    expect(covers).toBe(true);
    s = await solo(page, 'offer-cards');
    await expect(s.locator('article')).toHaveCount(3);
    await expect(s.locator('[data-part="foot"] a').first()).toHaveText(/Huila in detail/);
  });
});

test.describe('composition', () => {
  test('layout attributes recompose a block; numbering counts sections; rules draw hairlines', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/ui/feature-grid');
    const result = await page.evaluate(() => {
      const src = document.querySelector('#ui-feature-grid .lt-feature-grid')!;
      const main = document.createElement('main');
      main.setAttribute('data-numbered', ''); main.setAttribute('data-separators', 'rules');
      main.style.cssText = 'display:block;width:1280px';
      const hero = '<section class="lt-hero-split"><div><p data-part="eyebrow">Hero</p></div></section>';
      main.innerHTML = hero + ['rail', 'centre', ''].map((l) => { const c = src.cloneNode(true) as HTMLElement; if (l) c.setAttribute('data-layout', l); return c.outerHTML; }).join('');
      document.body.append(main);
      const [rail, centre, plain] = [...main.querySelectorAll<HTMLElement>('.lt-feature-grid')];
      const h = rail.querySelector('header')!.getBoundingClientRect(), u = rail.querySelector('ul')!.getBoundingClientRect();
      const out = {
        railBeside: u.left >= h.right - 1 && Math.abs(u.top - h.top) < 40,
        railCols: getComputedStyle(rail.querySelector('ul')!).gridTemplateColumns.split(' ').length,
        plainCols: getComputedStyle(plain.querySelector('ul')!).gridTemplateColumns.split(' ').length,
        centre: getComputedStyle(centre.querySelector('header')!).textAlign,
        labels: [rail, centre, plain].map((b) => getComputedStyle(b.querySelector('h2')!, '::before').content),
        heroLabel: getComputedStyle(main.querySelector('.lt-hero-split [data-part="eyebrow"]')!, '::before').content,
        rule: getComputedStyle(centre).backgroundImage,
      };
      main.remove();
      return out;
    });
    expect(result.railBeside).toBe(true);
    expect(result.railCols).toBe(2);
    expect(result.plainCols).toBe(3);
    expect(result.centre).toBe('center');
    expect(result.labels.every((c) => c.includes('counter(lt-section'))).toBe(true);
    expect(result.heroLabel).toBe('none');
    expect(result.rule).toContain('linear-gradient');
  });
  test('service list: every column lines up down the list; a narrow container stacks each row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const s = await solo(page, 'service-list');
    await expect(s.locator('li')).toHaveCount(5);
    const cols = await s.locator('.lt-services').evaluate((el) => {
      const xs = (sel: string, edge: 'left' | 'right') => new Set([...el.querySelectorAll(sel)].map((e) => Math.round(e.getBoundingClientRect()[edge]))).size;
      return { names: xs('li h3', 'left'), lines: xs('li p', 'left'), meta: xs('[data-part="meta"]', 'left'), price: xs('[data-part="price"]', 'right') };
    });
    expect(cols).toEqual({ names: 1, lines: 1, meta: 1, price: 1 });
    const stacked = await s.locator('.lt-services').evaluate((el) => {
      (el as HTMLElement).style.width = '420px';
      const li = el.querySelector('li')!, h = li.querySelector('h3')!.getBoundingClientRect(), p = li.querySelector('p')!.getBoundingClientRect(), b = li.querySelector('[data-part="price"]')!.getBoundingClientRect();
      return { below: p.top >= h.bottom - 1, sameLine: Math.abs(b.top - h.top) < 12, fits: el.scrollWidth <= el.clientWidth + 1 };
    });
    expect(stacked).toEqual({ below: true, sameLine: true, fits: true });
  });
  test('counts lay out cleanly: four offers, two tickets, three people, bare service rows', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    let s = await solo(page, 'offer-cards');
    const four = await s.locator('.lt-offers').evaluate((el) => {
      (el as HTMLElement).style.width = '1200px';
      const ul = el.querySelector('ul')!; ul.append(ul.children[0].cloneNode(true));
      const tops = [...ul.children].map((c) => Math.round(c.getBoundingClientRect().top));
      (el as HTMLElement).style.width = '960px';
      const cols = getComputedStyle(ul).gridTemplateColumns.split(' ').length;
      return { oneRow: new Set(tops).size === 1, midCols: cols };
    });
    expect(four).toEqual({ oneRow: true, midCols: 2 });
    s = await solo(page, 'pricing-tiers');
    const two = await s.locator('.lt-pricing-tiers').evaluate((el) => {
      (el as HTMLElement).style.width = '1100px';
      const ul = el.querySelector<HTMLElement>('[data-part="tiers"]')!; ul.lastElementChild!.remove();
      const r = ul.getBoundingClientRect(), p = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const inner = { l: p.left + parseFloat(cs.paddingLeft), r: p.right - parseFloat(cs.paddingRight) };
      return { cols: getComputedStyle(ul).gridTemplateColumns.split(' ').length, centred: Math.abs((r.left - inner.l) - (inner.r - r.right)) < 2, narrower: r.width < inner.r - inner.l - 100 };
    });
    expect(two).toEqual({ cols: 2, centred: true, narrower: true });
    s = await solo(page, 'team-grid');
    const three = await s.locator('.lt-team-grid').evaluate((el) => {
      (el as HTMLElement).style.width = '1100px';
      const ul = el.querySelector('ul')!; while (ul.children.length > 3) ul.lastElementChild!.remove();
      const li = ul.children[0], av = li.querySelector('[data-part="avatar"]')!.getBoundingClientRect(), name = li.querySelector('strong')!.getBoundingClientRect();
      const last = ul.lastElementChild!.getBoundingClientRect(), u = ul.getBoundingClientRect();
      return { small: av.width <= 80, beside: name.left >= av.right, fills: u.right - last.right < 4, oneRow: new Set([...ul.children].map((c) => Math.round(c.getBoundingClientRect().top))).size === 1 };
    });
    expect(three).toEqual({ small: true, beside: true, fills: true, oneRow: true });
    s = await solo(page, 'service-list');
    const bare = await s.locator('.lt-services').evaluate((el) => {
      const li = el.querySelector('li')!; const a = li.querySelector('a')!; li.append(...a.childNodes); a.remove();
      const price = li.querySelector('[data-part="price"]')!.getBoundingClientRect(), other = el.querySelectorAll('li')[1].querySelector('[data-part="price"]')!.getBoundingClientRect();
      return { aligned: Math.abs(price.right - other.right) < 1, padded: parseFloat(getComputedStyle(li).paddingTop) >= 16 };
    });
    expect(bare).toEqual({ aligned: true, padded: true });
  });
  test('art panel variants: a large figure, the product colour with readable ink, a keyline frame', async ({ page }) => {
    const s = await solo(page, 'art-panel');
    const r = await s.locator('.lt-art[data-variant="figure"]').evaluate((el) => {
      const cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
      const rgb = (c: string) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); return [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = (c: string) => { const [r, g, b] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const bg = lum(getComputedStyle(el).backgroundColor), ink = lum(getComputedStyle(el).color);
      const ratio = (Math.max(bg, ink) + 0.05) / (Math.min(bg, ink) + 0.05);
      const fig = parseFloat(getComputedStyle(el.querySelector('[data-part="figure"]')!).fontSize), name = parseFloat(getComputedStyle(el.querySelector('[data-part="name"]')!).fontSize);
      return { readable: ratio >= 4.5, figureLeads: fig > name * 2.5, framed: getComputedStyle(el, '::after').borderTopStyle === 'solid' };
    });
    expect(r).toEqual({ readable: true, figureLeads: true, framed: true });
  });
  test('invoice sheet: figures share one right edge and the lines add up to the total', async ({ page }) => {
    const s = await solo(page, 'invoice-sheet');
    const r = await s.locator('.lt-invoice').evaluate((el) => {
      const money = (t: string) => Math.round(parseFloat(t.replace(/[^0-9.]/g, '')) * 100);
      const amounts = [...el.querySelectorAll('tbody td:last-child')].map((td) => money(td.textContent!));
      const foot = [...el.querySelectorAll('tfoot td')].map((td) => money(td.textContent!));
      const rights = new Set([...el.querySelectorAll('tbody td:last-child, tfoot td')].map((td) => Math.round(td.getBoundingClientRect().right)));
      const total = el.querySelector('[data-part="total"] td')!;
      return { sum: amounts.reduce((a, b) => a + b, 0) === foot[0], total: foot[0] + foot[1] === foot[2], oneEdge: rights.size === 1, big: parseFloat(getComputedStyle(total).fontSize) > parseFloat(getComputedStyle(el.querySelector('tbody td')!).fontSize), status: el.querySelector('[data-part="status"]')!.textContent };
    });
    expect(r).toEqual({ sum: true, total: true, oneEdge: true, big: true, status: 'Due in 14 days' });
  });
  test('statement hero: one large h1, three facts in a ruled row', async ({ page }) => {
    const s = await solo(page, 'hero-statement');
    expect(await s.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(44);
    await expect(s.locator('[data-part="facts"] dd')).toHaveCount(3);
    expect(await s.locator('[data-part="foot"]').evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth))).toBeGreaterThan(0);
  });
});

test.describe('show, do not tell', () => {
  test('scroll statement lights word by word as it scrolls, and is whole without motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const s = await solo(page, 'scroll-statement');
    const words = s.locator('h2 [data-w]');
    expect(await words.count()).toBeGreaterThan(12);
    // The heading still reads as one sentence.
    expect((await s.locator('h2').innerText()).replace(/\s+/g, ' ')).toMatch(/^Every price is written down before we start\./);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const still = await words.evaluateAll((els) => els.every((e) => getComputedStyle(e).opacity === '1'));
    expect(still).toBe(true);
  });
  test('stack cards pin at staggered offsets; on a narrow container they are a plain list', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    const s = await solo(page, 'stack-cards');
    const tops = await s.locator('li').evaluateAll((els) => els.map((e) => [getComputedStyle(e).position, parseFloat(getComputedStyle(e).top)]));
    expect(tops.every(([p]) => p === 'sticky')).toBe(true);
    expect((tops[1][1] as number) - (tops[0][1] as number)).toBe(16);
    const narrow = await s.locator('.lt-stack-cards').evaluate((el) => { (el as HTMLElement).style.width = '600px'; return getComputedStyle(el.querySelector('li')!).position; });
    expect(narrow).toBe('static');
  });
  test('media band is dark inside a light page and its picture is marked to settle in', async ({ page }) => {
    const s = await solo(page, 'media-band');
    await page.evaluate(() => { document.documentElement.dataset.mode = 'light'; });
    const r = await s.locator('.lt-media-band').evaluate((el) => {
      const lum = (c: string) => { const cx = document.createElement('canvas').getContext('2d')!; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const [r, g, b] = cx.getImageData(0, 0, 1, 1).data; return (r + g + b) / 3; };
      return { band: lum(getComputedStyle(el).backgroundColor), ink: lum(getComputedStyle(el.querySelector('h2')!).color), zoom: el.querySelector('[data-part="media"]')!.hasAttribute('data-zoom') };
    });
    expect(r.band).toBeLessThan(60);
    expect(r.ink).toBeGreaterThan(180);
    expect(r.zoom).toBe(true);
  });
  test('a brand band recolours a section, never a badge or an art panel with the same tone', async ({ page }) => {
    const s = await solo(page, 'cta-band');
    const r = await s.locator('.lt-cta-band').evaluate((el) => {
      const sec = el as HTMLElement; sec.setAttribute('data-tone', 'accent'); sec.setAttribute('data-variant', 'bold');
      const badge = document.createElement('span'); badge.className = 'lt-badge'; badge.dataset.tone = 'accent'; badge.textContent = 'New';
      const art = document.createElement('figure'); art.className = 'lt-art'; art.dataset.tone = 'accent';
      document.body.append(badge, art);
      const v = (e: Element, n: string) => getComputedStyle(e).getPropertyValue(n).trim();
      const out = { bandGround: getComputedStyle(sec).backgroundColor, accent: v(document.body, '--accent-solid'), badgeInk: v(badge, '--text-primary') === v(document.body, '--text-primary'), artInk: v(art, '--text-primary') === v(document.body, '--text-primary') };
      badge.remove(); art.remove();
      return out;
    });
    expect(r.badgeInk).toBe(true);
    expect(r.artInk).toBe(true);
    expect(r.bandGround).not.toBe('rgba(0, 0, 0, 0)');
  });
  test('gallery rail scrolls one picture at a time and disables its buttons at the ends', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const s = await solo(page, 'gallery-rail');
    const prev = s.locator('[data-part="prev"]'), next = s.locator('[data-part="next"]'), track = s.locator('[data-part="track"]');
    await expect(prev).toBeDisabled();
    await next.click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await expect(prev).toBeEnabled();
    await track.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await expect(next).toBeDisabled();
    expect(await track.evaluate((el) => getComputedStyle(el).scrollSnapType)).toContain('x');
  });
});

