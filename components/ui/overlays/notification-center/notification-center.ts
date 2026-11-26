import { $$, combine, dismissable, emit, focusFor, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Notification centre: a bell with an unread count that opens a panel. Clicking a row marks it read,
 * "Mark all as read" clears the count, the Unread tab filters. Esc and outside clicks close.
 */
export function enhance(root: HTMLElement): Cleanup {
  const bell = part<HTMLButtonElement>(root, 'bell')!;
  const panel = part(root, 'panel')!;
  const count = part(root, 'count')!;
  const sr = part(root, 'sr')!;
  const all = part<HTMLButtonElement>(root, 'all')!;
  const empty = part(root, 'empty')!;
  const tabs = $$<HTMLButtonElement>(root, '[role="tab"]');
  const items = () => $$<HTMLElement>(root, '[data-part="item"]');
  let filter: 'all' | 'unread' = 'all';
  let undismiss: Cleanup | null = null;
  const render = () => {
    const unread = items().filter((i) => i.hasAttribute('data-unread')).length;
    count.textContent = String(unread);
    count.hidden = unread === 0;
    sr.textContent = unread ? `Notifications, ${unread} unread` : 'Notifications';
    all.disabled = unread === 0;
    let shown = 0;
    items().forEach((i) => { const show = filter === 'all' || i.hasAttribute('data-unread'); i.hidden = !show; if (show) shown++; });
    empty.hidden = shown > 0;
    emit(root, { unread });
  };
  const set = (open: boolean, cause?: Event) => {
    panel.hidden = !open;
    bell.setAttribute('aria-expanded', String(open));
    undismiss?.(); undismiss = null;
    if (open) { undismiss = dismissable(root, () => { set(false); }); focusFor(cause, tabs.find((t) => t.getAttribute('aria-selected') === 'true')); }
  };
  render();
  return combine(
    on(bell, 'click', (e) => set(panel.hidden !== false, e)),
    on(panel, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); set(false); bell.focus(); }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && (e.target as Element).getAttribute('role') === 'tab') {
        const i = tabs.indexOf(e.target as HTMLButtonElement);
        tabs[(i + 1) % tabs.length].click();
        tabs[(i + 1) % tabs.length].focus();
      }
    }),
    on(all, 'click', () => { items().forEach((i) => i.removeAttribute('data-unread')); render(); }),
    ...tabs.map((t) => on(t, 'click', () => {
      tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      filter = t.dataset.filter as 'all' | 'unread';
      render();
    })),
    on(panel, 'click', (e) => { const row = (e.target as Element).closest('[data-part="row"]'); if (row) { row.parentElement!.removeAttribute('data-unread'); render(); } }),
    () => undismiss?.(),
  );
}
