import { makeChart } from '../core/react';
import { render } from './diverging-bar-chart';

/** React wrapper: <DivergingBarChart data={…} options={{ title: '…' }} />. */
export const DivergingBarChart = makeChart(render, 'DivergingBarChart');
