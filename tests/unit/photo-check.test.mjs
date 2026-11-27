// The person's photographs are looked at before they are placed, and again as the page shows them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgePhoto, PHOTO_PROBE, checkPhotos } from '../../scripts/lib/photo-check.mjs';
import { judgePagePhotos } from '../../scripts/lib/critic.mjs';
import { assignMine } from '../../scripts/lib/media-intake.mjs';
import { chooseHero } from '../../engine/compose/compositions.mjs';
import { loadChromium } from '../../scripts/lib/browser.mjs';

const good = { width: 2400, height: 1600, mean: 0.45, p05: 0.1, p95: 0.88, dark: 0.01, bright: 0.01, sharp: 900 };
const rules = (m, o) => judgePhoto(m, o).issues.map((i) => i.rule);

test('a sharp, well-exposed, large photograph is fit and can lead', () => {
  assert.deepEqual(judgePhoto(good, { use: 'hero' }), { fit: true, hero: true, issues: [] });
});

test('each fault is named in plain words, and only the serious ones keep a picture off the page', () => {
  assert.deepEqual(rules({ ...good, sharp: 12 }), ['photo-blurred']);
  assert.equal(judgePhoto({ ...good, sharp: 12 }).fit, false);
  assert.deepEqual(rules({ ...good, sharp: 60 }), ['photo-soft']);
  assert.equal(judgePhoto({ ...good, sharp: 60 }).hero, false, 'soft is fine in a card, not as the first picture');
  assert.deepEqual(rules({ ...good, mean: 0.12, p95: 0.3 }), ['photo-dark']);
  assert.deepEqual(rules({ ...good, p05: 0.42, p95: 0.9 }), ['photo-washed']);
  assert.deepEqual(rules({ ...good, bright: 0.3 }), ['photo-blown']);
  assert.deepEqual(rules({ ...good, dark: 0.4 }), ['photo-crushed']);
  assert.deepEqual(rules({ ...good, width: 500, height: 400 }), ['photo-tiny']);
  assert.match(judgePhoto({ ...good, width: 1000, height: 1250 }).issues[0].message, /1600 px across/);
});

test('an unusable photograph is not placed, and one that cannot lead stays out of the first screen', () => {
  const p = (file, check) => ({ file, kind: 'photo', words: [], orientation: 'wide', check });
  const items = [p('blurred.jpg', { fit: false, hero: false }), p('dark.jpg', { fit: true, hero: false }), p('room.jpg', { fit: true, hero: true })];
  const slots = [{ key: 0, shot: 'The room, 16:10', weight: 2 }, { key: 1, shot: 'A cup', weight: 1 }, { key: 2, shot: 'A bun', weight: 1 }];
  const placed = assignMine(items, slots);
  assert.equal(placed.get(0).item.file, 'room.jpg');
  assert.equal(placed.get(1).item.file, 'dark.jpg');
  assert.ok(![...placed.values()].some((x) => x.item.file === 'blurred.jpg'));
});

test('with only narrow photographs of theirs, a screen-wide first screen becomes the half-screen one', () => {
  const input = { type: { id: 'venue' }, domain: { id: 'hospitality' }, facts: { brief: 'Copper Hare, a café in York' } };
  const auto = chooseHero(input);
  if (['bleed', 'wide', 'cover'].includes(auto.id)) {
    const h = chooseHero({ ...input, ownPhotos: [{ width: 1024, height: 1280 }] });
    assert.equal(h.id, 'edge');
    assert.match(h.why, /under 1,200 px wide/);
    assert.equal(chooseHero({ ...input, ownPhotos: [{ width: 2400, height: 1600 }] }).id, auto.id);
  }
});

test('on the page: a picture blown up, squashed or shown twice is found', () => {
  const at = (o) => ({ selector: 'img', file: 'room-1024.webp', w: 600, h: 400, nw: 1024, nh: 683, fit: 'cover', dpr: 1, ...o });
  assert.deepEqual(judgePagePhotos([at()]), []);
  assert.deepEqual(judgePagePhotos([at({ w: 1440, h: 900 })]).map((f) => f.rule), ['photo-upscaled']);
  assert.deepEqual(judgePagePhotos([at({ fit: 'fill', w: 600, h: 600 })]).map((f) => f.rule), ['photo-stretched']);
  assert.deepEqual(judgePagePhotos([at(), at({ file: 'room-640.webp' })]).map((f) => f.rule), ['photo-repeated']);
});

test('in a browser: a blurred copy measures soft and a dark copy measures dark', async (t) => {
  const chromium = await loadChromium(import.meta.url);
  if (!chromium) return t.skip('Playwright is not installed');
  const b = await chromium.launch();
  try {
    const page = await b.newPage();
    // A drawn test card: fine stripes and text, then the same blurred and darkened.
    const make = (filter) => page.evaluate((f) => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const g = c.getContext('2d'); g.fillStyle = '#ddd'; g.fillRect(0, 0, 1600, 1000); g.fillStyle = '#222'; for (let x = 0; x < 1600; x += 6) g.fillRect(x, 200, 2, 600); g.font = '40px sans-serif'; for (let y = 60; y < 1000; y += 90) g.fillText('Copper Hare flat white 3.40', 40, y); const o = document.createElement('canvas'); o.width = 1600; o.height = 1000; const h = o.getContext('2d'); h.filter = f; h.drawImage(c, 0, 0); return o.toDataURL('image/png'); }, filter);
    const sharp = await page.evaluate(PHOTO_PROBE, await make('none'));
    const soft = await page.evaluate(PHOTO_PROBE, await make('blur(5px)'));
    const dark = await page.evaluate(PHOTO_PROBE, await make('brightness(0.25)'));
    assert.ok(sharp.sharp > 300, `sharp ${sharp.sharp}`);
    assert.ok(soft.sharp < 25, `soft ${soft.sharp}`);
    assert.ok(judgePhoto(dark).issues.some((i) => i.rule === 'photo-dark'));
    assert.equal(typeof checkPhotos, 'function');
  } finally { await b.close(); }
});
