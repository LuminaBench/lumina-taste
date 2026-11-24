import { makeChart } from '../core/react';
import { render } from './bump-chart';

/** React wrapper: <BumpChart data={…} options={{ title: '…' }} />. */
export const BumpChart = makeChart(render, 'BumpChart');
