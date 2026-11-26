import { $$, combine, emit, on, type Cleanup } from '../../_shared/dom';

/**
 * Date strip: one tab stop; arrows move between the days that can be chosen (full or closed days are skipped),
 * Home and End go to the ends, Space or Enter (or a tap) chooses. The chosen day scrolls into view. Emits
 * lt-change with { date } (the button's data-date).
 */
export function enhance(root: HTMLElement): Cleanup {
  const days = () => $$<HTMLButtonElement>(root, '[role="radio"]');
  const open = () => days().filter((b) => b.getAttribute('aria-disabled') !== 'true');
  const pick = (b: HTMLButtonElement, fire = true) => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    for (const x of days()) { const on = x === b; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; }
    b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    if (fire) emit(root, { date: b.dataset.date });
  };
  const first = days().find((b) => b.getAttribute('aria-checked') === 'true') ?? open()[0];
  if (first) { for (const x of days()) x.tabIndex = x === first ? 0 : -1; }
  return combine(
    on(root, 'click', (e) => { const b = (e.target as Element).closest<HTMLButtonElement>('[role="radio"]'); if (b) pick(b); }),
    on(root, 'keydown', (e: KeyboardEvent) => {
      const list = open();
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      if (i < 0) return;
      const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : null;
      if (to == null) return;
      e.preventDefault();
      const b = list[Math.max(0, Math.min(list.length - 1, getComputedStyle(root).direction === 'rtl' && /Arrow(Left|Right)/.test(e.key) ? i - (to - i) : to))];
      b.focus(); pick(b);
    }),
  );
}
