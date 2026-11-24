import { combine, dismissable, emit, fixedOrigin, on, roving, type Cleanup } from '../../_shared/dom';
import { menuExtras } from '../dropdown-menu/dropdown-menu';

/** Context menu at the pointer (right-click, long-press) or at the element (Shift+F10 / ContextMenu key). */
export function enhance(root: HTMLElement): Cleanup {
  const area = root.querySelector<HTMLElement>('[data-part="area"]')!;
  const menu = root.querySelector<HTMLElement>('[data-part="menu"]')!;
  const items = () => [...menu.querySelectorAll<HTMLElement>(':scope > [role^="menuitem"], :scope > [data-part="sub"] > [role="menuitem"]')];
  menu.style.position = 'fixed';
  let undismiss: Cleanup | null = null;
  let press = 0;
  const close = (refocus = true) => {
    if (menu.hidden) return;
    menu.hidden = true;
    area.setAttribute('aria-expanded', 'false');
    undismiss?.(); undismiss = null;
    if (refocus) area.focus();
  };
  const open = (x: number, y: number) => {
    menu.hidden = false;
    area.setAttribute('aria-expanded', 'true');
    const o = fixedOrigin(menu);
    const r = menu.getBoundingClientRect();
    const box = root.closest('[data-contained]')?.getBoundingClientRect() ?? { right: innerWidth, bottom: innerHeight };
    menu.style.left = `${Math.min(x, box.right - r.width - 8) - o.x}px`;
    menu.style.top = `${Math.min(y, box.bottom - r.height - 8) - o.y}px`;
    const list = items();
    list.forEach((i, k) => (i.tabIndex = k === 0 ? 0 : -1));
    list[0]?.focus();
    undismiss?.();
    undismiss = dismissable(menu, () => close(false));
  };
  return combine(
    menuExtras(menu, root),
    on(area, 'contextmenu', (e: MouseEvent) => { e.preventDefault(); open(e.clientX, e.clientY); }),
    on(area, 'keydown', (e: KeyboardEvent) => {
      if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const r = area.getBoundingClientRect();
        open(r.left + 24, r.top + r.height / 2);
      }
    }),
    on(area, 'click', (e: MouseEvent) => { if (e.detail === 0) return; const r = area.getBoundingClientRect(); open(e.clientX || r.left + 24, e.clientY || r.top + 24); }),
    on(area, 'pointerdown', (e: PointerEvent) => { if (e.pointerType === 'touch') press = window.setTimeout(() => open(e.clientX, e.clientY), 500); }),
    on(area, 'pointerup', () => clearTimeout(press)),
    roving(menu, items, { orientation: 'vertical' }),
    on(menu, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') close(); else if (e.key === 'Tab') close(false); }),
    on(menu, 'click', (e: MouseEvent) => {
      const item = (e.target as Element).closest<HTMLElement>('[role="menuitem"]:not([aria-haspopup])');
      if (!item) return;
      emit(root, { action: item.querySelector('span')?.textContent });
      close();
    }),
    on(window, 'scroll', () => close(false), { passive: true, capture: true }),
    () => { undismiss?.(); clearTimeout(press); },
  );
}
