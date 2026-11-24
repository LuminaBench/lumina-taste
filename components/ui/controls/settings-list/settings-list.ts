import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Settings rows that save immediately: each change shows a short "Saved" line. */
export function enhance(root: HTMLElement): Cleanup {
  const saved = part(root, 'saved')!;
  let t = 0;
  return combine(on(root, 'change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const label = root.querySelector(`#${el.getAttribute('aria-labelledby')}`)?.textContent ?? 'Setting';
    const value = el instanceof HTMLInputElement ? (el.checked ? 'on' : 'off') : el.value;
    saved.textContent = `Saved: ${label} ${el instanceof HTMLInputElement ? 'turned ' + value : 'set to ' + value}.`;
    clearTimeout(t); t = window.setTimeout(() => (saved.textContent = ''), 2400);
    emit(root, { setting: label, value });
  }), () => clearTimeout(t));
}
