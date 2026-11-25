// Dev helper: several charts, each at full size, on one sheet.
// Usage: node qa/chart-stages.mjs out.png light|dark width id1 id2 …   (needs the preview server on :4399)
import { chromium } from '@playwright/test';
const [,, out, mode, w, ...ids] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: 900 }, isMobile: +w < 500, colorScheme: mode, deviceScaleFactor: 1 });
await p.addInitScript((m) => { try { localStorage.setItem('lt-gallery', JSON.stringify({ mode: m })); } catch {} }, mode);
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const shots = [];
for (const id of ids) {
  await p.goto(`http://127.0.0.1:4399/#/charts/${id}`);
  await p.reload();
  const fig = p.locator(`#chart-${id}`).first();
  await fig.waitFor();
  await p.waitForTimeout(700);
  shots.push({ id, img: (await fig.screenshot()).toString('base64') });
}
const sheet = await b.newPage({ viewport: { width: +w, height: 800 } });
await sheet.setContent(`<body style="margin:0;background:#888;font:12px ui-monospace,monospace">${shots.map((s) => `<p style="margin:0;padding:6px 8px;background:#222;color:#fff">${s.id}</p><img style="display:block;max-width:100%" src="data:image/png;base64,${s.img}">`).join('')}</body>`);
await sheet.screenshot({ path: out, fullPage: true });
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();
