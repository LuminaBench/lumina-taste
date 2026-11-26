// What the real Google Fonts service and its files do, as checked against them: one variable file for several
// weights, a file per weight for static families, variable files that keep their whole axis range with an
// extreme default instance, optical sizes that change widths, and the metrics stored in source.json.
// No network: synthetic fonts and a stand-in that answers the way the real API does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';
import { SAMPLE, LOCAL_BASES, faceTargets, fallbackFaces, fallbackStylesheet, fontMetrics, normalizedCoords, readTables } from '../../scripts/lib/font-metrics.mjs';
import { mergeFaces, parseCss } from '../../scripts/lib/webfont.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8'));

// ------------------------------------------------------------------ a variable font with fvar, avar and HVAR
const chars = [...new Set([...SAMPLE].map((c) => c.codePointAt(0)))].sort((a, b) => a - b);
const N = chars.length + 1;
const BASE = 500, DELTA = 100; // every glyph is 500 units at the default (thinnest) weight and 600 at the heaviest
function sfnt(tables) {
  const tags = Object.keys(tables).sort();
  const head = Buffer.alloc(12 + tags.length * 16); head.writeUInt32BE(0x10000, 0); head.writeUInt16BE(tags.length, 4);
  let off = head.length; const parts = [head];
  tags.forEach((t, i) => { const d = tables[t]; head.write(t, 12 + i * 16, 'latin1'); head.writeUInt32BE(off, 20 + i * 16); head.writeUInt32BE(d.length, 24 + i * 16); const pad = Buffer.alloc((4 - (d.length % 4)) % 4); parts.push(d, pad); off += d.length + pad.length; });
  return Buffer.concat(parts);
}
function variableFont({ avar = null } = {}) {
  const head = Buffer.alloc(54); head.writeUInt32BE(0x10000, 0); head.writeUInt16BE(1000, 18);
  const hhea = Buffer.alloc(36); hhea.writeInt16BE(900, 4); hhea.writeInt16BE(-300, 6); hhea.writeUInt16BE(N, 34);
  const hmtx = Buffer.alloc(N * 4); for (let g = 0; g < N; g++) hmtx.writeUInt16BE(BASE, g * 4);
  const segs = [...chars.map((cp, i) => [cp, i + 1 - cp]), [0xffff, 1]];
  const sx2 = segs.length * 2, sub = Buffer.alloc(16 + sx2 * 4);
  sub.writeUInt16BE(4, 0); sub.writeUInt16BE(sub.length, 2); sub.writeUInt16BE(sx2, 6);
  segs.forEach(([cp, d], i) => { sub.writeUInt16BE(cp, 14 + i * 2); sub.writeUInt16BE(cp, 16 + sx2 + i * 2); sub.writeInt16BE(((d + 32768) & 0xffff) - 32768, 16 + sx2 * 2 + i * 2); });
  const cmap = Buffer.concat([Buffer.from([0, 0, 0, 1, 0, 3, 0, 1, 0, 0, 0, 12]), sub]);
  // fvar: wght 100 (default) … 900, like Bitter and Big Shoulders on Google Fonts.
  const fvar = Buffer.alloc(36); fvar.writeUInt16BE(1, 0); fvar.writeUInt16BE(16, 4); fvar.writeUInt16BE(2, 6); fvar.writeUInt16BE(1, 8); fvar.writeUInt16BE(20, 10);
  fvar.write('wght', 16, 'latin1'); fvar.writeInt32BE(100 * 65536, 20); fvar.writeInt32BE(100 * 65536, 24); fvar.writeInt32BE(900 * 65536, 28);
  // HVAR: one region peaking at the heaviest weight, one int16 delta per glyph, no index map.
  const regionList = Buffer.alloc(4 + 6); regionList.writeUInt16BE(1, 0); regionList.writeUInt16BE(1, 2); regionList.writeInt16BE(0, 4); regionList.writeInt16BE(16384, 6); regionList.writeInt16BE(16384, 8);
  const data = Buffer.alloc(6 + 2 + N * 2); data.writeUInt16BE(N, 0); data.writeUInt16BE(1, 2); data.writeUInt16BE(1, 4); data.writeUInt16BE(0, 6);
  for (let g = 0; g < N; g++) data.writeInt16BE(DELTA, 8 + g * 2);
  const store = Buffer.alloc(12); store.writeUInt16BE(1, 0); store.writeUInt32BE(12, 2); store.writeUInt16BE(1, 6); store.writeUInt32BE(12 + regionList.length, 8);
  const hvarHead = Buffer.alloc(20); hvarHead.writeUInt16BE(1, 0); hvarHead.writeUInt32BE(20, 4);
  const tables = { head, hhea, hmtx, cmap, fvar, HVAR: Buffer.concat([hvarHead, store, regionList, data]) };
  if (avar) {
    const a = Buffer.alloc(8 + 2 + avar.length * 4); a.writeUInt16BE(1, 0); a.writeUInt16BE(1, 6); a.writeUInt16BE(avar.length, 8);
    avar.forEach(([from, to], i) => { a.writeInt16BE(Math.round(from * 16384), 10 + i * 4); a.writeInt16BE(Math.round(to * 16384), 12 + i * 4); });
    tables.avar = a;
  }
  return sfnt(tables);
}

test('a variable font is measured at the weight the page uses, not at its default instance', () => {
  const buf = variableFont();
  const thin = fontMetrics(buf), heavy = fontMetrics(buf, { wght: 900 }), mid = fontMetrics(buf, { wght: 500 });
  assert.equal(thin.defaultWght, 100);
  assert.equal(thin.avgWidth, 0.5);
  assert.equal(heavy.avgWidth, 0.6);
  assert.equal(mid.avgWidth, 0.55, 'halfway along the axis, half the delta');
  assert.equal(mid.weight, 500);
  assert.deepEqual(thin.axes, { wght: [100, 100, 900] });
  // Out of range clamps to the axis.
  assert.equal(fontMetrics(buf, { wght: 1000 }).avgWidth, 0.6);
});

test('avar reshapes the axis before the deltas apply', () => {
  const buf = variableFont({ avar: [[-1, -1], [0, 0], [0.5, 0.25], [1, 1]] });
  const t = readTables(buf);
  assert.deepEqual(normalizedCoords(t, { wght: 500 }), [0.25]);
  assert.equal(fontMetrics(buf, { wght: 500 }).avgWidth, 0.525);
});

// ------------------------------------------------------------------ the CSS the real API returns
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153';
const block = (subset, family, weight, url, extra = '') => `/* ${subset} */\n@font-face {\n  font-family: '${family}';\n  font-style: normal;\n  font-weight: ${weight};\n${extra}  font-display: swap;\n  src: url(${url}) format('woff2');\n  unicode-range: ${LATIN};\n}\n`;

test('separate weights of a variable family are one file and one face; static weights stay separate', () => {
  const css = [400, 500, 600].map((w) => block('latin', 'IBM Plex Sans', w, 'https://fonts.gstatic.com/s/plex/v.woff2', '  font-stretch: 100%;\n')).join('')
    + [400, 500, 600].map((w) => block('latin', 'Barlow', w, `https://fonts.gstatic.com/s/barlow/${w}.woff2`)).join('')
    + block('latin-ext', 'Barlow', 400, 'https://fonts.gstatic.com/s/barlow/ext.woff2');
  const faces = mergeFaces(parseCss(css));
  const plex = faces.filter((f) => f.family === 'IBM Plex Sans');
  assert.equal(plex.length, 1);
  assert.equal(plex[0].weight, '400 600');
  assert.equal(plex[0].stretch, '100%');
  assert.deepEqual(faces.filter((f) => f.family === 'Barlow').map((f) => `${f.subset}:${f.weight}`), ['latin:400', 'latin:500', 'latin:600', 'latin-ext:400']);
});

// ------------------------------------------------------------------ fallback targets and faces
test('fallback faces are matched where the pairing sets each family', () => {
  const stamped = source.pairings.find((p) => p.id === 'stamped');
  const bitter = faceTargets(stamped, 'Bitter'), work = faceTargets(stamped, 'Work Sans');
  assert.equal(bitter.bold.wght, 800, 'the heavy headline is matched at its own weight');
  assert.ok(bitter.bold.opsz > 40, 'a headline face is matched at headline size');
  assert.equal(work.regular.wght, 400);
  assert.equal(work.regular.opsz, 17, 'body text at the desktop body size');
  assert.equal(work.bold.wght, 600, 'bold inside body copy');
  const editorial = source.pairings.find((p) => p.id === 'editorial');
  assert.equal(faceTargets(editorial, 'Fraunces').regular.wght, 500, 'a light headline uses the regular face');
  const m = { ascent: 0.9, descent: 0.25, lineGap: 0 };
  const fb = fallbackFaces('Bitter', { regular: { ...m, avgWidth: 0.46 }, bold: { ...m, avgWidth: 0.47 } }, 'serif');
  assert.equal(fb.sizeAdjust, +(0.46 / LOCAL_BASES.serif.regular.avgWidth).toFixed(4));
  assert.equal(fb.sizeAdjustBold, +(0.47 / LOCAL_BASES.serif.bold.avgWidth).toFixed(4));
  assert.match(fb.css, new RegExp(`local\\("Times New Roman Bold"\\)[^}]*size-adjust: ${+((0.47 / LOCAL_BASES.serif.bold.avgWidth) * 100).toFixed(2)}%`));
});

test('source.json carries measured metrics for every family, and fallbacks.css is built from them', () => {
  for (const p of source.pairings) for (const f of p.fonts) {
    const m = f.metrics;
    assert.ok(m, `${p.id} ${f.family} has measured metrics`);
    assert.ok(m.ascent > 0.6 && m.ascent < 1.3 && m.descent > 0.1 && m.descent < 0.5, `${p.id} ${f.family} vertical metrics`);
    for (const k of ['regular', 'bold']) assert.ok(m[k].avgWidth > 0.2 && m[k].avgWidth < 0.7 && m[k].wght >= 100, `${p.id} ${f.family} ${k}`);
    if (f.fallback === 'mono') assert.equal(m.regular.avgWidth, m.bold.avgWidth, `${f.family}: monospaced widths do not change with weight`);
    assert.deepEqual({ wght: m.regular.wght, opsz: m.regular.opsz }, faceTargets(p, f.family).regular, `${p.id} ${f.family} measured where faceTargets says`);
  }
  // Big Shoulders defaults to its hairline weight on Google Fonts; at the 800 headline it is far wider.
  const bs = source.pairings.find((p) => p.id === 'stencil').fonts.find((f) => f.family === 'Big Shoulders').metrics;
  assert.ok(bs.bold.avgWidth > 0.35, `Big Shoulders 800 measured at 800 (${bs.bold.avgWidth})`);
  const css = readFileSync(join(root, 'tokens/typography/fallbacks.css'), 'utf8');
  assert.equal(css, fallbackStylesheet(source.pairings), 'fallbacks.css is current: run npm run tokens');
  const families = new Set(source.pairings.flatMap((p) => p.fonts.map((f) => f.family)));
  const phoneFaces = new Set(source.pairings.flatMap((p) => p.fonts.filter((f) => f.metrics.phone).map((f) => f.family)));
  for (const fam of families) assert.equal((css.match(new RegExp(`font-family: "${fam} Fallback";`, 'g')) ?? []).length, phoneFaces.has(fam) ? 4 : 2, fam);
  // Opt-in: typography.css names the fallbacks but never defines them, so pages with no web font keep their installed faces.
  assert.doesNotMatch(readFileSync(join(root, 'tokens/typography/typography.css'), 'utf8'), /@font-face/);
});

test('Playfair Display sets lining figures; tracking suits the real heavy and optical-size faces', () => {
  const css = readFileSync(join(root, 'tokens/typography/typography.css'), 'utf8');
  const blockOf = (id) => css.slice(css.indexOf(`[data-type="${id}"] {`)).split('}')[0];
  assert.match(blockOf('didone'), /font-feature-settings: "lnum" 1;/);
  assert.ok(source.pairings.find((p) => p.id === 'stamped').displayTracking >= -0.01, 'Bitter 800 needs its word spaces');
  assert.ok(source.pairings.find((p) => p.id === 'swiss').displayTracking >= -0.025, 'Inter\'s display optical size is already tight');
});

// ------------------------------------------------------------------ fonts.mjs against a stand-in that answers like the real API
test('fonts.mjs downloads a variable family once, keeps static cuts apart and preloads the weights the pairing uses', async () => {
  const font = variableFont();
  const hits = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    hits.push(u.pathname);
    const host = `127.0.0.1:${server.address().port}`;
    if (u.pathname === '/css2') {
      let css = '';
      for (const fam of u.searchParams.getAll('family')) {
        const [name, spec] = fam.split(':');
        const weights = spec.split('@')[1].split(';').map(Number);
        const slugName = name.toLowerCase().replace(/\s+/g, '');
        const variable = name === 'IBM Plex Sans';
        for (const w of weights) css += block('cyrillic', name, w, `http://${host}/s/${slugName}-cyr.woff2`) + block('latin', name, w, `http://${host}/s/${slugName}${variable ? '' : `-${w}`}.woff2`, variable ? '  font-stretch: 100%;\n' : '');
      }
      res.setHeader('content-type', 'text/css'); return res.end(css);
    }
    if (u.pathname.startsWith('/s/')) { res.setHeader('content-type', 'font/woff2'); return res.end(woff2Of(font)); }
    res.statusCode = 404; res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const dir = mkdtempSync(join(tmpdir(), 'lt-fonts-real-'));
  try {
    const r = await new Promise((done) => {
      const p = spawn(process.execPath, [join(root, 'scripts/fonts.mjs'), '--pairing', 'financial', '--out', dir], { env: { ...process.env, LT_GOOGLE_FONTS: `http://127.0.0.1:${server.address().port}/css2` } });
      let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d)); p.on('close', (code) => done({ code, out }));
    });
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(readdirSync(dir).filter((f) => f.endsWith('.woff2')).sort(), ['barlow-condensed-normal-500-latin.woff2', 'barlow-condensed-normal-600-latin.woff2', 'ibm-plex-mono-normal-400-latin.woff2', 'ibm-plex-sans-normal-400-600-latin.woff2']);
    assert.equal(hits.filter((h) => h === '/s/ibmplexsans.woff2').length, 1, 'the shared variable file is fetched once');
    assert.ok(!hits.some((h) => h.includes('-cyr')), 'other subsets are not fetched');
    const css = readFileSync(join(dir, 'fonts.css'), 'utf8');
    assert.match(css, /font-family: "IBM Plex Sans";\n  font-style: normal;\n  font-weight: 400 600;\n  font-stretch: 100%;/);
    assert.equal((css.match(/font-family: "IBM Plex Sans";/g) ?? []).length, 1);
    const pre = readFileSync(join(dir, 'preload.html'), 'utf8');
    assert.match(pre, /barlow-condensed-normal-600-latin\.woff2/, 'the 600 headline cut, not the 500');
    assert.doesNotMatch(pre, /barlow-condensed-normal-500/);
    const manifest = JSON.parse(readFileSync(join(dir, 'fonts.json'), 'utf8'));
    const plex = manifest.files.find((f) => f.family === 'IBM Plex Sans').metrics;
    assert.equal(plex.regular.wght, 400);
    assert.equal(plex.regular.avgWidth, 0.5375, 'measured at 400 on a 100…900 axis whose default is 100');
    assert.equal(plex.bold.avgWidth, 0.5625, 'and at 600 for the bold face');
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }); }
});

// A WOFF2 wrapper around the sfnt tables (untransformed), so fonts.mjs accepts the file.
function woff2Of(ttf) {
  const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post'];
  const num = ttf.readUInt16BE(4), dir = [], data = [];
  for (let i = 0; i < num; i++) {
    const r = 12 + i * 16, tag = ttf.toString('latin1', r, r + 4), off = ttf.readUInt32BE(r + 8), len = ttf.readUInt32BE(r + 12);
    const idx = KNOWN.indexOf(tag);
    const b128 = (v) => { const bytes = [v & 0x7f]; while ((v = Math.floor(v / 128))) bytes.unshift((v & 0x7f) | 0x80); return Buffer.from(bytes); };
    dir.push(Buffer.concat([Buffer.from([idx < 0 ? 63 : idx]), idx < 0 ? Buffer.from(tag, 'latin1') : Buffer.alloc(0), b128(len)]));
    data.push(ttf.subarray(off, off + len));
  }
  const compressed = brotliCompressSync(Buffer.concat(data));
  const header = Buffer.alloc(48); header.write('wOF2', 0, 'latin1'); header.writeUInt32BE(0x10000, 4); header.writeUInt16BE(num, 12); header.writeUInt32BE(compressed.length, 20);
  const body = Buffer.concat([header, ...dir, compressed]); body.writeUInt32BE(body.length, 8);
  return body;
}

test('optical-size faces get phone fallbacks matched at the phone hero size, inside a phone media query', () => {
  const editorial = source.pairings.find((p) => p.id === 'editorial');
  const t = faceTargets(editorial, 'Fraunces');
  assert.ok(t.phone, 'Fraunces has an opsz axis');
  assert.ok(t.phone.regular.opsz < t.regular.opsz, 'the phone hero is smaller than the desktop heading it is matched at');
  assert.equal(faceTargets(editorial, 'Inter Tight').phone, undefined, 'no opsz axis, one set of faces');
  const m = editorial.fonts.find((f) => f.family === 'Fraunces').metrics;
  assert.ok(m.phone.regular.avgWidth > m.regular.avgWidth, 'Fraunces is wider per letter at the smaller optical size');
  const v = { ascent: m.ascent, descent: m.descent, lineGap: m.lineGap };
  const css = fallbackFaces('Fraunces', { regular: { ...v, avgWidth: m.regular.avgWidth }, bold: { ...v, avgWidth: m.bold.avgWidth }, phone: m.phone }, 'serif').css;
  assert.equal((css.match(/@font-face/g) ?? []).length, 4);
  assert.match(css, /@media \(max-width: 767\.98px\) \{\n  @font-face \{\n    font-family: "Fraunces Fallback";/);
});
