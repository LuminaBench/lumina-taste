import { makeChart } from '../core/react';
import { render } from './ranked-columns';

/** React wrapper: <RankedColumns data={…} options={{ title: '…' }} />. */
export const RankedColumns = makeChart(render, 'RankedColumns');
