// Display figures under every type pairing. Big numbers set at a line-height near 1 draw a glyph box taller than
// their line in tall-ascender serifs and wide display faces (up to about 1.45em), which reaches into the caption
// beside them. Every block that sets a figure large is rendered under each of the 20 pairings, at a wide and a
// phone width, and no two text boxes inside a block may overlap (the same test the auditor's overlap rule makes).
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error: a plain ES module without types
import { figuresFiles } from './motion/build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAIRINGS: string[] = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings.map((p: { id: string }) => p.id);
let files: Record<string, string> = {};
test.beforeAll(async () => { files = await figuresFiles(); });

for (const width of [1440, 768, 390]) {
  test(`no figure touches its caption under any of the ${PAIRINGS.length} type pairings at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    expect(PAIRINGS.length).toBeGreaterThanOrEqual(20);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/_fig/**', (route) => {
      const name = new URL(route.request().url()).pathname.split('/').pop()!;
      const body = files[name];
      return body === undefined ? route.fulfill({ status: 404, body: '' }) : route.fulfill({ status: 200, contentType: name.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8', body });
    });
    await page.goto('/_fig/figures.html');
    expect(await page.locator('[data-block]').count()).toBeGreaterThanOrEqual(13);
    const found: string[] = [];
    for (const type of PAIRINGS) {
      const hits = await page.evaluate(async (type) => {
        document.documentElement.dataset.type = type;
        await document.fonts.ready;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const out: string[] = [];
        for (const block of document.querySelectorAll<HTMLElement>('[data-block]')) {
          const boxes: Array<{ el: Element; text: string; r: DOMRect }> = [];
          const walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
          for (let n = walk.nextNode(); n; n = walk.nextNode()) {
            const el = n.parentElement!;
            if (!n.nodeValue!.trim() || el.closest('.lt-visually-hidden, [hidden], svg')) continue;
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            const range = document.createRange(); range.selectNodeContents(n);
            for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) boxes.push({ el, text: n.nodeValue!.trim().slice(0, 24), r });
          }
          for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
            const A = boxes[i], B = boxes[j];
            if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
            const ix = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
            const iy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
            if (ix > 1 && iy > 1) out.push(`${block.dataset.block}: “${A.text}” overlaps “${B.text}” by ${Math.round(iy)}px`);
          }
        }
        return out;
      }, type);
      found.push(...hits.map((h) => `${type} · ${h}`));
    }
    expect(found).toEqual([]);
  });
}
