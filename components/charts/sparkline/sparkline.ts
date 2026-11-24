// Sparklines are word-sized: no figure chrome, no axes, just the shape and the last value marked.
import { extent, linear } from '../core/scale';
import { el, linePath, r, smoothPath } from '../core/svg';
import { formatNumber, type NumberFormat } from '../core/format';
import '../core/charts.css';

export interface SparkOptions { variant?: 'line' | 'bar'; width?: number; height?: number; label?: string; format?: NumberFormat; color?: string; area?: boolean }

export function sparkSvg(values: number[], o: SparkOptions = {}) {
  const w = o.width ?? 96, h = o.height ?? 24;
  const [lo, hi] = extent(values);
  const y = linear(o.variant === 'bar' ? [Math.min(0, lo), hi] : [lo, hi], [h - 2, 2]);
  const svg = el('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, class: 'lt-spark', role: 'img', 'aria-label': `${o.label ?? 'Trend'}: ${values.length} values from ${formatNumber(values[0], o.format)} to ${formatNumber(values[values.length - 1], o.format)}` });
  const c = o.color ?? 'var(--chart-1)';
  if (o.variant === 'bar') {
    const bw = w / values.length;
    values.forEach((v, i) => svg.append(el('rect', { x: r(i * bw + bw * 0.15), y: r(Math.min(y(v), y(0))), width: r(bw * 0.7), height: r(Math.max(1, Math.abs(y(v) - y(0)))), rx: 1, style: `fill: ${i === values.length - 1 ? c : `color-mix(in oklab, ${c} 45%, var(--bg-surface-2))`}` })));
  } else {
    const pts = values.map((v, i) => [2 + (i * (w - 6)) / (values.length - 1), y(v)] as [number, number]);
    if (o.area) svg.append(el('path', { d: `${smoothPath(pts)}L${r(pts[pts.length - 1][0])},${h}L${r(pts[0][0])},${h}Z`, style: `fill: color-mix(in oklab, ${c} 14%, transparent)` }));
    svg.append(el('path', { d: values.length > 3 ? smoothPath(pts) : linePath(pts), style: `fill: none; stroke: ${c}; stroke-width: 1.5; stroke-linecap: round` }));
    const [lx, ly] = pts[pts.length - 1];
    svg.append(el('circle', { cx: r(lx), cy: r(ly), r: 2.25, style: `fill: ${c}` }));
  }
  return svg;
}

/** Mount a sparkline into `host` (replacing its content). */
export function render(host: HTMLElement, values: number[], opts: SparkOptions = {}) {
  let current = values;
  const draw = () => host.replaceChildren(sparkSvg(current, opts));
  draw();
  return { root: host, update: (v: number[]) => { current = v; draw(); }, destroy: () => host.replaceChildren(), svg: () => host.querySelector('svg') as SVGSVGElement, exportSVG: () => {}, exportPNG: async () => {} };
}

export function demo(host: HTMLElement) {
  host.innerHTML = `<table class="lt-spark-table"><caption class="lt-visually-hidden">Services with 14-day trends</caption>
    <thead><tr><th scope="col">Service</th><th scope="col">Requests (14 days)</th><th scope="col" data-num>Today</th><th scope="col">Errors</th></tr></thead><tbody></tbody></table>`;
  const rows: Array<[string, number[], number[]]> = [
    ['api-gateway', [42, 44, 41, 47, 49, 52, 50, 55, 57, 56, 60, 62, 61, 66], [3, 2, 4, 2, 1, 2, 1, 3, 1, 1, 0, 1, 2, 1]],
    ['auth', [18, 19, 18, 20, 21, 20, 22, 21, 23, 22, 22, 24, 23, 24], [0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 0, 0, 1, 0]],
    ['exports', [9, 12, 8, 14, 11, 7, 13, 10, 6, 9, 5, 7, 4, 3], [1, 2, 1, 3, 4, 2, 5, 6, 4, 7, 8, 6, 9, 11]],
    ['search', [30, 29, 33, 35, 34, 38, 37, 40, 39, 43, 45, 44, 47, 49], [2, 1, 1, 2, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1]],
  ];
  const tb = host.querySelector('tbody')!;
  for (const [name, req, err] of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th scope="row"><code></code></th><td></td><td data-num></td><td></td>`;
    tr.querySelector('code')!.textContent = name;
    tr.children[1].append(sparkSvg(req, { label: `${name} requests`, area: true, format: { suffix: 'k' } }));
    tr.children[2].textContent = `${req[req.length - 1]}k`;
    tr.children[3].append(sparkSvg(err, { variant: 'bar', label: `${name} errors`, width: 64, color: err[err.length - 1] > 5 ? 'var(--status-negative)' : 'var(--chart-1)' }));
    tb.append(tr);
  }
  return { destroy: () => host.replaceChildren() };
}
