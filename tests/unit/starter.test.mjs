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
    // A second page grows the site: its own file, linked from the first, both cross-fading between them.
    const c = spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), 'Copper Hare, a coffee shop at 21 Gillygate, York, phone 01904 600 100', '--type', 'contact', '--project', dir, '--write'], { encoding: 'utf8' });
    assert.equal(c.status, 0, c.stderr);
    const index = readFileSync(join(dir, 'index.html'), 'utf8'), contact = readFileSync(join(dir, 'contact.html'), 'utf8');
    assert.match(index, /<a href="contact\.html">Contact<\/a>/);
    assert.match(index, /<html [^>]*data-vt>/);
    assert.match(contact, /<html [^>]*data-vt>/);
    assert.match(contact, /href="index\.html"/);
    assert.match(contact, /lumina-taste\/page-contact\.css/);
    assert.match(index, /data-vt-name="lt-bar"/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an app starter is its own app: "settings" or "bookings" in the feature list never sends it elsewhere', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-starter-app-'));
  try {
    const r = spawnSync(process.execPath, [join(root, 'scripts/starter.mjs'), 'chat-app', 'Halyard Chat: conversations, people, settings', '--project', dir], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /- Page: index\.html \(messaging app \(phone\)/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an unknown kind or a missing project is a usage error', () => {
  const r = spawnSync(process.execPath, [join(root, 'scripts/starter.mjs'), 'spaceship', 'Anything'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Kinds: cafe, restaurant/);
});
