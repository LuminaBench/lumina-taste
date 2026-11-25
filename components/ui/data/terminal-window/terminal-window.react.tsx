import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './terminal-window';
import './terminal-window.css';

export interface TerminalLine { kind: 'cmd' | 'out'; text: string; tone?: 'ok' | 'warn' | 'error' }

/** A terminal that types its commands and prints their output once, when it scrolls into view. */
export function TerminalWindow({ label, title, lines, className }: { label: string; title?: string; lines: TerminalLine[]; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [lines]);
  return (
    <figure ref={ref} className={cx('lt-terminal', className)} aria-label={label}>
      <div data-part="bar"><i aria-hidden /><i aria-hidden /><i aria-hidden />{title && <span data-part="title">{title}</span>}<button type="button" data-part="replay" aria-label="Replay"><Icon name="refresh" size={14} /></button></div>
      <div data-part="screen">{lines.map((l, i) => <p key={i} data-kind={l.kind} data-tone={l.tone}>{l.text}</p>)}</div>
    </figure>
  );
}
