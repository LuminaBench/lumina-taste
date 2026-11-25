import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './announcement-pill.css';

/** One line above a headline: a tagged announcement link, a two-part fact, or a status. */
export function AnnouncementPill({ tag, lead, children, href, status, className }: { tag?: string; lead?: string; children: ReactNode; href?: string; status?: boolean; className?: string }) {
  const inner = <>{tag && <span data-part="tag">{tag}</span>}{status && <span data-part="dot" aria-hidden />}{lead && <b>{lead}</b>}<span>{children}</span>{href && tag && <Icon name="arrow-right" size={14} />}</>;
  return href ? <a className={cx('lt-pill', className)} href={href}>{inner}</a> : <p className={cx('lt-pill', className)}>{inner}</p>;
}
