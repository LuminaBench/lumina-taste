import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Time-slot picker: buttons in radiogroups per part of day. One tab stop for the whole picker;
 * arrows move through available slots (booked ones are skipped), Space/Enter picks.
 */
export function enhance(root: HTMLElement): Cleanup {
  const all = () => $$<HTMLButtonElement>(root, '[data-part="slot"]');
  const free = () => all().filter((b) => b.getAttribute('aria-disabled') !== 'true');
  const summary = part(root, 'summary');
  const pick = (b: HTMLButtonElement, fire = true) => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    all().forEach((x) => { const on = x === b; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
    if (summary) summary.innerHTML = `30-minute call at <strong>${b.textContent}</strong>`;
    if (fire) emit(root, { time: b.textContent });
  };
  const current = all().find((b) => b.getAttribute('aria-checked') === 'true') ?? free()[0];
  if (current) pick(current, false);
  return combine(
    on(root, 'click', (e) => { const b = (e.target as Element).closest<HTMLButtonElement>('[data-part="slot"]'); if (b) pick(b); }),
    on(root, 'keydown', (e: KeyboardEvent) => {
      const list = free();
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      if (i < 0) return;
      const cols = Math.max(1, Math.round(list[0].parentElement!.clientWidth / (list[0].offsetWidth + 6)));
      const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
      let next = -1;
      if (e.key in step) next = Math.max(0, Math.min(list.length - 1, i + step[e.key]));
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = list.length - 1;
      if (next < 0) return;
      e.preventDefault();
      pick(list[next]);
      list[next].focus();
    }),
  );
}
