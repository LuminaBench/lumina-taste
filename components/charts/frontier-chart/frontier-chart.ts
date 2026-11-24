import { tradeoff, type TradeoffPoint, type TradeoffOptions } from '../core/quadrant';
import { LABS, SYSTEMS } from '../core/demo-data';
import '../core/charts.css';

export const render = (host: HTMLElement, data: TradeoffPoint[], opts: TradeoffOptions = {}) => tradeoff(host, data, { frontier: true, ...opts });

export function demo(host: HTMLElement) {
  return render(host, SYSTEMS.filter((s) => s.score != null).map((s) => ({ label: s.name, x: s.speed, y: s.score!, group: s.lab })), { title: 'Score against speed', subtitle: 'Dashed line joins the systems nothing else beats on both', xLabel: 'Output speed (tokens/s)', yLabel: 'Score', better: { x: 'high', y: 'high' }, format: { decimals: 0 }, groups: LABS });
}
