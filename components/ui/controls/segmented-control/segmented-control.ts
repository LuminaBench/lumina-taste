import { combine, emit, on, roving, type Cleanup } from '../../_shared/dom';

/** Sliding pill toggle (radiogroup). The indicator glides on a spring; arrows move and select. */
export function enhance(root: HTMLElement): Cleanup {
  const options = () => [...root.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const indicator = root.querySelector<HTMLElement>('[data-part="indicator"]')!;
  const place = () => {
    const sel = options().find((o) => o.getAttribute('aria-checked') === 'true');
    if (!sel) return;
    indicator.style.setProperty('--x', `${sel.offsetLeft}px`);
    indicator.style.setProperty('--w', `${sel.offsetWidth}px`);
  };
  const select = (btn: HTMLButtonElement) => {
    options().forEach((o) => { o.setAttribute('aria-checked', String(o === btn)); o.tabIndex = o === btn ? 0 : -1; });
    place();
    emit(root, { value: btn.dataset.value });
  };
  place();
  requestAnimationFrame(() => root.setAttribute('data-ready', ''));
  const ro = new ResizeObserver(place);
  ro.observe(root);
  return combine(
    on(root, 'click', (e: MouseEvent) => {
      const b = (e.target as Element).closest<HTMLButtonElement>('[role="radio"]');
      if (b) select(b);
    }),
    roving(root, options, { orientation: 'horizontal', onMove: (el) => select(el as HTMLButtonElement) }),
    () => ro.disconnect(),
  );
}
