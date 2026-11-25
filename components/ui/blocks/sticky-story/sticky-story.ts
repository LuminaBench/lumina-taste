import type { Cleanup } from '../../_shared/dom';

/**
 * Sticky story: marks the step whose text is nearest the middle of the viewport as data-active, which shows
 * its visual in the pinned column. Without script the first step stays active; on narrow screens every
 * visual is shown under its text and this does nothing visible.
 */
export function enhance(root: HTMLElement): Cleanup {
  const steps = [...root.querySelectorAll<HTMLElement>('[data-part="steps"] > li')];
  const texts = steps.map((li) => li.querySelector<HTMLElement>('[data-part="text"]')).filter((t): t is HTMLElement => !!t);
  if (texts.length < 2) return () => {};
  let raf = 0;
  const update = () => {
    raf = 0;
    const mid = window.innerHeight / 2;
    let best = 0, dist = Infinity;
    texts.forEach((t, i) => { const r = t.getBoundingClientRect(); const d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < dist) { dist = d; best = i; } });
    steps.forEach((li, i) => li.toggleAttribute('data-active', i === best));
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('resize', onScroll);
  update();
  return () => { window.removeEventListener('scroll', onScroll, { capture: true }); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
}
