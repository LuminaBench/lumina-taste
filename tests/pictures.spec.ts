// Pictures: art panel motifs (the subject drawn from tokens) and device frames (product shots with a live screen).
import { expect, test, type Page } from '@playwright/test';
import { loadMotifs, motifSvg } from '../scripts/lib/image-motifs.mjs';

const solo = async (page: Page, id: string) => {
  await page.goto(`/#/ui/${id}`);
  await expect(page.locator(`#ui-${id}`)).toBeVisible();
  await page.locator('[data-replay]').click();
  await page.waitForTimeout(760);
  return page.locator(`#ui-${id} [data-stage]`);
};
const errorsOf = (page: Page) => { const e: string[] = []; page.on('pageerror', (x) => e.push(x.message)); page.on('console', (m) => { if (m.type() === 'error') e.push(m.text()); }); return e; };

test('art panel: the motif sits above the name, drawn in the theme tokens with one stroke weight', async ({ page }) => {
  const errors = errorsOf(page);
  for (const mode of ['light', 'dark']) {
    const s = await solo(page, 'art-panel');
    await page.evaluate((m) => { document.documentElement.dataset.mode = m; document.querySelectorAll<HTMLElement>('[data-theme-root]').forEach((r) => (r.dataset.mode = m)); }, mode);
    const r = await s.locator('.lt-art').first().evaluate((fig) => {
      const svg = fig.querySelector<SVGSVGElement>(':scope > [data-part="motif"]')!;
      const m = svg.getBoundingClientRect(), f = fig.getBoundingClientRect(), name = fig.querySelector('[data-part="name"]')!.getBoundingClientRect();
      const ink = [...svg.querySelectorAll('[data-m="ink"]')].map((g) => getComputedStyle(g));
      const fill = getComputedStyle(svg.querySelector('[data-m="a"]')!).fill;
      const probe = document.createElement('i'); probe.style.color = 'var(--accent-solid)'; fig.append(probe);
      const accent = getComputedStyle(probe).color; probe.style.color = 'var(--text-primary)'; const text = getComputedStyle(probe).color; probe.remove();
      return {
        inside: m.left >= f.left - 1 && m.right <= f.right + 1 && m.top >= f.top - 1,
        above: m.bottom <= name.top + 4,
        large: m.height >= f.height * 0.5,
        oneStroke: new Set(ink.map((c) => c.strokeWidth)).size === 1,
        inkIsText: ink.every((c) => c.stroke === text),
        accent: fill === accent,
        hidden: svg.getAttribute('aria-hidden') === 'true',
      };
    });
    expect(r, mode).toEqual({ inside: true, above: true, large: true, oneStroke: true, inkIsText: true, accent: true, hidden: true });
  }
  expect(errors).toEqual([]);
});

test('every motif draws inside its panel in every tone, and a photograph covers it', async ({ page }) => {
  const s = await solo(page, 'art-panel');
  const names = Object.keys(loadMotifs());
  const html = names.map((n, i) => `<figure class="lt-art" data-motif="${n}"${['', ' data-tone="accent"', ' data-tone="ink"', ' data-pattern="arch"'][i % 4]}>${motifSvg(n)}<p data-part="name">${n}</p><p data-part="fact">One fact</p></figure>`).join('');
  const r = await s.locator('.lt-art-demo').evaluate((demo, h) => {
    demo.innerHTML = h;
    return [...demo.querySelectorAll<HTMLElement>('.lt-art')].map((fig) => {
      const svg = fig.querySelector('svg')!, b = (svg as SVGGraphicsElement).getBBox(), m = svg.getBoundingClientRect(), f = fig.getBoundingClientRect();
      const name = fig.querySelector('[data-part="name"]')!;
      return { motif: fig.dataset.motif, drawn: Math.max(b.width, b.height) > 90 && Math.min(b.width, b.height) > 40, inside: m.right <= f.right + 1 && m.top >= f.top - 1, nameOnTop: getComputedStyle(name).zIndex === '1' };
    });
  }, html);
  expect(r.filter((x) => !x.drawn || !x.inside || !x.nameOnTop)).toEqual([]);
  expect(r).toHaveLength(names.length);
  const covered = await s.locator('.lt-art').first().evaluate((fig) => {
    const img = document.createElement('img'); img.alt = ''; img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%225%22/%3E';
    fig.prepend(img);
    return getComputedStyle(fig.querySelector('[data-part="motif"]')!).display;
  });
  expect(covered).toBe('none');
});

test('device frame: a laptop and a phone whose live screens are drawn at device size and zoomed to fit', async ({ page }) => {
  const errors = errorsOf(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const s = await solo(page, 'device-frame');
    const r = await s.evaluate((stage) => [...stage.querySelectorAll<HTMLElement>('.lt-device')].map((d) => {
      const screen = d.querySelector<HTMLElement>('[data-part="screen"]')!, app = screen.querySelector<HTMLElement>('[data-app]')!;
      const sr = screen.getBoundingClientRect(), ar = app.getBoundingClientRect();
      const inner = screen.clientWidth * (sr.width / screen.offsetWidth);
      return { kind: d.dataset.kind, fits: Math.abs(ar.width - inner) < 3, inert: app.inert, focusable: [...app.querySelectorAll<HTMLElement>('button, a[href]')].filter((b) => b.tabIndex >= 0 && !b.closest('[inert]')).length, caption: !!d.querySelector('figcaption.lt-visually-hidden') };
    }));
    expect(r, `${width}`).toEqual([{ kind: 'laptop', fits: true, inert: true, focusable: 0, caption: true }, { kind: 'phone', fits: true, inert: true, focusable: 0, caption: true }]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});

test('device frame: the bezel stays dark in both modes, and a screenshot fills the screen', async ({ page }) => {
  const s = await solo(page, 'device-frame');
  for (const mode of ['light', 'dark']) {
    await page.evaluate((m) => { document.documentElement.dataset.mode = m; document.querySelectorAll<HTMLElement>('[data-theme-root]').forEach((r) => (r.dataset.mode = m)); }, mode);
    const lum = await s.locator('.lt-device[data-kind="phone"] [data-part="screen"]').evaluate((el) => {
      const c = document.createElement('canvas').getContext('2d')!; c.fillStyle = getComputedStyle(el).borderTopColor; c.fillRect(0, 0, 1, 1);
      const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return (r + g + b) / 3;
    });
    expect(lum, mode).toBeLessThan(60);
  }
  const fill = await s.locator('.lt-device[data-kind="phone"] [data-part="screen"]').evaluate((screen) => {
    screen.innerHTML = '<img alt="The payouts screen" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22390%22 height=%22844%22/%3E">';
    const i = screen.querySelector('img')!.getBoundingClientRect(), r = screen.getBoundingClientRect(), b = parseFloat(getComputedStyle(screen).borderTopWidth) * (r.width / screen.offsetWidth);
    return Math.abs(i.width - (r.width - 2 * b)) < 2 && Math.abs(i.height - (r.height - 2 * b)) < 2;
  });
  expect(fill).toBe(true);
});
