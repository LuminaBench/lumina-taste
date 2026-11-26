import { reducedMotion, type Cleanup } from '../../_shared/dom';

/**
 * Sticky story. Chooses how the scene shows (see the top of sticky-story.css):
 * - motion allowed and the block wider than 760px: data-pin. Where CSS scroll-driven animations exist the
 *   cross-fade is pure CSS and this script does nothing more. Elsewhere it adds data-io and an
 *   IntersectionObserver marks the step crossing the middle of the screen as data-active.
 * - inside a preview box ([data-contained], not inert), where nothing scrolls: data-play, steps take turns.
 * - otherwise (reduced motion, narrow, no script): rows or stacked, everything visible and still.
 * Never reads layout on scroll.
 */
export function enhance(root: HTMLElement): Cleanup {
  const steps = [...root.querySelectorAll<HTMLElement>('[data-part="steps"] > li')];
  if (steps.length < 2) return () => {};
  root.style.setProperty('--steps', String(steps.length));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const timelines = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');
  const contained = !!root.closest('[data-contained]');
  const preview = contained && !root.closest('[inert]');
  let io: IntersectionObserver | null = null;
  let timer = 0;
  let wide = false;

  const activate = (i: number) => steps.forEach((li, k) => li.toggleAttribute('data-active', k === i));
  const stop = () => { io?.disconnect(); io = null; clearInterval(timer); timer = 0; };
  const apply = () => {
    stop();
    const still = reducedMotion() || document.documentElement.dataset.motion === 'reduced' || !wide || (contained && !preview);
    root.toggleAttribute('data-pin', !still);
    root.toggleAttribute('data-play', !still && contained);
    root.toggleAttribute('data-io', !still && !contained && !timelines);
    if (still) { activate(0); return; }
    if (contained) {
      // A preview box: show each step in turn, pausing while the pointer or focus is inside.
      let i = 0;
      activate(0);
      timer = window.setInterval(() => { if (!root.matches(':hover, :focus-within')) activate((i = (i + 1) % steps.length)); }, 2600);
    } else if (!timelines) {
      io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) activate(steps.indexOf(e.target.closest('li') as HTMLElement));
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach((li) => { const t = li.querySelector('[data-part="text"]'); if (t) io!.observe(t); });
    }
  };
  // Re-laid out on the next frame, not inside the observer: switching layouts resizes the observed root, which
  // WebKit reports as a ResizeObserver loop error.
  let raf = 0;
  const ro = new ResizeObserver(([e]) => { const w = e.contentRect.width > 760; if (w !== wide) { wide = w; cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); } });
  ro.observe(root);
  motion.addEventListener('change', apply);
  return () => { stop(); cancelAnimationFrame(raf); ro.disconnect(); motion.removeEventListener('change', apply); ['data-pin', 'data-play', 'data-io'].forEach((a) => root.removeAttribute(a)); };
}
