import { makeChart } from '../core/react';
import { render } from './frontier-chart';

/** React wrapper: <FrontierChart data={…} options={{ title: '…' }} />. */
export const FrontierChart = makeChart(render, 'FrontierChart');
