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

test('a page assembled from section blocks passes the taste critic with no warnings', () => {
  // What an agent does: static install with a typeface chosen for the page, paste snippets into <main>, add a tone band or two.
  // Picture-led blocks only: proof as one large quote, no steps in paragraphs (a grid of small quotes, or steps
  // told in sentences, is a section of words, which the critic reports as taste-no-visual).
  const dir = mkdtempSync(join(tmpdir(), 'lt-compose-page-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{}');
    const blocks = ['navbar-simple', 'hero-split', 'logo-cloud', 'feature-split', 'stats-band', 'quote-feature', 'pricing-tiers', 'faq-section', 'blog-grid', 'project-grid', 'code-block', 'cta-band', 'site-footer'];
    const r = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--dest', 'ui', '--framework', 'static', '--density', 'spacious', '--type', 'geometric', '--components', blocks.join(',')]);
    assert.equal(r.status, 0, r.stderr);
    const sn = (id) => readFileSync(join(dir, 'ui/snippets', `${id}.html`), 'utf8');
    const tone = (html) => html.replace('<section class="lt-', '<section data-tone="well" class="lt-');
    const rail = (html) => html.replace('<section class="lt-', '<section data-layout="rail" class="lt-');
    // A bare code figure (no tabs, no copy button) must not break the page script.
    const bare = '<section class="lt-band lt-container"><h2 class="lt-h3">Send an event</h2><figure class="lt-code" data-lt="code-block"><pre tabindex="0"><code>curl https://api.halyard.dev/v1/events -d name=signup</code></pre></figure></section>';
    const body = blocks.slice(1, -1).filter((b) => b !== 'code-block').map((b) => (b === 'stats-band' ? tone(sn(b)) : sn(b))).join('\n') + bare;
    writeFileSync(join(dir, 'index.html'), `<!doctype html><html lang="en" data-palette="slate-forest" data-mode="light" data-type="geometric" data-density="spacious" data-radius="balanced" data-motion="snappy"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Composed</title><link rel="stylesheet" href="ui/lumina.css"><script defer src="ui/lumina.js"></script></head><body>${sn(blocks[0])}<main>${body}</main>${sn(blocks.at(-1))}</body></html>`);
    const a = node([join(root, 'scripts/audit-ui.mjs'), join(dir, 'index.html'), '--taste', '--strict', '--modes', 'light']);
    assert.equal(a.status, 0, a.stdout);
    assert.match(a.stdout, /taste score 100\/100/);
    // The same page still carries the kit's sample brand: with a product name that is an error.
    const named = node([join(root, 'scripts/audit-ui.mjs'), join(dir, 'index.html'), '--product', 'Tally', '--viewports', 'desktop', '--modes', 'light']);
    assert.equal(named.status, 1);
    assert.match(named.stdout, /taste-sample-copy/);
    // So do its sample sentences and figures (brand swapped or not), and links to sections that are not there.
    assert.match(named.stdout, /taste-sample-content/);
    assert.match(named.stdout, /pieces of the kit's sample content are unchanged/);
    assert.match(named.stdout, /taste-dead-anchor/);
    assert.match(named.stdout, /2 errors −24/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('audit-ui flags every slop rule on the fixture', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'lt-audit-')), 'r.json');
  const r = node([join(root, 'scripts/audit-ui.mjs'), join(root, 'tests/fixtures/slop.html'), '--viewports', 'desktop', '--modes', 'light', '--json', out, '--quiet']);
  assert.equal(r.status, 1);
  const rules = new Set(JSON.parse(readFileSync(out, 'utf8')).report[0].findings.map((f) => f.rule));
  for (const rule of ['overflow', 'clipped-text', 'overlap', 'contrast', 'tabular-nums', 'slop-gradient', 'slop-gradient-text', 'slop-shadow', 'slop-emoji', 'slop-copy', 'dead-control', 'focus-visible']) assert.ok(rules.has(rule), rule);
});

test('audit-ui reads plain rgb() colours: black text passes, translucent text fails', () => {
  const out = join(tmpdir(), `lt-plain-${process.pid}.json`);
  node([join(root, 'scripts/audit-ui.mjs'), join(root, 'tests/fixtures/plain-colours.html'), '--viewports', 'desktop', '--modes', 'light', '--json', out, '--quiet']);
  const contrast = JSON.parse(readFileSync(out, 'utf8')).report[0].findings.filter((f) => f.rule === 'contrast').map((f) => f.message);
  rmSync(out, { force: true });
  assert.equal(contrast.length, 2, contrast.join(' | '));
  assert.ok(contrast.every((m) => /Thirty percent black/.test(m)), contrast.join(' | '));
});

test('audit-ui --taste names composition faults: a wall of cards, an off edge, a stranded word, flooded accent', () => {
  const out = join(tmpdir(), `lt-composition-${process.pid}.json`);
  node([join(root, 'scripts/audit-ui.mjs'), join(root, 'tests/fixtures/composition.html'), '--taste', '--viewports', 'desktop', '--modes', 'light', '--json', out, '--quiet']);
  const rules = new Set(JSON.parse(readFileSync(out, 'utf8')).report[0].findings.map((f) => f.rule));
  rmSync(out, { force: true });
  for (const rule of ['taste-monotony', 'taste-edge', 'taste-widow', 'taste-accent-budget', 'taste-heading-break', 'taste-headline-length', 'taste-text-wall']) assert.ok(rules.has(rule), rule);
});

test('a single blueprint installs flat, lean and labelled as sample content; an existing page is kept', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-flat-'));
  try {
    const r = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'static', '--palette', 'graphite-violet', '--mode', 'dark', '--style', 'lucid', '--blueprints', 'agent']);
    assert.equal(r.status, 0, r.stderr);
    for (const f of ['index.html', 'main.css', 'main.js', 'taste-profile.json']) assert.ok(existsSync(join(dir, f)), f);
    const css = readFileSync(join(dir, 'main.css'), 'utf8');
    assert.ok(/\[data-palette="?graphite-violet"?\]/.test(css) && !/\[data-palette="?cream-charcoal"?\]/.test(css), 'one palette');
    assert.ok(/\[data-style="?lucid"?\]/.test(css) && !/\[data-style="?neobrutal"?\]/.test(css), 'one style');
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /content="TODO: one sentence/);
    assert.match(html, /lumina-taste blueprint: agent/);
    const again = mkdtempSync(join(tmpdir(), 'lt-flat2-'));
    writeFileSync(join(again, 'index.html'), '<p>mine</p>');
    const r2 = node([join(root, 'scripts/install-taste.mjs'), '--project', again, '--framework', 'static', '--blueprints', 'mobile']);
    assert.match(r2.stdout, /already exists/);
    assert.equal(readFileSync(join(again, 'index.html'), 'utf8'), '<p>mine</p>');
    assert.ok(existsSync(join(again, 'mobile/index.html')));
    rmSync(again, { recursive: true, force: true });
  } finally { rmSync(dir, { recursive: true, force: true }); }
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

test('a blueprint draft carries the real name; the critic says where leftovers came from and spots the sample\'s links', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-name-'));
  try {
    const r = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'static', '--blueprints', 'practice', '--name', 'Harrow & Finch']);
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.ok(html.includes('Harrow &amp; Finch') && !html.includes('Kestrel Dental'));
    const a = node([join(root, 'scripts/audit-ui.mjs'), join(dir, 'index.html'), '--product', 'Harrow & Finch', '--viewports', 'desktop', '--modes', 'light']);
    assert.match(a.stdout, /taste-sample-content/);
    assert.match(a.stdout, /\(from the practice blueprint\)/);
    assert.match(a.stdout, /a link to (\/treatments\/|tel:|mailto:)/);
    // A question is the same question anywhere: only its answer counts as sample content.
    assert.doesNotMatch(a.stdout, /“Are you taking new patients\?”/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an unknown id names the closest real ones', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-near-'));
  try {
    const r = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'static', '--components', 'status-badge,date-pick']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /status-badge → badge/);
    assert.match(r.stderr + r.stdout, /date-pick → date-picker/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('audit-ui --taste names the looks models fall back on, and accepts one the page gives a reason for', () => {
  const rules = (f) => {
    const out = join(tmpdir(), `lt-ai-${process.pid}-${f}.json`);
    node([join(root, 'scripts/audit-ui.mjs'), join(root, `tests/fixtures/${f}.html`), '--taste', '--viewports', 'desktop', '--modes', 'light', '--json', out, '--quiet']);
    const r = new Set(JSON.parse(readFileSync(out, 'utf8')).report[0].findings.map((x) => x.rule));
    rmSync(out, { force: true });
    return r;
  };
  const saas = rules('ai-default-saas');
  for (const rule of ['taste-default-look', 'taste-default-font', 'taste-icon-tiles', 'taste-hover-scale', 'taste-invented-stat', 'taste-stock-face']) assert.ok(saas.has(rule), rule);
  assert.ok(rules('ai-default-cream').has('taste-default-look'), 'cream, a book serif and terracotta');
  assert.ok(!rules('ai-default-cream-chosen').has('taste-default-look'), 'data-look-reason accepts a chosen look');
  const sheet = rules('broadsheet');
  for (const rule of ['taste-label-every-section', 'taste-hairlines']) assert.ok(sheet.has(rule), rule);
});

test('a second install keeps the parts already there and re-themes the kit page, palette included', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-rerun-'));
  try {
    node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'static', '--blueprints', 'venue', '--palette', 'forest-brass']);
    const r = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'static', '--palette', 'petrol-peach', '--type', 'slab']);
    assert.match(r.stdout, /Re-themed index\.html/);
    assert.match(readFileSync(join(dir, 'index.html'), 'utf8'), /data-palette="petrol-peach"[^>]*data-type="slab"/);
    assert.match(readFileSync(join(dir, 'main.css'), 'utf8'), /\[data-palette="?petrol-peach"?\]/);
    node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'static', '--components', 'contact-section']);
    const again = node([join(root, 'scripts/install-taste.mjs'), '--project', dir, '--framework', 'static', '--components', 'button']);
    assert.match(again.stdout, /Kept \d+ part/);
    assert.match(readFileSync(join(dir, 'lumina-taste/lumina.css'), 'utf8'), /lt-contact/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

