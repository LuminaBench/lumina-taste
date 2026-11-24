import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './notification-center';
import './notification-center.css';

export interface Notice { id: string; who: string; verb: string; what: string; quote?: string; time: string; unread?: boolean }
export interface NotificationCenterProps { items: Notice[]; onUnreadChange?: (unread: number) => void; className?: string }

/** Bell with an unread count and a panel of notifications (All / Unread, mark all as read). */
export function NotificationCenter({ items, onUnreadChange, className }: NotificationCenterProps) {
  const ref = useEnhance<HTMLDivElement, { unread: number }>(enhance, (d) => onUnreadChange?.(d.unread));
  const unread = items.filter((i) => i.unread).length;
  return (
    <div ref={ref} className={cx('lt-notify', className)}>
      <button type="button" data-part="bell" aria-haspopup="dialog" aria-expanded="false"><Icon name="bell" size={18} /><span data-part="count">{unread}</span><span className="lt-visually-hidden" data-part="sr">Notifications</span></button>
      <section data-part="panel" role="dialog" aria-label="Notifications" hidden>
        <header><h3>Notifications</h3><button type="button" data-part="all">Mark all as read</button></header>
        <div data-part="tabs" role="tablist" aria-label="Filter"><button type="button" role="tab" aria-selected="true" data-filter="all">All</button><button type="button" role="tab" aria-selected="false" data-filter="unread" tabIndex={-1}>Unread</button></div>
        <ul data-part="list">
          {items.map((n) => (
            <li key={n.id} data-part="item" data-unread={n.unread ? '' : undefined}>
              <button type="button" data-part="row">
                <span data-part="avatar" aria-hidden>{n.who.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                <span data-part="body"><span data-part="line"><strong>{n.who}</strong> {n.verb} <strong>{n.what}</strong></span>{n.quote && <span data-part="quote">{n.quote}</span>}<span data-part="time">{n.time}</span></span>
                <span data-part="dot"><span className="lt-visually-hidden">Unread</span></span>
              </button>
            </li>
          ))}
        </ul>
        <p data-part="empty" hidden>You are all caught up.</p>
      </section>
    </div>
  );
}
