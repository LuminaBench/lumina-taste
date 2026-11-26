// What real builds found in the generated Next.js and Tailwind files (next build 16 with TypeScript 7, the
// Tailwind v4 CLI), kept as unit tests so the generators do not regress. No network, no framework installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlToJsx } from '../../engine/compose/jsx.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const install = (dir, args) => spawnSync(process.execPath, [join(root, 'scripts/install-taste.mjs'), '--project', dir, ...args], { encoding: 'utf8' });

test('a select keeps its chosen option as defaultValue (React ignores selected on the option)', () => {
  assert.equal(htmlToJsx('<select id="t" name="time"><option>10:30</option><option selected>12:00</option></select>'),
    '<select id="t" name="time" defaultValue="12:00"><option>10:30</option><option>12:00</option></select>');
  assert.match(htmlToJsx('<select><option value="b2">Two</option><option value="c3" selected>Three</option></select>'), /defaultValue="c3"/);
  // Multiple selects and selects that already say their value are left alone.
  assert.doesNotMatch(htmlToJsx('<select multiple><option selected>a</option></select>'), /defaultValue/);
});

test('ARIA numbers are numbers, so a separator or a meter type-checks', () => {
  const out = htmlToJsx('<div role="separator" aria-valuenow="40" aria-valuemin="0" aria-valuemax="62.5" aria-label="Width"></div>');
  assert.match(out, /aria-valuenow=\{40\} aria-valuemin=\{0\} aria-valuemax=\{62\.5\} aria-label="Width"/);
});

test('text with < and > is escaped, and comments survive a > inside them', () => {
  assert.equal(htmlToJsx('<p>where a >= 1 and b < 2</p>'), '<p>where a &gt;= 1 and b &lt; 2</p>');
  assert.equal(htmlToJsx('<p>x<!-- a > b --></p>'), '<p>x{/* a > b */}</p>');
});

test('code blocks keep their line breaks and indentation', () => {
  const out = htmlToJsx('<pre><code><span class="k">select</span> *\n  from t\n where a &lt; 2 {x}</code></pre>');
  assert.equal(out, '<pre><code><span className="k">{"select"}</span>{" *\\n  from t\\n where a < 2 {x}"}</code></pre>');
});

test('a Next.js blueprint page brings its own script: charts, states and page behaviour', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-next-page-'));
  try {
    const r = install(dir, ['--framework', 'next', '--blueprints', 'settings']);
    assert.equal(r.status, 0, r.stderr);
    const main = readFileSync(join(dir, 'lumina-taste/blueprints/settings/main.ts'), 'utf8');
    assert.doesNotMatch(main, /^import\s+['"][^'"]+\.css['"]/m, 'styles come from app/globals.css');
    assert.match(main, /from '\.\.\/_shared\/boot'/);
    const boot = readFileSync(join(dir, 'lumina-taste/blueprints/_shared/boot.ts'), 'utf8');
    assert.match(boot, /autoEnhance\(document, registry\)/);
    assert.doesNotMatch(boot, /import\s+['"][^'"]+\.css|localStorage\./, 'no tokens and no gallery theme in the app');
    // Everything the script imports is installed.
    for (const m of main.matchAll(/from '(\.\.\/\.\.\/[^']+)'/g)) {
      const base = join(dir, 'lumina-taste/blueprints/settings', m[1]);
      assert.ok(['.ts', '.tsx', '/index.ts'].some((x) => existsSync(base + x)) || existsSync(base), m[1]);
    }
    const enhance = readFileSync(join(dir, 'app/lumina-enhance.tsx'), 'utf8');
    assert.match(enhance, /import\('\.\.\/lumina-taste\/blueprints\/settings\/main'\)/);
    // A part the script creates (the toast stack) has no markup on the page, so its styles come from the script's imports.
    assert.match(readFileSync(join(dir, 'app/globals.css'), 'utf8'), /toast-stack\/toast-stack\.css/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Tailwind gets theme and utilities without Preflight, which would strip the kit\'s defaults', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-tw-real-'));
  try {
    const r = install(dir, ['--framework', 'tailwind', '--components', 'faq-section']);
    assert.equal(r.status, 0, r.stderr);
    const css = readFileSync(join(dir, 'lumina-taste/tailwind.css'), 'utf8');
    assert.doesNotMatch(css, /^@import "tailwindcss";$/m);
    assert.match(css, /^@layer theme, base, components, utilities;\n@import "tailwindcss\/theme\.css" layer\(theme\);\n@import "tailwindcss\/utilities\.css" layer\(utilities\);\n@import "\.\/lumina\.css";$/m);
    assert.match(css, /tailwindcss\/preflight\.css/, 'says how to opt back in');
    assert.match(css, /@custom-variant dark \(&:where\(\[data-mode="dark"\]/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a first Next.js blueprint install takes the blueprint\'s own look; flags and an existing profile still win', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-next-theme-'));
  try {
    assert.equal(install(dir, ['--framework', 'next', '--blueprints', 'venue']).status, 0);
    const p = JSON.parse(readFileSync(join(dir, 'taste-profile.json'), 'utf8'));
    assert.deepEqual([p.palette, p.typography, p.density], ['forest-brass', 'stamped', 'spacious'], 'the venue blueprint\'s theme, not precision');
    assert.match(readFileSync(join(dir, 'app/layout.tsx'), 'utf8'), /data-type="stamped"/);
    assert.equal(install(dir, ['--framework', 'next', '--blueprints', 'practice']).status, 0);
    assert.equal(JSON.parse(readFileSync(join(dir, 'taste-profile.json'), 'utf8')).typography, 'stamped', 'an existing profile is kept');
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const dir2 = mkdtempSync(join(tmpdir(), 'lt-next-theme-'));
  try {
    assert.equal(install(dir2, ['--framework', 'next', '--blueprints', 'practice', '--type', 'legal']).status, 0);
    const p = JSON.parse(readFileSync(join(dir2, 'taste-profile.json'), 'utf8'));
    assert.equal(p.typography, 'legal');
    assert.equal(p.density, 'spacious', 'other axes still come from the blueprint');
  } finally { rmSync(dir2, { recursive: true, force: true }); }
});

test('the install writes the pairing\'s fallback faces and the fonts line says to link them after the Google link', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-fallbacks-'));
  try {
    const r = install(dir, ['--framework', 'static', '--components', 'faq-section', '--type', 'stamped']);
    assert.equal(r.status, 0, r.stderr);
    const css = readFileSync(join(dir, 'lumina-taste/font-fallbacks.css'), 'utf8');
    for (const fam of ['Bitter', 'Work Sans', 'Courier Prime']) assert.match(css, new RegExp(`font-family: "${fam} Fallback";`));
    assert.doesNotMatch(css, /"Inter Fallback"/, 'only this pairing\'s families');
    assert.match(r.stdout, /fonts\.googleapis\.com[^\n]*\n\s+and after it <link rel="stylesheet" href="lumina-taste\/font-fallbacks\.css">/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
