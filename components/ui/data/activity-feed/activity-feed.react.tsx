import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './activity-feed.css';

export interface ActivityItem { id: string; icon: IconName; tone?: 'pos' | 'warn'; text: ReactNode; time: string }

/** Activity feed: icon on a thin rail, one sentence per event, time on the right. */
export function ActivityFeed({ title = 'Activity', items, allHref, className }: { title?: string; items: ActivityItem[]; allHref?: string; className?: string }) {
  return (
    <section className={cx('lt-activity', className)} aria-label={title}>
      <header><h3>{title}</h3>{allHref && <a href={allHref}>View all</a>}</header>
      <ol>{items.map((i) => <li key={i.id}><span data-part="dot" data-tone={i.tone} aria-hidden><Icon name={i.icon} /></span><p>{i.text}</p><time>{i.time}</time></li>)}</ol>
    </section>
  );
}
