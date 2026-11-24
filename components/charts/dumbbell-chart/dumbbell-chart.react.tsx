import { makeChart } from '../core/react';
import { render } from './dumbbell-chart';

/** React wrapper: <DumbbellChart data={…} options={{ title: '…' }} />. */
export const DumbbellChart = makeChart(render, 'DumbbellChart');
