// More chart forms: slope, dumbbell, waterfall, histogram, box plot, bullet, bump,
// 100% stacked bars, beeswarm and small multiples. All draw through the shared frame.
import { chart, gutter, seriesColor, tipHtml, xLabels, yGrid, xGrid, type ChartInstance, type ChartOptions, type Mark } from './frame';
import { formatX, formatXFull } from './format';
import { band, extent, linear, niceDomain, niceStep, points, tickIndices } from './scale';
import { areaPath, el, linePath, r, relax, textWidth } from './svg';
import { legend, quantile, wrap } from './kit';
import { readableOn } from './contrast';

const hiOf = (h: string | string[] | undefined, label: string) => !h || (Array.isArray(h) ? h.includes(label) : h === label);
const LBL = 'fill: var(--text-primary); font-size: 12px';

// ---------------------------------------------------------------- slope
export interface SlopeData { from: string; to: string; items: Array<{ label: string; a: number; b: number }> }
export interface HighlightOptions extends ChartOptions { highlight?: string | string[] }

export function slope(host: HTMLElement, data: SlopeData, opts: HighlightOptions = {}): ChartInstance<SlopeData> {
  return chart(host, data, { height: (w: number) => Math.max(260, Math.min(380, data.items.length * 34 + 40, w * 0.7)), ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    // Default emphasis: the biggest mover in each direction.
    const moves = [...d.items].sort((p, q) => (q.b - q.a) - (p.b - p.a));
    const hl = o.highlight ?? [moves[0]?.label, moves[moves.length - 1]?.label].filter(Boolean) as string[];
    const lw = Math.min(width * 0.3, Math.max(...d.items.map((i) => textWidth(`${i.label} ${fmt(Math.max(i.a, i.b))}`, '12px system-ui'))) + 14);
    const x0 = lw, x1 = width - lw;
    const y = linear(niceDomain(...extent(d.items.flatMap((i) => [i.a, i.b])), 5), [height - 12, 30]);
    svg.append(el('text', { x: x0, y: 14, 'text-anchor': 'middle', class: 'lt-tick', style: 'font-weight: 600' }, [d.from]));
    svg.append(el('text', { x: x1, y: 14, 'text-anchor': 'middle', class: 'lt-tick', style: 'font-weight: 600' }, [d.to]));
    for (const x of [x0, x1]) svg.append(el('line', { x1: x, x2: x, y1: 24, y2: height - 6, class: 'lt-baseline' }));
    const ya = relax(d.items.map((i) => y(i.a)), 14, 30, height - 8), yb = relax(d.items.map((i) => y(i.b)), 14, 30, height - 8);
    const g = el('g');
    const marks: Mark[] = [];
    const order = d.items.map((_, i) => i).sort((p, q) => Number(hiOf(hl, d.items[p].label)) - Number(hiOf(hl, d.items[q].label)));
    for (const i of order) {
      const it = d.items[i], on = hiOf(hl, it.label);
      const c = on ? (it.b >= it.a ? 'var(--chart-1)' : 'var(--chart-2)') : 'var(--border-strong)';
      g.append(el('line', { x1: x0, x2: x1, y1: r(y(it.a)), y2: r(y(it.b)), class: 'lt-mark', style: `stroke: ${c}; stroke-width: ${on ? 2.5 : 1.5}` }));
      for (const [x, v] of [[x0, it.a], [x1, it.b]] as const) g.append(el('circle', { cx: x, cy: r(y(v)), r: on ? 4.5 : 3.5, style: `fill: ${c}; stroke: var(--bg-surface-1); stroke-width: 2` }));
      const ink = on ? 'var(--text-primary)' : 'var(--text-secondary)';
      g.append(el('text', { x: x0 - 10, y: r(ya[i] + 4), 'text-anchor': 'end', style: `fill: ${ink}; font-size: 12px; font-weight: ${on ? 600 : 400}` }, [`${it.label} ${fmt(it.a)}`]));
      g.append(el('text', { x: x1 + 10, y: r(yb[i] + 4), style: `fill: ${ink}; font-size: 12px; font-weight: ${on ? 600 : 400}` }, [`${fmt(it.b)} ${it.label}`]));
      marks.push({ x: (x0 + x1) / 2, y: (y(it.a) + y(it.b)) / 2, html: tipHtml(it.label, [{ label: d.from, value: fmt(it.a) }, { color: c, label: d.to, value: fmt(it.b) }, { label: 'Change', value: fmt(it.b - it.a) }]), text: `${it.label}: ${fmt(it.a)} in ${d.from}, ${fmt(it.b)} in ${d.to}` });
    }
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks, radius: 60 });
    return { summary: `Slope chart of ${d.items.length} items from ${d.from} to ${d.to}. Biggest rise: ${moves[0]?.label}.`, table: { head: ['Item', d.from, d.to], rows: d.items.map((i) => [i.label, fmt(i.a), fmt(i.b)]) } };
  });
}

// ---------------------------------------------------------------- dumbbell
export interface DumbbellData { aName: string; bName: string; items: Array<{ label: string; a: number; b: number }> }
export function dumbbell(host: HTMLElement, data: DumbbellData, opts: HighlightOptions & { sort?: 'gap' | 'b' | 'none' } = {}): ChartInstance<DumbbellData> {
  const rowH = 30;
  return chart(host, data, { height: () => data.items.length * rowH + 50, ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const items = o.sort === 'none' ? d.items : [...d.items].sort((p, q) => (o.sort === 'b' ? q.b - p.b : (q.b - q.a) - (p.b - p.a)));
    const lh = legend(svg, [{ name: d.aName, color: 'var(--text-muted)', shape: 'dot' }, { name: d.bName, color: 'var(--chart-1)', shape: 'dot' }], width);
    const lw = Math.min(width * 0.32, Math.max(...items.map((i) => textWidth(i.label, '12px system-ui'))) + 14);
    const x = linear(niceDomain(...extent(items.flatMap((i) => [i.a, i.b])), 5), [lw + 6, width - 44]);
    const y = band(items.map((i) => i.label), [lh + 4, height - 26], 0.4, 0.1);
    xGrid(svg, x, lh, height - 26, fmt, Math.max(3, Math.floor(width / 110)));
    const g = el('g');
    const marks: Mark[] = [];
    items.forEach((it) => {
      const cy = y(it.label) + y.bandwidth / 2;
      g.append(el('text', { x: lw - 8, y: r(cy + 4), 'text-anchor': 'end', style: LBL }, [it.label]));
      g.append(el('line', { x1: r(x(it.a)), x2: r(x(it.b)), y1: r(cy), y2: r(cy), style: 'stroke: var(--border-strong); stroke-width: 3; stroke-linecap: round' }));
      g.append(el('circle', { cx: r(x(it.a)), cy: r(cy), r: 5, class: 'lt-mark', style: 'fill: var(--text-muted); stroke: var(--bg-surface-1); stroke-width: 2' }));
      g.append(el('circle', { cx: r(x(it.b)), cy: r(cy), r: 6, class: 'lt-mark', style: 'fill: var(--chart-1); stroke: var(--bg-surface-1); stroke-width: 2' }));
      const right = it.b >= it.a;
      g.append(el('text', { x: r(x(it.b) + (right ? 11 : -11)), y: r(cy + 4), 'text-anchor': right ? 'start' : 'end', class: 'lt-value' }, [fmt(it.b)]));
      marks.push({ x: x(it.b), y: cy, hit: { x: 0, y: y(it.label) - 4, w: width, h: y.bandwidth + 8 }, html: tipHtml(it.label, [{ color: 'var(--text-muted)', label: d.aName, value: fmt(it.a) }, { color: 'var(--chart-1)', label: d.bName, value: fmt(it.b) }, { label: 'Gap', value: fmt(it.b - it.a) }]), text: `${it.label}: ${d.aName} ${fmt(it.a)}, ${d.bName} ${fmt(it.b)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Dumbbell chart comparing ${d.aName} and ${d.bName} for ${items.length} items.`, table: { head: ['Item', d.aName, d.bName], rows: items.map((i) => [i.label, fmt(i.a), fmt(i.b)]) } };
  });
}

// ---------------------------------------------------------------- waterfall
export interface WaterfallItem { label: string; value: number; total?: boolean }
export function waterfall(host: HTMLElement, data: WaterfallItem[], opts: ChartOptions = {}): ChartInstance<WaterfallItem[]> {
  return chart(host, data, opts, (ctx, d) => {
    const { svg, width, height, fmt } = ctx;
    let run = 0;
    const steps = d.map((it, i) => {
      if (it.total || i === 0) { const s = { ...it, from: 0, to: it.total && i > 0 ? run : it.value }; run = s.to; return s; }
      const s = { ...it, from: run, to: run + it.value }; run = s.to; return s;
    });
    const lh = legend(svg, [{ name: 'Total', color: 'var(--chart-1)' }, { name: 'Increase', color: 'var(--status-positive)' }, { name: 'Decrease', color: 'var(--status-negative)' }], width);
    const y = linear(niceDomain(...extent(steps.flatMap((s) => [s.from, s.to])), 5, true), [height - 40, lh + 20]);
    const gl = gutter(y, fmt);
    const x = band(d.map((i) => i.label), [gl + 4, width], 0.28, 0.06);
    yGrid(svg, y, gl, width, fmt);
    const g = el('g');
    const marks: Mark[] = [];
    steps.forEach((s, i) => {
      const isTotal = !!s.total || i === 0;
      const c = isTotal ? 'var(--chart-1)' : s.value >= 0 ? 'var(--status-positive)' : 'var(--status-negative)';
      const top = y(Math.max(s.from, s.to)), h = Math.max(1, Math.abs(y(s.from) - y(s.to)));
      g.append(el('rect', { x: r(x(s.label)), y: r(top), width: r(x.bandwidth), height: r(h), rx: 3, class: 'lt-mark', style: `fill: ${c}` }));
      if (i < steps.length - 1) g.append(el('line', { x1: r(x(s.label) + x.bandwidth), x2: r(x(steps[i + 1].label)), y1: r(y(s.to)), y2: r(y(s.to)), style: 'stroke: var(--border-strong); stroke-dasharray: 2 2' }));
      const txt = isTotal ? fmt(s.to) : `${s.value >= 0 ? '+' : ''}${fmt(s.value)}`;
      if (textWidth(txt) < x.step) g.append(el('text', { x: r(x(s.label) + x.bandwidth / 2), y: r(top - 6), 'text-anchor': 'middle', style: `fill: var(--text-primary); font-size: 11px; font-weight: ${isTotal ? 650 : 500}` }, [txt]));
      const lines = wrap(s.label, x.step - 2, '11px system-ui', 2);
      lines.forEach((ln, li) => g.append(el('text', { x: r(x(s.label) + x.bandwidth / 2), y: r(height - 24 + li * 13), 'text-anchor': 'middle', class: 'lt-tick' }, [ln])));
      marks.push({ x: x(s.label) + x.bandwidth / 2, y: top, hit: { x: x(s.label), y: top, w: x.bandwidth, h }, html: tipHtml(s.label, [{ color: c, label: isTotal ? 'Total' : 'Change', value: isTotal ? fmt(s.to) : fmt(s.value) }, ...(isTotal ? [] : [{ label: 'Running total', value: fmt(s.to) }])]), text: `${s.label}: ${txt}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Waterfall from ${fmt(steps[0].to)} to ${fmt(run)} across ${d.length} steps.`, table: { head: ['Step', 'Change', 'Running total'], rows: steps.map((s) => [s.label, fmt(s.value), fmt(s.to)]) } };
  });
}

// ---------------------------------------------------------------- histogram
export interface HistogramOptions extends ChartOptions { bins?: number; marker?: 'median' | 'mean' | 'none'; unitLabel?: string }
export function histogram(host: HTMLElement, data: number[], opts: HistogramOptions = {}): ChartInstance<number[]> {
  return chart(host, data, opts, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const [lo, hiV] = extent(d);
    const step = niceStep(hiV - lo, o.bins ?? 18);
    const start = Math.floor(lo / step) * step;
    const nb = Math.max(1, Math.ceil((hiV - start) / step + 1e-9));
    const counts = new Array(nb).fill(0);
    d.forEach((v) => { counts[Math.min(nb - 1, Math.floor((v - start) / step))]++; });
    const y = linear(niceDomain(0, Math.max(...counts), 4, true), [height - 26, 16]);
    const cf = (v: number) => String(Math.round(v));
    const gl = gutter(y, cf, 4);
    const x = linear([start, start + nb * step], [gl + 4, width - 4]);
    yGrid(svg, y, gl, width, cf, 4);
    const g = el('g');
    const marks: Mark[] = [];
    counts.forEach((c, i) => {
      const x0 = x(start + i * step) + 1, x1 = x(start + (i + 1) * step) - 1;
      g.append(el('rect', { x: r(x0), y: r(y(c)), width: r(Math.max(1, x1 - x0)), height: r(y(0) - y(c)), rx: 2, class: 'lt-mark', style: 'fill: var(--chart-1)' }));
      marks.push({ x: (x0 + x1) / 2, y: y(c), hit: { x: x0, y: 16, w: x1 - x0, h: height - 42 }, html: tipHtml(`${fmt(start + i * step)} – ${fmt(start + (i + 1) * step)}`, [{ color: 'var(--chart-1)', label: 'Count', value: String(c) }, { label: 'Share', value: `${((c / d.length) * 100).toFixed(1)}%` }]), text: `${fmt(start + i * step)} to ${fmt(start + (i + 1) * step)}: ${c}` });
    });
    svg.append(g);
    xLabels(svg, x.ticks(Math.max(3, Math.floor(width / 90))).map((t) => ({ x: x(t), text: fmt(t) })), height - 6, width);
    const mk = o.marker ?? 'median';
    if (mk !== 'none') {
      const s = [...d].sort((a, b) => a - b);
      const v = mk === 'median' ? quantile(s, 0.5) : d.reduce((a, b) => a + b, 0) / d.length;
      const px = r(x(v));
      svg.append(el('line', { x1: px, x2: px, y1: 14, y2: height - 26, style: 'stroke: var(--text-primary); stroke-width: 1.5; stroke-dasharray: 4 3' }));
      const label = `${mk === 'median' ? 'Median' : 'Mean'} ${fmt(v)}`;
      const right = px + textWidth(label, '600 11px system-ui') + 8 < width;
      svg.append(el('text', { x: right ? px + 6 : px - 6, y: 12, 'text-anchor': right ? 'start' : 'end', style: 'fill: var(--text-primary); font-size: 11px; font-weight: 600; paint-order: stroke; stroke: var(--bg-surface-1); stroke-width: 3px' }, [label]));
    }
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Histogram of ${d.length} values in ${nb} bins from ${fmt(start)} to ${fmt(start + nb * step)}.`, table: { head: ['From', 'To', 'Count'], rows: counts.map((c, i) => [fmt(start + i * step), fmt(start + (i + 1) * step), c]) } };
  });
}

// ---------------------------------------------------------------- box plot
export interface BoxGroup { label: string; values: number[] }
export function boxPlot(host: HTMLElement, data: BoxGroup[], opts: ChartOptions = {}): ChartInstance<BoxGroup[]> {
  const rowH = 40;
  return chart(host, data, { height: () => data.length * rowH + 30, ...opts }, (ctx, d) => {
    const { svg, width, height, fmt } = ctx;
    const lw = Math.min(width * 0.3, Math.max(...d.map((g) => textWidth(g.label, '12px system-ui'))) + 14);
    const x = linear(niceDomain(...extent(d.flatMap((g) => g.values)), 5), [lw + 6, width - 10]);
    const y = band(d.map((g) => g.label), [4, height - 26], 0.45, 0.1);
    xGrid(svg, x, 0, height - 26, fmt, Math.max(3, Math.floor(width / 110)));
    const g = el('g');
    const marks: Mark[] = [];
    d.forEach((grp, gi) => {
      const s = [...grp.values].sort((a, b) => a - b);
      const q1 = quantile(s, 0.25), q2 = quantile(s, 0.5), q3 = quantile(s, 0.75), iqr = q3 - q1;
      const lo = s.find((v) => v >= q1 - 1.5 * iqr) ?? s[0], hiV = [...s].reverse().find((v) => v <= q3 + 1.5 * iqr) ?? s[s.length - 1];
      const cy = y(grp.label) + y.bandwidth / 2, c = seriesColor(gi);
      g.append(el('text', { x: lw - 8, y: r(cy + 4), 'text-anchor': 'end', style: LBL }, [grp.label]));
      g.append(el('line', { x1: r(x(lo)), x2: r(x(hiV)), y1: r(cy), y2: r(cy), style: 'stroke: var(--text-muted); stroke-width: 1.5' }));
      for (const v of [lo, hiV]) g.append(el('line', { x1: r(x(v)), x2: r(x(v)), y1: r(cy - 6), y2: r(cy + 6), style: 'stroke: var(--text-muted); stroke-width: 1.5' }));
      g.append(el('rect', { x: r(x(q1)), y: r(y(grp.label)), width: r(Math.max(2, x(q3) - x(q1))), height: r(y.bandwidth), rx: 4, class: 'lt-mark', style: `fill: color-mix(in oklab, ${c} 28%, var(--bg-surface-1)); stroke: ${c}; stroke-width: 1.5` }));
      g.append(el('line', { x1: r(x(q2)), x2: r(x(q2)), y1: r(y(grp.label)), y2: r(y(grp.label) + y.bandwidth), style: 'stroke: var(--text-primary); stroke-width: 2.5' }));
      s.filter((v) => v < lo || v > hiV).forEach((v) => g.append(el('circle', { cx: r(x(v)), cy: r(cy), r: 3, style: `fill: var(--bg-surface-1); stroke: ${c}; stroke-width: 1.5` })));
      marks.push({ x: x(q2), y: cy, hit: { x: 0, y: y(grp.label) - 6, w: width, h: y.bandwidth + 12 }, html: tipHtml(grp.label, [{ label: 'Median', value: fmt(q2), color: c }, { label: 'Middle half', value: `${fmt(q1)} – ${fmt(q3)}` }, { label: 'Whiskers', value: `${fmt(lo)} – ${fmt(hiV)}` }, { label: 'Samples', value: String(s.length) }]), text: `${grp.label}: median ${fmt(q2)}, middle half ${fmt(q1)} to ${fmt(q3)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Box plot of ${d.length} groups.`, table: { head: ['Group', 'Median', 'Q1', 'Q3', 'n'], rows: d.map((grp) => { const s = [...grp.values].sort((a, b) => a - b); return [grp.label, fmt(quantile(s, 0.5)), fmt(quantile(s, 0.25)), fmt(quantile(s, 0.75)), s.length]; }) } };
  });
}

// ---------------------------------------------------------------- bullet
export interface BulletItem { label: string; value: number; target: number; bands: [number, number, number]; note?: string }
export function bullet(host: HTMLElement, data: BulletItem[], opts: ChartOptions = {}): ChartInstance<BulletItem[]> {
  const rowH = 46;
  return chart(host, data, { height: () => data.length * rowH + 4, ...opts }, (ctx, d) => {
    const { svg, width, fmt } = ctx;
    const narrow = width < 460;
    const lw = narrow ? 0 : Math.min(width * 0.3, Math.max(...d.map((i) => textWidth(i.label, '600 12px system-ui'), ...d.map((i) => textWidth(i.note ?? '', '11px system-ui')))) + 16);
    const g = el('g');
    const marks: Mark[] = [];
    d.forEach((it, i) => {
      const top = i * rowH + (narrow ? 18 : 8), h = 20;
      const x = linear([0, Math.max(it.bands[2], it.value, it.target)], [lw, width - 46]);
      if (narrow) g.append(el('text', { x: 0, y: top - 6, style: 'fill: var(--text-primary); font-size: 12px; font-weight: 600' }, [it.label]));
      else {
        g.append(el('text', { x: lw - 12, y: top + 9, 'text-anchor': 'end', style: 'fill: var(--text-primary); font-size: 12px; font-weight: 600' }, [it.label]));
        if (it.note) g.append(el('text', { x: lw - 12, y: top + 22, 'text-anchor': 'end', class: 'lt-label-muted' }, [it.note]));
      }
      const shades = ['var(--bg-surface-3)', 'color-mix(in oklab, var(--bg-surface-3) 60%, var(--border-hairline))', 'var(--border-hairline)'];
      let prev = 0;
      it.bands.forEach((b, bi) => { g.append(el('rect', { x: r(x(prev)), y: top, width: r(x(b) - x(prev)), height: h, style: `fill: ${shades[2 - bi]}` })); prev = b; });
      g.append(el('rect', { x: lw, y: top + 7, width: r(Math.max(2, x(it.value) - lw)), height: 6, rx: 2, class: 'lt-mark', style: 'fill: var(--text-primary)' }));
      g.append(el('line', { x1: r(x(it.target)), x2: r(x(it.target)), y1: top + 2, y2: top + h - 2, style: 'stroke: var(--accent-solid); stroke-width: 3' }));
      g.append(el('text', { x: width - 40, y: top + 14, class: 'lt-value', style: 'fill: var(--text-primary); font-weight: 650' }, [fmt(it.value)]));
      marks.push({ x: x(it.value), y: top + 10, hit: { x: 0, y: top - (narrow ? 16 : 4), w: width, h: rowH - 4 }, html: tipHtml(it.label, [{ label: 'Actual', value: fmt(it.value), color: 'var(--text-primary)' }, { label: 'Target', value: fmt(it.target), color: 'var(--accent-solid)' }, { label: 'Of target', value: `${Math.round((it.value / it.target) * 100)}%` }]), text: `${it.label}: ${fmt(it.value)} against a target of ${fmt(it.target)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Bullet chart of ${d.length} measures against targets. ${d.filter((i) => i.value >= i.target).length} met target.`, table: { head: ['Measure', 'Actual', 'Target'], rows: d.map((i) => [i.label, fmt(i.value), fmt(i.target)]) } };
  });
}

// ---------------------------------------------------------------- bump
export interface BumpData { x: string[]; series: Array<{ name: string; ranks: number[] }> }
export function bump(host: HTMLElement, data: BumpData, opts: HighlightOptions = {}): ChartInstance<BumpData> {
  return chart(host, data, { height: () => data.series.length * 34 + 40, ...opts }, (ctx, d, o) => {
    const { svg, width, height } = ctx;
    const n = d.x.length, k = d.series.length;
    const lw = Math.min(width * 0.22, Math.max(...d.series.map((s) => textWidth(s.name, '600 12px system-ui'))) + 14);
    const xs = points(n, [lw + 14, width - lw - 14]);
    const y = (rank: number) => 30 + ((rank - 1) / Math.max(1, k - 1)) * (height - 46);
    xLabels(svg, d.x.map((t, i) => ({ x: xs(i), text: t })).filter((_, i) => tickIndices(n, Math.floor(width / 70)).includes(i)), 12, width);
    const hl = o.highlight ?? d.series.slice(0, 3).map((s) => s.name);
    const g = el('g');
    const order = d.series.map((_, i) => i).sort((a, b) => Number(hiOf(hl, d.series[a].name)) - Number(hiOf(hl, d.series[b].name)));
    for (const si of order) {
      const s = d.series[si], on = hiOf(hl, s.name), c = on ? seriesColor(si) : 'var(--border-strong)';
      const pts = s.ranks.map((rk, i) => [xs(i), y(rk)] as [number, number]);
      let dPath = `M${r(pts[0][0])},${r(pts[0][1])}`;
      for (let i = 1; i < pts.length; i++) { const mx = (pts[i - 1][0] + pts[i][0]) / 2; dPath += `C${r(mx)},${r(pts[i - 1][1])} ${r(mx)},${r(pts[i][1])} ${r(pts[i][0])},${r(pts[i][1])}`; }
      g.append(el('path', { d: dPath, class: 'lt-mark', style: `fill: none; stroke: ${c}; stroke-width: ${on ? 3 : 1.5}; stroke-linecap: round` }));
      pts.forEach(([px, py], i) => {
        g.append(el('circle', { cx: r(px), cy: r(py), r: on ? 9 : 4, style: `fill: ${on ? c : 'var(--bg-surface-1)'}; stroke: ${on ? 'var(--bg-surface-1)' : c}; stroke-width: 2` }));
        if (on) { const ink = readableOn(c, host).color; g.append(el('text', { x: r(px), y: r(py + 3.5), 'text-anchor': 'middle', style: `fill: ${ink}; font-size: 9.5px; font-weight: 700` }, [String(s.ranks[i])])); }
      });
      const ink = on ? 'var(--text-primary)' : 'var(--text-muted)';
      g.append(el('text', { x: lw, y: r(y(s.ranks[0]) + 4), 'text-anchor': 'end', style: `fill: ${ink}; font-size: 12px; font-weight: ${on ? 600 : 400}` }, [s.name]));
      g.append(el('text', { x: width - lw, y: r(y(s.ranks[n - 1]) + 4), style: `fill: ${ink}; font-size: 12px; font-weight: ${on ? 600 : 400}` }, [s.name]));
    }
    svg.append(g);
    ctx.interact({
      mode: 'x', xs: d.x.map((_, i) => xs(i)), top: 20, bottom: height - 6,
      series: d.series.map((s, si) => ({ color: hiOf(hl, s.name) ? seriesColor(si) : 'var(--border-strong)', ys: s.ranks.map((rk) => y(rk)) })),
      html: (i) => tipHtml(d.x[i], [...d.series].sort((a, b) => a.ranks[i] - b.ranks[i]).map((s) => ({ color: hiOf(hl, s.name) ? seriesColor(d.series.indexOf(s)) : 'var(--border-strong)', label: s.name, value: `#${s.ranks[i]}` }))),
      text: (i) => `${d.x[i]}: ${[...d.series].sort((a, b) => a.ranks[i] - b.ranks[i]).map((s) => `${s.ranks[i]}. ${s.name}`).join(', ')}`,
    });
    return { summary: `Bump chart of ${k} entries ranked over ${n} periods.`, table: { head: ['', ...d.x], rows: d.series.map((s) => [s.name, ...s.ranks]) } };
  });
}

// ---------------------------------------------------------------- 100% stacked bars
export interface ShareData { categories: string[]; series: Array<{ name: string; values: number[] }> }
export function stacked100(host: HTMLElement, data: ShareData, opts: ChartOptions = {}): ChartInstance<ShareData> {
  const rowH = 34;
  return chart(host, data, { height: () => data.categories.length * rowH + 40, ...opts }, (ctx, d) => {
    const { svg, width, height } = ctx;
    const lh = legend(svg, d.series.map((s, i) => ({ name: s.name, color: seriesColor(i) })), width);
    const narrow = width < 460;
    const lw = narrow ? 0 : Math.min(width * 0.26, Math.max(...d.categories.map((c) => textWidth(c, '12px system-ui'))) + 14);
    const x = linear([0, 1], [lw, width]);
    const y = band(d.categories, [lh + (narrow ? 14 : 4), height - 4], narrow ? 0.5 : 0.3, 0.05);
    const g = el('g');
    const marks: Mark[] = [];
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    d.categories.forEach((c, ci) => {
      const total = d.series.reduce((a, s) => a + s.values[ci], 0) || 1;
      const py = y(c);
      if (narrow) g.append(el('text', { x: 0, y: r(py - 4), style: LBL }, [c]));
      else g.append(el('text', { x: lw - 8, y: r(py + y.bandwidth / 2 + 4), 'text-anchor': 'end', style: LBL }, [c]));
      let acc = 0;
      d.series.forEach((s, si) => {
        const share = s.values[ci] / total, x0 = x(acc), x1 = x(acc + share);
        const fill = seriesColor(si);
        g.append(el('rect', { x: r(x0 + (si ? 1 : 0)), y: r(py), width: r(Math.max(0, x1 - x0 - (si ? 1 : 0))), height: r(y.bandwidth), rx: si === 0 || si === d.series.length - 1 ? 3 : 0, class: 'lt-mark', style: `fill: ${fill}` }));
        if (x1 - x0 > textWidth(pct(share), '600 11px system-ui') + 10) g.append(el('text', { x: r((x0 + x1) / 2), y: r(py + y.bandwidth / 2 + 4), 'text-anchor': 'middle', style: `fill: ${readableOn(fill, host).color}; font-size: 11px; font-weight: 600` }, [pct(share)]));
        acc += share;
      });
      marks.push({ x: x(0.5), y: py + y.bandwidth / 2, hit: { x: 0, y: py - 4, w: width, h: y.bandwidth + 8 }, html: tipHtml(c, d.series.map((s, si) => ({ color: seriesColor(si), label: s.name, value: pct(s.values[ci] / total) }))), text: `${c}: ${d.series.map((s) => `${s.name} ${pct(s.values[ci] / total)}`).join(', ')}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `100% stacked bars: share of ${d.series.length} parts across ${d.categories.length} categories.`, table: { head: ['', ...d.series.map((s) => s.name)], rows: d.categories.map((c, ci) => { const t = d.series.reduce((a, s) => a + s.values[ci], 0) || 1; return [c, ...d.series.map((s) => pct(s.values[ci] / t))]; }) } };
  });
}

// ---------------------------------------------------------------- beeswarm
export function beeswarm(host: HTMLElement, data: BoxGroup[], opts: ChartOptions = {}): ChartInstance<BoxGroup[]> {
  const rowH = 64;
  return chart(host, data, { height: () => data.length * rowH + 30, ...opts }, (ctx, d) => {
    const { svg, width, height, fmt } = ctx;
    const lw = Math.min(width * 0.26, Math.max(...d.map((g) => textWidth(g.label, '12px system-ui'))) + 14);
    const x = linear(niceDomain(...extent(d.flatMap((g) => g.values)), 5), [lw + 8, width - 10]);
    const y = band(d.map((g) => g.label), [4, height - 26], 0.1, 0.02);
    xGrid(svg, x, 0, height - 26, fmt, Math.max(3, Math.floor(width / 110)));
    const g = el('g');
    const marks: Mark[] = [];
    const R = 3.6;
    d.forEach((grp, gi) => {
      const cy = y(grp.label) + y.bandwidth / 2, c = seriesColor(gi);
      g.append(el('text', { x: lw - 8, y: r(cy + 4), 'text-anchor': 'end', style: LBL }, [grp.label]));
      // Greedy swarm: each dot takes the nearest free offset from the centre line.
      const placed: Array<[number, number]> = [];
      [...grp.values].sort((a, b) => a - b).forEach((v) => {
        const px = x(v);
        let off = 0;
        for (let k = 0; k < 60; k++) {
          off = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (R * 1.9);
          if (!placed.some(([qx, qy]) => Math.hypot(qx - px, qy - (cy + off)) < R * 2.05)) break;
        }
        const py = Math.max(y(grp.label) + R, Math.min(y(grp.label) + y.bandwidth - R, cy + off));
        placed.push([px, py]);
        g.append(el('circle', { cx: r(px), cy: r(py), r: R, class: 'lt-mark', style: `fill: ${c}; stroke: var(--bg-surface-1); stroke-width: 1` }));
        marks.push({ x: px, y: py, html: tipHtml(grp.label, [{ color: c, label: 'Value', value: fmt(v) }]), text: `${grp.label}: ${fmt(v)}` });
      });
      const med = quantile([...grp.values].sort((a, b) => a - b), 0.5);
      g.append(el('line', { x1: r(x(med)), x2: r(x(med)), y1: r(y(grp.label) + 2), y2: r(y(grp.label) + y.bandwidth - 2), style: 'stroke: var(--text-primary); stroke-width: 2' }));
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks, radius: 12 });
    return { summary: `Beeswarm of ${d.reduce((a, g) => a + g.values.length, 0)} values across ${d.length} groups; lines mark medians.`, table: { head: ['Group', 'Median', 'n'], rows: d.map((grp) => [grp.label, fmt(quantile([...grp.values].sort((a, b) => a - b), 0.5)), grp.values.length]) } };
  });
}

// ---------------------------------------------------------------- small multiples
export interface MultiData { x: Array<string | number | Date>; series: Array<{ name: string; values: number[] }> }
export function smallMultiples(host: HTMLElement, data: MultiData, opts: ChartOptions & { minPanel?: number } = {}): ChartInstance<MultiData> {
  const cols = (w: number) => Math.max(1, Math.min(data.series.length, Math.floor(w / (opts.minPanel ?? 200))));
  const panelH = 118;
  return chart(host, data, { height: (w: number) => Math.ceil(data.series.length / cols(w)) * (panelH + 18), ...opts }, (ctx, d) => {
    const { svg, width, fmt } = ctx;
    const nc = cols(width), gap = 18;
    const pw = (width - gap * (nc - 1)) / nc;
    const all = d.series.flatMap((s) => s.values);
    const dom = niceDomain(0, Math.max(...all), 3, true);
    const n = d.x.length;
    const marks: Mark[] = [];
    d.series.forEach((s, si) => {
      const col = si % nc, row = Math.floor(si / nc);
      const ox = col * (pw + gap), oy = row * (panelH + 18);
      const g = el('g', { transform: `translate(${r(ox)},${r(oy)})` });
      const y = linear(dom, [panelH - 18, 30]);
      const xs = points(n, [0, pw]);
      g.append(el('text', { x: 0, y: 12, style: 'fill: var(--text-primary); font-size: 12px; font-weight: 600' }, [s.name]));
      g.append(el('text', { x: pw, y: 12, 'text-anchor': 'end', style: 'fill: var(--text-primary); font-size: 12px; font-weight: 650; font-variant-numeric: tabular-nums' }, [fmt(s.values[n - 1])]));
      g.append(el('line', { x1: 0, x2: pw, y1: r(y(0)), y2: r(y(0)), class: 'lt-baseline' }));
      // Ghosts of every other series give each panel context at the shared scale.
      d.series.forEach((o, oi) => { if (oi !== si) g.append(el('path', { d: linePath(o.values.map((v, i) => [xs(i), y(v)])), style: 'fill: none; stroke: var(--border-hairline); stroke-width: 1' })); });
      const pts = s.values.map((v, i) => [xs(i), y(v)] as [number, number]);
      g.append(el('path', { d: areaPath(pts, pts.map(([px]) => [px, y(0)] as [number, number])), style: 'fill: color-mix(in oklab, var(--chart-1) 16%, transparent)' }));
      g.append(el('path', { d: linePath(pts), class: 'lt-line lt-mark', style: 'stroke: var(--chart-1)' }));
      g.append(el('circle', { cx: r(pw), cy: r(y(s.values[n - 1])), r: 3, style: 'fill: var(--chart-1)' }));
      g.append(el('text', { x: 0, y: panelH - 4, class: 'lt-tick' }, [formatX(d.x[0], d.x)]));
      g.append(el('text', { x: pw, y: panelH - 4, 'text-anchor': 'end', class: 'lt-tick' }, [formatX(d.x[n - 1], d.x)]));
      svg.append(g);
      const peak = Math.max(...s.values);
      marks.push({ x: ox + pw / 2, y: oy + panelH / 2, hit: { x: ox, y: oy, w: pw, h: panelH }, html: tipHtml(s.name, [{ color: 'var(--chart-1)', label: `Latest (${formatXFull(d.x[n - 1])})`, value: fmt(s.values[n - 1]) }, { label: 'Peak', value: fmt(peak) }, { label: 'Change', value: fmt(s.values[n - 1] - s.values[0]) }]), text: `${s.name}: latest ${fmt(s.values[n - 1])}, peak ${fmt(peak)}` });
    });
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `${d.series.length} small multiples on a shared scale, ${n} points each.`, table: { head: ['', ...d.series.map((s) => s.name)], rows: d.x.map((x, i) => [formatX(x, d.x), ...d.series.map((s) => fmt(s.values[i]))]) } };
  });
}
