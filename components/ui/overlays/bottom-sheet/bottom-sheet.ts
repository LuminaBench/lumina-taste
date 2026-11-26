import { combine, emit, on, openDialog, type Cleanup } from '../../_shared/dom';

/**
 * Mobile bottom sheet on <dialog>: drag the grabber down (or flick) to dismiss; scrim, Esc and Cancel close.
 *
 * Detents: add data-detents="medium large" to the <dialog> and make the grabber a <button>. The sheet opens at
 * the first detent; drag it up (or press the grabber, or ArrowUp on it) for the next one, down for the one
 * before, and down from the smallest to close. The current one is on data-detent and in the lt-change event.
 */
export function enhance(root: HTMLElement): Cleanup {
  const sheet = root.querySelector<HTMLDialogElement>('dialog')!;
  const grab = sheet.querySelector<HTMLElement>('[data-part="grab"]')!;
  const opener = root.querySelector<HTMLElement>('[data-part="open"]');
  const detents = (sheet.dataset.detents ?? '').split(/\s+/).filter(Boolean);
  const first = detents[0];
  let y0 = 0, t0 = 0, dy = 0, moved = false;

  const setDetent = (name: string, announce = true) => {
    if (!detents.includes(name)) return;
    const prev = sheet.dataset.detent;
    sheet.dataset.detent = name;
    const top = detents.indexOf(name) === detents.length - 1;
    if (grab.matches('button')) {
      grab.setAttribute('aria-expanded', String(top));
      grab.setAttribute('aria-label', top ? 'Make the sheet smaller' : 'Make the sheet bigger');
    }
    if (announce && prev !== name) emit(root, { detent: name });
  };
  const step = (by: number) => {
    const next = detents.indexOf(sheet.dataset.detent ?? first) + by;
    if (next < 0) { sheet.close(); return; }
    setDetent(detents[Math.min(detents.length - 1, next)]);
  };
  if (detents.length) setDetent(sheet.dataset.detent && detents.includes(sheet.dataset.detent) ? sheet.dataset.detent : first, false);

  const end = (e: PointerEvent) => {
    if (!sheet.hasAttribute('data-dragging')) return;
    sheet.removeAttribute('data-dragging');
    const v = dy / Math.max(1, e.timeStamp - t0);
    sheet.style.removeProperty('--drag');
    sheet.style.removeProperty('--grow');
    if (!detents.length) {
      if (dy > sheet.offsetHeight * 0.3 || v > 0.6) sheet.close();
      return;
    }
    // Up: the next detent. Down: the one before, or close from the smallest.
    if (dy < -40 || v < -0.5) step(1);
    else if (dy > 0) {
      const atFirst = (sheet.dataset.detent ?? first) === first;
      if (atFirst ? dy > sheet.offsetHeight * 0.3 || v > 0.6 : dy > 60 || v > 0.5) step(-1);
    }
  };
  return combine(
    opener ? on(opener, 'click', () => openDialog(sheet)) : () => {},
    on(grab, 'pointerdown', (e: PointerEvent) => { y0 = e.clientY; t0 = e.timeStamp; dy = 0; moved = false; grab.setPointerCapture(e.pointerId); sheet.setAttribute('data-dragging', ''); }),
    on(grab, 'pointermove', (e: PointerEvent) => {
      if (!sheet.hasAttribute('data-dragging')) return;
      dy = e.clientY - y0;
      if (Math.abs(dy) > 4) moved = true;
      const canGrow = detents.length > 0 && sheet.dataset.detent !== detents[detents.length - 1];
      if (dy < 0 && canGrow) { sheet.style.setProperty('--grow', `${-dy}px`); sheet.style.removeProperty('--drag'); }
      else { sheet.style.setProperty('--drag', `${Math.max(0, dy)}px`); sheet.style.removeProperty('--grow'); }
    }),
    on(grab, 'pointerup', end),
    on(grab, 'pointercancel', end),
    // The grabber as a button: a press moves to the next detent (or back to the first); arrows step.
    on(grab, 'click', () => {
      if (moved || !detents.length) { moved = false; return; }
      const i = detents.indexOf(sheet.dataset.detent ?? first);
      setDetent(i === detents.length - 1 ? first : detents[i + 1]);
    }),
    on(grab, 'keydown', (e: KeyboardEvent) => {
      if (!detents.length) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if ((sheet.dataset.detent ?? first) !== first) step(-1); }
    }),
    on(sheet, 'click', (e: MouseEvent) => {
      if (e.target === sheet) { sheet.close(); return; }
      // Only the sheet's own actions close it, so a form inside (fields, pickers, toggles) keeps working.
      const b = (e.target as Element).closest('[data-part="actions"] button, [data-part="cancel"], [data-sheet-action]');
      if (!b) return;
      if (b.matches('[data-part="cancel"]')) sheet.close();
      else { emit(root, { action: b.textContent?.trim() }); sheet.close(); }
    }),
    on(sheet, 'close', () => { if (first) setDetent(first, false); opener?.focus(); }),
  );
}
