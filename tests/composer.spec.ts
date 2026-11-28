// Composed drafts in a browser: the rhythm the plan wrote is the rhythm the page shows (grounds really differ
// between neighbours, one dark and one brand band at most), the bold idea's figure stays inside its panel,
// and nothing runs off the screen at 390px or 1440px.
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRIEFS = {
  bakery: 'Home page for Crumb & Co, a sourdough bakery at 12 Mill Lane, Frome BA11 1AB, open Tuesday to Sunday 7:30 to 3, loaves from £4.20, cinnamon buns £3 and a Saturday bread class for £65, run by Nell and Owen Hart, phone 01373 496 210',
  builder: 'Website for Brickwell Build, a construction firm in Bristol building house extensions and loft conversions, fixed-price quotes, a £40,000 single-storey extension in 12 weeks, a loft conversion from £48,000, how it works: free site visit, then a fixed-price quote within 5 days, then a start date, phone 0117 496 0418',
  saas: 'Landing page for Tally, an invoicing tool for freelancers that sends an invoice in 30 seconds, chases late payers on day 7, 14 and 30 and matches bank payments, £9 a month, how it works: add a client, send the invoice, get paid',
};

for (const [name, brief] of Object.entries(BRIEFS)) {
  test(`composed draft for the ${name}: grounds alternate, the bold idea fits, nothing overflows`, async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), `lt-spec-${name}-`));
    try {
      const r = spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), brief, '--project', dir, '--write'], { encoding: 'utf8' });
      expect(r.status, r.stderr).toBe(0);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(pathToFileURL(join(dir, 'index.html')).href);
        const bands = await page.$$eval('main > section', (els) => els.map((el) => ({ bg: getComputedStyle(el).backgroundColor, tone: el.getAttribute('data-tone'), rhythm: el.getAttribute('data-rhythm'), scale: el.getAttribute('data-scale'), picture: el.classList.contains('lt-media-band') || el.classList.contains('lt-photo-words') })));
        expect(bands.length).toBeGreaterThanOrEqual(3);
        for (const b of bands) expect(b.rhythm).toMatch(/^(quiet|busy)$/);
        for (let i = 1; i < bands.length; i++) if (!bands[i].picture && !bands[i - 1].picture) expect(bands[i].bg, `bands ${i - 1} and ${i} share a ground`).not.toBe(bands[i - 1].bg);
        expect(bands.filter((b) => b.tone === 'dark').length).toBeLessThanOrEqual(1);
        expect(bands.filter((b) => b.tone === 'accent').length).toBeLessThanOrEqual(1);
        expect(bands[0].scale).toBe('display');
        expect(bands[bands.length - 1].scale).toBe('display');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
        // The bold idea's figure stays inside its panel.
        const fig = await page.$$eval('.lt-art [data-part="figure"]', (els) => els.map((el) => { const a = el.getBoundingClientRect(), p = el.closest('.lt-art')!.getBoundingClientRect(); return el.scrollWidth <= el.clientWidth + 1 && a.right <= p.right + 1 && a.left >= p.left - 1; }));
        for (const ok of fig) expect(ok).toBe(true);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

// Drafts of pages that are not a marketing story work in a browser: nothing overflows at 390px or 1440px,
// every declared state has a view, and the parts are joined up (filters, the detail drawer, a running
// total, the billing toggle, an app's screens).
const PAGES: Record<string, string> = {
  pricing: 'Pricing page for Quill, a note-taking app for small teams, £8 a month or £80 a year per person, includes unlimited notes, shared folders and offline mode',
  checkout: 'Checkout for Fernhill, a homeware shop: a walnut desk lamp £67, three wool throws at £42 each, standard delivery £3.95, next day delivery £8.50, free delivery over £250',
  admin: 'Admin list of orders for Fernhill, a furniture shop, orders with customer, items, total, placed and status: paid, shipped, delivered, refunded',
  dashboard: 'Dashboard for Pawprint, a booking app for dog groomers that tracks bookings, clients and payments, bookings with dog, owner, groomer, date, price and status',
  phone: 'Phone app for Tally Up, a habit tracker, how it works: pick three habits, tick them off each day, see your week',
};
test('drafts of other page types: no overflow, states that show, parts that work', async ({ page }) => {
  const root2 = mkdtempSync(join(tmpdir(), 'lt-spec-pages-'));
  try {
    const url = (slug: string, q = '') => pathToFileURL(join(root2, slug, 'index.html')).href + q;
    for (const [slug, brief] of Object.entries(PAGES)) {
      const r = spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), brief, '--project', join(root2, slug), '--write'], { encoding: 'utf8' });
      expect(r.status, r.stderr).toBe(0);
      const errors: string[] = [];
      page.removeAllListeners('pageerror');
      page.on('pageerror', (e) => errors.push(e.message));
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url(slug));
        // Charts settle to their box on the first resize tick.
        await page.waitForTimeout(250);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${slug} at ${width}`).toBeLessThanOrEqual(0);
      }
      expect(errors, slug).toEqual([]);
      for (const state of ['loading', 'empty', 'error']) {
        if (!['admin', 'dashboard', 'phone'].includes(slug)) break;
        await page.goto(url(slug, `?state=${state}`));
        expect(await page.locator(`[data-view~="${state}"]:visible`).count(), `${slug} ${state}`).toBeGreaterThan(0);
        expect(await page.locator('[data-view="ready"]:visible').count(), `${slug} ${state}: ready views hide`).toBe(0);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    // Monthly or yearly: the price and the note change together.
    await page.goto(url('pricing'));
    await expect(page.locator('.pr-price data')).toHaveText('£8');
    await page.getByRole('radio', { name: 'Yearly' }).click();
    await expect(page.locator('.pr-price data')).toHaveText('£80');
    await expect(page.locator('[data-billnote]')).toContainText('£80');
    // The running total follows the delivery choice; over the threshold standard delivery is free.
    await page.goto(url('checkout'));
    await expect(page.locator('.co-pay [data-total]')).toHaveText('£196.95');
    await page.getByText('Next day delivery').click();
    await expect(page.locator('.co-pay [data-total]')).toHaveText('£201.50');
    // Search and the status filter; a row opens in the drawer with its fields.
    await page.goto(url('admin'));
    await page.getByRole('radio', { name: 'Refunded' }).click();
    const shown = await page.locator('tbody tr:visible').count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(12);
    await page.locator('tbody tr:visible button.ad-person').first().click();
    await expect(page.locator('#detail')).toBeVisible();
    await expect(page.locator('#detail [data-detail-list]')).toContainText('Refunded');
    // Charts draw from the data in the markup.
    await page.goto(url('dashboard'));
    await expect(page.locator('[data-chart="kpi-card"] .lt-kpi').first()).toBeVisible();
    // A phone app: every screen at once on a desktop, one at a time on a phone; a row opens the record.
    await page.goto(url('phone'));
    await expect(page.locator('[data-screen]')).toHaveCount(4);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url('phone', '?screen=home'));
    await expect(page.locator('[data-screen="home"]')).toBeVisible();
    await expect(page.locator('[data-screen="start"]')).toBeHidden();
    await page.locator('[data-screen="home"] [data-go="detail"]').nth(1).click();
    await expect(page.locator('[data-screen="detail"]')).toBeVisible();
  } finally { rmSync(root2, { recursive: true, force: true }); }
});
