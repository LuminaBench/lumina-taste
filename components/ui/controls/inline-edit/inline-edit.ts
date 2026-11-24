import { combine, emit, focusFor, on, part, type Cleanup } from '../../_shared/dom';

/** Click-to-edit text: the pencil swaps the label for an input; Enter saves, Esc or blur-cancel restores. */
export function enhance(root: HTMLElement): Cleanup {
  const view = part(root, 'view')!;
  const form = part<HTMLFormElement>(root, 'form')!;
  const value = part(root, 'value')!;
  const edit = part<HTMLButtonElement>(root, 'edit')!;
  const input = form.querySelector('input')!;
  const open = () => { input.value = value.textContent ?? ''; view.hidden = true; form.hidden = false; input.focus(); input.select(); };
  const close = (e?: Event) => { form.hidden = true; view.hidden = false; focusFor(e, edit); };
  return combine(
    on(edit, 'click', open),
    on(view, 'dblclick', open),
    on(form, 'submit', (e) => {
      e.preventDefault();
      const next = input.value.trim();
      if (!next) { input.setAttribute('aria-invalid', 'true'); return; }
      input.removeAttribute('aria-invalid');
      const changed = next !== value.textContent;
      value.textContent = next;
      close(e);
      if (changed) { root.removeAttribute('data-saved'); void root.offsetWidth; root.setAttribute('data-saved', ''); emit(root, { value: next }); }
    }),
    on(part(root, 'cancel')!, 'click', close),
    on(input, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(e); } }),
  );
}
