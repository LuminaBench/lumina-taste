import { chart, type ChartOptions } from '../core/frame';
import { formatNumber } from '../core/format';
import { arcPath, el, r } from '../core/svg';
import '../core/charts.css';

export interface GaugeData { value: number; max: number; target?: number; label?: string }
export interface GaugeOptions extends ChartOptions { tone?: 'accent' | 'auto' }

/** 240° radial gauge for one value against a max and optional target. tone: 'auto' turns it red/amber/green. */
export function render(host: HTMLElement, data: GaugeData, opts: GaugeOptions = {}) {
  return chart(host, data, { height: 200, ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const rad = Math.min(height * 0.62, width / 2 - 8);
    const cx = width / 2, cy = height * 0.6;
    const a0 = -Math.PI * (2 / 3), a1 = Math.PI * (2 / 3);
    const t = Math.max(0, Math.min(1, d.value / d.max));
    const col = o.tone === 'auto' ? (t >= 0.8 ? 'var(--status-positive)' : t >= 0.5 ? 'var(--status-warning)' : 'var(--status-negative)') : 'var(--accent-solid)';
    svg.append(el('path', { d: arcPath(cx, cy, rad - 12, rad, a0, a1), style: 'fill: var(--bg-surface-3)' }));
    const arc = el('path', { d: arcPath(cx, cy, rad - 12, rad, a0, a0 + (a1 - a0) * t), class: 'lt-gauge-arc', style: `fill: ${col}` });
    svg.append(arc);
    if (d.target != null) {
      const at = a0 + (a1 - a0) * Math.min(1, d.target / d.max);
      svg.append(el('line', { x1: r(cx + Math.sin(at) * (rad - 18)), y1: r(cy - Math.cos(at) * (rad - 18)), x2: r(cx + Math.sin(at) * (rad + 6)), y2: r(cy - Math.cos(at) * (rad + 6)), style: 'stroke: var(--text-primary); stroke-width: 2; stroke-linecap: round' }));
      svg.append(el('text', { x: r(cx + Math.sin(at) * (rad + 18)), y: r(cy - Math.cos(at) * (rad + 18) + 4), 'text-anchor': at > 0 ? 'start' : 'end', class: 'lt-tick' }, [`Target ${fmt(d.target)}`]));
    }
    svg.append(el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', style: 'font-family: var(--font-display); font-size: 30px; font-weight: 650; letter-spacing: -0.02em; fill: var(--text-primary)' }, [fmt(d.value)]));
    svg.append(el('text', { x: cx, y: cy + 24, 'text-anchor': 'middle', class: 'lt-tick' }, [`${d.label ?? ''} · ${formatNumber(t, { percent: true })} of ${fmt(d.max)}`]));
    svg.append(el('text', { x: r(cx + Math.sin(a0) * (rad - 6)), y: r(cy - Math.cos(a0) * (rad - 6) + 18), 'text-anchor': 'middle', class: 'lt-tick' }, ['0']));
    svg.append(el('text', { x: r(cx + Math.sin(a1) * (rad - 6)), y: r(cy - Math.cos(a1) * (rad - 6) + 18), 'text-anchor': 'middle', class: 'lt-tick' }, [fmt(d.max)]));
    return { summary: `Gauge: ${d.label ?? 'value'} ${fmt(d.value)} of ${fmt(d.max)} (${formatNumber(t, { percent: true })})${d.target != null ? `, target ${fmt(d.target)}` : ''}.` };
  });
}

export function demo(host: HTMLElement) {
  return render(host, { value: 742, max: 1000, target: 850, label: 'Q4 quota' }, { title: 'Sales quota attainment', subtitle: 'Closed-won, £k', format: { prefix: '£', suffix: 'k' }, source: 'Source: synthetic CRM' });
}
