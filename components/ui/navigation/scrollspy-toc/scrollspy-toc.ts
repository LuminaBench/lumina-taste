import { combine, on, type Cleanup } from '../../_shared/dom';

/**
 * "On this page" rail. Highlights the last heading that has crossed the top 30% of the scroll
 * container, and slides a marker to it. Scroll source: data-scroller selector, a sibling
 * [data-part=scroller], or the window.
 */
export function enhance(root: HTMLElement): Cleanup {
  const links = [...root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const marker = root.querySelector<HTMLElement>('[data-part="marker"]');
  const scroller = (root.dataset.scroller && document.querySelector<HTMLElement>(root.dataset.scroller)) || root.parentElement?.querySelector<HTMLElement>('[data-part="scroller"]') || null;
  const heads = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean) as HTMLElement[];
  const list = root.querySelector('ol, ul')!;
  const setActive = (i: number) => {
    links.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
    const a = links[i];
    if (a && marker) {
      marker.style.setProperty('--y', `${a.offsetTop + (list as HTMLElement).offsetTop}px`);
      marker.style.setProperty('--h', `${a.offsetHeight}px`);
    }
  };
  const update = () => {
    const top = scroller ? scroller.getBoundingClientRect().top : 0;
    const h = scroller ? scroller.clientHeight : innerHeight;
    let idx = 0;
    heads.forEach((el, i) => { if (el.getBoundingClientRect().top - top <= h * 0.3) idx = i; });
    if (scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) idx = heads.length - 1;
    setActive(idx);
  };
  update();
  let raf = 0;
  const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
  return combine(
    on(scroller ?? window, 'scroll', onScroll, { passive: true }),
    on(root, 'click', (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      const el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      if (scroller) scroller.scrollTo({ top: el.offsetTop - scroller.offsetTop - 8 });
      else el.scrollIntoView();
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }),
    () => cancelAnimationFrame(raf),
  );
}
