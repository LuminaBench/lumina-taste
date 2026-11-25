import { chart, tipHtml, xGrid, type ChartInstance, type ChartOptions, type Mark } from '../core/frame';
import { extent, linear, niceDomain, rng } from '../core/scale';
import { el, r, smoothPath, textWidth } from '../core/svg';
import { quantile } from '../core/kit';
import '../core/charts.css';

export interface RidgeGroup { label: string; values: number[] }
export interface RidgelineOptions extends ChartOptions { /** How far each ridge may rise into the row above, in rows (default 1.6). */ overlap?: number; highlight?: string }

/**
 * Ridgeline: one smoothed distribution per group, stacked with a little overlap on a shared scale.
 * One hue for every ridge; the shape and the median tick carry the comparison. For 4 to 12 groups.
 */
export function render(host: HTMLElement, data: RidgeGroup[], opts: RidgelineOptions = {}): ChartInstance<RidgeGroup[]> {
  const rowH = 34;
  return chart(host, data, { height: () => data.length * rowH + 62, ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const lw = Math.min(width * 0.3, Math.max(...d.map((g) => textWidth(g.label, '12px system-ui'))) + 14);
    const dom = niceDomain(...extent(d.flatMap((g) => g.values)), 5);
    const x = linear(dom, [lw + 4, width - 30]);
    const top = 30, bottom = height - 26;
    xGrid(svg, x, top - 22, bottom, fmt, Math.max(3, Math.floor(width / 110)));
    // Kernel density on a fixed grid, one bandwidth for every group so shapes are comparable.
    const steps = 72, span = dom[1] - dom[0], bw = span / 22;
    const grid = Array.from({ length: steps + 1 }, (_, i) => dom[0] + (span * i) / steps);
    const dens = d.map((g) => grid.map((gx) => g.values.reduce((a, v) => a + Math.exp(-0.5 * ((gx - v) / bw) ** 2), 0) / (g.values.length || 1)));
    const peak = Math.max(...dens.flat()) || 1;
    const rise = rowH * (o.overlap ?? 1.6);
    const g = el('g');
    const marks: Mark[] = [];
    d.forEach((grp, gi) => {
      const base = top + (gi + 1) * rowH;
      const on = !o.highlight || o.highlight === grp.label;
      const pts: Array<[number, number]> = grid.map((gx, i) => [x(gx), base - (dens[gi][i] / peak) * rise]);
      const c = on ? 'var(--chart-1)' : 'var(--border-strong)';
      // Each ridge is filled with the surface first, so the one behind never shows through its neighbour.
      const area = `${smoothPath(pts)}L${r(pts[pts.length - 1][0])} ${r(base)}L${r(pts[0][0])} ${r(base)}Z`;
      g.append(el('path', { d: area, style: 'fill: var(--bg-surface-1)' }));
      g.append(el('path', { d: area, class: 'lt-mark', style: `fill: color-mix(in oklab, ${c} ${on ? 26 : 14}%, transparent)` }));
      g.append(el('path', { d: smoothPath(pts), class: 'lt-line', style: `stroke: ${c}; stroke-width: 1.5` }));
      g.append(el('line', { x1: lw + 4, x2: width - 30, y1: r(base), y2: r(base), style: 'stroke: var(--border-hairline)' }));
    });
    // Second pass: median ticks and labels sit above every ridge, so a tall neighbour never hides them.
    d.forEach((grp, gi) => {
      const base = top + (gi + 1) * rowH;
      const on = !o.highlight || o.highlight === grp.label;
      const c = on ? 'var(--chart-1)' : 'var(--border-strong)';
      const s = [...grp.values].sort((a, b) => a - b);
      const med = quantile(s, 0.5), q1 = quantile(s, 0.25), q3 = quantile(s, 0.75);
      const mx = r(x(med));
      g.append(el('line', { x1: mx, x2: mx, y1: r(base - 9), y2: r(base), style: `stroke: ${on ? 'var(--text-primary)' : 'var(--text-secondary)'}; stroke-width: 2` }));
      g.append(el('text', { x: lw - 8, y: r(base - 4), 'text-anchor': 'end', style: `fill: var(--text-${on ? 'primary' : 'secondary'}); font-size: 12px${on && o.highlight ? '; font-weight: 600' : ''}` }, [grp.label]));
      marks.push({ x: x(med), y: base - 4, hit: { x: 0, y: base - rowH, w: width, h: rowH }, html: tipHtml(grp.label, [{ color: c, label: 'Median', value: fmt(med) }, { label: 'Middle half', value: `${fmt(q1)} – ${fmt(q3)}` }, { label: 'Samples', value: String(s.length) }]), text: `${grp.label}: median ${fmt(med)}, middle half ${fmt(q1)} to ${fmt(q3)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks, radius: 400 });
    return { summary: `Ridgeline of ${d.length} distributions. ${d.map((grp) => `${grp.label} median ${fmt(quantile([...grp.values].sort((a, b) => a - b), 0.5))}`).join('; ')}.`, table: { head: ['Group', 'Median', 'Lower quartile', 'Upper quartile', 'Samples'], rows: d.map((grp) => { const s = [...grp.values].sort((a, b) => a - b); return [grp.label, fmt(quantile(s, 0.5)), fmt(quantile(s, 0.25)), fmt(quantile(s, 0.75)), s.length]; }) } };
  });
}

export function demo(host: HTMLElement) {
  const rand = rng(23);
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rand(); return (u - 3) / 0.7; };
  const mk = (label: string, mean: number, sd: number, tail = 0) => ({ label, values: Array.from({ length: 260 }, () => Math.max(20, Math.round(mean + gauss() * sd + (rand() < tail ? rand() * 420 : 0)))) });
  return render(host, [mk('Sydney', 148, 22), mk('Frankfurt', 172, 26), mk('London', 180, 24), mk('Virginia', 236, 34, 0.05), mk('São Paulo', 312, 48, 0.08), mk('Mumbai', 388, 70, 0.14)], {
    title: 'Mumbai is slow, and it is not consistent', subtitle: 'API response time by region, last 24 hours', format: { suffix: ' ms' }, highlight: 'Mumbai', source: 'Source: edge request logs, 260 samples per region',
  });
}
