import { horizontalBars, type BarItem, type BarOptions } from '../core/bars';
import '../core/charts.css';

export const render = (host: HTMLElement, data: BarItem[], opts?: BarOptions) => horizontalBars(host, data, { ...opts, lollipop: true });

export function demo(host: HTMLElement) {
  return render(host, [
    { label: 'Lisbon', value: 94.2 }, { label: 'Bristol', value: 92.8 }, { label: 'Toronto', value: 91.5 }, { label: 'Singapore', value: 88.1 },
    { label: 'Austin', value: 84.6 }, { label: 'Berlin', value: 80.3 }, { label: 'Nairobi', value: 71.9 },
  ], { title: 'Nairobi trails every other office on support', subtitle: 'CSAT score, out of 100', format: { decimals: 1 }, highlight: 'Nairobi', source: 'Source: synthetic survey' });
}
