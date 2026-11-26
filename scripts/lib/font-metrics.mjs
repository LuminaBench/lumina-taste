// Read the metrics a metric-matched fallback needs from a TTF/OTF or WOFF2 file: units per em, the
// ascent/descent/line gap browsers lay lines out with, and the average advance of ordinary English text.
// Zero dependencies: WOFF2 is Brotli (node:zlib) plus a table directory; only small tables are parsed.
import { brotliDecompressSync } from 'node:zlib';

const WOFF2_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

/** Text the average advance is taken over: ordinary English with figures, so letter frequency is realistic. */
export const SAMPLE = 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs, then send 24 parcels to the station on platform 3 before noon. Sphinx of black quartz, judge my vow; how vexingly quick daft zebras jump! Opening hours are Monday to Friday, 9 to 5.';

const tag4 = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

function base128(b, pos) {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    const byte = b[pos.i++];
    if (i === 0 && byte === 0x80) throw new Error('WOFF2: bad UIntBase128');
    v = v * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) return v;
  }
  throw new Error('WOFF2: UIntBase128 too long');
}

/** { tag: { data: Buffer, transformed: boolean } } for an sfnt or WOFF2 buffer. */
export function readTables(buf) {
  const sig = tag4(buf, 0);
  const tables = {};
  if (sig === 'wOF2') {
    const num = buf.readUInt16BE(12);
    const compressed = buf.readUInt32BE(20);
    const pos = { i: 48 };
    const dir = [];
    for (let n = 0; n < num; n++) {
      const flags = buf[pos.i++];
      const idx = flags & 0x3f;
      const tag = idx === 63 ? tag4(buf, (pos.i += 4) - 4) : WOFF2_TAGS[idx];
      const version = (flags >> 6) & 3;
      const orig = base128(buf, pos);
      const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
      const length = transformed ? base128(buf, pos) : orig;
      dir.push({ tag, length, transformed });
    }
    if (tag4(buf, 4) === 'ttcf') throw new Error('WOFF2 collections are not supported');
    const data = brotliDecompressSync(buf.subarray(pos.i, pos.i + compressed));
    let off = 0;
    for (const t of dir) { tables[t.tag] = { data: data.subarray(off, off + t.length), transformed: t.transformed }; off += t.length; }
    return tables;
  }
  if (sig === 'wOFF') throw new Error('WOFF 1 is not supported; use WOFF2 or TTF');
  const num = buf.readUInt16BE(4);
  for (let n = 0; n < num; n++) {
    const r = 12 + n * 16;
    const off = buf.readUInt32BE(r + 8), len = buf.readUInt32BE(r + 12);
    tables[tag4(buf, r)] = { data: buf.subarray(off, off + len), transformed: false };
  }
  return tables;
}

/** Map a code point to a glyph id with the Unicode cmap (format 12 or 4). */
function cmapLookup(cmap) {
  const n = cmap.readUInt16BE(2);
  let best = null;
  for (let i = 0; i < n; i++) {
    const pid = cmap.readUInt16BE(4 + i * 8), eid = cmap.readUInt16BE(6 + i * 8), off = cmap.readUInt32BE(8 + i * 8);
    const format = cmap.readUInt16BE(off);
    const rank = format === 12 ? 2 : format === 4 && (pid === 0 || (pid === 3 && (eid === 1 || eid === 10))) ? 1 : 0;
    if (rank && (!best || rank > best.rank)) best = { off, format, rank };
  }
  if (!best) throw new Error('font has no Unicode cmap');
  const { off, format } = best;
  if (format === 12) {
    const groups = cmap.readUInt32BE(off + 12);
    return (cp) => {
      for (let g = 0; g < groups; g++) {
        const o = off + 16 + g * 12, start = cmap.readUInt32BE(o), end = cmap.readUInt32BE(o + 4);
        if (cp >= start && cp <= end) return cmap.readUInt32BE(o + 8) + (cp - start);
      }
      return 0;
    };
  }
  const segX2 = cmap.readUInt16BE(off + 6);
  const ends = off + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
  return (cp) => {
    for (let s = 0; s < segX2; s += 2) {
      if (cp > cmap.readUInt16BE(ends + s)) continue;
      const start = cmap.readUInt16BE(starts + s);
      if (cp < start) return 0;
      const delta = cmap.readInt16BE(deltas + s), ro = cmap.readUInt16BE(ranges + s);
      if (!ro) return (cp + delta) & 0xffff;
      const g = cmap.readUInt16BE(ranges + s + ro + (cp - start) * 2);
      return g ? (g + delta) & 0xffff : 0;
    }
    return 0;
  };
}

/**
 * Metrics of one font file. `avgWidth` is the mean advance over SAMPLE in em; `ascent`, `descent`, `lineGap`
 * are in em, taken from OS/2 typo metrics when the font asks for them (USE_TYPO_METRICS), else from hhea.
 * `defaultWght` is the wght axis default of a variable font (null for static fonts).
 */
export function fontMetrics(buf) {
  const t = readTables(Buffer.from(buf));
  for (const need of ['head', 'hhea', 'hmtx', 'cmap']) if (!t[need]) throw new Error(`font has no ${need} table`);
  const head = t.head.data, hhea = t.hhea.data, hmtx = t.hmtx.data, os2 = t['OS/2']?.data;
  const upm = head.readUInt16BE(18);
  const nh = hhea.readUInt16BE(34);
  // Transformed hmtx (WOFF2) starts with a flags byte, then the same advanceWidth[] run without side bearings.
  const advance = t.hmtx.transformed ? (g) => hmtx.readUInt16BE(1 + Math.min(g, nh - 1) * 2) : (g) => hmtx.readUInt16BE(Math.min(g, nh - 1) * 4);
  const glyph = cmapLookup(t.cmap.data);
  let sum = 0, count = 0;
  for (const ch of SAMPLE) { const g = glyph(ch.codePointAt(0)); if (g) { sum += advance(g); count++; } }
  const useTypo = os2 && os2.length >= 74 && (os2.readUInt16BE(62) & 0x80);
  const [asc, desc, gap] = useTypo ? [os2.readInt16BE(68), os2.readInt16BE(70), os2.readInt16BE(72)] : [hhea.readInt16BE(4), hhea.readInt16BE(6), hhea.readInt16BE(8)];
  let defaultWght = null;
  if (t.fvar) {
    const f = t.fvar.data, axesAt = f.readUInt16BE(4), axisCount = f.readUInt16BE(8), axisSize = f.readUInt16BE(10);
    for (let i = 0; i < axisCount; i++) { const o = axesAt + i * axisSize; if (tag4(f, o) === 'wght') defaultWght = f.readInt32BE(o + 8) / 65536; }
  }
  const weightClass = os2 && os2.length >= 6 ? os2.readUInt16BE(4) : 400;
  return {
    unitsPerEm: upm,
    ascent: +(asc / upm).toFixed(4), descent: +(Math.abs(desc) / upm).toFixed(4), lineGap: +(gap / upm).toFixed(4),
    avgWidth: count ? +((sum / count) / upm).toFixed(5) : null,
    weight: defaultWght ?? weightClass, defaultWght,
  };
}

/**
 * Average advance (em, over SAMPLE) of the local faces a fallback is built on, measured from the system
 * files (Arial, Times New Roman and Courier New, regular and bold) with fontMetrics(). Liberation Sans /
 * Arimo, Liberation Serif / Tinos and Liberation Mono / Cousine share these advances, so they are listed too.
 */
export const LOCAL_BASES = {
  sans: { regular: { local: ['Arial', 'ArialMT', 'Liberation Sans', 'Arimo'], avgWidth: 0.44635 }, bold: { local: ['Arial Bold', 'Arial-BoldMT', 'Liberation Sans Bold', 'Arimo Bold'], avgWidth: 0.48113 }, generic: 'sans-serif' },
  serif: { regular: { local: ['Times New Roman', 'TimesNewRomanPSMT', 'Liberation Serif', 'Tinos'], avgWidth: 0.41003 }, bold: { local: ['Times New Roman Bold', 'TimesNewRomanPS-BoldMT', 'Liberation Serif Bold', 'Tinos Bold'], avgWidth: 0.43448 }, generic: 'serif' },
  mono: { regular: { local: ['Courier New', 'CourierNewPSMT', 'Liberation Mono', 'Cousine'], avgWidth: 0.6001 }, bold: { local: ['Courier New Bold', 'CourierNewPS-BoldMT', 'Liberation Mono Bold', 'Cousine Bold'], avgWidth: 0.6001 }, generic: 'monospace' },
};

const pct = (v) => `${+(v * 100).toFixed(2)}%`;

/**
 * @font-face rules for "<family> Fallback": a local face scaled so its average advance matches the web
 * font's, with the web font's vertical metrics, so text keeps its line breaks and height when the web
 * font swaps in. Two faces: regular (100–549) on the regular local face, bold (550–1000) on the bold one.
 */
export function fallbackFaces(family, metrics, kind = 'sans') {
  const base = LOCAL_BASES[kind] ?? LOCAL_BASES.sans;
  // The width ratio is taken at the weight the file was measured at; it holds closely across weights.
  const ref = (metrics.weight ?? 400) >= 550 ? base.bold : base.regular;
  const size = metrics.avgWidth / ref.avgWidth;
  const face = (b, range) => `@font-face {\n  font-family: "${family} Fallback";\n  src: ${b.local.map((n) => `local("${n}")`).join(', ')};\n  font-weight: ${range};\n  size-adjust: ${pct(size)};\n  ascent-override: ${pct(metrics.ascent / size)};\n  descent-override: ${pct(metrics.descent / size)};\n  line-gap-override: ${pct(metrics.lineGap / size)};\n}\n`;
  return { sizeAdjust: +size.toFixed(4), css: face(base.regular, '100 549') + face(base.bold, '550 1000'), generic: base.generic };
}
