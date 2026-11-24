import { rangeBars, type RangeItem, type RangeOptions } from '../core/ranked';
import { LABS, SYSTEMS } from '../core/demo-data';
import '../core/charts.css';

export const render = (host: HTMLElement, data: RangeItem[], opts: RangeOptions = {}) => rangeBars(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, SYSTEMS.map((s) => ({ label: s.name, lo: s.p5, mid: s.p50, hi: s.p95, group: s.lab })), { title: 'Time to first token', subtitle: 'Seconds. Dot is the median, bar spans p5 to p95.', format: { decimals: 2, suffix: 's' }, loName: 'p5', midName: 'Median', hiName: 'p95', groups: LABS });
}
