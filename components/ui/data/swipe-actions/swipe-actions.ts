import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Swipe actions on list rows: drag right to archive, left to delete (touch or mouse), past 30% of the
 * row width to commit. Every action also has a visible button for mouse and keyboard users.
 */
export function enhance(root: HTMLElement): Cleanup {
  const live = part(root, 'live')!;
  let drag: { row: HTMLElement; x0: number; dx: number } | null = null;
  const commit = (row: HTMLElement, act: 'archive' | 'delete') => {
    const who = row.querySelector('strong')?.textContent ?? 'Message';
    row.setAttribute('data-leaving', '');
    row.addEventListener('animationend', () => row.remove(), { once: true });
    live.textContent = `${act === 'archive' ? 'Archived' : 'Deleted'} message from ${who}.`;
    emit(root, { action: act, from: who });
  };
  const reset = (row: HTMLElement) => { row.removeAttribute('data-dragging'); row.removeAttribute('data-dir'); row.style.removeProperty('--dx'); };
  return combine(
    on(root, 'pointerdown', (e: PointerEvent) => {
      const row = (e.target as Element).closest<HTMLElement>('[data-part="row"]');
      if (!row || (e.target as Element).closest('button')) return;
      drag = { row, x0: e.clientX, dx: 0 };
    }),
    on(document, 'pointermove', (e: PointerEvent) => {
      if (!drag) return;
      drag.dx = e.clientX - drag.x0;
      if (Math.abs(drag.dx) < 6) return;
      drag.row.setAttribute('data-dragging', '');
      drag.row.dataset.dir = drag.dx > 0 ? 'right' : 'left';
      drag.row.style.setProperty('--dx', `${drag.dx}px`);
    }),
    on(document, 'pointerup', () => {
      if (!drag) return;
      const { row, dx } = drag;
      drag = null;
      if (Math.abs(dx) > row.offsetWidth * 0.3) { row.style.setProperty('--dx', `${Math.sign(dx) * row.offsetWidth}px`); row.removeAttribute('data-dragging'); commit(row, dx > 0 ? 'archive' : 'delete'); }
      else reset(row);
    }),
    on(root, 'click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-act]');
      if (b) commit(b.closest<HTMLElement>('[data-part="row"]')!, b.dataset.act as 'archive' | 'delete');
    }),
  );
}
