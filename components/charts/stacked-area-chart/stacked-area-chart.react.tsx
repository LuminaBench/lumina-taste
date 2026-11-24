import { makeChart } from '../core/react';
import { render } from './stacked-area-chart';

/** React wrapper: <StackedAreaChart data={…} options={{ title: '…' }} />. */
export const StackedAreaChart = makeChart(render, 'StackedAreaChart');
