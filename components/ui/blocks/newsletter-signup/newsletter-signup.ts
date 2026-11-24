import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Newsletter form: validates on submit (not while typing), says what went wrong, confirms in place. */
export function enhance(root: HTMLElement): Cleanup {
  const form = part<HTMLFormElement>(root, 'form')!;
  const input = form.querySelector('input')!;
  const msg = part(root, 'msg')!;
  const defaultNote = msg.textContent ?? '';
  const set = (state: 'idle' | 'error' | 'done', text: string) => { form.dataset.state = state; msg.textContent = text; };
  return combine(
    on(form, 'submit', (e) => {
      e.preventDefault();
      if (!input.value.trim()) { input.setAttribute('aria-invalid', 'true'); set('error', 'Enter your email address.'); input.focus(); return; }
      if (!input.checkValidity()) { input.setAttribute('aria-invalid', 'true'); set('error', 'That email looks incomplete, for example name@company.com.'); input.focus(); return; }
      input.removeAttribute('aria-invalid');
      set('done', `Thanks. Check ${input.value} for a confirmation link.`);
      emit(root, { email: input.value });
      input.value = '';
    }),
    on(input, 'input', () => { if (form.dataset.state === 'error') { input.removeAttribute('aria-invalid'); set('idle', defaultNote); } }),
  );
}
