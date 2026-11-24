import { combine, emit, on, openDialog, type Cleanup } from '../../_shared/dom';

/** Slide-over drawer on a modal <dialog>: slides from the right, scrim click / Esc / ✕ close, focus returns. */
export function enhance(root: HTMLElement): Cleanup {
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const opener = root.querySelector<HTMLElement>('[data-part="open"]');
  const close = () => dialog.close();
  return combine(
    opener ? on(opener, 'click', () => openDialog(dialog)) : () => {},
    on(dialog, 'click', (e: MouseEvent) => {
      if (e.target === dialog) close();
      const t = e.target as Element;
      if (t.closest('[data-part="close"]')) close();
      if (t.closest('[data-part="apply"]')) { emit(root, { action: 'apply' }); close(); }
      if (t.closest('[data-part="reset"]')) { dialog.querySelectorAll<HTMLInputElement>('input').forEach((i) => (i.checked = i.defaultChecked)); emit(root, { action: 'reset' }); }
    }),
    on(dialog, 'close', () => opener?.focus()),
  );
}
