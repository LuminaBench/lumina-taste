import { combine, emit, on, roving, type Cleanup } from '../../_shared/dom';

/** Tabs (WAI-ARIA Tabs, automatic activation) with a sliding underline indicator. */
export function enhance(root: HTMLElement): Cleanup {
  const list = root.querySelector<HTMLElement>('[role="tablist"]')!;
  const tabs = () => [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
  const ind = list.querySelector<HTMLElement>('[data-part="indicator"]');
  const place = () => {
    const t = tabs().find((x) => x.getAttribute('aria-selected') === 'true');
    if (t && ind) { ind.style.setProperty('--x', `${t.offsetLeft}px`); ind.style.setProperty('--w', `${t.offsetWidth}px`); }
  };
  const select = (tab: HTMLElement) => {
    for (const t of tabs()) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = root.querySelector<HTMLElement>(`#${CSS.escape(t.getAttribute('aria-controls')!)}`);
      if (panel) panel.hidden = !on;
    }
    place();
    emit(root, { tab: tab.id });
  };
  place();
  requestAnimationFrame(() => root.setAttribute('data-ready', ''));
  const ro = new ResizeObserver(place);
  ro.observe(list);
  return combine(
    on(list, 'click', (e: MouseEvent) => { const t = (e.target as Element).closest<HTMLElement>('[role="tab"]'); if (t) select(t); }),
    roving(list, tabs, { orientation: 'horizontal', onMove: select }),
    () => ro.disconnect(),
  );
}
