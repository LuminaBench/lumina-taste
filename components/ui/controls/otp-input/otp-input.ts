import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** One-time-code input: auto-advance, paste distributes digits, Backspace walks back, arrows move. */
export function enhance(root: HTMLElement): Cleanup {
  const inputs = [...root.querySelectorAll<HTMLInputElement>('input')];
  const status = root.querySelector<HTMLElement>('[data-part="status"]');
  const expected = root.dataset.expected; // optional demo/validation hook
  const value = () => inputs.map((i) => i.value).join('');
  const check = () => {
    const v = value();
    inputs.forEach((i) => i.toggleAttribute('data-filled', !!i.value));
    if (v.length < inputs.length) { delete root.dataset.state; if (status) status.textContent = ''; return; }
    const ok = !expected || v === expected;
    root.dataset.state = ok ? 'complete' : 'error';
    if (status) status.textContent = ok ? 'Code accepted.' : 'That code is not right. Check the latest message and try again.';
    emit(root, { value: v, complete: ok });
  };
  const fill = (start: number, text: string) => {
    const digits = text.replace(/\D/g, '').split('');
    let i = start;
    for (const d of digits) { if (i >= inputs.length) break; inputs[i++].value = d; }
    inputs[Math.min(i, inputs.length - 1)].focus();
    check();
  };
  return combine(
    ...inputs.map((input, i) =>
      combine(
        on(input, 'input', () => {
          const v = input.value.replace(/\D/g, '');
          if (v.length > 1) return fill(i, v);
          input.value = v;
          if (v && inputs[i + 1]) inputs[i + 1].focus();
          check();
        }),
        on(input, 'keydown', (e: KeyboardEvent) => {
          if (e.key === 'Backspace' && !input.value && inputs[i - 1]) { e.preventDefault(); inputs[i - 1].value = ''; inputs[i - 1].focus(); check(); }
          else if (e.key === 'ArrowLeft' && inputs[i - 1]) { e.preventDefault(); inputs[i - 1].focus(); }
          else if (e.key === 'ArrowRight' && inputs[i + 1]) { e.preventDefault(); inputs[i + 1].focus(); }
        }),
        on(input, 'paste', (e: ClipboardEvent) => { e.preventDefault(); fill(i, e.clipboardData?.getData('text') ?? ''); }),
        on(input, 'focus', () => input.select()),
      ),
    ),
  );
}
