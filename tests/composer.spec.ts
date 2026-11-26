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
        const bands = await page.$$eval('main > section', (els) => els.map((el) => ({ bg: getComputedStyle(el).backgroundColor, tone: el.getAttribute('data-tone'), rhythm: el.getAttribute('data-rhythm'), scale: el.getAttribute('data-scale'), picture: el.classList.contains('lt-media-band') })));
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
