import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './sortable-list';
import '../../feedback/badge/badge.css';
import './sortable-list.css';

/** Reorderable list. The DOM reorders itself; onReorder receives the new order of labels. */
export function SortableList({ items, onReorder, className }: { items: Array<{ id: string; label: string; tag?: string }>; onReorder?: (labels: string[]) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { order: string[] }>(enhance, (d) => onReorder?.(d.order));
  return (
    <div ref={ref} className={cx('lt-sortable-wrap', className)}>
      <p id={id} data-part="help">Drag a handle, or press Space on it, then arrows, then Space.</p>
      <ol className="lt-sortable" aria-describedby={id}>
        {items.map((it) => <li key={it.id}><button type="button" data-part="handle" aria-label={`Reorder: ${it.label}`}><Icon name="grip" /></button><span>{it.label}</span>{it.tag && <span className="lt-badge">{it.tag}</span>}</li>)}
      </ol>
      <span data-part="live" className="lt-visually-hidden" aria-live="assertive" />
    </div>
  );
}
