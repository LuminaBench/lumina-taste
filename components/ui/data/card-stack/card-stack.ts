import { on, reducedMotion, type Cleanup } from '../../_shared/dom';

/** Scroll-stacking card pile: sticky cards pile up; cards buried under later ones recede slightly. */
export function enhance(root: HTMLElement): Cleanup {
  const scroller = root.closest<HTMLElement>('[data-part="scroller"]');
  const target: HTMLElement | Window = scroller ?? window;
  const cards = [...root.querySelectorAll<HTMLElement>(':scope > li')];
  let raf = 0;
  const update = () => {
    if (reducedMotion()) return;
    const tops = cards.map((c) => c.getBoundingClientRect().top);
    cards.forEach((c, i) => {
      // Depth = how many later cards are already overlapping this one.
      const depth = tops.slice(i + 1).filter((t) => t < tops[i] + c.offsetHeight - 20).length;
      c.style.setProperty('--depth', String(depth));
    });
  };
  update();
  return on(target, 'scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
}
