import { makeChart } from '../core/react';
import { render } from './slope-chart';

/** React wrapper: <SlopeChart data={…} options={{ title: '…' }} />. */
export const SlopeChart = makeChart(render, 'SlopeChart');
