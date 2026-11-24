import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { MenuItems, type MenuEntry } from '../dropdown-menu/dropdown-menu.react';
import { enhance } from './context-menu';
import '../dropdown-menu/dropdown-menu.css';
import './context-menu.css';

export function ContextMenu({ label, children, entries, onAction, className }: { label: string; children: ReactNode; entries: MenuEntry[]; onAction?: (d: { action: string }) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { action: string }>(enhance, onAction);
  return (
    <div ref={ref} className={cx('lt-context', className)}>
      <div data-part="area" tabIndex={0} role="button" aria-haspopup="menu" aria-label={`${label}. Press Shift+F10 for options.`}>{children}</div>
      <div className="lt-menu" data-part="menu" role="menu" aria-label={`${label} options`} hidden><MenuItems entries={entries} /></div>
    </div>
  );
}
