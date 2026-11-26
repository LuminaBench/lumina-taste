// SKILL.md is what an agent reads first: keep its front matter valid and its counts true.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));

test('front matter has a name and a description of at most 1024 characters', () => {
  const fm = skill.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fm, 'front matter');
  assert.match(fm[1], /^name: lumina-taste$/m);
  const desc = fm[1].match(/^description: (.+)$/m)?.[1] ?? '';
  assert.ok(desc.length > 200, 'description says what the skill is for');
  assert.ok(desc.length <= 1024, `description is ${desc.length} characters`);
});

test('the counts in SKILL.md match catalog.json', () => {
  const { ui, charts, blueprints, palettes, typography, styles } = catalog.counts;
  for (const [n, what] of [[ui, 'named UI patterns'], [charts, 'chart engines'], [blueprints, 'page blueprints'], [palettes, 'OKLCH palettes'], [typography, 'type pairings'], [styles, 'visual styles']]) {
    assert.ok(skill.includes(`**${n} ${what}`) || skill.includes(`${n} ${what}`), `SKILL.md should say ${n} ${what}`);
  }
  assert.ok(skill.includes(`${ui} patterns (html`), 'map line for patterns');
  assert.ok(skill.includes(`${charts} chart engines (+`), 'map line for charts');
  assert.ok(skill.includes(`${blueprints} page blueprints (states`), 'map line for blueprints');
});

test('every blueprint is in the Workflow E table', () => {
  for (const b of catalog.blueprints) assert.ok(skill.includes(`| \`${b.id}\` |`), `blueprint ${b.id} missing from the table`);
});

test('every reference and script named in the map exists', () => {
  const map = skill.slice(skill.indexOf('## Map'));
  const refs = map.match(/^references\/\s+(.+)$/m)[1].split(/,\s*/);
  for (const r of refs) assert.doesNotThrow(() => readFileSync(join(root, 'references', `${r.trim()}.md`)), `references/${r}.md`);
  const scripts = map.match(/^scripts\/\s+(.+)$/m)[1].split(/,\s*/);
  for (const s of scripts) assert.doesNotThrow(() => readFileSync(join(root, 'scripts', `${s.trim()}.mjs`)), `scripts/${s}.mjs`);
});
