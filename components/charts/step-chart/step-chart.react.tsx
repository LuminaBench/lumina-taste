import { makeChart } from '../core/react';
import { render } from './step-chart';

/** React wrapper: <StepChart data={…} options={{ title: '…' }} />. */
export const StepChart = makeChart(render, 'StepChart');
