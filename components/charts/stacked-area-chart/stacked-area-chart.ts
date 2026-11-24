import { renderXY, type SeriesData, type XYOptions } from '../core/xy';
import { months, round, walk } from '../core/demo-data';
import '../core/charts.css';

/** Stacked area: parts of a whole over time. Keep to 2–5 layers; put the most stable layer at the bottom. */
export function render(host: HTMLElement, data: SeriesData, opts: XYOptions = {}) {
  return renderXY(host, data, { ...opts, kind: 'stacked' });
}

export function demo(host: HTMLElement) {
  const x = months(18);
  return render(host, {
    x,
    series: [
      { name: 'Organic', values: round(walk(18, 120, 4, 14, 2), 0) },
      { name: 'Referral', values: round(walk(18, 60, 3, 10, 9), 0) },
      { name: 'Paid', values: round(walk(18, 40, 1, 12, 13), 0) },
    ],
  }, { title: 'Signups by channel', subtitle: 'Monthly, thousands', format: { suffix: 'k' }, smooth: true, source: 'Source: synthetic product analytics' });
}
