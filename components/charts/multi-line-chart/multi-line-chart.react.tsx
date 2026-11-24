import { makeChart } from '../core/react';
import { render } from './multi-line-chart';

/** React wrapper: <MultiLineChart data={…} options={{ title: '…' }} />. */
export const MultiLineChart = makeChart(render, 'MultiLineChart');
