import { clamp, combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Resizable two-pane layout (WAI-ARIA Window Splitter): drag, arrows (±2%), Shift+arrows (±10%), Home/End, double-click reset. */
export function enhance(root: HTMLElement): Cleanup {
  const grip = root.querySelector<HTMLElement>('[data-part="grip"]')!;
  const min = +(grip.getAttribute('aria-valuemin') ?? 20);
  const max = +(grip.getAttribute('aria-valuemax') ?? 80);
  const initial = +(grip.getAttribute('aria-valuenow') ?? 50);
  const set = (pct: number) => {
    const v = Math.round(clamp(pct, min, max));
    root.style.setProperty('--split', `${v}%`);
    grip.setAttribute('aria-valuenow', String(v));
    emit(root, { split: v });
  };
  const fromPointer = (e: PointerEvent) => { const r = root.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
  return combine(
    on(grip, 'pointerdown', (e: PointerEvent) => { grip.setPointerCapture(e.pointerId); grip.setAttribute('data-dragging', ''); }),
    on(grip, 'pointermove', (e: PointerEvent) => { if (grip.hasAttribute('data-dragging')) fromPointer(e); }),
    on(grip, 'pointerup', () => grip.removeAttribute('data-dragging')),
    on(grip, 'dblclick', () => set(initial)),
    on(grip, 'keydown', (e: KeyboardEvent) => {
      const now = +grip.getAttribute('aria-valuenow')!;
      const step = e.shiftKey ? 10 : 2;
      const m: Record<string, number> = { ArrowLeft: now - step, ArrowRight: now + step, Home: min, End: max, Enter: initial };
      if (e.key in m) { e.preventDefault(); set(m[e.key]); }
    }),
  );
}
