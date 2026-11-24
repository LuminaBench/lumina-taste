#!/usr/bin/env node
// lumina-taste visual self-critic. Audits any URL or local HTML file at desktop (1440×900) and
// mobile (390×844) in light and dark, and fails loudly on:
//   overflow · clipped text · overlapping text · WCAG AA contrast · missing :focus-visible ·
//   non-tabular numbers · dead or covered controls · slop signatures (purple/pink gradients,
//   gradient headline text, heavy blurry shadows, emoji used as icons).
//
// Usage:
//   node scripts/audit-ui.mjs <url-or-file> [more urls…]
//     --viewports desktop,mobile   --modes light,dark   --focus-limit 250
//     --json report.json           --screenshots dir    --strict (warnings fail too)   --quiet
// Requires Playwright (`npm i -D @playwright/test && npx playwright install chromium`).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { COPY_RULES } from './lib/copy-rules.mjs';

// Playwright is looked up next to this script first, then in the project you run it from,
// so a globally installed skill can audit a project that already has Playwright.
let chromium;
for (const base of [import.meta.url, pathToFileURL(join(process.cwd(), 'package.json')).href]) {
  for (const name of ['@playwright/test', 'playwright']) {
    try { const mod = await import(pathToFileURL(createRequire(base).resolve(name)).href); chromium = mod.chromium ?? mod.default?.chromium; if (chromium) break; } catch { /* try next */ }
  }
  if (chromium) break;
}
if (!chromium) {
  console.error('audit-ui needs Playwright. In your project: npm i -D @playwright/test && npx playwright install chromium');
  process.exit(2);
}

// ------------------------------------------------------------------ args
const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(`--${name}`); if (i < 0) return def; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const bool = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return false; argv.splice(i, 1); return true; };
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true } };
const viewports = flag('viewports', 'desktop,mobile').split(',');
const modes = flag('modes', 'light,dark').split(',');
const focusLimit = +flag('focus-limit', '250');
const jsonOut = flag('json', null);
const shotDir = flag('screenshots', null);
const strict = bool('strict');
const quiet = bool('quiet');
const targets = argv.filter((a) => !a.startsWith('--'));
if (!targets.length) {
  console.error('Usage: node scripts/audit-ui.mjs <url-or-file> [--viewports desktop,mobile] [--modes light,dark] [--json out.json] [--strict]');
  process.exit(2);
}
const toUrl = (t) => (/^(https?|file):/.test(t) ? t : existsSync(t) ? pathToFileURL(resolve(t)).href : t);

// ------------------------------------------------------------------ in-page checks
// Runs inside the page. Returns findings for everything that can be judged from the DOM alone.
const PAGE_CHECKS = (copyRules = []) => {
  const out = [];
  // The real screen width: on phones the layout viewport (innerWidth) grows when content overflows.
  const W = Math.min(innerWidth, document.documentElement.clientWidth || innerWidth, screen.width || innerWidth);
  const add = (rule, severity, el, message) => out.push({ rule, severity, selector: el ? sel(el) : null, message });
  function sel(el) {
    if (!el || el.nodeType !== 1) return '';
    const parts = [];
    for (let e = el, d = 0; e && e.nodeType === 1 && d < 4; e = e.parentElement, d++) {
      let p = e.tagName.toLowerCase();
      if (e.id) { parts.unshift(`${p}#${e.id}`); break; }
      const cls = typeof e.className === 'string' ? e.className.split(/\s+/).filter(Boolean).slice(0, 2) : [];
      if (cls.length) p += '.' + cls.join('.');
      const part = e.getAttribute('data-part');
      if (part) p += `[data-part="${part}"]`;
      parts.unshift(p);
    }
    return parts.join(' > ');
  }
  // --- colour helpers (canvas normalises every CSS colour format to sRGB)
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const memo = new Map();
  const rgba = (c) => {
    if (memo.has(c)) return memo.get(c);
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    // getImageData gives premultiplied-then-unmultiplied values; alpha from parsing is more reliable:
    const a = /rgba?\([^)]*,\s*([\d.]+)\)|\/\s*([\d.]+%?)\s*\)/.exec(c);
    let alpha = d[3] / 255;
    if (c === 'transparent') alpha = 0;
    if (a) { const v = a[1] ?? a[2]; alpha = v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v); }
    const r = [d[0], d[1], d[2], alpha];
    memo.set(c, r); return r;
  };
  const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const blend = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
  const hue = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return { h: 0, s: 0 }; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; const l = (mx + mn) / 2; return { h, s: d / (1 - Math.abs(2 * l - 1)) }; };

  const visible = (el) => {
    if (!el.isConnected) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse' || +cs.opacity === 0) return false;
      if (e.hasAttribute('hidden') || e.getAttribute('aria-hidden') === 'true' && e.closest('.lt-visually-hidden')) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const opacityChain = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  // Clip a rect by every overflow-clipping ancestor (so masked/odometer/flip text is judged as seen).
  const clipRect = (el, r) => {
    let { left, top, right, bottom } = r;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || cs.clip !== 'auto' && cs.clip) {
        const b = e.getBoundingClientRect();
        if (cs.overflowX !== 'visible') { left = Math.max(left, b.left); right = Math.min(right, b.right); }
        if (cs.overflowY !== 'visible') { top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom); }
      }
      if (cs.position === 'fixed') break;
    }
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  };

  // --- text leaves: elements that directly own visible text
  const leaves = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.nodeValue.trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'OPTION'].includes(el.tagName)) continue;
    if (!visible(el)) continue;
    // Inert thumbnails are scaled illustrations; the live versions are audited on their own pages.
    if (el.closest('[inert], [data-audit-ignore]')) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    const box = rects.reduce((a, r) => ({ left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const seen = clipRect(el, box);
    if (seen.width <= 2 || seen.height <= 2) continue; // visually hidden or masked away
    leaves.push({ el, text: t, rects, box, seen });
  }

  // 1. Horizontal overflow
  const sw = document.documentElement.scrollWidth;
  if (sw > W + 1) {
    const culprits = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > W + 1 && r.width > 0 && getComputedStyle(e).position !== 'fixed'; })
      .filter((e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') return false; if (a.getBoundingClientRect().right > W + 1) return false; } return true; }).slice(0, 3);
    add('overflow', 'error', culprits[0] ?? document.body, `Page scrolls horizontally: ${sw}px wide in a ${W}px viewport.${culprits.length ? ' Widest: ' + culprits.map(sel).join(', ') : ''}`);
  }

  // 2. Clipped text (cut off by its own box or by a clipping ancestor, without an ellipsis)
  for (const l of leaves) {
    const cs = getComputedStyle(l.el);
    if (cs.textOverflow === 'ellipsis') continue;
    const cut = l.box.right - l.seen.right > 2 || l.seen.left - l.box.left > 2;
    if (!cut) continue;
    // Allowed: text inside a scroll container (user can scroll to it).
    let scroller = false;
    // Also allowed: text fading out under a mask (marquees, edge fades) — the cut is the design.
    for (let a = l.el; a && a !== document.body; a = a.parentElement) { const c2 = getComputedStyle(a); if (c2.overflowX === 'auto' || c2.overflowX === 'scroll' || /gradient|url/.test(c2.getPropertyValue('mask-image') + c2.getPropertyValue('-webkit-mask-image'))) { scroller = true; break; } }
    if (!scroller) add('clipped-text', 'error', l.el, `Text is cut off: “${l.text.slice(0, 40)}”.`);
  }

  // 3. Overlapping text (text vs text; identical stacked layers are allowed)
  // One box per rendered line, clipped like the text is, so wrapped inline runs never look like overlaps.
  const boxes = [];
  for (const l of leaves) for (const lr of l.rects) {
    const r = { left: Math.max(lr.left, l.seen.left), right: Math.min(lr.right, l.seen.right), top: Math.max(lr.top, l.seen.top), bottom: Math.min(lr.bottom, l.seen.bottom) };
    r.width = r.right - r.left; r.height = r.bottom - r.top;
    if (r.width > 2 && r.height > 2) boxes.push({ ...l, r });
  }
  const grid = new Map();
  const key = (x, y) => `${Math.floor(x / 120)}:${Math.floor(y / 60)}`;
  boxes.forEach((b, i) => { for (let x = b.r.left; x <= b.r.right; x += 120) for (let y = b.r.top; y <= b.r.bottom; y += 60) { const k = key(x, y); (grid.get(k) ?? grid.set(k, []).get(k)).push(i); } });
  const reported = new Set();
  for (const list of grid.values()) {
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const A = boxes[list[a]], B = boxes[list[b]];
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
      if (list[a] === list[b]) continue;
      const ix = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
      const iy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
      if (ix <= 1 || iy <= 1) continue;
      const area = ix * iy, small = Math.min(A.r.width * A.r.height, B.r.width * B.r.height);
      if (area < small * 0.2) continue;
      if (A.text === B.text && Math.abs(A.r.left - B.r.left) < 2 && Math.abs(A.r.top - B.r.top) < 2) continue; // stacked duplicate (flip cards)
      const id = [list[a], list[b]].sort().join('-');
      if (reported.has(id)) continue;
      reported.add(id);
      add('overlap', 'error', A.el, `Text overlaps: “${A.text.slice(0, 30)}” and “${B.text.slice(0, 30)}” (${sel(B.el)}).`);
    }
  }

  // 4. Contrast (WCAG 2.x AA: 4.5:1, or 3:1 for large text)
  const bgOf = (el) => {
    // SVG text: the shape painted under it counts as its background.
    if (el instanceof SVGElement) {
      // Geometric hit test (works off-screen, unlike elementsFromPoint): the last filled shape painted
      // before this text in the same <svg> whose box contains the text centre is its background.
      const r = el.getBoundingClientRect();
      const px = r.left + r.width / 2, py = r.top + r.height / 2;
      const svgRoot = el.closest('svg');
      let under = null;
      for (const s of svgRoot.querySelectorAll('rect, path, circle, ellipse, polygon')) {
        if (!(s.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        const b = s.getBoundingClientRect();
        if (px < b.left || px > b.right || py < b.top || py > b.bottom) continue;
        try {
          const pt = new DOMPoint(px, py).matrixTransform(s.getScreenCTM().inverse());
          if (!s.isPointInFill(pt)) continue; // e.g. text in a donut hole sits inside the ring's box but not its fill
        } catch { /* keep the box test */ }
        const f = getComputedStyle(s).fill;
        if (!f || f === 'none' || f.startsWith('url')) continue;
        const c = rgba(f);
        const fo = +getComputedStyle(s).fillOpacity * opacityChain(s);
        if (c[3] * fo > 0.5) under = [c[0], c[1], c[2], c[3] * fo];
      }
      if (under) return { color: blend(under, bgOf(svgRoot.parentElement).color), image: false };
      el = el.closest('svg').parentElement;
    }
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url(')) return { image: true };
      if (cs.backgroundImage.startsWith('url(')) return { image: true };
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
    }
    let col = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) col = blend(layers[i], col);
    return { color: col, image: false };
  };
  const checkedEls = new Set();
  for (const l of leaves) {
    const el = l.el;
    if (checkedEls.has(el)) continue;
    checkedEls.add(el);
    if (el.closest(':disabled, [aria-disabled="true"], [inert]')) continue;
    const cs = getComputedStyle(el);
    const fgRaw = rgba(el instanceof SVGElement ? cs.fill : cs.color);
    const bg = bgOf(el);
    if (bg.image) continue;
    const fg = blend([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacityChain(el)], bg.color);
    const size = parseFloat(cs.fontSize), weight = +cs.fontWeight || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const r = ratio(fg, bg.color);
    if (r < (large ? 3 : 4.5) - 0.01) add('contrast', 'error', el, `Contrast ${r.toFixed(2)}:1 for “${l.text.slice(0, 30)}” (needs ${large ? '3' : '4.5'}:1).` + (window.__ltDebug ? ` fg=${fg.map(Math.round)} bg=${bg.color.map(Math.round)} raw=${el instanceof SVGElement ? cs.fill : cs.color}` : ''));
  }

  // 5. Numbers that should be tabular
  const NUM = /^[\s(+\-−–]*[£$€¥]?\s?\d[\d,.:\s]*\s?(%|k|m|bn|ms|s|fps|pt|kb|mb|gb|x|×|days?|hrs?)?[)]?$/i;
  for (const l of leaves) {
    if (!NUM.test(l.text) || l.text.replace(/\D/g, '').length < 2) continue;
    const el = l.el;
    const inData = el.closest('table, [role="table"], [role="grid"], [role="cell"], data, output, time, [role="timer"], svg, .lt-num, [data-num], meter, progress');
    const big = parseFloat(getComputedStyle(el).fontSize) >= 20;
    if (!inData && !big) continue;
    const cs = getComputedStyle(el);
    if (!/tabular-nums/.test(cs.fontVariantNumeric) && !/tnum/.test(cs.fontFeatureSettings)) add('tabular-nums', 'error', el, `Number “${l.text}” is not tabular (font-variant-numeric: tabular-nums).`);
  }

  // 6. Slop signatures
  const PURPLE = (h) => h >= 255 && h <= 335;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    const bgi = cs.backgroundImage;
    if (bgi && bgi.includes('gradient')) {
      const stops = (bgi.match(/(rgba?|oklch|oklab|color|hsla?|lab|lch)\([^)]*\)|#[0-9a-f]{3,8}/gi) ?? []).map(rgba).filter((c) => c[3] > 0.15);
      const chroma = stops.map((c) => hue(c)).filter((h) => h.s > 0.25);
      const purples = chroma.filter((h) => PURPLE(h.h));
      const spread = chroma.length > 1 ? Math.max(...chroma.map((h) => h.h)) - Math.min(...chroma.map((h) => h.h)) : 0;
      if (purples.length && chroma.length >= 2 && spread > 25 && visible(el)) add('slop-gradient', 'error', el, 'Generic purple/blue/pink gradient. Use a flat surface or a single-hue, low-chroma tint.');
      // Neutral shimmer (grey to ink) is a loading state; coloured gradient text is the slop.
      if ((cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') && chroma.length && visible(el)) add('slop-gradient-text', 'error', el, 'Gradient-filled text. Use solid --text-primary and emphasise with weight or --accent-text.');
    }
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      for (const sh of cs.boxShadow.split(/,(?![^(]*\))/)) {
        if (/inset/.test(sh)) continue;
        const color = rgba((sh.match(/(rgba?|oklch|oklab|color|hsla?)\([^)]*\)|#[0-9a-f]{3,8}/i) ?? ['transparent'])[0]);
        const lens = (sh.replace(/(rgba?|oklch|oklab|color|hsla?)\([^)]*\)/gi, '').match(/-?[\d.]+px/g) ?? []).map(parseFloat);
        const blur = lens[2] ?? 0;
        if ((blur >= 32 && color[3] >= 0.08) || (blur >= 16 && color[3] >= 0.35)) { if (visible(el)) add('slop-shadow', 'error', el, `Heavy blurry shadow (${blur}px blur at ${Math.round(color[3] * 100)}% opacity). Use --shadow-sm / --shadow-overlay.`); break; }
      }
    }
  }
  // Hype words, clichés and generated tics in visible copy (same list as scripts/lint-copy.mjs).
  const copyRes = copyRules.map(([src, flags, why, fix]) => [new RegExp(src, flags), why, fix]);
  const seenCopy = new Set();
  for (const l of leaves) {
    if (l.el.closest('pre, code, kbd, samp, textarea, script, [contenteditable]')) continue;
    for (const [re, why, fix] of copyRes) {
      const m = re.exec(l.text);
      if (!m || seenCopy.has(m[0].toLowerCase())) continue;
      if (why === 'Exclamation mark' && !/[a-z]!(\s|$)/i.test(l.text)) continue;
      seenCopy.add(m[0].toLowerCase());
      add('slop-copy', 'error', l.el, `Copy: “${m[0]}” (${why.toLowerCase()}). ${fix}`);
    }
  }
  const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
  for (const l of leaves) {
    if (!EMOJI.test(l.text)) continue;
    const iconish = l.el.closest('button, a, nav, h1, h2, h3, h4, h5, h6, li, label, summary, th, [role="button"], [role="tab"], [role="menuitem"]');
    add('slop-emoji', iconish ? 'error' : 'warning', l.el, `Emoji used ${iconish ? 'as an icon' : 'in text'}: “${l.text.slice(0, 30)}”. Use a crisp inline SVG icon.`);
  }
  return out;
};

// Interactive controls to test for dead handlers / focus rings.
const COLLECT_CONTROLS = (limit) => {
  const SEL = 'a, button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], [role="link"], [role="slider"], [role="treeitem"], [tabindex]:not([tabindex="-1"])';
  const vis = (el) => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const els = [...document.querySelectorAll(SEL)].filter((e) => vis(e) && !e.closest('[inert]'));
  window.__ltAudit = { controls: els.slice(0, 2000), nodes: [] };
  // window is left out on purpose: Playwright attaches its own listeners there.
  const nodes = new Set([document]);
  for (const e of window.__ltAudit.controls) for (let a = e; a; a = a.parentElement) nodes.add(a);
  window.__ltAudit.nodes = [...nodes];
  return { count: els.length, nodes: nodes.size, focusable: els.filter((e) => e.tabIndex >= 0 && !e.disabled).slice(0, limit).length };
};

// ------------------------------------------------------------------ runner
async function auditOne(browser, url, vpName, mode) {
  const vp = VIEWPORTS[vpName];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, colorScheme: mode, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (e) => runtimeErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') runtimeErrors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  // Apply the mode to lumina-taste roots as well as prefers-color-scheme.
  await page.evaluate((m) => document.querySelectorAll('[data-mode]').forEach((e) => e.setAttribute('data-mode', m)), mode);
  await page.addStyleTag({ content: '*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;animation-delay:0s!important;caret-color:transparent!important}' });
  // Scroll through so lazy and reveal-on-scroll content is present, then return to the top.
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 150));
  });
  if (process.env.LT_AUDIT_DEBUG) await page.evaluate(() => (window.__ltDebug = true));
  const findings = (await page.evaluate(PAGE_CHECKS, COPY_RULES.map(([re, why, fix]) => [re.source, re.flags, why, fix]))).map((f) => ({ ...f, viewport: vpName, mode }));
  for (const e of runtimeErrors) findings.push({ rule: 'runtime-error', severity: 'error', selector: null, message: e, viewport: vpName, mode });

  // Dead controls: no click/key/pointer listener on the control or any ancestor, no native behaviour.
  const meta = await page.evaluate(COLLECT_CONTROLS, focusLimit);
  const cdp = await ctx.newCDPSession(page);
  const hasListener = new Map();
  const INTERACT = new Set(['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'keydown', 'keyup', 'input', 'change', 'submit', 'touchstart', 'contextmenu', 'focus', 'focusin']);
  for (let i = 0; i < meta.nodes; i++) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: `window.__ltAudit.nodes[${i}]` });
    if (!result.objectId) continue;
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId, depth: 0 });
    hasListener.set(i, listeners.some((l) => INTERACT.has(l.type)));
  }
  const dead = await page.evaluate((flags) => {
    const { controls, nodes } = window.__ltAudit;
    const idx = new Map(nodes.map((n, i) => [n, i]));
    const anyListener = (el) => { for (let a = el; a; a = a.parentElement) if (flags[idx.get(a)]) return true; return !!flags[idx.get(document)]; };
    const out = [];
    for (const el of controls) {
      const tag = el.tagName;
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
      const native =
        (tag === 'A' && el.hasAttribute('href') && !/^(#|javascript:)\s*$/i.test(el.getAttribute('href').trim()) && !/^javascript:/i.test(el.getAttribute('href'))) ||
        ['INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(tag) ||
        (tag === 'BUTTON' && (el.type === 'submit' || el.type === 'reset') && el.form) ||
        el.hasAttribute('popovertarget') || el.hasAttribute('commandfor') || el.closest('label') || el.isContentEditable ||
        (el.getAttribute('tabindex') === '0' && !el.matches('button, a, [role="button"], [role^="menuitem"], [role="tab"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], [role="link"], [role="treeitem"]'));
      if (native || anyListener(el)) continue;
      out.push({ selector: (() => { let s = tag.toLowerCase(); if (el.id) s += '#' + el.id; else if (typeof el.className === 'string' && el.className) s += '.' + el.className.split(/\s+/)[0]; const t = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30); return `${s} “${t}”`; })(), href: el.getAttribute('href') });
    }
    return out;
  }, Object.fromEntries(hasListener));
  for (const d of dead) findings.push({ rule: 'dead-control', severity: 'error', selector: d.selector, message: d.href ? `Link goes nowhere (href="${d.href}").` : 'Control has no handler and no native behaviour.', viewport: vpName, mode });

  // Covered controls: the centre of the control is under something else.
  const covered = await page.evaluate(() => {
    const out = [];
    for (const el of window.__ltAudit.controls.slice(0, 600)) {
      if (el.closest('dialog:not([open]), [popover]:not(:popover-open)')) continue;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) continue; // off-screen by design (skip links)
      if (getComputedStyle(el).pointerEvents === 'none') continue; // pass-through by design (e.g. dual-thumb range tracks)
      const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const top = document.elementFromPoint(x, y);
      if (!top || el.contains(top) || top.contains(el) && top !== document.body && !(top === document.documentElement)) continue;
      // Under an open dialog or menu that belongs to the same demo: covered on purpose while it is open.
      if (top.closest('dialog[open], [data-contained-open], [popover]:popover-open, [role="menu"], [role="dialog"]')) continue;
      if (el.labels && [...el.labels].some((l) => l.contains(top))) continue;
      if (top.closest('label') && top.closest('label').contains(el)) continue;
      // Visually hidden native inputs under a styled label are fine.
      if (el.matches('input') && (r.width <= 2 || getComputedStyle(el).opacity === '0')) continue;
      out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} “${(el.getAttribute('aria-label') || el.textContent || el.value || '').trim().slice(0, 30)}” under ${top.tagName.toLowerCase()}${top.className && typeof top.className === 'string' ? '.' + top.className.split(' ')[0] : ''}`);
    }
    scrollTo(0, 0);
    return out;
  });
  for (const c of covered) findings.push({ rule: 'covered-control', severity: 'error', selector: c, message: 'Control is covered by another element at its centre (cannot be clicked).', viewport: vpName, mode });

  // Focus rings: pixel-diff each focusable control before and after keyboard focus.
  // Focus rings are for keyboard users: put the page in keyboard modality first (a plain Shift press).
  await page.keyboard.press('Shift');
  const focusIdx = await page.evaluate((limit) => window.__ltAudit.controls.map((e, i) => [e, i]).filter(([e]) => e.tabIndex >= 0 && !e.disabled).slice(0, limit).map(([, i]) => i), focusLimit);
  for (const i of focusIdx) {
    const box = await page.evaluate((k) => {
      const el = window.__ltAudit.controls[k];
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      const vis = r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden';
      if (!vis) return null;
      // Judge only what is on screen: clip to the viewport, and skip controls that cannot be scrolled fully into view.
      const x0 = Math.max(0, r.left - 8), y0 = Math.max(0, r.top - 8), x1 = Math.min(innerWidth, r.right + 8), y1 = Math.min(innerHeight, r.bottom + 8);
      if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) return null;
      return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    }, i);
    if (!box || box.width < 4 || box.height < 4) continue;
    const before = await page.screenshot({ clip: box });
    const label = await page.evaluate((k) => { const el = window.__ltAudit.controls[k]; el.focus({ focusVisible: true, preventScroll: true }); return document.activeElement === el ? null : 'nofocus'; }, i);
    if (label === 'nofocus') continue;
    const after = await page.screenshot({ clip: box });
    if (before.equals(after)) {
      if (process.env.LT_AUDIT_DEBUG) { mkdirSync('qa/artifacts/focus-debug', { recursive: true }); writeFileSync(`qa/artifacts/focus-debug/${i}-${vpName}-${mode}.png`, after); console.log('focus debug', i, JSON.stringify(box), await page.evaluate(() => [scrollY, document.activeElement?.outerHTML.slice(0, 80), getComputedStyle(document.activeElement).outlineStyle, document.documentElement.dataset.modality])); }
      const s = await page.evaluate((k) => { const el = window.__ltAudit.controls[k]; return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} “${(el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim().slice(0, 30)}”`; }, i);
      findings.push({ rule: 'focus-visible', severity: 'error', selector: s, message: 'No visible focus indicator when focused by keyboard.', viewport: vpName, mode });
    }
  }
  await page.evaluate(() => document.activeElement?.blur?.());
  if (shotDir) {
    mkdirSync(shotDir, { recursive: true });
    const name = url.replace(/^\w+:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 60);
    await page.screenshot({ path: `${shotDir}/${name}-${vpName}-${mode}.png`, fullPage: true });
  }
  await ctx.close();
  return { findings, controls: meta.count, focusChecked: focusIdx.length };
}

const browser = await chromium.launch();
const report = [];
let errors = 0, warnings = 0;
for (const t of targets) {
  const url = toUrl(t);
  for (const vp of viewports) for (const mode of modes) {
    const r = await auditOne(browser, url, vp, mode);
    // De-duplicate identical findings (same rule + selector + message).
    const seen = new Set();
    const uniq = r.findings.filter((f) => { const k = `${f.rule}|${f.selector}|${f.message}`; if (seen.has(k)) return false; seen.add(k); return true; });
    report.push({ url, viewport: vp, mode, controls: r.controls, focusChecked: r.focusChecked, findings: uniq });
    const e = uniq.filter((f) => f.severity === 'error').length, w = uniq.length - e;
    errors += e; warnings += w;
    if (!quiet || e || w) {
      console.log(`${e ? '✗' : w ? '!' : '✓'} ${url}  [${vp} ${VIEWPORTS[vp].width}×${VIEWPORTS[vp].height}, ${mode}]  ${e} errors, ${w} warnings · ${r.controls} controls, ${r.focusChecked} focus rings checked`);
      const byRule = {};
      for (const f of uniq) (byRule[f.rule] ??= []).push(f);
      for (const [rule, list] of Object.entries(byRule)) {
        console.log(`    ${rule} (${list.length})`);
        for (const f of list.slice(0, 6)) console.log(`      ${f.severity === 'error' ? '✗' : '!'} ${f.message}${f.selector ? `\n        at ${f.selector}` : ''}`);
        if (list.length > 6) console.log(`      … ${list.length - 6} more`);
      }
    }
  }
}
await browser.close();
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ errors, warnings, report }, null, 2));
console.log(`\n${errors ? '✗' : '✓'} audit-ui: ${errors} errors, ${warnings} warnings across ${report.length} runs`);
process.exit(errors || (strict && warnings) ? 1 : 0);
