import { useState } from 'react';
import { cx } from '../../_shared/react';
import './danger-zone.css';

/** Danger zone with a type-the-name confirmation. */
export function DangerZone({ name, impact, onDelete, className }: { name: string; impact: string; onDelete: () => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  return (
    <section className={cx('lt-danger', className)} aria-label="Danger zone">
      <h3>Danger zone</h3>
      <div data-part="row"><div><p><strong>Delete {name}</strong></p><p>{impact} This cannot be undone.</p></div><button type="button" className="lt-btn" data-variant="destructive" data-size="sm" disabled={open} onClick={() => setOpen(true)}>Delete</button></div>
      {open && <form data-part="confirm" onSubmit={(e) => { e.preventDefault(); if (typed === name) onDelete(); }}>
        <label htmlFor="dz-input">Type <code>{name}</code> to confirm</label>
        <div><input id="dz-input" autoFocus autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} /><button type="submit" className="lt-btn" data-variant="primary" data-tone="danger" data-size="sm" disabled={typed !== name}>Delete for everyone</button><button type="button" className="lt-btn" data-variant="ghost" data-size="sm" onClick={() => { setOpen(false); setTyped(''); }}>Cancel</button></div>
      </form>}
    </section>
  );
}
