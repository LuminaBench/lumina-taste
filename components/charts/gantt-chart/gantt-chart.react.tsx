import { makeChart } from '../core/react';
import { render } from './gantt-chart';

/** React wrapper: <GanttChart data={…} options={{ title: '…' }} />. */
export const GanttChart = makeChart(render, 'GanttChart');
