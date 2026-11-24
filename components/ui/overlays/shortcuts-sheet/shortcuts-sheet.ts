import { $$, combine, on, openDialog, part, type Cleanup } from '../../_shared/dom';

/** Shortcuts sheet: "?" (outside text fields) opens it; type to filter; Esc closes. */
export function enhance(root: HTMLElement): Cleanup {
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const input = dialog.querySelector<HTMLInputElement>('input')!;
  const open = part<HTMLButtonElement>(root, 'open');
  let close: Cleanup | null = null;
  const show = () => { if (dialog.open) return; input.value = ''; filter(); close = openDialog(dialog); input.focus(); };
  const filter = () => {
    const q = input.value.trim().toLowerCase();
    $$<HTMLElement>(dialog, 'section').forEach((s) => {
      let any = false;
      $$<HTMLElement>(s, 'dl > div').forEach((row) => { const hit = !q || row.textContent!.toLowerCase().includes(q); row.hidden = !hit; if (hit) any = true; });
      s.hidden = !any;
    });
  };
  const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  return combine(
    open ? on(open, 'click', show) : () => {},
    on(document, 'keydown', (e: KeyboardEvent) => { if (e.key === '?' && !typing(e.target) && (!root.closest('[data-contained]') || root.closest('[data-contained]')!.contains(document.activeElement))) { e.preventDefault(); show(); } }),
    on(input, 'input', filter),
    on(part(dialog, 'close')!, 'click', () => dialog.close()),
    on(dialog, 'close', () => { close?.(); close = null; open?.focus(); }),
    () => close?.(),
  );
}
