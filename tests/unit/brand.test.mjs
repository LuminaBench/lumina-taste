// The brand kit: every piece is written in the page's own palette and type, with no download and no font in the favicon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const pal = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes.find((p) => p.id === 'arctic-red');

test('brand-kit writes the wordmark, lockup, favicon, share image, email and sheet from the palette', () => {
  const out = mkdtempSync(join(tmpdir(), 'lt-brand-'));
  const r = spawnSync(process.execPath, [join(root, 'scripts/brand-kit.mjs'), '--name', 'Granite Row', '--subject', 'builders', '--line', 'Builders in Glasgow', '--palette', 'arctic-red', '--type', 'stencil', '--out', out, '--no-png'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  for (const f of ['wordmark.svg', 'wordmark-on-ink.svg', 'lockup.svg', 'favicon.svg', 'og.html', 'email.html', 'brand.html', 'brand.json']) assert.ok(existsSync(join(out, f)), f);
  const fav = readFileSync(join(out, 'favicon.svg'), 'utf8');
  assert.ok(!/<text/.test(fav), 'the favicon is drawn, not lettered');
  assert.ok(fav.includes(pal.modes.light.tokens['accent-solid'].hex), 'favicon on the accent');
  assert.ok(!/data-m=/.test(fav), 'every drawing part is coloured inline');
  const mail = readFileSync(join(out, 'email.html'), 'utf8');
  assert.ok(!/<link|<style/.test(mail.replace(/<style>[^<]*<\/style>/, (m) => (m.includes('@') ? m : ''))), 'email styles are inline');
  assert.ok(mail.includes(pal.modes.light.tokens['accent-ink'].hex) && mail.includes(pal.modes.light.tokens['accent-solid'].hex), 'the button uses the accent and its ink');
  const brand = JSON.parse(readFileSync(join(out, 'brand.json'), 'utf8'));
  assert.equal(brand.palette, 'arctic-red'); assert.equal(brand.type, 'stencil'); assert.ok(brand.motif);
  assert.ok(brand.colours.highlight.light.startsWith('#'), 'the second colour is part of the brand');
  rmSync(out, { recursive: true, force: true });
});

test('brand-kit refuses an unknown palette', () => {
  const r = spawnSync(process.execPath, [join(root, 'scripts/brand-kit.mjs'), '--name', 'X', '--palette', 'nope', '--no-png'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});
