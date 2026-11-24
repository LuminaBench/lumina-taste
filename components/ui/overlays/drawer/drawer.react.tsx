import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './drawer.css';

/** Controlled slide-over. Put primary actions in `footer`. */
export function Drawer({ open, title, children, footer, onClose, className }: { open: boolean; title: string; children: ReactNode; footer?: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={cx('lt-drawer', className)} aria-labelledby={id} onClose={onClose} onClick={(e) => e.target === ref.current && ref.current.close()}>
      <header data-part="head"><h2 id={id}>{title}</h2><button type="button" data-part="close" aria-label={`Close ${title.toLowerCase()}`} onClick={() => ref.current?.close()}><Icon name="x" size={18} /></button></header>
      <div data-part="body">{children}</div>
      {footer && <footer data-part="foot">{footer}</footer>}
    </dialog>
  );
}
