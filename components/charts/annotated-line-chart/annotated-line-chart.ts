import { renderXY, type SeriesData, type XYOptions } from '../core/xy';
import { days, round, walk } from '../core/demo-data';
import '../core/charts.css';

/** Line chart with event notes: releases, incidents, campaigns. Pass `annotations` with x values. */
export const render = (host: HTMLElement, data: SeriesData, opts: XYOptions = {}) => renderXY(host, data, { kind: 'line', ...opts });

export function demo(host: HTMLElement) {
  const x = days(120);
  return render(host, { x, series: [{ name: 'Weekly active', values: round(walk(120, 3.1, 0.022, 0.16, 4), 2) }] }, {
    title: 'Weekly active teams', subtitle: 'Thousands', format: { suffix: 'k', decimals: 1 }, directLabels: false,
    annotations: [{ at: x[18], label: 'v4.0' }, { at: x[54], label: 'Pricing change' }, { at: x[61], label: 'Outage' }, { at: x[96], label: 'v4.2' }],
  });
}
