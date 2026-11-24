import { useId, type CSSProperties } from 'react';
import { cx } from '../../_shared/react';
import './progress-bar.css';

/** Omit `value` for an indeterminate bar. */
export function ProgressBar({ label, value, showValue = true, className }: { label: string; value?: number; showValue?: boolean; className?: string }) {
  const id = useId();
  const indeterminate = value == null;
  return (
    <div className={cx('lt-progress', className)} data-indeterminate={indeterminate || undefined} style={{ '--value': value ?? 0 } as CSSProperties}>
      <div data-part="head"><span id={id}>{label}</span>{showValue && !indeterminate && <span data-part="value">{Math.round(value!)}%</span>}</div>
      <div data-part="track" role="progressbar" aria-labelledby={id} aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate ? undefined : Math.round(value!)}><span data-part="fill" /></div>
    </div>
  );
}
