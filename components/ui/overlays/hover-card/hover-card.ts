import { combine, on, type Cleanup } from '../../_shared/dom';
import { linkAnchor, place } from '../../_shared/position';

/** Hover/preview card: opens after 350ms hover or on keyboard focus, stays open while the pointer is over it. */
export function enhance(root: HTMLElement): Cleanup {
  const anchor = root.querySelector<HTMLElement>('[data-part="anchor"]')!;
  const card = document.getElementById(anchor.getAttribute('aria-describedby')!)!;
  linkAnchor(anchor, card);
  let t = 0;
  const show = (delay: number) => { clearTimeout(t); t = window.setTimeout(() => { if (!card.matches(':popover-open')) card.showPopover(); place(card, anchor, 'bottom'); }, delay); };
  const hide = (delay = 180) => { clearTimeout(t); t = window.setTimeout(() => card.matches(':popover-open') && card.hidePopover(), delay); };
  return combine(
    on(anchor, 'pointerenter', (e: PointerEvent) => e.pointerType === 'mouse' && show(350)),
    on(anchor, 'pointerleave', () => hide()),
    on(card, 'pointerenter', () => clearTimeout(t)),
    on(card, 'pointerleave', () => hide()),
    on(anchor, 'focus', () => show(0)),
    on(anchor, 'blur', () => hide(0)),
    on(document, 'keydown', (e: KeyboardEvent) => e.key === 'Escape' && hide(0)),
    () => clearTimeout(t),
  );
}
