import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Danger zone: destructive action opens an inline confirm that needs the workspace name typed. */
export function enhance(root: HTMLElement): Cleanup {
  const open = part<HTMLButtonElement>(root, 'open')!;
  const form = part<HTMLFormElement>(root, 'confirm')!;
  const input = form.querySelector('input')!;
  const go = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const msg = part(root, 'msg')!;
  const word = form.querySelector('code')?.textContent ?? 'delete';
  return combine(
    on(open, 'click', () => { form.hidden = false; open.disabled = true; input.focus(); }),
    on(part(form, 'cancel')!, 'click', () => { form.hidden = true; open.disabled = false; input.value = ''; go.disabled = true; open.focus(); }),
    on(input, 'input', () => { go.disabled = input.value.trim() !== word; }),
    on(form, 'submit', (e) => { e.preventDefault(); if (go.disabled) return; form.hidden = true; msg.textContent = 'Workspace scheduled for deletion. You have 7 days to restore it from Settings.'; emit(root, { deleted: true }); }),
  );
}
