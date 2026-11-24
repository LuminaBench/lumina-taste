import { makeChart } from '../core/react';
import { render } from './grouped-bar-chart';

/** React wrapper: <GroupedBarChart data={…} options={{ title: '…' }} />. */
export const GroupedBarChart = makeChart(render, 'GroupedBarChart');
