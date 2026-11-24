import { makeChart } from '../core/react';
import { render } from './radar-chart';

/** React wrapper: <RadarChart data={…} options={{ title: '…' }} />. */
export const RadarChart = makeChart(render, 'RadarChart');
