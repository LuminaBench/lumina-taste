import { combine, emit, on, part, reducedMotion, type Cleanup } from '../../_shared/dom';

/**
 * Back-to-top button for a scroll container (or the page when [data-part="scroller"] is missing):
 * appears after 40% of a screen, its ring shows how far you have read, click returns to the top
 * and moves focus to the first heading so keyboard users land somewhere sensible.
 */
export function enhance(root: HTMLElement): Cleanup {
  const scroller = part(root, 'scroller');
  const btn = part<HTMLButtonElement>(root, 'button')!;
  const target: HTMLElement | Window = scroller ?? window;
  const metrics = () => scroller ? [scroller.scrollTop, scroller.scrollHeight - scroller.clientHeight, scroller.clientHeight] : [scrollY, document.documentElement.scrollHeight - innerHeight, innerHeight];
  let raf = 0;
  const update = () => {
    raf = 0;
    const [top, max, view] = metrics();
    btn.hidden = top < view * 0.4;
    btn.style.setProperty('--p', String(max > 0 ? Math.round((top / max) * 100) : 0));
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  update();
  return combine(
    on(target, 'scroll', schedule, { passive: true }),
    on(btn, 'click', () => {
      const behavior: ScrollBehavior = reducedMotion() ? 'auto' : 'smooth';
      if (scroller) scroller.scrollTo({ top: 0, behavior }); else scrollTo({ top: 0, behavior });
      const heading = (scroller ?? document).querySelector<HTMLElement>('h1, h2, h3');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      emit(root, { top: true });
    }),
    () => cancelAnimationFrame(raf),
  );
}
