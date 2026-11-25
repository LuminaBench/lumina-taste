// Shared chart frame: <figure> chrome, responsive SVG, axes, crosshair + tooltip interaction,
// accessible data table and one-click SVG/PNG export. Every chart engine draws through this.
import { el, r, textWidth } from './svg';
import { formatNumber, type NumberFormat } from './format';
import type { Linear } from './scale';
import { exportPNG, exportSVG } from './export';

export interface ChartOptions {
  title?: string;
  subtitle?: string;
  source?: string;
  /** Plot height in px (default 260), or a function of width. */
  height?: number | ((width: number) => number);
  format?: NumberFormat;
  /** Show SVG/PNG export buttons in the header (default true). */
  export?: boolean;
  /** Override the accessible summary. */
  ariaLabel?: string;
}

export interface Mark { x: number; y: number; html: string; text: string; color?: string; hit?: { x: number; y: number; w: number; h: number } }
export type InteractSpec =
  | { mode: 'x'; xs: number[]; series: Array<{ color: string; ys: Array<number | null> }>; html: (i: number) => string; text: (i: number) => string; top?: number; bottom?: number }
  | { mode: 'nearest'; marks: Mark[]; radius?: number };

export interface DrawResult { summary: string; table?: { head: string[]; rows: Array<Array<string | number>> } }
export interface DrawContext {
  svg: SVGSVGElement;
  width: number;
  height: number;
  color: (i: number) => string;
  fmt: (v: number) => string;
  interact: (spec: InteractSpec) => void;
}
export interface ChartInstance<D> { root: HTMLElement; update: (data: D) => void; destroy: () => void; svg: () => SVGSVGElement; exportSVG: () => void; exportPNG: () => Promise<void> }

export const seriesColor = (i: number) => `var(--chart-${(i % 8) + 1})`;
/** Sequential ramp from the theme: surface → accent. t ∈ [0, 1]. */
export const seqColor = (t: number) => `color-mix(in oklab, var(--accent-solid) ${Math.round(12 + Math.max(0, Math.min(1, t)) * 88)}%, var(--bg-surface-2))`;
/** Diverging ramp from the theme: negative ← surface → positive. t ∈ [-1, 1]. */
export const divColor = (t: number) =>
  `color-mix(in oklab, var(${t < 0 ? '--status-negative' : '--status-positive'}) ${Math.round(Math.min(1, Math.abs(t)) * 90)}%, var(--bg-surface-2))`;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export { esc };

let seq = 0;

export function chart<D, O extends ChartOptions>(host: HTMLElement, data: D, opts: O, draw: (ctx: DrawContext, data: D, opts: O) => DrawResult): ChartInstance<D> {
  const id = `lt-chart-${++seq}`;
  // Previews can switch export off for every chart inside them with [data-no-export].
  if (host.closest('[data-no-export]')) opts = { ...opts, export: false };
  const fig = document.createElement('figure');
  fig.className = 'lt-chart';
  fig.innerHTML = `
    ${opts.title || opts.export !== false ? `<figcaption data-part="head"><div>${opts.title ? `<h3 data-part="title" id="${id}-t">${esc(opts.title)}</h3>` : ''}${opts.subtitle ? `<p data-part="subtitle">${esc(opts.subtitle)}</p>` : ''}</div>
    ${opts.export === false ? '' : `<div data-part="tools"><button type="button" data-export="svg" aria-label="Download ${esc(opts.title ?? 'chart')} as SVG">SVG</button><button type="button" data-export="png" aria-label="Download ${esc(opts.title ?? 'chart')} as PNG">PNG</button></div>`}</figcaption>` : ''}
    <div data-part="plot"></div>
    ${opts.source ? `<p data-part="source">${esc(opts.source)}</p>` : ''}
    <div data-part="live" class="lt-visually-hidden" aria-live="polite"></div>
    <div class="lt-visually-hidden"><table data-part="data"></table></div>`;
  host.replaceChildren(fig);
  const plot = fig.querySelector<HTMLElement>('[data-part="plot"]')!;
  const live = fig.querySelector<HTMLElement>('[data-part="live"]')!;
  const table = fig.querySelector<HTMLTableElement>('[data-part="data"]')!;
  const tip = document.createElement('div');
  tip.className = 'lt-chart-tooltip';
  tip.setAttribute('aria-hidden', 'true');
  document.body.append(tip);
  // Tooltips live on <body>; copy the theme root's attributes so tokens resolve the same way.
  const themeRoot = host.closest<HTMLElement>('[data-palette]');
  const syncTheme = () => { if (themeRoot) for (const a of ['data-palette', 'data-mode', 'data-type', 'data-density', 'data-radius']) { const v = themeRoot.getAttribute(a); if (v) tip.setAttribute(a, v); } };
  syncTheme();

  let svg = el('svg');
  let current = data;
  let width = 0;
  let cleanupInteract: (() => void) | null = null;
  const fmt = (v: number) => formatNumber(v, opts.format);

  const render = () => {
    width = Math.max(240, Math.round(plot.clientWidth || host.clientWidth || 600));
    const height = typeof opts.height === 'function' ? opts.height(width) : opts.height ?? Math.round(Math.min(320, Math.max(200, width * 0.48)));
    cleanupInteract?.();
    cleanupInteract = null;
    svg = el('svg', { width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', tabindex: 0, class: 'lt-chart-svg', 'aria-describedby': `${id}-t` });
    const ctx: DrawContext = {
      svg, width, height, color: seriesColor, fmt,
      interact: (spec) => { cleanupInteract = interact(svg, tip, live, spec, syncTheme); },
    };
    const result = draw(ctx, current, opts);
    svg.setAttribute('aria-label', opts.ariaLabel ?? `${opts.title ? opts.title + '. ' : ''}${result.summary}`);
    plot.replaceChildren(svg);
    if (result.table) {
      const { head, rows } = result.table;
      table.innerHTML = `<caption>${esc(opts.title ?? 'Chart data')}</caption><thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c, i) => (i === 0 ? `<th scope="row">${esc(String(c))}</th>` : `<td>${esc(String(c))}</td>`)).join('')}</tr>`).join('')}</tbody>`;
    }
  };
  let raf = 0;
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    const w = Math.round(plot.clientWidth);
    if (w === lastW) return;
    lastW = w;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  });
  ro.observe(plot);
  // Re-draw when the theme changes: canvas colours and measured label inks depend on it.
  const themeTarget = host.closest<HTMLElement>('[data-palette]') ?? document.documentElement;
  const mo = new MutationObserver(() => { syncTheme(); cancelAnimationFrame(raf); raf = requestAnimationFrame(render); });
  mo.observe(themeTarget, { attributes: true, attributeFilter: ['data-palette', 'data-mode'] });
  render();
  const onTool = (e: MouseEvent) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-export]');
    if (!b) return;
    const name = (opts.title ?? 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (b.dataset.export === 'svg') exportSVG(svg, name, opts);
    else void exportPNG(svg, name, opts);
  };
  fig.addEventListener('click', onTool);
  return {
    root: fig,
    svg: () => svg,
    update: (d) => { current = d; render(); },
    destroy: () => { ro.disconnect(); mo.disconnect(); cancelAnimationFrame(raf); cleanupInteract?.(); tip.remove(); fig.removeEventListener('click', onTool); fig.remove(); },
    exportSVG: () => exportSVG(svg, (opts.title ?? 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-'), opts),
    exportPNG: () => exportPNG(svg, (opts.title ?? 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-'), opts),
  };
}

// ---------------------------------------------------------------- axes
/** Tick formatter: drops trailing zero decimals on round ticks (60 fps, not 60.0 fps). */
export const tickFormat = (fmt: (v: number) => string, ticks: number[]) => {
  const allInt = ticks.every((t) => Number.isInteger(t));
  return (v: number) => (allInt ? fmt(v).replace(/(\d)\.0+(?=\D|$)/, '$1') : fmt(v));
};

/** Width of the y-axis label gutter for a scale. */
export function gutter(y: Linear, fmt: (v: number) => string, ticks = 5) {
  const ts = y.ticks(ticks);
  const f = tickFormat(fmt, ts);
  return Math.ceil(Math.max(...ts.map((t) => textWidth(f(t), '11px system-ui')))) + 10;
}

/** Dashed horizontal gridlines across the plot, labels in a gutter beside it (no vertical cage, no axis box). */
export function yGrid(svg: SVGSVGElement, y: Linear, x0: number, x1: number, fmt: (v: number) => string, ticks = 5, labelSide: 'left' | 'right' = 'left') {
  const g = el('g', { class: 'lt-grid' });
  const ts = y.ticks(ticks);
  const f = tickFormat(fmt, ts);
  for (const t of ts) {
    const py = r(y(t));
    g.append(el('line', { x1: x0, x2: x1, y1: py, y2: py, class: t === 0 ? 'lt-zero' : '' }));
    g.append(el('text', { x: labelSide === 'left' ? x0 - 8 : x1 + 8, y: py + 4, 'text-anchor': labelSide === 'left' ? 'end' : 'start', class: 'lt-tick' }, [f(t)]));
  }
  svg.append(g);
  return g;
}

/** Vertical value grid for horizontal bar charts. */
export function xGrid(svg: SVGSVGElement, x: Linear, y0: number, y1: number, fmt: (v: number) => string, ticks = 5) {
  const g = el('g', { class: 'lt-grid' });
  for (const t of x.ticks(ticks)) {
    const px = r(x(t));
    g.append(el('line', { x1: px, x2: px, y1: y0, y2: y1, class: t === 0 ? 'lt-zero' : 'lt-vgrid' }));
    // A label centred on the last gridline would be cut off by the edge of the plot: end-align it there instead.
    const edge = Math.max(x.range[0], x.range[1]) + 10, over = px + textWidth(fmt(t), '11px system-ui') / 2 > edge;
    g.append(el('text', { x: over ? r(edge) : px, y: y1 + 16, 'text-anchor': over ? 'end' : 'middle', class: 'lt-tick' }, [fmt(t)]));
  }
  svg.append(g);
}

/** Category / time labels along the bottom. Labels are never rotated: callers thin them with tickIndices(). */
export function xLabels(svg: SVGSVGElement, items: Array<{ x: number; text: string }>, y: number, width: number) {
  const g = el('g', { class: 'lt-xaxis' });
  items.forEach((it, i) => {
    const anchor = i === 0 && it.x < 30 ? 'start' : i === items.length - 1 && it.x > width - 30 ? 'end' : 'middle';
    g.append(el('text', { x: r(it.x), y, 'text-anchor': anchor, class: 'lt-tick' }, [it.text]));
  });
  svg.append(g);
}

// ---------------------------------------------------------------- interaction
function placeTip(tip: HTMLElement, cx: number, cy: number) {
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = cx + 14, y = cy - h - 12;
  if (x + w > innerWidth - 8) x = cx - w - 14;
  if (y < 8) y = cy + 16;
  tip.style.transform = `translate(${Math.round(Math.max(8, x))}px, ${Math.round(Math.min(innerHeight - h - 8, y))}px)`;
}

function interact(svg: SVGSVGElement, tip: HTMLElement, live: HTMLElement, spec: InteractSpec, syncTheme: () => void) {
  const layer = el('g', { class: 'lt-hover', 'pointer-events': 'none' });
  svg.append(layer);
  let active = -1;
  const pt = (e: PointerEvent) => { const b = svg.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] as const; };
  const hide = () => { layer.replaceChildren(); tip.removeAttribute('data-show'); active = -1; };
  const count = spec.mode === 'x' ? spec.xs.length : spec.marks.length;

  const show = (i: number, client?: [number, number]) => {
    if (i < 0 || i >= count) return;
    syncTheme();
    const b = svg.getBoundingClientRect();
    layer.replaceChildren();
    if (spec.mode === 'x') {
      const x = spec.xs[i];
      layer.append(el('line', { x1: r(x), x2: r(x), y1: spec.top ?? 0, y2: spec.bottom ?? svg.height.baseVal.value, class: 'lt-crosshair' }));
      spec.series.forEach((s) => { const y = s.ys[i]; if (y != null) layer.append(el('circle', { cx: r(x), cy: r(y), r: 4, class: 'lt-dot', style: `stroke: ${s.color}` })); });
      tip.innerHTML = spec.html(i);
      if (i !== active) live.textContent = spec.text(i);
      const ys = spec.series.map((s) => s.ys[i]).filter((v): v is number => v != null);
      placeTip(tip, client?.[0] ?? b.left + x, client?.[1] ?? b.top + (ys.length ? Math.min(...ys) : 0));
    } else {
      const m = spec.marks[i];
      if (m.hit) layer.append(el('rect', { x: r(m.hit.x - 1.5), y: r(m.hit.y - 1.5), width: r(m.hit.w + 3), height: r(m.hit.h + 3), rx: 3, class: 'lt-focus-ring' }));
      else layer.append(el('circle', { cx: r(m.x), cy: r(m.y), r: 7, class: 'lt-focus-ring' }));
      tip.innerHTML = m.html;
      if (i !== active) live.textContent = m.text;
      placeTip(tip, client?.[0] ?? b.left + m.x, client?.[1] ?? b.top + m.y);
    }
    tip.setAttribute('data-show', '');
    active = i;
  };

  const nearest = (x: number, y: number) => {
    if (spec.mode === 'x') {
      let best = 0, bd = Infinity;
      spec.xs.forEach((px, i) => { const d = Math.abs(px - x); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    let best = -1, bd = spec.radius ?? 36;
    spec.marks.forEach((m, i) => {
      if (m.hit && x >= m.hit.x && x <= m.hit.x + m.hit.w && y >= m.hit.y && y <= m.hit.y + m.hit.h) { best = i; bd = -1; }
      else if (bd >= 0) { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = i; } }
    });
    return best;
  };

  const onMove = (e: PointerEvent) => {
    const [x, y] = pt(e);
    const i = nearest(x, y);
    if (i < 0) return hide();
    show(i, [e.clientX, e.clientY]);
  };
  const onKey = (e: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key === 'Escape') return hide();
    if (e.key === 'Home') { e.preventDefault(); return show(0); }
    if (e.key === 'End') { e.preventDefault(); return show(count - 1); }
    if (!(e.key in keys)) return;
    e.preventDefault();
    show(active < 0 ? 0 : Math.max(0, Math.min(count - 1, active + keys[e.key])));
  };
  const onTouch = (e: PointerEvent) => { if (e.pointerType !== 'mouse') onMove(e); };
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerdown', onTouch);
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('keydown', onKey);
  svg.addEventListener('blur', hide);
  const onScroll = () => hide();
  addEventListener('scroll', onScroll, { passive: true, capture: true });
  return () => {
    svg.removeEventListener('pointermove', onMove);
    svg.removeEventListener('pointerdown', onTouch);
    svg.removeEventListener('pointerleave', hide);
    svg.removeEventListener('keydown', onKey);
    svg.removeEventListener('blur', hide);
    removeEventListener('scroll', onScroll, { capture: true });
    hide();
  };
}

/** Standard tooltip body: heading plus colour-keyed rows. */
export function tipHtml(title: string, rows: Array<{ color?: string; label: string; value: string }>) {
  return `<p class="lt-tt-title">${esc(title)}</p><dl>${rows.map((row) => `<div><dt>${row.color ? `<i style="background:${row.color}"></i>` : ''}${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`).join('')}</dl>`;
}
