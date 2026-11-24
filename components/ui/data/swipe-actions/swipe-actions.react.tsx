import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './swipe-actions';
import './swipe-actions.css';

export interface SwipeRow { id: string; from: string; subject: string; time: string }

/** List rows you swipe right to archive or left to delete, with visible buttons as the non-touch path. */
export function SwipeActions({ label, rows, onAction, className }: { label: string; rows: SwipeRow[]; onAction?: (action: 'archive' | 'delete', from: string) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { action: 'archive' | 'delete'; from: string }>(enhance, (d) => onAction?.(d.action, d.from));
  return (
    <div ref={ref} className={cx('lt-swipe', className)}>
      <ul data-part="list" aria-label={label}>
        {rows.map((r) => (
          <li key={r.id} data-part="row">
            <div data-part="actions-under" aria-hidden><span data-part="u-archive"><Icon name="inbox" />Archive</span><span data-part="u-delete"><Icon name="trash" />Delete</span></div>
            <div data-part="content">
              <span data-part="avatar" aria-hidden>{r.from.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <div><p><strong>{r.from}</strong><time>{r.time}</time></p><p>{r.subject}</p></div>
              <div data-part="menu"><button type="button" data-act="archive" aria-label={`Archive message from ${r.from}`}><Icon name="inbox" /></button><button type="button" data-act="delete" aria-label={`Delete message from ${r.from}`}><Icon name="trash" /></button></div>
            </div>
          </li>
        ))}
      </ul>
      <p data-part="live" role="status" />
    </div>
  );
}
