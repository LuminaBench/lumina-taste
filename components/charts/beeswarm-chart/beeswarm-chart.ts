import { beeswarm, type BoxGroup } from '../core/more';
import type { ChartOptions } from '../core/frame';
import { rng } from '../core/scale';
import '../core/charts.css';

export const render = (host: HTMLElement, data: BoxGroup[], opts: ChartOptions = {}) => beeswarm(host, data, opts);

export function demo(host: HTMLElement) {
  const rand = rng(21);
  const g = (base: number, spread: number, n: number) => Array.from({ length: n }, () => Math.round((base + (rand() + rand() - 1) * spread) * 10) / 10);
  return render(host, [{ label: 'Free', values: g(3.2, 2.4, 70) }, { label: 'Team', values: g(6.1, 3, 60) }, { label: 'Scale', values: g(8.4, 2.6, 40) }], { title: 'Weekly active days per seat', format: { decimals: 1 } });
}
