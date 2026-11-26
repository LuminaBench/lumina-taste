import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

export interface RefreshDetail { done: (label?: string) => void }

/**
 * Pull to refresh. At the top of its scroller, pull the content down past the mark and let go to refresh: the
 * indicator fills as you pull and spins while it works. The button [data-part="refresh"] does the same for
 * keyboard and mouse users. The root fires a cancelable `lt-refresh` event: call `e.preventDefault()` to take
 * charge, then `e.detail.done('Updated 09:41')` when the new data is in. Unclaimed, it finishes on its own.
 */
export function enhance(root: HTMLElement): Cleanup {
  const btn = part(root, 'refresh');
  const when = part(root, 'when');
  const live = part(root, 'live');
  const MARK = 64;
  const scroller = (() => {
    for (let el: HTMLElement | null = root; el && el !== document.body; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if (o === 'auto' || o === 'scroll') return el;
    }
    return document.scrollingElement as HTMLElement;
  })();
  let y0 = 0, pulling = false, mouseId = -1, swallow = false;
  let timer = 0;

  const set = (px: number) => {
    root.style.setProperty('--pull', `${px}px`);
    root.style.setProperty('--p', String(Math.min(1.2, px / MARK)));
    root.dataset.state = px >= MARK ? 'armed' : 'pulling';
  };
  const reset = () => { root.style.removeProperty('--pull'); root.style.removeProperty('--p'); delete root.dataset.state; };
  const finish = (label?: string) => {
    clearTimeout(timer);
    if (root.dataset.state !== 'refreshing') return;
    reset();
    btn?.removeAttribute('aria-disabled');
    if (when) when.textContent = label ?? 'Updated just now';
    if (live) live.textContent = label ?? 'Updated just now';
    emit(root, { state: 'done' });
  };
  const refresh = () => {
    if (root.dataset.state === 'refreshing') return;
    root.style.removeProperty('--pull'); root.style.removeProperty('--p');
    root.dataset.state = 'refreshing';
    btn?.setAttribute('aria-disabled', 'true');
    if (live) live.textContent = 'Refreshing';
    const ev = new CustomEvent<RefreshDetail>('lt-refresh', { bubbles: true, cancelable: true, detail: { done: finish } });
    root.dispatchEvent(ev);
    emit(root, { state: 'refreshing' });
    // Nobody took charge: finish after a beat. A claimed refresh gives up after ten seconds.
    timer = window.setTimeout(() => finish(), ev.defaultPrevented ? 10000 : 900);
  };
  const atTop = () => scroller.scrollTop <= 0;
  const begin = (y: number) => { if (root.dataset.state === 'refreshing' || !atTop()) return false; y0 = y; pulling = false; return true; };
  const move = (y: number) => {
    const dy = y - y0;
    if (!pulling && (dy < 6 || !atTop())) return false;
    pulling = true;
    set(Math.min(120, dy * 0.5));
    return true;
  };
  const release = () => {
    if (!pulling) return;
    pulling = false;
    swallow = true;
    setTimeout(() => { swallow = false; }, 0);
    if (root.dataset.state === 'armed') refresh(); else reset();
  };

  return combine(
    btn ? on(btn, 'click', () => refresh()) : () => {},
    // Touch: own the gesture only while the list is at the top and the finger moves down.
    on(root, 'touchstart', (e: TouchEvent) => { if (e.touches.length === 1 && !begin(e.touches[0].clientY)) y0 = NaN; }, { passive: true }),
    on(root, 'touchmove', (e: TouchEvent) => { if (Number.isNaN(y0) || e.touches.length !== 1) return; if (move(e.touches[0].clientY)) e.preventDefault(); }, { passive: false }),
    on(root, 'touchend', release),
    on(root, 'touchcancel', () => { pulling = false; if (root.dataset.state !== 'refreshing') reset(); }),
    // Mouse: the same pull with a drag, for people trying it on a desktop.
    on(root, 'pointerdown', (e: PointerEvent) => { if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target as Element).closest('button, input, select, textarea')) return; if (begin(e.clientY)) mouseId = e.pointerId; }),
    on(document, 'pointermove', (e: PointerEvent) => { if (e.pointerId === mouseId) move(e.clientY); }),
    on(document, 'pointerup', (e: PointerEvent) => { if (e.pointerId !== mouseId) return; mouseId = -1; release(); }),
    on(root, 'click', (e: MouseEvent) => { if (swallow) { e.preventDefault(); e.stopPropagation(); } }, { capture: true }),
    () => clearTimeout(timer),
  );
}

/** Start a refresh from code (for example after coming back online). */
export function refreshNow(root: HTMLElement) { part(root, 'refresh')?.click(); }
