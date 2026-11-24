import { cx } from '../../_shared/react';
import './uptime-bars.css';

export type DayStatus = 'ok' | 'warn' | 'down';
export interface Service { name: string; uptime: string; days: DayStatus[] }

/** Status-page uptime bars: one bar per day per service, colour plus hidden text for each day. */
export function UptimeBars({ title = 'System status', summary = 'All systems operational', services, className }: { title?: string; summary?: string; services: Service[]; className?: string }) {
  const word = { ok: 'operational', warn: 'degraded', down: 'outage' } as const;
  return (
    <section className={cx('lt-uptime', className)} aria-label={title}>
      <header><h3>{title}</h3><p data-part="now"><span className="lt-status-dot" data-tone="positive" />{summary}</p></header>
      {services.map((s) => (
        <div key={s.name} data-part="svc"><p><strong>{s.name}</strong><span>{s.uptime} uptime</span></p>
          <ol aria-label={`${s.name}, last ${s.days.length} days`}>{s.days.map((d, i) => <li key={i} data-s={d}><span className="lt-visually-hidden">Day {i + 1}: {word[d]}</span></li>)}</ol>
        </div>
      ))}
      <footer><span>{services[0]?.days.length ?? 90} days ago</span><span>Today</span></footer>
    </section>
  );
}
