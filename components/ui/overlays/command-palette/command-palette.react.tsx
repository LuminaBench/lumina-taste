import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './command-palette';
import '../../controls/button/button.css';
import '../../feedback/kbd/kbd.css';
import './command-palette.css';

export interface Command { id: string; label: string; icon: IconName; keywords?: string; shortcut?: string }
export interface CommandPaletteProps { groups: Array<{ label: string; commands: Command[] }>; triggerLabel?: string; onRun?: (label: string) => void; className?: string }

/** Opens with ⌘K / Ctrl+K or the trigger button. */
export function CommandPalette({ groups, triggerLabel = 'Open command palette', onRun, className }: CommandPaletteProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { command: string }>(enhance, (d) => onRun?.(d.command));
  return (
    <div ref={ref} className={cx('lt-cmdk-demo', className)}>
      <button type="button" className="lt-btn" data-variant="secondary" data-part="open"><Icon name="command" /><span data-part="label">{triggerLabel}</span><kbd className="lt-kbd">⌘K</kbd></button>
      <dialog className="lt-cmdk" aria-label="Command palette">
        <div data-part="search"><Icon name="search" size={18} /><input type="text" role="combobox" aria-expanded aria-controls={`${id}l`} aria-autocomplete="list" placeholder="Type a command or search…" autoComplete="off" spellCheck={false} /><kbd className="lt-kbd">Esc</kbd></div>
        <div data-part="list" id={`${id}l`} role="listbox" aria-label="Commands">
          {groups.map((g, gi) => (
            <div role="group" aria-labelledby={`${id}g${gi}`} key={g.label}>
              <p id={`${id}g${gi}`} data-part="group">{g.label}</p>
              {g.commands.map((c) => (
                <div role="option" aria-selected={false} id={`${id}${c.id}`} key={c.id} data-keywords={c.keywords}><Icon name={c.icon} /><span>{c.label}</span>{c.shortcut && <kbd className="lt-kbd">{c.shortcut}</kbd>}</div>
              ))}
            </div>
          ))}
          <p data-part="empty" hidden>No commands match.</p>
        </div>
        <div data-part="foot"><span><kbd className="lt-kbd">↑</kbd><kbd className="lt-kbd">↓</kbd> to navigate</span><span><kbd className="lt-kbd">↵</kbd> to run</span></div>
      </dialog>
    </div>
  );
}
