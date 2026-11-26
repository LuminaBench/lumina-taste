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

/** One gentle shake (CSS: data-shake, lt-shake in tokens/scroll.css). Restarted if it is already shaking. */
export function shake(field: HTMLElement) {
  field.removeAttribute('data-shake');
  void field.offsetWidth; // restart the animation
  field.setAttribute('data-shake', '');
  const done = () => field.removeAttribute('data-shake');
  field.addEventListener('animationend', done, { once: true });
  window.setTimeout(done, 700);
}

/** Inline validation: validate on blur, re-validate live once a field has been touched. A field that fails a
 *  check on blur or submit shakes once; one that fails while being typed in does not. */
export function enhance(root: HTMLElement): Cleanup {
  const fields = [...root.querySelectorAll<HTMLElement>('.lt-field')];
  const validate = (field: HTMLElement, loud = false) => {
    const input = field.querySelector('input')!;
    const msg = field.querySelector<HTMLElement>('[data-part="message"]')!;
    const ok = input.checkValidity();
    field.dataset.state = ok ? 'valid' : 'invalid';
    input.setAttribute('aria-invalid', String(!ok));
    msg.textContent = ok ? msg.dataset.help ?? '' : messageFor(input);
    if (!ok && loud) shake(field);
    return ok;
  };
  return combine(
    ...fields.map((field) => {
      const input = field.querySelector('input')!;
      return combine(
        on(input, 'blur', () => { if (input.value || field.dataset.state) validate(field, true); }),
        on(input, 'input', () => { if (field.dataset.state) validate(field); }),
      );
    }),
    on(root, 'submit', (e: Event) => {
      e.preventDefault();
      const ok = fields.map((f) => validate(f, true)).every(Boolean);
      if (!ok) fields.find((f) => f.dataset.state === 'invalid')?.querySelector('input')?.focus();
      emit(root, { valid: ok });
    }),
  );
}
