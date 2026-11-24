import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Mobile bottom navigation (≤ 5 items) with a sliding active pill. */
export function enhance(root: HTMLElement): Cleanup {
  const pill = root.querySelector<HTMLElement>('[data-part="pill"]')!;
  const items = () => [...root.querySelectorAll<HTMLAnchorElement>('a')];
  if (items().length > 5) console.warn('lumina-taste bottom-nav: use 5 items or fewer; move the rest into a "More" sheet.');
  const place = () => {
    const cur = items().find((a) => a.getAttribute('aria-current') === 'page');
    if (!cur) return;
    pill.style.setProperty('--x', `${cur.offsetLeft - 6}px`);
    pill.style.setProperty('--w', `${cur.offsetWidth}px`);
  };
  place();
  requestAnimationFrame(() => root.setAttribute('data-ready', ''));
  const ro = new ResizeObserver(place);
  ro.observe(root);
  return combine(
    on(root, 'click', (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a');
      if (!a) return;
      if (root.dataset.router !== 'native') e.preventDefault();
      items().forEach((x) => (x === a ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current')));
      place();
      emit(root, { href: a.getAttribute('href') });
    }),
    () => ro.disconnect(),
  );
}
