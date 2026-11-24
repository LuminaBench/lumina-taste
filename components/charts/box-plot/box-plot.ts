import { boxPlot, type BoxGroup } from '../core/more';
import type { ChartOptions } from '../core/frame';
import { rng } from '../core/scale';
import '../core/charts.css';

export const render = (host: HTMLElement, data: BoxGroup[], opts: ChartOptions = {}) => boxPlot(host, data, opts);

export function demo(host: HTMLElement) {
  const rand = rng(5);
  const g = (base: number, spread: number) => Array.from({ length: 80 }, () => Math.round(base + (rand() + rand() - 1) * spread + (rand() < 0.04 ? spread * 2.5 : 0)));
  return render(host, [{ label: 'Europe', values: g(120, 40) }, { label: 'US East', values: g(95, 30) }, { label: 'US West', values: g(140, 55) }, { label: 'Asia Pacific', values: g(210, 70) }], { title: 'Page load by region', format: { suffix: ' ms' } });
}
