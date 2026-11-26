// The scroll-built chart story: the chart holds still while two to four steps scroll past it, and each step
// lights one moment and draws the line up to it. Still and complete under reduced motion and in print.
import { DEMO, DEMO_STEPS, renderSteps, type StoryOptions } from '../chart-story/chart-story';
import type { SeriesData } from '../core/xy';

export type { StoryMoment, StoryOptions, StoryInstance } from '../chart-story/chart-story';
export const render = (host: HTMLElement, data: SeriesData, opts: StoryOptions = { headline: '' }) => renderSteps(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, DEMO, {
    question: 'What happened to the Ardmore route this year?',
    headline: 'A bad spring, then our most punctual route',
    subtitle: 'Sailings that left within five minutes, by week',
    steps: DEMO_STEPS,
    format: { suffix: '%' },
    source: 'Departure log, December 2025 to November 2026',
  });
}
