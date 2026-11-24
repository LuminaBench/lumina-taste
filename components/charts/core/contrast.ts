// Resolve any CSS colour (tokens, color-mix, oklch) to sRGB and pick readable text for it.
const cache = new Map<string, [number, number, number]>();
let probe: HTMLElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

export function resolveRGB(css: string, scope: Element): [number, number, number] {
  const key = `${css}|${(scope.closest('[data-palette]') as HTMLElement | null)?.dataset.palette}|${(scope.closest('[data-mode]') as HTMLElement | null)?.dataset.mode}`;
  const hit = cache.get(key);
  if (hit) return hit;
  probe ??= document.createElement('span');
  scope.appendChild(probe);
  probe.style.color = css;
  const computed = getComputedStyle(probe).color;
  probe.remove();
  ctx ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  if (!ctx) return [0, 0, 0];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  const out: [number, number, number] = [r, g, b];
  cache.set(key, out);
  return out;
}

const lum = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const contrastRatio = (a: [number, number, number], b: [number, number, number]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** Of the candidate text colours, return the one with the highest contrast on `fill`. */
export function readableOn(fill: string, scope: Element, candidates = ['var(--text-primary)', 'var(--bg-surface-1)']) {
  const bg = resolveRGB(fill, scope);
  let best = candidates[0], bestR = 0;
  for (const c of candidates) { const ratio = contrastRatio(resolveRGB(c, scope), bg); if (ratio > bestR) { bestR = ratio; best = c; } }
  return { color: best, ratio: bestR };
}
