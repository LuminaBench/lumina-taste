import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './stats-band';
import './stats-band.css';

/**
 * A row of 3–4 large figures with plain labels. Numbers people can check, not adjectives. Each figure counts up
 * to its value once when the band reaches the screen (`count: false` to keep one still, `from` to start higher).
 */
export function StatsBand({ title, stats, className }: { title: string; stats: Array<{ value: string; label: string; count?: boolean; from?: number }>; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [stats.map((s) => s.value).join('|')]);
  return (
    <section ref={ref} className={cx('lt-stats-band', className)} aria-label={title}>
      <h2 data-part="eyebrow">{title}</h2>
      <dl>{stats.map((s) => <div key={s.label}><dt>{s.label}</dt><dd data-count={s.count === false ? undefined : ''} data-count-from={s.from}>{s.value}</dd></div>)}</dl>
    </section>
  );
}
