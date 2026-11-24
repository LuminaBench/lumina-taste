import { radialBars, type RadialItem } from '../core/extra';
import type { ChartOptions } from '../core/frame';
import '../core/charts.css';

export const render = (host: HTMLElement, data: RadialItem[], opts: ChartOptions = {}) => radialBars(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, [{ label: 'Revenue target', value: 82 }, { label: 'New accounts', value: 64 }, { label: 'Retention goal', value: 91 }], { title: 'Quarter goals', subtitle: 'Percent of target reached', format: { suffix: '%' } });
}
