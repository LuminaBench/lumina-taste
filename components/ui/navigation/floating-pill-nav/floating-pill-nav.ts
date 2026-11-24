import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Floating pill nav: a soft highlight glides under the hovered or focused link and rests on the current one. */
export function enhance(root: HTMLElement): Cleanup {
  const hl = root.querySelector<HTMLElement>('[data-part="hover"]')!;
  const links = () => [...root.querySelectorAll<HTMLAnchorElement>('a:not([data-part="cta"])')];
  const moveTo = (a?: HTMLElement | null) => {
    if (!a) { hl.style.setProperty('--o', '0'); return; }
    hl.style.setProperty('--x', `${a.offsetLeft}px`);
    hl.style.setProperty('--w', `${a.offsetWidth}px`);
    hl.style.setProperty('--o', '1');
  };
  const rest = () => moveTo(links().find((a) => a.getAttribute('aria-current') === 'true'));
  rest();
  return combine(
    on(root, 'pointerover', (e: PointerEvent) => moveTo((e.target as Element).closest<HTMLElement>('a:not([data-part="cta"])') ?? undefined)),
    on(root, 'pointerleave', rest),
    on(root, 'focusin', (e: FocusEvent) => moveTo((e.target as Element).closest<HTMLElement>('a:not([data-part="cta"])'))),
    on(root, 'focusout', rest),
    on(root, 'click', (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a:not([data-part="cta"])');
      if (!a) return;
      links().forEach((x) => (x === a ? x.setAttribute('aria-current', 'true') : x.removeAttribute('aria-current')));
      rest();
      emit(root, { href: a.getAttribute('href') });
    }),
  );
}
