import { makeChart } from '../core/react';
import { render } from './small-multiples';

/** React wrapper: <SmallMultiples data={…} options={{ title: '…' }} />. */
export const SmallMultiples = makeChart(render, 'SmallMultiples');
