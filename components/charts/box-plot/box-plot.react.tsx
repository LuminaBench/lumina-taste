import { makeChart } from '../core/react';
import { render } from './box-plot';

/** React wrapper: <BoxPlot data={…} options={{ title: '…' }} />. */
export const BoxPlot = makeChart(render, 'BoxPlot');
