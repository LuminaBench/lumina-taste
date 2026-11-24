import { cx } from '../../_shared/react';
import './delivery-tracker.css';

export interface TrackStep { label: string; when: string; done?: boolean; current?: boolean }

/** Order tracker: a promise in the heading, then steps on one progress line. */
export function DeliveryTracker({ title, sub, steps, action, className }: { title: string; sub?: string; steps: TrackStep[]; action?: { label: string; href: string }; className?: string }) {
  return (
    <section className={cx('lt-tracker', className)} aria-label={title}>
      <header><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>{action && <a className="lt-btn" data-variant="secondary" data-size="sm" href={action.href}>{action.label}</a>}</header>
      <ol>{steps.map((s) => <li key={s.label} data-done={s.done ? '' : undefined} aria-current={s.current ? 'step' : undefined}><span data-part="mark" aria-hidden /><strong>{s.label}</strong><span>{s.when}</span></li>)}</ol>
    </section>
  );
}
