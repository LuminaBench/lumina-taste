import type { Cleanup } from '../../_shared/dom';

/**
 * Mobile app bar: with data-size="large" the big title scrolls away and the small centred title fades in.
 * The script only sets data-scrolled (a hairline under the bar, the small title) once the large title has
 * left; layout and stickiness are CSS. Works in the page or in any scrolling panel.
 */
export function enhance(root: HTMLElement): Cleanup {
  const large = root.querySelector<HTMLElement>('[data-part="large"]');
  const row = root.querySelector<HTMLElement>('[data-part="row"]');
  if (!row) return () => {};
  let scroller: HTMLElement | null = null;
  for (let el = root.parentElement; el && el !== document.body; el = el.parentElement) {
    const o = getComputedStyle(el).overflowY;
    if (o === 'auto' || o === 'scroll') { scroller = el; break; }
  }
  // "Scrolled" means the large title has gone under the bar (or, with no large title, any scroll at all).
  const io = new IntersectionObserver(([e]) => root.toggleAttribute('data-scrolled', !e.isIntersecting), { root: scroller, rootMargin: `-${row.offsetHeight + 8}px 0px 0px 0px`, threshold: 0 });
  if (large) { io.observe(large); return () => io.disconnect(); }
  const src: EventTarget = scroller ?? window;
  const onScroll = () => root.toggleAttribute('data-scrolled', (scroller ? scroller.scrollTop : window.scrollY) > 2);
  src.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return () => src.removeEventListener('scroll', onScroll);
}
