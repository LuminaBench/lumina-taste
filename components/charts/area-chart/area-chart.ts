import { renderXY, type SeriesData, type XYOptions } from '../core/xy';
import type { ChartInstance } from '../core/frame';
import { days, round, walk } from '../core/demo-data';
import type { LineChartData } from '../line-chart/line-chart';
import '../core/charts.css';

/** Smooth area chart for one series where the magnitude (area from zero) matters. */
const toSeries = (d: LineChartData): SeriesData => ({ x: d.x, series: [{ name: d.name ?? 'Value', values: d.values }] });

export function render(host: HTMLElement, data: LineChartData, opts: XYOptions = {}): ChartInstance<LineChartData> {
  const inst = renderXY(host, toSeries(data), { directLabels: false, smooth: true, ...opts, kind: 'area' });
  return { ...inst, update: (d: LineChartData) => inst.update(toSeries(d)) };
}

export function demo(host: HTMLElement) {
  return render(host, { x: days(60), values: round(walk(60, 14000, 180, 2600, 4), 0), name: 'Revenue' }, {
    title: 'Daily revenue', subtitle: 'Gross, last 60 days', format: { prefix: '£', compact: true }, source: 'Source: synthetic billing data',
  });
}
