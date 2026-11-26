// Motion rules that are easy to break and invisible in the reduced-motion screenshots and audits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const walk = (d, ext, out = []) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, ext, out); else if (f.endsWith(ext)) out.push(p); } return out; };
const rel = (p) => p.replace(root + '/', '');
const css = [join(root, 'tokens/scroll.css'), ...walk(join(root, 'components/ui'), '.css')];
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every block prelude (at-rule or selector) enclosing position i. */
function enclosing(src, i) {
  const stack = [];
  let start = 0;
  for (let k = 0; k < i; k++) {
    if (src[k] === '{') { stack.push(src.slice(start, k).trim()); start = k + 1; }
    else if (src[k] === '}') { stack.pop(); start = k + 1; }
    else if (src[k] === ';') start = k + 1;
  }
  return stack;
}

test('scroll-driven animations only run when motion is allowed', () => {
  const bad = [];
  for (const f of css) {
    const src = strip(readFileSync(f, 'utf8'));
    for (const m of src.matchAll(/animation-timeline\s*:\s*([^;}]+)/g)) {
      if (/^\s*auto\b/.test(m[1])) continue; // resets a scrubbed animation to a timed one
      if (!enclosing(src, m.index).some((p) => /prefers-reduced-motion:\s*no-preference/.test(p))) bad.push(`${rel(f)}: ${m[0].trim()}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('page transitions are opt-in: no @view-transition in the tokens every page loads', () => {
  for (const f of walk(join(root, 'tokens'), '.css')) assert.ok(!/@view-transition/.test(strip(readFileSync(f, 'utf8'))), rel(f));
  const vt = strip(readFileSync(join(root, 'components/ui/motion/view-transition/view-transition.css'), 'utf8'));
  const at = vt.indexOf('@view-transition');
  assert.ok(at > 0, 'the view-transition component holds the at-rule');
  assert.ok(enclosing(vt, at).some((p) => /prefers-reduced-motion:\s*no-preference/.test(p)), 'and only under no-preference');
  assert.match(vt, /html:not\(\[data-vt\]\)[^{]*::view-transition-group\(\*\)[^{]*\{\s*animation:\s*none/);
});

test('the scroll moments animate transform and opacity only', () => {
  const files = ['tokens/scroll.css', 'components/ui/blocks/sticky-story/sticky-story.css', 'components/ui/blocks/side-scroll/side-scroll.css', 'components/ui/motion/view-transition/view-transition.css'];
  const allowed = new Set(['transform', 'opacity']);
  const legacy = new Set(['lt-settle', 'lt-line']); // older keyframes that also move border-radius and clip-path
  const bad = [];
  for (const f of files) {
    const src = strip(readFileSync(join(root, f), 'utf8'));
    for (const m of src.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\}\s*\}/g)) {
      if (legacy.has(m[1])) continue;
      for (const p of m[2].matchAll(/([a-z-]+)\s*:/g)) if (!allowed.has(p[1])) bad.push(`${f} ${m[1]}: ${p[1]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('every figure marked data-count holds its true number in the HTML', () => {
  // data-count is a bare attribute here (virtual-list uses data-count="10000" for something else).
  const bad = [];
  for (const f of walk(join(root, 'components/ui'), '.html')) {
    for (const m of readFileSync(f, 'utf8').matchAll(/<(\w+)[^>]*\sdata-count(?:="")?(?=[\s>])[^>]*>([^<]*)</g)) if (!/\d/.test(m[2]) || /^0\D*$/.test(m[2].trim())) bad.push(`${rel(f)}: ${m[0]}`);
  }
  assert.deepEqual(bad, []);
});

test('pinned blocks never sit inside overflow hidden or auto (sticky would stop)', () => {
  for (const f of ['sticky-story', 'side-scroll']) {
    const src = strip(readFileSync(join(root, `components/ui/blocks/${f}/${f}.css`), 'utf8'));
    const root0 = src.match(/:scope\s*\{[^}]*\}/)[0];
    assert.ok(!/overflow(-y)?\s*:\s*(hidden|auto|scroll)/.test(root0), `${f} root must not clip`);
  }
});

test('the video hero never autoplays by markup', () => {
  const html = readFileSync(join(root, 'components/ui/blocks/hero-video/hero-video.html'), 'utf8');
  const video = html.match(/<video[^>]*>/)[0];
  assert.ok(!/\sautoplay/.test(video), 'autoplay is decided by the script');
  for (const a of ['muted', 'loop', 'playsinline', 'preload="none"']) assert.ok(video.includes(a), a);
  assert.match(html, /data-part="toggle"/);
});
