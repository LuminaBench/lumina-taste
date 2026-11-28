// CSS rules that are easy to get wrong and hard to see in the gallery.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, out); else if (f.endsWith('.css')) out.push(p); } return out; };

test('a component never restyles its own root only inside its own container query', () => {
  // `@container (…) { :scope { … } }` only fires when some ancestor is a container (true in the gallery,
  // false on most pages), so every such rule needs an @media twin at the same width.
  const bad = [];
  for (const f of walk(join(root, 'components/ui'))) {
    const css = readFileSync(f, 'utf8');
    for (const m of css.matchAll(/@container \(max-width: (\d+)px\) \{ :scope \{/g)) {
      if (!css.includes(`@media (max-width: ${m[1]}px) { :scope {`)) bad.push(`${f.replace(root + '/', '')} (${m[1]}px)`);
    }
  }
  assert.deepEqual(bad, []);
});

test('every component that uses @container declares itself a container', () => {
  // Without container-type on the root, its queries look for an outer container and never fire on a plain page.
  const bad = [];
  for (const f of walk(join(root, 'components/ui'))) {
    const css = readFileSync(f, 'utf8');
    if (/@container\b/.test(css) && !/container-type\s*:|container\s*:/.test(css)) bad.push(f.replace(root + '/', ''));
  }
  assert.deepEqual(bad, []);
});

test('section blocks pad with --section-y, not fixed pixels', () => {
  for (const f of walk(join(root, 'components/ui/blocks'))) assert.ok(!/padding: 56px 40px/.test(readFileSync(f, 'utf8')), f);
});

test('a colour mix that names both shares adds up to 100%, or the colour turns see-through', () => {
  // color-mix(in oklab, a 70%, b 4%) is 74% opaque: a "solid" card lets what is under it show through.
  const share = String.raw`(?:[^,()]|\((?:[^()]|\([^()]*\))*\))+?`;
  const re = new RegExp(String.raw`color-mix\(in [a-z]+,\s*${share}\s+(\d+(?:\.\d+)?)%\s*,\s*${share}\s+(\d+(?:\.\d+)?)%\s*\)`, 'g');
  const bad = [];
  for (const dir of ['components', 'tokens', 'blueprints', 'preview']) {
    for (const f of walk(join(root, dir)).filter((p) => !p.includes('/dist/'))) {
      for (const m of readFileSync(f, 'utf8').matchAll(re)) if (Math.abs(Number(m[1]) + Number(m[2]) - 100) > 0.01) bad.push(`${f.replace(root + '/', '')}: ${m[0].slice(0, 90)}`);
    }
  }
  assert.deepEqual(bad, []);
});
