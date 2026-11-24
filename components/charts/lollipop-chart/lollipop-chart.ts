import { horizontalBars, type BarItem, type BarOptions } from '../core/bars';
import '../core/charts.css';

export const render = (host: HTMLElement, data: BarItem[], opts?: BarOptions) => horizontalBars(host, data, { ...opts, lollipop: true });

export function demo(host: HTMLElement) {
  return render(host, [
    { label: 'Lisbon', value: 94.2 }, { label: 'Leeds', value: 92.8 }, { label: 'Toronto', value: 91.5 }, { label: 'Singapore', value: 90.9 },
    { label: 'Austin', value: 89.7 }, { label: 'Berlin', value: 88.4 }, { label: 'Nairobi', value: 87.1 },
  ], { title: 'Support satisfaction by office', subtitle: 'CSAT score, out of 100', format: { decimals: 1 }, highlight: 'Leeds', source: 'Source: synthetic survey' });
}
