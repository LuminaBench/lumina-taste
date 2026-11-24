import { combine, emit, on, type Cleanup } from '../../_shared/dom';
import { menuButton } from '../../_shared/menu';

/** 9-dot app launcher: menu button whose items form a 3-column grid (arrows move in 2D). */
export function enhance(root: HTMLElement): Cleanup {
  const trigger = root.querySelector<HTMLElement>('[data-part="trigger"]')!;
  const panel = root.querySelector<HTMLElement>('[data-part="panel"]')!;
  const cols = 3;
  return combine(
    menuButton({ trigger, menu: panel, orientation: 'both', onSelect: (i) => emit(root, { app: i.textContent?.trim() }) }),
    // Up/Down jump a whole row in the grid.
    on(panel, 'keydown', (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]')];
      const i = items.indexOf(document.activeElement as HTMLElement);
      const j = i + (e.key === 'ArrowDown' ? cols : -cols);
      if (i < 0 || j < 0 || j >= items.length) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      items.forEach((x, k) => (x.tabIndex = k === j ? 0 : -1));
      items[j].focus();
    }, { capture: true }),
  );
}
