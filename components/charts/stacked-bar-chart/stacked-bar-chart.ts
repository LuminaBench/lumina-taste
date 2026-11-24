import { stackedBars, type BarOptions, type GroupData } from '../core/bars';
import '../core/charts.css';

export const render = (host: HTMLElement, data: GroupData, opts?: BarOptions) => stackedBars(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    series: [{ name: 'Web', values: [820, 910, 880, 940, 1020, 610, 540] }, { name: 'iOS', values: [410, 450, 470, 460, 520, 690, 720] }, { name: 'Android', values: [300, 320, 310, 350, 380, 520, 560] }],
  }, { title: 'Weekends shift to mobile', subtitle: 'Sessions by platform, average week', format: { compact: true }, source: 'Source: synthetic analytics' });
}
