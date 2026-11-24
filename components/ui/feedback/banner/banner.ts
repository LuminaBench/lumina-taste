import { on, type Cleanup } from '../../_shared/dom';

/** Dismissible announcement banner; remembers dismissal under data-persist (localStorage key). */
export function enhance(root: HTMLElement): Cleanup {
  const key = root.dataset.persist;
  try { if (key && localStorage.getItem(key) === '1') root.setAttribute('data-dismissed', ''); } catch { /* ignore */ }
  return on(root.querySelector('[data-part="close"]')!, 'click', () => {
    root.setAttribute('data-dismissed', '');
    try { if (key) localStorage.setItem(key, '1'); } catch { /* ignore */ }
    // In demos, bring it back after a moment so the pattern stays visible.
    if (!key) setTimeout(() => root.removeAttribute('data-dismissed'), 1600);
  });
}
