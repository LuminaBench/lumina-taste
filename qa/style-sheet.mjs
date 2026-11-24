// Dev helper: every style on one composed page, as contact sheets in qa/artifacts/styles-test.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const dir = process.argv[2] ?? 'qa/artifacts/styles-test';
const arg = process.argv[3] ?? '0';
const y = /^\d+$/.test(arg) ? +arg : 0;
const sel = /^\d+$/.test(arg) ? null : arg;
const only = process.argv[4]?.split(',');
const styles = JSON.parse(readFileSync('tokens/styles/source.json', 'utf8')).styles.map((s) => s.id);
const b = await chromium.launch();
const shots = [];
for (const id of styles.filter((s) => !only || only.includes(s))) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(`file://${process.cwd()}/${dir}/${id}.html`); await p.waitForTimeout(250);
  if (y) await p.evaluate((yy) => scrollTo(0, yy), y);
  if (sel) await p.evaluate((s) => { const el = document.querySelector(s); if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - 20); }, sel);
  shots.push([id, (await p.screenshot()).toString('base64')]);
  await p.close();
}
for (let i = 0; i < shots.length; i += 9) {
  const page = await b.newPage({ viewport: { width: 3 * 640 + 64, height: 100 } });
  await page.setContent(`<body style="margin:16px;display:grid;grid-template-columns:repeat(3,640px);gap:16px;background:#777;font:600 22px system-ui">${shots.slice(i, i + 9).map(([id, s]) => `<figure style="margin:0"><figcaption style="color:#fff;padding:4px 0">${id}</figcaption><img src="data:image/png;base64,${s}" style="width:640px;display:block"></figure>`).join('')}</body>`);
  await page.screenshot({ path: `${dir}/sheet-${sel ? 'sel' : y}-${i / 9}.png`, fullPage: true });
  await page.close();
}
await b.close();
console.log('sheets', Math.ceil(shots.length / 9));
