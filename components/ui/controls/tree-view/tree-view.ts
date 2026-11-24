import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Tree view (WAI-ARIA Tree pattern): arrows move, Right/Left expand/collapse, Enter selects. */
export function enhance(root: HTMLElement): Cleanup {
  const visible = () =>
    [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')].filter((el) => !el.parentElement!.closest('[role="treeitem"][aria-expanded="false"]'));
  const focus = (el: HTMLElement) => {
    root.querySelectorAll<HTMLElement>('[role="treeitem"]').forEach((i) => (i.tabIndex = -1));
    el.tabIndex = 0;
    el.focus();
  };
  const select = (el: HTMLElement) => {
    root.querySelectorAll('[aria-selected="true"]').forEach((i) => i.setAttribute('aria-selected', 'false'));
    el.setAttribute('aria-selected', 'true');
    emit(root, { label: el.querySelector('[data-part="row"]')?.textContent?.trim() });
  };
  const toggle = (el: HTMLElement, open?: boolean) => {
    if (!el.hasAttribute('aria-expanded')) return false;
    const next = open ?? el.getAttribute('aria-expanded') !== 'true';
    el.setAttribute('aria-expanded', String(next));
    return true;
  };
  return combine(
    on(root, 'click', (e: MouseEvent) => {
      const row = (e.target as Element).closest('[data-part="row"]');
      if (!row) return;
      const item = row.parentElement as HTMLElement;
      toggle(item);
      select(item);
      focus(item);
    }),
    on(root, 'keydown', (e: KeyboardEvent) => {
      const item = (e.target as Element).closest<HTMLElement>('[role="treeitem"]');
      if (!item) return;
      const list = visible();
      const i = list.indexOf(item);
      const expanded = item.getAttribute('aria-expanded');
      const parent = item.parentElement!.closest<HTMLElement>('[role="treeitem"]');
      const map: Record<string, () => void> = {
        ArrowDown: () => list[i + 1] && focus(list[i + 1]),
        ArrowUp: () => list[i - 1] && focus(list[i - 1]),
        Home: () => focus(list[0]),
        End: () => focus(list[list.length - 1]),
        ArrowRight: () => (expanded === 'false' ? toggle(item, true) : expanded === 'true' && list[i + 1] && focus(list[i + 1])),
        ArrowLeft: () => (expanded === 'true' ? toggle(item, false) : parent && focus(parent)),
        Enter: () => select(item),
        ' ': () => select(item),
      };
      if (map[e.key]) { e.preventDefault(); map[e.key](); }
    }),
  );
}
