import { makeChart } from '../core/react';
import { render } from './range-bar-chart';

/** React wrapper: <RangeBarChart data={…} options={{ title: '…' }} />. */
export const RangeBarChart = makeChart(render, 'RangeBarChart');
