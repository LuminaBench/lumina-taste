import { makeChart } from '../core/react';
import { render } from './stacked-100-bar';

/** React wrapper: <Stacked100Bar data={…} options={{ title: '…' }} />. */
export const Stacked100Bar = makeChart(render, 'Stacked100Bar');
