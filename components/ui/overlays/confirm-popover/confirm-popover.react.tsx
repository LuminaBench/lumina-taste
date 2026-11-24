import { useState, type ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './confirm-popover.css';

/** Inline confirm next to a destructive button. Cancel is focused first. */
export function ConfirmPopover({ label, question, detail, confirmLabel, onConfirm, className }: { label: string; question: string; detail?: ReactNode; confirmLabel: string; onConfirm: () => void; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cx('lt-confirm-demo', className)} style={{ minHeight: 0, gridTemplateColumns: 'auto' }}>
      <div data-part="anchor-wrap">
        <button type="button" className="lt-btn" data-variant="destructive" data-size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>{label}</button>
        {open && (
          <div data-part="panel" role="dialog" aria-label={question} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
            <p><strong>{question}</strong> {detail}</p>
            <div data-part="actions"><button type="button" className="lt-btn" data-variant="ghost" data-size="sm" autoFocus onClick={() => setOpen(false)}>Cancel</button><button type="button" className="lt-btn" data-variant="primary" data-tone="danger" data-size="sm" onClick={() => { setOpen(false); onConfirm(); }}>{confirmLabel}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
