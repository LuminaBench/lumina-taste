import { reducedMotion, type Cleanup } from '../../_shared/dom';

/**
 * Side scroll: on a wide screen, with motion allowed and CSS scroll-driven animations supported, pins the row
 * and sets --travel (how far it must slide) on the section; the slide itself is CSS. Recomputed with a
 * ResizeObserver, never on scroll. When a keyboard user tabs to a link in a row that has slid out of view,
 * the page scrolls to the point where that item is on screen. Everywhere else the row is a native sideways
 * scroller: on a screen wider than a phone it shows whole cards inside the margins, and this adds Previous and Next
 * buttons that page through it (disabled at either end), or marks the row data-fits when it needs no scrolling.
 * data-paged on the section keeps it a paged row even where it could be pinned (a price list is not a moment).
 */
export function enhance(root: HTMLElement): Cleanup {
  const pin = root.querySelector<HTMLElement>('[data-part="pin"]');
  const track = root.querySelector<HTMLElement>('[data-part="track"]');
  if (!pin || !track) return () => {};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const timelines = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');
  const contained = !!root.closest('[data-contained]');
  const paged = root.hasAttribute('data-paged');
  let travel = 0;

  // Previous and Next, made here so every copy of the part (HTML, React, a composed page) has them.
  const ICON = (d: string) => `<svg class="lt-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  let nav = root.querySelector<HTMLElement>('[data-part="nav"]');
  const made = !nav;
  if (!nav) {
    nav = document.createElement('div');
    nav.setAttribute('data-part', 'nav');
    nav.innerHTML = `<button type="button" class="lt-btn" data-variant="secondary" data-icon-only data-dir="-1" aria-label="Previous">${ICON('M15 6l-6 6 6 6')}</button><button type="button" class="lt-btn" data-variant="secondary" data-icon-only data-dir="1" aria-label="Next">${ICON('M9 6l6 6-6 6')}</button>`;
    pin.append(nav);
  }
  const buttons = [...nav.querySelectorAll<HTMLButtonElement>('button[data-dir]')];
  const sync = () => {
    const max = track.scrollWidth - track.clientWidth;
    root.toggleAttribute('data-fits', max < 4);
    const at = Math.abs(track.scrollLeft);
    buttons.forEach((b) => { b.disabled = b.dataset.dir === '-1' ? at < 4 : at > max - 4; });
  };
  const page = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-dir]');
    if (!b) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const rtl = getComputedStyle(track).direction === 'rtl' ? -1 : 1;
    track.scrollBy({ left: Number(b.dataset.dir) * rtl * (track.clientWidth + gap), behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  nav.addEventListener('click', page);
  track.addEventListener('scroll', sync, { passive: true });

  const measure = () => {
    const wide = root.clientWidth > 760;
    const on = wide && timelines && !contained && !paged && !reducedMotion() && document.documentElement.dataset.motion !== 'reduced';
    root.toggleAttribute('data-pin', on);
    if (!on) { root.style.removeProperty('--travel'); track.setAttribute('tabindex', '0'); sync(); return; }
    // The track is not a scroller while pinned, so it should not be a tab stop.
    track.removeAttribute('tabindex');
    // How far the row must slide: until its last item sits one gutter in from the right edge.
    const last = track.lastElementChild as HTMLElement | null;
    const gutter = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    travel = last ? Math.max(0, Math.round(last.offsetLeft + last.offsetWidth + gutter - pin.clientWidth)) : 0;
    root.style.setProperty('--travel', `${travel}px`);
  };
  const onFocus = (e: FocusEvent) => {
    const li = (e.target as HTMLElement).closest('li');
    if (!li) return;
    // Paged: bring the whole card into the row's view (snap-scrolling rows do not always do it for a link inside one).
    if (!root.hasAttribute('data-pin')) { li.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' as ScrollBehavior }); return; }
    if (!travel) return;
    const style = getComputedStyle(track);
    const pad = parseFloat(style.paddingLeft) || 0;
    const range = root.offsetHeight - innerHeight; // the pinned stretch of scroll
    const p = Math.min(1, Math.max(0, (li.offsetLeft - pad) / travel));
    // The slide runs between 6% and 94% of the pinned stretch (see the CSS animation-range).
    const top = root.getBoundingClientRect().top + scrollY + range * (0.06 + p * 0.88);
    scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  };
  // Measured on the next frame: --travel changes the section's height, which WebKit reports as a ResizeObserver loop.
  let raf = 0;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
  ro.observe(root); ro.observe(track);
  motion.addEventListener('change', measure);
  track.addEventListener('focusin', onFocus);
  measure();
  return () => { cancelAnimationFrame(raf); ro.disconnect(); motion.removeEventListener('change', measure); track.removeEventListener('focusin', onFocus); track.removeEventListener('scroll', sync); nav!.removeEventListener('click', page); if (made) nav!.remove(); root.removeAttribute('data-pin'); root.removeAttribute('data-fits'); root.style.removeProperty('--travel'); track.setAttribute('tabindex', '0'); };
}
