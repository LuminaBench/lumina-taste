import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './select-menu';
import './select-menu.css';

export interface SelectOption { value: string; label: string; description?: string }

/** Custom select (select-only combobox) with descriptions, typeahead and full keyboard support. */
export function SelectMenu({ label, options, defaultValue, onChange, className }: { label: string; options: SelectOption[]; defaultValue?: string; onChange?: (v: string) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { value: string }>(enhance, (d) => onChange?.(d.value));
  const current = options.find((o) => o.value === defaultValue) ?? options[0];
  return (
    <div ref={ref} className={cx('lt-select', className)}>
      <span id={`${id}-l`} data-part="label">{label}</span>
      <button type="button" data-part="trigger" aria-haspopup="listbox" aria-expanded="false" aria-labelledby={`${id}-l ${id}-v`}><span id={`${id}-v`} data-part="value">{current?.label}</span><Icon name="chevrons-up-down" /></button>
      <ul data-part="list" role="listbox" aria-labelledby={`${id}-l`} tabIndex={-1} hidden>
        {options.map((o, i) => <li key={o.value} role="option" id={`${id}-${i}`} data-value={o.value} aria-selected={o.value === current?.value}><span><strong>{o.label}</strong>{o.description && <span>{o.description}</span>}</span><span data-part="tick" aria-hidden><Icon name="check" /></span></li>)}
      </ul>
    </div>
  );
}
