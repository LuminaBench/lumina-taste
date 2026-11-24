import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './combobox';
import './combobox.css';

export interface ComboboxOption { value: string; label: string; meta?: string }
export interface ComboboxProps { label: string; options: ComboboxOption[]; placeholder?: string; emptyText?: string; onChange?: (o: { value: string; label: string }) => void; className?: string }

export function Combobox({ label, options, placeholder, emptyText = 'No matches', onChange, className }: ComboboxProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { value: string; label: string }>(enhance, onChange);
  return (
    <div ref={ref} className={cx('lt-combobox', className)}>
      <label htmlFor={`${id}i`} id={`${id}l`}>{label}</label>
      <div data-part="field">
        <input id={`${id}i`} type="text" role="combobox" aria-autocomplete="list" aria-expanded={false} aria-controls={`${id}x`} autoComplete="off" placeholder={placeholder} />
        <button type="button" data-part="toggle" tabIndex={-1} aria-label="Show options"><Icon name="chevrons-up-down" /></button>
      </div>
      <ul data-part="listbox" id={`${id}x`} role="listbox" aria-labelledby={`${id}l`} hidden>
        {options.map((o, i) => (
          <li key={o.value} role="option" id={`${id}o${i}`} data-value={o.value} aria-selected={false}><span data-part="text">{o.label}</span>{o.meta && <span data-part="meta">{o.meta}</span>}</li>
        ))}
      </ul>
      <p data-part="empty" hidden>{emptyText}</p>
    </div>
  );
}
