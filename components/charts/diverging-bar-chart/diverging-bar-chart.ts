import { divergingBars, type BarItem, type BarOptions } from '../core/bars';
import '../core/charts.css';

export const render = (host: HTMLElement, data: BarItem[], opts?: BarOptions) => divergingBars(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, [
    { label: 'Checkout', value: 12.4 }, { label: 'Search', value: 8.1 }, { label: 'Onboarding', value: 3.6 },
    { label: 'Settings', value: -1.8 }, { label: 'Billing', value: -4.9 }, { label: 'Exports', value: -9.3 },
  ], { title: 'Checkout gained most, exports fell', subtitle: 'Change in weekly active use, percentage points', format: { sign: true, decimals: 1, suffix: ' pt' }, source: 'Source: synthetic product analytics' });
}
