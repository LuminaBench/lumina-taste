import { horizontalBars, type BarItem, type BarOptions } from '../core/bars';
import '../core/charts.css';

/** Use instead of a column chart whenever labels are long. Sorted descending by default. */
export const render = (host: HTMLElement, data: BarItem[], opts?: BarOptions) => horizontalBars(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, [
    { label: 'Dashboards and reporting', value: 412 },
    { label: 'Scheduled CSV exports', value: 288 },
    { label: 'Slack alert integration', value: 251 },
    { label: 'Single sign-on (SAML)', value: 197 },
    { label: 'Row-level permissions', value: 164 },
    { label: 'Embedded analytics', value: 121 },
  ], { title: 'Most requested features', subtitle: 'Votes on the public roadmap, last 90 days', source: 'Source: synthetic roadmap votes' });
}
