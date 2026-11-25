// Dev helper: the live stage of several elements on one sheet.
// Usage: node qa/stages.mjs out.png light|dark width id1 id2 …   (needs the preview server on :4399)
import { chromium } from '@playwright/test';
const [,, out, mode, w, ...ids] = process.argv;
const b = await chromium.launch();
const shots = [];
const p = await b.newPage({ viewport: { width: +w, height: 900 }, isMobile: +w < 500, colorScheme: mode });
await p.addInitScript((m) => { try { localStorage.setItem('lt-gallery', JSON.stringify({ mode: m })); } catch {} }, mode);
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
for (const id of ids) {
  await p.goto(`http://127.0.0.1:4399/#/ui/${id}`);
  await p.reload();
  const stage = p.locator(`#ui-${id} [data-stage]`);
  await stage.waitFor();
  await p.waitForTimeout(Number(process.env.WAIT ?? 900));
  shots.push({ id, img: (await stage.screenshot()).toString('base64') });
}
const sheet = await b.newPage({ viewport: { width: +w, height: 800 } });
await sheet.setContent(`<body style="margin:0;background:#888;font:12px ui-monospace,monospace">${shots.map((s) => `<p style="margin:0;padding:6px 8px;background:#222;color:#fff">${s.id}</p><img style="display:block;max-width:100%" src="data:image/png;base64,${s.img}">`).join('')}</body>`);
await sheet.screenshot({ path: out, fullPage: true });
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();
