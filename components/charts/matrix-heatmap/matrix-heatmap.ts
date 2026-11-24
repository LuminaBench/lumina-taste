import { chart, divColor, seqColor, tipHtml, type ChartOptions, type Mark } from '../core/frame';
import { el, r, textWidth } from '../core/svg';
import { readableOn } from '../core/contrast';
import '../core/charts.css';

export interface MatrixData { rows: string[]; cols: string[]; values: Array<Array<number | null>> }
export interface MatrixOptions extends ChartOptions { diverging?: boolean; /** Print values inside cells when they fit (default true). */ cellLabels?: boolean; rowLabel?: string; colLabel?: string }

/** Rows × columns heatmap (cohorts, hour × weekday, correlation). Sequential or diverging theme ramps. */
export function render(host: HTMLElement, data: MatrixData, opts: MatrixOptions = {}) {
  return chart(host, data, { height: () => data.rows.length * 30 + 30, ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const left = Math.max(...d.rows.map((x) => textWidth(x, '12px system-ui'))) + 12;
    const top = 22;
    const cw = (width - left) / d.cols.length, ch = (height - top) / d.rows.length;
    const flat = d.values.flat().filter((v): v is number => v != null);
    const max = Math.max(...flat.map(Math.abs)), min = Math.min(...flat);
    const g = el('g');
    const marks: Mark[] = [];
    d.cols.forEach((c, ci) => g.append(el('text', { x: r(left + ci * cw + cw / 2), y: 13, 'text-anchor': 'middle', class: 'lt-tick' }, [c])));
    d.rows.forEach((row, ri) => {
      g.append(el('text', { x: left - 10, y: r(top + ri * ch + ch / 2 + 4), 'text-anchor': 'end', style: 'fill: var(--text-primary); font-size: 12px' }, [row]));
      d.cols.forEach((c, ci) => {
        const v = d.values[ri][ci];
        const x = left + ci * cw, y = top + ri * ch;
        const t = v == null ? 0 : o.diverging ? v / (max || 1) : (v - min) / (max - min || 1);
        const fill = v == null ? 'transparent' : o.diverging ? divColor(t) : seqColor(t);
        g.append(el('rect', { x: r(x + 1), y: r(y + 1), width: r(cw - 2), height: r(ch - 2), rx: 3, class: 'lt-mark', style: `fill: ${fill}` }));
        if (v != null && (o.cellLabels ?? true) && cw > textWidth(fmt(v)) + 6) {
          // Measure the resolved cell colour and pick whichever text colour reads best on it.
          const ink = readableOn(fill, host);
          if (ink.ratio >= 4.5) g.append(el('text', { x: r(x + cw / 2), y: r(y + ch / 2 + 4), 'text-anchor': 'middle', style: `font-size: 11px; font-weight: 550; fill: ${ink.color}` }, [fmt(v)]));
        }
        if (v != null) marks.push({ x: x + cw / 2, y: y + ch / 2, hit: { x: x + 1, y: y + 1, w: cw - 2, h: ch - 2 }, html: tipHtml(`${row} · ${c}`, [{ color: fill, label: o.title ?? 'Value', value: fmt(v) }]), text: `${row}, ${c}: ${fmt(v)}` });
      });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Heatmap of ${d.rows.length} rows by ${d.cols.length} columns.`, table: { head: ['', ...d.cols], rows: d.rows.map((row, ri) => [row, ...d.values[ri].map((v) => (v == null ? '–' : fmt(v)))]) } };
  });
}

export function demo(host: HTMLElement) {
  const rows = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const cols = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'];
  const base = [100, 78, 69, 64, 61, 59];
  const values = rows.map((_, ri) => cols.map((_, ci) => (ci > rows.length - 1 - ri ? null : ci === 0 ? 100 : Math.round(base[ci] * (1 + ri * 0.012) * (1 - (ri % 2) * 0.02)))));
  return render(host, { rows, cols, values }, { title: 'Retention is improving with each cohort', subtitle: 'Share of signups still active, by month since signup', format: { suffix: '%' }, source: 'Source: synthetic cohorts' });
}
