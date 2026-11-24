import { combine, emit, on, roving, type Cleanup } from '../../_shared/dom';
import { place } from '../../_shared/position';

/** Inline text-selection toolbar: appears above a non-empty selection inside [data-part=editable]. */
export function enhance(root: HTMLElement): Cleanup {
  const editable = root.querySelector<HTMLElement>('[data-part="editable"]')!;
  const bubble = root.querySelector<HTMLElement>('[data-part="bubble"]')!;
  const buttons = () => [...bubble.querySelectorAll<HTMLButtonElement>('button')];
  let saved: Range | null = null;
  const hide = () => { if (bubble.matches(':popover-open')) bubble.hidePopover(); };
  const update = () => {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !editable.contains(sel.anchorNode)) { if (!bubble.contains(document.activeElement)) hide(); return; }
    saved = sel.getRangeAt(0).cloneRange();
    const rect = saved.getBoundingClientRect();
    if (!bubble.matches(':popover-open')) bubble.showPopover();
    place(bubble, rect, 'top', 8);
  };
  const exec = (cmd: string) => {
    if (saved) { const s = getSelection()!; s.removeAllRanges(); s.addRange(saved); }
    if (cmd === 'bold' || cmd === 'italic') document.execCommand(cmd);
    else if (cmd === 'link') document.execCommand('createLink', false, '#');
    else if (cmd === 'comment' && saved) {
      const u = document.createElement('u');
      u.className = 'lt-comment';
      try { saved.surroundContents(u); } catch { /* selection crosses elements */ }
    }
    emit(root, { command: cmd, text: saved?.toString() });
    hide();
    editable.focus();
  };
  return combine(
    on(document, 'selectionchange', () => requestAnimationFrame(update)),
    on(bubble, 'pointerdown', (e: PointerEvent) => e.preventDefault()),
    on(bubble, 'click', (e: MouseEvent) => { const b = (e.target as Element).closest<HTMLElement>('[data-cmd]'); if (b) exec(b.dataset.cmd!); }),
    // Alt+F10 moves focus into the toolbar, as in most editors.
    on(editable, 'keydown', (e: KeyboardEvent) => { if (e.altKey && e.key === 'F10' && bubble.matches(':popover-open')) { e.preventDefault(); buttons()[0].focus(); } }),
    on(bubble, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') { hide(); editable.focus(); } }),
    roving(bubble, buttons, { orientation: 'horizontal' }),
    on(window, 'scroll', () => hide(), { passive: true, capture: true }),
  );
}
