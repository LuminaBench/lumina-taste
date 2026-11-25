import { combine, on, type Cleanup } from '../../_shared/dom';
import { enhance as datePicker } from '../date-picker/date-picker';
import { enhance as stepper } from '../number-stepper/number-stepper';

/**
 * Booking bar: date, time and party size in one row, one action. On submit it checks that a date is set
 * and emits lt-change { date, time, people }; your code answers by setting the result line, for example
 * through the returned element's [data-part="result"]. The demo answers for itself (data-demo, the default
 * when no listener calls preventDefault on the event).
 */
export function enhance(root: HTMLElement): Cleanup {
  const result = root.querySelector<HTMLElement>('[data-part="result"]');
  const say = (text: string, state = '') => { if (result) { result.textContent = text; if (state) result.dataset.state = state; else delete result.dataset.state; } };
  // The bar owns its date picker and stepper: it starts them unless something else already has
  // (autoEnhance marks what it starts with data-lt-ready), so it works the same pasted, bundled or in React.
  const parts: Cleanup[] = [];
  for (const [sel, fn] of [['.lt-date', datePicker], ['.lt-stepper', stepper]] as const) for (const el of root.querySelectorAll<HTMLElement>(sel)) {
    if ('ltReady' in el.dataset) continue;
    el.dataset.ltReady = '';
    parts.push(fn(el), () => { delete el.dataset.ltReady; });
  }
  const off = on(root, 'submit', (e) => {
    e.preventDefault();
    const date = root.querySelector<HTMLElement>('.lt-date')?.dataset.value ?? '';
    const dateInput = root.querySelector<HTMLInputElement>('.lt-date input');
    if (!date || dateInput?.getAttribute('aria-invalid') === 'true') { say('Choose a date first.', 'error'); dateInput?.focus(); return; }
    const time = root.querySelector<HTMLSelectElement>('select')?.value ?? '';
    const people = Number(root.querySelector<HTMLInputElement>('.lt-stepper input')?.value ?? 1);
    const ev = new CustomEvent('lt-change', { detail: { date, time, people }, bubbles: true, cancelable: true });
    const handled = !root.dispatchEvent(ev);
    if (handled) return;
    // No one answered: say what was asked for, so the control is never silent.
    const when = new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    say(`${when} at ${time}, ${people} ${people === 1 ? 'person' : 'people'}: checking…`);
  });
  return combine(off, ...parts);
}
