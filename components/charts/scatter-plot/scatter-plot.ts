import { chart, gutter, seriesColor, tipHtml, xLabels, yGrid, type ChartOptions, type Mark } from '../core/frame';
import { extent, linear, niceDomain, rng } from '../core/scale';
import { el, r } from '../core/svg';
import { formatNumber, type NumberFormat } from '../core/format';
import '../core/charts.css';

export interface ScatterPoint { x: number; y: number; label?: string; group?: string }
export interface ScatterOptions extends ChartOptions { xFormat?: NumberFormat; xLabel?: string; yLabel?: string; /** Switch to Canvas above this many points (default 300). */ canvasThreshold?: number }

/** Scatter plot. Small sets draw as SVG marks; large sets draw on a DPR-aware Canvas under the SVG axes. */
export function render(host: HTMLElement, data: ScatterPoint[], opts: ScatterOptions = {}) {
  return chart(host, data, opts, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const xf = (v: number) => formatNumber(v, o.xFormat);
    const m = { t: 18, b: 40, r: 8 };
    const groups = [...new Set(d.map((p) => p.group ?? ''))];
    const y = linear(niceDomain(...extent(d.map((p) => p.y)), 5), [height - m.b, m.t]);
    const gl = gutter(y, fmt);
    const x = linear(niceDomain(...extent(d.map((p) => p.x)), 5), [gl + 6, width - m.r]);
    yGrid(svg, y, gl, width, fmt);
    svg.append(el('line', { x1: gl, x2: width, y1: height - m.b, y2: height - m.b, class: 'lt-baseline' }));
    xLabels(svg, x.ticks(Math.max(2, Math.floor(width / 90))).map((t) => ({ x: x(t), text: xf(t) })), height - m.b + 16, width);
    if (o.xLabel) svg.append(el('text', { x: width, y: height - 4, 'text-anchor': 'end', class: 'lt-label-muted' }, [o.xLabel]));
    const colorOf = (p: ScatterPoint) => seriesColor(Math.max(0, groups.indexOf(p.group ?? '')));
    const useCanvas = d.length > (o.canvasThreshold ?? 300);
    if (useCanvas) {
      const fo = el('foreignObject', { x: 0, y: 0, width, height });
      const canvas = document.createElement('canvas');
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = width * dpr; canvas.height = height * dpr;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      canvas.className = 'lt-canvas';
      fo.append(canvas);
      svg.append(fo);
      const c2 = canvas.getContext('2d')!;
      c2.scale(dpr, dpr);
      const resolved = groups.map((_, i) => getComputedStyle(host).getPropertyValue(`--chart-${(i % 8) + 1}`).trim() || '#4a7');
      c2.globalAlpha = 0.55;
      for (const p of d) { c2.fillStyle = resolved[Math.max(0, groups.indexOf(p.group ?? ''))]; c2.beginPath(); c2.arc(x(p.x), y(p.y), 2.6, 0, Math.PI * 2); c2.fill(); }
    } else {
      const g = el('g');
      for (const p of d) g.append(el('circle', { cx: r(x(p.x)), cy: r(y(p.y)), r: 4, class: 'lt-mark', style: `fill: ${colorOf(p)}; fill-opacity: 0.75; stroke: var(--bg-surface-1); stroke-width: 1` }));
      svg.append(g);
    }
    if (groups.length > 1) {
      const lg = el('g');
      let lx = 0;
      groups.forEach((gname, i) => { lg.append(el('circle', { cx: lx + 5, cy: 6, r: 4, style: `fill: ${seriesColor(i)}` })); lg.append(el('text', { x: lx + 13, y: 10, class: 'lt-label-muted' }, [gname])); lx += 30 + gname.length * 6.5; });
      lg.setAttribute('transform', `translate(${width - lx}, -2)`);
      svg.append(lg);
    }
    const marks: Mark[] = d.map((p) => ({ x: x(p.x), y: y(p.y), html: tipHtml(p.label ?? p.group ?? 'Point', [{ color: colorOf(p), label: o.xLabel ?? 'x', value: xf(p.x) }, { label: o.yLabel ?? 'y', value: fmt(p.y) }]), text: `${p.label ?? ''} ${o.xLabel ?? 'x'} ${xf(p.x)}, ${o.yLabel ?? 'y'} ${fmt(p.y)}` }));
    ctx.interact({ mode: 'nearest', marks, radius: 24 });
    // Correlation for the summary.
    const n = d.length, mx = d.reduce((a, p) => a + p.x, 0) / n, my = d.reduce((a, p) => a + p.y, 0) / n;
    const cov = d.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0), vx = d.reduce((a, p) => a + (p.x - mx) ** 2, 0), vy = d.reduce((a, p) => a + (p.y - my) ** 2, 0);
    const corr = cov / Math.sqrt(vx * vy || 1);
    return { summary: `Scatter plot of ${n} points${useCanvas ? ' (drawn on canvas)' : ''}. Correlation ${corr.toFixed(2)}.`, table: { head: ['Point', o.xLabel ?? 'x', o.yLabel ?? 'y'], rows: d.slice(0, 200).map((p, i) => [p.label ?? `#${i + 1}`, xf(p.x), fmt(p.y)]) } };
  });
}

export function demo(host: HTMLElement) {
  const rand = rng(42);
  const pts: ScatterPoint[] = Array.from({ length: 1200 }, () => {
    const group = rand() > 0.62 ? 'Mobile' : 'Desktop';
    const size = 40 + rand() * 1800;
    const ms = (group === 'Mobile' ? 900 : 380) + size * (group === 'Mobile' ? 1.1 : 0.62) + (rand() - 0.5) * 520;
    return { x: Math.round(size), y: Math.max(80, Math.round(ms)), group };
  });
  return render(host, pts, { title: 'Bigger pages load slower, mobile most', subtitle: '1,200 page loads · page weight (KB) vs. load time (ms)', xLabel: 'Page weight', yLabel: 'Load time', xFormat: { suffix: ' KB', compact: true }, format: { suffix: ' ms', compact: true }, source: 'Source: synthetic RUM data' });
}
