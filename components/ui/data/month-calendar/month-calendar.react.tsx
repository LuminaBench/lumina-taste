import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './month-calendar';
import './month-calendar.css';

export interface CalEvent { day: number; title: string; color?: 'a' | 'b' | 'c' }

/** Month calendar with events per day; arrows move by day and week. */
export function MonthCalendar({ title, startWeekday, days, events, today, onSelect, className }: { title: string; startWeekday: number; days: number; events: CalEvent[]; today?: number; onSelect?: (day: number) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { day: number }>(enhance, (d) => onSelect?.(d.day));
  const cells: Array<number | null> = [...Array(startWeekday).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  return (
    <section ref={ref} className={cx('lt-month', className)} aria-label={title}>
      <header><h3>{title}</h3></header>
      <table role="grid" aria-label={title}><thead><tr>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <th key={d} scope="col">{d}</th>)}</tr></thead>
        <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((d, ci) => d === null ? <td key={ci} data-out="" /> : (
          <td key={ci} data-today={d === today ? '' : undefined} aria-current={d === today ? 'date' : undefined}>
            <button type="button" data-part="day">{d}</button>
            {events.some((e) => e.day === d) && <ul>{events.filter((e) => e.day === d).map((e) => <li key={e.title} data-c={e.color ?? 'a'}>{e.title}</li>)}</ul>}
          </td>))}</tr>)}</tbody>
      </table>
      <p data-part="sel" aria-live="polite" />
    </section>
  );
}
