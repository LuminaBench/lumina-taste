import { dumbbell, type DumbbellData, type HighlightOptions } from '../core/more';
import '../core/charts.css';

export const render = (host: HTMLElement, data: DumbbellData, opts: HighlightOptions & { sort?: "gap" | "b" | "none" } = {}) => dumbbell(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, { aName: 'Target', bName: 'Actual', items: [
    { label: 'Onboarding', a: 60, b: 74 }, { label: 'Activation', a: 45, b: 41 }, { label: 'Week-4 retention', a: 30, b: 38 },
    { label: 'Upgrade', a: 8, b: 11 }, { label: 'NPS reply rate', a: 25, b: 19 },
  ] }, { title: 'Funnel against target', subtitle: 'Percent of new accounts', format: { suffix: '%' } });
}
