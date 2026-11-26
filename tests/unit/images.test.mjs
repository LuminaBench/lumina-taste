// find-images.mjs and treat-images.mjs against a local stand-in for the image services: no network, real
// downloads, real treatment in headless Chromium, real page edits. Plus the motif table and the size reader.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { imageSize } from '../../scripts/lib/image-size.mjs';
import { loadMotifs, motifSvg, pickMotif, rankMotifs } from '../../scripts/lib/image-motifs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// A PNG of w×h: a soft vertical gradient with a bright square at (sx, sy), so the subject can be found.
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
function png(w, h, { sx = 0.75, sy = 0.4, size = 0.14 } = {}) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = y * (w * 3 + 1) + 1 + x * 3;
      const inSq = Math.abs(x / w - sx) < size / 2 && Math.abs(y / h - sy) < (size * w / h) / 2;
      const g = 120 + Math.round(40 * y / h);
      raw[i] = inSq ? 230 : g; raw[i + 1] = inSq ? 60 : g + 6; raw[i + 2] = inSq ? 40 : g + 14;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const run = (script, args, env = {}) => new Promise((done) => {
  const p = spawn(process.execPath, [join(root, 'scripts', script), ...args], { env: { ...process.env, ...env } });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => done({ code, out }));
});

test('find-images fills stand-ins with treated, responsive pictures, and draws the subject where nothing fits', async () => {
  const hits = [];
  const PHOTO = png(1200, 1500);
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    hits.push(u.pathname + u.search);
    const base = `http://127.0.0.1:${server.address().port}`;
    if (u.pathname === '/ov/') {
      assert.equal(u.searchParams.get('license'), 'cc0,pdm');
      const q = u.searchParams.get('q');
      res.setHeader('content-type', 'application/json');
      const word = /\b(mug|bowl)\b/.exec(q)?.[1];
      if (!word) return res.end(JSON.stringify({ results: [] }));
      return res.end(JSON.stringify({ results: [
        { title: 'Painting of a mug, engraving', creator: 'A', license: 'cc0', url: `${base}/img/art.png`, foreign_landing_url: 'http://x/art', width: 3000, height: 2000 },
        { title: `Portrait of a woman holding a stoneware ${word}`, creator: 'B', license: 'cc0', url: `${base}/img/face.png`, foreign_landing_url: 'http://x/face', width: 2400, height: 3000, filesize: 900000 },
        { title: `Stoneware ${word} thumbnail`, creator: 'C', license: 'cc0', url: `${base}/img/tiny.png`, foreign_landing_url: 'http://x/tiny', width: 2400, height: 3000, filesize: 1000 },
        { title: `Stoneware ${word} on a table`, creator: 'Nell', license: 'cc0', license_version: '1.0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/', url: `${base}/img/${encodeURIComponent(word)}.png`, foreign_landing_url: 'http://x/page', width: 1200, height: 1500, filesize: 400000 },
      ] }));
    }
    if (u.pathname.startsWith('/img/')) { res.setHeader('content-type', 'image/png'); return res.end(PHOTO); }
    res.statusCode = 404; res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const dir = mkdtempSync(join(tmpdir(), 'lt-img-'));
  try {
    writeFileSync(join(dir, 'index.html'), `<html data-palette="sage-clay"><main>
      <figure class="lt-art" data-shot="The mug on a table, window light, 4:5"><p data-part="name">Mug</p></figure>
      <section></section><section></section>
      <figure class="lt-art" data-shot="The bowl with porridge, 4:5"><p data-part="name">Bowl</p></figure>
      <figure class="lt-art" data-shot="The kiln shed at dusk, 4:5"><p data-part="name">Kiln</p></figure>
      <figure class="lt-art" data-shot="Already done"><img src="x.jpg" alt=""></figure>
    </main></html>`);
    const env = { LT_OPENVERSE: `http://127.0.0.1:${port}/ov/`, LT_COMMONS: `http://127.0.0.1:${port}/none` };
    const r = await run('find-images.mjs', ['--fill', join(dir, 'index.html'), '--subject', 'stoneware', '--out', join(dir, 'images')], env);
    assert.equal(r.code, 0, r.out);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    const imgs = html.match(/<img src="images\/[^>]+>/g) ?? [];
    assert.equal(imgs.length, 2, html);
    // One ratio (4:5), the widths the 1200 px picture can fill (never 1600), with width and height.
    assert.match(imgs[0], /srcset="images\/the-mug-on-a-table-640\.webp 640w, images\/the-mug-on-a-table-1080\.webp 1080w"/);
    assert.match(imgs[0], /width="1080" height="1350"/);
    // The first picture on the first screen loads eagerly; the rest wait.
    assert.match(imgs[0], /loading="eager" decoding="async" fetchpriority="high"/);
    assert.match(imgs[1], /loading="lazy"/);
    assert.match(imgs[0], /sizes="\(max-width: 760px\) 100vw, 50vw"/);
    assert.match(imgs[0], /alt="The mug on a table"/);
    // The bright square sits right of centre: the focal point says so, for phone crops.
    const pos = /object-position: (\d+)% (\d+)%/.exec(imgs[0]);
    assert.ok(pos && +pos[1] > 55, imgs[0]);
    // Nothing fitted the kiln: the panel draws the subject's own thing instead.
    assert.match(html, /data-shot="The kiln shed at dusk, 4:5" data-motif="\w+">\s*<svg data-part="motif"/);
    assert.ok(!hits.some((h) => /\/img\/(art|face|tiny)/.test(h)), 'artworks, faces and tiny files are never downloaded');
    const files = readdirSync(join(dir, 'images'));
    assert.ok(files.includes('the-mug-on-a-table-1080.webp'), files.join(' '));
    assert.ok(!files.some((f) => f.endsWith('.png')), 'the original stays out of the page folder');
    assert.equal(readFileSync(join(dir, 'images', 'the-mug-on-a-table-640.webp')).toString('ascii', 8, 12), 'WEBP');
    const credits = JSON.parse(readFileSync(join(dir, 'images/credits.json'), 'utf8'));
    assert.equal(credits.length, 2);
    assert.equal(credits[0].licence, 'CC0 1.0');
    assert.equal(credits[0].grade, 'tint');
    assert.equal(credits[0].palette, 'sage-clay');
    assert.equal(credits[0].files.length, 2);
    assert.equal(credits[0].ratio, 0.8);
    assert.ok(existsSync(join(dir, 'images/CREDITS.md')));
    // Listing only: nothing is downloaded.
    const before = hits.filter((h) => h.startsWith('/img/')).length;
    const list = await run('find-images.mjs', ['mug'], env);
    assert.match(list.out, /Stoneware mug on a table/);
    assert.doesNotMatch(list.out, /Portrait of a woman/);
    assert.equal(hits.filter((h) => h.startsWith('/img/')).length, before);
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('ranking: every word of the search, no officers for "law office", no old or watermarked photographs, full-size sources first', async () => {
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    res.setHeader('content-type', 'application/json');
    const r = (title, extra = {}) => ({ title, creator: 'A', license: 'cc0', url: `http://x/${encodeURIComponent(title)}.jpg`, foreign_landing_url: `http://x/${encodeURIComponent(title)}`, width: 4000, height: 3000, ...extra });
    if (u.pathname === '/ov/') return res.end(JSON.stringify({ results: [
      r('Customs officers at the border office', { tags: [{ name: 'law enforcement' }, { name: 'office' }, { name: 'person' }] }),
      r('Police car outside the station', { tags: [{ name: 'law' }, { name: 'officer' }] }),
      r('Law offices on Main Street', { creator: 'libraryofcongress', tags: [{ name: 'vintage' }, { name: 'history' }] }),
      r('Law office with stamp, watermark', { tags: [{ name: 'law office' }] }),
      r('Keep calm law office mug', { provider: 'stocksnap', tags: [{ name: 'law office' }, { name: 'blackandwhite' }, { name: 'letters' }] }),
      r('Quiet law office desk and books', { provider: 'rawpixel', tags: [{ name: 'law office' }, { name: 'desk' }] }),
    ] }));
    if (u.pathname === '/cm') return res.end(JSON.stringify({ query: { pages: { 1: { title: 'File:Law office reading room.jpg', imageinfo: [{ url: 'http://x/c.jpg', thumburl: 'http://x/c1800.jpg', descriptionurl: 'http://x/File:Law_office', width: 5000, height: 3600, mime: 'image/jpeg', extmetadata: { LicenseShortName: { value: 'CC0' }, Categories: { value: 'Law offices|Libraries' } } }] } } } }));
    res.statusCode = 404; res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const env = { LT_OPENVERSE: `http://127.0.0.1:${server.address().port}/ov/`, LT_COMMONS: `http://127.0.0.1:${server.address().port}/cm` };
    const { out } = await run('find-images.mjs', ['law office', '--json'], env);
    const j = JSON.parse(out);
    assert.deepEqual(j.candidates.map((c) => c.title), ['Law office reading room', 'Quiet law office desk and books', 'Keep calm law office mug']);
    const why = Object.fromEntries(j.rejected.map((x) => [x.title, x.reason]));
    assert.ok(['off topic', 'people'].includes(why['Customs officers at the border office']));
    assert.equal(why['Police car outside the station'], 'off topic');
    assert.equal(why['Law offices on Main Street'], 'archival');
    assert.equal(why['Law office with stamp, watermark'], 'artwork or document');
  } finally { server.close(); }
});

test('treat-images crops a set to one ratio, finds the subject, grades it and writes WebP; without a browser it copies', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-treat-'));
  try {
    writeFileSync(join(dir, 'wide.png'), png(1800, 1000, { sx: 0.82, sy: 0.5, size: 0.1 }));
    writeFileSync(join(dir, 'small.png'), png(500, 400));
    const r = await run('treat-images.mjs', [join(dir, 'wide.png'), join(dir, 'small.png'), '--out', join(dir, 'out'), '--ratio', '4/5', '--palette', 'navy-sand', '--json']);
    assert.equal(r.code, 0, r.out);
    const [wide, small] = JSON.parse(r.out);
    assert.deepEqual(wide.files.map((f) => f.width), [640, 800]); // a 4:5 crop of a 1000 px tall picture is 800 wide: never upscaled to 1080
    assert.equal(wide.files.at(-1).height, 1000);
    // The crop slid right to keep the square (at 82%) in frame.
    assert.ok(wide.focus.x > 0.4 && wide.focus.x < 0.95, JSON.stringify(wide.focus));
    assert.deepEqual(small.files.map((f) => [f.width, f.height]), [[320, 400]]);
    assert.equal(wide.palette, 'navy-sand');
    const before = readFileSync(join(dir, 'wide.png'));
    assert.ok(readFileSync(join(dir, 'out', wide.files[0].file)).length < before.length * 2);
    // A manual focal point wins.
    const m = await run('treat-images.mjs', [`${join(dir, 'wide.png')}@10,50`, '--out', join(dir, 'm'), '--ratio', '1/1', '--json']);
    assert.equal(JSON.parse(m.out)[0].focusFrom, 'manual');
    // No browser: the original is copied and the reason given.
    const c = await run('treat-images.mjs', [join(dir, 'wide.png'), '--out', join(dir, 'copy'), '--json'], { LT_NO_BROWSER: '1' });
    const copied = JSON.parse(c.out)[0];
    assert.equal(copied.treated, false);
    assert.match(copied.warning, /Playwright/);
    assert.deepEqual([copied.width, copied.height], [1800, 1000]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('motifs: one table for the component and the scripts, chosen from the brief, drawn with tokens only', () => {
  const motifs = loadMotifs();
  const names = Object.keys(motifs);
  assert.ok(names.length >= 12, names.join(' '));
  for (const want of ['cup', 'loaf', 'crane', 'document', 'scales', 'leaf', 'phone', 'chart', 'key', 'ticket', 'tool']) assert.ok(names.includes(want), want);
  for (const [n, m] of Object.entries(motifs)) {
    assert.match(m.svg, /data-m="ink"/, `${n} has ink lines`);
    assert.match(m.svg, /data-m="a"/, `${n} uses the accent`);
    assert.doesNotMatch(m.svg, /#[0-9a-f]{3,6}\b|rgb\(|oklch\(|fill="(?!none)|stroke="(?!currentColor)|stroke-width=/i, `${n} takes its colours and stroke from art-panel.css`);
    for (const v of m.svg.matchAll(/data-m="(\w+)"/g)) assert.ok(['a', 'b', 'ink', 'sil', 'dot', 'cut'].includes(v[1]), `${n}: ${v[1]}`);
  }
  assert.equal(pickMotif('coffee shop'), 'cup');
  assert.equal(pickMotif('construction site'), 'crane');
  assert.ok(['document', 'scales'].includes(pickMotif('law office')));
  assert.deepEqual(rankMotifs('Bag of Huila beans on a wooden counter').slice(0, 2), ['bag', 'cup']);
  assert.equal(pickMotif('sourdough loaf on the bench'), 'loaf');
  assert.equal(pickMotif('the dental practice in Leith'), 'tooth');
  assert.equal(pickMotif('The kiln shed at dusk stoneware'), 'vase');
  assert.equal(pickMotif('quiet abstract feeling'), null);
  assert.match(motifSvg('cup'), /^<svg data-part="motif" viewBox="0 0 160 160" aria-hidden="true" focusable="false">/);
  // The component's TypeScript and the scripts share the table.
  const ts = readFileSync(join(root, 'components/ui/data/art-panel/art-panel.ts'), 'utf8');
  assert.equal((ts.match(/^\s+[\w-]+: \['/gm) ?? []).length, names.length);
});

test('imageSize reads PNG and JPEG headers', () => {
  assert.deepEqual(imageSize(png(37, 21)), { width: 37, height: 21, type: 'image/png' });
  const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64');
  assert.deepEqual(imageSize(jpeg), { width: 1, height: 1, type: 'image/jpeg' });
  assert.equal(imageSize(Buffer.from('not a picture at all, just words')), null);
});
