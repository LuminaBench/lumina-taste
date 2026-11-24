// Bar-family drawers: vertical, horizontal, grouped, stacked, diverging and lollipop.
import { chart, gutter, seriesColor, tipHtml, xLabels, yGrid, type ChartInstance, type ChartOptions, type Mark } from './frame';
import { band, extent, linear, niceDomain } from './scale';
import { el, r, textWidth } from './svg';

export interface BarItem { label: string; value: number }
export interface BarOptions extends ChartOptions { highlight?: string; values?: boolean; sort?: 'desc' | 'asc' | 'none' }
export interface GroupData { categories: string[]; series: Array<{ name: string; values: number[] }> }

/** Rect with only the end away from the baseline rounded. */
function barPath(x: number, y: number, w: number, h: number, rad: number, dir: 'up' | 'down' | 'right' | 'left') {
  const rr = Math.max(0, Math.min(rad, w / 2, h / 2));
  if (h <= 0 || w <= 0) return '';
  if (dir === 'up') return `M${r(x)},${r(y + h)}V${r(y + rr)}Q${r(x)},${r(y)} ${r(x + rr)},${r(y)}H${r(x + w - rr)}Q${r(x + w)},${r(y)} ${r(x + w)},${r(y + rr)}V${r(y + h)}Z`;
  if (dir === 'down') return `M${r(x)},${r(y)}V${r(y + h - rr)}Q${r(x)},${r(y + h)} ${r(x + rr)},${r(y + h)}H${r(x + w - rr)}Q${r(x + w)},${r(y + h)} ${r(x + w)},${r(y + h - rr)}V${r(y)}Z`;
  if (dir === 'right') return `M${r(x)},${r(y)}H${r(x + w - rr)}Q${r(x + w)},${r(y)} ${r(x + w)},${r(y + rr)}V${r(y + h - rr)}Q${r(x + w)},${r(y + h)} ${r(x + w - rr)},${r(y + h)}H${r(x)}Z`;
  return `M${r(x + w)},${r(y)}H${r(x + rr)}Q${r(x)},${r(y)} ${r(x)},${r(y + rr)}V${r(y + h - rr)}Q${r(x)},${r(y + h)} ${r(x + rr)},${r(y + h)}H${r(x + w)}Z`;
}
const RAD = 3;
const sorted = (items: BarItem[], s: BarOptions['sort']) => (s === 'desc' ? [...items].sort((a, b) => b.value - a.value) : s === 'asc' ? [...items].sort((a, b) => a.value - b.value) : items);
const fillFor = (o: BarOptions, label: string) => (o.highlight && o.highlight !== label ? 'var(--border-strong)' : 'var(--chart-1)');

export function verticalBars(host: HTMLElement, data: BarItem[], opts: BarOptions = {}): ChartInstance<BarItem[]> {
  return chart(host, data, opts, (ctx, raw, o) => {
    const { svg, width, height, fmt } = ctx;
    const d = sorted(raw, o.sort);
    const m = { t: 20, b: 26 };
    const y = linear(niceDomain(...extent(d.map((i) => i.value)), 5, true), [height - m.b, m.t]);
    const gl = gutter(y, fmt);
    const x = band(d.map((i) => i.label), [gl, width]);
    yGrid(svg, y, gl, width, fmt);
    const marks: Mark[] = [];
    const g = el('g');
    const showVals = (o.values ?? true) && x.bandwidth > textWidth(fmt(Math.max(...d.map((i) => i.value)))) + 4;
    d.forEach((it) => {
      const px = x(it.label), py = y(Math.max(0, it.value)), h = Math.abs(y(it.value) - y(0));
      g.append(el('path', { d: barPath(px, it.value >= 0 ? py : y(0), x.bandwidth, h, RAD, it.value >= 0 ? 'up' : 'down'), class: 'lt-mark', style: `fill: ${fillFor(o, it.label)}` }));
      if (showVals) g.append(el('text', { x: r(px + x.bandwidth / 2), y: r(it.value >= 0 ? py - 5 : y(it.value) + 13), 'text-anchor': 'middle', class: 'lt-value' }, [fmt(it.value)]));
      marks.push({ x: px + x.bandwidth / 2, y: py, hit: { x: px, y: Math.min(py, y(0)), w: x.bandwidth, h: Math.max(h, 2) }, html: tipHtml(it.label, [{ color: fillFor(o, it.label), label: o.title ?? 'Value', value: fmt(it.value) }]), text: `${it.label}: ${fmt(it.value)}` });
    });
    svg.append(g);
    const maxLabels = Math.floor((width - gl) / 56);
    const every = Math.max(1, Math.ceil(d.length / maxLabels));
    xLabels(svg, d.map((it, i) => ({ i, x: x(it.label) + x.bandwidth / 2, text: it.label })).filter((l) => l.i % every === 0), height - 6, width);
    ctx.interact({ mode: 'nearest', marks });
    const top = [...d].sort((a, b) => b.value - a.value)[0];
    return { summary: `Bar chart of ${d.length} categories. Highest: ${top?.label} at ${fmt(top?.value ?? 0)}.`, table: { head: ['Category', 'Value'], rows: d.map((i) => [i.label, fmt(i.value)]) } };
  });
}

export function horizontalBars(host: HTMLElement, data: BarItem[], opts: BarOptions & { lollipop?: boolean } = {}): ChartInstance<BarItem[]> {
  const rows = data.length;
  const longest = Math.max(...data.map((i) => textWidth(i.label, '12px system-ui'))) + 12;
  // When labels would take more than 42% of the width, stack each label above its bar (mobile).
  const stackedLabels = (w: number) => longest > w * 0.42;
  return chart(host, data, { height: (w: number) => rows * (stackedLabels(w) ? 46 : 30) + 12, ...opts }, (ctx, raw, o) => {
    const { svg, width, height, fmt } = ctx;
    const d = sorted(raw, o.sort ?? 'desc');
    const stack = stackedLabels(width);
    const labelW = stack ? 0 : longest;
    const valW = Math.max(...d.map((i) => textWidth(fmt(i.value)))) + 10;
    const x = linear(niceDomain(0, Math.max(...d.map((i) => i.value)), 4, true), [labelW, width - valW]);
    const y = band(d.map((i) => i.label), [stack ? 18 : 4, height - 8], o.lollipop ? 0.6 : stack ? 0.5 : 0.3, 0.1);
    svg.append(el('line', { x1: r(x(0)), x2: r(x(0)), y1: stack ? 18 : 0, y2: height - 8, class: 'lt-baseline' }));
    const marks: Mark[] = [];
    const g = el('g');
    d.forEach((it) => {
      const py = y(it.label), w = x(it.value) - x(0), c = fillFor(o, it.label);
      if (stack) g.append(el('text', { x: 0, y: r(py - 5), style: 'fill: var(--text-primary); font-size: 12px' }, [it.label]));
      else g.append(el('text', { x: labelW - 10, y: r(py + y.bandwidth / 2 + 4), 'text-anchor': 'end', class: 'lt-label-muted', style: 'fill: var(--text-primary); font-size: 12px' }, [it.label]));
      if (o.lollipop) {
        const cy = py + y.bandwidth / 2;
        g.append(el('line', { x1: x(0), x2: r(x(it.value)), y1: r(cy), y2: r(cy), class: 'lt-mark', style: `stroke: ${c}; stroke-width: 2` }));
        g.append(el('circle', { cx: r(x(it.value)), cy: r(cy), r: 5.5, class: 'lt-mark', style: `fill: ${c}` }));
      } else g.append(el('path', { d: barPath(x(0), py, w, y.bandwidth, RAD, 'right'), class: 'lt-mark', style: `fill: ${c}` }));
      g.append(el('text', { x: r(x(it.value) + (o.lollipop ? 11 : 6)), y: r(py + y.bandwidth / 2 + 4), class: 'lt-value' }, [fmt(it.value)]));
      marks.push({ x: x(it.value), y: py + y.bandwidth / 2, hit: { x: 0, y: py - 3, w: width, h: y.bandwidth + 6 }, html: tipHtml(it.label, [{ color: c, label: o.title ?? 'Value', value: fmt(it.value) }]), text: `${it.label}: ${fmt(it.value)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `${o.lollipop ? 'Lollipop' : 'Horizontal bar'} chart ranking ${d.length} items. Top: ${d[0]?.label} at ${fmt(d[0]?.value ?? 0)}.`, table: { head: ['Item', 'Value'], rows: d.map((i) => [i.label, fmt(i.value)]) } };
  });
}

/** Legend row for multi-series bars (direct labels do not fit inside groups). */
function legend(svg: SVGSVGElement, names: string[], y = 12) {
  const g = el('g', { class: 'lt-legend' });
  let x = 0;
  names.forEach((n, i) => {
    g.append(el('rect', { x, y: y - 8, width: 10, height: 10, rx: 2, style: `fill: ${seriesColor(i)}` }));
    g.append(el('text', { x: x + 15, y: y + 1, class: 'lt-label-muted' }, [n]));
    x += 15 + textWidth(n) + 18;
  });
  svg.append(g);
}

export function groupedBars(host: HTMLElement, data: GroupData, opts: BarOptions = {}): ChartInstance<GroupData> {
  return chart(host, data, opts, (ctx, d) => {
    const { svg, width, height, fmt } = ctx;
    const m = { t: 34, b: 26 };
    legend(svg, d.series.map((s) => s.name));
    const y = linear(niceDomain(...extent(d.series.flatMap((s) => s.values)), 5, true), [height - m.b, m.t]);
    const gl = gutter(y, fmt);
    const x = band(d.categories, [gl, width], 0.28, 0.08);
    const inner = band(d.series.map((s) => s.name), [0, x.bandwidth], 0.12, 0);
    yGrid(svg, y, gl, width, fmt);
    const marks: Mark[] = [];
    const g = el('g');
    d.categories.forEach((c, ci) => {
      d.series.forEach((s, si) => {
        const v = s.values[ci], px = x(c) + inner(s.name), py = y(Math.max(0, v));
        g.append(el('path', { d: barPath(px, py, inner.bandwidth, Math.abs(y(v) - y(0)), 2, 'up'), class: 'lt-mark', style: `fill: ${seriesColor(si)}` }));
      });
      marks.push({ x: x(c) + x.bandwidth / 2, y: y(Math.max(...d.series.map((s) => s.values[ci]))), hit: { x: x(c), y: m.t, w: x.bandwidth, h: height - m.b - m.t }, html: tipHtml(c, d.series.map((s, si) => ({ color: seriesColor(si), label: s.name, value: fmt(s.values[ci]) }))), text: `${c}: ${d.series.map((s) => `${s.name} ${fmt(s.values[ci])}`).join(', ')}` });
    });
    svg.append(g);
    xLabels(svg, d.categories.map((c) => ({ x: x(c) + x.bandwidth / 2, text: c })), height - 6, width);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Grouped bar chart: ${d.series.length} series across ${d.categories.length} categories.`, table: { head: ['', ...d.series.map((s) => s.name)], rows: d.categories.map((c, ci) => [c, ...d.series.map((s) => fmt(s.values[ci]))]) } };
  });
}

export function stackedBars(host: HTMLElement, data: GroupData, opts: BarOptions = {}): ChartInstance<GroupData> {
  return chart(host, data, opts, (ctx, d) => {
    const { svg, width, height, fmt } = ctx;
    const m = { t: 34, b: 26 };
    legend(svg, d.series.map((s) => s.name));
    const totals = d.categories.map((_, ci) => d.series.reduce((a, s) => a + s.values[ci], 0));
    const y = linear(niceDomain(0, Math.max(...totals), 5, true), [height - m.b, m.t + 12]);
    const gl = gutter(y, fmt);
    const x = band(d.categories, [gl, width], 0.32, 0.08);
    yGrid(svg, y, gl, width, fmt);
    const marks: Mark[] = [];
    const g = el('g');
    d.categories.forEach((c, ci) => {
      let acc = 0;
      d.series.forEach((s, si) => {
        const v = s.values[ci];
        const top = si === d.series.length - 1;
        g.append(el('path', { d: barPath(x(c), y(acc + v), x.bandwidth, y(acc) - y(acc + v) - (si > 0 ? 0 : 0), top ? RAD : 0, 'up'), class: 'lt-mark', style: `fill: ${seriesColor(si)}; stroke: var(--bg-surface-1); stroke-width: 1` }));
        acc += v;
      });
      if (x.bandwidth > textWidth(fmt(totals[ci])) + 2) g.append(el('text', { x: r(x(c) + x.bandwidth / 2), y: r(y(totals[ci]) - 5), 'text-anchor': 'middle', class: 'lt-value' }, [fmt(totals[ci])]));
      marks.push({ x: x(c) + x.bandwidth / 2, y: y(totals[ci]), hit: { x: x(c), y: y(totals[ci]), w: x.bandwidth, h: y(0) - y(totals[ci]) }, html: tipHtml(`${c} · ${fmt(totals[ci])}`, d.series.map((s, si) => ({ color: seriesColor(si), label: s.name, value: fmt(s.values[ci]) })).reverse()), text: `${c}: total ${fmt(totals[ci])}` });
    });
    svg.append(g);
    xLabels(svg, d.categories.map((c) => ({ x: x(c) + x.bandwidth / 2, text: c })), height - 6, width);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Stacked bar chart of ${d.categories.length} categories split into ${d.series.length} parts.`, table: { head: ['', ...d.series.map((s) => s.name), 'Total'], rows: d.categories.map((c, ci) => [c, ...d.series.map((s) => fmt(s.values[ci])), fmt(totals[ci])]) } };
  });
}

export function divergingBars(host: HTMLElement, data: BarItem[], opts: BarOptions = {}): ChartInstance<BarItem[]> {
  const rows = data.length;
  return chart(host, data, { height: () => rows * 30 + 12, ...opts }, (ctx, raw, o) => {
    const { svg, width, height, fmt } = ctx;
    const d = sorted(raw, o.sort ?? 'desc');
    const labelW = Math.min(width * 0.36, Math.max(...d.map((i) => textWidth(i.label, '12px system-ui'))) + 12);
    const max = Math.max(...d.map((i) => Math.abs(i.value)));
    const pad = textWidth(fmt(-max)) + 10;
    const x = linear(niceDomain(-max, max, 4, true), [labelW + pad, width - pad]);
    const y = band(d.map((i) => i.label), [4, height - 8], 0.3, 0.1);
    svg.append(el('line', { x1: r(x(0)), x2: r(x(0)), y1: 0, y2: height - 8, class: 'lt-baseline' }));
    const marks: Mark[] = [];
    const g = el('g');
    d.forEach((it) => {
      const py = y(it.label), pos = it.value >= 0;
      const c = pos ? 'var(--status-positive)' : 'var(--status-negative)';
      const x0 = x(0), x1 = x(it.value);
      g.append(el('text', { x: labelW - 10, y: r(py + y.bandwidth / 2 + 4), 'text-anchor': 'end', style: 'fill: var(--text-primary); font-size: 12px' }, [it.label]));
      g.append(el('path', { d: barPath(Math.min(x0, x1), py, Math.abs(x1 - x0), y.bandwidth, RAD, pos ? 'right' : 'left'), class: 'lt-mark', style: `fill: ${c}` }));
      g.append(el('text', { x: r(pos ? x1 + 6 : x1 - 6), y: r(py + y.bandwidth / 2 + 4), 'text-anchor': pos ? 'start' : 'end', class: 'lt-value' }, [fmt(it.value)]));
      marks.push({ x: x1, y: py + y.bandwidth / 2, hit: { x: 0, y: py - 3, w: width, h: y.bandwidth + 6 }, html: tipHtml(it.label, [{ color: c, label: pos ? 'Increase' : 'Decrease', value: fmt(it.value) }]), text: `${it.label}: ${fmt(it.value)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    const up = d.filter((i) => i.value > 0).length;
    return { summary: `Diverging bar chart: ${up} of ${d.length} items increased.`, table: { head: ['Item', 'Change'], rows: d.map((i) => [i.label, fmt(i.value)]) } };
  });
}
