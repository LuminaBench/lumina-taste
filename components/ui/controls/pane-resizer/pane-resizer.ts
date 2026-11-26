import { clamp, combine, emit, on, type Cleanup } from '../../_shared/dom';

/**
 * A pane edge you drag to resize (WAI-ARIA window splitter). It writes one CSS custom property, in px, on the
 * element named by data-target (a selector; default: its parent), so the layout stays in CSS:
 *   data-var="--inspector-w"  the property to set     aria-valuemin / aria-valuemax / aria-valuenow  limits and start
 *   data-edge="end"           the pane after the edge grows when the edge moves towards the start (an inspector);
 *   data-edge="start"         the pane before it grows when the edge moves towards the end (a sidebar).
 *   data-persist="key"        remembers the size in localStorage.
 * Keys: arrows ±16px, Shift ±64px, Home and End jump to the limits, Enter (or a double click) restores the start.
 */
export function enhance(root: HTMLElement): Cleanup {
  const vertical = root.getAttribute('aria-orientation') !== 'horizontal';
  const target = (root.dataset.target ? document.querySelector<HTMLElement>(root.dataset.target) : null) ?? root.parentElement!;
  const prop = root.dataset.var ?? '--pane-size';
  const min = +(root.getAttribute('aria-valuemin') ?? 120);
  const max = +(root.getAttribute('aria-valuemax') ?? 640);
  const initial = +(root.getAttribute('aria-valuenow') ?? 320);
  const sign = root.dataset.edge === 'start' ? 1 : -1;
  const key = root.dataset.persist ? `lt-resizer:${root.dataset.persist}` : '';
  let now = initial, start = 0, from = 0;

  const set = (px: number, announce = true) => {
    now = Math.round(clamp(px, min, max));
    target.style.setProperty(prop, `${now}px`);
    root.setAttribute('aria-valuenow', String(now));
    root.setAttribute('aria-valuetext', `${now} pixels`);
    if (announce) {
      emit(root, { size: now });
      if (key) try { localStorage.setItem(key, String(now)); } catch { /* storage unavailable */ }
    }
  };
  let saved = NaN;
  if (key) try { saved = +(localStorage.getItem(key) ?? NaN); } catch { /* storage unavailable */ }
  set(Number.isFinite(saved) && saved > 0 ? saved : initial, false);
  const pos = (e: PointerEvent) => (vertical ? e.clientX : e.clientY);
  const stop = () => { root.removeAttribute('data-dragging'); document.documentElement.removeAttribute('data-resizing'); };

  return combine(
    on(root, 'pointerdown', (e: PointerEvent) => {
      if (e.button > 0) return;
      e.preventDefault();
      root.setPointerCapture(e.pointerId);
      root.setAttribute('data-dragging', '');
      document.documentElement.setAttribute('data-resizing', vertical ? 'col' : 'row');
      start = pos(e); from = now;
    }),
    on(root, 'pointermove', (e: PointerEvent) => { if (root.hasAttribute('data-dragging')) set(from + sign * (pos(e) - start)); }),
    on(root, 'pointerup', stop),
    on(root, 'pointercancel', stop),
    on(root, 'dblclick', () => set(initial)),
    on(root, 'keydown', (e: KeyboardEvent) => {
      const step = e.shiftKey ? 64 : 16;
      const grow = vertical ? (sign > 0 ? 'ArrowRight' : 'ArrowLeft') : (sign > 0 ? 'ArrowDown' : 'ArrowUp');
      const shrink = vertical ? (sign > 0 ? 'ArrowLeft' : 'ArrowRight') : (sign > 0 ? 'ArrowUp' : 'ArrowDown');
      const map: Record<string, number> = { [grow]: now + step, [shrink]: now - step, Home: min, End: max, Enter: initial };
      if (!(e.key in map)) return;
      e.preventDefault();
      set(map[e.key]);
    }),
  );
}
