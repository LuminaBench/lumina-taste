import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Sortable data table with sticky header, aria-sort, expandable detail rows and a polite sort announcement. */
export function enhance(root: HTMLElement): Cleanup {
  const table = root.querySelector('table')!;
  const tbody = table.tBodies[0];
  let live = root.querySelector<HTMLElement>('[data-part="live"]');
  if (!live) { live = document.createElement('span'); live.className = 'lt-visually-hidden'; live.dataset.part = 'live'; live.setAttribute('aria-live', 'polite'); root.append(live); }
  const sort = (btn: HTMLElement) => {
    const th = btn.closest('th')!;
    const key = btn.dataset.sort!;
    const numeric = btn.dataset.type === 'number';
    const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    table.querySelectorAll('th[aria-sort]').forEach((h) => h.setAttribute('aria-sort', 'none'));
    th.setAttribute('aria-sort', dir);
    const rows = [...tbody.querySelectorAll<HTMLTableRowElement>('tr[data-row]')].map((r) => [r, r.nextElementSibling?.matches('[data-detail]') ? r.nextElementSibling : null] as const);
    const val = (r: HTMLTableRowElement) => { const c = r.querySelector<HTMLElement>(`[data-k="${key}"]`)!; return numeric ? +(c.dataset.v ?? c.textContent!.replace(/[^\d.-]/g, '')) : c.textContent!.trim().toLowerCase(); };
    rows.sort(([a], [b]) => { const x = val(a), y = val(b); const r = x < y ? -1 : x > y ? 1 : 0; return dir === 'ascending' ? r : -r; });
    for (const [r, d] of rows) { tbody.append(r); if (d) tbody.append(d); }
    live!.textContent = `Sorted by ${btn.textContent!.trim()}, ${dir}`;
    emit(root, { key, dir });
  };
  return combine(
    on(table, 'click', (e: MouseEvent) => {
      const t = e.target as Element;
      const s = t.closest<HTMLElement>('th [data-sort]');
      if (s) return sort(s);
      const x = t.closest<HTMLElement>('[data-part="expand"]');
      if (x) {
        const open = x.getAttribute('aria-expanded') !== 'true';
        x.setAttribute('aria-expanded', String(open));
        const detail = x.closest('tr')!.nextElementSibling as HTMLElement | null;
        if (detail?.matches('[data-detail]')) detail.hidden = !open;
      }
    }),
  );
}
