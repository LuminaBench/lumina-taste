import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './dropdown-menu';
import '../../controls/button/button.css';
import './dropdown-menu.css';

export type MenuEntry =
  | { type: 'item'; label: string; icon?: IconName; shortcut?: string; danger?: boolean }
  | { type: 'check'; label: string; checked?: boolean }
  | { type: 'sub'; label: string; icon?: IconName; items: string[] }
  | { type: 'separator' };

export function MenuItems({ entries }: { entries: MenuEntry[] }) {
  return (
    <>
      {entries.map((e, i) => {
        if (e.type === 'separator') return <div key={i} role="separator" />;
        if (e.type === 'check') return <button key={i} type="button" role="menuitemcheckbox" aria-checked={!!e.checked} tabIndex={-1}><span data-part="check"><Icon name="check" size={14} /></span><span>{e.label}</span></button>;
        if (e.type === 'sub') return (
          <div key={i} data-part="sub">
            <button type="button" role="menuitem" tabIndex={-1} aria-haspopup="menu" aria-expanded={false}>{e.icon && <Icon name={e.icon} />}<span>{e.label}</span><Icon name="chevron-right" size={14} /></button>
            <div className="lt-menu" role="menu" aria-label={e.label} data-part="submenu" hidden>{e.items.map((s) => <button key={s} type="button" role="menuitem" tabIndex={-1}><span>{s}</span></button>)}</div>
          </div>
        );
        return <button key={i} type="button" role="menuitem" tabIndex={-1} data-tone={e.danger ? 'danger' : undefined}>{e.icon && <Icon name={e.icon} />}<span>{e.label}</span>{e.shortcut && <kbd>{e.shortcut}</kbd>}</button>;
      })}
    </>
  );
}

export function DropdownMenu({ label, entries, onAction, className }: { label: string; entries: MenuEntry[]; onAction?: (d: { action?: string; toggle?: string; checked?: boolean }) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { action?: string; toggle?: string; checked?: boolean }>(enhance, onAction);
  return (
    <div ref={ref} className={cx('lt-dropdown', className)}>
      <button type="button" className="lt-btn" data-variant="secondary" data-part="trigger" aria-haspopup="menu" aria-expanded={false} aria-controls={id}><span data-part="label">{label}</span><Icon name="chevron-down" size={14} /></button>
      <div className="lt-menu" data-part="menu" id={id} role="menu" aria-label={label} hidden><MenuItems entries={entries} /></div>
    </div>
  );
}
