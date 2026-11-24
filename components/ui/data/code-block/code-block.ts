import { combine, type Cleanup } from '../../_shared/dom';
import { enhance as tabs } from '../../navigation/tabs/tabs';
import { enhance as copy } from '../../controls/copy-button/copy-button';

/** Code block with language tabs and a copy button that copies the visible panel. */
export function enhance(root: HTMLElement): Cleanup {
  const btn = root.querySelector<HTMLElement>('[data-part="copy"]')!;
  const sync = () => { const p = root.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden]) code'); btn.dataset.copy = p?.textContent ?? ''; };
  sync();
  root.addEventListener('lt-change', sync);
  const tabRoot = root.querySelector<HTMLElement>('[data-part="tabs"]') ? root : null;
  return combine(tabRoot ? tabs(root) : () => {}, copy(btn), () => root.removeEventListener('lt-change', sync));
}
