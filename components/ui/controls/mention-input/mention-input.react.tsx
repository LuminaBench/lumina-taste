import { useId } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './mention-input';
import './mention-input.css';

export interface MentionInputProps { label: string; people: Array<{ name: string; handle: string }>; placeholder?: string; onMention?: (handle: string, value: string) => void; className?: string }

/** Textarea with @-mention suggestions under the caret. */
export function MentionInput({ label, people, placeholder = 'Type @ to mention someone', onMention, className }: MentionInputProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { mention: string; value: string }>(enhance, (d) => onMention?.(d.mention, d.value));
  return (
    <div ref={ref} className={cx('lt-mention', className)}>
      <label htmlFor={id}>{label}</label>
      <div data-part="wrap">
        <textarea id={id} rows={3} role="combobox" aria-expanded={false} aria-controls={`${id}-list`} aria-autocomplete="list" aria-describedby={`${id}-hint`} placeholder={placeholder} />
        <ul id={`${id}-list`} data-part="list" role="listbox" aria-label="People" hidden>
          {people.map((p) => (
            <li key={p.handle} role="option" id={`${id}-${p.handle}`} data-handle={p.handle} aria-selected={false}>
              <span data-part="avatar" aria-hidden>{p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <span><strong>{p.name}</strong><span>@{p.handle}</span></span>
            </li>
          ))}
        </ul>
      </div>
      <p id={`${id}-hint`} data-part="hint">@ opens the list · ↑↓ to choose · Enter or Tab to insert</p>
    </div>
  );
}
