import { slope, type SlopeData, type HighlightOptions } from '../core/more';
import '../core/charts.css';

export const render = (host: HTMLElement, data: SlopeData, opts: HighlightOptions = {}) => slope(host, data, opts);

export function demo(host: HTMLElement) {
  return render(host, { from: '2025', to: '2026', items: [
    { label: 'Lisbon', a: 71, b: 84 }, { label: 'Bristol', a: 78, b: 81 }, { label: 'Toronto', a: 74, b: 76 }, { label: 'Austin', a: 80, b: 73 },
    { label: 'Berlin', a: 69, b: 72 }, { label: 'Nairobi', a: 62, b: 75 },
  ] }, { title: 'Office satisfaction', subtitle: 'Score out of 100' });
}
