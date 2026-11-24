import { makeChart } from '../core/react';
import { render } from './radial-bar-chart';

/** React wrapper: <RadialBarChart data={…} options={{ title: '…' }} />. */
export const RadialBarChart = makeChart(render, 'RadialBarChart');
