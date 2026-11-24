import { $$, combine, dismissable, emit, focusFor, on, part, revealInList, type Cleanup } from '../../_shared/dom';

/**
 * Select-only combobox (WAI-ARIA): a button opens a listbox of options with descriptions. Arrows and
 * typeahead move, Enter/Space choose, Esc closes; focus returns to the button.
 */
export function enhance(root: HTMLElement): Cleanup {
  const trigger = part<HTMLButtonElement>(root, 'trigger')!;
  const list = part(root, 'list')!;
  const value = part(root, 'value')!;
  const opts = $$<HTMLElement>(list, '[role="option"]');
  let active = Math.max(0, opts.findIndex((o) => o.getAttribute('aria-selected') === 'true'));
  let undismiss: Cleanup | null = null, typed = '', typedAt = 0;
  const highlight = (i: number) => {
    active = (i + opts.length) % opts.length;
    opts.forEach((o, k) => o.toggleAttribute('data-active', k === active));
    list.setAttribute('aria-activedescendant', opts[active].id);
    revealInList(opts[active]);
  };
  const open = (e?: Event) => {
    list.hidden = false; trigger.setAttribute('aria-expanded', 'true');
    highlight(Math.max(0, opts.findIndex((o) => o.getAttribute('aria-selected') === 'true')));
    focusFor(e, list);
    undismiss = dismissable(root, () => close(false));
  };
  const close = (refocus = true) => { list.hidden = true; trigger.setAttribute('aria-expanded', 'false'); undismiss?.(); undismiss = null; if (refocus) trigger.focus(); };
  const choose = (i: number) => {
    opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === i)));
    value.textContent = opts[i].querySelector('strong')?.textContent ?? '';
    emit(root, { value: opts[i].dataset.value });
    close();
  };
  return combine(
    on(trigger, 'click', (e) => (list.hidden ? open(e) : close())),
    on(trigger, 'keydown', (e: KeyboardEvent) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } }),
    on(list, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); highlight(0); }
      else if (e.key === 'End') { e.preventDefault(); highlight(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); close(); }
      else if (e.key.length === 1) {
        typed = Date.now() - typedAt > 600 ? e.key.toLowerCase() : typed + e.key.toLowerCase();
        typedAt = Date.now();
        const hit = opts.findIndex((o) => (o.querySelector('strong')?.textContent ?? '').toLowerCase().startsWith(typed));
        if (hit >= 0) highlight(hit);
      }
    }),
    on(list, 'click', (e) => { const o = (e.target as Element).closest<HTMLElement>('[role="option"]'); if (o) choose(opts.indexOf(o)); }),
    on(list, 'pointermove', (e) => { const o = (e.target as Element).closest<HTMLElement>('[role="option"]'); if (o) highlight(opts.indexOf(o)); }),
    () => undismiss?.(),
  );
}
