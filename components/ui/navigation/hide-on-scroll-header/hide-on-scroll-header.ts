import { on, type Cleanup } from '../../_shared/dom';

/**
 * Hide-on-scroll sticky header. Hides after scrolling down past `data-threshold` px (default 8),
 * reveals on any upward scroll. Scroll source: nearest [data-part="scroller"] ancestor, else window.
 */
export function enhance(root: HTMLElement): Cleanup {
  const scroller = root.closest<HTMLElement>('[data-part="scroller"]');
  const target: HTMLElement | Window = scroller ?? window;
  const y = () => (scroller ? scroller.scrollTop : window.scrollY);
  const threshold = +(root.dataset.threshold ?? 8);
  let last = y();
  let ticking = false;
  const update = () => {
    ticking = false;
    const now = y();
    const delta = now - last;
    root.toggleAttribute('data-scrolled', now > 4);
    if (root.contains(document.activeElement)) { root.removeAttribute('data-hidden'); last = now; return; }
    if (now < root.offsetHeight) root.removeAttribute('data-hidden');
    else if (delta > threshold) root.setAttribute('data-hidden', '');
    else if (delta < -threshold / 2) root.removeAttribute('data-hidden');
    if (Math.abs(delta) > threshold / 2) last = now;
  };
  return on(target, 'scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
}
