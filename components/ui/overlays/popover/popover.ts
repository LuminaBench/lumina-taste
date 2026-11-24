import { combine, on, type Cleanup } from '../../_shared/dom';
import { linkAnchor, place } from '../../_shared/position';

/**
 * Popover built on the native Popover API (light dismiss, Esc, top layer for free) and anchored to its
 * invoker with CSS Anchor Positioning, or the JS fallback. Moves focus into the popover on open.
 */
export function enhance(root: HTMLElement): Cleanup {
  const anchor = root.querySelector<HTMLElement>('[data-part="anchor"]') ?? root.querySelector<HTMLElement>('[popovertarget]')!;
  const pop = document.getElementById(anchor.getAttribute('popovertarget')!)!;
  linkAnchor(anchor, pop);
  return combine(
    on(pop, 'toggle', (e: Event) => {
      const open = (e as ToggleEvent).newState === 'open';
      anchor.setAttribute('aria-expanded', String(open));
      if (open) { place(pop, anchor, 'bottom'); pop.querySelector<HTMLElement>('input, button')?.focus(); }
      else if (pop.contains(document.activeElement) || document.activeElement === document.body) anchor.focus();
    }),
  );
}
