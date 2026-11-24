import { makeChart } from '../core/react';
import { render } from './donut-chart';

/** React wrapper: <DonutChart data={…} options={{ title: '…' }} />. */
export const DonutChart = makeChart(render, 'DonutChart');
