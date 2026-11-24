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

/** Fictional systems for benchmark-style demos. Groups are made-up labs; numbers are synthetic. */
export const LABS = ['Larkspur', 'Halyard', 'Kestrel', 'Juniper', 'Moss'];
export interface DemoSystem { name: string; lab: string; score: number | null; speed: number; price: number; p5: number; p50: number; p95: number; context: number }
export const SYSTEMS: DemoSystem[] = [
  { name: 'Atlas 3', lab: 'Larkspur', score: 71.2, speed: 142, price: 6.4, p5: 0.38, p50: 0.62, p95: 1.24, context: 400 },
  { name: 'Atlas 3 Mini', lab: 'Larkspur', score: 62.5, speed: 231, price: 1.1, p5: 0.22, p50: 0.34, p95: 0.71, context: 200 },
  { name: 'Keel Pro', lab: 'Halyard', score: 68.9, speed: 88, price: 9.8, p5: 0.52, p50: 0.81, p95: 1.65, context: 1000 },
  { name: 'Keel Flash', lab: 'Halyard', score: 57.4, speed: 264, price: 0.6, p5: 0.18, p50: 0.29, p95: 0.52, context: 1000 },
  { name: 'Talon 2', lab: 'Kestrel', score: 66.1, speed: 119, price: 4.2, p5: 0.41, p50: 0.7, p95: 1.38, context: 256 },
  { name: 'Talon 2 Lite', lab: 'Kestrel', score: 54.8, speed: 198, price: 0.9, p5: 0.25, p50: 0.4, p95: 0.88, context: 128 },
  { name: 'Cedar 70B', lab: 'Juniper', score: 59.3, speed: 76, price: 0.8, p5: 0.6, p50: 0.95, p95: 2.1, context: 128 },
  { name: 'Cedar 8B', lab: 'Juniper', score: 44.6, speed: 305, price: 0.1, p5: 0.12, p50: 0.2, p95: 0.41, context: 128 },
  { name: 'Lichen', lab: 'Moss', score: 63.7, speed: 101, price: 2.4, p5: 0.47, p50: 0.77, p95: 1.52, context: 200 },
  { name: 'Lichen Edge', lab: 'Moss', score: null, speed: 280, price: 0.3, p5: 0.15, p50: 0.26, p95: 0.6, context: 64 },
];
