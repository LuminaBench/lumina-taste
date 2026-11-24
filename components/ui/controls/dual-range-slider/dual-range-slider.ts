import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Two native ranges on one track. The thumbs keep a minimum gap and never cross. */
export function enhance(root: HTMLElement): Cleanup {
  const [lo, hi] = [...root.querySelectorAll<HTMLInputElement>('input[type="range"]')];
  const readout = root.querySelector<HTMLOutputElement>('[data-part="readout"]');
  const gap = +(root.dataset.gap ?? 0);
  const prefix = root.dataset.prefix ?? '';
  const min = +lo.min, max = +lo.max;
  const fmt = (v: number) => `${prefix}${v.toLocaleString('en-GB')}`;
  const render = (moved?: HTMLInputElement) => {
    let a = +lo.value, b = +hi.value;
    if (b - a < gap) {
      if (moved === lo) { a = b - gap; lo.value = String(a); } else { b = a + gap; hi.value = String(b); }
    }
    root.style.setProperty('--lo-r', String((a - min) / (max - min)));
    root.style.setProperty('--hi-r', String((b - min) / (max - min)));
    lo.setAttribute('aria-valuetext', fmt(a));
    hi.setAttribute('aria-valuetext', fmt(b));
    if (readout) readout.textContent = `${fmt(a)} – ${fmt(b)}`;
    // Keep the most recently moved thumb on top when they meet.
    if (moved) { lo.style.zIndex = moved === lo ? '2' : '1'; hi.style.zIndex = moved === hi ? '2' : '1'; }
    return [a, b];
  };
  render();
  return combine(
    ...[lo, hi].map((input) => on(input, 'input', () => render(input))),
    ...[lo, hi].map((input) => on(input, 'change', () => { const [a, b] = render(input); emit(root, { min: a, max: b }); })),
  );
}
