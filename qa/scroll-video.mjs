// Dev helper: record a slow scroll through a page with motion on. Usage: node qa/scroll-video.mjs <url> <out-dir> [width] [height] [mode]
import { chromium } from '@playwright/test';
const [,, url, out, w = '1440', h = '900', mode = 'light'] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, colorScheme: mode, reducedMotion: 'no-preference', recordVideo: { dir: out, size: { width: Math.round(+w / 2), height: Math.round(+h / 2) } } });
const p = await ctx.newPage();
await p.goto(url); await p.waitForTimeout(1400);
const total = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (let y = 0; y <= total; y += 12) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(16); }
await p.waitForTimeout(600);
await ctx.close(); await b.close();
console.log('saved to', out);
