import { emit, type Cleanup } from '../../_shared/dom';
import { menuButton } from '../../_shared/menu';

/** Account / user menu (WAI-ARIA menu button) with an identity header and a separated sign-out. */
export function enhance(root: HTMLElement): Cleanup {
  return menuButton({
    trigger: root.querySelector<HTMLElement>('[data-part="trigger"]')!,
    menu: root.querySelector<HTMLElement>('[data-part="menu"]')!,
    onSelect: (item) => emit(root, { action: item.textContent?.trim() }),
  });
}
