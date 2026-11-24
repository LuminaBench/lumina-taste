import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/**
 * Range slider with magnetic detents and a live value bubble. Built on <input type=range>,
 * so keyboard, touch and screen readers work natively. data-detents="0,25,50" data-magnet="3".
 */
export function enhance(root: HTMLElement): Cleanup {
  const input = root.querySelector<HTMLInputElement>('input[type="range"]')!;
  const bubble = root.querySelector<HTMLElement>('[data-part="bubble"]');
  const readout = root.querySelector<HTMLOutputElement>('[data-part="readout"]');
  const ticks = root.querySelector<HTMLElement>('[data-part="ticks"]');
  const unit = root.dataset.unit ?? '';
  const min = +input.min || 0;
  const max = +input.max || 100;
  const detents = (root.dataset.detents ?? '').split(',').filter(Boolean).map(Number);
  const magnet = +(root.dataset.magnet ?? (max - min) * 0.03);
  if (ticks) ticks.innerHTML = detents.map((d) => `<i style="left:${((d - min) / (max - min)) * 100}%"></i>`).join('');
  const render = () => {
    const v = +input.value;
    const ratio = (v - min) / (max - min);
    root.style.setProperty('--pct', `${ratio * 100}%`);
    root.style.setProperty('--ratio', String(ratio));
    const text = `${v}${unit}`;
    if (bubble) bubble.textContent = text;
    if (readout) readout.textContent = text;
    input.setAttribute('aria-valuetext', text);
    ticks?.querySelectorAll('i').forEach((t, i) => t.toggleAttribute('data-on', detents[i] <= v));
  };
  let lastSnap: number | null = null;
  const onInput = (e: Event) => {
    const v = +input.value;
    // Magnetic pull only while dragging; keyboard steps stay exact.
    if (root.hasAttribute('data-dragging')) {
      const near = detents.find((d) => Math.abs(d - v) <= magnet);
      if (near !== undefined) {
        input.value = String(near);
        if (lastSnap !== near) { root.setAttribute('data-snapped', ''); setTimeout(() => root.removeAttribute('data-snapped'), 140); navigator.vibrate?.(4); }
        lastSnap = near;
      } else lastSnap = null;
    }
    render();
    if (e.type === 'change') emit(root, { value: +input.value });
  };
  render();
  return combine(
    on(input, 'input', onInput),
    on(input, 'change', onInput),
    on(input, 'pointerdown', () => root.setAttribute('data-dragging', '')),
    on(document, 'pointerup', () => root.removeAttribute('data-dragging')),
  );
}
