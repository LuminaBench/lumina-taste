import { makeChart } from '../core/react';
import { render } from './horizontal-bar-chart';

/** React wrapper: <HorizontalBarChart data={…} options={{ title: '…' }} />. */
export const HorizontalBarChart = makeChart(render, 'HorizontalBarChart');
