// The person's own film and PDF menu, made usable without anything to install where the system can do it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keepSeconds, ffmpegArgs, filmTool, filmLength, trimFilm, FILM_LIMITS } from '../../scripts/lib/film.mjs';
import { scanMedia, menuFrom, pdfText } from '../../scripts/lib/media-intake.mjs';
import { chooseHero } from '../../engine/compose/compositions.mjs';
import { loadChromium } from '../../scripts/lib/browser.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('a first-screen film keeps 8 to 20 seconds, never past its end', () => {
  assert.equal(keepSeconds(undefined), 12);
  assert.equal(keepSeconds(45, 60), 20);
  assert.equal(keepSeconds(3, 60), 8);
  assert.equal(keepSeconds(12, 9), 9, 'a 9 second film is kept whole');
  assert.equal(keepSeconds(12, 30, 25), 5, 'starting near the end keeps what is left');
});

test('the ffmpeg commands drop the sound, cap the width and put the still in the middle', () => {
  const [film, still] = ffmpegArgs('in.mov', 'film.mp4', 'film-poster.jpg', { start: 4, seconds: 10 });
  assert.ok(film.includes('-an') && film.includes('+faststart') && film.join(' ').includes('min(1600,iw)'));
  assert.deepEqual(film.slice(film.indexOf('-t'), film.indexOf('-t') + 2), ['-t', '10']);
  assert.equal(still[still.indexOf('-ss') + 1], '9');
});

test('the person’s own film is the first screen, except for software', () => {
  const input = { type: { id: 'venue' }, domain: { id: 'hospitality' }, facts: { brief: 'Ashby Marsh, a restaurant in Whitby' } };
  assert.equal(chooseHero({ ...input, ownFilm: { file: 'harbour.mov' } }).id, 'film');
  assert.notEqual(chooseHero({ ...input, ownFilm: { file: 'demo.mov' }, software: true }).id, 'film');
});

test('a film is trimmed, sized and given a still, on this machine’s own tools', { timeout: 120000 }, (t) => {
  if (!filmTool() || process.platform !== 'darwin') return t.skip('no film tool here');
  const dir = mkdtempSync(join(tmpdir(), 'lt-film-'));
  try {
    const src = join(dir, 'harbour.mov');
    const made = spawnSync('swift', [join(root, 'tests/fixtures/make-film.swift'), src, '16'], { encoding: 'utf8' });
    if (made.status !== 0) return t.skip('could not draw a test film');
    assert.ok(Math.abs(filmLength(src) - 16) < 0.5);
    const f = trimFilm(src, join(dir, 'images'), { start: 2, seconds: 10 });
    assert.ok(existsSync(f.film) && existsSync(f.poster));
    assert.ok(f.bytes <= FILM_LIMITS.bytes, `${f.bytes} bytes`);
    assert.ok(Math.abs(filmLength(f.film) - 10) < 0.6, `kept ${filmLength(f.film)} s`);
    assert.ok(f.posterSize.width <= FILM_LIMITS.width && f.posterSize.width > 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a PDF menu is read into “name £price” lines, headings and descriptions left out', { timeout: 120000 }, async (t) => {
  const chromium = await loadChromium(import.meta.url);
  if (!chromium) return t.skip('no browser to make a PDF');
  const dir = mkdtempSync(join(tmpdir(), 'lt-pdf-'));
  try {
    const b = await chromium.launch();
    const p = await b.newPage();
    await p.setContent('<h1>Menu</h1><h2>MAINS</h2><p>Fish and chips £14</p><p>Haddock, beef dripping, mushy peas</p><p>Crab salad £16</p><p>Mussels, cider and cream £15.50</p>');
    await p.pdf({ path: join(dir, 'menu.pdf') });
    await b.close();
    if (pdfText(join(dir, 'menu.pdf')) == null) return t.skip('nothing here reads PDF text');
    assert.deepEqual(menuFrom(scanMedia(dir)), ['Fish and chips £14', 'Crab salad £16', 'Mussels £15.50']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
