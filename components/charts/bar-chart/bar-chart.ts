import { verticalBars, type BarItem, type BarOptions } from '../core/bars';
import '../core/charts.css';

export const render = (host: HTMLElement, data: BarItem[], opts?: BarOptions) => verticalBars(host, data, opts);

export function demo(host: HTMLElement) {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const v = [182, 204, 198, 231, 245, 238, 262, 251, 288, 301, 334];
  return render(host, m.map((label, i) => ({ label, value: v[i] })), { title: 'November set a new record', subtitle: 'New accounts per month, 2026', highlight: 'Nov', source: 'Source: synthetic signups' });
}
