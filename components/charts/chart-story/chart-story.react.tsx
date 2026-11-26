import { makeChart } from '../core/react';
import { render } from './chart-story';

/** React wrapper: <ChartStory data={…} options={{ headline: '…', moment: { from, to, label } }} />. */
export const ChartStory = makeChart(render, 'ChartStory');
