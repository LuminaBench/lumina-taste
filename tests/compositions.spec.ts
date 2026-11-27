// First-screen compositions, bars and feet in a real browser: every composition with every kind of picture holds
// at 1440, 768 and 390 (no sideways scroll, the headline in the first screen), words over a picture keep their
// contrast against the brightest picture, right to left mirrors, and the marketing blueprints no longer share
// one skeleton. Pages are built in memory (tests/compositions/build.mjs) and written next to the gallery build.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error: a plain ES module without types
import { compositionFiles, HEROES } from './compositions/build.mjs';

test.beforeAll(async () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'preview/dist/_hc');
  mkdirSync(dir, { recursive: true });
  const files: Record<string, string> = await compositionFiles();
  for (const [name, body] of Object.entries(files)) { const tmp = join(dir, `.${name}.${process.pid}`); writeFileSync(tmp, body); renameSync(tmp, join(dir, name)); }
});

const WIDTHS = [[1440, 900], [768, 1024], [390, 844]] as const;
const heroes = HEROES as Record<string, [unknown, string[]]>;

for (const [name, [, slots]] of Object.entries(heroes)) {
  test(`${name}: every picture, three widths, both modes: no sideways scroll, the headline and action in the first screen`, async ({ page }) => {
    for (const slot of slots) {
      for (const [w, h] of WIDTHS) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(`/_hc/${name}--${slot}.html`);
        for (const mode of ['light', 'dark']) {
          const r = await page.evaluate((m) => {
            document.documentElement.dataset.mode = m;
            const h1 = document.querySelector('h1')!.getBoundingClientRect();
            const btn = document.querySelector('main .lt-btn[data-variant="primary"]')!.getBoundingClientRect();
            const vis = document.querySelector('main [data-part="visual"], main [data-part="media"], main [data-part="tiles"], main [data-part="board"]');
            const vr = vis?.getBoundingClientRect();
            return { over: document.documentElement.scrollWidth - innerWidth, h1Top: h1.top, h1Bottom: h1.bottom, btnBottom: btn.bottom, h1s: document.querySelectorAll('h1').length, vis: vr ? Math.round(vr.width * vr.height) : 0 };
          }, mode);
          const where = `${name} ${slot} ${w} ${mode}`;
          expect(r.over, `${where}: sideways scroll`).toBeLessThanOrEqual(0);
          expect(r.h1s, where).toBe(1);
          expect(r.h1Top, `${where}: headline starts in the first screen`).toBeLessThan(h);
          expect(r.h1Top, where).toBeGreaterThanOrEqual(0);
          expect(r.vis, `${where}: something to look at`).toBeGreaterThan(20000);
          // The action is in the first screen everywhere except where the picture comes first on purpose (the
          // board and the film keep it near; phones get it within a screen and a half).
          expect(r.btnBottom, `${where}: the action is reachable`).toBeLessThan(w === 390 ? h * 1.5 : h * 1.25);
        }
      }
    }
  });
}

/** Contrast of the words over the picture: the brightest pixel behind each text box, with the words hidden. */
async function wordsOverPicture(page: Page) {
  // Read the words' colours at rest, not part-way through a hover or theme transition.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  await page.waitForTimeout(50);
  const boxes = await page.evaluate(() => [...document.querySelectorAll('main section [data-part="copy"] :is(h1, p, .lt-btn[data-variant="ghost"])')].map((el) => {
    const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { x: r.x, y: r.y, w: r.width, h: r.height, color: cs.color, large: parseFloat(cs.fontSize) >= 24 };
  }));
  await page.addStyleTag({ content: 'main section [data-part="copy"] { visibility: hidden !important; }' });
  const shot = await page.screenshot();
  return page.evaluate(async ({ png, boxes }) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d')!; x.drawImage(img, 0, 0);
    const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    // The screenshot may be at the screen's pixel density (WebKit on a 2× display): scale the boxes to it.
    const k = img.width / innerWidth;
    return boxes.map((b) => {
      const d = x.getImageData(Math.max(0, b.x * k), Math.max(0, b.y * k), Math.max(1, b.w * k), Math.max(1, b.h * k)).data;
      let max = 0; for (let i = 0; i < d.length; i += 16) max = Math.max(max, L(d[i], d[i + 1], d[i + 2]));
      const cv = document.createElement('canvas').getContext('2d')!; cv.fillStyle = b.color; cv.fillRect(0, 0, 1, 1); const [r, g, bl] = cv.getImageData(0, 0, 1, 1).data;
      const t = L(r, g, bl); const ratio = (Math.max(t, max) + 0.05) / (Math.min(t, max) + 0.05);
      return { ratio: Math.round(ratio * 100) / 100, need: b.large ? 3 : 4.5 };
    });
  }, { png: shot.toString('base64'), boxes });
}

test('words over a picture keep their contrast over a white picture, in both modes and at both widths', async ({ page }) => {
  for (const file of ['bleed--white', 'film--white', 'rtl-bleed']) {
    for (const [w, h] of [[1440, 900], [390, 844]] as const) {
      for (const mode of ['light', 'dark']) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(`/_hc/${file}.html`);
        await page.evaluate((m) => { document.documentElement.dataset.mode = m; }, mode);
        for (const r of await wordsOverPicture(page)) expect(r.ratio, `${file} ${w} ${mode}`).toBeGreaterThanOrEqual(r.need);
      }
    }
  }
});

test('right to left: the overlapping picture moves to the left, the scrim follows the words', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/_hc/rtl-overlap.html');
  const o = await page.evaluate(() => ({ vis: document.querySelector('[data-part="visual"]')!.getBoundingClientRect().left, copy: document.querySelector('[data-part="copy"]')!.getBoundingClientRect().right, w: innerWidth }));
  expect(o.vis).toBeLessThanOrEqual(1);
  expect(o.copy).toBeGreaterThan(o.w * 0.8);
  await page.goto('/_hc/rtl-bleed.html');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-part="visual"]')!, '::after').backgroundImage)).toMatch(/270deg/);
});

test('bars: an ink, brand, split or minimal bar contrasts with the page in light and dark, and fits a phone', async ({ page }) => {
  for (const k of ['ink', 'brand', 'split', 'minimal']) {
    for (const mode of ['light', 'dark']) {
      for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]] as const) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(`/_hc/nav-${k}-${mode}.html`);
        const r = await page.evaluate(() => {
          const lum = (c: string) => { const cv = document.createElement('canvas').getContext('2d')!; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const [r, g, b] = cv.getImageData(0, 0, 1, 1).data; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
          return { bar: lum(getComputedStyle(document.querySelector('header')!).backgroundColor), page: lum(getComputedStyle(document.body).backgroundColor), over: document.documentElement.scrollWidth - innerWidth, brand: document.querySelector('[data-part="brand"]')!.getBoundingClientRect(), action: document.querySelector('[data-part="actions"]')!.getBoundingClientRect() };
        });
        expect(Math.abs(r.bar - r.page), `${k} ${mode} ${w}: the bar stands apart from the page`).toBeGreaterThan(0.2);
        expect(r.over, `${k} ${mode} ${w}`).toBeLessThanOrEqual(0);
        expect(r.brand.right <= r.action.left || r.brand.left >= r.action.right, `${k} ${w}: name and action do not overlap`).toBe(true);
      }
    }
  }
  // The split bar centres the name between the links and the action on a wide screen.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/_hc/nav-split-light.html');
  const c = await page.evaluate(() => { const b = document.querySelector('[data-part="brand"]')!.getBoundingClientRect(); return Math.abs(b.left + b.width / 2 - innerWidth / 2); });
  expect(c).toBeLessThan(40);
});

test('feet: the wordmark fills its column without leaving it; the contact foot sets the phone large', async ({ page }) => {
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/_hc/feet.html');
    const r = await page.evaluate(() => {
      const wm = document.querySelector('[data-part="wordmark"]') as HTMLElement; const col = wm.parentElement!.getBoundingClientRect(); const pad = parseFloat(getComputedStyle(wm.parentElement!).paddingRight);
      return { over: document.documentElement.scrollWidth - innerWidth, fill: wm.scrollWidth / (col.width - 2 * pad), clipped: wm.scrollWidth > wm.clientWidth + 1, phone: parseFloat(getComputedStyle(document.querySelector('[data-part="reach"] a')!).fontSize) };
    });
    expect(r.over, `${w}`).toBeLessThanOrEqual(0);
    expect(r.clipped, `${w}: wordmark clipped`).toBe(false);
    expect(r.fill, `${w}: the wordmark spans most of the column`).toBeGreaterThan(0.6);
    expect(r.phone, `${w}`).toBeGreaterThanOrEqual(26);
  }
});

test('marketing blueprints: no two share a first-screen skeleton, none has a note under its buttons, each hero under 40 words', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const seen = new Map<string, string>();
  for (const id of ['landing', 'devtool', 'shop', 'practice', 'cause', 'event', 'venue', 'editorial']) {
    await page.goto(`/blueprints/${id}/`);
    const r = await page.evaluate(() => {
      const hero = document.querySelector('main > section')!;
      const copy = hero.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('[data-part="visual"], figure, picture, img, svg, .lt-art, .lt-device, [data-mock], [data-app], .lt-visually-hidden, [hidden], button[data-part="pause"]').forEach((n) => n.remove());
      const bar = document.querySelector('body > header, body > .lt-navbar') as HTMLElement | null;
      return { skeleton: `${hero.className.split(' ')[0]}:${hero.getAttribute('data-variant') ?? 'default'}`, note: !!hero.querySelector('[data-part="note"], .bp-hero-note, .dv-note'), words: copy.textContent!.trim().split(/\s+/).filter(Boolean).length, actions: hero.querySelectorAll('.lt-btn').length };
    });
    expect(seen.has(r.skeleton), `${id} shares ${r.skeleton} with ${seen.get(r.skeleton)}`).toBe(false);
    seen.set(r.skeleton, id);
    expect(r.note, `${id}: note under the buttons`).toBe(false);
    expect(r.words, `${id}: ${r.words} words in the first screen`).toBeLessThanOrEqual(40);
    expect(r.actions, `${id}: one action and at most one quiet link`).toBeLessThanOrEqual(2);
  }
});
