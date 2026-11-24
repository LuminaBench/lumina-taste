import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const node = (args, cwd = root) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });

test('search resolves sloppy aliases to the right pattern', () => {
  for (const [q, id] of [['rotating arrow', 'disclosure-chevron'], ['9 dots menu', 'waffle-launcher'], ['bar when ticking rows', 'bulk-action-bar'], ['chart with long labels', 'horizontal-bar-chart'], ['stock price candles', 'candlestick-chart'], ['login page with code', 'auth']]) {
    const out = JSON.parse(execFileSync(process.execPath, [join(root, 'scripts/search.mjs'), q, '--json', '--limit', '1'], { encoding: 'utf8' }));
    assert.equal(out[0].id, id, q);
  }
});

test('installer copies only what is asked, keeps locks, rejects contrast-breaking overrides', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-install-'));
  try {
    let r = node([join(root, 'scripts/install-taste.mjs'), '--palette', 'navy-sand', '--components', 'accordion', '--lock', 'palette'], dir);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, 'lumina-taste/components/ui/controls/accordion/accordion.ts')));
    assert.ok(!existsSync(join(dir, 'lumina-taste/components/ui/controls/combobox')));
    assert.ok(!existsSync(join(dir, 'lumina-taste/tokens/palettes/mono-lime.css')));
    r = node([join(root, 'scripts/install-taste.mjs'), '--palette', 'mono-lime', '--density', 'dense'], dir);
    assert.equal(r.status, 3);
    const p = JSON.parse(readFileSync(join(dir, 'taste-profile.json'), 'utf8'));
    assert.equal(p.palette, 'navy-sand');
    assert.equal(p.density, 'dense');
    r = node([join(root, 'scripts/install-taste.mjs'), '--override', 'accent-solid=oklch(0.95 0.05 80)'], dir);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /breaks contrast/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('static install bundles css, js and snippets that work without a build step', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-static-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{}');
    const r = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--dest', 'ui', '--framework', 'static', '--components', 'accordion,toggle-switch', '--charts', 'line-chart']);
    assert.equal(r.status, 0, r.stderr);
    const js = readFileSync(join(dir, 'ui/lumina.js'), 'utf8');
    assert.match(js, /var lumina=/);
    assert.match(readFileSync(join(dir, 'ui/lumina.css'), 'utf8'), /--accent-solid/);
    assert.ok(readFileSync(join(dir, 'ui/snippets/accordion.html'), 'utf8').includes('data-lt="accordion"'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('audit-ui flags every slop rule on the fixture', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'lt-audit-')), 'r.json');
  const r = node([join(root, 'scripts/audit-ui.mjs'), join(root, 'tests/fixtures/slop.html'), '--viewports', 'desktop', '--modes', 'light', '--json', out, '--quiet']);
  assert.equal(r.status, 1);
  const rules = new Set(JSON.parse(readFileSync(out, 'utf8')).report[0].findings.map((f) => f.rule));
  for (const rule of ['overflow', 'clipped-text', 'overlap', 'contrast', 'tabular-nums', 'slop-gradient', 'slop-gradient-text', 'slop-shadow', 'slop-emoji', 'slop-copy', 'dead-control', 'focus-visible']) assert.ok(rules.has(rule), rule);
});

test('audit-ui --taste flags every page-level rule on the taste fixture', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'lt-taste-')), 'r.json');
  const r = node([join(root, 'scripts/audit-ui.mjs'), join(root, 'tests/fixtures/taste.html'), '--taste', '--viewports', 'desktop', '--modes', 'light', '--json', out, '--quiet']);
  assert.equal(r.status, 1);
  const j = JSON.parse(readFileSync(out, 'utf8'));
  const rules = new Set(j.report[0].findings.map((f) => f.rule));
  for (const rule of ['taste-type-scale', 'taste-colour-count', 'taste-radius-mix', 'taste-primary-count', 'taste-measure', 'taste-heading-order', 'taste-nested-card', 'taste-rhythm', 'taste-focal', 'taste-placeholder', 'taste-empty-visual', 'taste-button-label']) assert.ok(rules.has(rule), rule);
  assert.ok(j.score < 40, `score ${j.score}`);
});

test('copy lint flags hype and passes plain sentences', () => {
  const bad = node([join(root, 'scripts/lint-copy.mjs'), 'Seamlessly unlock the power of your data!']);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /Seamlessly/);
  const ok = node([join(root, 'scripts/lint-copy.mjs'), 'Export any report to CSV in one click.']);
  assert.equal(ok.status, 0);
  const repo = node([join(root, 'scripts/lint-copy.mjs'), join(root, 'components'), join(root, 'blueprints'), join(root, 'SKILL.md'), join(root, 'references')]);
  assert.equal(repo.status, 0, repo.stdout);
});
