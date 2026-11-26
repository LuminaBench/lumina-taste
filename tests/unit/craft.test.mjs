// Craft: art-panel scenes (the component and the Node copy draw the same thing), the drawing's line weight per
// type pairing, the micro-interaction tokens and their reduced-motion stillness, and the gallery's new views.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { loadMotifs, pickScene, rankMotifs, sceneSvg, pickMotif } from '../../scripts/lib/image-motifs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** The component's own art-panel.ts, compiled in memory, so the test runs the real functions. */
async function component() {
  const { code } = await transform(read('components/ui/data/art-panel/art-panel.ts'), { loader: 'ts', format: 'esm' });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const BRIEFS = [
  'Bag of Huila beans on a wooden counter', 'construction site', 'the dental practice in Leith', 'law office', 'coffee shop',
  'ferry crossings to the island', 'dog groomer and walker', 'sourdough loaf on the bench', 'API for webhooks', 'quiet abstract feeling',
  'a bus and coach company', 'independent opticians in Bath', 'florist with a plant shop', 'tickets for a folk festival with a mic',
  ...JSON.parse(read('evals/evals.json')).evals.map((e) => e.prompt),
];

test('scenes: art-panel.ts and image-motifs.mjs pick and draw exactly the same scene', async () => {
  const ts = await component();
  const names = Object.keys(loadMotifs());
  assert.equal(names.length, 47, 'the 47 motif names stay');
  for (const b of BRIEFS) {
    assert.deepEqual(ts.rankMotifs(b), rankMotifs(b), `rank: ${b}`);
    assert.deepEqual(ts.pickScene(b), pickScene(b), `pick: ${b}`);
    const s = pickScene(b);
    if (s) assert.equal(ts.sceneSvg(s), sceneSvg(s), `draw: ${b}`);
  }
  // Every motif alone and every pair, in both orders, and a sample of threes.
  for (const a of names) {
    assert.equal(ts.sceneSvg(a), sceneSvg(a), a);
    for (const b of names) if (a !== b) assert.equal(ts.sceneSvg(`${a} ${b}`), sceneSvg([a, b]), `${a} ${b}`);
  }
  for (let i = 0; i < names.length; i++) { const t = [names[i], names[(i * 7 + 3) % 47], names[(i * 13 + 5) % 47]]; assert.equal(ts.sceneSvg(t), sceneSvg(t.join(' ')), t.join(' ')); }
  assert.equal(ts.pickMotif('coffee shop'), pickMotif('coffee shop'));
});

test('scenes: the kit covers every motif, with a real box, a size, a pose, a ground and a companion', () => {
  const src = read('components/ui/data/art-panel/art-panel.ts');
  const rows = /export const SCENE_KIT = `([^`]*)`/.exec(src)[1].trim().split('\n').map((l) => l.trim().split(/\s+/));
  const motifs = loadMotifs();
  assert.deepEqual(rows.map((r) => r[0]).sort(), Object.keys(motifs).sort());
  for (const [n, x0, y0, x1, y1, size, pose, ground, w] of rows) {
    assert.ok(+x0 >= 0 && +x1 <= 160 && +x0 < +x1 && +y0 < +y1 && +y1 <= 160, `${n} box`);
    assert.ok(['1', '2', '3'].includes(size), `${n} size`);
    assert.ok(['stand', 'float'].includes(pose), `${n} pose`);
    assert.ok(['counter', 'line', 'water', 'road'].includes(ground), `${n} ground`);
    assert.ok(motifs[w] && w !== n, `${n} companion ${w}`);
  }
  // A floating thing's companion stands, so a one-word brief always puts something on the ground.
  for (const [n, , , , , , pose, , w] of rows) if (pose === 'float') assert.equal(rows.find((r) => r[0] === w)[6], 'stand', `${n} → ${w}`);
});

test('scenes: picked from the brief, the subject first, never only floating things', () => {
  assert.deepEqual(pickScene('Bag of Huila beans on a wooden counter'), ['bag', 'cup']);
  assert.deepEqual(pickScene('construction site'), ['crane', 'house']);
  assert.deepEqual(pickScene('coffee shop'), ['cup', 'bag']);
  assert.equal(pickScene('quiet abstract feeling'), null);
  const kit = Object.fromEntries(/export const SCENE_KIT = `([^`]*)`/.exec(read('components/ui/data/art-panel/art-panel.ts'))[1].trim().split('\n').map((l) => { const r = l.trim().split(/\s+/); return [r[0], r[6]]; }));
  for (const b of BRIEFS) {
    const s = pickScene(b);
    if (!s) continue;
    assert.ok(s.length >= 2 && s.length <= 3, `${b}: ${s}`);
    assert.equal(new Set(s).size, s.length, `${b}: no repeats`);
    assert.equal(s[0], pickMotif(b), `${b}: the subject leads`);
    assert.ok(s.some((n) => kit[n] === 'stand'), `${b}: something stands (${s})`);
  }
});

test('scenes: tokens only, one accent, one line weight at every scale', () => {
  for (const s of ['cup bag', 'crane house', 'bag cup jar', 'tooth calendar stethoscope', 'boat mountain', 'van box']) {
    const svg = sceneSvg(s);
    assert.match(svg, /^<svg data-part="scene" viewBox="[-\d.]+ \d+ [\d.]+ \d+" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">/);
    assert.doesNotMatch(svg, /#[0-9a-f]{3,6}\b|rgb\(|oklch\(|stroke-width=|fill="(?!none)/i, s);
    assert.equal((svg.match(/data-role="lead"/g) ?? []).length, 1, `${s}: one subject in the accent`);
    // Each placed thing divides the stroke by its own scale, so lines match across sizes.
    for (const g of svg.matchAll(/<g data-role="\w+" transform="translate\([-\d.]+ [-\d.]+\) scale\(([\d.]+)\)" style="--k:([\d.]+)">/g)) assert.equal(g[1], g[2], s);
  }
  assert.equal(sceneSvg('nothing here'), '');
  assert.equal(sceneSvg('cup cup cup'), sceneSvg('cup'), 'repeats are dropped');
  const css = strip(read('components/ui/data/art-panel/art-panel.css'));
  assert.match(css, /\[data-part="scene"\] :is\(\[data-m="ink"\], \[data-m="sil"\]\) \{[^}]*stroke-width: calc\(var\(--motif-stroke, 3\) \/ var\(--k, 1\)\)/);
  assert.match(css, /\[data-part="scene"\] \[data-role="rest"\] \[data-m="a"\] \{ fill: var\(--mr\); \}/, 'only the subject is in the accent');
});

test('the drawing\'s line follows the type pairing: heavy for slab, stencil and stadium, fine for didone, legal and editorial', () => {
  const css = strip(read('components/ui/data/art-panel/art-panel.css'));
  const ids = JSON.parse(read('tokens/typography/source.json')).pairings.map((p) => p.id);
  const weight = {};
  for (const m of css.matchAll(/:where\(([^)]*(?:\([^)]*\)[^)]*)*)\) \{ --motif-stroke: ([\d.]+); \}/g)) for (const id of m[1].matchAll(/data-type="([a-z-]+)"/g)) weight[id[1]] = +m[2];
  assert.deepEqual(ids.filter((id) => !(id in weight)), [], 'every pairing has a weight');
  for (const id of ['slab', 'stencil', 'stadium', 'stamped']) assert.ok(weight[id] >= 4, `${id} ${weight[id]}`);
  for (const id of ['didone', 'legal', 'editorial', 'bookish']) assert.ok(weight[id] <= 2.25, `${id} ${weight[id]}`);
  for (const id of ids) assert.ok(weight[id] >= 2 && weight[id] <= 4.5, `${id} stays within one family of weights`);
});

test('micro-interactions: tokens, and every one of them still under reduced motion and the profile\'s reduced', () => {
  const css = strip(read('tokens/scroll.css'));
  const tokens = ['--press-settle', '--dur-press', '--dur-release', '--ease-release', '--dur-toggle', '--ease-overshoot', '--press-stretch', '--dur-draw', '--delay-draw', '--dur-shake', '--shake-x', '--dur-confirm'];
  const rootBlock = /:root \{\s*--press-settle[^}]*\}/.exec(css)[0];
  for (const t of tokens) assert.match(rootBlock, new RegExp(`${t}:`), t);
  const reduced = /@media \(prefers-reduced-motion: reduce\) \{\s*:root \{ --press-settle[^}]*\}/.exec(css)[0];
  const profile = /\[data-motion="reduced"\] \{ --press-settle[^}]*\}/.exec(css)[0];
  for (const block of [reduced, profile]) {
    for (const t of ['--press-settle: 0px', '--shake-x: 0px', '--press-stretch: 1', '--dur-release: 1ms', '--dur-toggle: 1ms', '--dur-draw: 1ms', '--dur-shake: 1ms', '--ease-release: linear', '--ease-overshoot: linear']) assert.ok(block.includes(t), `${t} in ${block.slice(0, 30)}`);
  }
  // The keyframes move transform and opacity only.
  for (const name of ['lt-shake', 'lt-arrive', 'lt-roll-in']) {
    const body = new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\}\\s*\\}`).exec(css)[1];
    for (const p of body.matchAll(/([a-z-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(p[1]), `${name}: ${p[1]}`);
  }
});

test('micro-interactions: controls settle by transform, never scale up on hover, and animate only when motion is allowed', () => {
  const btn = strip(read('components/ui/controls/button/button.css'));
  assert.match(btn, /:scope:is\(:active, \[data-pressing\]\)[^{]*\{[^}]*transform: translateY\(var\(--press-settle, 1\.5px\)\)/);
  assert.doesNotMatch(/:scope:hover \{[^}]*\}/.exec(btn)[0], /scale|transform|translate/, 'hover changes the fill only');
  assert.doesNotMatch(btn, /scale: var\(--press-scale\)/, 'a pressed button sinks, it does not shrink');
  const sw = strip(read('components/ui/controls/toggle-switch/toggle-switch.css'));
  assert.match(sw, /transition: transform var\(--dur-toggle, 320ms\) var\(--ease-overshoot/);
  assert.doesNotMatch(sw, /width var\(/, 'the thumb stretches by scale, not width');
  const cb = strip(read('components/ui/controls/checkbox/checkbox.css'));
  assert.match(cb, /input:checked \+ \[data-part="box"\] \[data-part="tick"\] \{ transition: stroke-dashoffset var\(--dur-draw, 240ms\) var\(--ease-out\) var\(--delay-draw, 50ms\); \}/);
  for (const f of ['components/ui/controls/text-field/text-field.css', 'components/ui/controls/copy-button/copy-button.css']) {
    const src = strip(read(f));
    for (const m of src.matchAll(/animation:\s*lt-(shake|arrive|roll-in)/g)) {
      const before = src.slice(0, m.index);
      assert.ok(before.lastIndexOf('@media (prefers-reduced-motion: no-preference)') > before.lastIndexOf('}\n  }'), `${f}: ${m[0]} only with motion allowed`);
    }
  }
  const tf = read('components/ui/controls/text-field/text-field.ts');
  assert.match(tf, /on\(input, 'input', \(\) => \{ if \(field\.dataset\.state\) validate\(field\); \}\)/, 'no shake while typing');
  assert.match(tf, /validate\(f, true\)/, 'a failed submit shakes');
});

test('gallery: Moments and Before / after are in the nav and in the audit', () => {
  const index = read('preview/index.html');
  assert.match(index, /href="#\/moments" data-route="moments"/);
  assert.match(index, /href="#\/before-after" data-route="before-after"/);
  const audit = read('scripts/audit-all.mjs');
  assert.match(audit, /`\$\{base\}#\/moments`/);
  assert.match(audit, /`\$\{base\}#\/before-after`/);
  assert.match(audit, /const PENDING = \[\];/);
  // The "before" side never names a real brand or loads anything from outside.
  const content = read('preview/stage-content.ts');
  const before = /const BEFORE: Record<string, string> = \{([\s\S]*?)\n\};/.exec(content)[1];
  assert.doesNotMatch(before, /https?:|<img|src=/, 'no outside pictures');
});
