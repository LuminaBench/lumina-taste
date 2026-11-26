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
  const NAMES = ['pinned-scene', 'sideways-scroll', 'scroll-track', 'product-reveal', 'hero-video', 'stack-cards', 'scroll-statement', 'sticky-story'];
  const MOMENT = ['[data-zoom]', '[data-parallax]', ...NAMES.flatMap((n) => [`[class*="${n}"]`, `[data-lt*="${n}"]`])].join(', ');
  const momentOf = (band) => {
    const hit = band.matches(MOMENT) ? band : band.querySelector(MOMENT);
    if (!hit) return null;
    if (hit.hasAttribute('data-zoom')) return 'data-zoom';
    if (hit.hasAttribute('data-parallax')) return 'data-parallax';
    const name = `${hit.className} ${hit.getAttribute('data-lt') ?? ''}`;
    return NAMES.find((n) => name.includes(n)) ?? 'moment';
  };
  const looseMoments = [...document.querySelectorAll(MOMENT)].filter((e) => !bands.some((b) => b.contains(e) || e.contains(b))).length;

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
      moment: momentOf(band),
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
  const primary = [...document.querySelectorAll('button, a, [role="button"], [role="tab"], input[type="submit"], input[type="button"]')].filter((el) => {
    if (!shown(el) || el.closest('[aria-hidden="true"], svg, p, li > p, td, [role="dialog"]:not([open]), [data-audit-ignore]')) return false;
    // A skip link waits off screen until it is focused.
    const r = rectOf(el); if (r.bottom + scrollY <= 0 || r.right <= 0 || /skip/i.test(el.className) || /^#main/.test(el.getAttribute('href') ?? '') && r.top + scrollY < 4) return false;
    if (el.matches('a') && el.closest('p, figcaption, small')) return false;
    return inBar(el) || el.matches('[type="submit"], .lt-btn[data-variant="primary"]') || (filled(el) && rectOf(el).width >= 64);
  }).map((el) => ({ selector: sel(el), label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30), bar: inBar(el), ...hit(el) }));

  // ---- page states the page says it has
  const declared = [...new Set([...(html.getAttribute('data-states') ?? '').split(/[\s,]+/), ...(opts.states ?? [])].filter(Boolean))];
  const present = (s) => !!document.querySelector(`[data-view~="${s}"], [data-state="${s}"], [data-state-view="${s}"]`) || html.dataset.pageState === s;

  return {
    url: location.href, width: vw, height: vh, pageHeight: html.scrollHeight,
    hero: !!hero, app, appMarked, sections, looseMoments,
    type: { headline: Math.round(headline), h1: h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : 0, body: bodySize, ratio: bodySize ? Math.round((headline / bodySize) * 100) / 100 : 0 },
    bars: fixedBottom.map((b) => ({ selector: sel(b), height: Math.round(rectOf(b).height) })),
    controls: primary,
    states: { declared, missing: declared.filter((s) => !present(s)) },
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
  moments: 2,            // big scroll moments per page
  target: 44,            // primary touch targets at phone width, in CSS px
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

  // 5. The motion budget.
  const moments = m.sections.filter((s) => s.moment);
  const total = moments.length + (m.looseMoments ?? 0);
  if (total > limits.moments) add('taste-motion-budget', moments[limits.moments]?.selector ?? null, `${total} big scroll moments (${moments.map((s) => s.moment).join(', ')}). Keep two at most, where they carry the subject; the rest stay still (the quiet data-scroll reveal does not count).`);
  else for (let i = 1; i < m.sections.length; i++) if (m.sections[i].moment && m.sections[i - 1].moment) { add('taste-motion-budget', m.sections[i].selector, `Two scroll moments back to back (${m.sections[i - 1].moment}, then ${m.sections[i].moment}). Put a still section between them.`); break; }

  // 6. Apps, at phone width: touch targets, the home-indicator gap, declared states.
  if (!wide && (m.app || m.bars.length)) {
    const small = m.controls.filter((c) => c.w < limits.target - 0.5 || c.h < limits.target - 0.5);
    if (small.length) add('app-touch-target', small[0].selector, `${plural(small.length, 'primary control is', 'primary controls are')} smaller than ${limits.target}×${limits.target}px at phone width: ${small.slice(0, 4).map((c) => `“${c.label || c.selector}” ${c.w}×${c.h}`).join(', ')}${small.length > 4 ? ` and ${small.length - 4} more` : ''}. Give each a ${limits.target}px hit area (min-height, padding, or an inset ::before).`);
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
