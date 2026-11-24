import { chart, seriesColor, tipHtml, type ChartOptions, type Mark } from '../core/frame';
import { formatNumber } from '../core/format';
import { arcPath, el, r } from '../core/svg';
import '../core/charts.css';

export interface DonutItem { label: string; value: number }
export interface DonutOptions extends ChartOptions { centerLabel?: string }

/**
 * Donut for 2–4 parts of one whole. More than four parts are folded into "Other" automatically
 * (anti-slop: never a pie with five or more slices).
 */
export function render(host: HTMLElement, data: DonutItem[], opts: DonutOptions = {}) {
  return chart(host, data, { height: 220, ...opts }, (ctx, raw, o) => {
    const { svg, width, height, fmt } = ctx;
    const sortedItems = [...raw].sort((a, b) => b.value - a.value);
    const d = sortedItems.length > 4 ? [...sortedItems.slice(0, 3), { label: 'Other', value: sortedItems.slice(3).reduce((a, x) => a + x.value, 0) }] : sortedItems;
    const total = d.reduce((a, x) => a + x.value, 0);
    const rad = Math.min(height / 2 - 6, width * 0.22);
    const cx = rad + 6, cy = height / 2;
    const g = el('g');
    const marks: Mark[] = [];
    let a = 0;
    const gapA = 0.012;
    d.forEach((it, i) => {
      const span = (it.value / total) * Math.PI * 2;
      const c = it.label === 'Other' ? 'var(--border-strong)' : seriesColor(i);
      g.append(el('path', { d: arcPath(cx, cy, rad * 0.64, rad, a + gapA, a + span - gapA), class: 'lt-mark', style: `fill: ${c}` }));
      const mid = a + span / 2;
      marks.push({ x: cx + Math.sin(mid) * rad * 0.82, y: cy - Math.cos(mid) * rad * 0.82, html: tipHtml(it.label, [{ color: c, label: 'Share', value: formatNumber(it.value / total, { percent: true, decimals: 1 }) }, { label: 'Value', value: fmt(it.value) }]), text: `${it.label}: ${formatNumber(it.value / total, { percent: true, decimals: 1 })}` });
      a += span;
    });
    g.append(el('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', style: 'font-family: var(--font-display); font-size: 20px; font-weight: 650; fill: var(--text-primary)' }, [fmt(total)]));
    g.append(el('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', class: 'lt-tick' }, [o.centerLabel ?? 'Total']));
    // Direct legend with values to the right: no hunting for colours.
    const lx = cx + rad + 28;
    const rowH = 34;
    const ly0 = cy - (d.length * rowH) / 2 + 10;
    d.forEach((it, i) => {
      const c = it.label === 'Other' ? 'var(--border-strong)' : seriesColor(i);
      const ly = ly0 + i * rowH;
      g.append(el('rect', { x: lx, y: r(ly - 9), width: 10, height: 10, rx: 2, style: `fill: ${c}` }));
      g.append(el('text', { x: lx + 18, y: r(ly), style: 'fill: var(--text-primary); font-size: 12.5px; font-weight: 550' }, [it.label]));
      g.append(el('text', { x: lx + 18, y: r(ly + 15), class: 'lt-tick' }, [`${formatNumber(it.value / total, { percent: true, decimals: 0 })} · ${fmt(it.value)}`]));
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks, radius: rad * 0.5 });
    return { summary: `Donut chart, ${d.length} parts of ${fmt(total)}: ${d.map((it) => `${it.label} ${formatNumber(it.value / total, { percent: true, decimals: 0 })}`).join(', ')}.`, table: { head: ['Part', 'Value', 'Share'], rows: d.map((it) => [it.label, fmt(it.value), formatNumber(it.value / total, { percent: true, decimals: 1 })]) } };
  });
}

export function demo(host: HTMLElement) {
  return render(host, [{ label: 'Card', value: 18240 }, { label: 'Direct debit', value: 9110 }, { label: 'Invoice', value: 4380 }, { label: 'PayPal', value: 1210 }, { label: 'Crypto', value: 140 }],
    { title: 'How customers pay', subtitle: 'Share of November revenue', format: { prefix: '£', compact: true }, centerLabel: 'Revenue', source: 'Source: synthetic billing data' });
}
