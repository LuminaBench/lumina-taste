import { makeChart } from '../core/react';
import { render } from './chart-story-scroll';

/** React wrapper: <ChartStoryScroll data={…} options={{ headline: '…', steps: [{ from, to, label, title, text }] }} />. */
export const ChartStoryScroll = makeChart(render, 'ChartStoryScroll');
