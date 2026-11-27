// A finished starting point in one command: the page, the brand kit and one checklist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('a café starter writes the page, a brand kit and a checklist that asks only for what the brief left out', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-starter-'));
  try {
    const r = spawnSync(process.execPath, [join(root, 'scripts/starter.mjs'), 'cafe', 'Copper Hare, a coffee shop at 21 Gillygate, York, open Monday to Friday 7:30 to 5, flat white £3.40, cinnamon buns £3.20', '--project', dir], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    for (const f of ['index.html', 'STARTER.md', 'brand/brand.json', 'brand/favicon.svg']) assert.ok(existsSync(join(dir, f)), f);
    const md = readFileSync(join(dir, 'STARTER.md'), 'utf8');
    assert.match(md, /# Copper Hare starter \(cafe\)/);
    assert.match(md, /- Page: index\.html \(place or venue/);
    assert.doesNotMatch(md, /the address/, 'the brief gave the address');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an unknown kind or a missing project is a usage error', () => {
  const r = spawnSync(process.execPath, [join(root, 'scripts/starter.mjs'), 'spaceship', 'Anything'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Kinds: cafe, restaurant/);
});
