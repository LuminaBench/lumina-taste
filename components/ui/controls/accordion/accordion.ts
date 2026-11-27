import { combine, emit, on, parts, roving, holdInView, type Cleanup } from '../../_shared/dom';

/** Accordion (WAI-ARIA Accordion pattern). Single-open by default; add data-multiple for many. */
export function enhance(root: HTMLElement): Cleanup {
  const triggers = () => parts<HTMLButtonElement>(root, 'trigger');
  const panelOf = (t: HTMLElement) => root.querySelector<HTMLElement>(`#${CSS.escape(t.getAttribute('aria-controls')!)}`)!;
  const set = (t: HTMLElement, open: boolean) => {
    t.setAttribute('aria-expanded', String(open));
    panelOf(t).dataset.state = open ? 'open' : 'closed';
  };
  return combine(
    on(root, 'click', (e: MouseEvent) => {
      const t = (e.target as Element).closest<HTMLButtonElement>('[data-part="trigger"]');
      if (!t || !root.contains(t)) return;
      // Safari does not focus a button on click: focus it here so the arrow keys work straight after.
      if (document.activeElement !== t) t.focus({ preventScroll: true });
      const open = t.getAttribute('aria-expanded') !== 'true';
      // Closing an item above the one opened would pull it up the page: keep it under the pointer instead.
      if (open && !root.hasAttribute('data-multiple')) { holdInView(t); triggers().forEach((o) => o !== t && set(o, false)); }
      set(t, open);
      emit(root, { open: triggers().filter((x) => x.getAttribute('aria-expanded') === 'true').map((x) => x.id) });
    }),
    roving(root, triggers, { orientation: 'vertical', loop: true }),
  );
}
