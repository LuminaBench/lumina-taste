import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Before/after slider: a transparent native range drives a clip-path, so keyboard and touch work for free. */
export function enhance(root: HTMLElement): Cleanup {
  const range = part<HTMLInputElement>(root, 'range')!;
  const sync = () => { root.style.setProperty('--pos', `${range.value}%`); range.setAttribute('aria-valuetext', `${range.value}% after`); };
  sync();
  return combine(
    on(range, 'input', sync),
    on(range, 'change', () => emit(root, { value: +range.value })),
  );
}
