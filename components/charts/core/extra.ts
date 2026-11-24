// Treemap, Gantt, waffle and radial bars. All draw through the shared frame.
import { chart, seriesColor, tipHtml, type ChartInstance, type ChartOptions, type Mark } from './frame';
import { band, linear } from './scale';
import { arcPath, el, r, textWidth } from './svg';
import { legend } from './kit';
import { formatDate, toDate } from './format';

// ---------------------------------------------------------------- treemap (squarified)
export interface TreeItem { label: string; value: number; group?: string }
interface Rect { x: number; y: number; w: number; h: number }

function squarify<T extends { value: number }>(items: T[], box: Rect): Array<T & Rect> {
  const out: Array<T & Rect> = [];
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  const scale = (box.w * box.h) / total;
  let rest = [...items].sort((a, b) => b.value - a.value);
  let { x, y, w, h } = box;
  const worst = (row: T[], side: number) => {
    const s = row.reduce((a, i) => a + i.value * scale, 0);
    const mx = Math.max(...row.map((i) => i.value * scale)), mn = Math.min(...row.map((i) => i.value * scale));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (rest.length) {
    const side = Math.min(w, h);
    let row = [rest[0]];
    let i = 1;
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) { row.push(rest[i]); i++; }
    rest = rest.slice(i);
    const area = row.reduce((a, it) => a + it.value * scale, 0);
    if (w >= h) {
      const cw = area / h; let cy = y;
      for (const it of row) { const ch = (it.value * scale) / cw; out.push({ ...it, x, y: cy, w: cw, h: ch }); cy += ch; }
      x += cw; w -= cw;
    } else {
      const chh = area / w; let cx = x;
      for (const it of row) { const cw = (it.value * scale) / chh; out.push({ ...it, x: cx, y, w: cw, h: chh }); cx += cw; }
      y += chh; h -= chh;
    }
  }
  return out;
}

export function treemap(host: HTMLElement, data: TreeItem[], opts: ChartOptions & { groups?: string[] } = {}): ChartInstance<TreeItem[]> {
  return chart(host, data, { height: (w: number) => Math.round(Math.min(420, Math.max(260, w * 0.55))), ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const groups = o.groups ?? [...new Set(d.map((i) => i.group ?? ''))].filter(Boolean);
    const lh = groups.length > 1 ? legend(svg, groups.map((g, i) => ({ name: g, color: seriesColor(i) })), width) : 0;
    const total = d.reduce((a, i) => a + i.value, 0) || 1;
    const cells = squarify(d, { x: 0, y: lh, w: width, h: height - lh });
    const g = el('g');
    const marks: Mark[] = [];
    for (const c of cells) {
      const gi = Math.max(0, groups.indexOf(c.group ?? ''));
      // Light tint (darker tint in dark mode) so labels always sit on a surface-like fill in primary ink;
      // a solid strip along the top carries the group colour.
      const fill = `color-mix(in oklab, ${seriesColor(gi)} ${Math.round(14 + 16 * (c.value / Math.max(...d.map((i) => i.value))))}%, var(--bg-surface-1))`;
      const cw = Math.max(0, c.w - 2), ch = Math.max(0, c.h - 2);
      g.append(el('rect', { x: r(c.x + 1), y: r(c.y + 1), width: r(cw), height: r(ch), rx: 3, class: 'lt-mark', style: `fill: ${fill}` }));
      g.append(el('rect', { x: r(c.x + 1), y: r(c.y + 1), width: r(cw), height: r(Math.min(3, ch)), rx: 1.5, style: `fill: ${seriesColor(gi)}` }));
      const share = `${Math.round((c.value / total) * 100)}%`;
      if (c.w > textWidth(c.label, '600 12px system-ui') + 16 && c.h > 44) {
        g.append(el('text', { x: r(c.x + 10), y: r(c.y + 22), style: 'fill: var(--text-primary); font-size: 12px; font-weight: 600' }, [c.label]));
        g.append(el('text', { x: r(c.x + 10), y: r(c.y + 38), style: 'fill: var(--text-primary); font-size: 11px; font-variant-numeric: tabular-nums' }, [`${fmt(c.value)} · ${share}`]));
      }
      marks.push({ x: c.x + c.w / 2, y: c.y + c.h / 2, hit: { x: c.x, y: c.y, w: c.w, h: c.h }, html: tipHtml(c.label, [{ color: seriesColor(gi), label: c.group ?? 'Value', value: fmt(c.value) }, { label: 'Share', value: share }]), text: `${c.label}: ${fmt(c.value)}, ${share}` });
    }
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    const top = [...d].sort((a, b) => b.value - a.value)[0];
    return { summary: `Treemap of ${d.length} parts. Largest: ${top?.label} at ${Math.round(((top?.value ?? 0) / total) * 100)}%.`, table: { head: ['Part', 'Group', 'Value'], rows: d.map((i) => [i.label, i.group ?? '', fmt(i.value)]) } };
  });
}

// ---------------------------------------------------------------- Gantt
export interface GanttTask { label: string; start: string; end: string; group?: string; done?: number; milestone?: boolean }
export function gantt(host: HTMLElement, data: GanttTask[], opts: ChartOptions & { today?: string } = {}): ChartInstance<GanttTask[]> {
  const rowH = 30;
  return chart(host, data, { height: () => data.length * rowH + 40, ...opts }, (ctx, d, o) => {
    const { svg, width, height } = ctx;
    const groups = [...new Set(d.map((t) => t.group ?? ''))];
    const t0 = Math.min(...d.map((t) => +toDate(t.start))), t1 = Math.max(...d.map((t) => +toDate(t.end)));
    const labelW = Math.min(width * 0.3, Math.max(...d.map((t) => textWidth(t.label, '12px system-ui'))) + 16);
    const x = linear([t0, t1], [labelW, width - 8]);
    const y = band(d.map((t) => t.label), [24, height - 6], 0.35, 0.05);
    const axis = el('g', { class: 'lt-grid' });
    const day = 864e5, span = (t1 - t0) / day;
    const pxPerDay = (x(t1) - x(t0)) / Math.max(1, span);
    const step = [1, 7, 14, 30, 61, 91].find((s) => s * pxPerDay >= 64) ?? 182;
    for (let t = t0; t <= t1; t += step * day) {
      const px = r(x(t));
      axis.append(el('line', { x1: px, x2: px, y1: 20, y2: height - 6, class: 'lt-vgrid' }));
      if (x(t) + 40 < width) axis.append(el('text', { x: px + 4, y: 12, class: 'lt-tick' }, [formatDate(new Date(t), span)]));
    }
    svg.append(axis);
    if (o.today) { const tx = r(x(+toDate(o.today))); svg.append(el('line', { x1: tx, x2: tx, y1: 16, y2: height - 4, style: 'stroke: var(--status-negative); stroke-width: 1.5' })); svg.append(el('text', { x: tx + 4, y: height - 8, style: 'fill: var(--status-negative); font-size: 10.5px; font-weight: 600' }, ['Today'])); }
    const g = el('g');
    const marks: Mark[] = [];
    d.forEach((t) => {
      const cy = y(t.label) + y.bandwidth / 2, c = seriesColor(Math.max(0, groups.indexOf(t.group ?? '')));
      g.append(el('text', { x: labelW - 10, y: r(cy + 4), 'text-anchor': 'end', style: 'fill: var(--text-primary); font-size: 12px' }, [t.label]));
      const a = x(+toDate(t.start)), b = x(+toDate(t.end));
      if (t.milestone) {
        g.append(el('path', { d: `M${r(a)},${r(cy - 7)}L${r(a + 7)},${r(cy)}L${r(a)},${r(cy + 7)}L${r(a - 7)},${r(cy)}Z`, class: 'lt-mark', style: `fill: ${c}` }));
      } else {
        const w = Math.max(4, b - a);
        g.append(el('rect', { x: r(a), y: r(y(t.label)), width: r(w), height: r(y.bandwidth), rx: 4, class: 'lt-mark', style: `fill: color-mix(in oklab, ${c} 30%, var(--bg-surface-1))` }));
        if (t.done) g.append(el('rect', { x: r(a), y: r(y(t.label)), width: r(w * Math.min(1, t.done)), height: r(y.bandwidth), rx: 4, style: `fill: ${c}` }));
      }
      marks.push({ x: (a + b) / 2, y: cy, hit: { x: 0, y: y(t.label) - 4, w: width, h: y.bandwidth + 8 }, html: tipHtml(t.label, [{ color: c, label: 'Start', value: formatDate(t.start, 30) }, { label: t.milestone ? 'Milestone' : 'End', value: formatDate(t.end, 30) }, ...(t.done != null ? [{ label: 'Done', value: `${Math.round(t.done * 100)}%` }] : [])]), text: `${t.label}: ${formatDate(t.start, 30)} to ${formatDate(t.end, 30)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Gantt chart of ${d.length} tasks from ${formatDate(new Date(t0), 365)} to ${formatDate(new Date(t1), 365)}.`, table: { head: ['Task', 'Start', 'End', 'Done'], rows: d.map((t) => [t.label, t.start, t.end, t.done != null ? `${Math.round(t.done * 100)}%` : '']) } };
  });
}

// ---------------------------------------------------------------- waffle
export interface WaffleData { label: string; value: number; total?: number }
export function waffle(host: HTMLElement, data: WaffleData, opts: ChartOptions = {}): ChartInstance<WaffleData> {
  return chart(host, data, { height: () => 230, ...opts }, (ctx, d) => {
    const { svg, width, height } = ctx;
    const pct = Math.max(0, Math.min(100, Math.round((d.value / (d.total ?? 100)) * 100)));
    const size = Math.min((height - 10) / 10, 22), gap = 3, cell = size - gap;
    const g = el('g');
    for (let i = 0; i < 100; i++) {
      const col = i % 10, row = 9 - Math.floor(i / 10);
      g.append(el('rect', { x: r(col * size), y: r(row * size + 4), width: r(cell), height: r(cell), rx: 3, class: i < pct ? 'lt-mark' : '', style: `fill: ${i < pct ? 'var(--chart-1)' : 'var(--bg-surface-3)'}` }));
    }
    svg.append(g);
    const tx = size * 10 + 24;
    if (width - tx > 120) {
      svg.append(el('text', { x: tx, y: height / 2 - 4, style: 'fill: var(--text-primary); font-family: var(--font-display); font-size: 44px; font-weight: 700; letter-spacing: -0.03em; font-variant-numeric: tabular-nums' }, [`${pct}%`]));
      svg.append(el('text', { x: tx, y: height / 2 + 22, style: 'fill: var(--text-secondary); font-size: 13px' }, [d.label]));
    }
    ctx.interact({ mode: 'nearest', marks: [{ x: size * 5, y: height / 2, hit: { x: 0, y: 0, w: size * 10, h: height }, html: tipHtml(d.label, [{ color: 'var(--chart-1)', label: 'Share', value: `${pct}%` }]), text: `${d.label}: ${pct} in 100` }], radius: 200 });
    return { summary: `${pct} out of 100: ${d.label}.`, table: { head: ['Measure', 'Share'], rows: [[d.label, `${pct}%`]] } };
  });
}

// ---------------------------------------------------------------- radial bars
export interface RadialItem { label: string; value: number; max?: number }
export function radialBars(host: HTMLElement, data: RadialItem[], opts: ChartOptions = {}): ChartInstance<RadialItem[]> {
  return chart(host, data, { height: () => 260, ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const R = Math.min(height / 2 - 6, width / 2 - 10), cx = Math.min(width / 2, R + 10), cy = height / 2;
    const ring = Math.min(18, (R - 30) / d.length - 4);
    const g = el('g');
    const marks: Mark[] = [];
    const lx = cx + R + 28, showLegend = width - lx > 120;
    const rowY = (i: number) => cy - (d.length * 26) / 2 + i * 26 + 14;
    d.forEach((it, i) => {
      const r1 = R - i * (ring + 5), r0 = r1 - ring, t = Math.max(0, Math.min(1, it.value / (it.max ?? 100)));
      g.append(el('path', { d: arcPath(cx, cy, r0, r1, 0, Math.PI * 2 - 0.0001), style: 'fill: var(--bg-surface-3)' }));
      if (t > 0) g.append(el('path', { d: arcPath(cx, cy, r0, r1, 0, Math.PI * 2 * t - 0.0001), class: 'lt-mark', style: `fill: ${seriesColor(i)}` }));
      marks.push({ x: cx + Math.sin(Math.PI * 2 * t) * (r0 + ring / 2), y: cy - Math.cos(Math.PI * 2 * t) * (r0 + ring / 2), html: tipHtml(it.label, [{ color: seriesColor(i), label: 'Value', value: fmt(it.value) }, { label: 'Of target', value: `${Math.round(t * 100)}%` }]), text: `${it.label}: ${fmt(it.value)}, ${Math.round(t * 100)}% of target`, ...(showLegend ? { hit: { x: lx - 4, y: rowY(i) - 15, w: width - lx + 4, h: 24 } } : {}) });
    });
    svg.append(g);
    // Legend beside the rings: colour, label and value in text ink.
    if (showLegend) d.forEach((it, i) => {
      const ly = rowY(i);
      svg.append(el('rect', { x: lx, y: ly - 9, width: 10, height: 10, rx: 2, style: `fill: ${seriesColor(i)}` }));
      svg.append(el('text', { x: lx + 16, y: ly, class: 'lt-label-muted', style: 'font-size: 12px' }, [it.label]));
      svg.append(el('text', { x: width - 4, y: ly, 'text-anchor': 'end', style: 'fill: var(--text-primary); font-size: 12px; font-weight: 650; font-variant-numeric: tabular-nums' }, [fmt(it.value)]));
    });
    ctx.interact({ mode: 'nearest', marks, radius: 60 });
    void o;
    return { summary: `Radial bars for ${d.length} measures against their targets.`, table: { head: ['Measure', 'Value', 'Target'], rows: d.map((i) => [i.label, fmt(i.value), fmt(i.max ?? 100)]) } };
  });
}
