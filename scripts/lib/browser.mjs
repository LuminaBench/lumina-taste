// Shared browser helpers for the review scripts (review-page.mjs, compare-pages.mjs).
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Playwright's Chromium, looked up next to the kit first, then in the project it runs from. */
export async function loadChromium(from) {
  for (const base of [from, pathToFileURL(join(process.cwd(), 'package.json')).href]) {
    for (const name of ['@playwright/test', 'playwright']) {
      try { const mod = await import(pathToFileURL(createRequire(base).resolve(name)).href); const c = mod.chromium ?? mod.default?.chromium; if (c) return c; } catch { /* try next */ }
    }
  }
  return null;
}

/** A URL for a page given as a URL, a file, or a folder holding index.html. */
export const toUrl = (t) => {
  if (/^(https?|file):/.test(t)) return t;
  const p = resolve(t);
  if (existsSync(join(p, 'index.html'))) return pathToFileURL(join(p, 'index.html')).href;
  return existsSync(p) ? pathToFileURL(p).href : t;
};

/** A short, file-safe name for a page: its folder and file, or its host and path. */
export const nameOf = (url) => {
  const u = url.replace(/^\w+:\/\//, '').replace(/\/index\.html?$|\.html?$/, '').replace(/[?#].*$/, '');
  const parts = u.split('/').filter(Boolean);
  return (url.startsWith('file:') ? parts.slice(-2) : parts.slice(0, 3)).join('-').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(-60) || 'page';
};

/** Puts a page at rest for a picture: the chosen mode, no transitions, lazy content loaded, back at the top. */
export async function settle(page, mode) {
  await page.evaluate((m) => document.querySelectorAll('[data-mode]').forEach((e) => e.setAttribute('data-mode', m)), mode);
  await page.addStyleTag({ content: '*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;animation-delay:0s!important;caret-color:transparent!important;scroll-behavior:auto!important}' });
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    scrollTo(0, 0);
    for (const el of document.querySelectorAll('body *')) if (el.scrollTop) el.scrollTop = 0;
    await new Promise((r) => setTimeout(r, 200));
  });
}

/** Lays a page out for a whole-page picture: sticky and fixed bars back in the flow, app shells opened out. */
export async function unfold(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) { const p = getComputedStyle(el).position; if (p === 'sticky') el.style.position = 'relative'; else if (p === 'fixed') el.style.position = 'absolute'; }
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (!/auto|scroll/.test(cs.overflowY) || el.scrollHeight <= el.clientHeight + 40 || el.clientHeight < innerHeight * 0.5) continue;
      el.style.overflow = 'visible'; el.style.height = 'auto'; el.style.maxHeight = 'none';
      for (let a = el.parentElement; a; a = a.parentElement) { a.style.height = 'auto'; a.style.maxHeight = 'none'; a.style.overflow = 'visible'; }
    }
  });
}

export const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true } };
