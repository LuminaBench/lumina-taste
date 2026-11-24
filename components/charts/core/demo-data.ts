// Deterministic demo datasets (seeded), so screenshots and tests are stable.
import { rng } from './scale';

export const days = (n: number, end = '2026-11-24') => {
  const e = new Date(`${end}T12:00:00`);
  return Array.from({ length: n }, (_, i) => { const d = new Date(e); d.setDate(e.getDate() - (n - 1 - i)); return d.toISOString().slice(0, 10); });
};
export const months = (n: number, end = '2026-11') => {
  const [y, m] = end.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => { const d = new Date(y, m - 1 - (n - 1 - i), 15, 12); return d.toISOString().slice(0, 10); });
};
export function walk(n: number, start: number, drift: number, vol: number, seed: number) {
  const rand = rng(seed);
  let v = start;
  return Array.from({ length: n }, () => (v = Math.max(0, v + drift + (rand() - 0.5) * vol)));
}
export const round = (vals: number[], d = 1) => vals.map((v) => +v.toFixed(d));
