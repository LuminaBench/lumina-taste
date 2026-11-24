import { gantt, type GanttTask } from '../core/extra';
import type { ChartOptions } from '../core/frame';
import '../core/charts.css';

export const render = (host: HTMLElement, data: GanttTask[], opts: ChartOptions & { today?: string } = {}) => gantt(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, [
    { label: 'Research', start: '2026-11-02', end: '2026-11-13', group: 'Design', done: 1 },
    { label: 'Wireframes', start: '2026-11-09', end: '2026-11-24', group: 'Design', done: 0.8 },
    { label: 'Data model', start: '2026-11-16', end: '2026-12-04', group: 'Build', done: 0.45 },
    { label: 'Charts engine', start: '2026-11-23', end: '2026-12-18', group: 'Build', done: 0.2 },
    { label: 'Beta', start: '2026-12-21', end: '2026-12-21', group: 'Launch', milestone: true },
    { label: 'Launch prep', start: '2026-12-07', end: '2026-12-31', group: 'Launch', done: 0 },
  ], { title: 'Q4 roadmap', subtitle: 'Bars fill as work completes', today: '2026-11-24' });
}
