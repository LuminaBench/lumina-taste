import type { Cleanup } from '../../_shared/dom';

/**
 * Reading progress: a thin bar that fills as the reader scrolls. It follows the nearest scrolling ancestor,
 * or the page. data-target="#article" measures one element instead (0 when its top reaches the viewport
 * top, 1 when its bottom does). Decoration only: it is aria-hidden, the scrollbar already says the same.
 */
export function enhance(root: HTMLElement): Cleanup {
  const scroller = (() => {
    for (let el = root.parentElement; el && el !== document.body; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    }
    return null;
  })();
  const target = root.dataset.target ? document.querySelector<HTMLElement>(root.dataset.target) : null;
  let raf = 0;
  const update = () => {
    raf = 0;
    let p = 0;
    if (target) {
      const r = target.getBoundingClientRect();
      p = -r.top / Math.max(1, r.height - window.innerHeight);
    } else if (scroller) p = scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    else p = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty('--p', String(Math.min(1, Math.max(0, p)).toFixed(4)));
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  const src: EventTarget = scroller ?? window;
  src.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
  return () => { src.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
}
