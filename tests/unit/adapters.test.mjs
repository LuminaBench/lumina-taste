// Token export for shadcn / Tailwind and the sniff round trip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const node = (args) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });

test('export-tokens writes shadcn, tailwind4, tailwind3 and json', () => {
  const sh = node([join(root, 'scripts/export-tokens.mjs'), '--format', 'shadcn', '--palette', 'navy-sand']).stdout;
  for (const v of ['--background:', '--primary:', '--ring:', '--chart-5:', '--radius:', '.dark {']) assert.ok(sh.includes(v), v);
  assert.match(sh, /--primary: oklch\(/);
  const t4 = node([join(root, 'scripts/export-tokens.mjs'), '--format', 'tailwind4', '--palette', 'slate-forest']).stdout;
  assert.match(t4, /@theme \{[\s\S]*--color-accent: oklch/);
  const t3 = node([join(root, 'scripts/export-tokens.mjs'), '--format', 'tailwind3']).stdout;
  assert.match(t3, /module\.exports = \{/);
  const js = JSON.parse(node([join(root, 'scripts/export-tokens.mjs'), '--format', 'json', '--palette', 'paper-ink']).stdout);
  assert.equal(js.palette, 'paper-ink');
  assert.ok(js.dark['accent-solid'].startsWith('oklch('));
  assert.equal(node([join(root, 'scripts/export-tokens.mjs'), '--palette', 'nope']).status, 2);
});

test('sniff recovers the profile a blueprint was built with', async () => {
  const server = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), '--port', '4433'], { stdio: 'ignore' });
  try {
    await new Promise((r) => setTimeout(r, 700));
    const r = node([join(root, 'scripts/sniff.mjs'), 'http://127.0.0.1:4433/blueprints/store/', '--json']);
    assert.equal(r.status, 0, r.stderr);
    const p = JSON.parse(r.stdout).profile;
    assert.equal(p.palette, 'cream-charcoal');
    assert.equal(p.typography, 'didone');
    assert.equal(p.mode, 'light');
  } finally { server.kill(); }
});
