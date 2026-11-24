import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './undo-snackbar.css';

/** Controlled undo snackbar: show it after a reversible action; call onUndo or let it expire. */
export function UndoSnackbar({ open, message, onUndo, children, className }: { open: boolean; message: string; onUndo: () => void; children?: ReactNode; className?: string }) {
  return (
    <div className={cx('lt-undo-demo', className)}>
      {children}
      <div data-part="bar" role="status" aria-live="polite" hidden={!open}><span data-part="text">{message}</span><button type="button" data-part="undo" onClick={onUndo}>Undo</button><span data-part="timer" aria-hidden /></div>
    </div>
  );
}
