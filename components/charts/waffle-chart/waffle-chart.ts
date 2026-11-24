import { waffle, type WaffleData } from '../core/extra';
import type { ChartOptions } from '../core/frame';
import '../core/charts.css';

export const render = (host: HTMLElement, data: WaffleData, opts: ChartOptions = {}) => waffle(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, { label: 'of teams open a dashboard every day', value: 68 }, { title: 'Daily habit', subtitle: 'Share of active teams, November' });
}
