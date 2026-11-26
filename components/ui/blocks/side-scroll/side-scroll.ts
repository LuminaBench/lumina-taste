import { reducedMotion, type Cleanup } from '../../_shared/dom';

/**
 * Side scroll: on a wide screen, with motion allowed and CSS scroll-driven animations supported, pins the row
 * and sets --travel (how far it must slide) on the section; the slide itself is CSS. Recomputed with a
 * ResizeObserver, never on scroll. When a keyboard user tabs to a link in a row that has slid out of view,
 * the page scrolls to the point where that item is on screen. Everywhere else the row is a native sideways
 * scroller and this does nothing.
 */
export function enhance(root: HTMLElement): Cleanup {
  const pin = root.querySelector<HTMLElement>('[data-part="pin"]');
  const track = root.querySelector<HTMLElement>('[data-part="track"]');
  if (!pin || !track) return () => {};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const timelines = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');
  const contained = !!root.closest('[data-contained]');
  let travel = 0;

  const measure = () => {
    const wide = root.clientWidth > 760;
    const on = wide && timelines && !contained && !reducedMotion() && document.documentElement.dataset.motion !== 'reduced';
    root.toggleAttribute('data-pin', on);
    if (!on) { root.style.removeProperty('--travel'); track.setAttribute('tabindex', '0'); return; }
    // The track is not a scroller while pinned, so it should not be a tab stop.
    track.removeAttribute('tabindex');
    // How far the row must slide: until its last item sits one gutter in from the right edge.
    const last = track.lastElementChild as HTMLElement | null;
    const gutter = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    travel = last ? Math.max(0, Math.round(last.offsetLeft + last.offsetWidth + gutter - pin.clientWidth)) : 0;
    root.style.setProperty('--travel', `${travel}px`);
  };
  const onFocus = (e: FocusEvent) => {
    if (!root.hasAttribute('data-pin') || !travel) return;
    const li = (e.target as HTMLElement).closest('li');
    if (!li) return;
    const style = getComputedStyle(track);
    const pad = parseFloat(style.paddingLeft) || 0;
    const range = root.offsetHeight - innerHeight; // the pinned stretch of scroll
    const p = Math.min(1, Math.max(0, (li.offsetLeft - pad) / travel));
    // The slide runs between 6% and 94% of the pinned stretch (see the CSS animation-range).
    const top = root.getBoundingClientRect().top + scrollY + range * (0.06 + p * 0.88);
    scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  };
  const ro = new ResizeObserver(measure);
  ro.observe(root); ro.observe(track);
  motion.addEventListener('change', measure);
  track.addEventListener('focusin', onFocus);
  measure();
  return () => { ro.disconnect(); motion.removeEventListener('change', measure); track.removeEventListener('focusin', onFocus); root.removeAttribute('data-pin'); root.style.removeProperty('--travel'); track.setAttribute('tabindex', '0'); };
}
