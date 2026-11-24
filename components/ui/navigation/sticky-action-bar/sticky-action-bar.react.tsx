import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './sticky-action-bar.css';

/** Mobile bottom bar that keeps the one action and its price in reach. Respects the safe area. */
export function StickyActionBar({ label, price, note, children, className }: { label: string; price: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('lt-actionbar', className)} role="region" aria-label={label}>
      <p><strong>{price}</strong>{note && <span>{note}</span>}</p>
      {children}
    </div>
  );
}
