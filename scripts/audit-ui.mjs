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
//     --product "Name"   implies --taste; also fails the page while the kit's sample brands and people are still on it
//     --taste   page-level design checks (type scale, accent hues, radii, one primary per screen,
//               reading measure, heading order, nested cards, section rhythm, focal point,
//               placeholder copy, empty visual boxes, button labels) and a 0–100 taste score per run;
//               plus the designer's measures (scripts/lib/critic.mjs): a section with nothing to look at,
//               two sections in a row with the same layout, density rhythm, the headline-to-body type jump,
//               the scroll-moment budget, and for apps at phone width touch targets, the home-indicator
//               gap under fixed bottom bars and the page states the page declares
//     --perf    load speed: the largest paint (lazy or without fetchpriority), layout shift, font, JS and CSS
//               bytes, images without width and height, images far larger than their box. --strict runs
//               it too, with every perf finding as a warning
//               With --taste, each page is also loaded again for what a native app and assistive tech need:
//               at phone width on an app, a bottom sheet opened from its button closes on Escape and hands focus
//               back, and the page at 200% text (a root font-size bump) neither clips nor overlaps and its controls
//               grow; on every page, right-to-left (dir="rtl") mirrors and does not scroll sideways, a very long
//               German word does not overflow, forced colours (Windows contrast themes) keep control parts, chart
//               marks and focus rings visible, and Save-Data keeps films and far pictures from loading.
//               Pages opened with ?state= skip these (they are the same page with one block swapped)
//     --pending "page:rule,…"  findings of these rules on pages whose URL contains /page/ are listed as
//               pending (known, waiting on a fix elsewhere) and do not count; one that stops firing is named
// Requires Playwright (`npm i -D @playwright/test && npx playwright install chromium`).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { COPY_RULES } from './lib/copy-rules.mjs';
import { MEASURE, judgeMeasures, PERF_INIT, PERF_COLLECT, judgePerf, RTL_PROBE, judgeRtl, LONG_WORDS, FORCED_MARKS, CONTROL_FIT, TEXT_OVERLAP, SAVE_DATA_INIT, SAVE_DATA_COLLECT, judgeSaveData, PAGE_PHOTOS, judgePagePhotos } from './lib/critic.mjs';

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
const product = flag('product', null);
const tasteOn = bool('taste') || !!product;
const perfFlag = bool('perf');
const perfOn = perfFlag || strict;
const pending = (flag('pending', '') ?? '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => { const [page, rule] = x.split(':'); return { page, rule, hit: false }; });
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
    // Only a fourth comma value or a slash value is alpha: rgb(0, 0, 0) has none (its last number is blue).
    const a = /rgba\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*([\d.]+%?)\s*\)|\/\s*([\d.]+%?)\s*\)/.exec(c);
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
    // Content of a closed <details> is not shown, whatever its box says.
    if (el.closest('details:not([open])') && !el.closest('summary')) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    const box = rects.reduce((a, r) => ({ left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    const seen = clipRect(el, box);
    if (seen.width <= 2 || seen.height <= 2) continue; // visually hidden or masked away
    // Parked off the page on purpose (skip links before focus).
    if (seen.right + scrollX <= 0 || seen.bottom + scrollY <= 0) continue;
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
  const floatCache = new Map();
  const floating = (el) => { if (floatCache.has(el)) return floatCache.get(el); let f = null; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') { f = e; break; } } floatCache.set(el, f); return f; };
  // One box per rendered line, clipped like the text is, so wrapped inline runs never look like overlaps. A line's box
  // is the font's whole ascent and descent, which in tall faces (Literata, Nunito, Playfair Display) reaches far past
  // the letters: narrow it to the ink, measured on a canvas in the same font (baseline from the font's own ascent).
  const inkCx = document.createElement('canvas').getContext('2d');
  const inkMemo = new Map();
  const inkOf = (el, text) => {
    const cs = getComputedStyle(el);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const k = `${font}|${text}`;
    if (!inkMemo.has(k)) { inkCx.font = font; const m = inkCx.measureText(text); inkMemo.set(k, m.fontBoundingBoxAscent > 0 ? { fa: m.fontBoundingBoxAscent, fd: m.fontBoundingBoxDescent, ia: m.actualBoundingBoxAscent, id: m.actualBoundingBoxDescent } : null); }
    return inkMemo.get(k);
  };
  const boxes = [];
  for (const l of leaves) for (const lr of l.rects) {
    let top = lr.top, bottom = lr.bottom;
    const ink = inkOf(l.el, l.text);
    if (ink && lr.height > 2) { const base = lr.top + lr.height * (ink.fa / (ink.fa + ink.fd)); top = Math.max(top, base - ink.ia - 1); bottom = Math.min(bottom, base + ink.id + 1); }
    const r = { left: Math.max(lr.left, l.seen.left), right: Math.min(lr.right, l.seen.right), top: Math.max(top, l.seen.top), bottom: Math.min(bottom, l.seen.bottom) };
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
      // A fixed or sticky bar floats over scrolling content by design.
      if (floating(A.el) !== floating(B.el)) continue;
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
      if (under) return { color: blend(under, bgOf(svgRoot.parentElement).color ?? [255, 255, 255, 1]), image: false };
      el = el.closest('svg').parentElement;
    }
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      // "none, none" is what layered background declarations compute to when every layer is empty.
      if (cs.backgroundImage.split(',').some((layer) => layer.trim() !== 'none')) return { image: true, color: [255, 255, 255, 1] };
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


// ------------------------------------------------------------------ page-level taste checks (--taste)
// Judges the page as a whole, the way a designer squints at it: how many type sizes, accent hues and
// corner radii it uses, whether one thing leads, whether text lines are readable, whether headings
// nest, whether cards nest, whether sections keep one rhythm, and whether placeholder copy is left in.
const TASTE_CHECKS = (arg = null) => {
  const product = arg?.name ?? null, kitSamples = arg?.samples ?? [], kitBrands = arg?.brands ?? [], kitLinks = new Set(arg?.links ?? []);
  const out = [];
  const add = (rule, el, message, severity = 'warning') => out.push({ rule, severity, selector: el ? sel(el) : null, message });
  function sel(el) { const p = []; for (let e = el; e && e.nodeType === 1 && p.length < 4; e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } const c = [...e.classList].filter((x) => !x.startsWith('is-')).slice(0, 2); if (c.length) s += '.' + c.join('.'); p.unshift(s); } return p.join(' > '); }
  const shown = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return !el.closest('[inert], [aria-hidden="true"], dialog:not([open]), [hidden]'); };
  const skip = (el) => el.closest('svg, pre, code, kbd, samp, script, style, noscript, [data-audit-ignore], .lt-chart, [data-chart-stage]');
  const leaves = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement; if (!el || seen.has(el) || !n.textContent.trim() || skip(el)) continue;
    seen.add(el); if (shown(el)) leaves.push(el);
  }
  const ctx = document.createElement('canvas').getContext('2d');
  const toRgb = (c) => { ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data; ctx.clearRect(0, 0, 1, 1); return [r, g, b, a / 255]; };
  const lab = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const R = f(r), G = f(g), B = f(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { L, C: Math.hypot(A, Bb), h: ((Math.atan2(Bb, A) * 180) / Math.PI + 360) % 360 }; };

  // 1. Type scale: a calm page uses 5–7 sizes.
  const sizes = new Map();
  for (const el of leaves) { const fs = Math.round(parseFloat(getComputedStyle(el).fontSize)); sizes.set(fs, (sizes.get(fs) ?? 0) + 1); }
  // Sizes used once (a badge, a footnote) do not make a scale; count the ones used repeatedly.
  // Sizes within 8% of each other (13 and 14px) read as one step.
  const used = [...sizes].filter(([, n]) => n > 1).map(([s]) => s).sort((a, b) => a - b);
  // Sizes of 40px and more are display type (a headline, a figure set large): they count as one step together.
  const steps = used.reduce((acc, s) => { const last = acc.at(-1); if (last && (s / last.at(-1) < 1.08 || (s >= 40 && last.at(-1) >= 40))) last.push(s); else acc.push([s]); return acc; }, []);
  if (steps.length > 8) add('taste-type-scale', null, `${steps.length} distinct type steps in repeated use (${used.join(', ')}px). Use 5–7 steps for reading and interface text (--step-*, --text-ui*) and drop the rest; display sizes of 40px and more count as one.`);

  // 2. Accent hues: one accent plus status colours. Count saturated hues used on text, fills and borders outside charts.
  const hues = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (skip(el) || el.closest('img, picture, video, canvas, [data-swatch], .lt-avatar, [data-part="avatar"], [data-part="swatch"]')) continue;
    const cs = getComputedStyle(el);
    for (const c of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
      const rgb = toRgb(c); if (rgb[3] < 0.5) continue;
      const k = lab(rgb); if (k.C < 0.09 || k.L < 0.25 || k.L > 0.97) continue;
      const b = Math.round(k.h / 40) % 9; if (!hues.has(b)) { if (shown(el)) hues.set(b, el); }
    }
  }
  if (hues.size > 4) add('taste-colour-count', [...hues.values()][4], `${hues.size} different saturated hues. Keep one accent plus status colours; make the rest neutral.`);

  // 3. Corner radii: pills and circles aside, one or two radii read as a system.
  const radii = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (skip(el)) continue;
    const cs = getComputedStyle(el); const r = parseFloat(cs.borderTopLeftRadius); if (!r) continue;
    const box = el.getBoundingClientRect(); if (box.width < 24 || box.height < 16 || r >= Math.min(box.width, box.height) / 2 - 1) continue;
    const framed = cs.borderTopStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0 || toRgb(cs.backgroundColor)[3] > 0.05; if (!framed || !shown(el)) continue;
    radii.set(Math.round(r), el);
  }
  if (radii.size > 5) add('taste-radius-mix', null, `${radii.size} corner radii (${[...radii.keys()].sort((a, b) => a - b).join(', ')}px). Use --radius-sm/md/lg/xl only.`);

  // 4. One primary action per screen: filled, saturated buttons in the same viewport band.
  const primaries = [...document.querySelectorAll('button, a, [role="button"], input[type="submit"]')].filter((el) => {
    if (skip(el) || !shown(el)) return false;
    const cs = getComputedStyle(el); const bg = toRgb(cs.backgroundColor); if (bg[3] < 0.9) return false;
    const k = lab(bg); const r = el.getBoundingClientRect();
    return k.C >= 0.08 && r.height >= 28 && r.width >= 64 && !el.closest('nav, header, [role="tablist"], [role="radiogroup"], .lt-segmented, [data-part="tabs"]') && el.dataset.tone !== 'danger';
  });
  const H = innerHeight;
  // An app board shows several phone screens side by side ([data-screen] or [data-mock] phones): each is its own screen.
  const appBoard = document.documentElement.hasAttribute('data-app') || document.body.hasAttribute('data-app');
  const screenOf = (el) => (appBoard ? el.closest('[data-screen], [data-mock]') : null);
  for (let i = 0; i < primaries.length; i++) {
    const a = primaries[i].getBoundingClientRect().top + scrollY;
    const band = primaries.filter((p) => { const t = p.getBoundingClientRect().top + scrollY; return t >= a && t < a + H * 0.6 && screenOf(p) === screenOf(primaries[i]); });
    if (band.length > 2) { add('taste-primary-count', primaries[i], `${band.length} filled accent buttons within one screen. Keep one primary; make the others secondary or ghost.`); break; }
  }

  // 5. Reading measure: body text lines over ~90 characters are tiring.
  for (const el of document.querySelectorAll('p, li, blockquote, dd')) {
    if (skip(el) || !shown(el) || el.textContent.trim().length < 180) continue;
    // A row built from parts (a name, a sentence, a price in columns) is not one line of text: its parts are measured on their own.
    if (el.matches('li, dd') && el.querySelector('p, h3, h4, dl, table, ul, ol, div')) continue;
    const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize);
    const chars = el.getBoundingClientRect().width / (fs * 0.5);
    if (chars > 95) { add('taste-measure', el, `Text line is about ${Math.round(chars)} characters wide. Cap reading text at max-width: var(--measure) (68ch).`); break; }
  }

  // 6. Headings: one h1, no skipped levels.
  // Visually hidden headings count: screen readers navigate by them.
  const present = (el) => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return !el.closest('[hidden], [inert], [aria-hidden="true"]'); };
  const hs = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((h) => present(h) && !skip(h) && !h.closest('dialog, [role="dialog"], [popover]'));
  const h1s = hs.filter((h) => h.tagName === 'H1');
  if (h1s.length > 1) add('taste-heading-order', h1s[1], `${h1s.length} h1 headings. A page has one; use h2 for sections.`);
  if (hs.length && !h1s.length && hs.length > 2) add('taste-heading-order', hs[0], 'No h1. Give the page one title.');
  for (let i = 1; i < hs.length; i++) { const a = +hs[i - 1].tagName[1], b = +hs[i].tagName[1]; if (b > a + 1) { add('taste-heading-order', hs[i], `Heading jumps from h${a} to h${b}. Use h${a + 1}, then style it smaller if needed.`); break; } }

  // 7. Cards inside cards.
  const card = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); if (r.width < 160 || r.height < 80) return false; const framed = (cs.borderTopStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0 && cs.borderLeftStyle !== 'none' && parseFloat(cs.borderLeftWidth) > 0) || cs.boxShadow !== 'none'; return framed && parseFloat(cs.borderTopLeftRadius) >= 6 && toRgb(cs.backgroundColor)[3] > 0.5; };
  let nested = 0;
  for (const el of document.querySelectorAll('main *, body > section *, article *')) {
    if (nested > 0 || skip(el) || el.closest('dialog, [popover], [role="dialog"], [data-stage], [data-mock], [data-part="frame"], [data-part="shot"], .lt-table-wrap, form, figure, [data-audit-ignore]') || !card(el) || !shown(el)) continue;
    for (let p = el.parentElement, d = 0; p && p !== document.body && d < 4; p = p.parentElement, d++) if (card(p) && p.getBoundingClientRect().width - el.getBoundingClientRect().width < 80) { add('taste-nested-card', el, 'A framed card sits directly inside another framed card. Use a divider, a heading or plain spacing instead.'); nested++; break; }
  }

  // 8. Section rhythm: top-level bands share one or two vertical paddings.
  const bands = [...document.querySelectorAll('main > section, body > section, main > div > section, body > main > *')].filter((s) => shown(s) && s.getBoundingClientRect().height > 120);
  const pads = new Set(bands.map((s) => Math.round(parseFloat(getComputedStyle(s).paddingTop) / 8) * 8).filter((v) => v >= 24));
  if (pads.size > 3) add('taste-rhythm', null, `Sections use ${pads.size} different top paddings (${[...pads].sort((a, b) => a - b).join(', ')}px). Use --section-y for every band.`);

  // 9. Focal point: in the first screen, one text block should be clearly the largest.
  // Figures in a KPI row are meant to match each other, so numbers do not compete with the headline.
  const first = leaves.filter((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && !/^[\s\d.,:%£$€+−\-–kKmMbB×/]+$/.test(el.textContent); });
  if (first.length > 4) {
    const fsOf = (el) => parseFloat(getComputedStyle(el).fontSize);
    const max = Math.max(...first.map(fsOf));
    const tops = first.filter((el) => fsOf(el) >= max * 0.92).map((el) => el.closest('h1, h2, h3, p, li, a, button, div') ?? el);
    if (new Set(tops).size > 3 && max < 28) add('taste-focal', tops[0], `${new Set(tops).size} text blocks share the largest size (${Math.round(max)}px) in the first screen. Make one headline clearly bigger so the eye knows where to start.`);
  }

  // 9e. Composition: a page reads as designed when neighbouring sections differ in shape, share one left
  // edge and are not all centred. These look at geometry, not class names, so they hold for any page.
  {
    const vw = document.documentElement.clientWidth;
    const rectOf = (el) => el.getBoundingClientRect();
    const firstHeading = (band) => [...band.querySelectorAll('h1, h2, h3')].find((h) => { const r = h.getBoundingClientRect(); return shown(h) && !skip(h) && r.width > 8 && r.height > 8; }) ?? null;
    const shapeOf = (band) => {
      const h = firstHeading(band);
      if (!h) return { shape: 'none', h: null };
      const b = rectOf(band), r = rectOf(h);
      const cs = getComputedStyle(band), padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
      const left = b.left + padL, right = b.right - padR, width = Math.max(1, right - left), mid = (left + right) / 2;
      // A heading inside a framed panel is that panel's business (a closing band, a card): its own shape.
      const bandBg = cs.backgroundColor;
      // A section that is itself a rounded, filled card is a panel.
      if (parseFloat(cs.borderTopLeftRadius) > 0 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') return { shape: 'panel', h };
      for (let e = h.parentElement; e && e !== band; e = e.parentElement) { const c = getComputedStyle(e); const framed = parseFloat(c.borderTopWidth) > 0 && c.borderTopStyle !== 'none' && parseFloat(c.borderLeftWidth) > 0; const filled = c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== bandBg && rectOf(e).width < b.width - 8; if ((framed || filled) && rectOf(e).width > Math.min(width * 0.25, 240)) return { shape: 'panel', h }; }
      const centred = getComputedStyle(h).textAlign === 'center' || (Math.abs((r.left + r.right) / 2 - mid) < width * 0.04 && r.left - left > 48);
      if (centred) return { shape: 'centre', h };
      // Something substantial beside the heading, starting level with it: a rail or a split.
      const beside = [...band.querySelectorAll('ul, ol, dl, figure, form, table, img, [data-part]')].some((el) => { if (el.contains(h) || h.contains(el) || !shown(el)) return false; const e = rectOf(el); return e.left >= r.right - 8 && e.left > left + width * 0.28 && e.top < r.bottom + 24 && e.bottom > r.top && e.width > width * 0.3 && e.height > 80; });
      if (beside) return { shape: 'side', h };
      // Otherwise the heading is on top. Is the body a row of three or more like things?
      const row = [...band.querySelectorAll('ul, ol, dl, div')].some((list) => { const kids = [...list.children].filter(shown); if (kids.length < 3) return false; const t0 = rectOf(kids[0]).top; const sameRow = kids.filter((k) => Math.abs(rectOf(k).top - t0) < 6); return sameRow.length >= 3 && rectOf(kids[0]).top > r.bottom - 4 && rectOf(list).width > width * 0.7; });
      return { shape: row ? 'grid' : 'top', h, left: r.left };
    };
    const wide = vw >= 900;
    const seq = bands.filter((s) => rectOf(s).height > 200).map((s) => ({ el: s, ...shapeOf(s) })).filter((s) => s.shape !== 'none');
    const WORDS = { grid: 'a heading on top and a row of cards below', top: 'a heading on top and the body below', centre: 'a centred heading', side: 'a heading on the left and the body beside it', panel: 'one panel' };
    if (wide) {
      for (let i = 2; i < seq.length; i++) {
        // Prose under a heading may repeat (an article is meant to); rows of cards may not.
        if (seq[i].shape === 'grid' && seq[i - 1].shape === 'grid' && seq[i - 2].shape === 'grid') {
          add('taste-monotony', seq[i - 1].el, `Three sections in a row are ${WORDS.grid}: a wall of cards. Change the middle one: data-layout="rail" (rows beside the heading), figures, or one quote.`);
          break;
        }
      }
      let run = 0;
      for (const s of seq) { run = s.shape === 'centre' ? run + 1 : 0; if (run >= 4) { add('taste-centred-run', s.el, 'Four centred sections in a row. Centre a section only when its body is symmetrical; set the others on the left edge (or data-layout="rail").'); break; } }
      // One left edge: headings that are neither centred nor in a panel should start on the same line.
      const lefts = seq.filter((s) => (s.shape === 'top' || s.shape === 'grid' || s.shape === 'side') && s.h).map((s) => ({ s, x: Math.round(rectOf(s.h).left) }));
      if (lefts.length >= 3) {
        const counts = new Map(); for (const l of lefts) counts.set(l.x, (counts.get(l.x) ?? 0) + 1);
        const [edge, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        const off = lefts.find((l) => Math.abs(l.x - edge) >= 6 && Math.abs(l.x - edge) <= 72);
        if (off && n >= 2) add('taste-edge', off.s.h, `This section starts ${Math.abs(off.x - edge)}px ${off.x > edge ? 'right' : 'left'} of the edge the other sections share (x=${off.x}, the page's edge is x=${edge}). Align it: one left edge from the top of the page to the bottom.`);
      }
    }
    // A heading whose last line is one short word.
    for (const h of [...document.querySelectorAll('h1, h2, h3')].filter((x) => shown(x) && !skip(x) && parseFloat(getComputedStyle(x).fontSize) >= 22)) {
      const range = document.createRange(); range.selectNodeContents(h);
      const lines = []; for (const r of range.getClientRects()) { if (r.width < 2) continue; const line = lines.find((l) => Math.abs(l.top - r.top) < r.height * 0.6); if (line) { line.left = Math.min(line.left, r.left); line.right = Math.max(line.right, r.right); } else lines.push({ top: r.top, left: r.left, right: r.right }); }
      if (lines.length < 2) continue;
      lines.sort((a, b) => a.top - b.top);
      const last = lines[lines.length - 1], longest = Math.max(...lines.map((l) => l.right - l.left));
      const lastWord = h.textContent.trim().split(/\s+/).pop() ?? '';
      if ((last.right - last.left) / longest < 0.24 && lastWord.length <= 9) { add('taste-widow', h, `The heading “${h.textContent.trim().slice(0, 40)}” ends with one word alone on its last line (“${lastWord}”). Add text-wrap: balance, shorten it, or break it by sense.`); break; }
    }
    // Words against pictures: a section that is only words is a wall; two in a row is a page of them. A picture
    // is anything to look at: an image, a figure, a device or document, a chart, a large icon, or type set
    // large enough to be the picture (a figure or statement at 48px or more).
    if (wide && document.querySelector('[class*="hero"]')) {
      const PICTURE = 'img, picture, video, canvas, iframe, figure, [role="img"], .lt-art, .lt-device, .lt-invoice, .lt-bento, [data-part="visual"], [data-part="media"], [class*="chart"], [inert], [data-audit-ignore]';
      const count = (t) => (t || '').split(/\s+/).filter((w) => /[a-z]{2}/i.test(w)).length;
      const bigType = (band) => { const tw = document.createTreeWalker(band, NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) { const el = n.parentElement; if (el && n.textContent.trim() && shown(el) && parseFloat(getComputedStyle(el).fontSize) >= 48) return true; } return false; };
      // A list of short items (a timetable, opening hours, prices with a name each) scans like a table: it is not a wall.
      const scans = (band, total) => [...band.querySelectorAll('ul, ol, tbody, dl')].some((l) => { const items = [...l.children].filter(shown); if (items.length < 4) return false; const words = items.reduce((a, it) => a + count(it.innerText), 0); return words / items.length <= 9 && total - words <= 50; });
      // An inert rendering (a live preview) is hidden from assistive tech but is a picture to the eye.
      const seen = (e) => (e.closest('[inert], [data-audit-ignore], [aria-hidden="true"]') ? getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' : shown(e));
      const looksAt = (band, total) => [...band.querySelectorAll(PICTURE)].some((e) => seen(e) && rectOf(e).width >= 120 && rectOf(e).height >= 60)
        || [...band.querySelectorAll('svg')].some((e) => shown(e) && rectOf(e).width >= 96 && rectOf(e).height >= 64)
        || bigType(band) || scans(band, total);
      // Visible words only (innerText: a closed answer is not read), less those inside a preview or mock-up.
      const proseCount = (b) => Math.max(0, count(b.innerText) - [...b.querySelectorAll('[inert], [data-audit-ignore]')].filter((n) => !n.parentElement?.closest('[inert], [data-audit-ignore]')).reduce((a, n) => a + count(n.innerText), 0));
      const walls = bands.filter((b) => rectOf(b).height > 200 && !b.matches('[class*="hero"], [class*="footer"], [class*="nav"]')).map((b) => { const words = proseCount(b); return { el: b, words, pic: looksAt(b, words) }; });
      let flagged = false;
      for (let i = 0; i < walls.length && !flagged; i++) {
        const w = walls[i];
        if (!w.pic && w.words > 150) { add('taste-text-wall', w.el, `This section is ${w.words} words with nothing to look at. Cut each item to a name and a few words, or give it a picture: the real screen or document, a chart, one figure set large, stack-cards for steps, or an art panel.`); flagged = true; }
        else if (i > 0 && !w.pic && !walls[i - 1].pic && w.words > 45 && walls[i - 1].words > 45) { add('taste-text-wall', w.el, `Two sections in a row are only words (${walls[i - 1].words} and ${w.words}). Give one of them a picture (the product, a document, a chart, a figure set large), turn it into a scroll-statement or a media-band, or merge them.`); flagged = true; }
      }
    }
    // The page's headline: on a wide screen it should land in four lines or fewer. More means it is too long for its size.
    if (wide) {
      const h1 = [...document.querySelectorAll('h1')].find((x) => shown(x) && !skip(x));
      if (h1) {
        const lh = parseFloat(getComputedStyle(h1).lineHeight) || parseFloat(getComputedStyle(h1).fontSize) * 1.1;
        const lines = Math.round(h1.getBoundingClientRect().height / lh);
        if (lines >= 5) add('taste-headline-length', h1, `The headline runs to ${lines} lines at this width. At its size it should take four at most: cut it to the claim (six to ten words), or let it run wider.`);
      }
    }
    // A heading that breaks inside a hyphenated word ("sea- / green").
    for (const h of [...document.querySelectorAll('h1, h2, h3')].filter((x) => shown(x) && !skip(x) && parseFloat(getComputedStyle(x).fontSize) >= 22)) {
      const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); let hit = null;
      for (let n = walker.nextNode(); n && !hit; n = walker.nextNode()) {
        for (const m of n.textContent.matchAll(/[A-Za-z]-[A-Za-z]/g)) {
          const r1 = document.createRange(), r2 = document.createRange();
          r1.setStart(n, m.index); r1.setEnd(n, m.index + 1); r2.setStart(n, m.index + 2); r2.setEnd(n, m.index + 3);
          const a = r1.getBoundingClientRect(), b = r2.getBoundingClientRect();
          if (a.height && b.top - a.top > a.height * 0.6) { hit = n.textContent.slice(Math.max(0, n.textContent.lastIndexOf(' ', m.index) + 1)).split(/\s/)[0]; break; }
        }
      }
      if (hit) { add('taste-heading-break', h, `The heading breaks inside “${hit}”. Use a non-breaking hyphen (U+2011) in that word, or reword so the line ends between words.`); break; }
    }
    // Accent budget: solid accent fills should be a small share of the page, not its wallpaper.
    {
      const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;visibility:hidden;color:var(--accent-solid)'; document.body.append(probe);
      const accent = getComputedStyle(probe).color; probe.remove();
      if (accent && accent !== 'rgba(0, 0, 0, 0)') {
        const page = document.documentElement.scrollWidth * document.documentElement.scrollHeight;
        const bands = [...document.querySelectorAll(':is(section, header, footer, aside)[data-tone="accent"]')].filter((b) => shown(b));
        const firstBand = bands[0] ?? null;
        if (bands.length > 1) add('taste-accent-budget', bands[1], `${bands.length} bands in the brand colour. One is a moment; two make it wallpaper. Keep the strongest and give the others a plain or tinted ground.`);
        let area = 0;
        for (const el of document.querySelectorAll('body *')) {
          if (skip(el)) continue;
          const c = getComputedStyle(el);
          if (c.backgroundColor !== accent || !shown(el)) continue;
          if (el.parentElement && getComputedStyle(el.parentElement).backgroundColor === accent) continue;
          // One band in the brand's own colour is a design decision (data-tone="accent" on a section); it does not count.
          if (el === firstBand) continue;
          const r = rectOf(el); area += r.width * r.height;
        }
        if (page > 0 && area / page > 0.12) add('taste-accent-budget', null, `The accent colour fills ${Math.round((area / page) * 100)}% of the page. Keep it for the primary action, one thing in the hero and at most one band in the brand colour (data-tone="accent"); use ink, space and tinted bands for the rest.`);
      }
    }
  }

    // 9f. AI defaults (references/ai-defaults.md): the looks a model falls back on when nothing pushes it
    // elsewhere. A page may keep one deliberately by saying why on its root: <html data-look-reason="…">.
    {
      const rectOf = (e) => e.getBoundingClientRect();
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const oklch = (c) => {
        const [R, G, B, a] = rgba(c); const r = lin(R), g = lin(G), b = lin(B);
        const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
        return { L, C: Math.hypot(A, Bb), H: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360, a };
      };
      const groundOf = () => { for (const e of [document.body, document.documentElement]) { const c = getComputedStyle(e).backgroundColor; if (rgba(c)[3] > 0.5) return oklch(c); } return oklch('#fff'); };
      const ground = groundOf();
      // The accent: the most common saturated fill on links and buttons in the first two screens.
      const fills = [...document.querySelectorAll('a, button, [class*="btn"]')].filter((e) => shown(e) && !skip(e) && rectOf(e).top < innerHeight * 2).map((e) => getComputedStyle(e).backgroundColor).filter((c) => rgba(c)[3] > 0.8).map(oklch).filter((o) => o.C >= 0.05);
      const accent = fills.sort((x, y) => fills.filter((f) => Math.abs(f.H - y.H) < 12).length - fills.filter((f) => Math.abs(f.H - x.H) < 12).length)[0] ?? null;
      const h1 = [...document.querySelectorAll('h1')].find((h) => shown(h) && !skip(h));
      const fam = (el) => (el ? getComputedStyle(el).fontFamily : '').toLowerCase();
      const first = (f) => f.split(',')[0].replace(/["']/g, '').trim();
      const STOCK_SANS = /^(inter|inter display|geist|roboto|arial|helvetica|helvetica neue|system-ui|-apple-system|blinkmacsystemfont|segoe ui|space grotesk|open sans|poppins|montserrat)$/;
      const BOOK_SERIF = /playfair|newsreader|fraunces|instrument serif|cormorant|garamond|didot|bodoni|caslon|dm serif|lora|merriweather|crimson|source serif|iowan|charter|georgia|tiempos|canela|libre baskerville|baskerville|times/;
      const reason = document.documentElement.getAttribute('data-look-reason');
      const hero = document.querySelector('[class*="hero"]');
      const authored = document.documentElement.getAttribute('data-authored-mode');
      const asBuilt = !authored || authored === (document.documentElement.getAttribute('data-mode') ?? authored);
      const inHue = (o, a, b) => o && o.H >= a && o.H <= b;
      if (!reason && hero && accent && asBuilt) {
        const h1f = fam(h1);
        let look = null;
        if (inHue(accent, 262, 305) && accent.C >= 0.12 && STOCK_SANS.test(first(h1f))) look = ['the 2023 SaaS default', `an indigo or violet accent with ${first(h1f)} headlines`];
        else if (ground.L >= 0.93 && ground.C >= 0.006 && ground.C <= 0.045 && ground.H >= 55 && ground.H <= 100 && BOOK_SERIF.test(first(h1f)) && ((inHue(accent, 12, 58) && accent.C >= 0.06) || (inHue(accent, 125, 178) && accent.C >= 0.04))) look = ['the 2025 "tasteful" default', `a cream ground, a book serif headline and a ${inHue(accent, 12, 58) ? 'terracotta or rust' : 'forest green'} accent`];
        else if (ground.L <= 0.24 && accent.C >= 0.15 && (inHue(accent, 105, 150) || inHue(accent, 18, 52))) look = ['black with one acid colour', `a near-black ground and one ${inHue(accent, 105, 150) ? 'acid green' : 'vermilion'} accent`];
        if (look) add('taste-default-look', null, `This page is ${look[0]}: ${look[1]}. It is the look models produce when nothing in the brief pushes them elsewhere. Take the palette and type from the subject (references/ai-defaults.md §3), or, if the subject really asks for this look, say so on the page root: <html data-look-reason="…">.`);
      }
      // One stock sans for headlines and body alike, on a page with a hero.
      if (hero && h1 && STOCK_SANS.test(first(fam(h1))) && first(fam(h1)) === first(fam(document.querySelector('main p, p')))) add('taste-default-font', h1, `Headlines and body are both ${first(fam(h1))}, the default face of most generated pages. Choose a pairing for the subject from tokens/typography, with real weight contrast between headline and body.`);
      // Icons in tinted rounded tiles, three or more in a row: the generated feature grid.
      const tiles = [...document.querySelectorAll('svg, img, i')].filter((ic) => { const p = ic.parentElement; if (!p || !shown(ic)) return false; const r = rectOf(p), cs = getComputedStyle(p); return r.width >= 32 && r.width <= 76 && Math.abs(r.width - r.height) < 6 && rgba(cs.backgroundColor)[3] > 0.1 && parseFloat(cs.borderTopLeftRadius) >= 6 && rectOf(ic).width <= r.width * 0.75; }).map((ic) => ic.parentElement);
      const byList = new Map();
      for (const t of tiles) { const list = t.closest('ul, ol, [class*="grid"], [class*="features"], section'); if (list) byList.set(list, (byList.get(list) ?? 0) + 1); }
      const tileList = [...byList.entries()].find(([, n]) => n >= 3);
      if (tileList) add('taste-icon-tiles', tileList[0], `${tileList[1]} items each lead with an icon in a tinted rounded tile: the generated feature grid. Show each feature instead (a screen fragment, a document, a figure), or drop the icons and let the headings carry it.`);
      // Coloured glow on a dark ground.
      if (ground.L < 0.35) {
        const glow = [...document.querySelectorAll('body *')].find((e) => { if (!shown(e) || skip(e)) return false; const cs = getComputedStyle(e); return [cs.boxShadow, cs.textShadow].some((sh) => sh && sh !== 'none' && [...sh.matchAll(/((?:rgba?|oklch|oklab|color|hsla?)\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/g)].some((m) => +m[4] >= 12 && oklch(m[1]).C >= 0.1 && rgba(m[1])[3] >= 0.25)); });
        if (glow) add('taste-glow', glow, 'A coloured glow on a dark ground, the neon look of generated dark pages. Use surface steps and one hairline of light on the top edge for depth.');
      }
      // Cards that grow on hover.
      let scaled = 0;
      for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch { continue; } for (const r of rules ?? []) { if (!r.selectorText || !r.selectorText.includes(':hover')) continue; const t = `${r.style.transform} ${r.style.scale}`; const m = /scale\(\s*([\d.]+)|^\s*([\d.]+)/.exec(t.replace(/^\s*none/, '')); const v = m ? +(m[1] ?? m[2]) : 1; if (v >= 1.03) { try { scaled += [...document.querySelectorAll(r.selectorText.replace(/:hover/g, ''))].filter((e) => shown(e) && rectOf(e).width >= 160).length; } catch { /* odd selector */ } } } }
      if (scaled >= 3) add('taste-hover-scale', null, `${scaled} cards grow on hover (scale 1.03 or more). Hover should answer the pointer quietly: a 1 to 2px lift, a border or a shadow step.`);
      // Figures models invent.
      const stat = [...document.querySelectorAll('dd, b, strong, [data-part="figure"], [class*="stat"] *, p, span')].find((e) => shown(e) && !skip(e) && e.children.length === 0 && /^(\d+x|10x faster|99\.9+%|100%|24\/7|#1|\d+k\+|\d+m\+)$/i.test((e.textContent ?? '').trim()) && !/(month|year|week|day|since|over the last|in 20\d\d|per )/i.test(e.parentElement?.parentElement?.textContent ?? ''));
      if (stat) add('taste-invented-stat', stat, `“${stat.textContent.trim()}” is one of the figures generated pages invent. Keep it only if it is true and the page says over what period; otherwise remove it.`);
      // Faces and pictures from stock or placeholder services.
      const stock = [...document.querySelectorAll('img, source')].find((im) => /pravatar|randomuser|dicebear|ui-avatars|unsplash|pexels|picsum|placehold|placeholder|loremflickr|via\.placeholder/i.test(im.getAttribute('src') ?? im.getAttribute('srcset') ?? ''));
      if (stock) add('taste-stock-face', stock, 'A picture from a stock or placeholder service. Use the subject\'s own photograph, an art panel with data-shot (the brief for the photograph), or nothing.', 'error');
    }

    // 9g. Generated hallmarks on a marketing page: a small label over every section heading, and thin rules in
    // every direction. Both make a page read as a template. Sections should differ by scale, ground and picture.
    if (document.querySelector('[class*="hero"]')) {
      const rectOf = (e) => e.getBoundingClientRect();
      const heads = [...document.querySelectorAll('main h2')].filter((h) => shown(h) && !skip(h) && !h.closest('[class*="hero"]'));
      const labelled = heads.filter((h) => {
        const prev = h.previousElementSibling;
        if (!prev || !shown(prev)) return false;
        const cs = getComputedStyle(prev), words = (prev.textContent ?? '').trim().split(/\s+/).length;
        return words <= 6 && parseFloat(cs.fontSize) <= 14 && (cs.textTransform === 'uppercase' || parseFloat(cs.letterSpacing) >= 0.6 || /mono/i.test(cs.fontFamily));
      });
      if (heads.length >= 3 && labelled.length >= 3 && labelled.length / heads.length >= 0.6) add('taste-label-every-section', labelled[0], `${labelled.length} of ${heads.length} section headings have a small label over them (“${(labelled[0].previousElementSibling.textContent ?? '').trim().slice(0, 24)}”). Over every heading it is a template's habit, not information. Keep one where it says something the heading cannot (a date, a place); let the headings stand alone.`);
      // Thin rules: visible 1px edges at least 160px long, counted per screen of page.
      const main = document.querySelector('main') ?? document.body;
      let lines = 0;
      for (const e of main.querySelectorAll('*')) {
        if (!shown(e) || skip(e) || e.closest('table, pre, [role="grid"]')) continue;
        const cs = getComputedStyle(e), r = rectOf(e);
        for (const [side, len] of [['Top', r.width], ['Bottom', r.width], ['Left', r.height], ['Right', r.height]]) {
          if (len < 160 || cs[`border${side}Style`] === 'none' || parseFloat(cs[`border${side}Width`]) === 0 || parseFloat(cs[`border${side}Width`]) > 1.5) continue;
          // An invisible edge (transparent, or nearly) is not a rule anyone sees.
          { const m = /rgba?\(([^)]+)\)/.exec(cs[`border${side}Color`]); const a = m ? (m[1].split(/[,\s/]+/).filter(Boolean)[3] ?? '1') : '1'; if (parseFloat(a) < 0.12 || cs[`border${side}Color`] === 'transparent') continue; }
          if (side === 'Left' || side === 'Right') { if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') continue; } // a box's sides count once, as its top
          lines++;
        }
      }
      const screens = Math.max(1, document.documentElement.scrollHeight / innerHeight);
      const perScreen = lines / screens;
      if (perScreen > 10) add('taste-hairlines', null, `About ${Math.round(perScreen)} thin rules per screen (${lines} on the page). Lines everywhere read as a generated broadsheet. Separate with space and a change of ground; keep rules for tables and the few rows people compare.`);
    }

  // 9b. Leftover sample copy: with --product "Name", the kit's own demo brands and people must be gone.
  if (product) {
    const SAMPLES = ['Halyard', 'Kestrel Labs', 'Moss Studio', 'Juniper & Co', 'Juniper Coffee', 'Juniper Freight', 'Larkspur', 'Harbour & Co', 'Moss & Oak', 'Ana López', 'Kai Moreno', 'Riya Mehta', 'Lee Park', ...kitBrands];
    // A screen drawn inside a device frame (inert, a picture of the product) may show made-up records, as any product
    // shot does; the page's own words may not.
    const DEPICT = '.lt-device, [data-mock], [data-app][inert]';
    let text = document.body.innerText;
    for (const d of document.querySelectorAll(DEPICT)) { const t = d.innerText; if (t) text = text.split(t).join(' '); }
    const left = SAMPLES.filter((s) => text.includes(s) && !product.toLowerCase().includes(s.toLowerCase()));
    if (left.length) add('taste-sample-copy', null, `Sample copy from the kit is still on the page: ${left.slice(0, 5).map((s) => `“${s}”`).join(', ')}${left.length > 5 ? ` and ${left.length - 5} more` : ''}. Replace it with ${product}’s own names, words and numbers.`, 'error');
    // Rows a draft marked as sample data (data-sample) are not the product's yet.
    const sampled = [...document.querySelectorAll('[data-sample]')].filter((e) => e.getClientRects().length && !e.closest(DEPICT));
    if (sampled.length) add('taste-sample-rows', sampled[0], `${sampled.length} element${sampled.length === 1 ? ' is' : 's are'} still marked data-sample: the draft's made-up rows. Replace them with ${product}’s real records (or an empty state), then remove the attribute.`, 'error');

    // 9c. Leftover sample content: sentences and figures that came with a blueprint or a snippet and were
    // never rewritten. Swapping the brand name is not enough, so the product's name is ignored when comparing.
    const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase().replaceAll(product.toLowerCase(), '§');
    const kit = new Map(kitSamples);
    const kept = new Map();
    for (const el of leaves) for (const node of el.childNodes) {
      if (node.nodeType !== 3) continue;
      const raw = node.textContent.replace(/\s+/g, ' ').trim();
      if (raw.length >= 6 && kit.has(norm(raw)) && !kept.has(norm(raw))) kept.set(norm(raw), { t: raw, from: kit.get(norm(raw)) });
      // A placeholder a draft left for the writer ("TODO: two short paragraphs…") is unfinished copy too.
      if (/^TODO\b/.test(raw) && !kept.has(norm(raw))) kept.set(norm(raw), { t: raw });
    }
    const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    if (/lumina-taste|^Blueprint:|^TODO\b/i.test(desc)) kept.set('meta', { t: `meta description: ${desc.slice(0, 48)}…` });
    if (/^TODO\b/.test(document.title)) kept.set('title', { t: `page title: ${document.title.slice(0, 48)}` });
    // Links that still lead where the sample's led: its product pages, its phone number, its email address.
    for (const a of document.querySelectorAll('a[href]')) { const h = a.getAttribute('href'); if (kitLinks.has(h) && !kept.has(`link:${h}`) && !skip(a)) kept.set(`link:${h}`, { t: `a link to ${h}`, link: true }); }
    if (kept.size) {
      const list = [...kept.values()].filter((x) => !x.link), linked = [...kept.values()].filter((x) => x.link).map((x) => x.t.replace(/^a link to /, ''));
      if (linked.length) add('taste-sample-content', null, `${linked.length} link${linked.length > 1 ? 's still lead' : ' still leads'} where the sample's did: a link to ${linked.slice(0, 4).join(', ')}${linked.length > 4 ? ` and ${linked.length - 4} more` : ''}. Point ${linked.length > 1 ? 'them' : 'it'} at ${product}’s own pages, phone number and address, or remove ${linked.length > 1 ? 'them' : 'it'}.`);
      if (list.length) add('taste-sample-content', null, `${list.length} piece${list.length > 1 ? 's' : ''} of the kit's sample content ${list.length > 1 ? 'are' : 'is'} unchanged: ${list.slice(0, 4).map((x) => `“${x.t.length > 56 ? x.t.slice(0, 54) + '…' : x.t}”${x.from ? ` (from ${x.from})` : ''}`).join(', ')}${list.length > 4 ? ` and ${list.length - 4} more` : ''}. Rewrite ${list.length > 1 ? 'them' : 'it'} with ${product}’s own facts, or remove ${list.length > 1 ? 'them' : 'it'}. Never keep or invent customers, quotes or figures.`, list.length >= 5 ? 'error' : 'warning');
    }

    // 9d. Links to sections that do not exist. A page built from parts inherits their #anchors.
    const dead = [...new Set([...document.querySelectorAll('a[href^="#"]')].filter((a) => !skip(a) && shown(a)).map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !document.getElementById(decodeURIComponent(h.slice(1)))))];
    if (dead.length) add('taste-dead-anchor', null, `${dead.length} link target${dead.length > 1 ? 's are' : ' is'} not on the page: ${dead.slice(0, 5).join(', ')}${dead.length > 5 ? ` and ${dead.length - 5} more` : ''}. Point each link at a real section id or a real page, or remove it.`);
  }

  // 10. Placeholder and template content.
  const PH = /\blorem ipsum\b|\bdolor sit amet\b|\bjohn doe\b|\bjane doe\b|\bacme\b|\bfeature (one|two|three|1|2|3)\b|\byour (title|headline|text) here\b|\bproduct name\b|\bcompany name\b|\btodo\b|\bplaceholder\b|\bexample\.com\b|\b123 main st/i;
  for (const el of leaves) { if (el.closest('input, textarea, [data-audit-ignore]')) continue; const m = PH.exec(el.textContent); if (m) { add('taste-placeholder', el, `Placeholder content: “${m[0]}”. Replace it with real copy or realistic sample data.`, 'error'); break; } }

  // 11b. Empty visual boxes: a large framed area with nothing in it reads as a missing image.
  for (const el of document.querySelectorAll('main *, body > section *')) {
    if (skip(el) || el.closest('[role="img"][aria-label], [aria-busy="true"], .lt-skeleton, .lt-skeleton-card, [data-audit-ignore], dialog, [popover], [hidden], [inert]')) continue;
    const r = el.getBoundingClientRect(); if (r.width < 200 || r.height < 120) continue;
    if (el.textContent.trim() || el.querySelector('img, svg, canvas, video, picture, iframe, input, textarea, select, button, [role="img"]')) continue;
    const cs = getComputedStyle(el); const painted = toRgb(cs.backgroundColor)[3] > 0.05 || cs.backgroundImage !== 'none' || (cs.borderTopStyle !== 'none' && parseFloat(cs.borderTopWidth) > 0);
    // Decorative placeholders are often aria-hidden, so judge what is painted, not what is announced.
    const painted2 = (() => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; })();
    if (!painted || !painted2 || el.parentElement?.closest('[data-empty-flagged]')) continue;
    el.setAttribute('data-empty-flagged', '');
    add('taste-empty-visual', el, `A ${Math.round(r.width)}×${Math.round(r.height)}px box has nothing in it, which reads as a missing image. Put a real screenshot or a small live mockup (stat-strip, table, chart) in it, or remove it.`);
    break;
  }

  // 11. Button labels: short verbs, not sentences.
  for (const el of document.querySelectorAll('button, a.lt-btn, [role="button"]')) {
    if (skip(el) || !shown(el) || el.hasAttribute('aria-expanded') || el.closest('summary, [role="tablist"], [role="listbox"], [role="menu"]') || el.matches('[role="checkbox"], [role="switch"], [role="radio"], [role="option"], [role="tab"], [role^="menuitem"], [aria-pressed], [aria-checked]')) continue; const words = (el.innerText ?? el.textContent).trim().split(/\s+/).filter(Boolean);
    // Example prompts and FAQ-style questions are sentences on purpose.
    if (/\?\s*$/.test(el.textContent.trim()) || el.hasAttribute('data-suggest')) continue;
    // A row in a list that happens to be a button (a chapter, a conversation, a file) is named by its content.
    if (el.parentElement?.tagName === 'LI' && el.parentElement.children.length === 1) continue;
    // The same row inside a swipe row (its main part, beside the More button that is its keyboard path).
    if (el.matches('[data-part="main"]') && el.closest('li[data-part="row"]')) continue;
    if (words.length > 5) { add('taste-button-label', el, `Button label has ${words.length} words (“${el.textContent.trim().slice(0, 40)}”). Use a verb and an object: “Export report”.`); break; }
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
  // Remember the mode the page was written in: the default-look rule judges the look as built, not a mode the audit switched to.
  await page.evaluate(() => { const r = document.documentElement; if (!r.hasAttribute('data-authored-mode')) r.setAttribute('data-authored-mode', r.getAttribute('data-mode') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')); });
  // Every themed root follows the run's mode, except a panel that shows one mode on purpose (data-lock names "mode").
  await page.evaluate((m) => document.querySelectorAll('[data-mode]').forEach((e) => { if (!/\bmode\b/.test(e.getAttribute('data-lock') ?? '')) e.setAttribute('data-mode', m); }), mode);
  await page.addStyleTag({ content: '*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;animation-delay:0s!important;caret-color:transparent!important;scroll-behavior:auto!important}' });
  // Scroll through so lazy and reveal-on-scroll content is present, then return to the top.
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 150));
  });
  if (process.env.LT_AUDIT_DEBUG) await page.evaluate(() => (window.__ltDebug = true));
  const findings = (await page.evaluate(PAGE_CHECKS, COPY_RULES.map(([re, why, fix]) => [re.source, re.flags, why, fix]))).map((f) => ({ ...f, viewport: vpName, mode }));
  if (tasteOn) for (const f of await page.evaluate(TASTE_CHECKS, product ? { name: product, samples: KIT_SAMPLES.phrases, brands: KIT_SAMPLES.brands, links: KIT_SAMPLES.links } : null)) findings.push({ ...f, viewport: vpName, mode });
  // The designer's measures: what each section gives the eye, layout, density, type jump, motion, app rules.
  let measures = null;
  if (tasteOn) {
    measures = await page.evaluate(MEASURE, { states: await declaredStates(ctx, url) });
    for (const f of judgeMeasures(measures, { wide: vp.width >= 900 })) findings.push({ ...f, viewport: vpName, mode });
    for (const f of judgePagePhotos(await page.evaluate(PAGE_PHOTOS))) findings.push({ ...f, viewport: vpName, mode });
    if (vp.width < 900 && measures.bars.length) for (const f of await safeAreaGaps(ctx, page, measures)) findings.push({ ...f, viewport: vpName, mode });
  }
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
      // Under an open dialog or sheet that is not its own (a preview opens its sheet over its trigger): not reachable now.
      const top = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, r.top + r.height / 2));
      const over = top?.closest('dialog[open], [data-contained-open], [role="dialog"], [popover]:popover-open');
      if (over && !over.contains(el)) return null;
      return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    }, i);
    if (!box || box.width < 4 || box.height < 4) continue;
    let before;
    try { before = await page.screenshot({ clip: box }); } catch { continue; } // clip outside the image (page wider than the screen): overflow reports it
    const label = await page.evaluate((k) => { const el = window.__ltAudit.controls[k]; el.focus({ focusVisible: true, preventScroll: true }); return document.activeElement === el ? null : 'nofocus'; }, i);
    if (label === 'nofocus') continue;
    let after;
    try { after = await page.screenshot({ clip: box }); } catch { continue; }
    if (before.equals(after)) {
      if (process.env.LT_AUDIT_DEBUG) { mkdirSync('qa/artifacts/focus-debug', { recursive: true }); writeFileSync(`qa/artifacts/focus-debug/${i}-${vpName}-${mode}.png`, after); console.log('focus debug', i, JSON.stringify(box), await page.evaluate(() => [scrollY, document.activeElement?.outerHTML.slice(0, 80), getComputedStyle(document.activeElement).outlineStyle, document.documentElement.dataset.modality])); }
      const s = await page.evaluate((k) => { const el = window.__ltAudit.controls[k]; return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} “${(el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim().slice(0, 30)}”`; }, i);
      findings.push({ rule: 'focus-visible', severity: 'error', selector: s, message: 'No visible focus indicator when focused by keyboard.', viewport: vpName, mode });
    }
  }
  await page.evaluate(() => document.activeElement?.blur?.());
  if (shotDir) {
    mkdirSync(shotDir, { recursive: true });
    // Name the files after the page, not its whole path: the folder and file for a local page ("pricing-index"),
    // the host, path and state for a served one.
    const u = url.replace(/^\w+:\/\//, '').replace(/\.html?(?=$|[?#])/, '');
    const name = (url.startsWith('file:') || !/^\w+:/.test(url) ? u.split(/[?#]/)[0].split('/').filter(Boolean).slice(-2).join('-') + (u.match(/[?#].*$/)?.[0] ?? '') : u).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(-70);
    // The first screen as people see it, then the whole page with sticky and fixed bars put back in
    // the flow (otherwise a full-page capture shows them floating halfway down).
    const base = `${shotDir}/${name}-${vpName}-${mode}`;
    // Back to the top, including app shells that scroll inside themselves.
    await page.evaluate(() => { scrollTo(0, 0); for (const el of document.querySelectorAll('body *')) if (el.scrollTop) el.scrollTop = 0; });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${base}-screen.png` });
    await page.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const p = getComputedStyle(el).position; if (p === 'sticky') el.style.position = 'relative'; else if (p === 'fixed') el.style.position = 'absolute'; } });
    // An app shell that is one screen tall and scrolls inside is opened out, so the full capture shows all of it.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (!/auto|scroll/.test(cs.overflowY) || el.scrollHeight <= el.clientHeight + 40 || el.clientHeight < innerHeight * 0.5) continue;
        el.style.overflow = 'visible'; el.style.height = 'auto'; el.style.maxHeight = 'none';
        for (let a = el.parentElement; a; a = a.parentElement) { a.style.height = 'auto'; a.style.maxHeight = 'none'; a.style.overflow = 'visible'; }
      }
    });
    await page.screenshot({ path: `${base}-full.png`, fullPage: true });
    shots.push(`${base}-screen.png`, `${base}-full.png`);
  }
  await ctx.close();
  return { findings, controls: meta.count, focusChecked: focusIdx.length, measures };
}

// ------------------------------------------------------------------ app and speed helpers
const statesCache = new Map();
/** The page states a blueprint declares in the meta.json beside it (loading, empty, error…), if there is one. */
async function declaredStates(ctx, url) {
  let metaUrl; try { metaUrl = new URL('meta.json', url).href; } catch { return []; }
  if (statesCache.has(metaUrl)) return statesCache.get(metaUrl);
  let states = [];
  try {
    if (metaUrl.startsWith('file:')) { const f = fileURLToPath(metaUrl); if (existsSync(f)) states = JSON.parse(readFileSync(f, 'utf8')).states ?? []; }
    else if (/^https?:/.test(metaUrl)) { const r = await ctx.request.get(metaUrl, { timeout: 3000, failOnStatusCode: false }); if (r.ok()) states = (await r.json()).states ?? []; }
  } catch { /* no meta, or not JSON */ }
  states = Array.isArray(states) ? states.filter((x) => typeof x === 'string' && /^[a-z-]+$/.test(x)) : [];
  statesCache.set(metaUrl, states);
  return states;
}

/**
 * Fixed bars at the bottom of a phone screen must clear the home indicator: env(safe-area-inset-bottom) in
 * the bar's own padding, height or bottom, or in a child's. Computed styles resolve env() to 0 off iOS, so
 * this reads the authored rules that match each bar through the DevTools protocol.
 */
async function safeAreaGaps(ctx, page, m) {
  // Custom properties that carry the inset (--safe-bottom: env(safe-area-inset-bottom)), followed through var() chains.
  const vars = await page.evaluate(() => {
    const decl = new Map();
    const walk = (rules) => { for (const r of rules) { if (r.style) for (let i = 0; i < r.style.length; i++) { const p = r.style[i]; if (p.startsWith('--')) decl.set(p, (decl.get(p) ?? '') + ' ' + r.style.getPropertyValue(p)); } if (r.cssRules) walk(r.cssRules); } };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* cross-origin sheet */ } }
    const names = new Set([...decl].filter(([, v]) => /safe-area-inset-bottom/.test(v)).map(([k]) => k));
    for (let grew = true; grew;) { grew = false; for (const [k, v] of decl) if (!names.has(k) && [...names].some((n) => v.includes(`var(${n}`))) { names.add(k); grew = true; } }
    return [...names];
  });
  const cdp = await ctx.newCDPSession(page);
  const out = [];
  try {
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-lt-audit-bar]' });
    for (const id of nodeIds) {
      const { nodeIds: kids } = await cdp.send('DOM.querySelectorAll', { nodeId: id, selector: ':scope > *, :scope > * > *' });
      let ok = false;
      for (const n of [id, ...kids.slice(0, 40)]) {
        const st = await cdp.send('CSS.getMatchedStylesForNode', { nodeId: n });
        const text = (style) => (style ? style.cssText || (style.cssProperties ?? []).map((d) => `${d.name}:${d.value}`).join(';') : '');
        const texts = [text(st.inlineStyle), ...(st.matchedCSSRules ?? []).map((x) => text(x.rule.style))];
        if (texts.some((t) => /safe-area-inset-bottom/.test(t) || vars.some((v) => t.includes(`var(${v}`)))) { ok = true; break; }
      }
      if (ok) continue;
      const { node } = await cdp.send('DOM.describeNode', { nodeId: id });
      const i = +(node.attributes[node.attributes.indexOf('data-lt-audit-bar') + 1] ?? 0);
      const bar = m.bars[i] ?? { selector: null, height: 0 };
      out.push({ rule: 'app-safe-area', severity: 'warning', selector: bar.selector, message: `A fixed bar sits on the bottom edge of the phone screen (${bar.height}px tall) with no env(safe-area-inset-bottom) in its padding, so on phones without a home button the home indicator covers its controls. Add padding-bottom: calc(<its padding> + env(safe-area-inset-bottom)) and viewport-fit=cover in the viewport meta.` });
    }
  } catch (err) { if (process.env.LT_AUDIT_DEBUG) console.error('safe-area check:', err.message); /* the protocol is not available: leave it to the eye */ }
  await cdp.detach().catch(() => {});
  return out;
}

// ------------------------------------------------------------------ native feel and accessibility (--taste)
const LONG_WORD = 'Donaudampfschifffahrtsgesellschaftskapitänsmützenabzeichen';
const SETTLE = '*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;animation-delay:0s!important;scroll-behavior:auto!important}';
async function freshPage(browser, url, vpName, opts = {}) {
  const vp = VIEWPORTS[vpName];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: 'reduce', ...opts });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.addStyleTag({ content: SETTLE });
  await page.waitForTimeout(150);
  return { ctx, page };
}
const PICK = (rules) => (f) => rules.includes(f.rule);

async function nativeAndA11y(browser, url, vpName, m) {
  const out = [];
  const phone = VIEWPORTS[vpName].width < 900;
  const tryRun = async (name, fn) => { try { out.push(...await fn()); } catch (err) { if (process.env.LT_AUDIT_DEBUG) console.error(`${name}:`, err.message); } };
  if (phone && m?.app && m.sheets?.length) await tryRun('sheets', () => sheetBehaviour(browser, url, vpName));
  if (phone && m?.app) await tryRun('dynamic type', () => dynamicType(browser, url, vpName));
  await tryRun('rtl', () => rtlCheck(browser, url, vpName));
  if (phone) await tryRun('long words', () => longWords(browser, url, vpName));
  if (!phone) await tryRun('forced colours', () => forcedColours(browser, url, vpName));
  if (phone) await tryRun('save data', () => saveDataCheck(browser, url, vpName));
  return out;
}

/** A bottom sheet opened from its own button (by keyboard) closes on Escape and gives focus back to that button. */
async function sheetBehaviour(browser, url, vpName) {
  const out = [];
  const { ctx, page } = await freshPage(browser, url, vpName);
  const OPEN = '[open], :popover-open, [data-contained-open]';
  const ids = await page.evaluate(() => [...document.querySelectorAll('.lt-sheet, dialog[data-detents], [class*="bottom-sheet"] dialog, dialog[class*="sheet"]')].filter((d) => !d.closest('[inert], [data-audit-ignore]')).slice(0, 3).map((d, i) => { d.setAttribute('data-lt-sheet', String(i)); return i; }));
  for (const i of ids) {
    const triggers = await page.evaluate((i) => {
      const d = document.querySelector(`[data-lt-sheet="${i}"]`);
      const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || e.closest('[hidden], [inert]')) return false; for (let a = e; a && a.nodeType === 1; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
      const root = d.closest('[data-lt="bottom-sheet"]');
      const list = [...new Set([...(d.id ? document.querySelectorAll(`[aria-controls="${d.id}"], [popovertarget="${d.id}"], [commandfor="${d.id}"]`) : []), ...(root ? root.querySelectorAll('[data-part="open"]') : []), ...document.querySelectorAll('[aria-haspopup="dialog"]')])].filter((e) => !d.contains(e) && vis(e)).slice(0, 4);
      list.forEach((e, k) => e.setAttribute('data-lt-trigger', `${i}-${k}`));
      return list.map((_, k) => `${i}-${k}`);
    }, i);
    let used = null;
    for (const t of triggers) {
      await page.focus(`[data-lt-trigger="${t}"]`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(250);
      if (await page.evaluate(([i, OPEN]) => document.querySelector(`[data-lt-sheet="${i}"]`).matches(OPEN), [i, OPEN])) { used = t; break; }
      await page.keyboard.press('Escape');
    }
    if (!used) continue;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const after = await page.evaluate(([i, t, OPEN]) => { const d = document.querySelector(`[data-lt-sheet="${i}"]`); const b = document.querySelector(`[data-lt-trigger="${t}"]`); return { open: d.matches(OPEN), back: document.activeElement === b, at: document.activeElement?.tagName.toLowerCase() ?? 'nothing', label: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 30) }; }, [i, used, OPEN]);
    if (after.open) out.push({ rule: 'app-sheet-escape', severity: 'warning', selector: `[data-lt-sheet="${i}"]`, message: `The sheet opened from “${after.label}” stays open on Escape. Escape (and the scrim) must close it, as they do a native sheet.` });
    else if (!after.back) out.push({ rule: 'app-sheet-focus', severity: 'warning', selector: `“${after.label}”`, message: `When the sheet opened from “${after.label}” closes, focus goes to ${after.at === 'body' ? 'the page itself' : `a ${after.at}`} instead of back to “${after.label}”, so a keyboard or screen reader user loses their place. Focus the opener on close.` });
  }
  await ctx.close();
  return out;
}

/** The app at its largest text: the root font size doubled, as Dynamic Type and browser zoom of text do. */
async function dynamicType(browser, url, vpName) {
  const out = [];
  const { ctx, page } = await freshPage(browser, url, vpName);
  const before = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())).slice(0, 1500).map((e, i) => { e.setAttribute('data-lt-dt', String(i)); return parseFloat(getComputedStyle(e).fontSize); }));
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.waitForTimeout(250);
  const fixed = await page.evaluate((before) => { let same = 0, n = 0; for (const e of document.querySelectorAll('[data-lt-dt]')) { const cs = getComputedStyle(e); if (cs.display === 'none' || e.closest('[hidden], [aria-hidden="true"], svg')) continue; n++; if (parseFloat(cs.fontSize) <= before[+e.getAttribute('data-lt-dt')] * 1.05) same++; } return { same, n }; }, before);
  const page2 = (await page.evaluate(PAGE_CHECKS, [])).filter(PICK(['clipped-text']));
  for (const o of await page.evaluate(TEXT_OVERLAP)) page2.push({ rule: 'overlap', selector: null, message: `text sits on other text: ${o}` });
  // Text pushed past the side of the screen. A pane that scrolls up and down clips sideways without scrolling, so only
  // a real sideways scroller (a rail, a table frame) excuses it.
  const past = await page.evaluate(() => {
    const W = document.documentElement.clientWidth, out = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n && out.length < 3; n = tw.nextNode()) {
      const el = n.parentElement; if (!el || !n.textContent.trim() || el.closest('svg, [aria-hidden="true"], [inert], [hidden], dialog:not([open]), .lt-visually-hidden, [data-audit-ignore]')) continue;
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.textOverflow === 'ellipsis') continue;
      // Visually hidden text (clipped to a pixel) is for screen readers: it takes no room.
      let tiny = false; for (let a = el; a && a !== document.body; a = a.parentElement) { const b = a.getBoundingClientRect(); if ((b.width <= 2 || b.height <= 2) && getComputedStyle(a).overflow !== 'visible') { tiny = true; break; } }
      if (tiny) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      const r = range.getBoundingClientRect(); if (r.width < 2 || r.right <= W + 2 || r.left >= W) continue;
      let sideways = false;
      // A sideways scroller: it scrolls across and not down (a rail of tabs, a strip), or it is a table's frame.
      for (let a = el; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (/auto|scroll/.test(c.overflowX) && (a.scrollHeight <= a.clientHeight + 1 || a.querySelector('table') || a.matches('[role="region"][tabindex]'))) { sideways = true; break; } if (c.position === 'fixed') break; }
      if (!sideways) out.push(`“${n.textContent.trim().slice(0, 24)}” runs to x=${Math.round(r.right)}`);
    }
    return out;
  });
  if (past.length) page2.push({ rule: 'clipped-text', selector: null, message: `text runs past the screen edge: ${past.join(', ')}` });
  const spill = await page.evaluate(CONTROL_FIT);
  await ctx.close();
  if (fixed.n && fixed.same / fixed.n > 0.25) out.push({ rule: 'app-dynamic-type', severity: 'warning', selector: null, message: `At 200% text, ${fixed.same} of ${fixed.n} pieces of text stay the same size: they are set in px. Size text in rem (the kit's --step-* and --text-ui* already are) so it follows the reader's text size.` });
  if (page2.length) out.push({ rule: 'app-dynamic-type', severity: 'warning', selector: page2[0].selector, message: `At 200% text, ${page2.length} piece${page2.length > 1 ? 's of text are' : ' of text is'} cut off or overlap${page2.length > 1 ? '' : 's'}: ${page2.slice(0, 2).map((f) => f.message.replace(/\.$/, '')).join('; ')}. Let rows and bars grow with their text (min-height, not height) and let labels wrap.` });
  if (spill.length) out.push({ rule: 'app-dynamic-type', severity: 'warning', selector: null, message: `At 200% text, ${spill.length} control${spill.length > 1 ? 's do' : ' does'} not grow with ${spill.length > 1 ? 'their' : 'its'} label: ${spill.slice(0, 3).join(', ')}. Use min-height and padding instead of a fixed height.` });
  return out;
}

/** Right-to-left: the same page with dir="rtl" must mirror and must not scroll sideways. */
async function rtlCheck(browser, url, vpName) {
  const { ctx, page } = await freshPage(browser, url, vpName);
  const ltr = await page.evaluate(RTL_PROBE);
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
  await page.waitForTimeout(200);
  const rtl = await page.evaluate(RTL_PROBE);
  await ctx.close();
  return judgeRtl(ltr, rtl);
}

/** A very long German compound in the page's text: it must wrap (hyphens, overflow-wrap), not push the page wider. */
async function longWords(browser, url, vpName) {
  const { ctx, page } = await freshPage(browser, url, vpName);
  const n = await page.evaluate(LONG_WORDS, LONG_WORD);
  await page.waitForTimeout(150);
  const found = n ? (await page.evaluate(PAGE_CHECKS, [])).filter(PICK(['overflow', 'clipped-text'])) : [];
  await ctx.close();
  return found.length ? [{ rule: 'a11y-long-words', severity: 'warning', selector: found[0].selector, message: `A long word (“${LONG_WORD.slice(0, 22)}…”, as German, Finnish or Dutch have) ${found[0].rule === 'overflow' ? 'pushes the page wider than the screen' : 'is cut off'}: ${found[0].message} Let text break inside a word when it must: overflow-wrap: anywhere (or break-word) and hyphens: auto with the page's lang.` }] : [];
}

/** Forced colours (Windows contrast themes): control parts, chart marks, field boxes and focus rings stay visible. */
async function forcedColours(browser, url, vpName) {
  const out = [];
  const { ctx, page } = await freshPage(browser, url, vpName);
  await page.evaluate(FORCED_MARKS, 'mark');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.waitForTimeout(150);
  const { gone, fields } = await page.evaluate(FORCED_MARKS, 'check');
  if (gone.length) out.push({ rule: 'a11y-forced-colors', severity: 'warning', selector: gone[0], message: `In forced colours (a Windows contrast theme), ${gone.length} part${gone.length > 1 ? 's' : ''} drawn only with a background disappear${gone.length > 1 ? '' : 's'}: ${[...new Set(gone)].slice(0, 3).join(', ')}. Chart marks, meter fills, switch tracks and thumbs need a border (a transparent one shows), or forced-color-adjust: none with system colours (CanvasText, Highlight) in @media (forced-colors: active).` });
  if (fields.length) out.push({ rule: 'a11y-forced-colors', severity: 'warning', selector: fields[0], message: `In forced colours, ${fields.length} text field${fields.length > 1 ? 's have' : ' has'} no visible box: ${fields.slice(0, 3).join(', ')}. Give the field a border (transparent is enough: forced colours paint it).` });
  // Focus rings drawn with box-shadow vanish here: pixel-check the first controls.
  const idx = await page.evaluate(() => { const els = [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="option"], [role="slider"], [tabindex="0"]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !e.disabled && !e.closest('[inert], [hidden], dialog:not([open]), [aria-hidden="true"]') && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0; }); els.forEach((e, i) => e.setAttribute('data-lt-ff', String(i))); return els.length; });
  await page.keyboard.press('Shift');
  const blind = [];
  for (let i = 0; i < Math.min(idx, 40); i++) {
    const box = await page.evaluate((k) => { const el = document.querySelector(`[data-lt-ff="${k}"]`); document.activeElement?.blur?.(); el.scrollIntoView({ block: 'center', inline: 'nearest' }); const r = el.getBoundingClientRect(); if (r.top < 0 || r.left < 0 || r.bottom > innerHeight || r.right > innerWidth) return null; return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 8), width: Math.min(innerWidth, r.right + 8) - Math.max(0, r.left - 8), height: Math.min(innerHeight, r.bottom + 8) - Math.max(0, r.top - 8) }; }, i);
    if (!box || box.width < 4 || box.height < 4) continue;
    let a, b;
    try { a = await page.screenshot({ clip: box }); } catch { continue; }
    const ok = await page.evaluate((k) => { const el = document.querySelector(`[data-lt-ff="${k}"]`); el.focus({ focusVisible: true, preventScroll: true }); return document.activeElement === el; }, i);
    if (!ok) continue;
    try { b = await page.screenshot({ clip: box }); } catch { continue; }
    if (a.equals(b)) blind.push(await page.evaluate((k) => { const el = document.querySelector(`[data-lt-ff="${k}"]`); return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} “${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 24)}”`; }, i));
  }
  if (blind.length) out.push({ rule: 'a11y-forced-colors', severity: 'warning', selector: blind[0], message: `In forced colours, ${blind.length} control${blind.length > 1 ? 's show' : ' shows'} no focus: ${blind.slice(0, 3).join(', ')}. A box-shadow ring is removed in forced colours; draw focus with outline (outline: var(--focus-width) solid var(--focus-ring)), or add one in @media (forced-colors: active).` });
  await ctx.close();
  return out;
}

/** Save-Data and prefers-reduced-data: no film loads or plays, and far pictures wait until they are near. */
async function saveDataCheck(browser, url, vpName) {
  let media = 0;
  const vp = VIEWPORTS[vpName];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, extraHTTPHeaders: { 'Save-Data': 'on' } });
  await ctx.addInitScript(SAVE_DATA_INIT);
  const page = await ctx.newPage();
  page.on('request', (r) => { if (r.resourceType() === 'media') media++; });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const seen = await page.evaluate(SAVE_DATA_COLLECT);
  await ctx.close();
  return judgeSaveData({ media, ...seen });
}

/** One cold load per viewport for speed: the largest paint, layout shift, bytes by kind, and the images. */
async function perfOne(browser, url, vpName) {
  const vp = VIEWPORTS[vpName];
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, reducedMotion: 'reduce' });
  await ctx.addInitScript(PERF_INIT);
  const page = await ctx.newPage();
  const bodies = [];
  page.on('response', (res) => {
    const type = res.request().resourceType();
    if (!['script', 'stylesheet', 'font', 'image'].includes(type)) return;
    bodies.push((async () => {
      let body = null; try { body = await res.body(); } catch { return null; }
      const encoded = !!(res.headers()['content-encoding'] ?? '');
      // What crosses the wire: the encoded size when the server compressed it, else the gzip size it would have.
      const wire = encoded ? ((await res.request().sizes().catch(() => null))?.responseBodySize || body.length) : (type === 'script' || type === 'stylesheet' ? gzipSync(body).length : body.length);
      return { type, raw: body.length, wire, encoded };
    })());
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const first = await page.evaluate(PERF_COLLECT);
  await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300)); });
  const later = await page.evaluate(PERF_COLLECT);
  const list = (await Promise.all(bodies)).filter(Boolean);
  await ctx.close();
  const sum = (t, k = 'wire') => list.filter((x) => x.type === t).reduce((a, x) => a + x[k], 0);
  const bytes = { js: sum('script'), css: sum('stylesheet'), font: sum('font'), fonts: list.filter((x) => x.type === 'font').length, image: sum('image'), jsRaw: sum('script', 'raw'), cssRaw: sum('stylesheet', 'raw') };
  return { lcp: first.lcp, cls: first.cls, shifts: first.shifts, moved: first.moved, images: later.images, bytes };
}

/**
 * Distinctive text that ships with the kit's blueprints and snippets: sentences of seven words or more, and
 * phrases of four words or more with a figure in them. Interface microcopy (short labels, keyboard hints) is left out, because a
 * page may rightly keep it. The kit's brand name is masked so a find-and-replace of the name still matches.
 */
function kitSamplePhrases() {
  const kitRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const files = [];
  try {
    for (const b of readdirSync(join(kitRoot, 'blueprints'))) { const f = join(kitRoot, 'blueprints', b, 'index.html'); if (existsSync(f)) files.push(f); }
    for (const fam of readdirSync(join(kitRoot, 'components/ui'))) {
      const famDir = join(kitRoot, 'components/ui', fam);
      if (!existsSync(join(famDir, 'family.json'))) continue;
      for (const id of readdirSync(famDir)) { const f = join(famDir, id, `${id}.html`); if (existsSync(f)) files.push(f); }
    }
  } catch { return { phrases: [], brands: [], links: [] }; }
  const ent = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
  const out = new Map(), brands = new Set(), links = new Set();
  for (const f of files) {
    const blueprint = /blueprints\/([^/]+)\/index\.html$/.exec(f)?.[1];
    const source = blueprint ? `the ${blueprint} blueprint` : basename(f, '.html');
    const raw = readFileSync(f, 'utf8');
    if (blueprint) {
      // Where the sample's links lead and who the sample is: neither belongs on a finished page.
      for (const m of raw.matchAll(/href="((?:\/|mailto:|tel:)[^"]+)"/g)) if (!m[1].startsWith('/') || m[1].split('/').length > 2) links.add(m[1]);
      try { for (const b of JSON.parse(readFileSync(join(dirname(f), 'meta.json'), 'utf8')).brand ?? []) brands.add(b); } catch { /* no meta */ }
    }
    const html = raw.replace(/<(script|style|svg|pre|code|kbd|title)[\s\S]*?<\/\1>/gi, ' ');
    for (const piece of html.split(/<[^>]+>/)) {
      const t = piece.replace(/&[a-z#0-9]+;/gi, (m) => ent[m] ?? ' ').replace(/\s+/g, ' ').trim();
      const words = t.split(' ').length;
      if (t.length < 6 || words < 2) continue;
      if (/\b(enter|shift|esc|press|tab|click|tap|drag|hold|arrow|keys?)\b/i.test(t) && words < 14) continue;
      // A question is the same question on every site ("Can I cancel?"); it is the answer that must be rewritten.
      if (/\?$/.test(t)) continue;
      const key = t.toLowerCase().replaceAll('halyard', '§');
      if ((words >= 7 || (/\d/.test(t) && words >= 4 && /[a-z]{3}/i.test(t))) && !out.has(key)) out.set(key, source);
    }
  }
  return { phrases: [...out], brands: [...brands], links: [...links] };
}

/** 100 minus weighted findings: errors cost 12, taste warnings 6, other warnings 3. One count per rule and message. */
function tasteScore(findings) {
  let s = 100; const seen = new Set();
  for (const f of findings) { const k = f.rule + f.message; if (seen.has(k)) continue; seen.add(k); s -= f.severity === 'error' ? 12 : f.rule.startsWith('taste-') ? 6 : 3; }
  return Math.max(0, s);
}
/** Why the score is not 100, in a few words: "2 errors −24, 1 taste warning −6". */
function scoreNote(findings) {
  const seen = new Set(); let e = 0, t = 0, w = 0;
  for (const f of findings) { const k = f.rule + f.message; if (seen.has(k)) continue; seen.add(k); if (f.severity === 'error') e++; else if (f.rule.startsWith('taste-')) t++; else w++; }
  const parts = [e && `${e} error${e > 1 ? 's' : ''} −${e * 12}`, t && `${t} taste warning${t > 1 ? 's' : ''} −${t * 6}`, w && `${w} other warning${w > 1 ? 's' : ''} −${w * 3}`].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

const shots = [];
const KIT_SAMPLES = product ? kitSamplePhrases() : { phrases: [], brands: [], links: [] };
const browser = await chromium.launch();
const report = [];
let errors = 0, warnings = 0;
for (const t of targets) {
  const url = toUrl(t);
  for (const vp of viewports) for (const mode of modes) {
    const r = await auditOne(browser, url, vp, mode);
    // Speed is judged once per viewport, on a cold load of its own, and reported with the first mode's run.
    let perf = null;
    if (perfOn && mode === modes[0]) {
      perf = await perfOne(browser, url, vp);
      for (const f of judgePerf(perf, { soft: !perfFlag })) r.findings.push({ ...f, viewport: vp, mode });
    }
    // What a native app and assistive tech need, judged once per viewport on a fresh load (see the header).
    if (tasteOn && mode === modes[0] && !/[?&]state=/.test(url)) for (const f of await nativeAndA11y(browser, url, vp, r.measures)) r.findings.push({ ...f, viewport: vp, mode });
    // De-duplicate identical findings (same rule + selector + message).
    const seen = new Set();
    const uniq = r.findings.filter((f) => { const k = `${f.rule}|${f.selector}|${f.message}`; if (seen.has(k)) return false; seen.add(k); return true; });
    // Known findings waiting on a fix elsewhere: listed, not counted.
    for (const f of uniq) { const p = pending.find((x) => x.rule === f.rule && (url.includes(`/${x.page}/`) || url.endsWith(`/${x.page}`))); if (p) { f.severity = 'pending'; p.hit = true; } }
    const e = uniq.filter((f) => f.severity === 'error').length, w = uniq.filter((f) => f.severity === 'warning').length;
    const score = tasteScore(uniq.filter((f) => f.severity !== 'pending'));
    report.push({ url, viewport: vp, mode, controls: r.controls, focusChecked: r.focusChecked, score, findings: uniq, ...(r.measures ? { measures: r.measures } : {}), ...(perf ? { perf: { lcp: perf.lcp, cls: perf.cls, bytes: perf.bytes } } : {}) });
    errors += e; warnings += w;
    if (!quiet || e || w || uniq.some((f) => f.severity === 'pending')) {
      console.log(`${e ? '✗' : w ? '!' : '✓'} ${url}  [${vp} ${VIEWPORTS[vp].width}×${VIEWPORTS[vp].height}, ${mode}]  ${e} errors, ${w} warnings · ${r.controls} controls, ${r.focusChecked} focus rings checked${tasteOn ? ` · taste ${score}/100${scoreNote(uniq.filter((f) => f.severity !== 'pending'))}` : ''}${perf ? ` · LCP ${perf.lcp ? `${perf.lcp.tag} ${perf.lcp.time}ms` : 'n/a'}, CLS ${perf.cls}, JS ${Math.round(perf.bytes.js / 1024)} KB, CSS ${Math.round(perf.bytes.css / 1024)} KB, fonts ${Math.round(perf.bytes.font / 1024)} KB (gzip)` : ''}`);
      const byRule = {};
      for (const f of uniq) (byRule[f.rule] ??= []).push(f);
      for (const [rule, list] of Object.entries(byRule)) {
        console.log(`    ${rule} (${list.length})`);
        for (const f of list.slice(0, 6)) console.log(`      ${f.severity === 'error' ? '✗' : f.severity === 'pending' ? '~ pending:' : '!'} ${f.message}${f.selector ? `\n        at ${f.selector}` : ''}`);
        if (list.length > 6) console.log(`      … ${list.length - 6} more`);
      }
    }
  }
}
await browser.close();
const avg = report.length ? Math.round(report.reduce((a, r) => a + r.score, 0) / report.length) : 0;
const pendingHits = report.flatMap((r) => r.findings.filter((f) => f.severity === 'pending'));
if (pendingHits.length) console.log(`\n~ ${pendingHits.length} pending finding${pendingHits.length > 1 ? 's' : ''} (known, waiting on a fix): ${[...new Set(pendingHits.map((f) => f.rule))].join(', ')}`);
for (const p of pending.filter((x) => !x.hit)) console.log(`~ pending ${p.page}:${p.rule} no longer fires: remove it from the list.`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ errors, warnings, score: avg, report }, null, 2));
if (shots.length) console.log(`\nScreenshots (${shots.length}): ${shotDir}/  (…-screen.png is the first screen, …-full.png the whole page)`);
console.log(`\n${errors ? '✗' : '✓'} audit-ui: ${errors} errors, ${warnings} warnings across ${report.length} runs${tasteOn ? ` · taste score ${avg}/100` : ''}`);
process.exit(errors || (strict && warnings) ? 1 : 0);
