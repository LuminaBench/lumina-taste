import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './prompt-composer';
import './prompt-composer.css';

export interface PromptComposerProps { placeholder?: string; modes?: string[]; maxLength?: number; onSend?: (text: string, mode: string) => void; onAttach?: () => void; className?: string }

/** Chat input that grows with its content; ⌘/Ctrl+Enter sends. */
export function PromptComposer({ placeholder = 'Write a message…', modes = ['Ask', 'Edit'], maxLength = 2000, onSend, onAttach, className }: PromptComposerProps) {
  const id = useId();
  const ref = useEnhance<HTMLFormElement, { text: string; mode: string }>(enhance, (d) => onSend?.(d.text, d.mode));
  return (
    <form ref={ref} className={cx('lt-composer', className)} aria-label="Message">
      <label htmlFor={id} className="lt-visually-hidden">Message</label>
      <textarea id={id} rows={1} placeholder={placeholder} maxLength={maxLength} aria-describedby={`${id}-hint`} />
      <div data-part="bar">
        <button type="button" data-part="attach" aria-label="Attach a file" onClick={onAttach}><Icon name="paperclip" /></button>
        <div data-part="mode" role="radiogroup" aria-label="Mode">
          {modes.map((m, i) => <button key={m} type="button" role="radio" aria-checked={i === 0} tabIndex={i === 0 ? 0 : -1}>{m}</button>)}
        </div>
        <span id={`${id}-hint`} data-part="hint"><kbd className="lt-kbd">⌘</kbd><kbd className="lt-kbd">↵</kbd> to send</span>
        <span data-part="count" aria-hidden>0 / {maxLength}</span>
        <button type="submit" data-part="send" aria-label="Send" disabled><Icon name="send" /></button>
      </div>
      <p data-part="sent" aria-live="polite" />
    </form>
  );
}
