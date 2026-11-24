import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './progress-ring.css';

export function ProgressRing({ value, label, center, size = 'md', tone, className }: { value: number; label: string; center?: ReactNode; size?: 'sm' | 'md'; tone?: 'positive'; className?: string }) {
  return (
    <div className={cx('lt-ring', className)} data-size={size === 'sm' ? 'sm' : undefined} data-tone={tone} style={{ '--value': value } as CSSProperties}
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <svg viewBox="0 0 48 48" aria-hidden="true"><circle data-part="track" cx="24" cy="24" r="21" pathLength={100} /><circle data-part="arc" cx="24" cy="24" r="21" pathLength={100} /></svg>
      <span data-part="label">{center ?? <><b>{Math.round(value)}</b>%</>}</span>
    </div>
  );
}
