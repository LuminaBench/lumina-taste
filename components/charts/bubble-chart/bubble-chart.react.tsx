import { makeChart } from '../core/react';
import { render } from './bubble-chart';

/** React wrapper: <BubbleChart data={…} options={{ title: '…' }} />. */
export const BubbleChart = makeChart(render, 'BubbleChart');
