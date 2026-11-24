import { combine, emit, on, type Cleanup } from '../../_shared/dom';
import { menuButton } from '../../_shared/menu';

/** Submenu + checkbox-item behaviour for any .lt-menu (shared by dropdown and context menus). */
export function menuExtras(menu: HTMLElement, root: HTMLElement): Cleanup {
  let hoverTimer = 0;
  const subs = () => [...menu.querySelectorAll<HTMLElement>('[data-part="sub"]')];
  const closeSubs = (except?: Element) => subs().forEach((s) => {
    if (s === except) return;
    s.querySelector<HTMLElement>('[data-part="submenu"]')!.hidden = true;
    s.querySelector('[aria-haspopup]')!.setAttribute('aria-expanded', 'false');
  });
  const openSub = (sub: HTMLElement, focus: boolean) => {
    closeSubs(sub);
    const sm = sub.querySelector<HTMLElement>('[data-part="submenu"]')!;
    sm.hidden = false;
    sub.querySelector('[aria-haspopup]')!.setAttribute('aria-expanded', 'true');
    // Flip left if the submenu would overflow the viewport.
    sm.style.left = ''; sm.style.right = '';
    if (sm.getBoundingClientRect().right > innerWidth - 8) { sm.style.left = 'auto'; sm.style.right = 'calc(100% + 2px)'; }
    if (focus) { const first = sm.querySelector<HTMLElement>('[role^="menuitem"]'); first?.focus(); }
  };
  return combine(
    on(menu, 'pointerover', (e: PointerEvent) => {
      const item = (e.target as Element).closest<HTMLElement>('[role^="menuitem"]');
      if (!item) return;
      clearTimeout(hoverTimer);
      const sub = item.parentElement?.matches('[data-part="sub"]') ? item.parentElement : null;
      hoverTimer = window.setTimeout(() => (sub ? openSub(sub, false) : !item.closest('[data-part="submenu"]') && closeSubs()), 120);
    }),
    on(menu, 'keydown', (e: KeyboardEvent) => {
      const item = document.activeElement as HTMLElement;
      const sub = item?.parentElement?.matches('[data-part="sub"]') ? item.parentElement : null;
      const inSub = item?.closest<HTMLElement>('[data-part="submenu"]');
      if ((e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') && sub) { e.preventDefault(); e.stopPropagation(); openSub(sub, true); }
      else if ((e.key === 'ArrowLeft' || (e.key === 'Escape' && inSub)) && inSub) {
        e.preventDefault(); e.stopPropagation();
        const owner = inSub.parentElement!.querySelector<HTMLElement>('[aria-haspopup]')!;
        closeSubs(); owner.focus();
      } else if (inSub && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault(); e.stopPropagation();
        const items = [...inSub.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
        const i = items.indexOf(item);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
      }
    }, { capture: true }),
    on(menu, 'click', (e: MouseEvent) => {
      const item = (e.target as Element).closest<HTMLElement>('[role="menuitemcheckbox"]');
      if (item) { e.stopPropagation(); const v = item.getAttribute('aria-checked') !== 'true'; item.setAttribute('aria-checked', String(v)); emit(root, { toggle: item.textContent?.trim(), checked: v }); }
      else if ((e.target as Element).closest('[aria-haspopup]')) { e.stopPropagation(); const sub = (e.target as Element).closest<HTMLElement>('[data-part="sub"]')!; openSub(sub, true); }
    }, { capture: true }),
    () => clearTimeout(hoverTimer),
  );
}

/** Dropdown menu button with checkbox items and a cascading submenu (WAI-ARIA Menu Button + Menu). */
export function enhance(root: HTMLElement): Cleanup {
  const menu = root.querySelector<HTMLElement>('[data-part="menu"]')!;
  return combine(
    menuExtras(menu, root),
    menuButton({
      trigger: root.querySelector<HTMLElement>('[data-part="trigger"]')!,
      menu,
      itemSelector: ':scope > [role^="menuitem"], :scope > [data-part="sub"] > [role="menuitem"]',
      onSelect: (item) => emit(root, { action: item.querySelector('span')?.textContent }),
    }),
  );
}
