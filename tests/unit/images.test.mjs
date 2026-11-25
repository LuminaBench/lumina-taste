// find-images.mjs against a local stand-in for the image services: no network, real downloads and page edits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// A 1×1 JPEG.
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64');

const run = (args, env) => new Promise((done) => {
  const p = spawn(process.execPath, [join(root, 'scripts/find-images.mjs'), ...args], { env: { ...process.env, ...env } });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => done({ code, out }));
});

test('find-images fills each picture stand-in with an openly licensed photograph and records its credit', async () => {
  const hits = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    hits.push(u.pathname);
    if (u.pathname === '/ov/') {
      assert.equal(u.searchParams.get('license'), 'cc0,pdm');
      const q = u.searchParams.get('q');
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ results: [
        { title: 'Painting of a mug, engraving', creator: 'A', license: 'cc0', url: `http://127.0.0.1:${server.address().port}/img/art.jpg`, foreign_landing_url: 'http://x/art', width: 3000, height: 2000 },
        { title: `Stoneware ${q.split(' ')[0]} on a table`, creator: 'Nell', license: 'cc0', license_version: '1.0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/', url: `http://127.0.0.1:${server.address().port}/img/${encodeURIComponent(q)}.jpg`, foreign_landing_url: 'http://x/page', width: 2400, height: 3000, filesize: 1000 },
      ] }));
    }
    if (u.pathname.startsWith('/img/')) { res.setHeader('content-type', 'image/jpeg'); return res.end(JPEG); }
    res.statusCode = 404; res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const dir = mkdtempSync(join(tmpdir(), 'lt-img-'));
  try {
    writeFileSync(join(dir, 'index.html'), `<main>
      <figure class="lt-art" data-shot="The mug on a table, window light, 4:5"><p data-part="name">Mug</p></figure>
      <figure class="lt-art" data-shot="The bowl with porridge, 4:5"><p data-part="name">Bowl</p></figure>
      <figure class="lt-art" data-shot="Already done"><img src="x.jpg" alt=""></figure>
    </main>`);
    const env = { LT_OPENVERSE: `http://127.0.0.1:${port}/ov/`, LT_COMMONS: `http://127.0.0.1:${port}/none` };
    const r = await run(['--fill', join(dir, 'index.html'), '--subject', 'stoneware', '--out', join(dir, 'images')], env);
    assert.equal(r.code, 0, r.out);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.equal((html.match(/<img src="images\//g) ?? []).length, 2, html);
    assert.match(html, /data-shot="The mug on a table, window light, 4:5"><img src="images\/the-mug-on-a-table\.jpg" alt="The mug on a table"/);
    assert.ok(!hits.includes('/img/art.jpg'), 'an artwork is never chosen');
    const credits = JSON.parse(readFileSync(join(dir, 'images/credits.json'), 'utf8'));
    assert.equal(credits.length, 2);
    assert.equal(credits[0].licence, 'CC0 1.0');
    assert.ok(existsSync(join(dir, 'images/CREDITS.md')));
    // Listing only: nothing is downloaded.
    const before = hits.filter((h) => h.startsWith('/img/')).length;
    const list = await run(['mug'], env);
    assert.match(list.out, /Stoneware mug on a table/);
    assert.equal(hits.filter((h) => h.startsWith('/img/')).length, before);
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }); }
});
