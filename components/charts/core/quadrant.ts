// Labelled scatter for trade-offs: quadrant shading, median guides, direct point labels and an
// optional Pareto frontier (the points nothing else beats on both axes).
import { chart, gutter, tipHtml, yGrid, type ChartInstance, type ChartOptions, type Mark } from './frame';
import { formatNumber, type NumberFormat } from './format';
import { extent, linear, niceDomain } from './scale';
import { el, linePath, r } from './svg';
import { groupColors, legend, mute, placeLabels } from './kit';

export interface TradeoffPoint { label: string; x: number; y: number; group?: string }
export interface TradeoffOptions extends ChartOptions {
  xFormat?: NumberFormat;
  xLabel?: string;
  yLabel?: string;
  /** Which way is better on each axis. Defaults: x lower, y higher. */
  better?: { x?: 'low' | 'high'; y?: 'low' | 'high' };
  /** Shade the quadrant that is better on both axes (split at the medians). */
  quadrant?: boolean;
  quadrantLabel?: string;
  /** Draw the Pareto frontier and mute everything behind it. */
  frontier?: boolean;
  /** Log scale for x (prices, sizes spanning orders of magnitude). */
  logX?: boolean;
  groups?: string[];
  highlight?: string | string[];
}

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Points not dominated by any other point (better or equal on both axes, strictly better on one). */
export function pareto<T extends { x: number; y: number }>(pts: T[], bx: 'low' | 'high' = 'low', by: 'low' | 'high' = 'high') {
  const bX = (a: number, b: number) => (bx === 'low' ? a <= b : a >= b), bY = (a: number, b: number) => (by === 'high' ? a >= b : a <= b);
  return pts.filter((p) => !pts.some((q) => q !== p && bX(q.x, p.x) && bY(q.y, p.y) && (q.x !== p.x || q.y !== p.y)));
}

export function tradeoff(host: HTMLElement, data: TradeoffPoint[], opts: TradeoffOptions = {}): ChartInstance<TradeoffPoint[]> {
  return chart(host, data, { height: (w: number) => Math.round(Math.min(440, Math.max(300, w * 0.6))), ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const xf = (v: number) => formatNumber(v, o.xFormat);
    const bx = o.better?.x ?? 'low', by = o.better?.y ?? 'high';
    const gc = groupColors(d.map((p) => p.group), o.groups);
    const lh = gc.names.length > 1 ? legend(svg, gc.names.map((n) => ({ name: n, color: gc.color(n), shape: 'dot' as const })), width) : 0;
    const m = { t: lh + 22, b: 42, r: 10 };
    const y = linear(niceDomain(...extent(d.map((p) => p.y)), 5), [height - m.b, m.t]);
    const gl = gutter(y, fmt);
    // x: linear or log10 with decade ticks.
    let xs: (v: number) => number, ticks: number[];
    if (o.logX) {
      const [lo, hiV] = extent(d.map((p) => p.x));
      const a = Math.floor(Math.log10(lo)), b = Math.ceil(Math.log10(hiV));
      const L = linear([a, b], [gl + 8, width - m.r]);
      xs = (v) => L(Math.log10(Math.max(v, 10 ** a)));
      ticks = [];
      for (let k = a; k <= b; k++) for (const f of [1, 3]) { const t = f * 10 ** k; if (t >= 10 ** a && t <= 10 ** b) ticks.push(+t.toPrecision(3)); }
    } else {
      const X = linear(niceDomain(...extent(d.map((p) => p.x)), 5, true), [gl + 8, width - m.r]);
      xs = X; ticks = X.ticks(Math.max(3, Math.floor(width / 100)));
    }
    // Quadrant shading first, under everything.
    const mx = median(d.map((p) => p.x)), my = median(d.map((p) => p.y));
    if (o.quadrant) {
      const qx0 = bx === 'low' ? gl + 8 : xs(mx), qx1 = bx === 'low' ? xs(mx) : width - m.r;
      const qy0 = by === 'high' ? m.t : y(my), qy1 = by === 'high' ? y(my) : height - m.b;
      svg.append(el('rect', { x: r(qx0), y: r(qy0), width: r(qx1 - qx0), height: r(qy1 - qy0), style: 'fill: color-mix(in oklab, var(--status-positive) 9%, transparent)' }));
      const label = o.quadrantLabel ?? 'Better on both';
      svg.append(el('text', { x: r(bx === 'low' ? qx0 + 8 : qx1 - 8), y: r(by === 'high' ? qy0 + 16 : qy1 - 8), 'text-anchor': bx === 'low' ? 'start' : 'end', style: 'fill: var(--text-secondary); font-size: 11px; font-weight: 600' }, [label]));
    }
    yGrid(svg, y, gl, width - m.r, fmt);
    const xg = el('g', { class: 'lt-grid' });
    for (const t of ticks) {
      const px = r(xs(t));
      xg.append(el('line', { x1: px, x2: px, y1: m.t, y2: height - m.b, class: 'lt-vgrid' }));
      xg.append(el('text', { x: px, y: height - m.b + 16, 'text-anchor': 'middle', class: 'lt-tick' }, [xf(t)]));
    }
    svg.append(xg);
    if (o.quadrant) {
      svg.append(el('line', { x1: r(xs(mx)), x2: r(xs(mx)), y1: m.t, y2: height - m.b, style: 'stroke: var(--border-strong); stroke-dasharray: 4 3' }));
      svg.append(el('line', { x1: gl, x2: width - m.r, y1: r(y(my)), y2: r(y(my)), style: 'stroke: var(--border-strong); stroke-dasharray: 4 3' }));
    }
    if (o.yLabel) svg.append(el('text', { x: gl, y: m.t - 8, 'text-anchor': 'start', style: 'fill: var(--text-secondary); font-size: 11px; font-weight: 600' }, [o.yLabel + (by === 'high' ? ' ↑' : ' ↓')]));
    if (o.xLabel) svg.append(el('text', { x: width - m.r, y: height - 6, 'text-anchor': 'end', style: 'fill: var(--text-secondary); font-size: 11px; font-weight: 600' }, [o.xLabel + (bx === 'low' ? ' (lower is better)' : ' →')]));

    const front = o.frontier ? new Set(pareto(d, bx, by)) : null;
    const frontierBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    if (front) {
      const fp = [...front].sort((a, b) => a.x - b.x).map((p) => [xs(p.x), y(p.y)] as [number, number]);
      // Step line: the frontier only improves in steps between real points.
      const steps: Array<[number, number]> = [];
      fp.forEach((p, i) => { if (i) steps.push([p[0], fp[i - 1][1]]); steps.push(p); });
      svg.append(el('path', { d: linePath(steps), style: 'fill: none; stroke: var(--text-secondary); stroke-width: 1.5; stroke-dasharray: 5 4' }));
      // Keep labels off the frontier line.
      for (let i = 1; i < steps.length; i++) {
        const [ax, ay] = steps[i - 1], [bx2, by2] = steps[i];
        frontierBoxes.push({ x: Math.min(ax, bx2) - 2, y: Math.min(ay, by2) - 2, w: Math.abs(bx2 - ax) + 4, h: Math.abs(by2 - ay) + 4 });
      }
    }
    const isOn = (p: TradeoffPoint) => (front ? front.has(p) : true) && (!o.highlight || (Array.isArray(o.highlight) ? o.highlight.includes(p.label) : o.highlight === p.label));
    const g = el('g');
    const marks: Mark[] = [];
    // Draw muted points first so highlighted ones sit on top.
    const sorted = [...d].sort((a, b) => Number(isOn(a)) - Number(isOn(b)));
    for (const p of sorted) {
      const c = gc.color(p.group), on = isOn(p);
      g.append(el('circle', { cx: r(xs(p.x)), cy: r(y(p.y)), r: on ? 6 : 5, class: 'lt-mark', style: `fill: ${on ? c : mute(c, 40)}; stroke: var(--bg-surface-1); stroke-width: 2` }));
      marks.push({ x: xs(p.x), y: y(p.y), html: tipHtml(p.label, [...(p.group ? [{ color: c, label: 'Group', value: p.group }] : []), { label: o.xLabel ?? 'x', value: xf(p.x) }, { label: o.yLabel ?? 'y', value: fmt(p.y) }]), text: `${p.label}: ${o.xLabel ?? 'x'} ${xf(p.x)}, ${o.yLabel ?? 'y'} ${fmt(p.y)}` });
    }
    svg.append(g);
    // Direct labels: highlighted points first, then the rest where room allows.
    const pts = [...d].sort((a, b) => Number(isOn(b)) - Number(isOn(a)));
    const places = placeLabels(pts.map((p) => ({ x: xs(p.x), y: y(p.y), text: p.label, r: 6 })), { x: gl, y: m.t - 4, w: width - gl, h: height - m.b - m.t + 8 }, [...d.map((p) => ({ x: xs(p.x) - 6, y: y(p.y) - 6, w: 12, h: 12 })), ...frontierBoxes]);
    const lg = el('g');
    pts.forEach((p, i) => {
      const pl = places[i];
      if (!pl.ok || (!isOn(p) && width < 480)) return;
      lg.append(el('text', { x: r(pl.x), y: r(pl.y), 'text-anchor': pl.anchor, style: `fill: ${isOn(p) ? 'var(--text-primary)' : 'var(--text-muted)'}; font-size: 11px; font-weight: ${isOn(p) ? 600 : 500}; paint-order: stroke; stroke: var(--bg-surface-1); stroke-width: 3px; stroke-linejoin: round` }, [p.label]));
    });
    svg.append(lg);
    ctx.interact({ mode: 'nearest', marks, radius: 90 });
    const frontNames = front ? [...front].map((p) => p.label).join(', ') : '';
    return {
      summary: `Scatter of ${d.length} items, ${o.xLabel ?? 'x'} against ${o.yLabel ?? 'y'}.${front ? ` On the frontier: ${frontNames}.` : ''}`,
      table: { head: ['Item', 'Group', o.xLabel ?? 'x', o.yLabel ?? 'y'], rows: d.map((p) => [p.label, p.group ?? '', xf(p.x), fmt(p.y)]) },
    };
  });
}
