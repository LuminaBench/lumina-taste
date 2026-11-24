import { chart, gutter, seriesColor, tipHtml, xLabels, yGrid, type ChartOptions, type Mark } from '../core/frame';
import { extent, linear, niceDomain, sqrtScale } from '../core/scale';
import { el, overlaps, r, textWidth, type Box } from '../core/svg';
import { formatNumber, type NumberFormat } from '../core/format';
import '../core/charts.css';

export interface Bubble { x: number; y: number; size: number; label: string; group?: string }
export interface BubbleOptions extends ChartOptions { xFormat?: NumberFormat; sizeFormat?: NumberFormat; xLabel?: string; yLabel?: string; sizeLabel?: string }

/** Bubble chart: area encodes size; labels are placed around each bubble and dropped if they would collide. */
export function render(host: HTMLElement, data: Bubble[], opts: BubbleOptions = {}) {
  return chart(host, data, { height: (w: number) => Math.round(Math.min(380, Math.max(260, w * 0.56))), ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const m = { t: 24, b: 40 };
    const groups = [...new Set(d.map((b) => b.group ?? ''))];
    const maxR = Math.max(14, Math.min(34, width / 18));
    const rs = sqrtScale(Math.max(...d.map((b) => b.size)), maxR);
    const y = linear(niceDomain(...extent(d.map((b) => b.y)), 5), [height - m.b, m.t + 6]);
    const gl = gutter(y, fmt);
    const x = linear(niceDomain(...extent(d.map((b) => b.x)), 5), [gl + maxR, width - maxR]);
    yGrid(svg, y, gl, width, fmt);
    svg.append(el('line', { x1: gl, x2: width, y1: height - m.b, y2: height - m.b, class: 'lt-baseline' }));
    xLabels(svg, x.ticks(Math.max(2, Math.floor(width / 90))).map((t) => ({ x: x(t), text: formatNumber(t, o.xFormat) })), height - m.b + 16, width);
    if (o.xLabel) svg.append(el('text', { x: width, y: height - 4, 'text-anchor': 'end', class: 'lt-label-muted' }, [o.xLabel]));
    const g = el('g');
    const byArea = [...d].sort((a, b) => b.size - a.size); // big first, small drawn on top
    for (const b of byArea) {
      const c = seriesColor(Math.max(0, groups.indexOf(b.group ?? '')));
      g.append(el('circle', { cx: r(x(b.x)), cy: r(y(b.y)), r: r(rs(b.size)), class: 'lt-mark', style: `fill: color-mix(in oklab, ${c} 55%, transparent); stroke: ${c}; stroke-width: 1.25` }));
    }
    svg.append(g);
    // Label collision avoidance: try above, right, left, below; skip if every slot collides.
    const placed: Box[] = byArea.map((b) => ({ x: x(b.x) - rs(b.size), y: y(b.y) - rs(b.size), w: rs(b.size) * 2, h: rs(b.size) * 2 }));
    const lg = el('g');
    let dropped = 0;
    for (const b of [...d].sort((a, c) => c.size - a.size)) {
      const w = textWidth(b.label, '600 11px system-ui'), h = 12, cx = x(b.x), cy = y(b.y), rad = rs(b.size);
      const slots: Array<[number, number, string]> = [[cx, cy - rad - 5, 'middle'], [cx + rad + 5, cy + 4, 'start'], [cx - rad - 5, cy + 4, 'end'], [cx, cy + rad + 14, 'middle'], [cx + rad * 0.7 + 4, cy - rad * 0.7 - 2, 'start'], [cx - rad * 0.7 - 4, cy - rad * 0.7 - 2, 'end']];
      const slot = slots.find(([sx, sy, a]) => {
        const box: Box = { x: a === 'middle' ? sx - w / 2 : a === 'end' ? sx - w : sx, y: sy - h + 2, w, h };
        if (box.x < 0 || box.x + box.w > width || box.y < 0 || box.y + box.h > height - m.b) return false;
        return !placed.some((p) => overlaps(p, box, 1));
      });
      if (!slot) { dropped++; continue; }
      const [sx, sy, a] = slot;
      placed.push({ x: a === 'middle' ? sx - w / 2 : a === 'end' ? sx - w : sx, y: sy - h + 2, w, h });
      lg.append(el('text', { x: r(sx), y: r(sy), 'text-anchor': a, class: 'lt-label', style: 'fill: var(--text-primary); font-size: 11px' }, [b.label]));
    }
    svg.append(lg);
    const marks: Mark[] = d.map((b) => ({ x: x(b.x), y: y(b.y), html: tipHtml(b.label, [{ color: seriesColor(Math.max(0, groups.indexOf(b.group ?? ''))), label: o.xLabel ?? 'x', value: formatNumber(b.x, o.xFormat) }, { label: o.yLabel ?? 'y', value: fmt(b.y) }, { label: o.sizeLabel ?? 'Size', value: formatNumber(b.size, o.sizeFormat) }]), text: `${b.label}: ${formatNumber(b.x, o.xFormat)}, ${fmt(b.y)}, size ${formatNumber(b.size, o.sizeFormat)}` }));
    ctx.interact({ mode: 'nearest', marks, radius: maxR });
    return { summary: `Bubble chart of ${d.length} items; ${d.length - dropped} labelled directly, the rest in the tooltip.`, table: { head: ['Item', o.xLabel ?? 'x', o.yLabel ?? 'y', o.sizeLabel ?? 'Size'], rows: d.map((b) => [b.label, formatNumber(b.x, o.xFormat), fmt(b.y), formatNumber(b.size, o.sizeFormat)]) } };
  });
}

export function demo(host: HTMLElement) {
  const rows: Array<[string, number, number, number, string]> = [
    ['Atlas', 42, 118, 3200, 'Enterprise'], ['Beacon', 28, 96, 1400, 'Mid-market'], ['Cobalt', 61, 131, 5100, 'Enterprise'], ['Delta', 18, 84, 600, 'SMB'],
    ['Ember', 35, 104, 2100, 'Mid-market'], ['Fjord', 52, 122, 2600, 'Enterprise'], ['Garnet', 24, 91, 900, 'SMB'], ['Harbor', 46, 112, 1800, 'Mid-market'],
    ['Iris', 12, 76, 420, 'SMB'], ['Juniper', 57, 109, 3900, 'Enterprise'], ['Kestrel', 31, 99, 1200, 'Mid-market'], ['Linden', 21, 88, 700, 'SMB'],
  ];
  return render(host, rows.map(([label, x, y, size, group]) => ({ label, x, y, size, group })), {
    title: 'Bigger accounts expand faster', subtitle: 'Seats (x) vs. net revenue retention (y); bubble = annual revenue',
    xLabel: 'Seats', yLabel: 'NRR', sizeLabel: 'ARR', format: { suffix: '%' }, sizeFormat: { prefix: '£', suffix: 'k' }, source: 'Source: synthetic accounts',
  });
}
