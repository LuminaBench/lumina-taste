import { chromium } from '@playwright/test';
const [,, url, sel, out, w = '1440', mode = 'light'] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: 900 }, reducedMotion: 'reduce', colorScheme: mode });
await p.goto(url); await p.waitForTimeout(500);
await p.locator(sel).first().screenshot({ path: out });
await b.close();
