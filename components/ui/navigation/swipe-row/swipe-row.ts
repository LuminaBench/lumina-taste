import { combine, emit, focusFor, on, part, parts, type Cleanup } from '../../_shared/dom';

/**
 * Swipe rows: drag a row towards the leading edge to reveal its actions, which stay open until one is pressed
 * or the row is tapped. One row is open at a time. The keyboard (and switch, and voice) path is a real button
 * in each row, [data-part="more"], that opens the same actions and moves focus into them; Escape closes.
 * Pressing an action emits lt-change { action, id } and announces it; the page decides what it does.
 */
export function enhance(root: HTMLElement): Cleanup {
  const live = part(root, 'live');
  let open: HTMLElement | null = null;
  let drag: { row: HTMLElement; x0: number; y0: number; base: number; dx: number; t0: number; axis: '' | 'x' | 'y' } | null = null;
  let swallowClick = false;
  const actionsOf = (row: HTMLElement) => part(row, 'actions');
  const widthOf = (row: HTMLElement) => actionsOf(row)?.offsetWidth ?? 0;

  const setOpen = (row: HTMLElement, yes: boolean) => {
    const acts = actionsOf(row);
    const more = part(row, 'more');
    row.style.removeProperty('--dx');
    row.toggleAttribute('data-open', yes);
    if (acts) acts.inert = !yes;
    more?.setAttribute('aria-expanded', String(yes));
    if (yes) { if (open && open !== row) setOpen(open, false); open = row; }
    else if (open === row) open = null;
  };
  for (const row of parts(root, 'row')) {
    part(row, 'main')?.setAttribute('draggable', 'false');
    row.style.setProperty('--actions', String(actionsOf(row)?.querySelectorAll('button').length ?? 0));
    // A row marked data-open in the markup starts open (to show people the actions are there).
    setOpen(row, row.hasAttribute('data-open'));
  }

  return combine(
    on(root, 'pointerdown', (e: PointerEvent) => {
      const t = e.target as Element;
      const row = t.closest<HTMLElement>('[data-part="row"]');
      if (!row || t.closest('[data-part="more"], [data-part="actions"]') || e.button > 0) return;
      drag = { row, x0: e.clientX, y0: e.clientY, base: row === open ? -widthOf(row) : 0, dx: 0, t0: e.timeStamp, axis: '' };
    }),
    on(document, 'pointermove', (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.axis) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        if (Math.abs(dx) < 8) return;
        drag.axis = 'x';
        drag.row.setAttribute('data-dragging', '');
        if (open && open !== drag.row) setOpen(open, false);
      }
      drag.dx = dx;
      const w = widthOf(drag.row);
      let x = drag.base + dx;
      // Rubber band past either end, so the row never feels stuck or loose.
      if (x > 0) x *= 0.2;
      else if (x < -w) x = -w + (x + w) * 0.3;
      drag.row.style.setProperty('--dx', `${x}px`);
    }),
    on(document, 'pointerup', (e: PointerEvent) => {
      if (!drag) return;
      const { row, base, dx, t0, axis } = drag;
      drag = null;
      if (axis !== 'x') return;
      row.removeAttribute('data-dragging');
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
      const v = dx / Math.max(1, e.timeStamp - t0);
      setOpen(row, v < -0.45 || (v <= 0.45 && base + dx < -widthOf(row) / 2));
    }),
    on(document, 'pointercancel', () => { if (drag) { drag.row.removeAttribute('data-dragging'); setOpen(drag.row, drag.row === open); drag = null; } }),
    on(root, 'click', (e: MouseEvent) => {
      const t = e.target as Element;
      const more = t.closest<HTMLElement>('[data-part="more"]');
      const act = t.closest<HTMLElement>('[data-part="actions"] button');
      const row = t.closest<HTMLElement>('[data-part="row"]');
      if (!row) return;
      if (more) {
        const yes = row !== open;
        setOpen(row, yes);
        if (yes) focusFor(e, actionsOf(row)?.querySelector<HTMLElement>('button'));
        return;
      }
      if (act) {
        const action = act.dataset.action ?? act.textContent?.trim() ?? '';
        const label = act.textContent?.trim() ?? action;
        setOpen(row, false);
        if (live) live.textContent = `${label}: ${part(row, 'title')?.textContent?.trim() ?? ''} ${part(row, 'lead')?.textContent?.trim() ?? ''}`.trim();
        // Keyboard users go back to where they started; the page may also remove the row on this event.
        if (e.detail === 0) part<HTMLElement>(row, 'more')?.focus();
        emit(root, { action, id: row.dataset.id ?? null });
        return;
      }
      // A drag, or a tap on a row while one is open, never follows the link underneath.
      if (swallowClick || open) { e.preventDefault(); e.stopPropagation(); if (open) setOpen(open, false); }
    }, { capture: true }),
    on(root, 'keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !open) return;
      const row = open;
      e.preventDefault();
      setOpen(row, false);
      part<HTMLElement>(row, 'more')?.focus();
    }),
    on(document, 'pointerdown', (e: PointerEvent) => { if (open && !open.contains(e.target as Node)) setOpen(open, false); }),
  );
}

/** Remove a row with a short collapse (instant under reduced motion). */
export function removeRow(row: HTMLElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { row.remove(); return; }
  row.setAttribute('data-leaving', '');
  row.addEventListener('animationend', () => row.remove(), { once: true });
}
