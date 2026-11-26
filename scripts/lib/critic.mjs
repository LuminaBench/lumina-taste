// The designer's eye, measured. Shared by audit-ui.mjs (--taste, --perf) and review-page.mjs.
//
// MEASURE runs inside the page and returns plain numbers about each section: what there is to look at,
// its layout and ground, how dense it is, the type scale, the scroll moments, and whether the page is
// an app. judgeMeasures turns those numbers into findings, in Node, so the thresholds are testable
// without a browser. PERF_INIT / PERF_COLLECT do the same for load speed, and judgePerf judges it.
//
// MEASURE, PERF_INIT and PERF_COLLECT are serialised into the page: they may not use anything outside
// their own bodies.

/** In-page: measure the page as a designer would look at it. */
export const MEASURE = (opts = {}) => {
  const html = document.documentElement, body = document.body;
  const vw = html.clientWidth || innerWidth, vh = innerHeight;
  const rectOf = (e) => e.getBoundingClientRect();
  const shown = (el) => { const r = rectOf(el); if (r.width < 2 || r.height < 2) return false; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return !el.closest('[inert], [hidden], dialog:not([open])'); };
  const sel = (el) => { const p = []; for (let e = el; e && e.nodeType === 1 && p.length < 3; e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } const c = [...e.classList].filter((x) => !x.startsWith('is-')).slice(0, 2); if (c.length) s += '.' + c.join('.'); p.unshift(s); } return p.join(' > '); };
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const words = (t) => (t || '').split(/\s+/).filter((w) => /[a-z]{2}/i.test(w)).length;
  const hero = document.querySelector('[class*="hero"]');
  const appMarked = html.hasAttribute('data-app') || body.hasAttribute('data-app');

  // ---- the ground under an element: the first opaque background up the tree
  const groundOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none' && /url\(/.test(cs.backgroundImage)) return 'picture';
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0.5) return '#' + c.slice(0, 3).map((v) => Math.min(255, Math.round(v / 8) * 8).toString(16).padStart(2, '0')).join('');
    }
    return '#ffffff';
  };

  // ---- the bands: the page's top-level sections, in order
  const main = document.querySelector('main') ?? body;
  const candidates = [...new Set([...document.querySelectorAll('main > section, body > section, main > div > section, main > article > section, body > main > *, body > header[class*="hero"]')])]
    .filter((s) => !s.matches('nav, footer, script, style, [class*="footer"], [class*="navbar"], [aria-hidden="true"]') && shown(s) && rectOf(s).height > 120);
  // A wrapper that holds two or more bands gives way to them; a band inside a kept band is part of it.
  const kept = candidates.filter((b) => candidates.filter((o) => o !== b && b.contains(o)).length < 2);
  const bands = kept.filter((b) => !kept.some((o) => o !== b && o.contains(b)))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  // ---- what there is to look at in a band
  const PICTURE = 'img, picture, video, canvas, iframe, [role="img"], .lt-art, [class*="art-panel"], .lt-device, [class*="device"], [data-part="visual"], [data-part="media"], [data-part="frame"], [data-part="shot"], [data-part="art"], [data-stage], [data-mock], [data-shot]';
  const CHART = '.lt-chart, [class*="chart"], [data-chart-stage], meter, progress';
  const DOCUMENT = '.lt-invoice, [class*="invoice"], [class*="receipt"], [class*="document"], [class*="terminal"], [class*="code-block"], .lt-code, pre';
  const lookAt = (band) => {
    const found = [];
    const big = (e, w = 120, h = 60) => { const r = rectOf(e); return r.width >= w && r.height >= h; };
    if ([...band.querySelectorAll(PICTURE)].some((e) => shown(e) && big(e))) found.push('picture');
    // A drawing: an illustration, or a small chart such as a sparkline (wide and low), but not an icon.
    if ([...band.querySelectorAll('svg')].some((e) => { if (!shown(e)) return false; const r = rectOf(e); return (r.width >= 96 && r.height >= 64) || (r.width * r.height >= 6000 && Math.min(r.width, r.height) >= 24); })) found.push('drawing');
    if ([...band.querySelectorAll(CHART)].some((e) => shown(e) && big(e, 120, 48))) found.push('chart');
    if ([...band.querySelectorAll(DOCUMENT)].some((e) => shown(e) && big(e, 160, 40))) found.push('document');
    if ([...band.querySelectorAll('table')].some((t) => shown(t) && t.rows.length >= 3)) found.push('table');
    // Type set large enough to be the picture: a figure, a price, a statement, a quote. A section heading is not one.
    const tw = document.createTreeWalker(band, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const el = n.parentElement; if (!el || !n.textContent.trim() || !shown(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const heading = el.closest('h1, h2, h3');
      if ((fs >= 40 && !heading) || fs >= 56 || (fs >= 40 && heading && words(heading.textContent) >= 12)) { found.push('figure'); break; }
      if (fs >= 28 && el.closest('blockquote, q, [class*="quote"]')) { found.push('quote'); break; }
    }
    // A graphic drawn with boxes: bars, segments, swatches. Painted shapes with at most a short label in them.
    let area = 0, shapes = 0;
    for (const e of band.querySelectorAll('div, span, i, b, li')) {
      if (e.children.length > 1 || (e.textContent ?? '').trim().length > 6 || e.closest('a, button, label, [role="button"]')) continue;
      const cs = getComputedStyle(e); const c = rgba(cs.backgroundColor);
      if (c[3] < 0.3 || (cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage) && false)) continue;
      const r = rectOf(e); if (r.width < 6 || r.height < 6 || r.width * r.height > 200000 || e.querySelector('svg, img')) continue;
      if (!shown(e)) continue;
      area += r.width * r.height; shapes++;
    }
    if (shapes >= 3 && area >= 6000) found.push('graphic');
    // Rows that scan like a table (a timetable, a price list, people and their roles), or facts short enough to read as a spec sheet.
    for (const list of band.querySelectorAll('ul, ol, dl, tbody, div, section')) {
      const items = [...list.children].filter((k) => shown(k) && !/^(H[1-6]|P|FIGCAPTION)$/.test(k.tagName));
      if (items.length < 4) continue;
      const per = items.reduce((acc, it) => acc + words(it.innerText), 0) / items.length;
      const rows = items.every((it, j) => j === 0 || rectOf(it).top >= rectOf(items[j - 1]).bottom - 2);
      if (per <= 10 || (rows && per <= 14)) { found.push('rows'); break; }
    }
    return found;
  };
  // Sections that are used rather than looked at: a form, questions to open, a closing line with its action, a strip.
  const useOf = (band, w) => {
    if ([...band.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(shown).length >= 2) return 'form';
    if (band.querySelectorAll('details, [aria-expanded]').length >= 3 || /faq/i.test(band.className)) return 'questions';
    const heading = [...band.querySelectorAll('h1, h2, h3')].some(shown);
    if (w <= 30 && heading && [...band.querySelectorAll('a, button')].some(shown)) return 'action';
    if (w <= 30 && !heading) return 'strip';
    return null;
  };

  // ---- the layout of a band: its block, its column pattern, where its heading sits
  const GENERIC = /^(lt|bp)-(container|band|section|stack|grid|wrap|inner|content|page|block|full|bleed)$/;
  const blockOf = (band) => {
    const id = band.getAttribute('data-lt') ?? [...band.classList].find((c) => /^(lt|bp|[a-z]{2})-[a-z-]+$/.test(c) && !GENERIC.test(c)) ?? band.tagName.toLowerCase();
    const v = [band.getAttribute('data-variant'), band.getAttribute('data-layout')].filter(Boolean).join('/');
    return v ? `${id}:${v}` : id;
  };
  const tracksOf = (band) => {
    const W = rectOf(band).width;
    const queue = [[band, 0]];
    while (queue.length) {
      const [el, d] = queue.shift();
      const cs = getComputedStyle(el);
      const kids = [...el.children].filter((k) => shown(k) && !/absolute|fixed/.test(getComputedStyle(k).position));
      if (/grid|flex/.test(cs.display) && kids.length >= 2 && rectOf(el).width >= W * 0.6) {
        const t0 = rectOf(kids[0]).top;
        const row = kids.filter((k) => Math.abs(rectOf(k).top - t0) < 24);
        const cover = row.reduce((a, k) => a + rectOf(k).width, 0) / rectOf(el).width;
        if (row.length >= 2 && cover >= 0.5) return row.map((k) => Math.round((rectOf(k).width / rectOf(el).width) * 20) / 20).join('|');
      }
      if (d < 3) for (const k of kids) queue.push([k, d + 1]);
    }
    return '1';
  };
  const headingAt = (band) => {
    const h = [...band.querySelectorAll('h1, h2, h3')].find(shown);
    if (!h) return 'none';
    const b = rectOf(band), r = rectOf(h);
    if (getComputedStyle(h).textAlign === 'center' || Math.abs((r.left + r.right) / 2 - (b.left + b.right) / 2) < b.width * 0.04 && r.width < b.width * 0.8) return 'centre';
    return r.right < b.left + b.width * 0.55 && [...band.querySelectorAll('*')].some((e) => !e.contains(h) && !h.contains(e) && shown(e) && rectOf(e).left > r.right && rectOf(e).top < r.bottom + 40 && rectOf(e).width > b.width * 0.3) ? 'side' : 'top';
  };

  const seenEl = new Map();
  // ---- density: the share of a band covered by words (lines of text, not the space around them)
  const textArea = (band) => {
    let area = 0;
    const box = rectOf(band);
    const tw = document.createTreeWalker(band, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const el = n.parentElement; if (!el || !n.textContent.trim() || el.closest('svg, script, style, [aria-hidden="true"]')) continue;
      if (!seenEl.has(el)) seenEl.set(el, shown(el) && !el.closest('[class*="visually-hidden"], .sr-only')); if (!seenEl.get(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize); if (fs >= 40) continue; // display type is a picture, not density
      const range = document.createRange(); range.selectNodeContents(n);
      for (const r of range.getClientRects()) area += Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left)) * Math.max(0, Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top));
    }
    return area;
  };

  // ---- the scroll moments: things that move with the scroll in a big way
  // One moment each: a pinned scene (.lt-story), a sideways track (.lt-side-scroll), stack-cards, a scroll
  // statement, and every [data-zoom] and [data-parallax] (a product reveal's figure and a media band zoom through
  // data-zoom, so their blocks are not counted again). Not moments: the data-entrance and data-scroll reveals,
  // number counters, before-after sliders, the hero video, the gallery rail (the reader moves those).
  const PINNED = '.lt-story, .lt-side-scroll, .lt-stack-cards';
  const MOMENT = `${PINNED}, .lt-statement, [data-zoom], [data-parallax]`;
  const live = (e) => !e.closest('[inert], [data-audit-ignore]');
  const kindOf = (e) => (e.hasAttribute('data-zoom') ? 'data-zoom' : e.hasAttribute('data-parallax') ? 'data-parallax' : e.matches('.lt-story') ? 'pinned scene (lt-story)' : e.matches('.lt-side-scroll') ? 'side scroll' : e.matches('.lt-stack-cards') ? 'stack-cards' : 'scroll statement');
  const allMoments = [...document.querySelectorAll(MOMENT)].filter(live);
  const momentsIn = (band) => allMoments.filter((e) => band.contains(e) || e === band);
  const looseMoments = allMoments.filter((e) => !bands.some((b) => b.contains(e) || e.contains(b))).length;
  // A pinned scene stops pinning inside anything that clips or scrolls (sticky sticks to that box, not the page).
  const pinBroken = [...document.querySelectorAll('.lt-story, .lt-side-scroll')].filter(live).filter((e) => {
    for (let a = e.parentElement; a && a !== document.body && a !== html; a = a.parentElement) { const cs = getComputedStyle(a); if (/hidden|auto|scroll/.test(`${cs.overflow} ${cs.overflowY}`)) return true; }
    return false;
  }).map(sel);
  const counters = [...document.querySelectorAll('[data-count=""]')].filter(live);
  const videos = [];
  for (const v of document.querySelectorAll('video[autoplay]')) if (live(v) && !v.muted && !v.hasAttribute('muted')) videos.push(`${sel(v)} plays on its own with sound (autoplay without muted)`);
  for (const h of [...document.querySelectorAll('.lt-hero-video')].filter(live)) {
    if (h.querySelector('[autoplay]')) videos.push(`${sel(h)} starts its film on its own (autoplay); the hero video starts only when the reader allows motion, from its script`);
    if (h.querySelector('video source, video[src]') && !h.querySelector('[data-part="toggle"]')) videos.push(`${sel(h)} has a film and no pause button (data-part="toggle")`);
  }
  const motion = {
    moments: allMoments.map((e) => ({ kind: kindOf(e), selector: sel(e) })),
    pinned: [...document.querySelectorAll(PINNED)].filter(live).length,
    entrances: [...document.querySelectorAll('[data-entrance]')].filter(live).length,
    counters: counters.length, countersNoDigit: counters.filter((e) => !/\d/.test(e.textContent ?? '')).map(sel),
    videos, pinBroken,
  };

  const sections = bands.map((band, i) => {
    const r = rectOf(band);
    const w = words(band.innerText);
    const looks = lookAt(band);
    const isHero = band.matches('[class*="hero"]') || (i === 0 && !!band.querySelector('h1'));
    return {
      i, selector: sel(band), hero: isHero, top: Math.round(r.top + scrollY), height: Math.round(r.height),
      words: w, looks, use: looks.length ? null : useOf(band, w),
      block: blockOf(band), tracks: tracksOf(band), heading: headingAt(band), ground: groundOf(band),
      tone: band.getAttribute('data-tone') ?? null,
      density: r.width * r.height ? Math.round((textArea(band) / (r.width * r.height)) * 1000) / 1000 : 0,
      moment: momentsIn(band)[0] ? kindOf(momentsIn(band)[0]) : null, moments: momentsIn(band).length,
    };
  });

  // ---- the type scale: the largest headline against the body text
  const sizeByChars = new Map();
  for (const p of document.querySelectorAll('main p, main li, body > section p, p')) {
    if (!shown(p) || p.closest('nav, footer, header:not([class*="hero"]), [class*="footer"], button, a, svg, table, figure, [inert], [aria-hidden="true"], [data-mock], [data-stage], [data-part="frame"], [data-part="shot"], [class*="device"], [class*="frame"], [class*="chart"]')) continue;
    const t = p.textContent.trim(); if (t.length < 40) continue;
    const fs = Math.round(parseFloat(getComputedStyle(p).fontSize)); sizeByChars.set(fs, (sizeByChars.get(fs) ?? 0) + t.length);
  }
  const bodySize = [...sizeByChars].sort((a, b) => b[1] - a[1])[0]?.[0] ?? Math.round(parseFloat(getComputedStyle(body).fontSize));
  const heads = [...document.querySelectorAll('h1, h2, [class*="hero"] [data-part="title"], [class*="display"]')].filter((h) => shown(h) && !h.closest('svg, [aria-hidden="true"]'));
  const h1 = [...document.querySelectorAll('h1')].find(shown);
  const headline = Math.max(0, ...heads.map((h) => parseFloat(getComputedStyle(h).fontSize)));

  // ---- is it an app? Marked so, or no marketing hero and the furniture of one: a shell, a side nav, a bar at the bottom.
  const fixedBottom = [...document.querySelectorAll('body *')].filter((e) => { const cs = getComputedStyle(e); if (!/fixed|sticky/.test(cs.position) || !shown(e)) return false; const r = rectOf(e); return r.bottom >= vh - 2 && r.top > vh * 0.55 && r.width >= vw * 0.8 && r.height < vh * 0.4 && !e.parentElement.closest('[style*="fixed"]'); });
  fixedBottom.forEach((b, i) => b.setAttribute('data-lt-audit-bar', String(i)));
  const sideNav = [...document.querySelectorAll('aside, nav, [class*="sidebar"]')].some((e) => shown(e) && rectOf(e).height >= vh * 0.6 && rectOf(e).width < vw * 0.35 && e.querySelectorAll('a, button').length >= 4);
  const shell = !!document.querySelector('.lt-shell, [class*="shell"], [class*="app-bar"], [class*="tab-bar"], [class*="tabbar"], [class*="bottom-nav"], [role="application"]');
  const app = appMarked || (!hero && (shell || sideNav || fixedBottom.length > 0));

  // ---- primary controls and their hit areas (judged at phone width)
  const hit = (el) => {
    const r = rectOf(el); let w = r.width, h = r.height;
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.content === 'none' || ps.position !== 'absolute') continue;
      const ins = ['top', 'right', 'bottom', 'left'].map((k) => parseFloat(ps[k]) || 0);
      w = Math.max(w, r.width - ins[1] - ins[3]); h = Math.max(h, r.height - ins[0] - ins[2]);
    }
    return { w: Math.round(w), h: Math.round(h) };
  };
  const filled = (el) => { const c = rgba(getComputedStyle(el).backgroundColor); return c[3] > 0.9 && !(c[0] === c[1] && c[1] === c[2] && (c[0] > 240 || c[0] < 16)); };
  const inBar = (el) => fixedBottom.some((b) => b.contains(el)) || !!el.closest('[class*="app-bar"], [class*="tab-bar"], [class*="tabbar"], [class*="bottom-nav"]');
  const primary = [...document.querySelectorAll(appMarked ? 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="option"], [role="menuitem"], input:not([type="hidden"]), select, textarea, summary' : 'button, a, [role="button"], [role="tab"], input[type="submit"], input[type="button"]')].filter((el) => {
    if (!shown(el) || el.closest('[aria-hidden="true"], svg, p, li > p, td, [role="dialog"]:not([open]), [data-audit-ignore]')) return false;
    // A skip link waits off screen until it is focused.
    const r = rectOf(el); if (r.bottom + scrollY <= 0 || r.right <= 0 || /skip/i.test(el.className) || /^#main/.test(el.getAttribute('href') ?? '') && r.top + scrollY < 4) return false;
    if (el.matches('a') && el.closest('p, figcaption, small')) return false;
    // On a page marked data-app every control is a touch target; elsewhere the primary ones.
    if (appMarked) return !el.matches('a') || !el.closest('p, li > span, small, figcaption');
    return inBar(el) || el.matches('[type="submit"], .lt-btn[data-variant="primary"]') || (filled(el) && rectOf(el).width >= 64);
  }).map((el) => ({ selector: sel(el), label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30), bar: inBar(el), ...hit(el) }));

  // ---- page states the page says it has
  const declared = [...new Set([...(html.getAttribute('data-states') ?? '').split(/[\s,]+/), ...(opts.states ?? [])].filter(Boolean))];
  const present = (s) => !!document.querySelector(`[data-view~="${s}"], [data-state="${s}"], [data-state-view="${s}"]`) || html.dataset.pageState === s;

  // ---- native feel at phone width: sheets, swipes and where the thumb reaches
  // Bottom sheets: a grabber that is a real button (press it, or ArrowUp, for the next detent) is the keyboard and
  // switch path to what a drag does. Dialogs that rise from the bottom count, whether open now or not.
  const sheetEls = [...new Set([...document.querySelectorAll('.lt-sheet, dialog[data-detents], [class*="bottom-sheet"] dialog, dialog[class*="sheet"], [role="dialog"][class*="sheet"]')])].filter((d) => !d.closest('[inert], [data-audit-ignore]') && !d.closest('[data-mock] [data-mock]'));
  const sheets = sheetEls.map((d) => {
    const h = d.querySelector('[data-part="grab"], [data-part="handle"], [class*="grabber"], [class*="handle"]');
    return { selector: sel(d), id: d.id || null, handle: !h ? 'none' : h.matches('button, [role="button"]') ? 'button' : 'static', handleSelector: h ? sel(h) : null };
  });
  // Swipe surfaces: rows that move sideways under a finger. Inside a sideways scroller the two gestures fight; within
  // 20px of the screen edge they fight the system's back gesture unless the part leaves that strip alone (data-edge-guard).
  const SWIPE = '[data-lt="swipe-row"], [data-lt="swipe-actions"], .lt-swiperow, .lt-swipe, [data-swipe]';
  const swipes = [];
  for (const root of [...document.querySelectorAll(SWIPE)].filter((r) => !r.parentElement?.closest(SWIPE) && !r.closest('[inert], [data-audit-ignore]'))) {
    const rows = [...root.querySelectorAll('[data-part="row"]')].filter(shown);
    const box = (rows.length ? rows : [root]).filter(shown).map(rectOf);
    if (!box.length) continue;
    let scroller = null;
    for (let a = root.parentElement; a && a !== body && a !== html; a = a.parentElement) { const cs = getComputedStyle(a); if (/auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 4) { scroller = sel(a); break; } }
    swipes.push({ selector: sel(root), left: Math.round(Math.min(...box.map((r) => r.left))), right: Math.round(Math.max(...box.map((r) => r.right))), guard: root.hasAttribute('data-edge-guard') || !!root.closest('[data-edge-guard]'), scroller });
  }
  // The primary action in the first screen: where is it for the thumb?
  const reach = [...document.querySelectorAll('button, a, input[type="submit"], [role="button"]')].filter((el) => {
    if (!shown(el) || el.closest('dialog, [role="dialog"], [popover], [aria-hidden="true"], [data-audit-ignore], [data-mock] [data-mock]')) return false;
    // An empty state's one action sits with its message in the middle of the screen, as a native empty view's does.
    if (el.closest('.lt-empty, [data-view~="empty"]')) return false;
    // A form's own submit rides with the on-screen keyboard, which is open while it is used: not a reach question.
    if (el.form && el.form.querySelector('textarea, input:not([type="hidden"], [type="checkbox"], [type="radio"], [type="submit"], [type="button"])')) return false;
    const r = rectOf(el); if (r.bottom <= 0 || r.top >= vh) return false;
    return el.matches('[type="submit"], [data-variant="primary"]') || (filled(el) && r.width >= 64 && r.height >= 32 && !el.closest('nav, [role="tablist"], [role="radiogroup"]') && (() => { const c = rgba(getComputedStyle(el).backgroundColor); const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return mx - mn > 40; })());
  }).map((el) => ({ selector: sel(el), label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30), cy: Math.round(rectOf(el).top + rectOf(el).height / 2) }));

  // ---- colour: is the page one hue? Ground, top bar, footer and section grounds against the accent (OKLab hue).
  const oklch = (c) => {
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const [r, g, b] = c.slice(0, 3).map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { L: Math.round(L * 1000) / 1000, C: Math.round(Math.hypot(A, B) * 1000) / 1000, H: Math.round(((Math.atan2(B, A) * 180) / Math.PI + 360) % 360) };
  };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0.5) return oklch(c); } return oklch([255, 255, 255, 1]); };
  const accentRaw = getComputedStyle(html).getPropertyValue('--accent-solid').trim();
  const topBar = [...document.querySelectorAll('body > header, body > nav, header[class*="nav"], nav[class*="nav"], [class*="navbar"]')].find((e) => shown(e) && rectOf(e).top < 80);
  const foot = [...document.querySelectorAll('body > footer, footer[class*="footer"], [class*="site-footer"]')].find((e) => shown(e));
  const colour = {
    canvas: bgOf(body), accent: accentRaw ? oklch(rgba(accentRaw)) : null,
    bar: topBar ? bgOf(topBar) : null, foot: foot ? bgOf(foot) : null,
    grounds: bands.map((b) => (groundOf(b) === 'picture' ? null : bgOf(b))).filter(Boolean),
  };
  // ---- words in the first screen: the hero's visible words, the lede and notes included.
  const firstWords = (() => {
    if (!hero || !shown(hero)) return 0;
    const copy = hero.cloneNode(true);
    copy.querySelectorAll('[data-part="visual"], figure, picture, img, svg, .lt-art, .lt-device, [data-mock], [data-app], [data-audit-ignore], .lt-visually-hidden, [hidden]').forEach((n) => n.remove());
    return words(copy.textContent);
  })();

  // ---- the kit's own default first screen: a line above, a 2–4 line headline on the left,
  // a paragraph, two buttons, a note, one picture on the right. Count the marks of it.
  const skeleton = (() => {
    if (!hero || !shown(hero) || hero.closest('[data-composition-reason]') || hero.hasAttribute('data-composition-reason')) return null;
    const h = hero.querySelector('h1');
    if (!h || !shown(h)) return null;
    const hr = rectOf(hero), r1 = rectOf(h), hs = parseFloat(getComputedStyle(h).fontSize);
    const lh = parseFloat(getComputedStyle(h).lineHeight) || hs * 1.15;
    const after = (a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    const marks = [];
    const above = hero.querySelector('[data-part="eyebrow"], .lt-eyebrow') || [...hero.querySelectorAll('p')].find((p) => shown(p) && after(p, h) && words(p.textContent) <= 8 && parseFloat(getComputedStyle(p).fontSize) < hs * 0.4);
    if (above && shown(above)) marks.push('line above');
    const lines = Math.round(r1.height / lh);
    if (r1.left + r1.width / 2 < hr.left + hr.width / 2 && lines >= 2 && lines <= 4) marks.push('headline on the left');
    if ([...hero.querySelectorAll('p')].some((p) => shown(p) && after(h, p) && words(p.textContent) >= 12)) marks.push('paragraph');
    const btns = [...hero.querySelectorAll('.lt-btn, [role="button"], a[class*="btn"], button')].filter(shown);
    const row = btns.length >= 2 && btns.some((a, i) => btns.some((b, j) => i !== j && Math.abs(rectOf(a).top - rectOf(b).top) < 8));
    if (row) marks.push('two buttons');
    const note = hero.querySelector('[data-part="note"], .bp-hero-note');
    if (note && shown(note)) marks.push('note under the buttons');
    else if (btns.length) {
      const last = btns[btns.length - 1], group = last.parentElement?.matches('[data-part="actions"], [class*="actions"]') ? last.parentElement : last;
      const nx = group.nextElementSibling;
      if (nx && shown(nx) && words(nx.textContent) && words(nx.textContent) <= 14 && parseFloat(getComputedStyle(nx).fontSize) <= (parseFloat(getComputedStyle(body).fontSize) || 16)) marks.push('note under the buttons');
    }
    const copyCol = h.parentElement ? rectOf(h.parentElement) : r1;
    const pic = [...hero.querySelectorAll('img, figure, .lt-art, .lt-device, [data-part="frame"], [data-part="visual"]')].find((e) => {
      if (!shown(e)) return false; const r = rectOf(e);
      return r.left > vw * 0.45 && r.width >= hr.width * 0.35 && r.width <= hr.width * 0.6 && r.height >= copyCol.height * 0.6 && r.height <= copyCol.height * 1.4;
    });
    if (pic) marks.push('one picture on the right');
    const kitDefault = !!hero.closest('.lt-hero-split:not([data-variant])') && !!hero.querySelector('[data-part="note"]') && hero.querySelectorAll('.lt-btn').length >= 2;
    return { marks, kitDefault };
  })();

  // ---- pictures that collapsed: a device frame, an art panel or a photo drawn a few pixels wide (a width: auto in a centred grid).
  const collapsed = [...document.querySelectorAll('.lt-device, .lt-art, main img, [data-part="visual"] > figure')].filter((e) => {
    const r = rectOf(e); if (!(r.width || r.height)) return false;
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (e.closest('[hidden], [inert]:not([data-app]), dialog:not([open]), .lt-avatar, [data-part="thumb"], [data-part="icon"]')) return false;
    return (r.width < 64 && r.height > r.width * 1.2) || (r.width >= 64 && r.height > 0 && r.height < 24 && e.matches('.lt-device, .lt-art'));
  }).map((e) => `${sel(e)} (${Math.round(rectOf(e).width)}×${Math.round(rectOf(e).height)})`).slice(0, 3);

  // ---- app chrome: tab bars (how many, labelled?) and Save buttons on screens of switches only.
  const tabBars = [...document.querySelectorAll('.lt-bottom-nav, nav[class*="tabs"], [role="tablist"][data-placement="bottom"]')].filter((b) => shown(b) && rectOf(b).bottom > vh * 0.75 && !b.closest('[data-app], .lt-device')).map((b) => {
    const items = [...b.querySelectorAll(':scope > a, :scope > button, :scope > li > a, :scope > li > button')].filter(shown);
    return { selector: sel(b), items: items.length, unlabeled: items.filter((a) => !words(a.textContent) && !/\S/.test(a.textContent)).length };
  });
  const saveOnSwitches = [...document.querySelectorAll('form, section, [data-screen]')].filter((f) => {
    if (!shown(f) || f.closest('[data-app], .lt-device')) return false;
    const btn = [...f.querySelectorAll('button, .lt-btn')].find((b) => shown(b) && /^\s*(save|apply)\b/i.test(b.textContent));
    if (!btn) return false;
    const ctrls = [...f.querySelectorAll('input:not([type=hidden]), select, textarea')].filter((c) => shown(c) || shown(c.parentElement));
    return ctrls.length >= 2 && ctrls.every((c) => c.getAttribute('role') === 'switch' || c.closest('.lt-switch, [data-lt="toggle-switch"]'));
  }).map(sel).slice(0, 2);

  return {
    url: location.href, width: vw, height: vh, pageHeight: html.scrollHeight, colour, firstWords, skeleton, collapsed, tabBars, saveOnSwitches,
    hero: !!hero, app, appMarked, sections, looseMoments, motion,
    type: { headline: Math.round(headline), h1: h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : 0, body: bodySize, ratio: bodySize ? Math.round((headline / bodySize) * 100) / 100 : 0 },
    bars: fixedBottom.map((b) => ({ selector: sel(b), height: Math.round(rectOf(b).height) })),
    controls: primary,
    states: { declared, missing: declared.filter((s) => !present(s)) },
    sheets, swipes, reach,
  };
};

/** Thresholds, picked by running the rules on every blueprint (all at 100) and the default-look fixtures. */
export const LIMITS = {
  noVisualWords: 6,      // fewer words than this is a breather, not a section of words
  denseCover: 0.12,      // share of a band's area covered by lines of text above which it reads as dense
  denseRun: 3,           // this many dense bands in a row is a page with no air
  monotoneBands: 5,      // with at least this many bands, density that never changes is monotone…
  monotoneSpread: 0.035, // …when the densest and the airiest differ by less than this
  typeJump: 2.5,         // largest headline ÷ body text on a marketing page
  moments: 2,            // big scroll moments per page (a warning above, an error above one more)
  counters: 6,           // numbers that count up on one page
  target: 44,            // primary touch targets at phone width, in CSS px
  edge: 20,              // the strip at each side of a phone screen that belongs to the system's back gesture
  reach: 0.5,            // the primary action sits below this share of a phone screen's height, where the thumb is
  heroWords: 40,         // words in a marketing hero (headline, lede, actions, notes): above this it is a paragraph, not a first screen
  pageWords: 140,        // words per screen of page, on average, on a marketing page
  hueSpan: 35,           // degrees: grounds and accent within this of each other read as one colour
  skeletonMarks: 5,      // of six marks of the default first screen (line above, left headline, paragraph, two buttons, note, picture right)
};

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/**
 * Judge one MEASURE result. `wide` is true at desktop widths. Returns audit findings
 * ({ rule, severity, selector, message }).
 */
export function judgeMeasures(m, { wide = m.width >= 900, limits = LIMITS } = {}) {
  const out = [];
  const add = (rule, selector, message, severity = 'warning') => out.push({ rule, severity, selector, message });
  const bands = m.sections.filter((s) => !s.hero);
  const marketing = m.hero && !m.app;

  // 1. Every section has something to look at.
  if (marketing && wide) {
    const bare = bands.filter((s) => !s.looks.length && !s.use && s.words >= limits.noVisualWords);
    if (bare.length) add('taste-no-visual', bare[0].selector, `${plural(bare.length, 'section is', 'sections are')} only words (${bare.map((s) => `${s.words} words`).join(', ')}): nothing to look at. Give each a picture: the product or the real screen, a document, a chart, one figure set large (40px or more), or an art panel; words are its captions.`);
  }

  // 2. Two sections in a row with the same layout on the same ground.
  if (wide) {
    for (let i = 1; i < m.sections.length; i++) {
      const a = m.sections[i - 1], b = m.sections[i];
      if (a.hero || b.hero || a.ground !== b.ground || a.ground === 'picture') continue;
      const sameBlock = a.block === b.block && !/^(section|div|article)$/.test(a.block);
      const sameTracks = a.tracks === b.tracks && a.tracks.includes('|') && a.heading === b.heading;
      if ((sameBlock && a.tracks === b.tracks) || sameTracks) {
        add('taste-same-layout', b.selector, `Two sections in a row have the same layout (${sameBlock ? `both ${a.block}` : `columns ${a.tracks.replaceAll('|', ' : ')}, heading ${a.heading}`}) on the same ground. Change one: a different shape, a picture that bleeds, or a change of ground (data-tone="well" or "dark").`);
        break;
      }
    }
  }

  // 3. Density rhythm: dense, dense, dense; or the same density from top to bottom.
  if (marketing && wide && bands.length >= limits.denseRun) {
    let run = 0, flagged = false;
    for (const s of bands) {
      run = s.density > limits.denseCover && !s.use ? run + 1 : 0;
      if (run >= limits.denseRun) { add('taste-density', s.selector, `${plural(run, 'dense section')} in a row (text covers ${bands.slice(bands.indexOf(s) - run + 1, bands.indexOf(s) + 1).map((x) => `${Math.round(x.density * 100)}%`).join(', ')} of each). Give the page air: one figure set large, one picture full width, or fewer words between them.`); flagged = true; break; }
    }
    const ds = bands.filter((s) => !s.use).map((s) => s.density);
    if (!flagged && ds.length >= limits.monotoneBands && Math.max(...ds) - Math.min(...ds) < limits.monotoneSpread) add('taste-density', null, `Every section has about the same density (${ds.map((d) => `${Math.round(d * 100)}%`).join(', ')} of each covered by text). A page breathes when dense and open sections alternate: let one be a single picture or one large line.`);
  }

  // 4. The type scale jumps enough.
  if (marketing && wide && m.type.body && m.type.ratio < limits.typeJump) add('taste-type-jump', null, `The largest headline is ${m.type.headline}px over ${m.type.body}px body text, a ratio of ${m.type.ratio}. Below ${limits.typeJump} the page has no clear top; set the headline larger (--step-5 or more) and keep the body where it is.`);

  // 5. The motion budget: two big scroll moments at most, never back to back, one pinned scene, one entrance.
  const mo = m.motion ?? { moments: m.sections.filter((x) => x.moment).map((x) => ({ kind: x.moment, selector: x.selector })), pinned: 0, entrances: 0, counters: 0, countersNoDigit: [], videos: [], pinBroken: [] };
  const total = mo.moments.length;
  if (total > limits.moments) add('taste-motion-budget', mo.moments[limits.moments]?.selector ?? null, `${total} big scroll moments (${mo.moments.map((x) => x.kind).join(', ')}). Keep two at most, where they carry the subject; the rest stay still (the quiet data-scroll reveal does not count).`, total > limits.moments + 1 ? 'error' : 'warning');
  else for (let i = 1; i < m.sections.length; i++) if (m.sections[i].moment && m.sections[i - 1].moment) { add('taste-motion-budget', m.sections[i].selector, `Two scroll moments back to back (${m.sections[i - 1].moment}, then ${m.sections[i].moment}). Put a still section between them.`); break; }
  if (mo.pinned > 1) add('taste-motion-budget', null, `${mo.pinned} pinned scenes (sticky-story, side-scroll, stack-cards). One per page: two pinned scenes make the reader scroll without moving forward twice.`);
  if (mo.entrances > 1) add('taste-motion-entrance', null, `${mo.entrances} elements with data-entrance. The entrance is for the hero only; sections arrive with the quiet data-scroll reveal on <main>.`);
  if (mo.counters > limits.counters) add('taste-motion-counter', null, `${mo.counters} numbers count up (data-count). Keep it to the few figures that are the point (${limits.counters} at most); the rest are set still.`);
  if (mo.countersNoDigit.length) add('taste-motion-counter', mo.countersNoDigit[0], `A data-count element has no number in it (${mo.countersNoDigit.length}): it has nothing to count. Put the figure in the element, or remove data-count.`, 'error');
  for (const v of mo.videos) add('taste-motion-video', null, `${v}. Film never plays sound on its own, and a moving hero always has a visible pause.`, 'error');
  if (mo.pinBroken.length) add('taste-motion-pin', mo.pinBroken[0], `A pinned scene sits inside a box with overflow hidden, auto or scroll, so it will not pin (${mo.pinBroken.join(', ')}). Use overflow: clip on that ancestor, or move the scene out of it.`, 'error');

  // 5b. Fewer words: a first screen is a headline, one line and one action; a page is pictures with captions.
  if (marketing && wide && m.firstWords > limits.heroWords) add('taste-word-budget', null, `The first screen holds ${m.firstWords} words. Keep the hero under ${limits.heroWords}: the headline, one sentence, one action. Move the rest down the page or into the picture.`);
  const screens = Math.max(1, m.pageHeight / m.height);
  const pageWords = m.sections.reduce((n, x) => n + (x.use ? 0 : x.words), 0);
  if (marketing && wide && pageWords / screens > limits.pageWords) add('taste-word-budget', null, `About ${Math.round(pageWords / screens)} words per screen (${pageWords} over ${Math.round(screens * 10) / 10} screens, forms and questions not counted). Pictures carry a page further than paragraphs: aim under ${limits.pageWords}, words as captions.`);

  // 4b. App chrome: four tabs at most, each with its label; switches apply at once.
  for (const t of m.tabBars ?? []) {
    if (t.items > 4) add('app-tabs', t.selector, `The tab bar has ${t.items} tabs. Keep four at most: the rest go in a More screen or into the screens they belong to.`);
    else if (t.unlabeled) add('app-tabs', t.selector, `${t.unlabeled} tab${t.unlabeled === 1 ? ' has' : 's have'} an icon and no visible label. Put the word under every icon.`);
  }
  if (m.saveOnSwitches?.length) add('app-settings-save', m.saveOnSwitches[0], 'A Save or Apply button on a screen of switches only. A switch applies the moment it is flipped; drop the button (say so with a short confirmation if the change matters).');

  // 5a. A picture that collapsed to a sliver: the page shows a stray shape where its product should be.
  if (m.collapsed?.length) add('taste-collapsed-visual', m.collapsed[0].split(' (')[0], `A picture is drawn a few pixels wide (${m.collapsed.join(', ')}): a device frame, art panel or photo with width: auto inside a centred grid or flex box shrinks to nothing. Give it a width (width: min(100%, var(--device-w)) for a phone frame).`, 'error');

  // 5b'. The kit's own default first screen, used by habit.
  if (marketing && m.width >= 1200 && m.skeleton && (m.skeleton.kitDefault || m.skeleton.marks.length >= limits.skeletonMarks)) add('taste-kit-skeleton', null, `The first screen is the default skeleton every generated page uses (${m.skeleton.kitDefault ? 'hero-split with a note and two buttons' : m.skeleton.marks.join(', ')}). Choose a composition from the subject: hero-split data-variant product, overlap, edge or bleed; hero-board; hero-cover; hero-mosaic; hero-statement tucked or poster; hero-centered wide (composition.md §5). If this really is the right shape, say why in data-composition-reason on the hero.`);

  // 5c. One colour everywhere: the ground, the top bar and the section grounds all in the accent's hue family.
  if (marketing && m.colour?.accent && m.colour.accent.C >= 0.05) {
    const near = (x) => Math.abs(((x.H - m.colour.accent.H + 540) % 360) - 180) < limits.hueSpan;
    const tinted = [m.colour.canvas, m.colour.bar, m.colour.foot, ...m.colour.grounds].filter((x) => x && x.C >= 0.012);
    const groundTinted = m.colour.canvas.C >= 0.005 && near(m.colour.canvas);
    const barFlat = !m.colour.bar || Math.abs(m.colour.bar.L - m.colour.canvas.L) < 0.2;
    const others = [m.colour.canvas, m.colour.bar, m.colour.foot, ...m.colour.grounds].filter((x) => x && x.C >= 0.02 && !near(x));
    if (groundTinted && barFlat && !others.length && tinted.every(near)) add('taste-monotone', null, `The ground (hue ${m.colour.canvas.H}), the top bar and every coloured band sit in the accent's own hue (${m.colour.accent.H}): a one-colour page. Put the page on neutral or warm paper, give the top bar contrast (an ink or paper bar), and use the palette's second colour (--highlight) for one figure.`);
  }

  // 6. Apps, at phone width: touch targets, the home-indicator gap, declared states.
  if (!wide && (m.app || m.bars.length)) {
    const small = m.controls.filter((c) => c.w < limits.target - 0.5 || c.h < limits.target - 0.5);
    if (small.length) add('app-touch-target', small[0].selector, `${plural(small.length, 'primary control is', 'primary controls are')} smaller than ${limits.target}×${limits.target}px at phone width: ${small.slice(0, 4).map((c) => `“${c.label || c.selector}” ${c.w}×${c.h}`).join(', ')}${small.length > 4 ? ` and ${small.length - 4} more` : ''}. Give each a ${limits.target}px hit area (min-height, padding, or an inset ::before).`);
  }
  // 7. Native feel at phone width: sheets with a grabber that is a button, swipes that do not fight other gestures,
  //    and the primary action where the thumb is.
  if (!wide && m.app) {
    for (const sh of (m.sheets ?? []).filter((x) => x.handle !== 'button').slice(0, 1)) add('app-sheet-handle', sh.selector, sh.handle === 'none' ? 'A bottom sheet has no grabber. Give it one, as a <button data-part="grab"> with a label ("Make the sheet bigger"): pressing it (or ArrowUp) does what dragging does, for keyboards, switches and voice.' : `The sheet's grabber (${sh.handleSelector}) is not a button, so only a finger can use it. Make it a <button> with a label; pressing it (or ArrowUp) moves to the next detent.`);
    const nested = (m.swipes ?? []).find((x) => x.scroller);
    if (nested) add('app-gesture-conflict', nested.selector, `Swipe rows sit inside a sideways scroller (${nested.scroller}): a horizontal drag can mean either, so one of them will misfire. Let the scroller snap one card at a time and move the actions to a button, or take the rows out of the scroller.`);
    const edgy = (m.swipes ?? []).find((x) => !x.guard && (x.left < limits.edge || x.right > m.width - limits.edge));
    if (edgy) add('app-gesture-edge', edgy.selector, `Swipe rows reach the screen edge (${edgy.left}px to ${edgy.right}px of ${m.width}px), where a swipe from the edge is the system's back gesture. Ignore drags that start in the outer ${limits.edge}px and mark the part data-edge-guard, or inset the rows.`);
    const primaries = m.reach ?? [];
    if (primaries.length && primaries.every((p) => p.cy < m.height * limits.reach)) add('app-reach', primaries[0].selector, `The main action (“${primaries[0].label}”) is in the top half of the phone screen (${primaries[0].cy}px of ${m.height}px), out of reach of a thumb. Put it in a bar above the home indicator, or at the end of the form, low on the screen.`);
  }
  if (m.states?.missing?.length) add('app-states', null, `The page declares ${m.states.declared.join(', ')} states but has no view for ${m.states.missing.join(', ')}. Add a block marked data-view="${m.states.missing[0]}" (a skeleton for loading, an empty-state with one action, an error with a way out).`);
  return out;
}

// ------------------------------------------------------------------ speed

/** In-page, before any script of the page: watch the largest paint and the layout shifts. */
export const PERF_INIT = () => {
  const p = (window.__ltPerf = { lcp: null, cls: 0, shifts: 0, sources: [] });
  try {
    new PerformanceObserver((list) => { for (const e of list.getEntries()) p.lcp = e; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) { p.cls += e.value; p.shifts++; for (const s of e.sources ?? []) if (s.node && s.node.nodeType === 1) p.sources.push([s.node, e.value]); } }).observe({ type: 'layout-shift', buffered: true });
  } catch { /* an engine without these entry types: nothing to report */ }
};

/** In-page, after load: the LCP element, the shift total, and the images' own sizes. */
export const PERF_COLLECT = () => {
  const p = window.__ltPerf ?? { lcp: null, cls: 0, shifts: 0 };
  const sel = (el) => { const s = []; for (let e = el; e && e.nodeType === 1 && s.length < 3; e = e.parentElement) { let t = e.tagName.toLowerCase(); if (e.id) { s.unshift(t + '#' + e.id); break; } const c = [...e.classList].slice(0, 2); if (c.length) t += '.' + c.join('.'); s.unshift(t); } return s.join(' > '); };
  let lcp = null;
  if (p.lcp) {
    const el = p.lcp.element;
    const img = el && (el.tagName === 'IMG' ? el : el.tagName === 'PICTURE' ? el.querySelector('img') : null);
    lcp = { time: Math.round(p.lcp.renderTime || p.lcp.loadTime || p.lcp.startTime), size: p.lcp.size, url: p.lcp.url || null, tag: el?.tagName.toLowerCase() ?? null, selector: el ? sel(el) : null, image: !!img || !!p.lcp.url, loading: img?.getAttribute('loading') ?? null, fetchpriority: img?.getAttribute('fetchpriority') ?? null };
  }
  const images = [];
  for (const im of document.images) {
    const r = im.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const src = im.currentSrc || im.src || '';
    const vector = /\.svg(\?|#|$)|^data:image\/svg/i.test(src);
    const cs = getComputedStyle(im);
    images.push({ selector: sel(im), src: src.slice(0, 120), vector, w: Math.round(r.width), h: Math.round(r.height), nw: im.naturalWidth, nh: im.naturalHeight, sized: im.hasAttribute('width') && im.hasAttribute('height'), ratio: cs.aspectRatio !== 'auto' && !/^auto\b/.test(cs.aspectRatio) ? cs.aspectRatio : null, dpr: devicePixelRatio || 1 });
  }
  // What moved: the elements behind the biggest shifts.
  const moved = [...new Set((p.sources ?? []).sort((a, b) => b[1] - a[1]).map(([n]) => sel(n)))].slice(0, 3);
  return { lcp, cls: Math.round(p.cls * 1000) / 1000, shifts: p.shifts, moved, images };
}

export const PERF_LIMITS = { cls: 0.1, fontBytes: 300 * 1024, fonts: 6, jsBytes: 400 * 1024, cssBytes: 200 * 1024, oversize: 2 };

const kb = (b) => `${Math.round(b / 1024)} KB`;

/**
 * Judge one perf run: `p` is PERF_COLLECT's result plus `bytes` ({ js, css, font, image, fonts }).
 * `soft` turns the one error (a lazy LCP image) into a warning, for --strict runs without --perf.
 */
export function judgePerf(p, { soft = false, limits = PERF_LIMITS } = {}) {
  const out = [];
  const add = (rule, selector, message, severity = 'warning') => out.push({ rule, severity: soft ? 'warning' : severity, selector, message });
  if (p.lcp?.image && p.lcp.loading === 'lazy') add('perf-lcp-lazy', p.lcp.selector, 'The largest picture in the first screen is loading="lazy", so it waits for layout before it even starts. Remove loading="lazy" from it and add fetchpriority="high".', 'error');
  else if (p.lcp?.image && p.lcp.tag === 'img' && p.lcp.fetchpriority !== 'high') add('perf-lcp-priority', p.lcp.selector, `The largest paint is a picture (${(p.lcp.url ?? '').split('/').pop()?.slice(0, 40) || p.lcp.selector}) without fetchpriority="high". Add it so the browser fetches it first.`);
  if (p.cls > limits.cls) add('perf-cls', p.moved?.[0] ?? null, `Layout shifts by ${p.cls} while the page loads (${plural(p.shifts, 'shift')}${p.moved?.length ? `; what moved: ${p.moved.join(', ')}` : ''}). Above ${limits.cls} people lose their place: give images width and height, reserve space for late content, and load fonts with size-adjusted fallbacks.`);
  const b = p.bytes ?? {};
  if (b.font > limits.fontBytes) add('perf-font-bytes', null, `${kb(b.font)} of fonts in ${plural(b.fonts, 'file')}. Keep it under ${kb(limits.fontBytes)}: fewer weights, a variable font, or subset to the characters used.`);
  else if (b.fonts > limits.fonts) add('perf-font-bytes', null, `${b.fonts} font files. A pairing needs four at most (two families, two weights each); drop the rest.`);
  if (b.js > limits.jsBytes) add('perf-js-bytes', null, `${kb(b.js)} of JavaScript transferred. Above ${kb(limits.jsBytes)} phones stall before the page responds: load only the enhancers the page uses.`);
  if (b.css > limits.cssBytes) add('perf-css-bytes', null, `${kb(b.css)} of CSS transferred. Above ${kb(limits.cssBytes)} the first paint waits on it: ship only the parts and the palette the page uses.`);
  const unsized = p.images.filter((i) => !i.sized && !i.ratio);
  if (unsized.length) add('perf-img-dimensions', unsized[0].selector, `${plural(unsized.length, 'image has', 'images have')} no width and height (or CSS aspect-ratio), so the page jumps as ${unsized.length === 1 ? 'it loads' : 'they load'}. Set both attributes to the picture's own size.`);
  const big = p.images.filter((i) => !i.vector && i.nw && i.nh && i.nw > i.w * i.dpr * limits.oversize && i.nh > i.h * i.dpr * limits.oversize && i.nw * i.nh > 400 * 300);
  if (big.length) add('perf-img-oversized', big[0].selector, `${plural(big.length, 'image is', 'images are')} far larger than ${big.length === 1 ? 'its' : 'their'} box: ${big.slice(0, 3).map((i) => `${i.nw}×${i.nh} shown at ${i.w}×${i.h}`).join(', ')}. Serve a size near the box (srcset with widths, sizes) instead.`);
  return out;
}

// ------------------------------------------------------------------ accessibility beyond the basics
// Each probe runs in the page (serialised: nothing from outside its body); each judge runs in Node, so the
// thresholds are testable without a browser. audit-ui.mjs loads the page once more per check (--taste).

/** In-page: mark and measure the parts whose position must mirror in right-to-left: headings (their text),
 *  links and buttons, side panels and bars. Call once with dir="ltr", once with dir="rtl", same marks. */
export const RTL_PROBE = () => {
  const W = document.documentElement.clientWidth;
  const shown = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; for (let a = e; a && a.nodeType === 1; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; } return true; };
  const sel = (el) => { const p = []; for (let e = el; e && e.nodeType === 1 && p.length < 3; e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } const c = [...e.classList].slice(0, 2); if (c.length) s += '.' + c.join('.'); p.unshift(s); } return p.join(' > '); };
  // Things that do not mirror on purpose (code, numbers set ltr, pictures, charts) or move with a scroller.
  const skip = (e) => e.closest('svg, pre, code, kbd, [dir], [inert], [aria-hidden="true"], dialog, [popover], .lt-visually-hidden, [class*="chart"], [data-audit-ignore], [data-mock]')
    || (() => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (/auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 4) return true; if (cs.position === 'fixed' && a !== e) return false; } return false; })();
  if (!document.querySelector('[data-lt-rtl]')) {
    let n = 0;
    for (const e of document.querySelectorAll('h1, h2, h3, nav a, button, aside, header, [role="toolbar"], label')) { if (n >= 500) break; if (!shown(e) || skip(e)) continue; const r = e.getBoundingClientRect(); if (r.top > innerHeight * 3) continue; e.setAttribute('data-lt-rtl', String(n++)); }
  }
  const out = [];
  for (const e of document.querySelectorAll('[data-lt-rtl]')) {
    let r = e.getBoundingClientRect();
    // A heading's box spans its column; its text is what sits on one side or the other.
    if (/^H[1-3]$/.test(e.tagName)) { const range = document.createRange(); range.selectNodeContents(e); const rr = range.getBoundingClientRect(); if (rr.width > 2) r = rr; }
    out.push({ i: +e.getAttribute('data-lt-rtl'), selector: sel(e), left: Math.round(r.left), right: Math.round(r.right), shown: shown(e) });
  }
  return { width: W, scrollWidth: document.documentElement.scrollWidth, boxes: out };
};

/** Judge one page in both directions: anything that did not mirror, and a page that scrolls sideways only in rtl. */
export function judgeRtl(ltr, rtl, { tolerance = 24, limit = 3 } = {}) {
  const out = [];
  const W = ltr.width;
  if (rtl.scrollWidth > W + 1 && ltr.scrollWidth <= W + 1) out.push({ rule: 'a11y-rtl-overflow', severity: 'warning', selector: null, message: `In right-to-left (dir="rtl") the page scrolls sideways: ${rtl.scrollWidth}px wide in ${W}px. Something is placed with left or right (a margin, an inset, a translate): use the logical properties (margin-inline-start, inset-inline-end) so it follows the direction.` });
  const byI = new Map(rtl.boxes.map((b) => [b.i, b]));
  const off = [];
  for (const a of ltr.boxes) {
    const b = byI.get(a.i);
    if (!b || !a.shown || !b.shown) continue;
    if (Math.abs(a.left - (W - a.right)) < 8) continue; // centred: the same either way
    const want = W - a.right;
    if (Math.abs(b.left - want) > tolerance) off.push({ ...a, got: b.left, want });
  }
  if (off.length) out.push({ rule: 'a11y-rtl-mirror', severity: 'warning', selector: off[0].selector, message: `${off.length} part${off.length > 1 ? 's do' : ' does'} not mirror in right-to-left: ${off.slice(0, limit).map((o) => `${o.selector} sits at x=${o.got}, the mirror of its place is x=${o.want}`).join('; ')}. Use logical properties (margin-inline, padding-inline, inset-inline, text-align: start, border-inline) instead of left and right.` });
  return out;
}

/** In-page: append a very long German compound to the page's running text (headings, paragraphs, list items, cells,
 *  captions). Text set on one line on purpose (white-space: nowrap) is left alone. */
export const LONG_WORDS = (word) => {
  let n = 0;
  for (const e of document.querySelectorAll('h1, h2, h3, h4, p, li, dd, td, figcaption, blockquote')) {
    if (e.closest('svg, pre, code, [inert], [aria-hidden="true"], [data-audit-ignore], nav, button, a, label, [role="tab"], [role="option"]')) continue;
    // A figure set large is a number, not running text: it keeps itself whole (tokens/base.css).
    if (e.matches('[data-part="figure"], [data-num], .lt-num')) continue;
    // Text kept on one line on purpose (a reference, a time, a type name) is not running text: it keeps its own rules.
    if (/nowrap|pre/.test(getComputedStyle(e).whiteSpace)) continue;
    const t = [...e.childNodes].find((c) => c.nodeType === 3 && c.textContent.trim().length >= 3);
    if (!t) continue;
    t.textContent = `${t.textContent.trimEnd()} ${word} `;
    if (++n >= 400) break;
  }
  return n;
};

/** In-page: chart marks and control parts drawn only with a background: the things forced colours paint over.
 *  Called once before forced colours (marks the visible ones) and once after (which of them are gone). */
export const FORCED_MARKS = (phase) => {
  const sel = (el) => { const p = []; for (let e = el; e && e.nodeType === 1 && p.length < 3; e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } const c = [...e.classList].slice(0, 2); if (c.length) s += '.' + c.join('.'); const part = e.getAttribute('data-part'); if (part) s += `[data-part="${part}"]`; p.unshift(s); } return p.join(' > '); };
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const same = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 24;
  const under = (e) => { for (let a = e.parentElement; a; a = a.parentElement) { const c = rgba(getComputedStyle(a).backgroundColor); if (c[3] > 0.5) return c; } return [255, 255, 255, 1]; };
  const edge = (cs, ground) => ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && !same(rgba(cs[`border${s}Color`]), ground) && rgba(cs[`border${s}Color`])[3] > 0.3)
    || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
  const painted = (e) => { const cs = getComputedStyle(e); const c = rgba(cs.backgroundColor); const g = under(e); return (c[3] > 0.3 && !same(c, g)) || edge(cs, g) || /url\(|gradient/.test(cs.backgroundImage); };
  // What carries state or data: a control's moving parts (the selected segment, a switch's track and thumb, a
  // slider's fill) and the marks of a chart or meter. Window chrome drawn in a picture (a terminal's dots) is not.
  const CONTEXT = '[role="switch"], [role="checkbox"], [role="radio"], [role="slider"], [role="radiogroup"], [role="progressbar"], [role="meter"], meter, progress, .lt-switch, .lt-segmented, [class*="chart"], [class*="meter"], [class*="spark"], [class*="progress"], [class*="gauge"], [class*="uptime"], [data-part="track"], [data-part="thumb"], [data-part="indicator"], [data-part="fill"]';
  if (phase === 'mark') {
    let n = 0;
    for (const e of document.querySelectorAll('div, span, i, b, em, s, li, td')) {
      if (n >= 600) break;
      if ((e.textContent ?? '').trim() || e.querySelector('img, svg, canvas, video, input') || !e.closest(CONTEXT) || e.closest('[inert], [data-audit-ignore], [aria-busy="true"], .lt-skeleton, dialog:not([open]), [hidden], .lt-terminal, .lt-device, [data-mock], [data-part="status"]')) continue;
      const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3 || r.width * r.height > 120000) continue;
      let vis = true; for (let a = e; a && a.nodeType === 1; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) { vis = false; break; } }
      if (!vis || !painted(e)) continue;
      e.setAttribute('data-lt-fc', String(n++));
    }
    return n;
  }
  const gone = [...document.querySelectorAll('[data-lt-fc]')].filter((e) => !painted(e)).map(sel);
  // Text fields keep a visible box: in forced colours a field drawn only by its fill is a line of text in nowhere.
  const fields = [...document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea')].filter((e) => { const r = e.getBoundingClientRect(); if (r.width < 24 || r.height < 16 || e.closest('[inert], [hidden], dialog:not([open])') || +getComputedStyle(e).opacity === 0) return false; let box = false; for (let a = e, d = 0; a && d < 3; a = a.parentElement, d++) { const cs = getComputedStyle(a); if (edge(cs, under(a))) { box = true; break; } } return !box; }).map(sel);
  return { gone, fields };
};

/** In-page, after the root text size is doubled: controls whose label no longer fits inside them (they did not grow). */
export const CONTROL_FIT = () => {
  const sel = (el) => { const p = []; for (let e = el; e && e.nodeType === 1 && p.length < 3; e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } const c = [...e.classList].slice(0, 2); if (c.length) s += '.' + c.join('.'); p.unshift(s); } return p.join(' > '); };
  const out = [];
  for (const el of document.querySelectorAll('button, a[role="button"], .lt-btn, [role="tab"], [role="option"], [role="menuitem"], input[type="submit"], select')) {
    if (el.closest('[inert], [hidden], dialog:not([open]), [aria-hidden="true"], [data-audit-ignore]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const box = el.getBoundingClientRect(); if (box.width < 8 || box.height < 8) continue;
    // The text people see: visually hidden labels (clipped to 1px) are for screen readers and take no room.
    const t = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.textContent.trim()) continue;
      let hidden = false;
      for (let a = n.parentElement; a && a !== el.parentElement; a = a.parentElement) { const r = a.getBoundingClientRect(); const c = getComputedStyle(a); if ((r.width <= 2 || r.height <= 2) && c.overflow !== 'visible' || c.display === 'none' || c.visibility === 'hidden') { hidden = true; break; } }
      if (hidden) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      t.push(...[...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1));
    }
    if (!t.length) continue;
    const top = Math.min(...t.map((r) => r.top)), bottom = Math.max(...t.map((r) => r.bottom));
    // Text that spills above or below its control, where nothing clips it: the control kept a fixed height.
    if (cs.overflow === 'visible' && (top < box.top - 2 || bottom > box.bottom + 2)) out.push(`${sel(el)} “${(el.textContent ?? '').trim().slice(0, 24)}” (${Math.round(bottom - top)}px of text in a ${Math.round(box.height)}px control)`);
  }
  return out;
};

/** In-page, after the root text size is doubled: lines of text that sit on other lines. Each line is taken at its
 *  line height (not its glyphs), so tight display type is not an overlap. Fixed and sticky bars float over the
 *  content by design and are left out. */
export const TEXT_OVERLAP = () => {
  const sel = (el) => { const p = []; for (let e = el; e && e.nodeType === 1 && p.length < 3; e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } const c = [...e.classList].slice(0, 2); if (c.length) s += '.' + c.join('.'); p.unshift(s); } return p.join(' > '); };
  const lines = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n && lines.length < 3000; n = tw.nextNode()) {
    const el = n.parentElement; if (!el || !n.textContent.trim() || el.closest('svg, [aria-hidden="true"], [inert], [hidden], dialog:not([open]), [data-audit-ignore], .lt-visually-hidden')) continue;
    let ok = true, fixed = false;
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { ok = false; break; } if (c.position === 'fixed' || c.position === 'sticky') fixed = true; const r = a.getBoundingClientRect(); if ((r.width <= 2 || r.height <= 2) && c.overflow !== 'visible') { ok = false; break; } }
    if (!ok || fixed) continue;
    const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize); const lh = parseFloat(cs.lineHeight) || fs * 1.2;
    // What a scroller or a clipping box hides is not on top of anything: clip each line by them.
    let clip = { l: -1e9, r: 1e9, t: -1e9, b: 1e9 };
    for (let a = el; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.overflowX !== 'visible' || c.overflowY !== 'visible') { const b = a.getBoundingClientRect(); clip = { l: Math.max(clip.l, b.left), r: Math.min(clip.r, b.right), t: Math.max(clip.t, b.top), b: Math.min(clip.b, b.bottom) }; } }
    const range = document.createRange(); range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.top > innerHeight * 2) continue;
      const mid = (r.top + r.bottom) / 2, h = Math.min(r.height, lh);
      const line = { el, t: n.textContent.trim(), l: Math.max(r.left, clip.l), r: Math.min(r.right, clip.r), top: Math.max(mid - h / 2, clip.t), bottom: Math.min(mid + h / 2, clip.b) };
      if (line.r - line.l > 2 && line.bottom - line.top > 2) lines.push(line);
    }
  }
  const out = [];
  for (let i = 0; i < lines.length && out.length < 3; i++) for (let j = i + 1; j < lines.length; j++) {
    const a = lines[i], b = lines[j];
    if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ix <= 2 || iy <= 2) continue;
    const small = Math.min((a.r - a.l) * (a.bottom - a.top), (b.r - b.l) * (b.bottom - b.top));
    if (ix * iy < small * 0.25) continue;
    out.push(`“${a.t.slice(0, 20)}” and “${b.t.slice(0, 20)}” (${sel(b.el)})`); break;
  }
  return out;
};

/** In-page, before any page script: pretend the reader asked for less data (Save-Data and prefers-reduced-data). */
export const SAVE_DATA_INIT = () => {
  try { Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '3g', addEventListener() {}, removeEventListener() {} } }); } catch { /* read-only here */ }
  const mm = window.matchMedia.bind(window);
  window.matchMedia = (q) => (/prefers-reduced-data\s*:\s*reduce/.test(q) ? Object.assign(Object.create(MediaQueryList.prototype), { matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }) : mm(q));
};

/** In-page, after load under Save-Data: films that play or load, pictures far below the first screen fetched at once. */
export const SAVE_DATA_COLLECT = () => {
  const sel = (el) => { const p = []; for (let e = el; e && e.nodeType === 1 && p.length < 3; e = e.parentElement) { let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } const c = [...e.classList].slice(0, 2); if (c.length) s += '.' + c.join('.'); p.unshift(s); } return p.join(' > '); };
  const playing = [...document.querySelectorAll('video')].filter((v) => !v.paused || v.autoplay || v.preload === 'auto').map(sel);
  const eager = [...document.images].filter((im) => { const r = im.getBoundingClientRect(); return r.top + scrollY > innerHeight * 1.5 && im.loading !== 'lazy' && !/^data:|\.svg(\?|$)/i.test(im.currentSrc || im.src); }).map(sel);
  return { playing, eager };
};

/** Judge the Save-Data run: `media` is how many audio or video requests went out. */
export function judgeSaveData({ media = 0, playing = [], eager = [] }) {
  const out = [];
  if (media || playing.length) out.push({ rule: 'a11y-reduced-data', severity: 'warning', selector: playing[0] ?? null, message: `With Save-Data on, the page still ${media ? `fetches ${media} film or sound file${media > 1 ? 's' : ''}` : 'sets a film to play'}${playing.length ? ` (${playing.slice(0, 2).join(', ')})` : ''}. Read navigator.connection.saveData and prefers-reduced-data, show the still and keep the film behind its play button.` });
  if (eager.length) out.push({ rule: 'a11y-reduced-data', severity: 'warning', selector: eager[0], message: `${eager.length} picture${eager.length > 1 ? 's' : ''} far below the first screen load at once (${eager.slice(0, 2).join(', ')}). Give them loading="lazy" so a reader on a metered connection only pays for what they scroll to.` });
  return out;
}
