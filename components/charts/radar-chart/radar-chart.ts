import { chart, seriesColor, tipHtml, type ChartOptions, type Mark } from '../core/frame';
import { el, r } from '../core/svg';
import '../core/charts.css';

export interface RadarData { axes: string[]; max?: number; series: Array<{ name: string; values: number[] }> }

/** Radar for 1–3 profiles over 5–8 shared axes. Dashed rings, no spokes cage beyond the axes themselves. */
export function render(host: HTMLElement, data: RadarData, opts: ChartOptions = {}) {
  return chart(host, data, { height: (w: number) => Math.round(Math.min(340, Math.max(260, w * 0.62))), ...opts }, (ctx, d, _o) => {
    const { svg, width, height, fmt } = ctx;
    const n = d.axes.length;
    const max = d.max ?? Math.max(...d.series.flatMap((s) => s.values));
    const rad = Math.min(height / 2 - 30, width / 2 - 70);
    const cx = width / 2, cy = height / 2 + 6;
    const ang = (i: number) => (i / n) * Math.PI * 2;
    const pt = (i: number, v: number) => [cx + Math.sin(ang(i)) * rad * (v / max), cy - Math.cos(ang(i)) * rad * (v / max)] as const;
    const g = el('g');
    [0.25, 0.5, 0.75, 1].forEach((k) => g.append(el('polygon', { points: d.axes.map((_, i) => pt(i, max * k).map(r).join(',')).join(' '), style: `fill: none; stroke: ${k === 1 ? 'var(--border-strong)' : 'var(--border-hairline)'}; stroke-dasharray: ${k === 1 ? 'none' : '2 3'}` })));
    d.axes.forEach((a, i) => {
      const [x, y] = pt(i, max);
      g.append(el('line', { x1: cx, y1: cy, x2: r(x), y2: r(y), style: 'stroke: var(--border-hairline)' }));
      const [lx, ly] = pt(i, max * 1.12);
      const anchor = Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end';
      g.append(el('text', { x: r(lx), y: r(ly + 4), 'text-anchor': anchor, style: 'font-size: 11.5px; fill: var(--text-secondary); font-weight: 550' }, [a]));
    });
    const marks: Mark[] = [];
    d.series.forEach((s, si) => {
      const c = seriesColor(si);
      g.append(el('polygon', { points: s.values.map((v, i) => pt(i, v).map(r).join(',')).join(' '), class: 'lt-mark', style: `fill: color-mix(in oklab, ${c} 16%, transparent); stroke: ${c}; stroke-width: 2; stroke-linejoin: round` }));
      s.values.forEach((v, i) => { const [x, y] = pt(i, v); g.append(el('circle', { cx: r(x), cy: r(y), r: 3, style: `fill: ${c}` })); });
    });
    d.axes.forEach((a, i) => {
      const [x, y] = pt(i, Math.max(...d.series.map((s) => s.values[i])));
      marks.push({ x, y, html: tipHtml(a, d.series.map((s, si) => ({ color: seriesColor(si), label: s.name, value: fmt(s.values[i]) }))), text: `${a}: ${d.series.map((s) => `${s.name} ${fmt(s.values[i])}`).join(', ')}` });
    });
    svg.append(g);
    const lg = el('g');
    d.series.forEach((s, si) => { lg.append(el('rect', { x: 0, y: si * 18, width: 10, height: 10, rx: 2, style: `fill: ${seriesColor(si)}` })); lg.append(el('text', { x: 16, y: si * 18 + 9, class: 'lt-label-muted' }, [s.name])); });
    svg.append(lg);
    ctx.interact({ mode: 'nearest', marks, radius: 40 });
    return { summary: `Radar chart comparing ${d.series.map((s) => s.name).join(' and ')} across ${n} attributes.`, table: { head: ['Attribute', ...d.series.map((s) => s.name)], rows: d.axes.map((a, i) => [a, ...d.series.map((s) => fmt(s.values[i]))]) } };
  });
}

export function demo(host: HTMLElement) {
  return render(host, { axes: ['Speed', 'Accuracy', 'Coverage', 'Cost', 'Latency', 'Support'], max: 10, series: [{ name: 'Northwind', values: [8.6, 7.9, 8.8, 6.4, 8.1, 9.0] }, { name: 'Industry median', values: [6.2, 7.1, 6.0, 7.0, 6.5, 6.1] }] },
    { title: 'Northwind against the median', subtitle: 'Buyer survey scores, out of 10', format: { decimals: 1 }, source: 'Source: synthetic survey' });
}
