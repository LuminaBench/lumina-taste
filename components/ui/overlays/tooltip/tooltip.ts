import { combine, on, type Cleanup } from '../../_shared/dom';
import { linkAnchor, place, type Side } from '../../_shared/position';

/**
 * Tooltips for every [aria-describedby] → [role=tooltip][popover] pair under root.
 * Opens on hover (after a short delay) and on keyboard focus; Esc hides; never steals focus.
 */
export function enhance(root: HTMLElement): Cleanup {
  const pairs = [...root.querySelectorAll<HTMLElement>('[aria-describedby]')]
    .map((anchor) => [anchor, document.getElementById(anchor.getAttribute('aria-describedby')!)] as const)
    .filter((p): p is readonly [HTMLElement, HTMLElement] => !!p[1]?.matches('[role="tooltip"]'));
  let warm = 0; // once one tooltip is open, neighbours open instantly
  return combine(
    ...pairs.map(([anchor, tip]) => {
      linkAnchor(anchor, tip);
      let t = 0;
      const show = (delay: number) => {
        clearTimeout(t);
        t = window.setTimeout(() => {
          if (!tip.matches(':popover-open')) tip.showPopover();
          place(tip, anchor, (tip.dataset.side as Side) ?? 'top');
          warm = Date.now();
        }, Date.now() - warm < 400 ? 0 : delay);
      };
      const hide = () => { clearTimeout(t); if (tip.matches(':popover-open')) { tip.hidePopover(); warm = Date.now(); } };
      return combine(
        on(anchor, 'pointerenter', (e: PointerEvent) => e.pointerType === 'mouse' && show(450)),
        on(anchor, 'pointerleave', hide),
        on(anchor, 'focus', () => anchor.matches(':focus-visible') && show(0)),
        on(anchor, 'blur', hide),
        on(anchor, 'pointerdown', hide),
        on(document, 'keydown', (e: KeyboardEvent) => e.key === 'Escape' && hide()),
        () => clearTimeout(t),
      );
    }),
  );
}
