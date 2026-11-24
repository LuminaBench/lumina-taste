import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './app-sidebar';
import './app-sidebar.css';

export interface SidebarItem { label: string; href: string; icon: IconName; count?: number; current?: boolean }
export interface AppSidebarProps { workspace: string; initial?: ReactNode; sections: Array<{ title?: string; items: SidebarItem[] }>; persistKey?: string; onCollapse?: (c: boolean) => void; className?: string }

export function AppSidebar({ workspace, initial = workspace[0], sections, persistKey, onCollapse, className }: AppSidebarProps) {
  const ref = useEnhance<HTMLElement, { collapsed: boolean }>(enhance, (d) => onCollapse?.(d.collapsed));
  return (
    <aside ref={ref} className={cx('lt-sidebar', className)} aria-label={workspace} data-persist={persistKey}>
      <div data-part="head">
        <span data-part="ws" aria-hidden="true">{initial}</span><span data-part="ws-name">{workspace}</span>
        <button type="button" data-part="collapse" aria-expanded aria-label="Collapse sidebar"><Icon name="chevron-left" /></button>
      </div>
      <nav aria-label="Primary">
        {sections.map((s, i) => (
          <div key={i}>
            {s.title && <p data-part="section">{s.title}</p>}
            <ul>
              {s.items.map((it) => (
                <li key={it.href}><a href={it.href} aria-current={it.current ? 'page' : undefined}><Icon name={it.icon} size={18} /><span>{it.label}</span>{it.count != null && <em data-part="count">{it.count}</em>}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
