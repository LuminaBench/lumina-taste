// Curated starter photographs (engine/photos/*.json): the sets themselves, how a page finds its set, how briefs
// are matched, and find-images using a set before it searches, against a local stand-in (no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { assignStarters, briefHeads, completeSet, domainOf, fitDetail, fitScore, loadStarters, starterFor } from '../../scripts/lib/image-starter.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sets = loadStarters(join(root, 'engine/photos'));
const domains = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8')).domains.map((d) => d.id);

test('every page-types domain has a starter set of 6 to 16 hand-checked, openly licensed photographs', () => {
  for (const d of domains) assert.ok(sets[d], `engine/photos/${d}.json`);
  const PEOPLE = /\b(face|faces|portrait|woman|man|girl|boy|people|person|customer|smiling)\b/i;
  for (const [id, s] of Object.entries(sets)) {
    assert.equal(s.id, id);
    assert.ok(s.about && s.about.length > 20, `${id}: about`);
    assert.ok(Array.isArray(s.domains) && s.domains.every((d) => domains.includes(d)), `${id}: domains ${s.domains}`);
    assert.ok(s.photos.length >= 6 && s.photos.length <= 16, `${id}: ${s.photos.length} photographs`);
    const ids = new Set();
    for (const p of s.photos) {
      const where = `${id}/${p.id}`;
      assert.ok(!ids.has(p.id), `${where}: id repeats`); ids.add(p.id);
      assert.ok(['CC0 1.0', 'Public domain'].includes(p.licence), `${where}: ${p.licence}`);
      assert.match(p.licenceUrl, /^https:\/\/creativecommons\.org\/publicdomain\//, where);
      assert.match(p.page, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, where);
      assert.match(p.url, /^https:\/\/(upload|thumb)\.wikimedia\.org\/[^?]+\.jpe?g$/i, where);
      assert.ok(Math.max(p.width, p.height) >= 1600 && Math.max(p.original.width, p.original.height) >= 1600, `${where}: too small`);
      assert.ok(p.creator && p.title, `${where}: credit`);
      assert.ok(['light', 'dark', 'warm', 'cool'].includes(p.tone), `${where}: tone ${p.tone}`);
      assert.ok(['wide', 'tall', 'square'].includes(p.orientation), `${where}: orientation`);
      assert.ok(p.focus.x >= 0 && p.focus.x <= 1 && p.focus.y >= 0 && p.focus.y <= 1, `${where}: focus`);
      assert.ok(p.shot.length >= 3 && p.shot.every((k) => k === k.toLowerCase()), `${where}: shot keywords`);
      assert.ok(p.shows.length > 10 && !PEOPLE.test(p.shows), `${where}: shows`);
    }
  }
});

test('a page finds its set: by name, by domain, by the subject\'s own words, then by its domain', () => {
  assert.equal(starterFor({ starter: 'cafe' }, sets).id, 'cafe');
  assert.equal(starterFor({ starter: 'hospitality' }, sets).id, 'hospitality');
  assert.equal(starterFor({ starter: 'nonsense' }, sets), null);
  assert.equal(starterFor({ subject: 'coffee shop in York' }, sets).id, 'cafe');
  assert.equal(starterFor({ subject: 'a sourdough bakery in Leith' }, sets).id, 'bakery');
  assert.equal(starterFor({ subject: 'solicitors in Nottingham' }, sets).id, 'professional');
  assert.equal(starterFor({ subject: 'builders in Glasgow' }, sets).id, 'construction');
  assert.equal(starterFor({ subject: 'an independent dentist' }, sets).id, 'health');
  assert.equal(starterFor({ subject: 'a quiet abstract feeling' }, sets), null);
  assert.equal(domainOf('a plumber in Hove'), 'trades');
});

test('briefs get the curated photograph that shows them, each once, best pairs first', () => {
  const cafe = sets.cafe;
  const briefs = [
    'The espresso machine and a flat white being poured, 3:4',
    'A filter coffee in a glass beside a window, 3:4',
    'Six seats outside on the pavement, 3:4',
    'The twelve seats inside, empty, morning light, 3:4',
    'The bakery counter with buns under the glass, 3:4',
    'A quiet abstract feeling, 3:4',
  ].map((shot, key) => ({ key, shot }));
  const got = assignStarters(cafe, briefs, { ratio: 0.75, subject: 'coffee shop in York' });
  const shows = (k) => got.get(k)?.photo.shows ?? '';
  assert.match(shows(0), /espresso|milk|flat white/i);
  assert.match(shows(1), /filter|pour-over/i);
  assert.match(shows(2), /outside/i);
  assert.match(shows(3), /room|corner|seat/i);
  assert.match(shows(4), /counter/i);
  assert.ok(!got.has(5), 'a brief the set cannot show is left for search');
  assert.equal(new Set([...got.values()].map((v) => v.photo.id)).size, got.size);
  // Words that only name the business count for little: "coffee" alone does not pick a picture.
  assert.ok(fitScore(cafe.photos[0], 'Some coffee', { subjectWords: cafe.words }) < 0.6);
});

test('a fit must show the brief\'s head phrase, read shared words in the same sense, and not contradict its state', () => {
  const build = sets.construction;
  const kitchen = build.photos.find((p) => p.id === 'finished-kitchen-white-units');
  const cranes = build.photos.find((p) => p.id === 'tower-cranes-rising-block');
  const opts = { subjectWords: ['builders', 'glasgow'], ratio: 0.8 };
  // From a real fill: "units" alone is not "workshop units"; a block under cranes is not a finished office building.
  assert.deepEqual(briefHeads('Workshop units with roller doors, finished, 4:5'), [{ head: 'units', mods: ['workshop'] }]);
  assert.deepEqual(briefHeads('A small office building, finished, 4:5'), [{ head: 'building', mods: ['office'] }]);
  assert.equal(fitScore(kitchen, 'Workshop units with roller doors, finished, 4:5', opts), 0);
  assert.equal(fitScore(cranes, 'A small office building, finished, 4:5', opts), 0);
  assert.match(fitDetail(cranes, 'A finished block of flats, 4:5', opts).why, /finished.*underway/);
  const got = assignStarters(build, [{ key: 'w', shot: 'Workshop units with roller doors, finished, 4:5' }, { key: 'o', shot: 'A small office building, finished, 4:5' }], { ratio: 0.8, subject: 'builders in Glasgow' });
  assert.equal(got.size, 0, [...got.values()].map((v) => v.photo.id).join(' '));
  // A stand-in completing a gallery of finished work is never a site, even when its own brief names no state.
  const underway = new Set(build.photos.filter((p) => /\b(site|cranes?|scaffold\w*|foundations|rebar)\b/.test(p.shot.join(' '))).map((p) => p.id));
  const filled = build.photos.filter((p) => ['timber-clad-house-dusk', 'newly-built-red-brick', 'finished-kitchen-white-units'].includes(p.id));
  const stand = completeSet(build, [{ key: 'a', shot: 'Two-storey office block with a yard, 4:5' }, { key: 'b', shot: 'Three workshop units with roller doors, 4:5' }], filled,
    { ratio: 0.8, subject: 'builders in Glasgow', siblings: ['Finished rear extension, 4:5', 'Row of new homes, finished, 4:5', 'Gutted flat finished with a new kitchen, 4:5', 'Two-storey office block with a yard, 4:5', 'Three workshop units with roller doors, 4:5'] });
  assert.equal(stand.size, 2);
  for (const { photo } of stand.values()) assert.ok(!underway.has(photo.id) && photo.id !== 'finished-kitchen-white-units', photo.id);
  // The right sense still fits.
  assert.ok(fitScore(kitchen, 'Fitted kitchen units in oak, 4:5', opts) > 0.9);
  assert.ok(fitScore(cranes, 'Tower cranes over the site at dusk, 16:9', opts) > 0.9);
  // Word-sense traps, on small made-up photographs.
  const photo = (shot, shows) => ({ id: shot[0], shot, shows, orientation: 'wide', tone: 'warm' });
  const units = photo(['units', 'kitchen', 'fitted', 'cupboards'], 'Fitted kitchen units in white');
  assert.equal(fitScore(units, 'Storage units on an industrial estate'), 0);
  assert.ok(fitScore(units, 'Kitchen units fitted last week') > 0.9);
  const cocktailBar = photo(['bar', 'cocktail', 'stools', 'drinks'], 'A cocktail bar with stools');
  const rebar = photo(['bar', 'bars', 'steel', 'rebar', 'reinforcement'], 'Bundles of steel reinforcement bar on site');
  assert.ok(fitScore(cocktailBar, 'The bar with its stools, evening') > 0.9);
  assert.equal(fitScore(cocktailBar, 'Steel bars stacked on site'), 0);
  assert.equal(fitScore(rebar, 'The bar at the back of the pub, drinks lined up'), 0);
  const diningTable = photo(['table', 'dining', 'chairs', 'laid'], 'A dining table laid for dinner');
  assert.ok(fitScore(diningTable, 'A table laid for dinner, glasses out') > 0.9);
  assert.equal(fitScore(diningTable, 'A table of fees by case type'), 0);
  assert.equal(fitScore(diningTable, 'The table of rates and figures for each service'), 0);
  const siteCrane = photo(['crane', 'tower', 'site', 'construction'], 'A tower crane over a site');
  const bird = photo(['crane', 'bird', 'wetland', 'reeds'], 'A crane wading through reeds');
  assert.equal(fitScore(siteCrane, 'A crane wading in the reeds at dawn'), 0);
  assert.equal(fitScore(bird, 'The tower crane on site, lifting steel'), 0);
  assert.ok(fitScore(bird, 'A crane wading in the reeds at dawn') > 0.9);
});

// ---------------------------------------------------------------- find-images with a set, against a stand-in
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
function png(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * (w * 3 + 1) + 1 + x * 3; raw[i] = 90 + (x % 50); raw[i + 1] = 100; raw[i + 2] = 110 + (y % 40); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const run = (args, env = {}) => new Promise((done) => {
  const p = spawn(process.execPath, [join(root, 'scripts', 'find-images.mjs'), ...args], { env: { ...process.env, ...env } });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => done({ code, out }));
});

test('find-images uses the curated set first (its focal point and words), then searches for the rest', async () => {
  const hits = [];
  const PHOTO = png(1600, 1200);
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    hits.push(u.pathname + u.search);
    const base = `http://127.0.0.1:${server.address().port}`;
    if (u.pathname === '/ov/') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ results: /\bkiln\b/.test(u.searchParams.get('q')) ? [{ title: 'Kiln shed with stoneware', creator: 'Nell', license: 'cc0', url: `${base}/img/kiln.png`, foreign_landing_url: 'http://x/kiln', width: 1600, height: 1200, filesize: 300000 }] : [] }));
    }
    if (u.pathname === '/cm') { res.setHeader('content-type', 'application/json'); return res.end('{}'); }
    if (u.pathname.startsWith('/img/')) { res.setHeader('content-type', 'image/png'); return res.end(PHOTO); }
    res.statusCode = 404; res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const dir = mkdtempSync(join(tmpdir(), 'lt-photos-'));
  try {
    const photos = join(dir, 'photos'); mkdirSync(photos);
    const photo = (id, shows, shot, focus) => ({ id, shows, shot, orientation: 'wide', tone: 'warm', focus, title: id, creator: 'Moss', licence: 'CC0 1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', provider: 'wikimedia', page: `https://commons.wikimedia.org/wiki/File:${id}.jpg`, url: `${base}/img/${id}.png`, width: 1600, height: 1200, original: { width: 1600, height: 1200 } });
    writeFileSync(join(photos, 'pottery.json'), JSON.stringify({ id: 'pottery', about: 'A pottery studio for the test.', domains: ['commerce'], words: ['pottery', 'stoneware'], photos: [
      photo('mug-on-bench', 'A stoneware mug on a workbench', ['mug', 'cup', 'bench', 'glaze'], { x: 0.8, y: 0.5 }),
      photo('wheel', 'A potter\'s wheel with wet clay', ['wheel', 'clay', 'throwing'], { x: 0.3, y: 0.5 }),
    ] }));
    writeFileSync(join(dir, 'index.html'), `<html data-palette="sage-clay"><main>
      <figure class="lt-art" data-ratio="4/5" data-pattern="split" data-shot="The mug on the bench, window light, 4:5"><p data-part="name">Mug</p></figure>
      <section></section><section></section>
      <figure class="lt-art" data-ratio="4/5" data-shot="The kiln shed at dusk, 4:5"><p data-part="name">Kiln</p></figure>
      <figure class="lt-art" data-ratio="4/5" data-shot="Clay on the wheel, 4:5"><p data-part="name">Wheel</p></figure>
    </main></html>`);
    const env = { LT_PHOTOS: photos, LT_OPENVERSE: `${base}/ov/`, LT_COMMONS: `${base}/cm` };
    const r = await run(['--fill', join(dir, 'index.html'), '--subject', 'stoneware pottery in Frome', '--out', join(dir, 'images')], env);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /Starter set “pottery”: 2 of 3/);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    const imgs = html.match(/<img [^>]+>/g) ?? [];
    assert.equal(imgs.length, 3, html);
    // Alt text says what the curated photograph shows; its hand-set focal point leads the crop.
    assert.match(imgs[0], /alt="A stoneware mug on a workbench"/);
    assert.match(imgs[0], /src="images\/mug-on-bench-960\.webp"/); // a 4:5 crop of 1600×1200 is 960 wide
    assert.match(imgs[2], /alt="A potter&#39;s wheel with wet clay"|alt="A potter's wheel with wet clay"/);
    // The photograph takes the panel over: the stand-in's pattern goes, so its type stays under the picture.
    assert.doesNotMatch(html, /data-pattern/);
    // The brief the set cannot show was searched for.
    assert.match(imgs[1], /alt="The kiln shed at dusk"/);
    assert.ok(hits.some((h) => h.startsWith('/ov/') && /kiln/.test(h)));
    assert.ok(!hits.some((h) => h.startsWith('/ov/') && /\bmug\b/.test(decodeURIComponent(h))), 'a curated brief is not searched for');
    const credits = JSON.parse(readFileSync(join(dir, 'images/credits.json'), 'utf8'));
    const mug = credits.find((c) => c.file.startsWith('mug-on-bench'));
    assert.equal(mug.focusFrom, 'manual');
    assert.equal(mug.licence, 'CC0 1.0');
    assert.equal(mug.creator, 'Moss');
    assert.equal(mug.ratio, 0.8);
    // A 4:5 crop of a 4:3 picture centred on x = 0.8 sits against the right edge.
    assert.ok(mug.focus.x > 0.55, JSON.stringify(mug.focus));

    // A single panel whose only match is thin (it shares the head noun, little else) keeps its drawing, and says so.
    writeFileSync(join(dir, 'alone.html'), `<html><main><section><figure class="lt-art" data-ratio="4/5" data-shot="A cup, 4:5"><p data-part="name">Cup</p></figure></section></main></html>`);
    const thin = await run(['--fill', join(dir, 'alone.html'), '--subject', 'stoneware pottery', '--out', join(dir, 'alone-images')], env);
    assert.match(thin.out, /Only a stand-in-level match for “A cup, 4:5” \(mug-on-bench\); a single panel keeps its drawing/);
    assert.doesNotMatch(readFileSync(join(dir, 'alone.html'), 'utf8'), /<img/);

    // --starter on its own lists the set; --pick all fetches and treats every one.
    const list = await run(['--starter', 'pottery'], env);
    assert.match(list.out, /\[curated\] A stoneware mug on a workbench/);
    const all = await run(['--starter', 'pottery', '--pick', 'all', '--out', join(dir, 'set'), '--ratio', '1/1'], env);
    assert.equal(all.code, 0, all.out);
    assert.equal(JSON.parse(readFileSync(join(dir, 'set/credits.json'), 'utf8')).length, 2);
    // --no-starter searches only; an unknown set is an error.
    const plain = await run(['--fill', join(dir, 'index.html'), '--subject', 'stoneware', '--no-starter', '--dry-run'], env);
    assert.doesNotMatch(plain.out, /Starter set/);
    const bad = await run(['--starter', 'nope'], env);
    assert.equal(bad.code, 2);
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }); }
});
