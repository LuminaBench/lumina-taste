import { makeChart } from '../core/react';
import { render } from './waterfall-chart';

/** React wrapper: <WaterfallChart data={…} options={{ title: '…' }} />. */
export const WaterfallChart = makeChart(render, 'WaterfallChart');
