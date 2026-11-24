import { $$, combine, emit, focusFor, on, type Cleanup } from '../../_shared/dom';

/**
 * Drill-down menu (mobile navigation): each submenu replaces the list and slides in; a back row
 * returns. Focus always lands on the first useful control of the new level.
 */
export function enhance(root: HTMLElement): Cleanup {
  const levels = $$<HTMLElement>(root, '[data-part="level"]');
  const stack: HTMLElement[] = [levels[0]];
  const show = (next: HTMLElement, dir: 'in-right' | 'in-left', cause?: Event) => {
    levels.forEach((l) => { l.hidden = l !== next; l.removeAttribute('data-anim'); });
    void next.offsetWidth;
    next.setAttribute('data-anim', dir);
    const first = next.querySelector<HTMLElement>(dir === 'in-right' ? '[data-part="back"]' : 'a, button');
    focusFor(cause, first);
    emit(root, { level: next.getAttribute('aria-label') });
  };
  return combine(
    on(root, 'click', (e) => {
      const t = e.target as Element;
      const fwd = t.closest<HTMLElement>('[data-part="forward"]');
      if (fwd) {
        const next = root.querySelector<HTMLElement>(`#${fwd.getAttribute('aria-controls')}`);
        if (next) { stack.push(next); show(next, 'in-right', e); }
        return;
      }
      if (t.closest('[data-part="back"]') && stack.length > 1) {
        const from = stack.pop()!;
        const prev = stack[stack.length - 1];
        show(prev, 'in-left', e);
        focusFor(e, prev.querySelector<HTMLElement>(`[aria-controls="${from.id}"]`));
      }
    }),
    on(root, 'keydown', (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'ArrowLeft') && stack.length > 1) { e.preventDefault(); stack[stack.length - 1].querySelector<HTMLElement>('[data-part="back"]')?.click(); }
      if (e.key === 'ArrowRight') { const f = (document.activeElement as Element | null)?.closest<HTMLElement>('[data-part="forward"]'); if (f) { e.preventDefault(); f.click(); } }
    }),
  );
}
