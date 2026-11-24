import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Magic-link sign-in: validate on submit, then confirm in place. Sending the email is up to the app. */
export function enhance(root: HTMLElement): Cleanup {
  const form = part<HTMLFormElement>(root, 'form')!;
  const input = form.querySelector('input')!;
  const msg = part(root, 'msg')!;
  return combine(
    on(form, 'submit', (e) => {
      e.preventDefault();
      if (!input.value.trim() || !input.checkValidity()) {
        form.dataset.state = 'error';
        input.setAttribute('aria-invalid', 'true');
        msg.textContent = input.value.trim() ? 'That email looks incomplete, for example name@company.com.' : 'Enter your work email.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      form.dataset.state = 'sent';
      msg.textContent = `Check ${input.value} for a sign-in link. It works for 15 minutes.`;
      emit(root, { email: input.value });
    }),
    on(input, 'input', () => { if (form.dataset.state === 'error') { form.dataset.state = ''; input.removeAttribute('aria-invalid'); msg.textContent = ''; } }),
  );
}
