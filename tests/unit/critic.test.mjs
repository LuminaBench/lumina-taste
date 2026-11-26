// The designer's critic: measured rules (scripts/lib/critic.mjs) on fixtures, speed checks, the review pack
// and the blind comparison. Run: node --test tests/unit/critic.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgeMeasures, judgePerf, judgeRtl, judgeSaveData, LIMITS } from '../../scripts/lib/critic.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const node = (args) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
const audit = (fixture, extra = []) => {
  const out = join(mkdtempSync(join(tmpdir(), 'lt-critic-')), 'r.json');
  node([join(root, 'scripts/audit-ui.mjs'), join(root, 'tests/fixtures', `${fixture}.html`), '--modes', 'light', '--quiet', '--json', out, ...extra]);
  const j = JSON.parse(readFileSync(out, 'utf8'));
  rmSync(dirname(out), { recursive: true, force: true });
  return { j, rules: new Set(j.report.flatMap((r) => r.findings.map((f) => f.rule))), findings: j.report.flatMap((r) => r.findings) };
};

// ---------------------------------------------------------------- the judge alone, on made-up measurements
const section = (o = {}) => ({ selector: 'section', hero: false, words: 40, looks: ['picture'], use: null, block: 'section', tracks: '1', heading: 'top', ground: '#ffffff', tone: null, density: 0.05, moment: null, ...o });
const page = (sections, o = {}) => ({ width: 1440, height: 900, hero: true, app: false, sections: [section({ hero: true }), ...sections], looseMoments: 0, type: { headline: 72, body: 16, ratio: 4.5 }, bars: [], controls: [], states: { declared: [], missing: [] }, ...o });
const rulesOf = (m, opts) => new Set(judgeMeasures(m, opts).map((f) => f.rule));

test('judge: a page with a picture in every section and a clear jump passes', () => {
  assert.deepEqual([...rulesOf(page([section(), section({ block: 'lt-quote', tracks: '0.5|0.5' }), section({ ground: '#101010' })]))], []);
});

test('judge: words with nothing to look at are flagged; forms, questions and closing lines are not', () => {
  assert.ok(rulesOf(page([section({ looks: [], words: 60 })])).has('taste-no-visual'));
  for (const use of ['form', 'questions', 'action', 'strip']) assert.ok(!rulesOf(page([section({ looks: [], use })])).has('taste-no-visual'), use);
  assert.ok(!rulesOf(page([section({ looks: [], words: LIMITS.noVisualWords - 1 })])).has('taste-no-visual'));
  // Not on an app, and not judged at phone width.
  assert.ok(!rulesOf(page([section({ looks: [] })], { app: true })).has('taste-no-visual'));
  assert.ok(!rulesOf(page([section({ looks: [] })], { width: 390 })).has('taste-no-visual'));
});

test('judge: the same layout twice on one ground, but not across a change of ground', () => {
  const twin = section({ block: 'lt-feature-split', tracks: '0.5|0.5' });
  assert.ok(rulesOf(page([twin, { ...twin }])).has('taste-same-layout'));
  assert.ok(!rulesOf(page([twin, { ...twin, ground: '#202020' }])).has('taste-same-layout'));
  // Same columns from different blocks still count when the heading sits in the same place.
  assert.ok(rulesOf(page([section({ tracks: '0.3|0.3|0.3' }), section({ block: 'other', tracks: '0.3|0.3|0.3' })])).has('taste-same-layout'));
  // Single-column sections of different blocks do not.
  assert.ok(!rulesOf(page([section({ block: 'a' }), section({ block: 'b' })])).has('taste-same-layout'));
});

test('judge: density runs and a page of one density', () => {
  const dense = section({ density: LIMITS.denseCover + 0.03 });
  assert.ok(rulesOf(page([dense, dense, dense])).has('taste-density'));
  assert.ok(!rulesOf(page([dense, dense, section({ density: 0.01 }), dense])).has('taste-density'));
  const flat = section({ density: 0.04 });
  assert.ok(rulesOf(page([flat, flat, flat, flat, flat])).has('taste-density'));
});

test('judge: a timid type jump on a marketing page only', () => {
  assert.ok(rulesOf(page([section()], { type: { headline: 32, body: 16, ratio: 2 } })).has('taste-type-jump'));
  assert.ok(!rulesOf(page([section()], { type: { headline: 32, body: 16, ratio: 2 }, hero: false })).has('taste-type-jump'));
});

test('judge: two scroll moments are a budget, three are too many, two back to back are too close', () => {
  assert.ok(!rulesOf(page([section({ moment: 'data-zoom' }), section(), section({ moment: 'stack-cards' })])).has('taste-motion-budget'));
  assert.ok(rulesOf(page([section({ moment: 'data-zoom' }), section(), section({ moment: 'stack-cards' }), section({ moment: 'pinned-scene' })])).has('taste-motion-budget'));
  assert.ok(rulesOf(page([section({ moment: 'data-zoom' }), section({ moment: 'stack-cards' })])).has('taste-motion-budget'));
});

test('judge: pinned scenes, entrances, counters, film and pinning', () => {
  const motion = (o) => page([section()], { motion: { moments: [], pinned: 0, entrances: 1, counters: 0, countersNoDigit: [], videos: [], pinBroken: [], ...o } });
  assert.deepEqual([...rulesOf(motion({}))], []);
  assert.ok(rulesOf(motion({ pinned: 2 })).has('taste-motion-budget'));
  assert.ok(rulesOf(motion({ entrances: 2 })).has('taste-motion-entrance'));
  assert.ok(rulesOf(motion({ counters: LIMITS.counters + 1 })).has('taste-motion-counter'));
  assert.ok(!rulesOf(motion({ counters: LIMITS.counters })).has('taste-motion-counter'));
  const err = (o, rule) => judgeMeasures(motion(o)).find((f) => f.rule === rule)?.severity;
  assert.equal(err({ countersNoDigit: ['b'] }, 'taste-motion-counter'), 'error');
  assert.equal(err({ videos: ['section.lt-hero-video has a film and no pause button'] }, 'taste-motion-video'), 'error');
  assert.equal(err({ pinBroken: ['section.lt-story'] }, 'taste-motion-pin'), 'error');
  // Three moments warn; four are an error.
  const k = (n) => Array.from({ length: n }, () => ({ kind: 'data-zoom', selector: 'figure' }));
  assert.equal(err({ moments: k(3) }, 'taste-motion-budget'), 'warning');
  assert.equal(err({ moments: k(4) }, 'taste-motion-budget'), 'error');
  assert.equal(err({ moments: k(2) }, 'taste-motion-budget'), undefined);
});

test('judge: app touch targets at phone width, and missing states', () => {
  const app = { width: 390, height: 844, app: true, hero: false, controls: [{ selector: 'button', label: 'Send', w: 32, h: 32, bar: false }] };
  assert.ok(rulesOf(page([], app)).has('app-touch-target'));
  assert.ok(!rulesOf(page([], { ...app, controls: [{ selector: 'button', label: 'Send', w: 44, h: 44 }] })).has('app-touch-target'));
  assert.ok(!rulesOf(page([], { ...app, width: 1440 })).has('app-touch-target'));
  assert.ok(rulesOf(page([], { ...app, states: { declared: ['loading', 'empty'], missing: ['empty'] } })).has('app-states'));
});

test('judge: sheets, swipes and the reach of the thumb on a phone app', () => {
  const app = { width: 390, height: 844, app: true, hero: false, controls: [] };
  const sheet = (handle) => ({ selector: 'dialog.sheet', id: 's', handle, handleSelector: handle === 'none' ? null : 'span.grab' });
  assert.ok(rulesOf(page([], { ...app, sheets: [sheet('static')] })).has('app-sheet-handle'));
  assert.ok(rulesOf(page([], { ...app, sheets: [sheet('none')] })).has('app-sheet-handle'));
  assert.ok(!rulesOf(page([], { ...app, sheets: [sheet('button')] })).has('app-sheet-handle'));
  const swipe = (o) => ({ selector: 'ul', left: 24, right: 366, guard: false, scroller: null, ...o });
  assert.ok(rulesOf(page([], { ...app, swipes: [swipe({ scroller: 'div.lanes' })] })).has('app-gesture-conflict'));
  assert.ok(rulesOf(page([], { ...app, swipes: [swipe({ left: 0, right: 390 })] })).has('app-gesture-edge'));
  assert.ok(!rulesOf(page([], { ...app, swipes: [swipe({ left: 0, right: 390, guard: true })] })).has('app-gesture-edge'));
  assert.ok(!rulesOf(page([], { ...app, swipes: [swipe()] })).has('app-gesture-edge'));
  // The main action: a warning when every primary in view is in the top half.
  assert.ok(rulesOf(page([], { ...app, reach: [{ selector: 'button', label: 'Add', cy: 120 }] })).has('app-reach'));
  assert.ok(!rulesOf(page([], { ...app, reach: [{ selector: 'button', label: 'Add', cy: 120 }, { selector: 'button', label: 'Pay', cy: 790 }] })).has('app-reach'));
  assert.equal(judgeMeasures(page([], { ...app, reach: [{ selector: 'b', label: 'Add', cy: 100 }] })).find((f) => f.rule === 'app-reach').severity, 'warning');
  // Wide screens and marketing pages are not judged as phones.
  assert.ok(!rulesOf(page([], { ...app, width: 1440, reach: [{ selector: 'b', label: 'Add', cy: 100 }] })).has('app-reach'));
  assert.ok(!rulesOf(page([], { width: 390, app: false, reach: [{ selector: 'b', label: 'Add', cy: 100 }] })).has('app-reach'));
});

test('judge: right-to-left mirrors, or names what does not', () => {
  const ltr = { width: 400, scrollWidth: 400, boxes: [{ i: 0, selector: 'h1', left: 16, right: 200, shown: true }, { i: 1, selector: 'p.centre', left: 100, right: 300, shown: true }] };
  const mirrored = { width: 400, scrollWidth: 400, boxes: [{ i: 0, selector: 'h1', left: 200, right: 384, shown: true }, { i: 1, selector: 'p.centre', left: 100, right: 300, shown: true }] };
  assert.deepEqual(judgeRtl(ltr, mirrored), []);
  const stuck = { ...mirrored, boxes: [{ ...mirrored.boxes[0], left: 16, right: 200 }, mirrored.boxes[1]] };
  const f = judgeRtl(ltr, stuck);
  assert.equal(f[0].rule, 'a11y-rtl-mirror');
  assert.match(f[0].message, /h1 sits at x=16, the mirror of its place is x=200/);
  assert.ok(judgeRtl(ltr, { ...mirrored, scrollWidth: 900 }).some((x) => x.rule === 'a11y-rtl-overflow'));
  // A page that already scrolled sideways in ltr is the overflow rule's business, not this one's.
  assert.ok(!judgeRtl({ ...ltr, scrollWidth: 900 }, { ...mirrored, scrollWidth: 900 }).some((x) => x.rule === 'a11y-rtl-overflow'));
});

test('judge: Save-Data keeps films and far pictures from loading', () => {
  assert.deepEqual(judgeSaveData({ media: 0, playing: [], eager: [] }), []);
  assert.equal(judgeSaveData({ media: 1, playing: ['video'], eager: [] })[0].rule, 'a11y-reduced-data');
  assert.equal(judgeSaveData({ media: 0, playing: [], eager: ['img.far'] }).length, 1);
});

test('perf judge: lazy LCP is an error (a warning under --strict alone); fonts, scripts, shifts and images', () => {
  const base = { lcp: { image: true, tag: 'img', loading: 'lazy', fetchpriority: null, selector: 'img', url: 'a.jpg' }, cls: 0, shifts: 0, images: [], bytes: { js: 0, css: 0, font: 0, fonts: 0 } };
  assert.equal(judgePerf(base).find((f) => f.rule === 'perf-lcp-lazy').severity, 'error');
  assert.equal(judgePerf(base, { soft: true }).find((f) => f.rule === 'perf-lcp-lazy').severity, 'warning');
  assert.ok(judgePerf({ ...base, lcp: { ...base.lcp, loading: null } }).some((f) => f.rule === 'perf-lcp-priority'));
  assert.deepEqual(judgePerf({ ...base, lcp: { ...base.lcp, loading: null, fetchpriority: 'high' } }), []);
  const heavy = judgePerf({ ...base, lcp: null, cls: 0.2, bytes: { js: 900 * 1024, css: 300 * 1024, font: 400 * 1024, fonts: 8 }, images: [{ selector: 'img', vector: false, sized: false, ratio: null, w: 300, h: 200, nw: 1200, nh: 800, dpr: 1 }] });
  for (const rule of ['perf-cls', 'perf-js-bytes', 'perf-css-bytes', 'perf-font-bytes', 'perf-img-dimensions', 'perf-img-oversized']) assert.ok(heavy.some((f) => f.rule === rule), rule);
  // Twice the box is a retina picture, not an oversized one.
  assert.ok(!judgePerf({ ...base, lcp: null, images: [{ selector: 'img', sized: true, w: 600, h: 400, nw: 1200, nh: 800, dpr: 1 }] }).some((f) => f.rule === 'perf-img-oversized'));
});

// ---------------------------------------------------------------- the auditor, on fixtures
test('audit-ui --taste: a section of words with nothing to look at', () => {
  const { rules } = audit('critic-text-only', ['--taste', '--viewports', 'desktop']);
  assert.ok(rules.has('taste-no-visual'));
});

test('audit-ui --taste: the same layout twice', () => {
  assert.ok(audit('critic-same-layout', ['--taste', '--viewports', 'desktop']).rules.has('taste-same-layout'));
});

test('audit-ui --taste: a timid type jump', () => {
  const { rules, findings } = audit('critic-timid-type', ['--taste', '--viewports', 'desktop']);
  assert.ok(rules.has('taste-type-jump'));
  assert.match(findings.find((f) => f.rule === 'taste-type-jump').message, /32px over 18px/);
});

test('audit-ui --taste: too many scroll moments', () => {
  const { findings } = audit('critic-motion', ['--taste', '--viewports', 'desktop']);
  const f = findings.find((x) => x.rule === 'taste-motion-budget');
  assert.ok(f);
  assert.match(f.message, /4 big scroll moments/);
  assert.equal(f.severity, 'error');
  assert.ok(findings.some((x) => /2 pinned scenes/.test(x.message)));
});

test('audit-ui --taste: film with sound, a counter with nothing to count, two entrances, a pinned scene that cannot pin', () => {
  const { findings } = audit('critic-motion-broken', ['--taste', '--viewports', 'desktop']);
  const sev = (rule) => findings.filter((f) => f.rule === rule).map((f) => f.severity);
  assert.deepEqual(sev('taste-motion-video'), ['error']);
  assert.deepEqual(sev('taste-motion-counter'), ['error']);
  assert.deepEqual(sev('taste-motion-pin'), ['error']);
  assert.deepEqual(sev('taste-motion-entrance'), ['warning']);
});

test('audit-ui --taste on an app at phone width: small targets, a bar without the safe area, missing states', () => {
  const { rules, findings } = audit('critic-app', ['--taste', '--viewports', 'mobile']);
  for (const rule of ['app-touch-target', 'app-safe-area', 'app-states']) assert.ok(rules.has(rule), rule);
  assert.match(findings.find((f) => f.rule === 'app-states').message, /no view for empty, error/);
});

test('audit-ui --taste on a phone app that feels wrong: grabber, Escape, gestures, reach and 200% text', () => {
  const { rules, findings } = audit('critic-native', ['--taste', '--viewports', 'mobile']);
  for (const rule of ['app-sheet-handle', 'app-sheet-escape', 'app-gesture-conflict', 'app-gesture-edge', 'app-reach', 'app-dynamic-type']) assert.ok(rules.has(rule), rule);
  assert.match(findings.find((f) => f.rule === 'app-sheet-handle').message, /not a button/);
  assert.ok(findings.filter((f) => f.rule === 'app-dynamic-type').some((f) => /set in px|do(es)? not grow/.test(f.message)));
});

test('audit-ui --taste beyond the basics: right-to-left, long words, forced colours and Save-Data', () => {
  const desk = audit('critic-a11y', ['--taste', '--viewports', 'desktop']);
  assert.ok(desk.rules.has('a11y-rtl-mirror'));
  const fc = desk.findings.filter((f) => f.rule === 'a11y-forced-colors').map((f) => f.message).join(' ');
  assert.match(fc, /disappear/);       // the meter's fill
  assert.match(fc, /no visible box/);  // the borderless field
  assert.match(fc, /show(s)? no focus/); // box-shadow focus rings
  const phone = audit('critic-a11y', ['--taste', '--viewports', 'mobile']);
  for (const rule of ['a11y-rtl-overflow', 'a11y-long-words', 'a11y-reduced-data']) assert.ok(phone.rules.has(rule), rule);
});

test('overlap is measured on the letters: tall-metric line boxes that do not touch pass, letters on letters fail', () => {
  // The same face with tall vertical metrics (ascent-override 150%) in both: line boxes cross, letters do not.
  assert.ok(!audit('overlap-tall-metrics', ['--viewports', 'desktop,mobile']).rules.has('overlap'));
  const real = audit('overlap-real', ['--viewports', 'desktop']).findings.filter((f) => f.rule === 'overlap').map((f) => f.message).join(' ');
  assert.match(real, /“1,240” and “degrees in the kiln”/);
  assert.match(real, /“Tide tables” and “Updated 06:00”/);
});

test('audit-ui --perf: a lazy, unsized, oversized first picture', () => {
  const { j, findings } = audit('critic-perf', ['--perf', '--viewports', 'desktop']);
  const lazy = findings.find((f) => f.rule === 'perf-lcp-lazy');
  assert.ok(lazy && lazy.severity === 'error');
  for (const rule of ['perf-img-dimensions', 'perf-img-oversized']) assert.ok(findings.some((f) => f.rule === rule), rule);
  assert.ok(j.report[0].perf.lcp.tag === 'img');
  // --strict alone runs the same checks as warnings.
  const strict = audit('critic-perf', ['--strict', '--viewports', 'desktop']);
  assert.equal(strict.findings.find((f) => f.rule === 'perf-lcp-lazy').severity, 'warning');
});

test('the default-look fixtures are caught by the new measures too', () => {
  for (const [f, rule] of [['ai-default-saas', 'taste-no-visual'], ['ai-default-cream', 'taste-no-visual'], ['broadsheet', 'taste-density']]) assert.ok(audit(f, ['--taste', '--viewports', 'desktop']).rules.has(rule), `${f}: ${rule}`);
});

test('--pending lists a known finding without counting it, and names one that stopped firing', () => {
  const r = node([join(root, 'scripts/audit-ui.mjs'), join(root, 'tests/fixtures/critic-timid-type.html'), '--taste', '--strict', '--viewports', 'desktop', '--modes', 'light', '--pending', 'fixtures:taste-type-jump,fixtures:taste-no-visual']);
  assert.match(r.stdout, /~ pending: The largest headline/);
  assert.match(r.stdout, /pending fixtures:taste-no-visual no longer fires/);
  assert.doesNotMatch(r.stdout, /taste-type-jump[\s\S]*! The largest/);
});

// ---------------------------------------------------------------- the review pack and the blind comparison
test('review-page writes the pictures, the measurements and the checklist', () => {
  const out = mkdtempSync(join(tmpdir(), 'lt-review-test-'));
  try {
    const r = node([join(root, 'scripts/review-page.mjs'), join(root, 'tests/fixtures/critic-text-only.html'), '--out', out, '--slices', '3']);
    assert.equal(r.status, 0, r.stderr);
    for (const f of ['first-desktop-light.png', 'first-desktop-dark.png', 'first-mobile-light.png', 'first-mobile-dark.png', 'squint-desktop.png', 'squint-mobile.png', 'slice-desktop-01.png', 'slice-mobile-01.png', 'review.json', 'review.md']) assert.ok(existsSync(join(out, f)), f);
    const j = JSON.parse(readFileSync(join(out, 'review.json'), 'utf8'));
    assert.ok(j.sections.length >= 3 && j.type.ratio > 2.5);
    assert.ok(j.measured.some((f) => f.rule === 'taste-no-visual'));
    assert.equal(j.squint.desktop.length, 3);
    assert.ok(j.critic && typeof j.critic.score === 'number');
    const md = readFileSync(join(out, 'review.md'), 'utf8');
    for (const q of ['clear in 3 seconds', 'when you squint', 'one bold idea', 'look like a template', 'something to look at', 'type scale jump', 'demanding designer ship', 'hold for everyone']) assert.ok(md.includes(q), q);
    assert.equal((md.match(/- Answer:/g) ?? []).length, 8);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('compare-pages letters pages blindly, blocks outside requests, records verdicts into a tally', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-compare-test-'));
  const out = join(dir, 'round-1');
  try {
    const r = node([join(root, 'scripts/compare-pages.mjs'), `mine=${join(root, 'tests/fixtures/critic-text-only.html')}`, `theirs=${join(root, 'tests/fixtures/ai-default-saas.html')}`, '--out', out, '--seed', '7']);
    assert.equal(r.status, 0, r.stderr);
    for (const f of ['A-first.png', 'A-full.png', 'A-phone.png', 'B-first.png', 'sheet.png', 'sheet.html', 'judge.md', 'round.json', '.key.json']) assert.ok(existsSync(join(out, f)), f);
    const key = JSON.parse(readFileSync(join(out, '.key.json'), 'utf8'));
    assert.deepEqual(new Set(Object.values(key).map((k) => k.source)), new Set(['mine', 'theirs']));
    // The sheet and the rubric never name the sources.
    for (const f of ['sheet.html', 'judge.md', 'round.json']) assert.doesNotMatch(readFileSync(join(out, f), 'utf8'), /mine|theirs|critic-text-only|ai-default/, f);
    // The generated page reaches for a stock face: that request is blocked and counted.
    const round = JSON.parse(readFileSync(join(out, 'round.json'), 'utf8'));
    const genLetter = Object.keys(key).find((l) => key[l].source === 'theirs');
    assert.ok(round.blocked[genLetter] >= 1);
    const oursLetter = Object.keys(key).find((l) => key[l].source === 'mine');
    assert.equal(node([join(root, 'scripts/compare-pages.mjs'), '--out', out, '--record', `${oursLetter}>${genLetter}`, '--reason', 'x']).status, 2, 'a reason is required');
    const rec = node([join(root, 'scripts/compare-pages.mjs'), '--out', out, '--record', `${oursLetter}>${genLetter}`, '--reason', 'one picture against three icon cards']);
    assert.equal(rec.status, 0, rec.stderr);
    assert.match(rec.stdout, /mine>theirs/);
    const tally = JSON.parse(readFileSync(join(dir, 'compare-tally.json'), 'utf8'));
    assert.deepEqual(tally.sources.mine, { wins: 1, losses: 0, ties: 0 });
    assert.deepEqual(tally.sources.theirs, { wins: 0, losses: 1, ties: 0 });
    assert.equal(node([join(root, 'scripts/compare-pages.mjs'), '--out', out, '--record', 'A>Z', '--reason', 'a letter that is not there']).status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
