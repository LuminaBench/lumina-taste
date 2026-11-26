// The lean skill package (pack-skill.mjs) works on its own, and eval history records and trends runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTRY_SCRIPTS, resolveScripts } from '../../scripts/pack-skill.mjs';
import { agentTable, append, briefTable, rowsFrom } from '../../scripts/eval-history.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const node = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8', env: { ...process.env, NODE_PATH: '' } });

test('the script resolver follows imports and spawned scripts, and drops dev-only ones', () => {
  const { scripts, missing } = resolveScripts();
  assert.deepEqual(missing, []);
  for (const s of ENTRY_SCRIPTS) assert.ok(scripts.includes(s), s);
  for (const lib of ['scripts/lib/search-core.mjs', 'scripts/lib/art-direction.mjs', 'scripts/lib/copy-rules.mjs', 'scripts/lib/font-metrics.mjs', 'scripts/lib/webfont.mjs', 'scripts/lib/color.mjs', 'scripts/lib/contrast-rules.mjs']) assert.ok(scripts.includes(lib), lib);
  for (const dev of ['scripts/serve.mjs', 'scripts/build.mjs', 'scripts/build-tokens.mjs', 'scripts/build-catalog.mjs', 'scripts/eval-run.mjs', 'scripts/pack-skill.mjs']) assert.ok(!scripts.includes(dev), dev);
  // Every relative module import of every packed script resolves inside the packed set.
  for (const s of scripts) {
    const src = readFileSync(join(root, s), 'utf8');
    for (const m of src.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"$]+\.m?js)['"]/g)) {
      const target = join(dirname(s), m[1]);
      if (target.startsWith('scripts/')) assert.ok(scripts.includes(target), `${s} imports ${target}`);
    }
  }
});

test('a packed copy is lean and runs compose, install-taste --dry-run, search and fonts from its own folder', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lt-pack-'));
  const out = join(tmp, 'lumina-taste');
  try {
    const r = node([join(root, 'scripts/pack-skill.mjs'), '--out', out, '--zip'], root);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /before: [\d.]+ (MB|KB) in \d+ files/);
    assert.match(r.stdout, /after: {2}[\d.]+ (MB|KB) in \d+ files \(\d+% smaller\)/);
    const top = readdirSync(out).sort();
    assert.deepEqual(top, ['LICENSE', 'SKILL.md', 'blueprints', 'catalog.json', 'components', 'engine', 'evals', 'package.json', 'references', 'scripts', 'tokens']);
    for (const gone of ['tests', 'preview', 'qa', 'package-lock.json', 'tsconfig.json', 'node_modules', 'evals/runs', 'evals/history.json', 'scripts/serve.mjs', 'scripts/build-tokens.mjs']) assert.ok(!existsSync(join(out, gone)), `${gone} left out`);
    const pkg = JSON.parse(readFileSync(join(out, 'package.json'), 'utf8'));
    assert.equal(pkg.type, 'module');
    assert.ok(!pkg.devDependencies && !pkg.dependencies);
    if (spawnSync('zip', ['-v'], { stdio: 'ignore' }).status === 0) assert.ok(existsSync(`${out}.zip`), 'zip written');

    // Run the packed scripts from inside the packed folder, with a project folder of their own.
    const project = join(tmp, 'project');
    const c = node([join(out, 'scripts/compose.mjs'), 'a landing page for a ceramics studio', '--json'], out);
    assert.equal(c.status, 0, c.stderr);
    assert.ok(JSON.parse(c.stdout).pageType.id);
    const s = node([join(out, 'scripts/search.mjs'), 'rotating arrow', '--json', '--limit', '1'], out);
    assert.equal(s.status, 0, s.stderr);
    assert.equal(JSON.parse(s.stdout)[0].id, 'disclosure-chevron');
    const i = node(['scripts/install-taste.mjs', '--project', project, '--type', 'signage', '--components', 'accordion', '--dry-run'], out);
    assert.equal(i.status, 0, i.stderr);
    assert.ok(!existsSync(join(project, 'taste-profile.json')), 'dry run writes nothing');
    const f = node(['scripts/fonts.mjs', '--pairing', 'stencil', '--dry-run'], out);
    assert.equal(f.status, 0, f.stderr);
    assert.match(f.stdout, /Big\+Shoulders/);
    const l = node(['scripts/lint-copy.mjs', 'SKILL.md'], out);
    assert.equal(l.status, 0, l.stdout + l.stderr);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('pack-skill refuses to overwrite a folder with something in it unless told to', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lt-pack-'));
  try {
    writeFileSync(join(tmp, 'keep.txt'), 'x');
    const r = node([join(root, 'scripts/pack-skill.mjs'), '--out', tmp], root);
    assert.equal(r.status, 2);
    assert.ok(existsSync(join(tmp, 'keep.txt')));
    assert.equal(node([join(root, 'scripts/pack-skill.mjs'), '--out', root], root).status, 2);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

// ------------------------------------------------------------------ eval history
const summary = (generated, totals) => ({ generated, mean: 0, results: Object.entries(totals).map(([slug, total]) => ({ slug, total, audit: { errors: total > 90 ? 0 : 1, warnings: 0, score: 100 }, taste: total - 2, checks: { passed: 5, total: 5, failed: [], score: 100 }, hygiene: { copy: 0, hex: 0, score: 100 } })) });

test('eval history keeps one row per brief per run, replaces a re-scored run and shows trends per agent and brief', () => {
  let h = { version: 1, runs: [] };
  h = append(h, rowsFrom(summary('2026-11-20T09:00:00Z', { 'saas-landing-invoicing': 84, 'pricing-dev-api': 90 }), { label: 'agent-a', date: '2026-11-20', skillCommit: 'abc1234', run: 'r1' }));
  h = append(h, rowsFrom(summary('2026-11-25T09:00:00Z', { 'saas-landing-invoicing': 93, 'pricing-dev-api': 95 }), { label: 'agent-a', date: '2026-11-25', skillCommit: 'def5678', run: 'r2' }));
  h = append(h, rowsFrom(summary('2026-11-25T10:00:00Z', { 'saas-landing-invoicing': 80 }), { label: 'agent-b', date: '2026-11-25', skillCommit: 'def5678', run: 'r3' }));
  // Re-scoring run r3 replaces its rows.
  h = append(h, rowsFrom(summary('2026-11-25T10:00:00Z', { 'saas-landing-invoicing': 82 }), { label: 'agent-b', date: '2026-11-25', skillCommit: 'def5678', run: 'r3' }));
  assert.equal(h.runs.length, 5);
  const row = h.runs.find((r) => r.agent === 'agent-a' && r.run === 'r2' && r.brief === 'pricing-dev-api');
  assert.deepEqual(Object.keys(row), ['date', 'agent', 'brief', 'score', 'sub', 'commit', 'run']);
  assert.deepEqual(row.sub, { audit: 100, errors: 0, taste: 93, checks: 100, hygiene: 100 });
  const at = agentTable(h.runs);
  assert.match(at, /agent-a\n[^\n]+\n {2}2026-11-20 +abc1234 +2 +87 /);
  assert.match(at, /2026-11-25 +def5678 +2 +94 ↑7 /);
  assert.match(at, /agent-b\n[^\n]+\n {2}2026-11-25 +def5678 +1 +82 /);
  const bt = briefTable(h.runs);
  assert.match(bt, /saas-landing-invoicing +93 ↑9 +82/);
});

test('eval-history CLI records a scores.json under a label and prints both tables', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lt-hist-'));
  try {
    const run = join(tmp, 'run');
    spawnSync('mkdir', ['-p', run]);
    writeFileSync(join(run, 'scores.json'), JSON.stringify(summary('2026-11-26T08:00:00Z', { 'saas-landing-invoicing': 91 })));
    const file = join(tmp, 'history.json');
    let r = node([join(root, 'scripts/eval-history.mjs'), '--file', file, '--add', run, '--label', 'agent-c'], root);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Recorded 1 briefs for agent-c \(mean 91\)/);
    assert.match(r.stdout, /By agent[\s\S]*agent-c[\s\S]*By brief[\s\S]*saas-landing-invoicing +91/);
    const h = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(h.runs[0].date, '2026-11-26');
    assert.equal(h.runs[0].agent, 'agent-c');
    assert.ok('commit' in h.runs[0]);
    r = node([join(root, 'scripts/eval-history.mjs'), '--file', file, '--add', run, '--label', 'not ok!'], root);
    assert.equal(r.status, 2);
    r = node([join(root, 'scripts/eval-run.mjs'), '--agent', 'true', '--label', 'bad label'], root);
    assert.equal(r.status, 2, 'eval-run checks the label before running any agent');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
