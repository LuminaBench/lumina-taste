import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './inline-edit';
import './inline-edit.css';

export interface InlineEditProps { label: string; defaultValue: string; maxLength?: number; onSave?: (value: string) => void; className?: string }

/** Click-to-edit text with explicit save and cancel. */
export function InlineEdit({ label, defaultValue, maxLength = 60, onSave, className }: InlineEditProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { value: string }>(enhance, (d) => onSave?.(d.value));
  return (
    <div ref={ref} className={cx('lt-inline-edit', className)}>
      <p data-part="label" id={id}>{label}</p>
      <div data-part="view"><span data-part="value">{defaultValue}</span><button type="button" data-part="edit" aria-describedby={id}><Icon name="edit" /><span className="lt-visually-hidden">Rename</span></button></div>
      <form data-part="form" hidden>
        <input type="text" aria-labelledby={id} defaultValue={defaultValue} maxLength={maxLength} required />
        <button type="submit" data-part="save" aria-label="Save"><Icon name="check" /></button>
        <button type="button" data-part="cancel" aria-label="Cancel"><Icon name="x" /></button>
      </form>
      <p data-part="hint">Enter saves, Esc cancels.</p>
    </div>
  );
}
