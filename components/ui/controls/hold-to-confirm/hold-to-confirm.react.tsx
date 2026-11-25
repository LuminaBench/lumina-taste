import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './hold-to-confirm';
import './hold-to-confirm.css';

/** A destructive button that only fires after being held: <HoldToConfirm onConfirm={remove}>Hold to delete</HoldToConfirm>. */
export function HoldToConfirm({ children, doneLabel = 'Deleted', hint = 'Press and hold for a second. Release to cancel.', ms = 1100, icon, onConfirm, className }: { children: ReactNode; doneLabel?: string; hint?: string; ms?: number; icon?: ReactNode; onConfirm?: () => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { confirmed: boolean }>(enhance, (d) => { if (d.confirmed) onConfirm?.(); });
  return (
    <div ref={ref} className={cx('lt-hold', className)} data-ms={ms} data-done-label={doneLabel}>
      <button type="button"><span data-part="fill" aria-hidden />{icon}<span data-part="label">{children}</span></button>
      <p data-part="hint">{hint}</p>
      <span className="lt-visually-hidden" role="status" data-part="msg" />
    </div>
  );
}
