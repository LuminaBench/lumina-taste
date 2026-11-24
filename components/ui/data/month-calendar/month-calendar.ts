import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Month view: one tab stop on the grid, arrows move by day/week, Enter selects and reads out that day's events. */
export function enhance(root: HTMLElement): Cleanup {
  const days = $$<HTMLButtonElement>(root, '[data-part="day"]');
  const sel = part(root, 'sel');
  const pick = (b: HTMLButtonElement) => {
    root.querySelectorAll('td[aria-selected]').forEach((t) => t.removeAttribute('aria-selected'));
    const td = b.closest('td')!;
    td.setAttribute('aria-selected', 'true');
    const evs = [...td.querySelectorAll('li')].map((l) => l.textContent).join(', ');
    if (sel) sel.textContent = `${b.textContent} December: ${evs || 'nothing scheduled'}`;
    emit(root, { day: +b.textContent!, events: evs });
  };
  const focusDay = (i: number) => { const b = days[Math.max(0, Math.min(days.length - 1, i))]; days.forEach((d) => (d.tabIndex = d === b ? 0 : -1)); b.focus(); };
  days.forEach((d, i) => (d.tabIndex = i === 0 ? 0 : -1));
  return combine(
    on(root, 'click', (e) => { const b = (e.target as Element).closest<HTMLButtonElement>('[data-part="day"]'); if (b) pick(b); }),
    on(root, 'keydown', (e: KeyboardEvent) => {
      const i = days.indexOf(document.activeElement as HTMLButtonElement);
      if (i < 0) return;
      const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 };
      if (e.key in step) { e.preventDefault(); focusDay(i + step[e.key]); }
      else if (e.key === 'Home') { e.preventDefault(); focusDay(0); }
      else if (e.key === 'End') { e.preventDefault(); focusDay(days.length - 1); }
    }),
  );
}
