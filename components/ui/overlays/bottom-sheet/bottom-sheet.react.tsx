import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './bottom-sheet';
import '../../controls/button/button.css';
import './bottom-sheet.css';

/**
 * Action sheet (pass `actions`) or a sheet with your own content (pass `children`). With `detents`
 * (['medium', 'large']) the grabber becomes a button and the sheet rests at those heights; `onDetent` reports moves.
 */
export function BottomSheet({ open, title, actions = [], children, detents, onAction, onDetent, onClose, className }: { open: boolean; title: string; actions?: Array<{ label: string; icon: IconName; danger?: boolean }>; children?: ReactNode; detents?: Array<'medium' | 'large'>; onAction?: (label: string) => void; onDetent?: (detent: string) => void; onClose: () => void; className?: string }) {
  const id = useId();
  const root = useEnhance<HTMLDivElement, { action?: string; detent?: string }>(enhance, (d) => { if (d.action) onAction?.(d.action); if (d.detent) onDetent?.(d.detent); }, [detents?.join(' ')]);
  const sheet = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = sheet.current!;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <div ref={root} style={{ display: 'contents' }}>
      <dialog ref={sheet} className={cx('lt-sheet', className)} aria-labelledby={id} onClose={onClose} data-detents={detents?.join(' ')}>
        {detents?.length ? <button type="button" data-part="grab" aria-label="Make the sheet bigger" aria-expanded="false"><span /></button> : <div data-part="grab" aria-hidden="true"><span /></div>}
        <h2 id={id}>{title}</h2>
        {children}
        {actions.length > 0 && <ul data-part="actions">{actions.map((a) => <li key={a.label}><button type="button" data-tone={a.danger ? 'danger' : undefined}><Icon name={a.icon} size={20} /><span>{a.label}</span></button></li>)}</ul>}
        <button type="button" className="lt-btn" data-variant="secondary" data-part="cancel"><span data-part="label">Cancel</span></button>
      </dialog>
    </div>
  );
}
