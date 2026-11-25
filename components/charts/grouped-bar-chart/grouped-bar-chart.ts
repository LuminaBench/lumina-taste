import { groupedBars, type BarOptions, type GroupData } from '../core/bars';
import '../core/charts.css';

export const render = (host: HTMLElement, data: GroupData, opts?: BarOptions) => groupedBars(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, { categories: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: '2025', values: [42, 48, 51, 57] }, { name: '2026', values: [55, 61, 66, 74] }] },
    { title: 'Every quarter beat last year', subtitle: 'Net revenue, £m', format: { prefix: '£', suffix: 'm' }, highlight: '2026', source: 'Source: synthetic financials' });
}
