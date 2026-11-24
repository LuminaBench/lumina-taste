// Dev helper: one contact sheet of several pages. Usage: node qa/sheet.mjs out.png mode width height url1 url2 …
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const [,, out, mode, w, h, ...urls] = process.argv;
const b = await chromium.launch();
const shots = [];
for (const u of urls) {
  const p = await b.newPage({ viewport: { width: +w, height: +h }, isMobile: +w < 500, colorScheme: mode });
  await p.addInitScript((m) => { try { localStorage.setItem('lt-gallery', JSON.stringify({ mode: m })); } catch {} }, mode);
  await p.goto(u); await p.evaluate((m) => document.querySelectorAll('[data-mode]').forEach((e) => e.setAttribute('data-mode', m)), mode);
  await p.waitForTimeout(500);
  shots.push((await p.screenshot()).toString('base64'));
  await p.close();
}
const sheet = await b.newPage({ viewport: { width: Math.min(urls.length, 5) * (+w * (+w < 500 ? 1 : 0.5) + 16) + 16, height: 100 } });
const scale = +w < 500 ? 1 : 0.5;
await sheet.setContent(`<body style="margin:16px;display:flex;flex-wrap:wrap;gap:16px;background:#888">${shots.map((s) => `<img src="data:image/png;base64,${s}" style="width:${+w * scale}px">`).join('')}</body>`);
await sheet.screenshot({ path: out, fullPage: true });
await b.close();
