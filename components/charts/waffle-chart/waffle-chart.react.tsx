import { makeChart } from '../core/react';
import { render } from './waffle-chart';

/** React wrapper: <WaffleChart data={…} options={{ title: '…' }} />. */
export const WaffleChart = makeChart(render, 'WaffleChart');
