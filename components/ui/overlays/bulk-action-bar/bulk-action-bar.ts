import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Row-selection bulk action bar: appears when rows are ticked, Esc or ✕ clears, focus never gets lost. */
export function enhance(root: HTMLElement): Cleanup {
  const all = root.querySelector<HTMLInputElement>('[data-part="all"]');
  const rows = () => [...root.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')];
  const bar = root.querySelector<HTMLElement>('[data-part="bar"]')!;
  const count = root.querySelector<HTMLElement>('[data-part="count"]')!;
  const sync = () => {
    const n = rows().filter((r) => r.checked).length;
    bar.hidden = n === 0;
    count.textContent = `${n} selected`;
    if (all) { all.checked = n === rows().length; all.indeterminate = n > 0 && n < rows().length; }
  };
  const clear = () => {
    const hadFocus = bar.contains(document.activeElement);
    rows().forEach((r) => (r.checked = false));
    sync();
    if (hadFocus) (all ?? rows()[0])?.focus();
  };
  return combine(
    // Safari does not focus a ticked checkbox: focus it so Esc (clear the selection) works straight after.
    on(root, 'change', (e: Event) => { const t = e.target as HTMLElement; if (t instanceof HTMLInputElement && document.activeElement !== t) t.focus({ preventScroll: true }); if (all && e.target === all) rows().forEach((r) => (r.checked = all.checked)); sync(); }),
    on(bar, 'click', (e: MouseEvent) => {
      const b = (e.target as Element).closest<HTMLElement>('button');
      if (!b) return;
      if (b.dataset.part === 'clear') return clear();
      emit(root, { action: b.dataset.action, rows: rows().filter((r) => r.checked).map((r) => r.closest('tr')!.cells[1].textContent) });
    }),
    on(root, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape' && !bar.hidden) clear(); }),
  );
}
