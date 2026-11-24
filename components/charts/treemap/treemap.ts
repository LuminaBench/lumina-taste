import { treemap, type TreeItem } from '../core/extra';
import type { ChartOptions } from '../core/frame';
import '../core/charts.css';

export const render = (host: HTMLElement, data: TreeItem[], opts: ChartOptions & { groups?: string[] } = {}) => treemap(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, [
    { label: 'Payroll', value: 412, group: 'People' }, { label: 'Contractors', value: 96, group: 'People' }, { label: 'Recruiting', value: 38, group: 'People' },
    { label: 'Cloud', value: 184, group: 'Infra' }, { label: 'Data warehouse', value: 72, group: 'Infra' }, { label: 'Monitoring', value: 21, group: 'Infra' },
    { label: 'Ads', value: 120, group: 'Marketing' }, { label: 'Events', value: 44, group: 'Marketing' }, { label: 'Content', value: 30, group: 'Marketing' },
    { label: 'Office', value: 64, group: 'Other' }, { label: 'Legal', value: 28, group: 'Other' }, { label: 'Software', value: 51, group: 'Other' },
  ], { title: 'Where the money goes', subtitle: 'Spend this quarter, £k', format: { prefix: '£', suffix: 'k' }, groups: ['People', 'Infra', 'Marketing', 'Other'] });
}
