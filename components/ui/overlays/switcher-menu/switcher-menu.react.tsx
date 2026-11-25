import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './switcher-menu';
import './switcher-menu.css';

export interface SwitchGroup { name: string; items: Array<{ value: string; label: string; tag?: string; busy?: string }> }

/** Grouped switcher for workspaces, accounts, models or environments. */
export function SwitcherMenu({ groups, value, label = 'Switch workspace', onChange, className }: { groups: SwitchGroup[]; value: string; label?: string; onChange?: (value: string) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { value: string }>(enhance, (d) => onChange?.(d.value));
  const cur = groups.flatMap((g) => g.items.map((i) => ({ g, i }))).find((x) => x.i.value === value);
  return (
    <div ref={ref} className={cx('lt-switcher', className)}>
      <button type="button" data-part="trigger" aria-haspopup="menu" aria-expanded="false"><span data-part="mark" aria-hidden>{cur?.g.name[0]}</span><span data-part="current">{cur?.g.name}</span><span data-part="meta">{cur?.i.label}</span><Icon name="chevrons-up-down" size={14} /></button>
      <div className="lt-menu" data-part="menu" role="menu" aria-label={label} hidden>
        {groups.map((g) => (
          <div key={g.name} role="group" aria-label={g.name}>
            <p data-part="group"><span data-part="mark" aria-hidden>{g.name[0]}</span>{g.name}</p>
            {g.items.map((i) => <button key={i.value} type="button" role="menuitemradio" aria-checked={i.value === value} tabIndex={-1} data-value={i.value}><span data-part="name">{i.label}</span><span data-part="tag">{i.tag}</span>{i.busy && <span data-part="dot" data-tone="warning"><span className="lt-visually-hidden">{i.busy}</span></span>}<span data-part="check" aria-hidden><Icon name="check" size={14} /></span></button>)}
          </div>))}
      </div>
    </div>
  );
}
