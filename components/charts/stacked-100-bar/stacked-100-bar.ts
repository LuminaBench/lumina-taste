import { stacked100, type ShareData } from '../core/more';
import type { ChartOptions } from '../core/frame';
import '../core/charts.css';

export const render = (host: HTMLElement, data: ShareData, opts: ChartOptions = {}) => stacked100(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, { categories: ['Engineering', 'Design', 'Sales', 'Support'], series: [
    { name: 'Daily', values: [62, 48, 21, 35] }, { name: 'Weekly', values: [28, 37, 44, 41] }, { name: 'Rarely', values: [10, 15, 35, 24] },
  ] }, { title: 'How often teams open the dashboard' });
}
