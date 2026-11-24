import { bullet, type BulletItem } from '../core/more';
import type { ChartOptions } from '../core/frame';
import '../core/charts.css';

export const render = (host: HTMLElement, data: BulletItem[], opts: ChartOptions = {}) => bullet(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, [
    { label: 'Revenue', note: '£k this quarter', value: 268, target: 250, bands: [150, 225, 300] },
    { label: 'New accounts', note: 'count', value: 1640, target: 1800, bands: [1000, 1500, 2000] },
    { label: 'Gross margin', note: '%', value: 71, target: 75, bands: [55, 68, 80] },
  ], { title: 'Quarter against plan', subtitle: 'Bar is actual, blue tick is target' });
}
