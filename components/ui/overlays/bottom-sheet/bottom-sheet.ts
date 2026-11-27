import { combine, emit, on, openDialog, type Cleanup } from '../../_shared/dom';

/**
 * Mobile bottom sheet on <dialog>: drag the grabber down (or flick) to dismiss; scrim, Esc and Cancel close.
 *
 * A grabber that is a <button> is the keyboard path: it steps through the detents, or closes a sheet without any.
 * Detents: add data-detents="medium large" to the <dialog> and make the grabber a <button>. The sheet opens at
 * the first detent; drag it up (or press the grabber, or ArrowUp on it) for the next one, down for the one
 * before, and down from the smallest to close. The current one is on data-detent and in the lt-change event.
 * As on a phone, the whole sheet drags down once its content is at the top (not from a field, a slider or anything
 * marked data-no-drag), and the dimmed page behind it brightens as it goes. With no grabber shown (a popover on
 * a wide screen) nothing drags.
 */
export function enhance(root: HTMLElement): Cleanup {
  const sheet = root.querySelector<HTMLDialogElement>('dialog')!;
  const grab = sheet.querySelector<HTMLElement>('[data-part="grab"]')!;
  const opener = root.querySelector<HTMLElement>('[data-part="open"]');
  const detents = (sheet.dataset.detents ?? '').split(/\s+/).filter(Boolean);
  const first = detents[0];
  let y0 = 0, t0 = 0, dy = 0, moved = false, swallow = false;
  // A press on the sheet's body that may become a drag down: it does once it moves down with the content at the top.
  let pending: { id: number; x: number; y: number } | null = null;
  const NO_DRAG = 'input, textarea, select, [contenteditable], [role="slider"], [data-no-drag]';
  const canDrag = () => grab.getClientRects().length > 0;

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

  const drive = (e: PointerEvent) => {
    if (pending && e.pointerId === pending.id && !sheet.hasAttribute('data-dragging')) {
      const ddx = e.clientX - pending.x, ddy = e.clientY - pending.y;
      if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) { pending = null; return; }
      if (ddy < -8 || sheet.scrollTop > 0) { pending = null; return; }
      if (ddy <= 8) return;
      y0 = pending.y; t0 = e.timeStamp; pending = null; moved = true; swallow = true;
      try { sheet.setPointerCapture(e.pointerId); } catch { /* the pointer has gone */ }
      sheet.setAttribute('data-dragging', '');
    }
    if (!sheet.hasAttribute('data-dragging')) return;
    dy = e.clientY - y0;
    if (Math.abs(dy) > 4) moved = true;
    const canGrow = detents.length > 0 && sheet.dataset.detent !== detents[detents.length - 1];
    if (dy < 0 && canGrow) { sheet.style.setProperty('--grow', `${-dy}px`); sheet.style.removeProperty('--drag'); sheet.style.removeProperty('--drag-p'); }
    else {
      // Up past the tallest detent the sheet gives a little and no more, so it never feels stuck.
      const d = dy < 0 ? -Math.sqrt(-dy) * 2 : dy;
      sheet.style.setProperty('--drag', `${d}px`); sheet.style.removeProperty('--grow');
      sheet.style.setProperty('--drag-p', String(Math.max(0, Math.min(1, d / Math.max(1, sheet.offsetHeight)))));
    }
  };
  const end = (e: PointerEvent) => {
    pending = null;
    if (!sheet.hasAttribute('data-dragging')) return;
    sheet.removeAttribute('data-dragging');
    if (swallow) setTimeout(() => { swallow = false; }, 0);
    const v = dy / Math.max(1, e.timeStamp - t0);
    sheet.style.removeProperty('--drag');
    sheet.style.removeProperty('--drag-p');
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
    on(grab, 'pointerdown', (e: PointerEvent) => { y0 = e.clientY; t0 = e.timeStamp; dy = 0; moved = false; pending = null; grab.setPointerCapture(e.pointerId); sheet.setAttribute('data-dragging', ''); }),
    // The rest of the sheet: a press that may turn into a drag down (moves from the grabber bubble here too).
    on(sheet, 'pointerdown', (e: PointerEvent) => {
      const t = e.target as Element;
      if (e.button > 0 || grab.contains(t) || t === sheet || !canDrag() || t.closest(NO_DRAG)) return;
      dy = 0; pending = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }),
    on(sheet, 'pointermove', drive),
    on(sheet, 'pointerup', end),
    on(sheet, 'pointercancel', end),
    // A finger pulling down on content already at its top drags the sheet instead of scrolling nothing.
    on(sheet, 'touchmove', (e: TouchEvent) => {
      if (sheet.hasAttribute('data-dragging') || (pending && sheet.scrollTop <= 0 && e.touches[0].clientY > pending.y)) e.preventDefault();
    }, { passive: false }),
    // The click that ends a drag started on a button does not press it.
    on(sheet, 'click', (e: MouseEvent) => { if (swallow && !grab.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation(); } }, { capture: true }),
    // The grabber as a button: a press moves to the next detent (or back to the first); arrows step.
    on(grab, 'click', () => {
      if (moved) { moved = false; return; }
      // Without detents, the grabber's one job is the drag down: as a button, a press closes the sheet.
      if (!detents.length) { if (grab.matches('button')) sheet.close(); return; }
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
