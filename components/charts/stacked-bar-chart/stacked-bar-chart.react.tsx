import { makeChart } from '../core/react';
import { render } from './stacked-bar-chart';

/** React wrapper: <StackedBarChart data={…} options={{ title: '…' }} />. */
export const StackedBarChart = makeChart(render, 'StackedBarChart');
