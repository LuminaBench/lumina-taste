import { waterfall, type WaterfallItem } from '../core/more';
import type { ChartOptions } from '../core/frame';
import '../core/charts.css';

export const render = (host: HTMLElement, data: WaterfallItem[], opts: ChartOptions = {}) => waterfall(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, [
    { label: 'Start of year', value: 420 }, { label: 'New business', value: 186 }, { label: 'Expansion', value: 74 }, { label: 'Price change', value: 22 },
    { label: 'Contraction', value: -38 }, { label: 'Churn', value: -91 }, { label: 'End of year', value: 0, total: true },
  ], { title: 'Annual recurring revenue', subtitle: '£k', format: { prefix: '£', suffix: 'k' } });
}
