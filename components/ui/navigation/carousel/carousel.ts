import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Scroll-snap carousel: native horizontal scrolling (touch, trackpad, Shift+wheel, arrow keys on the
 * focused track) with Previous/Next buttons and dots kept in sync. Never auto-advances.
 */
export function enhance(root: HTMLElement): Cleanup {
  const track = part(root, 'track')!;
  const slides = $$<HTMLElement>(track, '[data-part="slide"]');
  const dots = $$<HTMLButtonElement>(root, '[data-part="dot"]');
  const prev = part<HTMLButtonElement>(root, 'prev')!, next = part<HTMLButtonElement>(root, 'next')!;
  const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth);
  let raf = 0, last = -1;
  const sync = () => {
    raf = 0;
    const i = Math.round(track.scrollLeft / step());
    dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    if (i !== last) { last = i; emit(root, { index: i }); }
  };
  const go = (i: number) => track.scrollTo({ left: Math.max(0, i) * step() });
  sync();
  return combine(
    on(track, 'scroll', () => { if (!raf) raf = requestAnimationFrame(sync); }, { passive: true }),
    on(prev, 'click', () => track.scrollBy({ left: -step() })),
    on(next, 'click', () => track.scrollBy({ left: step() })),
    ...dots.map((d, i) => on(d, 'click', () => go(i))),
    on(track, 'keydown', (e: KeyboardEvent) => {
      if (e.target !== track) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: e.key === 'ArrowRight' ? step() : -step() }); }
    }),
    () => cancelAnimationFrame(raf),
  );
}
