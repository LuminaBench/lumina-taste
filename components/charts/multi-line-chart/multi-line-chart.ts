import { renderXY, type SeriesData, type XYOptions } from '../core/xy';
import { months, round, walk } from '../core/demo-data';
import '../core/charts.css';

/** Multi-series comparison with direct end labels. Pass `highlight` to emphasise one series. */
export function render(host: HTMLElement, data: SeriesData, opts: XYOptions = {}) {
  return renderXY(host, data, { ...opts, kind: 'line' });
}

export function demo(host: HTMLElement) {
  const x = months(24);
  return render(host, {
    x,
    series: [
      { name: 'Team', values: round(walk(24, 40, 1.6, 5, 3), 1) },
      { name: 'Scale', values: round(walk(24, 22, 1.9, 4, 8), 1) },
      { name: 'Starter', values: round(walk(24, 30, 0.2, 4, 21), 1) },
      { name: 'Enterprise', values: round(walk(24, 12, 1.1, 3, 5), 1) },
    ],
  }, { title: 'Team plan pulled ahead in 2026', subtitle: 'Monthly recurring revenue by plan, £k', highlight: 'Team', format: { prefix: '£', suffix: 'k', decimals: 0 }, source: 'Source: synthetic billing data' });
}
