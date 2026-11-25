import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Contact form: validates on submit, marks each invalid field and says which ones need attention. */
export function enhance(root: HTMLElement): Cleanup {
  const form = part<HTMLFormElement>(root, 'form');
  const msg = part(root, 'msg');
  // A contact section without a form (just the address and an email link) needs no script.
  if (!form || !msg) return () => {};
  return combine(
    on(form, 'submit', (e) => {
      e.preventDefault();
      const fields = $$<HTMLInputElement | HTMLTextAreaElement>(form, 'input, textarea');
      const bad = fields.filter((f) => !f.value.trim() || !f.checkValidity());
      fields.forEach((f) => (bad.includes(f) ? f.setAttribute('aria-invalid', 'true') : f.removeAttribute('aria-invalid')));
      if (bad.length) {
        form.dataset.state = 'error';
        msg.textContent = `Please fill in: ${bad.map((f) => f.closest('label')?.firstChild?.textContent?.trim().toLowerCase()).join(', ')}.`;
        bad[0].focus();
        return;
      }
      form.dataset.state = 'sent';
      msg.textContent = 'Sent. We will reply within one working day.';
      emit(root, Object.fromEntries(new FormData(form)) as Record<string, string>);
      form.reset();
    }),
  );
}
