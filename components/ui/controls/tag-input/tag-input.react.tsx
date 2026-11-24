import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './tag-input';
import './tag-input.css';

export interface TagInputProps { label: string; defaultValues?: string[]; maxVisible?: number; placeholder?: string; hint?: string; onChange?: (values: string[]) => void; className?: string }

export function TagInput({ label, defaultValues = [], maxVisible = 3, placeholder = 'Add…', hint = 'Press Enter or comma to add.', onChange, className }: TagInputProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { values: string[] }>(enhance, (d) => onChange?.(d.values));
  return (
    <div ref={ref} className={cx('lt-tags', className)} data-max-visible={maxVisible}>
      <label htmlFor={id}>{label}</label>
      <div data-part="box">
        <ul data-part="list" aria-label={label}>
          {defaultValues.map((v) => (
            <li data-part="tag" key={v}><span>{v}</span><button type="button" aria-label={`Remove ${v}`}><Icon name="x" size={14} /></button></li>
          ))}
        </ul>
        <span data-part="more" aria-hidden="true" />
        <input id={id} type="text" placeholder={placeholder} autoComplete="off" aria-describedby={`${id}h`} />
      </div>
      <p id={`${id}h`} data-part="hint">{hint}</p>
      <span data-part="live" className="lt-visually-hidden" role="status" aria-live="polite" />
    </div>
  );
}
