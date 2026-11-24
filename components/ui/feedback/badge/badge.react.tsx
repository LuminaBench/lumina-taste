import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './badge.css';

/** Badge rule: one per heading, at most two accent/status badges in view at once. */
export function Badge({ tone, variant, dot, children, className, label }: { tone?: 'accent' | 'positive' | 'warning' | 'negative' | 'info'; variant?: 'outline' | 'count'; dot?: boolean; children: ReactNode; className?: string; label?: string }) {
  return <span className={cx('lt-badge', className)} data-tone={tone} data-variant={variant} data-dot={dot || undefined} aria-label={label}>{children}</span>;
}
