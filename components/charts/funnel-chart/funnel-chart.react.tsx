import { makeChart } from '../core/react';
import { render } from './funnel-chart';

/** React wrapper: <FunnelChart data={…} options={{ title: '…' }} />. */
export const FunnelChart = makeChart(render, 'FunnelChart');
