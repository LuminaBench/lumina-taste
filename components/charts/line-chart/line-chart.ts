import { renderXY, type SeriesData, type XYOptions } from '../core/xy';
import type { ChartInstance } from '../core/frame';
import { days, round, walk } from '../core/demo-data';
import '../core/charts.css';

export type LineChartData = { x: SeriesData['x']; values: Array<number | null>; name?: string };

/** Single-series line chart. For several series use multi-line-chart. */
const toSeries = (d: LineChartData, opts: XYOptions): SeriesData => ({ x: d.x, series: [{ name: d.name ?? opts.title ?? 'Value', values: d.values }] });

export function render(host: HTMLElement, data: LineChartData, opts: XYOptions = {}): ChartInstance<LineChartData> {
  const inst = renderXY(host, toSeries(data, opts), { directLabels: false, ...opts, kind: 'line' });
  return { ...inst, update: (d: LineChartData) => inst.update(toSeries(d, opts)) };
}

export function demo(host: HTMLElement) {
  return render(host, { x: days(90), values: round(walk(90, 58, 0.05, 2.4, 11), 1), name: 'Frame rate' }, {
    title: 'Frame rate held above 55 fps all quarter', subtitle: 'Median frames per second, daily', format: { suffix: ' fps', decimals: 1 }, source: 'Source: synthetic telemetry',
  });
}
