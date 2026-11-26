// Scroll moments in real pages: pinned scene, sideways rail, product reveal, counts, the before-and-after
// slider, the video hero and smooth page changes. The pages are built in memory from the shipped snippets
// (tests/motion/build.mjs) and served under /_mt/ with page.route, so nothing is written to disk.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error: a plain ES module without types
import { motionFiles, reactFiles } from './motion/build.mjs';

// Written next to the gallery build (preview/dist is generated and ignored) and served by the test server, so
// navigations are real: cross-document view transitions do not run on responses faked with page.route.
// Each file is written to a temporary name and renamed, so parallel workers never read half a file.
test.beforeAll(async () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'preview/dist/_mt');
  mkdirSync(dir, { recursive: true });
  const files: Record<string, string> = { ...(await motionFiles()), ...(await reactFiles()) };
  for (const [name, body] of Object.entries(files)) { const tmp = join(dir, `.${name}.${process.pid}`); writeFileSync(tmp, body); renameSync(tmp, join(dir, name)); }
});

async function open(page: Page, path = 'index.html', { motion = true } = {}) {
  await page.emulateMedia({ reducedMotion: motion ? 'no-preference' : 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // A missing film is expected (the hero tests only watch for its request).
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Not Found/.test(m.text())) errors.push(m.text()); });
  await page.goto(`/_mt/${path}`);
  await page.waitForLoadState('networkidle');
  return errors;
}
/** Scroll so the middle of `sel` (the nth match) sits at the middle of the screen. */
const centre = (page: Page, sel: string, n = 0) => page.evaluate(([s, i]) => {
  const el = document.querySelectorAll(s)[i as number] as HTMLElement;
  const r = el.getBoundingClientRect();
  scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2);
}, [sel, n] as const);
const settle = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
const opacities = (page: Page, sel: string) => page.$$eval(sel, (els) => els.map((e) => +getComputedStyle(e).opacity));

test.describe('pinned scene (sticky-story)', () => {
  test('the picture stays pinned while the steps scroll, and shows the step at the middle', async ({ page }) => {
    const errors = await open(page);
    const story = page.locator('.lt-story');
    await expect(story).toHaveAttribute('data-pin', '');
    for (let i = 0; i < 3; i++) {
      await centre(page, '.lt-story [data-part="text"]', i);
      await settle(page);
      const op = await opacities(page, '.lt-story li > [data-part="visual"]');
      expect(op[i], `picture ${i + 1} at step ${i + 1}`).toBeGreaterThan(0.9);
      op.forEach((o, k) => { if (k !== i) expect(o, `picture ${k + 1} at step ${i + 1}`).toBeLessThan(0.1); });
      const box = (await page.locator('.lt-story li > [data-part="visual"]').nth(i).boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(900);
    }
    // From the moment it pins until the steps run out, the picture does not move.
    const range = await page.evaluate(() => {
      const steps = document.querySelector<HTMLElement>('.lt-story [data-part="steps"]')!;
      const vis = document.querySelector<HTMLElement>('.lt-story [data-part="visual"]')!;
      const top = parseFloat(getComputedStyle(vis).top), r = steps.getBoundingClientRect();
      return { start: scrollY + r.top - top, end: scrollY + r.bottom - top - vis.offsetHeight };
    });
    expect(range.end - range.start).toBeGreaterThan(600);
    const tops: number[] = [];
    // Measure the layout position: the cross-fade's slight scale would move the box edges.
    await page.addStyleTag({ content: '.lt-story [data-part="visual"] { transform: none !important; }' });
    for (let k = 0; k <= 4; k++) {
      await page.evaluate((y) => scrollTo(0, y), range.start + (range.end - range.start) * k / 4);
      await settle(page);
      tops.push((await page.locator('.lt-story [data-part="visual"]').first().boundingBox())!.y);
    }
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(2);
    await centre(page, '.lt-story [data-part="text"]', 2);
    await settle(page);
    // The step being read is in full ink; the others step back.
    const text = await opacities(page, '.lt-story [data-part="text"]');
    expect(text[2]).toBeGreaterThan(0.95);
    expect(text[0]).toBeLessThan(0.5);
    expect(errors).toEqual([]);
  });

  test('without scroll timelines an observer marks the step at the middle', async ({ page }) => {
    await page.addInitScript(() => { const s = CSS.supports.bind(CSS); CSS.supports = ((a: string, b?: string) => (/animation-timeline/.test(a) ? false : b === undefined ? s(a) : s(a, b))) as typeof CSS.supports; });
    await open(page);
    await expect(page.locator('.lt-story')).toHaveAttribute('data-io', '');
    await centre(page, '.lt-story [data-part="text"]', 1);
    await expect(page.locator('.lt-story [data-part="steps"] > li').nth(1)).toHaveAttribute('data-active', '');
    await expect(page.locator('.lt-story [data-part="steps"] > li[data-active]')).toHaveCount(1);
    await expect.poll(async () => (await opacities(page, '.lt-story li > [data-part="visual"]'))[1]).toBeGreaterThan(0.9);
  });

  test('on a phone every step has its own picture under it, nothing pinned', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await expect(page.locator('.lt-story')).not.toHaveAttribute('data-pin', '');
    for (let i = 0; i < 3; i++) {
      const t = (await page.locator('.lt-story [data-part="text"]').nth(i).boundingBox())!;
      const v = (await page.locator('.lt-story li > [data-part="visual"]').nth(i).boundingBox())!;
      expect(v.y).toBeGreaterThan(t.y + t.height - 1);
      expect(v.width).toBeGreaterThan(300);
    }
    expect(await opacities(page, '.lt-story li > [data-part="visual"]')).toEqual([1, 1, 1]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe('side scroll', () => {
  test('pins and slides the row sideways by exactly its overflow', async ({ page }) => {
    const errors = await open(page);
    const s = page.locator('.lt-side-scroll');
    await expect(s).toHaveAttribute('data-pin', '');
    const travel = await s.evaluate((el) => parseFloat(el.style.getPropertyValue('--travel')));
    expect(travel).toBeGreaterThan(400);
    const at = async (f: number) => {
      await page.evaluate((f) => { const el = document.querySelector<HTMLElement>('.lt-side-scroll')!; scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) * f); }, f);
      await settle(page);
      const pin = (await s.locator('[data-part="pin"]').boundingBox())!;
      const last = (await s.locator('[data-part="track"] > li').last().boundingBox())!;
      const first = (await s.locator('[data-part="track"] > li').first().boundingBox())!;
      return { pinTop: pin.y, lastRight: last.x + last.width, firstLeft: first.x };
    };
    const a = await at(0.02), b = await at(0.5), c = await at(0.99);
    for (const p of [a, b, c]) expect(Math.abs(p.pinTop)).toBeLessThan(1);
    expect(b.firstLeft).toBeLessThan(a.firstLeft - 200);
    // At the end the last picture sits one gutter in from the right edge, fully on screen.
    expect(c.lastRight).toBeLessThanOrEqual(1440);
    expect(c.lastRight).toBeGreaterThan(1440 - 200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
    expect(errors).toEqual([]);
  });

  test('on a phone it is a native row that swipes and snaps', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    const track = page.locator('.lt-side-scroll [data-part="track"]');
    await expect(page.locator('.lt-side-scroll')).not.toHaveAttribute('data-pin', '');
    expect(await track.evaluate((el) => getComputedStyle(el).scrollSnapType)).toContain('x');
    await expect(track).toHaveAttribute('tabindex', '0');
    await track.evaluate((el) => el.scrollBy({ left: 400, behavior: 'instant' as ScrollBehavior }));
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(200);
  });
});

test.describe('product reveal', () => {
  test('opens as it enters and is flat and full size once on screen', async ({ page }) => {
    await open(page);
    const fig = page.locator('.lt-product-reveal [data-part="product"]');
    const scale = () => fig.evaluate((el) => { const m = new DOMMatrix(getComputedStyle(el).transform); return { s: Math.hypot(m.m11, m.m12, m.m13), flat: m.isIdentity }; });
    await page.evaluate(() => { const el = document.querySelector<HTMLElement>('.lt-product-reveal [data-part="product"]')!; scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight + 120); });
    await settle(page);
    const entering = await scale();
    expect(entering.flat).toBe(false);
    expect(entering.s).toBeLessThan(0.95);
    await centre(page, '.lt-product-reveal [data-part="product"]');
    await settle(page);
    expect((await scale()).flat).toBe(true);
  });
});

test.describe('numbers that settle', () => {
  test('each figure counts once and ends on the exact value, without changing width', async ({ page }) => {
    const errors = await open(page);
    const dd = page.locator('.lt-stats-band dd');
    const truth = ['99.98%', '180 ms', '2,400+', '4.8 / 5'];
    const widths = await dd.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    await centre(page, '.lt-stats-band');
    // While counting, screen readers get the true figure and the moving one is hidden from them.
    await expect(page.locator('.lt-stats-band [data-counting]').first()).toBeAttached();
    expect(await page.locator('.lt-stats-band [data-count-run]').first().getAttribute('aria-hidden')).toBe('true');
    const during = await dd.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    during.forEach((w, i) => expect(Math.abs(w - widths[i])).toBeLessThan(1));
    await expect(page.locator('.lt-stats-band [data-counted]')).toHaveCount(4, { timeout: 4000 });
    expect(await dd.allTextContents()).toEqual(truth);
    expect(await page.locator('.lt-stats-band [data-count-run], .lt-stats-band .lt-visually-hidden').count()).toBe(0);
    // Once is once: scrolling away and back does not count again.
    await page.evaluate(() => scrollTo(0, 0)); await centre(page, '.lt-stats-band'); await settle(page);
    await expect(page.locator('.lt-stats-band [data-counting]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('printing mid-count shows the true figures', async ({ page }) => {
    await open(page);
    await centre(page, '.lt-stats-band');
    await expect(page.locator('.lt-stats-band [data-counting]').first()).toBeAttached();
    await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
    expect(await page.locator('.lt-stats-band dd').allTextContents()).toEqual(['99.98%', '180 ms', '2,400+', '4.8 / 5']);
  });
});

test.describe('before and after slider', () => {
  test('moves with the arrow keys, Home and End, and says where it is', async ({ page }) => {
    await open(page);
    const range = page.locator('.lt-before-after [data-part="range"]');
    const box = page.locator('.lt-before-after [data-part="compare"]');
    await range.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(range).toHaveValue('55');
    expect(await box.evaluate((el) => el.style.getPropertyValue('--pos'))).toBe('55%');
    await expect(range).toHaveAttribute('aria-valuetext', '55% before, 45% after');
    await page.keyboard.press('Home');
    await expect(range).toHaveAttribute('aria-valuetext', 'All after');
    await page.keyboard.press('End');
    await expect(range).toHaveValue('100');
    // All before: the after window has closed, and the before picture still lines up with the frame.
    expect((await page.locator('.lt-before-after [data-part="after"]').boundingBox())!.width).toBeLessThan(1);
    const frame = (await box.boundingBox())!, pic = (await page.locator('.lt-before-after [data-part="before"] > [data-mock]').boundingBox())!;
    expect(Math.abs(pic.width - frame.width)).toBeLessThan(1);
    // The focus ring shows on the knob, since the input itself is invisible.
    await page.keyboard.press('ArrowLeft');
    expect(await page.locator('.lt-before-after [data-part="handle"]').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
  });

  test('a pointer drag moves the divider to the pointer', async ({ page }) => {
    await open(page);
    await centre(page, '.lt-before-after [data-part="compare"]');
    const b = (await page.locator('.lt-before-after [data-part="compare"]').boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.25, b.y + b.height / 2, { steps: 6 });
    await page.mouse.up();
    const v = Number(await page.locator('.lt-before-after [data-part="range"]').inputValue());
    expect(Math.abs(v - 25)).toBeLessThanOrEqual(3);
    const handle = (await page.locator('.lt-before-after [data-part="handle"]').boundingBox())!;
    expect(Math.abs(handle.x + handle.width / 2 - (b.x + b.width * v / 100))).toBeLessThan(3);
  });
});

test.describe('hero with video', () => {
  test('without a film it is the still alone, with no dead button', async ({ page }) => {
    await open(page);
    const hero = page.locator('.lt-hero-video');
    await expect(hero).toHaveAttribute('data-state', 'poster');
    await expect(hero.locator('[data-part="toggle"]')).toBeHidden();
    await expect(hero.locator('[data-part="poster"]')).toBeVisible();
  });

  test('under reduced motion the film never loads or plays, and the button offers to play it', async ({ page }) => {
    const films: string[] = [];
    page.on('request', (r) => { if (r.url().endsWith('.mp4')) films.push(r.url()); });
    await open(page, 'film.html', { motion: false });
    const hero = page.locator('.lt-hero-video');
    await expect(hero).toHaveAttribute('data-state', 'paused');
    const toggle = hero.locator('[data-part="toggle"]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', 'Play the film');
    expect(await hero.locator('video').evaluate((v: HTMLVideoElement) => ({ paused: v.paused, src: v.currentSrc }))).toEqual({ paused: true, src: '' });
    expect(films).toEqual([]);
  });

  test('with motion allowed it fetches the film only then, muted and inline, with the box size unchanged', async ({ page }) => {
    const films: string[] = [];
    page.on('request', (r) => { if (r.url().endsWith('.mp4')) films.push(r.url()); });
    const before = await (async () => { await open(page, 'film.html'); return page.locator('.lt-hero-video [data-part="media"]').boundingBox(); })();
    await expect.poll(() => films.length).toBeGreaterThan(0);
    const v = await page.locator('.lt-hero-video video').evaluate((v: HTMLVideoElement) => ({ muted: v.muted, loop: v.loop, inline: v.playsInline }));
    expect(v).toEqual({ muted: true, loop: true, inline: true });
    await expect(page.locator('.lt-hero-video [data-part="toggle"]')).toBeVisible();
    const after = await page.locator('.lt-hero-video [data-part="media"]').boundingBox();
    expect(after).toEqual(before);
  });

  test('Save-Data keeps the film from loading', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    const films: string[] = [];
    page.on('request', (r) => { if (r.url().endsWith('.mp4')) films.push(r.url()); });
    await open(page, 'film.html');
    await page.waitForTimeout(300);
    expect(films).toEqual([]);
    await expect(page.locator('.lt-hero-video')).toHaveAttribute('data-state', 'paused');
  });
});

test.describe('reduced motion leaves everything at rest', () => {
  test('nothing pins, nothing is mid-animation, every figure is its true value', async ({ page }) => {
    const errors = await open(page, 'index.html', { motion: false });
    for (const sel of ['.lt-story', '.lt-side-scroll']) await expect(page.locator(sel)).not.toHaveAttribute('data-pin', '');
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await settle(page);
    const animated = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((el) => !el.closest('video') && getComputedStyle(el).animationName !== 'none').map((el) => el.tagName));
    expect(animated).toEqual([]);
    const still = await page.evaluate(() => [...document.querySelectorAll('.lt-story [data-part="visual"], .lt-story [data-part="text"], .lt-side-scroll [data-part="track"], .lt-product-reveal [data-part="product"]')]
      .filter((el) => { const cs = getComputedStyle(el); return cs.transform !== 'none' || cs.opacity !== '1'; }).length);
    expect(still).toBe(0);
    expect(await page.locator('.lt-stats-band dd').allTextContents()).toEqual(['99.98%', '180 ms', '2,400+', '4.8 / 5']);
    await expect(page.locator('[data-counting]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('print shows the page at rest even with motion on', async ({ page }) => {
    await open(page);
    await page.emulateMedia({ media: 'print' });
    const fig = page.locator('.lt-product-reveal [data-part="product"]');
    expect(await fig.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    expect(await page.locator('.lt-side-scroll [data-part="track"]').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});

test.describe('smooth page changes', () => {
  test('pages with data-vt morph the named picture into the next page', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'cross-document view transitions are Chromium and Safari only');
    await open(page, 'list.html');
    expect(await page.locator('[data-vt-name]').evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('larkspur-chair');
    await page.click('#open');
    await page.waitForURL('**/detail.html');
    await page.waitForFunction(() => (window as unknown as { __reveal: boolean[] }).__reveal.length > 0);
    expect(await page.evaluate(() => (window as unknown as { __reveal: boolean[] }).__reveal)).toEqual([true]);
    expect(await page.locator('[data-vt-name]').evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('larkspur-chair');
  });

  test('under reduced motion there is no page transition at all', async ({ page }) => {
    await open(page, 'list.html', { motion: false });
    await page.click('#open');
    await page.waitForURL('**/detail.html');
    await page.waitForFunction(() => (window as unknown as { __reveal: boolean[] }).__reveal.length > 0);
    expect(await page.evaluate(() => (window as unknown as { __reveal: boolean[] }).__reveal)).toEqual([false]);
  });

  test('a page without data-vt snaps: its page transition has no animation', async ({ page }) => {
    await open(page, 'plain.html');
    const names = await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r): r is CSSStyleRule => r instanceof CSSStyleRule && r.selectorText.includes(':not([data-vt])') && r.selectorText.includes('view-transition-group')).map((r) => r.style.animationName));
    expect(names).toEqual(['none']);
    await page.click('#open');
    await page.waitForURL('**/plain-2.html');
    await expect(page.locator('p')).toHaveText('Second page');
  });
});

test.describe('gallery stages', () => {
  test('the view transition sample opens a picture into its detail and back', async ({ page }) => {
    await page.goto('/#/ui/view-transition');
    const s = page.locator('#ui-view-transition [data-stage]');
    await s.locator('[data-vt-open="moss"]').click();
    await expect(s.locator('[data-part="detail"]')).toBeVisible();
    await expect(s.locator('[data-part="title"]')).toHaveText('Moss stool');
    await expect(s.locator('[data-part="back"]')).toBeFocused();
    await s.locator('[data-part="back"]').click();
    await expect(s.locator('[data-part="list"]')).toBeVisible();
    await expect(s.locator('[data-vt-open="moss"]')).toBeFocused();
  });

  test('the pinned scene plays its steps in turn inside the preview box', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/#/ui/sticky-story');
    const story = page.locator('#ui-sticky-story [data-stage] .lt-story');
    await expect(story).toHaveAttribute('data-play', '');
    await page.mouse.move(0, 0);
    await expect(story.locator('[data-part="steps"] > li').nth(1)).toHaveAttribute('data-active', '', { timeout: 4000 });
  });

  test('every new stage renders at 390 and 1440 without overflow', async ({ page }) => {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ['sticky-story', 'side-scroll', 'product-reveal', 'hero-video', 'before-after', 'stats-band', 'number-settle', 'view-transition']) {
        await page.goto(`/#/ui/${id}`);
        await expect(page.locator(`#ui-${id} [data-stage] :is(h1, h2, h3, b, dd)`).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${id} at ${width}`).toBeLessThanOrEqual(width);
      }
    }
  });
});

test('React wrappers mount and wire their behaviour', async ({ page }) => {
  const errors = await open(page, 'react.html');
  for (const c of ['story', 'side', 'reveal', 'hero', 'slider', 'lists', 'stats', 'count', 'names']) await expect(page.locator(`[data-case="${c}"] > *`).first()).toBeAttached();
  await expect(page.locator('[data-case="lists"] [data-part="cols"]')).toBeVisible();
  await expect(page.locator('[data-case="hero"] .lt-hero-video')).toHaveAttribute('data-state', 'poster');
  const range = page.locator('[data-case="slider"] [data-part="range"]');
  await range.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await range.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ltLog: string[] }).__ltLog.join(','))).toContain('slider:52');
  await page.locator('[data-case="count"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-case="count"] [data-counted]')).toHaveCount(2, { timeout: 4000 });
  expect(await page.locator('[data-case="count"]').textContent()).toBe('186,400 people1,284');
  expect(await page.locator('[data-case="names"] figure').evaluate((el) => getComputedStyle(el).viewTransitionName)).toBe('react-chair');
  expect(errors).toEqual([]);
});

// ---- the marketing blueprints: at most two scroll moments each, never side by side, and each one works
const MARKETING = ['landing', 'devtool', 'assistant', 'shop', 'store', 'practice', 'cause', 'event', 'venue', 'editorial', 'episode', 'pricing'];
const MOMENTS = '.lt-story, .lt-side-scroll, .lt-stack-cards, .lt-statement, [data-zoom], [data-parallax]';

test('marketing blueprints keep the motion budget: two moments at most, never neighbours', async ({ page }) => {
  const report: Record<string, { moments: number; adjacent: boolean }> = {};
  for (const id of MARKETING) {
    await page.goto(`/blueprints/${id}/`);
    report[id] = await page.evaluate((sel) => {
      const bands = [...document.querySelectorAll('main > *')];
      const has = bands.map((b) => b.matches(sel) || !!b.querySelector(sel));
      return { moments: document.querySelectorAll(`main :is(${sel})`).length, adjacent: has.some((h, i) => h && has[i + 1]) };
    }, MOMENTS);
  }
  for (const [id, r] of Object.entries(report)) {
    expect(r.moments, `${id} moments`).toBeLessThanOrEqual(2);
    expect(r.adjacent, `${id} has two moments side by side`).toBe(false);
  }
  // The pages that carry one, carry the one their subject calls for.
  expect(report.landing.moments).toBe(1);
  expect(report.editorial.moments).toBe(1);
  expect(report.shop.moments).toBe(1);
  expect(report.practice.moments).toBe(2);
});

test('landing: setting up is a pinned scene that changes with each step', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/blueprints/landing/');
  const story = page.locator('#how');
  await expect(story).toHaveAttribute('data-pin', '');
  for (let i = 0; i < 3; i++) {
    await centre(page, '#how [data-part="text"]', i);
    await settle(page);
    const op = await opacities(page, '#how li > [data-part="visual"]');
    expect(op[i]).toBeGreaterThan(0.9);
    const box = (await page.locator('#how li > [data-part="visual"]').nth(i).boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
  }
});

test('editorial: the work slides sideways on a wide screen and swipes on a phone', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/blueprints/editorial/');
  const s = page.locator('#work');
  await expect(s).toHaveAttribute('data-pin', '');
  const first = async () => (await s.locator('[data-part="track"] > li').first().boundingBox())!.x;
  await page.evaluate(() => { const el = document.querySelector<HTMLElement>('#work')!; scrollTo(0, el.offsetTop + 10); });
  await settle(page);
  const a = await first();
  await page.evaluate(() => { const el = document.querySelector<HTMLElement>('#work')!; scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) * 0.9); });
  await settle(page);
  expect(await first()).toBeLessThan(a - 300);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(s).not.toHaveAttribute('data-pin', '');
  expect(await s.locator('[data-part="track"]').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
});

test('shop: the making is pinned; the glaze slider moves by keyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/blueprints/shop/');
  await expect(page.locator('#made')).toHaveAttribute('data-pin', '');
  await expect(page.locator('#made .lt-art [data-part="motif"]')).toHaveCount(3);
  const range = page.locator('#glaze [data-part="range"]');
  await range.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(range).toHaveValue('48');
  await expect(range).toHaveAttribute('aria-valuetext', '48% before, 52% after');
});

test('cause, event and devtool: the true figures settle to their exact values', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [id, sel, want] of [['cause', '.lt-hero-statement dd', ['410', '64', '82p']], ['event', '.lt-hero-statement dd', ['18', '6', '320']], ['devtool', '.lt-stats-band dd', ['41 billion', '640 ms', '99.99%', '0']]] as const) {
    await page.goto(`/blueprints/${id}/`);
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await expect(page.locator(`${sel}[data-counted]`).first()).toBeAttached({ timeout: 4000 });
    await expect.poll(() => page.locator(sel).allTextContents(), { timeout: 4000 }).toEqual([...want]);
  }
});

test('the subject sets the type: a clinic is hyperlegible, a roastery stamped, an event stadium, a light developer tool workbench', async ({ page }) => {
  for (const [id, type] of [['practice', 'hyperlegible'], ['venue', 'stamped'], ['event', 'stadium'], ['devtool', 'workbench']]) {
    await page.goto(`/blueprints/${id}/`);
    expect(await page.evaluate(() => document.documentElement.dataset.type)).toBe(type);
  }
});
