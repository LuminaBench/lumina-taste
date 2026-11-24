import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Page list with first/last, neighbours of the current page and ellipses. Always ≤ 7 slots. */
export function pageSlots(page: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, null, total];
  if (page >= total - 3) return [1, null, total - 4, total - 3, total - 2, total - 1, total];
  return [1, null, page - 1, page, page + 1, null, total];
}

export function enhance(root: HTMLElement): Cleanup {
  const list = root.querySelector<HTMLElement>('[data-part="pages"]')!;
  const prev = root.querySelector<HTMLButtonElement>('[data-part="prev"]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-part="next"]')!;
  const summary = root.querySelector<HTMLElement>('[data-part="summary"]');
  const total = +(root.dataset.total ?? 1);
  const perPage = +(root.dataset.perPage ?? 25);
  let page = +(root.dataset.page ?? 1);
  const render = (focus = false) => {
    list.innerHTML = pageSlots(page, total)
      .map((p) => (p === null ? '<li data-part="gap" aria-hidden="true">…</li>' : `<li><button type="button" data-page="${p}" aria-label="Page ${p}"${p === page ? ' aria-current="page"' : ''}>${p}</button></li>`))
      .join('');
    prev.disabled = page === 1;
    next.disabled = page === total;
    root.dataset.page = String(page);
    if (summary) {
      const rows = +(root.dataset.rows ?? total * perPage);
      summary.textContent = `Showing ${((page - 1) * perPage + 1).toLocaleString()}–${Math.min(page * perPage, rows).toLocaleString()} of ${rows.toLocaleString()}`;
    }
    if (focus) list.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
  };
  const go = (p: number, focus = false) => { page = Math.max(1, Math.min(total, p)); render(focus); emit(root, { page }); };
  render();
  return combine(
    on(prev, 'click', () => go(page - 1)),
    on(next, 'click', () => go(page + 1)),
    on(list, 'click', (e: MouseEvent) => { const b = (e.target as Element).closest<HTMLElement>('[data-page]'); if (b) go(+b.dataset.page!, true); }),
  );
}
