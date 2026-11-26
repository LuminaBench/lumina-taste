// Chart story: the chart that answers one question. One series in focus, the rest muted, one moment lit with
// a sentence on the chart, and the answer set beside it as the headline. With `steps`, the chart builds as the
// reader scrolls through them (see chart-story-scroll), and is still and complete under reduced motion and print.
import { chart, gutter, tipHtml, xLabels, yGrid, type ChartInstance, type ChartOptions } from '../core/frame';
import { formatX, formatXFull } from '../core/format';
import { extent, linear, niceDomain, points, tickIndices } from '../core/scale';
import { el, linePath, overlaps, r, textWidth, type Box } from '../core/svg';
import type { SeriesData } from '../core/xy';
import '../core/charts.css';
import './chart-story.css';

/** One moment in the data: a point (`from`) or a stretch (`from` to `to`), with the sentence that explains it. */
export interface StoryMoment {
  from: string | number;
  to?: string | number;
  /** The point the note points at (default: the most extreme value in the stretch). */
  at?: string | number;
  /** The note on the chart: one short sentence, under about 60 characters. */
  label: string;
  /** Step mode: the step's heading and its one or two sentences beside the chart. */
  title?: string;
  text?: string;
}
export interface StoryOptions extends ChartOptions {
  /** The question the chart answers, in the reader's words. */
  question?: string;
  /** The answer, as a sentence. It is the chart's title. */
  headline: string;
  /** One figure set large next to the headline. */
  figure?: { value: string; label: string };
  /** The series the story is about (default: the first). The others are drawn as quiet context. */
  focus?: string;
  /** The one lit moment (static story). */
  moment?: StoryMoment;
  /** Two to four moments for the scroll-built story; each step lights one and reveals the data up to it. */
  steps?: StoryMoment[];
  /** Start the value axis at zero. */
  zero?: boolean;
  /** Heading level for the headline (default 3; step titles use the next level). */
  level?: 2 | 3 | 4;
}
export interface StoryInstance extends ChartInstance<SeriesData> { setStep: (i: number) => void; step: () => number }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
let seq = 0;

/** Wrap a sentence into lines no wider than `max` px. */
function wrap(text: string, max: number, font: string) {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    const next = line ? `${line} ${w}` : w;
    if (line && textWidth(next, font) > max) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function draw(host: HTMLElement, data: SeriesData, o: StoryOptions, state: { active: number; stepped: boolean }, uid: string): ChartInstance<SeriesData> {
  return chart(host, data, { export: false, ...o, title: undefined, subtitle: undefined, source: undefined }, (ctx, d) => {
    const { svg, width, height, fmt } = ctx;
    const n = d.x.length;
    const fi = Math.max(0, d.series.findIndex((s) => s.name === (o.focus ?? d.series[0]?.name)));
    const focus = d.series[fi];
    const idx = (v: string | number | undefined, fallback: number) => {
      if (v == null) return fallback;
      const i = typeof v === 'number' && !d.x.includes(v) ? v : d.x.findIndex((x) => String(x) === String(v));
      return i < 0 ? fallback : Math.min(n - 1, i);
    };
    const moments = (o.steps ?? (o.moment ? [o.moment] : [])).map((m) => {
      const a = idx(m.from, 0), b = idx(m.to, a);
      const lo = Math.min(a, b), hi = Math.max(a, b);
      let at = idx(m.at, -1);
      if (at < 0) {
        // The most extreme point of the stretch, measured against the series' median.
        const vals = focus.values.filter((v): v is number => v != null).sort((p, q) => p - q);
        const mid = vals[Math.floor(vals.length / 2)] ?? 0;
        at = lo;
        for (let i = lo; i <= hi; i++) if (Math.abs((focus.values[i] ?? mid) - mid) > Math.abs((focus.values[at] ?? mid) - mid)) at = i;
      }
      return { ...m, lo, hi, at };
    });
    const all = d.series.flatMap((s) => s.values.filter((v): v is number => v != null));
    const [lo, hi] = extent(all);
    const dom = niceDomain(lo, hi, 5, !!o.zero);
    const narrow = width < 520;
    const endLabel = narrow ? fmt(focus.values[n - 1] ?? 0) : `${focus.name} ${fmt(focus.values[n - 1] ?? 0)}`;
    const ctxW = narrow ? 0 : Math.max(0, ...d.series.filter((_, si) => si !== fi).map((s) => textWidth(s.name, '11px system-ui')));
    const m = { t: 30, r: Math.min(150, Math.max(textWidth(endLabel, '600 12px system-ui'), ctxW) + 18), b: 26, l: 0 };
    const y = linear(dom, [height - m.b, m.t]);
    m.l = gutter(y, fmt);
    const xs = points(n, [m.l + 4, width - m.r - 4]);
    yGrid(svg, y, m.l, width - m.r, fmt);
    xLabels(svg, tickIndices(n, Math.max(2, Math.floor((width - m.r - m.l) / 84))).map((i) => ({ x: xs(i), text: formatX(d.x[i], d.x) })), height - 6, width - m.r);
    const pts = (s: SeriesData['series'][number], from = 0, to = n - 1) => {
      const out: Array<[number, number]> = [];
      for (let i = from; i <= to; i++) { const v = s.values[i]; if (v != null) out.push([xs(i), y(v)]); }
      return out;
    };

    // Base: context series and the focus series, all quiet. In step mode it is revealed up to the active step.
    const clipId = `${uid}-reveal`;
    const revealAt = (i: number) => (i >= moments.length - 1 ? width : Math.min(width, xs(moments[i].hi) + 10));
    if (state.stepped) {
      const defs = el('defs');
      const clip = el('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
      const rect = el('rect', { x: 0, y: 0, height, width, 'data-part': 'reveal' });
      rect.style.width = `${revealAt(state.active)}px`;
      moments.forEach((_, i) => rect.setAttribute(`data-w${i}`, String(r(revealAt(i)))));
      clip.append(rect);
      defs.append(clip);
      svg.append(defs);
    }
    const base = el('g', { 'clip-path': state.stepped ? `url(#${clipId})` : undefined, class: 'lt-story-base' });
    d.series.forEach((s, si) => { if (si !== fi) base.append(el('path', { d: linePath(pts(s)), class: 'lt-line lt-mark', 'data-muted': '', style: 'stroke: color-mix(in oklab, var(--border-strong) 65%, var(--bg-surface-1)); stroke-width: 1.25' })); });
    base.append(el('path', { d: linePath(pts(focus)), class: 'lt-line lt-mark', style: 'stroke: color-mix(in oklab, var(--text-primary) 55%, var(--bg-surface-1)); stroke-width: 2' }));
    const ly = y(focus.values[n - 1] ?? 0);
    base.append(el('circle', { cx: r(xs(n - 1)), cy: r(ly), r: 3, style: 'fill: var(--text-secondary)' }));
    base.append(el('text', { x: r(width - m.r + 10), y: r(ly + 4), class: 'lt-label', style: 'fill: var(--text-primary)' }, [endLabel]));
    // The context series is named once, quietly, at its end too, so no legend is needed.
    d.series.forEach((s, si) => {
      if (si === fi) return;
      const v = s.values[n - 1];
      if (narrow || v == null || Math.abs(y(v) - ly) < 16) return;
      base.append(el('text', { x: r(width - m.r + 10), y: r(y(v) + 4), class: 'lt-label-muted' }, [s.name]));
    });
    svg.append(base);

    // Moments: a soft band, the stretch in the accent, a point and the sentence.
    const placed: Box[] = [];
    const font = '600 12px system-ui';
    // Every drawn line point, densified so a note never sits across a steep segment.
    const line: Array<[number, number]> = [];
    for (const s of d.series) {
      const p = pts(s);
      for (let k = 0; k < p.length; k++) { line.push(p[k]); if (k + 1 < p.length) for (let f = 1; f < 4; f++) line.push([p[k][0] + ((p[k + 1][0] - p[k][0]) * f) / 4, p[k][1] + ((p[k + 1][1] - p[k][1]) * f) / 4]); }
    }
    moments.forEach((mo, i) => {
      const g = el('g', { 'data-step': i, 'data-on': !state.stepped || i === state.active ? '' : undefined, class: 'lt-story-moment' });
      if (mo.hi > mo.lo) {
        const x0 = xs(mo.lo) - 6, x1 = xs(mo.hi) + 6;
        g.append(el('rect', { x: r(x0), y: m.t, width: r(x1 - x0), height: r(height - m.b - m.t), rx: 4, style: 'fill: color-mix(in oklab, var(--accent-solid) 9%, transparent)' }));
        g.append(el('path', { d: linePath(pts(focus, Math.max(0, mo.lo - 1), Math.min(n - 1, mo.hi + 1))), class: 'lt-line', style: 'stroke: var(--accent-solid); stroke-width: 3' }));
      }
      const px = xs(mo.at), py = y(focus.values[mo.at] ?? 0);
      // The note: wrapped, set where it covers neither the line nor another note: above the point, then to its
      // left or right, then below. The leader runs from the point to the nearest edge of the note.
      const maxW = Math.max(110, Math.min(220, (width - m.l - m.r) * 0.42));
      const lines = wrap(mo.label, maxW, font);
      const w = Math.max(...lines.map((l) => textWidth(l, font))), h = lines.length * 16;
      const cx = Math.min(Math.max(px - 14, m.l + 4), width - m.r - w);
      const cands: Array<Box & { side: string }> = [
        { side: 'above', x: cx, y: py - 22 - h, w, h },
        { side: 'left', x: px - 16 - w, y: py - h / 2, w, h },
        { side: 'right', x: px + 16, y: py - h / 2, w, h },
        { side: 'below', x: cx, y: py + 22, w, h },
        { side: 'above', x: cx, y: Math.max(2, py - 72 - h), w, h },
        { side: 'below', x: cx, y: Math.min(height - m.b - h - 4, py + 72), w, h },
      ];
      const inside = (b: Box) => b.x >= m.l + 2 && b.x + b.w <= width - m.r - 2 && b.y >= 2 && b.y + b.h <= height - m.b - 2;
      const hits = (b: Box) => line.some(([lx, lyy]) => lx >= b.x - 4 && lx <= b.x + b.w + 4 && lyy >= b.y - 6 && lyy <= b.y + b.h + 4);
      const pick = cands.find((b) => inside(b) && !hits(b) && !placed.some((p) => overlaps(p, b, 6))) ?? cands.find(inside) ?? cands[0];
      if (!state.stepped) placed.push(pick);
      const [ex, ey] = pick.side === 'left' ? [pick.x + w + 4, py] : pick.side === 'right' ? [pick.x - 4, py] : [Math.min(Math.max(px, pick.x), pick.x + w), pick.side === 'above' ? pick.y + h + 2 : pick.y - 12];
      g.append(el('line', { x1: r(px), x2: r(ex), y1: r(py), y2: r(ey), style: 'stroke: var(--text-primary); stroke-width: 1' }));
      g.append(el('circle', { cx: r(px), cy: r(py), r: 5, style: 'fill: var(--accent-solid); stroke: var(--bg-surface-1); stroke-width: 2' }));
      const t = el('text', { x: r(pick.x), y: r(pick.y + 12), class: 'lt-story-note' });
      lines.forEach((l, k) => t.append(el('tspan', { x: r(pick.x), dy: k ? 16 : 0 }, [l])));
      g.append(t);
      svg.append(g);
    });

    ctx.interact({
      mode: 'x', top: m.t, bottom: height - m.b, xs: d.x.map((_, i) => xs(i)),
      series: [{ color: 'var(--accent-solid)', ys: focus.values.map((v) => (v == null ? null : y(v))) }],
      html: (i) => tipHtml(formatXFull(d.x[i]), d.series.map((s, si) => ({ color: si === fi ? 'var(--accent-solid)' : 'var(--border-strong)', label: s.name, value: s.values[i] == null ? '–' : fmt(s.values[i]!) }))),
      text: (i) => `${formatXFull(d.x[i])}: ${d.series.map((s) => `${s.name} ${s.values[i] == null ? 'no data' : fmt(s.values[i]!)}`).join(', ')}`,
    });
    return {
      summary: `${o.headline}. Line chart of ${focus.name} over ${n} points${d.series.length > 1 ? `, with ${d.series.length - 1} more for context` : ''}. ${moments.map((mo) => `${formatXFull(d.x[mo.at])}: ${mo.label}`).join('. ')}.`,
      table: { head: ['', ...d.series.map((s) => s.name)], rows: d.x.map((x, i) => [formatX(x, d.x), ...d.series.map((s) => (s.values[i] == null ? '–' : fmt(s.values[i]!)))]) },
    };
  });
}

function words(o: StoryOptions) {
  const lv = o.level ?? 3;
  return `${o.question ? `<p data-part="question">${esc(o.question)}</p>` : ''}<h${lv} data-part="headline">${esc(o.headline)}</h${lv}>${o.figure ? `<p data-part="figure"><data>${esc(o.figure.value)}</data><span>${esc(o.figure.label)}</span></p>` : ''}`;
}

const col = (o: StoryOptions) => `${o.subtitle ? `<p data-part="subtitle">${esc(o.subtitle)}</p>` : ''}<div data-part="chart"></div>${o.source ? `<p data-part="source">${esc(o.source)}</p>` : ''}`;

/** The static story: the headline (and one figure) beside the chart, one moment lit on it. */
export function render(host: HTMLElement, data: SeriesData, opts: StoryOptions = { headline: '' }): StoryInstance {
  const uid = `lt-story-${++seq}`;
  host.innerHTML = `<figure class="lt-chartstory" data-variant="${opts.steps ? 'steps-static' : 'single'}"><div data-part="layout"><figcaption data-part="words">${words(opts)}</figcaption><div data-part="stage">${col(opts)}</div></div></figure>`;
  const root = host.firstElementChild as HTMLElement;
  const state = { active: (opts.steps?.length ?? 1) - 1, stepped: false };
  const inner = draw(root.querySelector('[data-part="chart"]')!, data, opts, state, uid);
  return { ...inner, root, setStep: () => {}, step: () => state.active, destroy: () => { inner.destroy(); host.replaceChildren(); } };
}

/**
 * The scroll-built story: the headline, then the chart held in place while the steps scroll past it. Each step
 * lights its moment and reveals the line up to it. Under reduced motion, in print, or without
 * IntersectionObserver, every moment is lit and the whole line shows, with the steps as a plain list.
 */
export function renderSteps(host: HTMLElement, data: SeriesData, opts: StoryOptions = { headline: '' }): StoryInstance {
  const steps = opts.steps ?? [];
  const uid = `lt-story-${++seq}`;
  const lv = opts.level ?? 3;
  host.innerHTML = `<section class="lt-chartstory" data-variant="steps"><div data-part="layout"><header data-part="words">${words(opts)}</header><div data-part="stage">${col(opts)}</div><ol data-part="steps">${steps.map((s, i) => `<li data-part="step" data-index="${i}"><div><h${lv + 1}>${esc(s.title ?? s.label)}</h${lv + 1}>${s.text ? `<p>${esc(s.text)}</p>` : ''}</div></li>`).join('')}</ol></div></section>`;
  const root = host.firstElementChild as HTMLElement;
  const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined';
  const state = { active: 0, stepped: !still() };
  root.toggleAttribute('data-static', !state.stepped);
  const chartHost = root.querySelector<HTMLElement>('[data-part="chart"]')!;
  let inner = draw(chartHost, data, opts, state, uid);
  const items = [...root.querySelectorAll<HTMLElement>('[data-part="step"]')];

  const setStep = (i: number) => {
    i = Math.max(0, Math.min(steps.length - 1, i));
    state.active = i;
    items.forEach((it, k) => it.toggleAttribute('data-active', k === i));
    const svg = inner.svg();
    svg.querySelectorAll<SVGGElement>('[data-step]').forEach((g) => g.toggleAttribute('data-on', !state.stepped || +g.dataset.step! === i));
    const rect = svg.querySelector<SVGRectElement>('[data-part="reveal"]');
    if (rect) rect.style.width = `${rect.getAttribute(`data-w${i}`)}px`;
    root.dataset.step = String(i);
  };
  setStep(0);

  // The step whose box crosses a line 60% down the screen is the current one.
  let io: IntersectionObserver | null = null;
  const watch = () => {
    io?.disconnect();
    io = null;
    if (!state.stepped) return;
    io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setStep(+(e.target as HTMLElement).dataset.index!);
    }, { rootMargin: '-60% 0px -39% 0px' });
    items.forEach((it) => io!.observe(it));
  };
  watch();
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const onMotion = () => {
    const stepped = !still();
    if (stepped === state.stepped) return;
    state.stepped = stepped;
    root.toggleAttribute('data-static', !stepped);
    inner.destroy();
    inner = draw(chartHost, data, opts, state, uid);
    setStep(state.active);
    watch();
  };
  mq?.addEventListener('change', onMotion);
  return {
    root,
    svg: () => inner.svg(),
    update: (d) => { data = d; inner.update(d); setStep(state.active); },
    exportSVG: () => inner.exportSVG(),
    exportPNG: () => inner.exportPNG(),
    setStep,
    step: () => state.active,
    destroy: () => { io?.disconnect(); mq?.removeEventListener('change', onMotion); inner.destroy(); host.replaceChildren(); },
  };
}

// ------------------------------------------------------------------ demo data: one ferry route's punctuality
export const DEMO_WEEKS = Array.from({ length: 52 }, (_, i) => { const d = new Date('2025-12-01T12:00:00'); d.setDate(d.getDate() + i * 7); return d.toISOString().slice(0, 10); });
const ardmore = [91, 92, 90, 93, 92, 91, 93, 92, 90, 92, 91, 89, 74, 66, 61, 63, 68, 72, 84, 87, 86, 88, 87, 85, 86, 88, 87, 86, 85, 87, 88, 86, 87, 89, 88, 87, 86, 88, 94, 95, 96, 95, 96, 97, 95, 96, 96, 97, 96, 95, 97, 96];
const others = [88, 89, 88, 90, 89, 88, 90, 89, 88, 89, 90, 88, 87, 88, 86, 87, 88, 87, 88, 89, 88, 87, 88, 89, 87, 88, 89, 88, 87, 88, 89, 88, 87, 88, 89, 88, 87, 89, 88, 89, 90, 89, 88, 89, 90, 89, 88, 90, 89, 90, 89, 90];
export const DEMO: SeriesData = { x: DEMO_WEEKS, series: [{ name: 'Ardmore route', values: ardmore }, { name: 'Other routes', values: others }] };
export const DEMO_STEPS: StoryMoment[] = [
  { from: DEMO_WEEKS[0], to: DEMO_WEEKS[11], label: 'Nine in ten left on time all winter', title: 'Most weeks, nine sailings in ten left on time', text: 'From December to February the Ardmore route ran like the others, between 89% and 93%.' },
  { from: DEMO_WEEKS[12], to: DEMO_WEEKS[17], label: 'Dry dock: a smaller boat for six weeks', title: 'Then the Juniper went into dry dock', text: 'A smaller boat covered the route for six weeks. Loading took longer and punctuality fell to 61%.' },
  { from: DEMO_WEEKS[38], to: DEMO_WEEKS[51], label: 'New timetable: 96% since September', title: 'The September timetable fixed it', text: 'Ten more minutes at Kestrel Isle between sailings. Since then the route has been the most punctual we run.' },
];

export function demo(host: HTMLElement) {
  return render(host, DEMO, {
    question: 'Has the Ardmore route recovered from the dry dock?',
    headline: 'Yes: since the September timetable it is our most punctual route',
    figure: { value: '96%', label: 'on time since September' },
    subtitle: 'Sailings that left within five minutes, by week',
    moment: { from: DEMO_WEEKS[38], to: DEMO_WEEKS[51], at: DEMO_WEEKS[43], label: 'New timetable from 8 September' },
    format: { suffix: '%' },
    source: 'Departure log, December 2025 to November 2026',
  });
}
