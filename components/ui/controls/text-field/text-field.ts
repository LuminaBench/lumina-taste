import { combine, emit, on, type Cleanup } from '../../_shared/dom';

const messageFor = (input: HTMLInputElement) => {
  const v = input.validity;
  const name = input.labels?.[0]?.textContent?.toLowerCase() ?? 'this field';
  if (v.valueMissing) return `Enter your ${name}.`;
  if (v.typeMismatch && input.type === 'email') return 'Use a full address, like name@company.com.';
  if (v.tooShort) return `Use at least ${input.minLength} characters.`;
  if (v.patternMismatch) return input.title || 'Check the format.';
  return input.validationMessage;
};

/** Inline validation: validate on blur, re-validate live once a field has been touched. */
export function enhance(root: HTMLElement): Cleanup {
  const fields = [...root.querySelectorAll<HTMLElement>('.lt-field')];
  const validate = (field: HTMLElement) => {
    const input = field.querySelector('input')!;
    const msg = field.querySelector<HTMLElement>('[data-part="message"]')!;
    const ok = input.checkValidity();
    field.dataset.state = ok ? 'valid' : 'invalid';
    input.setAttribute('aria-invalid', String(!ok));
    msg.textContent = ok ? msg.dataset.help ?? '' : messageFor(input);
    return ok;
  };
  return combine(
    ...fields.map((field) => {
      const input = field.querySelector('input')!;
      return combine(
        on(input, 'blur', () => { if (input.value || field.dataset.state) validate(field); }),
        on(input, 'input', () => { if (field.dataset.state) validate(field); }),
      );
    }),
    on(root, 'submit', (e: Event) => {
      e.preventDefault();
      const ok = fields.map(validate).every(Boolean);
      if (!ok) fields.find((f) => f.dataset.state === 'invalid')?.querySelector('input')?.focus();
      emit(root, { valid: ok });
    }),
  );
}
