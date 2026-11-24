import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './selection-bubble';
import './selection-bubble.css';

/** Wraps editable content; shows a format toolbar above any selection. Alt+F10 focuses the toolbar. */
export function SelectionBubble({ children, onCommand, className }: { children: ReactNode; onCommand?: (d: { command: string; text: string }) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { command: string; text: string }>(enhance, onCommand);
  return (
    <div ref={ref} className={cx('lt-bubble-demo', className)}>
      <div data-part="editable" contentEditable suppressContentEditableWarning spellCheck={false}>{children}</div>
      <div data-part="bubble" role="toolbar" aria-label="Format selection" popover="manual">
        <button type="button" data-cmd="bold" aria-label="Bold" tabIndex={0}><Icon name="bold" /></button>
        <button type="button" data-cmd="italic" aria-label="Italic" tabIndex={-1}><Icon name="italic" /></button>
        <button type="button" data-cmd="link" aria-label="Add link" tabIndex={-1}><Icon name="link" /></button>
        <span data-part="sep" aria-hidden="true" />
        <button type="button" data-cmd="comment" aria-label="Comment" tabIndex={-1}><Icon name="message" /><span>Comment</span></button>
      </div>
    </div>
  );
}
