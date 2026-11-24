import { chart, tipHtml, type ChartOptions, type Mark } from '../core/frame';
import { formatNumber } from '../core/format';
import { el, r, textWidth } from '../core/svg';
import '../core/charts.css';

export interface FunnelStep { label: string; value: number }

/** Conversion funnel: centred bars, step-to-step conversion between them, overall conversion in the summary. */
export function render(host: HTMLElement, data: FunnelStep[], opts: ChartOptions = {}) {
  return chart(host, data, { height: () => data.length * 52 + 8, ...opts }, (ctx, d, _o) => {
    const { svg, width, fmt } = ctx;
    const labelW = Math.min(width * 0.3, Math.max(...d.map((s) => textWidth(s.label, '600 12.5px system-ui'))) + 16);
    const plotW = width - labelW - 8;
    const max = d[0].value;
    const rowH = 52, barH = 30;
    const g = el('g');
    const marks: Mark[] = [];
    d.forEach((s, i) => {
      const w = Math.max(4, (s.value / max) * plotW);
      const x = labelW + (plotW - w) / 2, y = i * rowH + 4;
      const next = d[i + 1];
      if (next) {
        const nw = Math.max(4, (next.value / max) * plotW), nx = labelW + (plotW - nw) / 2;
        g.append(el('path', { d: `M${r(x)},${r(y + barH)}L${r(x + w)},${r(y + barH)}L${r(nx + nw)},${r(y + rowH)}L${r(nx)},${r(y + rowH)}Z`, style: 'fill: var(--accent-soft)' }));
        g.append(el('text', { x: r(labelW + plotW / 2), y: r(y + barH + 15), 'text-anchor': 'middle', class: 'lt-tick', style: 'font-weight: 600; fill: var(--text-secondary)' }, [`${formatNumber(next.value / s.value, { percent: true, decimals: 0 })} continue`]));
      }
      g.append(el('rect', { x: r(x), y: r(y), width: r(w), height: barH, rx: 4, class: 'lt-mark', style: `fill: ${i === 0 ? 'var(--chart-1)' : `color-mix(in oklab, var(--chart-1) ${100 - i * 9}%, var(--bg-surface-2))`}` }));
      g.append(el('text', { x: 0, y: r(y + 13), style: 'font-size: 12.5px; font-weight: 600; fill: var(--text-primary)' }, [s.label]));
      g.append(el('text', { x: 0, y: r(y + 28), class: 'lt-tick' }, [`${fmt(s.value)} · ${formatNumber(s.value / max, { percent: true, decimals: 0 })}`]));
      marks.push({ x: labelW + plotW / 2, y: y + barH / 2, hit: { x: 0, y, w: width, h: barH }, html: tipHtml(s.label, [{ label: 'Users', value: fmt(s.value) }, { label: 'Of first step', value: formatNumber(s.value / max, { percent: true, decimals: 1 }) }, ...(i ? [{ label: 'From previous', value: formatNumber(s.value / d[i - 1].value, { percent: true, decimals: 1 }) }] : [])]), text: `${s.label}: ${fmt(s.value)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Funnel of ${d.length} steps; ${formatNumber(d[d.length - 1].value / max, { percent: true, decimals: 1 })} of ${d[0].label.toLowerCase()} reach ${d[d.length - 1].label.toLowerCase()}.`, table: { head: ['Step', 'Users', 'Conversion'], rows: d.map((s) => [s.label, fmt(s.value), formatNumber(s.value / max, { percent: true, decimals: 1 })]) } };
  });
}

export function demo(host: HTMLElement) {
  return render(host, [{ label: 'Visited pricing', value: 48200 }, { label: 'Started trial', value: 9640 }, { label: 'Connected data', value: 5210 }, { label: 'Invited a teammate', value: 2890 }, { label: 'Became paying', value: 1340 }],
    { title: 'Trial to paid funnel', subtitle: 'November cohort', format: { compact: true }, source: 'Source: synthetic product analytics' });
}
