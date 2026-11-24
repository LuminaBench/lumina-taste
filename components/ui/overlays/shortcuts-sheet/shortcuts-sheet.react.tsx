import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './shortcuts-sheet.css';

export interface ShortcutGroup { title: string; items: Array<{ label: string; keys: string[] }> }

/** Controlled shortcuts dialog. Open it from a "?" key handler in your app. */
export function ShortcutsSheet({ open, onClose, groups, className }: { open: boolean; onClose: () => void; groups: ShortcutGroup[]; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} className={cx('lt-shortcuts', className)} aria-label="Keyboard shortcuts" onClose={onClose}>
      <header><h3>Keyboard shortcuts</h3><button type="button" data-part="close" aria-label="Close" onClick={onClose}><Icon name="x" /></button></header>
      <div data-part="groups">{groups.map((g) => <section key={g.title}><h4>{g.title}</h4><dl>{g.items.map((it) => <div key={it.label}><dt>{it.label}</dt><dd>{it.keys.map((k) => <kbd key={k} className="lt-kbd">{k}</kbd>)}</dd></div>)}</dl></section>)}</div>
    </dialog>
  );
}
