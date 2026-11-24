import { makeChart } from '../core/react';
import { render } from './tradeoff-scatter';

/** React wrapper: <TradeoffScatter data={…} options={{ title: '…' }} />. */
export const TradeoffScatter = makeChart(render, 'TradeoffScatter');
