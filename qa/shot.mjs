import { chromium } from '@playwright/test';
const [,, url, out, w = '1440', h = '900', mode = 'light'] = process.argv;
const b = await chromium.launch();
// Full-page captures show the page at rest: scroll-driven reveals would otherwise leave everything below the
// first screen in its before state. MOTION=1 keeps motion (for a first-screen capture of an entrance).
const p = await b.newPage({ viewport: { width: +w, height: +h }, reducedMotion: process.env.MOTION === '1' ? 'no-preference' : 'reduce' });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(url);
await p.evaluate((m) => (document.documentElement.dataset.mode = m), mode);
await p.waitForTimeout(400);
await p.screenshot({ path: out, fullPage: process.env.FULL === '1' });
console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'no errors');
await b.close();
