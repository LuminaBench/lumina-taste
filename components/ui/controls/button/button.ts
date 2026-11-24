import { on, type Cleanup } from '../../_shared/dom';

/** Toggle the no-jump loading state on any .lt-btn. */
export function setLoading(btn: HTMLElement, loading: boolean) {
  btn.toggleAttribute('data-loading', loading);
  btn.setAttribute('aria-busy', String(loading));
  if (loading) btn.setAttribute('aria-disabled', 'true');
  else btn.removeAttribute('aria-disabled');
}

/** Demo wiring: buttons marked data-demo-load show the loading state for 1.2s when pressed. */
export function enhance(root: HTMLElement): Cleanup {
  return on(root, 'click', (e: MouseEvent) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-demo-load]');
    if (!b || b.hasAttribute('data-loading')) return;
    setLoading(b, true);
    setTimeout(() => setLoading(b, false), 1200);
  });
}
