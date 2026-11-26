#!/usr/bin/env node
// A review pack: what a designer looks at, captured so an agent can judge a page with its own eyes.
//
//   node scripts/review-page.mjs <url | file | folder> [--out dir] [--slices 12] [--no-critic]
//
// Writes into the folder (default: a new folder under the system temp directory):
//   first-desktop-light.png, first-desktop-dark.png, first-mobile-light.png, first-mobile-dark.png
//                                  the first screen at 1440×900 and 390×844, light and dark
//   squint-desktop.png, squint-mobile.png
//                                  the first screen blurred and without colour: what stands out
//   slice-desktop-01.png …, slice-mobile-01.png …
//                                  the whole page cut into screen-height slices, in order
//   first-tablet-light.png         the first screen at 1024×768, where apps change shape (a sidebar, two panes)
//   access-rtl-mobile.png, access-forced-desktop.png, access-text200-mobile.png
//                                  the same page right to left, in forced colours (a Windows contrast theme)
//                                  and at 200% text: what everyone else sees
//   review.json                    the measurements: sections (what each gives the eye, layout, ground, density),
//                                  type jump, scroll moments, app checks, what stands out at a squint, speed,
//                                  and the critic's findings (audit-ui --taste --perf)
//   review.md                      the fixed checklist with the image paths, for the agent to fill in
//
// The pack does not judge. The agent opens the pictures, answers every question in review.md in its own
// words, and fixes what the answers find (references/review.md has a worked example).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEASURE, judgeMeasures } from './lib/critic.mjs';
import { VIEWPORTS, loadChromium, nameOf, settle, toUrl, unfold } from './lib/browser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); if (i < 0) return def; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const flag = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return false; argv.splice(i, 1); return true; };
const outArg = opt('out', null);
const maxSlices = +opt('slices', '12');
const noCritic = flag('no-critic');
const target = argv.find((a) => !a.startsWith('--'));
if (!target) { console.error('Usage: node scripts/review-page.mjs <url | file | folder> [--out dir] [--slices 12] [--no-critic]'); process.exit(2); }
const url = toUrl(target);
const chromium = await loadChromium(import.meta.url);
if (!chromium) { console.error('review-page needs Playwright: npm i -D @playwright/test && npx playwright install chromium'); process.exit(2); }
const out = resolve(outArg ?? mkdtempSync(join(tmpdir(), `lt-review-${nameOf(url)}-`)));
mkdirSync(out, { recursive: true });

// What stands out at a squint: the grid cells that differ most from the page's average tone, and what is in them.
const SQUINT = async ({ src, blur, cols, rows }) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.filter = `blur(${blur}px) grayscale(1) contrast(1.1)`;
  x.drawImage(img, 0, 0);
  const { data } = x.getImageData(0, 0, c.width, c.height);
  const lum = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  let mean = 0, n = 0;
  for (let i = 0; i < data.length; i += 4 * 16) { mean += lum(i); n++; }
  mean /= n;
  const cw = c.width / cols, ch = c.height / rows, cells = [];
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    let s = 0, m = 0;
    for (let y = Math.floor(r * ch); y < (r + 1) * ch; y += 6) for (let z = Math.floor(k * cw); z < (k + 1) * cw; z += 6) { s += Math.abs(lum((y * c.width + z) * 4) - mean); m++; }
    cells.push({ col: k, row: r, score: Math.round(s / m) });
  }
  return { png: c.toDataURL('image/png'), mean: Math.round(mean), cells };
};
const WHAT_IS_AT = (pts) => pts.map(([x, y]) => {
  const el = document.elementsFromPoint(x, y).find((e) => e !== document.documentElement && e !== document.body);
  if (!el) return null;
  const pic = el.closest('img, picture, video, canvas, svg, figure, [role="img"]');
  const named = pic ?? el;
  const text = (named.getAttribute('aria-label') || named.getAttribute('alt') || named.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50);
  return `${named.tagName.toLowerCase()}${pic ? ' (picture)' : ''}${text ? ` “${text}”` : ''}`;
});

const browser = await chromium.launch();
// A blank page to draw the squint on, so the page under review (and its content policy) is left alone.
const pad = await (await browser.newContext()).newPage();
const images = { first: {}, squint: {}, slices: { desktop: [], mobile: [] } };
const measures = {}, findings = {}, squint = {};
try {
  for (const vp of ['desktop', 'mobile']) {
    for (const mode of ['light', 'dark']) {
      const v = VIEWPORTS[vp];
      const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: !!v.isMobile, hasTouch: !!v.hasTouch, colorScheme: mode, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'load' });
      await settle(page, mode);
      const first = `first-${vp}-${mode}.png`;
      const buf = await page.screenshot({ path: join(out, first) });
      images.first[`${vp}-${mode}`] = first;
      if (mode === 'light') {
        // The squint: blurred and grey, so only weight, size and contrast are left.
        const cols = vp === 'desktop' ? 6 : 3, rows = 4;
        const sq = await pad.evaluate(SQUINT, { src: `data:image/png;base64,${buf.toString('base64')}`, blur: vp === 'desktop' ? 10 : 6, cols, rows });
        writeFileSync(join(out, `squint-${vp}.png`), Buffer.from(sq.png.split(',')[1], 'base64'));
        images.squint[vp] = `squint-${vp}.png`;
        const top = sq.cells.sort((a, b) => b.score - a.score).slice(0, 3);
        const at = await page.evaluate(WHAT_IS_AT, top.map((c) => [((c.col + 0.5) * v.width) / cols, ((c.row + 0.5) * v.height) / rows]));
        const where = (c) => `${['top', 'upper middle', 'lower middle', 'bottom'][c.row]} ${cols === 6 ? ['far left', 'left', 'centre left', 'centre right', 'right', 'far right'][c.col] : ['left', 'centre', 'right'][c.col]}`;
        squint[vp] = top.map((c, i) => ({ where: where(c), strength: c.score, what: at[i] }));
        // The measurements, at rest in light mode.
        measures[vp] = await page.evaluate(MEASURE, {});
        findings[vp] = judgeMeasures(measures[vp], { wide: v.width >= 900 });
        // The whole page in screen-height slices.
        await unfold(page);
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        const n = Math.min(maxSlices, Math.ceil(H / v.height));
        for (let i = 0; i < n; i++) {
          const y = i * v.height, h = Math.min(v.height, H - y);
          if (h < 40) break;
          const f = `slice-${vp}-${String(i + 1).padStart(2, '0')}.png`;
          await page.screenshot({ path: join(out, f), fullPage: true, clip: { x: 0, y, width: v.width, height: h } });
          images.slices[vp].push(f);
        }
        if (Math.ceil(H / v.height) > n) images.slices[`${vp}More`] = `${Math.ceil(H / v.height) - n} more screens not cut (--slices to raise)`;
      }
      await ctx.close();
    }
  }
  // The page for everyone else: a tablet, right to left, forced colours, the largest text.
  const VIEWS = [
    ['first-tablet-light.png', { width: 1024, height: 768 }, {}, null],
    ['access-rtl-mobile.png', VIEWPORTS.mobile, {}, () => document.documentElement.setAttribute('dir', 'rtl')],
    ['access-forced-desktop.png', VIEWPORTS.desktop, { forcedColors: 'active' }, null],
    ['access-text200-mobile.png', VIEWPORTS.mobile, {}, () => { document.documentElement.style.fontSize = '200%'; }],
  ];
  for (const [file, v, extra, change] of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: !!v.isMobile, hasTouch: !!v.hasTouch, colorScheme: 'light', reducedMotion: 'reduce', ...extra });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await settle(page, 'light');
    if (change) { await page.evaluate(change); await page.waitForTimeout(200); }
    await page.screenshot({ path: join(out, file) });
    (images.access ??= []).push(file);
    await ctx.close();
  }
} finally { await browser.close(); }

// The critic's own findings and speed, from the auditor (no focus rings: the pack is about looks).
let critic = null;
if (!noCritic) {
  const tmp = mkdtempSync(join(tmpdir(), 'lt-review-audit-'));
  const j = join(tmp, 'a.json');
  spawnSync(process.execPath, [join(here, 'audit-ui.mjs'), url, '--taste', '--perf', '--modes', 'light', '--focus-limit', '0', '--quiet', '--json', j], { encoding: 'utf8' });
  try {
    const a = JSON.parse(readFileSync(j, 'utf8'));
    const all = a.report.flatMap((r) => r.findings.map((f) => ({ rule: f.rule, severity: f.severity, viewport: r.viewport, message: f.message })));
    const seen = new Set();
    critic = { errors: a.errors, warnings: a.warnings, score: a.score, findings: all.filter((f) => { const k = f.rule + f.message; if (seen.has(k)) return false; seen.add(k); return true; }), perf: Object.fromEntries(a.report.filter((r) => r.perf).map((r) => [r.viewport, r.perf])) };
  } catch { critic = null; }
  rmSync(tmp, { recursive: true, force: true });
}

// ---------------------------------------------------------------- review.json
const d = measures.desktop, m = measures.mobile;
const summary = {
  url, generated: new Date().toISOString(), folder: out, images, squint,
  page: { marketing: d.hero && !d.app, app: d.app || m.app, height: d.pageHeight, screens: Math.round((d.pageHeight / 900) * 10) / 10 },
  sections: d.sections.map((s) => ({ selector: s.selector, hero: s.hero, words: s.words, looks: s.looks, use: s.use, block: s.block, tracks: s.tracks, heading: s.heading, ground: s.ground, tone: s.tone, density: s.density, moment: s.moment })),
  type: d.type, moments: d.motion.moments.map((x) => x.kind), motion: d.motion,
  app: { bars: m.bars, smallControls: m.controls.filter((c) => c.w < 44 || c.h < 44), states: m.states },
  measured: [...findings.desktop.map((f) => ({ ...f, viewport: 'desktop' })), ...findings.mobile.map((f) => ({ ...f, viewport: 'mobile' }))],
  critic,
};
writeFileSync(join(out, 'review.json'), JSON.stringify(summary, null, 2) + '\n');

// ---------------------------------------------------------------- review.md
const pct = (x) => `${Math.round(x * 100)}%`;
const sectionLine = (s, i) => `${i + 1}. \`${s.block}\`${s.hero ? ' (first screen)' : ''}: ${s.looks.length ? `to look at: ${s.looks.join(', ')}` : s.use ? `used, not looked at (${s.use})` : '**nothing to look at**'}; ${s.words} words, text covers ${pct(s.density)}; columns ${s.tracks.replaceAll('|', ' : ')}, heading ${s.heading}; ground ${s.tone ?? s.ground}${s.moment ? `; scroll moment: ${s.moment}` : ''}`;
// What was measured for a question: the page's own measures, and the critic's loads (rtl, forced colours, 200% text…).
const facts = (rules) => { const seen = new Set(); return [...summary.measured, ...(critic?.findings ?? [])].filter((f) => rules.includes(f.rule) && !seen.has(f.rule + f.message) && seen.add(f.rule + f.message)).map((f) => `   - measured (${f.viewport}): ${f.message}`).join('\n'); };
const md = `# Review: ${url}

Generated ${summary.generated}. Pictures are in this folder. Open each one before you answer; answer every question in your own words, then fix what the answers find and run the pack again.

## The pictures

- First screen, wide: ${images.first['desktop-light']} (dark: ${images.first['desktop-dark']})
- First screen, phone: ${images.first['mobile-light']} (dark: ${images.first['mobile-dark']})
- Squint (blurred, no colour): ${images.squint.desktop}, ${images.squint.mobile}
- The whole page, wide, in screens: ${images.slices.desktop.join(', ')}${images.slices.desktopMore ? ` (${images.slices.desktopMore})` : ''}
- The whole page, phone, in screens: ${images.slices.mobile.join(', ')}${images.slices.mobileMore ? ` (${images.slices.mobileMore})` : ''}
- For everyone else: ${(images.access ?? []).join(', ')} (a tablet at 1024px, right to left, forced colours, 200% text)

## What was measured

${d.sections.map(sectionLine).join('\n') || '(no sections found: an app screen or a single panel)'}

- Type: largest headline ${d.type.headline}px, body ${d.type.body}px, a jump of ${d.type.ratio} (2.5 or more on a marketing page)
- Scroll moments: ${summary.moments.length ? summary.moments.join(', ') : 'none'} (two at most)
- ${summary.page.app ? `An app screen. Fixed bottom bars: ${m.bars.length}; primary controls under 44px at phone width: ${summary.app.smallControls.map((c) => `“${c.label}” ${c.w}×${c.h}`).join(', ') || 'none'}; declared states: ${m.states.declared.join(', ') || 'none'}${m.states.missing.length ? ` (no view for ${m.states.missing.join(', ')})` : ''}` : `A ${summary.page.marketing ? 'marketing' : 'content'} page, ${summary.page.screens} screens tall at 1440px.`}
${critic ? `- The critic: ${critic.errors} errors, ${critic.warnings} warnings, taste ${critic.score}/100${critic.perf.desktop ? `; LCP ${critic.perf.desktop.lcp ? `${critic.perf.desktop.lcp.tag} at ${critic.perf.desktop.lcp.time}ms` : 'n/a'}, layout shift ${critic.perf.desktop.cls}, JS ${Math.round(critic.perf.desktop.bytes.js / 1024)} KB, CSS ${Math.round(critic.perf.desktop.bytes.css / 1024)} KB, fonts ${Math.round(critic.perf.desktop.bytes.font / 1024)} KB` : ''}` : ''}
${critic?.findings.length ? critic.findings.slice(0, 20).map((f) => `   - ${f.severity === 'error' ? 'error' : 'warning'} \`${f.rule}\` (${f.viewport}): ${f.message}`).join('\n') : ''}

## The checklist

Answer each in one to three sentences. Name things: the section, the element, the colour, the size. "Looks good" is not an answer.

1. **Is the first screen clear in 3 seconds?** Look at ${images.first['desktop-light']} and ${images.first['mobile-light']} for three seconds each, then look away. What is it, who is it for, and what is the one action? If you had to guess any of the three, it is not clear.
   - Answer:
2. **What stands out when you squint, and is it the right thing?** Look at ${images.squint.desktop} and ${images.squint.mobile}. The strongest areas measured: ${squint.desktop.map((c) => `${c.where} (${c.what ?? 'empty'})`).join('; ')}. Should the eye land there first?
   - Answer:
3. **Is there one bold idea?** One thing bolder than the rest: a picture, a figure set huge, a dark band, a statement, the product's own colour. Name it, or say there is none.
   - Answer:
4. **Does any section look like a template?** Go through the slices. Name any section you have seen on a hundred pages (three cards with icons, a logo strip, a centred heading over a grid, alternating picture-and-text rows on one ground).
${facts(['taste-same-layout', 'taste-monotony', 'taste-icon-tiles', 'taste-label-every-section', 'taste-hairlines', 'taste-default-look'])}
   - Answer:
5. **Is every section something to look at?** For each slice, what does the eye rest on? Words are captions.
${facts(['taste-no-visual', 'taste-text-wall', 'taste-density'])}
   - Answer:
6. **Does the type scale jump enough?** Is the headline unmistakably the top, and do the sizes step clearly (not 32, 28, 24, 20)?
${facts(['taste-type-jump', 'taste-type-scale', 'taste-focal'])}
   - Answer:
7. **Would a demanding designer ship it?** Yes, or no and the three changes that would get it there, most important first.
   - Answer:
8. **Does it hold for everyone?** Open ${(images.access ?? []).join(', ')}. On the tablet, is it laid out for the width (a sidebar, two panes) or a stretched phone? Right to left, does everything sit on the other side, arrows included? In forced colours, can you still see the selected option, the switches, the chart and where focus is? At 200% text, is anything cut off or on top of something else?
${facts(['a11y-rtl-mirror', 'a11y-rtl-overflow', 'a11y-forced-colors', 'a11y-long-words', 'a11y-reduced-data', 'app-dynamic-type', 'app-reach', 'app-sheet-handle', 'app-gesture-conflict', 'app-gesture-edge'])}
   - Answer:
`;
writeFileSync(join(out, 'review.md'), md);
const rel = relative(process.cwd(), out);
console.log(`Review pack: ${rel.startsWith('..') ? out : rel}/`);
console.log(`  ${Object.keys(images.first).length} first screens, 2 squints, ${images.slices.desktop.length + images.slices.mobile.length} slices, ${(images.access ?? []).length} views for everyone else, review.json, review.md`);
console.log(`  ${d.sections.length} sections · type jump ${d.type.ratio} · ${summary.moments.length} scroll moments · ${summary.measured.length} measured findings${critic ? ` · critic ${critic.errors} errors, ${critic.warnings} warnings, taste ${critic.score}/100` : ''}`);
console.log('Open the pictures and answer the checklist in review.md (references/review.md shows how).');
