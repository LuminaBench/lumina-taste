import { combine, dismissable, emit, on, roving, type Cleanup } from '../../_shared/dom';

/** Split button: main action plus a WAI-ARIA menu button for related actions. */
export function enhance(root: HTMLElement): Cleanup {
  const toggle = root.querySelector<HTMLButtonElement>('[data-part="toggle"]')!;
  const menu = root.querySelector<HTMLElement>('[data-part="menu"]')!;
  const items = () => [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  let undismiss: Cleanup | null = null;
  const close = (refocus = true) => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    undismiss?.(); undismiss = null;
    if (refocus) toggle.focus();
  };
  const open = (focusLast = false) => {
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    const list = items();
    const target = focusLast ? list[list.length - 1] : list[0];
    list.forEach((i) => (i.tabIndex = i === target ? 0 : -1));
    target.focus();
    undismiss = dismissable(root, () => close(false));
  };
  return combine(
    on(toggle, 'click', () => (menu.hidden ? open() : close())),
    on(toggle, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); open(true); }
    }),
    roving(menu, items, { orientation: 'vertical' }),
    on(menu, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Tab') close(e.key === 'Escape'); }),
    on(menu, 'click', (e: MouseEvent) => {
      const item = (e.target as Element).closest<HTMLElement>('[role="menuitem"]');
      if (!item) return;
      emit(root, { action: item.querySelector('strong')?.textContent ?? item.textContent });
      close();
    }),
    () => undismiss?.(),
  );
}
