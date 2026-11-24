import { combine, dismissable, on, roving, type Cleanup } from './dom';

export interface MenuButtonOptions {
  trigger: HTMLElement;
  menu: HTMLElement;
  itemSelector?: string;
  orientation?: 'vertical' | 'both';
  onSelect?: (item: HTMLElement) => void;
}

/** WAI-ARIA menu button: Enter/Space/↓ opens on the first item, ↑ on the last, Esc closes and refocuses. */
export function menuButton({ trigger, menu, itemSelector = '[role="menuitem"]', orientation = 'vertical', onSelect }: MenuButtonOptions): Cleanup {
  const items = () => [...menu.querySelectorAll<HTMLElement>(itemSelector)];
  let undismiss: Cleanup | null = null;
  const isOpen = () => !menu.hidden;
  const close = (refocus = true) => {
    if (!isOpen()) return;
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    undismiss?.(); undismiss = null;
    if (refocus) trigger.focus();
  };
  const open = (last = false) => {
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    const list = items();
    const target = last ? list[list.length - 1] : list[0];
    list.forEach((i) => (i.tabIndex = i === target ? 0 : -1));
    target?.focus();
    undismiss = dismissable(menu.parentElement ?? menu, () => close(false), [trigger]);
  };
  return combine(
    on(trigger, 'click', () => (isOpen() ? close() : open())),
    on(trigger, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); open(true); }
    }),
    roving(menu, items, { orientation }),
    on(menu, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') close(false);
    }),
    on(menu, 'click', (e: MouseEvent) => {
      const item = (e.target as Element).closest<HTMLElement>('[role="menuitem"]');
      if (!item || !menu.contains(item) || item.hasAttribute('aria-haspopup') || item.getAttribute('aria-disabled') === 'true') return;
      onSelect?.(item);
      close();
    }),
    () => undismiss?.(),
  );
}
