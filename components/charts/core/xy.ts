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
  /** Event notes pinned to x positions: a dashed rule and a short label above the plot. */
  annotations?: Array<{ at: string | number; label: string }>;
  /** A shaded range behind the first series: a forecast interval, a normal range, a min–max envelope. */
  band?: { lower: Array<number | null>; upper: Array<number | null>; label?: string };
  /** Index (or x value) where measured data ends. The line is dashed from there on and the tooltip says so. */
  forecastFrom?: number | string;
  /** Draw lines as steps: the value holds until the next point (prices, seats, limits, on/off). */
  step?: boolean;
  /** A horizontal reference line: a goal, a budget, a limit. Included in the scale. */
  target?: { value: number; label: string };
}

/** Step-after path: horizontal first, then vertical at the next x. */
const stepPath = (pts: Array<[number, number]>) => pts.map(([px, py], i) => (i === 0 ? `M${r(px)} ${r(py)}` : `H${r(px)}V${r(py)}`)).join('');

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
    const bandVals = o.band ? [...o.band.lower, ...o.band.upper].filter((v): v is number => v != null) : [];
    const [lo, hi] = extent([...(stacked ? [0, ...all] : all), ...bandVals, ...(o.target ? [o.target.value] : [])]);
    const fcI = o.forecastFrom == null ? -1 : typeof o.forecastFrom === 'number' && !d.x.includes(o.forecastFrom) ? o.forecastFrom : d.x.findIndex((x) => String(x) === String(o.forecastFrom));
    const path = (pts: Array<[number, number]>) => (o.step ? stepPath(pts) : (o.smooth ?? kind === 'area') ? smoothPath(pts) : linePath(pts));
    const dom = niceDomain(lo, hi, 5, kind !== 'line' || !!o.zero);
    const direct = (o.directLabels ?? d.series.length > 1) && width > 420;
    const labelW = direct ? Math.min(150, Math.max(...d.series.map((s) => textWidth(s.name, '600 11.5px system-ui'))) + 22) : 6;
    const notes = (o.annotations ?? []).map((a) => ({ ...a, i: typeof a.at === 'number' && !d.x.includes(a.at) ? a.at : d.x.findIndex((x) => String(x) === String(a.at)) })).filter((a) => a.i >= 0 && a.i < n);
    const m = { t: notes.length ? 46 : fcI > 0 ? 30 : 18, r: Math.max(labelW, 6), b: 26, l: 0 };
    const y = linear(dom, [height - m.b, m.t]);
    m.l = gutter(y, fmt);
    const xs = points(n, [m.l + 4, width - m.r - 4]);
    yGrid(svg, y, m.l, width - m.r, fmt);
    xLabels(svg, tickIndices(n, Math.max(2, Math.floor((width - m.r - m.l) / 84))).map((i) => ({ x: xs(i), text: formatX(d.x[i], d.x) })), height - 6, width - m.r);

    const g = el('g');
    if (o.band) {
      const up: Array<[number, number]> = [], dn: Array<[number, number]> = [];
      o.band.upper.forEach((v, i) => { const l = o.band!.lower[i]; if (v != null && l != null) { up.push([xs(i), y(v)]); dn.push([xs(i), y(l)]); } });
      if (up.length > 1) g.append(el('path', { d: areaPath(up, dn, !o.step && (o.smooth ?? false)), class: 'lt-band', style: `fill: color-mix(in oklab, ${color(0, d.series[0]?.name ?? '')} 15%, transparent)` }));
    }
    if (fcI > 0 && fcI < n) {
      const px = r(xs(fcI));
      g.append(el('line', { x1: px, x2: px, y1: m.t - 4, y2: height - m.b, style: 'stroke: var(--border-strong); stroke-width: 1' }));
      g.append(el('text', { x: px + 6, y: m.t - 10, class: 'lt-tick', style: 'font-weight: 600; fill: var(--text-secondary)' }, ['Forecast']));
      g.append(el('text', { x: px - 6, y: m.t - 10, 'text-anchor': 'end', class: 'lt-tick', style: 'fill: var(--text-secondary)' }, ['Actual']));
    }
    if (o.target) {
      const py = r(y(o.target.value));
      g.append(el('line', { x1: m.l, x2: width - m.r, y1: py, y2: py, style: 'stroke: var(--text-primary); stroke-width: 1.25; stroke-dasharray: 5 4' }));
      // Labelled at the left, where the line starts: the right end is where the data usually meets it.
      g.append(el('text', { x: m.l + 6, y: py - 6, style: 'fill: var(--text-primary); font-size: 11px; font-weight: 600; paint-order: stroke; stroke: var(--bg-surface-1); stroke-width: 3px' }, [`${o.target.label} ${fmt(o.target.value)}`]));
    }
    const order = d.series.map((_, i) => i).sort((a, b) => (o.highlight ? (d.series[a].name === o.highlight ? 1 : 0) - (d.series[b].name === o.highlight ? 1 : 0) : 0));
    for (const si of order) {
      const s = d.series[si];
      const c = color(si, s.name);
      const upper: Array<[number, number]> = [];
      const lower: Array<[number, number]> = [];
      s.values.forEach((v, i) => { if (v != null) { upper.push([xs(i), y(stacked ? tops[si][i] : v)]); lower.push([xs(i), y(stacked ? base[si][i] : Math.max(dom[0], 0))]); } });
      if (kind !== 'line') {
        const fill = stacked ? `color-mix(in oklab, ${c} 78%, var(--bg-surface-1))` : `color-mix(in oklab, ${c} 16%, transparent)`;
        g.append(el('path', { d: o.step ? `${stepPath(upper)}V${r(lower[lower.length - 1][1])}H${r(lower[0][0])}Z` : areaPath(upper, lower, o.smooth ?? kind === 'area'), class: 'lt-area lt-mark', style: `fill: ${fill}` }));
      }
      const muted = o.highlight && o.highlight !== s.name ? '' : undefined;
      if (fcI > 0 && fcI < n && !stacked) {
        const cut = upper.findIndex(([px]) => px >= xs(fcI) - 0.01);
        const solid = cut < 0 ? upper : upper.slice(0, cut + 1), dashed = cut < 0 ? [] : upper.slice(cut);
        if (solid.length > 1) g.append(el('path', { d: path(solid), class: 'lt-line lt-mark', style: `stroke: ${c}`, 'data-muted': muted }));
        if (dashed.length > 1) g.append(el('path', { d: path(dashed), class: 'lt-line lt-mark', style: `stroke: ${c}; stroke-dasharray: 2 5`, 'data-muted': muted }));
        if (cut >= 0) g.append(el('circle', { cx: r(upper[cut][0]), cy: r(upper[cut][1]), r: 3.5, style: `fill: var(--bg-surface-1); stroke: ${c}; stroke-width: 2` }));
      } else g.append(el('path', { d: path(upper), class: 'lt-line lt-mark', style: `stroke: ${c}`, 'data-muted': muted }));
      if (o.markers) upper.forEach(([px, py]) => g.append(el('circle', { cx: r(px), cy: r(py), r: 2.5, style: `fill: ${c}` })));
    }
    svg.append(g);

    // Annotations: alternate two label rows so neighbours never collide.
    if (notes.length) {
      const ag = el('g', { class: 'lt-notes' });
      const lastEnd = [-Infinity, -Infinity];
      notes.forEach((a) => {
        const px = xs(a.i), w = textWidth(a.label, '600 11px system-ui') + 14;
        const anchorX = Math.min(Math.max(px - w / 2, m.l), width - m.r - w);
        const row = anchorX > lastEnd[0] + 6 ? 0 : 1;
        lastEnd[row] = anchorX + w;
        const ty = row === 0 ? 4 : 24;
        ag.append(el('line', { x1: r(px), x2: r(px), y1: ty + 18, y2: height - m.b, style: 'stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3 3' }));
        ag.append(el('rect', { x: r(anchorX), y: ty, width: r(w), height: 18, rx: 9, style: 'fill: var(--bg-surface-2); stroke: var(--border-hairline)' }));
        ag.append(el('text', { x: r(anchorX + w / 2), y: ty + 13, 'text-anchor': 'middle', style: 'fill: var(--text-primary); font-size: 11px; font-weight: 600' }, [a.label]));
      });
      svg.insertBefore(ag, g);
    }

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
      html: (i) => tipHtml(`${formatXFull(d.x[i])}${fcI > 0 && i > fcI ? ' · forecast' : ''}`, [
        ...d.series.map((s, si) => ({ color: color(si, s.name), label: s.name, value: s.values[i] == null ? '–' : fmt(s.values[i]!) })).reverse(),
        ...(o.band && o.band.lower[i] != null && o.band.upper[i] != null ? [{ label: o.band.label ?? 'Range', value: `${fmt(o.band.lower[i]!)} – ${fmt(o.band.upper[i]!)}` }] : []),
        ...(o.target ? [{ label: o.target.label, value: fmt(o.target.value) }] : []),
      ]),
      text: (i) => `${formatXFull(d.x[i])}${fcI > 0 && i > fcI ? ' (forecast)' : ''}: ${d.series.map((s) => `${s.name} ${s.values[i] == null ? 'no data' : fmt(s.values[i]!)}`).join(', ')}`,
    });
    const last = d.series.map((s) => `${s.name} ends at ${fmt(s.values[n - 1] ?? 0)}`).join('; ');
    return {
      summary: `${o.step ? 'Step' : kind === 'line' ? 'Line' : kind === 'area' ? 'Area' : 'Stacked area'} chart of ${d.series.length} series over ${n} points${fcI > 0 ? `, forecast from ${formatX(d.x[fcI], d.x)}` : ''}. ${last}.${o.target ? ` ${o.target.label}: ${fmt(o.target.value)}.` : ''}`,
      table: { head: ['', ...d.series.map((s) => s.name)], rows: d.x.map((x, i) => [formatX(x, d.x), ...d.series.map((s) => (s.values[i] == null ? '–' : fmt(s.values[i]!)))]) },
    };
  });
}
