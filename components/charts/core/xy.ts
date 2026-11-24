// Shared drawer for index/time-based charts: line, multi-line, area, stacked area.
import { chart, gutter, seriesColor, tipHtml, xLabels, yGrid, type ChartInstance, type ChartOptions } from './frame';
import { formatX, formatXFull } from './format';
import { extent, linear, niceDomain, points, tickIndices } from './scale';
import { areaPath, el, linePath, r, relax, smoothPath, textWidth } from './svg';

export interface SeriesData { x: Array<string | number | Date>; series: Array<{ name: string; values: Array<number | null> }> }
export interface XYOptions extends ChartOptions {
  kind?: 'line' | 'area' | 'stacked';
  smooth?: boolean;
  /** Label series at their last point instead of using a legend (default true when it fits). */
  directLabels?: boolean;
  /** Emphasise one series; the rest turn neutral grey. */
  highlight?: string;
  zero?: boolean;
  /** Show markers at each point (for short series). */
  markers?: boolean;
}

export function renderXY(host: HTMLElement, data: SeriesData, opts: XYOptions = {}): ChartInstance<SeriesData> {
  return chart(host, data, opts, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const kind = o.kind ?? 'line';
    const n = d.x.length;
    const stacked = kind === 'stacked';
    const color = (i: number, name: string) => (o.highlight && o.highlight !== name ? 'var(--border-strong)' : seriesColor(i));
    // Stack
    const base = d.series.map(() => new Array<number>(n).fill(0));
    const tops = d.series.map((s) => s.values.map((v) => v ?? 0));
    if (stacked) for (let si = 1; si < d.series.length; si++) for (let i = 0; i < n; i++) { base[si][i] = tops[si - 1][i]; tops[si][i] += base[si][i]; }
    const all = stacked ? tops[tops.length - 1] : d.series.flatMap((s) => s.values.filter((v): v is number => v != null));
    const [lo, hi] = extent(stacked ? [0, ...all] : all);
    const dom = niceDomain(lo, hi, 5, kind !== 'line' || !!o.zero);
    const direct = (o.directLabels ?? d.series.length > 1) && width > 420;
    const labelW = direct ? Math.min(150, Math.max(...d.series.map((s) => textWidth(s.name, '600 11.5px system-ui'))) + 22) : 6;
    const m = { t: 18, r: labelW, b: 26, l: 0 };
    const y = linear(dom, [height - m.b, m.t]);
    m.l = gutter(y, fmt);
    const xs = points(n, [m.l + 4, width - m.r - 4]);
    yGrid(svg, y, m.l, width - m.r, fmt);
    xLabels(svg, tickIndices(n, Math.max(2, Math.floor((width - m.r - m.l) / 84))).map((i) => ({ x: xs(i), text: formatX(d.x[i], d.x) })), height - 6, width - m.r);

    const g = el('g');
    const order = d.series.map((_, i) => i).sort((a, b) => (o.highlight ? (d.series[a].name === o.highlight ? 1 : 0) - (d.series[b].name === o.highlight ? 1 : 0) : 0));
    for (const si of order) {
      const s = d.series[si];
      const c = color(si, s.name);
      const upper: Array<[number, number]> = [];
      const lower: Array<[number, number]> = [];
      s.values.forEach((v, i) => { if (v != null) { upper.push([xs(i), y(stacked ? tops[si][i] : v)]); lower.push([xs(i), y(stacked ? base[si][i] : Math.max(dom[0], 0))]); } });
      if (kind !== 'line') {
        const fill = stacked ? `color-mix(in oklab, ${c} 78%, var(--bg-surface-1))` : `color-mix(in oklab, ${c} 16%, transparent)`;
        g.append(el('path', { d: areaPath(upper, lower, o.smooth ?? kind === 'area'), class: 'lt-area lt-mark', style: `fill: ${fill}` }));
      }
      g.append(el('path', { d: (o.smooth ?? kind === 'area') ? smoothPath(upper) : linePath(upper), class: 'lt-line lt-mark', style: `stroke: ${c}`, 'data-muted': o.highlight && o.highlight !== s.name ? '' : undefined }));
      if (o.markers) upper.forEach(([px, py]) => g.append(el('circle', { cx: r(px), cy: r(py), r: 2.5, style: `fill: ${c}` })));
    }
    svg.append(g);

    // Direct labels at the end of each series, relaxed so they never collide.
    if (direct) {
      const lastY = d.series.map((s, si) => { let i = n - 1; while (i > 0 && s.values[i] == null) i--; return y(stacked ? (tops[si][i] + base[si][i]) / 2 : s.values[i] ?? 0); });
      const ys = relax(lastY, 15, m.t, height - m.b);
      const lg = el('g');
      d.series.forEach((s, si) => {
        const x0 = width - m.r + 8;
        lg.append(el('circle', { cx: x0, cy: r(ys[si]), r: 3.5, style: `fill: ${color(si, s.name)}` }));
        lg.append(el('text', { x: x0 + 8, y: r(ys[si] + 4), class: 'lt-label', style: `fill: ${o.highlight && o.highlight !== s.name ? 'var(--text-secondary)' : 'var(--text-primary)'}` }, [s.name]));
      });
      svg.append(lg);
    }

    ctx.interact({
      mode: 'x', top: m.t, bottom: height - m.b,
      xs: d.x.map((_, i) => xs(i)),
      series: d.series.map((s, si) => ({ color: color(si, s.name), ys: s.values.map((v, i) => (v == null ? null : y(stacked ? tops[si][i] : v))) })),
      html: (i) => tipHtml(formatXFull(d.x[i]),
        d.series.map((s, si) => ({ color: color(si, s.name), label: s.name, value: s.values[i] == null ? '–' : fmt(s.values[i]!) })).reverse()),
      text: (i) => `${formatXFull(d.x[i])}: ${d.series.map((s) => `${s.name} ${s.values[i] == null ? 'no data' : fmt(s.values[i]!)}`).join(', ')}`,
    });
    const last = d.series.map((s) => `${s.name} ends at ${fmt(s.values[n - 1] ?? 0)}`).join('; ');
    return {
      summary: `${kind === 'line' ? 'Line' : kind === 'area' ? 'Area' : 'Stacked area'} chart of ${d.series.length} series over ${n} points. ${last}.`,
      table: { head: ['', ...d.series.map((s) => s.name)], rows: d.x.map((x, i) => [formatX(x, d.x), ...d.series.map((s) => (s.values[i] == null ? '–' : fmt(s.values[i]!)))]) },
    };
  });
}
