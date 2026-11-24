import { $$, combine, emit, on, part, roving, type Cleanup } from '../../_shared/dom';

/** Monthly / yearly switch that swaps every [data-monthly]/[data-yearly] text inside the component. */
export function enhance(root: HTMLElement): Cleanup {
  const group = part(root, 'switch')!;
  const radios = $$<HTMLButtonElement>(group, '[role="radio"]');
  const ind = part(group, 'indicator')!;
  const place = () => {
    const cur = radios.find((r) => r.getAttribute('aria-checked') === 'true') ?? radios[0];
    ind.style.setProperty('--x', `${cur.offsetLeft - 3}px`);
    ind.style.setProperty('--w', `${cur.offsetWidth}px`);
  };
  const select = (btn: HTMLButtonElement, fire = true) => {
    radios.forEach((r) => { const on = r === btn; r.setAttribute('aria-checked', String(on)); r.tabIndex = on ? 0 : -1; });
    const period = btn.dataset.period as 'monthly' | 'yearly';
    $$<HTMLElement>(root, '[data-monthly]').forEach((el) => {
      const next = el.dataset[period]!;
      if (el.textContent === next) return;
      el.textContent = next;
      if (el.hasAttribute('data-price')) { el.removeAttribute('data-swap'); void el.offsetWidth; el.setAttribute('data-swap', ''); }
    });
    place();
    if (fire) emit(root, { period });
  };
  select(radios.find((r) => r.getAttribute('aria-checked') === 'true') ?? radios[0], false);
  requestAnimationFrame(() => root.setAttribute('data-ready', ''));
  const ro = new ResizeObserver(place);
  ro.observe(group);
  return combine(
    ...radios.map((r) => on(r, 'click', () => select(r))),
    roving(group, () => radios, { orientation: 'horizontal', onMove: (el) => select(el as HTMLButtonElement) }),
    () => ro.disconnect(),
  );
}
