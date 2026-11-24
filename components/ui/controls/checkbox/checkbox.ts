import { emit, on, type Cleanup } from '../../_shared/dom';

/** Optional "select all" wiring for a checkbox group: the [data-part=all] box goes indeterminate when mixed. */
export function enhance(root: HTMLElement): Cleanup {
  const all = root.querySelector<HTMLInputElement>('[data-part="all"] input');
  const items = () => [...root.querySelectorAll<HTMLInputElement>('.lt-check:not([data-part="all"]) input:not(:disabled)')];
  const sync = () => {
    if (!all) return;
    const n = items().filter((i) => i.checked).length;
    all.checked = n === items().length;
    all.indeterminate = n > 0 && n < items().length;
  };
  sync();
  return on(root, 'change', (e: Event) => {
    if (all && e.target === all) items().forEach((i) => (i.checked = all.checked));
    sync();
    emit(root, { checked: items().filter((i) => i.checked).map((i) => i.closest('label')?.textContent?.trim()) });
  });
}
