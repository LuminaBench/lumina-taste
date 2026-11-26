import { useId, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './swipe-row';
import './swipe-row.css';

export interface SwipeRowItem { id: string; lead?: ReactNode; title: string; sub?: string; meta?: ReactNode; href?: string }
export interface SwipeRowAction { id: string; label: string; icon: IconName; danger?: boolean }

/** List rows that reveal actions on a swipe, with a keyboard button that opens the same actions. */
export function SwipeRow({ label, rows, actions, onAction, onOpen, className }: { label: string; rows: SwipeRowItem[]; actions: SwipeRowAction[]; onAction?: (action: string, id: string) => void; onOpen?: (id: string) => void; className?: string }) {
  const uid = useId();
  const ref = useEnhance<HTMLDivElement, { action: string; id: string }>(enhance, (d) => onAction?.(d.action, d.id));
  return (
    <div ref={ref} className={cx('lt-swiperow', className)}>
      <ul data-part="list" aria-label={label}>
        {rows.map((r) => {
          const inner = <>{r.lead != null && <b data-part="lead">{r.lead}</b>}<span data-part="title">{r.title}</span>{r.sub && <span data-part="sub">{r.sub}</span>}{r.meta != null && <span data-part="meta">{r.meta}</span>}</>;
          return (
            <li key={r.id} data-part="row" data-id={r.id}>
              <div data-part="content">
                {r.href ? <a data-part="main" href={r.href} onClick={() => onOpen?.(r.id)}>{inner}</a> : <button type="button" data-part="main" onClick={() => onOpen?.(r.id)}>{inner}</button>}
                <button type="button" data-part="more" aria-expanded="false" aria-controls={`${uid}-${r.id}`} aria-label={`Actions for ${r.title}`}><Icon name="more" /></button>
              </div>
              <div data-part="actions" id={`${uid}-${r.id}`}>
                {actions.map((a) => <button key={a.id} type="button" data-action={a.id} data-tone={a.danger ? 'danger' : undefined}><Icon name={a.icon} size={18} /><span>{a.label}</span></button>)}
              </div>
            </li>
          );
        })}
      </ul>
      <p data-part="live" role="status" className="lt-visually-hidden" />
    </div>
  );
}
