import { histogram, type HistogramOptions } from '../core/more';
import { rng } from '../core/scale';
import '../core/charts.css';

export const render = (host: HTMLElement, data: number[], opts: HistogramOptions = {}) => histogram(host, data, opts);

export function demo(host: HTMLElement) {
  const rand = rng(11);
  const vals = Array.from({ length: 600 }, () => { const u = rand() + rand() + rand(); return Math.round((80 + u * 90 + (rand() < 0.08 ? rand() * 260 : 0)) * 10) / 10; });
  return render(host, vals, { title: 'API response time', subtitle: 'Last 600 requests', format: { suffix: ' ms' }, marker: 'median' });
}
