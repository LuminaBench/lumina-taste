// Dev helper: list elements that stick out past the viewport. Usage: node qa/overflow.mjs <url> [width]
import { chromium } from '@playwright/test';
const [, , url, w = '390'] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: 844 } });
await p.goto(url); await p.waitForTimeout(800);
console.log(await p.evaluate(() => {
  const W = innerWidth;
  return [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > W + 1 && r.width > 0; })
    .filter((e) => !(e.parentElement && e.parentElement.getBoundingClientRect().right > W + 1))
    .slice(0, 8).map((e) => `${e.tagName}.${e.className && e.className.baseVal === undefined ? e.className : ''} "${(e.textContent || '').trim().slice(0, 30)}" right=${Math.round(e.getBoundingClientRect().right)}`).join('\n');
}));
await b.close();
