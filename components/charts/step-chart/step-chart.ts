import { renderXY, type SeriesData, type XYOptions } from '../core/xy';
import { months } from '../core/demo-data';
import '../core/charts.css';

/**
 * Step chart: the value holds until it changes, then jumps. For things that are set, not measured
 * continuously: prices, seat counts, plan limits, interest rates, inventory, on and off.
 */
export const render = (host: HTMLElement, data: SeriesData, opts: XYOptions = {}) => renderXY(host, data, { kind: 'line', zero: true, ...opts, step: true, smooth: false });

export function demo(host: HTMLElement) {
  return render(host, { x: months(18), series: [
    { name: 'Seats in use', values: [14, 14, 15, 15, 18, 18, 18, 21, 21, 24, 24, 24, 27, 31, 31, 34, 38, 38] },
    { name: 'Seats paid for', values: [20, 20, 20, 20, 20, 20, 20, 30, 30, 30, 30, 30, 30, 40, 40, 40, 40, 40] },
  ] }, { title: 'Seats bought ahead of need, three times', subtitle: 'Seats, by month', highlight: 'Seats in use', source: 'Source: workspace billing' });
}
