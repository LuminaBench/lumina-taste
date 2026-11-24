import { makeChart } from '../core/react';
import { render } from './histogram';

/** React wrapper: <Histogram data={…} options={{ title: '…' }} />. */
export const Histogram = makeChart(render, 'Histogram');
