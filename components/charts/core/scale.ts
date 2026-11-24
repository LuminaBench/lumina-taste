// Scales and ticks. Small, dependency-free equivalents of the d3 basics.
export interface Linear { (v: number): number; domain: [number, number]; range: [number, number]; ticks: (n?: number) => number[]; invert: (px: number) => number }

/** "Nice" tick step: 1, 2, 2.5 or 5 × 10^n. */
export function niceStep(span: number, count: number) {
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 2.25 ? 2.5 : norm >= 1.5 ? 2 : 1;
  return step * mag;
}

/** Extend [min, max] outward to round tick values; always includes zero for bar-like charts when asked. */
export function niceDomain(min: number, max: number, count = 5, includeZero = false): [number, number] {
  if (includeZero) { min = Math.min(0, min); max = Math.max(0, max); }
  if (min === max) { const d = Math.abs(min) || 1; min -= d / 2; max += d / 2; }
  const step = niceStep(max - min, count);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

export function linear(domain: [number, number], range: [number, number]): Linear {
  const [d0, d1] = domain, [r0, r1] = range;
  const k = (r1 - r0) / (d1 - d0 || 1);
  const f = ((v: number) => r0 + (v - d0) * k) as Linear;
  f.domain = domain;
  f.range = range;
  f.invert = (px) => d0 + (px - r0) / k;
  f.ticks = (n = 5) => {
    const step = niceStep(d1 - d0, n);
    const out: number[] = [];
    for (let v = Math.ceil(d0 / step) * step; v <= d1 + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return out;
  };
  return f;
}

export interface Band { (key: string): number; bandwidth: number; step: number; domain: string[] }
export function band(domain: string[], range: [number, number], paddingInner = 0.25, paddingOuter = 0.15): Band {
  const [r0, r1] = range;
  const n = domain.length;
  const step = (r1 - r0) / Math.max(1, n - paddingInner + paddingOuter * 2);
  const bw = step * (1 - paddingInner);
  const idx = new Map(domain.map((d, i) => [d, i]));
  const f = ((k: string) => r0 + step * paddingOuter + step * (idx.get(k) ?? 0)) as Band;
  f.bandwidth = bw;
  f.step = step;
  f.domain = domain;
  return f;
}

/** Point scale: evenly spaced positions for an index axis (line charts). */
export function points(n: number, range: [number, number]) {
  const [r0, r1] = range;
  const step = n > 1 ? (r1 - r0) / (n - 1) : 0;
  return (i: number) => (n > 1 ? r0 + i * step : (r0 + r1) / 2);
}

export const sqrtScale = (max: number, maxR: number) => (v: number) => Math.sqrt(Math.max(0, v) / (max || 1)) * maxR;

export const extent = (vals: number[]): [number, number] => {
  let lo = Infinity, hi = -Infinity;
  for (const v of vals) if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; }
  return lo === Infinity ? [0, 1] : [lo, hi];
};

/** Pick ≤ max evenly spaced indices to label an index axis without crowding (never rotate labels). */
export function tickIndices(n: number, max: number) {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil((n - 1) / (max - 1));
  const out: number[] = [];
  for (let i = 0; i < n; i += step) out.push(i);
  if (out[out.length - 1] !== n - 1 && n - 1 - out[out.length - 1] > step / 2) out.push(n - 1);
  else out[out.length - 1] = n - 1;
  return out;
}

/** Deterministic PRNG for demo data (mulberry32). */
export function rng(seed = 7) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
