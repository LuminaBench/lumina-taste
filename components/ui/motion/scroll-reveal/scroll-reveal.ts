import { reducedMotion, type Cleanup } from '../../_shared/dom';

/** One-time reveal for every .lt-reveal under root. Uses the nearest [data-part=scroller] as the viewport if present. */
export function enhance(root: HTMLElement): Cleanup {
  const els = [...root.querySelectorAll<HTMLElement>('.lt-reveal')];
  if (reducedMotion() || !('IntersectionObserver' in window)) return () => {};
  const scroller = root.matches('[data-part="scroller"]') ? root : root.closest<HTMLElement>('[data-part="scroller"]');
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).setAttribute('data-revealed', ''); io.unobserve(e.target); } }),
    { root: scroller, rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
  );
  els.forEach((el, i) => { el.setAttribute('data-armed', ''); el.style.transitionDelay = `${Math.min(i, 3) * 40}ms`; io.observe(el); });
  return () => io.disconnect();
}
