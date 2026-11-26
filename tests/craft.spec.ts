// Craft: art-panel scenes drawn in a real panel, micro-interactions with motion on and with reduced motion, and
// the gallery's Moments and Before / after views playing their stages.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sceneSvg } from '../scripts/lib/image-motifs.mjs';
// @ts-expect-error: a plain ES module without types
import { motionFiles } from './motion/build.mjs';

const errorsOf = (page: Page) => { const e: string[] = []; page.on('pageerror', (x) => e.push(x.message)); page.on('console', (m) => { if (m.type() === 'error') e.push(m.text()); }); return e; };
/** An element page's live stage, with motion as asked. */
async function stage(page: Page, id: string, motion: 'no-preference' | 'reduce' = 'no-preference') {
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto('about:blank');
  await page.goto(`/#/ui/${id}`);
  await expect(page.locator(`#ui-${id}`)).toBeVisible();
  await page.waitForTimeout(300);
  return page.locator(`#ui-${id} [data-stage]`);
}
const frames = (page: Page, fn: () => unknown, n: number, every = 16) => page.evaluate(async ([src, n, every]) => {
  const f = new Function(`return (${src})()`) as () => unknown;
  const out: unknown[] = [];
  for (let i = 0; i < (n as number); i++) { out.push(f()); await new Promise((r) => setTimeout(r, every as number)); }
  return out;
}, [fn.toString(), n, every] as const);

test.describe('scenes', () => {
  test('a scene stands on one ground above the name, the subject alone in the accent, one line weight at every scale', async ({ page }) => {
    const errors = errorsOf(page);
    const s = await stage(page, 'art-panel');
    for (const [mode, type] of [['light', 'humanist'], ['dark', 'stencil']] as const) {
      const r = await s.locator('.lt-art-demo').evaluate((demo, [svg, mode, type]) => {
        const box = demo.closest<HTMLElement>('[data-theme-root]')!;
        box.dataset.mode = mode; box.dataset.type = type;
        demo.innerHTML = `<figure class="lt-art" data-frame data-scene="bag cup jar">${svg}<p data-part="name">Huila</p><p data-part="fact">Roasted Tuesday</p></figure>`;
        const fig = demo.querySelector<HTMLElement>('.lt-art')!;
        const sc = fig.querySelector<SVGSVGElement>('[data-part="scene"]')!;
        const f = fig.getBoundingClientRect(), name = fig.querySelector('[data-part="name"]')!.getBoundingClientRect();
        const groups = [...sc.querySelectorAll<SVGGElement>(':scope > g')];
        const things = groups.map((g) => g.getBoundingClientRect());
        const probe = document.createElement('i'); probe.style.color = 'var(--accent-solid)'; fig.append(probe);
        const accent = getComputedStyle(probe).color; probe.remove();
        // The line drawn on screen: the computed stroke times the group's own scale.
        const drawn = groups.map((g) => parseFloat(getComputedStyle(g.querySelector('[data-m="ink"]')!).strokeWidth.replace('calc(', '')) * +g.style.getPropertyValue('--k'));
        const lead = groups.find((g) => g.dataset.role === 'lead')!;
        const restFills = groups.filter((g) => g.dataset.role === 'rest').flatMap((g) => [...g.querySelectorAll('[data-m="a"]')].map((p) => getComputedStyle(p).fill));
        return {
          three: groups.length === 3,
          inside: things.every((t) => t.left >= f.left - 1 && t.right <= f.right + 1 && t.top >= f.top - 1),
          above: things.every((t) => t.bottom <= name.top + 2),
          leadAccent: getComputedStyle(lead.querySelector('[data-m="a"]')!).fill === accent,
          restQuiet: restFills.length > 0 && restFills.every((c) => c !== accent),
          oneWeight: Math.max(...drawn) - Math.min(...drawn) < drawn[0] * 0.03 || drawn.join(' '),
          nameOnTop: getComputedStyle(fig.querySelector('[data-part="name"]')!).zIndex === '1',
          weight: drawn[0],
        };
      }, [sceneSvg('bag cup jar'), mode, type] as const);
      expect({ ...r, weight: 0 }, `${mode} ${type}`).toEqual({ three: true, inside: true, above: true, leadAccent: true, restQuiet: true, oneWeight: true, nameOnTop: true, weight: 0 });
    }
    expect(errors).toEqual([]);
  });

  test('the line weight follows the type pairing', async ({ page }) => {
    const s = await stage(page, 'art-panel');
    const weights = await s.locator('.lt-art-demo').evaluate((demo) => {
      const box = demo.closest<HTMLElement>('[data-theme-root]')!;
      const fig = demo.querySelector<HTMLElement>('.lt-art')!;
      const ink = fig.querySelector('[data-m="ink"]')!;
      return ['didone', 'legal', 'humanist', 'slab', 'stencil'].map((t) => { box.dataset.type = t; return parseFloat(getComputedStyle(ink).strokeWidth.replace('calc(', '')); });
    });
    expect(weights[0]).toBeLessThan(weights[2]);
    expect(weights[1]).toBeLessThan(weights[2]);
    expect(weights[3]).toBeGreaterThan(weights[2]);
    expect(weights[4]).toBeGreaterThanOrEqual(weights[3]);
  });
});

test.describe('micro-interactions', () => {
  test('a pressed button sinks a pixel or two and springs back; hover never grows it; reduced motion keeps it still', async ({ page }) => {
    for (const motion of ['no-preference', 'reduce'] as const) {
      const s = await stage(page, 'button', motion);
      const btn = s.locator('.lt-btn').first();
      await btn.hover();
      await page.waitForTimeout(200);
      const hover = await btn.evaluate((el) => getComputedStyle(el).transform);
      expect(hover, `${motion}: hover`).toBe('none');
      await page.mouse.down();
      await page.waitForTimeout(160);
      const down = await btn.evaluate((el) => { const m = new DOMMatrix(getComputedStyle(el).transform); return { y: m.f, sx: m.a }; });
      if (motion === 'no-preference') { expect(down.y).toBeGreaterThanOrEqual(1); expect(down.y).toBeLessThanOrEqual(2); } else expect(down.y).toBe(0);
      expect(down.sx, 'never a scale').toBe(1);
      await page.mouse.up();
      if (motion === 'no-preference') {
        // On release it passes its rest (a spring), then settles at zero.
        const ys = (await frames(page, () => new DOMMatrix(getComputedStyle(document.querySelector('#ui-button [data-stage] .lt-btn')!).transform).f, 30, 12)) as number[];
        expect(Math.min(...ys), 'overshoots upward').toBeLessThan(0);
        await page.waitForTimeout(400);
      }
      expect(await btn.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).f)).toBe(0);
    }
  });

  test('a switch thumb crosses with a small overshoot and settles; under reduced motion it jumps', async ({ page }) => {
    for (const motion of ['no-preference', 'reduce'] as const) {
      const s = await stage(page, 'toggle-switch', motion);
      const sw = s.locator('.lt-switch').nth(1);
      const thumb = sw.locator('[data-part="thumb"]');
      const end = await thumb.evaluate((t) => { const sw = t.closest('.lt-switch')!; const s = getComputedStyle(sw); return parseFloat(s.getPropertyValue('--w')) - parseFloat(s.getPropertyValue('--h')); });
      await sw.click();
      const xs = (await frames(page, () => new DOMMatrix(getComputedStyle(document.querySelectorAll('#ui-toggle-switch [data-stage] .lt-switch [data-part="thumb"]')[1]).transform).e, 28, 12)) as number[];
      if (motion === 'no-preference') {
        expect(Math.max(...xs), 'passes the end').toBeGreaterThan(end + 0.3);
        expect(xs.filter((x) => x > 0 && x < end - 0.5).length, 'travels').toBeGreaterThan(0);
      } else expect(xs.every((x) => Math.abs(x - end) < 0.01 || Math.abs(x) < 0.01), `jumps, never between: ${xs.join(',')}`).toBe(true);
      await page.waitForTimeout(400);
      expect(await thumb.evaluate((t) => new DOMMatrix(getComputedStyle(t).transform).e)).toBeCloseTo(end, 1);
    }
  });

  test('a tick draws itself after the box fills; under reduced motion it is simply there', async ({ page }) => {
    for (const motion of ['no-preference', 'reduce'] as const) {
      const s = await stage(page, 'checkbox', motion);
      const box = s.locator('.lt-check').nth(2);
      await box.click();
      const offs = (await frames(page, () => parseFloat(getComputedStyle(document.querySelectorAll('#ui-checkbox [data-stage] .lt-check [data-part="tick"]')[2]).strokeDashoffset), 24, 14)) as number[];
      if (motion === 'no-preference') expect(offs.some((o) => o > 1 && o < 15), `drawing: ${offs.join(',')}`).toBe(true);
      else expect(offs.every((o) => o < 0.5 || o > 15.5), `at once, never half drawn: ${offs.join(',')}`).toBe(true);
      await page.waitForTimeout(400);
      expect(offs.at(-1)).toBeLessThan(0.5);
    }
  });

  test('a field that fails shakes once, with its message, never while typing, and not at all under reduced motion', async ({ page }) => {
    for (const motion of ['no-preference', 'reduce'] as const) {
      const s = await stage(page, 'text-field', motion);
      const field = s.locator('.lt-field').first();
      const input = field.locator('input');
      await input.fill('ana.lopez');
      await input.blur();
      await expect(field).toHaveAttribute('data-state', 'invalid');
      const anim = await field.evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName));
      const msg = await field.locator('[data-part="message"]').evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName));
      if (motion === 'no-preference') { expect(anim).toContain('lt-shake'); expect(msg).toContain('lt-arrive'); } else { expect(anim).toEqual([]); expect(msg).toEqual([]); }
      await expect(field.locator('[data-part="message"]')).toHaveText(/full address/);
      await page.waitForTimeout(800);
      await expect(field).not.toHaveAttribute('data-shake', '');
      // Typing re-validates live, but never shakes.
      await input.press('End');
      await input.type('x');
      expect(await field.getAttribute('data-shake')).toBeNull();
    }
  });

  test('copy confirms in place: tick, "Copied" rolling in, the same width; still under reduced motion', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    for (const motion of ['no-preference', 'reduce'] as const) {
      const s = await stage(page, 'copy-button', motion);
      const btn = s.locator('.lt-copy');
      const w = (await btn.boundingBox())!.width;
      await btn.click();
      await expect(btn).toHaveAttribute('data-copied', '');
      await expect(btn.locator('[data-part="text"]')).toHaveText('Copied');
      const anim = await btn.locator('[data-part="text"]').evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName));
      expect(anim).toEqual(motion === 'no-preference' ? ['lt-roll-in'] : []);
      expect(Math.abs((await btn.boundingBox())!.width - w)).toBeLessThan(0.5);
    }
  });
});

test.describe('gallery: Moments and Before / after', () => {
  test('every scroll moment plays in its own stage; replay replays; reduced motion shows the still page', async ({ page }) => {
    const errors = errorsOf(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/#/moments');
    await expect(page.locator('.g-moment')).toHaveCount(10);
    await expect(page.locator('.g-micro')).toHaveCount(5);
    // Every stage boots its page when it comes near the screen, and only stages near the screen are live.
    for (const id of ['entrance', 'reveal', 'pinned', 'sideways', 'reveal-product', 'zoom', 'statement', 'stack', 'counts', 'before-after']) {
      const f = page.locator(`#m-${id} iframe`);
      await f.scrollIntoViewIfNeeded();
      await expect.poll(() => f.evaluate((el: HTMLIFrameElement) => !!el.contentDocument?.documentElement?.hasAttribute('data-stage-ready')), { timeout: 10_000, message: id }).toBe(true);
    }
    expect(await page.$$eval('.g-moment iframe', (fs) => fs.filter((f) => (f as HTMLIFrameElement).contentDocument?.documentElement?.hasAttribute('data-stage-ready')).length)).toBeLessThan(7);
    // The pinned scene: scrolled into view, its stage page scrolls and the scene pins.
    const card = page.locator('#m-pinned');
    await card.scrollIntoViewIfNeeded();
    const frame = card.locator('iframe');
    await expect.poll(() => frame.evaluate((f: HTMLIFrameElement) => f.contentWindow!.scrollY), { timeout: 8000 }).toBeGreaterThan(200);
    expect(await frame.evaluate((f: HTMLIFrameElement) => f.contentDocument!.querySelector('.lt-story')!.hasAttribute('data-pin'))).toBe(true);
    // Replay starts it from the top again.
    await page.waitForTimeout(1200);
    const before = await frame.evaluate((f: HTMLIFrameElement) => f.contentWindow!.scrollY);
    await card.locator('[data-replay]').click();
    await expect.poll(() => frame.evaluate((f: HTMLIFrameElement) => f.contentWindow!.scrollY), { timeout: 3000 }).toBeLessThan(before);
    // Reduced motion: the stage reloads still: no pin, the profile's reduced motion on its root.
    await card.locator('[data-reduced]').check({ force: true });
    await expect.poll(() => frame.evaluate((f: HTMLIFrameElement) => f.contentDocument?.documentElement?.dataset.motion), { timeout: 8000 }).toBe('reduced');
    await expect.poll(() => frame.evaluate((f: HTMLIFrameElement) => f.contentDocument?.querySelector('.lt-story')?.hasAttribute('data-pin'))).toBe(false);
    expect(errors).toEqual([]);
  });

  test('micro stages play on their own and follow their reduced-motion switch', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/#/moments');
    const card = page.locator('#mi-shake');
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.lt-field')).toHaveAttribute('data-state', 'invalid', { timeout: 4000 });
    await card.locator('[data-reduced]').check({ force: true });
    await expect(card.locator('.g-micro-stage')).toHaveAttribute('data-motion', 'reduced');
    const sw = page.locator('#mi-switch');
    await sw.scrollIntoViewIfNeeded();
    await expect.poll(() => sw.locator('input').first().isChecked(), { timeout: 4000 }).toBe(true);
  });

  test('before and after: four pairs, the generic side framed off from the gallery, the kit side a live page', async ({ page }) => {
    const errors = errorsOf(page);
    await page.goto('/#/before-after');
    await expect(page.locator('.g-pair')).toHaveCount(4);
    await expect(page.locator('[data-side="before"] iframe[srcdoc]')).toHaveCount(4);
    await expect.poll(() => page.$$eval('[data-side="after"] iframe', (fs) => fs.filter((f) => (f as HTMLIFrameElement).contentDocument?.documentElement?.hasAttribute('data-stage-ready')).length), { timeout: 20_000 }).toBe(4);
    // The kit's first screen draws a scene; its range draws a motif on each panel.
    const after = page.locator('#ba-hero [data-side="after"] iframe');
    expect(await after.evaluate((f: HTMLIFrameElement) => f.contentDocument!.querySelectorAll('[data-part="scene"] g[data-role]').length)).toBe(2);
    expect(await page.locator('#ba-range [data-side="after"] iframe').evaluate((f: HTMLIFrameElement) => f.contentDocument!.querySelectorAll('.lt-art > [data-part="motif"]').length)).toBe(3);
    // The two sides of a pair are the same height.
    const h = await page.$$eval('#ba-hero .g-mstage', (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(h[0]).toBe(h[1]);
    expect(errors).toEqual([]);
  });

  for (const hash of ['#/moments', '#/before-after']) {
    test(`${hash} holds at phone width with no sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/${hash}`);
      await page.waitForTimeout(1200);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      // All eight sections of the nav are visible without scrolling the bar.
      const hidden = await page.$$eval('.g-nav a', (as) => as.filter((a) => { const r = a.getBoundingClientRect(); return r.right > innerWidth || r.left < 0; }).length);
      expect(hidden).toBe(0);
    });
  }
});

test.describe('pages inside frames', () => {
  // The motion test pages (tests/motion/build.mjs) install view-transition, which opts a page in to cross-document
  // view transitions. Written next to the gallery build like motion.spec.ts does, so the frames navigate for real.
  test.beforeAll(async () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'preview/dist/_mt');
    mkdirSync(dir, { recursive: true });
    for (const [name, body] of Object.entries(await motionFiles() as Record<string, string>)) { const tmp = join(dir, `.${name}.craft.${process.pid}`); writeFileSync(tmp, body); renameSync(tmp, join(dir, name)); }
  });
  /** A host page with one frame (scaled, as the gallery shows pages); navigates it to each URL in turn, scrolled half-way first. */
  async function navigateFrame(page: Page, urls: string[]) {
    let crashed = false;
    page.on('crash', () => (crashed = true));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/_mt/plain.html');
    await page.evaluate((u) => { document.body.innerHTML = `<iframe id="f" title="Embedded page" style="width:1280px;height:760px;border:0;transform:scale(.5);transform-origin:0 0" src="${u}"></iframe>`; }, urls[0]);
    const frame = page.locator('#f');
    const loaded = () => frame.evaluate((f: HTMLIFrameElement) => f.contentDocument?.readyState === 'complete' && f.contentWindow!.location.pathname !== 'blank');
    await expect.poll(loaded).toBe(true);
    const marks: Array<boolean | undefined> = [];
    for (const u of urls.slice(1)) {
      await page.waitForTimeout(400);
      await frame.evaluate((f: HTMLIFrameElement) => f.contentWindow!.scrollTo(0, f.contentDocument!.documentElement.scrollHeight / 2));
      await page.waitForTimeout(300);
      marks.push(await frame.evaluate((f: HTMLIFrameElement) => f.contentDocument?.documentElement.hasAttribute('data-vt-frame')));
      await frame.evaluate((f: HTMLIFrameElement, url: string) => { f.src = url; }, u);
      await page.waitForTimeout(900);
      expect(crashed, `navigating to ${u}`).toBe(false);
      await expect.poll(() => frame.evaluate((f: HTMLIFrameElement) => f.contentWindow!.location.href)).toContain(u.replace(/^\//, ''));
    }
    return marks;
  }

  test('a blueprint in a frame navigates twice without crashing', async ({ page }) => {
    await navigateFrame(page, ['/blueprints/venue/', '/blueprints/venue/?state=x', '/blueprints/landing/']);
    expect(await page.locator('#f').evaluate((f: HTMLIFrameElement) => !!f.contentDocument!.querySelector('main'))).toBe(true);
  });

  test('a page that opts in to page transitions never runs one inside a frame, and still navigates', async ({ page }) => {
    // A scrolled page with a pinned scene, navigated twice: this crashed the renderer before the frame guard.
    const marks = await navigateFrame(page, ['/_mt/index.html', '/_mt/index.html?again=1', '/_mt/list.html']);
    expect(marks, 'view-transition knows it is in a frame').toEqual([true, true]);
  });

  test('in a tab, page transitions are unchanged', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/_mt/list.html');
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-vt-frame'))).toBe(false);
    const types = await page.evaluate(() => new Promise<string>((res) => {
      addEventListener('pageswap', (e) => res(String(!!(e as Event & { viewTransition?: unknown }).viewTransition)), { once: true });
      document.getElementById('open')!.click();
    }));
    expect(types).toBe('true');
  });
});

test.describe('scene panels hold their words', () => {
  const pairings = (JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'tokens/typography/source.json'), 'utf8')).pairings as Array<{ id: string }>).map((p) => p.id);
  const cases = [
    ['figure Free', 'data-variant="figure"', '<p data-part="figure">Free</p><p data-part="name">First visit</p>'],
    ['figure £40,000', 'data-variant="figure" data-tone="accent"', '<p data-part="figure">£40,000</p><p data-part="name">Fixed price, start to finish</p><p data-part="fact">Kitchens and extensions</p>'],
    ['two-line name', 'data-frame', '<p data-part="index">Roasted Tuesday</p><p data-part="name">Huila and Sidamo, side by side</p><p data-part="fact">Two coffees · 250 g each</p>'],
    ['name, square', 'data-ratio="1/1" data-tone="ink"', '<p data-part="name">Kestrel Roasters</p><p data-part="fact">Leith · open Tuesday to Saturday</p>'],
    ['wide figure', 'data-ratio="16/9" data-variant="figure"', '<p data-part="figure">£40,000</p><p data-part="name">Fixed price</p>'],
    ['wide name', 'data-ratio="3/2"', '<p data-part="name">Huila and Sidamo</p><p data-part="fact">Two coffees</p>'],
    ['alone', '', ''],
    ['alone, square', 'data-ratio="1/1"', ''],
  ] as const;
  for (const [w, h] of [[1440, 900], [960, 800], [820, 1180], [768, 1024], [390, 844]] as const) {
    test(`at ${w}px, in all ${pairings.length} type pairings, words and scene never overlap`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/?stage=after-hero');
      await expect(page.locator('html[data-stage-ready]')).toHaveCount(1);
      const svg = sceneSvg('bag cup jar');
      await page.evaluate(([cs, svg]) => {
        document.getElementById('g-main')!.innerHTML = (cs as unknown as string[][]).map(([id, attrs, words]) => `<section class="lt-hero-split"><div data-part="copy"><h2>${id}</h2></div><div data-part="visual"><figure class="lt-art" data-case="${id}" data-scene="bag cup jar" ${attrs}>${svg}${words}<figcaption class="lt-visually-hidden">${id}</figcaption></figure></div></section>`).join('');
      }, [cases, svg] as const);
      const bad: string[] = [];
      for (const type of pairings) {
        const r = await page.evaluate((type) => {
          document.documentElement.dataset.type = type;
          const out: string[] = [];
          for (const fig of document.querySelectorAll<HTMLElement>('.lt-art[data-case]')) {
            const id = fig.dataset.case!;
            const f = fig.getBoundingClientRect();
            const sc = fig.querySelector<SVGSVGElement>('[data-part="scene"]')!;
            const box = sc.getBoundingClientRect();
            const ctm = sc.getScreenCTM()!;
            const ground = ctm.d * 176 + ctm.f;
            const things = [...sc.querySelectorAll<SVGGElement>(':scope > g[data-role]')].map((g) => g.getBoundingClientRect());
            const words = [...fig.querySelectorAll<HTMLElement>(':scope > p')];
            for (const p of words) {
              const t = p.getBoundingClientRect();
              const name = `${id} ${p.dataset.part}`;
              if (t.right > f.right + 1 || t.left < f.left - 1) out.push(`${name} leaves the panel (${Math.round(t.right - f.right)}px)`);
              if (p.scrollWidth > p.clientWidth + 1) out.push(`${name} overflows its line`);
              if (t.bottom > f.bottom + 1) out.push(`${name} runs off the foot of the panel (${Math.round(t.bottom - f.bottom)}px)`);
              for (const g of things) {
                const ix = Math.min(t.right, g.right) - Math.max(t.left, g.left), iy = Math.min(t.bottom, g.bottom) - Math.max(t.top, g.top);
                if (ix > 1 && iy > 1) out.push(`${name} overlaps a drawing by ${Math.round(ix)}×${Math.round(iy)}px`);
              }
              // Below the ground line, or (a wide panel) beside the scene's own stretch of ground.
              const beside = t.right <= box.left + 1;
              if (!beside && t.top < ground - 1 && t.bottom > ground - 400 && p.dataset.part !== 'index') out.push(`${name} crosses the ground line (${Math.round(ground - t.top)}px)`);
            }
            if (!words.length) {
              // A scene with no words fills the panel: as wide as it can be drawn, in the middle, not up in a corner.
              const u = things.reduce((a, g) => ({ top: Math.min(a.top, g.top), bottom: Math.max(a.bottom, g.bottom), left: Math.min(a.left, g.left), right: Math.max(a.right, g.right) }), { top: Infinity, bottom: -Infinity, left: Infinity, right: -Infinity });
              const mid = ((u.top + u.bottom) / 2 - f.top) / f.height;
              if (u.right - u.left < f.width * 0.6) out.push(`${id}: a scene alone spans only ${Math.round(((u.right - u.left) / f.width) * 100)}% of the panel's width`);
              if (mid < 0.3 || mid > 0.7) out.push(`${id}: a scene alone sits off-centre (${Math.round(mid * 100)}%)`);
            } else if (things.length && Math.max(...things.map((g) => g.bottom)) - Math.min(...things.map((g) => g.top)) < 24) out.push(`${id}: the scene is squeezed out`);
          }
          return out;
        }, type);
        bad.push(...r.map((x) => `${type}: ${x}`));
      }
      expect(bad).toEqual([]);
    });
  }
});
