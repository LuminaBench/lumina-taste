import { $$, combine, dismissable, emit, focusFor, on, type Cleanup } from '../../_shared/dom';

/**
 * Navbar with flyout menus: click (not hover) opens one panel at a time; Down moves into it, arrows
 * travel, Esc closes and returns focus. Items are links with a one-line description.
 */
export function enhance(root: HTMLElement): Cleanup {
  const triggers = $$<HTMLButtonElement>(root, '[data-part="trigger"]');
  const panelOf = (t: HTMLButtonElement) => root.querySelector<HTMLElement>(`#${t.getAttribute('aria-controls')}`)!;
  const items = (p: HTMLElement) => $$<HTMLElement>(p, '[role="menuitem"], [data-part="foot"] a');
  let undismiss: Cleanup | null = null;
  const closeAll = () => { triggers.forEach((t) => { t.setAttribute('aria-expanded', 'false'); panelOf(t).hidden = true; }); undismiss?.(); undismiss = null; };
  const open = (t: HTMLButtonElement, e?: Event, focusFirst = false) => {
    closeAll();
    t.setAttribute('aria-expanded', 'true');
    const p = panelOf(t); p.hidden = false;
    if (focusFirst) focusFor(e, items(p)[0]);
    undismiss = dismissable(root, closeAll);
    emit(root, { open: t.textContent?.trim() });
  };
  return combine(
    // Safari does not focus a button on click: focus it here so Down and Esc work straight after.
    ...triggers.map((t) => on(t, 'click', (e) => { if (document.activeElement !== t) t.focus({ preventScroll: true }); return t.getAttribute('aria-expanded') === 'true' ? closeAll() : open(t, e); })),
    ...triggers.map((t) => on(t, 'keydown', (e: KeyboardEvent) => { if (e.key === 'ArrowDown') { e.preventDefault(); open(t, e, true); } })),
    on(root, 'keydown', (e: KeyboardEvent) => {
      const p = (e.target as Element).closest<HTMLElement>('[data-part="flyout"]');
      if (e.key === 'Escape') { const t = triggers.find((x) => x.getAttribute('aria-expanded') === 'true'); closeAll(); t?.focus(); return; }
      if (!p) return;
      const list = items(p), i = list.indexOf(e.target as HTMLElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    }),
    () => undismiss?.(),
  );
}
