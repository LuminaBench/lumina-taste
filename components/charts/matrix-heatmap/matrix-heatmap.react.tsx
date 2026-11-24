import { makeChart } from '../core/react';
import { render } from './matrix-heatmap';

/** React wrapper: <MatrixHeatmap data={…} options={{ title: '…' }} />. */
export const MatrixHeatmap = makeChart(render, 'MatrixHeatmap');
