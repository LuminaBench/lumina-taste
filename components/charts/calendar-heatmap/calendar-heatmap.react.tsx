import { makeChart } from '../core/react';
import { render } from './calendar-heatmap';

/** React wrapper: <CalendarHeatmap data={…} options={{ title: '…' }} />. */
export const CalendarHeatmap = makeChart(render, 'CalendarHeatmap');
