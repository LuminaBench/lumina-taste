import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './bottom-nav';
import './bottom-nav.css';

export interface BottomNavItem { label: string; href: string; icon: IconName; badge?: number }

/** Pass at most 5 items. `onNavigate` receives the href; call your router there. */
export function BottomNav({ items, current, onNavigate, className }: { items: BottomNavItem[]; current: string; onNavigate?: (href: string) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { href: string }>(enhance, (d) => onNavigate?.(d.href));
  return (
    <nav ref={ref} className={cx('lt-bottom-nav', className)} aria-label="Primary">
      <span data-part="pill" aria-hidden="true" />
      {items.slice(0, 5).map((it) => (
        <a key={it.href} href={it.href} aria-current={it.href === current ? 'page' : undefined}>
          <Icon name={it.icon} size={20} /><span>{it.label}</span>
          {!!it.badge && <em data-part="badge" aria-label={`${it.badge} unread`}>{it.badge}</em>}
        </a>
      ))}
    </nav>
  );
}
