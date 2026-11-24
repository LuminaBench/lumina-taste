import { makeChart } from '../core/react';
import { render } from './line-chart';

/** React wrapper: <LineChart data={…} options={{ title: '…' }} />. */
export const LineChart = makeChart(render, 'LineChart');
