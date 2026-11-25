import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './command-chip';
import './command-chip.css';

/** One install or run command with a copy button: <CommandChip command="npm install @halyard/charts" />. */
export function CommandChip({ command, className }: { command: string; className?: string }) {
  const ref = useEnhance<HTMLDivElement>(enhance);
  return (
    <div ref={ref} className={cx('lt-command', className)}>
      <span data-part="prompt" aria-hidden>$</span><code>{command}</code>
      <button type="button" data-part="copy" aria-label="Copy command"><Icon name="copy" size={14} /></button>
      <span className="lt-visually-hidden" role="status" data-part="msg" />
    </div>
  );
}
