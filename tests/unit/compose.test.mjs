// The page composer: every id it names exists, briefs land on the right page type, and the
// install command it prints actually runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const node = (args, cwd = root) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
const compose = (brief, ...extra) => JSON.parse(node([join(root, 'scripts/compose.mjs'), brief, '--json', ...extra]).stdout);

test('every id in the composer knowledge file exists in the catalog', () => {
  const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
  const cat = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  const has = (kind, id) => cat[kind].some((x) => x.id === id);
  for (const t of kb.pageTypes) {
    for (const s of t.sections) for (const id of [s.id, ...(s.alt ?? [])].filter(Boolean)) assert.ok(has('ui', id), `${t.id}: ${id}`);
    for (const c of t.charts ?? []) assert.ok(has('charts', c), `${t.id}: chart ${c}`);
    if (t.blueprint) assert.ok(has('blueprints', t.blueprint), `${t.id}: blueprint ${t.blueprint}`);
  }
  for (const d of kb.domains) {
    assert.ok(has('palettes', d.palette), d.id);
    assert.ok(has('typography', d.typography), d.id);
    if (d.style) assert.ok(has('styles', d.style), d.id);
  }
});

test('briefs land on the right page type and domain', () => {
  const cases = [
    ['landing page for an invoicing tool', 'landing', 'navy-sand'],
    ['pricing page for a meditation app', 'pricing', 'sage-clay'],
    ['admin users table for a devtool', 'admin-table', 'black-signal'],
    ['checkout for a coffee shop', 'checkout', 'cream-charcoal'],
    ['help center docs for our API', 'docs', 'black-signal'],
    ['analytics dashboard for a sales team', 'dashboard', null],
    ['release notes page', 'changelog', null],
    ['council permit application sign in', 'auth', 'ochre-indigo'],
  ];
  for (const [brief, type, palette] of cases) {
    const p = compose(brief);
    assert.equal(p.pageType.id, type, brief);
    if (palette) assert.equal(p.profile.palette, palette, brief);
  }
  assert.equal(compose('minimal portfolio for an architect').profile.style, 'minimal');
  assert.equal(compose('something nice').pageType.confident, false);
});

test('the printed install command runs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-compose-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}');
    const p = compose('analytics dashboard for a finance team', '--project', dir, '--framework', 'react');
    const argv = p.install.replace(/\\\n\s*/g, ' ').split(/\s+/).slice(2);
    const r = node([join(root, 'scripts/install-taste.mjs'), ...argv]);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const prof = JSON.parse(readFileSync(join(dir, 'taste-profile.json'), 'utf8'));
    assert.equal(prof.palette, 'navy-sand');
    assert.equal(prof.density, 'balanced');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a thin brief gets at most three questions, each with a default; a full brief gets fewer', () => {
  const thin = compose('landing page for an invoicing tool');
  assert.ok(thin.questions.length >= 2 && thin.questions.length <= 3);
  assert.deepEqual(thin.questions.map((q) => q.id).slice(0, 2), ['product', 'look']);
  for (const q of thin.questions) assert.ok(q.ask && q.why && q.default, q.id);
  const full = compose('dark terminal landing page for Relay, a webhooks API, sign up button');
  assert.deepEqual(full.questions, []);
  const restyle = compose('restyle our pricing page');
  assert.ok(restyle.questions.some((q) => q.id === 'keep'));
});

test('directions are three real styles, and a brief that says dark only gets dark ones', () => {
  const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
  const styles = JSON.parse(readFileSync(join(root, 'tokens/styles/source.json'), 'utf8')).styles;
  for (const [domain, ids] of Object.entries(kb.directions).filter(([k]) => !k.startsWith('$'))) {
    assert.equal(ids.length, 3, domain);
    assert.equal(new Set(ids).size, 3, domain);
    for (const id of ids) assert.ok(styles.some((s) => s.id === id), `${domain}: ${id}`);
  }
  const d = compose('dark landing page for a webhooks API').directions;
  assert.equal(d.styles.length, 3);
  assert.ok(d.styles.every((s) => s.mode === 'dark'));
  assert.match(d.command, /directions\.mjs/);
  assert.equal(compose('swiss landing page for a law firm').directions.styles[0].id, 'swiss');
});

test('directions.mjs writes one page with three themed frames that open from disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-directions-'));
  try {
    const r = node([join(root, 'scripts/directions.mjs'), 'landing page for Relay, a webhooks API for developers', '--out', dir]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /A {2}\w+/);
    const html = readFileSync(join(dir, 'directions.html'), 'utf8');
    assert.equal((html.match(/class="dir-frame"/g) ?? []).length, 3);
    assert.equal(new Set([...html.matchAll(/class="dir-frame"[^>]*data-style="([\w-]+)"/g)].map((m) => m[1])).size, 3);
    assert.ok(html.includes('Relay') && !html.includes('Halyard'), 'the brief\'s product name replaces the sample brand');
    assert.ok(existsSync(join(dir, 'lumina.css')) && existsSync(join(dir, 'lumina.js')));
    assert.ok(!/src="https?:|href="https?:/.test(html), 'no network requests');
    const bad = node([join(root, 'scripts/directions.mjs'), 'landing page', '--out', dir, '--styles', 'nope']);
    assert.equal(bad.status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
