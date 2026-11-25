import { chart, seqColor, tipHtml, type ChartInstance, type ChartOptions, type Mark } from '../core/frame';
import { el, r, textWidth } from '../core/svg';
import { readableOn } from '../core/contrast';
import '../core/charts.css';

export interface Cohort { label: string; size: number; /** Share still active in each period after joining, 0 to 100. Period 0 is 100. */ values: number[] }
export interface CohortOptions extends ChartOptions { /** Column prefix: "M" gives M0, M1… (default), "W" for weeks. */ period?: string; sizeLabel?: string }

/**
 * Retention cohorts: one row per joining group, one column per period since joining, shaded by the share
 * still active. The triangle is the data's own shape (newer cohorts have fewer periods), and the last row
 * averages each column so the typical curve is readable without doing sums across the grid.
 */
export function render(host: HTMLElement, data: Cohort[], opts: CohortOptions = {}): ChartInstance<Cohort[]> {
  const rowH = 30;
  return chart(host, data, { height: () => (data.length + 1) * rowH + 36, ...opts }, (ctx, d, o) => {
    const { svg, width, height } = ctx;
    const pct = (v: number) => `${Math.round(v)}%`;
    const periods = Math.max(...d.map((c) => c.values.length));
    const sizeW = Math.max(textWidth(o.sizeLabel ?? 'Users', '11px system-ui'), ...d.map((c) => textWidth(c.size.toLocaleString('en-GB'), '12px system-ui'))) + 16;
    const left = Math.max(...d.map((c) => textWidth(c.label, '12px system-ui')), textWidth('Average', '600 12px system-ui')) + 12;
    const x0 = left + sizeW, top = 22;
    const cw = (width - x0) / periods, ch = (height - top - 8) / (d.length + 1);
    const avg = Array.from({ length: periods }, (_, p) => { const have = d.filter((c) => c.values[p] != null); return have.length ? have.reduce((a, c) => a + c.values[p] * c.size, 0) / have.reduce((a, c) => a + c.size, 0) : null; });
    // Shade from the lowest value shown to 100, so the falloff is visible even when retention is high.
    const floor = Math.min(...d.flatMap((c) => c.values));
    const shade = (v: number) => seqColor(Math.max(0, (v - floor) / (100 - floor || 1)));
    const g = el('g');
    const marks: Mark[] = [];
    g.append(el('text', { x: r(x0 - 10), y: 13, 'text-anchor': 'end', class: 'lt-tick' }, [o.sizeLabel ?? 'Users']));
    const every = cw < 34 ? 2 : 1;
    for (let p = 0; p < periods; p += every) g.append(el('text', { x: r(x0 + p * cw + cw / 2), y: 13, 'text-anchor': 'middle', class: 'lt-tick' }, [`${o.period ?? 'M'}${p}`]));
    const cell = (v: number, ri: number, p: number, title: string, bold = false) => {
      const x = x0 + p * cw, y = top + ri * ch;
      const fill = shade(v);
      g.append(el('rect', { x: r(x + 1), y: r(y + 1), width: r(Math.max(1, cw - 2)), height: r(ch - 2), rx: 3, class: 'lt-mark', style: `fill: ${fill}` }));
      // Pick whichever ink reads best on the resolved cell colour; skip the label if neither reaches 4.5:1.
      const ink = readableOn(fill, host);
      if (cw > textWidth(pct(v), '11px system-ui') + 6 && ink.ratio >= 4.5) g.append(el('text', { x: r(x + cw / 2), y: r(y + ch / 2 + 4), 'text-anchor': 'middle', style: `fill: ${ink.color}; font-size: 11px; font-variant-numeric: tabular-nums${bold ? '; font-weight: 600' : ''}; pointer-events: none` }, [pct(v)]));
      marks.push({ x: x + cw / 2, y: y + 2, hit: { x, y, w: cw, h: ch }, html: tipHtml(title, [{ color: fill, label: `${o.period ?? 'M'}${p}`, value: pct(v) }]), text: `${title}, ${o.period ?? 'M'}${p}: ${pct(v)}` });
    };
    d.forEach((c, ri) => {
      const cy = top + ri * ch + ch / 2 + 4;
      g.append(el('text', { x: left - 12, y: r(cy), 'text-anchor': 'end', style: 'fill: var(--text-primary); font-size: 12px' }, [c.label]));
      g.append(el('text', { x: r(x0 - 10), y: r(cy), 'text-anchor': 'end', style: 'fill: var(--text-secondary); font-size: 12px; font-variant-numeric: tabular-nums' }, [c.size.toLocaleString('en-GB')]));
      c.values.forEach((v, p) => cell(v, ri, p, `${c.label} · ${c.size.toLocaleString('en-GB')} ${(o.sizeLabel ?? 'users').toLowerCase()}`));
    });
    const ay = top + d.length * ch;
    g.append(el('line', { x1: 0, x2: width, y1: r(ay + 0.5), y2: r(ay + 0.5), style: 'stroke: var(--border-strong)' }));
    g.append(el('text', { x: left - 12, y: r(ay + ch / 2 + 6), 'text-anchor': 'end', style: 'fill: var(--text-primary); font-size: 12px; font-weight: 600' }, ['Average']));
    avg.forEach((v, p) => { if (v != null) cell(v, d.length + 0.12, p, 'Average, weighted by cohort size', true); });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    const at = (p: number) => (avg[p] == null ? 'no data' : pct(avg[p]!));
    return { summary: `Retention for ${d.length} cohorts over ${periods} periods. On average ${at(1)} remain after one period and ${at(Math.min(periods - 1, 6))} after ${Math.min(periods - 1, 6)}.`, table: { head: ['Cohort', o.sizeLabel ?? 'Users', ...Array.from({ length: periods }, (_, p) => `${o.period ?? 'M'}${p}`)], rows: [...d.map((c) => [c.label, c.size, ...Array.from({ length: periods }, (_, p) => (c.values[p] == null ? '' : pct(c.values[p])))]), ['Average', '', ...avg.map((v) => (v == null ? '' : pct(v)))]] } };
  });
}

export function demo(host: HTMLElement) {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const sizes = [412, 388, 455, 501, 476, 530, 612, 587, 640, 702];
  // Newer cohorts keep more people in month one: onboarding changed in June.
  const data = labels.map((label, i) => {
    const first = i >= 5 ? 71 + (i - 5) * 1.6 : 62 + i * 0.8;
    const values = Array.from({ length: labels.length - i }, (_, p) => (p === 0 ? 100 : Math.round(first * 0.93 ** (p - 1) + ((i * 7 + p * 3) % 5) - 2)));
    return { label: `${label} 2026`, size: sizes[i], values };
  });
  return render(host, data, { title: 'Since June, eight more in every hundred stay past month one', subtitle: 'Share of each signup month still active, by months since joining', sizeLabel: 'Signups', source: 'Source: product events; active = one session in the month' });
}
