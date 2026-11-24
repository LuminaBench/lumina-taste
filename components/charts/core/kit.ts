// Small building blocks shared by the leaderboard-style charts: group colours, wrapping legends,
// hatched "not available" fills, monogram chips, label wrapping and point-label placement.
import { seriesColor } from './frame';
import { el, r, textWidth, overlaps, type Box } from './svg';

/** Colour follows the entity: groups keep their slot in first-seen order, whatever the sort. */
export function groupColors(groups: Array<string | undefined>, order?: string[]) {
  const names = order ?? [...new Set(groups.filter((g): g is string => !!g))];
  const map = new Map(names.map((n, i) => [n, seriesColor(i)]));
  return { names, color: (g?: string) => (g && map.get(g)) || seriesColor(0) };
}

/** A legend that wraps onto as many rows as it needs. Returns the height it used. */
export function legend(svg: SVGSVGElement, items: Array<{ name: string; color: string; shape?: 'square' | 'dot' | 'line' | 'hatch' }>, width: number, y = 0, hatchId?: string) {
  if (!items.length) return 0;
  const g = el('g', { class: 'lt-legend' });
  let x = 0, row = 0;
  const rowH = 18;
  for (const it of items) {
    const w = 16 + textWidth(it.name, '11px system-ui') + 16;
    if (x > 0 && x + w > width) { x = 0; row++; }
    const cy = y + row * rowH + 7;
    if (it.shape === 'dot') g.append(el('circle', { cx: x + 5, cy, r: 4.5, style: `fill: ${it.color}` }));
    else if (it.shape === 'line') g.append(el('line', { x1: x, x2: x + 12, y1: cy, y2: cy, style: `stroke: ${it.color}; stroke-width: 2.5; stroke-linecap: round` }));
    else if (it.shape === 'hatch' && hatchId) g.append(el('rect', { x, y: cy - 5, width: 10, height: 10, rx: 2, style: `fill: url(#${hatchId}); stroke: var(--border-strong)` }));
    else g.append(el('rect', { x, y: cy - 5, width: 10, height: 10, rx: 2, style: `fill: ${it.color}` }));
    g.append(el('text', { x: x + 16, y: cy + 4, class: 'lt-label-muted' }, [it.name]));
    x += w;
  }
  svg.append(g);
  return (row + 1) * rowH + 6;
}

let hatchSeq = 0;
/** Diagonal hatch pattern for missing or estimated values. Returns its id. */
export function hatch(svg: SVGSVGElement) {
  const id = `lt-hatch-${++hatchSeq}`;
  const defs = el('defs');
  const p = el('pattern', { id, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  p.append(el('rect', { width: 6, height: 6, style: 'fill: var(--bg-surface-2)' }));
  p.append(el('line', { x1: 0, y1: 0, x2: 0, y2: 6, style: 'stroke: var(--border-strong); stroke-width: 2' }));
  defs.append(p);
  svg.append(defs);
  return id;
}

/** Two-letter monogram chip, tinted with the group colour. Text stays in text ink. */
export function monogram(parent: SVGElement, cx: number, cy: number, name: string, color: string, size = 16) {
  const letters = name.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
  parent.append(el('rect', { x: r(cx - size / 2), y: r(cy - size / 2), width: size, height: size, rx: 4, style: `fill: color-mix(in oklab, ${color} 24%, var(--bg-surface-1)); stroke: color-mix(in oklab, ${color} 55%, transparent); stroke-width: 1` }));
  parent.append(el('text', { x: r(cx), y: r(cy + 3), 'text-anchor': 'middle', style: 'fill: var(--text-primary); font-size: 7.5px; font-weight: 700; letter-spacing: 0.02em' }, [letters]));
}

/** Break a label into at most `lines` lines that fit `maxW`, ellipsising the last. */
export function wrap(label: string, maxW: number, font = '11px system-ui', lines = 2) {
  const words = label.split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (textWidth(next, font) <= maxW || !cur) cur = next;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; out[lines - 1] += '…'; }
  return out.map((l) => {
    let s = l;
    while (s.length > 2 && textWidth(s, font) > maxW) s = s.slice(0, -2) + '…';
    return s;
  });
}

/** Place labels next to points without collisions: try right, left, above, below; skip if none fit. */
export function placeLabels(points: Array<{ x: number; y: number; text: string; r?: number }>, bounds: Box, avoid: Box[] = [], font = '600 11px system-ui') {
  const placed: Box[] = [...avoid];
  return points.map((p) => {
    const w = textWidth(p.text, font), h = 12, gap = (p.r ?? 6) + 4;
    const tries: Array<[number, number, 'start' | 'end' | 'middle']> = [
      [p.x + gap, p.y + 4, 'start'], [p.x - gap, p.y + 4, 'end'], [p.x, p.y - gap - 2, 'middle'], [p.x, p.y + gap + 10, 'middle'],
    ];
    for (const [x, y, anchor] of tries) {
      const bx = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
      const box = { x: bx, y: y - h + 2, w, h };
      if (box.x < bounds.x || box.x + box.w > bounds.x + bounds.w || box.y < bounds.y || box.y + box.h > bounds.y + bounds.h) continue;
      if (placed.some((b) => overlaps(b, box, 1))) continue;
      placed.push(box);
      return { x, y, anchor, ok: true };
    }
    return { x: 0, y: 0, anchor: 'start' as const, ok: false };
  });
}

/** Quantiles of a sorted array (linear interpolation). */
export function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** Muted version of a colour for context marks. */
export const mute = (c: string, pct = 30) => `color-mix(in oklab, ${c} ${pct}%, var(--bg-surface-2))`;
