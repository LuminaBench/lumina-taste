import { combine, emit, on, openDialog, type Cleanup } from '../../_shared/dom';

/**
 * Modal dialog on native <dialog>: focus trap, Esc, inert page and top layer come from the browser.
 * Adds backdrop-click to cancel, focus return and an lt-change event with the chosen value.
 */
export function enhance(root: HTMLElement): Cleanup {
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const opener = root.querySelector<HTMLElement>('[data-part="open"]');
  let last: HTMLElement | null = null;
  return combine(
    opener ? on(opener, 'click', () => { last = opener; dialog.returnValue = ''; openDialog(dialog); }) : () => {},
    on(dialog, 'click', (e: MouseEvent) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dialog.close('cancel');
    }),
    on(dialog, 'close', () => { emit(root, { value: dialog.returnValue || 'cancel' }); (last ?? opener)?.focus(); }),
  );
}
