import { combine, emit, focusFor, on, part, trapFocus, type Cleanup } from '../../_shared/dom';

/**
 * Hamburger menu for small screens: the icon morphs into a close mark, the panel covers the content
 * below the bar, focus stays inside while open, Esc or a link click closes it.
 */
export function enhance(root: HTMLElement): Cleanup {
  const toggle = part<HTMLButtonElement>(root, 'toggle')!;
  const panel = part(root, 'panel')!;
  let untrap: Cleanup | null = null;
  const set = (open: boolean, e?: Event) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    panel.hidden = !open;
    untrap?.(); untrap = null;
    if (open) { untrap = trapFocus(root); focusFor(e, panel.querySelector<HTMLElement>('a')); }
    emit(root, { open });
  };
  return combine(
    on(toggle, 'click', (e) => set(toggle.getAttribute('aria-expanded') !== 'true', e)),
    on(root, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape' && !panel.hidden) { set(false); toggle.focus(); } }),
    on(panel, 'click', (e) => { if ((e.target as Element).closest('a')) set(false); }),
    () => untrap?.(),
  );
}
