import { combine, on, reducedMotion, type Cleanup } from '../../_shared/dom';

/** Subtle cursor-follow spotlight for every .lt-spotlight under root (mouse only; off under reduced motion). */
export function enhance(root: HTMLElement): Cleanup {
  const cards = root.matches('.lt-spotlight') ? [root] : [...root.querySelectorAll<HTMLElement>('.lt-spotlight')];
  return combine(
    ...cards.map((c) => combine(
      on(c, 'pointermove', (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || reducedMotion()) return;
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', `${e.clientX - r.left}px`);
        c.style.setProperty('--my', `${e.clientY - r.top}px`);
        c.style.setProperty('--o', '1');
      }),
      on(c, 'pointerleave', () => c.style.setProperty('--o', '0')),
    )),
  );
}
