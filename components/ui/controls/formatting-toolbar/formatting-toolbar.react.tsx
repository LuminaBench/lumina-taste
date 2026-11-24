import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './formatting-toolbar';
import './formatting-toolbar.css';

export interface FormatState { bold: boolean; italic: boolean; align: string; link?: boolean }

/** Formatting toolbar: one tab stop, arrow keys, toggle buttons and an alignment radiogroup. */
export function FormattingToolbar({ text, onChange, className }: { text: string; onChange?: (s: FormatState) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, FormatState>(enhance, (d) => onChange?.(d));
  const lines = (n: number) => <svg className="lt-icon" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden><path d={n ? 'M4 6h16M7 10h10M4 14h16M7 18h10' : 'M4 6h16M4 10h10M4 14h16M4 18h10'} /></svg>;
  return (
    <div ref={ref} className={cx('lt-format', className)}>
      <div data-part="toolbar" role="toolbar" aria-label="Text formatting" aria-controls={id}>
        <button type="button" aria-pressed={false} data-cmd="bold" tabIndex={0} aria-label="Bold"><Icon name="bold" /></button>
        <button type="button" aria-pressed={false} data-cmd="italic" tabIndex={-1} aria-label="Italic"><Icon name="italic" /></button>
        <span data-part="sep" aria-hidden />
        <div role="radiogroup" aria-label="Alignment" data-part="align">
          <button type="button" role="radio" aria-checked data-align="left" tabIndex={-1} aria-label="Align left">{lines(0)}</button>
          <button type="button" role="radio" aria-checked={false} data-align="center" tabIndex={-1} aria-label="Align centre">{lines(1)}</button>
        </div>
        <span data-part="sep" aria-hidden />
        <button type="button" data-cmd="link" tabIndex={-1} aria-label="Add link"><Icon name="link" /></button>
      </div>
      <p id={id} data-part="text">{text}</p>
    </div>
  );
}
