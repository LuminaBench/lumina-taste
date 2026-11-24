import { $$, combine, emit, on, roving, type Cleanup } from '../../_shared/dom';

/** Kind tabs filter the result rows; arrows move between tabs. */
export function enhance(root: HTMLElement): Cleanup {
  const tabs = $$<HTMLButtonElement>(root, '[role="tab"]');
  const rows = $$<HTMLElement>(root, 'ol > li');
  const select = (t: HTMLButtonElement) => {
    tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
    const k = t.dataset.kind ?? 'all';
    rows.forEach((r) => (r.hidden = k !== 'all' && (r.querySelector('[data-part="kind"]')?.textContent ?? '').toLowerCase() !== k));
    emit(root, { kind: k });
  };
  const bar = root.querySelector<HTMLElement>('[role="tablist"]');
  return combine(
    ...tabs.map((t) => on(t, 'click', () => select(t))),
    bar ? roving(bar, () => tabs, { orientation: 'horizontal', onMove: (el) => select(el as HTMLButtonElement) }) : () => {},
  );
}
