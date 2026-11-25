import { makeChart } from '../core/react';
import { render } from './forecast-chart';

/** React wrapper: <ForecastChart data={…} options={{ title: '…' }} />. */
export const ForecastChart = makeChart(render, 'ForecastChart');
