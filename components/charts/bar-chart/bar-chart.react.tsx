import { makeChart } from '../core/react';
import { render } from './bar-chart';

/** React wrapper: <BarChart data={…} options={{ title: '…' }} />. */
export const BarChart = makeChart(render, 'BarChart');
