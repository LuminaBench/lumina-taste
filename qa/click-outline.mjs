// Dev helper: mouse-click controls and report any element that shows a focus outline/ring afterwards.
// Usage: node qa/click-outline.mjs [baseUrl] [route…]
import { chromium } from '@playwright/test';
const [, , base = 'http://127.0.0.1:4399/', ...routes] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(base + '#/ui');
await page.waitForTimeout(800);
const ids = routes.length ? routes : await page.$$eval('.g-card', (c) => c.map((x) => '#/ui/' + x.dataset.id));
const ring = () => {
  const a = document.activeElement;
  if (!a || a === document.body) return null;
  const cs = getComputedStyle(a);
  const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  const shadow = /0px 0px 0px [1-9]/.test(cs.boxShadow) && !a.matches('input, textarea, select');
  if (!outline && !shadow) return null;
  const tag = a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + (a.className && typeof a.className === 'string' ? '.' + a.className.split(' ').slice(0, 2).join('.') : '') + (a.dataset.part ? `[${a.dataset.part}]` : '');
  return `${tag} outline=${cs.outlineStyle} ${cs.outlineWidth} fv=${a.matches(':focus-visible')}`;
};
const out = new Map();
for (const r of ['#/', '#/charts', '#/styles', '#/pages', '#/palettes', ...ids]) {
  await page.evaluate((h) => (location.hash = h), r);
  await page.waitForTimeout(500);
  const scope = r.startsWith('#/ui/') ? '.g-el' : 'main';
  const handles = (await page.locator(`${scope} :is(button, a, [tabindex="0"], svg.lt-chart-svg, [role="option"], [role="tab"], label, li[data-part="card"]):visible`).elementHandles()).slice(0, 25);
  for (const h of handles) {
    const box = await h.boundingBox().catch(() => null);
    if (!box || box.width < 4 || box.y < 0 || box.y > 900) continue;
    const href = await h.getAttribute('href').catch(() => null);
    if (href && !href.startsWith('#/ui') && href !== '#') continue;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
    await page.waitForTimeout(60);
    const res = await page.evaluate(ring);
    if (res) out.set(res.replace(/#lt-[\w-]+/, ''), r);
    await page.keyboard.press('Escape');
    if (!(await page.evaluate((h) => location.hash === h, r))) { await page.evaluate((h) => (location.hash = h), r); await page.waitForTimeout(300); }
  }
}
for (const [k, v] of out) console.log(v.padEnd(34), k);
console.log(`${out.size} elements show a ring after a mouse click`);
await browser.close();
