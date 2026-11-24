// SVG building blocks. Colours are set through `style` so CSS custom properties (theme tokens) resolve.
export const NS = 'http://www.w3.org/2000/svg';

/** Round coordinates so server and client output match and the DOM stays small. */
export const r = (v: number) => { const x = Math.round(v * 100) / 100; return x === 0 ? 0 : x; };

type Attrs = Record<string, string | number | undefined | null | false>;
export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, children: Array<SVGElement | string> = []): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null && v !== false) node.setAttribute(k, String(v));
  for (const c of children) node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}

export function linePath(pts: Array<[number, number]>) {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r(x)},${r(y)}`).join('');
}

/** Monotone cubic interpolation (Fritsch–Carlson): smooth without overshooting the data. */
export function smoothPath(pts: Array<[number, number]>) {
  const n = pts.length;
  if (n < 3) return linePath(pts);
  const dx: number[] = [], dy: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1]; m[i] = dy[i] / (dx[i] || 1); }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  t[n - 1] = m[n - 2];
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${r(pts[i][0] + h)},${r(pts[i][1] + h * t[i])},${r(pts[i + 1][0] - h)},${r(pts[i + 1][1] - h * t[i + 1])},${r(pts[i + 1][0])},${r(pts[i + 1][1])}`;
  }
  return d;
}

/** Closed area between an upper and a lower line. */
export function areaPath(upper: Array<[number, number]>, lower: Array<[number, number]>, smooth = false) {
  const top = smooth ? smoothPath(upper) : linePath(upper);
  const back = [...lower].reverse();
  const bottom = (smooth ? smoothPath(back) : linePath(back)).replace(/^M/, 'L');
  return `${top}${bottom}Z`;
}

export function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (rad: number, a: number) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  return `M${r(x0)},${r(y0)}A${r1},${r1} 0 ${large} 1 ${r(x1)},${r(y1)}L${r(x2)},${r(y2)}A${r0},${r0} 0 ${large} 0 ${r(x3)},${r(y3)}Z`;
}

/** Measure text width without layout (approximation good enough for label placement). */
let ctx: CanvasRenderingContext2D | null = null;
export function textWidth(text: string, font = '11px system-ui') {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 6.2;
  ctx.font = font;
  return ctx.measureText(text).width;
}

export interface Box { x: number; y: number; w: number; h: number }
export const overlaps = (a: Box, b: Box, pad = 2) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

/** Relax a set of label y positions so none are closer than `gap`, keeping them inside [min, max]. */
export function relax(ys: number[], gap: number, min: number, max: number) {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let k = 1; k < order.length; k++) {
      const d = order[k].y - order[k - 1].y;
      if (d < gap) { const push = (gap - d) / 2; order[k - 1].y -= push; order[k].y += push; moved = true; }
    }
    order.forEach((o) => (o.y = Math.min(max, Math.max(min, o.y))));
    if (!moved) break;
  }
  const out: number[] = [];
  order.forEach((o) => (out[o.i] = o.y));
  return out;
}
