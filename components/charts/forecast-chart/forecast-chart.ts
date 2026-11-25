import { renderXY, type XYOptions } from '../core/xy';
import type { ChartInstance } from '../core/frame';
import { round, walk } from '../core/demo-data';
import '../core/charts.css';

export interface ForecastData { x: Array<string | number | Date>; name?: string; /** Measured values, then the central forecast. */ values: number[]; /** Index of the last measured point. */ from: number; lower: Array<number | null>; upper: Array<number | null> }

/**
 * A measured line that continues as a dashed forecast inside a shaded range. The range is the honest part:
 * it widens with distance, and the tooltip gives its bounds. Pass `target` in options for a goal line.
 */
export function render(host: HTMLElement, data: ForecastData, opts: XYOptions = {}): ChartInstance<ForecastData> {
  const shape = (d: ForecastData) => ({ x: d.x, series: [{ name: d.name ?? 'Value', values: d.values }] });
  const band = (d: ForecastData) => ({ lower: d.lower, upper: d.upper, label: 'Likely range' });
  let inst = renderXY(host, shape(data), { directLabels: false, ...opts, kind: 'line', forecastFrom: data.from, band: band(data) });
  return { ...inst, update: (d: ForecastData) => { inst.destroy(); inst = renderXY(host, shape(d), { directLabels: false, ...opts, kind: 'line', forecastFrom: d.from, band: band(d) }); } };
}

export function demo(host: HTMLElement) {
  // Twelve measured months to November 2026, then six ahead.
  const dates = Array.from({ length: 18 }, (_, i) => new Date(Date.UTC(2025, 11 + i, 15)));
  const x = dates.map((d) => d.toISOString().slice(0, 10));
  const actual = round(walk(12, 182, 5.2, 7, 9), 0);
  const last = actual[actual.length - 1];
  // A steady 4% a month, with a range that widens the further out it goes.
  const ahead = Array.from({ length: 6 }, (_, i) => Math.round(last * 1.04 ** (i + 1)));
  const values = [...actual, ...ahead];
  const lower = values.map((v, i) => (i < 11 ? null : i === 11 ? v : Math.round(v * (1 - 0.03 * (i - 11)))));
  const upper = values.map((v, i) => (i < 11 ? null : i === 11 ? v : Math.round(v * (1 + 0.036 * (i - 11)))));
  const cross = values.findIndex((v) => v >= 300);
  const when = cross > 11 ? dates[cross].toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' }) : 'next year';
  return render(host, { x, name: 'MRR', values, from: 11, lower, upper }, {
    title: `MRR should pass £300k in ${when}`, subtitle: 'Monthly recurring revenue, £k. Shaded: 80% of simulated outcomes', format: { prefix: '£', suffix: 'k' }, target: { value: 300, label: 'Goal' }, source: 'Source: billing ledger; forecast from the last 12 months',
  });
}
