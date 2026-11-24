import { bump, type BumpData, type HighlightOptions } from '../core/more';
import '../core/charts.css';

export const render = (host: HTMLElement, data: BumpData, opts: HighlightOptions = {}) => bump(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, { x: ['Q1', 'Q2', 'Q3', 'Q4', 'Q1', 'Q2'], series: [
    { name: 'Larkspur', ranks: [1, 1, 2, 2, 1, 1] }, { name: 'Halyard', ranks: [3, 2, 1, 1, 2, 3] }, { name: 'Kestrel', ranks: [2, 3, 3, 4, 4, 2] },
    { name: 'Juniper', ranks: [5, 5, 4, 3, 3, 4] }, { name: 'Moss', ranks: [4, 4, 5, 5, 5, 5] },
  ] }, { title: 'Leaderboard position by quarter', highlight: ['Larkspur', 'Halyard', 'Kestrel'] });
}
