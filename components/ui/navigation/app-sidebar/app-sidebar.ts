import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/**
 * Collapsible app sidebar. Remembers its state (data-persist key) and collapses itself below 560px of container,
 * or below data-collapse-below (in px: 1100 keeps a tablet's two panes roomy while the sidebar is a rail of icons).
 */
export function enhance(root: HTMLElement): Cleanup {
  const btn = root.querySelector<HTMLButtonElement>('[data-part="collapse"]')!;
  const key = root.dataset.persist;
  const set = (collapsed: boolean, user = false) => {
    root.toggleAttribute('data-collapsed', collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    root.querySelectorAll<HTMLAnchorElement>('nav a').forEach((a) => (collapsed ? a.setAttribute('title', a.textContent!.trim()) : a.removeAttribute('title')));
    if (user && key) try { localStorage.setItem(key, collapsed ? '1' : '0'); } catch { /* ignore */ }
    if (user) emit(root, { collapsed });
  };
  let stored: string | null = null;
  if (key) try { stored = localStorage.getItem(key); } catch { /* ignore */ }
  const host = root.parentElement!;
  const below = Number(root.dataset.collapseBelow) || 560;
  const auto = () => { if (stored === null) set(host.clientWidth < below); };
  if (stored !== null) set(stored === '1'); else auto();
  const ro = new ResizeObserver(auto);
  ro.observe(host);
  return combine(on(btn, 'click', () => { stored = root.hasAttribute('data-collapsed') ? '0' : '1'; set(stored === '1', true); }), () => ro.disconnect());
}
