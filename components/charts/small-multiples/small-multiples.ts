import { smallMultiples, type MultiData } from '../core/more';
import type { ChartOptions } from '../core/frame';
import { months, round, walk } from '../core/demo-data';
import '../core/charts.css';

export const render = (host: HTMLElement, data: MultiData, opts: ChartOptions & { minPanel?: number } = {}) => smallMultiples(host, data, opts);

export function demo(host: HTMLElement) {
  const x = months(12);
  const names = ['Search', 'Direct', 'Referral', 'Social', 'Email', 'Partners'];
  return render(host, { x, series: names.map((name, i) => ({ name, values: round(walk(12, [40, 28, 18, 14, 10, 6][i], [1.2, 0.5, 0.9, -0.3, 0.2, 0.6][i], 6, 30 + i), 0) })) }, { title: 'Signups by channel', subtitle: 'Thousands per month, shared scale', format: { suffix: 'k' } });
}
