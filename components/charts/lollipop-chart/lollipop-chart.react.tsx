import { makeChart } from '../core/react';
import { render } from './lollipop-chart';

/** React wrapper: <LollipopChart data={…} options={{ title: '…' }} />. */
export const LollipopChart = makeChart(render, 'LollipopChart');
