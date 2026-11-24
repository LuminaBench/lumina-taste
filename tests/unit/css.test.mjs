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

test('section blocks pad with --section-y, not fixed pixels', () => {
  for (const f of walk(join(root, 'components/ui/blocks'))) assert.ok(!/padding: 56px 40px/.test(readFileSync(f, 'utf8')), f);
});
