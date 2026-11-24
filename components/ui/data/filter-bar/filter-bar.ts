import { combine, emit, on, type Cleanup } from '../../_shared/dom';
import { enhance as segmented } from '../../controls/segmented-control/segmented-control';

const SAMPLE = ['Owner: Me', 'Status: Active', 'Country: GB', 'Seats > 10'];
const x = '<svg class="lt-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

/** One global filter bar for a whole dashboard (anti-slop: never one filter bar per card). Emits the active filter state. */
export function enhance(root: HTMLElement): Cleanup {
  const range = root.querySelector<HTMLElement>('[data-part="range"]');
  const chips = root.querySelector<HTMLElement>('[data-part="chips"]')!;
  const initial = chips.innerHTML;
  const state = () => ({
    range: range?.querySelector<HTMLElement>('[aria-checked="true"]')?.dataset.value,
    filters: [...chips.querySelectorAll('[data-part="chip"]')].map((c) => c.textContent!.trim()),
  });
  const publish = () => emit(root, state(), 'lt-filters');
  return combine(
    range ? segmented(range) : () => {},
    on(root, 'lt-change', (e: Event) => { if (e.target === range) { e.stopPropagation(); publish(); } }),
    on(root, 'click', (e: MouseEvent) => {
      const t = e.target as Element;
      const chip = t.closest<HTMLElement>('[data-part="chip"]');
      if (chip) { const next = chip.nextElementSibling as HTMLElement | null; chip.remove(); (next ?? root.querySelector<HTMLElement>('[data-part="add"]'))?.focus(); publish(); }
      else if (t.closest('[data-part="add"]')) {
        const used = state().filters;
        const label = SAMPLE.find((s) => !used.includes(s));
        if (label) { chips.insertAdjacentHTML('beforeend', `<button type="button" data-part="chip" aria-pressed="true">${label} ${x}</button>`); publish(); }
      } else if (t.closest('[data-part="reset"]')) { chips.innerHTML = initial; publish(); }
    }),
  );
}
