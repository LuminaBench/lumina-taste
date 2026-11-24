import { makeChart } from '../core/react';
import { render } from './scatter-plot';

/** React wrapper: <ScatterPlot data={…} options={{ title: '…' }} />. */
export const ScatterPlot = makeChart(render, 'ScatterPlot');
