import { cx } from '../../_shared/react';
import './status-dot.css';

/** Pair the dot with a visible text status: colour alone never carries meaning. */
export function StatusDot({ tone = 'neutral', live, className }: { tone?: 'positive' | 'warning' | 'negative' | 'info' | 'neutral'; live?: boolean; className?: string }) {
  return <span className={cx('lt-status-dot', className)} data-tone={tone} data-live={live || undefined} aria-hidden="true" />;
}
