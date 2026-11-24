import { $$, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Multi-select filter chips (toggle buttons). "All" clears the others; picking any other chip
 * turns "All" off; clearing the last one turns "All" back on.
 */
export function enhance(root: HTMLElement): Cleanup {
  const chips = $$<HTMLButtonElement>(root, '[data-part="chip"]');
  const all = chips.find((c) => c.hasAttribute('data-all'));
  const summary = part(root, 'summary');
  const selected = () => chips.filter((c) => c !== all && c.getAttribute('aria-pressed') === 'true').map((c) => c.textContent!.trim());
  const sync = () => {
    const sel = selected();
    if (all) all.setAttribute('aria-pressed', String(sel.length === 0));
    if (summary) summary.textContent = sel.length ? `Showing ${sel.join(', ')}` : 'Showing all teams';
    emit(root, { selected: sel });
  };
  if (all && selected().length) all.setAttribute('aria-pressed', 'false');
  return on(root, 'click', (e) => {
    const c = (e.target as Element).closest<HTMLButtonElement>('[data-part="chip"]');
    if (!c) return;
    if (c === all) chips.forEach((x) => x.setAttribute('aria-pressed', String(x === all)));
    else c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
    sync();
  });
}
