// Publication KPI stat card: label, big tabular number, semantic delta pill, embedded sparkline, comparison line.
import { formatNumber, type NumberFormat } from '../core/format';
import { sparkSvg } from '../sparkline/sparkline';
import '../core/charts.css';

export interface KpiData { label: string; value: number; previous?: number; spark?: number[]; comparison?: string }
export interface KpiOptions { format?: NumberFormat; /** Is "up" good news? Churn, latency and cost are not. */ upIsGood?: boolean; /** compact: a smaller figure and sparkline, no frame, for a row of eight to twelve. */ size?: 'default' | 'compact' }

const ARROW = { up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', flat: '<path d="M5 12h14"/>' };

export function render(host: HTMLElement, data: KpiData, opts: KpiOptions = {}) {
  let current = data;
  const draw = () => {
    const d = current;
    const delta = d.previous != null && d.previous !== 0 ? (d.value - d.previous) / Math.abs(d.previous) : null;
    const dir = delta == null || Math.abs(delta) < 0.0005 ? 'flat' : delta > 0 ? 'up' : 'down';
    const good = dir === 'flat' ? null : (dir === 'up') === (opts.upIsGood ?? true);
    const card = document.createElement('article');
    card.className = 'lt-kpi';
    if (opts.size === 'compact') card.dataset.size = 'compact';
    card.innerHTML = `<header><h3></h3>${delta != null ? `<span class="lt-kpi-delta" data-tone="${good == null ? 'neutral' : good ? 'positive' : 'negative'}"><svg class="lt-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ARROW[dir]}</svg><span></span></span>` : ''}</header>
      <data class="lt-kpi-value"></data><div class="lt-kpi-spark"></div><p class="lt-kpi-cmp"></p>`;
    card.querySelector('h3')!.textContent = d.label;
    const v = card.querySelector<HTMLDataElement>('.lt-kpi-value')!;
    v.value = String(d.value);
    v.textContent = formatNumber(d.value, opts.format);
    if (delta != null) {
      card.querySelector('.lt-kpi-delta span')!.textContent = formatNumber(delta, { percent: true, decimals: 1, sign: true });
      card.querySelector('.lt-kpi-delta')!.setAttribute('aria-label', `${dir === 'up' ? 'Up' : dir === 'down' ? 'Down' : 'Flat'} ${formatNumber(Math.abs(delta), { percent: true, decimals: 1 })}, ${good == null ? 'no change' : good ? 'good' : 'needs attention'}`);
    }
    if (d.spark?.length) card.querySelector('.lt-kpi-spark')!.append(sparkSvg(d.spark, { width: 220, height: opts.size === 'compact' ? 28 : 36, area: true, label: `${d.label} trend`, format: opts.format, color: good === false ? 'var(--status-negative)' : 'var(--chart-1)' }));
    card.querySelector('.lt-kpi-cmp')!.textContent = d.comparison ?? (d.previous != null ? `vs ${formatNumber(d.previous, opts.format)} previous period` : '');
    host.replaceChildren(card);
  };
  draw();
  return { root: host, update: (d: KpiData) => { current = d; draw(); }, destroy: () => host.replaceChildren(), svg: () => host.querySelector('svg') as SVGSVGElement, exportSVG: () => {}, exportPNG: async () => {} };
}

export function demo(host: HTMLElement) {
  host.innerHTML = '<div class="lt-kpi-grid"><div></div><div></div><div></div></div>';
  const [a, b, c] = [...host.querySelectorAll<HTMLElement>('.lt-kpi-grid > div')];
  const r1 = render(a, { label: 'Revenue', value: 24400, previous: 21700, spark: [15.2, 16.1, 15.8, 17.4, 18.2, 17.9, 19.6, 20.4, 21.7, 22.1, 23.5, 24.4] }, { format: { prefix: '£', compact: true } });
  const r2 = render(b, { label: 'Churn', value: 0.021, previous: 0.017, spark: [1.4, 1.5, 1.5, 1.6, 1.5, 1.7, 1.7, 1.8, 1.9, 2.0, 2.1, 2.1] }, { format: { percent: true, decimals: 1 }, upIsGood: false });
  const r3 = render(c, { label: 'Frame rate', value: 60.1, previous: 59.9, spark: [59.8, 60, 59.9, 60.1, 60, 59.9, 60.1, 60, 60.1, 59.9, 60, 60.1], comparison: 'Target 60 fps' }, { format: { suffix: ' fps', decimals: 1 } });
  return { destroy: () => { r1.destroy(); r2.destroy(); r3.destroy(); } };
}
