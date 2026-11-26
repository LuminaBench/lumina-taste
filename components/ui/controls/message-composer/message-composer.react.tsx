import { cx, useEnhance } from '../../_shared/react';
import { Icon } from '../../_shared/Icon';
import { enhance } from './message-composer';
import './message-composer.css';

export interface MessageComposerProps { placeholder?: string; onSend?: (text: string) => void; onAttach?: () => void; className?: string }

/** A growing message field with Send, above the home indicator and the keyboard. */
export function MessageComposer({ placeholder = 'Message', onSend, onAttach, className }: MessageComposerProps) {
  const ref = useEnhance<HTMLFormElement, { text: string }>(enhance, (d) => onSend?.(d.text));
  return (
    <form ref={ref} className={cx('lt-composer', className)} aria-label="Write a message">
      <button type="button" data-part="attach" aria-label="Add a photo or file" onClick={onAttach}><Icon name="plus" size={22} /></button>
      <label data-part="field"><span className="lt-visually-hidden">Message</span><textarea rows={1} placeholder={placeholder} enterKeyHint="send" /></label>
      <button type="submit" data-part="send" aria-label="Send" disabled><Icon name="send" size={20} /></button>
    </form>
  );
}
