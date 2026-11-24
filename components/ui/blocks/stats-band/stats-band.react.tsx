import { cx } from '../../_shared/react';
import './stats-band.css';

/** A row of 3–4 large figures with plain labels. Numbers people can check, not adjectives. */
export function StatsBand({ title, stats, className }: { title: string; stats: Array<{ value: string; label: string }>; className?: string }) {
  return (
    <section className={cx('lt-stats-band', className)} aria-label={title}>
      <h2 data-part="eyebrow">{title}</h2>
      <dl>{stats.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
    </section>
  );
}
