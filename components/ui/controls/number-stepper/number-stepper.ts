import { clamp, combine, emit, on, type Cleanup } from '../../_shared/dom';

/** − / + stepper around a native number input. Press and hold repeats, accelerating. */
export function enhance(root: HTMLElement): Cleanup {
  const input = root.querySelector<HTMLInputElement>('input')!;
  const dec = root.querySelector<HTMLButtonElement>('[data-part="dec"]')!;
  const inc = root.querySelector<HTMLButtonElement>('[data-part="inc"]')!;
  const min = input.min === '' ? -Infinity : +input.min;
  const max = input.max === '' ? Infinity : +input.max;
  const step = +input.step || 1;
  const sync = () => { dec.disabled = +input.value <= min; inc.disabled = +input.value >= max; };
  const bump = (dir: number) => {
    const next = clamp((+input.value || 0) + dir * step, min, max);
    if (next === +input.value) return;
    input.value = String(next);
    sync();
    emit(root, { value: next });
  };
  let timer = 0;
  const stop = () => clearTimeout(timer);
  const hold = (dir: number) => (e: PointerEvent) => {
    if (e.button !== 0) return;
    bump(dir);
    let delay = 380;
    const tick = () => { bump(dir); delay = Math.max(50, delay * 0.8); timer = window.setTimeout(tick, delay); };
    timer = window.setTimeout(tick, delay);
  };
  sync();
  return combine(
    on(dec, 'pointerdown', hold(-1)), on(inc, 'pointerdown', hold(1)),
    on(dec, 'keydown', (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), bump(-1))),
    on(inc, 'keydown', (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), bump(1))),
    on(document, 'pointerup', stop), on(document, 'pointercancel', stop),
    on(input, 'change', () => { input.value = String(clamp(+input.value || min, min, max)); sync(); emit(root, { value: +input.value }); }),
    stop,
  );
}
