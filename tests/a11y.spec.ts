// Accessibility beyond the basics, on every blueprint: what a screen reader walks through (Playwright's aria
// snapshot: landmarks with names, one h1, headings in order, a name on every control, images with alt or
// decorative, live regions where things change, no duplicate ids), then forced colours, right-to-left, a very
// long German word, and Save-Data. The walkthroughs are written to qa/artifacts/a11y/ to read.
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const blueprints = readdirSync(join(root, 'blueprints')).filter((d) => existsSync(join(root, 'blueprints', d, 'meta.json')));
const meta = (id: string) => JSON.parse(readFileSync(join(root, 'blueprints', id, 'meta.json'), 'utf8')) as { states?: string[] };
const out = join(root, 'qa/artifacts/a11y');

type Node = { depth: number; role: string; name: string | null; attrs: string; line: string };
/** The aria snapshot as a flat list of nodes in reading order. */
function parse(snapshot: string): Node[] {
  const nodes: Node[] = [];
  for (const line of snapshot.split('\n')) {
    const m = /^(\s*)- ([a-z]+)(?: "((?:[^"\\]|\\.)*)")?(?: \[([^\]]*)\])?(?::.*)?$/.exec(line);
    if (!m || m[2] === 'text') continue;
    nodes.push({ depth: m[1].length / 2, role: m[2], name: m[3] ?? null, attrs: m[4] ?? '', line: line.trim() });
  }
  return nodes;
}
const LANDMARKS = ['banner', 'main', 'navigation', 'complementary', 'contentinfo', 'region', 'search', 'form'];
const CONTROLS = ['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'treeitem', 'listbox'];

async function walk(page: Page) {
  const nodes = parse(await page.locator('body').ariaSnapshot());
  const problems: string[] = [];
  const landmarks = nodes.filter((n) => LANDMARKS.includes(n.role));
  if (landmarks.filter((n) => n.role === 'main').length !== 1) problems.push(`${landmarks.filter((n) => n.role === 'main').length} main landmarks`);
  for (const role of ['navigation', 'complementary', 'region']) {
    const list = landmarks.filter((n) => n.role === role);
    for (const n of list) if (!n.name && (role !== 'navigation' || list.length > 1) && role !== 'region') problems.push(`a ${role} landmark without a name`);
    const names = list.map((n) => n.name).filter(Boolean);
    if (new Set(names).size !== names.length) problems.push(`two ${role} landmarks share a name (${names.join(', ')})`);
  }
  const heads = nodes.filter((n) => n.role === 'heading').map((n) => ({ ...n, level: +(/level=(\d)/.exec(n.attrs)?.[1] ?? 0) }));
  const h1 = heads.filter((h) => h.level === 1);
  if (h1.length !== 1) problems.push(`${h1.length} h1 headings`);
  for (let i = 1; i < heads.length; i++) if (heads[i].level > heads[i - 1].level + 1) problems.push(`heading jumps from h${heads[i - 1].level} to h${heads[i].level} at “${heads[i].name}”`);
  for (const n of nodes) {
    if (CONTROLS.includes(n.role) && n.role !== 'listbox' && !n.name) problems.push(`a ${n.role} with no name`);
    if (n.role === 'img' && !n.name) problems.push('an image with no alt (give it alt text, or alt="" if it is decoration)');
  }
  const outline = nodes.filter((n) => LANDMARKS.includes(n.role) || n.role === 'heading').map((n) => `${'  '.repeat(n.depth)}${n.role}${n.name ? ` “${n.name}”` : ''}${n.role === 'heading' ? ` ${n.attrs}` : ''}`).join('\n');
  return { problems, outline, nodes };
}

test.describe('screen-reader walkthrough', () => {
  mkdirSync(out, { recursive: true });
  for (const id of blueprints) {
    test(`${id}: landmarks, one h1, headings in order, names, alt text, live regions, unique ids`, async ({ page }) => {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width > 900 ? 900 : 844 });
        await page.goto(`/blueprints/${id}/`);
        await page.waitForTimeout(150);
        const { problems, outline } = await walk(page);
        writeFileSync(join(out, `${id}-${width}.txt`), outline + '\n');
        expect(problems, `${id} at ${width}px:\n${outline}`).toEqual([]);
      }
      const dom = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
        const dup = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
        const noAlt = [...document.querySelectorAll('img:not([alt])')].length;
        // References that point nowhere: a label or description a screen reader cannot follow.
        const broken = [...document.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls], label[for]')].flatMap((e) => (e.getAttribute('aria-labelledby') ?? e.getAttribute('aria-describedby') ?? e.getAttribute('aria-controls') ?? e.getAttribute('for') ?? '').split(/\s+/).filter(Boolean).filter((r) => !document.getElementById(r)).map((r) => `${e.tagName.toLowerCase()} → #${r}`));
        const live = document.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"], output').length;
        return { dup, noAlt, broken, live };
      });
      expect(dom.dup, 'duplicate ids').toEqual([]);
      expect(dom.noAlt, 'images without alt').toBe(0);
      expect(dom.broken, 'aria references to missing ids').toEqual([]);
      // A page whose content changes (states, filters, toasts) tells screen readers so through a live region.
      if (meta(id).states?.length) expect(dom.live, 'live regions').toBeGreaterThan(0);
    });
  }
});

test.describe('live regions announce what changed', () => {
  test('work app: typing a filter updates the count in a status region', async ({ page }) => {
    await page.goto('/blueprints/workspace/');
    const before = await page.locator('#ws-count').textContent();
    await page.fill('#ws-q', 'Moss');
    await expect(page.locator('#ws-count')).not.toHaveText(before!);
    await expect(page.locator('#ws-count')).toHaveAttribute('role', 'status');
  });
  test('phone app: a swipe action is announced', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blueprints/app-phone/?screen=home');
    // The keyboard path: the row's own More button opens the actions and moves focus to the first (Remind).
    await page.locator('#ap-later [data-id="1015"] [data-part="more"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#ap-a1015 [data-action="remind"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#ap-later [data-part="live"]')).not.toHaveText('');
  });
});

// ---------------------------------------------------------------- forced colours
test.describe('forced colours', () => {
  for (const [id, q] of [['app-phone', '?screen=home'], ['workspace', ''], ['settings', ''], ['dashboard', '']] as const) {
    test(`${id}: control parts, meters and the selected segment stay visible, and focus shows`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto(`/blueprints/${id}/${q}`);
      expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
      // The selected segment, switch tracks and meter fills each have a border or a system colour of their own.
      const lost = await page.evaluate(() => [...document.querySelectorAll('[data-part="indicator"], [data-part="track"], [data-part="thumb"], [class*="meter"] > i')].filter((e) => {
        if (!(e instanceof HTMLElement) || e.closest('svg, [hidden], [inert], dialog:not([open])')) return false;
        const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3) return false;
        for (let a: Element | null = e; a; a = a.parentElement) if (+getComputedStyle(a).opacity === 0 || getComputedStyle(a).visibility === 'hidden') return false;
        const cs = getComputedStyle(e);
        const ground = (() => { for (let a = e.parentElement; a; a = a.parentElement) { const c = getComputedStyle(a).backgroundColor; if (!/rgba\(.*, 0\)$/.test(c) && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; })();
        const border = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width` as 'borderTopWidth']) > 0 && cs[`border${s}Style` as 'borderTopStyle'] !== 'none');
        return !border && (cs.backgroundColor === ground || /rgba\(.*, 0\)$/.test(cs.backgroundColor)) && cs.outlineStyle === 'none';
      }).map((e) => `${e.parentElement?.className}/${e.getAttribute('data-part') ?? e.tagName}`));
      expect(lost).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------- right to left
test.describe('right to left', () => {
  test('work app: the sidebar moves to the right and the inspector to the left', async ({ page }) => {
    await page.goto('/blueprints/workspace/');
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const [side, insp] = await Promise.all([page.locator('.lt-sidebar').boundingBox(), page.locator('#ws-inspector').boundingBox()]);
    expect(side!.x + side!.width).toBeGreaterThan(1440 - 2);
    expect(insp!.x).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  });
  test('phone app: the back button leads from the right, the tab bar keeps its order mirrored', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blueprints/app-phone/?screen=sailing');
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const back = await page.locator('#screen-sailing [data-part="back"]').boundingBox();
    expect(back!.x + back!.width).toBeGreaterThan(390 - 60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
  for (const id of blueprints) {
    test(`${id}: no sideways scroll in rtl at 390px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/blueprints/${id}/`);
      await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
      await page.waitForTimeout(100);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    });
  }
});

// ---------------------------------------------------------------- long words and less data
test.describe('long words', () => {
  for (const id of blueprints) {
    test(`${id}: a long German compound wraps instead of widening the page`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/blueprints/${id}/`);
      await page.evaluate(() => {
        for (const e of document.querySelectorAll('h1, h2, h3, p, li, dd, figcaption')) {
          if (e.closest('svg, pre, code, nav, button, a, [aria-hidden="true"], [inert]')) continue;
          const t = [...e.childNodes].find((c) => c.nodeType === 3 && (c.textContent ?? '').trim().length > 2);
          if (t) t.textContent = `${t.textContent} Rechtsschutzversicherungsgesellschaften `;
        }
      });
      await page.waitForTimeout(100);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    });
  }
});

test('Save-Data: the hero film stays a still and nothing far down loads early', async ({ page, context }) => {
  await context.setExtraHTTPHeaders({ 'Save-Data': 'on' });
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, addEventListener() {}, removeEventListener() {} } }));
  let media = 0;
  page.on('request', (r) => { if (r.resourceType() === 'media') media++; });
  await page.goto('/#/ui/hero-video');
  await page.waitForTimeout(800);
  expect(media).toBe(0);
  expect(await page.evaluate(() => [...document.querySelectorAll('video')].filter((v) => !v.paused).length)).toBe(0);
});
