import { makeChart } from '../core/react';
import { render } from './ridgeline-chart';

/** React wrapper: <RidgelineChart data={…} options={{ title: '…' }} />. */
export const RidgelineChart = makeChart(render, 'RidgelineChart');
