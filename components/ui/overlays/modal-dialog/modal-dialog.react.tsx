import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import '../../controls/button/button.css';
import './modal-dialog.css';

export interface ConfirmDialogProps { open: boolean; title: string; description: ReactNode; confirmLabel: string; cancelLabel?: string; danger?: boolean; onClose: (confirmed: boolean) => void; className?: string }

/** Controlled confirmation dialog on native <dialog>. */
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancel', danger, onClose, className }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) { d.returnValue = ''; d.showModal(); }
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={cx('lt-modal', className)} aria-labelledby={`${id}h`} aria-describedby={`${id}d`}
      onClose={() => onClose(ref.current?.returnValue === 'confirm')}
      onClick={(e) => { if (e.target === ref.current) ref.current.close('cancel'); }}>
      <form method="dialog">
        <div data-part="body">
          {danger && <span data-part="icon" aria-hidden="true"><Icon name="alert" size={20} /></span>}
          <div><h2 id={`${id}h`}>{title}</h2><p id={`${id}d`}>{description}</p></div>
        </div>
        <div data-part="foot">
          <button type="submit" className="lt-btn" data-variant="ghost" value="cancel" autoFocus><span data-part="label">{cancelLabel}</span></button>
          <button type="submit" className="lt-btn" data-variant="primary" data-tone={danger ? 'danger' : undefined} value="confirm"><span data-part="label">{confirmLabel}</span></button>
        </div>
      </form>
    </dialog>
  );
}
