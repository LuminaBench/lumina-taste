import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

const WORDS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

/** Password field with show/hide, a four-step strength meter and rules that tick as they are met. */
export function enhance(root: HTMLElement): Cleanup {
  const input = root.querySelector<HTMLInputElement>('input')!;
  const reveal = part<HTMLButtonElement>(root, 'reveal')!;
  const strength = part(root, 'strength')!;
  const rules = $$<HTMLElement>(root, '[data-rule]');
  const tests: Record<string, (v: string) => boolean> = {
    len: (v) => v.length >= 12,
    mix: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
    num: (v) => /[\d\W_]/.test(v),
  };
  const sync = () => {
    const v = input.value;
    let met = 0;
    rules.forEach((r) => { const ok = tests[r.dataset.rule!]?.(v) ?? false; r.toggleAttribute('data-ok', ok); if (ok) met++; });
    const score = v.length === 0 ? 0 : Math.max(1, Math.min(4, met + (v.length >= 16 ? 1 : 0)));
    root.dataset.score = String(Math.max(0, score));
    strength.textContent = v ? `Strength: ${WORDS[Math.max(0, score)]}` : '';
    emit(root, { score, rulesMet: met });
  };
  sync();
  return combine(
    on(input, 'input', sync),
    on(reveal, 'click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      reveal.setAttribute('aria-pressed', String(show));
      reveal.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    }),
  );
}
