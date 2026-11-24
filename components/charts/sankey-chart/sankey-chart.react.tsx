import { makeChart } from '../core/react';
import { render } from './sankey-chart';

/** React wrapper: <SankeyChart data={…} options={{ title: '…' }} />. */
export const SankeyChart = makeChart(render, 'SankeyChart');
