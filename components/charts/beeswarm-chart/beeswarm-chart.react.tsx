import { makeChart } from '../core/react';
import { render } from './beeswarm-chart';

/** React wrapper: <BeeswarmChart data={…} options={{ title: '…' }} />. */
export const BeeswarmChart = makeChart(render, 'BeeswarmChart');
