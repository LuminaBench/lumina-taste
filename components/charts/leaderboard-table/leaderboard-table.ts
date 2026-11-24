import { leaderboard, type LeaderData, type LeaderOptions } from '../core/ranked';
import { LABS, SYSTEMS } from '../core/demo-data';
import '../core/charts.css';

export const render = (host: HTMLElement, data: LeaderData, opts: LeaderOptions = {}) => leaderboard(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, {
    columns: [{ name: 'Score', format: { decimals: 1 } }, { name: 'Speed', format: { suffix: ' t/s' } }, { name: 'Price', format: { prefix: '$', decimals: 2 }, better: 'low' }, { name: 'Context', format: { suffix: 'k' } }],
    rows: SYSTEMS.map((s) => ({ label: s.name, group: s.lab, values: [s.score, s.speed, s.price, s.context] })),
  }, { title: 'Leaderboard', subtitle: 'Ranked by score. Cells shade darker where the value is better.', groups: LABS });
}
