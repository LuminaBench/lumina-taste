import { makeChart } from '../core/react';
import { render } from './area-chart';

/** React wrapper: <AreaChart data={…} options={{ title: '…' }} />. */
export const AreaChart = makeChart(render, 'AreaChart');
