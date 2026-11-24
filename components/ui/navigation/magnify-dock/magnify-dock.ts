import { combine, on, reducedMotion, type Cleanup } from '../../_shared/dom';

/** macOS-style magnifying dock: each item scales with a cosine falloff from the pointer. Focus also magnifies. */
export function enhance(root: HTMLElement): Cleanup {
  const items = () => [...root.querySelectorAll<HTMLElement>('a')];
  const max = +(root.dataset.magnify ?? 1.6);
  const range = +(root.dataset.range ?? 140);
  const reset = () => { root.removeAttribute('data-active'); items().forEach((a) => a.style.setProperty('--s', '1')); };
  const magnify = (x: number) => {
    if (reducedMotion()) return;
    root.setAttribute('data-active', '');
    for (const a of items()) {
      const r = a.getBoundingClientRect();
      const d = Math.abs(x - (r.left + r.width / 2));
      const t = d > range ? 0 : Math.cos((d / range) * (Math.PI / 2));
      a.style.setProperty('--s', (1 + (max - 1) * t * t).toFixed(3));
    }
  };
  return combine(
    on(root, 'pointermove', (e: PointerEvent) => { if (e.pointerType === 'mouse') magnify(e.clientX); }),
    on(root, 'pointerleave', reset),
    on(root, 'focusin', (e: FocusEvent) => { const r = (e.target as HTMLElement).getBoundingClientRect(); magnify(r.left + r.width / 2); }),
    on(root, 'focusout', (e: FocusEvent) => { if (!root.contains(e.relatedTarget as Node)) reset(); }),
  );
}
