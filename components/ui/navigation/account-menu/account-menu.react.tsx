import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './account-menu';
import './account-menu.css';

export interface AccountMenuProps {
  name: string; email: string; initials?: string;
  items: Array<{ label: string; href?: string; icon: IconName; shortcut?: string }>;
  onSignOut?: () => void; onAction?: (label: string) => void; className?: string;
}

export function AccountMenu({ name, email, initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2), items, onSignOut, onAction, className }: AccountMenuProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { action: string }>(enhance, (d) => (d.action === 'Sign out' ? onSignOut?.() : onAction?.(d.action)));
  return (
    <div ref={ref} className={cx('lt-account', className)}>
      <button type="button" data-part="trigger" aria-haspopup="menu" aria-expanded={false} aria-controls={id}>
        <span data-part="avatar" aria-hidden="true">{initials}</span><span data-part="who">{name}</span><Icon name="chevron-down" size={14} />
      </button>
      <div data-part="menu" id={id} role="menu" aria-label="Account" hidden>
        <div data-part="identity" role="presentation"><strong>{name}</strong><span>{email}</span></div>
        {items.map((it) => (
          <a key={it.label} role="menuitem" href={it.href} tabIndex={-1}><Icon name={it.icon} />{it.label}{it.shortcut && <kbd>{it.shortcut}</kbd>}</a>
        ))}
        <div data-part="sep" role="separator" />
        <button type="button" role="menuitem" tabIndex={-1} data-tone="danger"><Icon name="log-out" />Sign out</button>
      </div>
    </div>
  );
}
