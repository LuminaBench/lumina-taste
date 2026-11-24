import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './speed-dial';
import './speed-dial.css';

export interface SpeedDialProps { label: string; actions: Array<{ label: string; icon: IconName }>; onAction?: (label: string) => void; className?: string }

/** Floating action button that fans out up to five labelled actions. Place it inside a positioned container. */
export function SpeedDial({ label, actions, onAction, className }: SpeedDialProps) {
  const ref = useEnhance<HTMLDivElement, { action?: string }>(enhance, (d) => d.action && onAction?.(d.action));
  return (
    <div ref={ref} className={cx('lt-dial', className)}>
      <ul data-part="actions" role="menu" aria-label={label}>
        {actions.map((a) => (
          <li key={a.label} role="none"><button type="button" role="menuitem" tabIndex={-1}><span data-part="text">{a.label}</span><span data-part="mini"><Icon name={a.icon} /></span></button></li>
        ))}
      </ul>
      <button type="button" data-part="fab" aria-haspopup="menu" aria-expanded="false" aria-label={label}><Icon name="plus" size={22} /></button>
    </div>
  );
}
