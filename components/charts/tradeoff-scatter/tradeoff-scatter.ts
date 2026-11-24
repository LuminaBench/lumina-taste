import { tradeoff, type TradeoffPoint, type TradeoffOptions } from '../core/quadrant';
import { LABS, SYSTEMS } from '../core/demo-data';
import '../core/charts.css';

export const render = (host: HTMLElement, data: TradeoffPoint[], opts: TradeoffOptions = {}) => tradeoff(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, SYSTEMS.filter((s) => s.score != null).map((s) => ({ label: s.name, x: s.price, y: s.score!, group: s.lab })), { title: 'Score against price', subtitle: 'Top left is better: higher score for less', xLabel: 'Price per million', yLabel: 'Score', xFormat: { prefix: '$', decimals: 1 }, format: { decimals: 0 }, quadrant: true, quadrantLabel: 'Most attractive', logX: true, groups: LABS });
}
