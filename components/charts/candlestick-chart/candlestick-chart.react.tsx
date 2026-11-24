import { makeChart } from '../core/react';
import { render } from './candlestick-chart';

/** React wrapper: <CandlestickChart data={…} options={{ title: '…' }} />. */
export const CandlestickChart = makeChart(render, 'CandlestickChart');
