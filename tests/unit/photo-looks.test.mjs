// Photographs as a set with a direction: the look (bright, moody, editorial) read from the business and applied
// the same way to every picture; a cut-out where the ground is plain; a brief that names only the business (the
// family dentist) fits the curated pictures of that place.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOOKS, lookFor, treatImages } from '../../scripts/lib/image-treat.mjs';
import { assignStarters, fitDetail } from '../../scripts/lib/image-starter.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const set = (id) => JSON.parse(readFileSync(join(root, 'engine/photos', `${id}.json`), 'utf8'));
let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* the pixel tests below are skipped */ }

test('the look comes from the business first (its earliest telling word), then the rest of the brief; nothing named is bright', () => {
  assert.deepEqual(Object.keys(LOOKS), ['bright', 'moody', 'editorial']);
  const cases = [['family dentist', '', 'bright'], ['cocktail bar', '', 'moody'], ['tattoo studio', '', 'moody'], ['yoga studio', '', 'bright'], ['architecture studio', '', 'editorial'], ['neighbourhood restaurant', 'open Wednesday to Sunday evenings', 'moody'], ['accountant', '', 'bright'], ['bakery', 'open from 7am', 'bright']];
  for (const [kind, brief, want] of cases) {
    const { look, why } = lookFor(kind, brief);
    assert.equal(look, want, kind);
    assert.ok(why.length > 20 && why.includes(look), `${kind}: says why`);
  }
  // Each look moves the set its own way: bright only lifts, moody only lowers, editorial meets in the middle.
  assert.equal(LOOKS.bright.way, 'up');
  assert.equal(LOOKS.moody.way, 'down');
  assert.ok(LOOKS.moody.mid < LOOKS.editorial.mid && LOOKS.editorial.mid < LOOKS.bright.mid);
  assert.ok(LOOKS.editorial.floor > 0 && LOOKS.editorial.sat < 1, 'editorial: matte blacks, colour down');
  assert.ok(LOOKS.moody.vignette > 0 && LOOKS.bright.vignette === 0);
});

test('a brief that names only the business fits the curated pictures of that place; one that names its stock does not', () => {
  const health = set('health');
  const hero = 'A photograph of the family dentist in Leeds, real light, 5:4. Until it exists this panel carries the page\'s bold idea';
  const got = assignStarters(health, [{ key: 0, shot: hero, weight: 2 }], { subject: 'family dentist' });
  assert.ok(got.has(0), 'the dentist hero gets a curated photograph');
  assert.match(got.get(0).photo.shows, /dent|surgery|waiting|instrument/i);
  assert.ok(!got.get(0).standIn, 'a fit, not a stand-in');
  // The set has the rooms a practice needs, with no faces.
  for (const re of [/dental surgery|dentist's chair/i, /treatment room/i, /waiting room/i, /bouldering|climbing wall/i, /weights room/i]) assert.ok(health.photos.some((p) => re.test(p.shows)), String(re));
  assert.ok(set('professional').photos.some((p) => /front desk|reception/i.test(p.shows)));
  assert.ok(set('hospitality').photos.filter((p) => /dining room|restaurant/i.test(p.shows)).length >= 2);
  // The gym and the restaurant: the place itself.
  assert.ok(assignStarters(health, [{ key: 0, shot: 'A photograph of the climbing gym in Sheffield, real light' }], { subject: 'climbing gym' }).has(0));
  assert.ok(assignStarters(set('hospitality'), [{ key: 0, shot: 'A photograph of the restaurant in York, real light' }], { subject: 'neighbourhood restaurant' }).has(0));
  // Naming the stock alone ("Some coffee" on a café's page) stays thin: the kind is the place, not what it sells.
  const cafe = set('cafe');
  assert.ok(fitDetail(cafe.photos[0], 'Some coffee', { subjectWords: ['coffee', 'shop'], kind: 'shop' }).score < 0.6);
});

/** A test picture drawn in the browser: a coloured disc and its shadow on a plain ground, or a noisy field. */
async function picture(page, kind) {
  const b64 = await page.evaluate(async (k) => {
    const c = new OffscreenCanvas(900, 1100), x = c.getContext('2d');
    if (k === 'object') {
      x.fillStyle = '#f4f2ee'; x.fillRect(0, 0, 900, 1100);
      x.fillStyle = 'rgba(0,0,0,0.22)'; x.beginPath(); x.ellipse(470, 820, 230, 40, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#c8553d'; x.beginPath(); x.arc(450, 560, 240, 0, Math.PI * 2); x.fill();
    } else {
      for (let y = 0; y < 1100; y += 10) for (let i = 0; i < 900; i += 10) { const v = (Math.sin(i * 0.37 + y * 0.11) * 0.5 + 0.5) * 200 + 30; x.fillStyle = `rgb(${v},${(v * 0.8) | 0},${(255 - v) | 0})`; x.fillRect(i, y, 10, 10); }
    }
    const blob = await c.convertToBlob({ type: 'image/png' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }, kind);
  return Buffer.from(b64, 'base64');
}
/** Median lightness and whether any pixel is transparent, read back in the browser. */
async function stats(page, file) {
  return page.evaluate(async (u) => {
    const bm = await createImageBitmap(await (await fetch(u)).blob());
    const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d'); x.drawImage(bm, 0, 0);
    const d = x.getImageData(0, 0, bm.width, bm.height).data, L = []; let clear = 0;
    for (let i = 0; i < d.length; i += 16) { L.push((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255); if (d[i + 3] < 20) clear++; }
    L.sort((a, b) => a - b);
    return { med: L[L.length >> 1], clear: clear / L.length, corner: d[3], centre: d[((bm.height >> 1) * bm.width + (bm.width >> 1)) * 4 + 3] };
  }, `data:image/webp;base64,${readFileSync(file).toString('base64')}`);
}

test('the looks move a set the way they say, and a plain ground cuts out while a busy one is kept', { skip: !chromium && 'Playwright is not installed' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-looks-'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    writeFileSync(join(dir, 'field.png'), await picture(page, 'field'));
    writeFileSync(join(dir, 'object.png'), await picture(page, 'object'));
    const med = {};
    for (const look of [null, 'bright', 'moody', 'editorial']) {
      const [r] = await treatImages([{ input: join(dir, 'field.png'), name: `field-${look}` }], { out: join(dir, String(look)), ratio: 4 / 5, widths: [640], look });
      assert.equal(r.look, look);
      med[look] = (await stats(page, join(dir, String(look), r.files[0].file))).med;
    }
    assert.ok(med.moody < med.editorial && med.editorial < med.bright, JSON.stringify(med));
    assert.ok(med.bright >= med.null - 0.01, 'bright never darkens');
    const [cut, busy] = await treatImages([{ input: join(dir, 'object.png'), name: 'object' }, { input: join(dir, 'field.png'), name: 'busy' }], { out: join(dir, 'cut'), ratio: 4 / 5, widths: [640], cutout: true });
    assert.equal(cut.cutout, true, cut.cutNote);
    const s = await stats(page, join(dir, 'cut', cut.files[0].file));
    assert.ok(s.corner < 20 && s.centre > 240, `ground clear, object solid (${s.corner}, ${s.centre})`);
    assert.ok(s.clear > 0.3, 'most of the ground is clear');
    assert.equal(busy.cutout, false);
    assert.match(busy.cutNote, /keeps its background/);
  } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('the picture band is set as photo words: the scrim only behind the words, the drawing in the frame until a photograph', () => {
  const css = readFileSync(join(root, 'components/ui/blocks/photo-words/photo-words.css'), 'utf8');
  // The pool fades from the words' corner to nothing; no rule paints the whole photograph.
  assert.match(css, /\[data-part="words"\][^}]*radial-gradient\(100% 100% at var\(--pw-x\) var\(--pw-y\)[^}]*transparent 100%/);
  assert.doesNotMatch(css, /\[data-part="photo"\][^}]*(gradient|::after)/);
  assert.match(css, /:scope:dir\(rtl\) > \[data-part="words"\] \{ --pw-x: 100%; \}/);
  const collage = readFileSync(join(root, 'components/ui/blocks/photo-collage/photo-collage.css'), 'utf8');
  assert.match(collage, /li:first-child \{ grid-column: span 7; grid-row: span 2; \}/);
  assert.match(readFileSync(join(root, 'components/ui/data/art-panel/art-panel.css'), 'utf8'), /data-variant="cutout"/);
  // A thin brief's one picture band is set this way, its heading on the picture, its drawing in the frame.
  const dir = mkdtempSync(join(tmpdir(), 'lt-pband-'));
  try {
    const r = spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), 'Holloway Joinery, joiners in Hebden Bridge', '--project', dir, '--write', '--json'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /<section class="lt-photo-words" aria-labelledby="h-picture"[^>]*>\s*<figure data-part="photo" data-tone="dark">\s*<figure class="lt-art"[^>]*data-shot="A wide photograph/);
    assert.match(html, /<div data-part="words" data-tone="dark"><h2 id="h-picture">Joiners in Hebden Bridge<\/h2>/);
    assert.ok(existsSync(join(dir, 'lumina-taste')) && readFileSync(join(dir, 'lumina-taste', 'lumina.css'), 'utf8').includes('.lt-photo-words'), 'its styles are installed');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
