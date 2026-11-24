import { combine, type Cleanup } from '../../_shared/dom';
import { enhance as tabs } from '../../navigation/tabs/tabs';
import { enhance as copy } from '../../controls/copy-button/copy-button';

/** Code block with language tabs and a copy button that copies the visible panel. */
export function enhance(root: HTMLElement): Cleanup {
  // Tabs and the copy button are both optional: a plain <figure class="lt-code"><pre>…</pre></figure> is valid.
  const btn = root.querySelector<HTMLElement>('button[data-part="copy"]');
  const sync = () => { if (!btn) return; const p = root.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden]) code') ?? root.querySelector<HTMLElement>('pre code, pre'); btn.dataset.copy = p?.textContent ?? ''; };
  sync();
  root.addEventListener('lt-change', sync);
  const tabRoot = root.querySelector<HTMLElement>('[data-part="tabs"]') ? root : null;
  return combine(tabRoot ? tabs(root) : () => {}, btn ? copy(btn) : () => {}, () => root.removeEventListener('lt-change', sync));
}
