import { $$, combine, dismissable, emit, on, part, roving, type Cleanup } from '../../_shared/dom';

/** Floating action button that fans out labelled actions. A menu: arrows move, Esc closes and returns focus. */
export function enhance(root: HTMLElement): Cleanup {
  const fab = part<HTMLButtonElement>(root, 'fab')!;
  const menu = part(root, 'actions')!;
  const items = () => $$<HTMLButtonElement>(menu, '[role="menuitem"]');
  let undismiss: Cleanup | null = null;
  const set = (open: boolean, focusFirst = false) => {
    fab.setAttribute('aria-expanded', String(open));
    menu.toggleAttribute('data-open', open);
    undismiss?.(); undismiss = null;
    if (open) {
      // Closest action to the button first: it is the one the thumb reaches.
      const list = items();
      list.forEach((b, i) => (b.tabIndex = i === list.length - 1 ? 0 : -1));
      if (focusFirst) list[list.length - 1]?.focus();
      undismiss = dismissable(root.querySelector('.lt-dial') ?? root, () => set(false));
    }
    emit(root, { open });
  };
  return combine(
    on(fab, 'click', () => set(fab.getAttribute('aria-expanded') !== 'true')),
    on(fab, 'keydown', (e: KeyboardEvent) => { if (e.key === 'ArrowUp') { e.preventDefault(); set(true, true); } }),
    roving(menu, items, { orientation: 'vertical' }),
    on(menu, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') { set(false); fab.focus(); } }),
    on(menu, 'click', (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>('[role="menuitem"]');
      if (!b) return;
      emit(root, { action: b.textContent?.trim() });
      set(false);
      fab.focus();
    }),
    () => undismiss?.(),
  );
}
