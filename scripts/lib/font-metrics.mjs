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

// ------------------------------------------------------------------ variable fonts
// Google serves the whole design space of a variable family whatever range the CSS asks for (Bitter's
// 700..800 file still runs from 100 to 900), and the default instance is often an extreme: Bitter, Big
// Shoulders and Manrope default to their thinnest weight, Fraunces to its heaviest. hmtx holds the default's
// advances, so widths must be read at the weight the page uses: fvar + avar normalise the location, HVAR
// gives each glyph's advance delta there.

/** [{ tag, min, def, max }] from fvar, or [] for a static font. */
export function fvarAxes(t) {
  if (!t.fvar) return [];
  const f = t.fvar.data, at = f.readUInt16BE(4), n = f.readUInt16BE(8), size = f.readUInt16BE(10);
  return Array.from({ length: n }, (_, i) => { const o = at + i * size; return { tag: tag4(f, o), min: f.readInt32BE(o + 4) / 65536, def: f.readInt32BE(o + 8) / 65536, max: f.readInt32BE(o + 12) / 65536 }; });
}

const f2 = (b, o) => b.readInt16BE(o) / 16384;

/** Normalised coordinates (-1…1, after avar) for a location such as { wght: 700, opsz: 18 }; axes not named stay at their default. */
export function normalizedCoords(t, at = {}) {
  const axes = fvarAxes(t);
  const coords = axes.map(({ tag, min, def, max }) => {
    const v = Math.min(max, Math.max(min, at[tag] ?? def));
    return v < def ? (def === min ? 0 : (v - def) / (def - min)) : v > def ? (max === def ? 0 : (v - def) / (max - def)) : 0;
  });
  if (t.avar) {
    const a = t.avar.data;
    let o = 8;
    for (let i = 0; i < Math.min(a.readUInt16BE(6), axes.length); i++) {
      const count = a.readUInt16BE(o); o += 2;
      const map = Array.from({ length: count }, (_, k) => [f2(a, o + k * 4), f2(a, o + k * 4 + 2)]);
      o += count * 4;
      const v = coords[i];
      for (let k = 1; k < map.length; k++) {
        if (v > map[k][0]) continue;
        const [x0, y0] = map[k - 1], [x1, y1] = map[k];
        coords[i] = x1 === x0 ? y1 : y0 + ((v - x0) * (y1 - y0)) / (x1 - x0);
        break;
      }
    }
  }
  return coords;
}

/** A glyph id → advance delta function from HVAR at the normalised coordinates, or null without HVAR. */
function hvarDeltas(t, coords) {
  if (!t.HVAR) return null;
  const h = t.HVAR.data;
  const store = h.readUInt32BE(4), mapAt = h.readUInt32BE(8);
  const regionsAt = store + h.readUInt32BE(store + 2), dataCount = h.readUInt16BE(store + 6);
  const axisCount = h.readUInt16BE(regionsAt), regionCount = h.readUInt16BE(regionsAt + 2);
  const scalars = Array.from({ length: regionCount }, (_, r) => {
    let s = 1;
    for (let a = 0; a < axisCount; a++) {
      const o = regionsAt + 4 + (r * axisCount + a) * 6;
      const start = f2(h, o), peak = f2(h, o + 2), end = f2(h, o + 4), v = coords[a] ?? 0;
      if (start > peak || peak > end || (start < 0 && end > 0 && peak !== 0) || peak === 0 || v === peak) continue;
      if (v <= start || v >= end) return 0;
      s *= v < peak ? (v - start) / (peak - start) : (end - v) / (end - peak);
    }
    return s;
  });
  const data = Array.from({ length: dataCount }, (_, i) => {
    const o = store + h.readUInt32BE(store + 8 + i * 4);
    const itemCount = h.readUInt16BE(o), wdc = h.readUInt16BE(o + 2), regionIdx = h.readUInt16BE(o + 4);
    const long = !!(wdc & 0x8000), words = wdc & 0x7fff;
    const regions = Array.from({ length: regionIdx }, (_, k) => h.readUInt16BE(o + 6 + k * 2));
    const rowSize = long ? words * 4 + (regionIdx - words) * 2 : words * 2 + (regionIdx - words);
    const rows = o + 6 + regionIdx * 2;
    return (inner) => {
      if (inner >= itemCount) return 0;
      let d = 0, p = rows + inner * rowSize;
      for (let k = 0; k < regionIdx; k++) {
        const big = k < words;
        const v = long ? (big ? h.readInt32BE(p) : h.readInt16BE(p)) : big ? h.readInt16BE(p) : h.readInt8(p);
        p += long ? (big ? 4 : 2) : big ? 2 : 1;
        d += v * scalars[regions[k]];
      }
      return d;
    };
  });
  let map = (g) => [0, g];
  if (mapAt) {
    const format = h[mapAt], entry = h[mapAt + 1];
    const count = format === 0 ? h.readUInt16BE(mapAt + 2) : h.readUInt32BE(mapAt + 2);
    const first = mapAt + (format === 0 ? 4 : 6), size = ((entry & 0x30) >> 4) + 1, innerBits = (entry & 0x0f) + 1;
    map = (g) => {
      const at = first + Math.min(g, count - 1) * size;
      let v = 0;
      for (let k = 0; k < size; k++) v = v * 256 + h[at + k];
      return [Math.floor(v / 2 ** innerBits), v & (2 ** innerBits - 1)];
    };
  }
  return (g) => { const [outer, inner] = map(g); return data[outer]?.(inner) ?? 0; };
}

/**
 * Metrics of one font file. `avgWidth` is the mean advance over SAMPLE in em; `ascent`, `descent`, `lineGap`
 * are in em, taken from OS/2 typo metrics when the font asks for them (USE_TYPO_METRICS), else from hhea.
 * `defaultWght` is the wght axis default of a variable font (null for static fonts).
 * `at` reads a variable font at a location ({ wght: 700, opsz: 48 }); `weight` is then the weight measured.
 * Without HVAR the advances are the default instance's (fine for monospaced faces, which keep their width).
 */
export function fontMetrics(buf, at = null) {
  const t = readTables(Buffer.from(buf));
  for (const need of ['head', 'hhea', 'hmtx', 'cmap']) if (!t[need]) throw new Error(`font has no ${need} table`);
  const head = t.head.data, hhea = t.hhea.data, hmtx = t.hmtx.data, os2 = t['OS/2']?.data;
  const upm = head.readUInt16BE(18);
  const nh = hhea.readUInt16BE(34);
  // Transformed hmtx (WOFF2) starts with a flags byte, then the same advanceWidth[] run without side bearings.
  const advance = t.hmtx.transformed ? (g) => hmtx.readUInt16BE(1 + Math.min(g, nh - 1) * 2) : (g) => hmtx.readUInt16BE(Math.min(g, nh - 1) * 4);
  const glyph = cmapLookup(t.cmap.data);
  const axes = fvarAxes(t);
  const delta = at && axes.length ? hvarDeltas(t, normalizedCoords(t, at)) : null;
  let sum = 0, count = 0;
  for (const ch of SAMPLE) { const g = glyph(ch.codePointAt(0)); if (g) { sum += advance(g) + (delta ? delta(g) : 0); count++; } }
  const useTypo = os2 && os2.length >= 74 && (os2.readUInt16BE(62) & 0x80);
  const [asc, desc, gap] = useTypo ? [os2.readInt16BE(68), os2.readInt16BE(70), os2.readInt16BE(72)] : [hhea.readInt16BE(4), hhea.readInt16BE(6), hhea.readInt16BE(8)];
  const wghtAxis = axes.find((a) => a.tag === 'wght');
  const defaultWght = wghtAxis ? wghtAxis.def : null;
  const weightClass = os2 && os2.length >= 6 ? os2.readUInt16BE(4) : 400;
  const measuredAt = wghtAxis && at?.wght != null ? Math.min(wghtAxis.max, Math.max(wghtAxis.min, at.wght)) : null;
  return {
    unitsPerEm: upm,
    ascent: +(asc / upm).toFixed(4), descent: +(Math.abs(desc) / upm).toFixed(4), lineGap: +(gap / upm).toFixed(4),
    avgWidth: count ? +((sum / count) / upm).toFixed(5) : null,
    weight: measuredAt ?? defaultWght ?? weightClass, defaultWght,
    ...(axes.length ? { axes: Object.fromEntries(axes.map((a) => [a.tag, [a.min, a.def, a.max]])) } : {}),
    ...(at && axes.length && !t.HVAR ? { noHvar: true } : {}),
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
 * Where a family's fallback faces should match it: the weight and optical size the pairing sets it at.
 * The regular face (100–549) stands in for body text (or a light headline); the bold face (550–1000) for a
 * heavy headline, or for bold inside body copy (600). Optical size follows the text size: the desktop body
 * size for text, the desktop --step-4 for headlines (an opsz face is up to 10% narrower at headline size).
 */
export function faceTargets(pairing, family) {
  const roles = pairing.fonts?.find((f) => f.family === family)?.roles ?? ['body'];
  const display = roles.includes('display'), text = roles.includes('body') || !display;
  const bodyOpsz = Math.round(pairing.base[1]), displayOpsz = Math.round(pairing.base[1] * pairing.ratio[1] ** 4);
  const bodyW = roles.includes('body') ? pairing.bodyWeight : 400;
  return {
    regular: { wght: text ? bodyW : pairing.displayWeight < 550 ? pairing.displayWeight : 400, opsz: text ? bodyOpsz : displayOpsz },
    bold: { wght: display && pairing.displayWeight >= 550 ? pairing.displayWeight : 600, opsz: display ? displayOpsz : bodyOpsz },
  };
}

/**
 * @font-face rules for "<family> Fallback": a local face scaled so its average advance matches the web
 * font's, with the web font's vertical metrics, so text keeps its line breaks and height when the web
 * font swaps in. Two faces: regular (100–549) on the regular local face, bold (550–1000) on the bold one.
 * `metrics` is either one measurement (applied to both faces) or { regular, bold }, each measured at its
 * faceTargets() location: a web font widens with weight at its own rate, so each face gets its own scale.
 */
export function fallbackFaces(family, metrics, kind = 'sans') {
  const base = LOCAL_BASES[kind] ?? LOCAL_BASES.sans;
  const perFace = metrics.regular && metrics.bold;
  // A single measurement is compared with the local face of its own weight and used for both faces.
  const one = perFace ? null : metrics.avgWidth / ((metrics.weight ?? 400) >= 550 ? base.bold : base.regular).avgWidth;
  const sizeOf = (which) => (perFace ? metrics[which].avgWidth / base[which].avgWidth : one);
  const v = (which) => (perFace ? metrics[which] : metrics);
  const face = (which, range) => {
    const size = sizeOf(which), m = v(which);
    return `@font-face {\n  font-family: "${family} Fallback";\n  src: ${base[which].local.map((n) => `local("${n}")`).join(', ')};\n  font-weight: ${range};\n  size-adjust: ${pct(size)};\n  ascent-override: ${pct(m.ascent / size)};\n  descent-override: ${pct(m.descent / size)};\n  line-gap-override: ${pct(m.lineGap / size)};\n}\n`;
  };
  return { sizeAdjust: +sizeOf('regular').toFixed(4), sizeAdjustBold: +sizeOf('bold').toFixed(4), css: face('regular', '100 549') + face('bold', '550 1000'), generic: base.generic };
}

/**
 * tokens/typography/fallbacks.css: every family's "<Family> Fallback" faces from the metrics stored in
 * source.json (measured on the real Google files by fonts.mjs at faceTargets()). A family shared by several
 * pairings gets one definition, from the first pairing that sets it as a headline or body face.
 */
export function fallbackStylesheet(pairings) {
  const seen = new Map();
  for (const p of pairings) for (const f of p.fonts ?? []) {
    if (!f.metrics) continue;
    const text = f.roles.some((r) => r !== 'mono');
    const prev = seen.get(f.family);
    if (!prev || (!prev.text && text)) seen.set(f.family, { f, text });
  }
  let css = '/* Metric-matched fallbacks, generated by scripts/build-tokens.mjs from the metrics in tokens/typography/source.json. Do not edit.\n'
    + '   Link this after the Google Fonts stylesheet when a page uses the pairing\'s webfont link: while the web font loads, text is set\n'
    + '   in a local face scaled to its widths and heights, so nothing moves when it arrives. Pages that load no web font should not\n'
    + '   link it (the stacks\' installed faces look closer to the real one); self-hosted pages get these faces from fonts.mjs. */\n';
  for (const [family, { f }] of [...seen].sort(([a], [b]) => a.localeCompare(b))) {
    const m = f.metrics, v = { ascent: m.ascent, descent: m.descent, lineGap: m.lineGap };
    css += fallbackFaces(family, { regular: { ...v, avgWidth: m.regular.avgWidth }, bold: { ...v, avgWidth: m.bold.avgWidth } }, f.fallback).css;
  }
  return css;
}
