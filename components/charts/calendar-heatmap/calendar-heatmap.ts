import { chart, seqColor, tipHtml, type ChartOptions, type Mark } from '../core/frame';
import { formatXFull, monthName } from '../core/format';
import { rng } from '../core/scale';
import { el, r } from '../core/svg';
import '../core/charts.css';

export interface CalendarDay { date: string; value: number }
export interface CalendarOptions extends ChartOptions { unit?: string }

/** Year of days as weeks × weekdays. Colour is a sequential ramp from the theme (surface → accent). */
export function render(host: HTMLElement, data: CalendarDay[], opts: CalendarOptions = {}) {
  return chart(host, data, { height: (w: number) => Math.round(Math.min(170, Math.max(11, Math.min(16, (w - 28) / 53)) * 7 + 44)), ...opts }, (ctx, all, o) => {
    const { svg, width, height, fmt } = ctx;
    // Never shrink cells below 11px (weekday labels need the room): show the most recent weeks that fit.
    const fitWeeks = Math.floor((width - 28) / 11);
    const d = all.slice(-Math.max(7, fitWeeks * 7 - 6));
    const first = new Date(`${d[0].date}T12:00:00`);
    const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const weeks = Math.ceil((d.length + ((first.getDay() + 6) % 7)) / 7);
    const left = 28, top = 18;
    const cell = Math.min(16, (width - left) / weeks);
    const gap = cell > 9 ? 2 : 1;
    const max = Math.max(...d.map((x) => x.value));
    const g = el('g');
    const marks: Mark[] = [];
    ['Mon', '', 'Wed', '', 'Fri', '', ''].forEach((l, i) => l && g.append(el('text', { x: 0, y: r(top + i * cell + cell - 3), class: 'lt-tick' }, [l])));
    let lastMonth = -1;
    let lastLabelX = -Infinity;
    d.forEach((day) => {
      const dt = new Date(`${day.date}T12:00:00`);
      const idx = Math.round((+dt - +start) / 864e5);
      const wk = Math.floor(idx / 7), wd = idx % 7;
      const x = left + wk * cell, y = top + wd * cell;
      if (dt.getMonth() !== lastMonth && wd === 0) { lastMonth = dt.getMonth(); if (x - lastLabelX > 30) { lastLabelX = x; g.append(el('text', { x: r(x), y: 10, class: 'lt-tick' }, [monthName(lastMonth)])); } }
      const t = max ? day.value / max : 0;
      g.append(el('rect', { x: r(x), y: r(y), width: r(cell - gap), height: r(cell - gap), rx: Math.min(3, cell / 4), class: 'lt-mark', style: `fill: ${day.value === 0 ? 'var(--bg-surface-3)' : seqColor(t)}` }));
      marks.push({ x: x + cell / 2, y: y + cell / 2, hit: { x, y, w: cell - gap, h: cell - gap }, html: tipHtml(formatXFull(day.date), [{ color: seqColor(t), label: o.unit ?? 'Value', value: fmt(day.value) }]), text: `${formatXFull(day.date)}: ${fmt(day.value)}` });
    });
    // Legend: less → more
    const lg = el('g', { transform: `translate(${width - 5 * 12 - 64}, ${height - 12})` });
    lg.append(el('text', { x: 0, y: 9, class: 'lt-tick' }, ['Less']));
    [0, 0.25, 0.5, 0.75, 1].forEach((t, i) => lg.append(el('rect', { x: 30 + i * 12, y: 0, width: 10, height: 10, rx: 2, style: `fill: ${t === 0 ? 'var(--bg-surface-3)' : seqColor(t)}` })));
    lg.append(el('text', { x: 30 + 5 * 12 + 4, y: 9, class: 'lt-tick' }, ['More']));
    svg.append(g, lg);
    ctx.interact({ mode: 'nearest', marks });
    const total = d.reduce((a, x) => a + x.value, 0);
    const best = d.reduce((a, x) => (x.value > a.value ? x : a), d[0]);
    return { summary: `Calendar heatmap of ${d.length} days, total ${fmt(total)}. Busiest day ${formatXFull(best.date)} with ${fmt(best.value)}.`, table: { head: ['Date', o.unit ?? 'Value'], rows: d.filter((x) => x.value > 0).map((x) => [x.date, fmt(x.value)]) } };
  });
}

export function demo(host: HTMLElement) {
  const rand = rng(5);
  const end = new Date('2026-11-24T12:00:00');
  const days: CalendarDay[] = Array.from({ length: 364 }, (_, i) => {
    const d = new Date(end); d.setDate(end.getDate() - 363 + i);
    const wd = (d.getDay() + 6) % 7;
    const v = rand() < (wd > 4 ? 0.55 : 0.12) ? 0 : Math.round(rand() * (wd > 4 ? 4 : 12) + (i / 364) * 6);
    return { date: d.toISOString().slice(0, 10), value: v };
  });
  return render(host, days, { title: 'Deploys per day', subtitle: 'Last 52 weeks', unit: 'Deploys', source: 'Source: synthetic CI history' });
}
