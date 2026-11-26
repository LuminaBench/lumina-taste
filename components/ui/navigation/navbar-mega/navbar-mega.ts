import { combine, dismissable, on, type Cleanup } from '../../_shared/dom';

/** Top navbar with a disclosure-style mega dropdown (APG disclosure navigation) and a mobile menu. */
export function enhance(root: HTMLElement): Cleanup {
  const trigger = root.querySelector<HTMLButtonElement>('[data-part="mega-trigger"]')!;
  const mega = root.querySelector<HTMLElement>('[data-part="mega"]')!;
  const burger = root.querySelector<HTMLButtonElement>('[data-part="burger"]')!;
  let undismiss: Cleanup | null = null;
  const setMega = (open: boolean) => {
    mega.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    undismiss?.(); undismiss = null;
    if (open) undismiss = dismissable(root, () => setMega(false));
  };
  let hoverTimer = 0;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  return combine(
    on(trigger, 'click', () => setMega(mega.hidden !== false)),
    on(trigger, 'pointerenter', () => { if (fine.matches && !root.hasAttribute('data-open')) { clearTimeout(hoverTimer); hoverTimer = window.setTimeout(() => setMega(true), 120); } }),
    on(root, 'pointerleave', () => { clearTimeout(hoverTimer); if (fine.matches && !root.hasAttribute('data-open')) hoverTimer = window.setTimeout(() => setMega(false), 220); }),
    on(mega, 'pointerenter', () => clearTimeout(hoverTimer)),
    on(root, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape' && !mega.hidden) { setMega(false); trigger.focus(); } }),
    on(root, 'focusout', (e: FocusEvent) => { if (!root.contains(e.relatedTarget as Node)) setMega(false); }),
    on(burger, 'click', () => {
      const open = !root.hasAttribute('data-open');
      root.toggleAttribute('data-open', open);
      burger.setAttribute('aria-expanded', String(open));
      if (!open) setMega(false);
    }),
    () => { clearTimeout(hoverTimer); undismiss?.(); },
  );
}
