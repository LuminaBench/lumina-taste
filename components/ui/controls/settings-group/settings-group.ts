import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Settings groups: the search field filters rows by their label and description as you type, hides groups with
 * nothing left, marks the match, and says so when nothing matches. Switches act at once: each change emits
 * lt-change with { label, checked }.
 */
export function enhance(root: HTMLElement): Cleanup {
  const input = root.querySelector<HTMLInputElement>('[data-part="search"] input');
  const empty = part(root, 'empty');
  const rows = $$<HTMLElement>(root, '[data-part="row"]');
  const texts = new Map(rows.map((r) => [r, [...r.querySelectorAll<HTMLElement>('[data-part="label"], [data-part="desc"]')].map((el) => [el, el.textContent ?? ''] as const)]));
  const filter = () => {
    const q = (input?.value ?? '').trim().toLowerCase();
    for (const [row, parts] of texts) {
      const hit = !q || parts.some(([, t]) => t.toLowerCase().includes(q));
      row.hidden = !hit;
      for (const [el, t] of parts) {
        const i = q ? t.toLowerCase().indexOf(q) : -1;
        el.innerHTML = '';
        if (i < 0) el.textContent = t;
        else { el.append(t.slice(0, i)); const m = document.createElement('mark'); m.textContent = t.slice(i, i + q.length); el.append(m, t.slice(i + q.length)); }
      }
    }
    for (const g of $$<HTMLElement>(root, '[data-part="group"]')) g.hidden = !!q && !g.querySelector('[data-part="row"]:not([hidden])');
    if (empty) { empty.hidden = !q || rows.some((r) => !r.hidden); const s = empty.querySelector('span'); if (s) s.textContent = input!.value; }
  };
  return combine(
    input ? on(input, 'input', filter) : () => {},
    input ? on(input, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape' && input.value) { input.value = ''; filter(); } }) : () => {},
    on(root, 'change', (e) => {
      const sw = e.target as HTMLInputElement;
      if (sw.getAttribute('role') !== 'switch') return;
      emit(root, { label: sw.closest('[data-part="row"]')?.querySelector('[data-part="label"]')?.textContent ?? '', checked: sw.checked });
    }),
  );
}
