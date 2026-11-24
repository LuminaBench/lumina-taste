import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

const WORDS = ['', 'Not useful', 'Slightly useful', 'Useful', 'Very useful', 'Essential'];

/** Star rating on native radios: arrows change it, hover previews it, the caption says it in words. */
export function enhance(root: HTMLElement): Cleanup {
  const inputs = $$<HTMLInputElement>(root, 'input[type="radio"]');
  const labels = $$<HTMLLabelElement>(root, '[data-part="star"]');
  const caption = part(root, 'caption');
  const value = () => +(inputs.find((i) => i.checked)?.value ?? 0);
  const paint = (v: number, preview = false) => {
    labels.forEach((l) => l.toggleAttribute('data-on', +l.dataset.v! <= v));
    root.toggleAttribute('data-preview', preview);
    if (caption) caption.textContent = v ? `${v} of 5 · ${WORDS[v]}` : 'Not rated yet';
  };
  paint(value());
  return combine(
    ...labels.map((l) => on(l, 'pointerenter', () => paint(+l.dataset.v!, true))),
    on(part(root, 'stars')!, 'pointerleave', () => paint(value())),
    on(root, 'change', () => { paint(value()); emit(root, { value: value() }); }),
  );
}
