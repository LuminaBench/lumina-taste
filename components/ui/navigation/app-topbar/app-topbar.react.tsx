import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './app-topbar.css';

/** App top bar: workspace switcher, a central search, help, notifications and the account. */
export function AppTopbar({ workspace, plan, initials, unread = 0, search, className }: { workspace: string; plan?: string; initials: string; unread?: number; search?: ReactNode; className?: string }) {
  return (
    <header className={cx('lt-topbar', className)}>
      <button type="button" data-part="workspace" aria-haspopup="menu" aria-expanded="false"><span data-part="ws-mark" aria-hidden>{workspace[0]}</span><span><strong>{workspace}</strong>{plan && <span>{plan}</span>}</span><Icon name="chevrons-up-down" /></button>
      {search ?? <label data-part="search"><span className="lt-visually-hidden">Search</span><Icon name="search" /><input type="search" placeholder="Search or jump to…" /><kbd className="lt-kbd">⌘K</kbd></label>}
      <div data-part="tools">
        <a href="#help" aria-label="Help"><Icon name="info" size={18} /></a>
        <a href="#inbox" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} data-part="bell"><Icon name="bell" size={18} />{unread > 0 && <i aria-hidden />}</a>
        <button type="button" data-part="avatar" aria-label="Account">{initials}</button>
      </div>
    </header>
  );
}
