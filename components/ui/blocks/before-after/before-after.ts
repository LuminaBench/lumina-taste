import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/**
 * Before and after: a native range input, invisible over the whole picture, sets --pos: where the divider
 * sits, from the left. Before shows to its left, after to its right (each side a clipped window). Keyboard (arrows, Page Up/Down, Home/End), pointer drag, a tap anywhere and touch all come
 * from the input itself. The labels step aside when the handle reaches them.
 */
export function enhance(root: HTMLElement): Cleanup {
  const range = root.querySelector<HTMLInputElement>('[data-part="range"]');
  const box = root.querySelector<HTMLElement>('[data-part="compare"]');
  if (!range || !box) return () => {};
  const sync = () => {
    const v = Number(range.value);
    box.style.setProperty('--pos', `${v}%`);
    box.dataset.edge = v < 16 ? 'start' : v > 84 ? 'end' : '';
    range.setAttribute('aria-valuetext', v === 0 ? 'All after' : v === 100 ? 'All before' : `${v}% before, ${100 - v}% after`);
  };
  sync();
  return combine(
    on(range, 'input', sync),
    on(range, 'change', () => emit(root, { value: Number(range.value) })),
    on(range, 'pointerdown', () => box.setAttribute('data-dragging', '')),
    on(window, 'pointerup', () => box.removeAttribute('data-dragging')),
  );
}
