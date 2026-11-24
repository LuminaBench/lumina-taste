import { combine, emit, on, openDialog, type Cleanup } from '../../_shared/dom';

/** Mobile bottom sheet on <dialog>: drag the grabber down (or flick) to dismiss; scrim, Esc and Cancel close. */
export function enhance(root: HTMLElement): Cleanup {
  const sheet = root.querySelector<HTMLDialogElement>('dialog')!;
  const grab = sheet.querySelector<HTMLElement>('[data-part="grab"]')!;
  const opener = root.querySelector<HTMLElement>('[data-part="open"]');
  let y0 = 0, t0 = 0, dy = 0;
  const end = (e: PointerEvent) => {
    if (!sheet.hasAttribute('data-dragging')) return;
    sheet.removeAttribute('data-dragging');
    const v = dy / Math.max(1, e.timeStamp - t0);
    if (dy > sheet.offsetHeight * 0.3 || v > 0.6) sheet.close();
    sheet.style.removeProperty('--drag');
  };
  return combine(
    opener ? on(opener, 'click', () => openDialog(sheet)) : () => {},
    on(grab, 'pointerdown', (e: PointerEvent) => { y0 = e.clientY; t0 = e.timeStamp; dy = 0; grab.setPointerCapture(e.pointerId); sheet.setAttribute('data-dragging', ''); }),
    on(grab, 'pointermove', (e: PointerEvent) => { if (!sheet.hasAttribute('data-dragging')) return; dy = Math.max(0, e.clientY - y0); sheet.style.setProperty('--drag', `${dy}px`); }),
    on(grab, 'pointerup', end),
    on(grab, 'pointercancel', end),
    on(sheet, 'click', (e: MouseEvent) => {
      if (e.target === sheet) { sheet.close(); return; }
      const b = (e.target as Element).closest('button');
      if (!b) return;
      if (b.matches('[data-part="cancel"]')) sheet.close();
      else { emit(root, { action: b.textContent?.trim() }); sheet.close(); }
    }),
    on(sheet, 'close', () => opener?.focus()),
  );
}
