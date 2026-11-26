// Google Fonts CSS2 URLs: read the axes and weights a pairing asks for, and write a request for exactly those.
// Shared by build-tokens.mjs (axis tokens) and fonts.mjs (self-hosting).

/**
 * "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,700..800&family=Barlow:wght@400;500" →
 * [{ family: 'Archivo', axes: { wdth: [125, 125], wght: [700, 800] } }, { family: 'Barlow', weights: [400, 500] }]
 * A family with no axis list (family=Courier+Prime) asks for its regular weight only.
 */
export function parseWebfont(url) {
  if (!url) return [];
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : url;
  const out = [];
  for (const part of q.split('&')) {
    if (!part.startsWith('family=')) continue;
    const [name, spec] = decodeURIComponent(part.slice(7)).replace(/\+/g, ' ').split(':');
    if (!spec) { out.push({ family: name, weights: [400], italic: false }); continue; }
    const [axisList, values] = spec.split('@');
    const axes = axisList.split(',');
    const tuples = values.split(';').map((t) => t.split(','));
    const entry = { family: name, italic: false };
    const ranges = {};
    for (const tuple of tuples) {
      axes.forEach((axis, i) => {
        const v = tuple[i];
        if (axis === 'ital') { if (v === '1') entry.italic = true; return; }
        const [lo, hi = lo] = v.split('..').map(Number);
        const r = (ranges[axis] ??= [lo, hi]);
        r[0] = Math.min(r[0], lo); r[1] = Math.max(r[1], hi);
      });
    }
    // Several tuples on wght alone (400;500;600) are static cuts: keep the list.
    if (axes.length === 1 && axes[0] === 'wght' && tuples.length > 1) entry.weights = tuples.map((t) => Number(t[0]));
    else if (Object.keys(ranges).length === 1 && ranges.wght && ranges.wght[0] === ranges.wght[1]) entry.weights = [ranges.wght[0]];
    else entry.axes = ranges;
    out.push(entry);
  }
  return out;
}

/**
 * One CSS2 `family=` parameter. Axis tags go in the API's order (lowercase tags alphabetically); a
 * one-value axis is pinned, a two-value one is a range.
 */
export function familyParam({ family, axes, weights }) {
  const name = family.replace(/ /g, '+');
  if (weights) return `family=${name}:wght@${[...new Set(weights)].sort((a, b) => a - b).join(';')}`;
  const tags = Object.keys(axes).sort();
  const vals = tags.map((t) => { const [lo, hi] = axes[t]; return lo === hi ? String(lo) : `${lo}..${hi}`; });
  return `family=${name}:${tags.join(',')}@${vals.join(',')}`;
}

export const css2Url = (base, specs, display = 'swap') => `${base}?${specs.map(familyParam).join('&')}&display=${display}`;

/** The @font-face blocks of a CSS2 response, each with the subset named in the comment before it. */
export function parseCss(css) {
  const faces = [];
  for (const m of css.matchAll(/(?:\/\*\s*([\w-]+)\s*\*\/\s*)?@font-face\s*{([^}]*)}/g)) {
    const body = m[2];
    const prop = (k) => body.match(new RegExp(`${k}\\s*:\\s*([^;]+);`))?.[1].trim();
    const src = body.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)\s*format\(\s*['"]?([\w-]+)['"]?\s*\)/);
    if (!src) continue;
    faces.push({
      subset: m[1] ?? 'all', family: prop('font-family')?.replace(/['"]/g, ''), style: prop('font-style') ?? 'normal',
      weight: prop('font-weight') ?? '400', stretch: prop('font-stretch') ?? null, unicodeRange: prop('unicode-range') ?? null,
      url: src[1], format: src[2],
    });
  }
  return faces;
}

/**
 * One face per file. Asked for separate weights of a variable family (IBM+Plex+Sans:wght@400;500;600), the
 * real API answers with one @font-face per weight, all pointing at the same variable file: keep one face with
 * the weight range those blocks cover, so the file is downloaded and declared once. Static families (Barlow)
 * get a file per weight and keep a face per weight.
 */
export function mergeFaces(list) {
  const byUrl = new Map();
  for (const f of list) {
    const prev = byUrl.get(f.url);
    if (!prev) { byUrl.set(f.url, { ...f }); continue; }
    const nums = `${prev.weight} ${f.weight}`.split(/\s+/).map(Number).filter(Number.isFinite);
    const lo = Math.min(...nums), hi = Math.max(...nums);
    prev.weight = lo === hi ? String(lo) : `${lo} ${hi}`;
  }
  return [...byUrl.values()];
}
