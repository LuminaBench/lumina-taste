import { cx } from '../../_shared/react';
import './loaders.css';

/** Indeterminate loaders. Use a skeleton when the layout is known; use these for short waits. */
export function Spinner({ size, label = 'Loading', className }: { size?: 'sm'; label?: string; className?: string }) {
  return <span className={cx('lt-spinner', className)} data-size={size} role="status" aria-label={label} />;
}
export function LoadingDots({ label = 'Loading', className }: { label?: string; className?: string }) {
  return <span className={cx('lt-dots', className)} role="status" aria-label={label}><i /><i /><i /></span>;
}
export function BarLoader({ label = 'Loading', className }: { label?: string; className?: string }) {
  return <span className={cx('lt-bar-loader', className)} role="progressbar" aria-label={label} />;
}
