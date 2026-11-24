import { makeChart } from '../core/react';
import { render } from './radial-gauge';

/** React wrapper: <RadialGauge data={…} options={{ title: '…' }} />. */
export const RadialGauge = makeChart(render, 'RadialGauge');
