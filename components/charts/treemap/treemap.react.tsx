import { makeChart } from '../core/react';
import { render } from './treemap';

/** React wrapper: <Treemap data={…} options={{ title: '…' }} />. */
export const Treemap = makeChart(render, 'Treemap');
