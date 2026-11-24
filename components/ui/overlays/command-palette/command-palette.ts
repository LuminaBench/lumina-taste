import { combine, emit, on, openDialog, type Cleanup, revealInList } from '../../_shared/dom';

/** ⌘K / Ctrl+K command palette in a modal <dialog>: fuzzy filter, grouped results, arrow keys + Enter. */
export function enhance(root: HTMLElement): Cleanup {
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const input = dialog.querySelector<HTMLInputElement>('input')!;
  const options = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')];
  const groups = [...dialog.querySelectorAll<HTMLElement>('[role="group"]')];
  const empty = dialog.querySelector<HTMLElement>('[data-part="empty"]');
  const openBtn = root.querySelector<HTMLElement>('[data-part="open"]');
  let active = 0;
  const visible = () => options.filter((o) => !o.hidden);
  const setActive = (i: number) => {
    const v = visible();
    if (!v.length) { input.removeAttribute('aria-activedescendant'); return; }
    active = (i + v.length) % v.length;
    options.forEach((o) => o.setAttribute('aria-selected', 'false'));
    v[active].setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', v[active].id);
    revealInList(v[active]);
  };
  const match = (q: string, text: string) => {
    // Subsequence match: "gtr" finds "Go to Reports".
    let i = 0;
    for (const ch of text) if (ch === q[i]) i++;
    return i === q.length;
  };
  const filter = () => {
    const q = input.value.trim().toLowerCase();
    for (const o of options) {
      const text = `${o.textContent} ${o.dataset.keywords ?? ''}`.toLowerCase();
      o.hidden = !!q && !text.includes(q) && !match(q.replace(/\s+/g, ''), text);
    }
    groups.forEach((g) => (g.hidden = !g.querySelector('[role="option"]:not([hidden])')));
    if (empty) empty.hidden = visible().length > 0;
    setActive(0);
  };
  const open = () => { if (dialog.open) return; input.value = ''; filter(); openDialog(dialog); input.focus(); };
  const run = (o: HTMLElement) => { dialog.close(); emit(root, { command: o.querySelector('span')?.textContent }); };
  return combine(
    openBtn ? on(openBtn, 'click', open) : () => {},
    on(document, 'keydown', (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k' || e.defaultPrevented) return;
      // In a contained preview, only answer when focus is inside the preview.
      const box = root.closest('[data-contained]');
      if (box && !box.contains(document.activeElement)) return;
      e.preventDefault(); dialog.open ? dialog.close() : open();
    }),
    on(input, 'input', filter),
    on(input, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); const o = visible()[active]; if (o) run(o); }
    }),
    on(dialog, 'click', (e: MouseEvent) => {
      if (e.target === dialog) { dialog.close(); return; } // backdrop click
      const o = (e.target as Element).closest<HTMLElement>('[role="option"]');
      if (o) run(o);
    }),
    on(dialog, 'pointermove', (e: PointerEvent) => { const o = (e.target as Element).closest<HTMLElement>('[role="option"]'); if (o) setActive(visible().indexOf(o)); }),
    on(dialog, 'close', () => openBtn?.focus()),
  );
}
