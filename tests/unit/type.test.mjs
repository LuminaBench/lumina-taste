// Type pairings, variable-font tokens, font metrics and self-hosting (fonts.mjs against a local stand-in for
// the Google Fonts API: no network, synthetic WOFF2 files built here).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';
import { SAMPLE, LOCAL_BASES, fallbackFaces, fontMetrics } from '../../scripts/lib/font-metrics.mjs';
import { css2Url, parseWebfont } from '../../scripts/lib/webfont.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8'));
const NEW = ['signage', 'hyperlegible', 'stamped', 'stadium', 'legal', 'workbench', 'schoolbook', 'stencil'];
const first = (s) => s.split(',')[0].replace(/["']/g, '').trim().toLowerCase();

// ------------------------------------------------------------------ a tiny font, as sfnt tables and WOFF2
const advanceOf = (cp) => 400 + (cp % 5) * 50;
function makeTables({ upm = 1000, asc = 800, desc = -200, gap = 0, typo = null, wght = null, weightClass = 400 } = {}) {
  const chars = [...new Set([...SAMPLE].map((c) => c.codePointAt(0)))].sort((a, b) => a - b);
  const n = chars.length + 1; // glyph 0 is .notdef
  const head = Buffer.alloc(54); head.writeUInt32BE(0x10000, 0); head.writeUInt32BE(0x5f0f3cf5, 12); head.writeUInt16BE(upm, 18);
  const hhea = Buffer.alloc(36); hhea.writeUInt32BE(0x10000, 0); hhea.writeInt16BE(asc, 4); hhea.writeInt16BE(desc, 6); hhea.writeInt16BE(gap, 8); hhea.writeUInt16BE(n, 34);
  const os2 = Buffer.alloc(96); os2.writeUInt16BE(4, 0); os2.writeUInt16BE(weightClass, 4);
  if (typo) { os2.writeUInt16BE(0x80, 62); os2.writeInt16BE(typo[0], 68); os2.writeInt16BE(typo[1], 70); os2.writeInt16BE(typo[2], 72); }
  const maxp = Buffer.alloc(6); maxp.writeUInt32BE(0x5000, 0); maxp.writeUInt16BE(n, 4);
  const hmtx = Buffer.alloc(n * 4); hmtx.writeUInt16BE(500, 0);
  chars.forEach((cp, i) => hmtx.writeUInt16BE(advanceOf(cp), (i + 1) * 4));
  // cmap format 4: one segment per character, then the 0xFFFF terminator.
  const segs = [...chars.map((cp, i) => [cp, cp, i + 1 - cp]), [0xffff, 0xffff, 1]];
  const sx2 = segs.length * 2;
  const sub = Buffer.alloc(16 + sx2 * 4);
  sub.writeUInt16BE(4, 0); sub.writeUInt16BE(sub.length, 2); sub.writeUInt16BE(sx2, 6);
  segs.forEach(([s, e, d], i) => { sub.writeUInt16BE(e, 14 + i * 2); sub.writeUInt16BE(s, 16 + sx2 + i * 2); sub.writeInt16BE(((d + 32768) & 0xffff) - 32768, 16 + sx2 * 2 + i * 2); });
  const cmap = Buffer.concat([Buffer.from([0, 0, 0, 1, 0, 3, 0, 1, 0, 0, 0, 12]), sub]);
  const tables = { cmap, head, hhea, hmtx, maxp, 'OS/2': os2 };
  if (wght) {
    const fvar = Buffer.alloc(36); fvar.writeUInt16BE(1, 0); fvar.writeUInt16BE(16, 4); fvar.writeUInt16BE(2, 6); fvar.writeUInt16BE(1, 8); fvar.writeUInt16BE(20, 10);
    fvar.write('wght', 16, 'latin1'); fvar.writeInt32BE(wght[0] * 65536, 20); fvar.writeInt32BE(wght[1] * 65536, 24); fvar.writeInt32BE(wght[2] * 65536, 28);
    tables.fvar = fvar;
  }
  return { tables, n };
}
function sfnt(tables) {
  const tags = Object.keys(tables).sort();
  const head = Buffer.alloc(12 + tags.length * 16); head.writeUInt32BE(0x10000, 0); head.writeUInt16BE(tags.length, 4);
  let off = head.length; const parts = [head];
  tags.forEach((t, i) => { const d = tables[t]; head.write(t, 12 + i * 16, 'latin1'); head.writeUInt32BE(off, 20 + i * 16); head.writeUInt32BE(d.length, 24 + i * 16); const pad = Buffer.alloc((4 - (d.length % 4)) % 4); parts.push(d, pad); off += d.length + pad.length; });
  return Buffer.concat(parts);
}
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post'];
const b128 = (v) => { const bytes = [v & 0x7f]; while ((v = Math.floor(v / 128))) bytes.unshift((v & 0x7f) | 0x80); return Buffer.from(bytes); };
function woff2({ tables, n }, { transformHmtx = false } = {}) {
  const dir = [], data = [];
  for (const [tag, d] of Object.entries(tables)) {
    const idx = KNOWN.indexOf(tag);
    const tagBytes = idx < 0 ? Buffer.from(tag, 'latin1') : Buffer.alloc(0);
    if (tag === 'hmtx' && transformHmtx) {
      const t = Buffer.alloc(1 + n * 2); t[0] = 0x03;
      for (let g = 0; g < n; g++) t.writeUInt16BE(d.readUInt16BE(g * 4), 1 + g * 2);
      dir.push(Buffer.concat([Buffer.from([(1 << 6) | idx]), b128(d.length), b128(t.length)])); data.push(t);
    } else { dir.push(Buffer.concat([Buffer.from([idx < 0 ? 63 : idx]), tagBytes, b128(d.length)])); data.push(d); }
  }
  const compressed = brotliCompressSync(Buffer.concat(data));
  const header = Buffer.alloc(48); header.write('wOF2', 0, 'latin1'); header.writeUInt32BE(0x10000, 4); header.writeUInt16BE(Object.keys(tables).length, 12); header.writeUInt32BE(compressed.length, 20);
  const body = Buffer.concat([header, ...dir, compressed]);
  body.writeUInt32BE(body.length, 8);
  return body;
}
const expectedAvg = (upm) => { const w = [...SAMPLE].map((c) => advanceOf(c.codePointAt(0))); return w.reduce((a, b) => a + b, 0) / w.length / upm; };

// ------------------------------------------------------------------ metrics
test('fontMetrics reads the same numbers from TTF, WOFF2 and WOFF2 with a transformed hmtx', () => {
  const font = makeTables({ upm: 1000, asc: 900, desc: -250, gap: 30 });
  for (const buf of [sfnt(font.tables), woff2(font), woff2(font, { transformHmtx: true })]) {
    const m = fontMetrics(buf);
    assert.equal(m.unitsPerEm, 1000);
    assert.deepEqual([m.ascent, m.descent, m.lineGap], [0.9, 0.25, 0.03]);
    assert.ok(Math.abs(m.avgWidth - expectedAvg(1000)) < 1e-4, `${m.avgWidth} vs ${expectedAvg(1000)}`);
  }
});

test('typo metrics win when the font sets USE_TYPO_METRICS, and a variable font reports its default weight', () => {
  const m = fontMetrics(woff2(makeTables({ upm: 2048, asc: 2000, desc: -600, gap: 0, typo: [1900, -500, 100], wght: [100, 700, 900] })));
  assert.deepEqual([m.ascent, m.descent, m.lineGap], [+(1900 / 2048).toFixed(4), +(500 / 2048).toFixed(4), +(100 / 2048).toFixed(4)]);
  assert.equal(m.defaultWght, 700);
  assert.equal(m.weight, 700);
});

test('fallback faces scale the local face to the web font and carry its vertical metrics', () => {
  const m = { ascent: 0.9, descent: 0.25, lineGap: 0.03, avgWidth: 0.5, weight: 400 };
  const fb = fallbackFaces('Bitter', m, 'serif');
  const size = 0.5 / LOCAL_BASES.serif.regular.avgWidth;
  assert.equal(fb.sizeAdjust, +size.toFixed(4));
  assert.match(fb.css, /font-family: "Bitter Fallback";\n  src: local\("Times New Roman"\)/);
  assert.match(fb.css, new RegExp(`size-adjust: ${+(size * 100).toFixed(2)}%;`));
  assert.match(fb.css, new RegExp(`ascent-override: ${+((0.9 / size) * 100).toFixed(2)}%;`));
  assert.match(fb.css, /font-weight: 550 1000;\n  size-adjust/);
  assert.match(fb.css, /local\("Times New Roman Bold"\)/);
  // A file measured at a bold default weight is compared with the bold local face.
  const bold = fallbackFaces('Bitter', { ...m, weight: 700 }, 'serif');
  assert.equal(bold.sizeAdjust, +(0.5 / LOCAL_BASES.serif.bold.avgWidth).toFixed(4));
});

// ------------------------------------------------------------------ pairings
test('every pairing is open-licence, loads its headline and body faces, and is not the default font', () => {
  const ids = source.pairings.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of NEW) assert.ok(ids.includes(id), id);
  const STOCK = /^(inter|inter display|geist|roboto|arial|helvetica|helvetica neue|system-ui|-apple-system|blinkmacsystemfont|segoe ui|space grotesk|open sans|poppins|montserrat)$/;
  for (const p of source.pairings) {
    assert.ok(p.reason && p.use, p.id);
    assert.ok(p.fonts?.length, `${p.id} lists its web families`);
    for (const f of p.fonts) assert.match(f.licence, /^(OFL-1\.1|Apache-2\.0)$/, `${p.id} ${f.family}`);
    const families = parseWebfont(p.webfont).map((x) => x.family);
    for (const f of p.fonts.filter((x) => !x.roles.every((r) => r === 'mono'))) assert.ok(families.includes(f.family), `${p.id}: ${f.family} in webfont`);
    assert.ok(p.displayWeight - p.bodyWeight >= 100, `${p.id}: headline and body weights differ`);
    if (!p.appsOnly) assert.ok(!(STOCK.test(first(p.display)) && first(p.display) === first(p.body)), `${p.id} trips taste-default-font`);
  }
  for (const id of NEW) {
    const p = source.pairings.find((x) => x.id === id);
    assert.ok(!STOCK.test(first(p.display)), `${id}: headline face is not a stock sans`);
    assert.ok(p.displayWeight - p.bodyWeight >= 200, `${id}: real weight contrast`);
    assert.ok(!/playfair|newsreader|fraunces|instrument serif|cormorant|garamond|didot|bodoni|caslon|dm serif|lora|merriweather|crimson|source serif/.test(first(p.display)), `${id}: not a default book serif`);
  }
});

test('webfont URLs round-trip through the parser', () => {
  for (const p of source.pairings) assert.equal(css2Url('https://fonts.googleapis.com/css2', parseWebfont(p.webfont)), p.webfont.replace(/family=([\w+]+)&/g, 'family=$1:wght@400&'), p.id);
  assert.deepEqual(parseWebfont('https://x/css2?family=Archivo:wdth,wght@125,700..800&display=swap'), [{ family: 'Archivo', italic: false, axes: { wdth: [125, 125], wght: [700, 800] } }]);
});

test('typography.css exposes axes, optical sizing, width and the fallback names; consumers see every pairing', async () => {
  const css = readFileSync(join(root, 'tokens/typography/typography.css'), 'utf8');
  for (const p of source.pairings) assert.ok(css.includes(`[data-type="${p.id}"] {`), p.id);
  const block = (id) => css.slice(css.indexOf(`[data-type="${id}"] {`)).split('}')[0];
  assert.match(block('legal'), /--axis-display-opsz-min: 7;[\s\S]*font-optical-sizing: auto;/);
  assert.match(block('stadium'), /--stretch-display: 125%;\n  font-stretch: var\(--stretch-display\);/);
  assert.doesNotMatch(block('signage'), /font-stretch|optical/);
  assert.match(block('stamped'), /--font-display: "Bitter", "Bitter Fallback", "Rockwell"/);
  assert.match(block('stamped'), /--axis-display-wght-min: 700;\n  --axis-display-wght-max: 800;/);
  for (const m of css.matchAll(/clamp\(([\d.]+)rem, [^,]+, ([\d.]+)rem\)/g)) assert.ok(+m[1] <= +m[2], `clamp bounds in order: ${m[0]}`);
  const { TYPOGRAPHY } = await import('../../engine/profiles/options.mjs');
  assert.deepEqual(TYPOGRAPHY.map((t) => t.id), source.pairings.map((p) => p.id));
  const schema = JSON.parse(readFileSync(join(root, 'engine/profiles/taste-profile.schema.json'), 'utf8'));
  assert.deepEqual(schema.properties.typography.enum, source.pairings.map((p) => p.id));
  const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  for (const id of NEW) assert.ok(catalog.typography.some((t) => t.id === id), `catalog has ${id}`);
});

test('the new pairings install, compose and search like the others', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-type-'));
  try {
    const r = spawnSync(process.execPath, [join(root, 'scripts/install-taste.mjs'), '--type', 'stamped', '--dry-run'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /stamped/);
    const c = spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), 'a coffee roaster selling beans by the bag', '--typeface', 'stamped', '--json'], { cwd: dir, encoding: 'utf8' });
    assert.equal(c.status, 0, c.stderr);
    assert.equal(JSON.parse(c.stdout).profile.typography, 'stamped');
    for (const [q, id] of [['font for train timetables', 'signage'], ['type for a construction company', 'stencil'], ['font for a law firm', 'legal']]) {
      const s = JSON.parse(spawnSync(process.execPath, [join(root, 'scripts/search.mjs'), q, '--kind', 'typography', '--json', '--limit', '3'], { encoding: 'utf8' }).stdout);
      assert.ok(s.some((x) => x.id === id), `${q} → ${s.map((x) => x.id)}`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ------------------------------------------------------------------ self-hosting
const run = (args, env = {}) => new Promise((done) => {
  const p = spawn(process.execPath, [join(root, 'scripts/fonts.mjs'), ...args], { env: { ...process.env, ...env } });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => done({ code, out }));
});

function standIn({ foreignHost = false } = {}) {
  const hits = [];
  const font = woff2(makeTables({ upm: 1000, asc: 950, desc: -250, gap: 0, wght: [100, 400, 900] }));
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    hits.push(u.pathname + u.search);
    const port = server.address().port;
    if (u.pathname === '/css2') {
      assert.match(req.headers['user-agent'], /Chrome\//, 'asks as a current browser, so the API offers WOFF2');
      const host = foreignHost ? `localhost:${port}` : `127.0.0.1:${port}`;
      let css = '';
      for (const fam of u.searchParams.getAll('family')) {
        const [name, spec = 'wght@400'] = fam.split(':');
        const range = spec.split('@')[1].split(',').at(-1).replace('..', ' ').replace(/;.*/, '');
        for (const subset of ['cyrillic', 'latin-ext', 'latin']) {
          const file = `${name.toLowerCase().replace(/\s+/g, '')}-${subset}.woff2`;
          css += `/* ${subset} */\n@font-face {\n  font-family: '${name}';\n  font-style: normal;\n  font-weight: ${range};\n${spec.startsWith('wdth') ? '  font-stretch: 125%;\n' : ''}  font-display: swap;\n  src: url(http://${host}/s/${file}) format('woff2');\n  unicode-range: U+${subset === 'latin' ? '0000-00FF' : '0100-024F'};\n}\n`;
        }
      }
      res.setHeader('content-type', 'text/css');
      return res.end(css);
    }
    if (u.pathname.startsWith('/s/')) { res.setHeader('content-type', 'font/woff2'); return res.end(font); }
    res.statusCode = 404; res.end();
  });
  return { server, hits, listen: () => new Promise((r) => server.listen(0, '127.0.0.1', r)) };
}

test('fonts.mjs self-hosts only the latin files of the weights the pairing uses, with swap, ranges, preload and fallbacks', async () => {
  const s = standIn();
  await s.listen();
  const dir = mkdtempSync(join(tmpdir(), 'lt-fonts-'));
  try {
    const env = { LT_GOOGLE_FONTS: `http://127.0.0.1:${s.server.address().port}/css2` };
    const r = await run(['--pairing', 'stadium', '--out', join(dir, 'fonts'), '--href', '/fonts/'], env);
    assert.equal(r.code, 0, r.out);
    const css2 = s.hits.find((h) => h.startsWith('/css2'));
    const fams = new URL(css2, 'http://x').searchParams.getAll('family');
    assert.deepEqual(fams, ['Archivo:wdth,wght@125,700..800', 'Barlow:wght@400;500;600'], 'exactly the pairing\'s families, axes and weights');
    const files = readdirSync(join(dir, 'fonts')).sort();
    assert.deepEqual(files, ['archivo-normal-700-800-w125-latin.woff2', 'barlow-normal-400-latin.woff2', 'fonts.css', 'fonts.json', 'preload.html']);
    assert.ok(!s.hits.some((h) => /cyrillic|latin-ext/.test(h)), 'other subsets are not downloaded');
    const css = readFileSync(join(dir, 'fonts/fonts.css'), 'utf8');
    assert.equal((css.match(/font-display: swap;/g) ?? []).length, 2);
    assert.match(css, /font-family: "Archivo";\n  font-style: normal;\n  font-weight: 700 800;\n  font-stretch: 125%;\n  font-display: swap;\n  src: url\("\/fonts\/archivo-normal-700-800-w125-latin\.woff2"\) format\("woff2"\);\n  unicode-range: U\+0000-00FF;/);
    // Metric-matched fallbacks under the names the kit's stacks already carry.
    const avg = expectedAvg(1000), size = avg / LOCAL_BASES.sans.regular.avgWidth;
    assert.match(css, new RegExp(`font-family: "Archivo Fallback";\\n  src: local\\("Arial"\\)[^;]*;\\n  font-weight: 100 549;\\n  size-adjust: ${+(size * 100).toFixed(2)}%;\\n  ascent-override: ${+((0.95 / size) * 100).toFixed(2)}%;`));
    assert.match(css, /font-family: "Barlow Fallback";/);
    const typo = readFileSync(join(root, 'tokens/typography/typography.css'), 'utf8');
    assert.ok(typo.includes('"Archivo", "Archivo Fallback"') && typo.includes('"Barlow", "Barlow Fallback"'));
    const pre = readFileSync(join(dir, 'fonts/preload.html'), 'utf8');
    assert.match(pre, /<link rel="preload" href="\/fonts\/archivo-normal-700-800-w125-latin\.woff2" as="font" type="font\/woff2" crossorigin>/);
    assert.match(pre, /<link rel="stylesheet" href="\/fonts\/fonts\.css">/);
    const manifest = JSON.parse(readFileSync(join(dir, 'fonts/fonts.json'), 'utf8'));
    assert.match(manifest.licence, /Open Font License/);
    assert.equal(manifest.files.length, 2);
    // latin-ext on request
    const r2 = await run(['--pairing', 'legal', '--out', join(dir, 'legal'), '--subsets', 'latin,latin-ext'], env);
    assert.equal(r2.code, 0, r2.out);
    assert.deepEqual(readdirSync(join(dir, 'legal')).filter((f) => f.endsWith('.woff2')).sort(), ['literata-normal-400-700-latin-ext.woff2', 'literata-normal-400-700-latin.woff2']);
    assert.match(readFileSync(join(dir, 'legal/fonts.css'), 'utf8'), /"Literata Fallback";\n  src: local\("Times New Roman"\)/);
  } finally { s.server.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('fonts.mjs refuses files from an unexpected host, and --dry-run makes no request', async () => {
  const s = standIn({ foreignHost: true });
  await s.listen();
  const dir = mkdtempSync(join(tmpdir(), 'lt-fonts-'));
  try {
    const env = { LT_GOOGLE_FONTS: `http://127.0.0.1:${s.server.address().port}/css2` };
    const r = await run(['--pairing', 'signage', '--out', join(dir, 'f')], env);
    assert.notEqual(r.code, 0);
    assert.match(r.out, /Refusing a font from localhost/);
    assert.ok(!s.hits.some((h) => h.startsWith('/s/')), 'nothing fetched from the other host');
    const before = s.hits.length;
    const d = await run(['--pairing', 'signage', '--dry-run'], env);
    assert.equal(d.code, 0, d.out);
    assert.match(d.out, /family=Overpass:wght@400\.\.800&family=Overpass\+Mono:wght@400\.\.600/);
    assert.equal(s.hits.length, before);
    const u = await run([], env);
    assert.equal(u.code, 2);
    assert.match(u.out, /Usage/);
    assert.ok(!existsSync(join(dir, 'f', 'fonts.css')));
  } finally { s.server.close(); rmSync(dir, { recursive: true, force: true }); }
});
