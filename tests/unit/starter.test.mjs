// A finished starting point in one command: the page, the brand kit and one checklist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
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
    // The welcome screen and the page's description are the app's own, not the blueprint's sample lines.
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /id="wl-h"[^>]*>Halyard Chat</);
    assert.match(html, /<p>Conversations, people and settings, in one app\.<\/p>/);
    assert.match(html, /<meta name="description" content="Halyard Chat: conversations, people and settings\.">/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a café to order from and a podcast player are their own apps, from a plain brief', () => {
  const type = (brief) => JSON.parse(spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), brief, '--json'], { encoding: 'utf8' }).stdout).pageType.id;
  assert.equal(type('Copper Hare café app to order ahead: menu, basket, collect'), 'app-ordering');
  assert.equal(type('Field Notes podcast app: library, episodes, player'), 'app-listening');
});

test('made-up records in the product picture pass the ship check; the same rows on the page itself do not', { timeout: 240000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-starter-sw-'));
  try {
    const r = spawnSync(process.execPath, [join(root, 'scripts/starter.mjs'), 'software', 'Larkspur, invoicing for small studios, send an invoice in a minute, £12 a month', '--project', dir], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(readFileSync(join(dir, 'STARTER.md'), 'utf8'), /product picture shows made-up records/);
    const audit = () => spawnSync(process.execPath, [join(root, 'scripts/audit-ui.mjs'), join(dir, 'index.html'), '--taste', '--product', 'Larkspur', '--viewports', 'desktop', '--modes', 'light'], { encoding: 'utf8' });
    const ok = audit();
    assert.equal(ok.status, 0, ok.stdout.split('\n').filter((l) => /✗|!/.test(l)).join('\n'));
    const page = readFileSync(join(dir, 'index.html'), 'utf8');
    writeFileSync(join(dir, 'index.html'), page.replace('</main>', '<section aria-label="Invoices"><table data-sample><tr><td>INV-1</td><td>Halyard</td></tr></table></section></main>'));
    const bad = audit();
    assert.notEqual(bad.status, 0);
    assert.match(bad.stdout, /taste-sample-rows/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a fresh install needs one package to draft: esbuild, and nothing else', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ['esbuild']);
  assert.ok(!pkg.devDependencies?.esbuild);
});

test('first run: with no node_modules the skill installs esbuild itself, says so, and drafts', { timeout: 240000 }, (t) => {
  if (process.env.LT_OFFLINE) return t.skip('offline');
  const dir = mkdtempSync(join(tmpdir(), 'lt-firstrun-'));
  try {
    // A copy of the skill with nothing installed, as `npx skills add` leaves it.
    const skill = join(dir, 'skill');
    const r0 = spawnSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
    for (const f of r0.stdout.split('\0').filter(Boolean)) { const to = join(skill, f); mkdirSync(dirname(to), { recursive: true }); copyFileSync(join(root, f), to); }
    const r = spawnSync(process.execPath, [join(skill, 'scripts/starter.mjs'), 'charity', 'Moss Lane Food Bank, a charity in Sheffield', '--project', join(dir, 'site')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /first run, installing its one dependency \(esbuild/);
    assert.ok(existsSync(join(dir, 'site', 'index.html')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an unknown kind or a missing project is a usage error', () => {
  const r = spawnSync(process.execPath, [join(root, 'scripts/starter.mjs'), 'spaceship', 'Anything'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Kinds: cafe, restaurant/);
});
