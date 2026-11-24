import { rankedColumns, type RankedItem, type RankedOptions } from '../core/ranked';
import { LABS, SYSTEMS } from '../core/demo-data';
import '../core/charts.css';

export const render = (host: HTMLElement, data: RankedItem[], opts: RankedOptions = {}) => rankedColumns(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, SYSTEMS.map((s) => ({ label: s.name, value: s.score, group: s.lab })), { title: 'Reasoning index', subtitle: 'Composite of six evaluations, higher is better', format: { decimals: 1 }, groups: LABS, source: 'Synthetic results for fictional systems' });
}
